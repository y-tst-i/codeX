/** ツールの中継（lottieBridge.ts）を通して、LottieFiles の無料アニメを探して取り込む */
const HEADERS = { "x-tms-lottie": "1" };

export interface LottieHit {
  id: string;
  name: string;
  jsonUrl: string;
  imageUrl: string;
  gifUrl: string;
  author: string;
}

async function call(path: string): Promise<Response> {
  const response = await fetch(path, { headers: HEADERS });
  if (response.status === 404) throw new Error("このツールは 起動.bat（開発サーバー）で開いてください");
  if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? `エラー（${response.status}）`);
  return response;
}

export async function searchLottie(query: string, after?: string): Promise<{ hits: LottieHit[]; next?: string }> {
  const params = new URLSearchParams({ q: query });
  if (after) params.set("after", after);
  return (await (await call(`/api/lottie/search?${params}`)).json()) as { hits: LottieHit[]; next?: string };
}

/** 素材として登録できる形（.json の File）でダウンロードする */
export async function downloadLottie(hit: LottieHit, name: string): Promise<File> {
  const response = await call(`/api/lottie/file?url=${encodeURIComponent(hit.jsonUrl)}`);
  return new File([await response.blob()], `${name}.json`, { type: "application/json" });
}

/** 素材名（英数字）。同じ名前があれば番号をつける */
export function lottieAssetName(query: string, taken: string[]): string {
  const base = `lottie_${query.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "anim"}`;
  let name = base;
  for (let n = 2; taken.includes(name); n++) name = `${base}_${n}`;
  return name;
}

/** よく使う探し方（日本語 → LottieFiles で見つかりやすい英語） */
export const LOTTIE_PRESETS: { label: string; query: string }[] = [
  { label: "ハート", query: "heart" },
  { label: "恋愛", query: "love" },
  { label: "キラキラ", query: "sparkle" },
  { label: "紙吹雪", query: "confetti" },
  { label: "いいね", query: "like" },
  { label: "びっくり", query: "surprise" },
  { label: "はてな", query: "question mark" },
  { label: "泣く", query: "crying" },
  { label: "怒る", query: "angry" },
  { label: "照れ", query: "blush" },
  { label: "メッセージ", query: "chat message" },
  { label: "スマホ", query: "phone notification" },
  { label: "矢印", query: "arrow" },
  { label: "チェック", query: "check" },
  { label: "電球（ひらめき）", query: "idea bulb" },
  { label: "フォロー", query: "follow button" }
];
