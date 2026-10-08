// 2.5D パペット(横向きの人型キャラ)。関節で動かし、ポーズをブレンドする。scene-lib.js の後に埋め込む(new_scene.sh <dir> <秒> <背景> --puppet)。
// 角度はラジアン。腕・脚は「真下=0、向いている方向へ振り上げる=+」。facing=-1 で左右反転。
// 使い方:
//   const P = PUPPET.make({ skin:"#f2c9a0", cloth:"#3a5fbf", hair:"#2b2118", ink:"#1b1520" });
//   const pose = PUPPET.poseAt(keys, t, 1);          // keys=[{t:0, x:300, y:800, ...}, {t:1, armR:[1.2,0.4], ease:"back"}]
//   P.draw(ctx, pose, t);                             // 描く(足元が y に来るように y=足元)
//   PUPPET.walk(phase) / PUPPET.run(phase)            // 歩き・走りの脚/腕/上下動のポーズ(phase=歩数×2π)
// 演技の原則(予備動作→動作→余韻、オーバーラップ)は references/character-acting.md。
const PUPPET = (() => {
  const { lerp, clamp, smooth } = SCENE_LIB;
  const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
  const jit = (key, t, amp) => (hash(key * 13.7 + Math.floor(t * 12) * 7.31) - 0.5) * 2 * amp;          // 12fps で揺らぐ線(ボイリング)
  const DEF = { x: 960, y: 900, s: 1, facing: 1, lean: 0, squash: 0, torso: 0, head: 0, bob: 0,
    armN: [0.15, 0.25], armF: [-0.15, 0.25], legN: [0.08, 0.1], legF: [-0.08, 0.1],
    eye: "normal", mouth: "smile", brow: 0, look: [0.3, 0], blink: 0, lift: 0 };
  const EASE = { inout: (u) => smooth(u), out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u,
    back: (u) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },   // 行き過ぎて戻る(余韻)
    lin: (u) => u, hold: (u) => (u < 1 ? 0 : 1) };
  // part ごとの遅れ(秒)。overlap=1 で体の各部が少しずつ遅れて動く(全部同時に動かさない)
  const DELAY = { torso: 0, lean: 0, squash: 0, x: 0, y: 0, s: 0, lift: 0, bob: 0, legN: 0, legF: 0.01, armN: 0.04, armF: 0.06, head: 0.05, look: -0.04, brow: 0.03, eye: 0, mouth: 0.02, blink: 0, facing: 0 };
  const mixv = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : typeof a === "number" ? lerp(a, b, k) : (k < 0.5 ? a : b));
  function poseAt(keys, t, overlap = 1) {
    const out = {};
    for (const p of Object.keys(DEF)) {
      const tt = t - (DELAY[p] || 0) * overlap;
      let prev = null, next = null, val = DEF[p], ease = "inout";
      for (const k of keys) { if (k[p] === undefined) continue; if (k.t <= tt) { prev = k; } else if (!next) { next = k; } }
      if (prev) val = prev[p];
      if (prev && next) { const u = clamp((tt - prev.t) / (next.t - prev.t)); const e = EASE[next.ease || "inout"] || EASE.inout; val = mixv(prev[p], next[p], e(u)); }
      else if (!prev && next) val = next[p];
      out[p] = val;
    }
    return out;
  }
  const walk = (ph) => ({ legN: [Math.sin(ph) * 0.65, Math.max(0, Math.sin(ph + 1.2)) * 0.9], legF: [-Math.sin(ph) * 0.65, Math.max(0, -Math.sin(ph + 1.2)) * 0.9],
    armN: [-Math.sin(ph) * 0.5, 0.3], armF: [Math.sin(ph) * 0.5, 0.3], bob: Math.abs(Math.cos(ph)) * 10, lean: 0.04 });
  const run = (ph) => ({ legN: [Math.sin(ph) * 1.0, Math.max(0, Math.sin(ph + 1.0)) * 1.5], legF: [-Math.sin(ph) * 1.0, Math.max(0, -Math.sin(ph + 1.0)) * 1.5],
    armN: [-Math.sin(ph) * 0.9, 1.1], armF: [Math.sin(ph) * 0.9, 1.1], bob: Math.abs(Math.cos(ph)) * 22, lean: 0.22 });

  function make(c = {}) {
    const C = Object.assign({ skin: "#f2c9a0", cloth: "#3a5fbf", pants: "#2a2f4a", hair: "#2b2118", ink: "#1b1520", rim: "rgba(255,200,150,0.55)", u: 1, boil: 1.2, outline: 4, shadow: "rgba(0,0,0,0.28)" }, c);
    const L = { thigh: 86, shin: 84, torso: 130, neck: 12, head: 52, upper: 64, fore: 62, w: 22 };
    const seg = (ctx, pts, w, col, ink, t, key) => {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const P = pts.map((p, i) => [p[0] + jit(key + i, t, C.boil), p[1] + jit(key + i + 50, t, C.boil)]);
      ctx.strokeStyle = ink; ctx.lineWidth = w + C.outline * 2; ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    };
    function draw(ctx, pose, t = 0) {
      const p = Object.assign({}, DEF, pose), f = p.facing, S = C.u * p.s, sq = clamp(p.squash, -0.4, 0.4);
      const dir = (a) => [Math.sin(a) * f, Math.cos(a)];                       // 角度→方向(真下=0, 前=+)
      const sx = 1 + sq, sy = 1 - sq;
      ctx.save(); ctx.translate(p.x, p.y - p.lift); ctx.scale(sx, sy); ctx.scale(S, S);
      // 足元が (0,0) になるよう、骨盤の高さ = 脚の長さ(膝を曲げたら下がる)
      const legH = (leg) => L.thigh * Math.cos(leg[0]) + L.shin * Math.cos(leg[0] - leg[1]);
      const pelvisH = Math.max(legH(p.legN), legH(p.legF)) + (p.bob || 0);
      const hip = [0, -pelvisH];
      // 影
      ctx.fillStyle = C.shadow; ctx.beginPath(); ctx.ellipse(0, 2, 70 * (1 + p.lift / 400), 14, 0, 0, 7); ctx.fill();
      const limb = (root, a0, a1, l1, l2, w, col, key, sleeve) => {
        const d1 = dir(a0), e = [root[0] + d1[0] * l1, root[1] + d1[1] * l1], d2 = dir(a0 + (a1 || 0));
        const k = [e[0] + d2[0] * l2, e[1] + d2[1] * l2];
        seg(ctx, [e, k], w - 2, col, C.ink, t, key + 1);                      // 前腕(肌)
        seg(ctx, [root, e], w + 4, sleeve || C.cloth, C.ink, t, key);          // 上腕(袖)
        ctx.fillStyle = col; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k[0], k[1], w * 0.62, 0, 7); ctx.fill(); ctx.stroke();   // 手
        return k;
      };
      const legPts = (leg, col, key) => { const d1 = dir(leg[0]), kn = [hip[0] + d1[0] * L.thigh, hip[1] + d1[1] * L.thigh], d2 = dir(leg[0] - leg[1]), an = [kn[0] + d2[0] * L.shin, kn[1] + d2[1] * L.shin];
        seg(ctx, [hip, kn, an], 26, col, C.ink, t, key); ctx.fillStyle = shade(C.ink, 0.1); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(an[0] + f * 12, an[1] - 4, 24, 12, 0, 0, 7); ctx.fill(); ctx.stroke(); };
      // 胴体の向き(lean は前傾)
      const tl = p.lean + p.torso, up = [Math.sin(tl) * f, -Math.cos(tl)];
      const neck = [hip[0] + up[0] * L.torso, hip[1] + up[1] * L.torso];
      const shoulder = [hip[0] + up[0] * (L.torso - 14), hip[1] + up[1] * (L.torso - 14)];
      // 奥側 → 手前側
      legPts(p.legF, C.pants, 1);
      limb(shoulder, p.armF[0], p.armF[1], L.upper, L.fore, 22, C.skin, 20, shade(C.cloth, -0.3));
      // 胴体
      const nx = Math.cos(tl) * f, ny = Math.sin(tl);                           // 胴体の横方向
      const tw = 44, bw = 38;
      const q = [[hip[0] - nx * bw, hip[1] - ny * bw], [hip[0] + nx * bw, hip[1] + ny * bw], [neck[0] + nx * tw, neck[1] + ny * tw], [neck[0] - nx * tw, neck[1] - ny * tw]];
      const g = ctx.createLinearGradient(q[0][0], q[0][1], q[1][0], q[1][1]); g.addColorStop(0, C.cloth); g.addColorStop(1, shade(C.cloth, -0.25));
      ctx.lineJoin = "round"; ctx.strokeStyle = C.ink; ctx.lineWidth = C.outline * 2; ctx.fillStyle = g;
      ctx.beginPath(); q.forEach((pt, i) => { const x = pt[0] + jit(30 + i, t, C.boil), y = pt[1] + jit(40 + i, t, C.boil); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.rim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[1][0] - nx * 4, q[1][1] - ny * 4); ctx.lineTo(q[2][0] - nx * 4, q[2][1] - ny * 4); ctx.stroke();   // 光の当たる縁
      legPts(p.legN, shade(C.pants, 0.12), 2);
      // 頭
      const hd = p.head + tl * 0.4, hu = [Math.sin(hd) * f, -Math.cos(hd)];
      const hc = [neck[0] + hu[0] * (L.neck + L.head), neck[1] + hu[1] * (L.neck + L.head)];
      seg(ctx, [neck, [neck[0] + hu[0] * L.neck, neck[1] + hu[1] * L.neck]], 22, C.skin, C.ink, t, 60);
      ctx.fillStyle = C.skin; ctx.strokeStyle = C.ink; ctx.lineWidth = C.outline * 1.6;
      ctx.beginPath(); ctx.ellipse(hc[0] + jit(70, t, C.boil), hc[1] + jit(71, t, C.boil), L.head * 0.92, L.head, hd * f, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.hair; ctx.beginPath(); ctx.ellipse(hc[0] - f * 6, hc[1] - 14, L.head * 0.98, L.head * 0.78, hd * f, Math.PI, 2 * Math.PI); ctx.fill();    // 髪
      face(ctx, hc, hd, f, p, t, C);
      limb(shoulder, p.armN[0], p.armN[1], L.upper, L.fore, 22, shade(C.skin, 0.04), 21, C.cloth);
      ctx.restore();
    }
    return { draw, L, C };
  }
  function face(ctx, hc, hd, f, p, t, C) {
    const ex = hc[0] + f * 16, ey = hc[1] - 4, lk = p.look, bl = p.blink;
    const eye = (x, y, r) => {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      if (p.eye === "closed" || bl > 0.8) { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y); ctx.stroke(); return; }
      const rr = p.eye === "wide" ? r * 1.25 : r; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * (1 - bl * 0.8), 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x + lk[0] * rr * 0.45 * f, y + lk[1] * rr * 0.4, rr * 0.45, 0, 7); ctx.fill();
    };
    eye(ex, ey, 9); eye(ex + f * 22, ey, 8);
    // 眉(brow: -1=困り/心配 ... +1=怒り。眉1本で心配と怒りが入れ替わる)
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    [[ex, 1], [ex + f * 22, -1]].forEach(([x, side], i) => { const a = p.brow * 0.5 * (i ? -1 : 1) * f; ctx.beginPath(); ctx.moveTo(x - 10, ey - 17 + a * 8); ctx.lineTo(x + 10, ey - 17 - a * 8); ctx.stroke(); });
    const mx = hc[0] + f * 13, my = hc[1] + 22;
    ctx.fillStyle = "#7a2a2a"; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
    if (p.mouth === "open") { ctx.beginPath(); ctx.ellipse(mx + f * 4, my, 8, 10, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    else if (p.mouth === "grin") { ctx.beginPath(); ctx.moveTo(mx - 12, my - 4); ctx.quadraticCurveTo(mx, my + 14, mx + 14, my - 4); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (p.mouth === "frown") { ctx.beginPath(); ctx.moveTo(mx - 9, my + 4); ctx.quadraticCurveTo(mx, my - 5, mx + 9, my + 4); ctx.stroke(); }
    else if (p.mouth === "flat") { ctx.beginPath(); ctx.moveTo(mx - 8, my); ctx.lineTo(mx + 8, my); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(mx - 10, my - 2); ctx.quadraticCurveTo(mx, my + 8, mx + 10, my - 2); ctx.stroke(); }
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, f = (c) => Math.round(clamp(c + (k > 0 ? (255 - c) * k : c * k), 0, 255)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
  return { make, poseAt, walk, run, DEF, EASE };
})();
