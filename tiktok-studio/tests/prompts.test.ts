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

describe("演出テクニック", () => {
  it("未選択ならスタイルのおまかせ、選択すればそれを使う", async () => {
    const { resolveTechniques } = await import("../src/lib/techniques");
    expect(resolveTechniques("infographic", []).auto).toBe(true);
    expect(resolveTechniques("infographic", []).techniques.map((t) => t.id)).toContain("TECH-006");
    const chosen = resolveTechniques("infographic", ["TECH-017"]);
    expect(chosen.auto).toBe(false);
    expect(chosen.techniques.map((t) => t.name)).toEqual(["紙吹雪・粒子バースト"]);
  });

  it("モーションプロンプトにテクニックとイージング辞典が入る", () => {
    const timeline = buildTimeline(script.scenes, [2, 1.5]);
    const prompt = buildMotionPrompt({ concept: { ...concept, techniqueIds: ["TECH-017"] }, script, timeline });
    expect(prompt).toContain("紙吹雪・粒子バースト");
    expect(prompt).toContain("easeInBack");
    expect(prompt).toContain("フレームごとに状態を更新する書き方は禁止");
  });

  it("すべてのスタイルのおまかせが実在するテクニックを指す", async () => {
    const { STYLE_TECHNIQUES, TECHNIQUES } = await import("../src/lib/techniques");
    const { STYLES } = await import("../src/lib/knowledge");
    for (const style of STYLES) {
      const ids = STYLE_TECHNIQUES[style.id] ?? [];
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect(TECHNIQUES.some((t) => t.id === id)).toBe(true);
    }
  });
});
