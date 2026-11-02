// 配達人ミオ 第2版(3案)。world.js の後に読む。時刻 t と引数だけで決まる(乱数なし、状態なし)。
// 構造(動かす前提):
//   1) rig(D, pose): 体のパラメータ D と姿勢 pose から、関節の位置(局所座標)を計算する。脚と腕は2関節の IK(足は板の上に固定)。
//   2) 二次運動は chain(): 支点・向き・節の長さ・時刻 t から、点列を返す純関数(減衰振動の位相を節ごとにずらす)。
//      マフラー・ケープ・コートの裾・アンテナ・提灯は全部これ。t を付け替えるだけで巻き戻し・任意コマの描画ができる。
//   3) 部品の描画順(奥→手前): 後ろの二次運動 / 板 / 後ろの腕 / 後ろの脚 / 荷物 / 胴 / 前の脚 / 頭 / 前の腕 / 前の二次運動 / 手に持つ物
//   4) 姿勢は POSES の名前(ride / dodge / deliver)か、その間を poseMix(a, b, k) で補間した物を渡す。
// 局所座標: 原点=板の中心、右向き、y は下。足は板の上面 FT_Y に載る。単位は s=1 で人物の高さ約 260〜300px。
const COURIER2 = (() => {
  const P = PAINT, W = WORLD, { css, mix, lerp, clamp, shade, glow } = P;
  const FT_Y = -25; // 板の上面。靴底はここに接する(めり込まない)
  const SKIN = { base: "#f3cba8", hi: "#fff0dd", sh: "#c27a6a" };

  // ---- 3案の体と衣装 ----
  const DESIGNS = {
    A: { name: "A 提灯のミオ", head: 52, torso: 66, torsoW: 58, thigh: 34, shin: 34, arm: 32, hand: 17, boot: 1.0, limbW: 21,
      coat: ["#3f6aa8", "#9cc0f0", "#1a2a58"], pants: ["#55649a", "#9aa8dc", "#232d5a"], boots: ["#8a553a", "#e0a577", "#3a2018"], glove: ["#f3e6cc", "#ffffff", "#a59886"],
      cape: ["#f2e4c6", "#fffaf0", "#9c96ac"], scarf: ["#d4473a", "#ff9a6a", "#6a1a2c"], rimL: [0.9, 0.35], lamp: "front" },
    B: { name: "B 背負い灯のミオ", head: 42, torso: 86, torsoW: 62, thigh: 48, shin: 48, arm: 42, hand: 19, boot: 1.25, limbW: 24,
      coat: ["#7fd0c0", "#dcfff3", "#2a7a86"], pants: ["#33417a", "#7f93d8", "#161d46"], boots: ["#f0e4ca", "#ffffff", "#a59886"], glove: ["#8a5a3a", "#e0a577", "#3a2018"],
      cape: null, scarf: ["#d4473a", "#ff9a6a", "#6a1a2c"], rimL: [-1, 0.1], lamp: "back" },
    C: { name: "C 兜灯のミオ", head: 46, torso: 78, torsoW: 54, thigh: 44, shin: 46, arm: 40, hand: 16, boot: 1.0, limbW: 19,
      coat: ["#e2583f", "#ffb894", "#7a1f35"], pants: ["#f1e5cb", "#ffffff", "#a59a8a"], boots: ["#3a2f55", "#8a7ec0", "#14102a"], glove: ["#f1e5cb", "#ffffff", "#a59a8a"],
      cape: null, scarf: ["#d4473a", "#ff9a6a", "#6a1a2c"], rimL: [0.5, -0.9], lamp: "top" },
  };

  // ---- 姿勢(単位: 腕の長さ・脚の長さに対する比、または px) ----
  const POSES = {
    ride:    { crouch: 0.62, lean: 0.42, hipX: -16, fx: 70, bx: -70, handF: [1.55, -0.2], handB: [-0.95, 0.85], tilt: -0.04, expr: 0, swing: 0.3 },
    dodge:   { crouch: 0.92, lean: -0.3, hipX: -34, fx: 46, bx: -86, handF: [1.35, -0.55], handB: [-1.25, 0.15], tilt: 0.22, expr: 1, swing: 0.9 },
    deliver: { crouch: 0.28, lean: 0.14, hipX: -8, fx: 66, bx: -54, handF: [1.7, 0.05], handB: [1.45, 0.3], tilt: -0.02, expr: 2, swing: 0.15, offer: 1 },
  };
  const poseMix = (a, b, k) => { const o = {}, A = typeof a === "string" ? POSES[a] : a, B = typeof b === "string" ? POSES[b] : b; for (const key in A) o[key] = Array.isArray(A[key]) ? A[key].map((v, i) => lerp(v, B[key][i], k)) : lerp(A[key], B[key] ?? A[key], k); return o; };

  // ---- 幾何の道具 ----
  const rotV = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
  function ik(A, B, a, b, pick) {
    let dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy) || 1; const dm = a + b - 0.5;
    if (d > dm) { B = [A[0] + dx / d * dm, A[1] + dy / d * dm]; dx = B[0] - A[0]; dy = B[1] - A[1]; d = dm; }
    const an = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1)), base = Math.atan2(dy, dx);
    const c1 = [A[0] + Math.cos(base + an) * a, A[1] + Math.sin(base + an) * a], c2 = [A[0] + Math.cos(base - an) * a, A[1] + Math.sin(base - an) * a];
    return [A, pick(c1, c2), B];
  }
  // 二次運動の鎖: 支点 a から、向き ang0 に長さ lens の節を並べる。節 i の角度は 減衰しない振動 amp*sin(w*t - lag*i + ph) を先端ほど大きく足す。
  function chain(a, ang0, lens, t, { amp = 0.35, w = 9, lag = 0.7, ph = 0, droop = 0 } = {}) {
    const pts = [a]; let p = a; const n = lens.length;
    for (let i = 0; i < n; i++) { const k = (i + 1) / n, ang = ang0 + amp * Math.sin(w * t - lag * i + ph) * k + droop * k * k; p = [p[0] + Math.cos(ang) * lens[i], p[1] + Math.sin(ang) * lens[i]]; pts.push(p); }
    return pts;
  }

  function rig(D, p) {
    const legLen = D.thigh + D.shin, hipH = lerp(legLen * 0.97, legLen * 0.6, p.crouch);
    const hip = [p.hipX, FT_Y - hipH], ln = p.lean;
    const neck = [hip[0] + Math.sin(ln) * D.torso, hip[1] - Math.cos(ln) * D.torso];
    const sh = [hip[0] + Math.sin(ln) * D.torso * 0.9, hip[1] - Math.cos(ln) * D.torso * 0.9];
    const R = D.head, head = [neck[0] + Math.sin(ln * 0.55 + p.tilt) * R * 0.5 + R * 0.22, neck[1] - R * 0.92];
    const ftF = [p.fx, FT_Y], ftB = [p.bx, FT_Y];
    const fwd = (c1, c2) => (c1[0] > c2[0] ? c1 : c2), dn = (c1, c2) => (c1[1] > c2[1] ? c1 : c2);
    const legF = ik(hip, ftF, D.thigh, D.shin, fwd), legB = ik([hip[0] - 4, hip[1]], ftB, D.thigh, D.shin, fwd);
    const aF = ik([sh[0] + 4, sh[1] + 4], [sh[0] + 4 + p.handF[0] * D.arm * 1.2, sh[1] + 4 + p.handF[1] * D.arm * 1.2], D.arm, D.arm, dn);
    const aB = ik([sh[0] - 4, sh[1] + 6], [sh[0] - 4 + p.handB[0] * D.arm * 1.2, sh[1] + 6 + p.handB[1] * D.arm * 1.2], D.arm, D.arm, dn);
    return { hip, neck, sh, head, R, legF, legB, aF, aB, ln };
  }

  // ---- 本体 ----
  // opts: { t, lampGlow, rimOff, hold }
  function draw(ctx, x, y, s, rot, poseIn, design = "A", opts = {}) {
    const D = DESIGNS[design], p = typeof poseIn === "string" ? POSES[poseIn] : poseIn, t = opts.t || 0, lampK = opts.lampGlow ?? 1;
    const J = rig(D, p), sil = P.mode.sil;
    const L = rotV([0.62, -0.78], -rot), rimL = rotV(D.rimL, -rot), boxR = 420 * s, box = [x - boxR, y - boxR * 1.15, boxR * 2, boxR * 1.6];
    const T = (g) => { g.translate(x, y); g.rotate(rot); g.scale(s, s); };
    const wp = (lx, ly) => { const c = Math.cos(rot), sn = Math.sin(rot); return [x + (lx * c - ly * sn) * s, y + (lx * sn + ly * c) * s]; };
    const part = (fn, o) => shade(ctx, (g) => { g.save(); T(g); g.beginPath(); fn(g); g.restore(); }, Object.assign({ box, L, rimL, blur: 2.4 * s, silColor: "#0d0d0d" }, o));
    const pal = (c, k = 1) => ({ base: css(c[0]), hiCol: css(c[1]), hi: 7 * s * k, hiA: 0.85, shCol: css(c[2]), sh: 15 * s * k, shA: 0.9 });
    const rim = (k = 1) => ({ rimCol: css(W.C.amber), rim: 4.5 * s * k, rimA: 0.9 * lampK });
    const limb = (g, pts, wf) => P.ribbonPath(g, P.sampleSpline(pts, 12), wf);
    const strokeLocal = (fn, force) => { if (sil && !force) return; ctx.save(); T(ctx); fn(ctx); ctx.restore(); };
    const wLimb = D.limbW, ang0 = Math.PI + (opts.windLift ?? 0.3) + clamp(-p.lean * 0.25, -0.2, 0.2); // 風は後ろ(-x)から。体が前に傾くほどなびきは寝る

    // 0) 二次運動の鎖(後ろ側): 先に計算する
    const nk = [J.neck[0] + 2, J.neck[1] + 8];
    const scarfA = chain(nk, ang0 - 0.1, [44, 44, 44, 44, 44, 40, 36], t, { amp: 0.42, w: 9, lag: 0.75, droop: 0.15 });
    const scarfB = chain([nk[0], nk[1] + 10], ang0 + 0.05, [38, 38, 38, 36, 34, 30], t, { amp: 0.4, w: 9, lag: 0.7, ph: 0.9, droop: 0.2 });
    const ribbon = (g, pts, w0, w1) => limb(g, pts, (u) => lerp(w0, w1, u) * (1 + 0.12 * Math.sin(u * 13 - t * 9)));

    // 1) 後ろ側の二次運動(ケープ・コートの裾)
    if (D.cape) { // ケープ: 3枚の面(奥・中・手前)を位相をずらして重ね、折れ線の陰で厚みを出す
      const base = [J.sh[0] - 4, J.sh[1] + 4];
      const c1 = chain(base, ang0 + 0.1, [50, 50, 48, 44, 38], t, { amp: 0.3, w: 8, lag: 0.6, droop: 0.15 }), c2 = chain([base[0], base[1] + 30], ang0 + 0.28, [44, 44, 40, 34], t, { amp: 0.3, w: 8, lag: 0.6, ph: 0.8, droop: 0.24 }), c3 = chain([base[0] + 2, base[1] + 14], ang0 + 0.19, [46, 46, 44, 38, 30], t, { amp: 0.32, w: 8, lag: 0.65, ph: 1.7, droop: 0.2 });
      const wfn = (w0, w1) => (u) => lerp(w0, w1, u) * (1 + 0.12 * Math.sin(u * 13 - t * 9));
      part((g) => ribbon(g, c2, 54, 12), { ...pal(D.cape, 0.7), shCol: css(mix(D.cape[2], "#101830", 0.3)) });
      part((g) => ribbon(g, c1, 62, 18), { ...pal(D.cape) });
      part((g) => ribbon(g, c3, 48, 12), { ...pal(D.cape, 1.2), hiA: 1 });
      const folds = (pts, w0, w1, fr, col, lw) => strokeLocal((g) => { const sm = P.sampleSpline(pts, 10), wf = wfn(w0, w1), L = sm[sm.length - 1][2] || 1; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round"; for (const f of fr) { g.beginPath(); let first = true; for (let i = 0; i < sm.length; i++) { const u = sm[i][2] / L; if (u < 0.08 || u > 0.92) continue; const a0 = sm[Math.max(0, i - 1)], b0 = sm[Math.min(sm.length - 1, i + 1)]; let tx = b0[0] - a0[0], ty = b0[1] - a0[1]; const tn = Math.hypot(tx, ty) || 1; tx /= tn; ty /= tn; const w = wf(u) * f * (1 + 0.15 * Math.sin(u * 9 + f * 7)); const X = sm[i][0] - ty * w, Y = sm[i][1] + tx * w; first ? g.moveTo(X, Y) : g.lineTo(X, Y); first = false; } g.stroke(); } });
      folds(c1, 62, 18, [-0.26, 0.08, 0.3], css(D.cape[2], 0.5), 3);
      folds(c3, 48, 12, [-0.2, 0.22], css(D.cape[2], 0.4), 2.5);
      folds(c1, 62, 18, [-0.4], css("#ffffff", 0.55), 2); // 縁の光
    }
    if (design === "C") { // 燕尾コートの裾(腰から2枚)
      const tails = [0, 1].map((i) => chain([J.hip[0] - 6, J.hip[1] + 2 + i * 10], ang0 + 0.4 + i * 0.22, [40, 40, 38, 34], t, { amp: 0.32, w: 8.5, lag: 0.7, ph: i * 1.1, droop: 0.3 }));
      part((g) => ribbon(g, tails[1], 44, 8), pal(D.coat, 0.8)); part((g) => ribbon(g, tails[0], 52, 10), pal(D.coat));
    }
    if (!D.cape && design !== "C") { part((g) => ribbon(g, scarfB, 18, 6), { ...pal(D.scarf, 0.7), ...rim(0.5) }); }

    // 2) 板(葉の形。上面は象牙、下面は紺、中央に琥珀の象嵌、下に琥珀のひれ)
    const boardP = (g) => { g.moveTo(-178, -10); g.bezierCurveTo(-176, -21, -160, -25, -140, -24); g.lineTo(80, -25); g.bezierCurveTo(140, -26, 192, -40, 230, -68); g.bezierCurveTo(228, -44, 202, -14, 150, -2); g.bezierCurveTo(100, 7, -80, 9, -140, 5); g.bezierCurveTo(-166, 3, -179, -2, -178, -10); g.closePath(); };
    part(boardP, { base: (g) => { const gr = g.createLinearGradient(0, y - 30 * s, 0, y + 12 * s); gr.addColorStop(0, "#fff8e6"); gr.addColorStop(0.45, "#e9dcc0"); gr.addColorStop(0.5, "#2a2f5c"); gr.addColorStop(1, "#171a3a"); return gr; }, hiCol: "#ffffff", hi: 5 * s, hiA: 0.7, shCol: css("#3a3358"), sh: 9 * s, shA: 0.5, rimCol: css(W.C.amber), rim: 4 * s, rimL: rotV([0, 1], -rot), rimA: 0.95 * lampK });
    part((g) => { for (const fx of [-112, 76]) { g.moveTo(fx - 26, 6); g.lineTo(fx + 14, 6); g.quadraticCurveTo(fx - 4, 14, fx - 24, 30); g.quadraticCurveTo(fx - 22, 14, fx - 26, 6); g.closePath(); } }, { base: css(W.C.amber), hiCol: css(W.C.amberHot), hi: 6 * s, hiA: 1, shCol: css(W.C.amberDeep), sh: 6 * s, shA: 0.8 });
    strokeLocal((g) => { g.strokeStyle = css(W.C.amber); g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(-150, -12); g.lineTo(100, -13); g.stroke(); g.strokeStyle = css(W.C.amberHot, 0.9); g.lineWidth = 1.5; g.stroke(); });

    // 3) 後ろの腕(手は握り)
    const armW = (u) => lerp(wLimb * 1.15, wLimb * 0.8, u);
    part((g) => limb(g, J.aB, armW), { ...pal(D.coat, 0.8), ...rim(0.5) });
    part((g) => mitten(g, J.aB[1], J.aB[2], D.hand), { ...pal(D.glove, 0.6) }); strokeLocal((g) => fingerLines(g, J.aB[1], J.aB[2], D.hand, css(D.glove[2], 0.8), false));
    // 4) 後ろの脚と靴
    const legW = (u) => lerp(wLimb * 1.35, wLimb * 0.95, u) * (1 + 0.12 * Math.sin(u * Math.PI));
    part((g) => limb(g, J.legB, legW), { ...pal(D.pants, 0.7), ...rim(0.4) });
    part((g) => boot(g, J.legB[2], D.boot), { ...pal(D.boots, 0.6) });
    // 5) 背負い荷物(B は巨大な灯り箱、A/C は小さな荷袋)
    let lampWorld = null;
    if (design === "B") lampWorld = bigPack(part, strokeLocal, pal, rim, J, p, s, t, D, wp);
    else smallPack(part, pal, J, D);
    // 6) 胴(上着)
    const torsoW = D.torsoW, torsoPts = [J.hip, [(J.hip[0] + J.sh[0]) / 2 + 6, (J.hip[1] + J.sh[1]) / 2], J.neck];
    part((g) => limb(g, torsoPts, (u) => lerp(torsoW * 0.8, torsoW * 1.0, Math.sin(Math.min(1, u * 1.3) * 1.5)) * (u > 0.85 ? lerp(1, 0.55, (u - 0.85) / 0.15) : 1)), { ...pal(D.coat, 1.2), ...rim(0.6) });
    strokeLocal((g) => { // ベルトとボタン
      g.strokeStyle = css(D.pants[2], 0.9); g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); const b0 = [lerp(J.hip[0], J.sh[0], 0.12), lerp(J.hip[1], J.sh[1], 0.12)]; g.moveTo(b0[0] - torsoW * 0.42, b0[1]); g.lineTo(b0[0] + torsoW * 0.42, b0[1]); g.stroke();
      g.fillStyle = css(W.C.amber); g.beginPath(); g.arc(b0[0] + 4, b0[1], 5, 0, 7); g.fill();
    });
    if (D.cape) part((g) => g.ellipse(J.sh[0] - 4, J.sh[1] - 4, 34, 20, -0.5, 0, 7), { ...pal(D.cape, 0.9), ...rim(0.3) }); // ケープの襟
    // 7) 前の脚と靴
    part((g) => limb(g, J.legF, legW), { ...pal(D.pants, 1) });
    part((g) => boot(g, J.legF[2], D.boot), { ...pal(D.boots, 0.9) });
    // 8) 後ろのマフラーの尾(A/B/C 共通で首元から。C は無し)
    if (design !== "C") part((g) => ribbon(g, scarfA, 24, 8), { ...pal(D.scarf), ...rim(0.6) });
    // 9) 頭
    const head = headParts(part, strokeLocal, pal, rim, J, p, D, design, t, s, wp);
    if (design === "C") lampWorld = head.lamp;
    // 10) 前の腕と手、手に持つ物
    part((g) => limb(g, J.aF, armW), { ...pal(D.coat, 1) });
    let held = null;
    if (design === "A") held = heldLantern(part, strokeLocal, J, p, D, t, s, wp, pal, rim);
    part((g) => mitten(g, J.aF[1], J.aF[2], D.hand * 1.05, design === "A"), { ...pal(D.glove, 0.9) }); strokeLocal((g) => fingerLines(g, J.aF[1], J.aF[2], D.hand * 1.05, css(D.glove[2], 0.8), design === "A"));
    if (p.offer && design !== "A") { // 差し出す小包(両手の間)
      const hm = [(J.aF[2][0] + J.aB[2][0]) / 2 + 12, (J.aF[2][1] + J.aB[2][1]) / 2 - 6];
      part((g) => g.roundRect(hm[0] - 22, hm[1] - 20, 44, 40, 8), { base: css("#9a6a44"), hiCol: css("#e0a577"), hi: 5 * s, hiA: 0.8, shCol: css("#3a2018"), sh: 8 * s, shA: 0.9 });
      part((g) => g.roundRect(hm[0] - 11, hm[1] - 9, 22, 18, 5), { base: css(W.C.amberHot), silColor: "#0d0d0d" });
      const q = wp(hm[0], hm[1]); glow(ctx, q[0], q[1], 140 * s, W.C.amber, 0.5); lampWorld = lampWorld || q;
    }
    part((g) => { g.ellipse(nk[0] + 2, nk[1] + 2, 24, 15, 0.5, 0, 7); }, { ...pal(D.scarf, 0.9), ...rim(0.4) }); // マフラーの結び目(A/B/C 共通の朱の特徴。C は襟)
    // 光(効果): 灯り・ひれ
    const lampPts = []; if (lampWorld) lampPts.push(lampWorld); if (held) lampPts.push(held);
    for (const q of lampPts) { glow(ctx, q[0], q[1], 220 * s * lampK, W.C.amber, 0.34); glow(ctx, q[0], q[1], 56 * s * lampK, "#fff3d0", 0.6); }
    for (const fx of [-122, 66]) { const q = wp(fx, 14); glow(ctx, q[0], q[1], 70 * s, W.C.amber, 0.4); }
    return { J, wp, lamps: lampPts, head: wp(J.head[0], J.head[1]) };
  }

  // ---- 部品の形 ----
  const ell = (g, cx, cy, rx, ry, rot) => { g.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot)); g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); };
  function mitten(g, elbow, hand, r, grip) { // 手: 手のひら+指3本+親指。grip=true は棒を握る(指を曲げて並べる)
    const a = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]), c = Math.cos(a), sn = Math.sin(a), px = hand[0] + c * r * 0.5, py = hand[1] + sn * r * 0.5;
    ell(g, px, py, r * 0.95, r * 0.8, a);
    for (let i = -1; i <= 1; i++) {
      const off = i * r * 0.5, fx = px + c * r * 0.75 - sn * off, fy = py + sn * r * 0.75 + c * off;
      if (grip) ell(g, fx, fy, r * 0.42, r * 0.3, a + 0.2 * i); else ell(g, fx + c * r * 0.28, fy + sn * r * 0.28, r * 0.62, r * 0.27, a + 0.16 * i);
    }
    ell(g, px - sn * r * 0.78 + c * r * 0.1, py + c * r * 0.78 + sn * r * 0.1, r * 0.5, r * 0.3, a - 0.9);
  }
  function fingerLines(g, elbow, hand, r, col, grip) { // 指の境目の細い線
    const a = Math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]), c = Math.cos(a), sn = Math.sin(a), px = hand[0] + c * r * 0.5, py = hand[1] + sn * r * 0.5;
    g.strokeStyle = col; g.lineWidth = 1.8; g.lineCap = "round";
    for (const i of [-0.5, 0.5]) { const off = i * r * 0.5, x0 = px + c * r * 0.5 - sn * off, y0 = py + sn * r * 0.5 + c * off, L = grip ? r * 0.55 : r * 0.95; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + c * L, y0 + sn * L); g.stroke(); }
  }
  function boot(g, f, k) { const x = f[0], y = f[1], H = 30 * k, Ln = 38 * k; g.moveTo(x - 20 * k, y - H); g.lineTo(x + 10 * k, y - H - 2); g.quadraticCurveTo(x + 16 * k, y - H * 0.5, x + 22 * k, y - 14); g.quadraticCurveTo(x + Ln + 14 * k, y - 14, x + Ln + 12 * k, y - 3); g.quadraticCurveTo(x + Ln, y + 1, x + 10 * k, y + 1); g.lineTo(x - 26 * k, y + 1); g.quadraticCurveTo(x - 32 * k, y - 10, x - 20 * k, y - H); g.closePath(); }
  function smallPack(part, pal, J, D) { const x = J.sh[0] - 36, y = J.sh[1] + 10; part((g) => g.roundRect(x - 26, y - 26, 52, 62, 12), { base: css("#8a5a3a"), hiCol: css("#d19a6e"), hi: 6, hiA: 0.8, shCol: css("#2e1d18"), sh: 12, shA: 0.9 }); }
  function bigPack(part, strokeLocal, pal, rim, J, p, s, t, D, wp) { // 巨大な灯り箱: 頭より大きい。窓が光り、上に小さな旗
    const ang = p.lean * 0.8, cx = J.sh[0] - 62 - 8 * Math.sin(p.lean), cy = J.sh[1] + 18, w = 118, h = 150, rr = (g, ox, oy, ww, hh, r) => { g.save(); g.translate(cx, cy); g.rotate(ang); g.roundRect(ox - ww / 2, oy - hh / 2 + 0, ww, hh, r); g.restore(); };
    part((g) => rr(g, 0, 0, w, h, 18), { base: css("#8f5d3a"), hiCol: css("#e6b184"), hi: 8 * s, hiA: 0.85, shCol: css("#2e1d18"), sh: 18 * s, shA: 0.95, rimCol: css(W.C.amberHot), rim: 4 * s, rimA: 0.8 });
    part((g) => { g.save(); g.translate(cx, cy + 6); g.rotate(ang); g.moveTo(-34, 44); g.lineTo(-34, -10); g.arc(0, -10, 34, Math.PI, 0); g.lineTo(34, 44); g.closePath(); g.restore(); }, { base: (g) => { const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); return css(W.C.amberHot); }, silColor: "#0d0d0d" });
    strokeLocal((g) => { g.save(); g.translate(cx, cy + 6); g.rotate(ang); g.strokeStyle = css("#3a2018", 0.9); g.lineWidth = 5; g.beginPath(); g.moveTo(0, -44); g.lineTo(0, 44); g.moveTo(-34, 12); g.lineTo(34, 12); g.stroke(); const fl = chain([0, -h / 2 + 2], -Math.PI / 2, [16, 16, 16], t, { amp: 0.4, w: 8, lag: 0.7, droop: 0.4 }); g.strokeStyle = css("#3a2018"); g.lineWidth = 3; g.beginPath(); fl.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); g.fillStyle = css("#d4473a"); g.beginPath(); const e = fl[fl.length - 1]; g.moveTo(e[0], e[1]); g.lineTo(e[0] - 26, e[1] - 6 + 4 * Math.sin(t * 9)); g.lineTo(e[0], e[1] + 16); g.closePath(); g.fill(); g.restore(); });
    // 肩ひも
    strokeLocal((g) => { g.strokeStyle = css("#3a2018"); g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(J.sh[0] - 2, J.sh[1] - 2); g.quadraticCurveTo(J.sh[0] + 16, J.sh[1] + 36, J.hip[0] + 10, J.hip[1] - 14); g.stroke(); });
    const c = Math.cos(ang), sn = Math.sin(ang); return wp(cx + (0) * c, cy + 6);
  }
  function heldLantern(part, strokeLocal, J, p, D, t, s, wp, pal, rim) { // 手に吊るす提灯(杖の先、前へ突き出す)
    const h = J.aF[2], tip = [h[0] + 66, h[1] - 44 + 8 * Math.sin(t * 5) * p.swing];
    strokeLocal((g) => { g.strokeStyle = P.mode.sil ? "#0d0d0d" : css("#5a3a28"); g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(h[0] - 30, h[1] + 14); g.lineTo(tip[0], tip[1]); g.stroke(); g.strokeStyle = P.mode.sil ? "#0d0d0d" : css("#c98b3a"); g.lineWidth = 3; g.stroke(); }, true);
    const sw = chain(tip, Math.PI / 2, [26, 20], t, { amp: 0.5 * p.swing + 0.12, w: 5.5, lag: 0.9, droop: 0 }), lc = sw[2];
    strokeLocal((g) => { g.strokeStyle = P.mode.sil ? "#0d0d0d" : css("#3a2018"); g.lineWidth = P.mode.sil ? 5 : 2.5; g.beginPath(); g.moveTo(sw[0][0], sw[0][1]); g.lineTo(sw[1][0], sw[1][1]); g.stroke(); }, true);
    part((g) => { g.moveTo(lc[0] - 10, lc[1] - 14); g.lineTo(lc[0] + 10, lc[1] - 14); g.lineTo(lc[0] + 20, lc[1] + 2); g.lineTo(lc[0] + 12, lc[1] + 30); g.lineTo(lc[0] - 12, lc[1] + 30); g.lineTo(lc[0] - 20, lc[1] + 2); g.closePath(); }, { base: css(W.C.amberHot), hiCol: "#ffffff", hi: 5 * s, hiA: 0.9, shCol: css(W.C.amberDeep), sh: 9 * s, shA: 0.9, silColor: "#0d0d0d" });
    part((g) => { g.roundRect(lc[0] - 13, lc[1] - 20, 26, 7, 3); g.roundRect(lc[0] - 13, lc[1] + 28, 26, 7, 3); }, { base: css("#4a2f22"), silColor: "#0d0d0d" });
    return wp(lc[0], lc[1] + 8);
  }

  // ---- 頭(顔と帽子)。表情 expr: 0=きりっ 1=おどろき 2=にっこり ----
  function headParts(part, strokeLocal, pal, rim, J, p, D, design, t, s, wp) {
    const [hx, hy] = J.head, R = J.R, tilt = p.tilt + J.ln * 0.4;
    let lamp = null;
    // 後ろ髪
    const hair = ["#1d2a4e", "#5f7fbb", "#0a1022"];
    part((g) => { g.moveTo(hx - R * 0.1, hy - R * 0.95); g.bezierCurveTo(hx - R * 1.1, hy - R * 1.0, hx - R * 1.45, hy - R * 0.1, hx - R * 1.2, hy + R * 0.5); g.bezierCurveTo(hx - R * 0.9, hy + R * 0.3, hx - R * 0.8, hy + R * 0.7, hx - R * 0.5, hy + R * 0.9); g.lineTo(hx, hy + R * 0.4); g.closePath(); }, { ...pal(hair, 0.8), ...rim(0.5) });
    // 首
    part((g) => { g.moveTo(J.neck[0] - 10, J.neck[1] + 6); g.lineTo(hx - 6, hy + R * 0.85); g.lineTo(hx + 12, hy + R * 0.85); g.lineTo(J.neck[0] + 12, J.neck[1] + 6); g.closePath(); }, { base: css(SKIN.base), shCol: css(SKIN.sh), sh: 9 * s, shA: 0.9, hiCol: css(SKIN.hi), hi: 2 * s, hiA: 0.4 });
    // 顔(丸い頭。右へ少し尖らせて鼻とあご)
    part((g) => { g.moveTo(hx - R * 0.9, hy - R * 0.1); g.bezierCurveTo(hx - R * 1.0, hy - R * 1.0, hx + R * 0.7, hy - R * 1.15, hx + R * 1.0, hy - R * 0.3); g.lineTo(hx + R * 1.12, hy + R * 0.12); g.lineTo(hx + R * 0.96, hy + R * 0.22); g.bezierCurveTo(hx + R * 1.0, hy + R * 0.9, hx + R * 0.2, hy + R * 1.15, hx - R * 0.4, hy + R * 0.9); g.bezierCurveTo(hx - R * 0.95, hy + R * 0.7, hx - R * 1.0, hy + R * 0.3, hx - R * 0.9, hy - R * 0.1); g.closePath(); }, { base: css(SKIN.base), hiCol: css(SKIN.hi), hi: 9 * s, hiA: 0.8, shCol: css(SKIN.sh), sh: 16 * s, shA: 0.75, ...rim(0.55) });
    // 前髪(帽子の下から)
    part((g) => { g.moveTo(hx - R * 1.0, hy - R * 0.2); g.bezierCurveTo(hx - R * 1.0, hy - R * 1.1, hx + R * 0.7, hy - R * 1.2, hx + R * 1.0, hy - R * 0.45); g.quadraticCurveTo(hx + R * 0.55, hy - R * 0.62, hx + R * 0.35, hy - R * 0.4); g.quadraticCurveTo(hx + R * 0.2, hy - R * 0.65, hx - R * 0.1, hy - R * 0.38); g.quadraticCurveTo(hx - R * 0.4, hy - R * 0.5, hx - R * 0.55, hy - R * 0.1); g.closePath(); }, { ...pal(hair, 1), ...rim(0.7) });
    // 帽子・装備(案ごと)
    if (design === "A") { // 大きな丸ゴーグルを額に上げる+革ベルト
      part((g) => { g.moveTo(hx - R * 1.0, hy - R * 0.55); g.quadraticCurveTo(hx, hy - R * 1.12, hx + R * 1.0, hy - R * 0.62); g.lineTo(hx + R * 1.0, hy - R * 0.45); g.quadraticCurveTo(hx, hy - R * 0.95, hx - R * 1.0, hy - R * 0.36); g.closePath(); }, { base: css("#5a3a28"), hiCol: css("#c0875a"), hi: 3 * s, hiA: 0.8, shCol: "#1c0f0a", sh: 5 * s, shA: 0.8 });
      // ゴーグル: 540px でも見えるよう大きく(半径 0.52R)、濃い縁取り+太い真鍮の縁+白い反射の面を大きく
      part((g) => g.arc(hx + R * 0.4, hy - R * 0.84, R * 0.56, 0, 7), { base: css("#3a2412"), hiCol: css("#6a4a2c"), hi: 3 * s, hiA: 0.8 });
      part((g) => g.arc(hx + R * 0.4, hy - R * 0.84, R * 0.5, 0, 7), { base: css("#d9a24a"), hiCol: "#fff0b8", hi: 5 * s, hiA: 0.95, shCol: "#7a4a12", sh: 7 * s, shA: 0.9 });
      part((g) => g.arc(hx + R * 0.41, hy - R * 0.85, R * 0.38, 0, 7), { base: css("#dff6ff"), hiCol: "#ffffff", hi: 9 * s, hiA: 1, shCol: "#4a9ac0", sh: 6 * s, shA: 0.9, silColor: "#0d0d0d" });
      strokeLocal((g) => { g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.ellipse(hx + R * 0.3, hy - R * 0.97, R * 0.14, R * 0.08, -0.5, 0, 7); g.fill(); });
    } else if (design === "B") { // 配達帽(つば付きの制帽。琥珀の灯りのバッジ)
      part((g) => { g.moveTo(hx - R * 1.05, hy - R * 0.35); g.bezierCurveTo(hx - R * 1.0, hy - R * 1.45, hx + R * 0.9, hy - R * 1.5, hx + R * 1.05, hy - R * 0.5); g.lineTo(hx + R * 1.75, hy - R * 0.42); g.quadraticCurveTo(hx + R * 1.85, hy - R * 0.28, hx + R * 1.6, hy - R * 0.25); g.lineTo(hx - R * 1.0, hy - R * 0.05); g.closePath(); }, { base: css("#33417a"), hiCol: css("#7f93d8"), hi: 7 * s, hiA: 0.85, shCol: css("#10163a"), sh: 12 * s, shA: 0.9, ...rim(0.6) });
      part((g) => { g.moveTo(hx + R * 0.2, hy - R * 1.0); g.lineTo(hx + R * 0.5, hy - R * 0.85); g.lineTo(hx + R * 0.2, hy - R * 0.5); g.lineTo(hx - R * 0.1, hy - R * 0.85); g.closePath(); }, { base: css(W.C.amberHot), hiCol: "#fff", hi: 3 * s, hiA: 1, silColor: "#0d0d0d" });
    } else { // C: 丸い兜(クリーム色)+頭の灯り(アンテナの先)
      part((g) => { g.moveTo(hx - R * 1.12, hy - R * 0.15); g.bezierCurveTo(hx - R * 1.2, hy - R * 1.55, hx + R * 1.0, hy - R * 1.6, hx + R * 1.1, hy - R * 0.4); g.lineTo(hx + R * 0.6, hy - R * 0.5); g.quadraticCurveTo(hx + R * 0.1, hy - R * 0.78, hx - R * 0.5, hy - R * 0.5); g.lineTo(hx - R * 0.9, hy + R * 0.1); g.closePath(); }, { base: css("#f1e5cb"), hiCol: "#ffffff", hi: 8 * s, hiA: 0.9, shCol: css("#8a7e92"), sh: 14 * s, shA: 0.85, ...rim(0.6) });
      part((g) => { g.moveTo(hx - R * 1.0, hy - R * 0.3); g.lineTo(hx + R * 1.1, hy - R * 0.4); g.lineTo(hx + R * 1.05, hy - R * 0.5); g.lineTo(hx - R * 1.0, hy - R * 0.44); g.closePath(); }, { base: css("#c98b3a"), hiCol: "#ffe2a0", hi: 3 * s, hiA: 0.9, shCol: "#5a3612", sh: 4 * s, shA: 0.9 });
      const base = [hx + R * 0.1, hy - R * 1.32], an = chain(base, -Math.PI / 2 + 0.55, [30, 26, 22], t, { amp: 0.28 * (0.5 + p.swing), w: 7, lag: 0.8, droop: 0.9 }), tip = an[3];
      strokeLocal((g) => { g.strokeStyle = P.mode.sil ? "#0d0d0d" : css("#5a3a28"); g.lineWidth = P.mode.sil ? 6 : 4; g.lineCap = "round"; g.beginPath(); an.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }, true);
      part((g) => g.arc(tip[0], tip[1] + 14, 15, 0, 7), { base: css(W.C.amberHot), hiCol: "#ffffff", hi: 5 * s, hiA: 1, shCol: css(W.C.amberDeep), sh: 7 * s, shA: 0.9, silColor: "#0d0d0d" });
      lamp = wp(tip[0], tip[1] + 14);
    }
    // 目鼻口(光学)
    if (!P.mode.sil) strokeLocal((g) => {
      const e = Math.round(p.expr), ex = hx + R * 0.5, ey = hy + R * 0.05, ink = "#1a1626";
      g.save(); g.translate(hx, hy); g.rotate(tilt * 0.3); g.translate(-hx, -hy);
      const er = e === 1 ? 1.25 : 1;
      g.fillStyle = ink; g.beginPath(); g.ellipse(ex, ey, R * 0.2 * er, R * 0.3 * er, 0.05, 0, 7); g.fill();
      const gi = g.createLinearGradient(0, ey - R * 0.3, 0, ey + R * 0.3); gi.addColorStop(0.45, "rgba(255,170,70,0)"); gi.addColorStop(1, "rgba(255,190,90,0.9)"); g.fillStyle = gi; g.beginPath(); g.ellipse(ex, ey, R * 0.2 * er, R * 0.3 * er, 0.05, 0, 7); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(ex + R * 0.07, ey - R * 0.13 * er, R * 0.085, 0, 7); g.fill(); g.beginPath(); g.arc(ex - R * 0.06, ey + R * 0.1, R * 0.04, 0, 7); g.fill();
      g.strokeStyle = ink; g.lineCap = "round"; g.lineWidth = R * 0.045; g.beginPath(); // まゆ(細く、後ろ端をやや下げる=きりっ)
      if (e === 0) { g.moveTo(ex - R * 0.24, ey - R * 0.5); g.quadraticCurveTo(ex + R * 0.02, ey - R * 0.58, ex + R * 0.28, ey - R * 0.54); } else if (e === 1) { g.moveTo(ex - R * 0.22, ey - R * 0.55); g.quadraticCurveTo(ex + R * 0.05, ey - R * 0.7, ex + R * 0.3, ey - R * 0.55); } else { g.moveTo(ex - R * 0.25, ey - R * 0.5); g.quadraticCurveTo(ex + R * 0.05, ey - R * 0.6, ex + R * 0.3, ey - R * 0.46); }
      g.stroke();
      g.lineWidth = R * 0.06; g.beginPath(); g.moveTo(hx + R * 1.08, hy + R * 0.08); g.lineTo(hx + R * 0.92, hy + R * 0.2); g.stroke(); // 鼻
      g.lineWidth = R * 0.065; g.beginPath(); // 口
      const mx = hx + R * 0.62, my = hy + R * 0.58;
      if (e === 0) { g.moveTo(mx - R * 0.15, my); g.lineTo(mx + R * 0.14, my - R * 0.02); g.stroke(); } else if (e === 1) { g.fillStyle = "#6a1a2c"; g.ellipse(mx, my + R * 0.02, R * 0.12, R * 0.17, 0, 0, 7); g.fill(); } else { g.moveTo(mx - R * 0.2, my - R * 0.04); g.quadraticCurveTo(mx, my + R * 0.24, mx + R * 0.2, my - R * 0.06); g.closePath(); g.fillStyle = "#6a1a2c"; g.fill(); }
      g.fillStyle = "rgba(235,110,110,0.38)"; g.beginPath(); g.ellipse(hx + R * 0.36, hy + R * 0.42, R * 0.24, R * 0.13, 0, 0, 7); g.fill();
      g.restore();
    });
    return { lamp };
  }

  return { draw, rig, chain, poseMix, POSES, DESIGNS };
})();
