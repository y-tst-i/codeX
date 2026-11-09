// 背景の「焼いた絵」(一度だけ描いて canvas に残し、毎コマは位置・拡大・透明度だけ変えて貼る)。
// 中身は引数だけで決まる(seed 付き)。描くのは src/lib/world.js の部品。名前が同じなら同じ絵。
const PL = (() => {
  const W = WORLD, P = PAINT, { css, mix } = P, { plate, blurred } = K2;
  // 星(透明の上に)
  const stars = (name, w, h, { n = 500, seed = 5, maxY = 0.85 } = {}) => plate("stars:" + name, w, h, (g) => W.stars(g, { w, h, n, seed, maxY, t: 0.7 }));
  // 雲の帯。戻り値の canvas の y=0 は yb - top(上の余白)。{c, top}
  function clouds(name, { seed = 1, w = 3000, hgt = 120, d = 0.5, under = 300, warm = 0, warmAt = null, lit, skyCol, L } = {}) {
    const top = hgt * 2.4, H = top + under + 20;
    const c = plate("cloud:" + name, w, H, (g) => W.cloudBank(g, { seed, x0: 80, x1: w - 80, yb: top, hgt, d, under, warm, warmAt: warmAt ? [warmAt[0], top + warmAt[1], warmAt[2]] : null, lit, skyCol, L }));
    return { c, top };
  }
  // 浮遊島。{c, cx, top}: canvas の中の島の中心 x と上面 y
  function island(name, { seed = 1, w = 300, depthH, d = 0.3, town = true, falls = true, lamp = 1, L = [0.55, -0.8], lightSide = null, skyCol } = {}) {
    depthH = depthH ?? w * 0.6; const pad = 80, cw = w + pad * 2, ch = depthH * 1.45 + w * 0.35 + pad, cx = cw / 2, top = w * 0.3 + 30;
    const c = plate("isl:" + name, cw, ch, (g) => W.island(g, { seed, cx, top, w, depthH, d, town, falls, lamp, L, lightSide, skyCol }));
    return { c, cx, top };
  }
  // 嵐の塊。{c, cx, cy}
  function storm(name, { seed = 3, rx = 500, ry = 220, swirl = 1.6, arms = 5, inner = 0.5, L } = {}) {
    const cw = rx * 3.4, ch = ry * 3.4, cx = cw / 2, cy = ch / 2;
    const c = plate("storm:" + name, cw, ch, (g) => W.stormMass(g, { seed, cx, cy, rx, ry, swirl, arms, inner, L }));
    return { c, cx, cy };
  }
  // 嵐の雲(初稿の「紫の岩」を避ける): 形のある塊をぼかした写しの上に薄く重ね、縁に千切れた小さな房を足す
  function storm2(name, o = {}) {
    const S = storm(name, o), c0 = S.c, r = K2.rng((o.seed || 3) * 31 + 7);
    const c = plate("storm2:" + name, c0.width, c0.height, (g) => {
      g.filter = "blur(18px)"; g.drawImage(c0, 0, 0); g.filter = "blur(5px)"; g.globalAlpha = 0.8; g.drawImage(c0, 0, 0); g.filter = "none"; g.globalAlpha = 0.55; g.drawImage(c0, 0, 0); g.globalAlpha = 1;
      const rx = o.rx || 500, ry = o.ry || 220;
      for (let i = 0; i < 34; i++) { const a = r() * 6.283, d = 0.9 + r() * 0.45, x = S.cx + Math.cos(a) * rx * d, y = S.cy + Math.sin(a) * ry * d * 0.9, rr = (0.05 + r() * 0.1) * rx;
        const q = g.createRadialGradient(x, y, 0, x, y, rr); q.addColorStop(0, "rgba(52,38,88,0.55)"); q.addColorStop(1, "rgba(30,20,52,0)"); g.fillStyle = q; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
      // 上の縁に月の光(薄い藤色)
      g.globalCompositeOperation = "source-atop"; const lg = g.createLinearGradient(0, S.cy - ry * 1.3, 0, S.cy + ry); lg.addColorStop(0, "rgba(170,160,220,0.28)"); lg.addColorStop(0.5, "rgba(120,110,180,0.05)"); lg.addColorStop(1, "rgba(8,5,16,0.25)"); g.fillStyle = lg; g.fillRect(0, 0, c0.width, c0.height);
    });
    return { c, cx: S.cx, cy: S.cy };
  }
  // 灯台(塔だけ。島とは別に焼く)。lit=1 で窓と灯室が灯る。{c, ox, oy(塔の根元), lampY(灯室の中心、根元からの高さ)}
  function lighthouse(name, { h = 260, lit = 0, d = 0.2, L = [0.55, -0.8] } = {}) {
    const cw = h * 0.9, ch = h * 1.25, ox = cw / 2, oy = ch - 10;
    const c = plate("lh:" + name, cw, ch, (g) => {
      const hz = (col) => W.haze(col, d), w0 = h * 0.2, w1 = h * 0.13;
      const tower = (q) => { q.beginPath(); q.moveTo(ox - w0, oy); q.lineTo(ox - w1, oy - h * 0.78); q.lineTo(ox + w1, oy - h * 0.78); q.lineTo(ox + w0, oy); q.closePath(); };
      P.shade(g, tower, { box: [ox - w0 - 10, oy - h, w0 * 2 + 20, h + 10], base: css(hz("#d9d2c2")), L, hiCol: css(hz("#fff8ea")), hi: h * 0.03, hiA: 0.8, shCol: css(hz("#4a4458")), sh: h * 0.12, shA: 0.85, blur: 2, tex: 0.15, texSeed: 4, texScale: 0.05 });
      // 朱の帯2本
      g.save(); tower(g); g.clip(); g.fillStyle = css(hz("#b8463c"), 0.92); for (const k of [0.28, 0.56]) g.fillRect(ox - w0, oy - h * k - h * 0.06, w0 * 2, h * 0.08); g.restore();
      // 窓(縦に3つ)
      for (const k of [0.18, 0.42, 0.64]) { g.fillStyle = lit ? css(mix(W.C.amberDeep, W.C.amberHot, 0.6)) : css(hz("#1a2030")); g.fillRect(ox - h * 0.018, oy - h * k - h * 0.03, h * 0.036, h * 0.05); }
      // 回廊と灯室
      g.fillStyle = css(hz("#2a2638")); g.fillRect(ox - w1 * 1.45, oy - h * 0.8, w1 * 2.9, h * 0.035);
      const lr = (q) => { q.beginPath(); q.roundRect(ox - w1 * 0.95, oy - h * 0.95, w1 * 1.9, h * 0.15, 4); };
      P.shade(g, lr, { box: [ox - w1 * 2, oy - h, w1 * 4, h * 0.25], base: lit ? css(W.C.amberHot) : css(hz("#2c3448")), L, hiCol: lit ? "#ffffff" : css(hz("#7d8fa6")), hi: 3, hiA: 0.8, shCol: lit ? css(W.C.amberDeep) : "#0c0f1a", sh: 6, shA: 0.8, blur: 1 });
      g.strokeStyle = css(hz("#1a1626")); g.lineWidth = 2.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(ox + i * w1 * 0.55, oy - h * 0.95); g.lineTo(ox + i * w1 * 0.55, oy - h * 0.8); g.stroke(); }
      const roof = (q) => { q.beginPath(); q.moveTo(ox - w1 * 1.2, oy - h * 0.95); q.lineTo(ox, oy - h * 1.1); q.lineTo(ox + w1 * 1.2, oy - h * 0.95); q.closePath(); };
      P.shade(g, roof, { box: [ox - w1 * 2, oy - h * 1.15, w1 * 4, h * 0.25], base: css(hz("#6b3640")), L, hiCol: css(hz("#c27a6e")), hi: 4, hiA: 0.8, shCol: "#1a1222", sh: 6, shA: 0.8, blur: 1 });
    });
    return { c, ox, oy, lampY: h * 0.875 };
  }
  // 手前のぼかした雲のかたまり(被写界深度)
  function wisp(name, { seed = 9, w = 1400, hgt = 160, blur = 14, d = 0.25, dark = 0.4 } = {}) {
    const { c } = clouds("wsrc:" + name, { seed, w, hgt, d, under: 160 });
    const dk = plate("wdk:" + name, c.width, c.height, (g) => { g.drawImage(c, 0, 0); g.globalCompositeOperation = "source-atop"; g.fillStyle = `rgba(8,12,26,${dark})`; g.fillRect(0, 0, c.width, c.height);
      // 端を溶かす(左右と下)。四角い縁を見せない
      g.globalCompositeOperation = "destination-in"; const lx = g.createLinearGradient(0, 0, c.width, 0); lx.addColorStop(0, "rgba(0,0,0,0)"); lx.addColorStop(0.2, "rgba(0,0,0,1)"); lx.addColorStop(0.8, "rgba(0,0,0,1)"); lx.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = lx; g.fillRect(0, 0, c.width, c.height);
      const ly = g.createLinearGradient(0, 0, 0, c.height); ly.addColorStop(0, "rgba(0,0,0,1)"); ly.addColorStop(0.75, "rgba(0,0,0,1)"); ly.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = ly; g.fillRect(0, 0, c.width, c.height); });
    return blurred("wisp:" + name, dk, blur);
  }
  return { stars, clouds, island, storm, storm2, lighthouse, wisp };
})();
