import { base64ToBytes, pcm16ToClip, sampleRateFromMime, trimSilence, type AudioClip } from "./audio";
import { splitBySilence } from "./segment";
import { recordTtsCall } from "./usage";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export interface TtsBase {
  apiKey: string;
  model: string;
  voiceName: string;
  /** 演技指示（例：明るくテンポよく） */
  direction: string;
  /** 1分あたりの上限回数（無料枠は3）。0なら待たない */
  rpm: number;
  signal?: AbortSignal;
}

export interface TtsRequest extends TtsBase {
  text: string;
  /** セリフだけを読んだ場合のおおよその秒数。指示文まで読み上げたかの判定に使う */
  expectedSeconds?: number;
}

interface GeminiPart {
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export class TtsError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Googleが指定してきた待ち時間（ミリ秒） */
    readonly retryAfterMs?: number
  ) {
    super(message);
  }
}

/** 1日の無料枠を使い切った（待っても今日は作れない） */
export class DailyQuotaError extends Error {}

/** まとめて作った音声をシーンに切り分けられなかった */
export class SplitError extends Error {}

/**
 * 演技指示とセリフを、TTSモデルに渡す1本のテキストにする。
 * 指示とセリフを見出しで分け、セリフ（TRANSCRIPT）だけを読ませる。
 */
export function buildTtsPrompt(direction: string, text: string): string {
  const trimmed = direction.trim();
  if (!trimmed) return text;
  return `### DIRECTOR'S NOTES\n${trimmed}\n\n#### TRANSCRIPT\n${text}`;
}

/** セリフに対して音声が長すぎる＝指示文まで読み上げた疑いがある */
export function looksLikeInstructionsWereRead(actualSeconds: number, expectedSeconds: number): boolean {
  return actualSeconds > expectedSeconds * 2 + 1.5;
}

/** 429の中身から「1日の上限」か「待てばよい上限」かを読み取る */
export function classifyRateLimit(body: string): { daily: boolean; retryAfterMs?: number } {
  const daily = /PerDay/i.test(body);
  const delay = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  return { daily, retryAfterMs: delay?.[1] ? Math.ceil(Number(delay[1]) * 1000) : undefined };
}

type VoiceConfigShape = "prebuilt" | "voice";

function body(request: TtsRequest, shape: VoiceConfigShape) {
  const voiceConfig =
    shape === "prebuilt" ? { prebuiltVoiceConfig: { voiceName: request.voiceName } } : { voice: request.voiceName };
  return {
    contents: [{ parts: [{ text: buildTtsPrompt(request.direction, request.text) }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig, languageCode: "ja-JP" }
    }
  };
}

/* ---------------- 1分あたりの回数制限に合わせて待つ ---------------- */

const recentCalls: number[] = [];

async function waitForSlot(rpm: number, signal: AbortSignal | undefined, onWait?: (message: string) => void): Promise<void> {
  if (rpm <= 0) return;
  for (;;) {
    const now = Date.now();
    while (recentCalls.length > 0 && now - recentCalls[0]! >= 60_000) recentCalls.shift();
    if (recentCalls.length < rpm) {
      recentCalls.push(now);
      return;
    }
    const waitMs = 60_000 - (now - recentCalls[0]!) + 500;
    onWait?.(`無料枠は1分に${rpm}回までなので、${Math.ceil(waitMs / 1000)}秒待っています…`);
    await wait(waitMs, signal);
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("中断しました", "AbortError"));
    });
  });
}

async function callOnce(request: TtsRequest, shape: VoiceConfigShape, onWait?: (message: string) => void): Promise<AudioClip> {
  await waitForSlot(request.rpm, request.signal, onWait);
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(request.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": request.apiKey },
    body: JSON.stringify(body(request, shape)),
    signal: request.signal
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 429) {
      const { daily, retryAfterMs } = classifyRateLimit(detail);
      if (daily) {
        throw new DailyQuotaError(
          "今日の無料枠を使い切りました。日本時間の16〜17時ごろにリセットされます（それまでに作った音声は保存されています）。"
        );
      }
      throw new TtsError("1分あたりの上限に達しました", 429, retryAfterMs);
    }
    throw new TtsError(`Gemini TTS ${response.status}: ${detail.slice(0, 400)}`, response.status);
  }

  recordTtsCall();
  const json = (await response.json()) as GeminiResponse;
  if (json.promptFeedback?.blockReason) {
    throw new TtsError(`Gemini TTSがブロックしました: ${json.promptFeedback.blockReason}`, 400);
  }
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    const reason = json.candidates?.[0]?.finishReason ?? "不明";
    throw new TtsError(`音声が返ってきませんでした（finishReason: ${reason}）`, 502);
  }
  const rate = sampleRateFromMime(part.inlineData.mimeType ?? "");
  return trimSilence(pcm16ToClip(base64ToBytes(part.inlineData.data), rate));
}

/**
 * 1回分の音声を作る。
 * 1分あたりの上限（429）や5xxは待って再試行。1日の上限はすぐにやめる。
 * ボイス指定の書式が合わない400は、もう一方の書式で1回だけ試す。
 */
async function synthesizeWithRetry(request: TtsRequest, onStatus?: (message: string) => void): Promise<AudioClip> {
  let shape: VoiceConfigShape = "prebuilt";
  let switchedShape = false;
  for (let attempt = 0; ; attempt++) {
    try {
      return await callOnce(request, shape, onStatus);
    } catch (error) {
      if (!(error instanceof TtsError)) throw error;
      if (error.status === 400 && !switchedShape && /voice/i.test(error.message)) {
        shape = "voice";
        switchedShape = true;
        continue;
      }
      const retryable = error.status === 429 || error.status >= 500;
      if (!retryable || attempt >= 3) throw error;
      const delay = error.retryAfterMs ?? (error.status === 429 ? 30_000 : 3000 * 2 ** attempt);
      onStatus?.(`${error.status === 429 ? "1分あたりの上限" : "混雑"}のため${Math.round(delay / 1000)}秒待って再試行します…`);
      await wait(delay, request.signal);
    }
  }
}

export interface TtsResult {
  clip: AudioClip;
  /** 演技指示まで読み上げたため、指示なしで作り直したか */
  directionDropped: boolean;
}

/** 1シーン分の音声を作る */
export async function synthesize(request: TtsRequest, onStatus?: (message: string) => void): Promise<TtsResult> {
  const clip = await synthesizeWithRetry(request, onStatus);
  const { expectedSeconds } = request;
  if (!request.direction.trim() || !expectedSeconds) return { clip, directionDropped: false };
  if (!looksLikeInstructionsWereRead(clip.samples.length / clip.sampleRate, expectedSeconds)) return { clip, directionDropped: false };
  // 演技指示まで読み上げてしまったので、セリフだけでもう一度作る
  onStatus?.("演技指示まで読み上げたため、セリフだけで作り直しています…");
  return { clip: await synthesizeWithRetry({ ...request, direction: "" }, onStatus), directionDropped: true };
}

/* ---------------- まとめて1回で作る ---------------- */

const SCENE_PAUSE_NOTE = "空行で区切られた段落と段落のあいだでは、1秒ほどしっかり間を空けてから次を読んでください。";
const SCENE_PAUSE_SECONDS = 1;

export interface BatchRequest extends TtsBase {
  texts: string[];
  expectedSeconds: number[];
}

export interface BatchResult {
  clips: AudioClip[];
  directionDropped: boolean;
}

/**
 * 全シーンのセリフを1回のリクエストで読ませ、無音の位置でシーンごとに切り分ける。
 * 無料枠（1日10回など）でも1本1回で済む。切り分けに失敗したら SplitError。
 */
export async function synthesizeScript(request: BatchRequest, onStatus?: (message: string) => void): Promise<BatchResult> {
  const transcript = request.texts.join("\n\n");
  const expectedTotal = request.expectedSeconds.reduce((sum, s) => sum + s, 0) + SCENE_PAUSE_SECONDS * (request.texts.length - 1);
  const notes = [request.direction.trim(), SCENE_PAUSE_NOTE].filter(Boolean).join("\n");

  onStatus?.("全シーンの音声をまとめて生成中…");
  let directionDropped = false;
  const base: TtsBase = { apiKey: request.apiKey, model: request.model, voiceName: request.voiceName, direction: "", rpm: request.rpm, signal: request.signal };
  let clip = await synthesizeWithRetry({ ...base, direction: notes, text: transcript }, onStatus);
  if (looksLikeInstructionsWereRead(clip.samples.length / clip.sampleRate, expectedTotal)) {
    onStatus?.("演技指示まで読み上げたため、セリフだけで作り直しています…");
    clip = await synthesizeWithRetry({ ...base, text: transcript }, onStatus);
    directionDropped = true;
  }

  const clips = splitBySilence(clip, request.expectedSeconds, request.expectedSeconds);
  if (!clips) {
    throw new SplitError("まとめて作った音声をシーンごとにうまく区切れませんでした。「シーンごとに作る」に切り替えて作り直してください。");
  }
  return { clips, directionDropped };
}
