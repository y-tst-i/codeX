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

/** 動画HTMLに差し込む形にする */
export async function assetsForVideo(): Promise<{ images: Record<string, string>; lotties: Record<string, unknown> }> {
  const all = await loadAssets();
  const images: Record<string, string> = {};
  const lotties: Record<string, unknown> = {};
  for (const [key, blob] of Object.entries(all)) {
    if (key.startsWith("img:")) {
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

/** 動画プロンプトに入れる素材の一覧 */
export function assetsPromptSection(assets: AssetInfo[], notes: Record<string, string>): string {
  if (assets.length === 0) return "";
  const lines = assets.map((a) => {
    const note = notes[a.name] ? `：${notes[a.name]}` : "";
    if (a.kind === "lottie") return `- Lottie「${a.name}」${note} → \`K.lottie(ctx, t, "${a.name}", {x, y, w, start, speed, loop})\``;
    const shape = a.width && a.height ? `（${a.width}×${a.height}${a.transparent ? "・背景透明の小物" : ""}）` : "";
    return `- 画像「${a.name}」${shape}${note} → \`${a.transparent ? `K.image(ctx, "${a.name}", {x, y, w, h, fit:"contain"})` : `K.kenBurns(ctx, t, "${a.name}", start, dur, {zoom:1.05}, {zoom:1.2})`}\``;
  });
  return `# 使える素材（ツールが用意済み。名前で呼ぶだけ）
${lines.join("\n")}
- 背景画像は、そのシーンの背景として全面に敷き、**K.kenBurns でゆっくり寄る／流す**（止めない）。上に K.bg.bokeh などを薄く重ねて空気感を足す。文字を乗せる部分には半透明の暗幕やグラデーションを敷いて読みやすくする
- 小物（背景透明）は主役の横で、ポップに登場させ（K.anim の outBackBig）、ふわふわ揺らす。キャラの手元や吹き出しの中に置いてもよい
- Lottie は見せ場・CTA・強調の瞬間に使う（start をその時刻に）
- 素材が無いシーンは、これまでどおり K.bg の背景で作る`;
}

/** ChatGPT（画像生成）に、この動画の素材をまとめて作ってもらう依頼文 */
export function buildImagePrompt(concept: Concept, script: Script): string {
  const palette = findOrFirst(PALETTES, concept.paletteId);
  const style = findOrFirst(STYLES, concept.styleId);
  const scenes = script.scenes
    .map((scene, i) => `| bg_${String(i + 1).padStart(2, "0")}.png | ${scene.role} | 「${scene.narration}」 | ${scene.visual || "（おまかせ）"} |`)
    .join("\n");
  return `# 依頼：TikTok動画の背景イラストと小物の素材づくり
縦型ショート動画「${script.title}」（ジャンル：${concept.niche}）で使う画像素材を作ってください。
動画の上には、プログラムで文字・字幕・キャラクターを重ねて動かします。**画像には文字・人物・キャラクターを入れないでください。**

## 全体のテイスト（全枚数で統一）
- 映像スタイル：${style.name}（${style.summary}）
- 配色：地の色 ${palette.colors.bg}、メイン ${palette.colors.accent}、サブ ${palette.colors.accent2}、面 ${palette.colors.surface}
- 画風：やわらかいアニメ調の背景美術。ほどよく描き込み、ボケ感・光・奥行きがある。同じ世界観・同じ光の向きでそろえる
- 構図：**縦長 1024×1536**。画面の上 1/3 は空や壁などシンプルに（大きな文字が乗る）。中央〜下は床や机など、キャラクターが立てる空間を空けておく
- 禁止：文字・ロゴ・透かし・人物・動物・キャラクター

## 背景（シーンごとに1枚。ファイル名の順に作る）
| ファイル名 | シーンの役割 | セリフ | 演出メモ |
|---|---|---|---|
${scenes}
- 各シーンのセリフの内容に合う「場所・時間帯・雰囲気」を考えて描く（例：恋愛の話 → 夕暮れのカフェ、夜の部屋でスマホの光 など）

## 小物（背景透明のPNG。3〜5個）
この動画の話題に出てくる物を、ステッカー風（太めの白フチ）で1つずつ。ファイル名は prop_内容.png（英数字）
例：prop_phone.png（スマホ）、prop_heart.png（ハート）、prop_letter.png（手紙）、prop_coffee.png（コーヒー）

## 出し方
1. 1枚ずつ生成し、各画像の前にファイル名を書く
2. 全部できたら、全画像を assets.zip にまとめてダウンロードできるようにする（できなければ1枚ずつでOK）`;
}

