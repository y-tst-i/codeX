import Anthropic from "@anthropic-ai/sdk";
import { SCRIPT_JSON_SCHEMA } from "./script";
import type { ApiSettings } from "./types";

export interface ClaudeCallOptions {
  settings: ApiSettings;
  system: string;
  prompt: string;
  /** 台本のようにJSONで受け取りたいとき */
  json?: boolean;
  signal?: AbortSignal;
  /** 生成中の文字数を受け取る */
  onProgress?: (characters: number) => void;
}

function client(apiKey: string): Anthropic {
  // ローカルで動かす個人用ツールのため、ブラウザから直接呼び出す（キーは自分のPCのブラウザにだけ保存）
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/**
 * Claudeにプロンプトを送り、返答テキストを返す。
 * 長いHTMLを生成するのでストリーミングで受け取り、安全判定で断られた場合は
 * サーバー側のフォールバック（fallbacks: "default"）で別モデルに回す。
 */
export async function askClaude(options: ClaudeCallOptions): Promise<string> {
  const { settings, system, prompt, json, signal, onProgress } = options;
  if (!settings.anthropicKey) throw new Error("Anthropic APIキーが未設定です（⚙ 設定）");

  const stream = client(settings.anthropicKey).beta.messages.stream(
    {
      model: settings.claudeModel,
      max_tokens: 64000,
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        effort: settings.effort,
        ...(json ? { format: { type: "json_schema" as const, schema: SCRIPT_JSON_SCHEMA } } : {})
      },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default"
    },
    { signal }
  );

  let characters = 0;
  stream.on("text", (delta) => {
    characters += delta.length;
    onProgress?.(characters);
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("Claudeがこの依頼を断りました。テーマや表現を変えて試してください。");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("出力が長すぎて途中で切れました。シーン数を減らすか、尺を短くしてください。");
  }
  const text = message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  if (!text.trim()) throw new Error("Claudeから空の返答が返りました");
  return text;
}

export function describeClaudeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "Anthropic APIキーが正しくありません";
  if (error instanceof Anthropic.PermissionDeniedError) return "このAPIキーではこのモデルを使えません";
  if (error instanceof Anthropic.RateLimitError) return "レート制限です。少し待ってから再実行してください";
  if (error instanceof Anthropic.APIUserAbortError) return "中断しました";
  if (error instanceof Anthropic.APIError) return `Claude APIエラー（${error.status ?? "?"}）: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}
