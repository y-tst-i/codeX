// 案A+C v7(動きの本制作 第1段)の冒頭 S1〜S4(曲のコマ 0〜668)。部品は cand_a7.js(A6 と MO)、時刻は M1_TIMING(motion1/tools/gen_timing.py)。
// 絵は cand_a6_cuts.js(v6、53秒ボード v4)の S1〜S4 を写した。刀・字・窓・色版のそれぞれに「見え始めるコマと速さ」を与え、曲のコマ番号 f の純関数にした。
//   ・刀の位置・長さ・太さは v6 と同じ位置の hash(PR)。乱数を引く順番も v6 のまま(時刻は別の hash から決めるので、絵は変わらない)。
//   ・各カットの最後のコマは v6 の静止画と同じ画素(sheet=0 で比べる)。S4 だけ歌詞「繋がってく」(540、要確認)を足したので、その字の分だけ違う。
// 動きの語彙: 彫る(刃先が進む刀・溝、字は粗彫り→仕上げ)、刷る(ばれんの1回)、刷り替え(カットの頭は新しい紙: 紙のスキャンを返し、色版をばれんで刷る)。
// フェード・グロー・粒子・カメラ移動は使わない。時刻はコマ番号を直書きせず、歌詞の語頭とアクセントの表から規則で決める(決まった値は __stats.events)。
const A7_T = (() => {
  const T = M1_TIMING;
  const word = (t) => { const w = T.words.find((x) => x.text === t); if (!w) throw new Error("歌詞の語が無い: " + t); return w.start; };
  const phrase = (t) => { const p = T.phrases.find((x) => x.text === t); if (!p) throw new Error("歌詞の句が無い: " + t); return p.start; };
  const conf = (t) => { const p = T.phrases.find((x) => x.text === t) || T.words.find((x) => x.text === t); return p ? p.confidence : null; };
  const accIn = (a, b) => T.accents.filter((x) => x.frame30 >= a && x.frame30 <= b);
  const strongest = (a, b, key = "strength") => { const c = accIn(a, b); if (!c.length) throw new Error(`アクセントが無い ${a}..${b}`); return c.reduce((m, x) => (x[key] > m[key] ? x : m)).frame30; };
  const firstAcc = (a, b, min = 0) => { const c = accIn(a, b).filter((x) => x.strength >= min); if (!c.length) throw new Error(`アクセントが無い ${a}..${b} (${min})`); return c[0].frame30; };
  const shot = (id) => T.shots.find((s) => s.id === id);
  return { T, word, phrase, conf, accIn, strongest, firstAcc, shot };
})();

const A7_OPEN = (() => {
  const { W, H, clamp, lerp, smooth, hash, fbm, vnoise, resample, stroke, bbox, pathOf } = AD;
  const { MO, avoidBoxes, C, FRAME, PR, begin, plateBuf, poly, cut, cutW, wedge, groove, lens, chipEdge, setH, setV, lettersBox, keepOut, letterPlate, textMargin, bokashi, print, maskOnly, polyLen } = A6;
  const { cutT, wedgeT, lensT, grooveT, grooveP, pushProg, baren, carveT, getF } = MO;
  const { word, phrase, accIn, strongest, firstAcc, shot } = A7_T;
  const F = FRAME, NEVER = -1e9;
  const h01 = (a, b, s) => hash(a | 0, b | 0, s); // 時刻を決めるための hash(刀の形の乱数列とは別)
  function fin(ctx, m, plates, o, texts, printOpt, extra) {
    const tm = textMargin(texts, F);
    if (o.mask) return Object.assign(maskOnly(ctx, m), { text: tm }, extra);
    return Object.assign(print(ctx, m, plates, Object.assign({ look: o.look, B: F }, printOpt, { sheet: o.sheet == null ? printOpt.sheet : o.sheet })), { text: tm }, extra);
  }
  // カットの頭の刷り替え: 新しい紙(sheet)に、色版をばれんの1回で刷る(c0 で 62%、c0+1 で 92%、c0+2 で刷り終える。インクの乗りのむらは付けない)
  const pressIn = (pg, c0, dir, seed) => baren(pg, [0, 0, W, H], c0, dir, seed, { q0: 0.62, dq: 0.3, mottle: false, rag: 0.12 });

  // 空の筋(6秒試作の残課題「中ほどの静止」の対策): 藍の版を細い刀で少しずつさらい、紙の筋を出す(版から抜くので、彫った所は戻らない)。
  // 筋は横長でゆるく反り、両端が細る。字の箱から 26px 以内は彫らない。t0〜t1 に 1 本ずつ(6 コマで彫り切る)。位置・長さ・太さは PR(cutId, 80, k)
  function skyStreaks(pg, cutId, n, [x0, y0, x1, y1], t0, t1, boxes, { w = [2.5, 7], l = [260, 900] } = {}) {
    pg.save(); pg.globalCompositeOperation = "destination-out"; pg.fillStyle = "#000";
    for (let k = 0; k < n; k++) {
      const R = PR(cutId, 80, k), y = lerp(y0, y1, Math.pow(R(), 1.2)), len = lerp(l[0], l[1], R()), x = lerp(x0 - len * 0.3, x1 - len * 0.7, R()), ww = lerp(w[0], w[1], Math.pow(R(), 1.6)), bow = 3 + 6 * R(), tilt = (R() - 0.5) * 10, st = t0 + (t1 - t0) * (k + 0.6 * R()) / n;
      const P = []; for (let i = 0; i <= 12; i++) { const u = i / 12; P.push([x + len * u, y - bow * 4 * u * (1 - u) + tilt * u]); }
      avoidBoxes(P, boxes, 26, 4).forEach((seg, j) => cutT(pg, seg, ww, cutId * 9100 + k * 7 + j, { entry: 0.12, exit: 0.5, jit: 0.5 }, st, 6));
    }
    pg.restore();
  }
  // ===== v6 から写した道具(位置の hash) =====
  function rowsOf(cut, layer, y0, y1, gap) { const out = []; let y = y0, k = 0; while (y < y1 && k < 4000) { out.push([k, y, PR(cut, layer, k)]); y += gap(y, PR(cut, layer + 50, k)); k++; } return out; }
  // 手で切った窓。at: 桟の1枚目を彫るコマ(1枚ずつ 1 コマ後)
  function handWindowT(g, x, y, w, h, cols, rows, seed, at = NEVER, step = 1) {
    const bar = Math.max(4, w * 0.11), pw = (w - bar * (cols - 1)) / cols, ph = (h - bar * (rows - 1)) / rows, f = getF();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i; if (f < at + k * step) continue; const q = (a) => (hash(k, a, seed) - 0.5) * 2.2, x0 = x + i * (pw + bar), y0 = y + j * (ph + bar); g.beginPath(); poly(g, [[x0 + q(1), y0 + q(2)], [x0 + pw + q(3), y0 + q(4)], [x0 + pw + q(5), y0 + ph + q(6)], [x0 + q(7), y0 + ph + q(8)]]); g.fill(); }
  }
  // 光を受ける辺だけに刀。when(a, b, k) → 彫り始めのコマ
  function rimEdgesT(g, P, seed, face, wFn, when) { g.fillStyle = "#fff"; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6 || !face(a, b)) continue; const w = wFn([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); if (w < 0.6) continue; cutT(g, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], w, seed + k, { entry: 0.1, exit: 0.3, jit: 0.45 }, when(a, b, k), 2); } }
  // 木目の線(v6 の woodLines と同じ形)。when(x, y, near, id) → 彫り始めのコマ(NEVER なら最初から)
  function woodLinesT(g, cutId, { K = null, amount = 1, wmul = 1, sd = 6002, focus = false } = {}, when = () => NEVER) {
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
          const pr = focus ? (0.05 + 0.85 * Math.pow(near, 1.1) + 0.22 * fbm(x * 0.004, y * 0.01, sd + 2, 2)) * amount : (0.15 + tone) * amount;
          if (R() < pr) { const id = +k * 50 + si * 997 + j * 7; cutT(g, sp.slice(i, i + n), lerp(1.0, 2.6, tone) * (0.8 + 0.4 * R()) * wmul, cutId * 7000 + j + +k * 31, { entry: 0.12, exit: 0.25, jit: 0.35 }, when(x, y, near, id), 3); }
          i += n + 1 + ((R() * (1 - tone) * 30) | 0);
        }
        si++;
      };
      for (let i = 1; i < P.length; i++) { const [x, y] = P[i], [x0, y0] = P[i - 1]; if (x - x0 === XS && Math.abs(y - y0) < 9) seg.push(P[i]); else { flush(); seg = [P[i]]; } }
      flush();
    }
  }

  // =====================================================================
  // S1 0〜140 間奏「版木と最初の一刀」
  //  0: 何も彫っていない版木(遠くのまばらな木目と、節の芯の年輪 3 本)。黒で始めない(紙のふちと木目)。
  //  最初の一刀は3回に分けて押す(角で刀を入れ直す所=v6 の溝の角の行き過ぎ): 区間の最強のアクセント 10 で1本目の水平、38(曲の最強 1.00)で 45 度と2本目の水平、57 で残りを x=900 まで。
  //  その後、節のまわりの木目が外から節へ向かって少しずつ彫られ(間を埋める)、節の年輪が強いアクセント(76・85・104・113・133)ごとに1本ずつ外へ増える
  // =====================================================================
  const HERO_S1 = [[F.x0 - 30, 868], [318, 868], [438, 748], [676, 748], [752, 672], [900, 672]];
  function S1(ctx, o) {
    const f = getF(), sh = shot("S1"), [m, g] = begin(F);
    const K = [1298, 318, 64, 2.7];
    const a1 = strongest(sh.start, sh.start + 20), a2 = strongest(a1 + 15, a1 + 40), a3 = strongest(a2 + 10, a2 + 25);
    const ringAcc = accIn(a3 + 5, sh.end - 1).filter((x) => x.strength >= 0.7).map((x) => x.frame30); // 76, 85, 104, 113, 133
    const grainEnd = ringAcc[ringAcc.length - 1] + 6; // 木目は節の最後の年輪の後まで少しずつ(間を作らない)
    // 第2段(音ハメ 104 が -2 の直し): 年輪の拍の直前 4 コマに始まる木目の刀は、年輪の拍のコマへ寄せる(拍の手前に変化の山を作らない)
    const snapR = (t) => { for (const r of ringAcc) if (t > r - 5 && t < r) return r; return t; };
    woodLinesT(g, 1, { K, focus: true }, (x, y, near, id) => (near < 0.22 ? NEVER : snapR(a1 + 6 + (grainEnd - a1 - 14) * clamp((near - 0.22) / 0.78) * 0.85 + 16 * h01(id, 3, 611))));
    const ringR = (a, j) => { const lobe = 1 + 0.16 * Math.cos(a - 0.6) + 0.07 * Math.cos(2 * a + 1.1), n = 1 + 0.07 * (fbm(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 6210 + j, 3) - 0.5) * 2; return lobe * n; };
    for (let j = 0; j < 8; j++) {
      const R = PR(1, 2, j), base = K[2] * (0.34 + 0.09 * j + 0.012 * j * j), gaps = [R() * 6.28, R() < 0.6 ? R() * 6.28 : 99], w = lerp(1.3, 2.9, R()) * (j < 2 ? 1.25 : 1);
      const rs = j < 3 ? NEVER : ringAcc[Math.min(ringAcc.length - 1, j - 3)]; let pts = [], a0 = 0;
      const flushR = () => { if (pts.length > 5) cutT(g, pts, w, 6200 + j * 10 + pts.length, { entry: 0.2, exit: 0.3, jit: 0.45 }, rs, 2); pts = []; }; // 年輪は1本を一度に(アクセントのコマで山になるように)
      for (let a = 0; a < 6.3; a += 0.025) {
        if (gaps.some((q) => Math.abs(((a - q + 9.42) % 6.283) - 3.14) < 0.22 + 0.15 * R())) { flushR(); continue; }
        if (!pts.length) a0 = a;
        const rr = base * ringR(a, j), e = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.8);
        pts.push([K[0] + e * rr * K[3], K[1] + Math.sin(a) * rr]);
      }
      flushR();
    }
    // 主役: 最初の一刀。区間ごとの長さの割合で3回に押す
    const segL = []; for (let k = 0; k < HERO_S1.length - 1; k++) segL.push(Math.hypot(HERO_S1[k + 1][0] - HERO_S1[k][0], HERO_S1[k + 1][1] - HERO_S1[k][1]));
    const tot = segL.reduce((s, x) => s + x, 0), cum = (n) => segL.slice(0, n).reduce((s, x) => s + x, 0) / tot;
    const hp = pushProg([[a1, cum(1), 4], [a2, cum(3), 6], [a3, 1, 5]]);
    g.fillStyle = "#fff"; grooveP(g, HERO_S1, { w0: 27, w1: 13, seed: 6301, chip: 3.0, ov: 1.1, taper: 0.07 }, hp);
    g.restore();
    return fin(ctx, m, [], o, [], { grain: -0.05, cut: 1, sheet: 0 }, { cut_id: "S1", hero_progress: +hp.toFixed(3), events: { a1, a2, a3, rings: ringAcc } });
  }

  // =====================================================================
  // S2 141〜290「暗闇の数だけ」(6秒試作の時刻の規則を v6 の絵に移した)
  //  141 刷り替え(藍のぼかし摺りをばれんで上から)。字は語頭で彫り始める: 暗 141(要確認)・闇 160・の 192・数 215・だ 238・け 242。
  //  闇の語頭+20〜の の手前の最強のアクセント(189)で、暗の日・闇の中の日に琥珀を刷る。
  //  影の中の白い刀 8 本はアクセントごとに1本ずつ(間を埋める)。川の暗い映りは地平から下へ少しずつ彫る。
  //  の の後の最初のアクセント(198)〜だけ+12 で、窓に近い建物から順に、灯りに向く辺の刀。
  //  だけ+10〜+22 の最強(255)で字の下から窓へ溝を彫り始め、+6〜+14 の最強(265)で窓に届いて桟を1枚ずつ彫る。輝きは増す の手前の低音の最強の1コマ前(273)に窓・壁・映りへ琥珀。
  //  その後の最強(283)で、窓のまわりの楔 8 本を内から外へ一気に彫り(藍の版から抜く)、窓の下の明るい映りを彫る
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
  const S2_WEDGE = [[118, -20, -44, 21], [150, -152, 40, 15], [188, -76, -28, 13], [236, -4, -36, 11], [276, -132, 22, 8], [338, -52, -20, 6.5], [410, -14, -15, 5], [486, -104, 11, 3.6]];
  function S2(ctx, o) {
    const f = getF(), sh = shot("S2"), c0 = sh.start, [m, g] = begin(F), { EMB, EMB2, WC } = S2D;
    const E = { kan: word("暗"), yami: word("闇"), no: word("の"), kazu: word("数"), dake: word("だけ"), kag: phrase("輝きは増す") };
    E.letters = [E.kan, E.yami, E.no, E.kazu, E.dake, E.dake + 4];
    E.sunPrint = strongest(E.yami + 20, E.no - 1);
    E.city = [accIn(E.no + 1, E.dake)[0].frame30, E.dake + 12];
    E.via = strongest(E.dake + 10, E.dake + 22);
    E.winCarve = strongest(E.via + 6, E.via + 14);
    E.winPrint = strongest(E.winCarve + 4, E.kag - 1, "kick") - 1;
    E.burst = strongest(E.winPrint + 5, E.kag - 1);
    E.knives = accIn(c0 + 5, E.via - 1).filter((x) => x.frame30 !== E.sunPrint && x.frame30 !== E.city[0] && x.frame30 >= c0 + 8).map((x) => x.frame30).slice(0, 6);
    const T = setV("SMB", "暗闇の数だけ", 1600, 122, [158, 158, 112, 112, 112, 112], 0.1), tb = lettersBox(T);
    const nearT = (x, y) => x > tb[0] - 50 && x < tb[2] + 50 && y > tb[1] - 40 && y < tb[3] + 40;
    g.fillStyle = "#fff"; g.fillRect(F.x0 - 10, F.y0 - 10, F.x1 - F.x0 + 20, EMB - F.y0 + 10);
    const wedges = []; S2_WEDGE.forEach(([r, a0, span, w], i) => { const pts = []; for (let t = 0; t <= 1.0001; t += 0.04) { const a = ((a0 + span * t) * Math.PI) / 180, rr = r * (1 + 0.05 * Math.sin(t * 3 + i * 1.7) + 0.03 * (hash(i, 1, 2201) - 0.5)); const p = [WC[0] + Math.cos(a) * rr * 1.55, WC[1] + Math.sin(a) * rr * 0.78]; if (p[1] > EMB - 6 || nearT(p[0], p[1])) break; pts.push(p); } if (pts.length > 3) wedges.push([resample(pts, 3), w, i]); });
    const wedgeS = (i) => E.burst + i * 0.7;
    const drawWedges = (gg) => { for (const [sp, w, i] of wedges) { const n = sp.length, p = clamp((f - wedgeS(i) + 1) / 2), mm = p >= 1 ? n : Math.max(2, Math.ceil(p * (n - 1)) + 1); if (p <= 0) continue; gg.beginPath(); stroke(gg, p >= 1 ? sp : sp.slice(0, mm), (u, j) => w * Math.pow(1 - j / (n - 1), 0.9) * (j / (n - 1) < 0.05 ? 0.6 + 8 * (j / (n - 1)) : 1) * (0.88 + 0.24 * vnoise(j * 0.1, i, 7)) * (p >= 1 ? 1 : Math.min(1, 0.35 + (mm - 1 - j) / 2.5)), { jit: 1.1, seed: 2200 + i }); gg.fill(); } };
    // 水面: 暗い映りは最初の 45% があり、残りは地平から下へ少しずつ(c0+6 〜 c0+120)。窓の真下の明るい映り(tone ≥ 0.3)は窓に刷った後、土手から下へ
    const refl = [];
    for (const [k, y, R] of rowsOf(2, 2, EMB2 + 9, F.y1 - 4, (y) => 5.5 + (y - EMB2) * 0.036)) { let x = F.x0 - 20 + R() * 40; while (x < F.x1) { const half = 100 + (y - EMB2) * 0.45, d = Math.abs(x - WC[0]) / half, tone = Math.max(0.16 * (1 - (y - EMB2) / 400), Math.pow(clamp(1 - d), 1.6) * (1 - (y - EMB2) / 460)), len = lerp(26, 150, Math.pow(R(), 1.4)) * lerp(0.6, 1.2, tone), w = lerp(1.0, 7, tone) * (0.6 + 0.8 * R()); if (R() < 0.22 + tone) { const yy = y + (vnoise(x * 0.01, y * 0.05, 3) - 0.5) * 3, hz = h01(x, y, 2701), dy = clamp((y - EMB2) / (F.y1 - EMB2)); const s = tone >= 0.3 ? E.winPrint + 2 + 9 * clamp((y - EMB2) / 160) + 2 * hz : hz < 0.45 ? NEVER : c0 + 6 + 100 * dy + 18 * h01(x, y, 2702); lensT(g, x + len / 2, yy, len / 2, w, k * 991 + (x | 0), 0, s, 3); if (Math.abs(x + len / 2 - WC[0]) < 46 && y < EMB2 + 90 && refl.length < 4) refl.push([x + len / 2, yy, len / 2, w, k * 991 + (x | 0)]); } x += len + lerp(46, 8, tone) * (0.4 + R() * 1.2); } }
    g.fillStyle = "#000"; const city = S2_CITY.map((P, i) => chipEdge(P, 2300 + i, { big: 0.35 })); for (const P of city) { g.beginPath(); poly(g, P); g.fill(); }
    const TANK = [[650, 474], [681, 450], [712, 474], [708, 528], [654, 528]], LEGS = [[[660, 528], [654, EMB]], [[702, 528], [708, EMB]], [[660, 560], [704, 612]], [[704, 560], [658, 612]], [[657, 612], [705, 612]]];
    g.beginPath(); poly(g, TANK); g.fill(); g.strokeStyle = "#000"; g.lineCap = "butt"; LEGS.forEach(([a, b], i) => { g.lineWidth = i < 2 ? 6 : 3.4; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); });
    g.lineWidth = 4.5; g.beginPath(); g.moveTo(918, 514); g.lineTo(918, 300); g.stroke(); g.lineWidth = 2.6; for (const [a, b] of [[[904, 360], [932, 360]], [[908, 410], [928, 410]]]) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.fillStyle = "#000"; g.fillRect(0, EMB, W, EMB2 - EMB);
    const lightW = (q) => 4.2 * Math.pow(clamp(1 - Math.hypot(q[0] - WC[0], (q[1] - WC[1]) * 1.6) / 420), 1.3);
    const rimWhen = (a, b, k) => { const d = Math.hypot((a[0] + b[0]) / 2 - WC[0], (a[1] + b[1]) / 2 - WC[1]); return lerp(E.city[0], E.city[1] - 8, clamp(d / 820)) + 3 * h01(a[0], a[1], 2703); };
    city.forEach((P, i) => { const cx = P.reduce((s, q) => s + q[0], 0) / P.length, left = cx < WC[0]; rimEdgesT(g, P, 2400 + i * 40, (a, b) => (left ? b[1] > a[1] + 20 && Math.abs(b[0] - a[0]) < 8 && a[0] < WC[0] : b[1] < a[1] - 20 && Math.abs(b[0] - a[0]) < 8) || (b[0] > a[0] + 6 && Math.abs(b[1] - a[1]) < (b[0] - a[0]) * 1.2 && a[1] < EMB - 8), lightW, rimWhen); });
    rimEdgesT(g, TANK, 2470, (a, b) => b[0] > a[0], lightW, rimWhen);
    // 影の中の白い刀 8 本: 6 本はアクセントごとに1本、土手の長い 2 本は溝と同時(via)
    g.fillStyle = "#fff"; [[112, 420, 30, 2.2, 1], [96, 584, 46, 2.6, 2], [352, 560, 56, 2.4, 3], [300, 646, 84, 3.0, 4], [566, 604, 62, 2.6, 5], [600, 676, 38, 2.0, 6], [140, 727, 320, 2.4, 7], [560, 744, 230, 1.8, 8]].forEach(([x0, y0, l, w, sd], i) => cutT(g, [[x0, y0], [x0 + l * 0.5, y0 + 1], [x0 + l, y0 + 1.5]], w, 2480 + sd, { entry: 0.15, exit: 0.45, jit: 0.4 }, i < 6 ? E.knives[i % E.knives.length] : E.via + (i - 6) * 3, i < 6 ? 3 : 6));
    // 窓の右と下の壁の光: 窓を彫ったコマから、近い所から外へ
    g.fillStyle = "#fff";
    for (const [k, y, R] of rowsOf(2, 3, WC[1] - 54, EMB - 6, () => 5)) { let x = 862 + R() * 8; while (x < 978) { const d = Math.hypot((x - WC[0]) / 1.3, y - WC[1]) / 92; if (d < 1 && R() > d * 0.55) cutT(g, [[x, y], [x + (8 + 14 * (1 - d)), y + (R() - 0.5)]], 1.0 + 3.2 * (1 - d), k * 31 + (x | 0), { entry: 0.1, exit: 0.6, jit: 0.3 }, E.winCarve + 1 + 5 * d, 2); x += 12 + R() * 8; } }
    for (const [i, [x, y]] of [[94, 360], [118, 510], [316, 520], [512, 560], [606, 540], [1010, 690]].entries()) { const w = 9 + hash(i, 3, 9) * 6, h = 12 + hash(i, 4, 9) * 7; g.beginPath(); poly(g, [[x, y], [x + w, y + (hash(i, 5, 9) - 0.5) * 2], [x + w + (hash(i, 6, 9) - 0.5) * 2, y + h], [x, y + h + (hash(i, 7, 9) - 0.5) * 2]]); g.fill(); }
    g.fillStyle = "#fff"; grooveT(g, [[tb[0] + 30, 736], [1250, 736], [1052, 736], [1020, 704], [1020, 684], [990, 656], [938, 656], [916, 640]], { w0: 15, w1: 3.5, seed: 2501, chip: 2.6 }, E.via, E.winCarve - E.via);
    g.fillStyle = "#000"; g.fillRect(882, 552, 64, 78); g.fillStyle = "#fff"; handWindowT(g, 887, 557, 54, 68, 2, 2, 31, E.winCarve);
    carveT(g, T, 2600, E.letters);
    g.restore();
    const [q, qg] = plateBuf("plB"); bokashi(qg, 0, F.y0, 0, EMB, [[0, 1], [0.5, 0.97], [0.82, 0.78], [1, 0.5]]); qg.globalCompositeOperation = "destination-out"; drawWedges(qg); qg.globalCompositeOperation = "source-over"; MO.holeT(qg, T, 2600, E.letters, 4); qg.globalCompositeOperation = "destination-out"; qg.fillStyle = "#000"; for (const P of city) { qg.beginPath(); poly(qg, P); qg.fill(); } qg.fillRect(0, EMB - 2, W, H); qg.globalCompositeOperation = "source-over";
    skyStreaks(qg, 2, 14, [70, 70, 1480, 420], E.kan + 23, E.via - 1, [tb], { w: [2.2, 6], l: [240, 760] }); // v7: 闇の後〜溝の前の間を埋める空の筋
    pressIn(qg, c0, "down", 2801);
    const [p, pg] = plateBuf("plA");
    pg.save(); pg.beginPath(); poly(pg, city[6]); pg.clip(); pg.beginPath(); poly(pg, chipEdge([[870, 540], [962, 534], [976, 600], [968, 672], [874, 676], [866, 610], [870, 540]], 2551, { big: 0.6 })); pg.fill(); pg.restore();
    for (const [cx, y, hw, th, sd] of refl) lens(pg, cx, y, hw + 1.5, th + 1.5, sd);
    baren(pg, [850, 520, 1000, 900], E.winPrint, "right", 2802);
    letterPlate(pg, T[0], { rect: [0.04, -0.8, 0.36, -0.12] }); letterPlate(pg, T[1], { contour: 6 });
    const sb = lettersBox([T[0], T[1]]); baren(pg, [sb[0] - 4, sb[1] - 4, sb[2] + 4, sb[3] + 4], E.sunPrint, "down", 2803);
    return fin(ctx, m, [{ c: q, color: C.AI, kind: "bokashi", shift: [2, -1] }, { c: p, color: C.AMBER, kind: "flat" }], o, T, { grain: 0.03, cut: 2, sheet: 1 }, { cut_id: "S2", events: E, letters: T.map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }

  // =====================================================================
  // S3 291〜408「輝きは増す」: 川の曲がりと舟の提灯
  //  291 刷り替え(藍をばれんで左から)。字は句頭 291(要確認)から1字ずつ(輝 +0・き +8・は +14・増 +20・す +28。語ごとの時刻が無いので推定)。
  //  提灯は最初から彫ってある(紙のまま)。句頭+5〜+20 の最強(302)で提灯に琥珀を刷り、その映りを提灯から画面の下へ彫り下ろす。
  //  +20〜345 の最強(340)で岸の灯 2 つ、345〜360 の最強(350、低音 0.46)で残りの灯 3 つを刷り、提灯の映りの脇の欠片を一気に彫る(灯が欠片で増す)。
  //  その後の強い 3 つ(359・373・387)で、岸の灯の映りを順に彫る。川の暗い筋は全体に少しずつ
  // =====================================================================
  function S3(ctx, o) {
    const f = getF(), sh = shot("S3"), c0 = sh.start, [m, g] = begin(F), U = (x) => clamp((x - F.x0) / (F.x1 - F.x0));
    const E = { kag: phrase("輝きは増す") }; E.letters = [0, 8, 14, 20, 28].map((d) => E.kag + d);
    E.lanPrint = strongest(E.kag + 5, E.kag + 20); E.lit1 = strongest(E.lanPrint + 20, E.lanPrint + 43); E.masu = strongest(E.lit1 + 5, E.lit1 + 20);
    E.waves = accIn(E.masu + 5, sh.end - 15).sort((a, b) => b.strength - a.strength).slice(0, 3).map((x) => x.frame30).sort((a, b) => a - b);
    const yb = (x) => lerp(214, 352, Math.pow(U(x), 1.35)) + 10 * Math.sin(U(x) * 4.1 + 0.6), sc = (x) => lerp(0.46, 1.2, Math.pow(U(x), 1.1));
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
    const WL = 742;
    g.fillStyle = "#fff"; g.fillRect(F.x0 - 10, F.y0 - 10, W, 380);
    g.fillStyle = "#000"; for (const P of shapes) { g.beginPath(); poly(g, P); g.fill(); }
    g.beginPath(); g.moveTo(F.x0 - 20, yb(F.x0) - 1); for (let xx = F.x0 - 20; xx <= F.x1 + 20; xx += 8) g.lineTo(xx, yb(xx) - 1); g.lineTo(F.x1 + 20, H); g.lineTo(F.x0 - 20, H); g.closePath(); g.fill();
    const LIT = [[0.18, 0], [0.47, 1], [0.58, 0], [0.74, 1], [0.86, 0]].map(([u, j], i) => { const B = bld[Math.min(bld.length - 1, Math.round(u * (bld.length - 1)))], sz = (11 + 4 * j) * B.s; return { x: B.x + B.w * 0.35, y: B.tp + B.h * 0.35 + 4 * B.s, w: sz, h: sz * 1.25, water: B.b + 12, reach: 0.05 + 0.12 * u, id: i }; });
    const litPrint = (i) => ([1, 3].includes(i) ? E.lit1 : E.masu); // 大きい灯 2 つが先、小さい 3 つが「増す」で
    const reflWave = (i) => E.waves[[0, 1, 2, 1, 2][i] % E.waves.length];
    // 第2段(音ハメ 350・387 が +2 の直し): 拍の事象の刀の時間差を縮め(映りの欠片は拍のコマに一度に、提灯のまわりの刀は 6 → 1.5 コマ)、拍の直前 4 コマに始まる川の暗い筋は拍へ寄せる
    const snap3 = (t) => { for (const a of [E.masu].concat(E.waves)) if (t > a - 5 && t < a) return a; return t; };
    const LAN = { x: 1186, y: 456, w: 114, h: 158 }, LC = [LAN.x + LAN.w / 2, LAN.y + LAN.h / 2];
    g.fillStyle = "#fff";
    for (const [k2, y, R] of rowsOf(3, 2, 230, F.y1 - 2, (y) => 4 + (y - 200) * 0.012)) {
      const d = clamp((y - 200) / (F.y1 - 200)); let xx = F.x0 - 20 + R() * 40;
      while (xx < F.x1) { const len = lerp(14, 110, Math.pow(R(), 1.3)) * lerp(0.45, 1.3, d), sky = Math.pow(clamp(1 - (y - yb(xx) - 10) / 70), 2), near = Math.pow(clamp(1 - Math.hypot((xx + len / 2 - LC[0]) / 340, (y - LC[1] - 60) / 300)), 1.1); if (y > yb(xx) + 8 && R() < 0.03 + 0.05 * d + 0.9 * sky + 0.9 * near) { const s = near > 0.15 ? (near > 0.5 ? E.masu : E.waves[E.waves.length - 1]) : sky > 0.3 || h01(xx, y, 3702) < 0.4 ? NEVER : snap3(c0 + 4 + 100 * h01(xx, y, 3703)); lensT(g, xx + len / 2, y + (vnoise(xx * 0.01, y * 0.05, 3) - 0.5) * 3, len / 2 * (1 + 0.6 * near), lerp(1.0, 3.2, d) * (0.6 + 0.8 * R()) * (1 + 0.7 * sky + 0.8 * near), k2 * 997 + (xx | 0), 0, s, near > 0.15 ? 1 : 3); } xx += len + lerp(70, 30, d) * (0.5 + R()) * (1 - 0.6 * near); }
    }
    const [p, pg] = plateBuf("plA"), refl = [];
    const reflect = (L, y0, y1, id, when) => { let y = y0 + 3, j = 0; const ph = hash(id, 1, 9) * 6.28; while (y < y1) { const R = PR(3, 3, id, j++), t = (y - y0) / (y1 - y0), d = clamp((y - 200) / (F.y1 - 200)), amp = L.w * (0.18 + 0.9 * t), cx = L.x + L.w / 2 + amp * Math.sin((y - y0) * 0.045 + ph) * 0.6 + (vnoise(y * 0.04, id, 9) - 0.5) * amp, hw = L.w * (0.42 + 0.9 * t) * (0.5 + 0.8 * R()), th = lerp(2.2, 6.4, d) * (0.75 + 0.5 * R()) * (1 - 0.3 * t); if (R() < 1 - 0.45 * t) refl.push([cx, y, hw, th, t < 0.55 && R() < 0.95 - t, id * 1000 + j, when(t, false)]); if (t > 0.2 && R() < 0.5) { const side = R() < 0.5 ? -1 : 1; refl.push([cx + side * hw * (1.2 + R()), y + 1, hw * (0.25 + 0.3 * R()), th * 0.7, false, id * 1000 + j + 500, when(t, true)]); } y += lerp(3.2, 7.5, d) * (0.8 + 0.5 * R()); } };
    LIT.forEach((L, i) => reflect(L, L.water, L.water + (F.y1 - L.water) * L.reach, i, (t) => reflWave(i)));
    reflect({ x: LAN.x - 10, w: LAN.w + 20 }, WL + 6, F.y1 + 4, 50, (t, side) => (side ? E.masu : snap3(E.lanPrint + 2 + 34 * t)));
    g.fillStyle = "#000"; for (const [cx, y, hw] of refl) g.fillRect(cx - hw - 4, y - 2.5, hw * 2 + 8, 5);
    g.fillStyle = "#fff"; for (const [cx, y, hw, th, , id, s] of refl) lensT(g, cx, y, hw, th, 7100 + id, 0, s, Number.isInteger(s) ? 1 : 2); // 第2段: 拍のコマに決まる刀(映りの欠片・岸の灯の映り)は1コマで彫り切る
    const hull = [[1352, WL - 26], [1440, WL - 14], [1660, WL - 18], [F.x1 + 30, WL - 40], [F.x1 + 30, WL + 30], [1410, WL + 26]];
    g.fillStyle = "#fff"; for (let j = 0; j < 4; j++) lens(g, 1560 + (hash(j, 1, 61) - 0.5) * 120, WL + 34 + j * 7, 230 - j * 40, 4.2 - j * 0.6, 6600 + j);
    g.fillStyle = "#000"; g.beginPath(); poly(g, hull); g.fill();
    g.fillStyle = "#fff"; groove(g, [[1354, WL - 27], [1440, WL - 16], [1660, WL - 20], [F.x1 + 20, WL - 41]], { w0: 3.5, w1: 6, seed: 3961, chip: 1.5, splinter: false, taper: 0.01 });
    g.fillStyle = "#000"; g.lineCap = "butt"; g.strokeStyle = "#000"; g.lineWidth = 7; g.beginPath(); g.moveTo(1560, WL - 20); g.lineTo(1330, LAN.y - 74); g.lineTo(LC[0], LAN.y - 74); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(LC[0], LAN.y - 74); g.lineTo(LC[0], LAN.y); g.stroke();
    g.fillStyle = "#fff"; groove(g, [[1566, WL - 26], [1334, LAN.y - 68], [LC[0] + 8, LAN.y - 68]], { w0: 4.6, w1: 2.0, seed: 3970, chip: 1.2, taper: 0.05 });
    for (const [dy, w, sd] of [[-4, 4.4, 3971], [10, 3.0, 3972]]) groove(g, [[1380, WL + dy + 2], [1540, WL + dy - 2], [1760, WL + dy - 8]], { w0: w, w1: 0.8, seed: sd, chip: 1.5, taper: 0.3 });
    const lanPath = (gg, grow = 0) => { gg.beginPath(); for (let a = 0; a <= 6.2832; a += 0.08) { const sx = Math.cos(a), sy = Math.sin(a); gg.lineTo(LC[0] + sx * (LAN.w / 2 + grow) * (1 - 0.1 * sy * sy), LC[1] + sy * (LAN.h / 2 + grow)); } gg.closePath(); };
    g.fillStyle = "#fff"; lanPath(g); g.fill();
    g.fillStyle = "#000"; for (let i = 1; i <= 5; i++) { const yy = LAN.y + (LAN.h * i) / 6, hw = (LAN.w / 2) * Math.sqrt(1 - Math.pow((yy - LC[1]) / (LAN.h / 2), 2)) * 0.97; cutW(g, [[LC[0] - hw, yy + 2], [LC[0], yy + 4], [LC[0] + hw, yy + 2]], 2.4, 2.4, 3980 + i, 0.4); }
    g.fillRect(LC[0] - 30, LAN.y - 8, 60, 16); g.fillRect(LC[0] - 34, LAN.y + LAN.h - 8, 68, 16);
    // 琥珀の版: 岸の灯とその映り(灯ごとに、その灯を刷るコマ)→ 提灯とその映り(提灯を刷るコマ)の順に版に描いて、それぞれをばれんで刷る(版の絵は v6 と同じ)
    for (const L of LIT) { g.fillStyle = "#000"; g.fillRect(L.x - 3, L.y - 3, L.w + 6, L.h + 6); g.fillStyle = "#fff"; handWindowT(g, L.x, L.y, L.w, L.h, 1, L.h > 22 ? 2 : 1, 77 + L.id); }
    for (const L of LIT) {
      const [lc, lg] = plateBuf("plLit"); lg.fillStyle = "#000"; for (const [cx, y, hw, th, amber, id] of refl) if (amber && Math.floor(id / 1000) === L.id) lens(lg, cx, y, hw + 1.5, th + 1.5, 7100 + id);
      lg.fillRect(L.x - 2, L.y - 2, L.w + 4, L.h + 4); baren(lg, [0, 0, W, H], litPrint(L.id), "down", 3810 + L.id); pg.drawImage(lc, 0, 0);
    }
    { const [lc, lg] = plateBuf("plLan"); lg.fillStyle = "#000"; for (const [cx, y, hw, th, amber, id] of refl) if (amber && Math.floor(id / 1000) === 50) lens(lg, cx, y, hw + 1.5, th + 1.5, 7100 + id);
      lanPath(lg, -2); lg.fill(); baren(lg, [0, 0, W, H], E.lanPrint, "down", 3801); pg.drawImage(lc, 0, 0); }
    const T = setV("SMB", "輝きは増す", 1000, 430, 104, 0.12);
    keepOut(g, T, 30); carveT(g, T, 3990, E.letters);
    g.restore();
    pg.globalCompositeOperation = "destination-out"; keepOut(pg, T, 24); pg.globalCompositeOperation = "source-over";
    const [q, qg] = plateBuf("plB"); bokashi(qg, 0, F.y0, 0, 360, [[0, 1], [0.45, 0.95], [0.85, 0.66], [1, 0.5]]);
    qg.globalCompositeOperation = "destination-out"; qg.fillStyle = "#000"; qg.beginPath(); qg.moveTo(0, yb(0) - 3); for (let xx = 0; xx <= W; xx += 8) qg.lineTo(xx, yb(xx) - 3); qg.lineTo(W, H); qg.lineTo(0, H); qg.closePath(); qg.fill(); for (const P of shapes) { qg.beginPath(); poly(qg, P); qg.fill(); } qg.globalCompositeOperation = "source-over";
    skyStreaks(qg, 3, 12, [70, 60, 1860, 190], E.lit1 - 15, sh.end - 6, [lettersBox(T)], { w: [1.8, 4.5], l: [200, 640] }); // v7: 灯の間を埋める空の筋(遠い空なので細く)
    pressIn(qg, c0, "right", 3802);
    return fin(ctx, m, [{ c: q, color: C.AI, kind: "bokashi", shift: [2, -1] }, { c: p, color: C.AMBER, kind: "flat" }], o, T, { grain: -0.02, cut: 3, sheet: 2 }, { cut_id: "S3", events: E, letters: T.map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }

  // =====================================================================
  // S4 409〜668「ひとつ、またひとつ 繋がってく」: 坂の町
  //  409 刷り替え(藍をばれんで右から)。「ひとつ、」は句頭 409 から1字ずつ。窓1は句頭+3〜+12 の最強(416)で彫り、+12〜+20 の最強(425、0.88)で琥珀を刷る(ひとつ灯る)。
  //  溝は窓1から窓2へ、その後のアクセント(435・453・482)ごとに押して進む。「またひとつ」は 450 以後の最初のアクセント(453。語ごとの時刻が無いので推定)から。
  //  窓2は 485〜495 の最強(491)で彫り、495〜505 の最強(500、0.89)で刷る(またひとつ)。刷ったら窓1→窓2の溝に琥珀が通る(10 コマ)。
  //  「繋がってく」(540、要確認)で字を坂の黒に彫り始め、溝の2本目を窓2から右へ。アクセントごとに押し(557・567・576・585)、3つ目の窓の手前で止まる。
  //  溝②は拍ごとに押して(546〜633 の 8 回)、600〜 の最強(642)で3つ目の窓に届いて桟を彫り、次の強いアクセント(652)で琥珀を刷る(v6 は灯らないまま=v7 で変えた)。
  //  坂の面の刀・家の縁の刀・空の筋は全体に少しずつ(長い静止を作らない)
  // =====================================================================
  const slope4 = (x) => 470 + (x - F.x0) * 0.25 + (fbm(x * 0.004, 2, 81, 3) - 0.5) * 24;
  const S4_HOUSES = [[-80, 520, 300, 520, "g"], [430, 300, 150, 250, "e"], [790, 150, 96, 150, "s"], [980, 280, 170, 240, "g"], [1300, 210, 150, 160, "f"], [1560, 170, 90, 150, "e"], [1740, 200, 110, 140, "s"]];
  function housePoly4([x, w, eave, ridge, t]) {
    const gL = slope4(Math.max(F.x0, x)), gR = slope4(x + w), base = Math.max(gL, gR) + 60, top = Math.min(gL, gR), e = top - eave, r = top - ridge;
    if (t === "g") return [[x, base], [x, e], [x - 14, e + 6], [x + w * 0.5, r], [x + w + 14, e + 6], [x + w, e], [x + w, base]];
    if (t === "e") return [[x, base], [x, e], [x + w * 0.5, r], [x + w, e], [x + w, base]];
    if (t === "s") return [[x, base], [x, r], [x + w + 10, e + 8], [x + w, e], [x + w, base]];
    return [[x, base], [x, e], [x + w * 0.1, e], [x + w * 0.1, e - 10], [x + w, e - 10], [x + w, base]];
  }
  const S4_PAN = 120; // 第2段 2.5D: 主の層(z=0.7)が 84px、手前の家が 120px、空が 14px 左へ
  function S4(ctx, o) {
    const f = getF(), sh = shot("S4"), c0 = sh.start, [m, g] = begin(F), houses = S4_HOUSES.map((h, i) => chipEdge(housePoly4(h), 4400 + i, { big: 0.4 }));
    const E = { hito: phrase("ひとつ、またひとつ"), tsuna: phrase("繋がってく") };
    E.t1 = [0, 4, 8, 12].map((d) => E.hito + d); E.w1Carve = strongest(E.hito + 3, E.hito + 12); E.w1Print = strongest(E.hito + 12, E.hito + 20);
    E.mata = firstAcc(450, 470); E.t2 = [0, 4, 8, 12, 16].map((d) => E.mata + d);
    E.w2Carve = strongest(485, 495); E.w2Print = strongest(495, 505);
    E.g1Push = accIn(E.w1Print + 5, E.w2Carve - 5).sort((a, b) => b.strength - a.strength).slice(0, 3).map((x) => x.frame30).sort((a, b) => a - b);
    E.t3 = [0, 5, 10, 13, 18].map((d) => E.tsuna + d);
    E.w3 = strongest(600, sh.end - 20); E.w3Print = strongest(E.w3 + 6, sh.end - 12); // 3つ目の窓: 桟を彫る(642)→ 刷る(652)
    E.g2Push = [E.tsuna + 6].concat(accIn(E.tsuna + 12, E.w3 - 4).sort((a, b) => b.strength - a.strength).slice(0, 7).map((x) => x.frame30).sort((a, b) => a - b)); // 溝②は拍ごとに押して、3つ目の窓に届く
    E.knives = accIn(E.w2Print + 5, sh.end - 5).filter((x) => x.frame30 !== E.w3 && x.frame30 !== E.w3Print && !E.g2Push.includes(x.frame30)).map((x) => x.frame30).slice(0, 6);
    // 第2段(2.5D、A7_CAM が入の時): 「またひとつ」が灯った(500)後、カメラは溝②と一緒に右へ動き、3つ目の窓が灯るコマ(652)で止まる(夜明け A と同じ規則: 信号を追い、届いたら止まる)。
    //   層: 空(藍のぼかしと空の筋)= 遠 0.12/坂と家 = 主 0.7/手前の左の家 = 前 1.0/字 = カメラに固定(読みやすさ)。紙の端の版木のふちは動かない(版木の窓の奥が動く)
    // 第2段(静止の FAIL の直し): 溝②から右の家々へ枝分かれ(B1: 窓3の家の壁 → 坂の下 → 4つ目の窓、B2: 4つ目 → 5つ目)。4つ目の窓は 642 で彫り 661 で刷る
    const Z = A7_CAM.Z, camT = A7_CAM.ease((f - E.w2Print) / (E.w3Print - E.w2Print)); A7_CAM.set({ pan: [-S4_PAN * camT, 0] });
    const Lz = (gg, z) => A7_CAM.layer(gg, z), PR4 = (r, z) => { const a = A7_CAM.pt([r[0], r[1]], z), b = A7_CAM.pt([r[2], r[3]], z); return [a[0], a[1], b[0], b[1]]; };
    E.b1Push = accIn(E.w3 - 30, E.w3 - 5).map((x) => x.frame30).slice(-3); E.w4 = E.w3; E.w4Print = strongest(E.w3Print + 4, sh.end - 2); E.b2Push = [E.w3Print, E.w4Print]; E.w5 = E.w4Print + 4;
    const topOf = (P) => P.reduce((a, q) => Math.min(a, q[1]), 1e9);
    const W1 = { x: 512, y: topOf(houses[1]) + 140, w: 84, h: 98, cols: 2, rows: 2 }, W2 = { x: 1074, y: topOf(houses[3]) + 112, w: 72, h: 104, cols: 1, rows: 2 }, W3 = { x: 1400, y: topOf(houses[4]) + 50, w: 56, h: 60 };
    const W4 = { x: 1626, y: topOf(houses[5]) + 66, w: 42, h: 50, cols: 1, rows: 2 }, W5 = { x: 1792, y: topOf(houses[6]) + 46, w: 38, h: 42 }, XR = F.x1 + 10 + (A7_CAM.on() ? 130 : 0);
    Lz(g, Z.MAIN);
    g.fillStyle = "#fff"; g.beginPath(); g.moveTo(F.x0 - 10, F.y0 - 10); g.lineTo(XR, F.y0 - 10); for (let x = XR; x >= F.x0 - 10; x -= 8) g.lineTo(x, slope4(x) + 2); g.closePath(); g.fill();
    g.fillStyle = "#000"; g.beginPath(); g.moveTo(F.x0 - 20, H); for (let x = F.x0 - 20; x <= XR + 10; x += 8) g.lineTo(x, slope4(x)); g.lineTo(XR + 10, H); g.closePath(); g.fill();
    houses.forEach((P, i) => { if (i === 0) return; g.beginPath(); poly(g, P); g.fill(); }); // 手前の左の家(前の層)は坂の刀の後に描く
    // 家の光の縁: 最初は手前の 2 軒だけ。残りは左から右へ(句頭〜+70)
    const rim4 = (P, i) => rimEdgesT(g, P, 4500 + i * 30, (a, b) => (b[0] > a[0] + 4 && b[1] > a[1] + 2 && a[1] < slope4(a[0])) || (Math.abs(b[0] - a[0]) < 3 && b[1] > a[1] + 20 && a[1] < slope4(a[0]) - 4), (q) => (i === 0 ? 2.4 : 1.6) + 2.2 * smooth((q[0] - 300) / 1400), (a) => (i < 2 ? NEVER : c0 + 6 + 64 * clamp((a[0] - 700) / 1150) + 4 * h01(a[0], a[1], 4701)));
    houses.forEach((P, i) => { if (i) rim4(P, i); });
    g.fillStyle = "#fff"; { let seg = [], n = 0; const inHouse = (x) => S4_HOUSES.some(([hx, hw]) => x > hx + 6 && x < hx + hw - 6); for (let x = F.x0 - 10; x <= XR; x += 5) { if (inHouse(x)) { if (seg.length > 3) cut(g, seg, 3.2, 4600 + n++, { entry: 0.05, exit: 0.3, jit: 0.7 }); seg = []; } else seg.push([x, slope4(x) + 1]); } if (seg.length > 3) cut(g, seg, 3.2, 4600 + n, { entry: 0.05, exit: 0.3, jit: 0.7 }); }
    // 坂の面の刀: 最初は 35%。残りは全体に散らして(とくに 繋がってく の間)
    for (const [k, dy, R] of rowsOf(4, 2, 34, 560, (y) => 14 + y * 0.09)) { let x = F.x0 + R() * 60; while (x < F.x1) { const t = clamp((1 - dy / 380) * smooth((x - 300) / 1500)), len = lerp(40, 180, R()) * lerp(0.6, 1.3, t); if (R() < 0.04 + t * 0.9) { const hz = h01(x, dy, 4702), s = hz < 0.35 ? NEVER : hz < 0.55 ? c0 + 20 + 110 * h01(x, dy, 4703) : E.tsuna + 4 + (sh.end - 8 - E.tsuna - 4) * h01(x, dy, 4704); cutT(g, [0, 0.5, 1].map((u) => [x + len * u, slope4(x + len * u) + dy + (R() - 0.5) * 2]), lerp(0.9, 6, t), k * 991 + (x | 0), { entry: 0.1, exit: 0.5, jit: 0.4 }, s, 4); } x += len + lerp(130, 16, t) * (0.5 + R()); } }
    Lz(g, Z.NEAR); g.fillStyle = "#000"; g.beginPath(); poly(g, houses[0]); g.fill(); rim4(houses[0], 0);
    g.fillStyle = "#fff"; [[390, 520, 70, 2.6, 1], [360, 600, 90, 3.0, 2], [400, 680, 50, 2.2, 3], [300, 760, 120, 3.4, 4], [380, 840, 64, 2.4, 5], [250, 920, 160, 3.0, 6]].forEach(([x0, y0, l, w, sd], i) => cutT(g, [[x0, y0], [x0 + l, y0 + 2]], w, 4730 + sd, { entry: 0.15, exit: 0.5, jit: 0.4 }, E.knives[i % E.knives.length], 3));
    Lz(g, Z.MAIN);
    const gy = (x) => slope4(x) + 34, ax = W1.x + W1.w / 2, bx = W2.x + W2.w / 2;
    const G1 = [[ax, W1.y + W1.h + 10], [ax, gy(ax) - 20], [ax + 20, gy(ax)], [bx - 30, gy(bx - 30)], [bx, gy(bx - 30) - 30], [bx, W2.y + W2.h + 10]], G1o = { w0: 11, w1: 6, seed: 4801, chip: 2.4, splinter: false, taper: 0.03 };
    const G2 = [[bx + 8, gy(bx - 30) - 34], [bx + 120, gy(bx - 30) - 34], [bx + 120 + 40, gy(bx + 160) - 40], [W3.x - 16, gy(bx + 160) - 40]];
    const g1p = pushProg(E.g1Push.map((s, i) => [s, (i + 1) / E.g1Push.length, 7])), g2p = pushProg(E.g2Push.map((s, i) => [s, (i + 1) / E.g2Push.length, 6]));
    g.fillStyle = "#fff"; grooveP(g, G1, G1o, g1p); grooveP(g, G2, { w0: 11, w1: 6, seed: 4802, chip: 2.2, splinter: false, taper: 0.03 }, g2p);
    const B1 = [[W3.x + W3.w + 10, W3.y + W3.h + 8], [1492, W3.y + W3.h + 8], [1492, slope4(1492) + 22], [W4.x + W4.w / 2, slope4(W4.x + W4.w / 2) + 22], [W4.x + W4.w / 2, W4.y + W4.h + 10]];
    const B2 = [[W4.x + W4.w + 8, W4.y + W4.h - 6], [1712, W4.y + W4.h - 6], [1712, slope4(1712) + 20], [W5.x + W5.w / 2, slope4(W5.x + W5.w / 2) + 20], [W5.x + W5.w / 2, W5.y + W5.h + 10]], Bo = { w0: 9, w1: 5, splinter: false, taper: 0.03, chip: 2.0 };
    const b1p = pushProg(E.b1Push.map((s, i) => [s, (i + 1) / E.b1Push.length, 6])), b2p = pushProg(E.b2Push.map((s, i) => [s, (i + 1) / E.b2Push.length, 6]));
    grooveP(g, B1, Object.assign({ seed: 4831 }, Bo), b1p); grooveP(g, B2, Object.assign({ seed: 4832 }, Bo), b2p); // v7: 窓3まで届く溝なので溝①と同じ太さに(v6 は 7→2px で、拍ごとに押しても見えにくかった)
    const [p, pg] = plateBuf("plA"); Lz(pg, Z.MAIN);
    for (const [Wn, hi, ca, pr] of [[W1, 1, E.w1Carve, E.w1Print], [W2, 3, E.w2Carve, E.w2Print], [W4, 5, E.w4, E.w4Print]]) { g.fillStyle = "#000"; g.fillRect(Wn.x - 6, Wn.y - 6, Wn.w + 12, Wn.h + 12); g.fillStyle = "#fff"; handWindowT(g, Wn.x, Wn.y, Wn.w, Wn.h, Wn.cols, Wn.rows, 51 + hi, ca); pg.save(); pg.beginPath(); poly(pg, houses[hi]); pg.clip(); pg.beginPath(); pg.ellipse(Wn.x + Wn.w / 2, Wn.y + Wn.h / 2, Wn.w / 2 + 52, Wn.h / 2 + 50, 0, 0, 7); pg.fill(); pg.restore(); baren(pg, PR4([Wn.x - 60, Wn.y - 60, Wn.x + Wn.w + 60, Wn.y + Wn.h + 60], Z.MAIN), pr, hi === 1 ? "down" : "right", 4810 + hi); }
    // 窓1→窓2 の溝の琥珀: 窓2を刷ったコマから、窓1の側から 10 コマで通る
    pg.fillStyle = "#000"; grooveP(pg, G1, Object.assign({}, G1o, { w0: 14, w1: 9 }), f < E.w2Print ? 0 : clamp((f - E.w2Print + 1) / 22));
    grooveP(pg, G2, { w0: 14, w1: 9, seed: 4802, chip: 2.2, splinter: false, taper: 0.03 }, f < E.w3Print ? 0 : clamp((f - E.w3Print + 1) / 9));
    grooveP(pg, B1, Object.assign({ seed: 4831 }, Bo, { w0: 12, w1: 8 }), f < E.w4Print ? 0 : clamp((f - E.w4Print + 1) / 6)); // 第2段: 4つ目の窓を刷ったら、枝の溝にも琥珀
    // v7: 3つ目の窓を刷ったら、窓2→窓3 の溝にも琥珀が通る
    // v7: 3つ目の窓も灯す(「繋がってく」の句の終わりで、溝が届いて灯る)。v6 は灯らない枠の2本だけだった
    g.fillStyle = "#000"; g.fillRect(W3.x - 6, W3.y - 6, W3.w + 12, W3.h + 12); g.fillStyle = "#fff"; handWindowT(g, W3.x, W3.y, W3.w, W3.h, 2, 2, 55, E.w3, 0); // 3つ目は4枚の桟を一度に(アクセント 642 で山)
    g.fillStyle = "#000"; g.fillRect(W5.x - 5, W5.y - 5, W5.w + 10, W5.h + 10); g.fillStyle = "#fff"; handWindowT(g, W5.x, W5.y, W5.w, W5.h, 1, 2, 57, E.w5, 0); // 5つ目は彫るだけ(次の S5 へ繋がってく)
    pg.save(); pg.beginPath(); poly(pg, houses[4]); pg.clip(); pg.beginPath(); pg.ellipse(W3.x + W3.w / 2, W3.y + W3.h / 2, W3.w / 2 + 44, W3.h / 2 + 42, 0, 0, 7); pg.fill(); pg.restore(); baren(pg, PR4([W3.x - 60, W3.y - 60, W3.x + W3.w + 60, W3.y + W3.h + 60], Z.MAIN), E.w3Print, "right", 4815); Lz(pg, null);
    const T1 = setH("SMB", "ひとつ、", 470, 262, 92, 0.1), T2 = setH("SMB", "またひとつ", 960, 352, 92, 0.1), T = T1.concat(T2);
    const T3 = setH("SMB", "繋がってく", 1060, 948, 96, 0.1); // v7: 歌詞「繋がってく」(540、要確認)を坂の黒に彫る(v6 の静止画には無かった)
    Lz(g, null); carveT(g, T, 4790, E.t1.concat(E.t2));
    keepOut(g, T3, 22); carveT(g, T3, 4890, E.t3);
    g.restore();
    const [q, qg] = plateBuf("plB"); bokashi(qg, F.x0, F.y0, F.x1 * 0.85, 760, [[0, 1], [0.5, 0.92], [0.8, 0.68], [1, 0.42]]);
    qg.globalCompositeOperation = "destination-out"; qg.fillStyle = "#000"; Lz(qg, Z.MAIN); qg.beginPath(); qg.moveTo(0, H); for (let x = 0; x <= XR; x += 8) qg.lineTo(x, slope4(x) - 2); qg.lineTo(XR, H); qg.closePath(); qg.fill(); houses.forEach((P, i) => { Lz(qg, i ? Z.MAIN : Z.NEAR); qg.beginPath(); poly(qg, P); qg.fill(); }); Lz(qg, null); qg.globalCompositeOperation = "source-over"; MO.holeT(qg, T, 4790, E.t1.concat(E.t2), 4);
    Lz(qg, Z.FAR); skyStreaks(qg, 4, 26, [60, 60, 1860, 400], E.w1Print + 3, sh.end - 6, T.map((L) => bbox(L.cs)), { w: [2.2, 6.5], l: [260, 820] }); Lz(qg, null); // v7: 灯と溝の間、繋がってく の後を埋める空の筋(独立審査 v3 の S4「空の上の端に白い刀を戻す」)
    pressIn(qg, c0, "left", 4803);
    const all = T.concat(T3);
    return fin(ctx, m, [{ c: q, color: C.AI, kind: "bokashi", shift: [2, -1] }, { c: p, color: C.AMBER, kind: "flat" }], o, all, { grain: 0.04, cut: 4, sheet: 3 }, { cut_id: "S4", events: E, g1: +g1p.toFixed(3), g2: +g2p.toFixed(3), mbox: { W1: [W1.x - 6, W1.y - 6, W1.x + W1.w + 6, W1.y + W1.h + 6], W2: [W2.x - 6, W2.y - 6, W2.x + W2.w + 6, W2.y + W2.h + 6], W3: [W3.x - 8, W3.y - 8, W3.x + W3.w + 8, W3.y + W3.h + 8], W4: PR4([W4.x - 8, W4.y - 8, W4.x + W4.w + 8, W4.y + W4.h + 8], Z.MAIN).map(Math.round), camEndDx: A7_CAM.on() ? -S4_PAN * Z.MAIN : 0, W4raw: [W4.x - 8, W4.y - 8, W4.x + W4.w + 8, W4.y + W4.h + 8].map(Math.round), G1: bbox([G1]).map(Math.round), G2: bbox([G2]).map(Math.round) }, letters: all.map((L) => ({ ch: L.ch, bb: bbox(L.cs).map(Math.round) })) });
  }

  function draw(ctx, o) {
    const f = getF();
    for (const [id, fn] of [["S1", S1], ["S2", S2], ["S3", S3], ["S4", S4]]) { const s = shot(id); if (f >= s.start && f < s.end) return fn(ctx, o); }
    throw new Error("冒頭の外のコマ: " + f);
  }
  return { draw, S1, S2, S3, S4, woodLinesT, handWindowT, skyStreaks, rimEdgesT }; // 第2段: 中盤(cand_a7_mid.js)も木目・窓・空の筋の部品を使う
})();
