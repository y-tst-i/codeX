// 案A+C v7(動きの本制作 第1段)の夜明け 1340〜1589(44.7〜53秒、曲の終わりまで)。cand_a6_dawn.js(v6)を写して、曲のコマ番号 f の純関数の動きにした。
// 部品は cand_a7.js(A6 と MO)、時刻は M1_TIMING と A7_T(cand_a7_open.js)の規則。v6 から変えた所:
//   ・構図の切り替え: A 1340〜1430 / B 1431〜1519 / C 1520〜(v6 は B が 1460 から)。歌詞「夜」の語頭 1431(要確認)で字を刷り始めるため、B を語頭に合わせた。
//   ・1340(区間の最強 0.93・低音 0.87)の衝撃: 新しい紙に、墨の版だけが紙と色版から 14px ずれて刷られ(版ずれ)、2コマで戻る。同じコマで空の最初の一刀(地平の帯)。
//     空はアクセントごとに押して地平から上へ彫り取る(彫り取ると、町・櫓・給水塔の影が空から立ち上がる)。
//   ・信号: 溝(道の形)は最初から全部彫ってある。琥珀は「届いた所まで」だけ刷る(アクセントごとに押して進む)。1402 で地平の鉄塔に届き、そのコマで太陽の縁を刷る。
//   ・太陽: v6 は f で滑らかに昇っていた(版が動く=カメラの動きに近い)。v7 は昇る位置をアクセントごとの「刷り直し」で段に上げる(1402 縁 → 1415 → 1425)。B・C の太陽は動かさない。
//   ・B: 字(夜が・明・ける)は墨の文字版をばれんで刷る(夜 1431、が 1456、明 は 1456〜 の最強 1462、け・る は推定)。電線の琥珀は 明 を刷った後に日の中へ届く(1481)。
//     夜の名残の雲は、横の刀で少しずつさらわれて細る(間を埋める)。
//   ・C: 最初の窓(S2 の煉瓦の建物)に琥珀を刷り、信号が窓 → 丘 → 櫓 → 電線 → 地平の鉄塔まで通る(1557 で届く)。題箋は最初から白い札(色版を刷らない所)で、
//     1538 に題を墨で刷る。1562 以後は終わりの余韻(静止。holds_partB.json に理由つきで登録)。
//   ・v6 の A の薔薇の版にあった、地平の家の形の濃い四角(1448〜 に太陽の上に出ていた)は外した。
// 以下は cand_a6_dawn.js の注記:
// 案A+C v6 の夜明け(S9→S10、46〜53秒、コマ 1340〜1590)。部品は cand_a6.js(A6)。紙のふちは外す(全面)。
// v6(INDEPENDENT_REVIEW_board_v3 必須1): 夜明けに「信号」と「この町」を戻す。
//   ・信号の道: S9 の読点から下へ落ちた溝が、画面の下から坂を上り、火の見櫓の脚を上り、電線に乗って、地平の鉄塔へ届く(琥珀の溝)。
//     道の形は f に依らず固定。f は「どこまで届いたか(長さ s)」だけを決める(signalBuf)。1380 は電線の手前まで、1430 は鉄塔に届いて太陽の縁が出る。
//     S10 は電線が「明」の日の左の画を横切って日の中へ入って終わる。終わり(1560)は、S2 で最初に灯った煉瓦の窓から鉄塔まで、道が全部灯っている。
//   ・町: 手前の影は S2〜S4 の工業の町(のこぎり屋根の工場・煙突・給水塔・煉瓦の建物)。松・反りの屋根(寺のような屋根)は外した。
//   ・太陽と霞と雲: ベクターの円・なめらかな葉巻形をやめ、丸刀でえぐった縁(scallop)。色版のふちは刷りの層で紙の繊維に沿って欠ける。
//     太陽を抜いた薔薇・淡黄の版は、別の刀(seed)で 2px 小さく抜く(版の重なりの幅が場所で変わる。クリームの細い線も一様な濃い縁も出さない)。
//   ・1380 の彫り取った空には、刀の跡(彫り残しの細い墨。太陽の下の一点を中心にした弧に沿う)を残す。
//   ・終わりの題: 題箋は残し、落款(印)は外した。
// 刀の位置・長さ・太さは位置の hash(PR)。f は「どこまで彫ったか」「どこまで信号が届いたか」「どの版を刷るか」だけを決める。
const A7_DAWN = (() => {
  const { W, H, clamp, lerp, smooth, hash, fbm, vnoise, resample, stroke, bbox, pathOf } = AD;
  const { MO, C, BLEED, PR, begin, plateBuf, poly, cut, cutW, wedge, groove, lens, chipEdge, setH, setHC, setV, lettersBox, carve, keepOut, letterPlate, textMargin, bokashi, print, maskOnly, inkBox, scallop, bandPoly, polyLen, signalBuf } = A6;
  const B = BLEED;
  const ink = (g, pts, w, seed, o = {}) => { g.fillStyle = "#000"; cut(g, pts, w, seed, Object.assign({ entry: 0.04, exit: 0.06, jit: 0.4 }, o)); };
  const fill = (g, P, col = "#000") => { g.fillStyle = col; g.beginPath(); poly(g, P); g.fill(); };
  function fin(ctx, m, plates, o, texts, extra, popt = {}) { const tm = textMargin(texts, B); if (o.mask) return Object.assign(maskOnly(ctx, m), { text: tm }, extra); return Object.assign(print(ctx, m, plates, Object.assign({ look: o.look, B, ink: C.INK_DAWN, grain: 0.02, cut: 10 }, popt, o.sheet == null ? {} : { sheet: o.sheet })), { text: tm }, extra); }
  const { getF, pushProg, cutT, baren } = MO; const { accIn, strongest, firstAcc, word, phrase } = A7_T;
  const pressIn = (pg, c0, dir, seed) => baren(pg, [0, 0, W, H], c0, dir, seed, { q0: 0.62, dq: 0.3, mottle: false, rag: 0.12 });
  // 墨の文字版(字・題箋を墨で刷る。紙・色版の上に重ねて刷る)。at のコマからばれんで dir へ
  function textPlate(name, draws) { const [c, g] = plateBuf(name); g.fillStyle = "#000"; for (const [fn, rect, at, dir, seed] of draws) { const [t, tg] = plateBuf(name + "T"); tg.fillStyle = "#000"; fn(tg); if (getF() < at) continue; baren(tg, rect, at, dir, seed); g.drawImage(t, 0, 0); } return c; }
  // 切妻の家(反りなし。S4 の坂の家と同じ型)
  const gable = (x0, w, base, eave, ridge, s) => chipEdge([[x0, base], [x0, eave], [x0 - 10, eave + 5], [x0 + w * 0.5, ridge], [x0 + w + 10, eave + 5], [x0 + w, eave], [x0 + w, base]], s, { big: 0.3 });
  // 水の墨の線(彫った紙の上に残す黒): 行と列の hash
  function waterInk(g, cutId, y0, y1, x0, x1, sunX, visible) {
    let y = y0, k = 0;
    while (y < y1) {
      const Rr = PR(cutId, 20, k), d = (y - y0) / (y1 - y0 + 1); let x = x0 - 40 + Rr() * 60, j = 0;
      while (x < x1) { const R = PR(cutId, 21, k, j++), len = 20 + 400 * Math.pow(R(), 2.2) * (0.5 + d), w = Math.exp(lerp(Math.log(1.0), Math.log(8), Math.pow(R(), 1.6))) * (0.6 + d), mid = x + len / 2, sun = sunX == null ? 0 : Math.pow(clamp(1 - Math.abs(mid - sunX) / (120 + d * 260)), 1.2); if (R() < (0.2 + 0.55 * d) * (1 - 0.85 * sun) && visible(mid, y)) ink(g, [[x, y], [x + len * 0.5, y + (R() - 0.5) * 2.5], [x + len, y + (R() - 0.5) * 2]], w, cutId * 9000 + k * 131 + j, { entry: 0.15, exit: 0.5, jit: 0.6 }); x += len + (14 + 160 * Math.pow(R(), 1.5)) * (1.2 - d); }
      y += 5 + 26 * Math.pow(Rr(), 2) * (0.5 + d) + d * 6; k++;
    }
  }
  // 太陽の映り(琥珀のレンズ形の刀)
  function sunReflect(pg, cutId, sx, y0, y1, half0, half1, reach = 1) {
    let y = y0 + 4, k = 0;
    while (y < lerp(y0, y1, reach)) { const d = (y - y0) / (y1 - y0), half = lerp(half0, half1, d), cx = sx + Math.sin(y * 0.05) * 10 * d; let x = cx - half, j = 0; while (x < cx + half) { const R = PR(cutId, 30, k, j++), cc = 1 - Math.abs(x - cx) / half, len = lerp(10, 80, cc) * (0.6 + 0.6 * R()); if (R() < 0.2 + 0.7 * cc) lens(pg, x + len / 2, y, len / 2, lerp(3, 7, d) * (0.6 + 0.6 * cc), cutId * 7000 + k * 97 + j); x += len + lerp(28, 6, cc) * (0.5 + R()); } y += 7 + d * 10; k++; }
  }
  // 丸刀でえぐった縁の太陽(円を区間ごとの浅い弧に)。shrink で小さく(他の版を抜く時)
  const sunPoly = (cx, cy, r, seed, shrink = 0) => { const P = []; for (let a = 0; a < 6.283; a += 0.02) P.push([cx + Math.cos(a) * (r - shrink), cy + Math.sin(a) * (r - shrink)]); return scallop(P, seed, { step: [70, 150], depth: [1.2, 3.4], chip: 0.04 }); };
  // 雲・霞: 帯の外形を丸刀のえぐりに
  const cloud = (x0, x1, y, th, seed) => scallop(bandPoly(x0, x1, y, th, seed), seed + 50, { step: [40, 120], depth: [1, Math.max(2, th * 0.1)], chip: 0.06 });
  // 霞: 丸刀で横に何度かさらった跡の重なり(長さ 220〜560px のレンズ形を、上下にずらして 5〜7 本)。1本の葉巻形にしない
  function haze(x0, x1, y, th, seed) { const out = []; const n = 5 + Math.floor(3 * hash(1, 2, seed)); for (let k = 0; k < n; k++) { const R = PR(seed, 90, k), len = 220 + 340 * R(), cx = lerp(x0 + len * 0.4, x1 - len * 0.4, (k + 0.5 * R()) / n), cy = y + (R() - 0.5) * th * 0.9, t = th * (0.35 + 0.65 * R()), P = []; for (let i = 0; i <= 24; i++) { const u = i / 24; P.push([cx - len / 2 + len * u, cy - t / 2 * Math.pow(Math.sin(Math.PI * u), 0.6) + 4 * Math.sin(u * 3 + k)]); } for (let i = 24; i >= 0; i--) { const u = i / 24; P.push([cx - len / 2 + len * u, cy + t / 2 * Math.pow(Math.sin(Math.PI * u), 0.8) + 4 * Math.sin(u * 3 + k)]); } out.push(scallop(P, seed * 10 + k, { step: [40, 110], depth: [0.8, 2.6], chip: 0.05 })); } return out; }
  // 電線(たるみ sag)の点列
  const wire = (a, b, sag, n = 48) => { const P = []; for (let i = 0; i <= n; i++) { const u = i / n; P.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + sag * 4 * u * (1 - u)]); } return P; };
  // 火の見櫓(脚 lx、横の段 lv、上の見張り台と屋根)。脚の右(太陽の側)を信号が上る
  function tower(g, TX, TB, TT, wb, wt, legW, s, tb2 = TB) {
    const lx = (y, sd) => TX + sd * lerp(wb, wt, (TB - y) / (TB - TT));
    ink(g, [[lx(TB, -1), TB], [lx(TT, -1), TT]], legW, s + 1); ink(g, [[lx(tb2, 1), tb2], [lx(TT, 1), TT]], legW, s + 2);
    const n = 6, lv = []; for (let i = 0; i <= n; i++) lv.push(lerp(TB, TT + 20, Math.pow(i / n, 0.85)));
    for (let i = 0; i < n; i++) { ink(g, [[lx(lv[i], -1), lv[i]], [lx(lv[i + 1], 1), lv[i + 1]]], legW * 0.36, s + 10 + i); ink(g, [[lx(lv[i], 1), lv[i]], [lx(lv[i + 1], -1), lv[i + 1]]], legW * 0.36, s + 20 + i); ink(g, [[lx(lv[i], -1), lv[i]], [lx(lv[i], 1), lv[i]]], legW * 0.45, s + 30 + i); }
    const hw = wt * 2.1; fill(g, chipEdge([[TX - hw, TT + 22], [TX + hw, TT + 22], [TX + hw, TT + 2], [TX - hw, TT + 2], [TX - hw, TT + 22]], s + 40)); fill(g, [[TX - hw * 1.2, TT + 2], [TX, TT - hw * 1.35], [TX + hw * 1.2, TT + 2]]); ink(g, [[TX, TT - hw * 1.35], [TX, TT - hw * 1.35 - 30]], legW * 0.45, s + 41);
    return lx;
  }
  // 鉄塔(地平の小さい格子の塔)
  function pylon(g, PX, PB, PT, s) {
    const lx = (y, sd) => PX + sd * lerp(24, 5, (PB - y) / (PB - PT));
    ink(g, [[lx(PB, -1), PB], [lx(PT, -1), PT]], 3.6, s); ink(g, [[lx(PB, 1), PB], [lx(PT, 1), PT]], 3.6, s + 1);
    for (let i = 0; i < 4; i++) { const y0 = lerp(PB, PT, i / 4), y1 = lerp(PB, PT, (i + 1) / 4); ink(g, [[lx(y0, -1), y0], [lx(y1, 1), y1]], 1.6, s + 2 + i); ink(g, [[lx(y0, 1), y0], [lx(y1, -1), y1]], 1.6, s + 6 + i); }
    ink(g, [[PX - 30, PT + 10], [PX + 30, PT + 10]], 3.2, s + 11); ink(g, [[PX - 20, PT + 26], [PX + 20, PT + 26]], 2.6, s + 12);
    return lx;
  }
  // 煙突(下の幅 wb、上の幅 wt、上に口の帯、途中に帯1本)
  const chimney = (cx, yb, yt, wb, wt, s) => chipEdge([[cx - wb / 2, yb], [cx - wt / 2, yt + 18], [cx - wt / 2 - 5, yt + 16], [cx - wt / 2 - 5, yt], [cx + wt / 2 + 5, yt], [cx + wt / 2 + 5, yt + 16], [cx + wt / 2, yt + 18], [cx + wb / 2, yb]], s, { big: 0.25 });
  // 給水塔(S2 と同じ形を大きく): 円錐の屋根の胴と、X の筋かいの脚
  function waterTank(g, cx, top, tw, th, legB, s) {
    const T = chipEdge([[cx - tw / 2, top + th * 0.22], [cx, top - th * 0.12], [cx + tw / 2, top + th * 0.22], [cx + tw / 2 - 4, top + th], [cx - tw / 2 + 4, top + th]], s, { big: 0.3 }); fill(g, T);
    const lw = Math.max(3, tw * 0.07), lb = top + th, a = cx - tw * 0.38, b = cx + tw * 0.38, A = cx - tw * 0.46, Bx = cx + tw * 0.46;
    ink(g, [[a, lb], [A, legB]], lw, s + 1); ink(g, [[b, lb], [Bx, legB]], lw, s + 2);
    const m = lerp(lb, legB, 0.45); ink(g, [[a, lb + 6], [lerp(b, Bx, 0.45), m]], lw * 0.5, s + 3); ink(g, [[b, lb + 6], [lerp(a, A, 0.45), m]], lw * 0.5, s + 4); ink(g, [[lerp(a, A, 0.45), m], [lerp(b, Bx, 0.45), m]], lw * 0.55, s + 5);
    return T;
  }
  // 光(太陽)に向く辺だけ刀
  function rim(g, P, seed, face, w, clipY = -1e9) { g.fillStyle = "#fff"; g.save(); g.beginPath(); g.rect(0, clipY, W, H); g.clip(); for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 8 || !face(a, b)) continue; cut(g, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], w, seed + k, { entry: 0.1, exit: 0.3, jit: 0.45 }); } g.restore(); }
  // 彫り取った空に残る刀の跡: 太陽の下の一点 (cx, cy) を中心にした弧に沿う細い墨(彫り残し)。位置は (行, 列) の hash。visible(x,y) の所だけ
  function skyMarks(g, cutId, cx, cy, r0, r1, visible, dens = 1) {
    g.fillStyle = "#000";
    for (let k = 0, r = r0; r < r1; k++) { const Rr = PR(cutId, 60, k); r += 9 + 16 * Rr(); let a = -Math.PI + 0.05 + 0.1 * Rr(), j = 0;
      while (a < -0.05) { const R = PR(cutId, 61, k, j++), span = (40 + 160 * Math.pow(R(), 1.4)) / r, w = 1.6 + 3.2 * Math.pow(R(), 1.8); const am = a + span / 2, x = cx + Math.cos(am) * r * 1.25, y = cy + Math.sin(am) * r;
        if (R() < 0.06 * dens && Math.abs(am + Math.PI / 2) < 0.36 && visible(x, y)) { const P = []; for (let t = 0; t <= 1.0001; t += 0.1) { const aa = a + span * t; P.push([cx + Math.cos(aa) * r * 1.25, cy + Math.sin(aa) * r]); } cut(g, P, w, cutId * 5000 + k * 71 + j, { entry: 0.3, exit: 0.5, jit: 0.4 }); }
        a += span + (10 + 90 * R()) / r; } }
  }

  // =====================================================================
  // A 引き(1340〜1430): 手前に工業の町の影(のこぎり屋根の工場・煙突・給水塔)と火の見櫓。信号は坂→櫓→電線→地平の鉄塔
  // =====================================================================
  const HZ_A = 700, SR_A = 300, SX_A = 1196, PX_A = 1010;
  const slopeA = (x) => 560 + 0.42 * x;
  const TX_A = 600, TB_A = slopeA(600) + 4, TT_A = 150;
  const lxA = (y, s) => TX_A + s * lerp(58, 16, (TB_A - y) / (TB_A - TT_A));
  const PYL_A = { b: HZ_A + 4, t: 548 };
  const WIRE_A = wire([lxA(TT_A + 60, 1), TT_A + 60], [PX_A + 7, PYL_A.t + 12], 70);
  const SIG_A = [[812, H + 30], [748, 950], [688, slopeA(688) + 22], [lxA(TB_A, 1) + 2, slopeA(lxA(TB_A, 1)) + 4], [lxA(TT_A + 60, 1), TT_A + 60]].concat(WIRE_A.slice(1)).concat([[PX_A + 16, PYL_A.b - 30], [PX_A + 22, PYL_A.b - 2]]);
  const timesA = () => {
    const c0 = 1340, E = { c0, hit: strongest(c0 - 2, c0 + 2), end: word("夜") - 1 };
    E.carve = accIn(E.hit + 5, E.hit + 66).map((x) => x.frame30); // 空を押して彫るアクセント(1349〜1406)
    E.arrive = 1402; // 信号が鉄塔に届くコマ(統括の指定。前後のアクセント 1397・1406 の間)
    E.sigPush = accIn(E.hit + 5, E.arrive - 4).map((x) => x.frame30);
    E.sunSteps = [E.arrive].concat(accIn(E.arrive + 8, E.end - 3).sort((a, b) => b.strength - a.strength).slice(0, 2).map((x) => x.frame30).sort((a, b) => a - b));
    return E;
  };
  function compA(ctx, o) {
    const f = getF(), E = timesA(), [m, g] = begin(B), HZ = HZ_A, SR = SR_A, SX = SX_A;
    // 空を彫る進み: 衝撃のコマで最初の一刀(14%)、その後アクセントごとに押す
    const cp = pushProg([[E.hit, 0.14, 2]].concat(E.carve.map((s, i) => [s, Math.min(1, 0.14 + 0.86 * (i + 1) / E.carve.length), 6])));
    const wp = pushProg([[E.hit + 9, 0.2, 6]].concat(E.carve.slice(2).map((s, i, a) => [s + 2, Math.min(1, 0.2 + 0.8 * (i + 1) / a.length), 7])));
    const step = E.sunSteps.filter((s) => f >= s).length, rise = step === 0 ? -1 : [0.12, 0.3, 0.45][step - 1], sunOn = rise >= 0;
    const SY = HZ + SR * (1 - 0.62 * Math.max(0, rise)), honey = f >= E.arrive;
    const ycut = lerp(HZ + 10, -230, cp), FRONT = 190;
    g.fillStyle = "#fff"; g.fillRect(0, ycut, W, HZ - ycut + 12);
    // 前線の丸刀の跡(v7): v6 は前線の位置 t で刀の長さと太さが変わり、隣のコマで彫った所が墨に戻った(ちらつき)。
    // v7 は刀の形を最後の形(t=1 の長さ・太さ)に固定し、刃先を押し進めるだけにした(t が刀の出るしきい値を越えてから、t の進みの 1.5 倍で彫り切る)。前線を過ぎても描き続ける
    for (let k = 0, y = HZ; y > -260; k++, y -= 8) { for (let j = 0; j < 34; j++) { const R = PR(10, 1, k, j), x = j * 60 - 40 + R() * 50, yy = y + R() * 8, t = (yy - (ycut - FRONT)) / FRONT, tA = R(); if (t <= 0 || (yy - 24 > ycut && yy + 24 < HZ + 12) || t < Math.pow(tA, 1.25)) continue; const len = (60 + 220 * R()) * 1.5, w = 11 * (0.6 + 0.6 * R()), pp = clamp((t - Math.pow(tA, 1.25)) / Math.max(0.05, 1 - Math.pow(tA, 1.25)) * 1.5); g.fillStyle = "#fff"; MO.cutP(g, [[x, yy], [x + len * 0.5, yy + (R() - 0.5) * 4], [x + len, yy + (R() - 0.5) * 3]], w, 10000 + k * 61 + j, { entry: 0.3, exit: 0.6, jit: 1.0 }, pp); } }
    skyMarks(g, 10, SX, HZ + 380, 420, 900, (x, y) => y > 230 && y < HZ - 30, 1.6);
    for (const [x0, x1, y, th, sd] of [[860, 1740, 250, 30, 1], [1320, 1960, 432, 34, 3], [700, 1180, 520, 14, 4]]) for (const P of haze(x0, x1, y, th, 10100 + sd)) fill(g, P); // 雲は彫り残す木。v7: 前線で切らずに最初から描く(まだ彫っていない黒の中では見えない。前線で切ると、前線が上がった時に彫った所へ墨が戻った)
    const dayY = lerp(HZ + 14, H + 80, wp);
    g.fillStyle = "#fff"; g.fillRect(0, HZ + 14, W, dayY - HZ - 14);
    for (let k = 0, y = HZ + 14; y < H + 60; k++, y += 7) { for (let j = 0; j < 24; j++) { const R = PR(10, 3, k, j), x = 560 + j * 64 + R() * 40, t = Math.min(1, 1 - (y - dayY) / 110), tA = R(); if (y < dayY - 8 || t <= 0 || tA > t) continue; const hw = (20 + 90 * R()) * 1.4; g.fillStyle = "#fff"; MO.lensP(g, x, y, hw, 6, 10300 + k * 41 + j, 0, clamp((t - tA) / Math.max(0.05, 1 - tA) * 1.5)); } } // v7: 水の映りの刀も形を固定し、左から彫り進む(長さ・太さが t で変わると、隣のコマで墨に戻る画素が出た)
    waterInk(g, 10, HZ + 22, H + 10, 600, W + 20, SX, () => true); // v7: 水の墨の線は最初から(彫る前の黒の中では見えない)
    const MID = [["s", 612, 60, 22], ["g", 668, 70, 34], ["f", 744, 54, 70], ["k", 806, 50, 46], ["g", 862, 84, 30], ["c", 1418, 110, 40], ["f", 1534, 64, 86], ["g", 1600, 84, 44], ["k", 1690, 56, 70], ["f", 1756, 96, 120], ["s", 1856, 90, 70]];
    const hill = (x) => HZ + 6 - 120 * smooth((x - 1380) / 540);
    fill(g, (() => { const P = [[600, HZ + 14]]; for (let x = 600; x <= W + 10; x += 10) P.push([x, x < 1380 ? HZ + 4 : hill(x)]); P.push([W + 10, HZ + 14]); return P; })());
    MID.forEach(([t, x, w, h], i) => { const b = (x < 1380 ? HZ + 6 : hill(x + w / 2)) + 4, s2 = 10400 + i;
      if (t === "g") fill(g, gable(x, w, b, b - h * 0.6, b - h, s2));
      else if (t === "f") fill(g, chipEdge([[x, b], [x, b - h], [x + w * 0.2, b - h], [x + w * 0.2, b - h - 10], [x + w * 0.45, b - h - 10], [x + w * 0.45, b - h], [x + w, b - h], [x + w, b]], s2, { big: 0.4 }));
      else if (t === "s") fill(g, chipEdge([[x, b], [x, b - h], [x + w, b - h * 0.55], [x + w, b]], s2));
      else if (t === "c") fill(g, chipEdge([[x, b], [x, b - h], [x + w * 0.25, b - h - 18], [x + w * 0.25, b - h], [x + w * 0.5, b - h - 18], [x + w * 0.5, b - h], [x + w * 0.62, b - h], [x + w * 0.62, b - h - 96], [x + w * 0.7, b - h - 96], [x + w * 0.7, b - h], [x + w, b - h], [x + w, b]], s2));
      else { waterTank(g, x + w / 2, b - h, w * 0.8, h * 0.4, b, s2); } });
    pylon(g, PX_A, PYL_A.b, PYL_A.t, 10450);
    fill(g, (() => { const P = [[-20, H + 20], [-20, slopeA(-20)]]; for (let x = 0; x <= 1060; x += 10) P.push([x, slopeA(x) + 6 * Math.sin(x * 0.02)]); P.push([1060, H + 20]); return P; })());
    const SAW = [[-30, H + 20], [-30, 470]]; for (const x of [-30, 96, 222]) SAW.push([x, 470], [x + 124, 548], [x + 124, 470]); SAW.splice(SAW.length - 1, 1); SAW.push([346, 548], [346, H + 20]);
    const fac = chipEdge(SAW, 10500, { big: 0.3 }); fill(g, fac);
    const chim = chimney(268, 560, 52, 74, 48, 10510); fill(g, chim);
    const tank = waterTank(g, 440, 356, 112, 96, slopeA(440) + 8, 10520);
    tower(g, TX_A, TB_A, TT_A, 58, 16, 15, 10600, slopeA(lxA(TB_A, 1)) + 6);
    ink(g, WIRE_A, 15, 10650, { entry: 0.01, exit: 0.02, jit: 0.3 });
    ink(g, wire([TX_A + 20, TT_A + 92], [W + 30, 330], 140), 2.2, 10651);
    // 光の縁: 太陽の縁を刷ったコマから太くなる(彫り足す)。影の中の白い刀
    const rimW = sunOn ? 4.2 : 2.2;
    rim(g, fac, 10700, (a, b) => b[0] > a[0] + 3 && b[1] > a[1] + 1, rimW, ycut); rim(g, chim, 10720, (a, b) => b[1] > a[1] + 20, rimW * 0.8, ycut); rim(g, tank, 10730, (a, b) => b[0] > a[0] + 3 || b[1] > a[1] + 20, rimW * 0.8, ycut);
    { const P = []; for (let x = 400; x <= 1060; x += 10) P.push([x, slopeA(x) + 6 * Math.sin(x * 0.02) + 2]); g.fillStyle = "#fff"; cut(g, P, rimW, 10710, { entry: 0.05, exit: 0.4, jit: 0.6 }); }
    g.fillStyle = "#fff"; for (const [x0, y0, l, w, sd] of [[262, 612, 70, 2.6, 1], [240, 668, 96, 3.2, 2], [280, 724, 58, 2.2, 3], [206, 790, 120, 3.6, 4], [300, 846, 40, 2.0, 5], [110, 600, 52, 1.8, 6], [150, 900, 140, 2.8, 7]]) cut(g, [[x0, y0], [x0 + l, y0 + 2]], w * (sunOn ? 1.1 : 0.8), 10740 + sd, { entry: 0.2, exit: 0.5, jit: 0.5 });
    for (const [y, sd] of [[214, 1], [396, 2]]) { const hw = lerp(37, 24, (560 - y) / 508); cut(g, [[268 - hw + 4, y], [268 + hw - 2, y - 1]], 2.4, 10760 + sd, { entry: 0.3, exit: 0.3, jit: 0.3 }); }
    // 信号の溝: 道の形は最初から全部彫ってある(紙)。琥珀は届いた所まで(アクセントごとに押して進む)
    const SLfull = polyLen(SIG_A), sA = pushProg([[E.hit, 0.06, 3]].concat(E.sigPush.map((s, i) => [s, 0.06 + 0.94 * (i + 1) / (E.sigPush.length + 1), 5])).concat([[E.arrive - 3, 1, 4]]));
    const [gb] = signalBuf("sigAfull", SIG_A, SLfull, { w0: 12, w1: 8, seed: 10800 }); g.drawImage(gb, 0, 0);
    g.restore();
    const plates = [];
    if (honey) { const [h, hg] = plateBuf("plH"); bokashi(hg, 0, HZ, 0, 120, [[0, 1], [0.45, 0.7], [1, 0]]); bokashi(hg, 0, HZ + 14, 0, H, [[0, 0.8], [1, 0.15]], (gg) => gg.rect(0, HZ + 14, W, H)); baren(hg, [0, 0, W, H], E.arrive, "up", 10901, { q0: 0.45, dq: 0.2, mottle: false, rag: 0.12 }); plates.push({ c: h, color: C.HONEY, kind: "bokashi", shift: [2, -1] }); }
    const [sb, SL] = signalBuf("sigA", SIG_A, sA * SLfull, { w0: 12, w1: 8, seed: 10800 });
    const [am, amg] = plateBuf("plA"); amg.drawImage(sb, 0, 0);
    if (sunOn) { amg.save(); amg.beginPath(); amg.rect(0, 0, W, HZ + 6); amg.clip(); amg.fillStyle = "#000"; amg.beginPath(); poly(amg, sunPoly(SX, SY, SR, 10900)); amg.fill(); amg.restore(); sunReflect(amg, 10, SX, HZ + 16, H, 70, 230, lerp(0.3, 1, Math.max(0, rise) / 0.45 * 0.43)); }
    plates.push({ c: am, color: C.AMBER, kind: "flat", shift: [-3, 2] });
    // 版ずれ: 衝撃のコマで墨の版だけが紙と色版から 14px、次のコマで 6px ずれ、その次で合う
    const ks = f === E.hit ? [-14, 8] : f === E.hit + 1 ? [-6, 3] : null;
    return fin(ctx, m, plates, o, [], { comp: "A", events: E, carve_sky: +cp.toFixed(3), carve_water: +wp.toFixed(3), sun_step: step, sun_rise: rise, signal: +sA.toFixed(3), signal_px: Math.round(sA * SLfull), signal_len_px: Math.round(SL), key_shift: ks }, { sheet: 1, keyShift: ks });
  }

  // =====================================================================
  // B 寄り(1431〜1519)「夜が明ける」: 明の日 = 昇った太陽(位置は固定)。電線の琥珀が櫓から日の中へ。字は墨の文字版で刷る
  // =====================================================================
  const timesB = () => {
    const E = { c0: word("夜"), yo: word("夜"), gaak: word("が明ける") };
    E.ga = E.gaak; E.mei = strongest(E.gaak + 2, E.gaak + 10); E.ke = E.mei + 6; E.ru = E.mei + 11; // け・る は語ごとの時刻が無いので推定
    E.sigIn = strongest(E.mei + 12, E.mei + 24); // 明 を刷った後の強いアクセントで、信号が日の中へ届く
    E.cloud = [E.c0 + 4, E.sigIn + 20];
    return E;
  };
  function compB(ctx, o) {
    const f = getF(), E = timesB(), [m, g] = begin(B), HZ = 900, SR = 322;
    const EM = 690, SC = [760, 496];
    const MX0 = SC[0] - 0.268 * EM, MB = SC[1] + 0.455 * EM, M = A6.letter("SMB", "明", MX0, MB, EM);
    const T1 = setH("SMB", "夜が", 150, 820, 150, 0.1), T2 = setH("SMB", "ける", 1290, 820, 150, 0.1);
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    // 夜の名残の雲: 墨の帯。横の刀で少しずつさらって細くする(帯ごとに 6 本、c0+4〜信号が届いた後)
    const clouds = [haze(-40, 900, 60, 34, 11001), haze(1100, 1700, 104, 22, 11002)];
    clouds.forEach((cl, ci) => { for (const P of cl) fill(g, P); const bb = bbox([[].concat(...cl)]); g.save(); g.beginPath(); for (const P of cl) poly(g, P); g.clip(); g.fillStyle = "#fff"; for (let k = 0; k < 6; k++) { const R = PR(11, 60 + ci, k), y = lerp(bb[1], bb[3], 0.12 + 0.76 * R()), x0 = lerp(bb[0], bb[2], 0.6 * R()), len = (bb[2] - bb[0]) * (0.25 + 0.4 * R()); cutT(g, [[x0, y], [x0 + len * 0.5, y + (R() - 0.5) * 3], [x0 + len, y + (R() - 0.5) * 2]], 3 + 7 * R(), 11050 + ci * 10 + k, { entry: 0.2, exit: 0.4, jit: 0.8 }, lerp(E.cloud[0], E.cloud[1], (k + ci * 0.5) / 6.5), 6); } g.restore(); });
    for (let x = -20, k = 0; x < W + 20; k++) { const R = PR(11, 1, k), w = 20 + 60 * R(), h = 6 + 26 * R() * (x > 1100 ? 1.4 : 1), ch = R() < 0.14; const P = R() < 0.5 ? [[x, HZ + 6], [x, HZ - h], [x + w * 0.5, HZ - h - 8 - 8 * R()], [x + w, HZ - h], [x + w, HZ + 6]] : [[x, HZ + 6], [x, HZ - h], [x + w, HZ - h - 4 * (R() - 0.5)], [x + w, HZ + 6]]; fill(g, chipEdge(P, 11100 + k, { big: 0.2 })); if (ch) fill(g, [[x + w * 0.6, HZ - h + 2], [x + w * 0.6 + 2, HZ - h - 40 - 30 * R()], [x + w * 0.6 + 9, HZ - h - 40 - 30 * R()], [x + w * 0.6 + 11, HZ - h + 2]]); x += w + (R() < 0.3 ? 18 * R() : -2); }
    g.fillStyle = "#000"; g.fillRect(-10, HZ + 2, W + 20, 12);
    waterInk(g, 11, HZ + 20, H + 10, -20, W + 20, SC[0], (x) => x < 1440);
    fill(g, chipEdge([[1420, H + 20], [1452, 984], [1600, 962], [1940, 950], [1940, H + 20]], 11300, { big: 0.3 }));
    const chim = chimney(1810, H + 20, 36, 132, 86, 11310); fill(g, chim);
    const tank = waterTank(g, 1622, 330, 150, 118, 975, 11320);
    rim(g, chim, 11330, (a, b) => b[1] < a[1] - 20, 4.2); rim(g, tank, 11340, (a, b) => b[1] < a[1] - 10 || b[0] < a[0] - 3, 3.2);
    g.fillStyle = "#fff"; for (const [y, l, w, sd] of [[180, 40, 2.6, 1], [420, 56, 3.4, 2], [640, 64, 3.0, 3], [820, 70, 2.4, 4], [1010, 74, 2.0, 5]]) { const hw = lerp(43, 66, (y - 36) / 1064); cut(g, [[1810 - hw + 4, y], [1810 - hw + 4 + l, y + 1]], w, 11350 + sd, { entry: 0.1, exit: 0.6, jit: 0.4 }); }
    const TX = 74, TT = 262, TB = H + 40, lx = tower(g, TX, TB, TT, 72, 20, 15, 11400);
    const end = [MX0 + 0.10 * EM, SC[1] - 0.215 * EM], W1 = wire([lx(TT + 70, 1), TT + 70], end, 64);
    ink(g, W1, 17, 11450, { entry: 0.01, exit: 0.02, jit: 0.3 });
    const SIG = [[lx(H + 20, 1), H + 20], [lx(TT + 70, 1), TT + 70]].concat(W1.slice(1)).concat([[end[0] + 0.13 * EM, end[1] + 2]]);
    const SL = polyLen(SIG), [gb] = signalBuf("sigBfull", SIG, SL, { w0: 10, w1: 8.5, seed: 11500 }); g.drawImage(gb, 0, 0);
    g.restore();
    const sun = sunPoly(SC[0], SC[1], SR, 11900), sunIn = sunPoly(SC[0], SC[1], SR, 11950, 2);
    const [a, ag] = plateBuf("plR"); bokashi(ag, 0, 0, 0, HZ, [[0, 1], [0.45, 0.6], [0.85, 0.05], [1, 0]]);
    const [h, hg] = plateBuf("plH"); bokashi(hg, 0, HZ, 0, 160, [[0, 1], [0.5, 0.75], [1, 0]]); bokashi(hg, 0, HZ + 10, 0, H, [[0, 0.85], [1, 0.25]], (gg) => gg.rect(0, HZ + 10, W, H));
    const sA = f < E.c0 ? 0 : pushProg([[E.c0, 0.35, 8], [E.mei, 0.7, 8], [E.sigIn, 1, 5]]);
    const [sb] = signalBuf("sigB", SIG, sA * SL, { w0: 10, w1: 8.5, seed: 11500 });
    const [am, amg] = plateBuf("plA"); amg.save(); amg.beginPath(); amg.rect(0, 0, W, HZ + 4); amg.clip(); amg.beginPath(); poly(amg, sun); amg.fill(); amg.restore(); sunReflect(amg, 11, SC[0], HZ + 14, H, 120, 300);
    for (const pgc of [ag, hg]) { pgc.globalCompositeOperation = "destination-out"; pgc.beginPath(); poly(pgc, sunIn); pgc.fill(); pgc.globalCompositeOperation = "source-over"; }
    pressIn(ag, E.c0, "down", 11601); pressIn(hg, E.c0, "up", 11602); pressIn(amg, E.c0, "up", 11603); amg.drawImage(sb, 0, 0);
    // 墨の文字版: 夜・が・明・け・る を語頭(と推定の時刻)でばれん。字は 4 コマで刷り終える
    const box = (Ls, p = 8) => { const b = lettersBox(Ls); return [b[0] - p, b[1] - p, b[2] + p, b[3] + p]; };
    const letterDraw = (L) => (tg) => { tg.beginPath(); pathOf(tg, L.cs); tg.fill("nonzero"); };
    const tp = textPlate("plT", [[letterDraw(T1[0]), box([T1[0]]), E.yo, "down", 11701], [letterDraw(T1[1]), box([T1[1]]), E.ga, "down", 11702], [letterDraw(M), box([M]), E.mei, "down", 11703], [letterDraw(T2[0]), box([T2[0]]), E.ke, "down", 11704], [letterDraw(T2[1]), box([T2[1]]), E.ru, "down", 11705]]);
    const shown = [[T1[0], E.yo], [T1[1], E.ga], [M, E.mei], [T2[0], E.ke], [T2[1], E.ru]].filter(([, s]) => f >= s).map(([L]) => L);
    return fin(ctx, m, [{ c: a, color: C.ROSE, kind: "bokashi", shift: [-2, 1] }, { c: h, color: C.HONEY, kind: "bokashi", shift: [2, -1] }, { c: am, color: C.AMBER, kind: "flat", shift: [-3, 2] }, { c: tp, color: C.INK_DAWN, kind: "flat", shift: [0, 0] }], o, shown, { comp: "B", events: E, signal: +sA.toFixed(3), sun_diam_px: 2 * SR, ming_em_px: EM, ming_box: lettersBox([M]).map(Math.round), letters: [T1[0], T1[1], M, T2[0], T2[1]].map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) }, { sheet: 2, cut: 11 });
  }

  // =====================================================================
  // C 終わり(1520〜1589): 昇りきった太陽の引き(位置は固定)。最初の窓に琥珀 → 信号が窓から地平の鉄塔まで通る → 題を墨で刷る → 余韻
  // =====================================================================
  const timesC = () => {
    const E = { c0: 1520 }; E.title = strongest(E.c0 + 12, E.c0 + 24); E.arrive = strongest(E.title + 10, E.title + 22); E.hold = E.arrive + 5;
    E.sigPush = accIn(E.c0 + 3, E.arrive - 3).map((x) => x.frame30);
    return E;
  };
  function compC(ctx, o) {
    const f = getF(), E = timesC(), [m, g] = begin(B), HZ = 940, SR = 300, SC = [1380, 360];
    const CW = 176, CH = 432, CX = 760, CY = 430, CART = [CX - CW / 2, CY - CH / 2, CX + CW / 2, CY + CH / 2];
    const TT = setV("SMB", "夜明けの回路", CX, CART[1] + 36, 56, 0.08);
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    for (let x = -20, k = 0; x < W + 20; k++) { const R = PR(12, 1, k), w = 14 + 40 * R(), h = 4 + 16 * R(); fill(g, [[x, HZ + 6], [x, HZ - h], [x + w * 0.5, HZ - h - 6 * R()], [x + w, HZ - h], [x + w, HZ + 6]]); if (R() < 0.1) fill(g, [[x + w * 0.5, HZ - h + 2], [x + w * 0.5 + 1, HZ - h - 26], [x + w * 0.5 + 6, HZ - h - 26], [x + w * 0.5 + 7, HZ - h + 2]]); x += w + (R() < 0.3 ? 14 * R() : -2); }
    g.fillStyle = "#000"; g.fillRect(-10, HZ + 2, W + 20, 8);
    waterInk(g, 12, HZ + 16, H + 10, 760, W + 20, SC[0], () => true);
    const PX = 1236, PB = HZ + 4, PT = HZ - 92; pylon(g, PX, PB, PT, 12020);
    const hillC = (x) => 800 + Math.pow(Math.max(0, x) / 900, 1.5) * 300;
    fill(g, (() => { const P = [[-20, H + 20], [-20, hillC(0)]]; for (let x = 0; x <= 940; x += 10) P.push([x, hillC(x) + 4 * Math.sin(x * 0.03)]); P.push([960, H + 20]); return P; })());
    const bx = 70, bw = 150, btop = 640, BLD = chipEdge([[bx, H], [bx, btop + 16], [bx + 30, btop + 16], [bx + 30, btop], [bx + 112, btop], [bx + 112, btop + 16], [bx + bw, btop + 16], [bx + bw, H]], 12040, { big: 0.3 }); fill(g, BLD);
    const chim = chimney(268, hillC(268) + 10, 470, 34, 24, 12045); fill(g, chim);
    const tank = waterTank(g, 352, 640, 62, 52, hillC(352) + 6, 12050);
    const WN = { x: bx + 44, y: btop + 46, w: 56, h: 66 };
    g.fillStyle = "#fff"; { const bar = 7, pw = (WN.w - bar) / 2, ph = (WN.h - bar) / 2; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const x0 = WN.x + i * (pw + bar), y0 = WN.y + j * (ph + bar), q = (a) => (hash(j * 2 + i, a, 12060) - 0.5) * 2; g.beginPath(); poly(g, [[x0 + q(1), y0 + q(2)], [x0 + pw + q(3), y0 + q(4)], [x0 + pw + q(5), y0 + ph + q(6)], [x0 + q(7), y0 + ph + q(8)]]); g.fill(); } }
    rim(g, BLD, 12070, (a, b) => b[1] > a[1] + 20 && a[0] > bx + 100, 2.6); rim(g, chim, 12075, (a, b) => b[1] > a[1] + 20, 2.0);
    g.fillStyle = "#fff"; for (const [x0, y0, l, w, sd] of [[bx + 110, btop + 140, 30, 2.0, 1], [bx + 18, btop + 150, 22, 1.6, 2], [bx + 100, btop + 190, 40, 2.4, 3], [bx + 10, btop + 222, 34, 1.8, 4], [bx + 120, btop + 250, 24, 2.0, 5], [420, hillC(420) + 40, 120, 2.6, 6], [560, hillC(560) + 70, 160, 3.0, 7]]) cut(g, [[x0, y0], [x0 + l, y0 + 1]], w, 12080 + sd, { entry: 0.2, exit: 0.5, jit: 0.4 });
    const TX = 470, TB = hillC(470) + 6, TT2 = TB - 300, lx = tower(g, TX, TB, TT2, 26, 8, 11, 12100);
    const W1 = wire([lx(TT2 + 30, 1), TT2 + 30], [PX + 4, PT + 12], 60); ink(g, W1, 12, 12150, { entry: 0.01, exit: 0.02, jit: 0.25 });
    const SIG = [[WN.x + WN.w / 2, WN.y + WN.h + 8], [WN.x + WN.w / 2, btop + 200], [bx + bw + 30, hillC(bx + bw + 30) + 34], [lx(TB, 1) - 6, hillC(lx(TB, 1)) + 30], [lx(TB, 1), TB - 2], [lx(TT2 + 30, 1), TT2 + 30]].concat(W1.slice(1)).concat([[PX + 12, PB - 30], [PX + 16, PB - 2]]);
    const SL = polyLen(SIG), [gb] = signalBuf("sigCfull", SIG, SL, { w0: 9, w1: 6.5, seed: 12500 }); g.drawImage(gb, 0, 0);
    g.restore();
    const KASUMI = haze(860, 2000, 604, 60, 12301).concat(haze(1000, 1760, 846, 30, 12303));
    const sun = sunPoly(SC[0], SC[1], SR, 12900), sunIn = sunPoly(SC[0], SC[1], SR, 12950, 2);
    const [a, ag] = plateBuf("plR"); bokashi(ag, 0, 0, 0, HZ, [[0, 1], [0.4, 0.62], [0.8, 0.12], [1, 0]]);
    const [h, hg] = plateBuf("plH"); bokashi(hg, 0, HZ, 0, 100, [[0, 1], [0.55, 0.6], [1, 0.1]]); bokashi(hg, 0, HZ + 10, 0, H, [[0, 0.85], [1, 0.25]], (gg) => gg.rect(0, HZ + 10, W, H));
    const [am, amg] = plateBuf("plA"); amg.beginPath(); poly(amg, sun); amg.fill(); sunReflect(amg, 12, SC[0], HZ + 14, H, 60, 180);
    for (const pgc of [ag, hg]) { pgc.globalCompositeOperation = "destination-out"; pgc.beginPath(); poly(pgc, sunIn); pgc.fill(); pgc.globalCompositeOperation = "source-over"; }
    for (const pgc of [ag, hg, amg]) { pgc.globalCompositeOperation = "destination-out"; for (const P of KASUMI) { pgc.beginPath(); poly(pgc, P); pgc.fill(); } pgc.fillRect(CART[0] - 2, CART[1] - 2, CW + 4, CH + 4); pgc.globalCompositeOperation = "source-over"; } // 題箋は最初から白い札(色版を刷らない所)
    pressIn(ag, E.c0, "down", 12601); pressIn(hg, E.c0, "up", 12602); pressIn(amg, E.c0, "up", 12603);
    // 最初の窓に琥珀(刷り替えと同じコマ)、信号が窓から鉄塔まで(アクセントごとに押す)
    amg.fillRect(WN.x - 3, WN.y - 3, WN.w + 6, WN.h + 6);
    const sC = pushProg(E.sigPush.map((s, i) => [s, (i + 1) / (E.sigPush.length + 1), 5]).concat([[E.arrive - 3, 1, 4]]));
    const [sb] = signalBuf("sigC", SIG, sC * SL, { w0: 9, w1: 6.5, seed: 12500 }); amg.drawImage(sb, 0, 0);
    // 題: 札の枠と字を墨で刷り、題の「明」の日に琥珀
    const tp = textPlate("plT", [[(tg) => { const [x0, y0, x1, y1] = CART; for (const [d, w] of [[0, 6], [11, 2.2]]) { tg.lineWidth = w; tg.strokeStyle = "#000"; tg.strokeRect(x0 + d, y0 + d, x1 - x0 - 2 * d, y1 - y0 - 2 * d); } tg.beginPath(); pathOf(tg, TT.flatMap((L) => L.cs)); tg.fill("nonzero"); }, [CART[0] - 6, CART[1] - 6, CART[2] + 6, CART[3] + 6], E.title, "down", 12701]]);
    if (f >= E.title + 3) letterPlate(amg, TT[1], { rect: [0.0, -0.80, 0.40, -0.10] });
    return fin(ctx, m, [{ c: a, color: C.ROSE, kind: "bokashi", shift: [-2, 1] }, { c: h, color: C.HONEY, kind: "bokashi", shift: [2, -1] }, { c: am, color: C.AMBER, kind: "flat", shift: [-3, 2] }, { c: tp, color: C.INK_DAWN, kind: "flat", shift: [0, 0] }], o, f >= E.title ? TT : [], { comp: "C", events: E, signal: +sC.toFixed(3), sun_diam_px: 2 * SR, cartouche_h_px: CH, signal_len_px: Math.round(SL), letters: TT.map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) }, { sheet: 3, cut: 12 });
  }

  return function draw(ctx, o) { const f = getF(); if (f < timesB().c0) return compA(ctx, o); if (f < timesC().c0) return compB(ctx, o); return compC(ctx, o); };
})();
