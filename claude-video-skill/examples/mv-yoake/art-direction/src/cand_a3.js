// 案A+C(木版画+字の中の日)の 53 秒ボード用の新しい静止画(v3)。cand_a2.js(8/16/40秒)と cand_a.js は変えない。
// 規則は cand_a2.js と同じ: 黒=彫り残した版木、紙=刀で彫った所。色版は彫った所にだけ刷る。色版は灯る物・燃える物・字の部品(日・火・読点)だけ。
// v3 で足した規則(53 秒の流れのため):
//   ①版の数が時間で増える: 序盤 墨+琥珀(2版)→ 28秒 琥珀が広がる → 49秒 墨+琥珀+薔薇+淡黄(4版)。
//   ②空のやわらかさは「ぼかし摺り」(浮世絵の空の技法: 版木に含ませた色の濃さを拭いて段階にする)で出す。後処理のグローではない。
//     ぼかしの濃さは版の画素の不透明度(0..1)で持ち、look では横の木目でむらをつける。
//   ③49秒では墨の色を夜の青黒から茄子紺に替える(インクの色で朝の色温度を作る)。
// 描画は引数(t と mode)だけで決まる。乱数は固定シード、作業 canvas は毎回 reset(common.js の buf)。
// 引数: t = 2 | 12 | 25 | 28 | 32 | 36 | 40 | 49、look、mode(40秒: "a" 字と読点と線だけ / "b" 町の手前に明るい面)
const CAND_A3 = (() => {
  const { W, H, clamp, lerp, smooth, rng, hash, fbm, vnoise, buf, mix, hex, vertical, horizontal, bbox, pathOf, dpClosed: dp, resample, stroke, perPixel, noiseField, G } = AD;
  const INK = "#14171f", INK_DAWN = "#2b2033", PAPER = "#ece3cd", AMBER = "#e2742a", ROSE = "#d66f8c", HONEY = "#f0c27c";
  const BX0 = 56, BY0 = 46, BX1 = 1864, BY1 = 1034;

  // ===== 共通の部品(cand_a2.js と同じ式) =====
  function blockPath(g) {
    const pts = [], step = 8, n = (a, s) => (fbm(a * 0.02, s, 41, 3) - 0.5) * 7 + (hash(a | 0, s, 7) < 0.03 ? -4 : 0);
    for (let x = BX0; x <= BX1; x += step) pts.push([x, BY0 + n(x, 1)]);
    for (let y = BY0; y <= BY1; y += step) pts.push([BX1 + n(y, 2), y]);
    for (let x = BX1; x >= BX0; x -= step) pts.push([x, BY1 + n(x, 3)]);
    for (let y = BY1; y >= BY0; y -= step) pts.push([BX0 + n(y, 4), y]);
    g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath();
  }
  function cut(g, spine, w, seed, { entry = 0.08, exit = 0.4, jit = 0.6 } = {}) {
    const sp = resample(spine, 3);
    g.beginPath();
    stroke(g, sp, (u, i) => {
      const a = u < entry ? 0.55 + 0.45 * (u / entry) : 1, b = u > 1 - exit ? Math.pow((1 - u) / exit, 0.75) : 1;
      return w * a * b * (0.86 + 0.28 * vnoise(i * 0.15, seed * 0.37, 5));
    }, { jit, seed });
    g.fill();
  }
  // 太さが始点 w0 → 終点 w1 に変わる刀(手前が太く、奥が細い)
  function cutW(g, spine, w0, w1, seed, jit = 0.7) { const sp = resample(spine, 3); g.beginPath(); stroke(g, sp, (u, i) => lerp(w0, w1, u) * (0.9 + 0.2 * vnoise(i * 0.15, seed * 0.37, 5)), { jit, seed }); g.fill(); }
  const poly = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  const facet = (cs, eps, s) => cs.map((ct, k) => dp(ct, eps).map(([x, y], i) => [x + (hash(i, k, s) - 0.5) * 1.4, y + (hash(i, k + 50, s) - 0.5) * 1.4]));
  const J = (pts, s, gy = 1e9) => pts.map(([x, y], i) => [x + (hash(i, 1, s) - 0.5) * 3, y + (y < gy ? (hash(i, 2, s) - 0.5) * 3 : 0)]);
  const via = (g, x, y, r0) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r0, 0, 7); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(x, y, r0 * 0.38, 0, 7); g.fill(); g.fillStyle = "#fff"; };
  function carve(g, letters, seed, col = "#fff") { g.fillStyle = col; letters.forEach((L, i) => { g.beginPath(); pathOf(g, facet(L.cs, Math.min(3.3, L.size * 0.019), seed + i)); g.fill("nonzero"); }); }
  function keepOut(g, letters, lw = 34, col = "#000") { g.fillStyle = col; g.strokeStyle = col; g.lineJoin = "round"; g.lineWidth = lw; for (const L of letters) { g.beginPath(); pathOf(g, L.cs); g.stroke(); g.fill("nonzero"); } }
  function letterPlate(pg, L, { rect, contour }) {
    pg.save(); pg.beginPath();
    if (rect) { const [a, b, c, d] = rect; pg.rect(L.x0 + a * L.size, L.base + b * L.size, (c - a) * L.size, (d - b) * L.size); pg.clip(); pg.beginPath(); pathOf(pg, L.cs); pg.fill("nonzero"); }
    else { pathOf(pg, [L.cs[contour]]); pg.fill("nonzero"); }
    pg.restore();
  }
  function handWindow(g, x, y, w, h, cols, rows, seed) {
    const bar = Math.max(3, w * 0.11), pw = (w - bar * (cols - 1)) / cols, ph = (h - bar * (rows - 1)) / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, q = (a) => (hash(k, a, seed) - 0.5) * 1.6, x0 = x + i * (pw + bar), y0 = y + j * (ph + bar);
      g.beginPath(); poly(g, [[x0 + q(1), y0 + q(2)], [x0 + pw + q(3), y0 + q(4)], [x0 + pw + q(5), y0 + ph + q(6)], [x0 + q(7), y0 + ph + q(8)]]); g.fill();
    }
  }
  // 上向きの辺だけに刀(光を受ける屋根の縁)。tone(x) で太さ
  function rims(g, P, seed, wFn, up = true) {
    g.fillStyle = "#fff";
    for (let k = 0; k < P.length - 1; k++) { const [a, b] = [P[k], P[k + 1]]; if (up ? b[0] - a[0] > Math.abs(b[1] - a[1]) * 0.25 : true) cut(g, [[a[0], a[1] - 1], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 1], [b[0], b[1] - 1]], wFn((a[0] + b[0]) / 2), seed + k, { entry: 0.12, exit: 0.3, jit: 0.5 }); }
  }
  const centered = (font, str, cx, base, size, track = 0) => { let w = 0; for (const ch of str) w += G(font, ch).adv * size + track; return horizontal(font, str, cx - (w - track) / 2, base, size, track); };

  // ===== 刷り(cand_a2.js の print を複数の版に広げた物。plates = [{ c, color, shift }]。版の不透明度=ぼかし摺りの濃さ) =====
  function print(ctx, mask, plates, look, { ink = INK, paper = PAPER, thinKeep = false } = {}) {
    const inkc = hex(ink), pap = hex(paper);
    const P = plates.map((p) => ({ d: p.c.getContext("2d").getImageData(0, 0, W, H).data, col: hex(p.color), sh: look ? (p.shift || [-3, 2]) : [0, 0], bok: !!p.bokashi, n: 0 }));
    const [o, og] = buf("out"); og.drawImage(mask, 0, 0);
    const md = mask.getContext("2d").getImageData(0, 0, W, H).data;
    const [bk, bkg] = buf("blockOnly"); bkg.beginPath(); blockPath(bkg); bkg.fillStyle = "#fff"; bkg.fill(); const kd = bkg.getImageData(0, 0, W, H).data; // 色版は版木の中だけ(紙の余白に刷らない)
    let bd = md;
    if (look) { const [b, bg] = buf("blur"); bg.filter = "blur(0.9px)"; bg.drawImage(mask, 0, 0); bd = bg.getImageData(0, 0, W, H).data; }
    let wd = null; if (look && thinKeep) { const [b2, bg2] = buf("blurWide"); bg2.filter = "blur(3px)"; bg2.drawImage(mask, 0, 0); wd = bg2.getImageData(0, 0, W, H).data; }
    const grain = noiseField(W, H, 6, (x, y) => fbm(x * 0.0022, y * 0.09, 61, 3));
    const blot = noiseField(W, H, 8, (x, y) => fbm(x * 0.006, y * 0.006, 62, 4));
    const fiber = noiseField(W, H, 3, (x, y) => fbm(x * 0.05, y * 0.05, 63, 3));
    const edge = noiseField(W, H, 3, (x, y) => vnoise(x * 0.35, y * 0.35, 64));
    let inBlock = 0, carved = 0, plated = 0, sr = 0, sg = 0, sb = 0;
    perPixel(o, (x, y) => {
      const i = (y * W + x) * 4; let v = bd[i] / 255;
      if (x > BX0 + 8 && x < BX1 - 8 && y > BY0 + 8 && y < BY1 - 8) { inBlock++; if (md[i] > 127) carved++; }
      if (look) { const th = wd ? (v > 0.05 ? 1 - smooth((wd[i] / 255 - 0.12) / 0.35) : 0) : 0, t = 0.5 - 0.14 * th + (edge(x, y) - 0.5) * 0.42 * (1 - 0.8 * th); v = smooth((v - (t - 0.1)) / 0.2); } else v = v > 0.5 ? 1 : 0;
      let ic = inkc, pp = pap;
      if (look) {
        const thin = clamp((grain(x, y) - 0.45) * 2.2) * 0.13 + (blot(x, y) - 0.5) * 0.12, speck = hash((x / 2) | 0, (y / 2) | 0, 71) < 0.0007 ? 0.45 : 0;
        ic = mix(inkc, pap, clamp(thin + speck, 0, 0.6) * 0.5 + 0.02);
        const f = (fiber(x, y) - 0.5) * 0.09; pp = [pap[0] * (1 + f), pap[1] * (1 + f), pap[2] * (1 + f * 1.2)];
      }
      let c = mix(ic, pp, v), any = false;
      for (const p of P) {
        if (kd[i + 3] < 128) break;
        const px = x + p.sh[0], py = y + p.sh[1]; if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const pv = p.d[(py * W + px) * 4 + 3] / 255; if (pv <= 0) continue;
        // look: 版のむら(斑)+ぼかし摺りは横の木目でむら
        const k = pv * v * (look ? (p.bok ? 0.86 + 0.5 * (grain(x, y) - 0.5) + 0.2 * (blot(x, y) - 0.5) : 0.82 + 0.3 * (blot((x * 1.7) % W, (y * 1.7) % H) - 0.5)) : 1);
        if (k > 0.5) { any = true; p.n++; }
        c = [lerp(c[0], (c[0] * p.col[0]) / 255, k), lerp(c[1], (c[1] * p.col[1]) / 255, k), lerp(c[2], (c[2] * p.col[2]) / 255, k)];
      }
      if (any) plated++;
      sr += c[0]; sg += c[1]; sb += c[2];
      return c;
    });
    ctx.drawImage(o, 0, 0);
    const N = W * H;
    return { carved_in_block: +(carved / inBlock).toFixed(4), plate_of_frame: +(plated / N).toFixed(4), plates: P.length + 1, plate_each: P.map((p, i) => [plates[i].color, +(p.n / N).toFixed(4)]), mean_rgb: [sr / N, sg / N, sb / N].map((v) => Math.round(v)), ink, paper };
  }
  const plateBuf = (name) => { const [c, g] = buf(name); g.fillStyle = "#000"; return [c, g]; };
  function begin() { const [m, g] = buf("maskA3"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.save(); g.beginPath(); blockPath(g); g.fillStyle = "#000"; g.fill(); g.clip(); return [m, g]; }

  // 8秒の町(cand_a2.js の CITY と同じ点列。EMB=712 が地平)。s 倍して (ox, hz) に置く
  const EMB8 = 712;
  const CITY8 = [
    [[46, EMB8], [46, 318], [70, 318], [70, 302], [86, 302], [86, 270], [92, 262], [114, 262], [120, 270], [120, 302], [134, 302], [134, 318], [152, 318], [152, EMB8]],
    [[150, EMB8], [150, 566], [208, 524], [266, 566], [266, EMB8]],
    [[262, EMB8], [262, 474], [296, 474], [296, 444], [338, 444], [338, 430], [356, 430], [356, 444], [394, 444], [394, 474], [420, 474], [420, EMB8]],
    [[418, EMB8], [418, 636], [434, 636], [442, 232], [462, 232], [470, 600], [480, 600], [480, EMB8]],
    [[476, EMB8], [476, 500], [552, 500], [552, 478], [600, 478], [600, 500], [644, 500], [644, EMB8]],
    [[712, EMB8], [712, 612], [754, 584], [796, 612], [796, 602], [830, 578], [864, 602], [864, EMB8]],
    [[860, EMB8], [860, 526], [884, 526], [884, 514], [952, 514], [952, 526], [980, 526], [980, EMB8]],
    [[976, EMB8], [976, 650], [1064, 676], [1064, EMB8]],
  ];
  const TANK8 = [[650, 474], [681, 450], [712, 474], [708, 528], [654, 528]];
  const place = (P, s, ox, hz, sx = s) => P.map(([x, y]) => [ox + (x - 46) * sx, hz - (EMB8 - y) * s]);

  // =====================================================================
  // 2秒(60コマ)間奏「信号」: 最も黒い版。低い視点。地面の畝の刀と、手前から遠い町へ走る1本の太い刀(信号)。色版なし(琥珀はまだ使わない)
  // 8秒との違い: 町は遠く小さい(0.55倍)、地平は画面の中ほど、主役は字でなく手前の1本の刀。空は彫らない
  // =====================================================================
  function S2(ctx, { look }) {
    const [m, g] = begin(), HZ = 560, s = 0.72, ox = 640;
    // 地面の畝(手前ほど間隔が広く太い。水平の線だけ=奥へ収束させない)
    const r = rng(2001); g.fillStyle = "#fff";
    for (let y = HZ + 10, k = 0; y < BY1; y += 7 + (y - HZ) * 0.07, k++) {
      const d = (y - HZ) / (BY1 - HZ); let x = BX0 - 20 + r() * 50;
      while (x < BX1) { const len = lerp(40, 260, r()) * lerp(0.5, 1.4, d), near = Math.pow(clamp(1 - Math.abs(x + len / 2 - 1180) / 900), 2), tone = 0.16 + 0.32 * d + 0.25 * near * (1 - d); if (r() < 0.12 + tone) cut(g, [[x, y], [x + len * 0.5, y + (r() - 0.5) * 2], [x + len, y + (r() - 0.5) * 2]], lerp(0.9, 4.2, tone) * (0.7 + 0.6 * r()), (x * 3 + y * 7) | 0, { entry: 0.12, exit: 0.5, jit: 0.5 }); x += len + lerp(90, 20, tone) * (0.5 + r()); }
    }
    // 地平のすぐ上だけ、ごく弱い弧の欠片(49秒の太陽の位置 x=960 の下から。8秒の弧の最初の数本)
    for (let k = 0; k < 7; k++) { const rad = 70 + k * 46, a0 = Math.PI + 0.25 + r() * 0.4, a1 = 2 * Math.PI - 0.25 - r() * 0.4, pts = []; for (let a = a0; a < a1; a += 0.03) { const p = [960 + Math.cos(a) * rad * 1.8, HZ + 20 + Math.sin(a) * rad * 0.62]; if (p[1] < HZ - 3) pts.push(p); } let i = 0; while (i < pts.length - 6) { const n = 6 + ((r() * 14) | 0), seg = pts.slice(i, i + n); if (r() < 0.5 - k * 0.05 && seg.length > 3) cut(g, seg, lerp(2.6, 1.1, k / 6), 2100 + k * 31 + i, { entry: 0.15, exit: 0.55, jit: 0.4 }); i += n + 3 + ((r() * 10) | 0); } }
    // 夜の空: ごく細い横の刀をまばらに(町を黒い塊として立たせる暗い中間の調子。40秒と同じ考え)
    for (let y = BY0 + 30; y < HZ - 8; y += 9 + r() * 6) { let x = BX0 - 20 + r() * 80; while (x < BX1) { const len = lerp(60, 300, r()), t = Math.pow(clamp(1 - (HZ - y) / 480), 1.8); if (r() < 0.1 + 0.45 * t) cut(g, [[x, y], [x + len, y + (r() - 0.5) * 1.5]], (1.5 + 0.5 * r()) * (1 + 0.8 * t), (x * 7 + y * 3) | 0, { entry: 0.15, exit: 0.6, jit: 0.25 }); x += len + 30 + r() * 120; } }
    // 遠い町(8秒と同じ点列を 0.72 倍)
    const shapes = CITY8.map((P) => J(place(P, s, ox, HZ), 7, HZ - 1)), tank = place(TANK8, s, ox, HZ);
    g.strokeStyle = "#fff"; g.lineJoin = "miter"; g.lineWidth = 4.5; for (const P of shapes.concat([tank])) { g.beginPath(); poly(g, P); g.stroke(); } // 8秒の city() と同じ「白い刀の縁+黒の塗り」
    g.fillStyle = "#000"; for (const P of shapes) { g.beginPath(); poly(g, P); g.fill(); } g.beginPath(); poly(g, tank); g.fill();
    g.strokeStyle = "#000"; g.lineWidth = 4; const leg = (a, b) => { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); };
    for (const [a, b] of [[[660, 528], [654, EMB8]], [[702, 528], [708, EMB8]]]) leg(...place([a, b], s, ox, HZ));
    g.fillRect(BX0 - 10, HZ - 1, BX1 - BX0 + 20, 8);
    shapes.forEach((P, i) => rims(g, P, 2200 + i * 40, (x) => 2.4 + 2.2 * clamp(1 - Math.abs(x - 1150) / 520)));
    rims(g, tank, 2600, () => 2.4);
    cut(g, [[BX0, HZ + 1], [BX1, HZ + 1]], 1.4, 2601, { entry: 0.01, exit: 0.02, jit: 0.7 });
    // 1つだけの窓(8秒で灯る窓。まだ灯さない=紙のまま)
    const [wx, wy] = place([[886, 556]], s, ox, HZ)[0]; g.fillStyle = "#000"; g.fillRect(wx - 3, wy - 3, 64 * s + 6, 78 * s + 6); g.fillStyle = "#fff"; handWindow(g, wx, wy, 64 * s, 78 * s, 2, 2, 31);
    // 信号: 手前の左下から、45度で段を上がって、町の窓の下へ。手前ほど太い
    const tx = wx + 64 * s / 2, line = [[BX0 - 20, 968], [520, 968], [600, 888], [930, 888], [990, 828], [1150, 828], [1150, HZ + 40], [tx, HZ + 40], [tx, HZ + 8]];
    g.fillStyle = "#000"; g.fillRect(tx - 9, HZ - 1, 18, 50); g.fillStyle = "#fff";
    cutW(g, line, 17, 4.2, 2701, 1.0);
    via(g, 520, 968, 17); via(g, 930, 888, 12); via(g, 1150, 828, 9);
    g.restore();
    const [p] = plateBuf("plateA3a");
    return print(ctx, m, [{ c: p, color: AMBER }], look);
  }

  // =====================================================================
  // 12.3秒(370コマ)「輝きは増す」: クレーンアップ=川を高い所から。向こう岸の町の灯り8つと、その水面の映り8本で「数」が倍になる
  // 8秒との違い: 画面の 3/4 が水面(8秒は 1/3)、町は上端の細い帯、字は横組みで水面の左下。琥珀は窓+映り(8秒は窓1+字の日)
  // =====================================================================
  function S12(ctx, { look }) {
    const [m, g] = begin(), BANK = 300, r = rng(1201);
    // 向こう岸の町: 屋根の型を順に(切妻・片流れ・のこぎり・平屋根+塔屋・煙突・給水塔)。高さは 40〜120px
    const shapes = []; let x = BX0 - 10, k = 0;
    while (x < BX1 + 10) {
      const w = 50 + r() * 90, h = 40 + r() * 70, t = (k * 7 + ((r() * 3) | 0)) % 6, b = BANK;
      let P;
      if (t === 0) P = [[x, b], [x, b - h], [x + w / 2, b - h - 26], [x + w, b - h], [x + w, b]];
      else if (t === 1) P = [[x, b], [x, b - h - 18], [x + w, b - h], [x + w, b]];
      else if (t === 2) { P = [[x, b], [x, b - h]]; const n = 3; for (let i = 0; i < n; i++) { P.push([x + (w * (i + 0.85)) / n, b - h - 20]); P.push([x + (w * (i + 0.85)) / n, b - h]); } P.push([x + w, b - h], [x + w, b]); }
      else if (t === 3) P = [[x, b], [x, b - h], [x + w * 0.6, b - h], [x + w * 0.6, b - h - 22], [x + w * 0.85, b - h - 22], [x + w * 0.85, b - h], [x + w, b - h], [x + w, b]];
      else if (t === 4) P = [[x, b], [x, b - h], [x + w * 0.7, b - h], [x + w * 0.7, b - h - 90], [x + w * 0.7 + 12, b - h - 90], [x + w * 0.7 + 12, b - h], [x + w, b - h], [x + w, b]];
      else P = [[x, b], [x, b - h * 0.6], [x + w, b - h * 0.6 - 10], [x + w, b]];
      shapes.push(J(P, 1300 + k, b - 1)); x += w - 2; k++;
    }
    // 空: 細い横の筋(暗い中間の調子)
    g.fillStyle = "#fff";
    for (let y = BY0 + 20; y < BANK - 30; y += 7 + r() * 5) { let xx = BX0 - 20 + r() * 60; while (xx < BX1) { const len = lerp(60, 280, r()), t = Math.pow(clamp((y - BY0) / (BANK - BY0)), 1.5); if (r() < 0.2 + 0.6 * t) cut(g, [[xx, y], [xx + len, y + (r() - 0.5) * 2]], lerp(1.2, 3.6, t), (xx + y * 13) | 0, { entry: 0.12, exit: 0.6, jit: 0.4 }); xx += len + 30 + r() * 100; } }
    g.fillStyle = "#000"; for (const P of shapes) { g.beginPath(); poly(g, P); g.fill(); } g.fillRect(BX0 - 10, BANK - 2, BX1 - BX0 + 20, 12);
    shapes.forEach((P, i) => rims(g, P, 1400 + i * 20, () => 2.2));
    // 灯った窓 8 つ(位置は不揃い。大きさも違う)
    const LIT = [[160, 0.9], [395, 1.1], [560, 0.8], [780, 1.2], [1010, 0.9], [1220, 1.0], [1480, 1.15], [1700, 0.85]].map(([lx, sz], i) => ({ x: lx + (hash(i, 1, 12) - 0.5) * 40, y: BANK - 34 - hash(i, 2, 12) * 26, w: 20 * sz, h: 26 * sz }));
    // 水面: 横の映りの刀。灯りの真下ほど明るく(太く長く)、手前ほど映りが広い
    const col = (xx, y) => { let t = 0; for (const L of LIT) { const half = 12 + (y - BANK) * 0.075, d = Math.abs(xx - (L.x + L.w / 2)) / half; t = Math.max(t, Math.pow(clamp(1 - d), 1.3)); } return t; };
    for (let y = BANK + 14; y < BY1 - 3; y += 5 + (y - BANK) * 0.012) {
      let xx = BX0 - 20 + r() * 40;
      while (xx < BX1) {
        const c = col(xx + 20, y), tone = Math.max(0.12 + 0.1 * vnoise(xx * 0.004, y * 0.01, 1203), c), len = lerp(26, 120, r()) * lerp(0.6, 1.3, tone), w = lerp(1.1, 7.5, tone) * (0.7 + 0.6 * r());
        if (r() < 0.22 + tone) { const wob = (vnoise(xx * 0.01, y * 0.05, 3) - 0.5) * 3; cut(g, [[xx, y + wob], [xx + len * 0.5, y + wob + (r() - 0.5) * 1.5], [xx + len, y + wob]], w, (xx * 3 + y * 7) | 0, { entry: 0.12, exit: 0.5 }); }
        xx += len + lerp(44, 6, tone) * (0.5 + r());
      }
    }
    const L = horizontal("SMB", "輝きは増す", 170, 930, 150, 10);
    keepOut(g, L, 40);
    for (const W0 of LIT) { g.fillStyle = "#000"; g.fillRect(W0.x - 3, W0.y - 3, W0.w + 6, W0.h + 6); g.fillStyle = "#fff"; handWindow(g, W0.x, W0.y, W0.w, W0.h, W0.w > 21 ? 2 : 1, 2, 77); }
    carve(g, L, 1250);
    g.restore();
    const [p, pg] = plateBuf("plateA3a");
    for (const W0 of LIT) { pg.fillRect(W0.x - 2, W0.y - 2, W0.w + 4, W0.h + 4); const cx = W0.x + W0.w / 2; pg.beginPath(); pg.moveTo(cx - 10, BANK + 12); pg.lineTo(cx + 10, BANK + 12); pg.lineTo(cx + 10 + (BY1 - BANK) * 0.06, BY1); pg.lineTo(cx - 10 - (BY1 - BANK) * 0.06, BY1); pg.closePath(); pg.fill(); }
    // 字の上には刷らない(字は紙のまま)
    pg.globalCompositeOperation = "destination-out"; keepOut(pg, L, 24); pg.globalCompositeOperation = "source-over";
    return print(ctx, m, [{ c: p, color: AMBER }], look);
  }

  // =====================================================================
  // 24.7秒(740コマ)「夜明けの」溜め: 黒い版木に、次のカットで彫る「火」の当たり(下書きの細い刀)だけ。左右から2本の線が当たりの縁で止まる
  // 色版なし。彫った割合は最小(山の前の落ち込み)
  // =====================================================================
  function S25(ctx, { look }) {
    const [m, g] = begin(), SZ = 780, r = rng(2501);
    const F = centered("SMB", "火", 960, 120 + 0.88 * SZ, SZ)[0];
    // 当たりの刀: 輪郭を 40〜110px の区間に分け、間をあけて細く彫る
    g.fillStyle = "#fff";
    F.cs.forEach((ct, ci) => { const pts = resample(ct.concat([ct[0]]), 4); let i = 0; while (i < pts.length - 4) { const n = 10 + ((r() * 18) | 0), seg = pts.slice(i, i + n); if (seg.length > 3) cut(g, seg, 2.1 + r() * 0.8, 2510 + ci * 100 + i, { entry: 0.12, exit: 0.3, jit: 0.4 }); i += n + 2 + ((r() * 5) | 0); } });
    const fb = bbox(F.cs);
    // 左右から来る線(前のカットの回路)が、当たりの縁で止まる
    const yL = 640, yR = 470;
    cut(g, [[BX0 - 10, yL], [520, yL], [580, yL - 60], [fb[0] + 70, yL - 60]], 5.0, 2551, { entry: 0.01, exit: 0.03, jit: 0.8 }); via(g, fb[0] + 74, yL - 60, 8);
    cut(g, [[BX1 + 10, yR], [1440, yR], [1380, yR + 60], [fb[2] - 80, yR + 60]], 5.0, 2552, { entry: 0.01, exit: 0.03, jit: 0.8 }); via(g, fb[2] - 84, yR + 60, 8);
    const T = centered("SMB", "夜明けの", 960, 990, 78, 14);
    keepOut(g, T, 26); carve(g, T, 2560);
    g.restore();
    const [p] = plateBuf("plateA3a");
    return print(ctx, m, [{ c: p, color: AMBER }], look);
  }

  // =====================================================================
  // 28秒(840コマ)「夜明けの回路に 火を灯して」中心のカット: 版いっぱいの彫った大きな字「回路に」の中に、彫り残した回路の線。
  // 字の右で「火」が放射の刀の中心になり、火と灯の火へんに琥珀。左と上下から刀の線の束が火へ集まる(初稿の構図=大きな字×回路の融合を保つ)
  // =====================================================================
  function S28(ctx, { look }) {
    const [m, g] = begin(), r = rng(2801);
    const T1 = horizontal("SMB", "夜明けの", 170, 300, 118, 8);
    const T2 = horizontal("SMB", "回路に", 140, 790, 340, -6);
    const C = [1408, 470], FS = 300;
    const F = centered("SMB", "火", C[0], C[1] - FS / 2 + 0.88 * FS - 14, FS);
    const T3 = vertical("SMB", "を灯して", 1742, 470, 124, 1.02);
    // 放射の刀(火から外へ)。中心に近いほど太い、横に長い楕円
    g.fillStyle = "#fff";
    for (let k = 0; k < 120; k++) {
      const a = (k / 120) * Math.PI * 2 + (r() - 0.5) * 0.04, r0 = 185 + r() * 50, r1 = r0 + lerp(160, 760, Math.pow(r(), 0.8)), ex = 1.25, ey = 0.95;
      cut(g, [[C[0] + Math.cos(a) * r0 * ex, C[1] + Math.sin(a) * r0 * ey], [C[0] + Math.cos(a) * r1 * ex, C[1] + Math.sin(a) * r1 * ey]], lerp(5, 13, r()), 2810 + k, { entry: 0.04, exit: 0.85, jit: 0.6 });
    }
    // 刀の線の束(回路): 左から2束、下と上から1束ずつ、火へ
    const bundle = (pts, n, gap, seed, w = 4.2) => { for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * gap, q = pts.map(([x, y], j) => [x + (pts.dir === "v" ? off : 0), y + (pts.dir === "v" ? 0 : off)]); cut(g, q, w, seed + i, { entry: 0.01, exit: 0.06, jit: 0.6 }); } };
    const b1 = [[BX0 - 10, 400], [1020, 400], [1110, 450], [C[0] - 250, 450]]; bundle(b1, 4, 15, 2830);
    const b2 = [[BX0 - 10, 900], [1060, 900], [1180, 780], [1210, 640], [C[0] - 220, 600]]; bundle(b2, 4, 15, 2840);
    const b3 = [[C[0] - 20, BY1 + 10], [C[0] - 20, 860], [C[0] - 60, 820], [C[0] - 60, C[1] + 220]]; b3.dir = "v"; bundle(b3, 4, 15, 2850);
    const b4 = [[C[0] + 10, BY0 - 10], [C[0] + 10, C[1] - 210]]; b4.dir = "v"; bundle(b4, 3, 15, 2860);
    for (const [x, y] of [[1020, 400], [1060, 900], [C[0] - 250, 450], [C[0] - 220, 600]]) via(g, x, y, 9);
    keepOut(g, T1, 30); keepOut(g, T2, 44); keepOut(g, T3, 30); keepOut(g, F, 40);
    carve(g, T1.concat(T2, T3, F), 2870);
    // 「回路に」の中に彫り残す回路(黒い線+黒い輪のビア)。字の中だけ
    g.save(); g.beginPath(); pathOf(g, T2.flatMap((L) => L.cs)); g.clip("nonzero");
    g.strokeStyle = "#000"; g.lineWidth = 6.5; g.lineJoin = "miter"; g.lineCap = "butt";
    const tb = bbox(T2.flatMap((L) => L.cs)), viasIn = [];
    for (let row = 0; row < 3; row++) { // 横の配線(45度で段を変える)
      let x = tb[0] - 10, y = lerp(tb[1] + 60, tb[3] - 60, row / 2) + (r() - 0.5) * 20; g.beginPath(); g.moveTo(x, y);
      while (x < tb[2] + 10) { const run = 60 + r() * 130; x += run; g.lineTo(x, y); viasIn.push([x, y]); if (r() < 0.7) { const dy = (r() < 0.5 ? -1 : 1) * (34 + r() * 40); x += Math.abs(dy); y += dy; g.lineTo(x, y); } }
      g.stroke();
    }
    for (let k = 0; k < 9; k++) { const x = lerp(tb[0] + 40, tb[2] - 40, k / 8) + (r() - 0.5) * 50, y0 = tb[1] + r() * 120; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + 80 + r() * 160); g.lineTo(x + 30, y0 + 110 + r() * 160); g.stroke(); viasIn.push([x, y0]); } // 縦の枝
    for (const [x, y] of viasIn) if (r() < 0.5) { g.fillStyle = "#000"; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
    g.restore();
    g.restore();
    // 色版: 火(字全体)、灯の火へん、火のまわりの放射の刀(ぼかし摺り: 火から離れるほど薄い)
    const [p, pg] = plateBuf("plateA3a");
    letterPlate(pg, F[0], { rect: [-0.1, -1.2, 1.1, 0.4] }); letterPlate(pg, T3[1], { rect: [0.0, -0.95, 0.42, 0.2] });
    const [q, qg] = plateBuf("plateA3b"), gr = qg.createRadialGradient(C[0], C[1], 160, C[0], C[1], 560); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.45, "rgba(0,0,0,0.75)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    qg.fillStyle = gr; qg.save(); qg.translate(C[0], C[1]); qg.scale(1.25, 0.95); qg.translate(-C[0], -C[1]); qg.fillRect(0, 0, W, H); qg.restore();
    qg.globalCompositeOperation = "destination-out"; keepOut(qg, T2.concat(T3), 20); qg.globalCompositeOperation = "source-over";
    return print(ctx, m, [{ c: p, color: AMBER }, { c: q, color: AMBER, bokashi: true }], look);
  }

  // =====================================================================
  // 31.7秒(950コマ)「消えかけた声を/光に変えて」: 上の小さい字は粗彫りの途中(消えかけ)。大きい「光に変えて」の右の縁から、字が刀の線にほどけて右へ伸び、線の先のビアに琥珀
  // =====================================================================
  function S32(ctx, { look }) {
    const [m, g] = begin(), r = rng(3201);
    const T1 = horizontal("SMB", "消えかけた声を", 190, 268, 96, 6);
    const T2 = horizontal("SMB", "光に変えて", 150, 700, 228, 0);
    // 空: 暗い中間の細い横の筋(まばら)
    g.fillStyle = "#fff";
    for (let y = BY0 + 24; y < BY1 - 10; y += 9 + r() * 6) { let x = BX0 - 20 + r() * 80; while (x < BX1) { const len = lerp(50, 260, r()); if (r() < 0.16) cut(g, [[x, y], [x + len, y + (r() - 0.5) * 2]], 1.4 + r() * 0.6, (x * 7 + y * 3) | 0, { entry: 0.15, exit: 0.6, jit: 0.25 }); x += len + 40 + r() * 140; } }
    keepOut(g, T1, 26); keepOut(g, T2, 40);
    // 字がほどける線: 「光に変えて」の各行の最も右の紙の点から、右へ(終点は扇状に広がる)
    const [s, sg] = buf("s32m"); sg.fillStyle = "#fff"; sg.beginPath(); pathOf(sg, T2.flatMap((L) => L.cs)); sg.fill("nonzero");
    const sd = sg.getImageData(0, 0, W, H).data, tb = bbox(T2.flatMap((L) => L.cs)), ends = [];
    const N = 13; g.fillStyle = "#fff";
    for (let i = 0; i < N; i++) {
      const y = Math.round(lerp(tb[1] + 12, tb[3] - 12, i / (N - 1))); let x0 = -1;
      for (let x = Math.round(tb[2]) + 2; x > tb[0]; x--) if (sd[(y * W + x) * 4] > 127) { x0 = x; break; }
      if (x0 < 0) continue;
      const ty = lerp(170, 930, i / (N - 1)) + (r() - 0.5) * 30, xm = lerp(tb[2] + 40, tb[2] + 140, r()), xe = 1660 + r() * 150, dy = ty - y;
      const pts = [[x0 - 6, y], [xm, y], [xm + Math.abs(dy), ty], [xe, ty]];
      cut(g, pts, lerp(7, 4, Math.abs(dy) / 400), 3210 + i, { entry: 0.01, exit: 0.03, jit: 0.7 });
      ends.push([xe, ty]);
    }
    ends.forEach(([x, y], i) => via(g, x, y, i % 4 === 1 ? 11 : 8));
    carve(g, T1.concat(T2), 3250);
    // 消えかけ: 上の字に、粗彫りの帯の間の黒を残す(横の帯、ところどころ)
    g.save(); g.beginPath(); pathOf(g, T1.flatMap((L) => L.cs)); g.clip("nonzero"); g.fillStyle = "#000";
    const b1 = bbox(T1.flatMap((L) => L.cs)); for (let y = b1[1]; y < b1[3]; y += 7) { let x = b1[0]; while (x < b1[2]) { const len = 30 + r() * 120; if (r() < 0.62) g.fillRect(x, y + r(), len, 3.2); x += len + 10 + r() * 40; } }
    g.restore();
    g.restore();
    const [p, pg] = plateBuf("plateA3a");
    ends.forEach(([x, y], i) => { if (i % 4 === 1) { pg.beginPath(); pg.arc(x, y, 30, 0, 7); pg.fill(); } });
    return print(ctx, m, [{ c: p, color: AMBER }], look);
  }

  // =====================================================================
  // 36秒(1080コマ)「止まらない/止まれない」: 横から見た高架。路面の上を走る光の筋(速い横の刀)、路面の一区間に琥珀(1123 で路面が灯る)。
  // 字は大小2段・逆の端に寄せる(上は左寄せ、下は右寄せ)。奥へ収束する線は使わない(すべて横の速さ)
  // =====================================================================
  function S36(ctx, { look }) {
    const [m, g] = begin(), r = rng(3601), DT = 600, DB = 662;
    // 高架の下の向こう: 遠い川面の弱い横の刀
    g.fillStyle = "#fff";
    for (let y = DB + 30; y < BY1 - 4; y += 6 + (y - DB) * 0.02) { let x = BX0 - 20 + r() * 40; while (x < BX1) { const len = lerp(30, 140, r()), t = 0.3 + 0.4 * (1 - (y - DB) / 380); if (r() < 0.15 + t) cut(g, [[x, y], [x + len, y + (r() - 0.5) * 1.5]], lerp(1.2, 5.5, t), (x * 3 + y * 5) | 0, { entry: 0.12, exit: 0.5 }); x += len + lerp(70, 20, t) * (0.5 + r()); } }
    // 速さの筋: 路面のすぐ上ほど密で太く長い
    for (let y = 300; y < DT - 34; y += 4 + (DT - y) * 0.025) {
      const t = Math.pow(clamp(1 - (DT - 34 - y) / 260), 1.6); let x = BX0 - 40 + r() * 80;
      while (x < BX1) { const len = lerp(180, 760, r()) * lerp(0.6, 1.2, t); if (r() < 0.1 + 0.9 * t) cut(g, [[x, y], [x + len, y + (r() - 0.5) * 1.2]], lerp(1.2, 7.5, t) * (0.7 + 0.6 * r()), (x * 11 + y * 7) | 0, { entry: 0.02, exit: 0.75, jit: 0.4 }); x += len + lerp(160, 14, t) * (0.5 + r()); }
    }
    // 高架(黒): 路面の帯、アーチの間の壁、橋脚
    g.fillStyle = "#000"; g.fillRect(BX0 - 20, DT - 30, BX1 - BX0 + 40, DB - DT + 30);
    const piers = []; for (let x = BX0 + 60; x < BX1 + 200; x += 330) piers.push(x);
    const arch = (xa, xb, u) => [lerp(xa, xb, u), DB + 150 - 118 * Math.sin(Math.PI * u)];
    for (let i = 0; i < piers.length - 1; i++) { const xa = piers[i] + 54, xb = piers[i + 1]; const P = [[xa, DB - 2], [xb, DB - 2]]; for (let k = 20; k >= 0; k--) P.push(arch(xa, xb, k / 20)); g.beginPath(); poly(g, P); g.fill(); g.fillRect(piers[i], DB - 2, 54, BY1 - DB + 40); }
    g.fillRect(piers[piers.length - 1], DB - 2, 54, BY1 - DB + 40);
    // 光の側の刀: 欄干の上の縁、欄干の柱、路面の下の縁、アーチの内側の縁、橋脚の右の縁
    g.fillStyle = "#fff"; cut(g, [[BX0 - 10, DT - 31], [BX1 + 10, DT - 31]], 4.2, 3611, { entry: 0.01, exit: 0.02, jit: 0.8 }); cut(g, [[BX0 - 10, DT + 2], [BX1 + 10, DT + 2]], 2.4, 3612, { entry: 0.01, exit: 0.02, jit: 0.6 });
    for (let x = BX0 + 30; x < BX1; x += 70 + r() * 60) if (r() < 0.75) cut(g, [[x, DT - 27], [x + 1, DT - 2]], 2.6, (x * 13) | 0, { entry: 0.1, exit: 0.2, jit: 0.3 });
    for (let i = 0; i < piers.length - 1; i++) { const xa = piers[i] + 54, xb = piers[i + 1], pts = []; for (let k = 0; k <= 30; k++) { const [x, y] = arch(xa, xb, k / 30); pts.push([x, y + 3]); } cut(g, pts, 2.6, 3620 + i, { entry: 0.1, exit: 0.1, jit: 0.4 }); cut(g, [[piers[i] + 50, DB + 150], [piers[i] + 50, BY1 + 10]], 2.2, 3640 + i, { entry: 0.05, exit: 0.3, jit: 0.3 }); }
    const T1 = horizontal("SMB", "止まらない", 120, 330, 232, 4);
    const T2 = horizontal("SMB", "止まれない", 1850 - 5 * 150, 978, 150, 0);
    keepOut(g, T1, 38); keepOut(g, T2, 30); carve(g, T1.concat(T2), 3650);
    g.restore();
    // 色版: 路面のすぐ上の筋の一区間(1123 で路面が灯る)
    const [p, pg] = plateBuf("plateA3a"), gp = pg.createLinearGradient(560, 0, 1600, 0); gp.addColorStop(0, "rgba(0,0,0,0)"); gp.addColorStop(0.3, "rgba(0,0,0,1)"); gp.addColorStop(0.75, "rgba(0,0,0,1)"); gp.addColorStop(1, "rgba(0,0,0,0)"); pg.fillStyle = gp; pg.fillRect(560, DT - 150, 1040, 118); // 進む向き(右)へ、ぼかし摺りで入って抜ける
    return print(ctx, m, [{ c: p, color: AMBER, bokashi: true }], look);
  }

  // =====================================================================
  // 40秒(1200コマ)「まだ、」の方式の切り替え(ART_REVIEW_v2 §8、PILOT_6S_REVIEW §7)
  //  a = 字と読点と線だけ(町を描かない)。線は読点から真下へ、版木の下の縁を越えて落ちる(次のカットへ続く)
  //  b = 町の手前に明るい面(町を上げ、町の足もとに広場の明るい横の刀を置いて、町を逆光の黒い塊で立たせる)
  // 字と読点・色版の規則は cand_a2.js の S40 と同じ
  // =====================================================================
  function S40(ctx, { look, mode = "a" }) {
    const [m, g] = begin(), r = rng(441);
    const SZ = mode === "a" ? 262 : 236, TX = mode === "a" ? 1312 : 1290, TT = mode === "a" ? 84 : 62;
    const L = vertical("SMB", "まだ", TX, TT, SZ, 1.0), y = TT + SZ * 2, x0 = TX - SZ / 2;
    L.push({ ch: "、", size: SZ, x0: x0 + 0.58 * SZ, base: y + 0.16 * SZ, cs: AD.contours("SMB", "、", x0 + 0.58 * SZ, y + 0.16 * SZ, SZ) });
    const cb = bbox(L[2].cs), dx = (cb[0] + cb[2]) / 2, dy = cb[3];
    if (mode === "a") {
      // 空も町も彫らない。左の大きな黒は「消えた灯りの数」(初稿の 40秒の余白の良さを保つ)
      keepOut(g, L, 46); g.fillStyle = "#fff";
      cut(g, [[dx, dy + 24], [dx, (dy + BY1) / 2], [dx, BY1 + 30]], 3.4, 430, { entry: 0.02, exit: 0.01, jit: 0.5 });
      via(g, dx, dy + 150, 8);
    } else {
      const lift = 120, B = 930, roofY = 824 - lift;
      const SH = [
        [[BX0 - 10, B], [BX0 - 10, 802], [170, 802], [170, 788], [214, 788], [214, 802], [292, 802], [292, B]],
        [[292, B], [292, 862], [400, 798], [508, 862], [508, B]],
        [[598, B], [602, 566], [628, 566], [634, B]],
        [[640, B], [640, 880], [700, 818], [700, 880], [760, 818], [760, 880], [820, 818], [820, 880], [880, 818], [880, 880], [940, 818], [940, B]],
        [[936, B], [936, 882], [1046, 828], [1156, 882], [1156, B]],
        [[1150, B], [1150, 824], [1226, 824], [1226, 790], [1290, 790], [1290, 824], [1470, 824], [1470, B]],
        [[1466, B], [1466, 860], [1690, 896], [1690, B]],
        [[1686, B], [1686, 876], [1782, 832], [BX1 + 10, 876], [BX1 + 10, B]],
      ].map((P, i) => J(P.map(([x, yy]) => [x, yy === B ? B : yy - lift]), 40 + i, B - 1));
      const TANK = [[320, 690], [366, 656], [412, 690], [406, 754], [326, 754]].map(([x, yy]) => [x, yy - lift]);
      // 空: 細い横の刀は少なめ(町と空の差を、手前の明るい面で作るため)
      g.fillStyle = "#fff";
      for (let yy = BY0 + 26; yy < 780; yy += 9 + r() * 6) { let x = BX0 - 20 + r() * 80; while (x < BX1) { const len = lerp(60, 300, r()), t = Math.pow(clamp(1 - (roofY - yy) / 700), 2.2); if (r() < 0.08 + 0.4 * t) cut(g, [[x, yy], [x + len, yy + (r() - 0.5) * 1.5]], (1.4 + 0.5 * r()) * (1 + 0.6 * t), (x * 7 + yy * 3) | 0, { entry: 0.15, exit: 0.6, jit: 0.25 }); x += len + 30 + r() * 120; } }
      // 手前の広場: 明るい横の刀(線の落ちる所の真下ほど明るい)
      for (let yy = B + 8; yy < BY1 - 2; yy += 4.4 + (yy - B) * 0.03) { let x = BX0 - 20 + r() * 30; while (x < BX1) { const t = 0.5 + 0.45 * Math.pow(clamp(1 - Math.abs(x - dx) / 900), 1.4), len = lerp(40, 180, r()); if (r() < 0.35 + t) cut(g, [[x, yy], [x + len, yy + (r() - 0.5)]], lerp(2.4, 6.5, t) * (0.7 + 0.5 * r()), (x * 3 + yy * 11) | 0, { entry: 0.1, exit: 0.45, jit: 0.5 }); x += len + lerp(40, 8, t) * (0.5 + r()); } }
      keepOut(g, L, 46); g.fillStyle = "#000"; g.fillRect(dx - 13, dy + 10, 26, roofY - dy - 10);
      g.fillStyle = "#000"; for (const P of SH) { g.beginPath(); poly(g, P); g.fill(); } g.beginPath(); poly(g, TANK); g.fill(); g.strokeStyle = "#000"; g.lineWidth = 9; for (const [a, b] of [[[334, 754], [322, 862]], [[398, 754], [410, 862]]]) { g.beginPath(); g.moveTo(a[0], a[1] - lift); g.lineTo(b[0], b[1] - lift); g.stroke(); }
      SH.forEach((P, i) => rims(g, P, 450 + i * 40, (x) => 1.6 + 2.4 * Math.pow(clamp(1 - Math.abs(x - dx) / 1250), 1.6)));
      cut(g, [[BX0, B + 2], [BX1, B + 2]], 3.0, 460, { entry: 0.01, exit: 0.02, jit: 0.8 });
      cut(g, [[dx, dy + 24], [dx, (dy + roofY) / 2], [dx, roofY - 9]], 3.0, 430, { entry: 0.02, exit: 0.03, jit: 0.5 }); via(g, dx, roofY, 8);
    }
    carve(g, L, 700);
    g.restore();
    const [p, pg] = plateBuf("plateA3a"); letterPlate(pg, L[2], { contour: 0 });
    return Object.assign(print(ctx, m, [{ c: p, color: AMBER }], look, { thinKeep: true }), { mode });
  }

  // =====================================================================
  // 49秒(1470コマ)「夜が明ける」: 版木はほとんど彫り取られて紙=朝。空は薔薇と淡黄のぼかし摺り(2版)、太陽は琥珀。
  // 夜は「彫り残した墨」として空の上の雲の筋と字に残る。字は墨(反転)で、「明」の日だけが彫られて琥珀(8秒の「暗・闇の中の日」の答え)。
  // 太陽は 8秒の空の弧の中心と同じ x=960。町は 8秒の町を左右に分け(中央を太陽に空ける)、太陽に向く縁だけ琥珀。川は 8秒の川の続き
  // 墨の色は茄子紺(夜の青黒より暖かい)
  // =====================================================================
  function S49(ctx, { look }) {
    const [m, g] = begin(), r = rng(4901), HZ = 690, SUN = [960, HZ + 14], SR = 118;
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, HZ);
    // 夜の名残: 墨の雲の筋(上ほど多く太い)。字と太陽のまわりは空ける
    const T = centered("SMB", "夜が明ける", 960, 400, 176, 18), tb = bbox(T.flatMap((L) => L.cs));
    g.fillStyle = "#000";
    for (let y = BY0 + 6; y < HZ - 70; y += 6 + (y - BY0) * 0.03 + r() * 4) {
      const night = Math.pow(1 - clamp((y - BY0) / (HZ - 150 - BY0)), 1.5); let x = BX0 - 40 + r() * 80;
      while (x < BX1) { const len = lerp(80, 520, r()) * lerp(0.6, 1.3, night); const mid = x + len / 2, nearT = mid > tb[0] - 60 && mid < tb[2] + 60 && y > tb[1] - 40 && y < tb[3] + 30; if (!nearT && r() < 0.06 + 0.9 * night) cut(g, [[x, y], [x + len * 0.5, y + (r() - 0.5) * 3], [x + len, y + (r() - 0.5) * 2]], lerp(1.2, 8.5, night) * (0.6 + 0.6 * r()), (x * 5 + y * 3) | 0, { entry: 0.2, exit: 0.6, jit: 0.8 }); x += len + lerp(260, 30, night) * (0.5 + r()); }
    }
    // 太陽の輪郭: 墨の細い輪(ところどころ切れる)
    for (let k = 0; k < 9; k++) { const a0 = Math.PI + (k / 9) * Math.PI + 0.05, a1 = a0 + Math.PI / 9 - 0.09, pts = []; for (let a = a0; a <= a1; a += 0.02) pts.push([SUN[0] + Math.cos(a) * (SR + 9), SUN[1] + Math.sin(a) * (SR + 9)]); if (pts.length > 3) cut(g, pts, 3.2, 4910 + k, { entry: 0.2, exit: 0.3, jit: 0.3 }); }
    // 町: 8秒の町の点列を左右に分けて置く(中央を空ける)。左は 0.82 倍、右は鏡に映して 0.7 倍(塔・マストは左だけ)
    const left = CITY8.slice(0, 6).map((P, i) => J(place(P, 0.82, BX0 - 6, HZ), 60 + i, HZ - 1));
    const right = CITY8.slice(1, 8).map((P, i) => J(place(P, 0.72, BX1 + 6, HZ, -0.72), 80 + i, HZ - 1).reverse());
    const tank = place(TANK8, 0.82, BX0 - 6, HZ);
    g.fillStyle = "#000"; for (const P of left.concat(right)) { g.beginPath(); poly(g, P); g.fill(); } g.beginPath(); poly(g, tank); g.fill();
    g.strokeStyle = "#000"; g.lineWidth = 6; for (const [a, b] of [[[660, 528], [654, EMB8]], [[702, 528], [708, EMB8]], [[660, 560], [704, 612]], [[704, 560], [658, 612]], [[657, 612], [705, 612]], [[656, 652], [706, 652]]]) { const [p0, p1] = place([a, b], 0.82, BX0 - 6, HZ); g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.stroke(); }
    // 地面と川: 土手(墨の帯)、川は彫り取って紙、墨の横の波の筋(手前ほど多い)
    g.fillStyle = "#000"; g.fillRect(BX0 - 10, HZ, BX1 - BX0 + 20, 46);
    g.fillStyle = "#fff"; g.fillRect(BX0 - 10, HZ + 46, BX1 - BX0 + 20, BY1 - HZ);
    g.fillStyle = "#000";
    for (let y = HZ + 52; y < BY1 + 4; y += 5 + (y - HZ) * 0.03) { const d = (y - HZ) / (BY1 - HZ); let x = BX0 - 30 + r() * 40; while (x < BX1) { const sun = Math.pow(clamp(1 - Math.abs(x - SUN[0]) / (90 + d * 260)), 1.2), len = lerp(40, 240, r()), ink = (0.15 + 0.75 * d) * (1 - 0.85 * sun); if (r() < ink) cut(g, [[x, y], [x + len * 0.5, y + (r() - 0.5) * 2], [x + len, y]], lerp(1.2, 7, d) * (0.6 + 0.6 * r()), (x * 3 + y * 7) | 0, { entry: 0.15, exit: 0.5, jit: 0.6 }); x += len + lerp(50, 14, d) * (0.5 + r()); } }
    // 光の側の縁: 太陽に向く辺(左の町は右の辺、右の町は左の辺)と上の辺
    g.fillStyle = "#fff";
    const sunRim = (P, seed) => { for (let k = 0; k < P.length - 1; k++) { const [a, b] = [P[k], P[k + 1]], mx = (a[0] + b[0]) / 2, facing = mx < SUN[0] ? (b[1] > a[1] + 4) : (b[1] < a[1] - 4), up = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) * 0.25; if (Math.max(a[1], b[1]) >= HZ - 2 && !up) { /* 地面の縦の辺の下端も含める */ } if (!(facing || up)) continue; const t = Math.pow(clamp(1 - Math.abs(mx - SUN[0]) / 900), 1.3); cut(g, [[a[0], a[1]], [b[0], b[1]]], lerp(2.2, 6, t), seed + k, { entry: 0.06, exit: 0.2, jit: 0.5 }); } };
    left.forEach((P, i) => sunRim(P, 4950 + i * 30)); right.forEach((P, i) => sunRim(P, 5150 + i * 30));
    // 土手の上の回路の線(8秒の線の続き): 右から太陽の真下へ、ビアで止まる
    cut(g, [[1600, HZ + 24], [1200, HZ + 24], [1150, HZ + 24], [SUN[0] + 30, HZ + 24]], 5.2, 4990, { entry: 0.01, exit: 0.02, jit: 0.8 }); via(g, 1600, HZ + 24, 9); via(g, SUN[0] + 22, HZ + 24, 9);
    // 字: 墨(彫り残し)。まわりは紙を空け、「明」の日だけ彫る
    keepOut(g, T, 30, "#fff"); carve(g, T, 4995, "#000");
    g.fillStyle = "#fff"; letterPlate(g, T[2], { rect: [0.0, -0.80, 0.40, -0.10] }); // 明の日へん: 彫る(紙)
    g.restore();
    // 版: 薔薇(上からのぼかし)、淡黄(地平と太陽のまわりからのぼかし)、琥珀(太陽・明の日・映り・町の陽の縁・土手の線)
    const [a, ag] = plateBuf("plateA3a"), gr1 = ag.createLinearGradient(0, BY0, 0, HZ); gr1.addColorStop(0, "rgba(0,0,0,0.95)"); gr1.addColorStop(0.42, "rgba(0,0,0,0.6)"); gr1.addColorStop(0.8, "rgba(0,0,0,0.08)"); gr1.addColorStop(1, "rgba(0,0,0,0)"); ag.fillStyle = gr1; ag.fillRect(0, 0, W, HZ);
    const gr1b = ag.createLinearGradient(0, HZ + 46, 0, BY1); gr1b.addColorStop(0, "rgba(0,0,0,0)"); gr1b.addColorStop(1, "rgba(0,0,0,0.55)"); ag.fillStyle = gr1b; ag.fillRect(0, HZ + 46, W, BY1 - HZ);
    const [b, bgc] = plateBuf("plateA3b"), gr2 = bgc.createRadialGradient(SUN[0], SUN[1], SR * 0.8, SUN[0], SUN[1], 980); gr2.addColorStop(0, "rgba(0,0,0,1)"); gr2.addColorStop(0.35, "rgba(0,0,0,0.75)"); gr2.addColorStop(1, "rgba(0,0,0,0)");
    bgc.save(); bgc.translate(SUN[0], SUN[1]); bgc.scale(1.7, 0.62); bgc.translate(-SUN[0], -SUN[1]); bgc.fillStyle = gr2; bgc.fillRect(-W, -H, 3 * W, 3 * H); bgc.restore();
    const [c, cg] = plateBuf("plateA3c");
    cg.save(); cg.beginPath(); cg.rect(0, 0, W, HZ); cg.clip(); cg.beginPath(); cg.arc(SUN[0], SUN[1], SR, 0, 7); cg.fill(); cg.restore();
    letterPlate(cg, T[2], { rect: [0.0, -0.80, 0.40, -0.10] });
    // 太陽の映り: 横の短い刷り(川の波の刀と同じ形)。真ん中ほど長く、下ほど広くまばら
    const rq = rng(4960); for (let y = HZ + 52; y < BY1; y += 6 + (y - HZ) * 0.025) { const d = (y - HZ) / (BY1 - HZ), half = 60 + d * 200; let x = SUN[0] - half; while (x < SUN[0] + half) { const c = 1 - Math.abs(x - SUN[0]) / half, len = lerp(14, 90, c) * (0.6 + 0.6 * rq()); if (rq() < 0.25 + 0.7 * c) cg.fillRect(x, y - 2, len, lerp(3, 6, d)); x += len + lerp(30, 6, c) * (0.5 + rq()); } }
    cg.fillRect(SUN[0] + 10, HZ + 14, 640, 22);
    for (const P of left.concat(right)) { cg.save(); cg.beginPath(); poly(cg, P); cg.clip(); cg.lineWidth = 14; cg.strokeStyle = "#000"; cg.beginPath(); poly(cg, P); cg.stroke(); cg.restore(); } // 町の陽の縁: 形の内側だけ
    return print(ctx, m, [{ c: a, color: ROSE, bokashi: true, shift: [-2, 1] }, { c: b, color: HONEY, bokashi: true, shift: [2, -1] }, { c, color: AMBER, shift: [-3, 2] }], look, { ink: INK_DAWN });
  }

  const SCENES = { 2: S2, 12: S12, 25: S25, 28: S28, 32: S32, 36: S36, 40: S40, 49: S49 };
  return function draw(ctx, o) { const f = SCENES[o.t]; if (!f) throw new Error("t が無い: " + o.t); return f(ctx, o); };
})();
