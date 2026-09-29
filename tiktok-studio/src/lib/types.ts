export type SceneRole = "hook" | "body" | "twist" | "cta" | "loop";

export interface Concept {
  /** アカウントのジャンル（例：お金の雑学） */
  niche: string;
  /** 誰に向けた動画か */
  target: string;
  /** 今回の動画のテーマ・ネタ */
  topic: string;
  /** 参考情報・入れたい事実（任意） */
  notes: string;
  /** 目標尺（秒） */
  durationSec: number;
  hookId: string;
  styleId: string;
  paletteId: string;
  fontId: string;
  /** 視聴者にしてほしい行動 */
  goal: "follow" | "save" | "share" | "comment";
  /** 語り口（例：テンポよく親しみやすい） */
  tone: string;
}

export interface Scene {
  id: string;
  role: SceneRole;
  /** セリフ（字幕にもそのまま出る表記） */
  narration: string;
  /** 読み上げ用テキスト。読み間違えやすい語をひらがなに開いたもの。空ならnarrationを読む */
  reading: string;
  /** 画面に大きく出す短いテキスト */
  onScreenText: string;
  /** 映像演出の指示 */
  visual: string;
  /** 強調したい語句 */
  emphasis: string[];
}

export interface Script {
  title: string;
  /** TikTok投稿文 */
  caption: string;
  hashtags: string[];
  /** カバー（サムネ）用テキスト */
  coverText: string;
  scenes: Scene[];
}

export interface CaptionChunk {
  text: string;
  start: number;
  end: number;
}

export interface TimedScene extends Scene {
  index: number;
  /** 動画全体での開始秒 */
  start: number;
  /** 動画全体での終了秒 */
  end: number;
  /** 音声が鳴っている区間 */
  speechStart: number;
  speechEnd: number;
  captions: CaptionChunk[];
  /** 音声実測か推定か */
  timingSource: "audio" | "estimate";
}

export interface Timeline {
  duration: number;
  fps: number;
  scenes: TimedScene[];
}

export interface VoiceSettings {
  voiceName: string;
  /** Geminiへの演技指示 */
  direction: string;
  model: string;
}

export interface ApiSettings {
  anthropicKey: string;
  geminiKey: string;
  claudeModel: string;
  effort: "medium" | "high" | "xhigh" | "max";
  ttsModel: string;
}
