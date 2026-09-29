/** 音声クリップ（モノラル16bit PCM） */
export interface AudioClip {
  sampleRate: number;
  samples: Int16Array;
}

export function clipDuration(clip: AudioClip): number {
  return clip.samples.length / clip.sampleRate;
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Geminiが返す audio/L16;rate=24000 などのMIMEからサンプルレートを読む */
export function sampleRateFromMime(mimeType: string, fallback = 24000): number {
  const match = /rate=(\d+)/i.exec(mimeType);
  return match?.[1] ? Number(match[1]) : fallback;
}

/** リトルエンディアンの16bit PCMバイト列をクリップにする */
export function pcm16ToClip(bytes: Uint8Array, sampleRate: number): AudioClip {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Int16Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true);
  return { sampleRate, samples };
}

/**
 * 前後の無音を削る。TTSは頭とお尻に無音が入りがちで、
 * 残すとテンポが間延びするため。
 */
export function trimSilence(clip: AudioClip, threshold = 400, padSeconds = 0.03): AudioClip {
  const { samples, sampleRate } = clip;
  let first = 0;
  while (first < samples.length && Math.abs(samples[first] ?? 0) < threshold) first++;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last] ?? 0) < threshold) last--;
  if (first >= samples.length) return { sampleRate, samples: new Int16Array(0) };

  const pad = Math.round(padSeconds * sampleRate);
  const from = Math.max(0, first - pad);
  const to = Math.min(samples.length, last + 1 + pad);
  return { sampleRate, samples: samples.slice(from, to) };
}

/**
 * 各クリップを指定秒の位置に置いて1本にまとめる。
 * placements[i].at はタイムライン上の speechStart。
 */
export function mixClips(
  placements: { clip: AudioClip; at: number }[],
  totalSeconds: number,
  sampleRate = 24000
): Float32Array {
  const out = new Float32Array(Math.ceil(totalSeconds * sampleRate));
  for (const { clip, at } of placements) {
    const ratio = clip.sampleRate / sampleRate;
    const offset = Math.round(at * sampleRate);
    const length = Math.floor(clip.samples.length / ratio);
    for (let i = 0; i < length; i++) {
      const target = offset + i;
      if (target < 0 || target >= out.length) continue;
      // 線形補間でリサンプリング（24kHz→48kHzなど）
      const position = i * ratio;
      const index = Math.floor(position);
      const frac = position - index;
      const a = clip.samples[index] ?? 0;
      const b = clip.samples[index + 1] ?? a;
      out[target] = (out[target] ?? 0) + (a + (b - a) * frac) / 32768;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, out[i] ?? 0));
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function clipToWav(clip: AudioClip): Blob {
  const floats = new Float32Array(clip.samples.length);
  for (let i = 0; i < floats.length; i++) floats[i] = (clip.samples[i] ?? 0) / 32768;
  return encodeWav(floats, clip.sampleRate);
}
