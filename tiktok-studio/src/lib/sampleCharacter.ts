/** お試し用の看板キャラ「ラビ先生」（丸メガネのうさぎ）。window.CHARACTER の契約どおりに書いた見本 */
export const SAMPLE_CHARACTER = {
  name: "ラビ先生",
  concept: "恋愛と心理学を教えてくれる、丸メガネのうさぎの先生。ちょっとおませで物知り。",
  script: String.raw`
window.CHARACTER = (function () {
  var C = { fur: "#fff7fb", line: "#3a2340", inner: "#ffb3cf", cheek: "#ff8fb8", glass: "#3a2340", shine: "rgba(255,255,255,0.85)" };

  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }

  function arm(ctx, sx, sy, ex, ey, w) {
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + ex) / 2, Math.min(sy, ey) - w * 0.4, ex, ey);
    ctx.lineWidth = w; ctx.lineCap = "round"; ctx.strokeStyle = C.line; ctx.stroke();
    ctx.lineWidth = w * 0.62; ctx.strokeStyle = C.fur; ctx.stroke();
  }

  function eye(ctx, x, y, r, expression, closed, look) {
    ctx.strokeStyle = C.line; ctx.fillStyle = C.line; ctx.lineWidth = r * 0.45; ctx.lineCap = "round";
    if (closed || (expression === "wink" && x > 0)) { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y); ctx.stroke(); return; }
    if (expression === "happy") { ctx.beginPath(); ctx.moveTo(x - r, y + r * 0.3); ctx.quadraticCurveTo(x, y - r * 0.9, x + r, y + r * 0.3); ctx.stroke(); return; }
    if (expression === "smug") { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y - r * 0.2); ctx.stroke(); ell(ctx, x + look * r * 0.3, y + r * 0.35, r * 0.55, r * 0.45); ctx.fill(); return; }
    var s = expression === "surprised" ? 1.35 : 1;
    ell(ctx, x + look * r * 0.35, y, r * 0.75 * s, r * s); ctx.fill();
    ctx.fillStyle = C.shine; ell(ctx, x + look * r * 0.35 - r * 0.25, y - r * 0.35, r * 0.28, r * 0.28); ctx.fill();
  }

  function mouthShape(ctx, y, w, expression, open) {
    ctx.strokeStyle = C.line; ctx.lineWidth = w * 0.18; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var h = w * (0.15 + open * 0.9);
    if (open > 0.05 || expression === "surprised") {
      if (expression === "surprised") h = Math.max(h, w * 0.7);
      ctx.fillStyle = "#8a2b4f";
      ctx.beginPath(); ctx.moveTo(-w * 0.55, y); ctx.quadraticCurveTo(0, y + h * 2, w * 0.55, y); ctx.quadraticCurveTo(0, y - h * 0.3, -w * 0.55, y); ctx.closePath();
      ctx.fill(); ctx.stroke(); return;
    }
    ctx.beginPath();
    if (expression === "sad") { ctx.moveTo(-w * 0.5, y + w * 0.3); ctx.quadraticCurveTo(0, y - w * 0.2, w * 0.5, y + w * 0.3); }
    else if (expression === "thinking") { ctx.moveTo(-w * 0.4, y + w * 0.1); ctx.lineTo(w * 0.4, y - w * 0.05); }
    else { ctx.moveTo(-w * 0.55, y); ctx.quadraticCurveTo(-w * 0.25, y + w * 0.45, 0, y); ctx.quadraticCurveTo(w * 0.25, y + w * 0.45, w * 0.55, y); }
    ctx.stroke();
  }

  function draw(ctx, o) {
    var x = o.x, y = o.y, size = o.size, t = o.t || 0, expression = o.expression || "normal", pose = o.pose || "idle";
    var mouth = Math.max(0, Math.min(1, o.mouth || 0)), look = Math.max(-1, Math.min(1, o.look || 0));
    var u = size / 100; // 身長100としたときの単位
    var breathe = Math.sin(t * 2.4) * 0.8 * u;
    var blink = (t % 3.7) < 0.12;

    ctx.save();
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    ctx.lineJoin = "round";

    // 影
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ell(ctx, 0, 0, 22 * u, 4 * u); ctx.fill();

    // 足
    ctx.fillStyle = C.fur; ctx.strokeStyle = C.line; ctx.lineWidth = 2.4 * u;
    ell(ctx, -10 * u, -3 * u, 8 * u, 4.5 * u); ctx.fill(); ctx.stroke();
    ell(ctx, 10 * u, -3 * u, 8 * u, 4.5 * u); ctx.fill(); ctx.stroke();

    // 体
    ell(ctx, 0, -20 * u + breathe * 0.5, 19 * u, 17 * u); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.inner; ell(ctx, 0, -17 * u + breathe * 0.5, 10 * u, 9 * u); ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;

    // 腕（ポーズ）
    var sh = -27 * u + breathe * 0.5, aw = 6 * u, sway = Math.sin(t * 6) * 6 * u;
    var L = [-22 * u, -14 * u], R = [22 * u, -14 * u];
    if (pose === "point") R = [36 * u, -44 * u];
    if (pose === "wave") R = [30 * u + sway * 0.4, -52 * u];
    if (pose === "cheer") { L = [-30 * u, -58 * u]; R = [30 * u, -58 * u]; }
    if (pose === "shrug") { L = [-32 * u, -34 * u]; R = [32 * u, -34 * u]; }
    arm(ctx, -15 * u, sh, L[0], L[1], aw);
    arm(ctx, 15 * u, sh, R[0], R[1], aw);
    if (pose === "point") { ctx.fillStyle = C.fur; ctx.strokeStyle = C.line; ctx.lineWidth = 2 * u; ell(ctx, R[0] + 3 * u, R[1] - 3 * u, 2.4 * u, 4.2 * u, 0.7); ctx.fill(); ctx.stroke(); }

    // 頭の位置
    var hy = -56 * u + breathe;
    ctx.save();
    ctx.translate(0, hy);
    var tilt = expression === "thinking" ? -0.12 : expression === "smug" ? 0.08 : 0;
    ctx.rotate(tilt + Math.sin(t * 1.3) * 0.02);

    // 耳（少し揺れる。しょんぼりで垂れる）
    var droop = expression === "sad" ? 0.9 : expression === "surprised" ? -0.15 : 0;
    var earSway = Math.sin(t * 2) * 0.05;
    [-1, 1].forEach(function (s) {
      ctx.save();
      ctx.translate(s * 9 * u, -20 * u);
      ctx.rotate(s * (0.18 + droop) + earSway * s);
      ctx.fillStyle = C.fur; ctx.strokeStyle = C.line; ctx.lineWidth = 2.6 * u;
      ell(ctx, 0, -18 * u, 6.5 * u, 19 * u); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.inner; ell(ctx, 0, -17 * u, 3.4 * u, 14 * u); ctx.fill();
      ctx.restore();
    });

    // 顔
    ctx.fillStyle = C.fur; ctx.strokeStyle = C.line; ctx.lineWidth = 2.8 * u;
    ell(ctx, 0, 0, 25 * u, 22 * u); ctx.fill(); ctx.stroke();

    // ほっぺ
    ctx.fillStyle = C.cheek; ctx.globalAlpha = expression === "happy" || expression === "wink" ? 0.75 : 0.45;
    ell(ctx, -15 * u, 7 * u, 4.5 * u, 3 * u); ctx.fill(); ell(ctx, 15 * u, 7 * u, 4.5 * u, 3 * u); ctx.fill(); ctx.globalAlpha = 1;

    // 眉
    ctx.strokeStyle = C.line; ctx.lineWidth = 2 * u; ctx.lineCap = "round";
    var by = -11 * u, bt = expression === "surprised" ? -3 * u : expression === "sad" ? 2 * u : 0;
    ctx.beginPath();
    if (expression === "thinking") { ctx.moveTo(-14 * u, by - 1 * u); ctx.lineTo(-6 * u, by + 1 * u); ctx.moveTo(6 * u, by - 3 * u); ctx.lineTo(14 * u, by - 2 * u); }
    else if (expression === "sad") { ctx.moveTo(-14 * u, by + 1 * u); ctx.lineTo(-6 * u, by - 1 * u + bt); ctx.moveTo(6 * u, by - 1 * u + bt); ctx.lineTo(14 * u, by + 1 * u); }
    else { ctx.moveTo(-14 * u, by + bt); ctx.lineTo(-6 * u, by - 1 * u + bt); ctx.moveTo(6 * u, by - 1 * u + bt); ctx.lineTo(14 * u, by + bt); }
    ctx.stroke();

    // 目
    eye(ctx, -10 * u, -2 * u, 3.6 * u, expression, blink && expression !== "happy", look);
    eye(ctx, 10 * u, -2 * u, 3.6 * u, expression, blink && expression !== "happy", look);

    // 丸メガネ
    ctx.strokeStyle = C.glass; ctx.lineWidth = 1.8 * u;
    ell(ctx, -10 * u, -2 * u, 7.5 * u, 7.5 * u); ctx.stroke();
    ell(ctx, 10 * u, -2 * u, 7.5 * u, 7.5 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.5 * u, -3 * u); ctx.quadraticCurveTo(0, -5 * u, 2.5 * u, -3 * u); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.2 * u;
    ctx.beginPath(); ctx.arc(-12 * u, -5 * u, 4 * u, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();

    // 鼻と口
    ctx.fillStyle = C.cheek; ell(ctx, 0, 6 * u, 1.8 * u, 1.3 * u); ctx.fill();
    ctx.save(); ctx.translate(0, 0); mouthShape(ctx, 10 * u, 5 * u, expression, mouth); ctx.restore();

    // 考え中の「…」と、びっくりの汗
    if (expression === "thinking") {
      ctx.fillStyle = C.line;
      for (var i = 0; i < 3; i++) { var a = (Math.sin(t * 4 - i) + 1) / 2; ctx.globalAlpha = 0.3 + a * 0.7; ell(ctx, 22 * u + i * 6 * u, -24 * u - i * 3 * u, 1.8 * u, 1.8 * u); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    if (expression === "surprised") {
      ctx.fillStyle = "#7cc8ff"; ctx.beginPath(); ctx.moveTo(22 * u, -16 * u); ctx.quadraticCurveTo(27 * u, -8 * u, 22 * u, -6 * u); ctx.quadraticCurveTo(17 * u, -8 * u, 22 * u, -16 * u); ctx.fill();
    }
    ctx.restore(); // 頭
    ctx.restore();
  }

  return { name: "ラビ先生", expressions: ["normal", "happy", "surprised", "thinking", "sad", "wink", "smug"], poses: ["idle", "point", "wave", "cheer", "shrug"], draw: draw };
})();
`.trim()
};
