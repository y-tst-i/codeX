// 案A+C(木版画+字の中の日)の 53 秒ボード v3 用の静止画(v5)の共通部品。cand_a4.js 以前は変えない。
// 独立審査(INDEPENDENT_REVIEW_board_v2.md)の必須修正に合わせて、v4 から次を変えた:
//   ①乱数は「位置の hash」: 刀1本ごとの値は (カット, 層, 要素の番号・行と列) だけで決まる(PR)。呼び出し順の乱数(rng)は使わない。
//     彫りの進み(p)は「その刀を描くか」だけを決め、刀の位置・長さ・太さは変えない → コマを進めても既に彫った刀は入れ替わらない。
//   ②回路の線は「刀で彫った溝」(groove): 根元が太く先が細る、角は刀を2回入れて行き過ぎが残る、ふちの欠け、先のささくれ。丸い端子は使わない。
//   ③字形は点列のまま滑らかに(Douglas-Peucker の面取りをやめ、2px で取り直して低い周波数のゆれだけ)。字間は墨の幅でそろえる(setH / setV)。
//   ④刷り: 暗い版の look は横のぶれ(横に伸ばしたノイズ)をやめ、木目(年輪の線)と墨のむら(等方)にした。
//     色版は「平ら」か「粒のあるぼかし摺り(直線のぼかし、境目がまっすぐ)」だけ。放射状のなめらかなグラデーションは使わない。
//   ⑤紙のふち(額縁)は S6 と夜明けでは外す(全面)。
// 約束: 絵は引数(コマ番号 f、look、彫りの進み p)だけで決まる。作業 canvas は毎回 reset(common.js の buf)。Math.random・Date.now は使わない。
const A5 = (() => {
  const { W, H, clamp, lerp, smooth, hash, fbm, vnoise, buf, mix, hex, G, contours, bbox, pathOf, resample, stroke, perPixel, noiseField } = AD;
  const C = { INK: "#14171f", INK_DAWN: "#2b2033", PAPER: "#ece3cd", AMBER: "#e2742a", ROSE: "#d66f8c", HONEY: "#f0c27c", AI: "#262f46" };
  const FRAME = { x0: 56, y0: 46, x1: 1864, y1: 1034, framed: true };
  const BLEED = { x0: 0, y0: 0, x1: W, y1: H, framed: false };

  // ===== 位置の hash =====
  // PR(cut, layer, i, j) は、その要素だけの短い乱数列を返す。値は (cut, layer, i, j) と、その要素の中で何番目に引いたかだけで決まる
  const PR = (cut, layer, i, j = 0) => { const s = (hash(i | 0, (j | 0) + layer * 100003, cut * 7919 + 11) * 2147483647) | 0; let n = 0; return () => hash(n++, s, 4099); };

  // ===== 版木 =====
  function blockPath(g, B) {
    if (!B.framed) { g.rect(-10, -10, W + 20, H + 20); return; }
    const pts = [], step = 8, n = (a, s) => (fbm(a * 0.02, s, 41, 3) - 0.5) * 7 + (hash(a | 0, s, 7) < 0.03 ? -4 : 0);
    for (let x = B.x0; x <= B.x1; x += step) pts.push([x, B.y0 + n(x, 1)]);
    for (let y = B.y0; y <= B.y1; y += step) pts.push([B.x1 + n(y, 2), y]);
    for (let x = B.x1; x >= B.x0; x -= step) pts.push([x, B.y1 + n(x, 3)]);
    for (let y = B.y1; y >= B.y0; y -= step) pts.push([B.x0 + n(y, 4), y]);
    g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath();
  }
  // マスク: 白=彫った所(紙)、黒=彫り残し(墨)。版木の外は紙
  function begin(B, name = "maskA5") { const [m, g] = buf(name); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.save(); g.beginPath(); blockPath(g, B); g.fillStyle = "#000"; g.fill(); g.clip(); return [m, g]; }
  const plateBuf = (name) => { const [c, g] = buf(name); g.fillStyle = "#000"; return [c, g]; };
  const poly = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };

  // ===== 刀 =====
  // 背景の刀(地紋): 入りと抜きが細る。seed は位置から作る
  function cut(g, spine, w, seed, { entry = 0.08, exit = 0.4, jit = 0.6 } = {}) {
    const sp = resample(spine, 3); if (sp.length < 2) return;
    g.beginPath();
    stroke(g, sp, (u, i) => { const a = u < entry ? 0.55 + 0.45 * (u / entry) : 1, b = u > 1 - exit ? Math.pow((1 - u) / exit, 0.75) : 1; return w * a * b * (0.86 + 0.28 * vnoise(i * 0.15, seed * 0.37, 5)); }, { jit, seed });
    g.fill();
  }
  // 太さが w0 → w1 に変わる刀
  function cutW(g, spine, w0, w1, seed, jit = 0.7) { const sp = resample(spine, 3); if (sp.length < 2) return; g.beginPath(); stroke(g, sp, (u, i) => lerp(w0, w1, u) * (0.9 + 0.2 * vnoise(i * 0.15, seed * 0.37, 5)), { jit, seed }); g.fill(); }
  // 楔(くさび)の刀: 根元 a で幅 wa、先 b で幅 wb。少し反る(bend)。丸刀・平刀で一気に彫った面
  function wedge(g, a, b, wa, wb, seed, bend = 0, jit = 1.2) {
    const n = 14, sp = [], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (let i = 0; i <= n; i++) { const u = i / n, o = bend * L * 4 * u * (1 - u); sp.push([a[0] + dx * u + nx * o, a[1] + dy * u + ny * o]); }
    g.beginPath(); stroke(g, resample(sp, 4), (u, i) => lerp(wa, wb, Math.pow(u, 0.9)) * (0.93 + 0.14 * vnoise(i * 0.2, seed * 0.31, 6)), { jit, seed }); g.fill();
  }
  // 刀で彫った溝(回路の線)。pts は手で決めた折れ線。根元 w0 → 先 w1(先は尖る)。
  // 角では刀を2回入れる: 前の刀は角を少し行き過ぎ(ov×太さ)、次の刀は角の少し手前から入る(彫った人の手の跡)。
  // ふちの欠け(chip: 長さ 100px あたりの数)と、先のささくれ。端に丸い端子は付けない
  function groove(g, pts, { w0 = 9, w1 = 1.2, seed = 1, chip = 2.2, ov = 0.9, splinter = true, taper = 0.16 } = {}) {
    const segs = []; let L = 0;
    for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) continue; segs.push({ a, b, l, u0: L }); L += l; }
    const wAt = (s) => { const u = s / L; let w = lerp(w0, w1, Math.pow(u, 0.85)); if (u > 1 - taper) w *= Math.pow((1 - u) / taper, 0.7); if (u < 0.03) w *= 0.8 + 6.6 * u; return Math.max(0, w); };
    segs.forEach((S, k) => {
      const dx = (S.b[0] - S.a[0]) / S.l, dy = (S.b[1] - S.a[1]) / S.l, last = k === segs.length - 1, first = k === 0;
      const back = first ? 0 : wAt(S.u0) * 0.35, fwd = last ? 0 : wAt(S.u0 + S.l) * ov * (0.6 + 0.6 * hash(k, 1, seed));
      const A = [S.a[0] - dx * back, S.a[1] - dy * back], B = [S.b[0] + dx * fwd, S.b[1] + dy * fwd], len = S.l + back + fwd;
      const sp = resample([A, B], 2.5);
      g.beginPath(); stroke(g, sp, (u, i) => { const s = S.u0 - back + u * len; let w = wAt(clamp(s, 0, L)); if (!last && s > S.u0 + S.l) w *= 1 - 0.55 * (s - S.u0 - S.l) / (fwd + 1e-6); if (!first && s < S.u0) w *= 0.7 + 0.3 * (1 - (S.u0 - s) / (back + 1e-6)); return w * (0.9 + 0.2 * vnoise(i * 0.11, seed * 0.29 + k, 5)); }, { jit: 0.5 + 0.05 * w0, seed: seed * 7 + k });
      g.fill();
      // ふちの欠け: 縁から外へ小さい三角(木が刀の脇で欠けた所)
      const nc = Math.round((S.l / 100) * chip * (0.6 + 0.8 * hash(k, 2, seed)));
      for (let c = 0; c < nc; c++) {
        const t = 0.08 + 0.84 * hash(k * 31 + c, 3, seed), s = S.u0 + t * S.l, w = wAt(s) / 2; if (w < 1.2) continue;
        const side = hash(k * 31 + c, 4, seed) < 0.5 ? -1 : 1, nx = -dy * side, ny = dx * side, cx = S.a[0] + dx * t * S.l, cy = S.a[1] + dy * t * S.l;
        const bl = w * (1.4 + 2.2 * hash(k * 31 + c, 5, seed)), dep = w * (0.35 + 0.65 * hash(k * 31 + c, 6, seed)), sk = (hash(k * 31 + c, 7, seed) - 0.3) * bl;
        g.beginPath(); poly(g, [[cx - dx * bl / 2 + nx * (w - 0.5), cy - dy * bl / 2 + ny * (w - 0.5)], [cx + dx * sk + nx * (w + dep), cy + dy * sk + ny * (w + dep)], [cx + dx * bl / 2 + nx * (w - 0.5), cy + dy * bl / 2 + ny * (w - 0.5)]]); g.fill();
      }
    });
    if (splinter && segs.length) { // 先のささくれ: 先の手前から細い三角が斜め前へ
      const S = segs[segs.length - 1], dx = (S.b[0] - S.a[0]) / S.l, dy = (S.b[1] - S.a[1]) / S.l, wb = Math.max(1.5, wAt(L * 0.8));
      for (let k = 0; k < 2; k++) {
        const side = k ? -1 : 1, px = -dy * side, py = dx * side, back = (6 + 14 * hash(k, 8, seed)) * Math.min(1.6, wb / 3), l = 5 + 8 * hash(k, 9, seed), a = 0.22 + 0.25 * hash(k, 10, seed);
        const bx = S.b[0] - dx * back + px * wb * 0.35, by = S.b[1] - dy * back + py * wb * 0.35, ux = dx * Math.cos(a) + px * Math.sin(a), uy = dy * Math.cos(a) + py * Math.sin(a);
        g.beginPath(); poly(g, [[bx - px * 0.8, by - py * 0.8], [bx + ux * l, by + uy * l], [bx + dx * 3, by + dy * 3]]); g.fill();
      }
    }
    return L;
  }
  // 三角刀の突き(刀の当たり): 端子の代わり。向き ang に、長さ l の細い三角
  function stab(g, x, y, ang, l, w, seed) { const dx = Math.cos(ang), dy = Math.sin(ang), j = (hash(1, 2, seed) - 0.5) * 0.6; g.beginPath(); poly(g, [[x - dy * w / 2, y + dx * w / 2], [x + dx * l + j, y + dy * l - j], [x + dy * w / 2, y - dx * w / 2], [x - dx * w * 0.3, y - dy * w * 0.3]]); g.fill(); }
  // レンズ形の短い横の刀(両端が尖る。水面の映り)
  function lens(g, x, y, hw, th, seed, tilt = 0) {
    const n = Math.max(3, Math.round(hw / 3)), sp = [];
    for (let i = 0; i <= n; i++) { const u = i / n; sp.push([x - hw + 2 * hw * u, y + tilt * (u - 0.5)]); }
    g.beginPath(); stroke(g, sp, (u) => th * Math.pow(Math.sin(Math.PI * u), 0.65), { jit: 0.35, seed }); g.fill();
  }
  // 刀の欠けのある輪郭(辺ごとに、長い直線のままの所と、大きめの欠けをいくつか。規則的な細かいゆれにしない)
  function chipEdge(P, s, { big = 0.5, amp = 0.6 } = {}) {
    const out = [];
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push(a); if (L < 30) continue;
      const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, nc = Math.floor((L / 160) * big * 2 * hash(k, 1, s) + (hash(k, 2, s) < big ? 1 : 0));
      const ts = []; for (let c = 0; c < nc; c++) ts.push(0.12 + 0.76 * hash(k * 13 + c, 3, s)); ts.sort((p, q) => p - q);
      for (const [c, t] of ts.entries()) { const l = 10 + 26 * hash(k * 13 + c, 4, s), d = 3 + 7 * hash(k * 13 + c, 5, s), x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, sk = hash(k * 13 + c, 6, s); out.push([x - ux * l / 2 + nx * amp, y - uy * l / 2 + ny * amp], [x + ux * l * (sk - 0.5) + nx * d, y + uy * l * (sk - 0.5) + ny * d], [x + ux * l / 2, y + uy * l / 2]); }
    }
    out.push(P[P.length - 1]); return out;
  }

  // ===== 字 =====
  const inkCache = {};
  const inkBox = (font, ch) => { const k = font + ch; if (!inkCache[k]) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const ct of G(font, ch).c) for (let i = 0; i < ct.p.length; i += 2) { a = Math.min(a, ct.p[i]); c = Math.max(c, ct.p[i]); b = Math.min(b, ct.p[i + 1]); d = Math.max(d, ct.p[i + 1]); } inkCache[k] = [a, b, c, d]; } return inkCache[k]; };
  const letter = (font, ch, x0, base, size) => ({ ch, size, x0, base, cs: contours(font, ch, x0, base, size) });
  // 横組み: 墨の幅で詰め、字と字の間(墨と墨の間)を gap×size にそろえる。x = 最初の字の墨の左端。読点の後ろは少し空ける
  function setH(font, str, x, base, size, gap = 0.12) { const out = []; let cx = x; for (const ch of str) { const b = inkBox(font, ch); out.push(letter(font, ch, cx - b[0] * size, base, size)); cx += (b[2] - b[0]) * size + gap * size * (ch === "、" ? 2.2 : 1); } return out; }
  const widthH = (font, str, size, gap = 0.12) => { let w = 0; const a = [...str]; a.forEach((ch, i) => { const b = inkBox(font, ch); w += (b[2] - b[0]) * size + (i < a.length - 1 ? gap * size * (ch === "、" ? 2.2 : 1) : 0); }); return w; };
  const setHC = (font, str, cx, base, size, gap = 0.12) => setH(font, str, cx - widthH(font, str, size, gap) / 2, base, size, gap);
  // 縦組み: 字の墨の上端を cursor に、墨の中心を cx に。字間(墨と墨の間)を gap×size。読点は前の字の右下(縦組みの位置)
  function setV(font, str, cx, top, sizes, gap = 0.1) {
    const out = []; let cy = top;
    for (const [ci, ch] of [...str].entries()) {
      const b = inkBox(font, ch), size = Array.isArray(sizes) ? sizes[ci] : sizes;
      if (ch === "、") { const ox = cx + 0.22 * size - ((b[0] + b[2]) / 2) * size, base = cy - gap * size * 0.6 - b[1] * size; out.push(letter(font, ch, ox, base, size)); cy += (b[3] - b[1]) * size + gap * size * 0.4; continue; }
      const x0 = cx - ((b[0] + b[2]) / 2) * size, base = cy - b[1] * size; out.push(letter(font, ch, x0, base, size)); cy += (b[3] - b[1]) * size + gap * size;
    }
    return out;
  }
  const lettersBox = (Ls) => bbox(Ls.flatMap((L) => L.cs));
  // 字の輪郭を滑らかなまま彫る: 2px で取り直し、輪郭の法線方向に低い周波数のゆれ(±amp px)と、まれな小さい欠け
  function soften(cs, amp, s) {
    return cs.map((ct, k) => {
      const p = resample(ct, 2), n = p.length, out = [];
      for (let i = 0; i < n; i++) { const a = p[(i - 2 + n) % n], b = p[(i + 2) % n]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const e = amp * (vnoise(i * 0.07, k * 3.1, s) - 0.5) * 2 - (hash((i / 5) | 0, k, s) < 0.012 ? 1.3 : 0); out.push([p[i][0] - ty * e, p[i][1] + tx * e]); }
      return out;
    });
  }
  function carve(g, letters, seed, col = "#fff", amp = 0.7) { g.fillStyle = col; letters.forEach((L, i) => { g.beginPath(); pathOf(g, soften(L.cs, amp * Math.min(1.4, L.size / 120), seed + i)); g.fill("nonzero"); }); }
  function keepOut(g, letters, lw = 34, col = "#000") { g.fillStyle = col; g.strokeStyle = col; g.lineJoin = "round"; g.lineWidth = lw; for (const L of letters) { g.beginPath(); pathOf(g, L.cs); g.stroke(); g.fill("nonzero"); } }
  function letterPlate(pg, L, { rect, contour }) {
    pg.save(); pg.beginPath();
    if (rect) { const [a, b, c, d] = rect; pg.rect(L.x0 + a * L.size, L.base + b * L.size, (c - a) * L.size, (d - b) * L.size); pg.clip(); pg.beginPath(); pathOf(pg, L.cs); pg.fill("nonzero"); }
    else { pathOf(pg, [L.cs[contour]]); pg.fill("nonzero"); }
    pg.restore();
  }
  // 字の置き場所の検査: 版木のふち(全面なら画面のふち)から 横 6%・縦 6% 以上離れているか
  function textMargin(Ls, B) { if (!Ls.length) return null; const b = lettersBox(Ls), mx = 0.06 * W, my = 0.06 * H; const d = [b[0] - B.x0, B.x1 - b[2], b[1] - B.y0, B.y1 - b[3]]; return { box: b.map(Math.round), min_lr: Math.round(Math.min(d[0], d[1])), min_tb: Math.round(Math.min(d[2], d[3])), ok: d[0] >= mx && d[1] >= mx && d[2] >= my && d[3] >= my }; }

  // ===== 色版の道具 =====
  // 直線のぼかし摺り: (x0,y0) で濃さ a0、(x1,y1) で a1。その外は端の濃さのまま(境目はまっすぐ)。なめらかさは刷りで粒にする
  function bokashi(pg, x0, y0, x1, y1, stops, clip) {
    const gr = pg.createLinearGradient(x0, y0, x1, y1); for (const [t, a] of stops) gr.addColorStop(t, `rgba(0,0,0,${a})`);
    pg.save(); if (clip) { pg.beginPath(); clip(pg); pg.clip(); } pg.fillStyle = gr; pg.fillRect(-10, -10, W + 20, H + 20); pg.restore();
  }

  // ===== 刷り =====
  // plates = [{ c, color, kind: "flat"|"bokashi", shift }]。版の不透明度=摺りの濃さ。色版は彫った所(紙)にだけ乗る。
  // look: 墨は木目(年輪の線、grain の向き)と墨のむら(等方)。横に伸ばしたノイズ(デジタルのぶれ)は使わない。
  // ぼかし摺りは粒(紙の繊維の細かいむら)で中間の濃さを割る(エアブラシのなめらかさにしない)。粒は look でも clean でも同じ(版の性質)
  function print(ctx, mask, plates, { look, B = FRAME, ink = C.INK, paper = C.PAPER, grain = -0.05, wood = 1, cut: cutId = 0 }) {
    const inkc = hex(ink), pap = hex(paper);
    const P = plates.map((p) => ({ d: p.c.getContext("2d").getImageData(0, 0, W, H).data, col: hex(p.color), sh: look ? (p.shift || [-3, 2]) : [0, 0], bok: p.kind === "bokashi", n: 0, name: p.color, kind: p.kind || "flat" }));
    const [o, og] = buf("out"); og.drawImage(mask, 0, 0);
    const md = mask.getContext("2d").getImageData(0, 0, W, H).data;
    const [bk, bkg] = buf("blockOnly"); bkg.beginPath(); blockPath(bkg, B); bkg.fillStyle = "#fff"; bkg.fill(); const kd = bkg.getImageData(0, 0, W, H).data;
    let bd = md; if (look) { const [b, bg] = buf("blur"); bg.filter = "blur(0.9px)"; bg.drawImage(mask, 0, 0); bd = bg.getImageData(0, 0, W, H).data; }
    const cs = Math.cos(grain), sn = Math.sin(grain), so = 61 + cutId * 3;
    const warp = noiseField(W, H, 6, (x, y) => { const u = x * cs + y * sn, v = -x * sn + y * cs; return 44 * (fbm(u * 0.0006, v * 0.0014, so, 3) - 0.5) + 5 * (fbm(u * 0.003, v * 0.008, so + 1, 2) - 0.5); });
    const pres = noiseField(W, H, 8, (x, y) => { const u = x * cs + y * sn, v = -x * sn + y * cs; return fbm(u * 0.0025, v * 0.012, so + 2, 2); });
    const blot = noiseField(W, H, 8, (x, y) => fbm(x * 0.005, y * 0.005, 62, 4));
    const fiber = noiseField(W, H, 3, (x, y) => fbm(x * 0.05, y * 0.05, 63, 3));
    const edge = noiseField(W, H, 3, (x, y) => vnoise(x * 0.35, y * 0.35, 64));
    const gran = noiseField(W, H, 2, (x, y) => 0.7 * vnoise(x * 0.33, y * 0.33, 65) + 0.3 * vnoise(x * 0.11, y * 0.11, 66));
    const blot2 = noiseField(W, H, 8, (x, y) => fbm(x * 0.009 + 50, y * 0.009, 67, 3));
    let inBlock = 0, carved = 0, plated = 0, sr = 0, sg = 0, sb = 0;
    perPixel(o, (x, y) => {
      const i = (y * W + x) * 4; let v = bd[i] / 255; const inside = kd[i + 3] > 127;
      if (inside) { inBlock++; if (md[i] > 127) carved++; }
      if (look) { const t = 0.5 + (edge(x, y) - 0.5) * 0.42; v = smooth((v - (t - 0.1)) / 0.2); } else v = v > 0.5 ? 1 : 0;
      let ic = inkc, pp = pap;
      if (look) {
        const u = x * cs + y * sn, vv = -x * sn + y * cs, wv = vv + warp(x, y), ring = ((wv / 12 + 1.6 * pres(x, y)) % 1 + 1) % 1, line = Math.pow(1 - Math.min(ring, 1 - ring) * 2, 7) * smooth((pres(x + 400, y) - 0.35) * 3);
        const lift = wood * 0.075 * line + (blot(x, y) - 0.5) * 0.11 + (hash((x / 2) | 0, (y / 2) | 0, 71) < 0.0006 ? 0.3 : 0);
        ic = mix(inkc, pap, clamp(lift, 0, 0.5) * 0.55 + 0.02);
        const f = (fiber(x, y) - 0.5) * 0.09; pp = [pap[0] * (1 + f), pap[1] * (1 + f), pap[2] * (1 + f * 1.2)];
      }
      let c = mix(ic, pp, v), any = false, pw = 0;
      if (look) { const wv2 = -x * sn + y * cs + warp(x + 300, y + 200) * 1.3, r2 = ((wv2 / 17 + 2.4 * pres(x + 700, y)) % 1 + 1) % 1; pw = Math.pow(1 - Math.min(r2, 1 - r2) * 2, 5) * smooth((pres(x + 900, y + 50) - 0.32) * 2.5); } // 色版の版木の木目
      if (inside) for (const p of P) {
        const px = x + p.sh[0], py = y + p.sh[1]; if (px < 0 || py < 0 || px >= W || py >= H) continue;
        let pv = p.d[(py * W + px) * 4 + 3] / 255; if (pv <= 0) continue;
        if (p.bok) pv = clamp(pv + (gran(x, y) - 0.5) * 1.5 * pv * (1 - pv));
        const k = pv * v * (look ? (0.95 + 0.1 * (blot2(x, y) - 0.5)) * (1 - 0.075 * pw) : 1);
        if (k > 0.5) { any = true; p.n++; }
        c = [lerp(c[0], (c[0] * p.col[0]) / 255, k), lerp(c[1], (c[1] * p.col[1]) / 255, k), lerp(c[2], (c[2] * p.col[2]) / 255, k)];
      }
      if (any) plated++;
      sr += c[0]; sg += c[1]; sb += c[2];
      return c;
    });
    ctx.drawImage(o, 0, 0);
    const N = W * H, amber = P.filter((p) => p.name === C.AMBER).reduce((s, p) => s + p.n, 0);
    return { carved_in_block: +(carved / inBlock).toFixed(4), plate_of_frame: +(plated / N).toFixed(4), amber_of_frame: +(amber / N).toFixed(4), plates: P.length + 1, plate_each: P.map((p) => [p.name, p.kind, +(p.n / N).toFixed(4)]), mean_rgb: [sr / N, sg / N, sb / N].map((v) => Math.round(v)), framed: B.framed };
  }
  // 彫りのマスクだけを返す(彫りの進みの検査用。v=mask)
  function maskOnly(ctx, mask) { ctx.drawImage(mask, 0, 0); return { mask: true }; }

  return { C, FRAME, BLEED, PR, blockPath, begin, plateBuf, poly, cut, cutW, wedge, groove, stab, lens, chipEdge, inkBox, letter, setH, setHC, setV, widthH, lettersBox, soften, carve, keepOut, letterPlate, textMargin, bokashi, print, maskOnly };
})();
