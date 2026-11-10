// 案C「暗闇の中の日」— 字そのものが街の建物になる(タイポグラフィが主役のグラフィック)。
// 字の解剖: 「暗」= 日+音、「音」= 立+日、「闇」= 門+音。暗闇の字の中には、もう「日(太陽)」が3つと「音」が2つ入っている。
// 夜の超高層の建物として字を立て、字の中の「日」の隙間(カウンター)だけが内側から灯る。続く「の数だけ」は地平の遠い街並みとして小さく霞む。
// 形の規則: 字形は書体のまま(読めることが最優先。変形しない)。
// 局所改修の記録: v1 = Dela Gothic One+階の線+窓の点 → 字が読めず「箱のビル+点の窓」に戻った(初稿と同じ失敗)。
//   改修1 = 地平の空を明るくして字の輪郭を立てた(読めるようになったが、箱のビルの印象は残る)。
//   改修2 = 書体を Kaisei Tokumin 800(明朝の筆の起筆・はらい=箱にならない輪郭)に替え、階の線と窓をやめて字を「夜の記念碑」にし、足もとに小さな町を置いて大きさを出す。
// clean = 形と面と平らな灯りの色だけ。look = 隙間の光のにじみ・地平の霞・ガラスの照り返しを足す。
const CAND_C = (() => {
  const { W, H, clamp, lerp, smooth, rng, hash, fbm, vnoise, buf, mix, css, horizontal, bbox, pathOf, perPixel, noiseField } = AD;
  const HOR = 930, GROUND = 984;
  const NEAR = { s: "暗闇", x: 70, size: 700 }, FAR = { s: "の数だけ", x: 1440, size: 112 }, FONT = "TOK";
  // 「日」の内側(カウンター)を、字の塗りから求める(書体を替えても使える): 外から塗りつぶして届かない地の部分=字に囲まれた空き。
  // SUNS: 字の枠(em)の中の割合の範囲。その中の空きを「日の中」とみなす
  const SUNS = { "暗": [[0.02, -0.8, 0.38, -0.05], [0.4, -0.36, 0.95, 0.1]], "闇": [[0.3, -0.36, 0.72, 0.1]] };
  function counters(L) {
    return Y_once("cnt" + L.ch + (L.x0 | 0), () => {
      const [x0, y0, x1, y1] = L.bb, w = Math.ceil(x1 - x0) + 8, h = Math.ceil(y1 - y0) + 8, [c, g] = buf("cnt", w, h);
      g.translate(4 - x0, 4 - y0); g.fillStyle = "#fff"; g.beginPath(); pathOf(g, L.cs); g.fill("nonzero");
      const d = g.getImageData(0, 0, w, h).data, lab = new Int32Array(w * h); for (let i = 0; i < w * h; i++) lab[i] = d[i * 4] > 127 ? -1 : 0;
      const flood = (sx, sy, id) => { const st = [sy * w + sx]; lab[sy * w + sx] = id; const px = []; while (st.length) { const p = st.pop(); px.push(p); const x = p % w, y = (p / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const q = ny * w + nx; if (lab[q] === 0) { lab[q] = id; st.push(q); } } } return px; };
      flood(0, 0, 1); const regs = []; let id = 2;
      for (let i = 0; i < w * h; i++) if (lab[i] === 0) { const px = flood(i % w, (i / w) | 0, id++); if (px.length < 30) continue; let a = 1e9, b = 1e9, cc = -1, dd = -1; for (const p of px) { const x = p % w, y = (p / w) | 0; a = Math.min(a, x); b = Math.min(b, y); cc = Math.max(cc, x); dd = Math.max(dd, y); } regs.push({ px, bb: [a + x0 - 4, b + y0 - 4, cc + x0 - 4, dd + y0 - 4], w, h, ox: x0 - 4, oy: y0 - 4 }); }
      return regs;
    });
  }
  const cache = {}; const Y_once = (k, f) => (k in cache ? cache[k] : (cache[k] = f()));
  const regionCanvas = (R, col) => { const [c, g] = buf("rgn", R.w, R.h), img = g.createImageData(R.w, R.h), C = AD.hex(col); for (const p of R.px) { img.data[p * 4] = C[0]; img.data[p * 4 + 1] = C[1]; img.data[p * 4 + 2] = C[2]; img.data[p * 4 + 3] = 255; } g.putImageData(img, 0, 0); return c; };

  const place = (font, s, x, size, bottom) => {
    const L = horizontal(font, s, x, 0, size, size * 0.02);
    return L.map((l) => { const bb = bbox(l.cs), dy = bottom - bb[3]; return { ...l, base: l.base + dy, cs: l.cs.map((c) => c.map(([px, py]) => [px, py + dy])), bb: [bb[0], bb[1] + dy, bb[2], bb[3] + dy] }; });
  };
  const near = () => place(FONT, NEAR.s, NEAR.x, NEAR.size, GROUND);
  const far = () => place(FONT, FAR.s, FAR.x, FAR.size, HOR + 4);

  function sky(g, look) {
    const gr = g.createLinearGradient(0, 0, 0, HOR); gr.addColorStop(0, "#050a14"); gr.addColorStop(0.35, "#0f1d33"); gr.addColorStop(0.72, "#2b4664"); gr.addColorStop(1, "#5a7792"); g.fillStyle = gr; g.fillRect(0, 0, W, HOR);
    // 地面(地平から手前へ)
    const gg = g.createLinearGradient(0, HOR, 0, H); gg.addColorStop(0, "#0c1726"); gg.addColorStop(0.25, "#070d17"); gg.addColorStop(1, "#03060b"); g.fillStyle = gg; g.fillRect(0, HOR, W, H - HOR);
    // 地平の遠い灯り(点ではなく、低い家並みの細い帯)
    for (let x = 0; x < W; x += 3) { const h = 2 + Math.floor(fbm(x * 0.01, 1, 9, 3) * 10); g.fillStyle = "#0a1422"; g.fillRect(x, HOR - h, 3, h); if (hash(x, 3, 4) < 0.05) { g.fillStyle = css(hash(x, 5, 4) < 0.5 ? "#e8b06a" : "#b8c8d8", 0.75); g.fillRect(x, HOR - h + 1 + ((hash(x, 6, 4) * (h - 1)) | 0), 2, 2); } }
  }
  // 字=夜の記念碑: 面の明暗(上がわずかに明るい)と、空の側の縁だけ。階の線・窓は描かない(箱のビルに戻るため。改修2)
  function monument(g, L, { face0, face1, rim, rimA = 0.9 }) {
    const [x0, y0, x1, y1] = L.bb;
    g.save(); g.beginPath(); pathOf(g, L.cs); g.clip("nonzero");
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, face0); gr.addColorStop(1, face1); g.fillStyle = gr; g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    g.restore();
    g.save(); g.strokeStyle = css(rim, rimA); g.lineWidth = 1.8; g.beginPath(); for (const ct of L.cs) for (let i = 1; i < ct.length; i++) { const [ax, ay] = ct[i - 1], [bx, by] = ct[i]; if (bx < ax && Math.abs(by - ay) < Math.abs(bx - ax) * 0.6) { g.moveTo(ax, ay + 1); g.lineTo(bx, by + 1); } } g.stroke(); g.restore();
  }
  // 「日」の中を内側からの灯りで塗る(clean: 平らな色、look: 中心ほど明るい+外へのにじみ)
  function sunHoles(g, L, look, k = 1) {
    const boxes = (SUNS[L.ch] || []).map(([a, b, c, d]) => [L.x0 + a * L.size, L.base + b * L.size, L.x0 + c * L.size, L.base + d * L.size]);
    for (const R of counters(L)) {
      const cx = (R.bb[0] + R.bb[2]) / 2, cy = (R.bb[1] + R.bb[3]) / 2, sun = boxes.some(([a, b, c, d]) => cx > a && cx < c && cy > b && cy < d);
      if (!sun) continue;
      const [rc, rg] = buf("rg2", R.w, R.h); rg.drawImage(regionCanvas(R, "#ffffff"), 0, 0); rg.globalCompositeOperation = "source-in";
      if (look) { const gr = rg.createRadialGradient(cx - R.ox, cy - R.oy, 0, cx - R.ox, cy - R.oy, Math.max(R.bb[2] - R.bb[0], R.bb[3] - R.bb[1]) * 0.7); gr.addColorStop(0, css("#fff0cc", k)); gr.addColorStop(0.45, css("#ffbd62", k)); gr.addColorStop(1, css("#e0702a", k)); rg.fillStyle = gr; } else rg.fillStyle = css("#f4a04a", k);
      rg.fillRect(0, 0, R.w, R.h); g.drawImage(rc, R.ox, R.oy);
      if (look) { g.save(); g.globalCompositeOperation = "lighter"; g.filter = "blur(18px)"; g.globalAlpha = 0.38 * k; g.drawImage(rc, R.ox, R.oy); g.filter = "blur(50px)"; g.globalAlpha = 0.22 * k; g.drawImage(rc, R.ox, R.oy); g.restore(); }
    }
  }
  // 足もとの町(字の大きさを伝える物差し。低い屋根の帯と、数えられるほどの灯り)
  function town(g) {
    const r = rng(77); g.fillStyle = "#060b13"; g.beginPath(); g.moveTo(0, H); let x = 0;
    while (x < W) { const w = 18 + r() * 46, h = 10 + Math.pow(r(), 1.8) * 40, y = GROUND - h; if (r() < 0.4) { g.lineTo(x, y + 8); g.lineTo(x + w / 2, y); g.lineTo(x + w, y + 8); } else { g.lineTo(x, y); g.lineTo(x + w, y); } x += w; }
    g.lineTo(W, H); g.closePath(); g.fill();
    const lights = [[132, 942], [388, 948], [560, 936], [905, 944], [1150, 950], [1372, 940], [1630, 946], [1790, 938]];
    for (const [lx, ly] of lights) { g.fillStyle = "#f0b26a"; g.fillRect(lx, ly, 4, 5); }
  }
  // 足もとの道(1本の細い線): 遠い「の数だけ」の足もとから手前へ来て、「暗」の日の下で止まる。0/45/90 度で折れる
  function road(g, look) {
    const pts = [[1580, HOR + 4], [1580, 1006], [1560, 1026], [800, 1026], [780, 1044], [300, 1044], [270, 1014], [270, GROUND + 6]];
    g.save(); g.lineJoin = "miter"; g.lineCap = "butt";
    if (look) { g.filter = "blur(6px)"; g.strokeStyle = css("#ffb35a", 0.35); g.lineWidth = 8; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); g.filter = "none"; }
    g.strokeStyle = "#f7d9a8"; g.lineWidth = 2.4; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke();
    g.fillStyle = "#f7d9a8"; for (const [x, y] of [[1580, 1006], [800, 1026], [270, GROUND + 6]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.fillStyle = "#03060b"; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); g.fillStyle = "#f7d9a8"; }
    g.restore();
    // 地面への字の映り(床の照り返し): 字の下の地面に、日の隙間の色がわずかに落ちる
    if (look) for (const x of [210, 515, 1125]) { g.save(); g.globalCompositeOperation = "lighter"; const gr = g.createRadialGradient(x, GROUND, 0, x, GROUND, 150); gr.addColorStop(0, css("#ff9a3c", 0.16)); gr.addColorStop(1, css("#ff9a3c", 0)); g.fillStyle = gr; g.fillRect(x - 150, GROUND, 300, 150); g.restore(); }
  }
  function finish(ctx) { // 紙ではなく印刷物の平らさを保つ: ごく弱い粒と周辺の暗さだけ
    const [o, og] = buf("outC"); og.drawImage(ctx.canvas, 0, 0);
    perPixel(o, (x, y, r, gg, b) => { const n = (hash(x, y, 13) - 0.5) * 6, v = 1 - 0.22 * Math.pow(Math.hypot((x - W / 2) / W, (y - H / 2) / H) * 1.6, 2.4); return [(r + n) * v, (gg + n) * v, (b + n) * v]; });
    ctx.drawImage(o, 0, 0);
  }

  return function draw(ctx, { look }) {
    const [c, g] = buf("C");
    sky(g, look);
    far().forEach((L) => monument(g, L, { face0: "#1c2f46", face1: "#16273b", rim: "#6f8eaa", rimA: 0.6 }));
    near().forEach((L) => { monument(g, L, { face0: "#0d1724", face1: "#03070c", rim: "#5d7d9c" }); sunHoles(g, L, look, L.ch === "暗" ? 1 : 0.85); });
    town(g); road(g, look);
    ctx.drawImage(c, 0, 0);
    if (look) finish(ctx);
  };
})();
