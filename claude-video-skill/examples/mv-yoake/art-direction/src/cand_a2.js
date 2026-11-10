// 案A+C「彫って灯す+字の中の日」— 案A(木版画)を主軸に、案C の「字の中の日」を色版の使い道として取り込んだ版(v2)。
// 規則(案A と同じ): 黒=彫り残した版木(暗闇)、紙=刀で彫り取った所(光)。色版は琥珀 1 色、燃える物・灯る物にだけ、彫った所の上にだけ刷る。
// 追加の規則(案C から): 色版は「字の中の日・火」にも刷る。ただし 1 枚に 1〜2 か所まで、意味のある字だけ(8秒=暗の日偏と闇の中の日、28秒=火、49秒=明の日)。
// 元の cand_a.js は変えない(比較の基準として残す)。このファイルは 8/16/40 秒の3枚を描く。
// 引数: t = 8 | 16 | 40、look、選択肢(8秒の改善案の比較用): win = 0..4、sky = 0..2、sun = 0..2
const CAND_A2 = (() => {
  const { W, H, clamp, lerp, smooth, rng, hash, fbm, vnoise, buf, mix, vertical, horizontal, pathOf, dpClosed: dp, resample, stroke, perPixel, noiseField } = AD;
  const INK = "#14171f", PAPER = "#ece3cd", PLATE = "#e2742a";
  const BX0 = 56, BY0 = 46, BX1 = 1864, BY1 = 1034;

  // ===== 共通(cand_a.js と同じ式) =====
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
  const poly = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  const facet = (cs, eps, s) => cs.map((ct, k) => dp(ct, eps).map(([x, y], i) => [x + (hash(i, k, s) - 0.5) * 1.4, y + (hash(i, k + 50, s) - 0.5) * 1.4]));
  const J = (pts, s, gy = 1e9) => pts.map(([x, y], i) => [x + (hash(i, 1, s) - 0.5) * 3, y + (y < gy ? (hash(i, 2, s) - 0.5) * 3 : 0)]);
  // 黒い形を「白い刀の縁+黒の塗り」で版に置く(案A の city() の手順)
  function silhouette(g, shapes, lines = [], edge = 6) {
    g.strokeStyle = "#fff"; g.lineJoin = "miter"; g.lineWidth = edge;
    for (const b of shapes) { g.beginPath(); poly(g, b); g.stroke(); }
    g.lineWidth = edge + 5; for (const [a, b] of lines) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.fillStyle = "#000"; for (const b of shapes) { g.beginPath(); poly(g, b); g.fill(); }
    g.strokeStyle = "#000"; g.lineCap = "butt"; for (const [a, b, w] of lines) { g.lineWidth = w || 3; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
  }
  // 手で切った窓: 枠を彫り残し、区切りの数・大きさ・傾きを窓ごとに変える(同じ間隔の格子にしない)
  function handWindow(g, x, y, w, h, cols, rows, seed) {
    const bar = Math.max(5, w * 0.11), pw = (w - bar * (cols - 1)) / cols, ph = (h - bar * (rows - 1)) / rows, out = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, q = (a) => (hash(k, a, seed) - 0.5) * 2.4, sx = 1 + (hash(k, 9, seed) - 0.5) * 0.12, sy = 1 + (hash(k, 10, seed) - 0.5) * 0.12;
      const x0 = x + i * (pw + bar), y0 = y + j * (ph + bar), P = [[x0 + q(1), y0 + q(2)], [x0 + pw * sx + q(3), y0 + q(4)], [x0 + pw * sx + q(5), y0 + ph * sy + q(6)], [x0 + q(7), y0 + ph * sy + q(8)]];
      g.beginPath(); poly(g, P); g.fill(); out.push(P);
    }
    return out;
  }
  // 灯った窓のまわりの壁に落ちる光: 短い横の彫り(窓に近いほど太い)。r0 = 光の届く半径
  function wallLight(g, cx, cy, r0, seed, k = 1) {
    const rr = rng(seed); g.fillStyle = "#fff";
    for (let yy = cy - r0 * 0.75; yy < cy + r0 * 1.05; yy += 4.6 * k) for (let xx = cx - r0 * 0.95 + rr() * 8; xx < cx + r0 * 0.95; xx += (12 + rr() * 8) * k) {
      const d = Math.hypot((xx + 6 - cx) / 1.3, yy - cy) / r0; if (d > 1 || rr() < d * 0.45) continue;
      cut(g, [[xx, yy], [xx + (9 + 14 * (1 - d)) * k, yy + (rr() - 0.5)]], (1.0 + 3.4 * (1 - d)) * k, (xx * 5 + yy) | 0, { entry: 0.1, exit: 0.6, jit: 0.3 });
    }
  }
  const via = (g, x, y, r0) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r0, 0, 7); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(x, y, r0 * 0.38, 0, 7); g.fill(); g.fillStyle = "#fff"; };
  function carve(g, letters, seed) { g.fillStyle = "#fff"; letters.forEach((L, i) => { g.beginPath(); pathOf(g, facet(L.cs, Math.min(3.3, L.size * 0.019), seed + i)); g.fill("nonzero"); }); }
  function keepOut(g, letters, lw = 34) { g.fillStyle = "#000"; g.strokeStyle = "#000"; g.lineJoin = "round"; g.lineWidth = lw; for (const L of letters) { g.beginPath(); pathOf(g, L.cs); g.stroke(); g.fill("nonzero"); } }
  // 字の一部に色版: 字形の座標(1em=1)の矩形 or 輪郭の番号で範囲を決め、その範囲の字の塗りに刷る
  function letterPlate(pg, L, { rect, contour }) {
    pg.save(); pg.beginPath();
    if (rect) { const [a, b, c, d] = rect; pg.rect(L.x0 + a * L.size, L.base + b * L.size, (c - a) * L.size, (d - b) * L.size); pg.clip(); pg.beginPath(); pathOf(pg, L.cs); pg.fill("nonzero"); }
    else { pathOf(pg, [L.cs[contour]]); pg.fill("nonzero"); }
    pg.restore();
  }

  // ===== 刷り(cand_a.js と同じ。色版は彫った所にだけ乗る) =====
  // thinKeep(40秒の局所改修、Phase 4 の回): 細い刀(幅 1〜2px)の所だけ、刷りの閾値のノイズを弱め、閾値を下げる(かすれで途切れないように)。
  // 太い刀の所(広いぼかしの値が高い)は今までと同じ処理。thinKeep = false なら改修前と同じ画素
  function print(ctx, mask, plate, look, thinKeep = false) {
    const ink = AD.hex(INK), paper = AD.hex(PAPER), pc = AD.hex(PLATE);
    const [o, og] = buf("out"); og.drawImage(mask, 0, 0);
    const md = mask.getContext("2d").getImageData(0, 0, W, H).data, pd = plate.getContext("2d").getImageData(0, 0, W, H).data;
    let bd = md;
    if (look) { const [b, bg] = buf("blur"); bg.filter = "blur(0.9px)"; bg.drawImage(mask, 0, 0); bd = bg.getImageData(0, 0, W, H).data; }
    let wd = null; if (look && thinKeep) { const [b2, bg2] = buf("blurWide"); bg2.filter = "blur(3px)"; bg2.drawImage(mask, 0, 0); wd = bg2.getImageData(0, 0, W, H).data; }
    const grain = noiseField(W, H, 6, (x, y) => fbm(x * 0.0022, y * 0.09, 61, 3));
    const blot = noiseField(W, H, 8, (x, y) => fbm(x * 0.006, y * 0.006, 62, 4));
    const fiber = noiseField(W, H, 3, (x, y) => fbm(x * 0.05, y * 0.05, 63, 3));
    const edge = noiseField(W, H, 3, (x, y) => vnoise(x * 0.35, y * 0.35, 64));
    // 計測: 版木の中で彫った割合、色版が刷られた割合(画面全体に対して)
    let inBlock = 0, carved = 0, plated = 0;
    perPixel(o, (x, y) => {
      const i = (y * W + x) * 4; let v = bd[i] / 255;
      if (x > BX0 + 8 && x < BX1 - 8 && y > BY0 + 8 && y < BY1 - 8) { inBlock++; if (md[i] > 127) carved++; }
      if (look) { const th = wd ? (v > 0.05 ? 1 - smooth((wd[i] / 255 - 0.12) / 0.35) : 0) : 0, t = 0.5 - 0.14 * th + (edge(x, y) - 0.5) * 0.42 * (1 - 0.8 * th); v = smooth((v - (t - 0.1)) / 0.2); } else v = v > 0.5 ? 1 : 0;
      let ic = ink, pp = paper;
      if (look) {
        const thin = clamp((grain(x, y) - 0.45) * 2.2) * 0.13 + (blot(x, y) - 0.5) * 0.12, speck = hash((x / 2) | 0, (y / 2) | 0, 71) < 0.0007 ? 0.45 : 0;
        ic = mix(ink, paper, clamp(thin + speck, 0, 0.6) * 0.5 + 0.02);
        const f = (fiber(x, y) - 0.5) * 0.09; pp = [paper[0] * (1 + f), paper[1] * (1 + f), paper[2] * (1 + f * 1.2)];
      }
      let c = mix(ic, pp, v);
      const px = look ? x - 3 : x, py = look ? y + 2 : y; let pv = 0;
      if (px >= 0 && py < H) pv = pd[(py * W + px) * 4 + 3] / 255;
      if (pv > 0) { const k = pv * v * (look ? 0.82 + 0.3 * (blot((x * 1.7) % W, (y * 1.7) % H) - 0.5) : 1); if (k > 0.5) plated++; c = [lerp(c[0], c[0] * pc[0] / 255, k), lerp(c[1], c[1] * pc[1] / 255, k), lerp(c[2], c[2] * pc[2] / 255, k)]; }
      return c;
    });
    ctx.drawImage(o, 0, 0);
    return { carved_in_block: +(carved / inBlock).toFixed(4), plate_of_frame: +(plated / (W * H)).toFixed(4) };
  }

  // =====================================================================
  // 8秒(240コマ)「暗闇の数だけ」: 案A の構図のまま、①窓 ②空の弧 ③字の中の日 だけを変える
  // =====================================================================
  const S8 = (() => {
    const EMB = 712, EMB2 = 760, SUN = [960, 742];
    const arcPts = (cx, cy, r, a0, a1, wob, seed, ex, ey) => { const n = Math.max(3, Math.ceil((Math.abs(a1 - a0) * r * 1.3) / 4)), out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = r + (fbm(a * 3, seed, 11, 2) - 0.5) * wob; out.push([cx + Math.cos(a) * rr * ex, cy + Math.sin(a) * rr * ey]); } return out; };
    // 空 v1(cand_a.js と同じ)
    function sky0(g) {
      const r = rng(101); g.fillStyle = "#fff"; let n = 0;
      for (let rad = 52; rad < 1180; rad += 10 + rad * 0.016 + r() * 4) {
        const base = Math.pow(1 - smooth((rad - 46) / 900), 1.35); if (base < 0.03) break; n++;
        let a = Math.PI + (r() * 30) / rad;
        while (a < 2 * Math.PI) {
          const len = (60 + r() * 170) / rad, a1 = Math.min(2 * Math.PI, a + len);
          const pts = arcPts(SUN[0], SUN[1], rad, a, a1, 2.4, (rad * 13) | 0, 1.42, 0.86).filter((p) => p[1] < EMB - 2 && p[0] > BX0 - 10 && p[0] < BX1 + 10);
          const my = pts.length ? pts[(pts.length / 2) | 0][1] : 0, tone = base * (0.45 + 0.55 * (1 - smooth((EMB - my) / 560)));
          const w = 1.1 + 9.5 * tone, gap = lerp(52, 9, tone);
          if (pts.length > 3 && r() > 0.15 * (1 - tone)) cut(g, pts, w * (0.75 + 0.5 * r()), (rad * 7 + a * 100) | 0);
          a = a1 + (5 + r() * gap) / rad;
        }
      }
      return n;
    }
    // 空 v2: 弧の数は v1 以下のまま、①楕円を平たく(横 1.42→1.78、縦 0.86→0.70)して筋を地平に沿わせる
    // ②弧の間隔に低い周波数のゆらぎ(±30%)で「層の束」を作る ③立ち上がる所(両脇)と高い所は間引き、筋を短く・まばらに=暗闇へ溶ける
    // mode 1 = ②だけ(前回の審査の最小案)、mode 2 = ①②③
    function sky2(g, mode) {
      const r = rng(101); g.fillStyle = "#fff"; let n = 0;
      const ex = mode === 2 ? 1.78 : 1.42, ey = mode === 2 ? 0.70 : 0.86;
      for (let rad = 52; rad < 1180;) {
        const base = Math.pow(1 - smooth((rad - 46) / 900), 1.35); if (base < 0.03) break; n++;
        let a = Math.PI + (r() * 30) / rad;
        while (a < 2 * Math.PI) {
          const len = (60 + r() * 170) / rad * (mode === 2 ? 1.25 : 1), a1 = Math.min(2 * Math.PI, a + len);
          const pts = arcPts(SUN[0], SUN[1], rad, a, a1, mode === 2 ? 7 : 2.4, (rad * 13) | 0, ex, ey).filter((p) => p[1] < EMB - 2 && p[0] > BX0 - 10 && p[0] < BX1 + 10);
          const my = pts.length ? pts[(pts.length / 2) | 0][1] : 0, tone = base * (0.45 + 0.55 * (1 - smooth((EMB - my) / 560)));
          let w = 1.1 + 9.5 * tone, gap = lerp(52, 9, tone), skip = 0.15 * (1 - tone);
          if (mode === 2) {
            const am = (a + a1) / 2, steep = Math.abs(Math.cos(am)), high = smooth((EMB - my - 260) / 300); // 両脇の立ち上がり、地平から 260px より上
            skip += 0.92 * smooth((steep - 0.66) / 0.24) + 0.35 * high; // 立ち上がる所は明るさに関係なく間引く(筋を地平に沿わせる)
            gap *= 1 + 1.4 * high; w *= 1 - 0.3 * high;
          }
          if (pts.length > 3 && r() > skip) cut(g, pts, w * (0.75 + 0.5 * r()), (rad * 7 + a * 100) | 0, mode === 2 ? { entry: 0.12, exit: 0.55, jit: 0.7 } : {});
          a = a1 + (5 + r() * gap) / rad;
        }
        const band = 0.75 + 0.6 * fbm(rad * 0.0045, 3.7, 19, 2); // 低い周波数のゆらぎ(±30%、平均 ≒1.05。弧の数を v1 より増やさない)
        rad += (10 + rad * 0.016 + r() * 4) * band;
      }
      return n;
    }
    function water(g) {
      const r = rng(202); g.fillStyle = "#fff";
      for (let y = EMB2 + 9; y < BY1 - 4; y += 5.5 + (y - EMB2) * 0.036) {
        let x = BX0 - 20 + r() * 40;
        while (x < BX1) {
          const half = 120 + (y - EMB2) * 0.55, d = Math.abs(x - SUN[0]) / half, tone = Math.max(0.18 * (1 - (y - EMB2) / 400), Math.pow(clamp(1 - d), 1.6) * (1 - (y - EMB2) / 520));
          const len = lerp(30, 150, r()) * lerp(0.6, 1.2, tone), w = lerp(1.1, 7.5, tone) * (0.7 + 0.6 * r());
          if (r() < 0.25 + tone) { const wob = (vnoise(x * 0.01, y * 0.05, 3) - 0.5) * 3; cut(g, [[x, y + wob], [x + len * 0.5, y + wob + (r() - 0.5) * 1.5], [x + len, y + wob]], w, (x * 3 + y * 7) | 0, { entry: 0.12, exit: 0.5 }); }
          x += len + lerp(40, 8, tone) * (0.5 + r());
        }
      }
    }
    const CITY = [
      J([[BX0 - 10, EMB], [BX0 - 10, 318], [70, 318], [70, 302], [86, 302], [86, 270], [92, 262], [114, 262], [120, 270], [120, 302], [134, 302], [134, 318], [152, 318], [152, EMB]], 1, EMB),
      J([[150, EMB], [150, 566], [208, 524], [266, 566], [266, EMB]], 2, EMB),
      J([[262, EMB], [262, 474], [296, 474], [296, 444], [338, 444], [338, 430], [356, 430], [356, 444], [394, 444], [394, 474], [420, 474], [420, EMB]], 3, EMB),
      J([[418, EMB], [418, 636], [434, 636], [442, 232], [462, 232], [470, 600], [480, 600], [480, EMB]], 4, EMB),
      J([[476, EMB], [476, 500], [552, 500], [552, 478], [600, 478], [600, 500], [644, 500], [644, EMB]], 5, EMB),
      J([[712, EMB], [712, 612], [754, 584], [796, 612], [796, 602], [830, 578], [864, 602], [864, EMB]], 7, EMB),
      J([[860, EMB], [860, 526], [884, 526], [884, 514], [952, 514], [952, 526], [980, 526], [980, EMB]], 8, EMB),
      J([[976, EMB], [976, 650], [1064, 676], [1064, EMB]], 9, EMB),
    ];
    const TOWER = { tank: [[650, 474], [681, 450], [712, 474], [708, 528], [654, 528]], legs: [[[660, 528], [654, EMB]], [[702, 528], [708, EMB]], [[660, 560], [704, 612]], [[704, 560], [658, 612]], [[657, 612], [705, 612]], [[656, 652], [706, 652]]] };
    const MAST = [[[918, 514], [918, 300]], [[904, 360], [932, 360]], [[908, 410], [928, 410]], [[918, 300], [906, 330]]];
    const WINDOWS = [[94, 360], [96, 420], [118, 510], [118, 600], [196, 610], [316, 520], [512, 560], [588, 620], [606, 540], [748, 650], [1010, 690]];
    const LIT = [896, 566];
    function city(g) {
      g.strokeStyle = "#fff"; g.lineJoin = "miter"; g.lineWidth = 6;
      for (const b of CITY) { g.beginPath(); poly(g, b); g.stroke(); }
      g.beginPath(); poly(g, TOWER.tank); g.stroke(); g.lineWidth = 11; for (const [a, b] of TOWER.legs.concat(MAST)) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      g.fillStyle = "#000"; for (const b of CITY) { g.beginPath(); poly(g, b); g.fill(); }
      g.beginPath(); poly(g, TOWER.tank); g.fill(); g.strokeStyle = "#000"; g.lineCap = "butt";
      for (const [i, [a, b]] of TOWER.legs.entries()) { g.lineWidth = i < 2 ? 6 : 3.2; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      for (const [i, [a, b]] of MAST.entries()) { g.lineWidth = i === 0 ? 4.5 : 2.6; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      g.fillStyle = "#000"; g.fillRect(0, EMB, W, EMB2 - EMB);
    }
    function cityDetail(g) {
      g.fillStyle = "#fff"; const r = rng(303);
      for (const b of CITY) {
        let xl = 1e9, xr = -1; for (const [x] of b) { xl = Math.min(xl, x); xr = Math.max(xr, x); }
        const right = (xl + xr) / 2 < SUN[0], xe = right ? xr : xl, sg = right ? 1 : -1;
        const xrTop = b.filter(([x]) => Math.abs(x - xe) < 6).reduce((m, p) => Math.min(m, p[1]), 1e9);
        for (let y = xrTop + 6; y < EMB - 6; y += 6 + r() * 3) {
          const k = 1 - (y - xrTop) / (EMB - xrTop), len = (8 + 30 * k) * (0.6 + 0.6 * r());
          if (r() < 0.25) continue;
          cut(g, [[xe - 3 * sg, y], [xe - (3 + len) * sg, y + (r() - 0.5) * 2]], 1.4 + 1.6 * k, (y * 31 + xe) | 0, { entry: 0.05, exit: 0.7, jit: 0.3 });
        }
      }
      for (const [i, [x, y]] of WINDOWS.entries()) { const w = 9 + hash(i, 3, 9) * 6, h = 12 + hash(i, 4, 9) * 7; g.beginPath(); poly(g, [[x, y], [x + w, y + (hash(i, 5, 9) - 0.5) * 2], [x + w + (hash(i, 6, 9) - 0.5) * 2, y + h], [x, y + h + (hash(i, 7, 9) - 0.5) * 2]]); g.fill(); }
      for (const [a, b, y] of [[480, 640, 512], [480, 640, 532], [866, 976, 540], [300, 390, 458]]) cut(g, [[a + 4, y], [b - 4, y + 1]], 1.6, a + y, { entry: 0.02, exit: 0.3, jit: 0.4 });
      for (let x = BX0 + 30; x < BX1; x += 60 + r() * 70) { if (x > 1490 && x < 1700) continue; cut(g, [[x, EMB + 6], [x + (r() - 0.5) * 3, EMB2 - 8]], 1.3, x | 0, { entry: 0.1, exit: 0.5, jit: 0.3 }); }
      cut(g, [[BX0, EMB2 - 1], [BX1, EMB2 - 1]], 1.6, 77, { entry: 0.01, exit: 0.02, jit: 0.8 });
    }
    // 窓の案: 0 = v1(cand_a.js と同じ) / 1 = 窓を大きく(枠 46×54 → 64×78、2×2 の区切りは不揃い)
    //         2 = 窓は v1 のまま、壁の光の彫りと色版を広く太く / 3 = 窓は v1 のまま、外側に放射の短い彫りの輪で目を導く / 4 = 1 と 2 の中間(採用)
    const WIN = {
      0: { v1: true, plate: [908, 582, 92, 74] },
      1: { f: [882, 552, 64, 78], light: [914, 591, 74, 1], plate: [916, 598, 96, 86] },
      2: { v1: true, light: [908, 582, 100, 1.35], plate: [910, 596, 150, 130] },
      3: { v1: true, ring: true, plate: [908, 590, 92, 74] },
      4: { f: [882, 552, 64, 78], light: [914, 591, 90, 1.2], plate: [916, 600, 132, 112] },
    };
    function litWindowV1(g) { // cand_a.js の litWindow() と同じ
      const [x, y] = LIT; g.fillStyle = "#fff"; const rr = rng(404);
      for (let yy = y - 40; yy < y + 76; yy += 4.6) for (let xx = x - 50 + rr() * 8; xx < x + 70; xx += 12 + rr() * 8) {
        const d = Math.hypot((xx + 6 - (x + 12)) / 1.3, yy - (y + 16)) / 66; if (d > 1 || rr() < d * 0.45) continue;
        cut(g, [[xx, yy], [xx + 9 + 14 * (1 - d), yy + (rr() - 0.5)]], 1.0 + 3.4 * (1 - d), (xx * 5 + yy) | 0, { entry: 0.1, exit: 0.6, jit: 0.3 });
      }
    }
    function v1Panes(g) { const [x, y] = LIT; g.fillStyle = "#000"; g.fillRect(x - 5, y - 5, 46, 54); g.fillStyle = "#fff"; for (const [dx, dy] of [[0, 0], [19, 0], [0, 23], [19, 23]]) { g.beginPath(); poly(g, [[x + dx, y + dy], [x + dx + 16, y + dy - 0.6], [x + dx + 16.6, y + dy + 20], [x + dx + 0.6, y + dy + 20.6]]); g.fill(); } }
    function litWindow(g, mode) {
      const o = WIN[mode];
      if (o.ring) { // 案3: 窓の外に放射の彫り(r 92〜150)、その内側は彫らない
        const rr = rng(405), cx = 914, cy = 588; g.fillStyle = "#fff";
        for (let k = 0; k < 44; k++) { const a = (k / 44) * Math.PI * 2 + rr() * 0.06, r0 = 92 + rr() * 10, r1 = r0 + 26 + rr() * 34; const p0 = [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.9], p1 = [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.9]; if (p0[1] > EMB - 4) continue; cut(g, [p0, p1], 3.2, k * 13, { entry: 0.2, exit: 0.6, jit: 0.4 }); }
      }
      if (o.light) wallLight(g, o.light[0], o.light[1], o.light[2], 404, o.light[3]); else litWindowV1(g);
      if (o.v1) return v1Panes(g);
      const [x, y, w, h] = o.f; g.fillStyle = "#000"; g.fillRect(x, y, w, h); g.fillStyle = "#fff"; handWindow(g, x + 5, y + 5, w - 10, h - 10, 2, 2, 31);
    }
    // 歌詞「暗闇の数だけ」(案A と同じ位置・大きさ)
    const TX = 1594, TT = 104, SIZES = [170, 170, 122, 122, 122, 122];
    const letters = () => vertical("SMB", "暗闇の数だけ", TX, TT, SIZES, 1.03);
    function circuit(g, win) {
      g.fillStyle = "#fff"; const o = WIN[win], tail = o.v1 ? [[914, 638], [914, 622]] : [[914, 640], [914, 628]]; // 窓の下の縁まで
      const pts = [[TX - 64, 736], [1250, 736], [1120, 736], [1046, 736], [1016, 706], [1016, 686], [988, 658], [934, 658], ...tail];
      cut(g, pts, 6.2, 909, { entry: 0.01, exit: 0.015, jit: 0.9 });
      for (const [x, y, r0] of [[TX - 64, 736, 9], [1046, 736, 7], [988, 658, 6]]) via(g, x, y, r0);
    }
    // 字の中の日: sun = 0 なし / 1 = 暗の日偏だけ / 2 = 暗の日偏+闇の中の日(門の中の日)
    function sunPlate(pg, L, mode) {
      if (mode >= 1) letterPlate(pg, L[0], { rect: [0.04, -0.80, 0.36, -0.12] });
      if (mode >= 2) letterPlate(pg, L[1], { contour: 6 });
    }
    return function draw(ctx, { look, win = 4, sky = 2, sun = 2 }) {
      const [m, g] = buf("maskA2");
      g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); blockPath(g); g.fillStyle = "#000"; g.fill(); g.clip();
      const L = letters();
      const arcs = sky === 0 ? sky0(g) : sky2(g, sky); water(g); city(g); keepOut(g, L); cityDetail(g); circuit(g, win); litWindow(g, win); carve(g, L, 300);
      g.restore();
      const [p, pg] = buf("plateA2"); pg.fillStyle = "#000"; const e = WIN[win].plate;
      pg.save(); pg.beginPath(); poly(pg, CITY[6]); pg.clip(); pg.beginPath(); pg.ellipse(e[0], e[1], e[2], e[3], 0, 0, 7); pg.fill(); pg.restore();
      sunPlate(pg, L, sun);
      return Object.assign(print(ctx, m, p, look), { sky_arcs: arcs });
    };
  })();

  // =====================================================================
  // 16秒(480コマ)「ひとつ、またひとつ」: 坂の町を横から。窓が1つ、また1つ灯り、刀の線(回路)が窓から窓へ彫られる。
  // 8秒との違い: 地平は水平でなく右へ下る斜面、町は近く大きく(家は 8秒の約2倍)、字は横組みで斜面に沿って2段、空の彫りは放射でなく横の筋。
  // 家は白い枠で囲まない: 光の側(上と右)の縁だけを刀で彫り、左と下は暗闇に溶かす(箱に見せないため)。
  // =====================================================================
  const S16 = (() => {
    const slope = (x) => 400 + (x - BX0) * 0.27 + (fbm(x * 0.004, 2, 81, 3) - 0.5) * 30; // 斜面の上端
    const GLOW = [1900, 930]; // 光の中心(右下の画面外。斜面の向こうの低い地平)
    function housePoly(x, w, h, type, s, lift = 0) {
      const gL = slope(x), gR = slope(x + w), base = Math.max(gL, gR) + 40, top = Math.min(gL, gR) - h - lift;
      let P;
      if (type === "gable") P = [[x, base], [x, top + h * 0.34], [x + w * 0.5, top - h * 0.04], [x + w, top + h * 0.34], [x + w, base]];
      else if (type === "gable2") P = [[x, base], [x, top + h * 0.42], [x + w * 0.34, top], [x + w * 0.68, top + h * 0.42], [x + w * 0.68, top + h * 0.5], [x + w, top + h * 0.64], [x + w, base]]; // 母屋+片流れの下屋
      else if (type === "gableEnd") P = [[x, base], [x, top + h * 0.3], [x + w * 0.2, top + h * 0.3], [x + w * 0.2, top + h * 0.22], [x + w * 0.62, top - h * 0.08], [x + w, top + h * 0.3], [x + w, base]];
      else if (type === "shed") P = [[x, base], [x, top + h * 0.05], [x + w, top + h * 0.36], [x + w, base]];
      else if (type === "shed2") P = [[x, base], [x, top + h * 0.35], [x + w, top + h * 0.02], [x + w, base]];
      else if (type === "tank") P = [[x, base], [x, top + h * 0.3], [x + w * 0.56, top + h * 0.3], [x + w * 0.56, top + h * 0.08], [x + w * 0.62, top + h * 0.02], [x + w * 0.84, top + h * 0.02], [x + w * 0.9, top + h * 0.08], [x + w * 0.9, top + h * 0.3], [x + w, top + h * 0.3], [x + w, base]];
      else P = [[x, base], [x, top + h * 0.2], [x + w * 0.08, top + h * 0.2], [x + w * 0.08, top + h * 0.12], [x + w, top + h * 0.12], [x + w, base]];
      return J(P, s * 7);
    }
    const BACK = [[250, 210, 130, "tank", 11, 30], [1400, 170, 120, "gable", 12, 74], [1640, 200, 130, "gable", 13, 60]].map(([x, w, h, t, s, l]) => housePoly(x, w, h, t, s, l));
    const FRONT_D = [[70, 210, 150, "gable", 1], [452, 286, 196, "gable2", 3], [770, 140, 104, "shed", 4], [930, 292, 186, "gableEnd", 5], [1300, 190, 120, "shed2", 6], [1520, 230, 136, "flat", 7], [1762, 150, 104, "gable", 8]];
    const FRONT = FRONT_D.map(([x, w, h, t, s]) => housePoly(x, w, h, t, s));
    const roofTop = (P) => P.reduce((m, p) => Math.min(m, p[1]), 1e9);
    const LIT1 = { x: 560, y: roofTop(FRONT[1]) + 104, w: 58, h: 66, cols: 2, rows: 2, seed: 51 }, LIT2 = { x: 1066, y: roofTop(FRONT[3]) + 84, w: 50, h: 76, cols: 1, rows: 2, seed: 52 };
    // 空: 横の筋。明るさ = 右下の光(斜面の向こうの地平) と、尾根のすぐ上の逆光(尾根から 200px)の大きい方。字の近く(枠+44px)は彫らない
    function sky(g, boxes) {
      const r = rng(161); g.fillStyle = "#fff";
      const nearText = (x, y) => boxes.some(([a, b, c, d]) => x > a - 44 && x < c + 44 && y > b - 30 && y < d + 30);
      for (let y = BY0 + 40; y < 980; y += 7 + r() * 5) {
        let x = BX0 - 30 + r() * 60;
        while (x < BX1 + 20) {
          const d = Math.hypot((x - GLOW[0]) / 1.9, (y - GLOW[1]) * 1.15) / 1000, top = slope(x) - 8;
          const tone = Math.max(Math.pow(clamp(1 - d), 0.95), 0.85 * Math.pow(1 - smooth((top - y) / 330), 1.4));
          const len = lerp(40, 260, r()) * lerp(0.7, 1.5, tone);
          if (y < top && r() < 0.1 + tone * 1.1) {
            const pts = []; for (let k = 0; k <= 8; k++) { const xx = x + (len * k) / 8, yy = y + (vnoise(xx * 0.004, y * 0.02, 82) - 0.5) * 10 + (xx - x) * -0.035; if (slope(xx) - 8 < yy || nearText(xx, yy)) break; pts.push([xx, yy]); }
            if (pts.length > 2) cut(g, pts, lerp(1.0, 12, tone) * (0.7 + 0.6 * r()), (x * 3 + y * 11) | 0, { entry: 0.1, exit: 0.55, jit: 0.6 });
          }
          x += len + lerp(110, 10, tone) * (0.4 + r());
        }
      }
    }
    // 家を1軒: 黒の塗り → 光の側の縁(上向き・右向きの辺)だけ刀で彫る(ところどころ途切れる) → 光に向く屋根の面に、軒に平行な瓦の筋 → 右の壁に短い横の彫り
    function house(g, P, seed) {
      g.fillStyle = "#000"; g.beginPath(); poly(g, P); g.fill();
      g.fillStyle = "#fff"; const r = rng(seed);
      for (let k = 0; k < P.length - 1; k++) {
        const [ax, ay] = P[k], [bx, by] = P[k + 1], L = Math.hypot(bx - ax, by - ay); if (L < 4) continue;
        const nx = (by - ay) / L, ny = -(bx - ax) / L; // 外向きの法線(点の順は左下→上→右下の時計回り)
        if (Math.max(ay, by) > slope((ax + bx) / 2) + 6) continue; // 地面の下は彫らない
        if (!(ny < -0.3 || nx > 0.6)) continue; // 光の側だけ
        const tone = clamp(0.35 + 0.65 * smooth((ax - 200) / 1500));
        const segs = Math.max(1, Math.round(L / 70)); for (let s = 0; s < segs; s++) { if (r() < 0.14 * (1 - tone)) continue; const u0 = s / segs + (s ? 0.02 : 0), u1 = (s + 1) / segs; cut(g, [[lerp(ax, bx, u0) + nx, lerp(ay, by, u0) + ny], [lerp(ax, bx, u1) + nx, lerp(ay, by, u1) + ny]], lerp(2.2, 4.2, tone), seed * 31 + k * 7 + s, { entry: 0.05, exit: 0.25, jit: 0.5 }); }
        // 右へ下る屋根の面: 軒に平行な筋を内側へ(縁に近いほど太い)
        if (bx > ax + 4 && by > ay + 4) for (let dpth = 9; dpth < 40; dpth += 7 + r() * 3) {
          const ix = -nx * dpth, iy = -ny * dpth, w = lerp(2.6, 0.9, dpth / 40) * lerp(0.7, 1.2, tone);
          let u = r() * 0.1; while (u < 0.94) { const v = Math.min(0.97, u + 0.12 + r() * 0.3); if (r() < 0.82) cut(g, [[lerp(ax, bx, u) + ix, lerp(ay, by, u) + iy], [lerp(ax, bx, v) + ix, lerp(ay, by, v) + iy]], w, seed + dpth * 13 + ((u * 100) | 0), { entry: 0.1, exit: 0.5, jit: 0.4 }); u = v + 0.03 + r() * 0.06; }
        }
      }
      // 右の壁: 縁から内へ短い横の彫り(上ほど長い)
      let xr = -1; for (const [x] of P) xr = Math.max(xr, x);
      const top = P.filter(([x]) => Math.abs(x - xr) < 6).reduce((m, p) => Math.min(m, p[1]), 1e9), bot = slope(xr) - 4;
      for (let y = top + 10; y < bot; y += 7 + r() * 3) { if (r() < 0.3) continue; const k = 1 - (y - top) / (bot - top + 1), len = (6 + 26 * k) * (0.6 + 0.6 * r()); cut(g, [[xr - 4, y], [xr - 4 - len, y + (r() - 0.5) * 2]], 1.3 + 1.5 * k, (y * 31 + xr) | 0, { entry: 0.05, exit: 0.7, jit: 0.3 }); }
    }
    function hill(g) {
      g.fillStyle = "#000"; g.beginPath(); g.moveTo(BX0 - 20, BY1 + 20); for (let x = BX0 - 20; x <= BX1 + 20; x += 8) g.lineTo(x, slope(x)); g.lineTo(BX1 + 20, BY1 + 20); g.closePath(); g.fill();
      // 尾根の刀の縁: 家の前は途切れる(家が地面に立って見えるように)
      g.fillStyle = "#fff"; let seg = [];
      const inHouse = (x) => FRONT_D.some(([hx, hw]) => x > hx + 6 && x < hx + hw - 6);
      for (let x = BX0 - 10; x <= BX1 + 10; x += 5) { if (inHouse(x)) { if (seg.length > 3) cut(g, seg, 3.0, 171 + x, { entry: 0.05, exit: 0.3, jit: 0.7 }); seg = []; } else seg.push([x, slope(x) + 1]); }
      if (seg.length > 3) cut(g, seg, 3.0, 170, { entry: 0.05, exit: 0.3, jit: 0.7 });
      // 斜面の面: 尾根に平行な列(下へ行くほど間隔が広い)。光の側=右ほど、尾根に近いほど太く長い
      const r = rng(172);
      for (let dy = 30, row = 0; dy < 600; dy += 11 + dy * 0.07, row++) {
        let x = BX0 + r() * 60;
        while (x < BX1) {
          const tone = clamp(Math.max((1 - dy / 420) * smooth((x - 150) / 1500), 0.5 * (1 - dy / 380))), len = lerp(40, 170, r()) * lerp(0.6, 1.3, tone);
          if (r() < 0.05 + tone * 1.1) { const pts = [0, 0.5, 1].map((u) => [x + len * u, slope(x + len * u) + dy + (r() - 0.5) * 2]); cut(g, pts, lerp(0.9, 7.5, tone), (x + dy * 13) | 0, { entry: 0.1, exit: 0.5, jit: 0.4 }); }
          x += len + lerp(120, 12, tone) * (0.5 + r());
        }
      }
    }
    // 石段: 家1の前から家3の前へ、斜面を斜めに下りる(段ごとの短い横の彫り)
    const SX = [650, 700, 750, 800, 850, 900, 950, 1000];
    function stairs(g) { g.fillStyle = "#fff"; SX.forEach((x, i) => { const y = slope(x) + 64; cut(g, [[x - 6, y], [x + 40, y + 1]], 3.0, 600 + i, { entry: 0.05, exit: 0.35, jit: 0.4 }); cut(g, [[x + 18, y + 9], [x + 44, y + 10]], 1.4, 650 + i, { entry: 0.05, exit: 0.5, jit: 0.3 }); }); }
    function lit(g, o, seed) { const cx = o.x + o.w / 2, cy = o.y + o.h / 2; wallLight(g, cx, cy, 96, seed, 1.2); g.fillStyle = "#000"; g.fillRect(o.x - 6, o.y - 6, o.w + 12, o.h + 12); g.fillStyle = "#fff"; handWindow(g, o.x, o.y, o.w, o.h, o.cols, o.rows, o.seed); }
    // 回路の線: 窓1の下から壁を下りて石段の上の地面を窓3の家の前へ、壁を上って窓2へ(45度と90度)。窓2の家の前から右へもう1本、彫りかけで止まる(=次の「繋がってく」)
    function circuit(g) {
      g.fillStyle = "#fff";
      const ax = LIT1.x + 22, bx = LIT2.x + 20, gy = (x) => slope(x) + 30;
      const p1 = [[ax, LIT1.y + LIT1.h + 8], [ax, gy(ax) - 18], [ax + 18, gy(ax)], ...SX.slice(1, -1).map((x) => [x + 24, gy(x + 24)]), [bx - 20, gy(bx - 20)], [bx, gy(bx - 20) - 20], [bx, LIT2.y + LIT2.h + 8]];
      cut(g, p1, 5.2, 941, { entry: 0.01, exit: 0.015, jit: 0.8 });
      const c0 = [bx, gy(bx - 20) - 20], c1 = [bx + 90, gy(bx - 20) - 20], c2 = [bx + 90 + (gy(1290) - gy(bx - 20) + 20), gy(1290)], c3 = [1440, gy(1290)];
      cut(g, [c0, c1, c2, c3], 4.6, 942, { entry: 0.01, exit: 0.45, jit: 0.8 });
      via(g, ax, gy(ax) - 18, 7); via(g, bx, gy(bx - 20) - 20, 8);
    }
    const T1 = () => horizontal("SMB", "ひとつ、", 400, 228, 124, 6), T2 = () => horizontal("SMB", "またひとつ", 860, 392, 124, 6);
    return function draw(ctx, { look }) {
      const [m, g] = buf("maskA2");
      g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); blockPath(g); g.fillStyle = "#000"; g.fill(); g.clip();
      const L = T1().concat(T2());
      sky(g, L.map((l) => AD.bbox(l.cs))); BACK.forEach((P, i) => house(g, P, 820 + i)); FRONT.forEach((P, i) => house(g, P, 800 + i));
      // 平屋根の家のアンテナ(細い刀の線)
      const at = roofTop(FRONT[5]); g.fillStyle = "#fff"; cut(g, [[1660, at], [1660, at - 130]], 2.4, 830, { entry: 0.02, exit: 0.1, jit: 0.3 }); for (const [y, w] of [[96, 18], [70, 12]]) cut(g, [[1660 - w, at - y], [1660 + w, at - y]], 1.8, 831 + y, { entry: 0.05, exit: 0.2, jit: 0.3 });
      hill(g); stairs(g); keepOut(g, L, 30); circuit(g); lit(g, LIT1, 461); lit(g, LIT2, 462); carve(g, L, 500);
      g.restore();
      const [p, pg] = buf("plateA2"); pg.fillStyle = "#000";
      for (const [o, hi] of [[LIT1, 1], [LIT2, 3]]) { pg.save(); pg.beginPath(); poly(pg, FRONT[hi]); pg.clip(); pg.beginPath(); pg.ellipse(o.x + o.w / 2, o.y + o.h / 2 + 6, 132, 112, 0, 0, 7); pg.fill(); pg.restore(); }
      return print(ctx, m, p, look);
    };
  })();

  // =====================================================================
  // 40秒(1200コマ)「まだ、」: 最も黒い版。灯りの消えた同じ町を近くから。窓は1つも彫らず、屋根の上の縁だけが細く残る。
  // 色版は読点「、」の1か所だけ(燃え残り)。読点から1本の線が真下の屋根へ落ち、その屋根の縁だけが太い(=切れていない回路)。
  // 8秒との違い: 地平と川がない(町が画面の下 1/3 を埋める)、空は彫らない、字は1列で画面の高さいっぱい、給水塔は 8秒の約 1.8 倍。
  // =====================================================================
  const S40 = (() => {
    const SZ = 262, TX = 1312, TT = 84, B = BY1 + 30;
    function letters() {
      const L = vertical("SMB", "まだ", TX, TT, SZ, 1.0);
      const y = TT + SZ * 2, x0 = TX - SZ / 2; // 縦組みの読点: 字の枠の右上へ(横組みの字形を +0.58em, -0.72em 動かす)
      const c = AD.contours("SMB", "、", x0 + 0.58 * SZ, y + 0.16 * SZ, SZ);
      L.push({ ch: "、", size: SZ, x0: x0 + 0.58 * SZ, base: y + 0.16 * SZ, cs: c });
      return L;
    }
    // 町(すべて黒。左から: 団地、給水塔、切妻、煙突、のこぎり屋根の工場、切妻、屋上に小屋のあるビル(線の落ちる所)、アンテナ、片流れ、切妻)
    const SH = [
      [[BX0 - 10, B], [BX0 - 10, 802], [170, 802], [170, 788], [214, 788], [214, 802], [292, 802], [292, B]],
      [[292, B], [292, 862], [400, 798], [508, 862], [508, B]],
      [[598, B], [602, 566], [628, 566], [634, B]],
      [[640, B], [640, 880], [700, 818], [700, 880], [760, 818], [760, 880], [820, 818], [820, 880], [880, 818], [880, 880], [940, 818], [940, B]],
      [[936, B], [936, 882], [1046, 828], [1156, 882], [1156, B]],
      [[1150, B], [1150, 824], [1226, 824], [1226, 790], [1290, 790], [1290, 824], [1470, 824], [1470, B]],
      [[1466, B], [1466, 860], [1690, 896], [1690, B]],
      [[1686, B], [1686, 876], [1782, 832], [BX1 + 10, 876], [BX1 + 10, B]],
    ].map((P, i) => J(P, 40 + i, B - 1));
    const TANK = [[320, 690], [366, 656], [412, 690], [406, 754], [326, 754]];
    const LEGS = [[[334, 754], [322, 862]], [[398, 754], [410, 862]], [[334, 780], [404, 832]], [[398, 780], [328, 832]]];
    const MAST = [[1580, 860], [1580, 670]];
    return function draw(ctx, { look, thin = 1 }) {
      const [m, g] = buf("maskA2");
      g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); blockPath(g); g.fillStyle = "#000"; g.fill(); g.clip();
      const L = letters(), cb = AD.bbox(L[2].cs), dx = (cb[0] + cb[2]) / 2, dy = cb[3], roofY = 824;
      const tone = (x) => 0.22 + 0.78 * Math.pow(clamp(1 - Math.abs(x - dx) / 1250), 1.6); // 遠くても細い線は残る
      // 夜の空: 細い横の刀を一面に(幅 0.8〜1.6px、まばら)。黒い町より一段だけ明るい「暗い中間の調子」にして、町を黒い塊として立たせる
      g.fillStyle = "#fff"; const rq = rng(445);
      for (let y = BY0 + 26; y < 900; y += 8 + rq() * 5) { let x = BX0 - 20 + rq() * 80; while (x < BX1) { const len = lerp(60, 340, rq()), t = Math.pow(clamp(1 - (roofY - y) / 760), 2.2), near = Math.pow(clamp(1 - Math.abs(x + len / 2 - dx) / 900), 2); if (rq() < 0.12 + 0.55 * t + 0.2 * near * t) { const yy = y + (vnoise(x * 0.003, y * 0.03, 446) - 0.5) * 6; cut(g, [[x, yy], [x + len / 2, yy + (rq() - 0.5) * 1.5], [x + len, yy]], (1.25 + 0.5 * rq()) * (1 + 0.7 * t + 0.4 * near * t), (x * 7 + y * 3) | 0, { entry: 0.15, exit: 0.6, jit: 0.25 }); } x += len + 30 + rq() * 120; } }
      keepOut(g, L, 46); g.fillStyle = "#000"; g.fillRect(dx - 13, dy + 10, 26, roofY - dy - 10); // 線のまわりは彫らない
      g.fillStyle = "#000"; for (const P of SH) { g.beginPath(); poly(g, P); g.fill(); } g.beginPath(); poly(g, TANK); g.fill(); g.strokeStyle = "#000"; g.lineWidth = 9; for (const [a, b] of LEGS) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); } g.lineWidth = 5; g.beginPath(); g.moveTo(...MAST[0]); g.lineTo(...MAST[1]); g.stroke();
      // 屋根の上の縁だけ(上向きの辺)。線の落ちる所に近いほど太く、遠いほど細く途切れる
      g.fillStyle = "#fff"; const r = rng(441);
      const rim = (a, b, seed, w0 = 1) => { const t = tone((a[0] + b[0]) / 2); if (r() < 0.1 * (1 - t)) return; cut(g, [[a[0], a[1] - 1], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 1], [b[0], b[1] - 1]], (1.0 + 2.8 * t) * w0, seed, { entry: 0.12, exit: 0.3, jit: 0.5 }); }; // 辺ごとに1本の刀(点線にしない)
      SH.forEach((P, i) => { for (let k = 0; k < P.length - 1; k++) { const [a, b] = [P[k], P[k + 1]]; if (b[0] - a[0] > Math.abs(b[1] - a[1]) * 0.25) rim(a, b, 450 + i * 40 + k); } }); // 上向きの縁だけ
      for (let k = 0; k < TANK.length; k++) { const a = TANK[k], b = TANK[(k + 1) % TANK.length]; if (b[0] > a[0]) rim(a, b, 520 + k); }
      g.fillStyle = "#000"; g.beginPath(); poly(g, TANK); g.fill(); g.strokeStyle = "#000"; g.lineWidth = 7; for (const [a, b] of LEGS) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      g.fillStyle = "#fff"; cut(g, [[LEGS[1][0][0] + 4, 758], [LEGS[1][1][0] + 4, 860]], 1.6, 530, { entry: 0.1, exit: 0.5, jit: 0.3 }); // 右の脚の縁にだけ細い光
      cut(g, [MAST[0], MAST[1]], 1.5, 531, { entry: 0.02, exit: 0.3, jit: 0.3 });
      // 地平の代わりに、屋根の上のごく弱い残りの光(線の落ちる所を中心に、短く細い横の彫り)
      for (let y = roofY - 26; y > roofY - 120; y -= 9 + r() * 6) { let x = dx - 460 + r() * 40; while (x < dx + 460) { const t = Math.pow(clamp(1 - Math.abs(x - dx) / 460), 1.6) * (1 - (roofY - y) / 130), len = lerp(20, 80, r()); if (r() < t * 0.8 && Math.abs(x + len / 2 - dx) > 20) cut(g, [[x, y], [x + len, y + (r() - 0.5) * 2]], lerp(0.9, 2.2, t), (x + y * 7) | 0, { entry: 0.1, exit: 0.6, jit: 0.3 }); x += len + lerp(90, 20, t) * (0.5 + r()); } }
      // 1本の線: 読点から真下の屋根へ(切れていない回路)。屋根に刺した丸
      cut(g, [[dx, dy + 24], [dx, (dy + roofY) / 2], [dx, roofY - 9]], 3.0, 430, { entry: 0.02, exit: 0.03, jit: 0.5 });
      via(g, dx, roofY, 8);
      carve(g, L, 700);
      g.restore();
      const [p, pg] = buf("plateA2"); pg.fillStyle = "#000"; letterPlate(pg, L[2], { contour: 0 });
      return Object.assign(print(ctx, m, p, look, thin !== 0), { drop: [Math.round(dx), Math.round(dy)], thin_keep: thin !== 0 }); // thin=0 で改修前(style_ac_40s_look_v2before.png)
    };
  })();

  return function draw(ctx, o) { return ({ 8: S8, 16: S16, 40: S40 })[o.t || 8](ctx, o); };
})();
