// 案A+C v7(動きの本制作 第1段)のカット: S1〜S4 の動き(0〜668 コマ)と、S6 の静止画の手直し。部品は cand_a7.js(A6 と MO)。
// S1〜S4 の絵は cand_a6_cuts.js(v6、53秒ボード v4)の S1〜S4 を写し、刀・字・窓・色版のそれぞれに「見え始めるコマと速さ」を与えて、曲のコマ番号 f の純関数にした。
// 各カットの最後のコマは v6 の静止画と同じ画素(sheet=0 で比べる)。S4 だけは歌詞「繋がってく」(540)を足したので、その字の分だけ違う。
// 動きの語彙は3つだけ: 彫る(刃先が進む刀・溝、字は粗彫り→仕上げ)、刷る(ばれんの1回、4コマ)、刷り替え(カットの頭は新しい紙に刷る: 紙を取り替え、色版をばれんで刷る)。
// フェード・グロー・粒子・カメラ移動は使わない(不透明度を時間で変える処理は無い)。時刻は M1_TIMING(motion1/tools/gen_timing.py が歌詞とアクセントの表から作る)の規則で決める。
const A7_CUTS = (() => {
  const { W, H, clamp, lerp, smooth, hash, fbm, vnoise, resample, stroke, bbox, pathOf } = AD;
  const { MO, avoidBoxes, C, FRAME, BLEED, PR, begin, plateBuf, poly, cut, cutW, wedge, groove, stab, lens, chipEdge, setH, setHC, setV, lettersBox, carve, keepOut, letterPlate, textMargin, bokashi, print, maskOnly, scallop, polyLen } = A6;
  const { cutT, wedgeT, lensT, grooveT, baren, carveT } = MO;
  const F = FRAME;
  function fin(ctx, m, plates, o, B, texts, extra = {}) {
    const tm = textMargin(texts, B);
    if (o.mask) return Object.assign(maskOnly(ctx, m), { text: tm }, extra);
    return Object.assign(print(ctx, m, plates, Object.assign({ look: o.look, B }, extra.printOpt || {})), { text: tm }, extra, { printOpt: undefined });
  }

  // =====================================================================
  // S6 28秒(840コマ)v7: 統括役の目視の指摘で手直し(v6 の S6 は cand_a6_cuts.js にそのまま残す)。
  //  ・「火」のまわりのクリームの面: v6 は輪郭を 20 面+大きな欠けで囲み、破れた紙・爆発の形に見えた。
  //    → 長い直線の刀 9 面で囲んだ「彫り残しの面」(下は水平に近く、左右は上へすぼまる。炎の向きに上が尖る)。ふちは丸刀の浅いえぐり(scallop、深さ 1.5〜4.5px)だけで、大きな欠けは入れない。
  //    面の中の刀の跡は、v6 のばらばらの弧をやめ、平刀でさらった向きのそろった短い筋 9 本(-62 度。ふちの近くだけ)。
  //    上は炎の向きに尖る(頂点 1 つ。墓石・扉のような丸い頭にしない)。
  //  ・楔: 7 本 → 3 本。頂点と両肩から上へ(炎の向き)。太さ 20〜28px、長さ 118〜158px で不揃い(冠・棘のように並べない。肩の外の短い2本は棘に見えたので外した)。根元が面のふちに乗る。
  //  ・回路の溝 3 本: v6 はゆるい曲線で投げ縄・ケーブルに見えた。→ 「路」の字画の中から出て、水平・垂直だけで直角に折れ(角は刀の入れ直し)、「火」の字画に入る。
  //    根元 40/34/30px → 先 10/9/8px(根元太く先細り)。字(夜明けの・回路に・を灯して)から 24px 以上離す。
  // =====================================================================
  const S6_FACE = [[1176, 664], [1162, 500], [1196, 362], [1262, 290], [1386, 196], [1502, 270], [1574, 418], [1586, 600], [1552, 672]];
  // 楔: [根元の点, 向き(度、-90=真上), 長さ, 根元の太さ, 反り]
  const S6_WEDGE = [[[1386, 214], -91, 158, 28, -0.05], [[1306, 262], -112, 118, 20, 0.05], [[1462, 250], -68, 132, 22, -0.06]];
  // 溝: 路の字画の中(根元)→ 火の字画の中(先)。水平・垂直の折れ線
  const S6_GROOVE = [
    [[606, 616], [606, 542], [1080, 542], [1080, 424], [1262, 424]],                 // 路の「各」の上 → 上へ → 右 → 上 → 火の左の点
    [[470, 616], [470, 330], [1150, 330], [1150, 372], [1372, 372]],                 // 路の「足」の上 → 夜明けの の下を右へ → 火の中の画の上
    [[604, 866], [604, 962], [1236, 962], [1236, 742], [1478, 742], [1478, 600]],    // 路の「各」の下 → に の下を回る → 火の右の払いの先
  ];
  function S6(ctx, o) {
    const B = BLEED, [m, g] = begin(B), Cc = [1372, 468], FS = 340;
    const T1 = setH("SMB", "夜明けの", 150, 238, 108, 0.1), T2 = setH("SMB", "回路に", 150, 850, 300, 0.06), Fh = setHC("SMB", "火", Cc[0], Cc[1] + 0.36 * FS, FS), T3 = setV("SMB", "を灯して", 1744, 300, 112, 0.1);
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#000"; for (const [P, sd] of [[[[-10, 1090], [-10, 930], [130, 1000], [300, 1090]], 6011], [[[1520, -10], [1930, -10], [1930, 150], [1790, 96], [1660, 40]], 6012]]) { g.beginPath(); poly(g, chipEdge(P.concat([P[0]]), sd, { big: 0.8 })); g.fill(); }
    keepOut(g, T1.concat(T2, T3, Fh), 2);
    g.fillStyle = "#000"; S6_GROOVE.forEach((P, i) => groove(g, P, { w0: [40, 34, 30][i], w1: [10, 9, 8][i], seed: 6160 + i, chip: 0.9, ov: 0.8, splinter: false, taper: 0.05 }));
    g.restore();
    const [pp, pg] = plateBuf("plA"); pg.fillRect(0, 0, W, H); pg.globalCompositeOperation = "destination-out"; pg.fillStyle = "#000";
    const face = scallop(S6_FACE, 6170, { step: [44, 96], depth: [1.5, 4.5], chip: 0.0 }); pg.beginPath(); poly(pg, face); pg.fill();
    S6_WEDGE.forEach(([a, deg, l, w, bend], k) => { const th = (deg * Math.PI) / 180; wedge(pg, a, [a[0] + Math.cos(th) * l, a[1] + Math.sin(th) * l], w, 1.4, 6270 + k, bend, 0.9); });
    pg.globalCompositeOperation = "source-over";
    // 面の中の刀の跡: 平刀でさらった筋(向き -62 度)。面のふちの内側 14〜40px だけ。琥珀の細い彫り残し
    const th = (-62 * Math.PI) / 180, ux = Math.cos(th), uy = Math.sin(th);
    for (const [x, y, l, w, sd] of [[1196, 640, 46, 3.2, 1], [1192, 548, 38, 2.4, 2], [1206, 420, 52, 3.0, 3], [1262, 300, 34, 2.2, 4], [1520, 330, 40, 2.6, 5], [1548, 470, 54, 3.2, 6], [1546, 590, 36, 2.2, 7], [1508, 650, 44, 2.8, 8], [1300, 650, 30, 2.0, 9]]) cut(pg, [[x, y], [x + ux * l * 0.5, y + uy * l * 0.5], [x + ux * l, y + uy * l]], w, 6300 + sd, { entry: 0.25, exit: 0.5, jit: 0.35 });
    // 溝と字の間の距離(計測)
    const boxes = T1.concat(T2, T3).filter((L) => L.ch !== "路").map((L) => bbox(L.cs));
    let gap = 1e9; for (const P of S6_GROOVE) for (const q of resample(P, 4)) for (const b of boxes) { const dx = Math.max(b[0] - q[0], 0, q[0] - b[2]), dy = Math.max(b[1] - q[1], 0, q[1] - b[3]); gap = Math.min(gap, Math.hypot(dx, dy)); }
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat", shift: [-4, 3] }], o, B, T1.concat(T2, T3), { groove_text_gap_px: Math.round(gap), printOpt: { grain: 0.12, cut: 6 } });
  }

  return { S6 };
})();

function A7_DRAW(ctx, o) {
  const f = +o.f;
  A6.MO.setF(f);
  if (f === 840) return Object.assign(A7_CUTS.S6(ctx, o), { f, v: "v7" });
  if (typeof A7_OPEN !== "undefined" && f >= 0 && f < A7_T.shot("S5").start) return Object.assign(A7_OPEN.draw(ctx, o), { f });
  if (typeof A7_DAWN !== "undefined" && f >= 1340 && f <= 1589) return Object.assign(A7_DAWN(ctx, o), { f });
  A6.MO.setF(Infinity);
  return A6_DRAW(ctx, o);
}
