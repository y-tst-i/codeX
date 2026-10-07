/**
 * 自分のPCで動く無料の音声合成ソフト（VOICEVOX / AivisSpeech）で読み上げる。
 * どちらも同じ形のAPI（audio_query → synthesis）なので、まとめて扱う。
 * ブラウザからは Vite の中継（/tts/voicevox, /tts/aivis）経由で呼ぶ。
 */
import { trimSilenceWithOffset, type AudioClip } from "./audio";
import type { TtsEngine } from "./types";

export type LocalEngine = Exclude<TtsEngine, "gemini">;

export const LOCAL_ENGINES: Record<LocalEngine, { label: string; base: string; port: number; download: string; note: string }> = {
  voicevox: {
    label: "VOICEVOX",
    base: "/tts/voicevox",
    port: 50021,
    download: "https://voicevox.hiroshiba.jp/",
    note: "アニメ調のキャラ声がたくさん（ずんだもん・四国めたん など）。動画の概要欄に「VOICEVOX:キャラ名」のクレジットが必要"
  },
  aivis: {
    label: "AivisSpeech",
    base: "/tts/aivis",
    port: 10101,
    download: "https://aivis-project.com/",
    note: "感情がこもった自然な声。音声モデルを追加できる。モデルごとに利用規約（クレジット表記など）が違うので確認する"
  }
};

export interface LocalSpeaker {
  id: number;
  name: string;
  style: string;
}

export class LocalTtsError extends Error {}

const notRunning = (engine: LocalEngine) =>
  new LocalTtsError(`${LOCAL_ENGINES[engine].label} につながりません。${LOCAL_ENGINES[engine].label} のアプリを起動したままにしてから、もう一度押してください（このツールも 起動.bat で開いている必要があります）`);

async function call(engine: LocalEngine, path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${LOCAL_ENGINES[engine].base}${path}`, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw notRunning(engine);
  }
  // 中継先が動いていないと、Vite は 500 番台を返す
  if (response.status >= 500 && response.status !== 503) throw notRunning(engine);
  if (!response.ok) throw new LocalTtsError(`${LOCAL_ENGINES[engine].label} でエラー（${response.status}）: ${(await response.text()).slice(0, 200)}`);
  return response;
}

/** 使える声（キャラ×スタイル）の一覧 */
export async function listSpeakers(engine: LocalEngine): Promise<LocalSpeaker[]> {
  const response = await call(engine, "/speakers");
  const data = (await response.json()) as { name: string; styles: { name: string; id: number; type?: string }[] }[];
  return data.flatMap((speaker) =>
    speaker.styles.filter((style) => !style.type || style.type === "talk").map((style) => ({ id: style.id, name: speaker.name, style: style.name }))
  );
}

/** WAV（RIFF）を読み、1チャンネル目を16bitのクリップにする */
export function wavToClip(buffer: ArrayBuffer): AudioClip {
  const view = new DataView(buffer);
  const text = (offset: number) => String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
  if (buffer.byteLength < 12 || text(0) !== "RIFF" || text(8) !== "WAVE") throw new LocalTtsError("音声データ（WAV）を読めませんでした");
  let offset = 12;
  let channels = 1;
  let sampleRate = 24000;
  let bits = 16;
  while (offset + 8 <= buffer.byteLength) {
    const id = text(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === "data") {
      if (bits !== 16) throw new LocalTtsError(`${bits}bit のWAVには対応していません`);
      const frames = Math.floor(Math.min(size, buffer.byteLength - body) / (2 * channels));
      const samples = new Int16Array(frames);
      for (let i = 0; i < frames; i++) samples[i] = view.getInt16(body + i * 2 * channels, true);
      return { sampleRate, samples };
    }
    offset = body + size + (size % 2);
  }
  throw new LocalTtsError("音声データ（WAV）の中身が見つかりませんでした");
}

export interface LocalTtsRequest {
  engine: LocalEngine;
  speaker: number;
  text: string;
  speed?: number;
  pitch?: number;
  intonation?: number;
  signal?: AbortSignal;
}

/** 口の形のタイミング（秒）。v は a / i / u / e / o / N（ん）/ x（閉じる：っ・無音） */
export interface Viseme {
  t: number;
  e: number;
  v: string;
}

interface Mora {
  consonant_length?: number | null;
  vowel: string;
  vowel_length: number;
}

/** audio_query の結果から、母音ごとの時刻を出す（VOICEVOX / AivisSpeech 共通） */
export function visemesFromQuery(query: { accent_phrases?: { moras: Mora[]; pause_mora?: Mora | null }[]; prePhonemeLength?: number; speedScale?: number }): Viseme[] {
  const speed = query.speedScale || 1;
  let t = query.prePhonemeLength ?? 0.1;
  const out: Viseme[] = [];
  for (const phrase of query.accent_phrases ?? []) {
    for (const mora of phrase.moras) {
      const consonant = (mora.consonant_length ?? 0) / speed;
      const vowel = mora.vowel_length / speed;
      const v = /^[aiueoN]$/.test(mora.vowel) ? mora.vowel : /^[AIUEO]$/.test(mora.vowel) ? mora.vowel.toLowerCase() : "x";
      out.push({ t: t + consonant, e: t + consonant + vowel, v });
      t += consonant + vowel;
    }
    if (phrase.pause_mora) t += phrase.pause_mora.vowel_length / speed;
  }
  return out;
}

export async function synthesizeLocal(request: LocalTtsRequest): Promise<{ clip: AudioClip; visemes: Viseme[] }> {
  const { engine, speaker, text, signal } = request;
  const query = (await (
    await call(engine, `/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, { method: "POST", signal })
  ).json()) as Record<string, unknown>;
  query.speedScale = request.speed ?? 1.1;
  query.pitchScale = request.pitch ?? 0;
  query.intonationScale = request.intonation ?? 1.2;
  query.prePhonemeLength = 0.05;
  query.postPhonemeLength = 0.05;
  const wav = await call(engine, `/synthesis?speaker=${speaker}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/wav" },
    body: JSON.stringify(query),
    signal
  });
  const { clip, offset } = trimSilenceWithOffset(wavToClip(await wav.arrayBuffer()));
  const visemes = visemesFromQuery(query as Parameters<typeof visemesFromQuery>[0])
    .map((v) => ({ t: Math.round((v.t - offset) * 1000) / 1000, e: Math.round((v.e - offset) * 1000) / 1000, v: v.v }))
    .filter((v) => v.e > 0);
  return { clip, visemes };
}

/** 概要欄に入れるクレジット表記 */
export function creditText(engine: LocalEngine, speakerName: string | undefined): string {
  const name = (speakerName ?? "").replace(/（.*$/, "");
  return engine === "voicevox" ? `VOICEVOX:${name || "キャラ名"}` : `AivisSpeech（音声モデル：${name || "モデル名"}）`;
}
