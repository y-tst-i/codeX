// 案A+C v5 のカット S1〜S9(0〜46秒)。部品は cand_a5.js(A5)。夜明け(46〜53秒)は cand_a5_dawn.js。
// 各カットの「主役の刀」(3〜10本)は手で座標を決めて描く(HERO_*)。乱数(位置の hash)の刀は背景の地紋だけに使う。
// 色の流れ: 琥珀の量は S2 → S3 → S4 → S5 で段々に増え、S6(28秒)で琥珀が主の全面、S7・S8 で一度下がり、S9 でほぼ 0、夜明けで開く。
const A5_CUTS = (() => {
  const { W, H, clamp, lerp, smooth, hash, fbm, vnoise, resample, stroke, bbox, pathOf } = AD;
  const { C, FRAME, BLEED, PR, begin, plateBuf, poly, cut, cutW, wedge, groove, stab, lens, chipEdge, setH, setHC, setV, lettersBox, carve, keepOut, letterPlate, textMargin, bokashi, print, maskOnly } = A5;
  const F = FRAME;
  // 仕上げ: マスクだけ(v=mask)か、刷り。字の置き場所の検査を計測値に足す
  function fin(ctx, m, plates, o, B, texts, extra = {}) {
    const tm = textMargin(texts, B);
    if (o.mask) return Object.assign(maskOnly(ctx, m), { text: tm }, extra);
    return Object.assign(print(ctx, m, plates, Object.assign({ look: o.look, B }, extra.printOpt || {})), { text: tm }, extra, { printOpt: undefined });
  }


  // ===== 背景の地紋の道具(位置の hash) =====
  // 行: 行 k の y は前の行から gap(y, R) だけ下(R は行 k だけの乱数列)。行の中の刀は、その行の列 R で左から決める(f・p に依らない)
  function rowsOf(cut, layer, y0, y1, gap) { const out = []; let y = y0, k = 0; while (y < y1 && k < 4000) { out.push([k, y, PR(cut, layer, k)]); y += gap(y, PR(cut, layer + 50, k)); k++; } return out; }
  // 手で切った窓(区切りの数・大きさ・傾きを窓ごとに変える)
  function handWindow(g, x, y, w, h, cols, rows, seed) {
    const bar = Math.max(4, w * 0.11), pw = (w - bar * (cols - 1)) / cols, ph = (h - bar * (rows - 1)) / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i, q = (a) => (hash(k, a, seed) - 0.5) * 2.2, x0 = x + i * (pw + bar), y0 = y + j * (ph + bar); g.beginPath(); poly(g, [[x0 + q(1), y0 + q(2)], [x0 + pw + q(3), y0 + q(4)], [x0 + pw + q(5), y0 + ph + q(6)], [x0 + q(7), y0 + ph + q(8)]]); g.fill(); }
  }
  // 光を受ける辺だけに刀(face(a, b) が真の辺)。太さ wFn(中点)
  function rimEdges(g, P, seed, face, wFn) { g.fillStyle = "#fff"; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6 || !face(a, b)) continue; const w = wFn([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); if (w < 0.6) continue; cut(g, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], w, seed + k, { entry: 0.1, exit: 0.3, jit: 0.45 }); } }

  // 木目の線(版木の地紋): 節をよける流れの流線を拾い、線ごとに途切れる刀にする。値は (cut, 線の番号, 区間, 何本目) の hash。
  // K = [cx, cy, R, 横の伸び] の節(なければ null)、amount = 量(1 で S1)、wmul = 太さの倍率
  function woodLines(g, cutId, { K = null, amount = 1, wmul = 1, sd = 6002 } = {}) {
    const kd = (x, y) => (K ? Math.hypot((x - K[0]) / K[3], y - K[1]) / K[2] : 99);
    const psi = (x, y) => { let v = y + 140 * (fbm(x * 0.0011, y * 0.0007, sd, 3) - 0.5) + 14 * Math.sin(x * 0.0029 + y * 0.002 + 1.3) - x * 0.05; if (K) { const dx = (x - K[0]) / K[3], dy = y - K[1], d2 = dx * dx + dy * dy; v -= (K[2] * K[2] * 1.3 * dy) / Math.max(d2, K[2] * K[2]); } return v; };
    const SP = 13, XS = 4, lines = {};
    for (let x = F.x0 - 12; x <= F.x1 + 12; x += XS) {
      let py = F.y0 - 30, pv = psi(x, py), pin = kd(x, py) < 1.12;
      for (let y = F.y0 - 28; y <= F.y1 + 30; y += 2) { const v = psi(x, y), inn = kd(x, y) < 1.12; if (!inn && !pin) { const k0 = Math.ceil(Math.min(pv, v) / SP), k1 = Math.floor(Math.max(pv, v) / SP); for (let k = k0; k <= k1; k++) (lines[k] = lines[k] || []).push([x, lerp(py, y, (k * SP - pv) / (v - pv || 1))]); } py = y; pv = v; pin = inn; }
    }
    g.fillStyle = "#fff";
    for (const k in lines) {
      const P = lines[k]; let seg = [P[0]], si = 0;
      const flush = () => {
        if (seg.length < 4) { si++; return; } const sp = resample(seg, 3); let i = 0, j = 0;
        while (i < sp.length - 3) {
          const R = PR(cutId, 1, +k * 50 + si, j++), [x, y] = sp[i], near = clamp(1 - (kd(x, y) - 1) / 4), tone = clamp(0.28 + 0.55 * near + 0.5 * (fbm(x * 0.003, y * 0.012, sd + 1, 2) - 0.5) * 2), n = 30 + ((R() * 130) | 0);
          if (R() < (0.15 + tone) * amount) cut(g, sp.slice(i, i + n), lerp(1.0, 2.6, tone) * (0.8 + 0.4 * R()) * wmul, cutId * 7000 + j + +k * 31, { entry: 0.12, exit: 0.25, jit: 0.35 });
          i += n + 1 + ((R() * (1 - tone) * 30) | 0);
        }
        si++;
      };
      for (let i = 1; i < P.length; i++) { const [x, y] = P[i], [x0, y0] = P[i - 1]; if (x - x0 === XS && Math.abs(y - y0) < 9) seg.push(P[i]); else { flush(); seg = [P[i]]; } }
      flush();
    }
  }

  // =====================================================================
  // S1 2秒(60コマ)間奏「版木と最初の一刀」
  // 何も彫っていない版木。木目は節をよけて流れる(地紋=位置の hash)。節は1つで大きく、年輪は崩れて途切れる(的・目に見せない)。
  // 主役の刀(手で決めた5本): 三角刀の一刀が左の手前から入り、45度で2段上がって x≈900 で止まる(8秒で窓が灯る x≈914 の手前)。
  // 角では刀を入れ直した行き過ぎが残り、ふちは欠け、先はささくれる。丸い端子はない
  // =====================================================================
  const HERO_S1 = [[F.x0 - 30, 868], [318, 868], [438, 748], [676, 748], [752, 672], [900, 672]];
  function S1(ctx, o) {
    const [m, g] = begin(F), p = o.p == null ? 1 : o.p;
    const K = [1298, 318, 64, 2.7]; // 節: 中心、半径、横の伸び
    const kd = (x, y) => Math.hypot((x - K[0]) / K[3], y - K[1]) / K[2];
    woodLines(g, 1, { K });
    // 節: 芯は彫らない黒(楕円より少し尖る)。年輪は詰まって 8 本、外ほど間が広い。どの輪も同じ向きにゆがみ(片側が張る)、1〜2 か所で切れる。放射の割れ 2 本
    const ringR = (a, j) => { const lobe = 1 + 0.16 * Math.cos(a - 0.6) + 0.07 * Math.cos(2 * a + 1.1), n = 1 + 0.07 * (fbm(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 6210 + j, 3) - 0.5) * 2; return lobe * n; };
    for (let j = 0; j < 8; j++) {
      const R = PR(1, 2, j), base = K[2] * (0.34 + 0.09 * j + 0.012 * j * j), gaps = [R() * 6.28, R() < 0.6 ? R() * 6.28 : 99], w = lerp(1.3, 2.9, R()) * (j < 2 ? 1.25 : 1);
      let pts = [];
      const flushR = () => { if (pts.length > 5) cut(g, pts, w, 6200 + j * 10 + pts.length, { entry: 0.2, exit: 0.3, jit: 0.45 }); pts = []; };
      for (let a = 0; a < 6.3; a += 0.025) {
        if (gaps.some((q) => Math.abs(((a - q + 9.42) % 6.283) - 3.14) < 0.22 + 0.15 * R())) { flushR(); continue; }
        const rr = base * ringR(a, j), e = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.8);
        pts.push([K[0] + e * rr * K[3], K[1] + Math.sin(a) * rr]);
      }
      flushR();
    }
    for (const [a0, l, k] of [[0.35, 2.3, 0], [3.5, 1.7, 1]]) { const pts = []; for (let t = 0; t <= 1; t += 0.1) { const rr = K[2] * lerp(0.36, l, t), a = a0 + 0.08 * Math.sin(t * 5); pts.push([K[0] + Math.cos(a) * rr * K[3] * 0.95, K[1] + Math.sin(a) * rr]); } cut(g, pts, 2.4, 6250 + k, { entry: 0.05, exit: 0.8, jit: 0.6 }); }
    // 主役: 最初の一刀(彫りの進み p で先まで。刀の形は p に依らない: 全体を描いてから、まだ彫っていない所を黒で戻す)
    const L = groove(g, HERO_S1, { w0: 27, w1: 13, seed: 6301, chip: 3.0, ov: 1.1, taper: 0.07 });
    if (p < 1) { // 進み p より先を黒で戻す(進みの検査用)
      const segs = []; let acc = 0; for (let k = 0; k < HERO_S1.length - 1; k++) { const a = HERO_S1[k], b = HERO_S1[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, acc, l]); acc += l; }
      const s = p * acc; let tip = HERO_S1[HERO_S1.length - 1]; for (const [a, b, a0, l] of segs) if (s >= a0 && s <= a0 + l) { const t = (s - a0) / l; tip = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }
      g.fillStyle = "#000"; g.save(); g.beginPath(); g.rect(tip[0], 0, W, H); g.clip(); g.beginPath(); g.lineWidth = 46; g.strokeStyle = "#000"; g.moveTo(HERO_S1[0][0], HERO_S1[0][1]); for (const q of HERO_S1) g.lineTo(q[0], q[1]); g.stroke(); g.restore();
    }
    g.restore();
    return fin(ctx, m, [], o, F, [], { hero_len: Math.round(L), printOpt: { grain: -0.05, cut: 1 } });
  }

  // =====================================================================
  // S2 8秒(240コマ)「暗闇の数だけ」: v1(cand_a2 の 8秒)の構図(地平の町、灯った窓1つ、右の縦組み、川)を残して描き直した。
  //  ・建物は白い輪郭線で囲まない: 黒の塊のまま、灯りに向いた辺だけを刀で欠き取る(彫り残しで形を出す)
  //  ・窓のまわりの同じ間隔の弧 → 手で決めた楔の刀 13 本(内ほど太く長く、外ほどまばら)
  //  ・字から窓への線は、字の側が根元で太く、窓で尖って止まる溝(端子なし)
  // =====================================================================
  const S2D = { EMB: 712, EMB2: 760, WC: [914, 592] };
  const S2_CITY = [
    [[F.x0 - 10, 712], [F.x0 - 10, 318], [70, 318], [70, 302], [86, 302], [86, 270], [92, 262], [114, 262], [120, 270], [120, 302], [134, 302], [134, 318], [152, 318], [152, 712]],
    [[150, 712], [150, 566], [208, 524], [266, 566], [266, 712]],
    [[262, 712], [262, 474], [296, 474], [296, 444], [338, 444], [338, 430], [356, 430], [356, 444], [394, 444], [394, 474], [420, 474], [420, 712]],
    [[418, 712], [418, 636], [434, 636], [442, 232], [462, 232], [470, 600], [480, 600], [480, 712]],
    [[476, 712], [476, 500], [552, 500], [552, 478], [600, 478], [600, 500], [644, 500], [644, 712]],
    [[712, 712], [712, 612], [754, 584], [796, 612], [796, 602], [830, 578], [864, 602], [864, 712]],
    [[860, 712], [860, 526], [884, 526], [884, 514], [952, 514], [952, 526], [980, 526], [980, 712]],
    [[976, 712], [976, 650], [1064, 676], [1064, 712]],
  ];
  // 楔: [半径, 根元の角度(度), 進む角度(度), 根元の太さ]。楕円 1.55×0.78 の上で、根元から先へ細る
  const S2_WEDGE = [[128, -14, -62, 17], [150, -168, 46, 13], [176, -40, -44, 12], [214, -150, 30, 10], [246, -6, -52, 11], [272, -64, -26, 8], [318, -22, -40, 8.5], [352, -142, 22, 6.5], [404, -4, -30, 7], [452, -48, -20, 5.5], [530, -10, -24, 5], [590, -160, 12, 4], [640, -30, -14, 3.6]];
  function S2(ctx, o) {
    const [m, g] = begin(F), { EMB, EMB2, WC } = S2D;
    const T = setV("SMB", "暗闇の数だけ", 1600, 122, [158, 158, 112, 112, 112, 112], 0.1), tb = lettersBox(T);
    const nearT = (x, y) => x > tb[0] - 50 && x < tb[2] + 50 && y > tb[1] - 40 && y < tb[3] + 40;
    // 空: 版木を彫り取って紙にし、藍のぼかし摺り(上が濃く、地平へ薄く。境目はまっすぐ)を刷る。町は黒い影で立つ
    g.fillStyle = "#fff"; g.fillRect(F.x0 - 10, F.y0 - 10, F.x1 - F.x0 + 20, EMB - F.y0 + 10);
    // 主役: 窓のまわりの楔(手で決めた 13 本)。空の版から抜いて紙の白で見せる
    const wedges = []; S2_WEDGE.forEach(([r, a0, span, w], i) => { const pts = []; for (let t = 0; t <= 1.0001; t += 0.04) { const a = ((a0 + span * t) * Math.PI) / 180, rr = r * (1 + 0.04 * Math.sin(t * 3 + i)); const p = [WC[0] + Math.cos(a) * rr * 1.55, WC[1] + Math.sin(a) * rr * 0.78]; if (p[1] > EMB - 6 || nearT(p[0], p[1])) break; pts.push(p); } if (pts.length > 3) wedges.push([resample(pts, 3), w, i]); });
    const drawWedges = (gg) => { for (const [sp, w, i] of wedges) { gg.beginPath(); stroke(gg, sp, (u, j) => w * Math.pow(1 - u, 0.8) * (u < 0.05 ? 0.6 + 8 * u : 1) * (0.9 + 0.2 * vnoise(j * 0.1, i, 7)), { jit: 0.9, seed: 2200 + i }); gg.fill(); } };
    // 水面: 地平の下。窓の真下ほど明るい映り
    for (const [k, y, R] of rowsOf(2, 2, EMB2 + 9, F.y1 - 4, (y) => 5.5 + (y - EMB2) * 0.036)) { let x = F.x0 - 20 + R() * 40; while (x < F.x1) { const half = 100 + (y - EMB2) * 0.45, d = Math.abs(x - WC[0]) / half, tone = Math.max(0.16 * (1 - (y - EMB2) / 400), Math.pow(clamp(1 - d), 1.6) * (1 - (y - EMB2) / 460)), len = lerp(26, 150, Math.pow(R(), 1.4)) * lerp(0.6, 1.2, tone), w = lerp(1.0, 7, tone) * (0.6 + 0.8 * R()); if (R() < 0.22 + tone) lens(g, x + len / 2, y + (vnoise(x * 0.01, y * 0.05, 3) - 0.5) * 3, len / 2, w, k * 991 + (x | 0)); x += len + lerp(46, 8, tone) * (0.4 + R() * 1.2); } }
    // 町: 黒の塊。灯りに向く辺(窓より左の建物は右の辺と上の辺、右の建物は左の辺)だけ刀
    g.fillStyle = "#000"; const city = S2_CITY.map((P, i) => chipEdge(P, 2300 + i, { big: 0.35 })); for (const P of city) { g.beginPath(); poly(g, P); g.fill(); }
    const TANK = [[650, 474], [681, 450], [712, 474], [708, 528], [654, 528]], LEGS = [[[660, 528], [654, EMB]], [[702, 528], [708, EMB]], [[660, 560], [704, 612]], [[704, 560], [658, 612]], [[657, 612], [705, 612]]];
    g.beginPath(); poly(g, TANK); g.fill(); g.strokeStyle = "#000"; g.lineCap = "butt"; LEGS.forEach(([a, b], i) => { g.lineWidth = i < 2 ? 6 : 3.4; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); });
    g.lineWidth = 4.5; g.beginPath(); g.moveTo(918, 514); g.lineTo(918, 300); g.stroke(); g.lineWidth = 2.6; for (const [a, b] of [[[904, 360], [932, 360]], [[908, 410], [928, 410]]]) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.fillStyle = "#000"; g.fillRect(0, EMB, W, EMB2 - EMB);
    const lightW = (q) => 4.2 * Math.pow(clamp(1 - Math.hypot(q[0] - WC[0], (q[1] - WC[1]) * 1.6) / 420), 1.3);
    city.forEach((P, i) => { const cx = P.reduce((s, q) => s + q[0], 0) / P.length, left = cx < WC[0]; rimEdges(g, P, 2400 + i * 40, (a, b) => (left ? b[1] > a[1] + 20 && Math.abs(b[0] - a[0]) < 8 && a[0] < WC[0] : b[1] < a[1] - 20 && Math.abs(b[0] - a[0]) < 8) || (b[0] > a[0] + 6 && Math.abs(b[1] - a[1]) < (b[0] - a[0]) * 1.2 && a[1] < EMB - 8), lightW); });
    rimEdges(g, TANK, 2470, (a, b) => b[0] > a[0], lightW);
    // 灯りの側の壁に落ちる光: 窓の右と下の壁に、短い横の刀(窓に近いほど太い)
    g.fillStyle = "#fff";
    for (const [k, y, R] of rowsOf(2, 3, WC[1] - 54, EMB - 6, () => 5)) { let x = 862 + R() * 8; while (x < 978) { const d = Math.hypot((x - WC[0]) / 1.3, y - WC[1]) / 92; if (d < 1 && R() > d * 0.55) cut(g, [[x, y], [x + (8 + 14 * (1 - d)), y + (R() - 0.5)]], 1.0 + 3.2 * (1 - d), k * 31 + (x | 0), { entry: 0.1, exit: 0.6, jit: 0.3 }); x += 12 + R() * 8; } }
    // 消えた窓(小さい彫り、6つだけ)
    for (const [i, [x, y]] of [[94, 360], [118, 510], [316, 520], [512, 560], [606, 540], [1010, 690]].entries()) { const w = 9 + hash(i, 3, 9) * 6, h = 12 + hash(i, 4, 9) * 7; g.beginPath(); poly(g, [[x, y], [x + w, y + (hash(i, 5, 9) - 0.5) * 2], [x + w + (hash(i, 6, 9) - 0.5) * 2, y + h], [x, y + h + (hash(i, 7, 9) - 0.5) * 2]]); g.fill(); }
    // 主役: 字の下から窓へ、彫った溝(字の側が根元)
    g.fillStyle = "#fff"; groove(g, [[tb[0] + 30, 736], [1250, 736], [1052, 736], [1020, 704], [1020, 684], [990, 656], [938, 656], [916, 640]], { w0: 15, w1: 3.5, seed: 2501, chip: 2.6 });
    // 窓
    g.fillStyle = "#000"; g.fillRect(882, 552, 64, 78); g.fillStyle = "#fff"; handWindow(g, 887, 557, 54, 68, 2, 2, 31);
    carve(g, T, 2600);
    g.restore();
    const [q, qg] = plateBuf("plB"); bokashi(qg, 0, F.y0, 0, EMB, [[0, 1], [0.5, 0.97], [0.82, 0.78], [1, 0.5]]); qg.globalCompositeOperation = "destination-out"; drawWedges(qg); keepOut(qg, T, 4); qg.fillStyle = "#000"; for (const P of city) { qg.beginPath(); poly(qg, P); qg.fill(); } qg.fillRect(0, EMB - 2, W, H); qg.globalCompositeOperation = "source-over";
    const [p, pg] = plateBuf("plA"); // 琥珀: 窓と、窓のまわりの壁の光(平らな版、ふちは刀で切った多角形)、暗の日・闇の中の日
    pg.save(); pg.beginPath(); poly(pg, city[6]); pg.clip(); pg.beginPath(); poly(pg, chipEdge([[870, 540], [962, 534], [976, 600], [968, 672], [874, 676], [866, 610], [870, 540]], 2551, { big: 0.6 })); pg.fill(); pg.restore();
    letterPlate(pg, T[0], { rect: [0.04, -0.8, 0.36, -0.12] }); letterPlate(pg, T[1], { contour: 6 });
    return fin(ctx, m, [{ c: q, color: C.AI, kind: "bokashi", shift: [2, -1] }, { c: p, color: C.AMBER, kind: "flat" }], o, F, T, { printOpt: { grain: 0.03, cut: 2 } });
  }

  // =====================================================================
  // S3 12.3秒(370コマ)「輝きは増す」: 高い所から川の曲がり。向こう岸は左の遠くから右の手前へ下る黒い影(空は藍のぼかし摺りで、境目がはっきり)。
  // 主役は手前の右の舟の提灯1つ(画面の高さの約 15%)。その映りの刀が画面の下まで続き、1つの灯が欠片で増す。字は映りの脇に縦組み
  // =====================================================================
  function S3(ctx, o) {
    const [m, g] = begin(F), U = (x) => clamp((x - F.x0) / (F.x1 - F.x0));
    const yb = (x) => lerp(214, 352, Math.pow(U(x), 1.35)) + 10 * Math.sin(U(x) * 4.1 + 0.6), sc = (x) => lerp(0.46, 1.2, Math.pow(U(x), 1.1));
    // 向こう岸の町: 屋根の型6つを組み合わせて(遠いほど小さい)。形は PR(3,1,k)
    const shapes = [], bld = []; let x = F.x0 - 14, k = 0;
    while (x < F.x1 + 10) {
      const R = PR(3, 1, k), s = sc(x), w = (44 + R() * 84) * s, h = (26 + R() * 64) * s, t = [0, 1, 3, 0, 5, 1, 4, 0, 2, 3, 1, 5][(k * 5 + ((R() * 4) | 0)) % 12], b0 = yb(x) + 4, b1 = yb(x + w) + 4, tp = Math.min(b0, b1) - h;
      let P;
      if (t === 0) P = [[x, b0], [x, tp], [x + w / 2, tp - 24 * s], [x + w, tp], [x + w, b1]];
      else if (t === 1) P = [[x, b0], [x, tp - 16 * s], [x + w, tp], [x + w, b1]];
      else if (t === 2) { P = [[x, b0], [x, tp]]; for (let i = 0; i < 3; i++) { P.push([x + (w * (i + 0.85)) / 3, tp - 18 * s]); P.push([x + (w * (i + 0.85)) / 3, tp]); } P.push([x + w, tp], [x + w, b1]); }
      else if (t === 3) P = [[x, b0], [x, tp], [x + w * 0.6, tp], [x + w * 0.6, tp - 20 * s], [x + w * 0.85, tp - 20 * s], [x + w * 0.85, tp], [x + w, tp], [x + w, b1]];
      else if (t === 4) P = [[x, b0], [x, tp], [x + w * 0.7, tp], [x + w * 0.7, tp - 80 * s], [x + w * 0.7 + 10 * s, tp - 80 * s], [x + w * 0.7 + 10 * s, tp], [x + w, tp], [x + w, b1]];
      else P = [[x, b0], [x, tp + h * 0.4], [x + w, tp + h * 0.4 - 10 * s], [x + w, b1]];
      shapes.push(chipEdge(P, 3800 + k, { big: 0.25 })); bld.push({ x, w, tp, h, s, b: Math.max(b0, b1) }); x += w - 2; k++;
    }
    const WL = 742; // 舟の喫水
    // 空: 彫り取って紙 → 藍のぼかし摺り
    g.fillStyle = "#fff"; g.fillRect(F.x0 - 10, F.y0 - 10, W, 380);
    g.fillStyle = "#000"; for (const P of shapes) { g.beginPath(); poly(g, P); g.fill(); }
    g.beginPath(); g.moveTo(F.x0 - 20, yb(F.x0) - 1); for (let xx = F.x0 - 20; xx <= F.x1 + 20; xx += 8) g.lineTo(xx, yb(xx) - 1); g.lineTo(F.x1 + 20, H); g.lineTo(F.x0 - 20, H); g.closePath(); g.fill();
    // 岸の灯り(5つだけ。小さい)
    const LIT = [[0.18, 0], [0.47, 1], [0.58, 0], [0.74, 1], [0.86, 0]].map(([u, j], i) => { const B = bld[Math.min(bld.length - 1, Math.round(u * (bld.length - 1)))], sz = (11 + 4 * j) * B.s; return { x: B.x + B.w * 0.35, y: B.tp + B.h * 0.35 + 4 * B.s, w: sz, h: sz * 1.25, water: B.b + 12, reach: 0.05 + 0.12 * u, id: i }; });
    // 水面: 岸の下は空の映りで少し明るい細い刀(岸から 70px で消える)、手前はほとんど黒。提灯のまわりだけ刀が増える
    const LAN = { x: 1186, y: 456, w: 114, h: 158 }, LC = [LAN.x + LAN.w / 2, LAN.y + LAN.h / 2];
    g.fillStyle = "#fff";
    for (const [k2, y, R] of rowsOf(3, 2, 230, F.y1 - 2, (y) => 4 + (y - 200) * 0.012)) {
      const d = clamp((y - 200) / (F.y1 - 200)); let xx = F.x0 - 20 + R() * 40;
      while (xx < F.x1) { const len = lerp(14, 110, Math.pow(R(), 1.3)) * lerp(0.45, 1.3, d), sky = Math.pow(clamp(1 - (y - yb(xx) - 10) / 70), 2), near = Math.pow(clamp(1 - Math.hypot((xx + len / 2 - LC[0]) / 340, (y - LC[1] - 60) / 300)), 1.1); if (y > yb(xx) + 8 && R() < 0.03 + 0.05 * d + 0.9 * sky + 0.9 * near) lens(g, xx + len / 2, y + (vnoise(xx * 0.01, y * 0.05, 3) - 0.5) * 3, len / 2 * (1 + 0.6 * near), lerp(1.0, 3.2, d) * (0.6 + 0.8 * R()) * (1 + 0.7 * sky + 0.8 * near), k2 * 997 + (xx | 0)); xx += len + lerp(70, 30, d) * (0.5 + R()) * (1 - 0.6 * near); }
    }
    // 映り: 灯の真下から、うねって下ほど広く・まばら。提灯の映りは画面の下まで。琥珀は根元の半分
    const [p, pg] = plateBuf("plA"), refl = [];
    const reflect = (L, y0, y1, id) => { let y = y0 + 3, j = 0; const ph = hash(id, 1, 9) * 6.28; while (y < y1) { const R = PR(3, 3, id, j++), t = (y - y0) / (y1 - y0), d = clamp((y - 200) / (F.y1 - 200)), amp = L.w * (0.18 + 0.9 * t), cx = L.x + L.w / 2 + amp * Math.sin((y - y0) * 0.045 + ph) * 0.6 + (vnoise(y * 0.04, id, 9) - 0.5) * amp, hw = L.w * (0.42 + 0.9 * t) * (0.5 + 0.8 * R()), th = lerp(2.2, 6.4, d) * (0.75 + 0.5 * R()) * (1 - 0.3 * t); if (R() < 1 - 0.45 * t) refl.push([cx, y, hw, th, t < 0.55 && R() < 0.95 - t, id * 1000 + j]); if (t > 0.2 && R() < 0.5) { const side = R() < 0.5 ? -1 : 1; refl.push([cx + side * hw * (1.2 + R()), y + 1, hw * (0.25 + 0.3 * R()), th * 0.7, false, id * 1000 + j + 500]); } y += lerp(3.2, 7.5, d) * (0.8 + 0.5 * R()); } };
    LIT.forEach((L, i) => reflect(L, L.water, L.water + (F.y1 - L.water) * L.reach, i));
    reflect({ x: LAN.x - 10, w: LAN.w + 20 }, WL + 6, F.y1 + 4, 50);
    g.fillStyle = "#000"; for (const [cx, y, hw] of refl) g.fillRect(cx - hw - 4, y - 2.5, hw * 2 + 8, 5);
    g.fillStyle = "#fff"; for (const [cx, y, hw, th, , id] of refl) lens(g, cx, y, hw, th, 7100 + id);
    pg.fillStyle = "#000"; for (const [cx, y, hw, th, amber, id] of refl) if (amber) lens(pg, cx, y, hw + 1.5, th + 1.5, 7100 + id);
    // 舟: 右の版木の縁で切れる黒い船体と、上の縁の刀。提灯の竿は舳先から左へ傾く
    const hull = [[1352, WL - 26], [1440, WL - 14], [1660, WL - 18], [F.x1 + 30, WL - 40], [F.x1 + 30, WL + 30], [1410, WL + 26]];
    g.fillStyle = "#fff"; for (let j = 0; j < 4; j++) lens(g, 1560 + (hash(j, 1, 61) - 0.5) * 120, WL + 34 + j * 7, 230 - j * 40, 4.2 - j * 0.6, 6600 + j);
    g.fillStyle = "#000"; g.beginPath(); poly(g, hull); g.fill();
    g.fillStyle = "#fff"; groove(g, [[1354, WL - 27], [1440, WL - 16], [1660, WL - 20], [F.x1 + 20, WL - 41]], { w0: 3.5, w1: 6, seed: 3961, chip: 1.5, splinter: false, taper: 0.01 });
    g.fillStyle = "#000"; g.lineCap = "butt"; g.strokeStyle = "#000"; g.lineWidth = 7; g.beginPath(); g.moveTo(1560, WL - 20); g.lineTo(1330, LAN.y - 74); g.lineTo(LC[0], LAN.y - 74); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(LC[0], LAN.y - 74); g.lineTo(LC[0], LAN.y); g.stroke();
    g.fillStyle = "#fff"; groove(g, [[1566, WL - 26], [1334, LAN.y - 68], [LC[0] + 8, LAN.y - 68]], { w0: 4.6, w1: 2.0, seed: 3970, chip: 1.2, taper: 0.05 });
    for (const [dy, w, sd] of [[-4, 4.4, 3971], [10, 3.0, 3972]]) groove(g, [[1380, WL + dy + 2], [1540, WL + dy - 2], [1760, WL + dy - 8]], { w0: w, w1: 0.8, seed: sd, chip: 1.5, taper: 0.3 });
    // 主役: 提灯(彫って紙、琥珀の平らな版。黒い骨の輪 5 本と上下の口)
    const lanPath = (gg, grow = 0) => { gg.beginPath(); for (let a = 0; a <= 6.2832; a += 0.08) { const sx = Math.cos(a), sy = Math.sin(a); gg.lineTo(LC[0] + sx * (LAN.w / 2 + grow) * (1 - 0.1 * sy * sy), LC[1] + sy * (LAN.h / 2 + grow)); } gg.closePath(); };
    g.fillStyle = "#fff"; lanPath(g); g.fill();
    g.fillStyle = "#000"; for (let i = 1; i <= 5; i++) { const yy = LAN.y + (LAN.h * i) / 6, hw = (LAN.w / 2) * Math.sqrt(1 - Math.pow((yy - LC[1]) / (LAN.h / 2), 2)) * 0.97; cutW(g, [[LC[0] - hw, yy + 2], [LC[0], yy + 4], [LC[0] + hw, yy + 2]], 2.4, 2.4, 3980 + i, 0.4); }
    g.fillRect(LC[0] - 30, LAN.y - 8, 60, 16); g.fillRect(LC[0] - 34, LAN.y + LAN.h - 8, 68, 16);
    pg.fillStyle = "#000"; lanPath(pg, -2); pg.fill();
    // 岸の灯
    for (const L of LIT) { g.fillStyle = "#000"; g.fillRect(L.x - 3, L.y - 3, L.w + 6, L.h + 6); g.fillStyle = "#fff"; handWindow(g, L.x, L.y, L.w, L.h, 1, L.h > 22 ? 2 : 1, 77 + L.id); pg.fillRect(L.x - 2, L.y - 2, L.w + 4, L.h + 4); }
    const T = setV("SMB", "輝きは増す", 1000, 430, 104, 0.12);
    keepOut(g, T, 30); carve(g, T, 3990);
    g.restore();
    pg.globalCompositeOperation = "destination-out"; keepOut(pg, T, 24); pg.globalCompositeOperation = "source-over";
    const [q, qg] = plateBuf("plB"); bokashi(qg, 0, F.y0, 0, 360, [[0, 1], [0.45, 0.95], [0.85, 0.66], [1, 0.5]]);
    qg.globalCompositeOperation = "destination-out"; qg.fillStyle = "#000"; qg.beginPath(); qg.moveTo(0, yb(0) - 3); for (let xx = 0; xx <= W; xx += 8) qg.lineTo(xx, yb(xx) - 3); qg.lineTo(W, H); qg.lineTo(0, H); qg.closePath(); qg.fill(); for (const P of shapes) { qg.beginPath(); poly(qg, P); qg.fill(); } qg.globalCompositeOperation = "source-over";
    return fin(ctx, m, [{ c: q, color: C.AI, kind: "bokashi", shift: [2, -1] }, { c: p, color: C.AMBER, kind: "flat" }], o, F, T, { printOpt: { grain: -0.02, cut: 3 } });
  }

  // =====================================================================
  // S4 16秒(480コマ)「ひとつ、またひとつ」: 坂の町を横から。坂は右へ下る大きな黒い斜めの塊、空は藍のぼかし摺り(左上が濃く、坂の向こうの右下が明るい)。
  // 家は大きさ・屋根の角度を変えた手描きの輪郭 6 軒。手前の左の家は画面の外へ切れる。窓が1つ、また1つ灯り、溝が窓から窓へ、3つ目の窓の手前で止まる。
  // 灯りのまわりは点描でなく、窓から外へ短い楔の刀の放射。字は灯った家ごとに1行(「ひとつ、」は1つ目、「またひとつ」は2つ目の上)
  // =====================================================================
  const slope4 = (x) => 470 + (x - F.x0) * 0.25 + (fbm(x * 0.004, 2, 81, 3) - 0.5) * 24;
  // 家: [左, 幅, 軒の高さ(坂から), 棟の高さ(坂から), 型]。型 g=切妻, s=片流れ, f=陸屋根, e=妻入り(高い三角)
  const S4_HOUSES = [[-80, 520, 300, 520, "g"], [430, 300, 150, 250, "e"], [790, 150, 96, 150, "s"], [980, 280, 170, 240, "g"], [1300, 210, 150, 160, "f"], [1560, 170, 90, 150, "e"], [1740, 200, 110, 140, "s"]];
  function housePoly4([x, w, eave, ridge, t]) {
    const gL = slope4(Math.max(F.x0, x)), gR = slope4(x + w), base = Math.max(gL, gR) + 60, top = Math.min(gL, gR), e = top - eave, r = top - ridge;
    if (t === "g") return [[x, base], [x, e], [x - 14, e + 6], [x + w * 0.5, r], [x + w + 14, e + 6], [x + w, e], [x + w, base]];
    if (t === "e") return [[x, base], [x, e], [x + w * 0.5, r], [x + w, e], [x + w, base]];
    if (t === "s") return [[x, base], [x, r], [x + w + 10, e + 8], [x + w, e], [x + w, base]];
    return [[x, base], [x, e], [x + w * 0.1, e], [x + w * 0.1, e - 10], [x + w, e - 10], [x + w, base]];
  }
  function S4(ctx, o) {
    const [m, g] = begin(F), houses = S4_HOUSES.map((h, i) => chipEdge(housePoly4(h), 4400 + i, { big: 0.4 }));
    const topOf = (P) => P.reduce((a, q) => Math.min(a, q[1]), 1e9);
    const W1 = { x: 512, y: topOf(houses[1]) + 140, w: 84, h: 98, cols: 2, rows: 2 }, W2 = { x: 1074, y: topOf(houses[3]) + 112, w: 72, h: 104, cols: 1, rows: 2 }, W3 = { x: 1400, y: topOf(houses[4]) + 50, w: 56, h: 60 };
    // 空: 彫って紙 → 藍のぼかし摺り(左上 → 右下)
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(F.x0 - 10, F.y0 - 10); g.lineTo(F.x1 + 10, F.y0 - 10); for (let x = F.x1 + 10; x >= F.x0 - 10; x -= 8) g.lineTo(x, slope4(x) + 2); g.closePath(); g.fill();
    // 坂(黒い大きな塊)と家
    g.fillStyle = "#000"; g.beginPath(); g.moveTo(F.x0 - 20, H); for (let x = F.x0 - 20; x <= F.x1 + 20; x += 8) g.lineTo(x, slope4(x)); g.lineTo(F.x1 + 20, H); g.closePath(); g.fill();
    for (const P of houses) { g.beginPath(); poly(g, P); g.fill(); }
    // 光に向く縁(右下の光): 屋根の右へ下る辺と右の壁。灯った家ほど太い
    houses.forEach((P, i) => rimEdges(g, P, 4500 + i * 30, (a, b) => (b[0] > a[0] + 4 && b[1] > a[1] + 2 && a[1] < slope4(a[0])) || (Math.abs(b[0] - a[0]) < 3 && b[1] > a[1] + 20 && a[1] < slope4(a[0]) - 4), (q) => (i === 0 ? 2.4 : 1.6) + 2.2 * smooth((q[0] - 300) / 1400)));
    // 坂の尾根の刀(家の前は途切れる)
    g.fillStyle = "#fff"; { let seg = [], n = 0; const inHouse = (x) => S4_HOUSES.some(([hx, hw]) => x > hx + 6 && x < hx + hw - 6); for (let x = F.x0 - 10; x <= F.x1 + 10; x += 5) { if (inHouse(x)) { if (seg.length > 3) cut(g, seg, 3.2, 4600 + n++, { entry: 0.05, exit: 0.3, jit: 0.7 }); seg = []; } else seg.push([x, slope4(x) + 1]); } if (seg.length > 3) cut(g, seg, 3.2, 4600 + n, { entry: 0.05, exit: 0.3, jit: 0.7 }); }
    // 坂の面: 尾根に平行な少ない刀(右ほど・尾根に近いほど)。背景の地紋
    for (const [k, dy, R] of rowsOf(4, 2, 34, 560, (y) => 14 + y * 0.09)) { let x = F.x0 + R() * 60; while (x < F.x1) { const t = clamp((1 - dy / 380) * smooth((x - 300) / 1500)), len = lerp(40, 180, R()) * lerp(0.6, 1.3, t); if (R() < 0.04 + t * 0.9) cut(g, [0, 0.5, 1].map((u) => [x + len * u, slope4(x + len * u) + dy + (R() - 0.5) * 2]), lerp(0.9, 6, t), k * 991 + (x | 0), { entry: 0.1, exit: 0.5, jit: 0.4 }); x += len + lerp(130, 16, t) * (0.5 + R()); } }
    // 窓のまわり: 窓から外へ短い楔(手で決めた本数と角度。家の壁の中だけ)
    const rays = (Wn, hi, n, seed) => { g.save(); g.beginPath(); poly(g, houses[hi]); g.clip(); g.fillStyle = "#fff"; const cx = Wn.x + Wn.w / 2, cy = Wn.y + Wn.h / 2; for (let k = 0; k < n; k++) { const a = (k / n) * 6.283 + 0.22 * (hash(k, 1, seed) - 0.5), ca = Math.cos(a), sa = Math.sin(a), rx = Wn.w / 2 + 18 + 8 * hash(k, 2, seed), ry = Wn.h / 2 + 18 + 8 * hash(k, 5, seed), l = (hash(k, 3, seed) < 0.3 ? 40 : 12) + 26 * hash(k, 3, seed); wedge(g, [cx + ca * rx, cy + sa * ry], [cx + ca * (rx + l), cy + sa * (ry + l)], 3 + 4 * hash(k, 4, seed), 0.5, seed + k, 0.05 * (hash(k, 6, seed) - 0.5), 0.5); } g.restore(); };
    rays(W1, 1, 26, 4700); rays(W2, 3, 22, 4720);
    // 主役: 溝が窓1から壁を下り、坂の上を窓2の家へ、壁を上って窓2へ。窓2の家から右へもう1本、3つ目の窓の手前で止まる
    const gy = (x) => slope4(x) + 34, ax = W1.x + W1.w / 2, bx = W2.x + W2.w / 2;
    g.fillStyle = "#fff"; const G1 = [[ax, W1.y + W1.h + 10], [ax, gy(ax) - 20], [ax + 20, gy(ax)], [bx - 30, gy(bx - 30)], [bx, gy(bx - 30) - 30], [bx, W2.y + W2.h + 10]], G1o = { w0: 11, w1: 6, seed: 4801, chip: 2.4, splinter: false, taper: 0.03 };
    groove(g, G1, G1o);
    groove(g, [[bx + 8, gy(bx - 30) - 34], [bx + 120, gy(bx - 30) - 34], [bx + 120 + 40, gy(bx + 160) - 40], [W3.x - 16, gy(bx + 160) - 40]], { w0: 7, w1: 2, seed: 4802, chip: 2.2 });
    // 窓(灯った2つ)と、まだ灯っていない3つ目(黒い枠に細い刀だけ)
    const [p, pg] = plateBuf("plA");
    for (const [Wn, hi] of [[W1, 1], [W2, 3]]) { g.fillStyle = "#000"; g.fillRect(Wn.x - 6, Wn.y - 6, Wn.w + 12, Wn.h + 12); g.fillStyle = "#fff"; handWindow(g, Wn.x, Wn.y, Wn.w, Wn.h, Wn.cols, Wn.rows, 51 + hi); pg.save(); pg.beginPath(); poly(pg, houses[hi]); pg.clip(); pg.beginPath(); pg.ellipse(Wn.x + Wn.w / 2, Wn.y + Wn.h / 2, Wn.w / 2 + 52, Wn.h / 2 + 50, 0, 0, 7); pg.fill(); pg.restore(); }
    pg.fillStyle = "#000"; groove(pg, G1, Object.assign({}, G1o, { w0: 14, w1: 9 })); // 窓から窓へ届いた溝には灯りが通る(琥珀)。3つ目へ向かう溝はまだ白
    g.fillStyle = "#fff"; cutW(g, [[W3.x, W3.y], [W3.x + W3.w, W3.y]], 2, 2, 4760); cutW(g, [[W3.x, W3.y + W3.h], [W3.x + W3.w, W3.y + W3.h]], 2, 2, 4761);
    // 字: 灯った家ごとに1行
    const T1 = setH("SMB", "ひとつ、", 470, 262, 92, 0.1), T2 = setH("SMB", "またひとつ", 960, 352, 92, 0.1), T = T1.concat(T2);
    carve(g, T, 4790); // 空の上の字は墨の縁取りをしない(藍の版を字の形に抜く)
    g.restore();
    const [q, qg] = plateBuf("plB"); bokashi(qg, F.x0, F.y0, F.x1 * 0.85, 760, [[0, 1], [0.5, 0.92], [0.8, 0.68], [1, 0.42]]);
    qg.globalCompositeOperation = "destination-out"; qg.fillStyle = "#000"; qg.beginPath(); qg.moveTo(0, H); for (let x = 0; x <= W; x += 8) qg.lineTo(x, slope4(x) - 2); qg.lineTo(W, H); qg.closePath(); qg.fill(); for (const P of houses) { qg.beginPath(); poly(qg, P); qg.fill(); } keepOut(qg, T, 4); qg.globalCompositeOperation = "source-over";
    return fin(ctx, m, [{ c: q, color: C.AI, kind: "bokashi", shift: [2, -1] }, { c: p, color: C.AMBER, kind: "flat" }], o, F, T, { printOpt: { grain: 0.04, cut: 4 } });
  }

  // =====================================================================
  // S5 24.7秒(740コマ)「夜明けの」: 彫り始めの「火」。字の輪郭を刀で切り回し(太さの変わる刀。最も長い輪郭はまだ 84%)、
  // 字の芯から外へ丸刀の粗彫り(彫る順番 = 芯から。進み p で何本目まで彫ったか)。芯の琥珀は平らな版で、ふちは丸刀のえぐり(弧の欠け)。
  // 主役の刀(手で決めた6本): 芯の最後の太い丸刀。左から S4 の溝が来て、字の左下の払いの手前で止まる。字は左に縦組み(句の頭)
  // =====================================================================
  const HERO_S5 = [[-0.2, 0.05, 210, 34], [0.55, -0.1, 250, 30], [1.4, 0.08, 190, 32], [2.35, -0.05, 230, 28], [3.3, 0.12, 170, 30], [4.4, -0.08, 240, 33]];
  function S5(ctx, o) {
    const [m, g] = begin(F), SZ = 780, p = o.p == null ? 1 : o.p;
    const Fh = setHC("SMB", "火", 1090, 140 + 0.86 * SZ, SZ)[0], fb = bbox(Fh.cs), Cc = [lerp(fb[0], fb[2], 0.5), lerp(fb[1], fb[3], 0.52)];
    // 粗彫り(地紋): 320 本、k の小さい順に芯の近くから。位置・長さ・太さは PR(5,1,k)
    g.save(); g.beginPath(); pathOf(g, Fh.cs); g.clip("nonzero"); g.fillStyle = "#fff";
    const N = 320, done = Math.round(N * p);
    for (let k = 0; k < done; k++) {
      const R = PR(5, 1, k), a = R() * 6.283, reach = lerp(60, 480, Math.pow(k / N, 0.8) * (0.6 + 0.4 * R())), r0 = 18 + R() * 30, w0 = lerp(10, 22, R()), bend = (R() - 0.5) * 0.35, sp = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12, rr = lerp(r0, reach, u), aa = a + bend * u * u; sp.push([Cc[0] + Math.cos(aa) * rr, Cc[1] + Math.sin(aa) * rr]); }
      g.beginPath(); stroke(g, resample(sp, 4), (u) => w0 * Math.pow(1 - u, 0.55) * (u < 0.05 ? 0.7 + 6 * u : 1), { jit: 1.1, seed: 5410 + k }); g.fill();
    }
    // 主役: 芯の最後の太い丸刀(手で決めた6本)
    HERO_S5.forEach(([a, bend, l, w], i) => { if (i / HERO_S5.length < p) wedge(g, [Cc[0] + Math.cos(a) * 26, Cc[1] + Math.sin(a) * 26], [Cc[0] + Math.cos(a + bend) * l, Cc[1] + Math.sin(a + bend) * l], w, 2, 5500 + i, bend * 0.4, 1.4); });
    g.restore(); g.fillStyle = "#fff";
    // 切り回し: 輪郭に沿う太さの変わる刀(刀を入れ直す所で少し重なる)
    const longest = Fh.cs.reduce((a, c, i) => (c.length > Fh.cs[a].length ? i : a), 0);
    Fh.cs.forEach((ct, ci) => { const pts = resample(ct.concat([ct[0]]), 3), n = ci === longest ? Math.floor(pts.length * 0.84) : pts.length; let i = 0, j = 0; while (i < n - 3) { const R = PR(5, 2, ci, j++), len = 36 + ((R() * 70) | 0), seg = pts.slice(Math.max(0, i - 2), Math.min(n, i + len + 1)), w = 2.4 + 7.5 * R() * R() + 1.5 * R(); cut(g, seg, w, 5600 + ci * 50 + j, { entry: 0.12, exit: i + len >= n ? 0.3 : 0.18, jit: 0.7 }); i += len; } });
    // 左から来る溝(S4 の続き): 字の左下の払いの手前で止まる
    groove(g, [[F.x0 - 20, 902], [470, 902], [540, 832], [fb[0] + 40, 832]], { w0: 12, w1: 4, seed: 5701, chip: 2.6 });
    const T = setV("SMB", "夜明けの", 330, 214, 132, 0.12);
    keepOut(g, T, 30); carve(g, T, 5760);
    g.restore();
    // 琥珀: 芯の平らな版。ふちは丸刀のえぐり(外へふくらむ弧が並ぶ)、字の中だけ
    const [pp, pg] = plateBuf("plA"); pg.save(); pg.beginPath(); pathOf(pg, Fh.cs); pg.clip("nonzero"); pg.beginPath();
    for (let k = 0, n = 26; k < n; k++) { const a0 = (k / n) * 6.283, a1 = ((k + 1) / n) * 6.283, R = PR(5, 3, k), r = 150 + 60 * R() + 40 * Math.sin(k * 0.9); for (let t = 0; t <= 1; t += 0.2) { const a = lerp(a0, a1, t), bulge = r * (1 + 0.07 * Math.sin(Math.PI * t)); pg.lineTo(Cc[0] + Math.cos(a) * bulge * 1.05, Cc[1] + Math.sin(a) * bulge * 0.95); } }
    pg.closePath(); pg.fill(); pg.restore();
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T, { center: Cc.map(Math.round), printOpt: { grain: -0.08, cut: 5 } });
  }

  // =====================================================================
  // S6 28秒(840コマ)「夜明けの回路に 火を灯して」: 山場。明暗を逆にした1枚(0〜46秒でここだけ)。紙のふちを外した全面。
  // 版木はほとんど彫り取られ、琥珀の平らな版が全面に刷られる。墨は「彫り残し」: 字(墨の字)、2つの隅に残った版木(まっすぐな刀の切り口)、
  // 「回路に」から火へ走る墨の回路(彫り残した畝。45度の折れ、根元が太く先が尖る。手で決めた5本)。
  // 火のまわりだけは琥珀を刷らないクリーム(火の字の形に沿って太らせた縁 = 字の中の日が燃え広がる)。火の近くに短い白い丸刀 9 本(手で決めた)
  // =====================================================================
  const S6_TRACE = [[[912, 640], [1040, 640], [1100, 580], [1196, 580]], [[918, 724], [1090, 724], [1150, 664], [1214, 664]], [[612, 610], [612, 520], [692, 440], [1050, 440], [1100, 390], [1232, 390]], [[924, 806], [1196, 806], [1276, 726], [1276, 676]], [[452, 884], [452, 962], [1250, 962], [1350, 862], [1350, 690]]];
  const S6_FLASH = [[-100, 300, 120, 16], [-70, 310, 80, 12], [-40, 300, 140, 18], [-10, 330, 90, 12], [25, 300, 110, 16], [62, 320, 70, 12], [150, 310, 100, 14], [-150, 300, 90, 12], [-125, 320, 130, 16]];
  function S6(ctx, o) {
    const B = BLEED, [m, g] = begin(B), Cc = [1372, 468], FS = 340;
    const T1 = setH("SMB", "夜明けの", 150, 238, 108, 0.1), T2 = setH("SMB", "回路に", 150, 850, 300, 0.06), Fh = setHC("SMB", "火", Cc[0], Cc[1] + 0.36 * FS, FS), T3 = setV("SMB", "を灯して", 1744, 300, 112, 0.1);
    // 彫り取る: 左下と右上の隅を残す(切り口はまっすぐな刀。長い直線と大きな欠け)
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#000"; for (const [P, sd] of [[[[-10, 1090], [-10, 930], [130, 1000], [300, 1090]], 6011], [[[1520, -10], [1930, -10], [1930, 150], [1790, 96], [1660, 40]], 6012]]) { g.beginPath(); poly(g, chipEdge(P.concat([P[0]]), sd, { big: 0.8 })); g.fill(); }
    // 墨の回路(彫り残しの畝)
    g.fillStyle = "#000"; S6_TRACE.forEach((P, i) => groove(g, P, { w0: 20, w1: 7, seed: 6100 + i, chip: 2.0, splinter: false, taper: 0.06 }));
    keepOut(g, T1.concat(T2, T3, Fh), 2);
    // 火の近くの白い丸刀(芯の外の琥珀の中を、クリームで割る)
    g.restore();
    // 色版: 全面に琥珀。火の字の形を太らせた縁と、白い丸刀を抜く
    const [pp, pg] = plateBuf("plA"); pg.fillRect(0, 0, W, H); pg.globalCompositeOperation = "destination-out";
    pg.lineJoin = "round"; pg.lineWidth = 104; pg.strokeStyle = "#000"; for (const L of Fh) { pg.beginPath(); pathOf(pg, L.cs); pg.stroke(); pg.fill("nonzero"); }
    S6_FLASH.forEach(([ad, r0, l, w], k) => { const a = (ad * Math.PI) / 180; wedge(pg, [Cc[0] + Math.cos(a) * r0 * 1.15, Cc[1] + Math.sin(a) * r0], [Cc[0] + Math.cos(a) * (r0 + l) * 1.15, Cc[1] + Math.sin(a) * (r0 + l)], w, 1.5, 6200 + k, 0.05 * (k % 2 ? 1 : -1), 1.0); });
    pg.globalCompositeOperation = "source-over";
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat", shift: [-4, 3] }], o, B, T1.concat(T2, T3), { printOpt: { grain: 0.12, cut: 6 } });
  }

  // =====================================================================
  // S7 31.7秒(950コマ)「消えかけた声を 光に変えて」: 暗い版に戻る。上の小さい字は粗彫りの途中(横のかすれ=刀の帯の間の黒。v2 のまま残した)。
  // 主役の刀(手で決めた5本): 「て」の最後の画の先が、太さの違う溝4本にほどけ(1本は途中で分かれる)、右上の窓(S4 の灯りの続き)へ斜めに上る。
  // 「光」の字だけ琥珀(声が光に変わった)。窓は琥珀
  // =====================================================================
  function S7(ctx, o) {
    const [m, g] = begin(F);
    const T1 = setH("SMB", "消えかけた声を", 180, 250, 84, 0.1), T2 = setH("SMB", "光に変えて", 178, 860, 214, 0.08);
    woodLines(g, 7, { amount: 0.22, wmul: 0.8, sd: 7002 }); // 背景: 薄い木目(まだ彫られていない版木)
    keepOut(g, T1, 24); keepOut(g, T2, 36);
    // 「て」の右の端の点(字の墨の一番右)
    const te = T2[T2.length - 1], tb = bbox(te.cs); let ex = [tb[2], (tb[1] + tb[3]) / 2]; for (const ct of te.cs) for (const q of ct) if (q[0] > ex[0] - 1 && q[1] < ex[1] + 60 && q[1] > tb[1]) ex = q;
    const WN = { x: 1612, y: 238, w: 62, h: 78 }, wx = WN.x + WN.w / 2, wy = WN.y + WN.h + 12;
    const S = [ex[0] - 14, ex[1] + 2], X = S[0], Y = S[1], D = (x0, y0, dx) => [x0 + dx, y0 - dx]; // D: 45度で右上へ dx
    const G1 = [S, [X + 110, Y], D(X + 110, Y, 250), [X + 520, Y - 250], [wx - 20, wy + 20], [wx, wy]];
    const G2 = [[X - 4, Y + 15], [X + 190, Y + 15], D(X + 190, Y + 15, 200), [X + 560, Y - 185]];
    const G3 = [[X - 6, Y - 14], [X + 60, Y - 14], [X + 150, Y - 190], [X + 190, Y - 330]];
    const G4 = [[X - 8, Y + 30], [X + 300, Y + 30], [X + 470, Y - 50], [X + 600, Y - 50]];
    const G5 = [[X + 360, Y - 250], D(X + 360, Y - 250, 70), [X + 430, Y - 410]];
    g.fillStyle = "#fff";
    groove(g, G1, { w0: 15, w1: 4, seed: 7101, chip: 2.6, taper: 0.06 });
    groove(g, G2, { w0: 10, w1: 2, seed: 7102, chip: 2.0 });
    groove(g, G3, { w0: 8, w1: 2.4, seed: 7103, chip: 2.2 });
    groove(g, G4, { w0: 6, w1: 1.2, seed: 7104, chip: 1.6 });
    groove(g, G5, { w0: 6, w1: 1.5, seed: 7105, chip: 1.4 });
    carve(g, T1.concat(T2), 7200);
    // 消えかけ: 上の字に、粗彫りの帯の間の黒(位置は行と列の hash)
    g.save(); g.beginPath(); pathOf(g, T1.flatMap((L) => L.cs)); g.clip("nonzero"); g.fillStyle = "#000";
    const b1 = lettersBox(T1); for (const [k, y, R] of rowsOf(7, 2, b1[1], b1[3], () => 7)) { let x = b1[0]; while (x < b1[2]) { const len = 30 + R() * 120; if (R() < 0.62) g.fillRect(x, y + R(), len, 3.2); x += len + 10 + R() * 40; } }
    g.restore();
    // 窓
    g.fillStyle = "#000"; g.fillRect(WN.x - 6, WN.y - 6, WN.w + 12, WN.h + 12); g.fillStyle = "#fff"; handWindow(g, WN.x, WN.y, WN.w, WN.h, 2, 2, 7300);
    g.restore();
    const [pp, pg] = plateBuf("plA"); pg.fillRect(WN.x - 4, WN.y - 4, WN.w + 8, WN.h + 8); letterPlate(pg, T2[0], { rect: [-0.1, -1.2, 1.2, 0.4] });
    groove(pg, G1, { w0: 15, w1: 4, seed: 7101, chip: 2.6, taper: 0.06 }); pg.globalCompositeOperation = "destination-out"; pg.fillRect(0, 0, 1300, H); pg.globalCompositeOperation = "source-over"; pg.fillStyle = "#000"; letterPlate(pg, T2[0], { rect: [-0.1, -1.2, 1.2, 0.4] }); // 窓に届く1本の先だけ琥珀
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T1.concat(T2), { printOpt: { grain: -0.1, cut: 7 } });
  }

  // =====================================================================
  // S8 36秒(1080コマ)「止まらない 止まれない」: 川の岸から高架を見上げる。明るさは3段だけ:
  //  空 = 墨のベタ(彫らない)/地平の町明かり = 1本の明るい帯(ところどころ切れる)/水 = 帯の映りの割れた刀。
  //  高架の桁は左の手前で画面の上 1/3 を覆う黒(字「止まらない」を桁の腹に彫る)。光るのは列車の窓だけ(琥珀の刀、頭が左で太く尻尾が右へ細る)
  // =====================================================================
  function S8(ctx, o) {
    const [m, g] = begin(F), HZ = 742;
    const top = (x) => lerp(170, 462, (x - F.x0) / (F.x1 - F.x0)), bot = (x) => lerp(470, 566, (x - F.x0) / (F.x1 - F.x0));
    // 町明かりの帯(地平): 太さ 16〜26px、切れ目は手で決めた位置
    g.fillStyle = "#fff"; const gaps = [[300, 340], [620, 700], [1010, 1030], [1380, 1460], [1700, 1720]];
    let x0 = F.x0 - 10; for (const [a, b] of gaps.concat([[F.x1 + 10, F.x1 + 20]])) { const pts = []; for (let x = x0; x <= a; x += 12) pts.push([x, HZ + 3 * Math.sin(x * 0.01)]); if (pts.length > 1) cutW(g, pts, 18 + 8 * hash(a, 1, 8), 14 + 10 * hash(a, 2, 8), 8100 + a, 1.2); x0 = b; }
    // 遠い町の屋根(帯の上に黒い小さな影がかかる)
    g.fillStyle = "#000"; for (let k = 0, x = F.x0; x < F.x1; k++) { const R = PR(8, 1, k), w = 18 + 40 * R(), h = 4 + 12 * R(); if (R() < 0.55) { g.beginPath(); poly(g, [[x, HZ + 2], [x, HZ - 8 - h], [x + w * 0.5, HZ - 14 - h - 6 * R()], [x + w, HZ - 8 - h], [x + w, HZ + 2]]); g.fill(); } x += w + 6 + 30 * R(); }
    // 水: 帯の真下だけ割れた刀(下へ行くほど短く・まばら)。帯の切れ目の下は暗い
    g.fillStyle = "#fff";
    for (const [k, y, R] of rowsOf(8, 2, HZ + 22, F.y1 - 4, (y) => 6 + (y - HZ) * 0.03)) { const d = (y - HZ) / (F.y1 - HZ); let x = F.x0 - 10 + R() * 30; while (x < F.x1) { const len = lerp(20, 120, Math.pow(R(), 1.2)) * (1 - 0.5 * d), inGap = gaps.some(([a, b]) => x + len / 2 > a - 10 && x + len / 2 < b + 10); if (!inGap && R() < 0.75 - 0.6 * d) lens(g, x + len / 2, y + (vnoise(x * 0.01, y * 0.05, 3) - 0.5) * 2, len / 2, lerp(5, 1.4, d) * (0.6 + 0.8 * R()), k * 991 + (x | 0)); x += len + lerp(6, 70, d) * (0.5 + R()); } }
    // 橋脚(手前ほど太い、間隔は遠近で不揃い)
    const PIERS = [[250, 96], [760, 66], [1150, 46], [1430, 33], [1640, 24], [1790, 17]];
    g.fillStyle = "#000"; PIERS.forEach(([x, w], i) => { const y0 = bot(x) - 4; g.beginPath(); poly(g, chipEdge([[x - w / 2, y0], [x + w / 2, y0], [x + w / 2 + w * 0.08, F.y1 + 10], [x - w / 2 - w * 0.08, F.y1 + 10], [x - w / 2, y0]], 8200 + i, { big: 0.3 })); g.fill(); });
    // 脚の右の縁にだけ細い光(町明かりの帯の高さの前後)
    g.fillStyle = "#fff"; PIERS.forEach(([x, w], i) => cut(g, [[x + w / 2 - 2, HZ - 70], [x + w / 2 - 1, HZ + 60]], 1 + w * 0.03, 8250 + i, { entry: 0.3, exit: 0.4, jit: 0.3 }));
    // 桁: 上 1/3 を覆う黒(版木のまま)。下の縁に刀の線(町明かりを受ける)、腹の継ぎ目(手で決めた4本の溝)
    g.fillStyle = "#000"; g.beginPath(); g.moveTo(F.x0 - 20, -20); g.lineTo(F.x1 + 20, -20); for (let x = F.x1 + 20; x >= F.x0 - 20; x -= 10) g.lineTo(x, bot(x)); g.closePath(); g.fill();
    g.fillStyle = "#fff"; groove(g, [[F.x0 - 10, bot(F.x0) + 2], [F.x1 + 10, bot(F.x1) + 2]], { w0: 6, w1: 2.2, seed: 8301, chip: 1.2, splinter: false, taper: 0.01 });
    groove(g, [[F.x0 - 10, bot(F.x0) - 26], [F.x1 + 10, bot(F.x1) - 8]], { w0: 3.2, w1: 1.2, seed: 8302, chip: 1.0, splinter: false, taper: 0.01 });
    // 桁の面: 下から町明かりを受ける。下の縁に平行な刀を、下ほど太く・上ほど短く(手で決めた5本)
    for (const [off, w, xa, xb, sd] of [[44, 4.2, F.x0 - 10, F.x1 + 10, 8321], [64, 3.0, 140, 1700, 8322], [92, 2.2, 320, 1500, 8323], [130, 1.6, 620, 1260, 8324], [176, 1.2, 760, 1060, 8325]]) { const P = []; for (let x = xa; x <= xb; x += 20) P.push([x, lerp(bot(x), top(x), off / (bot(x) - top(x) + 1) > 0.9 ? 0.9 : off / (bot(x) - top(x) + 1))]); cut(g, P, w, sd, { entry: 0.1, exit: 0.3, jit: 0.5 }); }
    for (const [x, sd] of [[520, 8311], [980, 8312], [1330, 8313], [1590, 8314]]) groove(g, [[x, bot(x) - 4], [x + 10, top(x) + 30]], { w0: 2.6, w1: 1, seed: sd, chip: 0.8, splinter: false });
    // 列車の窓: 桁の上の縁の上を走る刀。頭(左)が太く、尻尾(右)へ長く細る。手で決めた 7 本
    const winY = (x, f) => top(x) - lerp(22, 8, (x - F.x0) / 1808) - f * lerp(70, 24, (x - F.x0) / 1808);
    const STREAK = [[0.18, F.x0 - 40, 1360, 22], [0.4, 120, 980, 26], [0.6, 300, 1500, 18], [0.8, 60, 760, 20], [0.5, 820, 1700, 12], [0.28, 900, 1260, 11], [0.7, 1120, 1780, 8]];
    g.fillStyle = "#000"; g.beginPath(); for (let x = F.x0 - 20; x <= F.x1 + 20; x += 10) g.lineTo(x, winY(x, 1.25)); for (let x = F.x1 + 20; x >= F.x0 - 20; x -= 10) g.lineTo(x, top(x) + 1); g.closePath(); g.fill(); // 車体
    const streak = (gg, [f, xa, xb, w], j) => { const P = []; for (let x = xa; x <= xb; x += 8) P.push([x, winY(x, f)]); gg.beginPath(); stroke(gg, resample(P, 3), (u, i) => w * Math.pow(1 - u, 0.9) * (u < 0.02 ? 0.5 + 25 * u : 1) * (0.9 + 0.2 * vnoise(i * 0.2, j, 9)), { jit: 0.8, seed: 8400 + j }); gg.fill(); };
    g.fillStyle = "#fff"; STREAK.forEach((S, j) => streak(g, S, j));
    // 字: 「止まらない」は桁の腹に彫る、「止まれない」は水の上に大きく
    const slant = (Ls, x0, k) => Ls.map((L) => { const dy = k * (L.x0 - x0); return Object.assign({}, L, { base: L.base + dy, cs: L.cs.map((ct) => ct.map(([x, y]) => [x, y + dy])) }); }); // 字を桁の傾きに沿わせる
    const T1 = slant(setH("SMB", "止まらない", 200, 424, 124, 0.08), 200, 0.11), T2 = setH("SMB", "止まれない", 930, 930, 168, 0.06);
    keepOut(g, T1, 16); keepOut(g, T2, 30); carve(g, T1.concat(T2), 8500);
    g.restore();
    const [pp, pg] = plateBuf("plA"); STREAK.forEach((S, j) => streak(pg, [S[0], S[1], S[2], S[3] + 3], j));
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T1.concat(T2), { printOpt: { grain: 0.05, cut: 8 } });
  }

  // =====================================================================
  // S9 40秒(1200コマ)「まだ、」: 最も黒い版。何も彫られていない版木(S1 の木目を薄く戻す=S1 と韻)に、縦の「まだ」と燃え残りの読点(琥珀)。
  // 読点から1本の溝が真下へ落ち、版木の下の縁を越える(次の夜明けへ続く)。端子なし
  // =====================================================================
  function S9(ctx, o) {
    const [m, g] = begin(F);
    woodLines(g, 9, { amount: 0.3, wmul: 0.85, sd: 9002 });
    const T = setV("SMB", "まだ、", 1312, 150, 250, 0.08), cb = bbox(T[2].cs), dx = (cb[0] + cb[2]) / 2, dy = cb[3];
    keepOut(g, T, 46); g.fillStyle = "#000"; g.fillRect(dx - 20, dy + 10, 40, F.y1 - dy);
    g.fillStyle = "#fff"; groove(g, [[dx, dy + 22], [dx, F.y1 + 30]], { w0: 7, w1: 3, seed: 9101, chip: 1.6, splinter: false, taper: 0.01 });
    carve(g, T, 9200);
    g.restore();
    const [pp, pg] = plateBuf("plA"); letterPlate(pg, T[2], { contour: 0 });
    return fin(ctx, m, [{ c: pp, color: C.AMBER, kind: "flat" }], o, F, T, { drop: [Math.round(dx), Math.round(dy)], printOpt: { grain: -0.04, cut: 9 } });
  }

  const SCENES = { 60: S1, 240: S2, 370: S3, 480: S4, 740: S5, 840: S6, 950: S7, 1080: S8, 1200: S9 };
  return { SCENES };
})();
function A5_DRAW(ctx, o) {
  const f = +o.f;
  if (A5_CUTS.SCENES[f]) return Object.assign(A5_CUTS.SCENES[f](ctx, o), { f });
  if (typeof A5_DAWN !== "undefined" && f >= 1340 && f <= 1590) return Object.assign(A5_DAWN(ctx, o), { f });
  throw new Error("このコマは描かない: " + f);
}
