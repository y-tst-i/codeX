// 案A+C v5 の夜明け(S9→S10、46〜53秒、コマ 1340〜1590)。部品は cand_a5.js(A5)。紙のふちは外す(全面)。
// 7秒で構図を3つ見せる(独立審査 必須修正1):
//   A 引き(1340〜1459): 手前に画面の端で切れる大きな影(坂の家の屋根と火の見櫓、高さは画面の 80%)、中=向こう岸の町、奥=薔薇の版だけの遠い町。
//     空は地平から上へ彫り取られ(彫りの前線に丸刀の跡)、1400 から淡黄のぼかし、1415 から太陽(直径 600px=画面の幅の 31%)の縁が地平から出る。
//   B 寄り(1460〜1519): 「夜が明ける」。「明」の字(高さ 620px)の日が、そのまま昇る太陽(直径 640px)の中にある=字の中の日の行き着く所。
//   C 終わり(1520〜): 太陽が昇りきった引き。空を大きく、霞(かすみ)の帯3本、題箋(画面の高さの 40%)は余白の中心。
// 刀の位置・長さ・太さは位置の hash(PR)。f は「どこまで彫ったか(どの刀を描くか)」と「どの版を刷るか」だけを決める。
// 太陽のまわりに破線の弧は描かない。水の墨の線は長さ・太さ・間を不揃いに(行と列の hash、太さは対数で散らす)。
const A5_DAWN = (() => {
  const { W, H, clamp, lerp, smooth, hash, fbm, vnoise, resample, stroke, bbox, pathOf } = AD;
  const { C, BLEED, PR, begin, plateBuf, poly, cut, cutW, wedge, groove, lens, chipEdge, setH, setHC, setV, lettersBox, carve, keepOut, letterPlate, textMargin, bokashi, print, maskOnly, inkBox } = A5;
  const B = BLEED;
  const ink = (g, pts, w, seed, o = {}) => { g.fillStyle = "#000"; cut(g, pts, w, seed, Object.assign({ entry: 0.04, exit: 0.06, jit: 0.4 }, o)); };
  const fill = (g, P, col = "#000") => { g.fillStyle = col; g.beginPath(); poly(g, P); g.fill(); };
  function fin(ctx, m, plates, o, texts, extra) { const tm = textMargin(texts, B); if (o.mask) return Object.assign(maskOnly(ctx, m), { text: tm }, extra); return Object.assign(print(ctx, m, plates, { look: o.look, B, ink: C.INK_DAWN, grain: 0.02, cut: 10 }), { text: tm }, extra); }
  // 反りのある屋根の家(左の軒 x0、幅 w、地面 base、軒の高さ eave、棟 ridge)
  function house(x0, w, base, eave, ridge, s) { const P = [[x0, base], [x0, eave + 6], [x0 - 16, eave + 10]], rl = x0 + w * 0.3, rr = x0 + w * 0.7; for (let i = 1; i <= 8; i++) { const t = i / 8; P.push([lerp(x0 - 16, rl, t), eave + 10 - (eave + 10 - ridge) * Math.pow(t, 1.7)]); } P.push([rl, ridge - 8], [rr, ridge - 8]); for (let i = 0; i <= 8; i++) { const t = 1 - i / 8; P.push([lerp(x0 + w + 16, rr, t), eave + 10 - (eave + 10 - ridge) * Math.pow(t, 1.7)]); } P.push([x0 + w + 16, eave + 10], [x0 + w, eave + 6], [x0 + w, base]); return chipEdge(P, s, { big: 0.3 }); }
  // 水の墨の線(彫った紙の上に残す黒): 行と列の hash。長さは 20〜420、太さは 1〜8(対数で散らす)、間は不揃い。sunX の真下は少ない
  function waterInk(g, cutId, y0, y1, x0, x1, sunX, visible) {
    let y = y0, k = 0;
    while (y < y1) {
      const Rr = PR(cutId, 20, k), d = (y - y0) / (y1 - y0 + 1); let x = x0 - 40 + Rr() * 60, j = 0;
      while (x < x1) { const R = PR(cutId, 21, k, j++), len = 20 + 400 * Math.pow(R(), 2.2) * (0.5 + d), w = Math.exp(lerp(Math.log(1.0), Math.log(8), Math.pow(R(), 1.6))) * (0.6 + d), mid = x + len / 2, sun = sunX == null ? 0 : Math.pow(clamp(1 - Math.abs(mid - sunX) / (120 + d * 260)), 1.2); if (R() < (0.2 + 0.55 * d) * (1 - 0.85 * sun) && visible(mid, y)) ink(g, [[x, y], [x + len * 0.5, y + (R() - 0.5) * 2.5], [x + len, y + (R() - 0.5) * 2]], w, cutId * 9000 + k * 131 + j, { entry: 0.15, exit: 0.5, jit: 0.6 }); x += len + (14 + 160 * Math.pow(R(), 1.5)) * (1.2 - d); }
      y += 5 + 26 * Math.pow(Rr(), 2) * (0.5 + d) + d * 6; k++;
    }
  }
  // 太陽の映り(琥珀のレンズ形の刀)。水の上に、真下ほど密
  function sunReflect(pg, cutId, sx, y0, y1, half0, half1, reach = 1) {
    let y = y0 + 4, k = 0;
    while (y < lerp(y0, y1, reach)) { const d = (y - y0) / (y1 - y0), half = lerp(half0, half1, d), cx = sx + Math.sin(y * 0.05) * 10 * d; let x = cx - half, j = 0; while (x < cx + half) { const R = PR(cutId, 30, k, j++), cc = 1 - Math.abs(x - cx) / half, len = lerp(10, 80, cc) * (0.6 + 0.6 * R()); if (R() < 0.2 + 0.7 * cc) lens(pg, x + len / 2, y, len / 2, lerp(3, 7, d) * (0.6 + 0.6 * cc), cutId * 7000 + k * 97 + j); x += len + lerp(28, 6, cc) * (0.5 + R()); } y += 7 + d * 10; k++; }
  }
  // 霞・夜の名残の雲(手で決めた帯。両端が丸く細る)
  function band(g, x0, x1, y, th, seed) { const P = []; for (let x = x0; x <= x1; x += 12) P.push([x, y + 5 * Math.sin((x - x0) * 0.006 + seed)]); g.beginPath(); stroke(g, P, (u, i) => th * Math.pow(Math.sin(Math.PI * clamp(u * 1.02)), 0.45) * (0.55 + 0.9 * vnoise(i * 0.06, seed * 0.13, 8)), { jit: 1.0, seed }); g.fill(); }

  // =====================================================================
  // A 引き(1340〜1459)
  // =====================================================================
  function compA(ctx, o) {
    const f = o.f, [m, g] = begin(B), HZ = 700, SR = 300, SX = 1196;
    const cp = smooth((f - 1340) / 100), wp = smooth((f - 1352) / 92), rise = f < 1405 ? -1 : smooth((f - 1405) / 55), sunOn = rise >= 0;
    const SY = HZ + SR * (1 - 0.62 * Math.max(0, rise)), honey = f >= 1400, rose = f >= 1448;
    const ycut = lerp(HZ + 10, -230, cp), FRONT = 190;
    // 空: 地平から ycut まで彫り取った紙。前線の丸刀の跡は位置の hash(行 k・列 j)で、前線に近いほど多い(一度彫った刀は残る)
    g.fillStyle = "#fff"; g.fillRect(0, ycut, W, HZ - ycut + 12);
    for (let k = 0, y = HZ; y > -260; k++, y -= 8) { for (let j = 0; j < 34; j++) { const R = PR(10, 1, k, j), x = j * 60 - 40 + R() * 50, yy = y + R() * 8, t = (yy - (ycut - FRONT)) / FRONT; if (t <= 0 || t >= 1 || R() > Math.pow(t, 0.8)) continue; const len = (60 + 220 * R()) * (0.5 + t), w = lerp(2, 11, t) * (0.6 + 0.6 * R()); g.fillStyle = "#fff"; cut(g, [[x, yy], [x + len * 0.5, yy + (R() - 0.5) * 4], [x + len, yy + (R() - 0.5) * 3]], w, 10000 + k * 61 + j, { entry: 0.3, exit: 0.6, jit: 1.0 }); } }
    // 夜の名残の雲(手で決めた4本の墨の帯。彫った所にだけ見える)
    for (const [x0, x1, y, th, sd] of [[860, 1740, 248, 15, 1], [260, 1080, 336, 9, 2], [1320, 1960, 430, 20, 3], [560, 1240, 528, 7, 4]]) { g.save(); g.beginPath(); g.rect(0, ycut - FRONT, W, H); g.clip(); g.fillStyle = "#000"; band(g, x0, x1, y, th, 10100 + sd); g.restore(); } // 雲は彫り残す木: 前線の丸刀の跡より先に置く
    // 水: 岸の側から下へ彫り取る(前線は手前へ)。墨の線は位置の hash
    const dayY = lerp(HZ + 14, H + 80, wp);
    g.fillStyle = "#fff"; g.fillRect(0, HZ + 14, W, dayY - HZ - 14);
    for (let k = 0, y = HZ + 14; y < H + 60; k++, y += 7) { for (let j = 0; j < 24; j++) { const R = PR(10, 3, k, j), x = 560 + j * 64 + R() * 40, t = 1 - (y - dayY) / 110; if (y < dayY || t <= 0 || R() > t) continue; g.fillStyle = "#fff"; lens(g, x, y, (20 + 90 * R()) * (0.4 + t), lerp(2, 6, t), 10300 + k * 41 + j); } }
    waterInk(g, 10, HZ + 22, H + 10, 600, W + 20, SX, (x, y) => y < dayY + 120); // 墨の線は彫り残す木なので、彫りの前線より先にも最初からある(彫りが進んでも増えたり動いたりしない)
    // 中: 向こう岸の町(地平の上。家の大きさ・屋根を変え、重ねる。右は丘に上る)
    // 型: g=切妻(反り)、f=陸屋根のビル、t=木(丸い塊)、s=片流れ、c=煙突つきの工場。幅・高さは手で決めた(同じ形を続けない)
    const MID = [["s", 612, 60, 22], ["g", 668, 70, 34], ["f", 744, 54, 70], ["t", 806, 44, 40], ["g", 852, 92, 30], ["c", 952, 120, 40], ["f", 1418, 64, 86], ["g", 1484, 84, 44], ["t", 1572, 50, 58], ["f", 1626, 96, 120], ["g", 1724, 110, 60], ["s", 1836, 100, 70]];
    const hill = (x) => HZ + 6 - 120 * smooth((x - 1380) / 540);
    fill(g, (() => { const P = [[600, HZ + 14]]; for (let x = 600; x <= W + 10; x += 10) P.push([x, x < 1380 ? HZ + 4 : hill(x)]); P.push([W + 10, HZ + 14]); return P; })());
    const mids = MID.map(([t, x, w, h], i) => { const b = (x < 1380 ? HZ + 6 : hill(x + w / 2)) + 4, s2 = 10400 + i; if (t === "g") return house(x, w, b, b - h * 0.6, b - h, s2); if (t === "f") return chipEdge([[x, b], [x, b - h], [x + w * 0.2, b - h], [x + w * 0.2, b - h - 10], [x + w * 0.45, b - h - 10], [x + w * 0.45, b - h], [x + w, b - h], [x + w, b]], s2, { big: 0.4 }); if (t === "s") return chipEdge([[x, b], [x, b - h], [x + w, b - h * 0.55], [x + w, b]], s2); if (t === "c") return chipEdge([[x, b], [x, b - h], [x + w * 0.25, b - h - 18], [x + w * 0.25, b - h], [x + w * 0.5, b - h - 18], [x + w * 0.5, b - h], [x + w * 0.62, b - h], [x + w * 0.62, b - h - 96], [x + w * 0.7, b - h - 96], [x + w * 0.7, b - h], [x + w, b - h], [x + w, b]], s2); const P = []; for (let a = 0; a <= 6.3; a += 0.25) { const r = 1 + 0.18 * (fbm(Math.cos(a) * 2, Math.sin(a) * 2, s2, 2) - 0.5) * 2; P.push([x + w / 2 + Math.cos(a) * w * 0.5 * r, b - h * 0.55 + Math.sin(a) * h * 0.5 * r]); } P.push([x + w / 2 + 3, b], [x + w / 2 - 3, b]); return P; });
    mids.forEach((P) => fill(g, P));
    // 手前: 坂(左下から)、大きな家(左の端で切れる)、火の見櫓(高さ 640px)
    const slope = (x) => 560 + 0.42 * x;
    fill(g, (() => { const P = [[-20, H + 20], [-20, slope(-20)]]; for (let x = 0; x <= 1060; x += 10) P.push([x, slope(x) + 6 * Math.sin(x * 0.02)]); P.push([1060, H + 20]); return P; })());
    const roofR = (t) => [lerp(150, 438, t), lerp(288, 606, t) + 46 * Math.sin(Math.PI * t * 0.95) - (t > 0.9 ? (t - 0.9) * 160 : 0)]; // 反りのある妻の屋根(右)
    const bigHouse = chipEdge([[-30, 820], [-30, 452], [96, 320], [138, 290], [144, 268], [156, 266], [162, 288]].concat([0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.93, 1].map(roofR)).concat([[430, 626], [396, 630], [396, 820]]), 10500, { big: 0.3 }); fill(g, bigHouse);
    const TX = 600, TB = slope(TX) + 4, TT = 150, lx = (y, s) => TX + s * lerp(58, 16, (TB - y) / (TB - TT));
    ink(g, [[lx(TB, -1), TB], [lx(TT, -1), TT]], 9, 10601); ink(g, [[lx(TB, 1), TB], [lx(TT, 1), TT]], 9, 10602);
    const lv = [TB, TB - 120, TB - 230, TB - 330, TB - 410, TB - 480, TT + 20];
    for (let i = 0; i < lv.length - 1; i++) { ink(g, [[lx(lv[i], -1), lv[i]], [lx(lv[i + 1], 1), lv[i + 1]]], 3.2, 10610 + i); ink(g, [[lx(lv[i], 1), lv[i]], [lx(lv[i + 1], -1), lv[i + 1]]], 3.2, 10620 + i); ink(g, [[lx(lv[i], -1), lv[i]], [lx(lv[i], 1), lv[i]]], 4, 10630 + i); }
    fill(g, chipEdge([[TX - 34, TT + 22], [TX + 34, TT + 22], [TX + 34, TT + 2], [TX - 34, TT + 2], [TX - 34, TT + 22]], 10640)); fill(g, [[TX - 40, TT + 2], [TX - 16, TT - 22], [TX, TT - 46], [TX + 16, TT - 22], [TX + 40, TT + 2]]); ink(g, [[TX, TT - 46], [TX, TT - 76]], 4, 10641);
    // 電線: 櫓から右の端へ(太陽の上を渡る)
    const wire = (a, b, sag) => { const P = []; for (let i = 0; i <= 40; i++) { const u = i / 40; P.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + sag * 4 * u * (1 - u)]); } return P; };
    ink(g, wire([TX + 20, TT + 60], [W + 30, 300], 120), 2.4, 10650); ink(g, wire([TX + 20, TT + 90], [W + 30, 340], 140), 2.0, 10651);
    // 光の縁: 太陽に向く手前の辺(右の辺と右へ下る屋根)に刀。太陽が出てから太く
    const rimW = sunOn ? 4.2 : 2.2; g.fillStyle = "#fff";
    for (const [P, sd] of [[bigHouse, 10700]]) for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; if (b[0] > a[0] + 3 && b[1] > a[1] + 1 && a[1] < 740) { g.save(); g.beginPath(); g.rect(0, ycut, W, H); g.clip(); cut(g, [a, b], rimW, sd + k, { entry: 0.1, exit: 0.3, jit: 0.5 }); g.restore(); } }
    { const P = []; for (let x = 400; x <= 1060; x += 10) P.push([x, slope(x) + 6 * Math.sin(x * 0.02) + 2]); cut(g, P, rimW, 10710, { entry: 0.05, exit: 0.4, jit: 0.6 }); }
    // 屋根の瓦の筋: 右の屋根の面に、軒の線に平行な刀(手で決めた4本。太陽が出てから太く)
    for (const [d, w, sd] of [[18, 3.4, 10720], [38, 2.6, 10721], [62, 2.0, 10722], [92, 1.4, 10723]]) { const P = []; for (let t = 0.12; t <= 0.9; t += 0.04) { const [x, y] = roofR(t); P.push([x - d * 0.7, y + d * 0.55]); } g.save(); g.beginPath(); g.rect(0, ycut, W, H); g.clip(); cut(g, P, w * (sunOn ? 1.25 : 0.8), sd, { entry: 0.2, exit: 0.3, jit: 0.5 }); g.restore(); } // 彫った所だけに見せる(線の形は進みに依らない)
    g.restore();
    // 版
    const plates = [];
    if (rose) { const [a, ag] = plateBuf("plR"); bokashi(ag, 0, 0, 0, HZ, [[0, 0.95], [0.5, 0.55], [1, 0]]); ag.fillStyle = "#000"; const rf = PR(10, 40, 0); for (let x = 1000, k = 0; x < 1500; k++) { const R = PR(10, 41, k), w = 14 + 30 * R(), h = 8 + 26 * R(); ag.beginPath(); poly(ag, [[x, HZ + 4], [x, HZ - h], [x + w / 2, HZ - h - 10 * R()], [x + w, HZ - h], [x + w, HZ + 4]]); ag.fill(); x += w + 4 + 24 * R(); } plates.push({ c: a, color: C.ROSE, kind: "bokashi", shift: [-2, 1] }); }
    if (honey) { const [h, hg] = plateBuf("plH"); bokashi(hg, 0, HZ, 0, 120, [[0, 1], [0.45, 0.7], [1, 0]]); bokashi(hg, 0, HZ + 14, 0, H, [[0, 0.8], [1, 0.15]], (gg) => gg.rect(0, HZ + 14, W, H)); plates.push({ c: h, color: C.HONEY, kind: "bokashi", shift: [2, -1] }); }
    const [am, amg] = plateBuf("plA");
    if (sunOn) { amg.save(); amg.beginPath(); amg.rect(0, 0, W, HZ + 6); amg.clip(); amg.beginPath(); amg.arc(SX, SY, SR, 0, 7); amg.fill(); amg.restore(); sunReflect(amg, 10, SX, HZ + 16, H, 70, 230, lerp(0.3, 1, rise)); plates.push({ c: am, color: C.AMBER, kind: "flat", shift: [-3, 2] }); }
    return fin(ctx, m, plates, o, [], { comp: "A", carve_sky: +cp.toFixed(3), carve_water: +wp.toFixed(3), sun: +Math.max(0, rise).toFixed(2), sun_diam_px: 2 * SR, fg_height_px: Math.round(H - (TT - 76)) });
  }

  // =====================================================================
  // B 寄り(1460〜1519)「夜が明ける」: 明の日 = 昇る太陽
  // =====================================================================
  function compB(ctx, o) {
    const f = o.f, [m, g] = begin(B), HZ = 900, SR = 322, show = f >= 1462;
    const E = 690, SC = [760, 606 - 30 * smooth((f - 1460) / 60)];
    // 「明」: 日(輪郭 1・3・5)の中心を太陽の中心に。日の墨の箱の中心 = (0.268, -0.455)em
    const MX0 = SC[0] - 0.268 * E, MB = SC[1] + 0.455 * E, M = A5.letter("SMB", "明", MX0, MB, E);
    const T1 = setH("SMB", "夜が", 150, 820, 150, 0.1), T2 = setH("SMB", "ける", 1290, 820, 150, 0.1), T = show ? T1.concat(T2) : [];
    // 空と水: 全部彫り取る(紙)。夜の名残は上の端の墨の帯2本だけ
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#000"; band(g, -40, 900, 54, 26, 11001); band(g, 1100, 1980, 96, 14, 11002);
    // 奥: 遠い町は薔薇の版だけ(マスクには描かない)/中: 地平の町(黒、低い)
    const mid = []; for (let x = -20, k = 0; x < W + 20; k++) { const R = PR(11, 1, k), w = 20 + 60 * R(), h = 6 + 26 * R() * (x > 1100 ? 1.4 : 1); mid.push(chipEdge(R() < 0.5 ? [[x, HZ + 6], [x, HZ - h], [x + w * 0.5, HZ - h - 8 - 8 * R()], [x + w, HZ - h], [x + w, HZ + 6]] : [[x, HZ + 6], [x, HZ - h], [x + w, HZ - h - 4 * (R() - 0.5)], [x + w, HZ + 6]], 11100 + k, { big: 0.2 })); x += w + (R() < 0.3 ? 18 * R() : -2); }
    mid.forEach((P) => fill(g, P)); g.fillStyle = "#000"; g.fillRect(-10, HZ + 2, W + 20, 12);
    // 水の墨の線(太陽の真下は少ない)
    waterInk(g, 11, HZ + 20, H + 10, -20, W + 20, SC[0], () => true);
    // 手前: 右上から垂れる松の枝(画面の端で切れる)
    const branch = [[W + 20, 150], [1820, 176], [1730, 236], [1660, 262], [1590, 330]];
    g.fillStyle = "#000"; g.beginPath(); stroke(g, resample(branch, 4), (u) => lerp(34, 9, u), { jit: 2, seed: 11201 }); g.fill(); g.beginPath(); stroke(g, resample([[1760, 214], [1720, 120], [1700, 60]], 4), (u) => lerp(14, 5, u), { jit: 1.5, seed: 11202 }); g.fill();
    const needles = (cx, cy, rx, ry, n, sd) => { for (let k = 0; k < n; k++) { const a = Math.PI * (0.05 + 0.9 * (k / (n - 1))) + 0.04 * (hash(k, 1, sd) - 0.5), l = 0.8 + 0.25 * hash(k, 2, sd); g.beginPath(); stroke(g, [[cx, cy], [cx + Math.cos(a + Math.PI) * rx * l * 0.5, cy - Math.sin(a) * ry * l * 0.5], [cx + Math.cos(a + Math.PI) * rx * l, cy - Math.sin(a) * ry * l]], (u) => lerp(5, 1.4, u), { jit: 0.3, seed: sd + k }); g.fill(); } };
    for (const [cx, cy, rx, ry, n, sd] of [[1640, 300, 130, 70, 17, 11210], [1780, 196, 150, 80, 19, 11230], [1712, 92, 110, 60, 15, 11250], [1900, 150, 120, 70, 15, 11270]]) { needles(cx, cy, rx, ry, n, sd); g.save(); g.translate(cx, cy); g.scale(1, -1); g.translate(-cx, -cy); needles(cx, cy, rx * 0.8, ry * 0.45, n - 4, sd + 100); g.restore(); }
    // 字: 明は墨(彫り残し)。夜が・ける は墨の字
    if (show) keepOut(g, [M].concat(T), 2);
    g.restore();
    // 版: 薔薇(上から)、淡黄(地平から)、琥珀(太陽・映り)
    const [a, ag] = plateBuf("plR"); bokashi(ag, 0, 0, 0, HZ, [[0, 1], [0.45, 0.6], [0.85, 0.05], [1, 0]]); ag.fillStyle = "#000"; for (let x = 1560, k = 0; x < W + 20; k++) { const R = PR(11, 41, k), w = 30 + 60 * R(), h = 20 + 34 * R(); ag.beginPath(); poly(ag, [[x, HZ + 4], [x, HZ - h], [x + w * 0.5, HZ - h - 30 * R()], [x + w, HZ - h], [x + w, HZ + 4]]); ag.fill(); x += w - 4; } // 奥: 右の遠い丘の町(薔薇の版だけ)
    const [h, hg] = plateBuf("plH"); bokashi(hg, 0, HZ, 0, 160, [[0, 1], [0.5, 0.75], [1, 0]]); bokashi(hg, 0, HZ + 10, 0, H, [[0, 0.85], [1, 0.25]], (gg) => gg.rect(0, HZ + 10, W, H));
    const [am, amg] = plateBuf("plA"); amg.save(); amg.beginPath(); amg.rect(0, 0, W, HZ + 4); amg.clip(); amg.beginPath(); amg.arc(SC[0], SC[1], SR, 0, 7); amg.fill(); amg.restore(); sunReflect(amg, 11, SC[0], HZ + 14, H, 120, 300);
    for (const [pc, pgc] of [[a, ag], [h, hg]]) { pgc.globalCompositeOperation = "destination-out"; pgc.beginPath(); pgc.arc(SC[0], SC[1], SR + 2, 0, 7); pgc.fill(); pgc.globalCompositeOperation = "source-over"; }
    return fin(ctx, m, [{ c: a, color: C.ROSE, kind: "bokashi", shift: [-2, 1] }, { c: h, color: C.HONEY, kind: "bokashi", shift: [2, -1] }, { c: am, color: C.AMBER, kind: "flat", shift: [-3, 2] }], o, show ? [M].concat(T) : [], { comp: "B", sun_diam_px: 2 * SR, ming_em_px: E });
  }

  // =====================================================================
  // C 終わり(1520〜): 太陽が昇りきった引き。空を大きく、霞の帯3本、題箋は余白の中心(高さ 432px=画面の 40%)
  // =====================================================================
  function compC(ctx, o) {
    const f = o.f, [m, g] = begin(B), HZ = 940, SR = 300, SC = [1380, 380 - 20 * smooth((f - 1520) / 70)], title = f >= 1530;
    const CW = 176, CH = 432, CX = 600, CY = 470, CART = [CX - CW / 2, CY - CH / 2, CX + CW / 2, CY + CH / 2];
    const TT = title ? setV("SMB", "夜明けの回路", CX, CART[1] + 36, 56, 0.08) : [];
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    // 遠い町(地平、低い黒)と、手前の岸(左下の黒い土手と葦。画面の端で切れる)
    const mid = []; for (let x = -20, k = 0; x < W + 20; k++) { const R = PR(12, 1, k), w = 14 + 40 * R(), h = 4 + 16 * R(); mid.push([[x, HZ + 6], [x, HZ - h], [x + w * 0.5, HZ - h - 6 * R()], [x + w, HZ - h], [x + w, HZ + 6]]); x += w + (R() < 0.3 ? 14 * R() : -2); }
    mid.forEach((P) => fill(g, P)); g.fillStyle = "#000"; g.fillRect(-10, HZ + 2, W + 20, 8);
    waterInk(g, 12, HZ + 16, H + 10, 700, W + 20, SC[0], () => true);
    // 手前: 左下の丘(A の坂と同じ場所を遠くから)と小さな火の見櫓、家の屋根。画面の端で切れる
    const hillC = (x) => 820 + Math.pow(Math.max(0, x) / 820, 1.6) * 280;
    fill(g, (() => { const P = [[-20, H + 20], [-20, hillC(0)]]; for (let x = 0; x <= 840; x += 10) P.push([x, hillC(x) + 4 * Math.sin(x * 0.03)]); P.push([860, H + 20]); return P; })());
    fill(g, house(-40, 200, hillC(150) + 30, hillC(150) - 60, hillC(150) - 130, 12050));
    const TX = 330, TB = hillC(TX) + 4, TT2 = TB - 270, lx = (y, s2) => TX + s2 * lerp(26, 8, (TB - y) / (TB - TT2));
    ink(g, [[lx(TB, -1), TB], [lx(TT2, -1), TT2]], 5, 12061); ink(g, [[lx(TB, 1), TB], [lx(TT2, 1), TT2]], 5, 12062);
    for (let i = 0; i < 4; i++) { const y0 = TB - i * 64, y1 = TB - (i + 1) * 64; ink(g, [[lx(y0, -1), y0], [lx(y1, 1), y1]], 2, 12063 + i); ink(g, [[lx(y0, 1), y0], [lx(y1, -1), y1]], 2, 12067 + i); }
    fill(g, [[TX - 18, TT2 + 4], [TX, TT2 - 22], [TX + 18, TT2 + 4]]);
    // 題箋: 白い紙の短冊に二重の墨の枠、縦組みの題(明の日=琥珀)、下に印
    if (title) {
      const rect = (a, b, c, d, w, k) => { ink(g, [[a, b], [c, b]], w, k); ink(g, [[c, b], [c, d]], w, k + 1); ink(g, [[c, d], [a, d]], w, k + 2); ink(g, [[a, d], [a, b]], w, k + 3); };
      rect(CART[0], CART[1], CART[2], CART[3], 6, 12200); rect(CART[0] + 11, CART[1] + 11, CART[2] - 11, CART[3] - 11, 2.2, 12210);
      keepOut(g, TT, 2);
    }
    g.restore();
    // 霞の帯(手で決めた3本): 色版を抜いて紙のクリームで見せる
    const KASUMI = [[700, 2000, 590, 58, 1], [-80, 900, 300, 40, 2], [980, 1700, 830, 30, 3]];
    const [a, ag] = plateBuf("plR"); bokashi(ag, 0, 0, 0, HZ, [[0, 1], [0.4, 0.62], [0.8, 0.12], [1, 0]]);
    const [h, hg] = plateBuf("plH"); bokashi(hg, 0, HZ, 0, 100, [[0, 1], [0.55, 0.6], [1, 0.1]]); bokashi(hg, 0, HZ + 10, 0, H, [[0, 0.85], [1, 0.25]], (gg) => gg.rect(0, HZ + 10, W, H));
    const [am, amg] = plateBuf("plA"); amg.beginPath(); amg.arc(SC[0], SC[1], SR, 0, 7); amg.fill(); sunReflect(amg, 12, SC[0], HZ + 14, H, 60, 180);
    for (const pgc of [ag, hg]) { pgc.globalCompositeOperation = "destination-out"; pgc.beginPath(); pgc.arc(SC[0], SC[1], SR + 2, 0, 7); pgc.fill(); pgc.globalCompositeOperation = "source-over"; } // 太陽は琥珀だけ(薔薇を重ねない)
    for (const pgc of [ag, hg, amg]) { pgc.globalCompositeOperation = "destination-out"; for (const [x0, x1, y, th, sd] of KASUMI) band(pgc, x0, x1, y, th, 12300 + sd); if (title) pgc.fillRect(CART[0] - 2, CART[1] - 2, CW + 4, CH + 4); pgc.globalCompositeOperation = "source-over"; }
    if (title) { letterPlate(amg, TT[1], { rect: [0.0, -0.80, 0.40, -0.10] }); const sx = CX - 34, sy = CART[3] + 26; amg.fillRect(sx, sy, 68, 68); amg.globalCompositeOperation = "destination-out"; carve(amg, setHC("SMB", "灯", sx + 34, sy + 56, 50), 12400, "#000"); amg.globalCompositeOperation = "source-over"; }
    return fin(ctx, m, [{ c: a, color: C.ROSE, kind: "bokashi", shift: [-2, 1] }, { c: h, color: C.HONEY, kind: "bokashi", shift: [2, -1] }, { c: am, color: C.AMBER, kind: "flat", shift: [-3, 2] }], o, TT, { comp: "C", sun_diam_px: 2 * SR, cartouche_h_px: CH });
  }

  return function draw(ctx, o) { const f = +o.f; if (f < 1460) return compA(ctx, o); if (f < 1520) return compB(ctx, o); return compC(ctx, o); };
})();
