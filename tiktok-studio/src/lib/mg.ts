import { VIDEO } from "./knowledge";

/** HTML側が公開するモーショングラフィックスの契約 */
export interface MotionGraphic {
  width: number;
  height: number;
  fps: number;
  duration: number;
  ready?: Promise<unknown>;
  render(t: number): void;
}

interface HostWindow extends Window {
  MG?: MotionGraphic;
  __MG_HOST__?: boolean;
  __MG_ERRORS__?: string[];
}

/** Claudeの返答から ```html ブロック（なければ<html>〜</html>）を取り出す */
export function extractHtml(text: string): string {
  const fenced = /```html\s*([\s\S]*?)```/i.exec(text);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.search(/<!doctype html|<html/i);
  const end = text.toLowerCase().lastIndexOf("</html>");
  if (start >= 0 && end > start) return text.slice(start, end + "</html>".length).trim();
  if (/<canvas/i.test(text) && /window\.MG/.test(text)) return text.trim();
  throw new Error("返答からHTMLが見つかりませんでした");
}

const HOST_BOOTSTRAP = `<script>window.__MG_HOST__=true;window.__MG_ERRORS__=[];addEventListener("error",function(e){window.__MG_ERRORS__.push(String(e.message||e))});addEventListener("unhandledrejection",function(e){window.__MG_ERRORS__.push(String(e.reason&&e.reason.message||e.reason))});</script>`;

/** 自動再生を止め、エラーを集める仕込みを<head>の先頭に入れる */
export function prepareHostHtml(html: string): string {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (tag) => `${tag}${HOST_BOOTSTRAP}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${HOST_BOOTSTRAP}</head>`);
  return `${HOST_BOOTSTRAP}${html}`;
}

/** 静的チェック（読み込み前にわかる問題） */
export function lintHtml(html: string): string[] {
  const problems: string[] = [];
  if (!/window\.MG\s*=/.test(html) && !/MG\s*=\s*\{/.test(html)) problems.push("window.MG を公開していません");
  if (!/id=["']stage["']/.test(html)) problems.push('<canvas id="stage"> がありません');
  const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map((match) => match[1]);
  if (scripts.length > 0) problems.push(`外部スクリプトを読み込んでいます: ${scripts.join(", ")}`);
  return problems;
}

export interface LoadedGraphic {
  mg: MotionGraphic;
  canvas: HTMLCanvasElement;
  frame: HTMLIFrameElement;
  /** iframe内で起きたエラー */
  errors(): string[];
  /** 致命的ではない問題（フォントの読み込み失敗など） */
  warnings: string[];
  dispose(): void;
}

/**
 * HTMLを画面外のiframeに読み込み、MGとcanvasを取り出す。
 * srcdocのiframeは親と同じオリジンになるので、中のcanvasを直接読める。
 */
export async function loadGraphic(html: string, timeoutMs = 60000): Promise<LoadedGraphic> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    left: "-20000px",
    top: "0",
    width: `${VIDEO.width}px`,
    height: `${VIDEO.height}px`,
    border: "0"
  });
  document.body.appendChild(frame);
  const dispose = () => frame.remove();

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("HTMLの読み込みがタイムアウトしました")), timeoutMs);
      frame.addEventListener("load", () => {
        clearTimeout(timer);
        resolve();
      });
      frame.srcdoc = prepareHostHtml(html);
    });

    const win = frame.contentWindow as HostWindow | null;
    const errors = () => [...(win?.__MG_ERRORS__ ?? [])];
    const mg = win?.MG;
    if (!mg || typeof mg.render !== "function") {
      throw new Error(["window.MG.render が見つかりません", ...errors()].join(" / "));
    }
    const canvas = win.document.getElementById("stage");
    // iframe内の要素は別realmなので instanceof ではなくタグ名で判定する
    if (!canvas || canvas.tagName !== "CANVAS") throw new Error('<canvas id="stage"> が見つかりません');

    const warnings: string[] = [];
    if (mg.ready) {
      try {
        await Promise.race([
          Promise.resolve(mg.ready),
          new Promise((_, reject) => setTimeout(() => reject(new Error("MG.ready が終わりません")), timeoutMs))
        ]);
      } catch (error) {
        // フォントの一部が落ちても描画はできるので、止めずに警告にする
        warnings.push(`準備中にエラー（フォントが代替表示になる可能性）: ${(error as Error).message}`);
      }
    }
    return { mg, canvas: canvas as HTMLCanvasElement, frame, errors, warnings, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

function fingerprint(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let hash = 2166136261;
  // 全画素を見ると重いので、間引いてハッシュする
  for (let i = 0; i < data.length; i += 4 * 97) {
    hash ^= (data[i] ?? 0) | ((data[i + 1] ?? 0) << 8) | ((data[i + 2] ?? 0) << 16);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function isBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const first = [data[0], data[1], data[2]];
  for (let i = 0; i < data.length; i += 4 * 211) {
    if (data[i] !== first[0] || data[i + 1] !== first[1] || data[i + 2] !== first[2]) return false;
  }
  return true;
}

export interface ValidationReport {
  ok: boolean;
  problems: string[];
  warnings: string[];
  msPerFrame: number;
}

/** 書き出し前の動作検証（決定性・サイズ・尺・描画速度・t=0が真っ白/真っ黒でないか） */
export function validateGraphic(loaded: LoadedGraphic, expectedDuration: number): ValidationReport {
  const { mg, canvas } = loaded;
  const problems: string[] = [];
  const warnings: string[] = [...loaded.warnings];

  if (canvas.width !== VIDEO.width || canvas.height !== VIDEO.height) {
    problems.push(`canvasが${canvas.width}×${canvas.height}です（${VIDEO.width}×${VIDEO.height}にしてください）`);
  }
  if (!(mg.duration > 0)) problems.push("MG.duration が正しくありません");
  else if (Math.abs(mg.duration - expectedDuration) > 0.25) {
    warnings.push(`MG.duration(${mg.duration.toFixed(2)}s)が音声の尺(${expectedDuration.toFixed(2)}s)と違います。書き出しは音声の尺に合わせます`);
  }

  let msPerFrame = 0;
  try {
    const probe = Math.min(1.234, Math.max(0, expectedDuration / 3));
    mg.render(probe);
    const a = fingerprint(canvas);
    mg.render(expectedDuration * 0.8);
    mg.render(probe);
    const b = fingerprint(canvas);
    if (a !== b) problems.push("同じ時刻を描いても毎回違う絵になります（Math.randomや前フレームの状態に依存しています）");

    mg.render(0);
    if (isBlank(canvas)) warnings.push("t=0 が単色の画面です。冒頭0フレーム目からフックが見えるのが理想です");

    const samples = 12;
    const started = performance.now();
    for (let i = 0; i < samples; i++) mg.render((expectedDuration * i) / samples);
    msPerFrame = (performance.now() - started) / samples;
    if (msPerFrame > 33) warnings.push(`1フレームの描画に${msPerFrame.toFixed(0)}msかかります。プレビューがカクつく可能性があります（書き出しは問題なし）`);
  } catch (error) {
    problems.push(`render(t) でエラー: ${(error as Error).message}`);
  }

  problems.push(...loaded.errors().map((message) => `実行時エラー: ${message}`));
  return { ok: problems.length === 0, problems, warnings, msPerFrame };
}
