// 主役: 灯りの精(案P「ともしび」)の動画用の作り直し。src/lib/spirit.js の構造(体の姿勢+chain の二次運動+姿勢の補間)を引き継ぎ、
// 初稿の弱点を直す: ①羽が虫に見える → 葉3枚を扇に重ねた「葉の翼」(鳥の翼の輪郭)②小包が小さい → 1.3R の箱、ひも・窓・札
// ③光の尾が琥珀の気流に溶ける → 尾は白金の芯+朱の縁+濃紺の細い縁取り ④小さく映ると羽と体の区別が付かない → 小さい時は羽を濃く、白い縁を太く。
// 時刻 t と引数だけで決まる(乱数・状態なし)。局所座標: 原点=体の中心、右向き、y は下。単位 R=48(s=1)。
const SPIRIT2 = (() => {
  const P = PAINT, W = WORLD, { css, mix, lerp, clamp, shade, glow } = P;
  const R = 48, INK = "#0e1226";
  const POSES = {
    fly:   { rot: -0.1,  sx: 1.1,  sy: 0.93, flap: 0.55, fan: 0.0,  expr: 0, swing: 0.35, pAng: 1.75, glow: 1.0, tail: 1.0 },
    dodge: { rot: -0.85, sx: 0.84, sy: 1.22, flap: 0.15, fan: -0.25, expr: 1, swing: 0.9, pAng: 0.9, glow: 0.95, tail: 1.3 },
    offer: { rot: 0.12,  sx: 1.04, sy: 1.0,  flap: 0.3,  fan: 0.3,  expr: 2, swing: 0.12, pAng: 0.35, glow: 1.25, tail: 0.75 },
    hurt:  { rot: 0.45,  sx: 1.18, sy: 0.84, flap: 0.1,  fan: -0.4, expr: 3, swing: 1.0, pAng: 2.4, glow: 0.7, tail: 0.8 },
    glide: { rot: -0.05, sx: 1.06, sy: 0.96, flap: 0.18, fan: 0.15, expr: 0, swing: 0.25, pAng: 1.65, glow: 0.8, tail: 0.9 },
  };
  const poseMix = (a, b, k) => { const A = typeof a === "string" ? POSES[a] : a, B = typeof b === "string" ? POSES[b] : b, o = {}; for (const key in A) o[key] = lerp(A[key], B[key], k); return o; };
  const rotV = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
  function chain(a, ang0, lens, t, { amp = 0.35, w = 9, lag = 0.7, ph = 0, droop = 0 } = {}) {
    const pts = [a]; let p = a; const n = lens.length;
    for (let i = 0; i < n; i++) { const k = (i + 1) / n, ang = ang0 + amp * Math.sin(w * t - lag * i + ph) * k + droop * k * k; p = [p[0] + Math.cos(ang) * lens[i], p[1] + Math.sin(ang) * lens[i]]; pts.push(p); }
    return pts;
  }

  // draw(ctx, x, y, s, rotExtra, pose, opts)
  //  opts: t(秒), lum(体の明るさ 0.3〜1.5), lift(尾の上向き), tailLen(倍), crack(小包のひび 0..1), smear([dx,dy] 動きの残像), rim(環境の縁の光の色), noParcel
  function draw(ctx, x, y, s, rotExtra, poseIn, opts = {}) {
    const p = typeof poseIn === "string" ? POSES[poseIn] : poseIn, t = opts.t || 0, rot = (rotExtra || 0) + p.rot, lift = opts.lift ?? 0.22;
    const lum = opts.lum ?? 1, small = s < 0.75, gl = p.glow * lum;
    const L = rotV([0.5, -0.85], -rot), boxR = 190 * s, box = [x - boxR, y - boxR, boxR * 2, boxR * 2.05];
    const T = (g) => { g.translate(x, y); g.rotate(rot); g.scale(s, s); };
    const TB = (g) => { g.translate(x, y); g.rotate(rot); g.scale(s * p.sx, s * p.sy); };
    const wp = (lx, ly) => { const c = Math.cos(rot), sn = Math.sin(rot); return [x + (lx * c - ly * sn) * s, y + (lx * sn + ly * c) * s]; };
    const bp = (lx, ly) => [lx * p.sx, ly * p.sy];
    const part = (fn, o, tf = T) => shade(ctx, (g) => { g.save(); tf(g); g.beginPath(); fn(g); g.restore(); }, Object.assign({ box, L, blur: 2.2 * s, silColor: "#0d0d0d" }, o));
    const local = (fn, tf = T) => { ctx.save(); tf(ctx); fn(ctx); ctx.restore(); };
    const outline = (fn, tf = T, w = 7) => { w = Math.max(w, (small ? 6.5 : 4.6) / s); local((g) => { g.beginPath(); fn(g); g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.stroke(); }, tf); };
    const center = wp(0, 0);

    // ---- 0) 動きの残像(体の形の薄い写し。速い時だけ) ----
    if (opts.smear && PAINT.mode.fx) {
      const [dx, dy] = opts.smear, n = 4;
      for (let i = n; i >= 1; i--) { const k = i / n; ctx.save(); ctx.globalAlpha = 0.16 * (1 - k * 0.6); ctx.fillStyle = css(W.C.amber); ctx.beginPath(); ctx.ellipse(x - dx * k, y - dy * k, R * s * p.sx * (1 - 0.1 * k), R * s * p.sy * (1 - 0.1 * k), rot, 0, 7); ctx.fill(); ctx.restore(); }
    }

    // ---- 1) 光の尾: 白金の芯+朱の縁(気流の琥珀と色を分ける)+濃紺の細い縁取り ----
    const ang0 = Math.PI + lift, tl = 40 * p.tail * (opts.tailLen ?? 1);
    const tr = chain(bp(-0.7 * R, 0.12 * R), ang0, [tl, tl, tl, tl, tl, tl * 0.9, tl * 0.8], t, { amp: 0.45, w: 8, lag: 0.7, droop: 0.15 });
    const trS = P.sampleSpline(tr.map((q) => wp(q[0], q[1])), 10);
    const trW = (u) => R * s * 1.05 * (1 - u) ** 1.05 * (1 + 0.1 * Math.sin(u * 14 - t * 10));
    P.ribbonPath(ctx, trS, (u) => trW(u) + 5); ctx.fillStyle = "rgba(14,18,38,0.55)"; ctx.fill();
    P.ribbonPath(ctx, trS, trW); const g1 = ctx.createLinearGradient(trS[0][0], trS[0][1], trS[trS.length - 1][0], trS[trS.length - 1][1]);
    g1.addColorStop(0, css("#ff8f6a", 0.98)); g1.addColorStop(0.45, css("#e8553f", 0.75)); g1.addColorStop(1, css("#b8324a", 0)); ctx.fillStyle = g1; ctx.fill();
    P.ribbonPath(ctx, trS, (u) => trW(u) * 0.55); const g2 = ctx.createLinearGradient(trS[0][0], trS[0][1], trS[trS.length - 1][0], trS[trS.length - 1][1]);
    g2.addColorStop(0, "rgba(255,252,240,1)"); g2.addColorStop(0.5, "rgba(255,236,190,0.85)"); g2.addColorStop(1, "rgba(255,236,190,0)"); ctx.fillStyle = g2; ctx.fill();

    // ---- 2) 葉の翼(奥): 葉3枚を扇に重ねる。付け根は背中の上 ----
    const root = bp(-0.5 * R, -0.22 * R);
    const leafPath = (g, rt, ang, len, wid) => { const f = (u, v) => [rt[0] + Math.cos(ang) * u - Math.sin(ang) * v, rt[1] + Math.sin(ang) * u + Math.cos(ang) * v]; g.moveTo(...f(0, 0)); g.bezierCurveTo(...f(len * 0.25, -wid * 1.25), ...f(len * 0.8, -wid * 1.0), ...f(len, 0)); g.bezierCurveTo(...f(len * 0.75, wid * 0.85), ...f(len * 0.2, wid * 0.9), ...f(0, 0)); g.closePath(); };
    const wingAng = (ph) => -2.2 + p.fan * 0.4 + p.flap * 0.5 * Math.sin(12 * t + ph);
    const spread = (ph) => 0.36 + 0.1 * Math.sin(12 * t + ph + 1.2);
    const LEAVES = [[1.75, 0.42], [1.42, 0.37], [1.08, 0.31]];
    const wing = (ph, back) => {
      const a0 = wingAng(ph), sp = spread(ph), rt = back ? [root[0] + 0.3 * R, root[1] - 0.16 * R] : root;
      const cBase = back ? ["#2c8f8a", "#9fe6d6", "#123f55"] : ["#3fc0ad", "#e8fff4", "#16566e"];
      if (small) { cBase[0] = back ? "#1f6f78" : "#2aa597"; }
      for (let i = LEAVES.length - 1; i >= 0; i--) {
        const [ln, wd] = LEAVES[i], ang = a0 - i * sp, len = ln * R, wid = wd * R;
        outline((g) => leafPath(g, rt, ang, len, wid), T, 5);
        const tip = wp(rt[0] + Math.cos(ang) * len, rt[1] + Math.sin(ang) * len), rr = wp(rt[0], rt[1]);
        part((g) => leafPath(g, rt, ang, len, wid), {
          base: (g) => { const q = g.createLinearGradient(rr[0], rr[1], tip[0], tip[1]); q.addColorStop(0, css(cBase[1])); q.addColorStop(0.5, css(cBase[0])); q.addColorStop(1, css(mix(cBase[0], cBase[2], 0.45))); return q; },
          hiCol: css(cBase[1]), hi: 7 * s, hiA: 0.95, shCol: css(cBase[2]), sh: 12 * s, shA: 0.75, rimCol: css(W.C.amberHot), rim: 3 * s, rimA: 0.7 * Math.min(1.2, gl), rimL: rotV([-0.7, 0.5], -rot),
        });
        if (!small) local((g) => { g.strokeStyle = css(cBase[2], 0.6); g.lineWidth = 2; g.lineCap = "round"; g.beginPath(); const f = (u) => [rt[0] + Math.cos(ang) * u, rt[1] + Math.sin(ang) * u]; g.moveTo(...f(len * 0.08)); g.lineTo(...f(len * 0.86)); g.stroke(); });
      }
    };
    wing(0.9, true);

    // ---- 3) スカーフの房(朱) ----
    const knot = bp(-0.05 * R, 0.85 * R);
    const sc = [0, 1].map((i) => chain([knot[0] - 4, knot[1] + i * 7], ang0 + 0.45 - i * 0.2, [26, 26, 24, 22, 20], t, { amp: 0.5, w: 9, lag: 0.75, ph: i * 1.0, droop: 0.2 }));
    sc.forEach((pts, i) => part((g) => P.ribbonPath(g, P.sampleSpline(pts, 8), (u) => lerp(i ? 12 : 15, 4, u) * (1 + 0.12 * Math.sin(u * 13 - t * 9))), { base: css("#d4473a"), hiCol: css("#ff9a6a"), hi: 4 * s, hiA: 0.8, shCol: css("#6a1a2c"), sh: 6 * s, shA: 0.9 }));

    // ---- 4) 体(炎のしずく)。lum で明るさ ----
    const flick = Math.sin(t * 11) * 0.12 + Math.sin(t * 17 + 1) * 0.06;
    const tx = -0.45 * R + flick * R * 1.2, ty = -1.85 * R + Math.abs(flick) * R * 0.3;
    const bodyPath = (g) => { g.moveTo(tx, ty); g.bezierCurveTo(tx + 0.15 * R, -1.25 * R, R, -0.9 * R, R, 0); g.bezierCurveTo(R, 0.58 * R, 0.55 * R, R, 0, R); g.bezierCurveTo(-0.55 * R, R, -R, 0.58 * R, -R, 0); g.bezierCurveTo(-R, -0.85 * R, tx - 0.2 * R, -1.25 * R, tx, ty); g.closePath(); };
    const dim = clamp(1 - lum, 0, 0.7);
    const grad = (g) => { const q = g.createRadialGradient(center[0] + 0.1 * R * s, center[1] - 0.05 * R * s, 2, center[0], center[1], R * s * 1.25); q.addColorStop(0, css(mix("#fffdf0", "#f0a860", dim))); q.addColorStop(0.35, css(mix(W.C.amberHot, "#d9822f", dim))); q.addColorStop(0.75, css(mix(W.C.amber, "#a04a24", dim))); q.addColorStop(1, css(mix(W.C.amberDeep, "#5a2420", dim))); return q; };
    outline(bodyPath, TB, 8);
    part(bodyPath, { base: grad, hiCol: "#ffffff", hi: 6 * s, hiA: 0.7 * (1 - dim), shCol: css(mix(W.C.amberDeep, "#3a1424", dim)), sh: 12 * s, shA: 0.8, rimCol: opts.rim ? css(opts.rim) : null, rim: 4 * s, rimA: 0.8, rimL: rotV([-0.8, 0.2], -rot) }, TB);

    // ---- 5) 顔: 0 きりっ / 1 おどろき / 2 にっこり / 3 痛い(><) ----
    local((g) => {
      const e = Math.round(p.expr), ex = 0.42 * R, ey = -0.08 * R, blink = (((t + 1.3) % 3.2) < 0.1) && e === 0, ink = "#1a1626";
      g.lineCap = "round"; g.lineJoin = "round";
      const eyes = [[ex - 0.34 * R, ey], [ex + 0.34 * R, ey - 0.02 * R]];
      for (const [cx, cy] of eyes) {
        if (e === 2 || blink) { g.strokeStyle = ink; g.lineWidth = 0.1 * R; g.beginPath(); g.arc(cx, cy + 0.06 * R, 0.17 * R, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
        if (e === 3) { g.strokeStyle = ink; g.lineWidth = 0.09 * R; const d = cx < ex ? 1 : -1; g.beginPath(); g.moveTo(cx - 0.14 * R * d, cy - 0.15 * R); g.lineTo(cx + 0.12 * R * d, cy); g.lineTo(cx - 0.14 * R * d, cy + 0.15 * R); g.stroke(); continue; }
        const er = e === 1 ? 1.3 : 1;
        g.fillStyle = ink; g.beginPath(); g.ellipse(cx, cy, 0.14 * R * er, 0.22 * R * er, 0, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(cx + 0.045 * R, cy - 0.08 * R * er, 0.055 * R, 0, 7); g.fill(); g.beginPath(); g.arc(cx - 0.04 * R, cy + 0.07 * R, 0.028 * R, 0, 7); g.fill();
        if (e === 0) { g.strokeStyle = css("#b8601c"); g.lineWidth = 0.07 * R; g.beginPath(); g.moveTo(cx - 0.2 * R, cy - 0.3 * R); g.lineTo(cx + 0.2 * R, cy - 0.34 * R); g.stroke(); }
      }
      g.fillStyle = "rgba(235,110,100,0.4)"; for (const [cx, cy] of eyes) { g.beginPath(); g.ellipse(cx, cy + 0.32 * R, 0.14 * R, 0.08 * R, 0, 0, 7); g.fill(); }
      const mx = ex, my = 0.42 * R; g.strokeStyle = ink; g.lineWidth = 0.06 * R;
      if (e === 0) { g.beginPath(); g.moveTo(mx - 0.1 * R, my); g.quadraticCurveTo(mx, my + 0.05 * R, mx + 0.1 * R, my); g.stroke(); }
      else if (e === 1) { g.fillStyle = "#6a1a2c"; g.beginPath(); g.ellipse(mx, my + 0.02 * R, 0.08 * R, 0.12 * R, 0, 0, 7); g.fill(); }
      else if (e === 3) { g.beginPath(); g.moveTo(mx - 0.14 * R, my + 0.04 * R); for (let i = 1; i <= 4; i++) g.lineTo(mx - 0.14 * R + i * 0.07 * R, my + (i % 2 ? -0.03 : 0.04) * R); g.stroke(); }
      else { g.fillStyle = "#6a1a2c"; g.beginPath(); g.moveTo(mx - 0.16 * R, my - 0.03 * R); g.quadraticCurveTo(mx, my + 0.26 * R, mx + 0.16 * R, my - 0.03 * R); g.closePath(); g.fill(); }
    }, TB);

    // ---- 6) 葉の翼(手前) ----
    wing(0, false);

    // ---- 7) 小包: 1.3R の箱(体の下から短いひもで吊る)。ひもの向きに箱が傾く ----
    let parcel = null;
    if (!opts.noParcel) {
      const anchor = bp(0.12 * R, 0.92 * R), pc = chain(anchor, p.pAng, [0.26 * R, 0.3 * R], t, { amp: 0.35 * p.swing + 0.06, w: 5.5, lag: 0.9, ph: 0.4 }), b0 = pc[2];
      const bang = Math.atan2(pc[2][1] - pc[1][1], pc[2][0] - pc[1][0]) - Math.PI / 2, bw = 1.3 * R;
      local((g) => { g.strokeStyle = INK; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(pc[0][0], pc[0][1]); g.lineTo(pc[1][0], pc[1][1]); g.lineTo(pc[2][0], pc[2][1]); g.stroke(); g.strokeStyle = css("#e0c89a"); g.lineWidth = 3.5; g.stroke(); });
      const BT = (g) => { T(g); g.translate(b0[0], b0[1]); g.rotate(bang); };
      const boxP = (g) => g.roundRect(-bw / 2, 0, bw, bw * 0.86, 8);
      outline(boxP, BT, 7);
      part(boxP, { base: css("#b07a4a"), hiCol: css("#f0bf8a"), hi: 6 * s, hiA: 0.9, shCol: css("#3a2018"), sh: 10 * s, shA: 0.9 }, BT);
      local((g) => {
        // 蓋の線・ひも(朱)・窓(琥珀)・札
        g.strokeStyle = "rgba(58,32,24,0.7)"; g.lineWidth = 3; g.beginPath(); g.moveTo(-bw / 2 + 4, bw * 0.2); g.lineTo(bw / 2 - 4, bw * 0.2); g.stroke();
        g.strokeStyle = css("#d4473a"); g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, bw * 0.86); g.moveTo(-bw / 2, bw * 0.5); g.lineTo(bw / 2, bw * 0.5); g.stroke();
        g.fillStyle = css("#d4473a"); g.beginPath(); g.ellipse(-7, -4, 9, 6, -0.5, 0, 7); g.ellipse(7, -4, 9, 6, 0.5, 0, 7); g.fill();
        const wl = 0.4 + 0.6 * clamp(gl);
        g.fillStyle = css(mix("#5a3018", W.C.amberHot, wl)); g.fillRect(bw * 0.12, bw * 0.56, bw * 0.24, bw * 0.2);
        g.fillStyle = css("#f4ead2"); g.save(); g.translate(-bw * 0.32, bw * 0.62); g.rotate(-0.25); g.fillRect(-8, -6, 16, 12); g.restore();
        const cr = opts.crack || 0;
        if (cr > 0) { g.strokeStyle = `rgba(230,250,255,${0.9 * Math.min(1, cr * 1.5)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(-bw * 0.45, bw * 0.08); g.lineTo(-bw * 0.15, bw * 0.3); g.lineTo(-bw * 0.28, bw * 0.48); g.lineTo(bw * 0.05, bw * 0.7); g.moveTo(-bw * 0.15, bw * 0.3); g.lineTo(bw * 0.1, bw * 0.22); g.stroke(); g.strokeStyle = "rgba(20,10,20,0.8)"; g.lineWidth = 1.5; g.stroke(); }
      }, BT);
      const pq = wp(b0[0], b0[1] + bw * 0.4); parcel = pq;
      glow(ctx, pq[0] + 6 * s, pq[1] + 10 * s, 70 * s, W.C.amber, 0.22 * clamp(gl));
    }
    // ---- 8) 光(効果) ----
    glow(ctx, center[0], center[1], 230 * s * gl, W.C.amber, 0.28 * Math.min(1.3, gl)); glow(ctx, center[0], center[1], 80 * s * gl, "#fff6dc", 0.32 * Math.min(1.3, gl));
    return { wp, center, parcel, tail: trS };
  }
  return { draw, poseMix, POSES, chain, R };
})();
