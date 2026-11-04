// 主役: 灯りの精(光を運ぶ小さな配達役)。人型の手足・頭身は使わない。world.js・paint.js の後に読む。
// 時刻 t と引数だけで決まる(乱数なし・状態なし)。seek-safe。
// 構造(動かす前提):
//   体(P=炎のしずく / Q=提灯)は、位置・回転 rot・つぶし伸ばし (sx, sy) だけで姿勢が決まる。
//   二次運動は chain()(支点・向き・節の長さ・時刻 → 点列の純関数)で出す: 光のリボン(尾)・スカーフの房・荷物の吊り・提灯の房・炎の先。
//   羽ばたきは sin(w*t)。まばたきは t の周期関数(3.2秒に1回)。
//   姿勢は POSES(fly / dodge / offer)を poseMix(a, b, k) で補間する。
// 局所座標: 原点=体の中心、右向き、y は下。単位は s=1 で体の半径 R=48。
// 色の約束: 琥珀=味方の灯り(体の光)、朱=スカーフ/荷物のひも(配達人のしるし)、羽=淡い青緑か淡い桃(光を通す)。
const SPIRIT = (() => {
  const P = PAINT, W = WORLD, { css, mix, lerp, clamp, shade, glow } = P;
  const R = 48, INK = "#0e1226";

  const POSES = {
    fly:   { rot: -0.1,  sx: 1.1,  sy: 0.93, flap: 0.5,  wing: 0.0,  expr: 0, swing: 0.35, pAng: 1.9, glow: 1.0,  tail: 1.0 },
    dodge: { rot: -0.95, sx: 0.84, sy: 1.2,  flap: 0.12, wing: -0.3, expr: 1, swing: 0.9,  pAng: 0.6, glow: 0.9,  tail: 1.25 },
    offer: { rot: 0.14,  sx: 1.04, sy: 1.0,  flap: 0.28, wing: 0.35, expr: 2, swing: 0.12, pAng: 0.18, glow: 1.3, tail: 0.7 },
  };
  const poseMix = (a, b, k) => { const A = typeof a === "string" ? POSES[a] : a, B = typeof b === "string" ? POSES[b] : b, o = {}; for (const key in A) o[key] = lerp(A[key], B[key], k); return o; };
  const rotV = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
  // 二次運動の鎖(courier2 と同じ約束)
  function chain(a, ang0, lens, t, { amp = 0.35, w = 9, lag = 0.7, ph = 0, droop = 0 } = {}) {
    const pts = [a]; let p = a; const n = lens.length;
    for (let i = 0; i < n; i++) { const k = (i + 1) / n, ang = ang0 + amp * Math.sin(w * t - lag * i + ph) * k + droop * k * k; p = [p[0] + Math.cos(ang) * lens[i], p[1] + Math.sin(ang) * lens[i]]; pts.push(p); }
    return pts;
  }

  // draw(ctx, x, y, s, rotExtra, pose, design("P"|"Q"), opts{t, lift, trail})
  function draw(ctx, x, y, s, rotExtra, poseIn, design = "P", opts = {}) {
    const p = typeof poseIn === "string" ? POSES[poseIn] : poseIn, t = opts.t || 0, sil = P.mode.sil, rot = (rotExtra || 0) + p.rot, lift = opts.lift ?? 0.25;
    const L = rotV([0.5, -0.85], -rot), boxR = 330 * s, box = [x - boxR, y - boxR * 0.85, boxR * 2, boxR * 1.7];
    const T = (g) => { g.translate(x, y); g.rotate(rot); g.scale(s, s); };
    const TB = (g) => { g.translate(x, y); g.rotate(rot); g.scale(s * p.sx, s * p.sy); }; // 体だけつぶし・伸ばし
    const wp = (lx, ly) => { const c = Math.cos(rot), sn = Math.sin(rot); return [x + (lx * c - ly * sn) * s, y + (lx * sn + ly * c) * s]; };
    const bp = (lx, ly) => [lx * p.sx, ly * p.sy];
    const part = (fn, o, tf = T) => shade(ctx, (g) => { g.save(); tf(g); g.beginPath(); fn(g); g.restore(); }, Object.assign({ box, L, blur: 2.2 * s, silColor: "#0d0d0d" }, o));
    const local = (fn, tf = T) => { ctx.save(); tf(ctx); fn(ctx); ctx.restore(); };
    const outline = (fn, tf = T, w = 7) => { if (sil) return; local((g) => { g.beginPath(); fn(g); g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.stroke(); }, tf); };
    const gl = p.glow;
    const center = wp(0, 0);

    // ---- 1) 光のリボン(尾): 体の後ろへ。琥珀から透明へ ----
    const ang0 = Math.PI + lift, tailLen = 40 * p.tail;
    const tr = chain(bp(-0.7 * R, 0.15 * R), ang0, [tailLen, tailLen, tailLen, tailLen, tailLen, tailLen * 0.9, tailLen * 0.8], t, { amp: 0.5, w: 8, lag: 0.7, droop: 0.2 });
    const trS = P.sampleSpline(tr.map((q) => wp(q[0], q[1])), 12);
    const trW = (u) => R * s * 1.15 * (1 - u) ** 1.1 * (1 + 0.1 * Math.sin(u * 14 - t * 10));
    if (!sil) {
      P.bloom(ctx, (g) => { P.ribbonPath(g, trS, (u) => trW(u) * 1.8); g.fillStyle = css(W.C.amberDeep); g.fill(); }, { blur: 30, a: 0.55 });
      P.ribbonPath(ctx, trS, trW); const g1 = ctx.createLinearGradient(trS[0][0], trS[0][1], trS[trS.length - 1][0], trS[trS.length - 1][1]); g1.addColorStop(0, css(W.C.amberHot, 0.95)); g1.addColorStop(0.35, css(W.C.amber, 0.7)); g1.addColorStop(1, css(W.C.amberDeep, 0)); ctx.fillStyle = g1; ctx.fill();
      P.ribbonPath(ctx, trS, (u) => trW(u) * 0.3); ctx.fillStyle = "rgba(255,252,240,0.75)"; ctx.fill();
    } else { P.ribbonPath(ctx, trS, (u) => trW(u) * 0.5); ctx.fillStyle = "#8a8a8a"; ctx.fill(); }

    // ---- 2) 羽(奥)と羽(手前)。葉の形。P=淡い青緑 / Q=淡い桃 ----
    const wingRoot = bp(-0.15 * R, -0.45 * R), wcol = design === "P" ? ["#62cfc4", "#d8fff8", "#1f6f86"] : ["#ff9fa4", "#ffe3de", "#a8374a"];
    const leaf = (g, root, ang, len, wid) => { const f = (u, v) => [root[0] + Math.cos(ang) * u - Math.sin(ang) * v, root[1] + Math.sin(ang) * u + Math.cos(ang) * v]; g.moveTo(...f(0, 0)); g.bezierCurveTo(...f(len * 0.2, -wid * 1.15), ...f(len * 0.8, -wid * 0.95), ...f(len, 0)); g.bezierCurveTo(...f(len * 0.8, wid * 0.75), ...f(len * 0.25, wid * 0.85), ...f(0, 0)); g.closePath(); };
    const flap = (ph) => -2.25 + p.wing + p.flap * Math.sin(14 * t + ph);
    const wLen = (design === "P" ? 2.0 : 1.7) * R, wWid = (design === "P" ? 0.5 : 0.7) * R;
    const wing = (ph, back) => {
      const ang = flap(ph); ctx.save(); ctx.globalAlpha = back ? 0.7 : 0.9;
      outline((g) => leaf(g, wingRoot, ang, wLen, wWid), T, 5);
      part((g) => leaf(g, wingRoot, ang, wLen, wWid), { base: css(mix(wcol[0], "#7aa0c0", back ? 0.35 : 0)), hiCol: css(wcol[1]), hi: 8 * s, hiA: 0.9, shCol: css(wcol[2]), sh: 14 * s, shA: 0.7, rimCol: css(W.C.amber), rim: 3.5 * s, rimA: 0.85 * gl, rimL: rotV([-0.7, 0.4], -rot) });
      ctx.restore();
      if (!sil) local((g) => { g.strokeStyle = css(wcol[2], 0.55); g.lineWidth = 1.6; for (const v of [-0.45, 0, 0.45]) { g.beginPath(); const f = (u, vv) => [wingRoot[0] + Math.cos(ang) * u - Math.sin(ang) * vv, wingRoot[1] + Math.sin(ang) * u + Math.cos(ang) * vv]; g.moveTo(...f(wLen * 0.1, 0)); g.quadraticCurveTo(...f(wLen * 0.55, wWid * v * 1.2), ...f(wLen * 0.9, wWid * v * 0.25)); g.stroke(); } });
    };
    wing(0.9, true);

    // ---- 3) スカーフの房(朱。体の下の結び目から後ろへ2本) ----
    const knot = bp(-0.05 * R, 0.85 * R);
    const sc = [0, 1].map((i) => chain([knot[0] - 4, knot[1] + i * 7], ang0 + 0.5 - i * 0.2, [26, 26, 24, 22, 20], t, { amp: 0.5, w: 9, lag: 0.75, ph: i * 1.0, droop: 0.2 }));
    sc.forEach((pts, i) => part((g) => P.ribbonPath(g, P.sampleSpline(pts, 10), (u) => lerp(i ? 12 : 15, 4, u) * (1 + 0.12 * Math.sin(u * 13 - t * 9))), { base: css("#d4473a"), hiCol: css("#ff9a6a"), hi: 4 * s, hiA: 0.8, shCol: css("#6a1a2c"), sh: 6 * s, shA: 0.9 }));

    // ---- 4) 体 ----
    const flick = Math.sin(t * 11) * 0.12 + Math.sin(t * 17 + 1) * 0.06; // 炎の先のゆらぎ
    let bodyPath;
    if (design === "P") {
      const tx = -0.45 * R + flick * R * 1.2 + (p.expr === 1 ? 0 : 0), ty = -1.85 * R + Math.abs(flick) * R * 0.3;
      bodyPath = (g) => { g.moveTo(tx, ty); g.bezierCurveTo(tx + 0.15 * R, -1.25 * R, R, -0.9 * R, R, 0); g.bezierCurveTo(R, 0.58 * R, 0.55 * R, R, 0, R); g.bezierCurveTo(-0.55 * R, R, -R, 0.58 * R, -R, 0); g.bezierCurveTo(-R, -0.85 * R, tx - 0.2 * R, -1.25 * R, tx, ty); g.closePath(); };
    } else {
      bodyPath = (g) => { g.ellipse(0, 0, 1.08 * R, 0.96 * R, 0, 0, Math.PI * 2); };
    }
    const grad = (g) => { const q = g.createRadialGradient(center[0] + 0.1 * R * s, center[1] - 0.05 * R * s, 2, center[0], center[1], R * s * 1.25); q.addColorStop(0, "#fffdf0"); q.addColorStop(0.35, css(W.C.amberHot)); q.addColorStop(0.75, css(W.C.amber)); q.addColorStop(1, css(W.C.amberDeep)); return q; };
    outline(bodyPath, TB, 8);
    part(bodyPath, { base: grad, hiCol: "#ffffff", hi: 6 * s, hiA: 0.7, shCol: css(W.C.amberDeep), sh: 12 * s, shA: 0.8, silColor: "#0d0d0d" }, TB);
    if (design === "Q") { // 提灯: 横のリブ、上下のふた、上の輪、房
      local((g) => { g.strokeStyle = css("#b8601c", 0.45); g.lineWidth = 2.2; for (const v of [-0.62, -0.3, 0, 0.3, 0.62]) { g.beginPath(); const w = Math.sqrt(1 - v * v) * 1.08 * R; g.moveTo(-w, v * 0.96 * R); g.quadraticCurveTo(0, v * 0.96 * R + 0.2 * R * (1 - Math.abs(v)), w, v * 0.96 * R); g.stroke(); } }, TB);
      for (const sgn of [-1, 1]) { const y0 = sgn * 0.93 * R; part((g) => { g.moveTo(-0.55 * R, y0); g.lineTo(0.55 * R, y0); g.lineTo(0.42 * R, y0 + sgn * 0.3 * R); g.lineTo(-0.42 * R, y0 + sgn * 0.3 * R); g.closePath(); }, { base: css("#5a3a28"), hiCol: css("#c98b3a"), hi: 4 * s, hiA: 0.9, shCol: "#1c0f0a", sh: 6 * s, shA: 0.9 }, TB); }
      local((g) => { g.strokeStyle = css("#c98b3a"); g.lineWidth = 4; g.beginPath(); g.arc(0, -1.35 * R, 0.22 * R, 0, 7); g.stroke(); }, TB);
    }
    // ---- 5) 顔(目・まばたき・ほほ・口) ----
    if (!sil) local((g) => {
      const e = Math.round(p.expr), ex = 0.42 * R, ey = -0.08 * R, blink = (((t + 1.3) % 3.2) < 0.1) && e === 0, ink = "#1a1626";
      g.lineCap = "round";
      const eyes = [[ex - 0.34 * R, ey], [ex + 0.34 * R, ey - 0.02 * R]];
      for (const [cx, cy] of eyes) {
        if (e === 2 || blink) { g.strokeStyle = ink; g.lineWidth = 0.1 * R; g.beginPath(); g.arc(cx, cy + 0.06 * R, 0.17 * R, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
        const er = e === 1 ? 1.3 : 1;
        g.fillStyle = ink; g.beginPath(); g.ellipse(cx, cy, 0.14 * R * er, 0.22 * R * er, 0, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(cx + 0.045 * R, cy - 0.08 * R * er, 0.055 * R, 0, 7); g.fill(); g.beginPath(); g.arc(cx - 0.04 * R, cy + 0.07 * R, 0.028 * R, 0, 7); g.fill();
        if (e === 0) { g.strokeStyle = css("#b8601c"); g.lineWidth = 0.07 * R; g.beginPath(); g.moveTo(cx - 0.2 * R, cy - 0.3 * R); g.lineTo(cx + 0.2 * R, cy - 0.34 * R); g.stroke(); } // きりっとした眉
      }
      g.fillStyle = "rgba(235,110,100,0.4)"; for (const [cx, cy] of eyes) { g.beginPath(); g.ellipse(cx, cy + 0.32 * R, 0.14 * R, 0.08 * R, 0, 0, 7); g.fill(); }
      const mx = ex, my = 0.42 * R; g.strokeStyle = ink; g.lineWidth = 0.06 * R;
      if (e === 0) { g.beginPath(); g.moveTo(mx - 0.1 * R, my); g.quadraticCurveTo(mx, my + 0.05 * R, mx + 0.1 * R, my); g.stroke(); }
      else if (e === 1) { g.fillStyle = "#6a1a2c"; g.beginPath(); g.ellipse(mx, my + 0.02 * R, 0.08 * R, 0.12 * R, 0, 0, 7); g.fill(); }
      else { g.fillStyle = "#6a1a2c"; g.beginPath(); g.moveTo(mx - 0.16 * R, my - 0.03 * R); g.quadraticCurveTo(mx, my + 0.26 * R, mx + 0.16 * R, my - 0.03 * R); g.closePath(); g.fill(); }
    }, TB);
    // ---- 6) 手前の羽 ----
    wing(0, false);
    // ---- 7) 荷物: 体の下から吊る(offer では前へ差し出す)。P=箱 / Q=ふろしき包み ----
    const anchor = bp(0.15 * R, 0.9 * R), pc = chain(anchor, p.pAng, [0.42 * R, 0.42 * R], t, { amp: 0.4 * p.swing + 0.08, w: 5.5, lag: 0.9, ph: 0.4, droop: 0 }), box0 = pc[2];
    local((g) => { g.strokeStyle = sil ? "#0d0d0d" : css("#d4473a"); g.lineWidth = sil ? 5 : 3; g.lineCap = "round"; g.beginPath(); g.moveTo(pc[0][0], pc[0][1]); g.lineTo(pc[1][0], pc[1][1]); g.lineTo(pc[2][0], pc[2][1]); g.stroke(); });
    const bw = 0.56 * R;
    if (design === "P") {
      outline((g) => g.roundRect(box0[0] - bw / 2, box0[1] - bw / 2, bw, bw, 7), T, 6);
      part((g) => g.roundRect(box0[0] - bw / 2, box0[1] - bw / 2, bw, bw, 7), { base: css("#9a6a44"), hiCol: css("#e0a577"), hi: 5 * s, hiA: 0.85, shCol: css("#3a2018"), sh: 8 * s, shA: 0.9 });
      part((g) => g.roundRect(box0[0] - bw * 0.22, box0[1] - bw * 0.2, bw * 0.44, bw * 0.4, 4), { base: css(W.C.amberHot), silColor: "#0d0d0d" });
      local((g) => { if (sil) return; g.strokeStyle = css("#d4473a"); g.lineWidth = 3.2; g.beginPath(); g.moveTo(box0[0] - bw / 2, box0[1]); g.lineTo(box0[0] + bw / 2, box0[1]); g.moveTo(box0[0], box0[1] - bw / 2); g.lineTo(box0[0], box0[1] + bw / 2); g.stroke(); });
    } else {
      outline((g) => g.arc(box0[0], box0[1], bw * 0.62, 0, 7), T, 6);
      part((g) => { g.arc(box0[0], box0[1], bw * 0.62, 0, 7); g.moveTo(box0[0] - 6, box0[1] - bw * 0.55); g.ellipse(box0[0] - 11, box0[1] - bw * 0.72, 10, 7, -0.6, 0, 7); g.moveTo(box0[0] + 18, box0[1] - bw * 0.55); g.ellipse(box0[0] + 13, box0[1] - bw * 0.74, 10, 7, 0.6, 0, 7); }, { base: css("#d4473a"), hiCol: css("#ff9a6a"), hi: 5 * s, hiA: 0.85, shCol: css("#6a1a2c"), sh: 9 * s, shA: 0.9 });
      local((g) => { if (sil) return; g.fillStyle = "rgba(255,244,214,0.85)"; for (const [dx, dy] of [[-0.18, -0.2], [0.2, -0.05], [-0.05, 0.22], [0.22, 0.22]]) { g.beginPath(); g.arc(box0[0] + dx * bw, box0[1] + dy * bw, bw * 0.07, 0, 7); g.fill(); } });
    }
    // ---- 8) 光(効果) ----
    glow(ctx, center[0], center[1], 230 * s * gl, W.C.amber, 0.3); glow(ctx, center[0], center[1], 80 * s * gl, "#fff6dc", 0.35);
    const bq = wp(box0[0], box0[1]); glow(ctx, bq[0], bq[1], 90 * s, W.C.amber, 0.3);
    return { wp, center, box: bq, tail: trS };
  }
  return { draw, poseMix, POSES, chain };
})();
