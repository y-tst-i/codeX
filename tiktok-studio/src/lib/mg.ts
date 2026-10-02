import { hostExtrasScript } from "./character";
// lottie-web 5.13.0（MIT）をツール内に置いたもの。理由は src/vendor/README.md
import LOTTIE_SOURCE from "../vendor/lottie_canvas.min.js?raw";
import { measureFrozen, type FrozenReport } from "./frames";
import { VIDEO } from "./knowledge";
import { MGK_SCRIPT } from "./mgKit";

/** Lottie の再生ライブラリ（MIT）。</script> が混ざっても壊れないようにしておく */
const LOTTIE_SCRIPT = LOTTIE_SOURCE.replace(/<\/script/gi, "<\\/script");

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

/** 読み込み時に一緒に差し込むもの（看板キャラのコード・口パク用の音量） */
export interface HostExtras {
  characterScript?: string;
  voiceLevels?: number[];
  /** 字幕（K.caption が使う） */
  captions?: { start: number; end: number; text: string; emphasis: string[] }[];
  /** 背景などの画像（名前 → data URL。K.image が使う） */
  images?: Record<string, string>;
  /** Lottieアニメ（名前 → JSON。K.lottie が使う） */
  lotties?: Record<string, unknown>;
  /** 母音ごとの口の形のタイミング（VOICEVOX / AivisSpeech） */
  visemes?: { t: number; e: number; v: string }[];
}

/** データを <script> に安全に埋め込む */
function dataScript(name: string, value: unknown): string {
  return `<script>window.${name}=${JSON.stringify(value).replace(/</g, "\\u003c")};</script>`;
}

function injectHead(html: string, snippet: string): string {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (tag) => `${tag}${snippet}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${snippet}</head>`);
  return `${snippet}${html}`;
}

/** 看板キャラ・音量データを差し込む（保存用HTMLにも使う） */
export function withExtras(html: string, extras?: HostExtras): string {
  // 演出の道具箱（window.MGK）はいつも入れる。キャラと音量は用意できたときだけ
  const data = [
    extras?.captions ? dataScript("MG_CAPTIONS", extras.captions) : "",
    extras?.images && Object.keys(extras.images).length ? dataScript("MG_IMAGES", extras.images) : "",
    extras?.lotties && Object.keys(extras.lotties).length ? `${dataScript("MG_LOTTIES", extras.lotties)}<script>${LOTTIE_SCRIPT}</script>` : "",
    extras?.visemes?.length ? dataScript("MG_VISEMES", extras.visemes) : ""
  ].join("");
  return injectHead(html, `${data}<script>${MGK_SCRIPT}</script>${hostExtrasScript(extras?.characterScript, extras?.voiceLevels)}`);
}

/** 自動再生を止め、エラーを集める仕込みを<head>の先頭に入れる */
export function prepareHostHtml(html: string, extras?: HostExtras): string {
  return injectHead(withExtras(html, extras), HOST_BOOTSTRAP);
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
export async function loadGraphic(html: string, extras?: HostExtras, timeoutMs = 60000): Promise<LoadedGraphic> {
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
      frame.srcdoc = prepareHostHtml(html, extras);
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
    // 画像キャラなど、差し込んだ素材の読み込みを待つ
    const assets = (win as HostWindow & { MG_ASSETS_READY?: Promise<unknown> }).MG_ASSETS_READY;
    if (assets) await Promise.race([assets, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
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

export function fingerprint(canvas: HTMLCanvasElement): string {
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
  /** 止まっている時間の計測結果（計測できなかったら null） */
  frozen: FrozenReport | null;
}

/** 描画の設定（render の最初に戻し忘れると、次のフレームに持ち越されるもの） */
function ctxState(ctx: CanvasRenderingContext2D): Record<string, string> {
  const m = ctx.getTransform();
  return {
    "変形(transform)": [m.a, m.b, m.c, m.d, m.e, m.f].map((v) => v.toFixed(3)).join(","),
    globalAlpha: String(ctx.globalAlpha),
    globalCompositeOperation: ctx.globalCompositeOperation,
    filter: String(ctx.filter ?? "none"),
    shadowBlur: String(ctx.shadowBlur),
    shadowColor: String(ctx.shadowColor),
    shadowOffsetX: String(ctx.shadowOffsetX),
    shadowOffsetY: String(ctx.shadowOffsetY),
    fillStyle: String(ctx.fillStyle),
    strokeStyle: String(ctx.strokeStyle),
    lineWidth: String(ctx.lineWidth),
    lineCap: ctx.lineCap,
    lineJoin: ctx.lineJoin,
    lineDash: ctx.getLineDash().join(","),
    font: ctx.font,
    textAlign: ctx.textAlign,
    textBaseline: ctx.textBaseline
  };
}

/**
 * 「毎回違う絵」の原因を探す：乱数・時計を呼んでいないか、描画の設定を戻し忘れていないか。
 * 見つかった手がかりを、修正プロンプトにそのまま渡せる文で返す。
 * severe：書き出した動画でもチラつく・ずれる原因（乱数・時計・設定の持ち越し）
 */
function diagnoseNondeterminism(loaded: LoadedGraphic, t: number, leaked: string[]): { hints: string[]; severe: boolean } {
  const hints: string[] = [];
  let severe = false;
  const win = loaded.frame.contentWindow as (Window & typeof globalThis) | null;
  if (win) {
    const counts = { random: 0, date: 0, perf: 0 };
    const random = win.Math.random;
    const dateNow = win.Date.now;
    const perfNow = win.performance.now.bind(win.performance);
    win.Math.random = () => (counts.random++, random());
    win.Date.now = () => (counts.date++, dateNow());
    win.performance.now = () => (counts.perf++, perfNow());
    try {
      loaded.mg.render(t);
    } catch {
      // エラーは別の検査で報告する
    } finally {
      win.Math.random = random;
      win.Date.now = dateNow;
      win.performance.now = perfNow;
    }
    if (counts.random) {
      severe = true;
      hints.push(`render の中で Math.random が${counts.random}回呼ばれています。乱数は「番号から決まる疑似乱数（例: sin(i*12.9898)*43758.5453 の小数部）」に置き換えてください`);
    }
    if (counts.date || counts.perf) {
      severe = true;
      hints.push("render の中で Date.now / performance.now を使っています。時間は引数の t だけを使ってください");
    }
  }
  if (leaked.length > 0) {
    // 変形・透明度・合成・影・フィルタの持ち越しは、ほぼ確実に絵が変わる。色やフォントは描く前に設定し直していれば無害なこともある
    const strong = ["変形(transform)", "globalAlpha", "globalCompositeOperation", "filter", "shadowBlur", "shadowColor", "shadowOffsetX", "shadowOffsetY"];
    if (leaked.some((key) => strong.includes(key))) severe = true;
    hints.push(
      `render が終わったあとに描画の設定（${leaked.join("・")}）が変わったまま残り、次のフレームに持ち越されています。render の最初で ctx.setTransform(1,0,0,1,0,0) と、これらの設定を毎回決まった値に戻してください（ctx.save() と ctx.restore() の数もそろえる）`
    );
  }
  if (!severe) {
    hints.push("render の外の変数（パーティクルの配列、前のシーン番号、一度だけ作る画像のキャッシュ、累積する値など）を render の中で書き換えている可能性があります。すべて t から毎回計算し直してください");
  }
  hints.push("window.CHARACTER と window.MG_VOICE_LEVEL はツールが用意する決定的な関数なので、原因はHTML側です");
  return { hints, severe };
}

/** 同じ時刻を描き直して同じ絵になるか（モーションブラーで1フレームを何度も描いてよいか） */
export function isDeterministic(loaded: LoadedGraphic, duration: number): boolean {
  try {
    const probe = Math.min(1.234, duration / 3);
    loaded.mg.render(probe);
    const a = fingerprint(loaded.canvas);
    loaded.mg.render(duration * 0.8);
    loaded.mg.render(probe);
    return a === fingerprint(loaded.canvas);
  } catch {
    return false;
  }
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
  let frozen: FrozenReport | null = null;
  try {
    const probe = Math.min(1.234, Math.max(0, expectedDuration / 3));
    const ctx = canvas.getContext("2d");
    const before = ctx ? ctxState(ctx) : null;
    mg.render(probe);
    const a = fingerprint(canvas);
    mg.render(expectedDuration * 0.8);
    const between = ctx ? ctxState(ctx) : null;
    mg.render(probe);
    const b = fingerprint(canvas);
    if (a !== b) {
      const leaked = before && between ? Object.keys(before).filter((key) => before[key] !== between[key]) : [];
      const { hints, severe } = diagnoseNondeterminism(loaded, probe, leaked);
      if (severe) problems.push(`同じ時刻を描いても毎回違う絵になります（${hints.join("／")}）`);
      else
        warnings.push(
          `同じ時刻を2回描くと少し違う絵になります（${hints.join("／")}）。書き出しは1フレームずつ順番に描くのでこのままでも出せますが、プレビューで前後に動かすと崩れることがあります。気になる場合は修正プロンプトで直してください`
        );
    }

    mg.render(0);
    if (isBlank(canvas)) warnings.push("t=0 が単色の画面です。冒頭0フレーム目からフックが見えるのが理想です");

    const samples = 12;
    const started = performance.now();
    for (let i = 0; i < samples; i++) mg.render((expectedDuration * i) / samples);
    msPerFrame = (performance.now() - started) / samples;
    if (msPerFrame > 33) warnings.push(`1フレームの描画に${msPerFrame.toFixed(0)}msかかります。プレビューがカクつく可能性があります（書き出しは問題なし）`);

    // 画が止まっている時間を測る（目安：30秒あたり合計1秒以内、1回0.6秒まで）
    frozen = measureFrozen((t) => mg.render(t), canvas, expectedDuration);
    const allowance = expectedDuration / 30;
    if (frozen.longStretches.length > 0 || frozen.frozenSeconds > allowance) {
      const where = frozen.longStretches.map((s) => `${s.start.toFixed(1)}〜${s.end.toFixed(1)}s`).join("、");
      warnings.push(
        `画が止まっている時間が合計${frozen.frozenSeconds.toFixed(1)}秒あります${where ? `（0.6秒以上止まる区間：${where}）` : ""}。離脱の原因になるので「磨き込み」で動きを足しましょう`
      );
    }
  } catch (error) {
    problems.push(`render(t) でエラー: ${(error as Error).message}`);
  }

  problems.push(...loaded.errors().map((message) => `実行時エラー: ${message}`));
  return { ok: problems.length === 0, problems, warnings, msPerFrame, frozen };
}
