/**
 * 動画の素材（背景イラスト・小物の画像・Lottieアニメ）。
 * IndexedDB に保存し、動画HTMLには window.MG_IMAGES / window.MG_LOTTIES として差し込む。
 */
import { prepareCharacterImage } from "./imageCharacter";
import { PALETTES, STYLES, findOrFirst } from "./knowledge";
import { deleteAsset, loadAssets, saveAsset } from "./storage";
import type { Concept, Script } from "./types";

export type AssetKind = "img" | "lottie";

export interface AssetInfo {
  key: string;
  kind: AssetKind;
  name: string;
  /** 画像の大きさ（Lottieは0） */
  width: number;
  height: number;
  /** 透明な部分があるか（小物・ステッカー向き） */
  transparent: boolean;
}

const NOTES_KEY = "tms.assetNotes.v1";

/** 素材の説明（動画のClaudeに伝える） */
export function loadNotes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
export function saveNote(name: string, note: string): void {
  const notes = loadNotes();
  if (note.trim()) notes[name] = note.trim();
  else delete notes[name];
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/** ファイル名から素材名を作る（拡張子・フォルダを外し、コードで使いやすい形に） */
export function assetName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
  return base.replace(/[\s"'`\\<>]+/g, "_").slice(0, 60) || "asset";
}

const MAX_SIDE = 2160;

/** 画像を軽くして保存（長辺 2160px まで、WebP） */
async function prepareImage(blob: Blob): Promise<{ blob: Blob; width: number; height: number; transparent: boolean }> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvasを初期化できません");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  let transparent = false;
  for (let i = 3; i < data.length; i += 4 * 61) {
    if (data[i]! < 250) {
      transparent = true;
      break;
    }
  }
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
  const out = webp?.type === "image/webp" ? webp : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!out) throw new Error("画像を変換できませんでした");
  return { blob: out, width, height, transparent };
}

/** 選ばれたファイル（画像・Lottie(.json)・ZIP 混在OK）を素材として保存する */
export async function importAssets(files: File[]): Promise<{ added: string[]; skipped: string[] }> {
  const items: { name: string; blob: Blob }[] = [];
  for (const file of files) {
    if (/\.lottie$/i.test(file.name)) {
      // dotLottie（.lottie）は中身が ZIP。animations/ の中の JSON を、ファイル名の名前で取り出す
      const { unzipSync } = await import("fflate");
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const animations = Object.entries(entries).filter(([path]) => /^animations\/.+\.json$/i.test(path));
      const base = assetName(file.name);
      animations.forEach(([path, bytes], i) =>
        items.push({ name: animations.length === 1 ? `${base}.json` : `${base}_${assetName(path) || i + 1}.json`, blob: new Blob([bytes.slice()], { type: "application/json" }) })
      );
      if (animations.length === 0) items.push({ name: file.name, blob: file });
    } else if (/\.zip$/i.test(file.name) || /zip/.test(file.type)) {
      const { unzipSync } = await import("fflate");
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      for (const [path, bytes] of Object.entries(entries)) {
        if (/(^|\/)(__MACOSX|\.)/.test(path) || path.endsWith("/")) continue;
        items.push({ name: path, blob: new Blob([bytes.slice()], { type: /\.json$/i.test(path) ? "application/json" : "" }) });
      }
    } else items.push({ name: file.name, blob: file });
  }
  const added: string[] = [];
  const skipped: string[] = [];
  for (const item of items) {
    const name = assetName(item.name);
    try {
      if (/\.json$/i.test(item.name)) {
        const data = JSON.parse(await item.blob.text()) as { v?: string; layers?: unknown[] };
        if (!data.v || !Array.isArray(data.layers)) throw new Error("Lottieではない");
        await saveAsset(`lottie:${name}`, new Blob([JSON.stringify(data)], { type: "application/json" }));
        added.push(name);
      } else if (/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(item.name) || item.blob.type.startsWith("image/")) {
        let img = await prepareImage(item.blob);
        // 小物なのに背景が透明でなければ、白い背景を抜く
        if (/^prop_/i.test(name) && !img.transparent) img = await prepareImage(await prepareCharacterImage(item.blob, true));
        await saveAsset(`img:${name}`, img.blob);
        localStorage.setItem(`tms.assetMeta.${name}`, JSON.stringify({ width: img.width, height: img.height, transparent: img.transparent }));
        added.push(name);
      } else skipped.push(item.name);
    } catch {
      skipped.push(item.name);
    }
  }
  return { added, skipped };
}

export async function listAssets(): Promise<AssetInfo[]> {
  const all = await loadAssets();
  return Object.keys(all)
    .filter((key) => key.startsWith("img:") || key.startsWith("lottie:"))
    .sort()
    .map((key) => {
      const [kind, ...rest] = key.split(":");
      const name = rest.join(":");
      const meta = JSON.parse(localStorage.getItem(`tms.assetMeta.${name}`) ?? "{}") as { width?: number; height?: number; transparent?: boolean };
      return { key, kind: kind as AssetKind, name, width: meta.width ?? 0, height: meta.height ?? 0, transparent: Boolean(meta.transparent) };
    });
}

export async function removeAsset(info: AssetInfo): Promise<void> {
  await deleteAsset(info.key);
  localStorage.removeItem(`tms.assetMeta.${info.name}`);
  saveNote(info.name, "");
}

/** 参考用の素材（登場人物の設定画 ref_*）。コマ絵を描かせるときの参考にするだけで、動画には入れない */
export function isRefAsset(name: string): boolean {
  return /^ref_/i.test(name);
}

/** 漫画のコマ絵（panel_*）。漫画ドラマのシーンで K.manga.panel に使う（背景としては割り当てない） */
export function isPanelAsset(name: string): boolean {
  return /^panel_/i.test(name);
}

/** 動画HTMLに差し込む形にする */
export async function assetsForVideo(): Promise<{ images: Record<string, string>; lotties: Record<string, unknown> }> {
  const all = await loadAssets();
  const images: Record<string, string> = {};
  const lotties: Record<string, unknown> = {};
  for (const [key, blob] of Object.entries(all)) {
    if (key.startsWith("img:")) {
      if (isRefAsset(key.slice(4))) continue;
      images[key.slice(4)] = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } else if (key.startsWith("lottie:")) {
      try {
        lotties[key.slice(7)] = JSON.parse(await blob.text());
      } catch {
        // 壊れたものは使わない
      }
    }
  }
  return { images, lotties };
}

/**
 * 背景の割り当て。背景はシーンごとではなく「場所ごと」に2〜4枚にまとめ、続くシーンで使い回す（作る枚数を減らし、世界観もそろう）。
 * 漫画ドラマのシーンはコマ絵を使うので、背景画像は割り当てない（null）。
 */
export function backgroundPlan(roles: string[]): (number | null)[] {
  const eligible = roles.map((role, i) => (role === "drama" ? -1 : i)).filter((i) => i >= 0);
  const count = Math.max(1, Math.min(4, Math.ceil(eligible.length / 3)));
  const plan: (number | null)[] = roles.map(() => null);
  eligible.forEach((sceneIndex, k) => (plan[sceneIndex] = Math.floor((k * count) / eligible.length)));
  return plan;
}

/** 動画プロンプトに入れる素材の一覧（背景画像があれば、シーンごとに必ず使うよう割り当てる） */
export function assetsPromptSection(all: AssetInfo[], notes: Record<string, string>, scenes: { start: number; end: number; role: string }[] = []): string {
  // 設定画は動画に入れない。コマ絵は漫画ドラマの指示（mangaMotionSection）で別に割り当てる
  const assets = all.filter((a) => !isRefAsset(a.name) && !isPanelAsset(a.name));
  if (assets.length === 0) return "";
  const lines = assets.map((a) => {
    const note = notes[a.name] ? `：${notes[a.name]}` : "";
    if (a.kind === "lottie") return `- Lottie「${a.name}」${note} → \`K.lottie(ctx, t, "${a.name}", {x, y, w, start, speed, loop})\``;
    const shape = a.width && a.height ? `（${a.width}×${a.height}${a.transparent ? "・背景透明の小物" : ""}）` : "";
    return `- 画像「${a.name}」${shape}${note} → \`${a.transparent ? `K.image(ctx, "${a.name}", {x, y, w, h, fit:"contain"})` : `K.kenBurns(ctx, t, "${a.name}", start, dur, {zoom:1.05}, {zoom:1.2})`}\``;
  });
  const backgrounds = assets.filter((a) => a.kind === "img" && !a.transparent).map((a) => a.name);
  const props = assets.filter((a) => a.kind === "img" && a.transparent).map((a) => a.name);
  const lotties = assets.filter((a) => a.kind === "lottie").map((a) => a.name);
  const plan =
    backgrounds.length && scenes.length
      ? `
## シーンごとの背景（必須。この割り当てで背景画像を敷く）
| シーン | 時刻 | 背景画像 |
|---|---|---|
${(() => {
  const plan = backgroundPlan(scenes.map((scene) => scene.role));
  return scenes
    .map((scene, i) => {
      const slot = plan[i];
      const bg = slot === null || slot === undefined ? "（漫画のページ：背景画像なし）" : `"${backgrounds[slot % backgrounds.length]}"`;
      return `| ${i + 1}（${scene.role}） | ${scene.start.toFixed(2)}〜${scene.end.toFixed(2)}s | ${bg} |`;
    })
    .join("\n");
})()}
（説明を見て、もっと内容に合う背景があれば入れ替えてよい。ただし**背景画像の欄があるシーンは必ず背景画像を使う**こと）`
      : "";
  const must = [
    backgrounds.length ? "- [ ] 割り当て表で背景画像があるシーンはすべて、背景画像を K.kenBurns で全面に敷いている（K.bg.mesh などの単色・グラデーションだけの背景にしない。MGK の背景効果は、画像の上に薄く重ねる飾りとして使う）" : "",
    props.length ? `- [ ] 小物（${props.join(" / ")}）を、話の内容に合う場面で${Math.min(2, props.length)}つ以上使っている` : "",
    lotties.length ? `- [ ] Lottie（${lotties.join(" / ")}）を見せ場で1回以上使っている` : ""
  ].filter(Boolean);
  return `# 素材（ツールが用意済み。**必ず使う**。名前で呼ぶだけで描ける）
この動画のために作った素材です。使わないと、作った意味がなくなります。
${lines.join("\n")}
${plan}

## 素材の使い方
- 背景画像は、シーンの一番下の層に全面で敷き、**K.kenBurns でゆっくり寄る／流す**（止めない）。その上に K.bg.bokeh・floaters などを alpha 0.2〜0.4 で薄く重ねて空気感を足す
- 文字を乗せる部分には、半透明の暗幕やグラデーション（例：上から rgba(0,0,0,0.35)→透明）を敷いて読みやすくする
- 小物（背景透明）は主役の横で、ポップに登場させ（K.anim の outBackBig）、ふわふわ揺らす。キャラの手元や吹き出しの中に置いてもよい
- Lottie は見せ場・CTA・強調の瞬間に使う（start をその時刻に）

## 素材のセルフチェック（提出前に必ずYesにする）
${must.join("\n")}`;
}

/** ChatGPT（画像生成）に、この動画の素材をまとめて作ってもらう依頼文 */
export function buildImagePrompt(concept: Concept, script: Script): string {
  const palette = findOrFirst(PALETTES, concept.paletteId);
  const style = findOrFirst(STYLES, concept.styleId);
  const plan = backgroundPlan(script.scenes.map((scene) => scene.role));
  const count = Math.max(0, ...plan.map((slot) => (slot ?? -1) + 1));
  const backgrounds = Array.from({ length: count }, (_, b) => {
    const scenes = script.scenes.filter((_, i) => plan[i] === b);
    const lines = scenes.map((scene) => `「${scene.narration.slice(0, 40)}」${scene.visual ? `（${scene.visual.slice(0, 40)}）` : ""}`).join(" ／ ");
    const numbers = script.scenes.map((_, i) => i).filter((i) => plan[i] === b).map((i) => i + 1);
    return `| bg_${String(b + 1).padStart(2, "0")}.png | ${numbers[0]}〜${numbers[numbers.length - 1]} | ${lines.replace(/\|/g, "／")} |`;
  });
  return `# 依頼：TikTok動画の小物と背景イラストの素材づくり（全部で ${count + 4}〜${count + 5} 枚）
縦型ショート動画「${script.title}」（ジャンル：${concept.niche}）で使う画像素材を作ってください。
動画の上には、プログラムで文字・字幕・キャラクターを重ねて動かします。**画像には文字・人物・キャラクターを入れないでください。**
**作る順番は「小物 → 背景」**。小物は必ず作ってください（背景だけで終わらない）。枚数は下の指定どおり、それ以上は作らない。

## 全体のテイスト（全枚数で統一）
- 映像スタイル：${style.name}（${style.summary}）
- 配色：地の色 ${palette.colors.bg}、メイン ${palette.colors.accent}、サブ ${palette.colors.accent2}、面 ${palette.colors.surface}
- 禁止：文字・ロゴ・透かし・人物・動物・キャラクター

## ① 小物（先に作る。背景透明のPNG。4〜5個）
この動画の話題に出てくる物を、ステッカー風（太めの白フチ・正方形 1024×1024・物は中央に大きく）で1つずつ。ファイル名は prop_内容.png（英数字）
例：prop_phone.png（スマホ）、prop_heart.png（ハート）、prop_letter.png（手紙）、prop_coffee.png（コーヒー）、prop_ring.png（指輪）
- 台本のセリフに出てくる物・気持ちを表す物を優先する（画面で「これ！」と指させる物）

## ② 背景（${count}枚だけ。場所ごとにまとめて、続くシーンで使い回す）
- 画風：やわらかいアニメ調の背景美術。ほどよく描き込み、ボケ感・光・奥行きがある。同じ世界観・同じ光の向きでそろえる
- 構図：**縦長 1024×1536**。画面の上 1/3 は空や壁などシンプルに（大きな文字が乗る）。中央〜下は床や机など、キャラクターが立てる空間を空けておく
- **背景どうしは、場所・時間帯・色味をはっきり変える**（似た部屋ばかりにしない。例：夜の部屋／昼のカフェ／夕方の帰り道）

| ファイル名 | 使うシーン | そのシーンのセリフ（場所・雰囲気を決める手がかり） |
|---|---|---|
${backgrounds.join("\n")}

## 出し方
1. 1枚ずつ生成し、各画像の前にファイル名を書く
2. 全部できたら、全画像を assets.zip にまとめてダウンロードできるようにする（できなければ1枚ずつでOK）`;
}

/** HTMLが登録済みの素材を使っているか（名前が1つも出てこなければ、使っていない） */
export function unusedAssets(html: string, assets: AssetInfo[]): { used: string[]; unused: string[] } {
  const used: string[] = [];
  const unused: string[] = [];
  for (const a of assets.filter((x) => !isRefAsset(x.name))) (html.includes(`"${a.name}"`) || html.includes(`'${a.name}'`) || html.includes(`\`${a.name}\``) ? used : unused).push(a.name);
  return { used, unused };
}

/** 素材を使っていないHTMLを、素材を使うように直してもらう依頼（磨き込みに入れる） */
export function useAssetsRequest(all: AssetInfo[]): string {
  const assets = all.filter((a) => !isRefAsset(a.name));
  const panels = assets.filter((a) => isPanelAsset(a.name)).map((a) => a.name);
  const backgrounds = assets.filter((a) => a.kind === "img" && !a.transparent && !isPanelAsset(a.name)).map((a) => a.name);
  const props = assets.filter((a) => a.kind === "img" && a.transparent).map((a) => a.name);
  return [
    "登録した素材がまったく使われていません。演出・タイミング・字幕・キャラの動きはそのままに、素材を使うように直してください。",
    backgrounds.length ? `- すべてのシーンの一番下の層に、背景画像（${backgrounds.join(" / ")}）を「シーンごとの背景」の割り当てどおり K.kenBurns で全面に敷く。今の K.bg の背景効果は、その上に alpha 0.2〜0.4 で薄く重ねる飾りにする` : "",
    props.length ? `- 小物（${props.join(" / ")}）を、話の内容に合う場面で2つ以上、K.image（fit:"contain"）でポップに登場させる` : "",
    panels.length ? `- 漫画のコマ絵（${panels.join(" / ")}）を、漫画ドラマのシーンで K.manga.panel を使ってコマとして見せる` : "",
    "- 文字が読みにくくならないよう、文字の下に半透明の暗幕やグラデーションを敷く"
  ]
    .filter(Boolean)
    .join("\n");
}
