import { describe, expect, it } from "vitest";
import { parseScript, speakText } from "../src/lib/script";

const sample = {
  title: "t",
  caption: "c",
  hashtags: ["雑学", "#信号"],
  coverText: "青信号の謎",
  scenes: [{ role: "hook", narration: "信号の青、", reading: "", onScreenText: "青？", visual: "v", emphasis: ["青"] }]
};

describe("台本JSONの読み込み", () => {
  it("フェンスや前置きがあっても読める", () => {
    const script = parseScript("はい、どうぞ。\n```json\n" + JSON.stringify(sample) + "\n```");
    expect(script.scenes).toHaveLength(1);
    expect(script.scenes[0]?.id).toBeTruthy();
    expect(script.hashtags).toEqual(["#雑学", "#信号"]);
  });

  it("読み上げ用が空ならセリフを読む", () => {
    const script = parseScript(JSON.stringify(sample));
    expect(speakText(script.scenes[0]!)).toBe("信号の青、");
    expect(speakText({ ...script.scenes[0]!, reading: "しんごうのあお" })).toBe("しんごうのあお");
  });

  it("形が違えば分かるエラーにする", () => {
    expect(() => parseScript('{"scenes": []}')).toThrow(/台本JSONの形/);
    expect(() => parseScript("JSONなし")).toThrow(/読み込めません/);
  });
});
