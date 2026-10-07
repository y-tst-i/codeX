import { z } from "zod";
import { HOOKS } from "./knowledge";
import { extractJson, newSceneId } from "./script";
import type { Concept } from "./types";

/** ネタ帳の1件 */
export interface Idea {
  id: string;
  /** 動画のテーマ */
  topic: string;
  hookId: string;
  /** 1文目の案 */
  hookLine: string;
  /** なぜ伸びそうか */
  why: string;
  /** 台本に渡す事実・材料 */
  notes: string;
  used: boolean;
}

export const IDEA_COUNT = 15;

export const IDEAS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "hookId", "hookLine", "why", "notes"],
        properties: {
          topic: { type: "string", description: "動画のテーマ（30文字以内）" },
          hookId: { type: "string", enum: HOOKS.map((hook) => hook.id) },
          hookLine: { type: "string", description: "動画の1文目（11文字前後で言い切る）" },
          why: { type: "string", description: "伸びそうな理由（1文）" },
          notes: { type: "string", description: "台本に使う事実・材料。不確かなものは『〜と言われている』と書く" }
        }
      }
    }
  }
};

export function ideasSystemPrompt(): string {
  return [
    "あなたは日本のTikTokで伸びるネタを量産している企画担当です。",
    "視聴者が『自分のことだ』『誰かに送りたい』『最後まで見たい』と感じるテーマを、事実に誠実に出します。"
  ].join("\n");
}

export function buildIdeasPrompt(concept: Concept, usedTopics: string[], count = IDEA_COUNT): string {
  const hooks = HOOKS.map((hook) => `- ${hook.id}: ${hook.name}（${hook.formula}／例「${hook.example}」）`).join("\n");
  const avoid = usedTopics.length > 0 ? usedTopics.slice(-60).map((topic) => `- ${topic}`).join("\n") : "（まだなし）";

  return `# 依頼
TikTokの縦型ショート動画（モーショングラフィックス＋AIナレーション、顔出しなし、${concept.durationSec}秒前後）のネタを${count}本分考えてください。

# アカウント
- ジャンル: ${concept.niche || "（未設定：幅広い雑学）"}
- ターゲット: ${concept.target || "（未設定）"}
- 語り口: ${concept.tone || "テンポよく親しみやすい"}

# 使えるフックの型（hookIdはここから選ぶ）
${hooks}

# 条件
1. ${count}本すべて違う切り口にする。フックの型も偏らせず、最低5種類は使う
2. 「自分ごと化できる」「誰かに送りたくなる」「答えが気になって最後まで見る」のどれかを必ず満たす
3. 図解・文字の動きで見せられるテーマにする（実写映像や特定の人物の写真が必要なものは避ける）
4. 同じジャンルのアカウントで毎日投稿しても飽きないよう、シリーズにできるネタを3本以上混ぜる（例：「〜ランキング第2弾」）
5. 事実に基づく。科学的根拠が弱い話は notes に「〜と言われている」「諸説あり」と明記する
6. 医療・投資・法律の断定的な助言、特定の個人や団体を傷つけるネタ、過度に不安をあおるネタは出さない
7. 過去に使ったネタと同じ・ほぼ同じものは出さない

# 過去に使ったネタ
${avoid}

# 出力形式
次の形のJSONだけを出力してください。
{
  "ideas": [
    { "topic": "テーマ", "hookId": "上の型のid", "hookLine": "1文目の案", "why": "伸びそうな理由", "notes": "台本に使う事実・材料" }
  ]
}`;
}

const ideasSchema = z.object({
  ideas: z
    .array(
      z.object({
        topic: z.string().min(1),
        hookId: z.string().default(""),
        hookLine: z.string().default(""),
        why: z.string().default(""),
        notes: z.string().default("")
      })
    )
    .min(1)
});

export function parseIdeas(text: string): Idea[] {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(text));
  } catch (error) {
    throw new Error(`ネタのJSONを読み込めませんでした: ${(error as Error).message}`);
  }
  const result = ideasSchema.safeParse(raw);
  if (!result.success) throw new Error("ネタのJSONの形が違います（ideas の配列が必要です）");
  const known = new Set(HOOKS.map((hook) => hook.id));
  return result.data.ideas.map((idea) => ({
    ...idea,
    id: newSceneId(),
    hookId: known.has(idea.hookId) ? idea.hookId : HOOKS[0]!.id,
    used: false
  }));
}

/** ネタを企画に反映する（テーマ・フックの型・参考情報） */
export function applyIdea(concept: Concept, idea: Idea): Concept {
  const notes = [idea.hookLine && `1文目の案：${idea.hookLine}`, idea.notes].filter(Boolean).join("\n");
  return { ...concept, topic: idea.topic, hookId: idea.hookId, notes, techniqueIds: [] };
}
