// スタイルフレーム2: 中盤の見せ場(S5 の 17.4 秒あたり)。
// 嵐の目のふちを、光の気流で大きく回り込む(スリングショット)。完璧なタイミングの一瞬=ヒットストップのコマ。
// 行動(回り込み)→反応(画面が止まる・白い輪)→結果(PERFECT +800)→HUD(STREAK ×12)
var STILLS = STILLS || {};
STILLS["2"] = function (ctx, t) {
  const P = PAINT, W = WORLD, C = W.C, { css, mix, lerp } = P;
  const eye = [700, 430];
  ctx.save();
  ctx.translate(960, 540); ctx.rotate(0.13); ctx.scale(1.12, 1.12); ctx.translate(-960, -540);
  // 空: 嵐の中は紫紺に沈む
  if (P.mode.sil) { ctx.fillStyle = "#f2f1ee"; ctx.fillRect(-200, -200, 2400, 1500); }
  else { const g = ctx.createRadialGradient(eye[0], eye[1], 50, eye[0], eye[1], 1500); g.addColorStop(0, "#3b3a78"); g.addColorStop(0.3, "#1c1838"); g.addColorStop(1, "#090816"); ctx.fillStyle = g; ctx.fillRect(-200, -200, 2400, 1500); W.stars(ctx, { n: 160, seed: 9, maxY: 1, t }); }
  // 遠くの島(渦に引き寄せられて傾いている。d=0.8)
  P.layer(ctx, (g) => { g.save(); g.translate(1640, 300); g.rotate(-0.3); g.translate(-1640, -300); W.island(g, { seed: 8, cx: 1640, top: 300, w: 260, d: 0.8, skyCol: "#2a2650", lamp: 0.4 }); g.restore(); }, { blur: 1.5 });
  // 渦の腕(雲の帯をらせんに沿って重ねる。内側ほど目の光で明るい)
  const arms = 7, rr = P.mulberry32(17);
  for (let layer = 0; layer < 2; layer++) for (let a = 0; a < arms; a++) {
    // 腕ごとに長さ・ねじれ・始まりの半径を変え、同心円に見えないようにする
    const pts = [], ph = a / arms * Math.PI * 2 + layer * 0.45 + rr() * 0.4, r0 = lerp(60, 260, rr()), r1 = lerp(700, 1250, rr()), turn = lerp(1.6, 2.6, rr());
    for (let k = 0; k <= 12; k++) { const q = k / 12, r = lerp(r0, r1, Math.pow(q, 1.2)), th = ph + q * turn; pts.push([eye[0] + Math.cos(th) * r, eye[1] + Math.sin(th) * r * 0.58 + (P.fbm(q * 3, a, 5, 2) - 0.5) * 80]); }
    const samp = P.sampleSpline(pts, 10), d = layer === 0 ? 0.6 : 0.3;
    const base = layer === 0 ? "#2e2652" : "#231c40";
    P.shade(ctx, (g) => P.ribbonPath(g, samp, (u) => lerp(14, 260, u) * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.6 * (0.55 + 0.45 * P.fbm(u * 6, a, 3, 3))), {
      box: [-300, -300, 2500, 1700], silColor: P.mode.sil ? W.silBg(d) : "#888", L: [0, -1],
      base: (g) => { const gr = g.createRadialGradient(eye[0], eye[1], 40, eye[0], eye[1], 1100); gr.addColorStop(0, "#9aa6e8"); gr.addColorStop(0.25, base); gr.addColorStop(1, "#0d0a1c"); return gr; },
      hiCol: layer === 0 ? "#a99be0" : "#7f74b8", hi: 9, hiA: 0.7, shCol: "#06040e", sh: 40, shA: 0.7, blur: 6, tex: 0.25, texSeed: 7 + a, texScale: 0.015,
    });
  }
  // 目の光(冷たい白青)
  P.glow(ctx, eye[0], eye[1], 340, "#bfe9ff", 0.6); P.glow(ctx, eye[0], eye[1], 90, "#ffffff", 0.9);
  // 渦の中の稲妻
  W.bolt(ctx, eye[0] - 30, eye[1] - 20, eye[0] - 380, eye[1] - 260, { seed: 3, width: 5, branches: 3 });
  W.bolt(ctx, eye[0] + 40, eye[1] + 30, eye[0] + 300, eye[1] + 330, { seed: 8, width: 6, branches: 4 });
  // 光の気流: 渦のふちを大きく回り込む弧
  const streamPts = [[-120, 300], [260, 640], [720, 880], [1160, 900], [1520, 740], [1800, 470], [2000, 180]];
  const samp = W.stream(ctx, streamPts, { width: 50, t, seed: 6, taper: [0.3, 1], dir: 1, sparks: 170 });
  // 配達人: 弧のいちばん外(x 最大の所)。弧の接線に合わせる(ほぼ縦に壁を駆ける)
  let k = 0; while (k < samp.length - 2 && samp[k][0] < 1120) k++;
  const ang = Math.atan2(samp[k + 1][1] - samp[k - 1][1], samp[k + 1][0] - samp[k - 1][0]);
  const at = [samp[k][0], samp[k][1]];
  // ヒットストップの一瞬: 背後に白い輪と放射の線(この1コマだけの演出)
  if (!P.mode.sil && P.mode.fx) {
    W.speedLines(ctx, { n: 90, seed: 13, cx: at[0] - 80, cy: at[1] - 40, r0: 260, r1: 1500, col: "#e8f6ff", a: 0.28 });
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(at[0] - 90, at[1] - 30, 250, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,240,210,0.5)"; ctx.beginPath(); ctx.arc(at[0] - 90, at[1] - 30, 330, 0, 7); ctx.stroke(); ctx.restore();
    P.glow(ctx, at[0] - 90, at[1] - 30, 300, C.amber, 0.35);
  }
  const me = COURIER.drawCourier(ctx, at[0], at[1] - 4, 1.5, ang, { lean: 0.6, crouch: 0.95, armF: 0.9, armB: 0.6, scarfT: t + 0.3, scarfLen: 1.15 });
  // 手前: 渦に吸い上げられる岩のかけら(ぼかし=手前の被写界深度)
  P.layer(ctx, (g) => {
    for (const [x, y, w, sd] of [[260, 1010, 300, 31], [1760, 1040, 300, 33], [1500, 60, 150, 35]]) W.island(g, { seed: sd, cx: x, top: y, w, depthH: w * 0.7, d: 0.05, town: false, falls: false, roots: false, lamp: 0, skyCol: "#1c1838", L: [-0.6, -0.8], lightSide: { col: "#bfe9ff", w: 4, L: [-0.8, -0.5], a: 0.7 } });
  }, { blur: 5 });
  W.motes(ctx, { n: 60, seed: 4, t, vx: 700, streak: 90, col: "#d8ecff", size: [1.5, 5], a: 0.45 });
  ctx.restore();
  // HUD
  HUD.parcel(ctx, 44, 40, 2);
  HUD.dest(ctx, 1876, 40, "灯台島まで", "0.4");
  HUD.gauge(ctx, 44, 970, 1.0, 1.0);
  HUD.pop(ctx, 1060, 300, "PERFECT", "+800", { size: 96, rot: -0.08 });
  HUD.streak(ctx, 1860, 470, 12);
  P.finish(ctx, t, { vig: 0.6 });
};
