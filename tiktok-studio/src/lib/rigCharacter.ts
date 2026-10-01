/**
 * パーツで組み立てるキャラ（リグ）。
 * 頭・体・脚・耳・腕・目・口・漫符を別々の透過PNGで持ち、関節（pivot）を中心に回して動かす。
 * 素材はすべて同じキャンバス（例 1024×1536 / 2048×3072）上の同じ座標に描かれている前提。
 */

export type Point = [number, number];

export interface RigConfig {
  canvas: { width: number; height: number };
  /** 関節の座標（キャンバス座標）。body は足元、head は首の付け根、ear_* は耳の付け根、arm_* は肩、leg_* は股関節 */
  pivots: Record<string, Point>;
  /** 各パーツの左上の座標（透明な余白を切り詰めて保存しているため） */
  offsets: Record<string, Point>;
  /** 目印の座標（pupil_L / pupil_R：黒目の中心など） */
  anchors?: Record<string, Point>;
  /** 黒目が動ける範囲（横, 縦） */
  pupilRange?: Point;
}

/** 必ず必要なパーツ（目は eyes_open か、eyes_white＋pupil＋eyes_lids のどちらか） */
export const RIG_REQUIRED = ["body", "head", "mouth_closed"] as const;
/** 使えるパーツ（ファイル名から .png を除いたもの） */
export const RIG_PARTS = [
  "body",
  "head",
  "ear_L",
  "ear_R",
  "arm_L",
  "arm_R",
  "leg_L",
  "leg_R",
  "arm_R_point",
  "arm_R_wave",
  "arm_L_point",
  "arm_L_wave",
  "arm_R_chin",
  "arm_R_phone",
  "arm_L_hip",
  "arms_heart",
  "eyes_white",
  "pupil_L",
  "pupil_R",
  "eyes_lids",
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
  "mouth_sad",
  "fx_blush",
  "fx_heart_eyes",
  "fx_sweat",
  "fx_sparkle",
  "fx_tears",
  "fx_anger",
  "fx_question"
] as const;

export const RIG_PART_LABELS: Record<string, string> = {
  body: "体",
  head: "頭（顔なし）",
  ear_L: "左耳",
  ear_R: "右耳",
  arm_L: "左腕",
  arm_R: "右腕",
  leg_L: "左脚",
  leg_R: "右脚",
  arm_R_point: "右腕・指さし",
  arm_R_wave: "右腕・手を振る",
  arm_L_point: "左腕・指さし",
  arm_L_wave: "左腕・手を振る",
  arm_R_chin: "右腕・あごに手",
  arm_R_phone: "右腕・スマホ",
  arm_L_hip: "左腕・腰に手",
  arms_heart: "両腕・ハート",
  eyes_white: "白目",
  pupil_L: "左の黒目",
  pupil_R: "右の黒目",
  eyes_lids: "まつげ・まゆげ",
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
  mouth_sad: "口・への字",
  fx_blush: "照れ（ほっぺ）",
  fx_heart_eyes: "ハートの目",
  fx_sweat: "汗",
  fx_sparkle: "キラキラ",
  fx_tears: "涙",
  fx_anger: "怒りマーク",
  fx_question: "はてな"
};

/** パーツキャラで使える表情・ポーズ・漫符 */
export const RIG_EXPRESSIONS = ["normal", "happy", "surprised", "thinking", "sad", "wink", "smug", "love"] as const;
export const RIG_POSES = ["idle", "point", "wave", "cheer", "shrug", "think", "phone", "heart", "hip", "jump"] as const;
export const RIG_FX = ["blush", "heart", "sweat", "sparkle", "tears", "anger", "question"] as const;
export const RIG_POSE_LABELS: Record<string, string> = {
  idle: "立ち",
  point: "指さし",
  wave: "手を振る",
  cheer: "バンザイ",
  shrug: "お手上げ",
  think: "あごに手（考える）",
  phone: "スマホを見る",
  heart: "両手でハート",
  hip: "腰に手",
  jump: "ジャンプ"
};
export const RIG_FX_LABELS: Record<string, string> = {
  blush: "照れ",
  heart: "ハートの目",
  sweat: "汗",
  sparkle: "キラキラ",
  tears: "涙",
  anger: "怒り",
  question: "はてな"
};
const FX_PART: Record<string, string> = {
  blush: "fx_blush",
  heart: "fx_heart_eyes",
  sweat: "fx_sweat",
  sparkle: "fx_sparkle",
  tears: "fx_tears",
  anger: "fx_anger",
  question: "fx_question"
};
/** そのポーズを「専用の素材で」きれいに出せるか（無ければ腕を回して近い形にする） */
const POSE_PART: Record<string, string[]> = {
  think: ["arm_R_chin"],
  phone: ["arm_R_phone"],
  heart: ["arms_heart"],
  hip: ["arm_L_hip"],
  jump: ["leg_L", "leg_R"]
};

/** 持っているパーツから、動画のClaudeに伝える「使えるもの」を決める */
export function rigCapabilities(parts: string[]): { poses: string[]; fx: string[]; walk: boolean; gaze: boolean } {
  const has = (p: string) => parts.includes(p);
  return {
    poses: RIG_POSES.filter((pose) => (POSE_PART[pose] ?? []).every(has)),
    fx: RIG_FX.filter((fx) => has(FX_PART[fx]!)),
    walk: has("leg_L") && has("leg_R"),
    gaze: ["eyes_white", "pupil_L", "pupil_R", "eyes_lids"].every(has)
  };
}

export function rigKey(part: string): string {
  return `rig:${part}`;
}

/** パス付きのファイル名から、パーツ名を取り出す（"rig_parts/arm_L.png" → "arm_L"） */
export function partNameOf(path: string): string | null {
  const base = path.replace(/^.*[\\/]/, "").replace(/\.png$/i, "");
  return (RIG_PARTS as readonly string[]).includes(base) ? base : null;
}

const asPoint = (value: unknown): Point | null =>
  Array.isArray(value) && value.length >= 2 && value.slice(0, 2).every((v) => typeof v === "number" && Number.isFinite(v)) ? [value[0] as number, value[1] as number] : null;

/** rig.json を読む */
export function parseRigJson(text: string): { canvas: RigConfig["canvas"]; pivots: Record<string, Point>; anchors: Record<string, Point>; pupilRange?: Point } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("rig.json を読めませんでした（JSONの形が壊れています）");
  }
  const data = raw as { canvas?: { width?: number; height?: number }; pivots?: Record<string, unknown>; anchors?: Record<string, unknown>; pupil_range?: unknown };
  const width = Number(data.canvas?.width);
  const height = Number(data.canvas?.height);
  if (!(width > 0 && height > 0)) throw new Error("rig.json に canvas の width / height がありません");
  const points = (obj: Record<string, unknown> | undefined) => {
    const out: Record<string, Point> = {};
    for (const [name, value] of Object.entries(obj ?? {})) {
      const point = asPoint(value);
      if (point) out[name] = point;
    }
    return out;
  };
  const pivots = points(data.pivots);
  if (!pivots.body) throw new Error("rig.json に pivots.body（足元の位置）がありません");
  if (!pivots.head) throw new Error("rig.json に pivots.head（首の付け根の位置）がありません");
  const pupilRange = asPoint(data.pupil_range) ?? undefined;
  return { canvas: { width, height }, pivots, anchors: points(data.anchors), ...(pupilRange ? { pupilRange } : {}) };
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
  // WebP（透過OK）の方がずっと小さいので、使えるなら WebP で保存する
  const webp = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/webp", 0.92));
  const trimmed = webp?.type === "image/webp" ? webp : await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
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
  for (const leg of ["leg_L", "leg_R"]) {
    const b = boxes[leg];
    if (!out[leg] && b) out[leg] = [b.x + b.w / 2, b.y + b.h * 0.06];
  }
  if (!out.ear_L) out.ear_L = [head[0] - 80, head[1] - 250];
  if (!out.ear_R) out.ear_R = [head[0] + 80, head[1] - 250];
  return out;
}

/**
 * 動画側で使う window.CHARACTER を組み立てる。
 * 描画は t と引数だけで決まる（まばたき・耳ピク・視線も時刻から計算するので、何度描いても同じ絵）。
 */
export function buildRigCharacterScript(name: string, rig: RigConfig, images: Record<string, string>): string {
  const core = ["head", "ear_L", "ear_R", "body", "leg_L", "leg_R"].filter((part) => images[part] && rig.offsets[part]);
  const top = Math.min(...core.map((part) => rig.offsets[part]![1]));
  const caps = rigCapabilities(Object.keys(images));
  return `(function(){
var SRC=${JSON.stringify(images)};
var OFF=${JSON.stringify(rig.offsets)};
var P=${JSON.stringify(rig.pivots)};
var A=${JSON.stringify(rig.anchors ?? {})};
var PR=${JSON.stringify(rig.pupilRange ?? null)};
var TOP=${JSON.stringify(Number.isFinite(top) ? top : 0)};
var K=${JSON.stringify(rig.canvas.height / 1536)};
var IMG={};var waits=[];
Object.keys(SRC).forEach(function(k){var im=new Image();waits.push(new Promise(function(r){im.onload=r;im.onerror=r;}));im.src=SRC[k];IMG[k]=im;});
var prev=window.MG_ASSETS_READY;
window.MG_ASSETS_READY=Promise.all(waits.concat(prev?[prev]:[]));
function has(n){var im=IMG[n];return !!(im&&im.naturalWidth&&OFF[n]);}
function part(ctx,n){if(!has(n))return false;ctx.drawImage(IMG[n],OFF[n][0],OFF[n][1]);return true;}
function center(n){var im=IMG[n];return [OFF[n][0]+im.naturalWidth/2,OFF[n][1]+im.naturalHeight/2];}
function about(ctx,p,a,sx,sy){ctx.translate(p[0],p[1]);if(a)ctx.rotate(a);if(sx!==undefined)ctx.scale(sx,sy);ctx.translate(-p[0],-p[1]);}
function pick(list){for(var i=0;i<list.length;i++)if(has(list[i]))return list[i];return null;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function hash(k){var s=Math.sin(k*12.9898+78.233)*43758.5453;return s-Math.floor(s);}
// 一瞬だけ起きる動き（まばたき・耳ピク）を、時刻だけから決める
function pulse(t,period,len,seed){var k=Math.floor(t/period);var start=k*period+hash(k+seed)*(period-len);var p=(t-start)/len;return p>=0&&p<=1?Math.sin(p*Math.PI):0;}
// 視線のちょっとした動き（ときどき別の場所をチラッと見る）
function glance(t,seed){var d=1.9,k=Math.floor(t/d),p=Math.min(1,(t-k*d)/0.12);var a=hash(k-1+seed)-0.5,b=hash(k+seed)-0.5;return (a+(b-a)*p)*0.5;}
var EYES={normal:"eyes_open",happy:"eyes_happy",surprised:"eyes_surprised",thinking:"eyes_open",sad:"eyes_sad",wink:"eyes_wink",smug:"eyes_half",love:"eyes_happy"};
var REST={normal:"mouth_closed",happy:"mouth_closed",surprised:"mouth_o",thinking:"mouth_closed",sad:"mouth_sad",wink:"mouth_closed",smug:"mouth_closed",love:"mouth_closed"};
var BLINKS={eyes_open:1,eyes_surprised:1,eyes_sad:1,eyes_half:1};
var FXP={blush:"fx_blush",heart:"fx_heart_eyes",sweat:"fx_sweat",sparkle:"fx_sparkle",tears:"fx_tears",anger:"fx_anger",question:"fx_question"};
var EYEBUF=null;
function fxDraw(ctx,kind,t){
  var n=FXP[kind];if(!has(n))return;var c=center(n);
  ctx.save();
  if(kind==="blush")ctx.globalAlpha=0.8+0.2*Math.sin(t*3);
  // 頭のまわりの記号は、スマホでも読めるように大きめに出す
  var big=1.7;
  if(kind==="sweat"){ctx.translate(0,(Math.sin(t*3)*6+4)*K);about(ctx,c,0,big,big);}
  if(kind==="sparkle"){var s=(0.8+0.3*Math.abs(Math.sin(t*4)))*big;about(ctx,c,Math.sin(t*2)*0.12,s,s);}
  if(kind==="tears")ctx.globalAlpha=0.75+0.25*Math.sin(t*5);
  if(kind==="anger"){var a=(1+0.14*Math.abs(Math.sin(t*7)))*big;about(ctx,c,0,a,a);}
  if(kind==="question"){ctx.translate(0,Math.sin(t*2.5)*10*K);about(ctx,c,Math.sin(t*2.5)*0.08,big,big);}
  if(kind==="heart"){var h=1+0.07*Math.sin(t*8);about(ctx,c,0,h,h);}
  part(ctx,n);
  ctx.restore();
}
// 白目の中だけで黒目を動かす
function layeredEyes(ctx,gx,gy){
  var W=IMG.eyes_white;
  if(!EYEBUF){EYEBUF=document.createElement("canvas");EYEBUF.width=W.naturalWidth;EYEBUF.height=W.naturalHeight;}
  var b=EYEBUF.getContext("2d");
  b.globalCompositeOperation="source-over";b.clearRect(0,0,EYEBUF.width,EYEBUF.height);b.drawImage(W,0,0);
  b.globalCompositeOperation="source-atop";
  // 素材側の範囲は控えめなことが多いので、白目で切り抜く前提で少し広げる（はみ出しは白目の形で隠れる）
  var r=[Math.max(PR?PR[0]:0,18*K),Math.max(PR?PR[1]:0,9*K)],dx=gx*r[0],dy=gy*r[1];
  ["pupil_L","pupil_R"].forEach(function(n){b.drawImage(IMG[n],OFF[n][0]-OFF.eyes_white[0]+dx,OFF[n][1]-OFF.eyes_white[1]+dy);});
  b.globalCompositeOperation="source-over";
  ctx.drawImage(EYEBUF,OFF.eyes_white[0],OFF.eyes_white[1]);
  part(ctx,"eyes_lids");
}
function eyesDraw(ctx,expr,t,gx,gy,fx){
  if((expr==="love"||fx.heart)&&has("fx_heart_eyes")){fxDraw(ctx,"heart",t);return;}
  var want=EYES[expr]||"eyes_open";
  if(BLINKS[want]&&has("eyes_closed")&&pulse(t,3.7,0.14,3)>0.2){part(ctx,"eyes_closed");return;}
  if(want==="eyes_open"&&has("eyes_white")&&has("eyes_lids")&&has("pupil_L")&&has("pupil_R")){layeredEyes(ctx,gx,gy);return;}
  var e=pick([want,"eyes_open"]);if(e)part(ctx,e);
  else if(has("eyes_white")&&has("eyes_lids")&&has("pupil_L")&&has("pupil_R"))layeredEyes(ctx,gx,gy);
}
function draw(ctx,o){
  var size=o.size||400,t=o.t||0,expr=o.expression||"normal",pose=o.pose||"idle";
  var mouth=clamp(o.mouth||0,0,1),look=clamp(o.look||0,-1,1),lookY=clamp(o.lookY||0,-1,1);
  var fx={};[].concat(o.fx||[]).forEach(function(f){fx[f]=1;});
  if(expr==="love")fx.blush=1;
  var B=P.body,H=P.head,tall=Math.max(1,B[1]-TOP),s=size/tall;
  var talk=mouth>0.12?1:0;
  ctx.save();
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.translate(o.x,o.y);if(o.flip)ctx.scale(-1,1);ctx.scale(s,s);ctx.translate(-B[0],-B[1]);
  // ジャンプ・歩きの上下
  var air=pose==="jump"?Math.max(0,Math.sin(t*4.5)):0;
  var lift=air*tall*0.09+(o.walk?Math.abs(Math.sin(t*8))*tall*0.012:0);
  ctx.translate(0,-lift);
  // 体：呼吸と、話している間の小さなバウンス（足元を中心に伸び縮み）
  var breath=Math.sin(t*2.4)*0.008;
  var bounce=(pose==="cheer"?Math.abs(Math.sin(t*6))*0.05:0)+mouth*0.018+(pose==="jump"?(1-air)*Math.max(0,-Math.sin(t*4.5))*0.05:0);
  var sway=Math.sin(t*1.1)*0.012+look*0.02+(pose==="shrug"?Math.sin(t*3)*0.02:0)+(o.walk?Math.sin(t*8)*0.025:0);
  about(ctx,B,sway,1-bounce*0.5-breath*0.5,1+bounce+breath);
  // 脚（股関節を中心に回す）。体の後ろに描く
  var lL=Math.sin(t*1.2)*0.015,lR=-Math.sin(t*1.2)*0.015;
  // 歩き：正面向きなので、左右の足を交互に持ち上げる（ちょこちょこ歩き）
  var stepL=0,stepR=0;
  if(o.walk){var w=Math.sin(t*8);stepL=Math.max(0,w)*tall*0.035;stepR=Math.max(0,-w)*tall*0.035;lL=Math.max(0,w)*0.08;lR=-Math.max(0,-w)*0.08;}
  if(pose==="jump"){lL=0.25*air;lR=-0.25*air;}
  ctx.save();ctx.translate(0,-stepL);if(P.leg_L)about(ctx,P.leg_L,lL);part(ctx,"leg_L");ctx.restore();
  ctx.save();ctx.translate(0,-stepR);if(P.leg_R)about(ctx,P.leg_R,lR);part(ctx,"leg_R");ctx.restore();
  part(ctx,"body");
  // 腕（肩を中心に回す）
  var aL=Math.sin(t*1.6)*0.04+talk*Math.sin(t*4.2)*0.06,aR=-Math.sin(t*1.6+1)*0.04-talk*Math.sin(t*3.7+2)*0.07;
  var armL="arm_L",armR="arm_R",front=null,both=null;
  if(pose==="point"){if(has("arm_R_point"))armR="arm_R_point";else aR=-1.2+Math.sin(t*2)*0.03;}
  if(pose==="wave"){if(has("arm_R_wave")){armR="arm_R_wave";aR=Math.sin(t*9)*0.14;}else aR=-2.4+Math.sin(t*9)*0.25;}
  if(pose==="cheer"||pose==="jump"){var up=pose==="jump"?0.6+air*1.1:1.75;aL=up+Math.sin(t*6)*0.12;aR=-up-Math.sin(t*6)*0.12;}
  if(pose==="shrug"){aL=0.55+Math.sin(t*3)*0.05;aR=-0.55-Math.sin(t*3)*0.05;}
  if(pose==="think"){if(has("arm_R_chin")){front="arm_R_chin";aR=0;}else aR=-0.9;}
  if(pose==="phone"){if(has("arm_R_phone")){front="arm_R_phone";aR=0;}else aR=-0.9;}
  if(pose==="hip"){if(has("arm_L_hip")){armL="arm_L_hip";aL=0;}else aL=0.35;}
  if(pose==="heart"){if(has("arms_heart"))both="arms_heart";else{aL=0.8;aR=-0.8;}}
  if(both){ctx.save();if(P[both])ctx.translate(0,Math.sin(t*3)*4*K);part(ctx,both);ctx.restore();}
  else{
    ctx.save();if(P.arm_L)about(ctx,P.arm_L,aL);part(ctx,armL);ctx.restore();
    if(!front){ctx.save();if(P.arm_R)about(ctx,P.arm_R,aR);part(ctx,armR);ctx.restore();}
  }
  // 頭（首の付け根を中心に、かしげる・うなずく）。耳・目・口・漫符は頭と一緒に動く
  var tilt=look*0.07+Math.sin(t*1.3)*0.025+(expr==="thinking"&&!front?0.13:0)+(pose==="shrug"?-0.1:0)+(expr==="sad"?-0.05:0)+(front?0.02:0);
  var nod=talk*Math.sin(t*7.5)*mouth*0.035;
  ctx.save();
  about(ctx,H,tilt+nod);
  ctx.translate(look*10*K,0);
  if(expr==="surprised")about(ctx,H,0,1,1.03);
  // 耳：表情で角度が変わり、ときどきピクッと動く
  var droop=expr==="sad"?0.4:expr==="surprised"?-0.1:expr==="happy"||expr==="love"?0.06:0;
  var eL=-droop+Math.sin(t*1.7)*0.035-pulse(t,4.3,0.28,1)*0.22;
  var eR=droop+Math.sin(t*1.9+1)*0.035+pulse(t,5.9,0.28,7)*0.22;
  ctx.save();if(P.ear_L)about(ctx,P.ear_L,eL);part(ctx,"ear_L");ctx.restore();
  ctx.save();if(P.ear_R)about(ctx,P.ear_R,eR);part(ctx,"ear_R");ctx.restore();
  part(ctx,"head");
  // 視線：look（左右）と lookY（上下）に、ときどきのチラ見を足す
  var gx=clamp(look*0.9+glance(t,11),-1,1),gy=clamp(lookY+glance(t,5)*0.6+(expr==="thinking"?-0.45:0)+(pose==="phone"?0.6:0),-1,1);
  eyesDraw(ctx,expr,t,gx,gy,fx);
  var m;
  if(mouth<0.12)m=pick([REST[expr]||"mouth_closed","mouth_closed"]);
  else if(mouth<0.45)m=pick(expr==="surprised"?["mouth_o","mouth_half"]:["mouth_half","mouth_open","mouth_closed"]);
  else m=pick(expr==="happy"||expr==="love"?["mouth_smile","mouth_open"]:expr==="surprised"?["mouth_o","mouth_open"]:["mouth_open","mouth_half","mouth_closed"]);
  if(m)part(ctx,m);
  ["blush","tears","sweat","anger","question","sparkle"].forEach(function(k){if(fx[k])fxDraw(ctx,k,t);});
  ctx.restore();
  // 顔の前に来る腕（あごに手・スマホ）は頭のあとに描く
  if(front){ctx.save();if(P.arm_R)about(ctx,P.arm_R,Math.sin(t*1.6)*0.01);part(ctx,front);ctx.restore();}
  ctx.restore();
}
window.CHARACTER={name:${JSON.stringify(name)},kind:"rig",expressions:${JSON.stringify(RIG_EXPRESSIONS)},poses:${JSON.stringify(caps.poses)},fx:${JSON.stringify(caps.fx)},draw:draw};
})();`;
}
