// LUMIWAKE スタイルフレーム用の描画部品(汎用)。scene-lib.js と depth.js の「後」に読む。
// 約束: 絵は引数(と時刻 t)だけで決まる。乱数は seed 付き。Math.random / Date.now を使わない。
// モード: PAINT.mode.fx(光・粒・ブラー・グレインなどの効果)/ PAINT.mode.sil(シルエット確認: 形だけを単色で塗る)
const PAINT = (() => {
  const { mulberry32, clamp, lerp, smooth } = SCENE_LIB;
  const { rgb, mix, css } = DEPTH;
  const mode = { fx: true, sil: false };

  // ---- ノイズ(seed 付きの値ノイズ+fbm) ----
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y, s = 1) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
  const fbm = (x, y, s = 1, oct = 4) => { let a = 0, amp = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { a += amp * vnoise(x * f, y * f, s + i * 17); n += amp; amp *= 0.5; f *= 2.03; } return a / n; };

  // ---- 作業用キャンバス(名前ごとに使い回す) ----
  const pool = {};
  function buf(name, w, h) {
    let c = pool[name];
    if (!c) { c = pool[name] = document.createElement("canvas"); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.clearRect(0, 0, w, h);
    return [c, g];
  }

  // ---- 3トーン+リムの陰影(どんな形にも効く「ずらしたシルエット」方式) ----
  // pathFn(g): g に形のパスを作る(beginPath から。塗りはしない)。座標は画面座標。
  // box=[x,y,w,h]: 作業範囲。L=[lx,ly]: 光の向き(光源の方向。単位ベクトルに直す)。
  // 帯の幅: hi(明るい側の帯)・sh(陰の帯)・rim(逆光の細い縁)。blur は境目の柔らかさ。
  // base は色か (g, box) => fillStyle。sil モードでは silColor で塗るだけ。
  function shade(ctx, pathFn, o) {
    const { box, base, silColor = "#111", L = [-0.6, -0.8], hiCol, hi = 10, hiA = 0.9, shCol, sh = 24, shA = 1, rimCol, rim = 4, rimL, rimA = 1, blur = 4, tex = 0, texSeed = 3, texScale = 0.02, extra } = o;
    if (mode.sil) { ctx.save(); pathFn(ctx); ctx.fillStyle = silColor; ctx.fill(); ctx.restore(); return; }
    const [bx, by, bw, bh] = box.map(Math.round), pad = 2;
    const [c, g] = buf("shade", bw + pad * 2, bh + pad * 2);
    g.translate(pad - bx, pad - by);
    // 地
    pathFn(g); g.fillStyle = typeof base === "function" ? base(g, box) : base; g.fill();
    const nl = Math.hypot(L[0], L[1]) || 1, lx = L[0] / nl, ly = L[1] / nl;
    const band = (col, dist, dirx, diry, a, bl, op = "source-atop") => {
      if (!col || dist <= 0 || a <= 0) return;
      const [c2, g2] = buf("band", bw + pad * 2, bh + pad * 2);
      g2.translate(pad - bx, pad - by);
      pathFn(g2); g2.fillStyle = col; g2.fill();
      g2.globalCompositeOperation = "destination-out"; g2.filter = bl > 0 ? `blur(${bl}px)` : "none";
      g2.translate(-dirx * dist, -diry * dist); pathFn(g2); g2.fillStyle = "#000"; g2.fill();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = op; g.globalAlpha = a; g.drawImage(c2, 0, 0); g.restore();
    };
    // 陰(光と反対側の帯)→ 明(光の側の帯)→ 逆光のリム(別の光源 rimL から)
    band(shCol, sh, -lx, -ly, shA, blur * 2);
    band(hiCol, hi, lx, ly, hiA, blur);
    if (extra) extra(g, box);
    if (rimCol) { const r = rimL || [-lx, -ly], rn = Math.hypot(r[0], r[1]) || 1; band(rimCol, rim, r[0] / rn, r[1] / rn, rimA, Math.max(0.5, blur * 0.3)); }
    // 筆の質感(明るさのむら)。地の上に乗算と覆い焼きで薄く
    if (tex > 0) {
      const [c3, g3] = buf("tex", bw + pad * 2, bh + pad * 2);
      const img = g3.createImageData(c3.width, c3.height), d = img.data;
      for (let y = 0; y < c3.height; y += 2) for (let x = 0; x < c3.width; x += 2) {
        const n = fbm((x + bx) * texScale, (y + by) * texScale * 1.8, texSeed, 3), v = (n - 0.5) * 2;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const k = ((y + j) * c3.width + x + i) * 4; if (k >= d.length) continue; d[k] = v > 0 ? 255 : 0; d[k + 1] = v > 0 ? 250 : 0; d[k + 2] = v > 0 ? 235 : 20; d[k + 3] = Math.abs(v) * 255 * tex; }
      }
      g3.putImageData(img, 0, 0);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-atop"; g.drawImage(c3, 0, 0); g.restore();
    }
    ctx.drawImage(c, bx - pad, by - pad);
  }

  // ---- 光(効果。fx=false では描かない) ----
  function glow(ctx, x, y, r, col, a = 0.6, { op = "lighter", inner = 0 } = {}) {
    if (!mode.fx || mode.sil) return;
    const g = ctx.createRadialGradient(x, y, r * inner, x, y, r), c = rgb(col);
    g.addColorStop(0, css(c, a)); g.addColorStop(0.35, css(c, a * 0.45)); g.addColorStop(1, css(c, 0));
    ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  // 描いた物をぼかして足す(ブルームの局所版)。drawFn は画面座標で描く
  function bloom(ctx, drawFn, { blur = 18, a = 0.8, op = "lighter", w = 1920, h = 1080 } = {}) {
    if (!mode.fx || mode.sil) return;
    const [c, g] = buf("bloom", w, h); drawFn(g);
    ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = a; ctx.filter = `blur(${blur}px)`; ctx.drawImage(c, 0, 0); ctx.restore();
  }
  // 層ごとのぼかし(遠景の被写界深度)。fx=false でも形は描く(ぼかさない)
  function layer(ctx, drawFn, { blur = 0, a = 1, op = "source-over", w = 1920, h = 1080 } = {}) {
    const [c, g] = buf("layer" + blur, w, h); drawFn(g);
    ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = op; if (blur > 0 && mode.fx && !mode.sil) ctx.filter = `blur(${blur}px)`; ctx.drawImage(c, 0, 0); ctx.restore();
  }

  // ---- ベジェの道具 ----
  // 点列を通る滑らかな曲線(Catmull-Rom → ベジェ)
  function spline(g, pts, { close = false, move = true } = {}) {
    const n = pts.length; if (n < 2) return;
    const P = (i) => close ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    if (move) g.moveTo(pts[0][0], pts[0][1]);
    const m = close ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (close) g.closePath();
  }
  // 曲線をサンプルした点列(長さつき)
  function sampleSpline(pts, per = 24) {
    const out = [], n = pts.length, P = (i) => pts[clamp(i, 0, n - 1)];
    for (let i = 0; i < n - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[n - 1]);
    let L = 0; out[0][2] = 0; for (let i = 1; i < out.length; i++) { L += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]); out[i][2] = L; }
    return out;
  }
  // 太さが変わる帯(リボン・マフラー・光の流れ)のパス。widthFn(u) は 0..1 の位置で太さ
  function ribbonPath(g, samp, widthFn) {
    const L = samp[samp.length - 1][2] || 1, left = [], right = [];
    for (let i = 0; i < samp.length; i++) {
      const a = samp[Math.max(0, i - 1)], b = samp[Math.min(samp.length - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tn = Math.hypot(tx, ty) || 1; tx /= tn; ty /= tn;
      const w = widthFn(samp[i][2] / L) / 2; left.push([samp[i][0] - ty * w, samp[i][1] + tx * w]); right.push([samp[i][0] + ty * w, samp[i][1] - tx * w]);
    }
    g.beginPath(); g.moveTo(left[0][0], left[0][1]); for (const p of left) g.lineTo(p[0], p[1]); for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]); g.closePath();
  }

  // ---- 仕上げ(効果) ----
  function finish(ctx, t, { vig = 0.5, vigColor = "#05060f", grainA = [0.02, 0.045] } = {}) {
    if (!mode.fx || mode.sil) return;
    DEPTH.vignette(ctx, vig, { color: vigColor, inner: 0.5, outer: 1.5 });
    DEPTH.grain(ctx, t, { alpha: grainA, density: 0.012, size: [1, 2.2], seed: 29 });
  }

  return { mode, hash, vnoise, fbm, buf, shade, glow, bloom, layer, spline, sampleSpline, ribbonPath, finish, rgb, mix, css, clamp, lerp, smooth, mulberry32 };
})();
