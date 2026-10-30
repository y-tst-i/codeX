// スタイルフレーム3: ロゴの決め(S8 の 28 秒あたり。ロゴ着地後の静止保持の中)。
// 届けた灯りで夜空の島々が点灯し、配達人の航跡が島をつなぐ「空の道」になった後。航跡がそのままロゴのスウッシュになり、
// その先端に小さな配達人(主役を最後まで持ち越す)。発売情報は書かない(架空と明記)。
var STILLS = STILLS || {};
STILLS["3"] = function (ctx, t) {
  const P = PAINT, W = WORLD, C = W.C, { css } = P;
  W.sky(ctx, { glowAt: [1560, 190] }); W.stars(ctx, { t, n: 520 }); W.moon(ctx, 1590, 170, 50);
  W.cloudBank(ctx, { seed: 2, x0: -200, x1: 2100, yb: 760, hgt: 60, d: 0.95, under: 400 });
  // 遠い島々(全部点灯)と、それをつなぐ航路の光(配達で通った道)
  const isl = [[150, 690, 150, 41], [520, 740, 120, 42], [860, 700, 170, 43], [1240, 750, 130, 44], [1560, 690, 190, 45], [1830, 740, 120, 46]];
  const nodes = [];
  P.layer(ctx, (g) => { for (const [x, y, w, sd] of isl) { const S = W.island(g, { seed: sd, cx: x, top: y, w, d: 0.82, lamp: 1, falls: false }); nodes.push([x, y - w * 0.12]); } }, { blur: 1 });
  if (!P.mode.sil) {
    ctx.save(); ctx.lineCap = "round";
    const route = P.sampleSpline(nodes, 16);
    P.bloom(ctx, (g) => { g.strokeStyle = css(C.amber); g.lineWidth = 8; g.beginPath(); route.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }, { blur: 14, a: 0.8 });
    ctx.strokeStyle = css(C.amberHot, 0.85); ctx.lineWidth = 2.5; ctx.setLineDash([2, 10]); ctx.beginPath(); route.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.setLineDash([]);
    for (const [x, y] of nodes) { P.glow(ctx, x, y, 60, C.amber, 0.6); ctx.fillStyle = "#fff6dc"; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  // 中景: 両脇の島(枠)。灯りが暖かく雲を照らす
  W.cloudBank(ctx, { seed: 7, x0: -200, x1: 2100, yb: 1000, hgt: 90, d: 0.55, under: 200, warm: 0.3, warmAt: [960, 1000, 700] });
  W.island(ctx, { seed: 4, cx: 130, top: 820, w: 420, depthH: 260, d: 0.35, lamp: 1, L: [0.6, -0.8] });
  W.island(ctx, { seed: 12, cx: 1830, top: 850, w: 380, depthH: 240, d: 0.35, lamp: 1, L: [0.6, -0.8] });
  // ロゴの背後を少し沈めて読みやすく
  if (!P.mode.sil) { const g = ctx.createRadialGradient(960, 400, 100, 960, 400, 900); g.addColorStop(0, "rgba(6,10,22,0.55)"); g.addColorStop(1, "rgba(6,10,22,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); }
  const L = LOGO.draw(ctx, 960, 400, 1280, { t });
  // スウッシュの先端に小さな配達人
  const e = L.swooshEnd, s2 = L.swS, n = s2.length, ang = Math.atan2(s2[n - 1][1] - s2[n - 4][1], s2[n - 1][0] - s2[n - 4][0]);
  COURIER.drawCourier(ctx, e[0] - 30 * Math.cos(ang), e[1] - 30 * Math.sin(ang) - 3, 0.3, ang, { lean: 0.5, crouch: 0.7, scarfT: t });
  // コピーと注記(和文)
  if (!P.mode.sil) {
    HUD.text(ctx, "嵐を抜けて、灯りを届けろ。", 960, 640, { font: "JPM", weight: 900, size: 56, col: "#f4ead2", align: "center", stroke: 10, strokeCol: "rgba(8,12,26,0.85)", track: 6 });
    HUD.text(ctx, "※架空のゲームのコンセプト映像です。発売の予定はありません。", 960, 1030, { font: "JPG", weight: 500, size: 32, col: "#cfe2e4", align: "center", stroke: 6, strokeCol: "rgba(8,12,26,0.8)" });
  }
  W.motes(ctx, { n: 30, seed: 8, t, vx: -60, size: [2, 6], a: 0.4 });
  P.finish(ctx, t, { vig: 0.45 });
};
