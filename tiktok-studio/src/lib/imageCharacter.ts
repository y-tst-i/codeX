/**
 * 画像のキャラクター。
 * 「表情 × 口の開き（閉じ・半開き・全開）」の画像を切り替えて口パクさせる。
 * 動画側からは Canvas で描くキャラと同じ window.CHARACTER.draw で呼べる。
 */

export const MOUTHS = ["closed", "half", "open"] as const;
export type MouthState = (typeof MOUTHS)[number];
export const MOUTH_LABELS: Record<MouthState, string> = { closed: "口を閉じる", half: "口が半開き", open: "口を大きく開く" };

/** 画像を登録できる表情（normal は必須） */
export const IMAGE_EXPRESSIONS = ["normal", "happy", "surprised", "thinking", "sad", "wink", "smug"] as const;

export function imageKey(expression: string, mouth: MouthState): string {
  return `${expression}:${mouth}`;
}

/** 口の開き（0〜1）から使う画像を決める */
export function mouthStateFor(level: number): MouthState {
  if (level < 0.12) return "closed";
  if (level < 0.45) return "half";
  return "open";
}

const MAX_HEIGHT = 1100;

/**
 * アップロードされた画像を整える：
 * 大きすぎれば縮小し、（必要なら）四隅から続く白っぽい背景を透明にする。
 */
export async function prepareCharacterImage(file: Blob, removeWhiteBackground: boolean): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_HEIGHT / bitmap.height);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvasを初期化できません");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (removeWhiteBackground) {
    const image = ctx.getImageData(0, 0, width, height);
    removeBackground(image.data, width, height);
    ctx.putImageData(image, 0, 0);
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("画像を変換できませんでした"))), "image/png"));
}

/**
 * 四隅の色に近く、端からつながっている部分を透明にする（塗りつぶし）。
 * キャラの中の白（白目など）は端とつながっていないので残る。
 */
export function removeBackground(data: Uint8ClampedArray, width: number, height: number, tolerance = 38): void {
  const at = (x: number, y: number) => (y * width + x) * 4;
  const corner = at(0, 0);
  const bg = [data[corner]!, data[corner + 1]!, data[corner + 2]!];
  const close = (i: number) =>
    Math.abs(data[i]! - bg[0]!) <= tolerance && Math.abs(data[i + 1]! - bg[1]!) <= tolerance && Math.abs(data[i + 2]! - bg[2]!) <= tolerance;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length > 0) {
    const p = stack.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (data[i + 3] === 0 || !close(i)) continue;
    data[i + 3] = 0;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * 画像（data URL）から window.CHARACTER を組み立てる。
 * 画像の読み込みが終わるまで待てるよう window.MG_ASSETS_READY も用意する。
 */
export function buildImageCharacterScript(name: string, images: Record<string, string>): string {
  return `(function(){
var SRC=${JSON.stringify(images)};
var IMG={};var waits=[];
Object.keys(SRC).forEach(function(k){var im=new Image();waits.push(new Promise(function(r){im.onload=r;im.onerror=r;}));im.src=SRC[k];IMG[k]=im;});
var prev=window.MG_ASSETS_READY;
window.MG_ASSETS_READY=Promise.all(waits.concat(prev?[prev]:[]));
function pick(expr,mouth){
  var m=mouth<0.12?"closed":mouth<0.45?"half":"open";
  var order=m==="open"?["open","half","closed"]:m==="half"?["half","open","closed"]:["closed","half","open"];
  var exprs=[expr,"normal"];
  for(var e=0;e<exprs.length;e++)for(var i=0;i<order.length;i++){var im=IMG[exprs[e]+":"+order[i]];if(im&&im.naturalWidth)return im;}
  return null;
}
function draw(ctx,o){
  var size=o.size||400,t=o.t||0,pose=o.pose||"idle",mouth=Math.max(0,Math.min(1,o.mouth||0)),look=Math.max(-1,Math.min(1,o.look||0));
  var im=pick(o.expression||"normal",mouth);if(!im)return;
  var h=size,w=size*im.naturalWidth/im.naturalHeight;
  var bob=Math.sin(t*2.3)*size*0.006,rot=look*0.03,sx=1,sy=1+mouth*0.025,dy=0;
  if(pose==="point")rot+=0.07;
  if(pose==="wave")rot+=Math.sin(t*7)*0.05;
  if(pose==="cheer"){dy=-Math.abs(Math.sin(t*6))*size*0.05;sy+=0.02;}
  if(pose==="shrug"){sx=1.04;rot+=Math.sin(t*3)*0.03;}
  ctx.save();
  ctx.translate(o.x,o.y+bob+dy);
  if(o.flip)ctx.scale(-1,1);
  ctx.rotate(rot);ctx.scale(sx,sy);
  ctx.drawImage(im,-w/2,-h,w,h);
  ctx.restore();
}
window.CHARACTER={name:${JSON.stringify(name)},kind:"image",expressions:["normal","happy","surprised","thinking","sad","wink","smug"],poses:["idle","point","wave","cheer","shrug"],draw:draw};
})();`;
}

/* ---------------- まとめて登録（複数画像・ZIP） ---------------- */

const EXPRESSION_WORDS: [string, RegExp][] = [
  ["happy", /happy|smile|joy|笑|えがお|にこ|喜/i],
  ["surprised", /surpris|shock|wow|驚|びっくり|おどろ/i],
  ["thinking", /think|hmm|考|かんが|悩/i],
  ["sad", /sad|cry|悲|かなし|しょんぼり|泣|落ち込/i],
  ["wink", /wink|ウインク|ウィンク/i],
  ["smug", /smug|doya|ドヤ|どや|得意/i],
  ["normal", /normal|base|neutral|default|通常|ふつう|普通|基本|ノーマル/i]
];

/** ファイル名から「表情」と「口」を推測する（わからなければ undefined） */
export function guessSlot(fileName: string): { expression?: string; mouth?: MouthState } {
  const name = fileName.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
  const expression = EXPRESSION_WORDS.find(([, re]) => re.test(name))?.[0];
  let mouth: MouthState | undefined;
  if (/half|mid|semi|半|中くらい|ちょっと|少し/i.test(name)) mouth = "half";
  else if (/close|shut|閉|とじ|つぐ/i.test(name)) mouth = "closed";
  else if (/open|wide|big|開|あけ|大き|全開|「あ」/i.test(name)) mouth = "open";
  return { expression, mouth };
}

/**
 * ファイル名の一覧を枠（"表情:口"）に振り分ける。
 * 口がわからないものは、同じ表情の中でファイル名順に「閉じ→半開き→全開」の空いている枠へ入れる。
 */
export function assignSlots(fileNames: string[]): { assigned: Record<string, string>; unassigned: string[] } {
  const assigned: Record<string, string> = {};
  const pending: Record<string, string[]> = {};
  const unassigned: string[] = [];
  const sorted = [...fileNames].sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
  for (const fileName of sorted) {
    const { expression = "normal", mouth } = guessSlot(fileName);
    if (mouth && !assigned[imageKey(expression, mouth)]) assigned[imageKey(expression, mouth)] = fileName;
    else (pending[expression] ??= []).push(fileName);
  }
  for (const [expression, names] of Object.entries(pending)) {
    for (const fileName of names) {
      const free = MOUTHS.find((mouth) => !assigned[imageKey(expression, mouth)]);
      if (free) assigned[imageKey(expression, free)] = fileName;
      else unassigned.push(fileName);
    }
  }
  return { assigned, unassigned };
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;

/** 選ばれたファイル（画像・ZIP混在OK）を、名前つきの画像の一覧にする */
export async function collectImages(files: File[]): Promise<{ name: string; blob: Blob }[]> {
  const out: { name: string; blob: Blob }[] = [];
  for (const file of files) {
    if (/\.zip$/i.test(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
      const { unzipSync } = await import("fflate");
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      for (const [path, bytes] of Object.entries(entries)) {
        if (!IMAGE_EXT.test(path) || /(^|\/)(__MACOSX|\.)/.test(path)) continue;
        out.push({ name: path, blob: new Blob([bytes.slice()]) });
      }
    } else if (IMAGE_EXT.test(file.name) || file.type.startsWith("image/")) {
      out.push({ name: file.name, blob: file });
    }
  }
  return out;
}
