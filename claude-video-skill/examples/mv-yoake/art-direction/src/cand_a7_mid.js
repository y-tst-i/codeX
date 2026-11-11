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
    // 町明かりの帯(地平): 刷り替えのコマで最初の一刀(左から 3 コマで)
    g.fillStyle = "#fff"; const gaps = [[300, 340], [620, 700], [1010, 1030], [1380, 1460], [1700, 1720]];
    let x0 = F.x0 - 10; for (const [a, b] of gaps.concat([[F.x1 + 10, F.x1 + 20]])) { const pts = []; for (let x = x0; x <= a; x += 12) pts.push([x, HZ + 3 * Math.sin(x * 0.01)]); if (pts.length > 1) { const pp = clamp((f - c0 + 1) / 3 * 1.6 - u(x0) * 0.6); if (pp >= 1) cutW(g, PH(pts), 18 + 8 * hash(a, 1, 8), 14 + 10 * hash(a, 2, 8), 8100 + a, 1.2); else if (pp > 0) cutW(g, PH(pts.slice(0, Math.max(2, Math.ceil(pts.length * pp)))), 18 + 8 * hash(a, 1, 8), lerp(18 + 8 * hash(a, 1, 8), 14 + 10 * hash(a, 2, 8), pp), 8100 + a, 1.2); } x0 = b; }
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

  const CUTS = { S8 };
  function draw(ctx, o) {
    const f = getF();
    for (const id of Object.keys(CUTS)) { const s = shot(id); if (f >= s.start && f < s.end) return CUTS[id](ctx, o); }
    return null;
  }
  return { draw, CUTS };
})();
