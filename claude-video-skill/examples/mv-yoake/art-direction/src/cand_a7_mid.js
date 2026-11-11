// 案A+C v7(動きの本制作 第2段)の中盤 S5〜S9(曲のコマ 669〜1339)。部品は cand_a7.js(A6 と MO)、時刻は M1_TIMING と A7_T(cand_a7_open.js)の規則、
// 2.5D の層のカメラは cand_a7_cam.js(A7_CAM。切ると恒等変換)。
// 絵は cand_a6_cuts.js(v6、53秒ボード v4)の S5・S7・S8・S9 と、cand_a7_cuts.js の S6(v7 の手直し)を写し、刀・字・窓・色版に「見え始めるコマと速さ」を与えた。
// 動きの語彙は第1段と同じ3つ(彫る・刷る・刷り替え)。フェード・グロー・粒子は使わない。2.5D は比較試験で採ったカットだけ(MOTION_PART2_REVIEW.md §1)。
const A7_MID = (() => {
  const { W, H, clamp, lerp, smooth, hash, fbm, vnoise, resample, stroke, bbox, pathOf } = AD;
  const { MO, avoidBoxes, C, FRAME, BLEED, PR, begin, plateBuf, poly, cut, cutW, wedge, groove, lens, chipEdge, setH, setHC, setV, lettersBox, carve, keepOut, letterPlate, textMargin, bokashi, print, maskOnly, scallop, polyLen, signalBuf } = A6;
  const { cutT, cutP, wedgeT, lensT, lensP, grooveT, grooveP, pushProg, baren, carveT, getF } = MO;
  const { word, phrase, accIn, strongest, firstAcc, shot } = A7_T;
  const F = FRAME, NEVER = -1e9;
  const h01 = (a, b, s) => hash(a | 0, b | 0, s);
  function fin(ctx, m, plates, o, B, texts, printOpt, extra) {
    const tm = textMargin(texts, B);
    if (o.mask) return Object.assign(maskOnly(ctx, m), { text: tm }, extra);
    return Object.assign(print(ctx, m, plates, Object.assign({ look: o.look, B }, printOpt, { sheet: o.sheet == null ? printOpt.sheet : o.sheet })), { text: tm }, extra, { cam: A7_CAM.state() });
  }
  const pressIn = (pg, c0, dir, seed) => baren(pg, [0, 0, W, H], c0, dir, seed, { q0: 0.62, dq: 0.3, mottle: false, rag: 0.12 });
  function rowsOf(cut, layer, y0, y1, gap) { const out = []; let y = y0, k = 0; while (y < y1 && k < 4000) { out.push([k, y, PR(cut, layer, k)]); y += gap(y, PR(cut, layer + 50, k)); k++; } return out; }
  // 字の点を投影する(点ごとの z)。cam が切なら同じ物を返す
  const projL = (Ls, zf) => (A7_CAM.on() ? Ls.map((L) => Object.assign({}, L, { cs: L.cs.map((ct) => ct.map((p) => A7_CAM.pt(p, zf(p)))) })) : Ls);

  // =====================================================================
  // S8 1002〜1172「止まらない 止まれない」: 川の岸から高架を見上げる(v6 の絵)。
  //  1002 刷り替え(新しい紙)。地平の町明かりの帯を最初の一刀で彫る。「止まらない」を語頭から1字ずつ(+0・+5・+10・+15・+20)。
  //  レール(桁の上の縁の溝)を拍ごとに左から押して延ばす(1010・1015・1024)。列車の窓を拍ごとに1両ずつ彫って刷る(手前の1両目 1015 → 1024 → 1034)。
  //  「止まれない」(1056、要確認)を水の上に大きく。1066 から、列車の先のレールの溝に琥珀が走り(信号)、1123(低音 0.50)で地平の町に届くと、
  //  川の光の映りが地平から手前へ一気に彫られる(川が灯る)。同じコマから橋脚の光の側の刀。桁の腹の白い刀は拍ごとに1本(1066・1085・1142・1151・1161)。
  //  2.5D(cam 入): カメラが川に沿って左へ動き続ける(止まらない)。手前の橋脚と桁の左ほど速く右へ流れ、地平の町はほとんど動かない。
  //   z: 桁・列車・橋脚 = x で 1.0(左の手前)→ 0.25(右の奥)、水 = y で 0.12(地平)→ 0.9(下)、地平 = 0.12、「止まれない」= 0(カメラに固定)。
  //   「止まらない」は桁の腹に彫った字なので桁と一緒に動く。カットの最後まで止まらず、S9「まだ、」の静止へ切る
  // =====================================================================
  const S8_PAN = 170; // 2.5D: z = 1 の層がカットの間に右へ流れる量(px)
  function S8(ctx, o) {
    const f = getF(), sh = shot("S8"), c0 = sh.start, [m, g] = begin(F), HZ = 742;
    const E = { tomaranai: phrase("止まらない"), tomarenai: phrase("止まれない") };
    E.t1 = [0, 5, 10, 15, 20].map((d) => E.tomaranai + d); E.t2 = [0, 6, 12, 18, 24].map((d) => E.tomarenai + d);
    E.rail = accIn(c0 + 5, c0 + 24).map((x) => x.frame30).slice(0, 3); // 1010・1015・1024
    E.cars = [E.rail[1], E.rail[2], accIn(E.rail[2] + 6, E.rail[2] + 12)[0].frame30]; // 1015・1024・1034
    E.sigGo = accIn(E.t2[0] + 6, E.t2[0] + 14)[0].frame30; // 1066
    E.lit = strongest(1100, 1135, "kick"); // 1123(低音 0.50)
    E.belly = [E.sigGo].concat(accIn(E.sigGo + 10, E.lit - 10).map((x) => x.frame30), accIn(E.lit + 10, sh.end - 1).map((x) => x.frame30)).slice(0, 5);
    E.bottom = [accIn(E.cars[0] + 10, E.cars[2] + 2).map((x) => x.frame30)[0] || E.cars[1] + 5, E.cars[2]];
    // 2.5D: 一定の速さで左へ(カメラ)=絵は右へ流れる
    A7_CAM.set({ pan: [S8_PAN * (f - c0) / (sh.end - c0), 0], push: 0 });
    const u = (x) => (x - F.x0) / (F.x1 - F.x0), zG = (x) => lerp(1.0, 0.25, u(x)), zW = (y) => lerp(0.12, 0.9, Math.pow(clamp((y - HZ) / (F.y1 - HZ)), 0.8)), zHz = 0.12;
    const P = (p, z) => A7_CAM.pt(p, z), PG = (pts) => pts.map((p) => P(p, zG(p[0]))), PW = (pts) => pts.map((p) => P(p, zW(p[1]))), PH = (pts) => pts.map((p) => P(p, zHz));
    const XL = F.x0 - 260; // 2.5D で左から入ってくる分まで描く
    const top = (x) => lerp(170, 462, u(x)), bot = (x) => lerp(470, 566, u(x));
    // 町明かりの帯(地平): 刷り替えのコマで最初の一刀(左から 3 コマで)。帯の形は最後の形のまま、刃先(x)より先を切る(形が変わると彫った所が墨に戻る)
    g.fillStyle = "#fff"; const gaps = [[300, 340], [620, 700], [1010, 1030], [1380, 1460], [1700, 1720]];
    let x0 = F.x0 - 10; for (const [a, b] of gaps.concat([[F.x1 + 10, F.x1 + 20]])) { const pts = []; for (let x = x0; x <= a; x += 12) pts.push([x, HZ + 3 * Math.sin(x * 0.01)]); if (pts.length > 1) { const pp = clamp((f - c0 + 1) / 3 * 1.6 - u(x0) * 0.6); if (pp > 0) { const xe = A7_CAM.pt([lerp(x0, a, pp), HZ], zHz)[0]; g.save(); if (pp < 1) { g.beginPath(); g.rect(-1e4, 0, xe + 1e4, H); g.clip(); } cutW(g, PH(pts), 18 + 8 * hash(a, 1, 8), 14 + 10 * hash(a, 2, 8), 8100 + a, 1.2); g.restore(); } } x0 = b; }
    g.fillStyle = "#000"; for (let k = 0, x = F.x0; x < F.x1; k++) { const R = PR(8, 1, k), w = 18 + 40 * R(), h = 4 + 12 * R(); if (R() < 0.55) { g.beginPath(); poly(g, PH([[x, HZ + 2], [x, HZ - 8 - h], [x + w * 0.5, HZ - 14 - h - 6 * R()], [x + w, HZ - 8 - h], [x + w, HZ + 2]])); g.fill(); } x += w + 6 + 30 * R(); }
    // 水: 地平の近くの映りは最初から少しと、刷り替えの後に少しずつ。深い所は 1123 で地平から手前へ一気に(川が灯る)
    g.fillStyle = "#fff";
    for (const [k, y, R] of rowsOf(8, 2, HZ + 22, F.y1 - 4, (y) => 6 + (y - HZ) * 0.03)) { const d = (y - HZ) / (F.y1 - HZ); let x = F.x0 - 10 + R() * 30; while (x < F.x1) { const len = lerp(20, 120, Math.pow(R(), 1.2)) * (1 - 0.5 * d), inGap = gaps.some(([a, b]) => x + len / 2 > a - 10 && x + len / 2 < b + 10); if (!inGap && R() < 0.75 - 0.6 * d) { const hz = h01(x, y, 8801), s = hz < 0.3 ? NEVER : d < 0.22 && hz < 0.7 ? c0 + 4 + (E.lit - 12 - c0 - 4) * h01(x, y, 8802) : E.lit + 9 * Math.pow(d, 0.8) + 2 * h01(x, y, 8803); const q = P([x + len / 2, y], zW(y)); lensT(g, q[0], y + (vnoise(x * 0.01, y * 0.05, 3) - 0.5) * 2, len / 2, lerp(5, 1.4, d) * (0.6 + 0.8 * R()), k * 991 + (x | 0), 0, s, 2); } x += len + lerp(6, 70, d) * (0.5 + R()); } }
    if (A7_CAM.on()) for (const [k, y, R] of rowsOf(8, 4, HZ + 22, F.y1 - 4, (y) => 6 + (y - HZ) * 0.03)) { const d = (y - HZ) / (F.y1 - HZ); let x = XL; while (x < F.x0 - 10) { const len = lerp(20, 120, Math.pow(R(), 1.2)) * (1 - 0.5 * d); if (R() < 0.75 - 0.6 * d) { const hz = h01(x, y, 8801), s = hz < 0.3 ? NEVER : E.lit + 9 * Math.pow(d, 0.8) + 2 * h01(x, y, 8803); const q = P([x + len / 2, y], zW(y)); lensT(g, q[0], y, len / 2, lerp(5, 1.4, d) * (0.6 + 0.8 * R()), 50000 + k * 991 + (x | 0), 0, s, 2); } x += len + lerp(6, 70, d) * (0.5 + R()); } } // 2.5D で左から入る水
    // 橋脚
    const PIERS = [[250, 96], [760, 66], [1150, 46], [1430, 33], [1640, 24], [1790, 17]].concat(A7_CAM.on() ? [[-120, 120]] : []);
    g.fillStyle = "#000"; PIERS.forEach(([x, w], i) => { const y0 = bot(x) - 4, z = zG(x); g.beginPath(); poly(g, chipEdge([[x - w / 2, y0], [x + w / 2, y0], [x + w / 2 + w * 0.08, F.y1 + 10], [x - w / 2 - w * 0.08, F.y1 + 10], [x - w / 2, y0]].map((p) => P(p, z)), 8200 + i, { big: 0.3 })); g.fill(); });
    g.fillStyle = "#fff"; PIERS.forEach(([x, w], i) => cutT(g, [[x + w / 2 - 2, HZ - 70], [x + w / 2 - 1, HZ + 60]].map((p) => P(p, zG(x))), 1 + w * 0.03, 8250 + i, { entry: 0.3, exit: 0.4, jit: 0.3 }, E.lit + 1 + i * 1.5, 3)); // 橋脚の光の側: 川が灯ったコマから手前→奥
    // 桁と空(墨)
    g.fillStyle = "#000"; g.beginPath(); { const Q = []; Q.push(P([XL, -20], zG(XL)), P([F.x1 + 80, -20], zG(F.x1 + 80))); for (let x = F.x1 + 80; x >= XL; x -= 10) Q.push(P([x, bot(x)], zG(x))); poly(g, Q); } g.fill();
    // 字: 「止まらない」は桁の腹に彫る(桁の傾きに沿わせる)、「止まれない」は水の上に大きく
    const slant = (Ls, x0, k) => Ls.map((L) => { const dy = k * (L.x0 - x0); return Object.assign({}, L, { base: L.base + dy, cs: L.cs.map((ct) => ct.map(([x, y]) => [x, y + dy])) }); });
    const T1w = slant(setH("SMB", "止まらない", 200, 392, 132, 0.08), 200, 0.11), T2 = setH("SMB", "止まれない", 900, 930, 168, 0.11);
    const boxes = T1w.map((L) => bbox(L.cs)), T1 = projL(T1w, (p) => zG(p[0]));
    g.fillStyle = "#fff";
    const runSeg = (Pp, w0, w1, sd, chip = 1.2, prog = 1) => avoidBoxes(Pp, boxes, 24).forEach((seg, i) => grooveP(g, PG(seg), { w0, w1, seed: sd + i * 13, chip, splinter: false, taper: 0.02 }, prog));
    // 下の縁: 2回押す(列車の1両目の後)。レール(上の縁、v7 で太くした 6→3px): 拍ごとに左から延びる
    runSeg([[XL, bot(XL) + 2], [F.x1 + 10, bot(F.x1) + 2]], 6, 2.4, 8301, 1.2, pushProg([[E.bottom[0], 0.55, 6], [E.bottom[1], 1, 6]]));
    const RAIL = [[XL, top(XL) + 3], [F.x1 + 10, top(F.x1) + 3]], railP = pushProg(E.rail.map((s, i) => [s, [0.42, 0.7, 1][i], 5]));
    runSeg(RAIL, 6, 3, 8302, 0.8, railP);
    [[16, 4.6, F.x0 - 10, 1500, 8321], [30, 3.4, 120, 1240, 8322], [44, 2.6, 420, 1020, 8323], [24, 2.2, 1300, 1820, 8324], [58, 1.8, 760, 980, 8325]].forEach(([off, w, xa, xb, sd], bi) => { const Pp = []; for (let x = xa; x <= xb; x += 20) Pp.push([x, bot(x) - off * lerp(1, 0.45, (x - F.x0) / 1808)]); avoidBoxes(Pp, boxes, 24).forEach((seg, i) => cutT(g, PG(seg), w, sd + i * 7, { entry: 0.1, exit: 0.3, jit: 0.5 }, E.belly[bi] + i * 0.5, 4)); });
    // 列車: 窓 11 個(3両)。両ごとに拍で窓を彫り(1コマに1枚ずつ、手前から)、2コマ後に琥珀を刷る。継ぎ目の溝は両を彫るコマ
    const winH = (x) => lerp(36, 14, (x - F.x0) / 1808), CARS = [[180, 262, 344, 426], [560, 632, 704, 776], [900, 958, 1016]], winY = (x) => top(x) - 12 - winH(x) * 1.25;
    [[980, 8312, 2], [1330, 8313, 9], [1590, 8314, 9]].forEach(([x, sd, ci]) => grooveT(g, PG([[x, bot(x) - 4], [x + 6, top(x) + 12]]), { w0: 2.6, w1: 1, seed: sd, chip: 0.8, splinter: false }, ci < 3 ? E.cars[ci] : E.bottom[1], 3));
    const winQ = (x, i, grow = 0) => { const w = lerp(56, 22, (x - F.x0) / 1808) + grow * 2, h = winH(x) + grow * 2, y = winY(x) - grow, sl = (top(x + w) - top(x)); return grow ? [[x - grow, y], [x + w, y + sl], [x + w, y + sl + h], [x - grow, y + h]] : [[x + hash(i, 1, 8401) * 2, y], [x + w, y + sl], [x + w - hash(i, 2, 8401) * 2, y + sl + h], [x, y + h]]; };
    let wi = 0; CARS.forEach((car, ci) => car.forEach((x, k) => { const i = wi++; if (f < E.cars[ci] + k * 0.6) return; g.beginPath(); poly(g, PG(winQ(x, i))); g.fill(); }));
    { const Pp = []; for (let x = 150; x <= 1080; x += 20) Pp.push([x, winY(x) - winH(x) * 0.9]); cutT(g, PG(Pp), 2.0, 8410, { entry: 0.05, exit: 0.4, jit: 0.4 }, E.cars[0], E.cars[2] - E.cars[0] + 3); }
    keepOut(g, T1, 16); keepOut(g, T2, 30); carveT(g, T1, 8500, E.t1); carveT(g, T2, 8500, E.t2, { i0: 5 });
    g.restore();
    // 琥珀: 両ごとの窓(ばれん、右へ)。レールの溝の信号: 列車の先から地平の町へ(1066 → 1123、ゆっくり入って速く着く)
    const [pp, pg] = plateBuf("plA");
    wi = 0; CARS.forEach((car, ci) => { const [lc, lg] = plateBuf("plCar"); lg.fillStyle = "#000"; car.forEach((x) => { const i = wi++; lg.beginPath(); poly(lg, PG(winQ(x, i, 2))); lg.fill(); }); const b = bbox([PG(winQ(car[0], 0, 2)), PG(winQ(car[car.length - 1], 0, 2))]); baren(lg, [b[0] - 4, b[1] - 6, b[2] + 4, b[3] + 6], E.cars[ci] + 2, "right", 8600 + ci); pg.drawImage(lc, 0, 0); });
    const SIGP = PG(resample([[1050, top(1050) + 3], [F.x1 + 10, top(F.x1) + 3]], 12)), sp = f < E.sigGo ? 0 : Math.pow(clamp((f - E.sigGo + 1) / (E.lit - E.sigGo + 1)), 1.6);
    if (sp > 0) { const [sb] = signalBuf("sigS8", SIGP, sp * polyLen(SIGP), { w0: 6.5, w1: 3.4, seed: 8700 }); pg.drawImage(sb, 0, 0); }
    // 2.5D の検査用: 層ごとの今の位置(手前の橋脚・奥の橋脚・地平)
    const camProbe = A7_CAM.on() ? { near_pier_x: +P([250, 600], zG(250))[0].toFixed(2), far_pier_x: +P([1790, 600], zG(1790))[0].toFixed(2), horizon_x: +P([960, HZ], zHz)[0].toFixed(2) } : null;
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T1.concat(T2), { grain: 0.05, cut: 8, sheet: 1 }, { cut_id: "S8", events: E, rail: +railP.toFixed(3), signal: +sp.toFixed(3), cam_probe: camProbe, mbox: { train: [150, 120, 1100, 470], rail: [1040, 150, 1870, 480], water: [56, HZ + 20, 1864, 1034] }, letters: T1.concat(T2).map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }


  // =====================================================================
  // S5 669〜768「夜明けの」(伸ばし→弱起): 彫り始めの「火」(v6 の絵)。
  //  669 刷り替え(新しい紙)。S4 の溝が左から入って、字の左下の払いの手前まで来る(669・680・689 で押す)。
  //  字の輪郭を刀で切り回す(680〜730、輪郭の順に)。芯から外へ丸刀の粗彫り(689・699 で押し、その後 735 の手前まで少しずつ、750 で 97%)。
  //  「夜明けの」(735、要確認)を左の縦組みに1字ずつ。755(0.87、区間の最強)で芯の最後の太い丸刀 6 本と、芯に琥珀を下から刷る(火が灯る)
  // =====================================================================
  const HERO_S5 = [[-0.2, 0.05, 210, 34], [0.55, -0.1, 250, 30], [1.4, 0.08, 190, 32], [2.35, -0.05, 230, 28], [3.3, 0.12, 170, 30], [4.4, -0.08, 240, 33]];
  const S5_SZ = 780, S5_FH = () => setHC("SMB", "火", 1090, 140 + 0.86 * S5_SZ, S5_SZ)[0];
  const S5_CORE = () => { const fb = bbox(S5_FH().cs); return [lerp(fb[0], fb[2], 0.5), lerp(fb[1], fb[3], 0.52)]; };
  function S5(ctx, o) {
    const f = getF(), sh = shot("S5"), c0 = sh.start, [m, g] = begin(F);
    const E = { yoake: word("夜明けの") }; E.heads = accIn(c0 + 5, c0 + 35).map((x) => x.frame30); // 680・689・699
    E.hero = strongest(E.yoake + 10, sh.end - 2); E.t = [0, 5, 10, 15].map((d) => E.yoake + d);
    const Fh = S5_FH(), fb = bbox(Fh.cs), Cc = S5_CORE();
    // 粗彫り: 320 本、芯の近くから。進み p はアクセントで押し、間は少しずつ
    const rp = pushProg([[E.heads[1], 0.15, 6], [E.heads[2], 0.35, 8], [E.heads[2] + 8, 0.74, E.yoake - E.heads[2] - 8], [E.yoake, 0.97, E.hero - E.yoake - 4], [E.hero, 1, 2]]);
    g.save(); g.beginPath(); pathOf(g, Fh.cs); g.clip("nonzero"); g.fillStyle = "#fff";
    const N = 320, done = Math.round(N * rp);
    for (let k = 0; k < done; k++) {
      const R = PR(5, 1, k), a = R() * 6.283, reach = lerp(60, 480, Math.pow(k / N, 0.8) * (0.6 + 0.4 * R())), r0 = 18 + R() * 30, w0 = lerp(10, 22, R()), bend = (R() - 0.5) * 0.35, sp = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12, rr = lerp(r0, reach, u), aa = a + bend * u * u; sp.push([Cc[0] + Math.cos(aa) * rr, Cc[1] + Math.sin(aa) * rr]); }
      g.beginPath(); stroke(g, resample(sp, 4), (u) => w0 * Math.pow(1 - u, 0.55) * (u < 0.05 ? 0.7 + 6 * u : 1), { jit: 1.1, seed: 5410 + k }); g.fill();
    }
    HERO_S5.forEach(([a, bend, l, w], i) => wedgeT(g, [Cc[0] + Math.cos(a) * 26, Cc[1] + Math.sin(a) * 26], [Cc[0] + Math.cos(a + bend) * l, Cc[1] + Math.sin(a + bend) * l], w, 2, 5500 + i, bend * 0.4, 1.4, E.hero + i * 0.5, 2));
    g.restore(); g.fillStyle = "#fff";
    // 切り回し: 輪郭に沿う太さの変わる刀。輪郭の順に 680〜730
    const longest = Fh.cs.reduce((a, c, i) => (c.length > Fh.cs[a].length ? i : a), 0), segs = [];
    Fh.cs.forEach((ct, ci) => { const pts = resample(ct.concat([ct[0]]), 3), n = ci === longest ? Math.floor(pts.length * 0.84) : pts.length; let i = 0, j = 0; while (i < n - 3) { const R = PR(5, 2, ci, j++), len = 36 + ((R() * 70) | 0), seg = pts.slice(Math.max(0, i - 2), Math.min(n, i + len + 1)), w = 2.4 + 7.5 * R() * R() + 1.5 * R(); segs.push([seg, w, 5600 + ci * 50 + j, i + len >= n ? 0.3 : 0.18]); i += len; } });
    segs.forEach(([seg, w, sd, ex], k) => cutT(g, seg, w, sd, { entry: 0.12, exit: ex, jit: 0.7 }, E.heads[0] + (E.yoake - 5 - E.heads[0]) * k / segs.length, 3));
    // 左から来る溝(S4 の続き)
    grooveP(g, [[F.x0 - 20, 902], [470, 902], [540, 832], [fb[0] + 40, 832]], { w0: 12, w1: 4, seed: 5701, chip: 2.6 }, pushProg([[c0, 0.4, 4], [E.heads[0], 0.72, 5], [E.heads[1], 1, 5]]));
    const T = setV("SMB", "夜明けの", 330, 214, 132, 0.12);
    keepOut(g, T, 30); carveT(g, T, 5760, E.t);
    g.restore();
    // 琥珀: 芯の平らな版(字の中だけ)。区間の最強で下から刷る
    const [pp, pg] = plateBuf("plA"); pg.save(); pg.beginPath(); pathOf(pg, Fh.cs); pg.clip("nonzero"); pg.beginPath();
    for (let k = 0, n = 26; k < n; k++) { const a0 = (k / n) * 6.283, a1 = ((k + 1) / n) * 6.283, R = PR(5, 3, k), r = 150 + 60 * R() + 40 * Math.sin(k * 0.9); for (let t = 0; t <= 1; t += 0.2) { const a = lerp(a0, a1, t), bulge = r * (1 + 0.07 * Math.sin(Math.PI * t)); pg.lineTo(Cc[0] + Math.cos(a) * bulge * 1.05, Cc[1] + Math.sin(a) * bulge * 0.95); } }
    pg.closePath(); pg.fill(); pg.restore();
    baren(pg, [Cc[0] - 300, Cc[1] - 290, Cc[0] + 300, Cc[1] + 290], E.hero, "up", 5801);
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T, { grain: -0.08, cut: 5, sheet: 2 }, { cut_id: "S5", events: E, rough: +rp.toFixed(3), center: Cc.map(Math.round), mbox: { core: [Cc[0] - 300, Cc[1] - 290, Cc[0] + 300, Cc[1] + 290].map(Math.round), groove: [F.x0, 800, Math.round(fb[0] + 60), 930] }, letters: T.map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }

  // =====================================================================
  // S6 769〜863「夜明けの回路に 火を灯して」(サビ頭、明暗を逆にした全面の琥珀。v7 の手直しの絵)
  //  769(0.80): S5 の芯の琥珀が広がって全面になる(S5 の芯を中心に、丸刀のえぐりの縁の円が 3 コマで画面を覆う)。墨の版(紙の角の影と「夜明けの」)も同じコマで刷る。
  //  784「回路に」を墨の文字版で1字ずつ刷り、溝 3 本(墨の畝)を路から火へ、拍ごとに押して延ばす(787・798・802)。
  //  808「火を灯して」: 火 を刷り、を灯して を1字ずつ。812(0.93、曲の山1)で、火のまわりの面を下から上へ一刀で彫り取る(琥珀が抜けて紙の面)。
  //  楔 3 本は 821・840・845 で1本ずつ。字・畝は墨の文字版(夜明けの B と同じ刷り方)にしたので、彫りのマスクは紙の角の影だけ
  // =====================================================================
  function S6(ctx, o) {
    const f = getF(), sh = shot("S6"), c0 = sh.start, B = BLEED, [m, g] = begin(B), { S6_FACE, S6_WEDGE, S6_GROOVE } = A7_CUTS, Cc = [1372, 468], FS = 340;
    const E = { kairo: word("回路に"), hi: phrase("火を灯して") };
    E.flood = c0; E.gPush = accIn(E.kairo + 1, E.hi - 1).map((x) => x.frame30).slice(0, 3); E.face = strongest(E.hi, E.hi + 8);
    E.wedges = accIn(E.face + 5, sh.end - 10).sort((a, b) => b.strength + b.kick - a.strength - a.kick).slice(0, 3).map((x) => x.frame30).sort((a, b) => a - b);
    E.t2 = [0, 3, 6].map((d) => E.kairo + d); E.t3 = [4, 8, 12, 16].map((d) => E.hi + d);
    const T1 = setH("SMB", "夜明けの", 150, 238, 108, 0.1), T2 = setH("SMB", "回路に", 150, 850, 300, 0.06), Fh = setHC("SMB", "火", Cc[0], Cc[1] + 0.36 * FS, FS), T3 = setV("SMB", "を灯して", 1744, 300, 112, 0.1);
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#000"; for (const [P, sd] of [[[[-10, 1090], [-10, 930], [130, 1000], [300, 1090]], 6011], [[[1520, -10], [1930, -10], [1930, 150], [1790, 96], [1660, 40]], 6012]]) { g.beginPath(); poly(g, chipEdge(P.concat([P[0]]), sd, { big: 0.8 })); g.fill(); }
    g.restore();
    // 琥珀: 全面。S5 の芯から広がる(3 コマ)
    const [pp, pg] = plateBuf("plA"); pg.fillRect(0, 0, W, H);
    if (f < c0 + 3) { const S5C = S5_CORE(), R = [520, 1150, 1900][f - c0], P = []; for (let a = 0; a < 6.283; a += 0.03) P.push([S5C[0] + Math.cos(a) * R, S5C[1] + Math.sin(a) * R * 0.9]); const sc = scallop(P, 6900 + f - c0, { step: [60, 140], depth: [6, 16], chip: 0.1 }); pg.globalCompositeOperation = "destination-in"; pg.beginPath(); poly(pg, sc); pg.fill(); pg.globalCompositeOperation = "source-over"; }
    // 火のまわりの面: 812 で下から上へ一刀(2 コマ。前線は炎の向きに少し傾いた刀のえぐりの縁=まっすぐな横の帯にしない)。楔は1本ずつ
    pg.globalCompositeOperation = "destination-out"; pg.fillStyle = "#000";
    if (f >= E.face) { const q = f === E.face ? 0.58 : 1, fy = lerp(700, 120, q); pg.save(); pg.beginPath(); pg.moveTo(1000, H); for (let x = 1000, k = 0; x <= 1700; x += 22, k++) pg.lineTo(x, fy - 0.22 * (x - 1372) + (hash(k, 1, 6177) - 0.5) * 18 + 10 * Math.sin(x * 0.03)); pg.lineTo(1700, H); pg.closePath(); pg.clip(); const face = scallop(S6_FACE, 6170, { step: [44, 96], depth: [1.5, 4.5], chip: 0.0 }); pg.beginPath(); poly(pg, face); pg.fill(); pg.restore(); }
    S6_WEDGE.forEach(([a, deg, l, w, bend], k) => { const th = (deg * Math.PI) / 180; wedgeT(pg, a, [a[0] + Math.cos(th) * l, a[1] + Math.sin(th) * l], w, 1.4, 6270 + k, bend, 0.9, E.wedges[[1, 0, 2][k]], 3); });
    pg.globalCompositeOperation = "source-over";
    const th = (-62 * Math.PI) / 180, ux = Math.cos(th), uy = Math.sin(th);
    for (const [x, y, l, w, sd] of [[1196, 640, 46, 3.2, 1], [1192, 548, 38, 2.4, 2], [1206, 420, 52, 3.0, 3], [1262, 300, 34, 2.2, 4], [1520, 330, 40, 2.6, 5], [1548, 470, 54, 3.2, 6], [1546, 590, 36, 2.2, 7], [1508, 650, 44, 2.8, 8], [1300, 650, 30, 2.0, 9]]) cut(pg, [[x, y], [x + ux * l * 0.5, y + uy * l * 0.5], [x + ux * l, y + uy * l]], w, 6300 + sd, { entry: 0.25, exit: 0.5, jit: 0.35 });
    // 墨の文字版: 夜明けの(769)・回路に(784〜)・畝 3 本(拍ごとに押す)・火(808)・を灯して
    const box = (Ls, p = 8) => { const b = lettersBox(Ls); return [b[0] - p, b[1] - p, b[2] + p, b[3] + p]; }, LD = (Ls) => (tg) => { tg.beginPath(); pathOf(tg, Ls.flatMap((L) => L.cs)); tg.fill("nonzero"); };
    const [tp, tpg] = plateBuf("plT"), add = (fn, rect, at, dir, seed) => { if (f < at) return; const [t, tg] = plateBuf("plTT"); tg.fillStyle = "#000"; fn(tg); baren(tg, rect, at, dir, seed, { q0: 0.62, dq: 0.3, mottle: false, rag: 0.12 }); tpg.drawImage(t, 0, 0); };
    add(LD(T1), box(T1), c0, "right", 6601);
    T2.forEach((L, i) => add(LD([L]), box([L]), E.t2[i], "down", 6610 + i));
    add(LD(Fh), box(Fh), E.hi, "up", 6620);
    T3.forEach((L, i) => add(LD([L]), box([L]), E.t3[i], "down", 6630 + i));
    const gp = f < E.kairo ? 0 : pushProg([[E.kairo, 0.12, 3]].concat(E.gPush.map((s, i) => [s, [0.4, 0.75, 1][i], 5])));
    tpg.fillStyle = "#000"; S6_GROOVE.forEach((P, i) => grooveP(tpg, P, { w0: [40, 34, 30][i], w1: [10, 9, 8][i], seed: 6160 + i, chip: 0.9, ov: 0.8, splinter: false, taper: 0.05 }, gp));
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat", shift: [-4, 3] }, { c: tp, color: C.INK, kind: "flat", shift: [0, 0] }], o, B, T1.concat(T2, T3), { grain: 0.12, cut: 6, sheet: 3 }, { cut_id: "S6", events: E, groove: +gp.toFixed(3), mbox: { face: [1150, 180, 1600, 690], grooves: [440, 320, 1500, 980] }, letters: T1.concat(T2, Fh, T3).map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }

  // =====================================================================
  // S7 864〜1001「消えかけた声を 光に変えて」: 暗い版(v6 の絵)。
  //  864 刷り替え。上の小さい字「消えかけた声を」(864、要確認)を1字ずつ、粗彫りの途中で止まる(帯の間の黒が残る)。木目は少しずつ彫られる。
  //  897・916: 右上の窓のまわりに、S4 の家の屋根と壁の線(独立審査 v3「窓が黒の中に浮く」の直し)。
  //  937「光に変えて」を1字ずつ。光 を刷った後の拍(948)で 光 に琥珀。て を彫り終えると、て の先から溝 5 本がほどけ(963・972・991 で押す)、
  //  1本目が窓に届いた拍(991)で窓の桟を彫り、2コマ後に窓と溝の先に琥珀
  // =====================================================================
  function S7(ctx, o) {
    const f = getF(), sh = shot("S7"), c0 = sh.start, [m, g] = begin(F), { woodLinesT, handWindowT } = A7_OPEN;
    const E = { kie: phrase("消えかけた声を"), hika: phrase("光に変えて") };
    E.t1 = [...Array(7).keys()].map((k) => E.kie + 4 * k); E.t2 = [0, 5, 10, 15, 20].map((d) => E.hika + d);
    E.roof = accIn(c0 + 25, E.hika - 15).sort((a, b) => b.strength - a.strength).slice(0, 2).map((x) => x.frame30).sort((a, b) => a - b); // 897・916
    E.hikaPrint = firstAcc(E.t2[0] + 9, E.t2[0] + 14); E.push = accIn(E.t2[4] + 3, sh.end - 5).sort((a, b) => b.strength - a.strength).slice(0, 3).map((x) => x.frame30).sort((a, b) => a - b); // 963・972・991
    E.win = E.push[2];
    const T1 = setH("SMB", "消えかけた声を", 180, 250, 84, 0.1), T2 = setH("SMB", "光に変えて", 178, 860, 214, 0.08);
    woodLinesT(g, 7, { amount: 0.22, wmul: 0.8, sd: 7002 }, (x, y, near, id) => (h01(id, 1, 7701) < 0.45 ? NEVER : c0 + 3 + (E.hika - 10 - c0) * h01(id, 2, 7702)));
    keepOut(g, T1, 24); keepOut(g, T2, 36);
    const te = T2[T2.length - 1], tb = bbox(te.cs); let ex = [tb[2], (tb[1] + tb[3]) / 2]; for (const ct of te.cs) for (const q of ct) if (q[0] > ex[0] - 1 && q[1] < ex[1] + 60 && q[1] > tb[1]) ex = q;
    const WN = { x: 1612, y: 238, w: 62, h: 78 }, wx = WN.x + WN.w / 2, wy = WN.y + WN.h + 12;
    const S = [ex[0] - 14, ex[1] + 2], X = S[0], Y = S[1], D = (x0, y0, dx) => [x0 + dx, y0 - dx];
    const G1 = [S, [X + 110, Y], D(X + 110, Y, 250), [X + 520, Y - 250], [wx - 20, wy + 20], [wx, wy]];
    const G2 = [[X - 4, Y + 15], [X + 190, Y + 15], D(X + 190, Y + 15, 200), [X + 560, Y - 185]];
    const G3 = [[X - 6, Y - 14], [X + 60, Y - 14], [X + 150, Y - 190], [X + 190, Y - 330]];
    const G4 = [[X - 8, Y + 30], [X + 300, Y + 30], [X + 470, Y - 50], [X + 600, Y - 50]];
    const G5 = [[X + 360, Y - 250], D(X + 360, Y - 250, 70), [X + 430, Y - 410]];
    const pz = (a, b, c) => pushProg([[E.push[0], a, 6], [E.push[1], b, 6], [E.push[2], c, 5]]), p1 = pz(0.36, 0.72, 1);
    g.fillStyle = "#fff";
    grooveP(g, G1, { w0: 15, w1: 4, seed: 7101, chip: 2.6, taper: 0.06 }, p1);
    grooveP(g, G2, { w0: 10, w1: 2, seed: 7102, chip: 2.0 }, pz(0.5, 1, 1));
    grooveP(g, G3, { w0: 8, w1: 2.4, seed: 7103, chip: 2.2 }, pz(0.6, 1, 1));
    grooveP(g, G4, { w0: 6, w1: 1.2, seed: 7104, chip: 1.6 }, pz(0.3, 0.75, 1));
    grooveP(g, G5, { w0: 6, w1: 1.5, seed: 7105, chip: 1.4 }, f < E.push[1] ? 0 : pushProg([[E.push[1], 0.45, 6], [E.push[2], 1, 5]]));
    carveT(g, T1, 7200, E.t1, { speed: 1.3 }); carveT(g, T2, 7200, E.t2, { i0: 7 });
    g.save(); g.beginPath(); pathOf(g, T1.flatMap((L) => L.cs)); g.clip("nonzero"); g.fillStyle = "#000";
    const b1 = lettersBox(T1); for (const [k, y, R] of rowsOf(7, 2, b1[1], b1[3], () => 7)) { let x = b1[0]; while (x < b1[2]) { const len = 30 + R() * 120; if (R() < 0.62) g.fillRect(x, y + R(), len, 3.2); x += len + 10 + R() * 40; } }
    g.restore();
    // 窓と、窓のまわりの家(屋根と壁の線。S4 の家の続き)
    g.fillStyle = "#fff"; [[[1526, 226], [1585, 186], [1643, 146]], [[1643, 146], [1700, 186], [1722, 200]], [[1740, 236], [1741, 300]], [[1500, 242], [1532, 226]]].forEach((P, i) => cutT(g, P, [4.4, 2.6, 2.2, 1.8][i], 7350 + i, { entry: 0.06, exit: [0.2, 0.6, 0.5, 0.4][i], jit: 0.7 }, E.roof[i < 2 ? 0 : 1] + (i % 2) * 2, 4)); // 窓の光を受ける屋根の辺だけ(閉じた家の絵記号にしない)
    g.fillStyle = "#000"; g.fillRect(WN.x - 6, WN.y - 6, WN.w + 12, WN.h + 12); g.fillStyle = "#fff"; handWindowT(g, WN.x, WN.y, WN.w, WN.h, 2, 2, 7300, E.win, 1);
    g.restore();
    const [pp, pg] = plateBuf("plA"); pg.fillRect(WN.x - 4, WN.y - 4, WN.w + 8, WN.h + 8); baren(pg, [WN.x - 8, WN.y - 8, WN.x + WN.w + 8, WN.y + WN.h + 8], E.win + 2, "down", 7401);
    grooveP(pg, G1, { w0: 15, w1: 4, seed: 7101, chip: 2.6, taper: 0.06 }, p1); pg.globalCompositeOperation = "destination-out"; pg.fillRect(0, 0, 1300, H); pg.globalCompositeOperation = "source-over";
    { const [lc, lg] = plateBuf("plHika"); lg.fillStyle = "#000"; letterPlate(lg, T2[0], { rect: [-0.1, -1.2, 1.2, 0.4] }); baren(lg, box1(T2[0]), E.hikaPrint, "up", 7402); pg.drawImage(lc, 0, 0); }
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T1.concat(T2), { grain: -0.1, cut: 7, sheet: 0 }, { cut_id: "S7", events: E, g1: +p1.toFixed(3), mbox: { window: [WN.x - 8, WN.y - 8, WN.x + WN.w + 8, WN.y + WN.h + 8], grooves: [Math.round(X - 10), 120, 1700, Math.round(Y + 40)], roof: [1520, 130, 1770, 360] }, letters: T1.concat(T2).map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }
  const box1 = (L, p = 8) => { const b = bbox(L.cs); return [b[0] - p, b[1] - p, b[2] + p, b[3] + p]; };

  // =====================================================================
  // S9 1173〜1339「まだ、光は消えない」: 最も黒い版(v6 の絵)。S1 と韻(何も彫られていない版木に木目)。
  //  1173 刷り替え。「まだ、」(1173、要確認)を1字ずつ。読点を彫り終えた後の強い拍(1198、0.70)で読点に琥珀(燃え残り)。
  //  第2段で足した歌詞:「光は」(1203)・「消えない」(1280、要確認)を左の列に縦組みで(v6 の静止画には無い)。
  //  読点の下の溝は拍ごとに下へ押す(1217・1255・1274。版木の下の縁を越えて夜明けへ続く)。木目は 1300 まで少しずつ彫られる。
  //  1302〜1338 は歌のブレイク: 何も動かさない(意図した間。holds_partM.json に登録)
  // =====================================================================
  function S9(ctx, o) {
    const f = getF(), sh = shot("S9"), c0 = sh.start, [m, g] = begin(F), { woodLinesT } = A7_OPEN;
    const E = { mada: word("まだ、"), hikari: word("光は"), kienai: word("消えない") };
    E.t = [0, 7, 15].map((d) => E.mada + d); E.comma = strongest(E.t[2] + 6, E.hikari); E.t4 = [E.hikari, E.hikari + 7, E.kienai, E.kienai + 5, E.kienai + 10, E.kienai + 15];
    E.drop = accIn(E.hikari + 5, E.kienai - 2).map((x) => x.frame30).filter((x) => x !== E.comma).slice(0, 3); E.brk = firstAcc(1295, 1310);
    woodLinesT(g, 9, { amount: 0.3, wmul: 0.85, sd: 9002 }, (x, y, near, id) => (h01(id, 1, 9701) < 0.5 ? NEVER : c0 + 3 + (E.brk - 6 - c0 - 3) * h01(id, 2, 9702)));
    const T = setV("SMB", "まだ、", 1312, 150, 250, 0.08), cb = bbox(T[2].cs), dx = (cb[0] + cb[2]) / 2, dy = cb[3];
    const T4 = setV("SMB", "光は消えない", 1010, 330, 96, 0.1);
    keepOut(g, T, 46); keepOut(g, T4, 30); g.fillStyle = "#000"; g.fillRect(dx - 30, dy + 10, 60, F.y1 - dy);
    g.fillStyle = "#fff"; grooveP(g, [[dx, dy + 22], [dx + 3, dy + 220], [dx - 2, F.y1 + 30]], { w0: 20, w1: 2.2, seed: 9101, chip: 2.2, splinter: false, taper: 0.01 }, pushProg(E.drop.map((s, i) => [s, [0.3, 0.65, 1][i], 6])));
    carveT(g, T, 9200, E.t); carveT(g, T4, 9300, E.t4);
    g.restore();
    const [pp, pg] = plateBuf("plA"); letterPlate(pg, T[2], { contour: 0 }); baren(pg, box1(T[2], 10), E.comma, "down", 9401);
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T.concat(T4), { grain: -0.04, cut: 9, sheet: 2 }, { cut_id: "S9", events: E, drop: [Math.round(dx), Math.round(dy)], mbox: { comma: box1(T[2], 10).map(Math.round), drop: [Math.round(dx - 30), Math.round(dy), Math.round(dx + 30), F.y1] }, letters: T.concat(T4).map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }

  const CUTS = { S5, S6, S7, S8, S9 };
  function draw(ctx, o) {
    const f = getF();
    for (const id of Object.keys(CUTS)) { const s = shot(id); if (f >= s.start && f < s.end) return CUTS[id](ctx, o); }
    return null;
  }
  return { draw, CUTS };
})();
