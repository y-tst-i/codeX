// LUMIWAKE 30s v2 (film2) — 共通の道具。paint.js / world.js の後に読む。
// 約束: 絵はコマ番号 f(と引数)だけで決まる。Math.random / Date.now / 経過時間の累積は使わない。乱数は seed 付き。
// 作業 canvas は使うたびに reset する(前のコマの描画状態を持ち越さない)。
//
// 緩急・ばねの式は Motion Prompt の kit から(下の行は MIT の表記。式は kit のまま)。
// Motion Prompt #001-024 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#001
const K2 = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, x) => a + (b - a) * x;
  const P = (t, a, b) => clamp((t - a) / (b - a));
  const eIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eIOs = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const eOut = (x) => 1 - Math.pow(1 - x, 3);
  const eOut5 = (x) => 1 - Math.pow(1 - x, 5);
  const eIn = (x) => x * x * x;
  const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const backOut = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  const backIn = (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x;
  const spring = (t, w = 14, d = 7) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(w * t)); // 0→行き過ぎ→1
  const decay = (t, w = 15, d = 7) => (t < 0 ? 0 : Math.exp(-d * t) * Math.cos(w * t)); // 1→揺れて0
  const mod = (a, n) => ((a % n) + n) % n;
  const FPS = 30;
  // 整数の hash(コマ・番号ごとの決まった乱数)
  const hash = (n, s = 0) => { let h = (n * 374761393 + s * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const rng = (seed) => SCENE_LIB.mulberry32(seed);
  // 区間キー: [[f0, v0], [f1, v1], ...] を ease で補間
  const keys = (f, ks, ease = eIOs) => {
    if (f <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) if (f <= ks[i][0]) { const a = ks[i - 1], b = ks[i], e = b[2] || ease; return lerp(a[1], b[1], e((f - a[0]) / (b[0] - a[0]))); }
    return ks[ks.length - 1][1];
  };

  // ---- 作業 canvas(名前ごと。毎回 reset して状態を持ち越さない) ----
  const pool = {};
  function wbuf(name, w, h) {
    let c = pool[name]; if (!c) c = pool[name] = document.createElement("canvas");
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d"); if (g.reset) g.reset();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.clearRect(0, 0, w, h);
    return [c, g];
  }
  // 焼いた絵(一度だけ作る。中身は引数だけで決まる)
  const plates = {};
  function plate(name, w, h, drawFn) {
    if (plates[name]) return plates[name];
    const c = document.createElement("canvas"); c.width = Math.ceil(w); c.height = Math.ceil(h);
    const g = c.getContext("2d"); drawFn(g, c); plates[name] = c; return c;
  }
  // ぼかした写し(被写界深度)
  function blurred(name, src, px) {
    return plate(name, src.width, src.height, (g) => { g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); g.filter = "none"; });
  }

  // ---- 文字 ----
  // 縦書き(1字ずつ)。句読点は右上へ寄せる。col: 列の中心 x、y0: 上端
  function vtext(ctx, s, x, y0, size, { font = "JPM", weight = 900, col = "#f4ead2", lead = 1.1, alpha = (i) => 1, blur = (i) => 0, dy = (i) => 0, stroke = 0, strokeCol = "rgba(6,10,22,0.8)" } = {}) {
    const chars = [...s];
    chars.forEach((ch, i) => {
      const a = alpha(i); if (a <= 0.003) return;
      const y = y0 + i * size * lead + size * 0.88 + dy(i);
      ctx.save(); ctx.globalAlpha = a; ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      const b = blur(i); if (b > 0.1) ctx.filter = `blur(${b}px)`;
      let px = x, py = y;
      if (ch === "、" || ch === "。") { px += size * 0.62; py -= size * 0.66; }
      if (stroke) { ctx.lineJoin = "round"; ctx.strokeStyle = strokeCol; ctx.lineWidth = stroke; ctx.strokeText(ch, px, py); }
      ctx.fillStyle = col; ctx.fillText(ch, px, py); ctx.restore();
    });
  }
  // 横書き(1字ずつ出す)。x は中央、y は基線。字の幅は measureText で並べる
  function htext(ctx, s, cx, y, size, { font = "JPM", weight = 900, col = "#f4ead2", track = 0, alpha = (i) => 1, blur = (i) => 0, dy = (i) => 0, stroke = 0, strokeCol = "rgba(6,10,22,0.8)", align = "center" } = {}) {
    const chars = [...s]; ctx.save(); ctx.font = `${weight} ${size}px ${font}`;
    const ws = chars.map((c) => ctx.measureText(c).width + track), W = ws.reduce((a, b) => a + b, 0) - track;
    let x = align === "center" ? cx - W / 2 : align === "right" ? cx - W : cx;
    ctx.restore();
    chars.forEach((ch, i) => {
      const a = alpha(i);
      if (a > 0.003) {
        ctx.save(); ctx.globalAlpha = a; ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        const b = blur(i); if (b > 0.1) ctx.filter = `blur(${b}px)`;
        if (stroke) { ctx.lineJoin = "round"; ctx.strokeStyle = strokeCol; ctx.lineWidth = stroke; ctx.strokeText(ch, x, y + dy(i)); }
        ctx.fillStyle = col; ctx.fillText(ch, x, y + dy(i)); ctx.restore();
      }
      x += ws[i];
    });
    return W;
  }

  // ---- 粒子のはじけ(Motion Prompt #003 Burst の数値: 輪は半径 44→90・線幅 16→0 を 0.6 秒 quintic out、放射線10本、点10個) ----
  // Motion Prompt #003 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#003
  function burst(ctx, x, y, dt, { scale = 1, ring = "#fff1c9", lines = ["#ffb347", "#fff6dc"], dots = ["#ff8a3d", "#dff7ff"], n = 10, rot = 0, a = 1 } = {}) {
    if (dt < 0 || dt > 0.8) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.lineCap = "round";
    const q = eOut5(clamp(dt / 0.6)), S = scale;
    if (dt < 0.6) { ctx.strokeStyle = ring; ctx.lineWidth = 16 * S * (1 - q); ctx.beginPath(); ctx.arc(0, 0, (44 + 46 * q) * S * 1.6, 0, 7); ctx.stroke(); }
    const lq = clamp((dt - 0.0) / 0.7), len = 36 * S * 1.6 * (1 - P(dt, 0.22, 0.7));
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2, ro = (64 + 66 * eOut5(lq)) * S * 1.6;
      if (len > 0.5) { ctx.strokeStyle = lines[i % 2]; ctx.lineWidth = 9 * S; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * (ro - len), Math.sin(ang) * (ro - len) * 0.82); ctx.lineTo(Math.cos(ang) * ro, Math.sin(ang) * ro * 0.82); ctx.stroke(); }
      const da = 1 - P(dt, 0.3, 0.72), dr = (58 + 92 * eOut5(clamp(dt / 0.72))) * S * 1.6, dang = ang + Math.PI / n;
      if (da > 0) { ctx.globalAlpha = a * da; ctx.fillStyle = dots[i % 2]; ctx.beginPath(); ctx.arc(Math.cos(dang) * dr * 1.45 * 0.8, Math.sin(dang) * dr * 0.78, lerp(8, 4.8, q) * S, 0, 7); ctx.fill(); ctx.globalAlpha = a; }
    }
    ctx.restore();
  }

  // ---- カメラ(2.5D の層) ----
  // cam = { x, y, z(拡大), r(回転), sx, sy(揺れ) }。p = 視差の係数(0=無限遠 / 1=主役の面 / >1 手前)
  // p は数か [px, py](横と縦で視差を変える)
  const pxy = (p) => (Array.isArray(p) ? p : [p, p]);
  function camApply(ctx, cam, p = 1, zp = null) {
    const [px, py] = pxy(p), z = 1 + (cam.z - 1) * (zp ?? Math.max(px, py));
    ctx.translate(960 + (cam.sx || 0), 540 + (cam.sy || 0)); ctx.rotate(cam.r || 0); ctx.scale(z, z); ctx.translate(-cam.x * px, -cam.y * py);
  }
  // 層の絵(焼いた canvas)を、世界座標 (wx, wy) を左上として置く
  function layerImg(ctx, img, cam, p, wx, wy, { a = 1, op = "source-over", scale = 1, zp = null } = {}) {
    ctx.save(); camApply(ctx, cam, p, zp); ctx.globalAlpha = a; ctx.globalCompositeOperation = op; ctx.drawImage(img, wx, wy, img.width * scale, img.height * scale); ctx.restore();
  }
  // 世界座標 → 画面座標
  function toScreen(cam, p, wx, wy, zp = null) {
    const [px, py] = pxy(p), z = 1 + (cam.z - 1) * (zp ?? Math.max(px, py)), dx = (wx - cam.x * px) * z, dy = (wy - cam.y * py) * z, c = Math.cos(cam.r || 0), s = Math.sin(cam.r || 0);
    return [960 + (cam.sx || 0) + dx * c - dy * s, 540 + (cam.sy || 0) + dx * s + dy * c, z];
  }
  // 揺れ(Motion Prompt #024 Impact shake: x 15px·e^(−5t)·sin(2π·5t), y 11px·e^(−5t)·cos(2π·6.5t), 回転 0.02rad·e^(−5t)·sin(2π·5t+0.6))
  // Motion Prompt #024 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#024
  function impactShake(dt, amp = 1) {
    if (dt < 0 || dt > 1.1) return [0, 0, 0];
    const e = Math.exp(-5 * dt);
    return [15 * amp * e * Math.sin(2 * Math.PI * 5 * dt), 11 * amp * e * Math.cos(2 * Math.PI * 6.5 * dt), 0.02 * amp * e * Math.sin(2 * Math.PI * 5 * dt + 0.6)];
  }
  // 手持ち(Motion Prompt #034 Handheld: 周期の違う sin の和。T = 2π·u/4.7)
  // Motion Prompt #034 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#034
  function handheld(u, amp = 1) {
    const T = (2 * Math.PI * u) / 4.7;
    const yaw = 0.016 * Math.sin(3 * T) + 0.008 * Math.sin(7 * T + 1) + 0.004 * Math.sin(13 * T + 2);
    const pitch = 0.012 * Math.sin(4 * T + 2) + 0.006 * Math.sin(9 * T + 0.5) + 0.003 * Math.sin(17 * T + 1.2);
    const roll = 0.02 * Math.sin(5 * T + 1) + 0.008 * Math.sin(11 * T + 3);
    return [yaw * 1100 * amp, pitch * 1100 * amp, roll * amp]; // 角度 → 画素(焦点距離 1100px 相当)
  }

  // ---- 光の気流(琥珀の帯)。pts は世界座標の点列。描く ctx はカメラ適用済み ----
  function streamPath(pts, per = 18) { return PAINT.sampleSpline(pts, per); }
  function stream(ctx, samp, { width = 40, flow = 0, seed = 4, a = 1, taper = [0.25, 1], streaks = 70, hot = 1, dir = 1 } = {}) {
    const P2 = PAINT, C = WORLD.C, L = samp[samp.length - 1][2] || 1, css = P2.css;
    const wf = (u) => width * lerp(taper[0], taper[1], Math.min(1, u * 1.4)) * (0.88 + 0.12 * Math.sin(u * 37 + flow * 0.006));
    ctx.save(); ctx.globalAlpha = a;
    P2.ribbonPath(ctx, samp, (u) => wf(u) * 2.6); ctx.fillStyle = css(C.amberDeep, 0.13); ctx.fill();
    P2.ribbonPath(ctx, samp, (u) => wf(u) * 1.5); ctx.fillStyle = css(C.amberDeep, 0.2); ctx.fill();
    P2.ribbonPath(ctx, samp, wf); const gr = ctx.createLinearGradient(samp[0][0], samp[0][1], samp[samp.length - 1][0], samp[samp.length - 1][1]);
    gr.addColorStop(0, css(C.amberDeep, 0.25)); gr.addColorStop(0.4, css("#f39a3c", 0.62)); gr.addColorStop(1, css(C.amber, 0.78)); ctx.fillStyle = gr; ctx.fill();
    P2.ribbonPath(ctx, samp, (u) => wf(u) * 0.36); ctx.fillStyle = css(C.amberHot, 0.85 * hot); ctx.fill();
    P2.ribbonPath(ctx, samp, (u) => wf(u) * 0.1); ctx.fillStyle = css("#ffffff", 0.9 * hot); ctx.fill();
    // 流れの筋(破線が流れる)
    const r = rng(seed); ctx.lineCap = "round";
    const idx = (s) => { let lo = 0, hi = samp.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (samp[m][2] < s) lo = m + 1; else hi = m; } return lo; };
    for (let k = 0; k < streaks; k++) {
      const off = (r() - 0.5) * 1.7, sp = 0.6 + r() * 0.9, len = 40 + r() * 160, s0 = mod(r() * L + dir * flow * sp, L + len) - len * 0.5;
      const i0 = idx(Math.max(0, s0)), i1 = idx(Math.min(L, s0 + len)); if (i1 <= i0) continue;
      const u = clamp(s0 / L), wv = wf(u) * off, al = (0.3 + r() * 0.55) * (1 - Math.abs(off) * 0.4);
      ctx.strokeStyle = css(r() < 0.35 ? "#ffffff" : C.amberHot, al); ctx.lineWidth = 1.2 + r() * 2.6; ctx.beginPath();
      for (let q = i0; q <= i1; q++) { const a2 = samp[Math.max(0, q - 1)], b2 = samp[Math.min(samp.length - 1, q + 1)], tn = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1, nx = -(b2[1] - a2[1]) / tn, ny = (b2[0] - a2[0]) / tn, x = samp[q][0] + nx * wv, y = samp[q][1] + ny * wv; q === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // 点列上の位置(弧長 s)と向き
  function along(samp, s) {
    const L = samp[samp.length - 1][2]; s = clamp(s, 0, L);
    let lo = 0, hi = samp.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (samp[m][2] < s) lo = m + 1; else hi = m; }
    const i = Math.max(1, lo), a = samp[i - 1], b = samp[i], k = (s - a[2]) / ((b[2] - a[2]) || 1);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])];
  }

  // ---- 光(加算)。PAINT.glow と同じだが fx の切り替えを見る ----
  const glow = (ctx, x, y, r, col, a = 0.6, o) => PAINT.glow(ctx, x, y, r, col, a, o);

  return { clamp, lerp, P, eIO, eIOs, eOut, eOut5, eIn, expoOut, smooth, backOut, backIn, spring, decay, mod, FPS, hash, rng, keys, wbuf, plate, plates, blurred, vtext, htext, burst, camApply, layerImg, toScreen, impactShake, handheld, streamPath, stream, along, glow };
})();
