import { describe, expect, it } from "vitest";
import { voiceLevels } from "../src/lib/audio";
import { buildCharacterPrompt, characterPromptSection, extractCharacterScript, hostExtrasScript } from "../src/lib/character";
import { PALETTES } from "../src/lib/knowledge";
import { buildMotionPrompt, buildScriptPrompt, characterFor } from "../src/lib/prompts";
import { DEFAULT_SETTINGS, newProject } from "../src/lib/project";
import { SAMPLE_CHARACTER } from "../src/lib/sampleCharacter";
import { buildTimeline } from "../src/lib/timeline";

describe("口パク用の音量", () => {
  it("無音は0、声のある区間だけ開く", () => {
    const rate = 48000;
    const samples = new Float32Array(rate * 2);
    for (let i = rate / 2; i < rate; i++) samples[i] = Math.sin(i / 10) * 0.5; // 0.5〜1.0秒だけ声
    const levels = voiceLevels(samples, rate, 30);
    expect(levels).toHaveLength(60);
    expect(levels[5]).toBe(0);
    expect(Math.max(...levels.slice(16, 30))).toBeGreaterThan(0.5);
    expect(levels[50]).toBe(0);
  });

  it("差し込みスクリプトの MG_VOICE_LEVEL が時刻から音量を返す", () => {
    const win: Record<string, unknown> = {};
    const script = hostExtrasScript(undefined, [0, 0.5, 1], 30).replace(/<\/?script>/g, "");
    new Function("window", script)(win);
    const level = win.MG_VOICE_LEVEL as (t: number) => number;
    expect(level(0)).toBe(0);
    expect(level(1 / 30)).toBe(0.5);
    expect(level(10)).toBe(1);
  });
});

describe("看板キャラクター", () => {
  it("返答からキャラのコードを取り出す", () => {
    const text = '紹介文\n```html\n<html><script id="character">window.CHARACTER = {draw(){}};</script><script>other()</script></html>\n```';
    expect(extractCharacterScript(text)).toBe("window.CHARACTER = {draw(){}};");
    expect(() => extractCharacterScript("<script>foo()</script>")).toThrow();
  });

  it("見本キャラは契約どおり（draw を持つ）", () => {
    const win: Record<string, unknown> = {};
    new Function("window", SAMPLE_CHARACTER.script)(win);
    expect(typeof (win.CHARACTER as { draw: unknown }).draw).toBe("function");
  });

  it("設計プロンプト・動画プロンプト・台本プロンプトにキャラが入る", () => {
    expect(buildCharacterPrompt("ラビ", "うさぎ", PALETTES[0]!)).toContain("window.CHARACTER");
    const concept = newProject(DEFAULT_SETTINGS).concept;
    const character = { name: "ラビ先生", concept: "うさぎ", script: "x" };
    expect(characterFor({ ...concept, useCharacter: false }, character)).toBeUndefined();
    expect(characterFor(concept, character)).toBe(character);
    const script = { title: "t", caption: "", hashtags: [], coverText: "", scenes: [{ id: "a", role: "hook" as const, narration: "あ", reading: "", onScreenText: "", visual: "", emphasis: [] }] };
    const prompt = buildMotionPrompt({ concept, script, timeline: buildTimeline(script.scenes, [1]), character });
    expect(prompt).toContain(characterPromptSection(character).slice(0, 20));
    expect(prompt).toContain("MG_VOICE_LEVEL");
    expect(buildScriptPrompt(concept, character)).toContain("ラビ先生");
  });
});

describe("画像キャラ", () => {
  it("声の大きさで口の画像を選ぶ", async () => {
    const { mouthStateFor } = await import("../src/lib/imageCharacter");
    expect(mouthStateFor(0)).toBe("closed");
    expect(mouthStateFor(0.3)).toBe("half");
    expect(mouthStateFor(0.8)).toBe("open");
  });

  it("端からつながる白い背景だけ透明にし、内側の白は残す", async () => {
    const { removeBackground } = await import("../src/lib/imageCharacter");
    // 5x5：外周が白、中央3x3が緑、そのさらに中央が白（白目）
    const w = 5;
    const data = new Uint8ClampedArray(w * w * 4).fill(255);
    for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) {
      const i = (y * w + x) * 4;
      if (!(x === 2 && y === 2)) { data[i] = 30; data[i + 1] = 200; data[i + 2] = 120; }
    }
    removeBackground(data, w, w);
    expect(data[3]).toBe(0); // 角は透明
    expect(data[(1 * w + 1) * 4 + 3]).toBe(255); // 緑は残る
    expect(data[(2 * w + 2) * 4 + 3]).toBe(255); // 中の白も残る
  });

  it("画像キャラのプロンプトは登録した表情だけを案内し、演出のルールが入る", () => {
    const section = characterPromptSection({ kind: "image", name: "テスト", concept: "うさぎ", script: "", imageKeys: ["normal:closed", "normal:open", "happy:open"] });
    expect(section).toContain("expression: normal / happy");
    expect(section).not.toContain("surprised /");
    expect(section).toContain("同じ場所に立たせっぱなしにしない");
  });
});
