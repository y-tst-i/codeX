// 案B「夜明け前の電線」— 背景美術の絵(ガッシュ=不透明水彩の筆致)を、近景・中景・遠景・空の層に分けた 2.5D。
// 回路は「基板の模様」ではなく、街に実際に張られた配線(電柱・電線・変圧器)。暗い窓の数を数え、灯った窓は数えるほどしかない。
// 筆致の規則は references/styles/lemo/ink-wash.md・watercolor.md・urban-sketch.md の「紙・にじみ・はみ出し」を参考に、ガッシュの平らな面と刷毛のかすれに置き換えた。
// clean = 筆致と形と明暗だけ(窓のにじみ・地平の霞・紙の粒を描かない)。look = それらを足した仕上げ。
const CAND_B = (() => {
  const { W, H, clamp, lerp, smooth, rng, hash, fbm, vnoise, buf, mix, css, vertical, pathOf, resample, stroke, perPixel, noiseField } = AD;
  const SKY = [[0, "#070d24"], [0.35, "#0f1c3f"], [0.62, "#1d3157"], [0.8, "#2f4a6c"], [1, "#4d6a82"]]; // 上→地平(y=0..HOR)
  const HOR = 836;
  const skyAt = (y) => { const t = clamp(y / HOR); for (let i = 1; i < SKY.length; i++) if (t <= SKY[i][0]) return mix(SKY[i - 1][1], SKY[i][1], (t - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0])); return AD.hex(SKY[SKY.length - 1][1]); };

  // 刷毛の1筆(横長、縁がかすれ、端が細る)
  function brush(g, x, y, len, th, col, a, seed, ang = 0) {
    const n = Math.max(4, (len / 10) | 0), sp = []; for (let i = 0; i <= n; i++) { const u = i / n; sp.push([x + Math.cos(ang) * len * u, y + Math.sin(ang) * len * u + (vnoise(u * 3, seed, 9) - 0.5) * th * 0.6]); }
    g.fillStyle = css(col, a); g.beginPath();
    stroke(g, sp, (u, i) => th * Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.04)), 0.45) * (0.75 + 0.5 * vnoise(i * 0.4, seed, 3)), { jit: th * 0.35, seed }); g.fill();
    // かすれ(筆の毛の筋): 細い線を数本、途中で切る
    const r = rng(seed); g.strokeStyle = css(mix(col, "#000", 0.25), a * 0.7); g.lineWidth = 0.9;
    for (let k = 0; k < 3; k++) { const off = (r() - 0.5) * th * 0.8, s0 = r() * 0.4, s1 = s0 + 0.2 + r() * 0.4; g.beginPath(); g.moveTo(x + Math.cos(ang) * len * s0, y + off + Math.sin(ang) * len * s0); g.lineTo(x + Math.cos(ang) * len * s1, y + off + Math.sin(ang) * len * s1); g.stroke(); }
  }
  // 手で描いた輪郭のゆらぎ
  const wob = (pts, amp, s) => resample(pts, 9).map(([x, y], i) => [x + (vnoise(i * 0.31, s, 5) - 0.5) * amp, y + (vnoise(i * 0.31, s + 9, 5) - 0.5) * amp]);
  function fillShape(g, pts, col, s, amp = 2.2) { g.fillStyle = typeof col === "string" ? col : css(col); g.beginPath(); const p = wob(pts, amp, s); g.moveTo(p[0][0], p[0][1]); for (const q of p) g.lineTo(q[0], q[1]); g.closePath(); g.fill(); }
  // 形の中に、面の明暗のむらを刷毛で(クリップして数十筆)
  function scumble(g, pts, col, n, seed, { th = [14, 40], a = [0.05, 0.14], ang = 0 } = {}) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    g.save(); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
    const r = rng(seed); for (let i = 0; i < n; i++) brush(g, lerp(x0 - 60, x1, r()), lerp(y0, y1, r()), 60 + r() * 220, lerp(th[0], th[1], r()), col, lerp(a[0], a[1], r()), seed * 31 + i, ang + (r() - 0.5) * 0.08);
    g.restore();
  }

  // ---- 空 ----
  function sky(g) {
    const gr = g.createLinearGradient(0, 0, 0, HOR); SKY.forEach(([t, c]) => gr.addColorStop(t, c)); g.fillStyle = gr; g.fillRect(0, 0, W, HOR); g.fillStyle = SKY[SKY.length - 1][1]; g.fillRect(0, HOR, W, H - HOR);
    const r = rng(11);
    for (let i = 0; i < 1500; i++) { // 横の刷毛。色は高さの色から少しずらす(明るい・暗い・緑み・紫み)。見える大きさで置く
      const y = Math.pow(r(), 0.8) * (HOR + 20), base = skyAt(y), shift = [[1.18, 1.14, 1.08], [0.82, 0.85, 0.9], [0.92, 1.1, 1.08], [1.1, 0.95, 1.1]][(r() * 4) | 0];
      brush(g, -100 + r() * (W + 100), y, 160 + r() * 520, 10 + r() * 34, [base[0] * shift[0], base[1] * shift[1], base[2] * shift[2]], 0.12 + r() * 0.3, 500 + i, (r() - 0.5) * 0.04);
    }
    // 地平の街の灯の反射(人の灯り=暖色。夜明けの太陽より先にある暖かさ)
    for (let i = 0; i < 70; i++) { const y = HOR - 20 - Math.pow(r(), 1.6) * 170, x = 120 + r() * 1100; brush(g, x, y, 200 + r() * 360, 14 + r() * 26, mix("#7a6070", "#a07a6a", r()), 0.06 + 0.14 * (1 - (HOR - y) / 190), 2000 + i, (r() - 0.5) * 0.03); }
  }
  // ---- 遠景: 地平の低い家並み(空気で明るく青い) ----
  function far(g) {
    const r = rng(21), pts = [[0, HOR + 30]]; let x = 0;
    while (x < W) { const w = 30 + r() * 90, h = 8 + Math.pow(r(), 2) * 46, kind = r(); pts.push([x, HOR - h * 0.4]); if (kind < 0.35) { pts.push([x + w / 2, HOR - h]); } else { pts.push([x, HOR - h]); pts.push([x + w, HOR - h]); } x += w; pts.push([x, HOR - h * 0.4]); }
    pts.push([W, HOR + 30]);
    fillShape(g, pts, "#2a3c5a", 3, 1.4);
    scumble(g, pts, "#34496a", 30, 4, { th: [6, 16] });
  }
  // ---- 中景: 団地(手前に傾く大きな板。各階のベランダの帯、暗い窓、灯った窓は3つ) ----
  const DANCHI = [[520, 1000], [520, 548], [1098, 600], [1098, 1000]];
  const LIT_WIN = [[618, 704, 1], [940, 806, 0.8]];
  function danchi(g, look) {
    const SIDE = [[452, 1000], [452, 566], [520, 548], [520, 1000]]; // 妻側の面(暗い)
    fillShape(g, SIDE, "#0b1226", 6, 2.4); scumble(g, SIDE, "#101a33", 14, 6, { th: [10, 24], ang: Math.PI / 2 });
    fillShape(g, DANCHI, "#141d36", 7, 2.4);
    scumble(g, DANCHI, "#1b2744", 60, 8, { th: [12, 40], a: [0.08, 0.2] });
    scumble(g, DANCHI, "#0c1328", 40, 18, { th: [10, 30], a: [0.08, 0.2], ang: Math.PI / 2 });
    // 階の帯(ベランダの手すり)は、ところどころ途切れる淡い筆の線。窓は描き込まない(暗闇のまま)
    const floors = 12, top = (x) => lerp(548, 600, (x - 520) / 578), bot = 1000;
    for (let k = 1; k <= floors; k++) {
      const t = k / (floors + 1); let x = 524;
      while (x < 1090) { const l = 80 + hash(x | 0, k, 2) * 260, x2 = Math.min(1094, x + l), yA = lerp(top(x), bot, t), yB = lerp(top(x2), bot, t); g.fillStyle = css("#2a3654", 0.55 + 0.3 * hash(x | 0, k, 5)); g.beginPath(); stroke(g, resample([[x, yA], [x2, yB]], 12), () => 4, { jit: 1.6, seed: k * 13 + (x | 0) }); g.fill(); x = x2 + 10 + hash(x | 0, k, 7) * 40; }
    }
    for (const [x, y, k] of LIT_WIN) {
      const w = 38, h = 22;
      g.fillStyle = "#e9a752"; g.fillRect(x - w / 2, y - h / 2, w, h); g.fillStyle = "#ffd690"; g.fillRect(x - w / 2 + 3, y - h / 2 + 3, w * 0.42, h - 6); g.fillStyle = css("#a56536", 0.9); g.fillRect(x + w * 0.08, y - h / 2, w * 0.4, h);
      g.fillStyle = css("#2a3654", 0.9); g.fillRect(x - w / 2 - 6, y + h / 2 - 2, w + 12, 5); // 手すりが窓の手前を横切る
      if (look) { const gr = g.createRadialGradient(x, y, 4, x, y, 80); gr.addColorStop(0, css("#f3b060", 0.3 * k)); gr.addColorStop(1, css("#f3b060", 0)); g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(x - 80, y - 80, 160, 160); g.restore(); }
    }
    fillShape(g, [[770, 1000], [770, 552], [818, 556], [818, 1000]], "#0e1630", 9, 1.6); // 階段室
    g.fillStyle = css("#c7d1e0", 0.5); for (const y of [640, 760]) g.fillRect(788, y, 10, 14); // 階段の小さな灯り(白、2つだけ)
    g.strokeStyle = css("#3e5677", 0.7); g.lineWidth = 2.5; g.beginPath(); for (const [x, y] of wob([[524, 549], [1097, 601], [1097, 990]], 2, 12)) g.lineTo(x, y); g.stroke();
  }
  // ---- 近景: 手前の屋根(瓦の筋)。一番暗い ----
  function roofs(g) {
    const pts = [[0, H], [0, 938], [150, 900], [330, 938], [330, 930], [470, 930], [470, 908], [690, 870], [930, 910], [930, 952], [1150, 902], [1390, 946], [1390, 920], [1460, 920], [1460, 900], [1710, 878], [1920, 912], [1920, H]];
    fillShape(g, pts, "#070b17", 13, 3);
    scumble(g, pts, "#0d1426", 34, 14, { th: [8, 22] });
    // 軒と棟の縁(空の側がわずかに明るい)
    g.strokeStyle = css("#24314d", 0.9); g.lineWidth = 2.2;
    for (const seg of [[[0, 938], [150, 900], [330, 938]], [[470, 908], [690, 870], [930, 910]], [[930, 952], [1150, 902], [1390, 946]], [[1460, 900], [1710, 878], [1920, 912]]]) { g.beginPath(); for (const [x, y] of wob(seg, 2, seg[0][0] | 0)) g.lineTo(x, y - 1); g.stroke(); }
    // 屋根のテレビアンテナ(街の小さな受信の回路)
    g.strokeStyle = "#070b17"; g.lineCap = "round";
    for (const [x, y, h] of [[690, 870, 96], [1150, 902, 70], [1710, 878, 84], [150, 900, 60]]) { g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - h); g.stroke(); g.lineWidth = 2; for (let k = 0; k < 4; k++) { const yy = y - h + 8 + k * 9, l = 34 - k * 6; g.beginPath(); g.moveTo(x + 2 - l / 2, yy); g.lineTo(x + 2 + l / 2, yy + 1); g.stroke(); } }
    g.fillStyle = "#e7a24f"; g.fillRect(1534, 978, 24, 28); g.fillStyle = "#ffd48a"; g.fillRect(1538, 982, 8, 20); // 手前の家の窓(灯り1つ)
  }
  // ---- 電柱と電線(この絵の主役の形)。近い柱は太く、少し傾く ----
  const P1 = { x: 318, w0: 70, w1: 44, lean: -0.03 }; // 近い柱(画面の下から上の外まで)
  const P2 = { x: 1236, top: 396, base: 1000, w: 22 }, P3 = { x: 1668, top: 642, base: 880, w: 10 };
  const p1x = (y) => P1.x + (H - y) * P1.lean;
  function pole1(g) {
    const pts = [[p1x(H) - P1.w0 / 2, H + 10], [p1x(-20) - P1.w1 / 2, -20], [p1x(-20) + P1.w1 / 2, -20], [p1x(H) + P1.w0 / 2, H + 10]];
    fillShape(g, pts, "#04070f", 21, 2.4);
    scumble(g, pts, "#0d1426", 26, 22, { th: [6, 14], ang: Math.PI / 2 });
    g.strokeStyle = css("#2d3f5f", 0.75); g.lineWidth = 3; g.beginPath(); for (let y = -20; y <= H; y += 12) { const w = lerp(P1.w1, P1.w0, (y + 20) / (H + 30)) / 2; g.lineTo(p1x(y) + w - 2 + (vnoise(y * 0.05, 4, 2) - 0.5) * 1.5, y); } g.stroke(); // 空の側の縁
    // 腕木・碍子・変圧器・足場ボルト
    const arm = (y, l, r0) => { fillShape(g, [[p1x(y) - l, y - 7], [p1x(y) + r0, y - 9], [p1x(y) + r0, y + 7], [p1x(y) - l, y + 9]], "#04070f", 30 + y, 0.8); g.strokeStyle = "#04070f"; g.lineWidth = 5; g.beginPath(); g.moveTo(p1x(y) - l * 0.6, y + 6); g.lineTo(p1x(y + 70), y + 70); g.lineTo(p1x(y) + r0 * 0.6, y + 6); g.stroke(); };
    arm(150, 150, 250); arm(268, 110, 200);
    for (const [y, xs] of [[150, [-130, -60, 70, 150, 230]], [268, [-90, 60, 130, 185]]]) for (const dx of xs) { const x = p1x(y) + dx; fillShape(g, [[x - 7, y - 8], [x - 6, y - 30], [x + 6, y - 30], [x + 7, y - 8]], "#060a14", x | 0, 0.6); g.fillStyle = css("#33476a", 0.8); g.fillRect(x + 2, y - 29, 3, 18); }
    const tx = p1x(420) + 46; fillShape(g, [[tx, 380], [tx + 70, 380], [tx + 74, 520], [tx - 2, 520]], "#05080f", 51, 1.0); g.fillStyle = css("#2f4364", 0.7); g.fillRect(tx + 56, 386, 6, 128); // 変圧器
    g.strokeStyle = "#04070f"; g.lineWidth = 4; for (const y of [396, 500]) { g.beginPath(); g.moveTo(p1x(y), y); g.lineTo(tx + 4, y); g.stroke(); }
    for (let y = 600; y < H; y += 46) { const s = ((y / 46) | 0) % 2 ? 1 : -1, x = p1x(y) + (s * P1.w0) / 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 22, y - 3); g.stroke(); } // 足場ボルト
  }
  function poleFar(g, P, col) { fillShape(g, [[P.x - P.w / 2, P.base], [P.x - P.w * 0.36, P.top], [P.x + P.w * 0.36, P.top], [P.x + P.w / 2, P.base]], col, P.x, 0.6); g.fillStyle = col; g.fillRect(P.x - P.w * 3.2, P.top + P.w * 1.5, P.w * 6.4, P.w * 0.45); g.fillRect(P.x - P.w * 2.2, P.top + P.w * 4, P.w * 4.4, P.w * 0.4); }
  // 垂れた電線(懸垂線)。a→b、たるみ sag
  function wire(g, a, b, sag, w, col, seed) {
    const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + sag * 4 * t * (1 - t)]); }
    g.fillStyle = col; g.beginPath(); stroke(g, pts, (u) => w * (0.85 + 0.3 * vnoise(u * 6, seed, 2)), { jit: 0.4, seed }); g.fill();
  }
  function wires(g) {
    const c = "#03060e", ends1 = [[-130, 150], [-60, 150], [70, 150], [150, 150], [230, 150], [-90, 268], [60, 268], [130, 268], [185, 268]];
    const ends2 = [[-60, 0], [-34, 0], [24, 0], [56, 0], [80, 0], [-40, 1], [26, 1], [48, 1], [66, 1]];
    ends1.forEach(([dx, y], i) => {
      const a = [p1x(y) + dx, y - 30], e = ends2[i], b = [P2.x + e[0] * 0.9, P2.top + P2.w * (e[1] ? 4 : 1.5) - 6];
      wire(g, a, b, 70 + i * 9, 3.2 - i * 0.12, c, 60 + i);
      const b3 = [P3.x + e[0] * 0.38, P3.top + P3.w * (e[1] ? 4 : 1.5) - 3]; wire(g, b, b3, 30 + i * 4, 1.8, "#070b17", 80 + i);
      wire(g, [-40, a[1] - 140 - i * 6], a, 40, 3.4, c, 90 + i); // 画面の左の外から来る
    });
    wire(g, [p1x(470), 470], [P2.x - 8, P2.top + 160], 120, 7, "#03060e", 101); // 太い通信ケーブル
    wire(g, [P2.x - 8, P2.top + 160], [P3.x - 4, P3.top + 70], 50, 3.4, "#060a15", 102);
    wire(g, [p1x(470), 470], [p1x(470) + 380, 880], -40, 2.4, c, 103); // 家への引き込み線
    wire(g, [p1x(150) + 230, 120], [W + 60, 236], 150, 2.2, "#050912", 104); wire(g, [p1x(150) + 150, 120], [W + 60, 262], 170, 1.6, "#050912", 105); // 高い所を渡る2本(歌詞の字の手前を横切り、字を空の層に置く)
  }

  // ---- 歌詞: Zen Kaku Gothic New 500、縦組み2列。空の層に置き、電線がその手前を横切る ----
  const COLS = [{ s: "暗闇の", cx: 1606, top: 156 }, { s: "数だけ", cx: 1462, top: 318 }];
  function text(g, look) {
    for (const C of COLS) for (const L of vertical("KAKU", C.s, C.cx, C.top, 112, 1.2)) {
      g.beginPath(); pathOf(g, L.cs); g.fillStyle = "#e9e3d4"; g.fill("nonzero");
      if (look) { g.save(); g.clip("nonzero"); const r = rng(L.ch.charCodeAt(0)); for (let i = 0; i < 6; i++) brush(g, L.x0 - 20, L.base - L.size * (0.9 - i * 0.17), L.size * 1.3, 18, "#c9c9cc", 0.12, 900 + i + L.ch.charCodeAt(0)); g.restore(); } // 筆のむら(字の中だけ)
    }
  }
  // ---- 仕上げ(look): 地平の霞、紙(ガッシュの紙目)、周辺のわずかな暗さ ----
  function finish(ctx) {
    const gr = ctx.createLinearGradient(0, HOR - 260, 0, HOR + 40); gr.addColorStop(0, css("#6d8aa0", 0)); gr.addColorStop(1, css("#6d8aa0", 0.22));
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = gr; ctx.fillRect(0, HOR - 260, W, 300); ctx.restore();
    const tooth = noiseField(W, H, 2, (x, y) => fbm(x * 0.08, y * 0.08, 77, 3)), blot = noiseField(W, H, 10, (x, y) => fbm(x * 0.004, y * 0.004, 78, 3));
    const [o, og] = buf("outB"); og.drawImage(ctx.canvas, 0, 0);
    perPixel(o, (x, y, r, gg, b) => { const t = (tooth(x, y) - 0.5) * 0.16 + (blot(x, y) - 0.5) * 0.1, v = 1 - 0.28 * Math.pow(Math.hypot((x - W / 2) / W, (y - H / 2) / H) * 1.5, 2.2); return [r * (1 + t) * v, gg * (1 + t) * v, b * (1 + t * 0.8) * v]; });
    ctx.drawImage(o, 0, 0);
  }

  return function draw(ctx, { look }) {
    const [c, g] = buf("B");
    sky(g); far(g); danchi(g, look); poleFar(g, P3, "#121b30"); poleFar(g, P2, "#080d1a"); text(g, look); wires(g); roofs(g); pole1(g);
    ctx.drawImage(c, 0, 0);
    if (look) finish(ctx);
  };
})();
