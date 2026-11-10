// 案A+C(木版画+字の中の日)の 53 秒ボード v2 用の静止画(v4)。cand_a3.js・cand_a2.js・cand_a.js は変えない(弱いカットだけをここで描き直す)。
// 規則は cand_a3.js と同じ: 黒=彫り残した版木、紙=刀で彫った所。色版は彫った所にだけ刷る。色版は灯る物・燃える物・字の部品だけ。
// v4 で足した規則:
//   ①描画は曲のコマ番号 f だけで決まる(f=60|370|740|840|1080|1380|1430|1470|1560)。S9→S10(1340〜1470)は1つの関数 dawn(f) で、版が1枚ずつ増える。
//   ②水面の映りは「レンズ形の短い刀」を光の真下に、うねりながら下ほど広く・まばらに(均質な縦縞にしない)。S3 と S10 で同じ道具。
//   ③町は箱の点列でなく、手で決めた輪郭(反りのある屋根・火の見櫓・電柱と電線・給水塔・クレーン・松・団地のベランダの刻み)と刀の欠け。
// 乱数は固定シード(rng/hash)、作業 canvas は毎回 reset(common.js の buf)。Math.random・Date.now は使わない。
const CAND_A4 = (() => {
  const { W, H, clamp, lerp, smooth, rng, hash, fbm, vnoise, buf, mix, hex, vertical, horizontal, bbox, pathOf, dpClosed: dp, resample, stroke, perPixel, noiseField, G } = AD;
  const INK = "#14171f", INK_DAWN = "#2b2033", PAPER = "#ece3cd", AMBER = "#e2742a", ROSE = "#d66f8c", HONEY = "#f0c27c";
  const BX0 = 56, BY0 = 46, BX1 = 1864, BY1 = 1034;

  // ===== 共通の部品(cand_a3.js と同じ式をそのまま写した) =====
  // ===== 共通の部品(cand_a2.js と同じ式) =====
  function blockPath(g) {
    const pts = [], step = 8, n = (a, s) => (fbm(a * 0.02, s, 41, 3) - 0.5) * 7 + (hash(a | 0, s, 7) < 0.03 ? -4 : 0);
    for (let x = BX0; x <= BX1; x += step) pts.push([x, BY0 + n(x, 1)]);
    for (let y = BY0; y <= BY1; y += step) pts.push([BX1 + n(y, 2), y]);
    for (let x = BX1; x >= BX0; x -= step) pts.push([x, BY1 + n(x, 3)]);
    for (let y = BY1; y >= BY0; y -= step) pts.push([BX0 + n(y, 4), y]);
    g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath();
  }
  function cut(g, spine, w, seed, { entry = 0.08, exit = 0.4, jit = 0.6 } = {}) {
    const sp = resample(spine, 3);
    g.beginPath();
    stroke(g, sp, (u, i) => {
      const a = u < entry ? 0.55 + 0.45 * (u / entry) : 1, b = u > 1 - exit ? Math.pow((1 - u) / exit, 0.75) : 1;
      return w * a * b * (0.86 + 0.28 * vnoise(i * 0.15, seed * 0.37, 5));
    }, { jit, seed });
    g.fill();
  }
  // 太さが始点 w0 → 終点 w1 に変わる刀(手前が太く、奥が細い)
  function cutW(g, spine, w0, w1, seed, jit = 0.7) { const sp = resample(spine, 3); g.beginPath(); stroke(g, sp, (u, i) => lerp(w0, w1, u) * (0.9 + 0.2 * vnoise(i * 0.15, seed * 0.37, 5)), { jit, seed }); g.fill(); }
  const poly = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  const facet = (cs, eps, s) => cs.map((ct, k) => dp(ct, eps).map(([x, y], i) => [x + (hash(i, k, s) - 0.5) * 1.4, y + (hash(i, k + 50, s) - 0.5) * 1.4]));
  const J = (pts, s, gy = 1e9) => pts.map(([x, y], i) => [x + (hash(i, 1, s) - 0.5) * 3, y + (y < gy ? (hash(i, 2, s) - 0.5) * 3 : 0)]);
  const via = (g, x, y, r0) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r0, 0, 7); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(x, y, r0 * 0.38, 0, 7); g.fill(); g.fillStyle = "#fff"; };
  function carve(g, letters, seed, col = "#fff") { g.fillStyle = col; letters.forEach((L, i) => { g.beginPath(); pathOf(g, facet(L.cs, Math.min(3.3, L.size * 0.019), seed + i)); g.fill("nonzero"); }); }
  function keepOut(g, letters, lw = 34, col = "#000") { g.fillStyle = col; g.strokeStyle = col; g.lineJoin = "round"; g.lineWidth = lw; for (const L of letters) { g.beginPath(); pathOf(g, L.cs); g.stroke(); g.fill("nonzero"); } }
  function letterPlate(pg, L, { rect, contour }) {
    pg.save(); pg.beginPath();
    if (rect) { const [a, b, c, d] = rect; pg.rect(L.x0 + a * L.size, L.base + b * L.size, (c - a) * L.size, (d - b) * L.size); pg.clip(); pg.beginPath(); pathOf(pg, L.cs); pg.fill("nonzero"); }
    else { pathOf(pg, [L.cs[contour]]); pg.fill("nonzero"); }
    pg.restore();
  }
  function handWindow(g, x, y, w, h, cols, rows, seed) {
    const bar = Math.max(3, w * 0.11), pw = (w - bar * (cols - 1)) / cols, ph = (h - bar * (rows - 1)) / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, q = (a) => (hash(k, a, seed) - 0.5) * 1.6, x0 = x + i * (pw + bar), y0 = y + j * (ph + bar);
      g.beginPath(); poly(g, [[x0 + q(1), y0 + q(2)], [x0 + pw + q(3), y0 + q(4)], [x0 + pw + q(5), y0 + ph + q(6)], [x0 + q(7), y0 + ph + q(8)]]); g.fill();
    }
  }
  // 上向きの辺だけに刀(光を受ける屋根の縁)。tone(x) で太さ
  function rims(g, P, seed, wFn, up = true) {
    g.fillStyle = "#fff";
    for (let k = 0; k < P.length - 1; k++) { const [a, b] = [P[k], P[k + 1]]; if (up ? b[0] - a[0] > Math.abs(b[1] - a[1]) * 0.25 : true) cut(g, [[a[0], a[1] - 1], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 1], [b[0], b[1] - 1]], wFn((a[0] + b[0]) / 2), seed + k, { entry: 0.12, exit: 0.3, jit: 0.5 }); }
  }
  const centered = (font, str, cx, base, size, track = 0) => { let w = 0; for (const ch of str) w += G(font, ch).adv * size + track; return horizontal(font, str, cx - (w - track) / 2, base, size, track); };
  // ===== 刷り(cand_a2.js の print を複数の版に広げた物。plates = [{ c, color, shift }]。版の不透明度=ぼかし摺りの濃さ) =====
  function print(ctx, mask, plates, look, { ink = INK, paper = PAPER, thinKeep = false } = {}) {
    const inkc = hex(ink), pap = hex(paper);
    const P = plates.map((p) => ({ d: p.c.getContext("2d").getImageData(0, 0, W, H).data, col: hex(p.color), sh: look ? (p.shift || [-3, 2]) : [0, 0], bok: !!p.bokashi, n: 0 }));
    const [o, og] = buf("out"); og.drawImage(mask, 0, 0);
    const md = mask.getContext("2d").getImageData(0, 0, W, H).data;
    const [bk, bkg] = buf("blockOnly"); bkg.beginPath(); blockPath(bkg); bkg.fillStyle = "#fff"; bkg.fill(); const kd = bkg.getImageData(0, 0, W, H).data; // 色版は版木の中だけ(紙の余白に刷らない)
    let bd = md;
    if (look) { const [b, bg] = buf("blur"); bg.filter = "blur(0.9px)"; bg.drawImage(mask, 0, 0); bd = bg.getImageData(0, 0, W, H).data; }
    let wd = null; if (look && thinKeep) { const [b2, bg2] = buf("blurWide"); bg2.filter = "blur(3px)"; bg2.drawImage(mask, 0, 0); wd = bg2.getImageData(0, 0, W, H).data; }
    const grain = noiseField(W, H, 6, (x, y) => fbm(x * 0.0022, y * 0.09, 61, 3));
    const blot = noiseField(W, H, 8, (x, y) => fbm(x * 0.006, y * 0.006, 62, 4));
    const fiber = noiseField(W, H, 3, (x, y) => fbm(x * 0.05, y * 0.05, 63, 3));
    const edge = noiseField(W, H, 3, (x, y) => vnoise(x * 0.35, y * 0.35, 64));
    let inBlock = 0, carved = 0, plated = 0, sr = 0, sg = 0, sb = 0;
    perPixel(o, (x, y) => {
      const i = (y * W + x) * 4; let v = bd[i] / 255;
      if (x > BX0 + 8 && x < BX1 - 8 && y > BY0 + 8 && y < BY1 - 8) { inBlock++; if (md[i] > 127) carved++; }
      if (look) { const th = wd ? (v > 0.05 ? 1 - smooth((wd[i] / 255 - 0.12) / 0.35) : 0) : 0, t = 0.5 - 0.14 * th + (edge(x, y) - 0.5) * 0.42 * (1 - 0.8 * th); v = smooth((v - (t - 0.1)) / 0.2); } else v = v > 0.5 ? 1 : 0;
      let ic = inkc, pp = pap;
      if (look) {
        const thin = clamp((grain(x, y) - 0.45) * 2.2) * 0.13 + (blot(x, y) - 0.5) * 0.12, speck = hash((x / 2) | 0, (y / 2) | 0, 71) < 0.0007 ? 0.45 : 0;
        ic = mix(inkc, pap, clamp(thin + speck, 0, 0.6) * 0.5 + 0.02);
        const f = (fiber(x, y) - 0.5) * 0.09; pp = [pap[0] * (1 + f), pap[1] * (1 + f), pap[2] * (1 + f * 1.2)];
      }
      let c = mix(ic, pp, v), any = false;
      for (const p of P) {
        if (kd[i + 3] < 128) break;
        const px = x + p.sh[0], py = y + p.sh[1]; if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const pv = p.d[(py * W + px) * 4 + 3] / 255; if (pv <= 0) continue;
        // look: 版のむら(斑)+ぼかし摺りは横の木目でむら
        const k = pv * v * (look ? (p.bok ? 0.86 + 0.5 * (grain(x, y) - 0.5) + 0.2 * (blot(x, y) - 0.5) : 0.82 + 0.3 * (blot((x * 1.7) % W, (y * 1.7) % H) - 0.5)) : 1);
        if (k > 0.5) { any = true; p.n++; }
        c = [lerp(c[0], (c[0] * p.col[0]) / 255, k), lerp(c[1], (c[1] * p.col[1]) / 255, k), lerp(c[2], (c[2] * p.col[2]) / 255, k)];
      }
      if (any) plated++;
      sr += c[0]; sg += c[1]; sb += c[2];
      return c;
    });
    ctx.drawImage(o, 0, 0);
    const N = W * H;
    return { carved_in_block: +(carved / inBlock).toFixed(4), plate_of_frame: +(plated / N).toFixed(4), plates: P.length + 1, plate_each: P.map((p, i) => [plates[i].color, +(p.n / N).toFixed(4)]), mean_rgb: [sr / N, sg / N, sb / N].map((v) => Math.round(v)), ink, paper };
  }
  const plateBuf = (name) => { const [c, g] = buf(name); g.fillStyle = "#000"; return [c, g]; };
  function begin() { const [m, g] = buf("maskA3"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.save(); g.beginPath(); blockPath(g); g.fillStyle = "#000"; g.fill(); g.clip(); return [m, g]; }

  // ===== v4 で足した部品 =====
  // レンズ形の短い横の刀(両端が尖る。水面の映り・さざ波)
  function lens(g, x, y, hw, th, seed, tilt = 0) {
    const n = Math.max(3, Math.round(hw / 3)), sp = [];
    for (let i = 0; i <= n; i++) { const u = i / n; sp.push([x - hw + 2 * hw * u, y + tilt * (u - 0.5)]); }
    g.beginPath(); stroke(g, sp, (u) => th * Math.pow(Math.sin(Math.PI * u), 0.65), { jit: 0.35, seed }); g.fill();
  }
  // 刀の欠けのある輪郭: 辺を 7px 刻みに分けて少しゆらし、長い辺にはときどき内向きの欠け(小さい三角)
  function chip(P, s, amp = 1.1) {
    const out = [];
    for (let k = 0; k < P.length - 1; k++) {
      const [a, b] = [P[k], P[k + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 7)), nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
      for (let i = 0; i < n; i++) {
        const u = i / n, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), e = i === 0 ? 0 : (hash(k * 97 + i, 3, s) - 0.5) * 2 * amp;
        out.push([x + nx * e, y + ny * e]);
        if (L > 40 && i > 0 && i < n - 1 && hash(k * 97 + i, 5, s) < 0.05) { const d = 3 + hash(k, i, s) * 4; out.push([x + (b[0] - a[0]) / L * 2 + nx * d, y + (b[1] - a[1]) / L * 2 + ny * d]); }
      }
    }
    out.push(P[P.length - 1]); return out;
  }
  // 懸垂線(電線)
  const wire = (a, b, sag, n = 40) => { const o = []; for (let i = 0; i <= n; i++) { const u = i / n; o.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + sag * 4 * u * (1 - u)]); } return o; };
  // 線(墨の線を版木に残す: 彫った紙の上に黒い線を描く)
  function inkLine(g, pts, w, seed) { g.fillStyle = "#000"; cut(g, pts, w, seed, { entry: 0.02, exit: 0.02, jit: 0.4 }); }

  // =====================================================================
  // S1 2秒(60コマ)間奏「版木と最初の一刀」: 何も彫っていない版木。木目(杢)と節だけが墨のむらとして見え、
  // 左から1本の太い刀(最初の信号)が 45 度で段を上がって、8秒で窓が灯る位置(x≈925)の手前で止まる。刀の先は尖り、ささくれが残る。
  // 町・地平・字・色版はない(S2 と主役も構図も違う)。右下に見当(版木の刷りの位置合わせの印)
  // =====================================================================
  function F60(ctx, { look }) {
    const [m, g] = begin(), r = rng(6001);
    // 節: [cx, cy, R, 横の伸び]
    const K = [[610, 300, 42, 2.9], [1500, 836, 27, 2.4]];
    const inside = (x, y, f = 1.12) => K.some(([kx, ky, R, sx]) => { const dx = (x - kx) / sx, dy = y - ky; return dx * dx + dy * dy < R * R * f * f; });
    // 木目の流れ関数(円柱をよける流れの流線)+ゆるい波
    const psi = (x, y) => { let v = y + 150 * (fbm(x * 0.0011, y * 0.0007, 6002, 3) - 0.5) + 16 * Math.sin(x * 0.0031 + y * 0.002 + 1.3); for (const [kx, ky, R, sx] of K) { const dx = (x - kx) / sx, dy = y - ky, d2 = dx * dx + dy * dy; v -= (R * R * 1.15 * dy) / Math.max(d2, R * R); } return v; };
    const SP = 13, XS = 4, lines = {};
    for (let x = BX0 - 12; x <= BX1 + 12; x += XS) {
      let py = BY0 - 30, pv = psi(x, py), pin = inside(x, py);
      for (let y = BY0 - 28; y <= BY1 + 30; y += 2) {
        const v = psi(x, y), inn = inside(x, y);
        if (!inn && !pin) { const k0 = Math.ceil(Math.min(pv, v) / SP), k1 = Math.floor(Math.max(pv, v) / SP); for (let k = k0; k <= k1; k++) { const yc = lerp(py, y, (k * SP - pv) / (v - pv || 1)); (lines[k] = lines[k] || []).push([x, yc]); } }
        py = y; pv = v; pin = inn;
      }
    }
    g.fillStyle = "#fff";
    for (const k in lines) {
      const P = lines[k]; let seg = [P[0]];
      const flush = () => {
        if (seg.length < 4) return; const sp = resample(seg, 3); let i = 0;
        while (i < sp.length - 3) {
          const [x, y] = sp[i], nearK = Math.max(...K.map(([kx, ky, R, sx]) => clamp(1 - Math.hypot((x - kx) / sx, y - ky) / (R * 5)))), tone = clamp(0.3 + 0.55 * nearK + 0.5 * (fbm(x * 0.003, y * 0.012, 6003, 2) - 0.5) * 2);
          const n = 30 + ((r() * 130) | 0);
          if (r() < 0.15 + tone) cut(g, sp.slice(i, i + n), lerp(1.1, 2.8, tone) * (0.8 + 0.4 * r()), 6100 + i + +k * 31, { entry: 0.12, exit: 0.25, jit: 0.35 });
          i += n + 1 + ((r() * (1 - tone) * 30) | 0);
        }
      };
      for (let i = 1; i < P.length; i++) { const [x, y] = P[i], [x0, y0] = P[i - 1]; if (x - x0 === XS && Math.abs(y - y0) < 9) seg.push(P[i]); else { flush(); seg = [P[i]]; } }
      flush();
    }
    // 節の年輪(節の中の楕円の欠片)と、芯の割れ
    K.forEach(([kx, ky, R, sx], ki) => {
      // 節: 外ほど太い年輪(楕円が少し尖る=目の形)、芯は彫らない黒、芯から1本の割れ
      for (let j = 0; j < 4; j++) { const rr = R * (0.45 + j * 0.2), a0 = r() * 6.28, span = 4.6 + r() * 1.4, pts = []; for (let a = a0; a < a0 + span; a += 0.04) { const e = Math.pow(Math.abs(Math.cos(a)), 0.6) * Math.sign(Math.cos(a)); const n = 1 + 0.12 * (vnoise(a * 1.3, j + ki * 7, 6210) - 0.5) * 2; pts.push([kx + e * rr * sx * 0.95 * n, ky + Math.sin(a) * rr * 0.9 * n]); } cut(g, pts, lerp(1.8, 3.6, j / 3), 6200 + ki * 10 + j, { entry: 0.2, exit: 0.3, jit: 0.4 }); }
      cut(g, [[kx + R * sx * 0.08, ky - R * 0.1], [kx + R * sx * 0.55, ky + R * 0.25], [kx + R * sx * 1.3, ky + R * 0.3]], 2.0, 6250 + ki, { entry: 0.1, exit: 0.7, jit: 0.5 });
    });
    // 最初の一刀(信号): 手前の左から、45度で2段上がって止まる。根元が太く、先が尖る
    const T = [925, 652], line = [[BX0 - 30, 812], [330, 812], [420, 722], [700, 722], [770, 652], T];
    const sp = resample(line, 3); g.beginPath();
    stroke(g, sp, (u, i) => { const w = lerp(24, 15, u) * (0.9 + 0.2 * vnoise(i * 0.12, 3.7, 5)); return u > 0.955 ? w * Math.pow((1 - u) / 0.045, 0.9) : w; }, { jit: 1.2, seed: 6301 });
    g.fill();
    via(g, 330, 812, 21);
    // ささくれ: 刀の先の両脇の小さい三角
    for (let k = 0; k < 6; k++) { const x = T[0] - 6 - r() * 46, side = k % 2 ? -1 : 1, y = T[1] + side * (8 + r() * 4), l = 4 + r() * 7; g.beginPath(); poly(g, [[x, y], [x + l, y + side * (1.5 + r() * 2)], [x + l * 0.4, y + side * 0.5]]); g.fill(); }
    // 見当(かぎ見当と引きつけ見当)
    cut(g, [[BX1 - 190, BY1 - 34], [BX1 - 42, BY1 - 34]], 6, 6401, { entry: 0.05, exit: 0.05, jit: 0.6 }); cut(g, [[BX1 - 42, BY1 - 31], [BX1 - 42, BY1 - 120]], 6, 6402, { entry: 0.05, exit: 0.1, jit: 0.6 });
    cut(g, [[BX0 + 520, BY1 - 34], [BX0 + 660, BY1 - 34]], 6, 6403, { entry: 0.05, exit: 0.05, jit: 0.6 });
    g.restore();
    return print(ctx, m, [], look);
  }

  // =====================================================================
  // S3 12.3秒(370コマ)「輝きは増す」: 高い所から川の曲がりを見る。向こう岸は左の遠くから右の手前へ下る(灯りの大きさが距離で違う)。
  // 灯りは窓・桟橋の灯・小舟の提灯。どれも水に映って、1つの灯りが何十もの刀の欠片に増える(「増す」を映りの欠片の数で)。
  // 映りはレンズ形の刀がうねりながら下ほど広く・まばらに。琥珀は映りの根元の欠片だけ、先は紙の白(均質な縦縞にしない)
  // =====================================================================
  function F370(ctx, { look }) {
    const [m, g] = begin(), r = rng(3701);
    const U = (x) => clamp((x - BX0) / (BX1 - BX0));
    const yb = (x) => lerp(196, 352, Math.pow(U(x), 1.35)) + 12 * Math.sin(U(x) * 4.1 + 0.6), sc = (x) => lerp(0.46, 1.25, Math.pow(U(x), 1.1));
    // 向こう岸の町(遠いほど小さい)
    const shapes = [], bld = []; let x = BX0 - 14, k = 0;
    while (x < BX1 + 10) {
      const s = sc(x), w = (44 + r() * 84) * s, h = (30 + r() * 66) * s, t = (k * 7 + ((r() * 3) | 0)) % 6, b0 = yb(x) + 4, b1 = yb(x + w) + 4, tp = Math.min(b0, b1) - h;
      let P;
      if (t === 0) P = [[x, b0], [x, tp], [x + w / 2, tp - 24 * s], [x + w, tp], [x + w, b1]];
      else if (t === 1) P = [[x, b0], [x, tp - 16 * s], [x + w, tp], [x + w, b1]];
      else if (t === 2) { P = [[x, b0], [x, tp]]; for (let i = 0; i < 3; i++) { P.push([x + (w * (i + 0.85)) / 3, tp - 18 * s]); P.push([x + (w * (i + 0.85)) / 3, tp]); } P.push([x + w, tp], [x + w, b1]); }
      else if (t === 3) P = [[x, b0], [x, tp], [x + w * 0.6, tp], [x + w * 0.6, tp - 20 * s], [x + w * 0.85, tp - 20 * s], [x + w * 0.85, tp], [x + w, tp], [x + w, b1]];
      else if (t === 4) P = [[x, b0], [x, tp], [x + w * 0.7, tp], [x + w * 0.7, tp - 80 * s], [x + w * 0.7 + 10 * s, tp - 80 * s], [x + w * 0.7 + 10 * s, tp], [x + w, tp], [x + w, b1]];
      else P = [[x, b0], [x, tp + h * 0.4], [x + w, tp + h * 0.4 - 10 * s], [x + w, b1]];
      shapes.push(chip(P, 3800 + k, 0.8)); bld.push({ x, w, tp, h, s, b: Math.max(b0, b1) }); x += w - 2; k++;
    }
    // 空: 横の刀。屋根のすぐ上ほど密で太い(町を黒い影として立たせる)
    const roofY = (xx) => { let y = yb(xx); for (const B of bld) if (xx >= B.x - 4 && xx <= B.x + B.w + 4) y = Math.min(y, B.tp - 10 * B.s); return y; };
    g.fillStyle = "#fff";
    for (let y = BY0 + 16; y < 360; y += 5 + r() * 4) { let xx = BX0 - 20 + r() * 60; while (xx < BX1) { const len = lerp(50, 240, r()), t = Math.pow(clamp(1 - (roofY(xx + len / 2) - y) / 140), 1.4); if (y < yb(xx) - 4 && r() < 0.05 + 0.95 * t) cut(g, [[xx, y], [xx + len, y + (r() - 0.5) * 2]], lerp(1.1, 5.2, t) * (0.7 + 0.5 * r()), (xx + y * 13) | 0, { entry: 0.12, exit: 0.6, jit: 0.4 }); xx += len + lerp(110, 8, t) * (0.5 + r()); } }
    g.fillStyle = "#000"; for (const P of shapes) { g.beginPath(); poly(g, P); g.fill(); }
    g.beginPath(); g.moveTo(BX0 - 20, yb(BX0) - 1); for (let xx = BX0 - 20; xx <= BX1 + 20; xx += 8) g.lineTo(xx, yb(xx) - 1); for (let xx = BX1 + 20; xx >= BX0 - 20; xx -= 8) g.lineTo(xx, yb(xx) + 9 + 6 * U(xx)); g.closePath(); g.fill();
    shapes.forEach((P, i) => rims(g, P, 3900 + i * 20, () => 1.4 + 1.8 * bld[i].s));
    // 灯り: 遠い左はまばら(3つ)、手前の右ほど多い。建物ごとに 0〜2、場所も大きさも不揃い
    const LIT = [];
    bld.forEach((B, i) => { const u = U(B.x), h0 = hash(i, 1, 377); if (h0 < lerp(0.1, 0.62, Math.pow(u, 0.8)) && B.x > BX0 + 10 && B.x + B.w < BX1 - 10) { const n = h0 < 0.18 * u ? 2 : 1; for (let j = 0; j < n; j++) { const sz = (12 + hash(i, 2 + j, 377) * 10) * B.s; LIT.push({ x: B.x + B.w * (0.2 + 0.5 * hash(i, 4 + j, 377)), y: B.tp + B.h * (0.25 + 0.35 * j) + 6 * B.s, w: sz, h: sz * 1.25, s: B.s, water: B.b + 10, reach: 0.08 + 0.75 * Math.pow(u, 1.6) * (0.6 + 0.4 * hash(i, 7 + j, 377)), id: LIT.length }); } } });
    // 杭の灯(右の手前、水の中に立つ)と、小舟の提灯(左の中ほど、右へ進む)
    const POST = [1452, 640], BOAT = [560, 690];
    const LAMP = { x: POST[0] - 9, y: 500, w: 18, h: 22, s: 1.15, water: POST[1] + 4, reach: 0.9, id: 90 }, LANT = { x: BOAT[0] + 30, y: BOAT[1] - 74, w: 16, h: 20, s: 1.0, water: BOAT[1] + 18, reach: 0.45, id: 91 };
    const ALL = LIT.concat([LAMP, LANT]);
    // 水面: 遠く(上)は細く短く密、手前(下)は太く長くまばら。岸の下は空の映りで少し明るい。提灯のまわりは明るい
    g.fillStyle = "#fff";
    for (let y = 214; y < BY1 - 2; y += 4 + (y - 200) * 0.011) {
      const d = clamp((y - 200) / (BY1 - 200)); let xx = BX0 - 20 + r() * 40;
      while (xx < BX1) { const len = lerp(14, 110, r()) * lerp(0.45, 1.3, d), sky = Math.pow(clamp(1 - (y - yb(xx) - 10) / 80), 2), halo = Math.pow(clamp(1 - Math.hypot((xx + len / 2 - BOAT[0]) / 300, (y - BOAT[1] - 6) / 90)), 0.9); if (y > yb(xx) + 12 && r() < 0.07 + 0.1 * d + 0.5 * sky + 0.7 * halo) lens(g, xx + len / 2, y + (vnoise(xx * 0.01, y * 0.05, 3) - 0.5) * 3, len / 2, lerp(1.1, 3.4, d) * (0.7 + 0.6 * r()) * (1 + 0.6 * sky + 0.5 * halo), (xx * 3 + y * 7) | 0); xx += len + lerp(60, 26, d) * (0.5 + r()) * (1 - 0.6 * halo); }
    }
    // 映り: 灯りの真下から、うねって下ほど広く・まばらに。根元の欠片だけ琥珀
    const [p, pg] = plateBuf("plateA3a"), refl = [];
    for (const L of ALL) {
      const rr = rng(7000 + L.id), cx0 = L.x + L.w / 2, y0 = L.water, len = (BY1 - y0) * L.reach, ph = rr() * 6.28; let y = y0 + 3;
      while (y < Math.min(BY1 - 3, y0 + len)) {
        const t = (y - y0) / len, d = clamp((y - 200) / (BY1 - 200)), amp = L.w * (0.25 + 1.6 * t);
        const cx = cx0 + amp * Math.sin((y - y0) * 0.05 + ph) * 0.7 + (vnoise(y * 0.04, L.id, 9) - 0.5) * amp, hw = L.w * (0.55 + 1.5 * t) * (0.5 + 0.8 * rr()), th = lerp(2.0, 5.2, d) * (0.75 + 0.5 * rr()) * (1 - 0.35 * t);
        if (rr() < 1 - 0.6 * t) refl.push([cx, y, hw, th, t < 0.5 && rr() < 0.85 - t]);
        if (t > 0.25 && rr() < 0.45) { const side = rr() < 0.5 ? -1 : 1; refl.push([cx + side * hw * (1.3 + rr()), y + 1, hw * (0.3 + 0.3 * rr()), th * 0.75, false]); }
        y += lerp(3.0, 7.0, d) * (0.8 + 0.5 * rr());
      }
    }
    g.fillStyle = "#000"; for (const [cx, y, hw] of refl) g.fillRect(cx - hw - 4, y - 2.5, hw * 2 + 8, 5); // 映りの所の水面の刀を消す(映りを立てる)
    g.fillStyle = "#fff"; refl.forEach(([cx, y, hw, th], i) => lens(g, cx, y, hw, th, 7100 + i));
    pg.fillStyle = "#000"; refl.forEach(([cx, y, hw, th, amber], i) => { if (amber) lens(pg, cx, y, hw + 1.5, th + 1.5, 7100 + i); });
    // 引き波: 舟の後ろ(左)へ開く V の刀
    g.fillStyle = "#fff"; for (let j = 0; j < 8; j++) { const t = j / 7, dx = 70 + t * 300, w2 = 14 + t * 60; for (const sgn of [-1, 1]) lens(g, BOAT[0] - dx, BOAT[1] + 12 + sgn * w2 * 0.5, 14 + t * 30, 3.6 - t * 1.2, 6500 + j * 2 + (sgn > 0), sgn * 6); }
    // 杭と灯
    g.fillStyle = "#000"; g.fillRect(POST[0] - 4, LAMP.y + LAMP.h, 8, POST[1] - LAMP.y - LAMP.h); g.fillStyle = "#fff"; cut(g, [[POST[0] + 3, LAMP.y + LAMP.h + 2], [POST[0] + 3, POST[1] - 2]], 2.0, 3952, { entry: 0.05, exit: 0.2, jit: 0.3 });
    for (let j = 0; j < 4; j++) lens(g, POST[0] + (j % 2 ? 1 : -1) * (14 + j * 8), POST[1] + 2 + j * 4, 10 + j * 4, 2.6, 3955 + j);
    // 舟: 黒い船体、上の縁の刀、提灯の竿
    const hull = [[BOAT[0] - 118, BOAT[1] - 14], [BOAT[0] - 60, BOAT[1] - 8], [BOAT[0] + 70, BOAT[1] - 12], [BOAT[0] + 112, BOAT[1] - 22], [BOAT[0] + 86, BOAT[1] + 16], [BOAT[0] - 84, BOAT[1] + 16]];
    g.fillStyle = "#fff"; for (let j = 0; j < 5; j++) lens(g, BOAT[0] + (hash(j, 1, 61) - 0.5) * 60, BOAT[1] + 22 + j * 6, 110 - j * 14, 4.2 - j * 0.5, 6600 + j); // 船の下の明るい水(船体を影で立てる)
    g.fillStyle = "#000"; g.beginPath(); poly(g, hull); g.fill(); g.fillRect(LANT.x + LANT.w / 2 - 2, LANT.y + LANT.h, 4, BOAT[1] - LANT.y - LANT.h - 8);
    g.fillStyle = "#fff"; cut(g, [[BOAT[0] - 118, BOAT[1] - 15], [BOAT[0] - 60, BOAT[1] - 10], [BOAT[0] + 70, BOAT[1] - 14], [BOAT[0] + 112, BOAT[1] - 23]], 4.4, 3961, { entry: 0.1, exit: 0.2, jit: 0.4 });
    // 灯りそのもの(手で彫った窓・灯)
    for (const L of ALL) { g.fillStyle = "#000"; g.fillRect(L.x - 3, L.y - 3, L.w + 6, L.h + 6); g.fillStyle = "#fff"; handWindow(g, L.x, L.y, L.w, L.h, L.w > 19 ? 2 : 1, L.h > 22 ? 2 : 1, 77 + L.id); pg.fillRect(L.x - 2, L.y - 2, L.w + 4, L.h + 4); }
    const T = horizontal("SMB", "輝きは増す", 150, 960, 138, 10);
    keepOut(g, T, 40); carve(g, T, 3990);
    g.restore();
    pg.globalCompositeOperation = "destination-out"; keepOut(pg, T, 24); pg.globalCompositeOperation = "source-over";
    return Object.assign(print(ctx, m, [{ c: p, color: AMBER }], look), { lights: ALL.length });
  }

  // =====================================================================
  // S5 24.7秒(740コマ)「夜明けの」: 彫り始めの「火」。字の輪郭を刀で切り回し(切り回しの白い線、まだ一周していない)、
  // 字の芯から外へ、丸刀で粗彫りが始まっている(芯ほど彫り取られて白く、外ほど刀の跡がまばら)。芯に火種のぼかし摺り(琥珀、小さく)。
  // 左右から来た線(S4 の回路)が輪郭で止まる。28秒で火が彫り上がって刷られる、その一歩手前
  // =====================================================================
  function F740(ctx, { look }) {
    const [m, g] = begin(), r = rng(7401), SZ = 800;
    const F = centered("SMB", "火", 960, 106 + 0.88 * SZ, SZ)[0], fb = bbox(F.cs), C = [lerp(fb[0], fb[2], 0.5), lerp(fb[1], fb[3], 0.5)];
    // 粗彫り: 芯から外へ丸刀(入りが太く、抜きで細る)。字の中だけ
    g.save(); g.beginPath(); pathOf(g, F.cs); g.clip("nonzero"); g.fillStyle = "#fff";
    for (let k = 0; k < 300; k++) {
      const a = r() * 6.283, reach = lerp(40, 470, Math.pow(r(), 0.85)), r0 = r() * 24, w0 = lerp(9, 24, r()), bend = (r() - 0.5) * 0.35, sp = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12, rr = lerp(r0, reach, u), aa = a + bend * u * u; sp.push([C[0] + Math.cos(aa) * rr, C[1] + Math.sin(aa) * rr]); }
      g.beginPath(); stroke(g, resample(sp, 4), (u) => w0 * Math.pow(1 - u, 0.55) * (u < 0.05 ? 0.7 + 6 * u : 1), { jit: 1.1, seed: 7410 + k }); g.fill();
    }
    g.restore(); g.fillStyle = "#fff";
    // 切り回し: 輪郭に沿う白い線。最も長い輪郭だけ、終わりの 16% はまだ彫っていない(刀が回っている途中)
    const longest = F.cs.reduce((a, c, i) => (c.length > F.cs[a].length ? i : a), 0);
    F.cs.forEach((ct, ci) => { const pts = resample(ct.concat([ct[0]]), 3), n = ci === longest ? Math.floor(pts.length * 0.84) : pts.length; let i = 0; while (i < n - 3) { const len = 40 + ((r() * 60) | 0), seg = pts.slice(i, Math.min(n, i + len + 1)); cut(g, seg, 4.2 + r() * 1.4, 7600 + ci * 50 + i, { entry: 0.06, exit: i + len >= n ? 0.25 : 0.06, jit: 0.6 }); i += len; } });
    // 左右から来る線が、輪郭の手前で止まる
    const yL = 640, yR = 470;
    cut(g, [[BX0 - 10, yL], [520, yL], [580, yL - 60], [fb[0] + 64, yL - 60]], 5.0, 2551, { entry: 0.01, exit: 0.03, jit: 0.8 }); via(g, fb[0] + 68, yL - 60, 8);
    cut(g, [[BX1 + 10, yR], [1440, yR], [1380, yR + 60], [fb[2] - 74, yR + 60]], 5.0, 2552, { entry: 0.01, exit: 0.03, jit: 0.8 }); via(g, fb[2] - 78, yR + 60, 8);
    const T = centered("SMB", "夜明けの", 960, 1000, 74, 14);
    keepOut(g, T, 24); carve(g, T, 2560);
    g.restore();
    // 火種: 芯のまわりの小さいぼかし摺り(琥珀)
    const [p, pg] = plateBuf("plateA3a"), gr = pg.createRadialGradient(C[0], C[1], 0, C[0], C[1], 190); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.45, "rgba(0,0,0,0.7)"); gr.addColorStop(1, "rgba(0,0,0,0)"); pg.fillStyle = gr; pg.fillRect(0, 0, W, H);
    return Object.assign(print(ctx, m, [{ c: p, color: AMBER, bokashi: true }], look), { center: C.map(Math.round) });
  }

  // =====================================================================
  // S6 28秒(840コマ)「夜明けの回路に 火を灯して」: 元版の骨格(小さい「夜明けの」、巨大な「回路に」、放射の中心の「火」、縦の「を灯して」)は v3 のまま。
  // 変えたのは放射だけ: 120本 → 68本、角度の間隔を不揃いに(ところどころ空く)、始まりの半径も不揃い(火のまわりの黒を小さく)、
  // 長い刀・短い刀・途中で切れる刀を混ぜ、刀は少し曲がる。琥珀のぼかし摺りは火のまわりを狭く濃く
  // =====================================================================
  function F840(ctx, { look }) {
    const [m, g] = begin(), r = rng(2801);
    const T1 = horizontal("SMB", "夜明けの", 170, 300, 118, 8);
    const T2 = horizontal("SMB", "回路に", 140, 790, 340, -6);
    const C = [1408, 470], FS = 300;
    const F = centered("SMB", "火", C[0], C[1] - FS / 2 + 0.88 * FS - 14, FS);
    const T3 = vertical("SMB", "を灯して", 1742, 470, 124, 1.02);
    g.fillStyle = "#fff";
    const rq = rng(8401), N = 68; let a = -0.3;
    for (let k = 0; k < N; k++) {
      a += (6.283 / N) * (0.35 + 1.3 * rq()); const kind = rq(), r0 = 148 + rq() * 95;
      const L = kind < 0.3 ? lerp(70, 220, rq()) : kind < 0.85 ? lerp(240, 560, rq()) : lerp(600, 820, rq());
      const w = (kind < 0.3 ? lerp(12, 22, rq()) : kind < 0.85 ? lerp(11, 28, Math.pow(rq(), 0.8)) : lerp(9, 15, rq())), bend = (rq() - 0.5) * 0.06, ex = 1.25, ey = 0.95, pts = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10, rr = r0 + L * u, aa = a + bend * u; pts.push([C[0] + Math.cos(aa) * rr * ex, C[1] + Math.sin(aa) * rr * ey]); }
      if (kind > 0.5 && kind < 0.7) { const cutAt = 4 + ((rq() * 3) | 0); cut(g, pts.slice(0, cutAt + 1), w, 2810 + k, { entry: 0.06, exit: 0.3, jit: 1.0 }); cut(g, pts.slice(cutAt + 1), w * 0.7, 2890 + k, { entry: 0.2, exit: 0.8, jit: 1.0 }); }
      else cut(g, pts, w, 2810 + k, { entry: 0.03, exit: 0.95, jit: 1.2 });
      if (rq() < 0.35) { const a2 = a + (rq() - 0.5) * 0.05, r2 = r0 + 10 + rq() * 40, pts2 = [[C[0] + Math.cos(a2) * r2 * ex, C[1] + Math.sin(a2) * r2 * ey], [C[0] + Math.cos(a2) * (r2 + 40 + rq() * 60) * ex, C[1] + Math.sin(a2) * (r2 + 40 + rq() * 60) * ey]]; cut(g, pts2, w * 0.5, 2950 + k, { entry: 0.2, exit: 0.7, jit: 0.8 }); }
    }
    const bundle = (pts, n, gap, seed, w = 4.2) => { for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * gap, q = pts.map(([x, y]) => [x + (pts.dir === "v" ? off : 0), y + (pts.dir === "v" ? 0 : off)]); cut(g, q, w, seed + i, { entry: 0.01, exit: 0.06, jit: 0.6 }); } };
    const b1 = [[BX0 - 10, 400], [1020, 400], [1110, 450], [C[0] - 250, 450]]; bundle(b1, 4, 15, 2830);
    const b2 = [[BX0 - 10, 900], [1060, 900], [1180, 780], [1210, 640], [C[0] - 220, 600]]; bundle(b2, 4, 15, 2840);
    const b3 = [[C[0] - 20, BY1 + 10], [C[0] - 20, 860], [C[0] - 60, 820], [C[0] - 60, C[1] + 220]]; b3.dir = "v"; bundle(b3, 4, 15, 2850);
    const b4 = [[C[0] + 10, BY0 - 10], [C[0] + 10, C[1] - 210]]; b4.dir = "v"; bundle(b4, 3, 15, 2860);
    for (const [x, y] of [[1020, 400], [1060, 900], [C[0] - 250, 450], [C[0] - 220, 600]]) via(g, x, y, 9);
    keepOut(g, T1, 30); keepOut(g, T2, 44); keepOut(g, T3, 30); keepOut(g, F, 36);
    carve(g, T1.concat(T2, T3, F), 2870);
    g.save(); g.beginPath(); pathOf(g, T2.flatMap((L) => L.cs)); g.clip("nonzero");
    g.strokeStyle = "#000"; g.lineWidth = 6.5; g.lineJoin = "miter"; g.lineCap = "butt";
    const tb = bbox(T2.flatMap((L) => L.cs)), viasIn = [];
    for (let row = 0; row < 3; row++) {
      let x = tb[0] - 10, y = lerp(tb[1] + 60, tb[3] - 60, row / 2) + (r() - 0.5) * 20; g.beginPath(); g.moveTo(x, y);
      while (x < tb[2] + 10) { const run = 60 + r() * 130; x += run; g.lineTo(x, y); viasIn.push([x, y]); if (r() < 0.7) { const dy = (r() < 0.5 ? -1 : 1) * (34 + r() * 40); x += Math.abs(dy); y += dy; g.lineTo(x, y); } }
      g.stroke();
    }
    for (let k = 0; k < 9; k++) { const x = lerp(tb[0] + 40, tb[2] - 40, k / 8) + (r() - 0.5) * 50, y0 = tb[1] + r() * 120; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + 80 + r() * 160); g.lineTo(x + 30, y0 + 110 + r() * 160); g.stroke(); viasIn.push([x, y0]); }
    for (const [x, y] of viasIn) if (r() < 0.5) { g.fillStyle = "#000"; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
    g.restore();
    g.restore();
    const [p, pg] = plateBuf("plateA3a");
    letterPlate(pg, F[0], { rect: [-0.1, -1.2, 1.1, 0.4] }); letterPlate(pg, T3[1], { rect: [0.0, -0.95, 0.42, 0.2] });
    const [q, qg] = plateBuf("plateA3b"), gr = qg.createRadialGradient(C[0], C[1], 120, C[0], C[1], 470); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.35, "rgba(0,0,0,0.85)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    qg.fillStyle = gr; qg.save(); qg.translate(C[0], C[1]); qg.scale(1.25, 0.95); qg.translate(-C[0], -C[1]); qg.fillRect(0, 0, W, H); qg.restore();
    qg.globalCompositeOperation = "destination-out"; keepOut(qg, T2.concat(T3), 20); qg.globalCompositeOperation = "source-over";
    return print(ctx, m, [{ c: p, color: AMBER }, { c: q, color: AMBER, bokashi: true }], look);
  }

  // =====================================================================
  // S8 36秒(1080コマ)「止まらない/止まれない」: 斜め前から見た高架。手前(左)は大きく、奥(右)へ小さく(遠近で反復を崩す)。
  // 橋脚は T 字で、間隔は不揃い(川の上だけ長い径間)。路面の上を走る光は、頭(右)が太く尻尾(左)が長く細る刀(速さ)。
  // 1本は版木の右の縁を越えて抜ける(止まれない)。琥珀は路面の一区間と、その真下の水面の欠片だけ(1123 で路面が灯る)
  // =====================================================================
  function F1080(ctx, { look }) {
    const [m, g] = begin(), r = rng(10801);
    // 低い視点で、高架を下から斜めに見上げる。手前(左)が大きく、奥(右)へ小さい。地平 HZ は低い
    const XL = BX0 - 60, XR = BX1 + 60, HZ = 800, Z = (x) => 1 + 3.0 * clamp((x - XL) / (XR - XL));
    const bot = (x) => HZ - 252 / Z(x), top = (x) => HZ - 352 / Z(x), roof = (x) => HZ - 478 / Z(x), gnd = (x) => HZ + 150 / Z(x);
    const band = (fa, fb, x0 = XL, x1 = XR) => { const P = []; for (let x = x0; x <= x1; x += 10) P.push([x, fa(x)]); for (let x = x1; x >= x0; x -= 10) P.push([x, fb(x)]); return P; };
    const along = (fy, x0, x1, step = 8) => { const P = []; for (let x = x0; x <= x1; x += step) P.push([x, fy(x)]); return P; };
    // 空: 上は暗く、地平に近いほど町明かりで明るい(横の刀が密で太い)
    g.fillStyle = "#fff";
    for (let y = BY0 + 20; y < HZ; y += 4.5 + (HZ - y) * 0.012 + r() * 3) { let x = BX0 - 20 + r() * 80; while (x < BX1) { const len = lerp(60, 320, r()), t = Math.pow(clamp(1 - (HZ - y) / 600), 1.15); if (r() < 0.03 + 0.97 * t) cut(g, [[x, y], [x + len, y + (r() - 0.5) * 1.4]], lerp(1.2, 7, t) * (0.7 + 0.5 * r()), (x * 7 + y * 3) | 0, { entry: 0.15, exit: 0.6, jit: 0.3 }); x += len + lerp(150, 6, t) * (0.5 + r()); } }
    // 遠い町(地平、右の奥)
    let cx = 980; g.fillStyle = "#000"; const city = [];
    while (cx < BX1 + 20) { const w = 16 + r() * 34, h = 10 + r() * 30, P = r() < 0.4 ? [[cx, HZ + 4], [cx, HZ - h], [cx + w / 2, HZ - h - 8], [cx + w, HZ - h], [cx + w, HZ + 4]] : [[cx, HZ + 4], [cx, HZ - h], [cx + w, HZ - h], [cx + w, HZ + 4]]; city.push(chip(P, 10800 + city.length, 0.6)); cx += w + (r() < 0.3 ? 10 : -1); }
    for (const P of city) { g.beginPath(); poly(g, P); g.fill(); }
    // 水面: 地平の下は明るい空の映り、手前ほど暗くまばら。灯った列車の下に琥珀の欠片
    g.fillStyle = "#fff";
    for (let y = HZ + 6; y < BY1 - 2; y += 3.5 + (y - HZ) * 0.02) {
      const d = clamp((y - HZ) / (BY1 - HZ)); let x = BX0 - 20 + r() * 40;
      while (x < BX1) { const len = lerp(18, 140, r()) * lerp(0.6, 1.4, d), glow = Math.pow(1 - d, 1.6), lit = x > 560 && x < 1500 ? 0.3 * Math.pow(clamp(1 - Math.abs(x - 1000) / 480), 1.2) : 0; if (r() < 0.08 + 0.8 * glow + lit) lens(g, x + len / 2, y, len / 2, lerp(1.4, 4.2, d) * (0.7 + 0.6 * r()), (x * 3 + y * 5) | 0); x += len + lerp(14, 60, d) * (0.5 + r()); }
    }
    // 岸(川の向こうの土手): 地平のすぐ下の黒い帯
    g.fillStyle = "#000"; g.beginPath(); poly(g, [[BX0 - 20, HZ - 2], [BX1 + 20, HZ - 2], [BX1 + 20, HZ + 6], [BX0 - 20, HZ + 12]]); g.fill();
    // 橋脚: 奥行きの位置は不揃い(川の上だけ長い径間)。T 字の頭。水に映る脚
    const ZS = [1.14, 1.58, 2.42, 2.8, 3.22, 3.55, 3.83], xOf = (z) => XL + ((z - 1) / 3.0) * (XR - XL);
    ZS.forEach((z, i) => {
      const x = xOf(z) + (hash(i, 3, 108) - 0.5) * 20 / z, w = (96 + hash(i, 4, 108) * 30) / z, cw = w * 2.4, ch = 40 / z, yb = bot(x), yw = gnd(x);
      g.fillStyle = "#000"; g.beginPath(); poly(g, chip([[x - cw / 2, yb - 2], [x + cw / 2, yb - 2], [x + cw / 2, yb + ch * 0.4], [x + w / 2, yb + ch], [x + w / 2 + 2 / z, yw], [x - w / 2 - 2 / z, yw], [x - w / 2, yb + ch], [x - cw / 2, yb + ch * 0.4]], 10850 + i, 0.8)); g.fill();
      for (let y = yw; y < Math.min(BY1 + 4, yw + (yw - yb) * 0.6); y += 3) { const t = (y - yw) / ((yw - yb) * 0.6 + 1), e = (hash(i, y | 0, 17) - 0.5) * w * 0.6 * (0.3 + t); if (hash(i, (y | 0) + 1, 19) < 1 - 0.75 * t) g.fillRect(x - w / 2 - e, y, w + e * 2 * hash(i, y | 0, 23), 3.4); }
      g.fillStyle = "#fff"; cut(g, [[x - w / 2 + 2, yb + ch + 3], [x - w / 2 + 2, yw - 2]], 1.0 + 3.2 / z, 10950 + i, { entry: 0.05, exit: 0.4, jit: 0.4 });
    });
    // 桁(黒)と、その上の列車(黒い車体)
    g.fillStyle = "#000"; g.beginPath(); poly(g, band(roof, bot)); g.fill();
    // 刀の縁: 列車の屋根、窓の帯の上下、桁の上の縁、桁の下の縁(手前ほど太い)
    g.fillStyle = "#fff";
    const edge = (fy, w0, w1, seed, x0 = XL, x1 = XR) => cutW(g, along(fy, x0, x1, 10), w0, w1, seed, 0.6);
    edge((x) => roof(x) + 2, 7, 1.8, 11020); edge((x) => top(x) + 2, 6, 1.6, 11021); edge((x) => bot(x) - 3, 5, 1.4, 11023);
    // 列車の窓: 左(手前)へ走る列車の窓が、横に流れる刀になる。頭は左で太く、尻尾は右へ長く細る。1本は版木の左の縁を突き抜ける
    const winY = (x, f) => lerp(roof(x) + 12 / Z(x), top(x) - 10 / Z(x), f), streaks = [];
    for (let j = 0; j < 26; j++) { const f = lerp(0.24, 0.76, r()), head = lerp(XL - 40, 1680, Math.pow(r(), 1.2)), len = lerp(160, 760, r()) / Math.sqrt(Z(head)); streaks.push([f, head, len]); }
    streaks.push([0.5, XL - 80, 900], [0.36, XL - 60, 640]);
    streaks.forEach(([f, head, len], j) => { const P = along((x) => winY(x, f), head, head + len, 8); if (P.length < 3) return; const z = Z(Math.max(head, BX0)); cut(g, P, (12 / z + 1.8) * (0.55 + 0.6 * hash(j, 1, 108)), 11100 + j, { entry: 0.03, exit: 0.92, jit: 0.6 }); });
    // 車両のつなぎ目(縦の黒い切れ目、不揃いな間隔は遠近)
    g.fillStyle = "#000"; for (const z of [1.42, 1.98, 2.5, 2.96, 3.35, 3.66]) { const x = xOf(z); g.fillRect(x - 3 / z - 1, roof(x) + 4, 6 / z + 2, top(x) - roof(x) - 4); }
    const T1 = horizontal("SMB", "止まらない", 120, 270, 200, 4);
    const T2 = horizontal("SMB", "止まれない", 1850 - 5 * 150, 990, 150, 0);
    keepOut(g, T1, 36); keepOut(g, T2, 30); carve(g, T1.concat(T2), 3650);
    g.restore();
    // 色版: 列車の窓の帯(手前へ向かって濃く、ぼかし摺りで右へ抜ける)と、真下の水面の欠片
    const [p, pg] = plateBuf("plateA3a"), gp = pg.createLinearGradient(240, 0, 1560, 0); gp.addColorStop(0, "rgba(0,0,0,0.2)"); gp.addColorStop(0.25, "rgba(0,0,0,1)"); gp.addColorStop(0.7, "rgba(0,0,0,0.85)"); gp.addColorStop(1, "rgba(0,0,0,0)");
    pg.fillStyle = gp; pg.beginPath(); poly(pg, band((x) => roof(x) + 4, (x) => top(x) - 2)); pg.fill();
    const gw = pg.createLinearGradient(0, HZ, 0, BY1); gw.addColorStop(0, "rgba(0,0,0,0.9)"); gw.addColorStop(1, "rgba(0,0,0,0)"); pg.save(); pg.beginPath(); pg.ellipse(1000, HZ + 60, 470, 200, 0, 0, 7); pg.clip(); pg.fillStyle = gw; pg.fillRect(0, HZ + 8, W, BY1 - HZ); pg.restore();
    pg.globalCompositeOperation = "destination-out"; keepOut(pg, T1.concat(T2), 30); pg.globalCompositeOperation = "source-over";
    return print(ctx, m, [{ c: p, color: AMBER, bokashi: true }], look);
  }

  // =====================================================================
  // S9→S10(1340〜1590)夜明け: 1つの関数で、コマ番号 f から「どこまで彫ったか」「どの版を刷ったか」が決まる。
  //   1340〜1440 空の版木が地平から上へ彫り取られる(粗彫りの丸刀の跡が境目に残る)/1360〜1450 川も紙になる
  //   1395〜1415 淡黄の版(ぼかし摺り)/1415〜 太陽が地平から出る(琥珀)/1420〜1445 薔薇の版がばれんで左上から刷られていく(途中の縁が残る)
  //   1456〜1494 字「夜が明ける」(明の日=琥珀)/1500〜 題箋「夜明けの回路」と印。墨は 1340 から茄子紺
  // 町は 8秒の点列を使わない。手で決めた輪郭: 団地(ベランダの刻み)、反りのある屋根、火の見櫓、電柱と電線(太陽の上を渡る)、
  // のこぎり屋根の工場と煙突の煙、木、給水塔(8秒の韻)、団地の屋上のアンテナ、クレーン、松。遠い町は薔薇の版だけで刷る(空気の奥行き)
  // =====================================================================
  function dawn(ctx, { look, f }) {
    const [m, g] = begin(), r = rng(4901), HZ = 690, SR = 118;
    const cp = smooth((f - 1340) / 100), wp = smooth((f - 1360) / 90), rise = f < 1415 ? -1 : smooth((f - 1415) / 40);
    const SUN = [960, HZ + 14 + SR * 0.95 * (1 - Math.max(0, rise)) - 34 * smooth((f - 1470) / 120)], sunOn = rise >= 0;
    const honeyP = f >= 1400 ? 1 : 0, roseP = f >= 1448 ? 1 : 0, showText = f >= 1456 && f < 1495, title = f >= 1500;
    const T = showText ? centered("SMB", "夜が明ける", 960, 318, 176, 18) : [], tb = showText ? bbox(T.flatMap((L) => L.cs)) : null;
    const CART = [1652, 80, 1780, 456], TT = title ? vertical("SMB", "夜明けの回路", 1716, 106, 54, 1.0) : [];
    const avoid = (x, y) => (tb && x > tb[0] - 60 && x < tb[2] + 60 && y > tb[1] - 40 && y < tb[3] + 30) || (title && x > CART[0] - 40 && x < CART[2] + 40 && y > CART[1] - 24 && y < CART[3] + 120);
    // ---- 空: 地平から上へ彫り取る。彫った所(紙)には夜の名残の墨の雲の筋 ----
    const ycut = lerp(HZ + 10, BY0 - 260, cp), front = 170;
    g.fillStyle = "#fff"; g.fillRect(0, ycut, W, HZ - ycut);
    for (let y = ycut - front; y < ycut; y += 5) { const t = (y - (ycut - front)) / front; let x = BX0 - 40 + r() * 60; while (x < BX1) { const len = lerp(80, 420, r()) * (0.5 + t); if (r() < 0.15 + 0.85 * t) cut(g, [[x, y], [x + len * 0.5, y + (r() - 0.5) * 3], [x + len, y + (r() - 0.5) * 2]], lerp(2, 10, t) * (0.6 + 0.6 * r()), (x * 5 + y * 3) | 0, { entry: 0.3, exit: 0.6, jit: 1.0 }); x += len + lerp(160, 10, t) * (0.5 + r()); } }
    for (let y = BY0 + 26; y < ycut - front; y += 9 + r() * 6) { let x = BX0 - 20 + r() * 80; while (x < BX1) { const len = lerp(60, 300, r()); if (r() < 0.12) cut(g, [[x, y], [x + len, y + (r() - 0.5) * 1.5]], 1.4 + 0.5 * r(), (x * 7 + y * 3) | 0, { entry: 0.15, exit: 0.6, jit: 0.25 }); x += len + 30 + r() * 120; } }
    g.fillStyle = "#000";
    for (let y = BY0 + 6; y < HZ - 70; y += 6 + (y - BY0) * 0.03 + r() * 4) {
      const night = Math.pow(1 - clamp((y - BY0) / (HZ - 150 - BY0)), 1.5); let x = BX0 - 40 + r() * 80;
      while (x < BX1) { const len = lerp(80, 520, r()) * lerp(0.6, 1.3, night), mid = x + len / 2; if (y > ycut && !avoid(mid, y) && r() < 0.06 + 0.9 * night) cut(g, [[x, y], [x + len * 0.5, y + (r() - 0.5) * 3], [x + len, y + (r() - 0.5) * 2]], lerp(1.2, 8.5, night) * (0.6 + 0.6 * r()), (x * 5 + y * 3) | 0, { entry: 0.2, exit: 0.6, jit: 0.8 }); x += len + lerp(260, 30, night) * (0.5 + r()); }
    }
    // 太陽の輪郭(墨の細い輪、ところどころ切れる)
    if (sunOn) for (let k = 0; k < 9; k++) { const a0 = Math.PI + (k / 9) * Math.PI + 0.05, a1 = a0 + Math.PI / 9 - 0.09, pts = []; for (let a = a0; a <= a1; a += 0.02) { const p = [SUN[0] + Math.cos(a) * (SR + 9), SUN[1] + Math.sin(a) * (SR + 9)]; if (p[1] < HZ - 2) pts.push(p); } if (pts.length > 3) cut(g, pts, 3.2, 4910 + k, { entry: 0.2, exit: 0.3, jit: 0.3 }); }
    // ---- 町(手で決めた輪郭) ----
    const B = HZ + 4, polys = [], s = 1;
    const roof = (x0, w, eave, ridge, k) => { const P = [[x0, B], [x0, eave + 6], [x0 - 12, eave + 8]], rl = x0 + w * 0.32, rr = x0 + w * 0.68; for (let i = 1; i <= 8; i++) { const t = i / 8; P.push([lerp(x0 - 12, rl, t), eave + 8 - (eave + 8 - ridge) * Math.pow(t, 1.8)]); } P.push([rl - 2, ridge - 6], [rl + 3, ridge]); P.push([rr - 3, ridge], [rr + 2, ridge - 6]); for (let i = 0; i <= 8; i++) { const t = 1 - i / 8; P.push([lerp(x0 + w + 12, rr, t), eave + 8 - (eave + 8 - ridge) * Math.pow(t, 1.8)]); } P.push([x0 + w + 12, eave + 8], [x0 + w, eave + 6], [x0 + w, B]); polys.push(chip(P, 5000 + k)); };
    const balc = (x, y0, y1, dir, k) => { const P = []; for (let y = y0; y < y1 - 14; y += 23) P.push([x, y], [x + dir * 6, y + 4], [x + dir * 6, y + 13], [x, y + 17]); return P; };
    // 左: 団地、家、火の見櫓、工場と煙突、木
    polys.push(chip([[40, B], [40, 370], [80, 370], [80, 350], [118, 350], [118, 370], [168, 370]].concat(balc(168, 392, B, -1)).concat([[168, B]]), 5101));
    roof(184, 92, 604, 566, 1); roof(286, 120, 622, 590, 2);
    polys.push(chip([[536, B], [536, 572]].concat([0, 1, 2, 3].flatMap((i) => [[536 + i * 38, 538 - (i % 2) * 6], [536 + (i + 1) * 38, 572]])).concat([[690, 572], [690, B]]), 5103));
    polys.push(chip([[603, 574], [607, 372], [623, 372], [627, 574]], 5104)); polys.push(chip([[602, 392], [628, 392], [628, 401], [602, 401]], 5105));
    const blob = (cx, cy, rx, ry, k) => { const P = []; for (let a = 0; a < 6.283; a += 0.12) { const n = 1 + 0.16 * (fbm(Math.cos(a) * 2 + k, Math.sin(a) * 2, 5200 + k, 3) - 0.5) * 2; P.push([cx + Math.cos(a) * rx * n, cy + Math.sin(a) * ry * n]); } return P; };
    polys.push(blob(752, 612, 40, 36, 1), blob(790, 588, 46, 42, 2), blob(826, 618, 34, 30, 3)); polys.push([[782, B], [784, 620], [796, 620], [798, B]]);
    // 右: 家、給水塔、団地(屋上のアンテナ)、松
    roof(1104, 96, 630, 600, 3); roof(1192, 118, 614, 574, 4); polys.push(chip([[1318, B], [1318, 640], [1352, 628], [1352, B]], 5110));
    const tank = chip([[1366, 562], [1366, 514], [1382, 501], [1398, 495], [1414, 501], [1430, 514], [1430, 562]], 5111); polys.push(tank);
    { const P = []; for (let a = 0; a < 6.283; a += 0.08) P.push([1712 + Math.cos(a) * 50, 594 + Math.sin(a) * 48]); polys.push(chip(P, 5130, 0.7)); }
    polys.push(chip([[1458, B], [1458, 470], [1478, 470], [1478, 450]].concat([[1570, 450], [1570, 432], [1596, 432], [1596, 450], [1612, 450], [1612, 470]]).concat(balc(1612, 486, B, -1)).concat([[1612, B]]), 5112));
    const pads = [[1826, 540, 58, 16], [1862, 496, 50, 14], [1806, 488, 34, 11], [1850, 452, 38, 11]];
    pads.forEach(([x, y, rx, ry], i) => polys.push(blob(x, y, rx, ry, 10 + i)));
    polys.push([[1832, B], [1828, 620], [1818, 556], [1828, 504], [1846, 462], [1856, 444], [1863, 447], [1852, 470], [1838, 508], [1832, 556], [1846, 620], [1850, B]]);
    g.fillStyle = "#000"; for (const P of polys) { g.beginPath(); poly(g, P); g.fill(); }
    // 線の構造(墨の線): 火の見櫓、電柱と電線、給水塔の脚、アンテナ、クレーン、煙、松の枝
    const L = (a, b, w, k) => inkLine(g, [a, b], w, 5300 + k);
    const lv = [B, 620, 560, 508, 466, 430, 400, 376, 356, 340], lx = (y, side) => 470 + side * lerp(31, 11, (B - y) / (B - 340));
    L([lx(B, -1), B], [lx(340, -1), 340], 5.5, 1); L([lx(B, 1), B], [lx(340, 1), 340], 5.5, 2);
    for (let i = 0; i < lv.length - 1; i++) { L([lx(lv[i], -1), lv[i]], [lx(lv[i + 1], 1), lv[i + 1]], 2.4, 10 + i); L([lx(lv[i], 1), lv[i]], [lx(lv[i + 1], -1), lv[i + 1]], 2.4, 30 + i); L([lx(lv[i], -1), lv[i]], [lx(lv[i], 1), lv[i]], 2.6, 50 + i); }
    g.fillStyle = "#000"; g.beginPath(); poly(g, chip([[446, 342], [494, 342], [494, 330], [446, 330]], 5320)); g.fill();
    g.beginPath(); poly(g, [[444, 318], [458, 306], [470, 292], [482, 306], [496, 318]]); g.fill(); L([470, 292], [470, 274], 3, 60); L([458, 330], [458, 318], 2.4, 61); L([482, 330], [482, 318], 2.4, 62);
    g.beginPath(); g.arc(470, 324, 6, 0, 7); g.fill();
    const pole = (x, tp, aw, k) => { L([x, B], [x, tp], 7, 70 + k); L([x - aw / 2, tp + 12], [x + aw / 2, tp + 12], 5, 80 + k); for (const dx of [-aw / 2 + 5, aw / 2 - 5]) { g.beginPath(); g.arc(x + dx, tp + 7, 4, 0, 7); g.fill(); } return [[x - aw / 2 + 5, tp + 6], [x + aw / 2 - 5, tp + 6]]; };
    const p1 = pole(262, 430, 64, 1), p2 = pole(706, 452, 58, 2), p3 = pole(1262, 448, 58, 3);
    const W2 = (a, b, sag, k) => inkLine(g, wire(a, b, sag), 2.0, 5400 + k);
    W2([BX0 - 20, 400], p1[0], 30, 1); W2(p1[0], p2[0], 30, 2); W2(p1[1], p2[1], 26, 3); W2(p2[0], p3[0], 64, 4); W2(p2[1], p3[1], 58, 5); W2(p3[1], [BX1 + 30, 420], 44, 6);
    for (const [a, b] of [[[1372, 562], [1362, B]], [[1424, 562], [1434, B]], [[1368, 600], [1430, 650]], [[1428, 600], [1366, 650]], [[1366, 600], [1430, 600]]]) L(a, b, 3.4, 90 + a[1] % 7);
    L([1530, 432], [1530, 372], 3, 100); for (const [y, w] of [[384, 30], [398, 22], [410, 14]]) L([1530 - w / 2, y], [1530 + w / 2, y], 2.2, 101 + y % 5);
    // 球形のガスタンク(脚と赤道の帯)
    for (const dx of [-42, -16, 16, 42]) L([1712 + dx * 0.9, 630], [1712 + dx * 1.05, B], 4, 110 + dx);
    L([1666, 662], [1758, 662], 2.6, 115); L([1672, 640], [1752, 684], 2, 116); L([1752, 640], [1672, 684], 2, 117);
    for (let k = 0; k < 3; k++) { const y0 = 376 + k * 6; inkLine(g, [[626, y0], [680 + k * 30, y0 - 14 - k * 3], [760 + k * 60, y0 - 18 - k * 6]], 4 - k, 5500 + k); }
    // ---- 地面と川 ----
    g.fillStyle = "#000"; g.fillRect(BX0 - 10, HZ, BX1 - BX0 + 20, 46);
    const dayY = lerp(HZ + 46, BY1 + 60, wp);
    g.fillStyle = "#fff"; g.fillRect(BX0 - 10, HZ + 46, BX1 - BX0 + 20, dayY - HZ - 46);
    for (let y = dayY; y < Math.min(BY1 + 4, dayY + 110); y += 4) { const t = 1 - (y - dayY) / 110; let x = BX0 - 30 + r() * 40; while (x < BX1) { const len = lerp(40, 260, r()) * (0.4 + t); if (r() < 0.1 + 0.8 * t) lens(g, x + len / 2, y, len / 2, lerp(2, 7, t), (x * 3 + y * 7) | 0); x += len + lerp(80, 8, t) * (0.5 + r()); } }
    for (let y = dayY + 110; y < BY1; y += 5 + (y - HZ) * 0.012) { let x = BX0 - 30 + r() * 40; while (x < BX1) { const len = lerp(20, 140, r()); if (r() < 0.16) lens(g, x + len / 2, y, len / 2, 1.6 + 1.6 * r(), (x * 3 + y * 7) | 0); x += len + 40 + r() * 60; } }
    g.fillStyle = "#000";
    for (let y = HZ + 52; y < Math.min(dayY, BY1 + 4); y += 5 + (y - HZ) * 0.03) { const d = (y - HZ) / (BY1 - HZ); let x = BX0 - 30 + r() * 40; while (x < BX1) { const sun = sunOn ? Math.pow(clamp(1 - Math.abs(x - SUN[0]) / (90 + d * 260)), 1.2) : 0, len = lerp(40, 240, r()), ink = (0.15 + 0.75 * d) * (1 - 0.85 * sun); if (r() < ink) cut(g, [[x, y], [x + len * 0.5, y + (r() - 0.5) * 2], [x + len, y]], lerp(1.2, 7, d) * (0.6 + 0.6 * r()), (x * 3 + y * 7) | 0, { entry: 0.15, exit: 0.5, jit: 0.6 }); x += len + lerp(50, 14, d) * (0.5 + r()); } }
    // ---- 光の側の縁(太陽に向く辺と上の辺)。太陽が出てから ----
    g.fillStyle = "#fff";
    const sunRim = (P, seed) => { for (let k = 0; k < P.length - 1; k++) { const [a, b] = [P[k], P[k + 1]], mx = (a[0] + b[0]) / 2, facing = mx < SUN[0] ? b[1] > a[1] + 4 : b[1] < a[1] - 4, up = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) * 0.25 && b[0] > a[0]; if (!(facing || up) || Math.min(a[1], b[1]) > HZ - 3) continue; const t = Math.pow(clamp(1 - Math.abs(mx - SUN[0]) / 900), 1.3); cut(g, [[a[0], a[1]], [b[0], b[1]]], lerp(1.8, 5.2, t) * (cp > 0.6 ? 1 : 0.6), seed + k, { entry: 0.06, exit: 0.2, jit: 0.5 }); } };
    if (cp > 0.3) polys.forEach((P, i) => sunRim(P, 4950 + i * 30));
    // 土手の上の回路の線(40秒で落ちた線の続き)
    cut(g, [[1600, HZ + 24], [1200, HZ + 24], [1150, HZ + 24], [SUN[0] + 30, HZ + 24]], 5.2, 4990, { entry: 0.01, exit: 0.02, jit: 0.8 }); via(g, 1600, HZ + 24, 9); via(g, SUN[0] + 22, HZ + 24, 9);
    // ---- 字・題箋 ----
    if (showText) { keepOut(g, T, 30, "#fff"); carve(g, T, 4995, "#000"); g.fillStyle = "#fff"; letterPlate(g, T[2], { rect: [0.0, -0.80, 0.40, -0.10] }); }
    if (title) {
      g.fillStyle = "#fff"; g.fillRect(CART[0] - 14, CART[1] - 14, CART[2] - CART[0] + 28, CART[3] - CART[1] + 28);
      g.fillStyle = "#000"; const rect = (a, b, c, d, w, k) => { inkLine(g, [[a, b], [c, b]], w, k); inkLine(g, [[c, b], [c, d]], w, k + 1); inkLine(g, [[c, d], [a, d]], w, k + 2); inkLine(g, [[a, d], [a, b]], w, k + 3); };
      rect(CART[0], CART[1], CART[2], CART[3], 5, 5600); rect(CART[0] + 9, CART[1] + 9, CART[2] - 9, CART[3] - 9, 2, 5610);
      carve(g, TT, 5620, "#000"); g.fillStyle = "#fff"; letterPlate(g, TT[1], { rect: [0.0, -0.80, 0.40, -0.10] });
      g.fillStyle = "#fff"; g.fillRect(CART[0] + 30, CART[3] + 18, 64, 64);
    }
    g.restore();
    // ---- 版 ----
    const [a, ag] = plateBuf("plateA3a"), [b, bgc] = plateBuf("plateA3b"), [c, cg] = plateBuf("plateA3c");
    // 薔薇: 上からのぼかし+川の下の方、遠い町(版だけで刷る)
    const gr1 = ag.createLinearGradient(0, BY0, 0, HZ); gr1.addColorStop(0, "rgba(0,0,0,0.95)"); gr1.addColorStop(0.42, "rgba(0,0,0,0.6)"); gr1.addColorStop(0.8, "rgba(0,0,0,0.08)"); gr1.addColorStop(1, "rgba(0,0,0,0)"); ag.fillStyle = gr1; ag.fillRect(0, 0, W, HZ);
    const gr1b = ag.createLinearGradient(0, HZ + 46, 0, BY1); gr1b.addColorStop(0, "rgba(0,0,0,0)"); gr1b.addColorStop(1, "rgba(0,0,0,0.55)"); ag.fillStyle = gr1b; ag.fillRect(0, HZ + 46, W, BY1 - HZ);
    const farCity = []; { const rf = rng(4970); let x = 560; while (x < 1400) { const w = 10 + rf() * 26, h = 5 + rf() * 22, t = rf(); farCity.push(t < 0.35 ? [[x, B], [x, HZ - h], [x + w / 2, HZ - h - 10], [x + w, HZ - h], [x + w, B]] : t < 0.5 ? [[x, B], [x, HZ - h], [x + w * 0.4, HZ - h], [x + w * 0.4, HZ - h - 22], [x + w * 0.4 + 5, HZ - h - 22], [x + w * 0.4 + 5, HZ - h], [x + w, HZ - h], [x + w, B]] : [[x, B], [x, HZ - h], [x + w, HZ - h + (rf() - 0.5) * 8], [x + w, B]]); x += w + (rf() < 0.45 ? 8 + rf() * 30 : -2); } }
    ag.fillStyle = "#000"; for (const P of farCity) { ag.beginPath(); poly(ag, chip(P, 4980, 0.7)); ag.fill(); }
    // 淡黄: 地平と太陽のまわりからのぼかし
    const gr2 = bgc.createRadialGradient(SUN[0], HZ + 14, SR * 0.8, SUN[0], HZ + 14, 980); gr2.addColorStop(0, "rgba(0,0,0,1)"); gr2.addColorStop(0.35, "rgba(0,0,0,0.75)"); gr2.addColorStop(1, "rgba(0,0,0,0)");
    bgc.save(); bgc.translate(SUN[0], HZ + 14); bgc.scale(1.7, 0.62); bgc.translate(-SUN[0], -(HZ + 14)); bgc.fillStyle = gr2; bgc.fillRect(-W, -H, 3 * W, 3 * H); bgc.restore();
    // 琥珀: 太陽・明の日・映り・町の陽の縁・土手の線・印
    if (sunOn) {
      cg.save(); cg.beginPath(); cg.rect(0, 0, W, HZ); cg.clip(); cg.beginPath(); cg.arc(SUN[0], SUN[1], SR, 0, 7); cg.fill(); cg.restore();
      const rq = rng(4960), reach = lerp(0.25, 1, rise); let y = HZ + 52;
      while (y < lerp(HZ + 52, BY1, reach)) { const d = (y - HZ) / (BY1 - HZ), half = 50 + d * 200, cx = SUN[0] + Math.sin(y * 0.05) * 10 * d; let x = cx - half; while (x < cx + half) { const cc = 1 - Math.abs(x - cx) / half, len = lerp(10, 70, cc) * (0.6 + 0.6 * rq()); if (rq() < 0.2 + 0.7 * cc) lens(cg, x + len / 2, y, len / 2, lerp(2.6, 6, d) * (0.6 + 0.6 * cc), (x * 5 + y * 3) | 0); x += len + lerp(26, 6, cc) * (0.5 + rq()); } y += 6 + (y - HZ) * 0.025; }
      cg.fillRect(SUN[0] + 10, HZ + 14, 640, 22);
      for (const P of polys) { cg.save(); cg.beginPath(); poly(cg, P); cg.clip(); cg.lineWidth = 14; cg.strokeStyle = "#000"; cg.beginPath(); poly(cg, P); cg.stroke(); cg.restore(); }
      if (roseP > 0) { cg.globalCompositeOperation = "destination-out"; cg.fillStyle = "#000"; for (const P of farCity) { cg.beginPath(); poly(cg, chip(P, 4980, 0.7)); cg.fill(); } cg.globalCompositeOperation = "source-over"; } // 遠い町は薔薇の版で太陽の前に立つ
    }
    if (showText) letterPlate(cg, T[2], { rect: [0.0, -0.80, 0.40, -0.10] });
    if (title) {
      letterPlate(cg, TT[1], { rect: [0.0, -0.80, 0.40, -0.10] });
      const sx = CART[0] + 30, sy = CART[3] + 18; cg.fillRect(sx, sy, 64, 64); cg.globalCompositeOperation = "destination-out"; carve(cg, centered("SMB", "灯", sx + 32, sy + 53, 46), 5700, "#000"); cg.globalCompositeOperation = "source-over";
      for (const [pc, pgc] of [[a, ag], [b, bgc]]) { pgc.globalCompositeOperation = "destination-out"; pgc.fillStyle = "#000"; pgc.fillRect(CART[0] - 12, CART[1] - 12, CART[2] - CART[0] + 24, CART[3] - CART[1] + 24); pgc.globalCompositeOperation = "source-over"; }
    }
    const plates = [];
    if (roseP > 0) plates.push({ c: a, color: ROSE, bokashi: true, shift: [-2, 1] });
    if (honeyP > 0) plates.push({ c: b, color: HONEY, bokashi: true, shift: [2, -1] });
    if (sunOn || showText || title) plates.push({ c, color: AMBER, shift: [-3, 2] });
    return Object.assign(print(ctx, m, plates, look, { ink: INK_DAWN }), { f, carve_sky: +cp.toFixed(3), carve_water: +wp.toFixed(3), rose: +roseP.toFixed(2), honey: +honeyP.toFixed(2), sun: +Math.max(0, rise).toFixed(2) });
  }

  const SCENES = { 60: F60, 370: F370, 740: F740, 840: F840, 1080: F1080 };
  return function draw(ctx, o) { const f = +o.f; if (SCENES[f]) return Object.assign(SCENES[f](ctx, o), { f }); if (f >= 1340 && f <= 1590) return dawn(ctx, { look: o.look, f }); throw new Error("このコマは描かない: " + f); };
})();
