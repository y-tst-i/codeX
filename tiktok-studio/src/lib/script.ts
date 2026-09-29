import { z } from "zod";
import type { Scene, Script } from "./types";

const sceneSchema = z.object({
  role: z.enum(["hook", "body", "twist", "cta", "loop"]),
  narration: z.string().min(1),
  reading: z.string().default(""),
  onScreenText: z.string().default(""),
  visual: z.string().default(""),
  emphasis: z.array(z.string()).default([])
});

const scriptSchema = z.object({
  title: z.string().default(""),
  caption: z.string().default(""),
  hashtags: z.array(z.string()).default([]),
  coverText: z.string().default(""),
  scenes: z.array(sceneSchema).min(1)
});

/** Claudeの構造化出力に渡すJSON Schema（scriptSchemaと同じ形） */
export const SCRIPT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "caption", "hashtags", "coverText", "scenes"],
  properties: {
    title: { type: "string", description: "管理用の動画タイトル" },
    caption: { type: "string", description: "TikTokの投稿文（検索されやすいキーワードを自然に含む）" },
    hashtags: { type: "array", items: { type: "string" }, description: "#付きのハッシュタグ3〜5個" },
    coverText: { type: "string", description: "カバー画像に載せる12文字以内の強い一言" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "narration", "reading", "onScreenText", "visual", "emphasis"],
        properties: {
          role: { type: "string", enum: ["hook", "body", "twist", "cta", "loop"] },
          narration: { type: "string", description: "セリフ（字幕表記）" },
          reading: { type: "string", description: "読み上げ用。読み間違えやすい語をひらがなに開く" },
          onScreenText: { type: "string", description: "画面に大きく出す12文字以内のテキスト" },
          visual: { type: "string", description: "このシーンの映像演出" },
          emphasis: { type: "array", items: { type: "string" }, description: "強調する語句" }
        }
      }
    }
  }
} as const;

let idCounter = 0;
export function newSceneId(): string {
  idCounter += 1;
  return `s${Date.now().toString(36)}${idCounter}`;
}

/** 返答テキストからJSONの部分を取り出す（```json フェンスや前置きを許容） */
export function extractJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSONが見つかりませんでした");
  return candidate.slice(start, end + 1);
}

export function parseScript(text: string): Script {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(text));
  } catch (error) {
    throw new Error(`台本JSONを読み込めませんでした: ${(error as Error).message}`);
  }
  const result = scriptSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`台本JSONの形が違います: ${issue?.path.join(".") ?? ""} ${issue?.message ?? ""}`);
  }
  const data = result.data;
  return {
    ...data,
    hashtags: data.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
    scenes: data.scenes.map((scene): Scene => ({ ...scene, id: newSceneId() }))
  };
}

export function emptyScene(): Scene {
  return { id: newSceneId(), role: "body", narration: "", reading: "", onScreenText: "", visual: "", emphasis: [] };
}

export function speakText(scene: Scene): string {
  return scene.reading.trim() || scene.narration;
}
