import { base64ToBytes, pcm16ToClip, sampleRateFromMime, trimSilence, type AudioClip } from "./audio";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export interface TtsRequest {
  apiKey: string;
  model: string;
  voiceName: string;
  /** 演技指示（例：明るくテンポよく） */
  direction: string;
  text: string;
  /** セリフだけを読んだ場合のおおよその秒数。指示文まで読み上げたかの判定に使う */
  expectedSeconds?: number;
  signal?: AbortSignal;
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
    readonly status: number
  ) {
    super(message);
  }
}

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

async function callOnce(request: TtsRequest, shape: VoiceConfigShape): Promise<AudioClip> {
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(request.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": request.apiKey },
    body: JSON.stringify(body(request, shape)),
    signal: request.signal
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new TtsError(`Gemini TTS ${response.status}: ${detail.slice(0, 400)}`, response.status);
  }

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

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("中断しました", "AbortError"));
    });
  });
}

/**
 * 1セリフ分の音声を作る。
 * 429/5xx は待って再試行。ボイス指定の書式が合わない400は、もう一方の書式で1回だけ試す。
 */
export interface TtsResult {
  clip: AudioClip;
  /** 演技指示まで読み上げたため、指示なしで作り直したか */
  directionDropped: boolean;
}

export async function synthesize(request: TtsRequest, onRetry?: (message: string) => void): Promise<TtsResult> {
  const clip = await synthesizeWithRetry(request, onRetry);
  const { expectedSeconds } = request;
  if (!request.direction.trim() || !expectedSeconds) return { clip, directionDropped: false };
  if (!looksLikeInstructionsWereRead(clip.samples.length / clip.sampleRate, expectedSeconds)) return { clip, directionDropped: false };
  // 演技指示まで読み上げてしまったので、セリフだけでもう一度作る
  onRetry?.("演技指示まで読み上げたため、セリフだけで作り直しています…");
  return { clip: await synthesizeWithRetry({ ...request, direction: "" }, onRetry), directionDropped: true };
}

async function synthesizeWithRetry(request: TtsRequest, onRetry?: (message: string) => void): Promise<AudioClip> {
  let shape: VoiceConfigShape = "prebuilt";
  let switchedShape = false;
  for (let attempt = 0; ; attempt++) {
    try {
      return await callOnce(request, shape);
    } catch (error) {
      if (!(error instanceof TtsError)) throw error;
      if (error.status === 400 && !switchedShape && /voice/i.test(error.message)) {
        shape = "voice";
        switchedShape = true;
        continue;
      }
      const retryable = error.status === 429 || error.status >= 500;
      if (!retryable || attempt >= 4) throw error;
      const delay = 2000 * 2 ** attempt;
      onRetry?.(`混み合っているため${Math.round(delay / 1000)}秒待って再試行します…`);
      await wait(delay, request.signal);
    }
  }
}
