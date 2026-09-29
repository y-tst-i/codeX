import { describe, expect, it } from "vitest";
import { buildFixPrompt, buildMotionPrompt, buildScriptPrompt, googleFontsUrl } from "../src/lib/prompts";
import { buildTimeline } from "../src/lib/timeline";
import type { Concept, Script } from "../src/lib/types";

const concept: Concept = {
  niche: "雑学",
  target: "20代",
  topic: "青信号の謎",
  notes: "",
  durationSec: 30,
  hookId: "question",
  styleId: "infographic",
  paletteId: "cream-red",
  fontId: "dela",
  goal: "save",
  tone: "テンポよく"
};

const script: Script = {
  title: "青信号",
  caption: "",
  hashtags: [],
  coverText: "",
  scenes: [
    { id: "a", role: "hook", narration: "信号の青って、緑ですよね？", reading: "", onScreenText: "青？", visual: "", emphasis: ["緑"] },
    { id: "b", role: "loop", narration: "ところで信号の青って", reading: "", onScreenText: "青", visual: "", emphasis: [] }
  ]
};

describe("プロンプト", () => {
  it("台本プロンプトに企画内容とフックの型が入る", () => {
    const prompt = buildScriptPrompt(concept);
    expect(prompt).toContain("青信号の謎");
    expect(prompt).toContain("答えたくなる問い");
    expect(prompt).toContain("保存");
  });

  it("モーションプロンプトに実測タイムライン・契約・スタイルが入る", () => {
    const timeline = buildTimeline(script.scenes, [2, 1.5]);
    const prompt = buildMotionPrompt({ concept, script, timeline });
    expect(prompt).toContain(`duration: ${timeline.duration.toFixed(3)}`);
    expect(prompt).toContain("window.MG");
    expect(prompt).toContain("__MG_HOST__");
    expect(prompt).toContain("図解インフォグラフィック");
    expect(prompt).toContain("Dela Gothic One");
    expect(prompt).toContain("信号の青って、");
    expect(prompt).toContain("#e8322b");
  });

  it("修正プロンプトに問題点とHTMLが入る", () => {
    const prompt = buildFixPrompt("<html></html>", ["render(t) でエラー"]);
    expect(prompt).toContain("render(t) でエラー");
    expect(prompt).toContain("<html></html>");
  });

  it("Google FontsのURLを作る", () => {
    expect(googleFontsUrl("Noto Sans JP", [900, 500])).toBe("https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;900&display=block");
  });
});
