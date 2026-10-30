// LUMIWAKE の世界(空・雲・浮遊島・町・嵐・光の気流)。paint.js の後に読む。
// 色の約束(BRIEF.md の「色」と同じ): 琥珀=配達人・荷物・光の気流(味方)/ 冷たい白青と紫黒=嵐(危険)/ 藍〜青緑=夜空
const WORLD = (() => {
  const P = PAINT, { mulberry32, clamp, lerp, mix, css, fbm, shade, glow, spline } = P;
  const C = {
    skyTop: "#0b1426", skyMid: "#16304a", skyLow: "#2b5a66", horizon: "#4f8a88",
    moon: "#f3ecd6", moonLight: "#bfe3e6", haze: "#3d6f78",
    rock: "#3b3346", rockDark: "#1c1a2b", rockLit: "#7d8fa6", moss: "#2f6b5e", mossLit: "#8cc7a4",
    amber: "#ffb347", amberHot: "#fff1c9", amberDeep: "#e8792b", ember: "#ff8a3d",
    storm: "#1b1230", stormMid: "#3a2a5c", bolt: "#dff7ff", boltGlow: "#7fd6ff",
    ink: "#0a0f1c", ivory: "#f4ead2",
  };
  // 空気遠近(配列で返す)。d=0 手前〜1 遠い。彩度を落として空の色へ寄せる
  const haze = (c, d, sky = C.haze, amount = 0.78, desat = 0.45) => { const a = P.rgb(c), y = 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; return mix(mix(a, [y, y, y], desat * d), sky, amount * Math.pow(clamp(d), 1.2)); };
  const silBg = (d) => css(mix("#e9e7e2", "#b9b8b4", 1 - d)); // シルエット確認用: 遠いほど薄い灰

  // ---- 空 ----
  function sky(ctx, { w = 1920, h = 1080, tilt = 0, glowAt = [1450, 260] } = {}) {
    if (P.mode.sil) { ctx.fillStyle = "#f2f1ee"; ctx.fillRect(0, 0, w, h); return; }
    const g = ctx.createLinearGradient(0, 0, tilt * w, h);
    g.addColorStop(0, C.skyTop); g.addColorStop(0.45, C.skyMid); g.addColorStop(0.8, C.skyLow); g.addColorStop(1, C.horizon);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 月の方向の明るみ(局所光)
    const r = ctx.createRadialGradient(glowAt[0], glowAt[1], 0, glowAt[0], glowAt[1], 900);
    r.addColorStop(0, "rgba(150,205,215,0.32)"); r.addColorStop(0.5, "rgba(90,150,170,0.10)"); r.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
  }
  function stars(ctx, { w = 1920, h = 1080, n = 420, seed = 5, maxY = 0.7, t = 0 } = {}) {
    if (P.mode.sil) return;
    const r = mulberry32(seed); ctx.save();
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = Math.pow(r(), 1.4) * h * maxY, s = r() < 0.06 ? 1.8 + r() * 1.2 : 0.6 + r() * 0.9, tw = 0.55 + 0.45 * Math.sin(t * (1 + r() * 2) + r() * 6.28);
      const a = (0.25 + 0.6 * r()) * tw * (1 - y / (h * maxY)) ** 0.5;
      ctx.fillStyle = r() < 0.15 ? `rgba(255,226,180,${a})` : `rgba(215,236,255,${a})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
      if (s > 2 && P.mode.fx) glow(ctx, x, y, s * 6, "#cfe8ff", a * 0.35);
    }
    ctx.restore();
  }
  function moon(ctx, x, y, R) {
    if (P.mode.sil) return;
    glow(ctx, x, y, R * 5, "#9fd2da", 0.22, { op: "screen" });
    const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
    g.addColorStop(0, "#fffaf0"); g.addColorStop(0.7, C.moon); g.addColorStop(1, "#cfd8cf");
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fillStyle = g; ctx.fill(); ctx.clip();
    // 月面のむら(ノイズで暗い海)
    const r = mulberry32(77);
    for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(150,160,170,${0.08 + r() * 0.12})`; ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * R * 1.4, y + (r() - 0.5) * R * 1.4, R * (0.12 + r() * 0.3), R * (0.1 + r() * 0.22), r() * 3, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // ---- 雲(アニメ調の積雲: 弧の連なった上縁+各こぶの下に陰+下は霧へ溶ける) ----
  // 上縁は「大きさの違う弧」を左右に並べた包絡線。こぶごとに陰の三日月を描いて量感を出す
  function scallops(seed, x0, x1, yb, hgt) {
    const r = mulberry32(seed), arcs = []; let x = x0 - hgt * 0.5;
    while (x < x1 + hgt * 0.5) {
      const u = clamp((x - x0) / (x1 - x0)), env = 0.45 + 0.55 * Math.pow(Math.sin(Math.PI * clamp(u * 0.9 + 0.05)), 0.7);
      const rr = hgt * (0.28 + 0.72 * Math.pow(r(), 1.3)) * env; arcs.push([x + rr * 0.8, yb - rr * (0.35 + 0.45 * r()), rr]); x += rr * (0.8 + r() * 0.7);
    }
    return arcs;
  }
  function envelope(arcs, x0, x1, yb, seed) {
    const pts = [];
    for (let x = x0; x <= x1; x += 6) {
      let y = yb;
      for (const [cx, cy, r] of arcs) { const dx = x - cx; if (Math.abs(dx) < r) y = Math.min(y, cy - Math.sqrt(r * r - dx * dx)); }
      pts.push([x, y + (fbm(x * 0.02, 0, seed, 2) - 0.5) * 6]);
    }
    return pts;
  }
  function cloudBank(ctx, { seed = 1, x0, x1, yb, hgt = 120, d = 0.5, lit = C.moonLight, L = [0.5, -0.85], under = 200, alpha = 1, skyCol = C.haze, warm = 0, warmAt = null } = {}) {
    const arcs = scallops(seed, x0, x1, yb, hgt), top = envelope(arcs, x0 - 40, x1 + 40, yb, seed);
    const path = (g) => { g.beginPath(); g.moveTo(top[0][0], yb + under); for (const p of top) g.lineTo(p[0], p[1]); g.lineTo(top[top.length - 1][0], yb + under); g.closePath(); };
    const base = mix(mix("#2b4559", "#6a919a", 1 - d), skyCol, 0.3 * d), dark = mix(base, "#0c1424", 0.55);
    ctx.save(); ctx.globalAlpha = alpha;
    if (P.mode.sil) { path(ctx); ctx.fillStyle = silBg(d); ctx.fill(); ctx.restore(); return arcs; }
    shade(ctx, path, {
      box: [x0 - 80, yb - hgt * 2.2, x1 - x0 + 160, hgt * 2.2 + under + 10],
      base: (g) => { const gr = g.createLinearGradient(0, yb - hgt * 1.3, 0, yb + under); gr.addColorStop(0, css(mix(base, lit, 0.3))); gr.addColorStop(0.45, css(base)); gr.addColorStop(1, css(dark)); return gr; },
      L, hiCol: css(mix(lit, "#ffffff", 0.25)), hi: 5 + hgt * 0.05, hiA: 0.7 * (1 - d * 0.4), blur: 2 + hgt * 0.02,
      tex: 0.12, texSeed: seed, texScale: 0.01,
      extra: (g) => { // こぶの下の陰(内側の弧)と、こぶの頭の光
        g.save(); g.globalCompositeOperation = "source-atop";
        const r = mulberry32(seed + 3);
        for (const [cx, cy, rr] of arcs) {
          if (r() < 0.2) continue;
          // こぶの頭の光(月側に寄せた丸いグラデ)と、こぶの下側の陰(下へずらした暗いグラデ)
          const lx = cx + L[0] * rr * 0.35, ly = cy + L[1] * rr * 0.35, gl = g.createRadialGradient(lx, ly, 0, lx, ly, rr * 0.95);
          gl.addColorStop(0, css(mix(lit, "#ffffff", 0.2), 0.32 * (1 - d * 0.5))); gl.addColorStop(1, css(lit, 0));
          g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, rr * 0.95, 0, 7); g.fill();
          const sx = cx - L[0] * rr * 0.2, sy = cy + rr * 0.95, gs = g.createRadialGradient(sx, sy, 0, sx, sy, rr * 0.8);
          gs.addColorStop(0, css(dark, 0.35)); gs.addColorStop(1, css(dark, 0));
          g.fillStyle = gs; g.beginPath(); g.arc(sx, sy, rr * 0.8, 0, 7); g.fill();
        }
        if (warm > 0 && warmAt) { const gr = g.createRadialGradient(warmAt[0], warmAt[1], 0, warmAt[0], warmAt[1], warmAt[2]); gr.addColorStop(0, css(C.amber, warm)); gr.addColorStop(1, css(C.amber, 0)); g.globalCompositeOperation = "source-atop"; g.fillStyle = gr; g.fillRect(x0 - 100, yb - hgt * 3, x1 - x0 + 200, hgt * 3 + under); }
        g.restore();
      },
    });
    // 下は霧に溶ける
    const fog = ctx.createLinearGradient(0, yb - hgt * 0.2, 0, yb + under); fog.addColorStop(0, css(skyCol, 0)); fog.addColorStop(1, css(mix(skyCol, "#0e1a28", 0.5), 0.75 * (1 - d * 0.5)));
    ctx.fillStyle = fog; ctx.fillRect(x0 - 80, yb - hgt * 0.2, x1 - x0 + 160, under + hgt * 0.2);
    ctx.restore();
    return arcs;
  }

  // ---- 浮遊島(上面は草と町、下面は面(ファセット)で割った岩の柱・根・滝) ----
  // d=0 手前 〜 1 遠い(空気遠近で色を空へ寄せる)。L は月の向き
  function islandShape(seed, cx, top, w, depthH) {
    const r = mulberry32(seed), N = 60, topPts = [], bot = [];
    for (let i = 0; i <= N; i++) { const u = i / N, x = cx - w / 2 + u * w; topPts.push([x, top - Math.sin(u * Math.PI) * w * 0.03 + (fbm(u * 4, seed, seed, 2) - 0.5) * w * 0.04]); }
    // 岩の柱(つらら状の塊)を数本重ねる。主柱は中央寄りで最も長い
    const cols = [[0.42 + r() * 0.16, 1, 0.16 + r() * 0.05]];
    const n = 4 + Math.floor(r() * 3); for (let k = 0; k < n; k++) cols.push([0.1 + r() * 0.8, 0.25 + r() * 0.5, 0.05 + r() * 0.08]);
    for (let i = N; i >= 0; i--) {
      const u = i / N, x = cx - w / 2 + u * w; let dpt = Math.pow(Math.sin(u * Math.PI), 0.7) * 0.18;
      for (const [c, a, s] of cols) { const q = Math.abs(u - c) / s; if (q < 1) dpt = Math.max(dpt, a * Math.pow(1 - q, 1.6)); }
      dpt *= 0.9 + 0.2 * fbm(u * 25, 1, seed, 2);
      bot.push([x, top + 8 + depthH * dpt]);
    }
    return { topPts, bot, cols };
  }
  function island(ctx, { seed = 1, cx, top, w, depthH = w * 0.6, d = 0.3, L = [0.55, -0.8], town = true, falls = true, lamp = 1, skyCol = C.haze, roots = true, lightSide = null } = {}) {
    const S = islandShape(seed, cx, top, w, depthH), { topPts, bot } = S;
    const rockPath = (g) => { g.beginPath(); g.moveTo(topPts[0][0], topPts[0][1] + 8); for (const p of topPts) g.lineTo(p[0], p[1] + 8); for (const p of bot) g.lineTo(p[0], p[1]); g.closePath(); };
    const h = (c) => haze(c, d, skyCol);
    const box = [cx - w / 2 - 30, top - w * 0.12, w + 60, depthH * 1.15 + w * 0.15];
    shade(ctx, rockPath, {
      box, silColor: silBg(d), L,
      base: (g) => { const gr = g.createLinearGradient(0, top, 0, top + depthH); gr.addColorStop(0, css(h(C.rock))); gr.addColorStop(0.6, css(h(C.rockDark))); gr.addColorStop(1, css(h("#120f1d"))); return gr; },
      hiCol: css(h(C.rockLit)), hi: 6 + w * 0.012, hiA: 0.8, shCol: css(h("#0f0c19")), sh: w * 0.08, shA: 0.55, blur: 2,
      rimCol: lightSide ? css(h(lightSide.col)) : null, rim: lightSide ? lightSide.w : 0, rimL: lightSide ? lightSide.L : null, rimA: lightSide ? lightSide.a : 0,
      tex: 0.22, texSeed: seed + 9, texScale: 0.035,
      extra: (g) => { // 面(ファセット): 縦に割った帯を、月の側は明るく・反対は暗く
        const r = mulberry32(seed * 3 + 1); g.save(); g.globalCompositeOperation = "source-atop";
        let x = cx - w / 2;
        while (x < cx + w / 2) {
          const fw = w * (0.05 + r() * 0.08), lean = (r() - 0.5) * fw * 0.8, side = r() < 0.5 ? 1 : -1, facing = side * Math.sign(L[0] || 1);
          g.fillStyle = facing > 0 ? css(h(C.rockLit), 0.12 + r() * 0.1) : css(h("#07060d"), 0.18 + r() * 0.15);
          g.beginPath(); g.moveTo(x, top); g.lineTo(x + fw, top); g.lineTo(x + fw * 0.5 + lean, top + depthH * 1.1); g.closePath(); g.fill();
          x += fw * (0.6 + r() * 0.5);
        }
        // 地層(2本だけ、ゆるい弧)
        for (let k = 0; k < 2; k++) { const yy = top + depthH * (0.12 + k * 0.1); g.strokeStyle = css(h("#0b0914"), 0.35); g.lineWidth = 2.5; g.beginPath(); spline(g, [[cx - w * 0.55, yy + 8], [cx - w * 0.15, yy - 4 + r() * 8], [cx + w * 0.2, yy + r() * 8], [cx + w * 0.55, yy + 2]]); g.stroke(); }
        g.restore();
      },
    });
    if (roots && !P.mode.sil) {
      const r = mulberry32(seed + 55); ctx.save(); ctx.strokeStyle = css(h("#1f2d33")); ctx.lineCap = "round";
      for (let k = 0; k < 12; k++) { const i = Math.floor(5 + r() * 50), p = bot[i], len = 20 + r() * w * 0.16; ctx.globalAlpha = 0.75; ctx.lineWidth = 0.8 + r() * 2; ctx.beginPath(); ctx.moveTo(p[0], p[1] - 10); ctx.bezierCurveTo(p[0] + (r() - 0.5) * 20, p[1] + len * 0.4, p[0] + (r() - 0.5) * 30, p[1] + len * 0.7, p[0] + (r() - 0.5) * 16, p[1] + len); ctx.stroke(); }
      ctx.restore();
    }
    const capPath = (g) => { g.beginPath(); g.moveTo(topPts[0][0] - 8, topPts[0][1] + 12); for (const p of topPts) g.lineTo(p[0], p[1] - 3); const q = topPts[topPts.length - 1]; g.lineTo(q[0] + 8, q[1] + 14); for (let i = topPts.length - 1; i >= 0; i -= 2) { const p = topPts[i]; g.lineTo(p[0], p[1] + 12 + 12 * Math.abs(Math.sin(i * 1.7 + seed))); } g.closePath(); };
    shade(ctx, capPath, { box: [cx - w / 2 - 20, top - w * 0.1, w + 40, w * 0.16], base: css(h(C.moss)), silColor: silBg(d), L, hiCol: css(h(C.mossLit)), hi: 5, hiA: 0.85, shCol: css(h("#163733")), sh: 7, shA: 0.6, blur: 1.5 });
    if (town) houses(ctx, { seed, topPts, w, d, h, lamp, L });
    if (falls && !P.mode.sil) {
      const r = mulberry32(seed + 7), i = Math.round((0.18 + r() * 0.12) * 60), p = topPts[i], len = depthH * 1.2, fw = Math.max(1.5, w * 0.005);
      const g = ctx.createLinearGradient(0, p[1], 0, p[1] + len); g.addColorStop(0, css(h("#d4ecef"), 0.6)); g.addColorStop(0.6, css(h("#d4ecef"), 0.15)); g.addColorStop(1, css(h("#d4ecef"), 0));
      ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p[0] - fw, p[1] + 6); ctx.bezierCurveTo(p[0] - fw * 3, p[1] + 20, p[0] - fw * 2, p[1] + len * 0.5, p[0] - fw * 2.5, p[1] + len); ctx.lineTo(p[0] + fw * 3, p[1] + len); ctx.bezierCurveTo(p[0] + fw, p[1] + len * 0.5, p[0] + fw, p[1] + 20, p[0] + fw, p[1] + 6); ctx.fill(); ctx.restore();
    }
    return S;
  }
  // 家並み: 寄り添う家・丸屋根・塔。窓は琥珀(lamp で点灯量)
  function houses(ctx, { seed, topPts, w, d, h, lamp, L }) {
    const r = mulberry32(seed + 101), n = Math.max(4, Math.round(w / 45)), N = topPts.length - 1;
    const list = []; for (let k = 0; k < n; k++) list.push(0.2 + 0.6 * (k + r() * 0.8) / n);
    list.sort(() => r() - 0.5);
    for (const u of list) {
      const p = topPts[Math.round(u * N)], hw = w * (0.03 + r() * 0.025), kind = r(), tall = kind < 0.15, dome = kind > 0.85;
      const H = hw * (tall ? 2.6 : 1 + r() * 0.7), roof = hw * (dome ? 0.5 : 0.6 + r() * 0.5), x = p[0], y = p[1] + 5;
      const body = (g) => { g.beginPath(); g.moveTo(x - hw / 2, y); g.lineTo(x - hw / 2, y - H); g.lineTo(x + hw / 2, y - H); g.lineTo(x + hw / 2, y); g.closePath(); };
      shade(ctx, body, { box: [x - hw, y - H - 4, hw * 2, H + 8], base: css(h("#5a5068")), silColor: silBg(d), L, hiCol: css(h("#b8c4cf")), hi: hw * 0.3, hiA: 0.55, shCol: css(h("#1d1a2a")), sh: hw * 0.5, shA: 0.85, blur: 1 });
      const roofP = (g) => { g.beginPath(); if (dome) { g.moveTo(x - hw / 2 - 2, y - H + 1); g.quadraticCurveTo(x - hw / 2, y - H - roof * 1.6, x, y - H - roof * 1.4); g.quadraticCurveTo(x + hw / 2, y - H - roof * 1.6, x + hw / 2 + 2, y - H + 1); } else { g.moveTo(x - hw / 2 - 3, y - H + 2); g.lineTo(x - hw * 0.05, y - H - roof); g.lineTo(x + hw * 0.05, y - H - roof); g.lineTo(x + hw / 2 + 3, y - H + 2); } g.closePath(); };
      shade(ctx, roofP, { box: [x - hw, y - H - roof * 1.8, hw * 2, roof * 2 + 6], base: css(h(dome ? "#2f5e66" : "#6b3640")), silColor: silBg(d), L, hiCol: css(h(dome ? "#8fc4c0" : "#c27a6e")), hi: hw * 0.25, hiA: 0.8, shCol: css(h("#1a1222")), sh: hw * 0.35, shA: 0.7, blur: 1 });
      if (P.mode.sil) continue;
      const lit = lamp * (r() < 0.75 ? 1 : 0.15), ws = Math.max(2, hw * 0.2);
      const wins = tall ? [[-0.12, 0.3], [-0.12, 0.65]] : r() < 0.5 ? [[-0.15, 0.5]] : [[-0.2, 0.5], [0.15, 0.5]];
      for (const [ox, oy] of wins) {
        const wx = x + ox * hw, wy = y - H * oy;
        ctx.fillStyle = lit > 0.3 ? css(mix(C.amberDeep, C.amberHot, 0.55 * lit)) : css(h("#162030"));
        ctx.fillRect(wx - ws / 2, wy - ws * 0.65, ws, ws * 1.3);
        if (lit > 0.3) glow(ctx, wx, wy, hw * 1.3 * (1 - d * 0.3), C.amber, 0.32 * lit * (1 - d * 0.5));
      }
    }
  }

  // ---- 嵐(紫黒の乱気流。渦の腕を重ね、縁はちぎれた雲) ----
  function stormMass(ctx, { seed = 3, cx, cy, rx, ry, swirl = 2.4, arms = 5, L = [0.4, -0.9], inner = 0.6 } = {}) {
    const r = mulberry32(seed);
    const blob = (g, x, y, rr, s) => { g.moveTo(x + rr, y); for (let a = 0; a <= 64; a++) { const t = a / 64 * Math.PI * 2, k = 1 + 0.35 * (fbm(Math.cos(t) * 1.6 + s, Math.sin(t) * 1.6, seed + s, 3) - 0.5) * 2; g.lineTo(x + Math.cos(t) * rr * k, y + Math.sin(t) * rr * k); } };
    const puffs = [];
    for (let a = 0; a < arms; a++) for (let k = 0; k < 12; k++) { const q = k / 11, ang = a / arms * Math.PI * 2 + q * swirl, rad = 0.1 + q * 0.85; puffs.push([cx + Math.cos(ang) * rx * rad, cy + Math.sin(ang) * ry * rad, Math.min(rx, ry) * (0.5 - q * 0.3) * (0.85 + r() * 0.3), a * 13 + k]); }
    const path = (g) => { g.beginPath(); for (const [x, y, rr, s] of puffs) blob(g, x, y, rr, s); };
    if (!P.mode.sil) P.layer(ctx, (g) => { path(g); g.fillStyle = "rgba(30,20,52,0.85)"; g.fill(); }, { blur: 28 });
    shade(ctx, path, { box: [cx - rx * 1.6, cy - ry * 1.6, rx * 3.2, ry * 3.2], silColor: "#262626", L,
      base: (g) => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry) * 1.2); gr.addColorStop(0, "#4a3478"); gr.addColorStop(0.35, "#2a1d48"); gr.addColorStop(1, C.storm); return gr; },
      hiCol: "#8d7cc2", hi: 10, hiA: 0.6, shCol: "#08050f", sh: Math.min(rx, ry) * 0.25, shA: 0.75, blur: 6, tex: 0.3, texSeed: seed, texScale: 0.02,
      extra: (g) => { if (inner > 0) { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(rx, ry) * 0.7); gr.addColorStop(0, css("#bfe9ff", 0.55 * inner)); gr.addColorStop(0.4, css("#6a8de0", 0.25 * inner)); gr.addColorStop(1, css("#6a8de0", 0)); g.save(); g.globalCompositeOperation = "source-atop"; g.fillStyle = gr; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2); g.restore(); } },
    });
    return puffs;
  }

  // 稲妻(中点変位の折れ線+枝)。core は常に描く。光は fx のみ
  function bolt(ctx, x0, y0, x1, y1, { seed = 9, rough = 0.22, width = 5, branches = 4, a = 1 } = {}) {
    const r = mulberry32(seed);
    const mk = (ax, ay, bx, by, depth, disp) => { if (depth === 0) return [[ax, ay], [bx, by]]; const mx = (ax + bx) / 2 + (r() - 0.5) * disp, my = (ay + by) / 2 + (r() - 0.5) * disp; const A = mk(ax, ay, mx, my, depth - 1, disp / 2), B = mk(mx, my, bx, by, depth - 1, disp / 2); return A.concat(B.slice(1)); };
    const len = Math.hypot(x1 - x0, y1 - y0), main = mk(x0, y0, x1, y1, 6, len * rough), strokes = [[main, width]];
    for (let b = 0; b < branches; b++) { const i = 8 + Math.floor(r() * (main.length - 20)), p = main[i], ang = Math.atan2(y1 - y0, x1 - x0) + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6), bl = len * (0.12 + r() * 0.2); strokes.push([mk(p[0], p[1], p[0] + Math.cos(ang) * bl, p[1] + Math.sin(ang) * bl, 4, bl * 0.35), width * 0.45]); }
    const draw = (g, k, col) => { g.lineJoin = "round"; g.lineCap = "round"; for (const [pts, wd] of strokes) { g.strokeStyle = col; g.lineWidth = wd * k; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke(); } };
    ctx.save(); ctx.globalAlpha = a;
    if (P.mode.sil) { draw(ctx, 1.4, "#111"); ctx.restore(); return main; }
    P.bloom(ctx, (g) => draw(g, 5, C.boltGlow), { blur: 26, a: 0.9 });
    P.bloom(ctx, (g) => draw(g, 2, "#bfeeff"), { blur: 6, a: 0.9 });
    draw(ctx, 1, C.bolt);
    ctx.restore();
    return main;
  }

  // ---- 光の気流(琥珀のレール)。pts は画面の点列。flowT で粒が流れる ----
  function stream(ctx, pts, { width = 34, t = 0, seed = 4, taper = [0.2, 1], a = 1, sparks = 140, dir = 1 } = {}) {
    const samp = P.sampleSpline(pts, 30), L = samp[samp.length - 1][2];
    const wf = (u) => width * (lerp(taper[0], taper[1], Math.min(1, u * 1.4))) * (0.85 + 0.15 * Math.sin(u * 40 + t * 9));
    ctx.save(); ctx.globalAlpha = a;
    if (P.mode.sil) { P.ribbonPath(ctx, samp, (u) => wf(u) * 0.5); ctx.fillStyle = "#555"; ctx.fill(); ctx.restore(); return samp; }
    P.bloom(ctx, (g) => { P.ribbonPath(g, samp, (u) => wf(u) * 2.6); g.fillStyle = css(C.amberDeep, 0.9); g.fill(); }, { blur: 34, a: 0.75 });
    // 帯の本体: 外側(半透明の琥珀)→ 芯(白に近い)
    P.ribbonPath(ctx, samp, wf); const gr = ctx.createLinearGradient(samp[0][0], samp[0][1], samp[samp.length - 1][0], samp[samp.length - 1][1]); gr.addColorStop(0, css(C.amberDeep, 0.15)); gr.addColorStop(0.5, css(C.amber, 0.55)); gr.addColorStop(1, css(C.amber, 0.8)); ctx.fillStyle = gr; ctx.fill();
    P.ribbonPath(ctx, samp, (u) => wf(u) * 0.28); ctx.fillStyle = css(C.amberHot, 0.95); ctx.fill();
    // 流れの筋(破線が流れる。速さを見せる)
    if (P.mode.fx) {
      const r = mulberry32(seed); ctx.lineCap = "round";
      for (let k = 0; k < sparks; k++) {
        const off = (r() - 0.5) * 1.6, sp = 0.6 + r() * 0.9, len = 30 + r() * 120, s0 = ((r() * L + dir * t * 900 * sp) % L + L) % L;
        let i = 0; while (i < samp.length - 1 && samp[i][2] < s0) i++;
        let j = i; while (j < samp.length - 1 && samp[j][2] < s0 + len) j++;
        const u = s0 / L, wv = wf(u) * off;
        const nrm = (q) => { const a2 = samp[Math.max(0, q - 1)], b2 = samp[Math.min(samp.length - 1, q + 1)], tn = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1; return [-(b2[1] - a2[1]) / tn, (b2[0] - a2[0]) / tn]; };
        ctx.strokeStyle = css(r() < 0.3 ? "#ffffff" : C.amberHot, 0.35 + r() * 0.5); ctx.lineWidth = 1 + r() * 2.5; ctx.beginPath();
        for (let q = i; q <= j; q++) { const n = nrm(q), x = samp[q][0] + n[0] * wv, y = samp[q][1] + n[1] * wv; q === i ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    ctx.restore();
    return samp;
  }

  // ---- 粒(前景の光の粒・塵。ボケ) ----
  function motes(ctx, { n = 40, seed = 12, w = 1920, h = 1080, t = 0, vx = -600, col = C.amberHot, size = [2, 9], a = 0.5, streak = 0 } = {}) {
    if (!P.mode.fx || P.mode.sil) return;
    const r = mulberry32(seed); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const z = r(), x = ((r() * (w + 400) + vx * t * (0.4 + z)) % (w + 400) + w + 400) % (w + 400) - 200, y = r() * h, s = lerp(size[0], size[1], z), al = a * (0.3 + 0.7 * r());
      if (streak > 0) { ctx.strokeStyle = css(col, al * 0.6); ctx.lineWidth = s * 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + streak * (0.4 + z), y); ctx.stroke(); }
      const g = ctx.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, css(col, al)); g.addColorStop(1, css(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  // 速さの線(画面の流れ。焦点 fx,fy に向かう放射、または水平)
  function speedLines(ctx, { n = 60, seed = 21, cx = 960, cy = 540, r0 = 380, r1 = 1300, col = "#dff3ff", a = 0.22, angle = null, spread = 0.6 } = {}) {
    if (!P.mode.fx || P.mode.sil) return;
    const r = mulberry32(seed); ctx.save(); ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const ang = angle == null ? r() * Math.PI * 2 : angle + (r() - 0.5) * spread, a0 = r0 + r() * 200, a1 = a0 + 150 + r() * (r1 - a0);
      ctx.strokeStyle = css(col, a * (0.3 + 0.7 * r())); ctx.lineWidth = 1 + r() * 3;
      if (angle == null) { ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * a0, cy + Math.sin(ang) * a0); ctx.lineTo(cx + Math.cos(ang) * a1, cy + Math.sin(ang) * a1); ctx.stroke(); }
      else { const y = r() * 1080, x = r() * 1920, l = 120 + r() * 400; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); ctx.stroke(); }
    }
    ctx.restore();
  }

  return { C, haze, sky, stars, moon, cloudBank, island, islandShape, stormMass, bolt, stream, motes, speedLines, silBg };
})();
