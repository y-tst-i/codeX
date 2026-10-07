import type { AudioSettings } from "./sfx";
import type { CharacterSettings } from "./character";

export type SceneRole = "hook" | "body" | "twist" | "cta" | "loop" | "drama";

/** 動画の型。manga＝漫画ドラマで共感させてから、キャラが心理学で解説する */
export type VideoFormat = "standard" | "manga";

/** 漫画ドラマの1コマ（絵は Codex に描かせ、吹き出し・効果音の文字は動画側で重ねる） */
export interface Panel {
  /** 登場人物のID（CastMember.id） */
  cast: string[];
  /** 何をどう描くか（場所・構図・表情・しぐさ） */
  shot: string;
  /** 吹き出しのセリフ（12文字以内。無ければ空） */
  line: string;
  /** 話している人のID */
  speaker: string;
  /** 描き文字の効果音（ドキッ・ガーン など。無ければ空） */
  sfx: string;
}

/** 漫画ドラマの登場人物（アカウントで固定。毎回同じ見た目で出る） */
export interface CastMember {
  id: string;
  name: string;
  /** 見た目・性格（画像生成とセリフづくりに使う） */
  description: string;
}

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
  /** 動画の型（無ければ standard） */
  format?: VideoFormat;
  /** 使う演出テクニック（TECH-xxx）。空ならスタイルのおまかせ */
  techniqueIds?: string[];
  /** 看板キャラクターを登場させるか（キャラ設定がある場合。未指定なら登場させる） */
  useCharacter?: boolean;
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
  /** 漫画ドラマのコマ（role が drama のシーンだけ） */
  panels?: Panel[];
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
  /** 音声合成の方法（無ければ Gemini） */
  engine?: TtsEngine;
  /** VOICEVOX / AivisSpeech の話者（スタイル）ID と表示名 */
  localSpeaker?: number;
  localSpeakerName?: string;
  /** 話す速さ・声の高さ・抑揚（VOICEVOX / AivisSpeech） */
  speed?: number;
  pitch?: number;
  intonation?: number;
}

export type TtsEngine = "gemini" | "voicevox" | "aivis";

export interface ApiSettings {
  anthropicKey: string;
  geminiKey: string;
  claudeModel: string;
  effort: "medium" | "high" | "xhigh" | "max";
  ttsModel: string;
  /** Gemini TTSの1分あたりの上限回数（無料枠は3）。0なら制限なし */
  ttsRpm?: number;
  /** Gemini TTSの1日あたりの上限回数（無料枠は10）。0なら表示しない */
  ttsDailyLimit?: number;
  /** 音声の作り方：まとめて1回（無料枠向け）／シーンごと */
  ttsMode?: "batch" | "scene";
  /** アカウントの声。新しい動画はこの声で始まる（声はアカウントの「顔」なので固定する） */
  accountVoice?: VoiceSettings;
  /** アカウントの「らしさ」。新しい動画はこのジャンル・見た目で始まる */
  accountBrand?: AccountBrand;
  /** 看板キャラクター */
  character?: CharacterSettings;
  /** 効果音・BGM の設定 */
  audio?: AudioSettings;
  /** 漫画ドラマの登場人物 */
  cast?: CastMember[];
}

/** 動画ごとに変えず、アカウントで固定する企画項目（フックの型やテーマは毎回変える） */
export type AccountBrand = Pick<Concept, "niche" | "target" | "styleId" | "paletteId" | "fontId" | "tone" | "format">;
