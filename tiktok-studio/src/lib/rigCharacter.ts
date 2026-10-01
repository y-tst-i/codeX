/**
 * パーツで組み立てるキャラ（リグ）。
 * 頭・体・耳・腕・目・口を別々の透過PNGで持ち、関節（pivot）を中心に回して動かす。
 * 素材はすべて同じキャンバス（例 1024×1536）上の同じ座標に描かれている前提。
 */

export type Point = [number, number];

export interface RigConfig {
  canvas: { width: number; height: number };
  /** 関節の座標（キャンバス座標）。body は足元、head は首の付け根、ear_* は耳の付け根、arm_* は肩 */
  pivots: Record<string, Point>;
  /** 各パーツの左上の座標（透明な余白を切り詰めて保存しているため） */
  offsets: Record<string, Point>;
}

/** 必ず必要なパーツ */
export const RIG_REQUIRED = ["body", "head", "eyes_open", "mouth_closed"] as const;
/** 使えるパーツ（ファイル名から .png を除いたもの） */
export const RIG_PARTS = [
  "body",
  "head",
  "ear_L",
  "ear_R",
  "arm_L",
  "arm_R",
  "arm_R_point",
  "arm_R_wave",
  "arm_L_point",
  "eyes_open",
  "eyes_closed",
  "eyes_happy",
  "eyes_wink",
  "eyes_surprised",
  "eyes_sad",
  "eyes_half",
  "mouth_closed",
  "mouth_half",
  "mouth_open",
  "mouth_o",
  "mouth_smile",
  "mouth_sad"
] as const;

export const RIG_PART_LABELS: Record<string, string> = {
  body: "体",
  head: "頭（顔なし）",
  ear_L: "左耳",
  ear_R: "右耳",
  arm_L: "左腕",
  arm_R: "右腕",
  arm_R_point: "右腕・指さし",
  arm_R_wave: "右腕・手を振る",
  arm_L_point: "左腕・指さし",
  eyes_open: "目・ふつう",
  eyes_closed: "目・まばたき",
  eyes_happy: "目・にっこり",
  eyes_wink: "目・ウインク",
  eyes_surprised: "目・びっくり",
  eyes_sad: "目・困り",
  eyes_half: "目・半目",
  mouth_closed: "口・閉じ",
  mouth_half: "口・半開き",
  mouth_open: "口・全開",
  mouth_o: "口・お",
  mouth_smile: "口・笑顔",
  mouth_sad: "口・への字"
};

export function rigKey(part: string): string {
  return `rig:${part}`;
}

/** パス付きのファイル名から、パーツ名を取り出す（"rig_parts/arm_L.png" → "arm_L"） */
export function partNameOf(path: string): string | null {
  const base = path.replace(/^.*[\\/]/, "").replace(/\.png$/i, "");
  return (RIG_PARTS as readonly string[]).includes(base) ? base : null;
}

/** rig.json を読む。足りない関節は、パーツの位置からそれらしく補う */
export function parseRigJson(text: string): { canvas: RigConfig["canvas"]; pivots: Record<string, Point> } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("rig.json を読めませんでした（JSONの形が壊れています）");
  }
  const data = raw as { canvas?: { width?: number; height?: number }; pivots?: Record<string, unknown> };
  const width = Number(data.canvas?.width);
  const height = Number(data.canvas?.height);
  if (!(width > 0 && height > 0)) throw new Error("rig.json に canvas の width / height がありません");
  const pivots: Record<string, Point> = {};
  for (const [name, value] of Object.entries(data.pivots ?? {})) {
    if (Array.isArray(value) && value.length >= 2 && value.every((v) => typeof v === "number" && Number.isFinite(v))) {
      pivots[name] = [value[0] as number, value[1] as number];
    }
  }
  if (!pivots.body) throw new Error("rig.json に pivots.body（足元の位置）がありません");
  if (!pivots.head) throw new Error("rig.json に pivots.head（首の付け根の位置）がありません");
  return { canvas: { width, height }, pivots };
}

export interface RigFiles {
  rigJson: string | null;
  parts: Record<string, Blob>;
}

/** 選ばれたファイル（ZIP・PNG・rig.json 混在OK）から、リグの素材を集める */
export async function collectRigFiles(files: File[]): Promise<RigFiles> {
  const out: RigFiles = { rigJson: null, parts: {} };
  const take = async (path: string, blob: Blob) => {
    if (/(^|[\\/])rig\.json$/i.test(path)) out.rigJson = await blob.text();
    const part = partNameOf(path);
    if (part) out.parts[part] = blob;
  };
  for (const file of files) {
    if (/\.zip$/i.test(file.name) || /zip/.test(file.type)) {
      const { unzipSync } = await import("fflate");
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      for (const [path, bytes] of Object.entries(entries)) {
        if (/(^|\/)(__MACOSX|\.)/.test(path)) continue;
        await take(path, new Blob([bytes.slice()], { type: /\.png$/i.test(path) ? "image/png" : "application/json" }));
      }
    } else {
      await take(file.name, file);
    }
  }
  return out;
}

/** 透明な余白を切り詰めて、左上の座標と一緒に返す（描画を軽くするため。位置は offset で元どおりに戻す） */
export async function trimPart(blob: Blob, canvasSize: RigConfig["canvas"]): Promise<{ blob: Blob; offset: Point }> {
  const bitmap = await createImageBitmap(blob);
  if (bitmap.width !== canvasSize.width || bitmap.height !== canvasSize.height) {
    throw new Error(`大きさが ${bitmap.width}×${bitmap.height} です（rig.json では ${canvasSize.width}×${canvasSize.height}）。全パーツを同じ大きさのキャンバスで作ってください`);
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvasを初期化できません");
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! < 3) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("中身が空（全部透明）です");
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  const trimmed = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
  if (!trimmed) throw new Error("画像を変換できませんでした");
  return { blob: trimmed, offset: [minX, minY] };
}

/** 関節が rig.json に無いとき、パーツの位置から補う */
export function fillMissingPivots(pivots: Record<string, Point>, boxes: Record<string, { x: number; y: number; w: number; h: number }>): Record<string, Point> {
  const out = { ...pivots };
  const head = out.head!;
  for (const ear of ["ear_L", "ear_R"]) {
    const b = boxes[ear];
    if (!out[ear] && b) out[ear] = [b.x + b.w / 2, b.y + b.h * 0.92];
  }
  for (const arm of ["arm_L", "arm_R"]) {
    const b = boxes[arm];
    if (!out[arm] && b) out[arm] = [arm === "arm_L" ? b.x + b.w * 0.8 : b.x + b.w * 0.2, b.y + 12];
  }
  if (!out.ear_L) out.ear_L = [head[0] - 80, head[1] - 250];
  if (!out.ear_R) out.ear_R = [head[0] + 80, head[1] - 250];
  return out;
}

/**
 * 動画側で使う window.CHARACTER を組み立てる。
 * 描画は t と引数だけで決まる（まばたき・耳ピクも時刻から計算するので、何度描いても同じ絵）。
 */
export function buildRigCharacterScript(name: string, rig: RigConfig, images: Record<string, string>): string {
  const top = Math.min(...Object.entries(rig.offsets).filter(([part]) => images[part]).map(([, [, y]]) => y));
  return `(function(){
var SRC=${JSON.stringify(images)};
var OFF=${JSON.stringify(rig.offsets)};
var P=${JSON.stringify(rig.pivots)};
var TOP=${JSON.stringify(Number.isFinite(top) ? top : 0)};
var IMG={};var waits=[];
Object.keys(SRC).forEach(function(k){var im=new Image();waits.push(new Promise(function(r){im.onload=r;im.onerror=r;}));im.src=SRC[k];IMG[k]=im;});
var prev=window.MG_ASSETS_READY;
window.MG_ASSETS_READY=Promise.all(waits.concat(prev?[prev]:[]));
function has(n){var im=IMG[n];return !!(im&&im.naturalWidth);}
function part(ctx,n){if(!has(n))return false;ctx.drawImage(IMG[n],OFF[n][0],OFF[n][1]);return true;}
function about(ctx,p,a,sx,sy){ctx.translate(p[0],p[1]);if(a)ctx.rotate(a);if(sx!==undefined)ctx.scale(sx,sy);ctx.translate(-p[0],-p[1]);}
function pick(list){for(var i=0;i<list.length;i++)if(has(list[i]))return list[i];return null;}
function hash(k){var s=Math.sin(k*12.9898+78.233)*43758.5453;return s-Math.floor(s);}
// 一瞬だけ起きる動き（まばたき・耳ピク）を、時刻だけから決める
function pulse(t,period,len,seed){var k=Math.floor(t/period);var start=k*period+hash(k+seed)*(period-len);var p=(t-start)/len;return p>=0&&p<=1?Math.sin(p*Math.PI):0;}
var EYES={normal:"eyes_open",happy:"eyes_happy",surprised:"eyes_surprised",thinking:"eyes_open",sad:"eyes_sad",wink:"eyes_wink",smug:"eyes_half"};
var REST={normal:"mouth_closed",happy:"mouth_closed",surprised:"mouth_o",thinking:"mouth_closed",sad:"mouth_sad",wink:"mouth_closed",smug:"mouth_closed"};
var BLINKS={eyes_open:1,eyes_surprised:1,eyes_sad:1,eyes_half:1};
function draw(ctx,o){
  var size=o.size||400,t=o.t||0,expr=o.expression||"normal",pose=o.pose||"idle";
  var mouth=Math.max(0,Math.min(1,o.mouth||0)),look=Math.max(-1,Math.min(1,o.look||0));
  var B=P.body,H=P.head,s=size/Math.max(1,B[1]-TOP);
  var talk=mouth>0.12?1:0;
  ctx.save();
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.translate(o.x,o.y);if(o.flip)ctx.scale(-1,1);ctx.scale(s,s);ctx.translate(-B[0],-B[1]);
  // 体：呼吸と、話している間の小さなバウンス（足元を中心に伸び縮み）
  var breath=Math.sin(t*2.4)*0.008;
  var bounce=(pose==="cheer"?Math.abs(Math.sin(t*6))*0.05:0)+mouth*0.018;
  var sway=Math.sin(t*1.1)*0.012+look*0.02+(pose==="shrug"?Math.sin(t*3)*0.02:0);
  about(ctx,B,sway,1-bounce*0.5-breath*0.5,1+bounce+breath);
  part(ctx,"body");
  // 腕（肩を中心に回す）
  var aL=Math.sin(t*1.6)*0.04+talk*Math.sin(t*4.2)*0.06,aR=-Math.sin(t*1.6+1)*0.04-talk*Math.sin(t*3.7+2)*0.07;
  var armL="arm_L",armR="arm_R";
  if(pose==="point"){if(has("arm_R_point"))armR="arm_R_point";else aR=-1.2+Math.sin(t*2)*0.03;}
  if(pose==="wave"){if(has("arm_R_wave")){armR="arm_R_wave";aR=Math.sin(t*9)*0.14;}else aR=-2.4+Math.sin(t*9)*0.25;}
  if(pose==="cheer"){aL=1.75+Math.sin(t*6)*0.12;aR=-1.75-Math.sin(t*6)*0.12;}
  if(pose==="shrug"){aL=0.55+Math.sin(t*3)*0.05;aR=-0.55-Math.sin(t*3)*0.05;}
  ctx.save();if(P.arm_L)about(ctx,P.arm_L,aL);part(ctx,armL);ctx.restore();
  ctx.save();if(P.arm_R)about(ctx,P.arm_R,aR);part(ctx,armR);ctx.restore();
  // 頭（首の付け根を中心に、かしげる・うなずく）。耳・目・口は頭と一緒に動く
  var tilt=look*0.07+Math.sin(t*1.3)*0.025+(expr==="thinking"?0.13:0)+(pose==="shrug"?-0.1:0)+(expr==="sad"?-0.05:0);
  var nod=talk*Math.sin(t*7.5)*mouth*0.035;
  ctx.save();
  about(ctx,H,tilt+nod);
  ctx.translate(look*10,0);
  if(expr==="surprised")about(ctx,H,0,1,1.03);
  // 耳：表情で角度が変わり、ときどきピクッと動く
  var droop=expr==="sad"?0.4:expr==="surprised"?-0.1:expr==="happy"?0.06:0;
  var eL=-droop+Math.sin(t*1.7)*0.035-pulse(t,4.3,0.28,1)*0.22;
  var eR=droop+Math.sin(t*1.9+1)*0.035+pulse(t,5.9,0.28,7)*0.22;
  ctx.save();if(P.ear_L)about(ctx,P.ear_L,eL);part(ctx,"ear_L");ctx.restore();
  ctx.save();if(P.ear_R)about(ctx,P.ear_R,eR);part(ctx,"ear_R");ctx.restore();
  part(ctx,"head");
  // 目：表情ごとに差し替え、ときどきまばたき
  var eyes=pick([EYES[expr]||"eyes_open","eyes_open"]);
  if(eyes&&BLINKS[eyes]&&has("eyes_closed")&&pulse(t,3.7,0.14,3)>0.2)eyes="eyes_closed";
  if(eyes)part(ctx,eyes);
  // 口：声の大きさで差し替え
  var m;
  if(mouth<0.12)m=pick([REST[expr]||"mouth_closed","mouth_closed"]);
  else if(mouth<0.45)m=pick(expr==="surprised"?["mouth_o","mouth_half"]:["mouth_half","mouth_open","mouth_closed"]);
  else m=pick(expr==="happy"?["mouth_smile","mouth_open"]:expr==="surprised"?["mouth_o","mouth_open"]:["mouth_open","mouth_half","mouth_closed"]);
  if(m)part(ctx,m);
  ctx.restore();
  ctx.restore();
}
window.CHARACTER={name:${JSON.stringify(name)},kind:"rig",expressions:["normal","happy","surprised","thinking","sad","wink","smug"],poses:["idle","point","wave","cheer","shrug"],draw:draw};
})();`;
}
