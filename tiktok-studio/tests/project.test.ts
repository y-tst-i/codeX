import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, newProject, restoreSettings } from "../src/lib/project";

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
