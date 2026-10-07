import { VIDEO } from "./knowledge";
import type { CaptionChunk, Scene, TimedScene, Timeline } from "./types";

const PUNCTUATION = /[、。！？!?,.，．…「」『』（）()\s]/g;
const MAX_CHUNK_CHARS = 14;

/** 読み上げ時間に効く文字数（記号・空白を除く） */
export function spokenLength(text: string): number {
  return text.replace(PUNCTUATION, "").length;
}

export function estimateSpeechSeconds(text: string): number {
  const length = spokenLength(text);
  if (length === 0) return 0;
  return Math.max(0.6, length / VIDEO.charsPerSecond);
}

/**
 * セリフを字幕の塊に分ける。句読点で切り、長すぎる塊はほぼ均等に割る。
 */
export function splitCaptionText(text: string): string[] {
  const parts = text
    .split(/(?<=[、。！？!?])/)
    .map((part) => part.trim())
    .filter((part) => spokenLength(part) > 0);

  const chunks: string[] = [];
  for (const part of parts) {
    const length = part.length;
    if (length <= MAX_CHUNK_CHARS) {
      chunks.push(part);
      continue;
    }
    const pieces = Math.ceil(length / MAX_CHUNK_CHARS);
    const size = Math.ceil(length / pieces);
    for (let i = 0; i < length; i += size) chunks.push(part.slice(i, i + size));
  }
  return chunks;
}

/** 区間 [start, end] に字幕を文字数比例で割り付ける */
export function buildCaptions(text: string, start: number, end: number): CaptionChunk[] {
  const chunks = splitCaptionText(text);
  const total = chunks.reduce((sum, chunk) => sum + Math.max(1, spokenLength(chunk)), 0);
  if (chunks.length === 0 || end <= start) return [];

  const span = end - start;
  const captions: CaptionChunk[] = [];
  let cursor = start;
  chunks.forEach((chunk, index) => {
    const share = (Math.max(1, spokenLength(chunk)) / total) * span;
    const chunkEnd = index === chunks.length - 1 ? end : cursor + share;
    captions.push({ text: chunk, start: round(cursor), end: round(chunkEnd) });
    cursor = chunkEnd;
  });
  return captions;
}

/**
 * シーンと（あれば）実測の音声長からタイムラインを組む。
 * audioDurations[i] が無いシーンは文字数から推定する。
 */
export function buildTimeline(scenes: Scene[], audioDurations: (number | undefined)[] = []): Timeline {
  let cursor = VIDEO.leadIn;
  const timed: TimedScene[] = scenes.map((scene, index) => {
    const measured = audioDurations[index];
    const hasAudio = typeof measured === "number" && measured > 0;
    const speech = hasAudio ? measured : estimateSpeechSeconds(scene.narration);
    const isFirst = index === 0;
    const isLast = index === scenes.length - 1;

    const start = isFirst ? 0 : cursor - VIDEO.sceneGap / 2;
    const speechStart = cursor;
    const speechEnd = cursor + speech;
    cursor = speechEnd + VIDEO.sceneGap;
    const end = isLast ? speechEnd + VIDEO.tail : speechEnd + VIDEO.sceneGap / 2;

    return {
      ...scene,
      index,
      start: round(start),
      end: round(end),
      speechStart: round(speechStart),
      speechEnd: round(speechEnd),
      captions: buildCaptions(scene.narration, speechStart, speechEnd),
      timingSource: hasAudio ? "audio" : "estimate"
    };
  });

  const last = timed[timed.length - 1];
  return { duration: last ? last.end : 0, fps: VIDEO.fps, scenes: timed };
}

/** Claudeに渡すための、人間にも読めるタイムライン表 */
export function formatTimelineForPrompt(timeline: Timeline): string {
  return timeline.scenes
    .map((scene) => {
      const captions = scene.captions
        .map((caption) => `      - ${caption.start.toFixed(2)}s〜${caption.end.toFixed(2)}s「${caption.text}」`)
        .join("\n");
      const emphasis = scene.emphasis.length > 0 ? scene.emphasis.join("／") : "（なし）";
      return [
        `### シーン${scene.index + 1}（${scene.role}） ${scene.start.toFixed(2)}s〜${scene.end.toFixed(2)}s`,
        `  - 声が鳴る区間: ${scene.speechStart.toFixed(2)}s〜${scene.speechEnd.toFixed(2)}s`,
        `  - セリフ: 「${scene.narration}」`,
        `  - 画面の大きな文字: 「${scene.onScreenText}」`,
        `  - 強調語: ${emphasis}`,
        `  - 演出メモ: ${scene.visual}`,
        `  - 字幕（この時刻に同期して表示）:`,
        captions
      ].join("\n");
    })
    .join("\n\n");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
