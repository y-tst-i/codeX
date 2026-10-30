// 主役: 配達人ミオ(空板に乗り、背中に灯りの荷物)。world.js の後に読む。
// 原点=空板の中心、右向き。単位は「高さ約 300 の人物」。drawCourier(ctx, x, y, scale, rot, pose)。
// 変えてはいけない物(キャラの見た目のガードレール): 長い朱のマフラー/背中の四角い灯り箱(琥珀の窓)/
//   額の飛行ゴーグル/象牙色の空板と下の琥珀のひれ。髪は濃紺、上着は深い青緑。
// 光: 月(右上、冷たい白青)が主光。背中の灯りが左から暖かいリム。空板の下から琥珀の照り返し。
const COURIER = (() => {
  const P = PAINT, W = WORLD, { css, mix, lerp, clamp, shade, glow, spline } = P;
  const K = { skin: "#f0c6a4", skinSh: "#b86f62", hair: "#1c2a46", hairHi: "#4f6f9c", coat: "#1f5a66", coatSh: "#0f2c3c", coatHi: "#5fa3a6",
    pants: "#2b2a40", pantsSh: "#14131f", boot: "#4a2f2a", bootHi: "#9a6a52", scarf: "#d4473a", scarfSh: "#7a1f2c", scarfHi: "#ff9a6a",
    board: "#efe3c8", boardSh: "#8b7f78", boardHi: "#fffaf0", brass: "#c98b3a", box: "#6b4a34", boxSh: "#2e1d18", boxHi: "#c0875a", goggle: "#8a5a2c", lens: "#9fe3ff", strap: "#3a2a26" };

  const def = { lean: 0.45, crouch: 0.55, armF: 0, armB: 0, scarfT: 0, scarfLen: 1, look: 0, finsGlow: 1, lampGlow: 1, wake: 1 };

  // 関節の位置(ポーズから計算。ローカル座標)
  function joints(p) {
    const c = p.crouch, ln = p.lean;
    const hip = [-8 - 6 * c, -150 + 50 * c];
    const ft = [62, -14], bt = [-62, -14];
    const kneeF = [hip[0] + 62 + 10 * c, hip[1] + 55 - 10 * c], kneeB = [hip[0] - 18, hip[1] + 70 - 5 * c];
    const tor = 100, sh = [hip[0] + Math.sin(ln) * tor, hip[1] - Math.cos(ln) * tor];
    const neck = [sh[0] + Math.sin(ln) * 16, sh[1] - Math.cos(ln) * 16];
    const head = [neck[0] + 16 + 6 * Math.sin(ln), neck[1] - 20];
    const elbF = [sh[0] + 48 + 14 * p.armF, sh[1] + 26 - 30 * p.armF], handF = [elbF[0] + 50 + 10 * p.armF, elbF[1] + 18 - 40 * p.armF];
    const elbB = [sh[0] - 52 - 10 * p.armB, sh[1] + 8 - 20 * p.armB], handB = [elbB[0] - 58, elbB[1] - 22 - 30 * p.armB];
    return { hip, ft, bt, kneeF, kneeB, sh, neck, head, elbF, handF, elbB, handB };
  }
  // 太さの変わる手足(ローカル座標の点列+太さの関数)
  const limb = (g, pts, wf) => { const s = P.sampleSpline(pts, 10); P.ribbonPath(g, s, wf); };

  function drawCourier(ctx, x, y, s = 1, rot = 0, pose = {}) {
    const p = Object.assign({}, def, pose), J = joints(p);
    const L = rotV([0.62, -0.78], -rot), rimL = rotV([-1, 0.15], -rot), boxR = 380 * s;
    const box = [x - boxR * 1.3, y - boxR, boxR * 2.4, boxR * 1.35];
    const T = (g) => { g.translate(x, y); g.rotate(rot); g.scale(s, s); };
    const part = (fn, o) => shade(ctx, (g) => { g.save(); T(g); g.beginPath(); fn(g); g.restore(); }, Object.assign({ box, L, rimL, blur: 2.5 * s, silColor: "#0d0d0d" }, o));
    const amberRim = { rimCol: css(mix(W.C.amber, "#ffffff", 0.15)), rim: 5 * s, rimA: 0.9 * p.lampGlow };
    const moonHi = (col, k = 1) => ({ hiCol: col, hi: 7 * s * k, hiA: 0.85 });
    const shadow = (col, k = 1) => ({ shCol: col, sh: 16 * s * k, shA: 0.9 });

    // 0) 空板の下の光の航跡(fx)
    // 1) マフラー(後ろへ長くたなびく)
    const nk = J.neck, sc = scarfPts(p, nk);
    part((g) => P.ribbonPath(g, P.sampleSpline(sc, 14), (u) => lerp(26, 8, u) * (1 + 0.25 * Math.sin(u * 14 - p.scarfT * 10))), { base: css(K.scarf), ...moonHi(css(K.scarfHi)), ...shadow(css(K.scarfSh), 0.8), ...amberRim, rim: 3 * s });
    const sc2 = scarfPts(Object.assign({}, p, { scarfLen: p.scarfLen * 0.62, scarfT: p.scarfT + 0.35 }), [nk[0], nk[1] + 14]);
    part((g) => P.ribbonPath(g, P.sampleSpline(sc2, 14), (u) => lerp(18, 6, u)), { base: css(mix(K.scarf, K.scarfSh, 0.3)), ...moonHi(css(K.scarfHi), 0.6), ...shadow(css(K.scarfSh), 0.6), ...amberRim, rim: 2 * s });
    // 2) 後ろの腕
    part((g) => limb(g, [[J.sh[0] - 6, J.sh[1] + 6], J.elbB, J.handB], (u) => lerp(26, 17, u)), { base: css(mix(K.coat, K.coatSh, 0.35)), ...moonHi(css(K.coatHi), 0.6), ...shadow(css(K.coatSh)), ...amberRim });
    part((g) => { g.arc(J.handB[0], J.handB[1], 11, 0, 7); }, { base: css(K.strap), ...moonHi(css("#8a6a5a"), 0.4), ...shadow("#120b0a", 0.5) });
    // 3) 後ろの脚
    part((g) => limb(g, [J.hip, J.kneeB, [J.bt[0] + 6, J.bt[1] - 10]], (u) => lerp(40, 24, u)), { base: css(mix(K.pants, K.pantsSh, 0.4)), ...moonHi(css("#5a5878"), 0.5), ...shadow(css(K.pantsSh)), ...amberRim, rim: 3 * s });
    part((g) => boot(g, J.bt, -1), { base: css(mix(K.boot, "#000", 0.25)), ...moonHi(css(K.bootHi), 0.5), ...shadow("#1a0f0c", 0.6) });
    // 4) 空板(象牙色、真鍮の縁、下に琥珀のひれ)
    part((g) => boardPath(g), { base: (g) => { const gr = g.createLinearGradient(0, y - 30 * s, 0, y + 20 * s); gr.addColorStop(0, K.boardHi); gr.addColorStop(0.5, K.board); gr.addColorStop(1, K.boardSh); return gr; }, ...moonHi("#ffffff", 0.6), ...shadow(css("#5a4e58"), 0.6), rimCol: css(W.C.amber), rim: 4 * s, rimL: rotV([0, 1], -rot), rimA: 0.9 * p.finsGlow });
    part((g) => { g.moveTo(-150, -6); g.bezierCurveTo(-60, -2, 60, -2, 160, -10); g.lineTo(158, -4); g.bezierCurveTo(60, 4, -60, 4, -150, 0); g.closePath(); }, { base: css(K.brass), ...moonHi("#ffe2a0", 0.4), ...shadow("#5a3612", 0.3) });
    part((g) => { for (const fx of [-95, 70]) { g.moveTo(fx - 26, 5); g.lineTo(fx + 14, 5); g.quadraticCurveTo(fx - 4, 12, fx - 22, 24); g.quadraticCurveTo(fx - 22, 12, fx - 26, 5); g.closePath(); } }, { base: css(W.C.amber), silColor: "#0d0d0d", hiCol: css(W.C.amberHot), hi: 6 * s, hiA: 1 });
    // 5) 背中の灯り箱(荷物)。窓が光り、周りを照らす
    const bx = J.sh[0] - 50 - 6 * Math.sin(p.lean), by = J.sh[1] + 2, ang = p.lean * 0.9;
    part((g) => roundRectRot(g, bx, by, 66, 84, 12, ang), { base: css(K.box), ...moonHi(css(K.boxHi), 0.8), ...shadow(css(K.boxSh)), rimCol: css(W.C.amberHot), rim: 3 * s, rimA: 0.7 });
    part((g) => roundRectRot(g, bx - 4, by + 4, 36, 46, 8, ang), { base: (g) => { const gr = g.createRadialGradient(x + (bx - 4) * s, y + (by + 4) * s, 0, x + (bx - 4) * s, y + (by + 4) * s, 30 * s); gr.addColorStop(0, "#fffbe8"); gr.addColorStop(0.5, css(W.C.amber)); gr.addColorStop(1, css(W.C.amberDeep)); return gr; }, silColor: "#0d0d0d" });
    // 窓の格子
    if (!P.mode.sil) { ctx.save(); T(ctx); ctx.translate(bx - 4, by + 4); ctx.rotate(ang); ctx.strokeStyle = css(K.boxSh, 0.85); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -23); ctx.lineTo(0, 23); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke(); ctx.restore(); }
    // 6) 胴(上着)
    part((g) => torsoPath(g, J, p), { base: css(K.coat), ...moonHi(css(K.coatHi)), ...shadow(css(K.coatSh), 1.2), ...amberRim, rim: 2.5 * s });
    // 肩ひも
    if (!P.mode.sil) { ctx.save(); T(ctx); ctx.strokeStyle = css(K.strap); ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(J.sh[0] - 4, J.sh[1] - 2); ctx.quadraticCurveTo(J.sh[0] + 14, J.sh[1] + 40, J.hip[0] + 8, J.hip[1] - 18); ctx.stroke(); ctx.restore(); }
    // 7) 前の脚
    part((g) => limb(g, [J.hip, J.kneeF, [J.ft[0] - 4, J.ft[1] - 10]], (u) => lerp(44, 24, u)), { base: css(K.pants), ...moonHi(css("#6a6890")), ...shadow(css(K.pantsSh)) });
    part((g) => boot(g, J.ft, 1), { base: css(K.boot), ...moonHi(css(K.bootHi), 0.6), ...shadow("#1a0f0c", 0.6) });
    // 8) 頭(髪・顔・ゴーグル)
    headParts(part, J, p, s, ctx, T);
    // 9) 前の腕(前へ伸ばす)
    part((g) => limb(g, [[J.sh[0] + 4, J.sh[1] + 4], J.elbF, J.handF], (u) => lerp(28, 18, u)), { base: css(K.coat), ...moonHi(css(K.coatHi)), ...shadow(css(K.coatSh)), ...amberRim, rim: 2 * s });
    part((g) => { g.ellipse(J.handF[0] + 4, J.handF[1], 13, 11, 0.3, 0, 7); }, { base: css(K.strap), ...moonHi("#9a7a6a", 0.5), ...shadow("#120b0a", 0.5) });
    // 10) マフラーの結び目(首元)
    part((g) => { g.ellipse(nk[0] + 2, nk[1] + 2, 22, 14, 0.5, 0, 7); }, { base: css(K.scarf), ...moonHi(css(K.scarfHi), 0.7), ...shadow(css(K.scarfSh), 0.5) });

    // 光(fx): 灯り箱の光・ひれの光・ゴーグルのきらめき
    const wp = (lx, ly) => { const c = Math.cos(rot), sn = Math.sin(rot); return [x + (lx * c - ly * sn) * s, y + (lx * sn + ly * c) * s]; };
    const lamp = wp(bx - 4, by + 4);
    glow(ctx, lamp[0], lamp[1], 230 * s * p.lampGlow, W.C.amber, 0.38);
    glow(ctx, lamp[0], lamp[1], 60 * s * p.lampGlow, "#fff3d0", 0.6);
    for (const fx of [-95, 70]) { const q = wp(fx - 12, 14); glow(ctx, q[0], q[1], 70 * s * p.finsGlow, W.C.amber, 0.4); }
    return { J, lamp, wp, scarfTip: wp(sc[sc.length - 1][0], sc[sc.length - 1][1]), board: [wp(-150, 0), wp(160, 0)] };
  }

  function rotV(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; }
  function scarfPts(p, nk) {
    const out = [[nk[0] + 6, nk[1] + 4]], n = 7, len = 330 * p.scarfLen;
    for (let i = 1; i <= n; i++) { const u = i / n; out.push([nk[0] - len * u, nk[1] + 10 - 40 * u + Math.sin(u * 5.5 - p.scarfT * 9) * 26 * u]); }
    return out;
  }
  function boardPath(g) { g.moveTo(-160, -4); g.bezierCurveTo(-170, -16, -150, -24, -120, -22); g.bezierCurveTo(-20, -26, 80, -26, 150, -30); g.bezierCurveTo(185, -32, 192, -18, 170, -8); g.bezierCurveTo(100, 8, -60, 10, -140, 8); g.bezierCurveTo(-155, 7, -162, 2, -160, -4); g.closePath(); }
  function boot(g, f, dir) { const x = f[0], y = f[1]; g.moveTo(x - 20, y - 26); g.lineTo(x + 10, y - 28); g.quadraticCurveTo(x + 18 + 10 * dir, y - 14, x + 30, y - 10); g.quadraticCurveTo(x + 34, y, x + 22, y + 2); g.lineTo(x - 26, y + 2); g.quadraticCurveTo(x - 30, y - 14, x - 20, y - 26); g.closePath(); }
  function roundRectRot(g, cx, cy, w, h, r, a) { g.save(); g.translate(cx, cy); g.rotate(a); g.roundRect(-w / 2, -h / 2, w, h, r); g.restore(); }
  function torsoPath(g, J, p) {
    const h = J.hip, s = J.sh, ln = p.lean, nx = Math.cos(ln), ny = Math.sin(ln);
    // 背中側(左)と胸側(右)の輪郭。腰はベルトで締まる
    g.moveTo(h[0] - 30 * nx, h[1] - 30 * ny + 6);
    g.bezierCurveTo(h[0] - 38 * nx - 20 * ny, h[1] - 10, s[0] - 40 * nx, s[1] + 20, s[0] - 22 * nx, s[1] - 10);
    g.quadraticCurveTo(s[0], s[1] - 22, s[0] + 26 * nx, s[1] + 2);
    g.bezierCurveTo(s[0] + 40 * nx, s[1] + 34, h[0] + 34 * nx + 12, h[1] - 30, h[0] + 30 * nx, h[1] + 10);
    g.quadraticCurveTo(h[0], h[1] + 26, h[0] - 30 * nx, h[1] - 30 * ny + 6);
    g.closePath();
  }
  function headParts(part, J, p, s, ctx, T) {
    const [hx, hy] = J.head, R = 34;
    // 後ろ髪(風でなびく房)
    part((g) => { g.moveTo(hx - 6, hy - 34); g.bezierCurveTo(hx - 40, hy - 40, hx - 70, hy - 30, hx - 98, hy - 22); g.lineTo(hx - 74, hy - 12); g.lineTo(hx - 102, hy - 2); g.lineTo(hx - 70, hy + 2); g.lineTo(hx - 88, hy + 16); g.bezierCurveTo(hx - 60, hy + 14, hx - 40, hy + 16, hx - 22, hy + 22); g.closePath(); }, { base: css(K.hair), hiCol: css(K.hairHi), hi: 6 * s, hiA: 0.9, shCol: "#0b1222", sh: 10 * s, shA: 0.8, rimCol: css(W.C.amber), rim: 4 * s, rimA: 0.9 });
    // 首
    part((g) => { g.moveTo(J.neck[0] - 9, J.neck[1] + 10); g.lineTo(hx - 6, hy + 18); g.lineTo(hx + 8, hy + 20); g.lineTo(J.neck[0] + 10, J.neck[1] + 10); g.closePath(); }, { base: css(K.skin), shCol: css(K.skinSh), sh: 8 * s, shA: 0.9, hiCol: "#ffe6cf", hi: 2 * s, hiA: 0.5 });
    // 顔(横顔。鼻とあごの線)
    part((g) => { g.moveTo(hx - 22, hy - 18); g.bezierCurveTo(hx - 6, hy - 34, hx + 26, hy - 30, hx + 32, hy - 10); g.lineTo(hx + 42, hy + 2); g.lineTo(hx + 33, hy + 6); g.quadraticCurveTo(hx + 34, hy + 16, hx + 26, hy + 20); g.quadraticCurveTo(hx + 10, hy + 32, hx - 8, hy + 24); g.quadraticCurveTo(hx - 26, hy + 10, hx - 22, hy - 18); g.closePath(); }, { base: css(K.skin), hiCol: "#fff0e0", hi: 6 * s, hiA: 0.8, shCol: css(K.skinSh), sh: 12 * s, shA: 0.8, rimCol: css(W.C.amber), rim: 3 * s, rimA: 0.8 });
    // 前髪と帽子(飛行帽)。耳当て付き
    part((g) => { g.moveTo(hx - 34, hy + 4); g.bezierCurveTo(hx - 40, hy - 36, hx - 4, hy - 52, hx + 26, hy - 36); g.quadraticCurveTo(hx + 36, hy - 28, hx + 34, hy - 16); g.quadraticCurveTo(hx + 18, hy - 22, hx + 10, hy - 10); g.quadraticCurveTo(hx + 4, hy - 18, hx - 6, hy - 12); g.quadraticCurveTo(hx - 8, hy + 2, hx - 18, hy + 12); g.closePath(); }, { base: css(K.hair), hiCol: css(K.hairHi), hi: 7 * s, hiA: 0.9, shCol: "#0b1222", sh: 9 * s, shA: 0.8, rimCol: css(W.C.amber), rim: 4 * s, rimA: 0.9 });
    part((g) => { g.ellipse(hx - 14, hy + 2, 13, 17, 0.2, 0, 7); }, { base: css("#5b3a2c"), hiCol: "#a0705a", hi: 4 * s, hiA: 0.8, shCol: "#20120e", sh: 6 * s, shA: 0.8, rimCol: css(W.C.amber), rim: 3 * s, rimA: 0.9 });
    // ゴーグル(額)。帯+レンズ
    part((g) => { g.moveTo(hx - 30, hy - 26); g.quadraticCurveTo(hx, hy - 44, hx + 26, hy - 34); g.lineTo(hx + 27, hy - 26); g.quadraticCurveTo(hx, hy - 36, hx - 28, hy - 18); g.closePath(); }, { base: css(K.strap), hiCol: "#7a5a4a", hi: 2 * s, hiA: 0.8 });
    part((g) => { g.ellipse(hx + 14, hy - 33, 13, 10, -0.3, 0, 7); }, { base: css(K.goggle), hiCol: "#e8b070", hi: 4 * s, hiA: 0.9, shCol: "#3a200e", sh: 5 * s, shA: 0.8 });
    part((g) => { g.ellipse(hx + 15, hy - 33, 8, 6, -0.3, 0, 7); }, { base: (g) => { const gr = g.createLinearGradient(0, 0, 0, 1); return css(K.lens); }, hiCol: "#ffffff", hi: 3 * s, hiA: 1, shCol: "#2a6a8a", sh: 4 * s, shA: 0.9 });
    if (P.mode.sil) return;
    // 目(横顔の目: 黒目+光)と眉、頬
    ctx.save(); T(ctx);
    ctx.fillStyle = "#1a1626"; ctx.beginPath(); ctx.ellipse(hx + 17, hy - 4, 4.2, 6.5, 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(hx + 18.5, hy - 6.5, 1.6, 0, 7); ctx.fill();
    ctx.strokeStyle = "#1a1626"; ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(hx + 11, hy - 13); ctx.quadraticCurveTo(hx + 18, hy - 17, hx + 25, hy - 14); ctx.stroke();
    ctx.strokeStyle = "#1a1626"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(hx + 22, hy + 13); ctx.lineTo(hx + 29, hy + 12); ctx.stroke();
    ctx.fillStyle = "rgba(230,110,110,0.35)"; ctx.beginPath(); ctx.ellipse(hx + 12, hy + 7, 7, 4, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  return { drawCourier, joints, K, def };
})();
