// スタイルフレーム3案の共通部品(乱数・ノイズ・字形・作業 canvas・画素の処理)。
// 約束: 絵は引数だけで決まる(seed 付きの乱数、Math.random / Date.now を使わない)。作業 canvas は使うたびに reset。
// ノイズの式は examples/lumiwake-30s/src/lib/paint.js と同じ(値ノイズ+fbm)。
const AD = (() => {
  const W = 1920, H = 1080;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const rng = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y, s = 1) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi, s), hash(xi + 1, yi, s), u), lerp(hash(xi, yi + 1, s), hash(xi + 1, yi + 1, s), u), v);
  };
  const fbm = (x, y, s = 1, oct = 4) => { let a = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { a += amp * vnoise(x * f, y * f, s + i * 17); n += amp; amp *= 0.5; f *= 2.03; } return a / n; };

  const pool = {};
  function buf(name, w = W, h = H) {
    let c = pool[name]; if (!c) c = pool[name] = document.createElement("canvas");
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d", { willReadFrequently: true }); if (g.reset) g.reset();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.clearRect(0, 0, w, h);
    return [c, g];
  }
  const hex = (h) => { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const mix = (a, b, t) => { const A = typeof a === "string" ? hex(a) : a, B = typeof b === "string" ? hex(b) : b; return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; };
  const css = (c, a = 1) => { const C = typeof c === "string" ? hex(c) : c; return `rgba(${C[0] | 0},${C[1] | 0},${C[2] | 0},${a})`; };

  // ---- 字形(gen/glyphs.js: glyph_lines.py の出力。1em=1、y 下向き、ベースライン 0) ----
  const G = (font, ch) => { const g = GLYPHS[font].g[ch]; if (!g) throw new Error("字形が無い: " + font + " " + ch); return g; };
  // 字の輪郭を px の点列の配列に。x0 = 字の左、base = ベースライン
  function contours(font, ch, x0, base, size) {
    return G(font, ch).c.map((c) => { const p = c.p, out = []; for (let i = 0; i < p.length; i += 2) out.push([x0 + p[i] * size, base + p[i + 1] * size]); return out; });
  }
  // 縦組み: 字ごとの枠(上端 top、中心 cx、大きさ sizes[i])。和文の em 枠は ベースライン-0.88〜+0.12
  function vertical(font, str, cx, top, sizes, lead = 1.0) {
    const out = []; let y = top;
    [...str].forEach((ch, i) => { const s = Array.isArray(sizes) ? sizes[i] : sizes, adv = G(font, ch).adv; out.push({ ch, size: s, x0: cx - (adv * s) / 2, base: y + 0.88 * s, cs: contours(font, ch, cx - (adv * s) / 2, y + 0.88 * s, s) }); y += s * lead; });
    return out;
  }
  // 横組み: 左端 x、ベースライン base
  function horizontal(font, str, x, base, size, track = 0) {
    const out = []; [...str].forEach((ch) => { const adv = G(font, ch).adv; out.push({ ch, size, x0: x, base, cs: contours(font, ch, x, base, size) }); x += adv * size + track; });
    return out;
  }
  const bbox = (cs) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const ct of cs) for (const [x, y] of ct) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; };
  function pathOf(g, cs, close = true) { for (const ct of cs) { g.moveTo(ct[0][0], ct[0][1]); for (let i = 1; i < ct.length; i++) g.lineTo(ct[i][0], ct[i][1]); if (close) g.closePath(); } }
  // 折れ線の単純化(Douglas-Peucker)。刀で切った面(ファセット)にする時に使う
  function dp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    const [a, b] = [pts[0], pts[pts.length - 1]]; let dmax = 0, idx = 0;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
    for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > eps) { const l = dp(pts.slice(0, idx + 1), eps), r = dp(pts.slice(idx), eps); return l.slice(0, -1).concat(r); }
    return [a, b];
  }
  // 閉じた輪郭の単純化(始点と終点が同じだと dp が線分1本に潰れるので、始点から最も遠い点で2つに分ける)
  function dpClosed(pts, eps) {
    let far = 0, dm = -1; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > dm) { dm = d; far = i; } }
    const a = dp(pts.slice(0, far + 1), eps), b = dp(pts.slice(far).concat([pts[0]]), eps);
    return a.slice(0, -1).concat(b.slice(0, -1));
  }
  // 点列を長さで再サンプル
  function resample(pts, step) {
    const out = [pts[0]]; let acc = 0;
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = step - acc; while (t <= l) { out.push([lerp(a[0], b[0], t / l), lerp(a[1], b[1], t / l)]); t += step; } acc = (acc + l) % step; }
    if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]);
    return out;
  }
  // 太さの変わる帯(刀の跡・筆の跡)のパス。spine: 点列、wFn(u, i): 太さ、jit: 縁のゆらぎ
  function stroke(g, spine, wFn, { jit = 0, seed = 1 } = {}) {
    const n = spine.length; if (n < 2) return; const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = spine[Math.max(0, i - 1)], b = spine[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const tn = Math.hypot(tx, ty) || 1; tx /= tn; ty /= tn;
      const u = i / (n - 1), w = Math.max(0, wFn(u, i)) / 2, j1 = jit ? (hash(i, 1, seed) - 0.5) * jit : 0, j2 = jit ? (hash(i, 2, seed) - 0.5) * jit : 0;
      L.push([spine[i][0] - ty * (w + j1), spine[i][1] + tx * (w + j1)]); R.push([spine[i][0] + ty * (w + j2), spine[i][1] - tx * (w + j2)]);
    }
    g.moveTo(L[0][0], L[0][1]); for (const p of L) g.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  }
  // 画素ごとの処理(作業 canvas の ImageData を f(x, y, r, g, b, a) → [r, g, b] で書き換え)
  function perPixel(c, fn) {
    const g = c.getContext("2d", { willReadFrequently: true }), img = g.getImageData(0, 0, c.width, c.height), d = img.data, w = c.width;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) { const o = fn(p % w, (p / w) | 0, d[i], d[i + 1], d[i + 2], d[i + 3]); if (o) { d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; if (o.length > 3) d[i + 3] = o[3]; } }
    g.putImageData(img, 0, 0);
  }
  // 低解像度のノイズ表(画素ごとの fbm は重いので、格子で作って双一次で引く)
  function noiseField(w, h, cell, fn) {
    const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, a = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) a[j * gw + i] = fn(i * cell, j * cell);
    return (x, y) => { x = x < 0 ? 0 : x > w - 1 ? w - 1 : x; y = y < 0 ? 0 : y > h - 1 ? h - 1 : y; const fx = x / cell, fy = y / cell, i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * gw + i; return lerp(lerp(a[k], a[k + 1], u), lerp(a[k + gw], a[k + gw + 1], u), v); };
  }
  return { W, H, clamp, lerp, smooth, rng, hash, vnoise, fbm, buf, hex, mix, css, G, contours, vertical, horizontal, bbox, pathOf, dp, dpClosed, resample, stroke, perPixel, noiseField };
})();
