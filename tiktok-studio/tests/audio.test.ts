import { describe, expect, it } from "vitest";
import { encodeWav, mixClips, pcm16ToClip, sampleRateFromMime, trimSilence } from "../src/lib/audio";

describe("音声処理", () => {
  it("MIMEからサンプルレートを読む", () => {
    expect(sampleRateFromMime("audio/L16;codec=pcm;rate=24000")).toBe(24000);
    expect(sampleRateFromMime("audio/pcm")).toBe(24000);
  });

  it("16bit PCM（リトルエンディアン）を読む", () => {
    const clip = pcm16ToClip(new Uint8Array([0x01, 0x00, 0xff, 0x7f, 0x00, 0x80]), 24000);
    expect([...clip.samples]).toEqual([1, 32767, -32768]);
  });

  it("前後の無音を削る", () => {
    const samples = new Int16Array(24000);
    samples.fill(5000, 10000, 12000);
    const trimmed = trimSilence({ sampleRate: 24000, samples }, 400, 0);
    expect(trimmed.samples.length).toBe(2000);
  });

  it("指定位置に配置し、24kHz→48kHzに伸ばす", () => {
    const clip = { sampleRate: 24000, samples: new Int16Array(24000).fill(16384) };
    const out = mixClips([{ clip, at: 0.5 }], 2, 48000);
    expect(out.length).toBe(96000);
    expect(out[23999]).toBe(0);
    expect(out[24000]).toBeCloseTo(0.5);
    expect(out[24000 + 47990]).toBeCloseTo(0.5);
    expect(out[24000 + 48010]).toBe(0);
  });

  it("WAVヘッダを書く", async () => {
    const blob = encodeWav(new Float32Array(10), 48000);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.length).toBe(44 + 20);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(new DataView(bytes.buffer).getUint32(24, true)).toBe(48000);
  });
});

describe("Gemini TTSへの渡し方", () => {
  it("演技指示とセリフを見出しで分ける（指示が無ければセリフだけ）", async () => {
    const { buildTtsPrompt } = await import("../src/lib/geminiTts");
    expect(buildTtsPrompt("", "第5位から。")).toBe("第5位から。");
    const prompt = buildTtsPrompt("明るく", "第5位から。");
    expect(prompt.indexOf("明るく")).toBeLessThan(prompt.indexOf("TRANSCRIPT"));
    expect(prompt.endsWith("#### TRANSCRIPT\n第5位から。")).toBe(true);
  });

  it("セリフに対して長すぎる音声は指示文の読み上げを疑う", async () => {
    const { looksLikeInstructionsWereRead } = await import("../src/lib/geminiTts");
    expect(looksLikeInstructionsWereRead(13.4, 2.5)).toBe(true);
    expect(looksLikeInstructionsWereRead(3.2, 2.5)).toBe(false);
  });
});
