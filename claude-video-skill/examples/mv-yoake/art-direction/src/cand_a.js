// 案A「彫って灯す」— 木版画(凸版)。黒は彫り残した版木(=暗闇)、白は刀で彫り取った所(=光)。
// 「暗闇の数だけ 輝きは増す」を、彫った数だけ明るくなる版木の規則そのもので見せる。色は燃える物(灯った窓)に1版だけ。
// 規則の出典: references/styles/lemo/woodcut.md(刀の種類と幅・形に沿う彫り・色版は1色・刷りの質感)。
// 外した所(理由つき): 文字を余白でなく版木に彫る(MV の歌詞は絵の一部にするため。woodcut.md でも題字は「彫る」)。
// 描き方: 作業 canvas に「彫り」のマスク(白=彫った所)を作り、最後に紙とインクに「刷る」。
const CAND_A = (() => {
  const { W, H, clamp, lerp, smooth, rng, hash, fbm, vnoise, buf, mix, vertical, pathOf, dpClosed: dp, resample, stroke, perPixel, noiseField } = AD;
  const INK = "#14171f", PAPER = "#ece3cd", PLATE = "#e2742a";
  const BX0 = 56, BY0 = 46, BX1 = 1864, BY1 = 1034; // 版木の範囲(紙の余白が周りに残る)
  const EMB = 712, EMB2 = 760; // 川の土手の上端・下端(町はこの上に立つ)
  const SUN = [960, 742]; // 空の彫りの中心(地平の下。49秒の太陽の位置の予告)

  // 不揃いな版木の縁
  function blockPath(g) {
    const pts = [], step = 8, n = (a, s) => (fbm(a * 0.02, s, 41, 3) - 0.5) * 7 + (hash(a | 0, s, 7) < 0.03 ? -4 : 0);
    for (let x = BX0; x <= BX1; x += step) pts.push([x, BY0 + n(x, 1)]);
    for (let y = BY0; y <= BY1; y += step) pts.push([BX1 + n(y, 2), y]);
    for (let x = BX1; x >= BX0; x -= step) pts.push([x, BY1 + n(x, 3)]);
    for (let y = BY1; y >= BY0; y -= step) pts.push([BX0 + n(y, 4), y]);
    g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath();
  }
  // 1本の刀の跡: 入りは鈍く、途中は太さがゆらぎ、抜きで細る(woodcut.md §2)
  function cut(g, spine, w, seed, { entry = 0.08, exit = 0.4, jit = 0.6 } = {}) {
    const sp = resample(spine, 3);
    g.beginPath();
    stroke(g, sp, (u, i) => {
      const a = u < entry ? 0.55 + 0.45 * (u / entry) : 1, b = u > 1 - exit ? Math.pow((1 - u) / exit, 0.75) : 1;
      return w * a * b * (0.86 + 0.28 * vnoise(i * 0.15, seed * 0.37, 5));
    }, { jit, seed });
    g.fill();
  }
  const arcPts = (cx, cy, r, a0, a1, wob, seed) => { const n = Math.max(3, Math.ceil((Math.abs(a1 - a0) * r * 1.3) / 4)), out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = r + (fbm(a * 3, seed, 11, 2) - 0.5) * wob; out.push([cx + Math.cos(a) * rr * 1.42, cy + Math.sin(a) * rr * 0.86]); } return out; }; // 横に長い楕円(地平に沿う光の層。的の同心円に見せない)

  // ---- 空: 地平の下の一点を中心に、同心の弧で彫る。中心に近いほど太く(明るく)、遠いほど細く、上の端は彫らない(黒) ----
  function sky(g) {
    const r = rng(101); g.fillStyle = "#fff";
    for (let rad = 52; rad < 1180; rad += 10 + rad * 0.016 + r() * 4) {
      const base = Math.pow(1 - smooth((rad - 46) / 900), 1.35); if (base < 0.03) break;
      let a = Math.PI + (r() * 30) / rad;
      while (a < 2 * Math.PI) {
        const len = (60 + r() * 170) / rad, a1 = Math.min(2 * Math.PI, a + len);
        const pts = arcPts(SUN[0], SUN[1], rad, a, a1, 2.4, (rad * 13) | 0).filter((p) => p[1] < EMB - 2 && p[0] > BX0 - 10 && p[0] < BX1 + 10);
        // 明るさ = 中心からの距離 × 地平からの高さ(地平に近いほど明るい。上は暗闇のまま)
        const my = pts.length ? pts[(pts.length / 2) | 0][1] : 0, tone = base * (0.45 + 0.55 * (1 - smooth((EMB - my) / 560)));
        const w = 1.1 + 9.5 * tone, gap = lerp(52, 9, tone);
        if (pts.length > 3 && r() > 0.15 * (1 - tone)) cut(g, pts, w * (0.75 + 0.5 * r()), (rad * 7 + a * 100) | 0);
        a = a1 + (5 + r() * gap) / rad;
      }
    }
  }
  // ---- 水: 土手の下の川。空の明るさを映す縦の帯(中心 x=SUN)だけ太く密に。手前ほど間隔が広い ----
  function water(g) {
    const r = rng(202); g.fillStyle = "#fff";
    for (let y = EMB2 + 9; y < BY1 - 4; y += 5.5 + (y - EMB2) * 0.036) {
      let x = BX0 - 20 + r() * 40;
      while (x < BX1) {
        const half = 120 + (y - EMB2) * 0.55, d = Math.abs(x - SUN[0]) / half, tone = Math.max(0.18 * (1 - (y - EMB2) / 400), Math.pow(clamp(1 - d), 1.6) * (1 - (y - EMB2) / 520));
        const len = lerp(30, 150, r()) * lerp(0.6, 1.2, tone), w = lerp(1.1, 7.5, tone) * (0.7 + 0.6 * r());
        if (r() < 0.25 + tone) { const wob = (vnoise(x * 0.01, y * 0.05, 3) - 0.5) * 3; cut(g, [[x, y + wob], [x + len * 0.5, y + wob + (r() - 0.5) * 1.5], [x + len, y + wob]], w, (x * 3 + y * 7) | 0, { entry: 0.12, exit: 0.5 }); }
        x += len + lerp(40, 8, tone) * (0.5 + r());
      }
    }
  }

  // ---- 町(手で決めたシルエット。箱を並べず、屋根・給水塔・煙突・アンテナで輪郭に意味を持たせる) ----
  const J = (pts, s) => pts.map(([x, y], i) => [x + (hash(i, 1, s) - 0.5) * 3, y + (y < EMB ? (hash(i, 2, s) - 0.5) * 3 : 0)]);
  const CITY = [
    J([[BX0 - 10, EMB], [BX0 - 10, 318], [70, 318], [70, 302], [86, 302], [86, 270], [92, 262], [114, 262], [120, 270], [120, 302], [134, 302], [134, 318], [152, 318], [152, EMB]], 1), // 集合住宅と屋上の給水槽
    J([[150, EMB], [150, 566], [208, 524], [266, 566], [266, EMB]], 2), // 切妻の家
    J([[262, EMB], [262, 474], [296, 474], [296, 444], [338, 444], [338, 430], [356, 430], [356, 444], [394, 444], [394, 474], [420, 474], [420, EMB]], 3), // 段のある事務所
    J([[418, EMB], [418, 636], [434, 636], [442, 232], [462, 232], [470, 600], [480, 600], [480, EMB]], 4), // 煙突
    J([[476, EMB], [476, 500], [552, 500], [552, 478], [600, 478], [600, 500], [644, 500], [644, EMB]], 5), // 団地
    J([[712, EMB], [712, 612], [754, 584], [796, 612], [796, 602], [830, 578], [864, 602], [864, EMB]], 7), // 低い屋根の並び
    J([[860, EMB], [860, 526], [884, 526], [884, 514], [952, 514], [952, 526], [980, 526], [980, EMB]], 8), // アンテナの建物
    J([[976, EMB], [976, 650], [1064, 676], [1064, EMB]], 9), // 小屋
  ];
  const TOWER = { tank: [[650, 474], [681, 450], [712, 474], [708, 528], [654, 528]], legs: [[[660, 528], [654, EMB]], [[702, 528], [708, EMB]], [[660, 560], [704, 612]], [[704, 560], [658, 612]], [[657, 612], [705, 612]], [[656, 652], [706, 652]]] };
  const MAST = [[[918, 514], [918, 300]], [[904, 360], [932, 360]], [[908, 410], [928, 410]], [[918, 300], [906, 330]]];
  const WINDOWS = [[94, 360], [96, 420], [118, 510], [118, 600], [196, 610], [316, 520], [512, 560], [588, 620], [606, 540], [748, 650], [1010, 690]];
  const LIT = [896, 566]; // 灯った窓(色版が刷られる唯一の所。回路の線の終点)

  function poly(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); }
  function city(g) {
    // 輪郭の外側に細い白の縁(刀で彫った輪郭。黒い町と黒い空を分ける): 先に太い白の線を引き、上から黒で塗る
    g.strokeStyle = "#fff"; g.lineJoin = "miter"; g.lineWidth = 6;
    for (const b of CITY) { g.beginPath(); poly(g, b); g.stroke(); }
    g.beginPath(); poly(g, TOWER.tank); g.stroke(); g.lineWidth = 11; for (const [a, b] of TOWER.legs.concat(MAST)) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.fillStyle = "#000"; for (const b of CITY) { g.beginPath(); poly(g, b); g.fill(); }
    g.beginPath(); poly(g, TOWER.tank); g.fill(); g.strokeStyle = "#000"; g.lineCap = "butt";
    for (const [i, [a, b]] of TOWER.legs.entries()) { g.lineWidth = i < 2 ? 6 : 3.2; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    for (const [i, [a, b]] of MAST.entries()) { g.lineWidth = i === 0 ? 4.5 : 2.6; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    // 土手(全幅の黒い帯)
    g.fillStyle = "#000"; g.fillRect(0, EMB, W, EMB2 - EMB);
  }
  // 光の側(右=空の明るい側)の面に、縁から内へ短い横の彫り(形に沿う明暗。woodcut.md「光の当たる縁だけ」)
  function cityDetail(g) {
    g.fillStyle = "#fff"; const r = rng(303);
    for (const b of CITY) {
      let xl = 1e9, xr = -1; for (const [x] of b) { xl = Math.min(xl, x); xr = Math.max(xr, x); }
      const right = (xl + xr) / 2 < SUN[0], xe = right ? xr : xl, sg = right ? 1 : -1; // 光(空の中心)の側の縁
      const xrTop = b.filter(([x]) => Math.abs(x - xe) < 6).reduce((m, p) => Math.min(m, p[1]), 1e9);
      for (let y = xrTop + 6; y < EMB - 6; y += 6 + r() * 3) {
        const k = 1 - (y - xrTop) / (EMB - xrTop), len = (8 + 30 * k) * (0.6 + 0.6 * r());
        if (r() < 0.25) continue;
        cut(g, [[xe - 3 * sg, y], [xe - (3 + len) * sg, y + (r() - 0.5) * 2]], 1.4 + 1.6 * k, (y * 31 + xe) | 0, { entry: 0.05, exit: 0.7, jit: 0.3 });
      }
    }
    // 窓(手で切った不揃いな四角)と、屋根の軒の線
    for (const [i, [x, y]] of WINDOWS.entries()) { const w = 9 + hash(i, 3, 9) * 6, h = 12 + hash(i, 4, 9) * 7; g.beginPath(); poly(g, [[x, y], [x + w, y + (hash(i, 5, 9) - 0.5) * 2], [x + w + (hash(i, 6, 9) - 0.5) * 2, y + h], [x, y + h + (hash(i, 7, 9) - 0.5) * 2]]); g.fill(); }
    for (const [a, b, y] of [[480, 640, 512], [480, 640, 532], [866, 976, 540], [300, 390, 458]]) cut(g, [[a + 4, y], [b - 4, y + 1]], 1.6, a + y, { entry: 0.02, exit: 0.3, jit: 0.4 });
    // 土手の石積みの目地(まばら)
    for (let x = BX0 + 30; x < BX1; x += 60 + r() * 70) { if (x > 1490 && x < 1700) continue; cut(g, [[x, EMB + 6], [x + (r() - 0.5) * 3, EMB2 - 8]], 1.3, x | 0, { entry: 0.1, exit: 0.5, jit: 0.3 }); }
    cut(g, [[BX0, EMB2 - 1], [BX1, EMB2 - 1]], 1.6, 77, { entry: 0.01, exit: 0.02, jit: 0.8 });
  }
  // 灯った窓: 窓+放射の短い彫り(「光は彫られる」woodcut.md §8)
  function litWindow(g) {
    const [x, y] = LIT; g.fillStyle = "#fff";
    // 窓の周りの壁に落ちる光: 短い横の彫り(窓に近いほど太い)。ここに色版が乗る
    const rr = rng(404);
    for (let yy = y - 40; yy < y + 76; yy += 4.6) for (let xx = x - 50 + rr() * 8; xx < x + 70; xx += 12 + rr() * 8) {
      const d = Math.hypot((xx + 6 - (x + 12)) / 1.3, yy - (y + 16)) / 66; if (d > 1 || rr() < d * 0.45) continue;
      cut(g, [[xx, yy], [xx + 9 + 14 * (1 - d), yy + (rr() - 0.5)]], 1.0 + 3.4 * (1 - d), (xx * 5 + yy) | 0, { entry: 0.1, exit: 0.6, jit: 0.3 });
    }
    g.fillStyle = "#000"; g.fillRect(x - 5, y - 5, 46, 54); g.fillStyle = "#fff";
    // 4つに区切った窓(桟を彫り残す)
    for (const [dx, dy] of [[0, 0], [19, 0], [0, 23], [19, 23]]) { g.beginPath(); poly(g, [[x + dx, y + dy], [x + dx + 16, y + dy - 0.6], [x + dx + 16.6, y + dy + 20], [x + dx + 0.6, y + dy + 20.6]]); g.fill(); }
  }

  // ---- 歌詞「暗闇の数だけ」: Shippori Mincho B1 800 を縦に。刀の面(ファセット)にして版木に彫る ----
  const TX = 1594, TT = 104, SIZES = [170, 170, 122, 122, 122, 122];
  const letters = () => vertical("SMB", "暗闇の数だけ", TX, TT, SIZES, 1.03);
  const facet = (cs, eps, s) => cs.map((ct, k) => dp(ct, eps).map(([x, y], i) => [x + (hash(i, k, s) - 0.5) * 1.4, y + (hash(i, k + 50, s) - 0.5) * 1.4]));
  function keepOut(g) { // 字の周りは彫らない(黒い余白で字を立てる)
    g.fillStyle = "#000"; g.strokeStyle = "#000"; g.lineJoin = "round"; g.lineWidth = 34;
    for (const L of letters()) { g.beginPath(); pathOf(g, L.cs); g.stroke(); g.fill("nonzero"); }
  }
  function carveLetters(g) {
    g.fillStyle = "#fff";
    letters().forEach((L, i) => { g.beginPath(); pathOf(g, facet(L.cs, L.size * 0.019, 300 + i)); g.fill("nonzero"); });
  }
  // ---- 回路の線: 字の列から土手の中を左へ、45度と90度で折れて、灯った窓へ(三角刀 6px、ビアは刺した丸) ----
  function circuit(g) {
    g.fillStyle = "#fff";
    const pts = [[TX - 64, 736], [1250, 736], [1120, 736], [1046, 736], [1016, 706], [1016, 686], [988, 658], [934, 658], [914, 638], [914, 622]];
    cut(g, pts, 6.2, 909, { entry: 0.01, exit: 0.015, jit: 0.9 });
    for (const [x, y, r0] of [[TX - 64, 736, 9], [1046, 736, 7], [988, 658, 6]]) { g.beginPath(); g.arc(x, y, r0, 0, 7); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(x, y, r0 * 0.38, 0, 7); g.fill(); g.fillStyle = "#fff"; }
  }

  // ---- 刷り: マスク(白=彫った所)を紙とインクに。look では インクのむら・木目・刷り残しの点・縁のかすれ・色版の版ずれ ----
  function print(ctx, mask, plate, look) {
    const ink = AD.hex(INK), paper = AD.hex(PAPER), pc = AD.hex(PLATE);
    const [o, og] = buf("out"); og.drawImage(mask, 0, 0);
    const md = mask.getContext("2d").getImageData(0, 0, W, H).data, pd = plate.getContext("2d").getImageData(0, 0, W, H).data;
    let bd = md;
    if (look) { const [b, bg] = buf("blur"); bg.filter = "blur(0.9px)"; bg.drawImage(mask, 0, 0); bd = bg.getImageData(0, 0, W, H).data; }
    const grain = noiseField(W, H, 6, (x, y) => fbm(x * 0.0022, y * 0.09, 61, 3)); // 横に長い木目
    const blot = noiseField(W, H, 8, (x, y) => fbm(x * 0.006, y * 0.006, 62, 4)); // インクのむら
    const fiber = noiseField(W, H, 3, (x, y) => fbm(x * 0.05, y * 0.05, 63, 3)); // 紙の繊維
    const edge = noiseField(W, H, 3, (x, y) => vnoise(x * 0.35, y * 0.35, 64));
    perPixel(o, (x, y) => {
      const i = (y * W + x) * 4; let v = bd[i] / 255;
      if (look) { const t = 0.5 + (edge(x, y) - 0.5) * 0.42; v = smooth((v - (t - 0.1)) / 0.2); } else v = v > 0.5 ? 1 : 0;
      let ic = ink, pp = paper;
      if (look) {
        const thin = clamp((grain(x, y) - 0.45) * 2.2) * 0.13 + (blot(x, y) - 0.5) * 0.12, speck = hash((x / 2) | 0, (y / 2) | 0, 71) < 0.0007 ? 0.45 : 0;
        ic = mix(ink, paper, clamp(thin + speck, 0, 0.6) * 0.5 + 0.02);
        const f = (fiber(x, y) - 0.5) * 0.09; pp = [paper[0] * (1 + f), paper[1] * (1 + f), paper[2] * (1 + f * 1.2)];
      }
      let c = mix(ic, pp, v);
      // 色版: 彫った所(紙)にだけ乗る。look では 3px の版ずれとむら
      const px = look ? x - 3 : x, py = look ? y + 2 : y; let pv = 0;
      if (px >= 0 && py < H) pv = pd[(py * W + px) * 4 + 3] / 255;
      if (pv > 0) { const k = pv * v * (look ? 0.82 + 0.3 * (blot((x * 1.7) % W, (y * 1.7) % H) - 0.5) : 1); c = [lerp(c[0], c[0] * pc[0] / 255, k), lerp(c[1], c[1] * pc[1] / 255, k), lerp(c[2], c[2] * pc[2] / 255, k)]; }
      return c;
    });
    ctx.drawImage(o, 0, 0);
  }

  return function draw(ctx, { look }) {
    const [m, g] = buf("maskA");
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.save(); g.beginPath(); blockPath(g); g.fillStyle = "#000"; g.fill(); g.clip();
    sky(g); water(g); city(g); keepOut(g); cityDetail(g); circuit(g); litWindow(g); carveLetters(g);
    g.restore();
    const [p, pg] = buf("plateA"); pg.fillStyle = "#000"; const [x, y] = LIT;
    pg.save(); pg.beginPath(); poly(pg, CITY[6]); pg.clip(); pg.beginPath(); pg.ellipse(x + 12, y + 16, 92, 74, 0, 0, 7); pg.fill(); pg.restore(); // 色版は灯った窓のある建物の面だけ
    print(ctx, m, p, look);
  };
})();
