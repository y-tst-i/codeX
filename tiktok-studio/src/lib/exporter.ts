import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo
} from "mediabunny";
import { VIDEO } from "./knowledge";
import type { LoadedGraphic } from "./mg";

export interface ExportOptions {
  graphic: LoadedGraphic;
  duration: number;
  fps: number;
  /** ナレーション（無音で書き出すならnull） */
  audio: { samples: Float32Array; sampleRate: number } | null;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
  /** モーションブラー：1フレームを何回に分けて描いて重ねるか（1で無し） */
  motionBlurSamples?: number;
}

export const EXPORT_SAMPLE_RATE = 48000;

export interface ExportResult {
  blob: Blob;
  extension: "mp4" | "webm";
}

interface Container {
  extension: "mp4" | "webm";
  videoCodec: "avc" | "vp9";
  audioCodec: "aac" | "opus";
}

/** TikTok向けに最も互換性の高い組み合わせから順に、このブラウザで使えるものを選ぶ */
async function pickContainer(needAudio: boolean): Promise<Container> {
  const size = { width: VIDEO.width, height: VIDEO.height };
  if ((await canEncodeVideo("avc", size)) && (!needAudio || (await canEncodeAudio("aac")))) {
    return { extension: "mp4", videoCodec: "avc", audioCodec: "aac" };
  }
  if ((await canEncodeVideo("vp9", size)) && (!needAudio || (await canEncodeAudio("opus")))) {
    return { extension: "webm", videoCodec: "vp9", audioCodec: "opus" };
  }
  throw new Error("このブラウザでは動画をエンコードできません。最新のChromeかEdgeを使ってください。");
}

/**
 * render(t) を1フレームずつ呼んで動画ファイルに書き出す。
 * 実時間再生の録画ではないので、重い演出でもコマ落ちしない。
 * 基本はMP4（H.264＋AAC）。使えないブラウザではWebM（VP9＋Opus）にする。
 */
export async function exportVideo(options: ExportOptions): Promise<ExportResult> {
  const { graphic, duration, fps, audio, onProgress, signal } = options;
  const samples = Math.max(1, Math.round(options.motionBlurSamples ?? 1));
  // シャッターを開けている長さ（1フレームの半分＝映画と同じ 180度シャッター）
  const shutter = 0.5 / fps;

  if (typeof VideoEncoder === "undefined") {
    throw new Error("このブラウザは動画の書き出し（WebCodecs）に対応していません。最新のChromeかEdgeを使ってください。");
  }
  const container = await pickContainer(Boolean(audio));

  // iframe内のcanvasを直接渡さず、こちら側のcanvasへ写してから入れる
  const stage = document.createElement("canvas");
  stage.width = VIDEO.width;
  stage.height = VIDEO.height;
  const ctx = stage.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("canvasを初期化できません");

  const output = new Output({
    format: container.extension === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat(),
    target: new BufferTarget()
  });
  const video = new CanvasSource(stage, {
    codec: container.videoCodec,
    bitrate: 16_000_000,
    keyFrameInterval: 1
  });
  output.addVideoTrack(video, { frameRate: fps });

  let audioSource: AudioBufferSource | null = null;
  if (audio) {
    audioSource = new AudioBufferSource({ codec: container.audioCodec, bitrate: 192_000 });
    output.addAudioTrack(audioSource);
  }

  await output.start();
  try {
    if (audio && audioSource) {
      const buffer = new AudioBuffer({ length: audio.samples.length, numberOfChannels: 1, sampleRate: audio.sampleRate });
      buffer.copyToChannel(new Float32Array(audio.samples), 0);
      await audioSource.add(buffer);
      audioSource.close();
    }

    const totalFrames = Math.round(duration * fps);
    for (let frame = 0; frame < totalFrames; frame++) {
      if (signal?.aborted) throw new DOMException("中断しました", "AbortError");
      const t = frame / fps;
      if (samples === 1) {
        graphic.mg.render(t);
        ctx.drawImage(graphic.canvas, 0, 0, VIDEO.width, VIDEO.height);
      } else {
        // 少しずつ時刻をずらして描いた絵を平均する（速く動くものが自然にブレて、動画らしくなる）
        for (let k = 0; k < samples; k++) {
          graphic.mg.render(Math.max(0, t + (k / (samples - 1) - 0.5) * shutter));
          ctx.globalAlpha = 1 / (k + 1);
          ctx.drawImage(graphic.canvas, 0, 0, VIDEO.width, VIDEO.height);
        }
        ctx.globalAlpha = 1;
      }
      await video.add(t, 1 / fps);
      if (frame % 10 === 0) {
        onProgress?.(frame / totalFrames);
        // UIを固めないよう時々制御を返す
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    video.close();
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }

  onProgress?.(1);
  const bytes = output.target.buffer;
  if (!bytes) throw new Error("書き出しに失敗しました");
  return { blob: new Blob([bytes], { type: `video/${container.extension}` }), extension: container.extension };
}
