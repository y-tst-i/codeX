import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, brandOf, newProject, restoreSettings } from "../src/lib/project";

const kore = { voiceName: "Kore", direction: "落ち着いて", model: "gemini-3.8-flash-tts" };

describe("アカウントの声", () => {
  it("新しい動画はアカウントの声で始まる", () => {
    expect(newProject({ ...DEFAULT_SETTINGS, accountVoice: kore }).voice).toEqual(kore);
  });

  it("アカウントの声が未設定なら初期値", () => {
    expect(newProject(DEFAULT_SETTINGS).voice.voiceName).toBe("Puck");
  });

  it("古いデータでは作業中の動画の声をアカウントの声にする", () => {
    const project = { ...newProject(DEFAULT_SETTINGS), voice: kore };
    expect(restoreSettings({ geminiKey: "k" }, project).accountVoice).toEqual(kore);
    expect(restoreSettings({ accountVoice: { ...kore, voiceName: "Puck" } }, project).accountVoice?.voiceName).toBe("Puck");
  });
});

describe("アカウントのらしさ", () => {
  it("ジャンル・見た目は引き継ぎ、テーマとフックは毎回まっさら", () => {
    const concept = { ...newProject(DEFAULT_SETTINGS).concept, niche: "恋愛心理学", styleId: "glass-gradient", paletteId: "pastel-pop", topic: "前回のテーマ", hookId: "question" };
    const next = newProject({ ...DEFAULT_SETTINGS, accountBrand: brandOf(concept) }).concept;
    expect(next.niche).toBe("恋愛心理学");
    expect(next.styleId).toBe("glass-gradient");
    expect(next.paletteId).toBe("pastel-pop");
    expect(next.topic).toBe("");
    expect(next.hookId).toBe("shock-number");
  });
});
