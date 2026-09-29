import { VOICE_DIRECTIONS } from "./knowledge";
import type { ProjectState } from "./storage";
import type { ApiSettings, VoiceSettings } from "./types";

export const DEFAULT_SETTINGS: ApiSettings = {
  anthropicKey: "",
  geminiKey: "",
  claudeModel: "claude-opus-5-5",
  effort: "high",
  ttsModel: "gemini-3.8-flash-tts"
};

export function defaultVoice(settings: ApiSettings): VoiceSettings {
  return { voiceName: "Puck", direction: VOICE_DIRECTIONS[0]!.text, model: settings.ttsModel };
}

/** 新しい動画を始める。声はアカウントの声（なければ初期値）を引き継ぐ */
export function newProject(settings: ApiSettings): ProjectState {
  return {
    concept: {
      niche: "",
      target: "",
      topic: "",
      notes: "",
      durationSec: 30,
      hookId: "shock-number",
      styleId: "kinetic-type",
      paletteId: "night-lime",
      fontId: "noto-black",
      goal: "follow",
      tone: "テンポよく親しみやすい"
    },
    script: null,
    voice: { ...(settings.accountVoice ?? defaultVoice(settings)) },
    html: ""
  };
}

/**
 * 保存済みの設定を読み込む。アカウントの声がまだ無い古いデータでは、
 * 作業中の動画の声をアカウントの声として採用する。
 */
export function restoreSettings(saved: Partial<ApiSettings> | null, savedProject: ProjectState | null): ApiSettings {
  const settings: ApiSettings = { ...DEFAULT_SETTINGS, ...saved };
  if (!settings.accountVoice && savedProject) settings.accountVoice = { ...savedProject.voice };
  return settings;
}
