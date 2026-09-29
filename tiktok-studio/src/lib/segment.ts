import { trimSilence, type AudioClip } from "./audio";

/** 無音区間 */
export interface Gap {
  start: number;
  end: number;
}

const WINDOW_SECONDS = 0.01;

/**
 * 無音区間を探す（先頭・末尾の無音は除く）。
 * 10msごとの最大振幅が threshold 未満の区間が minGap 秒以上続けば無音とみなす。
 */
export function findGaps(clip: AudioClip, minGap = 0.12, threshold = 500): Gap[] {
  const { samples, sampleRate } = clip;
  const window = Math.max(1, Math.round(WINDOW_SECONDS * sampleRate));
  const windows = Math.ceil(samples.length / window);
  const silent: boolean[] = [];
  for (let w = 0; w < windows; w++) {
    let peak = 0;
    const end = Math.min(samples.length, (w + 1) * window);
    for (let i = w * window; i < end; i++) peak = Math.max(peak, Math.abs(samples[i] ?? 0));
    silent.push(peak < threshold);
  }

  const gaps: Gap[] = [];
  let runStart = -1;
  for (let w = 0; w <= windows; w++) {
    const isSilent = w < windows && silent[w];
    if (isSilent && runStart < 0) runStart = w;
    if (!isSilent && runStart >= 0) {
      const leading = runStart === 0;
      const trailing = w === windows;
      const length = (w - runStart) * WINDOW_SECONDS;
      if (!leading && !trailing && length >= minGap) gaps.push({ start: runStart * WINDOW_SECONDS, end: w * WINDOW_SECONDS });
      runStart = -1;
    }
  }
  return gaps;
}

/**
 * シーンの区切りに使う無音を N-1 個選ぶ。
 * 各区切りの「予想位置」（文字数の比率から計算）に近く、かつ長い無音ほど選ばれやすい。
 * 候補が足りなければ null。
 */
export function chooseCuts(gaps: Gap[], weights: number[], speechStart: number, speechEnd: number): number[] | null {
  const cutsNeeded = weights.length - 1;
  if (cutsNeeded <= 0) return [];
  if (gaps.length < cutsNeeded) return null;

  const total = weights.reduce((sum, w) => sum + w, 0);
  const span = speechEnd - speechStart;
  const expected: number[] = [];
  let cumulative = 0;
  for (let k = 0; k < cutsNeeded; k++) {
    cumulative += weights[k] ?? 0;
    expected.push(speechStart + (span * cumulative) / total);
  }
  const unit = span / weights.length;
  const cost = (gap: Gap, k: number) => {
    const center = (gap.start + gap.end) / 2;
    const length = gap.end - gap.start;
    return Math.abs(center - (expected[k] ?? 0)) / unit - 1.5 * Math.min(length, 0.8);
  };

  // best[k][i]: k番目の区切りに gaps[i] を使ったときの最小コスト（順番を守る）
  const m = gaps.length;
  const best: number[][] = Array.from({ length: cutsNeeded }, () => new Array<number>(m).fill(Infinity));
  const from: number[][] = Array.from({ length: cutsNeeded }, () => new Array<number>(m).fill(-1));
  for (let i = 0; i < m; i++) best[0]![i] = cost(gaps[i]!, 0);
  for (let k = 1; k < cutsNeeded; k++) {
    for (let i = k; i < m; i++) {
      for (let j = k - 1; j < i; j++) {
        const value = best[k - 1]![j]! + cost(gaps[i]!, k);
        if (value < best[k]![i]!) {
          best[k]![i] = value;
          from[k]![i] = j;
        }
      }
    }
  }

  let index = -1;
  let min = Infinity;
  for (let i = 0; i < m; i++) {
    if (best[cutsNeeded - 1]![i]! < min) {
      min = best[cutsNeeded - 1]![i]!;
      index = i;
    }
  }
  if (index < 0) return null;
  const chosen: number[] = [];
  for (let k = cutsNeeded - 1; k >= 0; k--) {
    const gap = gaps[index]!;
    chosen.unshift((gap.start + gap.end) / 2);
    index = from[k]![index]!;
  }
  return chosen;
}

/**
 * まとめて読んだ音声をシーンごとに切り分ける。
 * weights は各シーンの読み上げ文字数など（長さの比率）。
 * 切り分けた長さが予想から大きく外れたら null（シーンごと生成に戻すべき）。
 */
export function splitBySilence(clip: AudioClip, weights: number[], expectedSeconds: number[]): AudioClip[] | null {
  if (weights.length === 1) return [trimSilence(clip)];
  const { sampleRate, samples } = clip;
  const trimmed = trimSilence(clip, 400, 0);
  if (trimmed.samples.length === 0) return null;
  // 前後の無音を除いた「声のある範囲」を求める
  let first = 0;
  while (first < samples.length && Math.abs(samples[first] ?? 0) < 400) first++;
  const speechStart = first / sampleRate;
  const speechEnd = speechStart + trimmed.samples.length / sampleRate;

  const cuts = chooseCuts(findGaps(clip), weights, speechStart, speechEnd);
  if (!cuts) return null;

  const bounds = [0, ...cuts.map((t) => Math.round(t * sampleRate)), samples.length];
  const parts: AudioClip[] = [];
  for (let k = 0; k < weights.length; k++) {
    parts.push(trimSilence({ sampleRate, samples: samples.slice(bounds[k], bounds[k + 1]) }));
  }

  const plausible = parts.every((part, k) => {
    const seconds = part.samples.length / sampleRate;
    const expected = expectedSeconds[k] ?? 1;
    return seconds > 0.2 && seconds > expected * 0.35 && seconds < expected * 2.8 + 1;
  });
  return plausible ? parts : null;
}
