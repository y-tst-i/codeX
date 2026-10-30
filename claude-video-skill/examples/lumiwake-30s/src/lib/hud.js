// ゲーム画面の表示(HUD)と、得点のポップ。world.js の後に読む。フォント: 'HUD'(英数字)、'JPG'(和文ゴシック)
// HUD は「行動の結果が数字で変わる」ための物。説明の板にしない(1画面に4か所まで)。
const HUD = (() => {
  const P = PAINT, W = WORLD, { css, mix, clamp } = P;
  const plate = (ctx, x, y, w, h, { cut = 14, a = 0.62, edge = W.C.amber } = {}) => {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x + cut, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - cut); ctx.lineTo(x + w - cut, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + cut); ctx.closePath();
    ctx.fillStyle = `rgba(8,14,28,${a})`; ctx.fill(); ctx.strokeStyle = css(edge, 0.55); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  };
  const text = (ctx, s, x, y, { font = "HUD", size = 32, weight = 400, col = "#f4ead2", align = "left", base = "alphabetic", stroke = 0, strokeCol = W.C.ink, track = 0 } = {}) => {
    ctx.save(); ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = base; if (track) ctx.letterSpacing = track + "px"; if (font === "HUD") ctx.wordSpacing = -Math.round(size * 0.35) + "px";
    if (stroke) { ctx.lineJoin = "round"; ctx.strokeStyle = strokeCol; ctx.lineWidth = stroke; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.restore();
  };
  // 荷物の耐久(灯りのアイコン ×3)。hp: 0..3(小数は割れかけ)
  function parcel(ctx, x, y, hp = 3, { flash = 0 } = {}) {
    if (P.mode.sil) return;
    plate(ctx, x, y, 300, 86);
    text(ctx, "PARCEL", x + 22, y + 32, { size: 22, col: "#bfe3e6", track: 3 });
    for (let i = 0; i < 3; i++) {
      const cx = x + 44 + i * 56, cy = y + 60, lit = clamp(hp - i), r = 15;
      ctx.save(); ctx.beginPath(); ctx.roundRect(cx - r * 0.75, cy - r, r * 1.5, r * 2, 5);
      ctx.fillStyle = lit > 0.5 ? css(W.C.amber) : "rgba(60,70,90,0.9)"; ctx.fill(); ctx.strokeStyle = W.C.ink; ctx.lineWidth = 3; ctx.stroke();
      if (lit > 0.5) { ctx.fillStyle = "#fff6dc"; ctx.fillRect(cx - 4, cy - 7, 8, 12); P.glow(ctx, cx, cy, 34, W.C.amber, 0.35); }
      else { ctx.strokeStyle = "rgba(220,240,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 12); ctx.lineTo(cx + 2, cy - 2); ctx.lineTo(cx - 4, cy + 4); ctx.lineTo(cx + 6, cy + 13); ctx.stroke(); }
      ctx.restore();
    }
    text(ctx, "×" + Math.ceil(hp), x + 214, y + 72, { size: 40, col: W.C.amberHot });
  }
  // 目的地までの距離
  function dest(ctx, x, y, name, dist, unit = "km") {
    if (P.mode.sil) return;
    plate(ctx, x - 360, y, 360, 96);
    text(ctx, name, x - 336, y + 38, { font: "JPG", weight: 700, size: 26, col: "#bfe3e6" });
    text(ctx, dist, x - 92, y + 82, { size: 52, col: "#fff6dc", align: "right" });
    text(ctx, unit, x - 84, y + 82, { size: 26, col: "#bfe3e6" });
    // 方向の矢印
    ctx.save(); ctx.translate(x - 40, y + 60); ctx.fillStyle = W.C.amber; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // 光のゲージ(2段: 今の量+あとから追いつく白い残り)
  function gauge(ctx, x, y, v = 0.6, ghost = 0.75, label = "LUMI") {
    if (P.mode.sil) return;
    plate(ctx, x, y, 500, 64);
    text(ctx, label, x + 20, y + 42, { size: 26, col: "#bfe3e6", track: 2 });
    const bx = x + 140, bw = 330, bh = 20, by = y + 22;
    ctx.save(); ctx.fillStyle = "rgba(30,40,60,0.9)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "rgba(255,246,220,0.55)"; ctx.fillRect(bx, by, bw * ghost, bh);
    const g = ctx.createLinearGradient(bx, 0, bx + bw * v, 0); g.addColorStop(0, css(W.C.amberDeep)); g.addColorStop(1, css(W.C.amberHot)); ctx.fillStyle = g; ctx.fillRect(bx, by, bw * v, bh);
    for (let i = 1; i < 4; i++) { ctx.fillStyle = "rgba(8,14,28,0.9)"; ctx.fillRect(bx + bw * i / 4 - 1.5, by, 3, bh); }
    ctx.restore(); P.glow(ctx, bx + bw * v, by + bh / 2, 40, W.C.amber, 0.5);
  }
  // 得点のポップ(行動の結果)。big: 大きい文字、small: 加点
  function pop(ctx, x, y, big, small, { size = 64, rot = -0.06, col = W.C.amberHot, sub = "#ffffff" } = {}) {
    if (P.mode.sil) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    text(ctx, big, 0, 0, { size, col, stroke: size * 0.22, track: 2 });
    if (small) text(ctx, small, 6, size * 0.95, { size: size * 0.62, col: sub, stroke: size * 0.16 });
    ctx.restore();
  }
  function streak(ctx, x, y, n) {
    if (P.mode.sil) return;
    text(ctx, "STREAK", x, y, { size: 22, col: "#bfe3e6", align: "right", track: 3, stroke: 5 });
    text(ctx, "×" + n, x, y + 58, { size: 60, col: W.C.amberHot, align: "right", stroke: 10 });
  }
  return { plate, text, parcel, dest, gauge, pop, streak };
})();
