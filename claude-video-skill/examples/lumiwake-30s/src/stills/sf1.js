// スタイルフレーム1: 冒頭の疑似プレイ(S1 の 1.6 秒あたり)。
// 行動(配達人が光の気流を駆け上がる)+危険(嵐の稲妻が真後ろの気流を撃つ)+結果(NEAR MISS +150)を1枚で。
var STILLS = STILLS || {};
STILLS["1"] = function (ctx, t) {
  const P = PAINT, W = WORLD, C = W.C;
  const streamPts = [[-160, 1030], [380, 915], [820, 800], [1240, 640], [1640, 470], [2120, 300]];
  ctx.save();
  // カメラ: 少し傾ける(ダッチ 3°)。角が空かないよう 1.06 倍
  ctx.translate(960, 540); ctx.rotate(-0.05); ctx.scale(1.06, 1.06); ctx.translate(-960, -540);
  W.sky(ctx, { glowAt: [1360, 190] }); W.stars(ctx, { t }); W.moon(ctx, 1370, 175, 56);
  // 遠景: 雲海と遠い島(大気遠近 d=0.85〜0.9)
  W.cloudBank(ctx, { seed: 2, x0: -200, x1: 2100, yb: 660, hgt: 70, d: 0.92, under: 500 });
  P.layer(ctx, (g) => { W.island(g, { seed: 8, cx: 1480, top: 470, w: 240, d: 0.86 }); W.island(g, { seed: 15, cx: 1090, top: 540, w: 150, d: 0.9, town: false }); }, { blur: 1.2 });
  // 嵐(左上)。稲妻の元
  W.stormMass(ctx, { seed: 6, cx: 330, cy: 120, rx: 560, ry: 220, swirl: 1.4, inner: 0.5 });
  // 中景: 雲の帯と左の島(d=0.55)
  W.cloudBank(ctx, { seed: 5, x0: -200, x1: 2100, yb: 820, hgt: 120, d: 0.62, under: 400, warm: 0.18, warmAt: [600, 860, 420] });
  W.island(ctx, { seed: 4, cx: 250, top: 600, w: 440, d: 0.5, L: [0.6, -0.8] });
  // 光の気流(配達人の足場)
  const samp = W.stream(ctx, streamPts, { width: 46, t, seed: 4, taper: [0.35, 1] });
  // 稲妻が気流の真後ろを撃つ(危険)
  const hit = [560, 868];
  W.bolt(ctx, 300, 250, hit[0], hit[1], { seed: 11, width: 7, branches: 5, rough: 0.2 });
  if (!P.mode.sil) {
    // 着弾: 衝撃の輪・飛び散る火花・気流のちぎれ
    P.glow(ctx, hit[0], hit[1], 260, "#bfeeff", 0.55);
    ctx.save(); ctx.strokeStyle = "rgba(220,248,255,0.85)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(hit[0], hit[1], 120, 46, -0.25, 0, 7); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(220,248,255,0.4)"; ctx.beginPath(); ctx.ellipse(hit[0], hit[1], 190, 74, -0.25, 0, 7); ctx.stroke(); ctx.restore();
    const r = P.mulberry32(31); ctx.save(); ctx.lineCap = "round";
    for (let i = 0; i < 46; i++) { const a = r() * 6.28, l = 30 + r() * 170, x = hit[0] + Math.cos(a) * (20 + r() * 40), y = hit[1] + Math.sin(a) * (12 + r() * 20); ctx.strokeStyle = r() < 0.5 ? "rgba(225,250,255,0.9)" : P.css(C.amberHot, 0.9); ctx.lineWidth = 1.5 + r() * 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l * 0.35, y + Math.sin(a) * l * 0.35); ctx.stroke(); }
    ctx.restore();
  }
  // 速さの線(気流の向き)
  W.speedLines(ctx, { n: 46, seed: 3, angle: Math.PI + Math.atan2(-170, 400), spread: 0.08, a: 0.18, col: "#d6f0ff" });
  // 配達人: 気流の上(x≈1080)に乗せ、気流の傾きに合わせる
  let k = 0; while (k < samp.length - 2 && samp[k][0] < 1080) k++;
  const ang = Math.atan2(samp[k + 1][1] - samp[k - 1][1], samp[k + 1][0] - samp[k - 1][0]);
  const me = COURIER.drawCourier(ctx, samp[k][0], samp[k][1] - 6, 1.45, ang, { lean: 0.5, crouch: 0.7, armF: 0.15, scarfT: t, lampGlow: 1 });
  // 手前: 暗い岩(右下、d=0。画面の枠になる)と、手前の雲のもや(ぼかし)
  W.island(ctx, { seed: 21, cx: 1820, top: 960, w: 620, depthH: 300, d: 0.0, town: false, falls: false, lamp: 0, L: [0.6, -0.8], lightSide: { col: C.amber, w: 5, L: [-0.9, -0.3], a: 0.7 } });
  P.layer(ctx, (g) => W.cloudBank(g, { seed: 9, x0: -300, x1: 700, yb: 1110, hgt: 150, d: 0.25, under: 100 }), { blur: 10, a: 0.9 });
  W.motes(ctx, { n: 46, seed: 12, t, vx: -900, streak: -70, size: [2, 7], a: 0.55 });
  ctx.restore();
  // HUD(画面に固定。傾けない)
  HUD.parcel(ctx, 44, 40, 3);
  HUD.dest(ctx, 1876, 40, "灯台島まで", "1.2");
  HUD.gauge(ctx, 44, 970, 0.58, 0.72);
  HUD.pop(ctx, 1290, 300, "NEAR MISS", "+150  ×4", { size: 58 });
  P.finish(ctx, t, { vig: 0.5 });
};
