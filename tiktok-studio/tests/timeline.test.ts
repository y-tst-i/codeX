import { describe, expect, it } from "vitest";
import { VIDEO } from "../src/lib/knowledge";
import { buildCaptions, buildTimeline, splitCaptionText, spokenLength } from "../src/lib/timeline";
import type { Scene } from "../src/lib/types";

const scene = (narration: string): Scene => ({ id: narration, role: "body", narration, reading: "", onScreenText: "", visual: "", emphasis: [] });

describe("字幕の分割", () => {
  it("句読点で区切り、記号は読み上げ文字数に数えない", () => {
    expect(splitCaptionText("信号の青って、どう見ても緑ですよね？")).toEqual(["信号の青って、", "どう見ても緑ですよね？"]);
    expect(spokenLength("「青」、")).toBe(1);
  });

  it("長すぎる塊はほぼ均等に割る", () => {
    const chunks = splitCaptionText("あいうえおかきくけこさしすせそたちつてとなにぬねの");
    expect(chunks.length).toBe(2);
    expect(chunks.join("")).toBe("あいうえおかきくけこさしすせそたちつてとなにぬねの");
  });

  it("字幕は区間をすき間なく埋め、最後は区間の終わりに一致する", () => {
    const captions = buildCaptions("一つ目、二つ目の文です。", 1, 3);
    expect(captions[0]?.start).toBe(1);
    expect(captions.at(-1)?.end).toBe(3);
    expect(captions[0]?.end).toBe(captions[1]?.start);
  });
});

describe("タイムライン", () => {
  it("実測の音声長でシーンを並べ、シーン間にすき間を入れる", () => {
    const timeline = buildTimeline([scene("あ"), scene("い"), scene("う")], [1.5, 2, 1]);
    const [a, b, c] = timeline.scenes;
    expect(a?.start).toBe(0);
    expect(a?.speechStart).toBe(VIDEO.leadIn);
    expect(a?.speechEnd).toBeCloseTo(VIDEO.leadIn + 1.5);
    expect(b?.speechStart).toBeCloseTo(VIDEO.leadIn + 1.5 + VIDEO.sceneGap);
    expect(a?.end).toBe(b?.start);
    expect(c?.end).toBeCloseTo((c?.speechEnd ?? 0) + VIDEO.tail);
    expect(timeline.duration).toBe(c?.end);
    expect(timeline.scenes.every((s) => s.timingSource === "audio")).toBe(true);
  });

  it("音声がないシーンは文字数から推定する", () => {
    const timeline = buildTimeline([scene("これは音声のないシーンです")], []);
    expect(timeline.scenes[0]?.timingSource).toBe("estimate");
    expect(timeline.duration).toBeGreaterThan(1);
  });
});
