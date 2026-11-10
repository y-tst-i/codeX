// 案A+C の動き(v7、動きの本制作 第1段)の共通部品。cand_a6.js(v6)を写した。cand_a6.js 以前は変えない。
// cand_a6.js と同じ名前 A6 を返す(cand_a6_cuts.js・cand_a6_dawn.js をそのまま読めるように)。v7 のページでは cand_a6.js を読まずにこれを読む。
// v6 と同じ引数なら同じ画素(print の中の位置だけの表を、カットごとに1回だけ作って使い回すだけ。検査: v6 と v7 のページで同じコマの md5 が一致)。
// v7 で足した物:
//   ・print の sheet(紙の取り替え: 紙のスキャンを左右・上下に返して「新しい紙」にする。0 = v6 と同じ)と keyShift(墨の版だけを紙と色版からずらす=版ずれ)
//   ・動きの部品(MO): 今のコマ F、刃先が進む刀(cutT・wedgeT・lensT・grooveT)、字を彫る(粗彫り→仕上げ。帯の幅を揺らす)、ばれんの1回で刷る(baren)。
//     どれも「全部を描いた形のうち、刃先(またはばれん)が通った所だけ」を出すので、進めても既に彫った所は墨に戻らない。
//   約束は v6 と同じ: 絵はコマ番号 f と look だけで決まる。Math.random・Date.now・前のコマの状態は使わない。
// 以下は cand_a6.js の注記:
// 案A+C(木版画+字の中の日)の 53 秒ボード v4 用の静止画(v6)の共通部品。cand_a5.js(v5)をもとにした。cand_a5.js 以前は変えない。
// v6(INDEPENDENT_REVIEW_board_v3 の必須修正): 刷りの層を CC0 の紙のスキャン(繊維と斑)+ばれんのむらに替え、画素ごとの白色ノイズの粒と色版の等間隔の木目を外した(print)。
//   丸刀でえぐった縁(scallop)、雲・霞の帯(bandPoly)、信号の道(signalBuf: 道の形は固定、届いた長さだけ f で決める)、字のまわりの線を抜く(avoidBoxes)を足した。
// 以下は v5 の記録:
// 独立審査(INDEPENDENT_REVIEW_board_v2.md)の必須修正に合わせて、v4 から次を変えた:
//   ①乱数は「位置の hash」: 刀1本ごとの値は (カット, 層, 要素の番号・行と列) だけで決まる(PR)。呼び出し順の乱数(rng)は使わない。
//     彫りの進み(p)は「その刀を描くか」だけを決め、刀の位置・長さ・太さは変えない → コマを進めても既に彫った刀は入れ替わらない。
//   ②回路の線は「刀で彫った溝」(groove): 根元が太く先が細る、角は刀を2回入れて行き過ぎが残る、ふちの欠け、先のささくれ。丸い端子は使わない。
//   ③字形は点列のまま滑らかに(Douglas-Peucker の面取りをやめ、2px で取り直して低い周波数のゆれだけ)。字間は墨の幅でそろえる(setH / setV)。
//   ④刷り: 暗い版の look は横のぶれ(横に伸ばしたノイズ)をやめ、木目(年輪の線)と墨のむら(等方)にした。
//     色版は「平ら」か「粒のあるぼかし摺り(直線のぼかし、境目がまっすぐ)」だけ。放射状のなめらかなグラデーションは使わない。
//   ⑤紙のふち(額縁)は S6 と夜明けでは外す(全面)。
// 約束: 絵は引数(コマ番号 f、look、彫りの進み p)だけで決まる。作業 canvas は毎回 reset(common.js の buf)。Math.random・Date.now は使わない。
const A6 = (() => {
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

  // ===== v6: 丸刀で彫った縁・信号の道 =====
  // 閉じた形 P の輪郭を「丸刀のえぐり」の連なりにする: 輪郭を 30〜90px ごとの区間に分け、区間ごとに内側へ浅い弧(深さ 2〜7px)でえぐる。
  // 区間の境目は外へ小さく尖る(刀と刀の間に残った木)。まれに深い欠け。ベクターのなめらかな縁にしない。値は (seed, 区間の番号) の hash
  function scallop(P, seed, { step = [30, 90], depth = [2, 7], chip = 0.08 } = {}) {
    let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; }
    const sg = A > 0 ? 1 : -1, D = resample(P.concat([P[0]]), 2), n = D.length, cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(D[i][0] - D[i - 1][0], D[i][1] - D[i - 1][1]));
    const L = cum[n - 1], out = []; let s0 = 0, k = 0, i = 0;
    while (s0 < L - 1) {
      const R = PR(seed, 77, k++), len = Math.min(L - s0, lerp(step[0], step[1], R())), deep = R() < chip, d = lerp(depth[0], depth[1], R()) * (deep ? 2.4 : 1) * (deep ? 0.6 + 0.4 * R() : 1), s1 = s0 + (deep ? len * 0.45 : len);
      while (i < n - 1 && cum[i] < s1) {
        const a = D[Math.max(0, i - 2)], b = D[Math.min(n - 1, i + 2)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1, t = clamp((cum[i] - s0) / (s1 - s0 || 1));
        const off = d * 4 * t * (1 - t) * sg; out.push([D[i][0] - (ty / tl) * off, D[i][1] + (tx / tl) * off]); i++;
      }
      s0 = s1;
    }
    return out;
  }
  // 帯(雲・霞)の外形の多角形: 両端が細り、太さは位置の hash のゆれ
  function bandPoly(x0, x1, y, th, seed, wav = 5) {
    const sp = []; for (let x = x0; x <= x1; x += 12) sp.push([x, y + wav * Math.sin((x - x0) * 0.006 + seed)]);
    const n = sp.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) { const u = i / (n - 1), w = (th / 2) * Math.pow(Math.sin(Math.PI * clamp(u * 1.02)), 0.45) * (0.55 + 0.9 * vnoise(i * 0.06, seed * 0.13, 8)); Lp.push([sp[i][0], sp[i][1] - w * (0.7 + 0.6 * vnoise(i * 0.11, seed, 3))]); Rp.push([sp[i][0], sp[i][1] + w * (0.7 + 0.6 * vnoise(i * 0.11, seed + 5, 3))]); }
    return Lp.concat(Rp.reverse());
  }
  // 折れ線の長さと、長さ s の所の点
  function polyLen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
  function splitAt(P, s) { let acc = 0; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + l >= s) { const t = (s - acc) / (l || 1), q = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; return { head: P.slice(0, i).concat([q]), tail: [q].concat(P.slice(i)), at: q, dir: [(b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)] }; } acc += l; } const n = P.length; return { head: P.slice(), tail: [P[n - 1], P[n - 1]], at: P[n - 1], dir: [1, 0] }; }
  // 信号の道: 道 path 全体を溝(groove)で彫った形を作り、まだ届いていない所(長さ s より先)を消す。溝の形は s に依らない(届いた所は入れ替わらない)。
  // 先頭には三角刀の突き(前へ尖る)。戻り値の canvas を、彫りのマスクには白で、琥珀の版にはそのまま重ねる
  function signalBuf(name, path, s, o = {}) {
    const [c, g] = buf(name); g.fillStyle = "#fff"; const L = groove(g, path, Object.assign({ w0: 6, w1: 3, seed: 1, chip: 1.2, splinter: false, taper: 0.03 }, o));
    if (s < L - 0.5) {
      const sp = splitAt(path, Math.max(0, s)); g.globalCompositeOperation = "destination-out"; g.lineWidth = (o.w0 || 6) * 2.4 + 8; g.lineCap = "butt"; g.lineJoin = "miter"; g.strokeStyle = "#000";
      g.beginPath(); g.moveTo(sp.tail[0][0], sp.tail[0][1]); for (const q of sp.tail) g.lineTo(q[0], q[1]); g.stroke(); g.globalCompositeOperation = "source-over";
      if (s > 4) { const w = lerp(o.w0 || 6, o.w1 || 3, s / L) * 0.8, [dx, dy] = sp.dir, [x, y] = sp.at; g.beginPath(); poly(g, [[x - dx * 10 - dy * w / 2, y - dy * 10 + dx * w / 2], [x + dx * 9, y + dy * 9], [x - dx * 10 + dy * w / 2, y - dy * 10 - dx * w / 2]]); g.fill(); }
    }
    return [c, L];
  }
  // 折れ線から、箱(字の墨の箱を margin 広げた物)に入る所を抜いて、区間の配列にする(字と線を離す)
  function avoidBoxes(P, boxes, margin = 24, step = 4) {
    const sp = resample(P, step), out = []; let cur = [];
    const inside = (q) => boxes.some((b) => q[0] > b[0] - margin && q[0] < b[2] + margin && q[1] > b[1] - margin && q[1] < b[3] + margin);
    for (const q of sp) { if (inside(q)) { if (cur.length > 2) out.push(cur); cur = []; } else cur.push(q); }
    if (cur.length > 2) out.push(cur); return out;
  }

  // ===== 紙(CC0 のスキャン) =====
  // assets/paper_acg_Paper006_gray.jpg(ambientCG Paper006、CC0 1.0。輝度だけ、1920×1080 の切り抜き)を、ページが読み込んでから setPaper で渡す。
  // z = (輝度 - 平均) / 標準偏差(繊維と斑)。zL = z を 7px でぼかした物(斑)、zH = z - zL(繊維)。無ければ 0(紙の層なし)
  let PAPER = null;
  function setPaper(img) {
    const [c, g] = buf("paperSrc"); g.drawImage(img, 0, 0, W, H); const d = g.getImageData(0, 0, W, H).data;
    const [c2, g2] = buf("paperBlur"); g2.filter = "blur(7px)"; g2.drawImage(img, -40, -40, W + 80, H + 80); g2.filter = "none"; // 端の暗くなりを避けて少し大きく描く(繊維の位置は z と 2% ずれるが斑だけに使う)
    const dl = g2.getImageData(0, 0, W, H).data, N = W * H, z = new Float32Array(N), zl = new Float32Array(N);
    let s = 0, s2 = 0; for (let i = 0; i < N; i++) { const v = d[i * 4]; s += v; s2 += v * v; }
    const mean = s / N, sd = Math.sqrt(s2 / N - mean * mean) || 1;
    let sl = 0; for (let i = 0; i < N; i++) sl += dl[i * 4]; const meanL = sl / N;
    for (let i = 0; i < N; i++) { z[i] = (d[i * 4] - mean) / sd; zl[i] = (dl[i * 4] - meanL) / sd; }
    PAPER = { z, zl, mean, sd };
    return { mean: +mean.toFixed(2), sd: +sd.toFixed(3) };
  }
  // ばれんの擦りむら: 手のひらほどの円弧(半径 120〜260px、帯の幅 40〜100px のぼんやりした帯)で、摺りの圧が少し強い所。位置は格子の hash(カットごと)
  function barenField(cutId) {
    const cell = 230, arcs = [];
    for (let j = -1; j <= Math.ceil(H / cell); j++) for (let i = -1; i <= Math.ceil(W / cell); i++) { const R = PR(900 + cutId, 1, i, j); for (let k = 0; k < 2; k++) arcs.push({ x: (i + R()) * cell, y: (j + R()) * cell, r: 120 + 140 * R(), w: 40 + 60 * R(), a0: R() * 6.283, span: 1.2 + 2.2 * R(), amp: (R() - 0.35) }); }
    return noiseField(W, H, 6, (x, y) => { let v = 0; for (const A of arcs) { const dx = x - A.x, dy = y - A.y, r = Math.hypot(dx, dy); if (Math.abs(r - A.r) > A.w * 2.5) continue; let a = Math.atan2(dy, dx) - A.a0; a = ((a % 6.283) + 6.283) % 6.283; if (a > A.span) continue; const t = Math.sin((Math.PI * a) / A.span); v += A.amp * t * Math.exp(-Math.pow((r - A.r) / A.w, 2)); } return v; });
  }

  // ===== 刷り =====
  // plates = [{ c, color, kind: "flat"|"bokashi", shift }]。版の不透明度=摺りの濃さ。色版は彫った所(紙)にだけ乗る。
  // v6(必須3): 画素ごとの白色ノイズの粒(4px の四角い粒)と、色版の木目の等間隔の線(走査線に見えた)をやめた。全カット共通の「刷りの層」は次の3つだけ:
  //   ・紙のスキャンの繊維と斑(z)… 紙にも墨にも色版にも同じ紙が出る(全カットを1枚の紙でつなぐ)
  //   ・ばれんの擦りむら(円弧)… 色版と墨の濃さを ±数% 動かす
  //   ・墨の版の木目(年輪の線)… 墨のベタだけ。色版には入れない
  // ぼかし摺りは、なめらかな濃さの勾配 + 大きな斑(紙の zL とばれん)だけ。粒は暗い側ほど(紙の繊維の分だけ)出て、明るい側では消える。
  // 色版のふちは、版を 1.4px ぼかしてから紙の繊維でしきい値を揺らす(刷りの縁。ベクターの縁にしない)
  const FIELD = {}; // v7: 位置だけの表(カットと木目の向きで決まる)を1回だけ作る
  const field = (k, mk) => FIELD[k] || (FIELD[k] = mk());
  function print(ctx, mask, plates, { look, B = FRAME, ink = C.INK, paper = C.PAPER, grain = -0.05, wood = 1, cut: cutId = 0, sheet = 0, keyShift = null }) {
    const inkc = hex(ink), pap = hex(paper), usePaper = look && PAPER;
    const P = plates.map((p) => {
      let d = p.c.getContext("2d").getImageData(0, 0, W, H).data;
      if (look && p.kind !== "bokashi") { const [b, bg] = buf("plBlur"); bg.filter = "blur(1.4px)"; bg.drawImage(p.c, 0, 0); bg.filter = "none"; d = bg.getImageData(0, 0, W, H).data; }
      return { d, col: hex(p.color), sh: look ? (p.shift || [-3, 2]) : [0, 0], bok: p.kind === "bokashi", n: 0, name: p.color, kind: p.kind || "flat" };
    });
    const [o, og] = buf("out"); og.drawImage(mask, 0, 0);
    const md = mask.getContext("2d").getImageData(0, 0, W, H).data;
    const [bk, bkg] = buf("blockOnly"); bkg.beginPath(); blockPath(bkg, B); bkg.fillStyle = "#fff"; bkg.fill(); const kd = bkg.getImageData(0, 0, W, H).data;
    let bd = md; if (look) { const [b, bg] = buf("blur"); bg.filter = "blur(0.9px)"; bg.drawImage(mask, 0, 0); bd = bg.getImageData(0, 0, W, H).data; }
    const cs = Math.cos(grain), sn = Math.sin(grain), so = 61 + cutId * 3;
    const fk = cutId + "/" + grain;
    const warp = field("warp" + fk, () => noiseField(W, H, 6, (x, y) => { const u = x * cs + y * sn, v = -x * sn + y * cs; return 44 * (fbm(u * 0.0006, v * 0.0014, so, 3) - 0.5) + 5 * (fbm(u * 0.003, v * 0.008, so + 1, 2) - 0.5); }));
    const pres = field("pres" + fk, () => noiseField(W, H, 8, (x, y) => { const u = x * cs + y * sn, v = -x * sn + y * cs; return fbm(u * 0.0025, v * 0.012, so + 2, 2); }));
    const blot = field("blot" + cutId, () => noiseField(W, H, 8, (x, y) => fbm(x * 0.005, y * 0.005, 62 + cutId, 4)));
    const big = field("big" + cutId, () => noiseField(W, H, 10, (x, y) => fbm(x * 0.0022, y * 0.0026, 68 + cutId, 3))); // 数百 px の斑(ぼかし摺りのむら)
    const baren = look ? field("baren" + cutId, () => barenField(cutId)) : null;
    const edgeN = field("edge", () => noiseField(W, H, 3, (x, y) => vnoise(x * 0.35, y * 0.35, 64))); // 紙が無いときだけ使う墨のふち
    const Z = usePaper ? PAPER.z : null, ZL = usePaper ? PAPER.zl : null;
    let inBlock = 0, carved = 0, plated = 0, sr = 0, sg = 0, sb = 0;
    perPixel(o, (x, y) => {
      const pi = (sheet & 2 ? H - 1 - y : y) * W + (sheet & 1 ? W - 1 - x : x); // v7: 紙の取り替え(sheet=0 は v6 と同じ)
      let i = (y * W + x) * 4; if (keyShift) { const sx = Math.min(W - 1, Math.max(0, x - keyShift[0])), sy = Math.min(H - 1, Math.max(0, y - keyShift[1])); i = (sy * W + sx) * 4; } // v7: 版ずれ(墨の版だけ)
      let v = bd[i] / 255; const inside = kd[(y * W + x) * 4 + 3] > 127;
      if (inside) { inBlock++; if (md[i] > 127) carved++; }
      const z = Z ? Z[pi] : 0, zl = ZL ? ZL[pi] : 0, zh = z - zl, br = baren ? baren(x, y) : 0;
      if (look) { const t = 0.5 + (Z ? clamp(zh * 0.045, -0.1, 0.1) : (edgeN(x, y) - 0.5) * 0.42); v = smooth((v - (t - 0.1)) / 0.2); } else v = v > 0.5 ? 1 : 0;
      let ic = inkc, pp = pap;
      if (look) {
        const vv = -x * sn + y * cs, wv = vv + warp(x, y), ph = wv / 12 + 1.6 * pres(x, y), ri = Math.floor(ph), ring = ph - ri, rk = vnoise(ri, x / 300, so), line = smooth((rk - 0.38) / 0.3) * Math.pow(1 - Math.min(ring, 1 - ring) * 2, 7) * smooth((pres(x + 400, y) - 0.35) * 3); // 年輪の線: 4割の輪は消し、残りも濃さを輪ごとに 300px の周期でなめらかに変える(等間隔の線にしない)
        // 墨のベタ: 木目 + 墨のむら + 紙の繊維の山(墨の乗らない所が少し明るい)+ ばれんの擦りむら
        const lift = wood * 0.06 * line + (blot(x, y) - 0.5) * 0.08 + clamp(zh, 0, 4) * 0.022 + clamp(-zl, 0, 3) * 0.012 - br * 0.05 + (hash((x / 2) | 0, (y / 2) | 0, 71) < 0.0004 ? 0.3 : 0);
        ic = mix(inkc, pap, clamp(lift, 0, 0.5) * 0.55 + 0.02);
        const f = clamp(z, -4, 3) * 0.016 + zl * 0.01; pp = [pap[0] * (1 + f), pap[1] * (1 + f), pap[2] * (1 + f * 1.15)]; // 紙の色に繊維と斑(色版は掛け合わせなので、版の下にも同じ紙が出る)
      }
      let c = mix(ic, pp, v), any = false;
      if (inside) for (const p of P) {
        const px = x + p.sh[0], py = y + p.sh[1]; if (px < 0 || py < 0 || px >= W || py >= H) continue;
        let pv = p.d[(py * W + px) * 4 + 3] / 255; if (pv <= 0) continue;
        if (look) {
          if (p.bok) { const m = (big(x, y) - 0.5) * 0.5 + zl * 0.05 + br * 0.1; pv = clamp(pv + m * pv * (1 - pv) * 1.2); } // 大きな斑とばれん(中間の濃さだけ)、繊維は濃い側だけ
          else if (pv < 0.999) pv = smooth((pv - (0.5 + clamp(zh * 0.06, -0.2, 0.2))) / 0.22 + 0.5); // 刷りの縁: 紙の繊維でしきい値を揺らす
          pv *= 1 + br * 0.04 - clamp(zh, 0, 4) * 0.012; // ばれんの圧、紙の繊維の山(明るい繊維)に絵の具が少し乗りにくい
        }
        const k = clamp(pv) * v;
        if (k > 0.5) { any = true; p.n++; }
        c = [lerp(c[0], (c[0] * p.col[0]) / 255, k), lerp(c[1], (c[1] * p.col[1]) / 255, k), lerp(c[2], (c[2] * p.col[2]) / 255, k)];
      }
      if (any) plated++;
      sr += c[0]; sg += c[1]; sb += c[2];
      return c;
    });
    ctx.drawImage(o, 0, 0);
    const N = W * H, amber = P.filter((p) => p.name === C.AMBER).reduce((s, p) => s + p.n, 0);
    return { carved_in_block: +(carved / inBlock).toFixed(4), plate_of_frame: +(plated / N).toFixed(4), amber_of_frame: +(amber / N).toFixed(4), plates: P.length + 1, plate_each: P.map((p) => [p.name, p.kind, +(p.n / N).toFixed(4)]), mean_rgb: [sr / N, sg / N, sb / N].map((v) => Math.round(v)), framed: B.framed, paper: !!usePaper };
  }
  // 彫りのマスクだけを返す(彫りの進みの検査用。v=mask)
  function maskOnly(ctx, mask) { ctx.drawImage(mask, 0, 0); return { mask: true }; }


  // ===== v7: 動きの部品(MO) =====
  // F = 描いているコマ(曲のコマ番号)。Infinity = 全部彫り終えた静止画。部品は「s のコマで見え始め、d コマで終わる」
  let F = Infinity;
  const prog = (s, d = 1) => clamp((F - s + 1) / d);
  // 刃先が進む刀(cut と同じ形。彫り終えたら cut と同じ画素)。途中は刃先までの帯で、幅の式は全長で決める(伸びても形が変わらない)。刃先は 0.35 倍から太る
  function cutT(g, spine, w, seed, opts = {}, s = -1e9, d = 1) {
    if (F >= s + d - 1) return cut(g, spine, w, seed, opts);
    const p = prog(s, d); if (p <= 0) return;
    const { entry = 0.08, exit = 0.4, jit = 0.6 } = opts, sp = resample(spine, 3); if (sp.length < 2) return;
    const n = sp.length, m = Math.max(2, Math.ceil(p * (n - 1)) + 1);
    const wf = (u, i) => { const a = u < entry ? 0.55 + 0.45 * (u / entry) : 1, b = u > 1 - exit ? Math.pow((1 - u) / exit, 0.75) : 1; return w * a * b * (0.86 + 0.28 * vnoise(i * 0.15, seed * 0.37, 5)); };
    g.beginPath(); stroke(g, sp.slice(0, m), (u, i) => wf(i / (n - 1), i) * Math.min(1, 0.35 + (m - 1 - i) / 2.5), { jit, seed }); g.fill();
  }
  function wedgeT(g, a, b, wa, wb, seed, bend = 0, jit = 1.2, s = -1e9, d = 1) {
    if (F >= s + d - 1) return wedge(g, a, b, wa, wb, seed, bend, jit);
    const p = prog(s, d); if (p <= 0) return;
    const nn = 14, spp = [], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (let i = 0; i <= nn; i++) { const u = i / nn, o = bend * L * 4 * u * (1 - u); spp.push([a[0] + dx * u + nx * o, a[1] + dy * u + ny * o]); }
    const sp = resample(spp, 4), n = sp.length, m = Math.max(2, Math.ceil(p * (n - 1)) + 1);
    g.beginPath(); stroke(g, sp.slice(0, m), (u, i) => lerp(wa, wb, Math.pow(i / (n - 1), 0.9)) * (0.93 + 0.14 * vnoise(i * 0.2, seed * 0.31, 6)) * Math.min(1, 0.35 + (m - 1 - i) / 2.5), { jit, seed }); g.fill();
  }
  function lensT(g, x, y, hw, th, seed, tilt = 0, s = -1e9, d = 1) {
    if (F >= s + d - 1) return lens(g, x, y, hw, th, seed, tilt);
    const p = prog(s, d); if (p <= 0) return;
    const n = Math.max(3, Math.round(hw / 3)), sp = []; for (let i = 0; i <= n; i++) { const u = i / n; sp.push([x - hw + 2 * hw * u, y + tilt * (u - 0.5)]); }
    const m = Math.max(2, Math.ceil(p * n) + 1);
    g.beginPath(); stroke(g, sp.slice(0, m), (u, i) => th * Math.pow(Math.sin(Math.PI * (i / n)), 0.65) * Math.min(1, 0.4 + (m - 1 - i) / 2), { jit: 0.35, seed }); g.fill();
  }
  // 溝: 全部を描いた溝(groove と同じ形)から、刃先(長さ p×全長)より先を消す。刃先は斜めに切れた端(丸い端にしない)
  function grooveT(g, pts, o = {}, s = -1e9, d = 1) {
    if (F >= s + d - 1) return groove(g, pts, o);
    const p = prog(s, d); if (p <= 0) return;
    const [c, cg] = buf("grooveT"); cg.fillStyle = g.fillStyle; const L = groove(cg, pts, o);
    const sp = splitAt(pts, p * L), w0 = o.w0 || 9;
    cg.globalCompositeOperation = "destination-out"; cg.strokeStyle = "#000"; cg.lineWidth = w0 * 2.6 + 10; cg.lineCap = "butt"; cg.lineJoin = "miter";
    cg.beginPath(); cg.moveTo(sp.tail[0][0], sp.tail[0][1]); for (const q of sp.tail) cg.lineTo(q[0], q[1]); cg.stroke();
    cg.globalCompositeOperation = "source-over"; g.drawImage(c, 0, 0);
  }
  // 溝の刃先の位置(長さの割合 p)。音ハメの計測や、刃先に合わせて何かを打つ時に使う
  const grooveTip = (pts, p) => splitAt(pts, p * polyLen(pts)).at;
  // ばれんの1回: 版 pg の rect の中を、strike のコマで 55%、以後 1 コマで +22% ずつ、dir(down|up|right|left)へ刷り進む(4コマで刷り終える)。
  // 刷れたかどうかは 0/1(透明度の変化は使わない)。ばれんの前線は低い周波数のむら、インクの乗りは高い周波数のむら(位置だけの表)
  function baren(pg, rect, strike, dir = "down", seed = 1) {
    const q = 0.55 + 0.22 * (F - strike); if (q >= 1) return;
    const x0 = Math.max(0, Math.round(rect[0])), y0 = Math.max(0, Math.round(rect[1])), x1 = Math.min(W, Math.round(rect[2])), y1 = Math.min(H, Math.round(rect[3])), w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
    if (F < strike) { pg.clearRect(x0, y0, w, h); return; }
    const n1 = field("bn1/" + seed, () => noiseField(W, H, 6, (x, y) => fbm(x * 0.012, y * 0.012, seed, 3))), n2 = field("bn2/" + seed, () => noiseField(W, H, 2, (x, y) => fbm(x * 0.09, y * 0.09, seed + 9, 2)));
    const img = pg.getImageData(x0, y0, w, h), dd = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (!dd[i + 3]) continue;
      const u = dir === "down" ? y / h : dir === "up" ? 1 - y / h : dir === "right" ? x / w : 1 - x / w;
      if (!(u + 0.35 * (n1(x0 + x, y0 + y) - 0.5) < q * 1.25 - 0.08 && n2(x0 + x, y0 + y) < 0.36 + 0.8 * q)) dd[i + 3] = 0;
    }
    pg.putImageData(img, x0, y0);
  }
  // ===== 字を彫る: 輪郭(島)ごとに、粗彫り(帯の幅の 74%。帯の間に細い黒が残る)→ 仕上げ(帯の間を彫る)。彫り終えたら carve と同じ画素 =====
  // v7(6秒試作の残課題): 帯の幅を島ごとに ±25% 揺らし(等間隔の縦縞=バーコードにしない)、帯を島ごとに少し斜めにする(傾き ±0.18)
  const area2 = (ct) => { let a = 0; for (let i = 0; i < ct.length; i++) { const p = ct[i], q = ct[(i + 1) % ct.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  function letterPlan(fcs, s0, seed, speed = 1) {
    const ar = fcs.map(area2), big = ar.reduce((m, a, i) => (Math.abs(a) > Math.abs(ar[m]) ? i : m), 0), sg = Math.sign(ar[big]);
    const isl = fcs.map((ct, k) => ({ k, bb: bbox([ct]) })).filter((o, k) => Math.sign(ar[k]) === sg && Math.abs(ar[k]) > 30);
    isl.sort((a, b) => (Math.abs(a.bb[1] - b.bb[1]) > 14 ? a.bb[1] - b.bb[1] : b.bb[2] - a.bb[2]));
    const stag = Math.min(1.0, 4.5 / isl.length) * speed; let end = s0;
    isl.forEach((o, j) => {
      const [x0, y0, x1, y1] = o.bb, w = x1 - x0, h = y1 - y0; o.vert = h >= w * 0.8; o.s = s0 + j * stag;
      const across = o.vert ? w : h, bwT = 14 * Math.max(1, Math.min(2.2, Math.sqrt(across / 60))); o.m = Math.max(1, Math.ceil(across / bwT));
      const R = PR(seed, 31, o.k), e = [0]; for (let q = 1; q < o.m; q++) e.push((q + (R() - 0.5) * 0.5) / o.m); e.push(1); o.e = e.map((t) => t * across); o.sl = (R() - 0.5) * 0.36;
      o.rough = o.s + (o.m - 1) * 0.3 * speed + 1.6; o.fine = o.s + (3.6 + (o.m - 1) * 0.3 + 2.2) * speed; end = Math.max(end, o.fine);
    });
    return { isl, end: Math.ceil(end) };
  }
  function bandRect(g, o, j, lo, hi, p, seed) {
    const [x0, y0, x1, y1] = o.bb, a0 = o.e[j], a1 = o.e[j + 1], bw = a1 - a0, ja = (hash(j, 1, seed) - 0.5) * 3.2, jb = (hash(j, 2, seed) - 0.5) * 3.2;
    const a = a0 + lo * bw + ja, b = a0 + hi * bw + jb, tip = (0.25 + 0.3 * hash(j, 3, seed)) * bw, sl = o.sl;
    g.beginPath();
    if (o.vert) { const L = (y1 - y0 + 4) * p, ya = y0 - 2, X = (t, y) => x0 + t + sl * (y - (y0 + y1) / 2); g.moveTo(X(a, ya), ya); g.lineTo(X(b, ya), ya); g.lineTo(X(b, ya + L), ya + L); g.lineTo(X(a, ya + L - (p < 1 ? tip : 0)), ya + L - (p < 1 ? tip : 0)); }
    else { const L = (x1 - x0 + 4) * p, xa = x0 - 2, Y = (t, x) => y0 + t + sl * (x - (x0 + x1) / 2); g.moveTo(xa, Y(a, xa)); g.lineTo(xa, Y(b, xa)); g.lineTo(xa + L - (p < 1 ? tip : 0), Y(b, xa + L)); g.lineTo(xa + L, Y(a, xa + L)); }
    g.closePath(); g.fill();
  }
  // letters を starts[i] のコマから彫る(col の色で)。amp・seed は carve と同じ(彫り終えたら carve と同じ画素)
  function carveT(g, letters, seed, starts, { col = "#fff", amp = 0.7, speed = 1 } = {}) {
    let end = -1e9;
    letters.forEach((L, i) => {
      const fcs = soften(L.cs, amp * Math.min(1.4, L.size / 120), seed + i), pl = letterPlan(fcs, starts[i], seed * 13 + i, speed); end = Math.max(end, pl.end);
      if (F >= pl.end) { g.fillStyle = col; g.beginPath(); pathOf(g, fcs); g.fill("nonzero"); return; }
      if (F < starts[i]) return;
      const bb = bbox(fcs), bx = Math.floor(bb[0]) - 8, by = Math.floor(bb[1]) - 8, bw = Math.ceil(bb[2] - bx) + 8, bh = Math.ceil(bb[3] - by) + 8;
      const [lc, lg] = buf("letterCarve", bw, bh); lg.translate(-bx, -by); lg.fillStyle = col;
      for (const o of pl.isl) {
        if (F < o.s) continue;
        lg.save(); lg.beginPath(); pathOf(lg, [fcs[o.k]]); lg.clip("nonzero");
        for (let j = 0; j < o.m; j++) {
          const pr = clamp((F - (o.s + j * 0.3 * speed) + 1) / (1.6 * speed)); if (pr > 0) bandRect(lg, o, j, 0.13, 0.87, pr, seed * 7 + i * 31 + o.k);
          const pf = clamp((F - (o.s + (3.6 + j * 0.3) * speed) + 1) / (2.2 * speed)); if (pf > 0) bandRect(lg, o, j, -0.06, 1.06, pf, seed * 7 + i * 31 + o.k + 500);
        }
        lg.restore();
      }
      lg.globalCompositeOperation = "destination-in"; lg.beginPath(); pathOf(lg, fcs); lg.fill("nonzero"); // 字の穴(カウンター)は彫らない
      g.drawImage(lc, bx, by);
    });
    return end;
  }
  const MO = { setF: (f) => { F = f; }, getF: () => F, prog, cutT, wedgeT, lensT, grooveT, grooveTip, baren, carveT, letterPlan, field };

  return { MO, setPaper, scallop, bandPoly, polyLen, splitAt, signalBuf, avoidBoxes, C, FRAME, BLEED, PR, blockPath, begin, plateBuf, poly, cut, cutW, wedge, groove, stab, lens, chipEdge, inkBox, letter, setH, setHC, setV, widthH, lettersBox, soften, carve, keepOut, letterPlate, textMargin, bokashi, print, maskOnly };
})();
