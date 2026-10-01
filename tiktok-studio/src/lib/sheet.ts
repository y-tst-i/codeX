/**
 * キャラクターシート（1枚にポーズや顔がたくさん並んだ画像）を、1体ずつの画像に切り分ける。
 * 1. 端からつながる背景を透明にする（グラデーション背景にも対応）
 * 2. 残った部分を「かたまり」ごとに分ける
 */

export interface SpriteBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** かたまりの番号（labels の値） */
  label: number;
}

const diff = (a: number[] | Float32Array, ai: number, b: Uint8ClampedArray, bi: number) =>
  Math.max(Math.abs(a[ai]! - b[bi]!), Math.abs(a[ai + 1]! - b[bi + 1]!), Math.abs(a[ai + 2]! - b[bi + 2]!));

/**
 * 端から背景を塗りつぶして透明にする。
 * 進みながら「このあたりの背景色」をゆっくり更新するので、グラデーションの背景も追いかけられる。
 * 一方、キャラの輪郭（ふわっとした毛でも）でじわじわ色が変わっても、背景色の推定はついていかないので止まる。
 */
export function removeSheetBackground(data: Uint8ClampedArray, width: number, height: number, tolerance = 26): void {
  const total = width * height;
  const estimate = new Float32Array(total * 3);
  const visited = new Uint8Array(total);
  const stack: number[] = [];
  const seed = (p: number) => {
    if (visited[p]) return;
    visited[p] = 1;
    const i = p * 4;
    estimate[p * 3] = data[i]!;
    estimate[p * 3 + 1] = data[i + 1]!;
    estimate[p * 3 + 2] = data[i + 2]!;
    data[i + 3] = 0;
    stack.push(p);
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  const visit = (from: number, q: number) => {
    if (visited[q]) return;
    const qi = q * 4;
    if (data[qi + 3] === 0) {
      visited[q] = 1;
      estimate.set(estimate.subarray(from * 3, from * 3 + 3), q * 3);
      stack.push(q);
      return;
    }
    if (diff(estimate, from * 3, data, qi) > tolerance) return;
    visited[q] = 1;
    for (let c = 0; c < 3; c++) estimate[q * 3 + c] = estimate[from * 3 + c]! * 0.85 + data[qi + c]! * 0.15;
    data[qi + 3] = 0;
    stack.push(q);
  };
  while (stack.length > 0) {
    const p = stack.pop()!;
    const x = p % width;
    if (x > 0) visit(p, p - 1);
    if (x < width - 1) visit(p, p + 1);
    if (p >= width) visit(p, p - width);
    if (p < total - width) visit(p, p + width);
  }
  // 輪郭の1ピクセルを半透明にして、切り抜きのギザギザを和らげる
  const alpha = new Uint8Array(total);
  for (let p = 0; p < total; p++) alpha[p] = data[p * 4 + 3]!;
  for (let p = 0; p < total; p++) {
    if (alpha[p] === 0) continue;
    const x = p % width;
    const edge = (x > 0 && alpha[p - 1] === 0) || (x < width - 1 && alpha[p + 1] === 0) || (p >= width && alpha[p - width] === 0) || (p < total - width && alpha[p + width] === 0);
    if (edge) data[p * 4 + 3] = Math.min(alpha[p]!, 150);
  }
}

/**
 * 透明でない部分を、かたまりごとに分ける。
 * 数ピクセルのすき間はつながっているとみなす（耳と頭が少し離れていても1体になる）。
 * labels には、ピクセルごとのかたまり番号（0 = どれでもない）が入る。
 */
export function findSprites(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: { cell?: number; minArea?: number } = {}
): { boxes: SpriteBox[]; labels: Int32Array } {
  const cell = options.cell ?? 3;
  const minArea = options.minArea ?? Math.max(400, width * height * 0.002);
  const gw = Math.ceil(width / cell);
  const gh = Math.ceil(height / cell);
  const filled = new Uint8Array(gw * gh);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 20) filled[Math.floor(y / cell) * gw + Math.floor(x / cell)] = 1;
    }
  }
  // 1マス広げて、小さなすき間をつなぐ
  const grown = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (!filled[gy * gw + gx]) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) grown[ny * gw + nx] = 1;
        }
    }
  }
  const gridLabel = new Int32Array(gw * gh);
  let next = 0;
  for (let start = 0; start < gw * gh; start++) {
    if (!grown[start] || gridLabel[start]) continue;
    next += 1;
    const stack = [start];
    gridLabel[start] = next;
    while (stack.length > 0) {
      const g = stack.pop()!;
      const gx = g % gw;
      const neighbors = [gx > 0 ? g - 1 : -1, gx < gw - 1 ? g + 1 : -1, g >= gw ? g - gw : -1, g < gw * gh - gw ? g + gw : -1];
      for (const n of neighbors) {
        if (n >= 0 && grown[n] && !gridLabel[n]) {
          gridLabel[n] = next;
          stack.push(n);
        }
      }
    }
  }

  const labels = new Int32Array(width * height);
  const stats = new Map<number, { minX: number; minY: number; maxX: number; maxY: number; area: number }>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (data[p * 4 + 3]! <= 20) continue;
      const label = gridLabel[Math.floor(y / cell) * gw + Math.floor(x / cell)]!;
      labels[p] = label;
      const s = stats.get(label);
      if (s) {
        if (x < s.minX) s.minX = x;
        if (x > s.maxX) s.maxX = x;
        if (y < s.minY) s.minY = y;
        if (y > s.maxY) s.maxY = y;
        s.area += 1;
      } else stats.set(label, { minX: x, minY: y, maxX: x, maxY: y, area: 1 });
    }
  }
  // 横並びでくっついたものを分け、分けた先ごとに番号を振り直す
  const ranges: { label: number; start: number; end: number }[] = [];
  for (const [label, s] of stats) {
    if (s.area < minArea) continue;
    for (const [start, end] of columnRanges(labels, width, label, s.minX, s.maxX + 1, s.minY, s.maxY + 1)) ranges.push({ label, start, end });
  }
  const ids = new Int32Array(width * height);
  const rangeOf = new Map<number, { start: number; end: number; id: number }[]>();
  ranges.forEach((r, i) => {
    const list = rangeOf.get(r.label) ?? [];
    list.push({ start: r.start, end: r.end, id: i + 1 });
    rangeOf.set(r.label, list);
  });
  for (let p = 0; p < width * height; p++) {
    const list = labels[p] ? rangeOf.get(labels[p]!) : undefined;
    if (!list) continue;
    const x = p % width;
    ids[p] = list.find((r) => x >= r.start && x < r.end)?.id ?? 0;
  }
  reassignFragments(ids, width, height, ranges.length);

  const boxStats = new Map<number, { minX: number; minY: number; maxX: number; maxY: number; area: number }>();
  for (let p = 0; p < width * height; p++) {
    const id = ids[p]!;
    if (!id) continue;
    const x = p % width;
    const y = (p - x) / width;
    const s = boxStats.get(id);
    if (s) {
      if (x < s.minX) s.minX = x;
      if (x > s.maxX) s.maxX = x;
      if (y < s.minY) s.minY = y;
      if (y > s.maxY) s.maxY = y;
      s.area += 1;
    } else boxStats.set(id, { minX: x, minY: y, maxX: x, maxY: y, area: 1 });
  }
  const boxes = [...boxStats.entries()]
    .filter(([, s]) => s.area >= minArea)
    .map(([label, s]) => ({ label, x: s.minX, y: s.minY, width: s.maxX - s.minX + 1, height: s.maxY - s.minY + 1 }));
  // 上の段から、左から順に並べる（中心の高さが近いものは同じ段）
  const rowOf = (b: SpriteBox) => b.y + b.height / 2;
  boxes.sort((a, b) => {
    const tolerance = Math.min(a.height, b.height) / 2;
    return Math.abs(rowOf(a) - rowOf(b)) < tolerance ? a.x - b.x : rowOf(a) - rowOf(b);
  });
  return { boxes, labels: ids };
}

/**
 * 耳や手が重なってくっついた「横並びの複数体」を、縦の谷間（ピクセルが少ない列）で切り分ける。
 * 返すのは x の範囲 [start, end) の一覧。
 * 小さすぎる切れ端（突き出た手など）はとなりにくっつけ直すので、1体のキャラが割れることはない。
 * 切ったあとに、ほかより極端に横長な部分が残っていれば、もう少し浅い谷でも切る。
 */
function columnRanges(labels: Int32Array, width: number, label: number, x0: number, x1: number, y0: number, y1: number): [number, number][] {
  const columns = new Float64Array(x1 - x0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) if (labels[y * width + x] === label) columns[x - x0]! += 1;
  }
  const split = (start: number, end: number, depth: number, reach: number): { start: number; end: number; area: number }[] => {
    const n = end - start;
    const smooth = new Float64Array(n);
    for (let x = 0; x < n; x++) {
      let sum = 0;
      let count = 0;
      for (let d = -4; d <= 4; d++) {
        if (x + d < 0 || x + d >= n) continue;
        sum += columns[start + x + d]!;
        count++;
      }
      smooth[x] = sum / count;
    }
    const near = Math.max(8, Math.round(reach / 3));
    const cuts: number[] = [];
    for (let x = 1; x < n - 1; x++) {
      let leftMax = 0;
      let rightMax = 0;
      let isMin = true;
      for (let d = 1; d <= reach; d++) {
        const l = x - d >= 0 ? smooth[x - d]! : undefined;
        const r = x + d < n ? smooth[x + d]! : undefined;
        if (l !== undefined && l > leftMax) leftMax = l;
        if (r !== undefined && r > rightMax) rightMax = r;
        if (d <= near && ((l !== undefined && l < smooth[x]!) || (r !== undefined && r <= smooth[x]!))) isMin = false;
      }
      if (isMin && smooth[x]! <= depth * Math.min(leftMax, rightMax)) cuts.push(start + x);
    }
    let segments = [...cuts, end].map((e, i, arr) => {
      const s = i === 0 ? start : arr[i - 1]!;
      let area = 0;
      for (let x = s; x < e; x++) area += columns[x - x0]!;
      return { start: s, end: e, area };
    });
    // 小さすぎる切れ端は、となりの小さい方へまとめる
    for (;;) {
      const biggest = Math.max(...segments.map((s) => s.area));
      const i = segments.findIndex((s) => s.area < biggest * 0.3);
      if (i < 0 || segments.length === 1) break;
      const left = segments[i - 1];
      const right = segments[i + 1];
      const j = !left ? i + 1 : !right ? i - 1 : left.area <= right.area ? i - 1 : i + 1;
      const a = segments[Math.min(i, j)]!;
      const b = segments[Math.max(i, j)]!;
      segments = [...segments.slice(0, Math.min(i, j)), { start: a.start, end: b.end, area: a.area + b.area }, ...segments.slice(Math.max(i, j) + 1)];
    }
    return segments;
  };
  const height = y1 - y0;
  let segments = split(x0, x1, 0.4, Math.max(20, Math.round(height * 0.6)));
  const widths = segments.map((s) => s.end - s.start).sort((a, b) => a - b);
  const typical = Math.min(widths[Math.floor(widths.length / 2)]!, height);
  const tooWide = (s: { start: number; end: number }) => s.end - s.start > (segments.length >= 2 ? typical * 1.7 : height * 1.25);
  segments = segments.flatMap((s) => (tooWide(s) ? split(s.start, s.end, 0.7, Math.max(20, Math.round(typical * 0.6))) : [s]));
  return segments.map((s) => [s.start, s.end]);
}

/**
 * まっすぐ切ったせいで、となりのキャラの耳先などが小さな切れ端として残ったら、となりへ戻す。
 */
function reassignFragments(ids: Int32Array, width: number, height: number, count: number): void {
  const seen = new Uint8Array(width * height);
  const pieces: { id: number; pixels: number[]; neighbors: Map<number, number> }[] = [];
  for (let startP = 0; startP < width * height; startP++) {
    const id = ids[startP]!;
    if (!id || seen[startP]) continue;
    const pixels: number[] = [];
    const neighbors = new Map<number, number>();
    const stack = [startP];
    seen[startP] = 1;
    while (stack.length > 0) {
      const p = stack.pop()!;
      pixels.push(p);
      const x = p % width;
      for (const q of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p >= width ? p - width : -1, p < width * height - width ? p + width : -1]) {
        if (q < 0 || !ids[q]) continue;
        if (ids[q] !== id) {
          neighbors.set(ids[q]!, (neighbors.get(ids[q]!) ?? 0) + 1);
          continue;
        }
        if (!seen[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    pieces.push({ id, pixels, neighbors });
  }
  const largest = new Map<number, number>();
  for (const piece of pieces) largest.set(piece.id, Math.max(largest.get(piece.id) ?? 0, piece.pixels.length));
  for (const piece of pieces) {
    if (piece.pixels.length >= (largest.get(piece.id) ?? 0) * 0.2 || piece.neighbors.size === 0) continue;
    const [target] = [...piece.neighbors.entries()].sort((a, b) => b[1] - a[1])[0]!;
    if (target < 1 || target > count) continue;
    for (const p of piece.pixels) ids[p] = target;
  }
}

export interface SheetPiece {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

/** シート画像を読み込んで、1体ずつの透明PNGに切り分ける */
export async function splitSheet(file: Blob, tolerance: number, alreadyTransparent: boolean): Promise<SheetPiece[]> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvasを初期化できません");
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, width, height);
  if (!alreadyTransparent) removeSheetBackground(image.data, width, height, tolerance);
  const { boxes, labels } = findSprites(image.data, width, height);
  const pieces: SheetPiece[] = [];
  for (const box of boxes) {
    const pad = 4;
    const out = document.createElement("canvas");
    out.width = box.width + pad * 2;
    out.height = box.height + pad * 2;
    const octx = out.getContext("2d");
    if (!octx) continue;
    const piece = octx.createImageData(out.width, out.height);
    for (let y = 0; y < box.height; y++) {
      for (let x = 0; x < box.width; x++) {
        const src = (box.y + y) * width + (box.x + x);
        if (labels[src] !== box.label) continue;
        const dst = ((y + pad) * out.width + (x + pad)) * 4;
        piece.data.set(image.data.subarray(src * 4, src * 4 + 4), dst);
      }
    }
    octx.putImageData(piece, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
    if (blob) pieces.push({ blob, url: URL.createObjectURL(blob), width: out.width, height: out.height });
  }
  return pieces;
}
