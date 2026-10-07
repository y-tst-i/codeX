import { describe, expect, it } from "vitest";
import type { AudioClip } from "../src/lib/audio";
import { classifyRateLimit } from "../src/lib/geminiTts";
import { chooseCuts, findGaps, splitBySilence } from "../src/lib/segment";
import { quotaDay } from "../src/lib/usage";

const RATE = 24000;

/** [音の秒数, 無音の秒数, ...] から音声を作る。声の中に短い息継ぎ（0.2秒）も混ぜる */
function makeClip(pattern: number[]): AudioClip {
  const total = pattern.reduce((a, b) => a + b, 0);
  const samples = new Int16Array(Math.round(total * RATE));
  let cursor = 0;
  pattern.forEach((seconds, i) => {
    const length = Math.round(seconds * RATE);
    if (i % 2 === 0) for (let j = 0; j < length; j++) samples[cursor + j] = j % 2 === 0 ? 6000 : -6000;
    cursor += length;
  });
  return { sampleRate: RATE, samples };
}

describe("まとめて作った音声の切り分け", () => {
  it("無音を見つける（先頭・末尾は除く）", () => {
    const gaps = findGaps(makeClip([0.1, 0.5, 1, 0.3, 1, 0.2]));
    expect(gaps).toHaveLength(2);
    expect(gaps[1]!.end - gaps[1]!.start).toBeCloseTo(0.3, 1);
  });

  it("文中の短い息継ぎより、シーン間の長い間を区切りに選ぶ", () => {
    // シーン1(2秒, 途中に0.25秒の息継ぎ) / 1秒の間 / シーン2(1.5秒) / 0.9秒の間 / シーン3(2秒, 途中0.3秒の息継ぎ)
    const clip = makeClip([1, 0.25, 1, 1.0, 1.5, 0.9, 1, 0.3, 1, 0]);
    const parts = splitBySilence(clip, [2, 1.5, 2], [2, 1.5, 2]);
    expect(parts).not.toBeNull();
    const seconds = parts!.map((p) => p.samples.length / RATE);
    expect(seconds[0]).toBeCloseTo(2.25 + 0.06, 1);
    expect(seconds[1]).toBeCloseTo(1.5 + 0.06, 1);
    expect(seconds[2]).toBeCloseTo(2.3 + 0.06, 1);
  });

  it("区切りの候補が足りなければ null", () => {
    expect(chooseCuts([{ start: 1, end: 1.5 }], [1, 1, 1], 0, 3)).toBeNull();
    expect(splitBySilence(makeClip([3, 0]), [1, 1], [1, 1])).toBeNull();
  });

  it("1シーンならそのまま", () => {
    expect(splitBySilence(makeClip([0.2, 1, 0.2]), [1], [1])).toHaveLength(1);
  });
});

describe("回数制限", () => {
  it("1日の上限と、待てばよい上限を見分ける", () => {
    const daily = '{"error":{"code":429,"details":[{"violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}}';
    expect(classifyRateLimit(daily).daily).toBe(true);
    const minute = '{"error":{"details":[{"violations":[{"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"37s"}]}}';
    expect(classifyRateLimit(minute)).toEqual({ daily: false, retryAfterMs: 37000 });
  });

  it("1日の区切りは米国太平洋時間（日本時間の夕方に切り替わる）", () => {
    expect(quotaDay(new Date("2026-09-30T06:00:00Z"))).toBe("2026-09-29"); // 日本時間15時
    expect(quotaDay(new Date("2026-09-30T08:00:00Z"))).toBe("2026-09-30"); // 日本時間17時
  });
});

describe("止まっている時間の計測", () => {
  it("差分が小さいコマを合計し、0.6秒を超える停止区間を拾う（最後の読ませる部分は除く）", async () => {
    const { summarizeFrozen } = await import("../src/lib/frames");
    // 10fps：0〜1秒は動く、1.0〜2.0秒（10コマ）止まる、2〜3秒動く、最後の1秒止まる
    const diffs = [...Array(10).fill(5), ...Array(10).fill(0.1), ...Array(10).fill(5), ...Array(10).fill(0.1)];
    const report = summarizeFrozen(diffs, 10, 4);
    expect(report.frozenSeconds).toBeCloseTo(2, 1);
    expect(report.longStretches).toEqual([{ start: 1, end: 2.1 }]);
  });
});
