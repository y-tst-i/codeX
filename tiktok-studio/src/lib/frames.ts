/**
 * 描いたフレームを測る道具：止まっている時間（フローズン）の検出と、批評用のコンタクトシート。
 * 参考：echris6/motion-video-kit（MIT）の frozen-time.sh / contact-sheet.sh をブラウザ内で再現したもの。
 */

export interface FrozenStretch {
  start: number;
  end: number;
}

export interface FrozenReport {
  /** 止まっている合計秒数 */
  frozenSeconds: number;
  /** 0.6秒を超えて止まっている区間 */
  longStretches: FrozenStretch[];
}

/** 前のフレームとの平均輝度差（0〜255）がこれ未満なら「止まっている」 */
export const FROZEN_THRESHOLD = 0.35;
const SAMPLE_FPS = 10;
export const MAX_HOLD_SECONDS = 0.6;

/** 輝度（0〜255）の配列どうしの平均差 */
export function meanLumaDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length && i < b.length; i += 4) {
    const la = 0.299 * a[i]! + 0.587 * a[i + 1]! + 0.114 * a[i + 2]!;
    const lb = 0.299 * b[i]! + 0.587 * b[i + 1]! + 0.114 * b[i + 2]!;
    sum += Math.abs(la - lb);
    count++;
  }
  return count ? sum / count : 0;
}

/**
 * 差分の列から止まっている区間をまとめる。
 * diffs[i] は時刻 (i+1)/fps のフレームと i/fps のフレームの差。
 * 最後の endGrace 秒（行動の呼びかけで読ませる部分）は長い停止として数えない。
 */
export function summarizeFrozen(diffs: number[], fps = SAMPLE_FPS, duration = diffs.length / fps, endGrace = 1.5): FrozenReport {
  const step = 1 / fps;
  let frozenSeconds = 0;
  const longStretches: FrozenStretch[] = [];
  let runStart = -1;
  const close = (endIndex: number) => {
    const start = runStart * step;
    const end = endIndex * step;
    if (end - start > MAX_HOLD_SECONDS && start < duration - endGrace) longStretches.push({ start: round(start), end: round(end) });
    runStart = -1;
  };
  diffs.forEach((diff, i) => {
    if (diff < FROZEN_THRESHOLD) {
      frozenSeconds += step;
      if (runStart < 0) runStart = i;
    } else if (runStart >= 0) {
      close(i + 1);
    }
  });
  if (runStart >= 0) close(diffs.length + 1);
  return { frozenSeconds: round(frozenSeconds), longStretches };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** render(t) を10fpsで回して、止まっている時間を測る */
export function measureFrozen(render: (t: number) => void, source: HTMLCanvasElement, duration: number): FrozenReport {
  const probe = document.createElement("canvas");
  probe.width = 90;
  probe.height = 160;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { frozenSeconds: 0, longStretches: [] };

  const diffs: number[] = [];
  let previous: Uint8ClampedArray | null = null;
  const frames = Math.floor(duration * SAMPLE_FPS);
  for (let i = 0; i <= frames; i++) {
    render(Math.min(i / SAMPLE_FPS, duration - 1e-3));
    ctx.drawImage(source, 0, 0, probe.width, probe.height);
    const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
    if (previous) diffs.push(meanLumaDiff(previous, data));
    previous = data;
  }
  return summarizeFrozen(diffs, SAMPLE_FPS, duration);
}

/**
 * 批評用のコンタクトシート（interval秒ごとのフレームを時刻つきで並べたPNG）。
 * 画像が大きすぎると縮小されて読めなくなるので、30コマ（15秒）ごとに1枚に分ける。
 */
export async function makeContactSheets(render: (t: number) => void, source: HTMLCanvasElement, duration: number, interval = 0.5): Promise<Blob[]> {
  const times: number[] = [];
  for (let t = 0; t < duration; t += interval) times.push(Math.round(t * 100) / 100);
  const perSheet = 30;
  const sheets: Blob[] = [];
  for (let i = 0; i < times.length; i += perSheet) sheets.push(await drawSheet(render, source, times.slice(i, i + perSheet)));
  return sheets;
}

async function drawSheet(render: (t: number) => void, source: HTMLCanvasElement, times: number[]): Promise<Blob> {
  const columns = 10;
  const rows = Math.ceil(times.length / columns);
  const thumbW = 144;
  const thumbH = 256;
  const labelH = 22;
  const sheet = document.createElement("canvas");
  sheet.width = columns * thumbW;
  sheet.height = rows * (thumbH + labelH);
  const ctx = sheet.getContext("2d");
  if (!ctx) throw new Error("canvasを初期化できません");
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = "bold 15px sans-serif";
  ctx.textBaseline = "middle";

  times.forEach((t, i) => {
    render(t);
    const x = (i % columns) * thumbW;
    const y = Math.floor(i / columns) * (thumbH + labelH);
    ctx.drawImage(source, x, y + labelH, thumbW, thumbH);
    ctx.fillStyle = "#fff";
    ctx.fillText(`${t.toFixed(1)}s`, x + 6, y + labelH / 2);
  });
  return new Promise((resolve, reject) => sheet.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNGにできませんでした"))), "image/png"));
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
