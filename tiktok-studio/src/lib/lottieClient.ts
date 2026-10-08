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

/* ---------------- おまかせ：台本に合う Lottie を選ぶ ---------------- */

export interface LottiePick {
  query: string;
  /** 日本語の呼び名（説明に使う） */
  label: string;
  /** 使うシーン（0 から） */
  scene: number;
}

/** 台本の言葉 → LottieFiles で見つかりやすい探し方 */
const KEYWORDS: { match: RegExp; query: string; label: string }[] = [
  { match: /LINE|ライン|返信|メッセージ|既読|未読|連絡|通知|スマホ/, query: "message notification", label: "メッセージの通知" },
  { match: /ハート|好き|恋|愛|キュン|ときめ|両想い|脈あり/, query: "love heart", label: "ハート" },
  { match: /ドキ|緊張|胸が/, query: "heart beat", label: "ドキドキ" },
  { match: /実は|まさか|驚|びっくり|えっ|衝撃/, query: "surprise exclamation", label: "びっくり" },
  { match: /なぜ|どうして|理由|[?？]/, query: "question mark", label: "はてな" },
  { match: /泣|涙|悲し|つらい|辛い|寂し/, query: "crying emoji", label: "泣き顔" },
  { match: /怒|イライラ|ムカ/, query: "angry emoji", label: "怒り顔" },
  { match: /照れ|恥ずかし|赤面|頬/, query: "blush emoji", label: "照れ顔" },
  { match: /不安|嫉妬|浮気|モヤモヤ|心配/, query: "worried emoji", label: "不安な顔" },
  { match: /心理|脳|研究|効果|法則|本能/, query: "brain", label: "脳（心理学）" },
  { match: /コツ|ポイント|方法|ひらめ|テクニック|使える/, query: "idea light bulb", label: "ひらめき電球" },
  { match: /正解|成功|OK|うまくいく|効果的/, query: "check mark success", label: "正解チェック" },
  { match: /NG|ダメ|逆効果|失敗|脈なし|避け/, query: "wrong cross", label: "バツ印" },
  { match: /おめでと|最高|やった|成就|付き合/, query: "confetti", label: "紙吹雪" },
  { match: /時間|待|遅|すぐ|早い|速い/, query: "clock time", label: "時計" },
  { match: /デート|カフェ|ご飯|食事/, query: "coffee cup", label: "カフェ" },
  { match: /キス/, query: "kiss", label: "キス" },
  { match: /プレゼント|お金|奢/, query: "gift box", label: "プレゼント" }
];

/** 台本から、入れると良い Lottie を最大 max 個選ぶ（呼びかけのシーンには、フォローを促すアニメを必ず） */
export function planLotties(scenes: { role: string; narration: string; onScreenText?: string }[], niche = "", max = 4): LottiePick[] {
  const picks: LottiePick[] = [];
  const has = (query: string) => picks.some((p) => p.query === query);
  const cta = scenes.findIndex((scene) => scene.role === "cta");
  if (cta >= 0) picks.push({ query: "follow button", label: "フォローの呼びかけ", scene: cta });
  const found: (LottiePick & { order: number })[] = [];
  scenes.forEach((scene, i) => {
    const text = `${scene.narration} ${scene.onScreenText ?? ""}`;
    KEYWORDS.forEach((k, order) => {
      if (k.match.test(text) && !found.some((f) => f.query === k.query)) found.push({ query: k.query, label: k.label, scene: i, order });
    });
  });
  // シーンの順に、ばらけるように選ぶ（同じシーンに固まらない）
  found.sort((a, b) => a.scene - b.scene || a.order - b.order);
  const usedScenes = new Set(picks.map((p) => p.scene));
  for (const pass of [0, 1])
    for (const f of found) {
      if (picks.length >= max) break;
      if (has(f.query) || (pass === 0 && usedScenes.has(f.scene))) continue;
      picks.push({ query: f.query, label: f.label, scene: f.scene });
      usedScenes.add(f.scene);
    }
  const fillers = /恋|愛|モテ/.test(niche) ? [{ query: "love heart", label: "ハート" }, { query: "sparkle", label: "キラキラ" }] : [{ query: "sparkle", label: "キラキラ" }, { query: "confetti", label: "紙吹雪" }];
  for (const f of fillers) if (picks.length < max && !has(f.query)) picks.push({ ...f, scene: Math.max(0, Math.min(scenes.length - 1, 1)) });
  return picks;
}

/** 動画の飾りに向いているか（文字や写真入り・重すぎ・長すぎるものは外す） */
export function lottieProblem(data: unknown, bytes: number): string | null {
  if (!data || typeof data !== "object") return "壊れたファイル";
  const d = data as { fr?: number; ip?: number; op?: number; w?: number; h?: number; layers?: { ty?: number }[]; assets?: { p?: string; layers?: { ty?: number }[] }[] };
  if (bytes > 400_000) return "重すぎる";
  if (!Array.isArray(d.layers) || d.layers.length === 0) return "中身がない";
  if ((d.assets ?? []).some((a) => a.p)) return "写真入り";
  const texts = [...d.layers, ...(d.assets ?? []).flatMap((a) => a.layers ?? [])].some((l) => l.ty === 5);
  if (texts) return "文字入り";
  const seconds = ((d.op ?? 0) - (d.ip ?? 0)) / Math.max(1, d.fr ?? 30);
  if (!(seconds >= 0.4 && seconds <= 6)) return "長さが合わない";
  if ((d.w ?? 0) < 64 || (d.h ?? 0) < 64) return "小さすぎる";
  return null;
}
