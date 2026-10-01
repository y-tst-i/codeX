/**
 * 効果音（その場で合成するので著作権の心配がない）と、BGM・声・効果音のミックス。
 * 効果音は OfflineAudioContext で一度だけ作ってキャッシュする。
 */
import type { Timeline } from "./types";

export const SFX_TYPES = ["whoosh", "swipe", "pop", "impact", "ding", "sparkle", "tick", "riser", "heart", "bubble"] as const;
export type SfxType = (typeof SFX_TYPES)[number];
export const SFX_LABELS: Record<SfxType, string> = {
  whoosh: "シュッ（転換）",
  swipe: "スッ（短い転換）",
  pop: "ポン（文字の登場）",
  impact: "ドン（叩きつけ・驚き）",
  ding: "チーン（正解・結論）",
  sparkle: "キラキラ",
  tick: "カチッ（カウント・項目）",
  riser: "ヒュ〜ン（盛り上げ・溜め）",
  heart: "ぽわん（ときめき）",
  bubble: "ぷくっ（吹き出し）"
};

export interface SfxCue {
  t: number;
  type: SfxType;
  volume?: number;
}

export interface AudioSettings {
  sfx: boolean;
  sfxVolume: number;
  bgmKey?: string;
  bgmName?: string;
  bgmVolume: number;
  /** 声が鳴っている間、BGMを下げる強さ（0〜1） */
  duck: number;
}

export const DEFAULT_AUDIO: AudioSettings = { sfx: true, sfxVolume: 0.7, bgmVolume: 0.22, duck: 0.65 };

/* ---------------- 効果音の合成 ---------------- */

const cache = new Map<string, Float32Array>();

function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed = 1): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let s = seed * 9301 + 49297;
  for (let i = 0; i < data.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (s / 0x7fffffff) * 2 - 1;
  }
  return buffer;
}

/** 小さな部屋の響き（キラキラ系をなじませる） */
function reverb(ctx: BaseAudioContext, seconds = 0.8): ConvolverNode {
  const ir = ctx.createBuffer(2, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    let s = 77 + ch;
    for (let i = 0; i < data.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = ((s / 0x7fffffff) * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
  }
  const node = ctx.createConvolver();
  node.buffer = ir;
  return node;
}

function env(ctx: BaseAudioContext, at: number, attack: number, peak: number, decay: number, out: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(out);
  return g;
}

function tone(ctx: BaseAudioContext, type: OscillatorType, f0: number, f1: number, at: number, glide: number, gainNode: AudioNode, stop: number): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + glide);
  o.connect(gainNode);
  o.start(at);
  o.stop(stop);
}

function sweptNoise(ctx: BaseAudioContext, at: number, length: number, from: number, peakAt: number, peak: number, to: number, q: number, gainNode: AudioNode): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, length + 0.05, Math.round(from));
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = q;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(peak, at + peakAt);
  f.frequency.exponentialRampToValueAtTime(to, at + length);
  src.connect(f);
  f.connect(gainNode);
  src.start(at);
}

const LENGTH: Record<SfxType, number> = { whoosh: 0.6, swipe: 0.3, pop: 0.25, impact: 0.9, ding: 1.6, sparkle: 1.0, tick: 0.08, riser: 1.2, heart: 0.7, bubble: 0.25 };

/** 効果音を1つ作る（モノラル、sampleRate） */
export async function renderSfx(type: SfxType, sampleRate: number): Promise<Float32Array> {
  const key = `${type}@${sampleRate}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const length = LENGTH[type];
  const ctx = new OfflineAudioContext(1, Math.ceil(length * sampleRate), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  const rv = reverb(ctx);
  rv.connect(wet);
  wet.connect(master);

  switch (type) {
    case "whoosh":
      sweptNoise(ctx, 0, 0.55, 250, 0.22, 3200, 500, 1.1, env(ctx, 0, 0.2, 0.9, 0.33, master));
      break;
    case "swipe":
      sweptNoise(ctx, 0, 0.26, 900, 0.1, 6000, 2000, 1.4, env(ctx, 0, 0.06, 0.7, 0.18, master));
      break;
    case "pop": {
      const g = env(ctx, 0, 0.004, 0.9, 0.16, master);
      tone(ctx, "sine", 1100, 320, 0, 0.09, g, 0.24);
      sweptNoise(ctx, 0, 0.03, 3000, 0.01, 5000, 3000, 0.8, env(ctx, 0, 0.002, 0.25, 0.03, master));
      break;
    }
    case "impact": {
      const g = env(ctx, 0, 0.005, 1, 0.75, master);
      tone(ctx, "sine", 140, 42, 0, 0.4, g, 0.9);
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 3);
      shaper.curve = curve;
      const hit = env(ctx, 0, 0.002, 0.8, 0.25, shaper);
      shaper.connect(master);
      sweptNoise(ctx, 0, 0.3, 1800, 0.01, 1200, 200, 0.7, hit);
      break;
    }
    case "ding": {
      const g = env(ctx, 0, 0.004, 0.55, 1.5, master);
      g.connect(rv);
      [1320, 2640, 3960, 1980].forEach((f, i) => {
        const p = ctx.createGain();
        p.gain.value = [1, 0.35, 0.15, 0.2][i]!;
        p.connect(g);
        tone(ctx, "sine", f, f, 0, 1, p, 1.6);
      });
      break;
    }
    case "sparkle":
      for (let i = 0; i < 7; i++) {
        const at = i * 0.07 + (i % 3) * 0.015;
        const g = env(ctx, at, 0.003, 0.28, 0.2, master);
        g.connect(rv);
        const f = 2200 + ((i * 1733) % 2600);
        tone(ctx, "sine", f, f * 1.02, at, 0.2, g, at + 0.25);
      }
      break;
    case "tick": {
      const g = env(ctx, 0, 0.001, 0.5, 0.05, master);
      tone(ctx, "square", 2200, 1800, 0, 0.04, g, 0.07);
      break;
    }
    case "riser": {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.exponentialRampToValueAtTime(0.7, 1.05);
      g.gain.exponentialRampToValueAtTime(0.0001, 1.18);
      g.connect(master);
      sweptNoise(ctx, 0, 1.15, 300, 1.1, 7000, 7000, 1.5, g);
      tone(ctx, "sawtooth", 180, 900, 0, 1.1, (() => { const s = ctx.createGain(); s.gain.value = 0.08; s.connect(g); return s; })(), 1.15);
      break;
    }
    case "heart":
      [0, 0.13].forEach((at, i) => {
        const g = env(ctx, at, 0.01, 0.45, 0.4, master);
        g.connect(rv);
        tone(ctx, "triangle", i ? 990 : 740, i ? 1050 : 780, at, 0.3, g, at + 0.5);
      });
      break;
    case "bubble": {
      const g = env(ctx, 0, 0.004, 0.7, 0.14, master);
      tone(ctx, "sine", 380, 1300, 0, 0.11, g, 0.22);
      break;
    }
  }
  const rendered = await ctx.startRendering();
  const data = rendered.getChannelData(0).slice();
  // 音ごとの大きさのばらつきをそろえる（ピークを 0.75 に）
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < data.length; i++) data[i] = (data[i] ?? 0) * (0.75 / peak);
  cache.set(key, data);
  return data;
}

/* ---------------- 効果音のきっかけ ---------------- */

/** HTML側が効果音の指定（MG.sfx）を持っていないときに、タイムラインから自動で付ける */
export function autoCues(timeline: Timeline): SfxCue[] {
  const cues: SfxCue[] = [];
  timeline.scenes.forEach((scene, i) => {
    // シーンの切り替わりに「シュッ」
    if (i > 0) cues.push({ t: Math.max(0, scene.start - 0.18), type: i % 3 === 2 ? "swipe" : "whoosh", volume: 0.8 });
    // 大きな文字の登場に「ポン」、オチ・CTAは「チーン」
    const at = Math.max(0, scene.speechStart - 0.03);
    if (scene.role === "twist") cues.push({ t: at, type: "impact" });
    else if (scene.role === "cta") cues.push({ t: at, type: "ding", volume: 0.8 });
    else cues.push({ t: at, type: "pop", volume: 0.8 });
    // 強調語が出る字幕に「キラキラ」（1シーン1回まで）
    const chunk = scene.captions.find((c) => scene.emphasis.some((word) => word && c.text.includes(word)));
    if (chunk && chunk.start > at + 0.3) cues.push({ t: chunk.start, type: "sparkle", volume: 0.6 });
  });
  return cues;
}

/** HTMLの MG.sfx を読み、正しいものだけ残す */
export function sanitizeCues(raw: unknown, duration: number): SfxCue[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is SfxCue => Boolean(c) && typeof (c as SfxCue).t === "number" && (SFX_TYPES as readonly string[]).includes((c as SfxCue).type))
    .filter((c) => c.t >= 0 && c.t < duration)
    .slice(0, 200)
    .map((c) => ({ t: c.t, type: c.type, volume: typeof c.volume === "number" ? Math.max(0, Math.min(1.5, c.volume)) : 1 }));
}

/* ---------------- ミックス ---------------- */

/** 声の大きさの包絡（BGMを下げるため）：速く上がって、ゆっくり下がる */
export function voiceEnvelope(voice: Float32Array, sampleRate: number): Float32Array {
  const out = new Float32Array(voice.length);
  const attack = 1 - Math.exp(-1 / (0.02 * sampleRate));
  const release = 1 - Math.exp(-1 / (0.35 * sampleRate));
  let level = 0;
  for (let i = 0; i < voice.length; i++) {
    const v = Math.min(1, Math.abs(voice[i] ?? 0) * 8);
    level += (v - level) * (v > level ? attack : release);
    out[i] = level;
  }
  return out;
}

export interface MixInput {
  voice: Float32Array | null;
  sampleRate: number;
  duration: number;
  bgm: Float32Array | null;
  sfx: { cue: SfxCue; samples: Float32Array }[];
  settings: AudioSettings;
}

/** 声・BGM・効果音を1本にまとめる（最後に軽いリミッターで音割れを防ぐ） */
export function mixAll({ voice, sampleRate, duration, bgm, sfx, settings }: MixInput): Float32Array {
  const length = Math.ceil(duration * sampleRate);
  const out = new Float32Array(length);
  if (voice) out.set(voice.subarray(0, length));
  if (bgm && bgm.length > 0) {
    const envl = voice ? voiceEnvelope(voice, sampleRate) : null;
    const fadeIn = 0.3 * sampleRate;
    const fadeOut = Math.min(1.2 * sampleRate, length / 3);
    for (let i = 0; i < length; i++) {
      let g = settings.bgmVolume;
      if (envl) g *= 1 - settings.duck * Math.min(1, (envl[i] ?? 0) * 1.5);
      if (i < fadeIn) g *= i / fadeIn;
      if (i > length - fadeOut) g *= (length - i) / fadeOut;
      out[i] = (out[i] ?? 0) + (bgm[i % bgm.length] ?? 0) * g;
    }
  }
  if (settings.sfx) {
    for (const { cue, samples } of sfx) {
      const offset = Math.round(cue.t * sampleRate);
      const gain = settings.sfxVolume * (cue.volume ?? 1);
      for (let i = 0; i < samples.length && offset + i < length; i++) if (offset + i >= 0) out[offset + i] = (out[offset + i] ?? 0) + (samples[i] ?? 0) * gain;
    }
  }
  // ソフトリミッター
  for (let i = 0; i < length; i++) {
    const v = out[i] ?? 0;
    out[i] = Math.abs(v) < 0.8 ? v : Math.sign(v) * (0.8 + 0.2 * Math.tanh((Math.abs(v) - 0.8) / 0.2));
  }
  return out;
}

/** BGMファイルを読み、モノラル・指定のサンプルレートにする */
export async function decodeBgm(blob: Blob, sampleRate: number): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, 1, sampleRate);
  const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
  const out = new Float32Array(buffer.length);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) + (data[i] ?? 0) / buffer.numberOfChannels;
  }
  return out;
}
