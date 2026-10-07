import { describe, expect, it } from "vitest";
import { clipSignature } from "../src/components/VoiceStep";
import { creditText, wavToClip } from "../src/lib/localTts";

function wav(samples: number[], rate: number, channels = 1): ArrayBuffer {
  const data = new DataView(new ArrayBuffer(samples.length * 2));
  samples.forEach((v, i) => data.setInt16(i * 2, v, true));
  const head = new DataView(new ArrayBuffer(44));
  const put = (o: number, s: string) => [...s].forEach((c, i) => head.setUint8(o + i, c.charCodeAt(0)));
  put(0, "RIFF");
  head.setUint32(4, 36 + data.byteLength, true);
  put(8, "WAVE");
  put(12, "fmt ");
  head.setUint32(16, 16, true);
  head.setUint16(20, 1, true);
  head.setUint16(22, channels, true);
  head.setUint32(24, rate, true);
  head.setUint32(28, rate * 2 * channels, true);
  head.setUint16(32, 2 * channels, true);
  head.setUint16(34, 16, true);
  put(36, "data");
  head.setUint32(40, data.byteLength, true);
  const out = new Uint8Array(44 + data.byteLength);
  out.set(new Uint8Array(head.buffer), 0);
  out.set(new Uint8Array(data.buffer), 44);
  return out.buffer;
}

describe("VOICEVOX / AivisSpeech", () => {
  it("WAVを読み、サンプルレートを保ったまま16bitのクリップにする（ステレオは1ch目）", () => {
    expect(wavToClip(wav([1, -2, 3], 44100))).toEqual({ sampleRate: 44100, samples: new Int16Array([1, -2, 3]) });
    expect(Array.from(wavToClip(wav([10, 20, 30, 40], 24000, 2)).samples)).toEqual([10, 30]);
    expect(() => wavToClip(new ArrayBuffer(8))).toThrow();
  });

  it("声や速さを変えたら、音声を作り直しが必要になる", () => {
    const base = { voiceName: "Puck", direction: "", model: "m", engine: "voicevox" as const, localSpeaker: 3 };
    expect(clipSignature(base, "こんにちは")).not.toBe(clipSignature({ ...base, localSpeaker: 1 }, "こんにちは"));
    expect(clipSignature(base, "こんにちは")).not.toBe(clipSignature({ ...base, speed: 1.3 }, "こんにちは"));
    expect(clipSignature(base, "こんにちは")).not.toBe(clipSignature({ ...base, engine: "gemini" }, "こんにちは"));
  });

  it("クレジット表記", () => {
    expect(creditText("voicevox", "ずんだもん（ノーマル）")).toBe("VOICEVOX:ずんだもん");
    expect(creditText("aivis", "まい（ノーマル）")).toBe("AivisSpeech（音声モデル：まい）");
  });
});
