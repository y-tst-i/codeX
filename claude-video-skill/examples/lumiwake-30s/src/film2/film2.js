// LUMIWAKE 30s v2 — 組み立て。FILM2.renderAt(ctx, f) が 0〜899 のどのコマも単独で描く(コマ番号 f の純関数)。
// 流れ: 作業 canvas を reset → ショットの絵 → ブルーム(明るい所だけ縮小してぼかして足す)→ 露出の閃光(絵を自分に足す=色を残す)
//       → ズーム/横のぼかし → 色の調整 → 色ずれ(衝撃のコマだけ)→ HUD・文字 → 黒帯 → 周辺減光・粒子(フィルムの粒)。
const FILM2 = (() => {
  const { clamp, lerp, wbuf, plate, hash } = K2;
  const SHOTS = [];
  const reg = (s) => { SHOTS.push(s); SHOTS.sort((a, b) => a.a - b.a); };
  // 画面に出す文字(全部。フォントを先に読み込む)
  const TEXT = {
    HUD: "PARCEL LUMI STREAK NEAR MISS PERFECT DELIVERED km ×+0123456789.",
    JPG: "灯台島まで※架空のゲームのコンセプト映像です。発売の予定はありません。",
    JPM: "嵐を抜けて、灯りを届けろ。届けた灯りが、空の道になる。",
  };
  let grain = null, vig = null;
  async function init() {
    const loads = [["400 40px HUD", TEXT.HUD], ["700 30px JPG", TEXT.JPG], ["500 30px JPG", TEXT.JPG], ["900 40px JPM", TEXT.JPM]];
    await Promise.all(loads.map(([f, s]) => document.fonts.load(f, s)));
    await document.fonts.ready;
    // 使う字を一度描いて、字形の読み込みを済ませる(並列の書き出しで最初のコマだけ代用書体になるのを防ぐ)
    const [, wg] = wbuf("warm", 64, 64); for (const [f, s] of loads) { wg.font = f; wg.fillText(s, 0, 40); }
    // フィルムの粒: 960x540 の灰色の雑音を 8 枚(seed 固定)。毎コマ hash で選び、2倍に広げて soft-light で重ねる
    grain = [];
    for (let k = 0; k < 8; k++) {
      const c = document.createElement("canvas"); c.width = 960; c.height = 540; const g = c.getContext("2d"), img = g.createImageData(960, 540), d = img.data, r = K2.rng(1000 + k * 77);
      for (let i = 0; i < d.length; i += 4) { const n = (r() + r() + r() - 1.5) * 44; const v = 128 + n; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      g.putImageData(img, 0, 0); grain.push(c);
    }
    vig = document.createElement("canvas"); vig.width = 1920; vig.height = 1080;
    { const g = vig.getContext("2d"); g.translate(960, 540); g.scale(1, 0.5625); const r = g.createRadialGradient(0, 0, 400, 0, 0, 1180); for (let i = 0; i <= 8; i++) { const s = i / 8; r.addColorStop(s, `rgba(4,6,16,${0.95 * Math.pow(s, 2.4)})`); } g.fillStyle = r; g.fillRect(-960, -960, 1920, 1920); }
    for (const s of SHOTS) if (s.init) s.init();
    return true;
  }

  // ---- 仕上げの部品 ----
  function bloom(g, c, { a = 0.55, a2 = 0.35, th = 0.74, ct = 2.6 } = {}) {
    if (!PAINT.mode.fx || a <= 0) return;
    const [b1, g1] = wbuf("bl1", 480, 270); g1.filter = `brightness(${th}) contrast(${ct}) saturate(1.25)`; g1.drawImage(c, 0, 0, 480, 270);
    const [b2, g2] = wbuf("bl2", 480, 270); g2.filter = "blur(4px)"; g2.drawImage(b1, 0, 0);
    const [b3, g3] = wbuf("bl3", 240, 135); g3.filter = "blur(9px)"; g3.drawImage(b1, 0, 0, 240, 135);
    g.save(); g.globalCompositeOperation = "screen"; g.globalAlpha = a; g.drawImage(b2, 0, 0, 1920, 1080); g.globalAlpha = a2; g.drawImage(b3, 0, 0, 1920, 1080); g.restore();
  }
  // 露出の閃光: 絵を自分に足す(暗い紫は明るい紫になる。白い板を重ねないので色が抜けない)
  function exposure(g, c, k) {
    if (k <= 0) return;
    const [b, gb] = wbuf("exp", 1920, 1080); gb.drawImage(c, 0, 0);
    g.save(); g.globalCompositeOperation = "lighter"; let left = k; while (left > 0) { g.globalAlpha = Math.min(1, left); g.drawImage(b, 0, 0); left -= 1; } g.restore();
  }
  // ズームのぼかし(中心から放射): 少しずつ大きくした写しを重ねる
  function zoomBlur(g, c, amt, cx = 960, cy = 540, n = 6) {
    if (amt <= 0.001 || !PAINT.mode.fx) return;
    const [b, gb] = wbuf("zb", 1920, 1080); gb.drawImage(c, 0, 0);
    g.save(); for (let i = 1; i <= n; i++) { const s = 1 + (amt * i) / n; g.globalAlpha = 0.5 / i + 0.08; g.setTransform(s, 0, 0, s, cx - cx * s, cy - cy * s); g.drawImage(b, 0, 0); } g.restore();
  }
  // 横(向き付き)のぼかし
  function dirBlur(g, c, dx, dy, n = 6) {
    if (Math.hypot(dx, dy) < 0.5 || !PAINT.mode.fx) return;
    const [b, gb] = wbuf("db", 1920, 1080); gb.drawImage(c, 0, 0);
    g.save(); for (let i = 1; i <= n; i++) { g.globalAlpha = 1 / (i + 1); g.drawImage(b, (dx * i) / n, (dy * i) / n); } g.restore();
  }
  // 色ずれ(赤と青緑を左右に分ける)。衝撃のコマだけ
  function chroma(g, c, d) {
    if (d < 0.5 || !PAINT.mode.fx) return;
    const [r, gr] = wbuf("caR", 1920, 1080); gr.drawImage(c, 0, 0); gr.globalCompositeOperation = "multiply"; gr.fillStyle = "#ff0000"; gr.fillRect(0, 0, 1920, 1080);
    const [q, gq] = wbuf("caC", 1920, 1080); gq.drawImage(c, 0, 0); gq.globalCompositeOperation = "multiply"; gq.fillStyle = "#00ffff"; gq.fillRect(0, 0, 1920, 1080);
    g.save(); g.fillStyle = "#000"; g.fillRect(0, 0, 1920, 1080); g.globalCompositeOperation = "lighter"; g.drawImage(r, d, 0); g.drawImage(q, -d, 0); g.restore();
  }
  // 色の調整: sat(<1 で彩度を落とす)、tint=[色, 強さ, 合成]、lift(暗部を持ち上げる色)
  function grade(g, { sat = 1, tint = null, tint2 = null, dark = 0 } = {}) {
    g.save();
    if (sat < 1) { g.globalCompositeOperation = "saturation"; g.globalAlpha = clamp(1 - sat); g.fillStyle = "#808080"; g.fillRect(0, 0, 1920, 1080); }
    for (const t of [tint, tint2]) if (t) { g.globalCompositeOperation = t[2] || "soft-light"; g.globalAlpha = t[1]; g.fillStyle = t[0]; g.fillRect(0, 0, 1920, 1080); }
    if (dark > 0) { g.globalCompositeOperation = "multiply"; g.globalAlpha = dark; g.fillStyle = "#1a2040"; g.fillRect(0, 0, 1920, 1080); }
    g.restore();
  }
  function letterbox(g, k, extra = 0) { if (k <= 0) return; const h = 138 * k + extra; g.save(); g.fillStyle = "#020308"; g.fillRect(0, 0, 1920, h); g.fillRect(0, 1080 - h, 1920, h); g.restore(); }
  function finish(g, f, { vig: va = 0.75, grain: ga = 0.32 } = {}) {
    if (!PAINT.mode.fx) return;
    g.save(); g.globalAlpha = va; g.drawImage(vig, 0, 0); g.globalAlpha = ga; g.globalCompositeOperation = "soft-light";
    const k = Math.floor(hash(f, 91) * 8), ox = Math.floor(hash(f, 17) * 2), oy = Math.floor(hash(f, 23) * 2);
    g.drawImage(grain[k], -ox, -oy, 1922, 1082); g.restore();
  }

  function shotAt(f) { for (const s of SHOTS) if (f >= s.a && f < s.b) return s; return SHOTS[SHOTS.length - 1]; }
  function renderAt(out, f) {
    f = clamp(Math.round(f), 0, 899);
    const [c, g] = wbuf("frame", 1920, 1080);
    const s = shotAt(f);
    g.save(); const fx = s.draw(g, f) || {}; g.restore();
    bloom(g, c, fx.bloom || {});
    exposure(g, c, fx.exposure || 0);
    if (fx.zoomBlur) zoomBlur(g, c, fx.zoomBlur[0], fx.zoomBlur[1], fx.zoomBlur[2]);
    if (fx.dirBlur) dirBlur(g, c, fx.dirBlur[0], fx.dirBlur[1]);
    grade(g, fx.grade || {});
    if (fx.post) { g.save(); fx.post(g, c); g.restore(); }
    if (fx.chroma) chroma(g, c, fx.chroma);
    if (fx.overlay) { g.save(); fx.overlay(g); g.restore(); }
    letterbox(g, fx.letterbox || 0);
    if (fx.top) { g.save(); fx.top(g); g.restore(); }
    finish(g, f, fx.finish || {});
    out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.globalCompositeOperation = "copy"; out.filter = "none"; out.drawImage(c, 0, 0); out.restore();
    return s.id;
  }
  const TESTS = {};
  function test(out, name, f) { const [c, g] = wbuf("frame", 1920, 1080); TESTS[name](g, f); finish(g, f); out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalCompositeOperation = "copy"; out.drawImage(c, 0, 0); out.restore(); }
  return { init, renderAt, reg, test, TESTS, SHOTS, bloom, exposure, zoomBlur, dirBlur, chroma, grade };
})();
