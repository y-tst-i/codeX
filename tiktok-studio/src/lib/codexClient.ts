/** ツールの中継（codexBridge.ts）を通して、自分のPCの Codex CLI に画像素材を作らせる */
const HEADERS = { "x-tms-codex": "1", "Content-Type": "application/json" };

export interface CodexCheck {
  installed: boolean;
  loggedIn: boolean;
  version?: string;
}

export interface CodexJob {
  state: "running" | "done" | "error" | "cancelled";
  files: string[];
  log: string[];
  seconds: number;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: HEADERS });
  if (response.status === 404 && path.includes("check")) throw new Error("このツールは 起動.bat（開発サーバー）で開いてください");
  if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? `エラー（${response.status}）`);
  return (await response.json()) as T;
}

export const checkCodex = () => call<CodexCheck>("/api/codex/check");
/** refs：参考画像（登場人物の設定画など）。Codex に一緒に渡して、同じ見た目で描かせる */
export const startCodexImages = (prompt: string, refs: { name: string; dataUrl: string }[] = []) =>
  call<{ id: string }>("/api/codex/images", { method: "POST", body: JSON.stringify({ prompt, refs }) });
export const codexJob = (id: string) => call<CodexJob>(`/api/codex/job?id=${encodeURIComponent(id)}`);
export const cancelCodex = (id: string) => call<{ ok: boolean }>(`/api/codex/cancel?id=${encodeURIComponent(id)}`, { method: "POST" });
export const cleanupCodex = (id: string) => call<{ ok: boolean }>(`/api/codex/cleanup?id=${encodeURIComponent(id)}`, { method: "POST" });

export async function codexFile(id: string, name: string): Promise<File> {
  const response = await fetch(`/api/codex/file?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`, { headers: { "x-tms-codex": "1" } });
  if (!response.ok) throw new Error(`${name} を取り出せませんでした`);
  return new File([await response.blob()], name, { type: response.headers.get("Content-Type") ?? "image/png" });
}

/** ChatGPT向けの依頼文を、Codex（画像生成ツールでファイル保存）向けに言い直す */
export function codexImagePrompt(basePrompt: string): string {
  return `${basePrompt}

---
# Codex への追加の指示（こちらを優先）
- 画像生成ツール（image generation）を使って、上で指定したファイルを**1枚ずつ、書かれた順番（小物が先）で、全部**生成する。指定より多く作らない
- 生成した画像は、**今の作業フォルダの直下**に、指定どおりのファイル名（英数字）で PNG として保存する。ZIP は作らない
- 小物（prop_*.png）は背景を透明にする。透明にできない場合は真っ白な無地の背景にする（あとで自動で透明にする）
- コードを書いたり、ほかのファイルを作ったりしない。説明は最後に1行（作ったファイル名の一覧）だけでよい`;
}
