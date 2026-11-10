// 回路の街(基板=街)。生成は seed だけで決まり、描画は カメラ cam3 と状態 st とコマ f だけで決まる。
// 世界: X=横、Z=奥、Y=上(m)。地面 Y=0。道=配線の束(バス)、建物=チップ、窓=チップの側面の灯り、柱=空へ上る光。
// 第1段階の弱点(チップが「暗い箱」、街としての説得力が弱い)への手当て: 区画の格子・高さの分布(中心ほど高い塔)・窓の格子と灯り・屋上の灯り・
// 引き出し線(ピン → 45度で曲がって道へ)・束の 45 度の折れ・ビア。
const CITY = (() => {
  const { clamp, lerp, hash, rng, pj, mix, css, rgb, W, H } = Y;
  const C = KAIRO.C;

  function gen(seed = 11) {
    const r = rng(seed), traces = [], vias = [], chips = [], pylons = [], pours = [];
    const xs = [], zs = []; for (let x = -58; x < 58; x += 5.6 + r() * 3.2) xs.push(x); for (let z = -44; z < 170; z += 5.4 + r() * 3.4) zs.push(z);
    const lanes = 0.085, LW = 0.03, AV = [-1.9, 2.5, 165]; // 大通りの X 範囲と奥の端
    // 束(平行な配線)。中心線 c を法線方向にずらす(角は留め継ぎ)
    function bundle(c, k, w, kind, gap = lanes) {
      for (let j = 0; j < k; j++) {
        const off = (j - (k - 1) / 2) * gap, pts = [];
        for (let i = 0; i < c.length; i++) {
          const nrm = (p, q) => { const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
          let n1 = [0, 0], cnt = 0; if (i > 0) { const s = nrm(c[i - 1], c[i]); n1[0] += s[0]; n1[1] += s[1]; cnt++; } if (i < c.length - 1) { const s = nrm(c[i], c[i + 1]); n1[0] += s[0]; n1[1] += s[1]; cnt++; }
          const nl = Math.hypot(n1[0], n1[1]) || 1, nx = n1[0] / nl, nz = n1[1] / nl; let m = 1;
          if (cnt === 2) { const s = nrm(c[i - 1], c[i]); m = 1 / Math.max(0.5, nx * s[0] + nz * s[1]); }
          pts.push([c[i][0] + nx * off * m, c[i][1] + nz * off * m]);
        }
        let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        traces.push({ pts, len, w, kind, r: r(), seed: (r() * 1e6) | 0, zc: (pts[0][1] + pts[pts.length - 1][1]) / 2, xc: (pts[0][0] + pts[pts.length - 1][0]) / 2 });
      }
    }
    // 道(縦の道: X 一定で Z 方向。横の道: Z 一定で X 方向)。区間ごとに束の本数を変え、ときどき 45 度で折れる
    for (const x of xs) for (let j = 0; j < zs.length - 1; j++) {
      if (r() > 0.86) continue; const z0 = zs[j] + 0.7, z1 = zs[j + 1] - 0.7, k = 2 + ((r() * 7) | 0);
      let c = [[x, z0], [x, z1]];
      if (r() < 0.4 && z1 - z0 > 3) { const d = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.3), zm = lerp(z0, z1, 0.25 + r() * 0.4); c = [[x, z0], [x, zm], [x + d, zm + Math.abs(d)], [x + d, z1]]; }
      bundle(c, k, LW, "bus"); if (r() < 0.5) vias.push([x + (r() - 0.5) * 0.4, z0 - 0.25, 0.06]);
    }
    for (const z of zs) for (let i = 0; i < xs.length - 1; i++) {
      if (r() > 0.8) continue; const x0 = xs[i] + 0.7, x1 = xs[i + 1] - 0.7, k = 2 + ((r() * 6) | 0);
      let c = [[x0, z], [x1, z]];
      if (r() < 0.4 && x1 - x0 > 3) { const d = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.3), xm = lerp(x0, x1, 0.25 + r() * 0.4); c = [[x0, z], [xm, z], [xm + Math.abs(d), z + d], [x1, z + d]]; }
      bundle(c, k, LW, "bus");
    }
    // 区画: チップ(建物)と引き出し線
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const bx0 = xs[i] + 1.0, bx1 = xs[i + 1] - 1.0, bz0 = zs[j] + 1.0, bz1 = zs[j + 1] - 1.0; if (bx1 - bx0 < 1 || bz1 - bz0 < 1) continue;
      const cxm = (bx0 + bx1) / 2, czm = (bz0 + bz1) / 2, down = Math.exp(-Math.pow(cxm / 16, 2) - Math.pow((czm - 52) / 34, 2)); // 中心街(奥の中央)ほど高い
      // 銅のベタ(区画の地面を少し明るくする面。盤の明暗のむら)
      if (rng((i * 7919 + j * 104729 + seed) | 0)() < 0.4) { const rp = rng((i * 31 + j * 17 + seed * 3) | 0); const ax = lerp(bx0, bx1, rp() * 0.3), az = lerp(bz0, bz1, rp() * 0.3); pours.push([ax - 0.6, az - 0.6, lerp(bx0, bx1, 0.7 + rp() * 0.3) + 0.6, lerp(bz0, bz1, 0.7 + rp() * 0.3) + 0.6, rp()]); }
      // 区画の中の細かい配線(盤の密度。0/45/90 度で 2〜4 回曲がる短い線)。乱数は別の系列(建物の配置を変えない)
      { const rf = rng((i * 997 + j * 131 + seed) | 0), nF = Math.round((bx1 - bx0) * (bz1 - bz0) * 0.55);
        const dirs = [[0, 1], [0.7071, 0.7071], [1, 0], [0.7071, -0.7071], [0, -1], [-0.7071, -0.7071], [-1, 0], [-0.7071, 0.7071]];
        for (let q = 0; q < nF; q++) {
          let x = lerp(bx0 - 0.6, bx1 + 0.6, rf()), z = lerp(bz0 - 0.6, bz1 + 0.6, rf()), di = rf() < 0.6 ? (rf() < 0.5 ? 0 : 2) : (rf() * 8) | 0; const pts = [[x, z]];
          for (let s = 0, n = 2 + ((rf() * 3) | 0); s < n; s++) { const l = 0.25 + rf() * 1.3; x += dirs[di][0] * l; z += dirs[di][1] * l; pts.push([x, z]); di = (di + (rf() < 0.5 ? 1 : 7) + 8) % 8; }
          const k = rf() < 0.35 ? 2 + ((rf() * 3) | 0) : 1; bundle(pts, k, 0.016 + rf() * 0.01, "fill", 0.06);
          if (rf() < 0.4) vias.push([pts[pts.length - 1][0], pts[pts.length - 1][1], 0.04]);
        } }
      const split = r() < 0.45 ? 1 : r() < 0.6 ? 2 : 4, cells = [];
      if (split === 1) cells.push([bx0, bz0, bx1, bz1]);
      else if (split === 2) { const m = lerp(bx0, bx1, 0.4 + r() * 0.2); cells.push([bx0, bz0, m - 0.35, bz1], [m + 0.35, bz0, bx1, bz1]); }
      else { const mx = lerp(bx0, bx1, 0.5), mz = lerp(bz0, bz1, 0.5); cells.push([bx0, bz0, mx - 0.3, mz - 0.3], [mx + 0.3, bz0, bx1, mz - 0.3], [bx0, mz + 0.3, mx - 0.3, bz1], [mx + 0.3, mz + 0.3, bx1, bz1]); }
      for (const [a0, b0, a1, b1] of cells) {
        if (r() < 0.12) continue; // 空き地(配線だけ)
        if (a1 > AV[0] && a0 < AV[1] && b0 < AV[2]) { r(); r(); r(); continue; } // 大通り(光の道)には建てない
        const fw = (a1 - a0) * (0.55 + r() * 0.4), fd = (b1 - b0) * (0.55 + r() * 0.4), X = lerp(a0 + fw / 2, a1 - fw / 2, r()), Z = lerp(b0 + fd / 2, b1 - fd / 2, r());
        const tower = r() < 0.08 + 0.55 * down;
        const h = tower ? 1.4 + Math.pow(r(), 0.8) * (2.2 + 3.4 * down) : 0.1 + Math.pow(r(), 2.2) * 0.9;
        const type = tower ? "tower" : r() < 0.25 ? "cap" : "ic";
        chips.push({ X, Z, w: fw, d: fd, h, type, seed: (r() * 1e6) | 0, wr: r(), tier: tower && r() < 0.5 ? 0.55 + r() * 0.25 : 0 });
        // 引き出し線: 長い辺から道へ。ピン → まっすぐ 0.2〜0.5 → 45 度 → 道の手前でビア
        const n = Math.max(2, Math.round(fw * 2.2));
        for (const side of [-1, 1]) {
          if (r() < 0.35) continue;
          const zEdge = Z + (side * fd) / 2, zStreet = side > 0 ? zs[j + 1] - 0.55 : zs[j] + 0.55;
          for (let q = 0; q < n; q++) {
            if (r() < 0.3) continue; const x = X - fw / 2 + ((q + 0.5) / n) * fw, s1 = 0.15 + r() * 0.3, dx = (r() - 0.5) * 0.8;
            const p = [[x, zEdge], [x, zEdge + side * s1], [x + dx, zEdge + side * (s1 + Math.abs(dx))], [x + dx, zStreet]];
            if ((zStreet - p[2][1]) * side > 0.05) { bundle(p, 1, 0.02, "fan"); vias.push([x + dx, zStreet, 0.045]); }
          }
        }
      }
    }
    // 大通り(光の道): X≈0 を奥へまっすぐ走る太い束(12本)。冒頭の信号・疾走・夜明けの照り返しが通る
    bundle([[0.3, -44], [0.3, AV[2]]], 12, 0.034, "avenue", 0.11);
    for (const s of [-1, 1]) bundle([[0.3 + s * 1.25, -44], [0.3 + s * 1.25, AV[2]]], 3, 0.026, "avenue", 0.08);
    // 空へ上る光の柱(遠くの区画)
    for (let i = 0; i < 26; i++) pylons.push({ X: (r() * 2 - 1) * 46, Z: 40 + r() * 110, h: 6 + Math.pow(r(), 2) * 34, a: 0.25 + r() * 0.5, seed: (r() * 1e6) | 0 });
    traces.forEach((t, i) => (t.i = i));
    return { traces, vias, chips, pylons, pours, xs, zs, buses: traces.filter((t) => t.kind === "bus"), avenue: traces.filter((t) => t.kind === "avenue"), AV };
  }
  const get = (seed = 11) => Y.once("city" + seed, () => gen(seed));

  // 点列の [s0, s1] の部分
  function along(pts, s) { let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + l >= s) { const k = (s - acc) / (l || 1); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; } acc += l; } return pts[pts.length - 1]; }
  function sub(pts, s0, s1) { const out = [along(pts, s0)]; let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc > s0 && acc < s1) out.push(b); } out.push(along(pts, s1)); return out; }

  // 地面の線分を近い面で切って投影(kit camera の seg と同じ考え)
  const NEAR = 0.3;
  function segTo(path, c, a, b, yA = 0, yB = 0) {
    let A = pj(c, a[0], yA, a[1]), B = pj(c, b[0], yB, b[1]);
    if (A[2] < NEAR && B[2] < NEAR) return false;
    if (A[2] < NEAR || B[2] < NEAR) {
      const t = (NEAR - A[2]) / (B[2] - A[2]), m = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], M = pj(c, m[0], lerp(yA, yB, t), m[1]);
      if (A[2] < NEAR) A = M; else B = M;
    }
    path.moveTo(A[0], A[1]); path.lineTo(B[0], B[1]); return true;
  }
  const inView = (c, X, Z, margin = 600) => { const p = pj(c, X, 0, Z); return p[2] > NEAR && p[0] > -margin && p[0] < W + margin && p[1] > -margin * 1.5 && p[1] < H + margin; };
  const dist = (c, X, Z) => Math.hypot(X - c.x, Z - c.z, c.y);

  // ---- 空 ----
  // pal: 上→地平の色(5〜7色)。roll を含めて地平に沿わせる
  function sky(ctx, c, pal, { stars = 0, starSeed = 17, f = 0, haze = null } = {}) {
    if (c.pitch < -1.25) return;
    const hy = Y.horizonY(c) - c.cy;
    ctx.save(); ctx.translate(c.cx, c.cy); ctx.rotate(c.roll || 0);
    const top = -1400, g = ctx.createLinearGradient(0, Math.max(top, hy - 1100), 0, hy);
    pal.forEach((col, i) => g.addColorStop(i / (pal.length - 1), col));
    ctx.fillStyle = g; ctx.fillRect(-1600, top, 3200, hy - top + 4);
    if (stars > 0) { const sr = rng(starSeed); for (let i = 0; i < 260; i++) { const x = (sr() - 0.5) * 3000, y = hy - 30 - sr() * 1300, a = (0.12 + sr() * 0.5) * stars * (0.75 + 0.25 * Math.sin(f * 0.05 + i)); if (y < top) continue; ctx.fillStyle = css("#d6f5ee", a); const s = sr() < 0.08 ? 2.4 : 1.4; ctx.fillRect(x, y, s, s); } }
    if (haze) { const v = ctx.createLinearGradient(0, hy - haze.h, 0, hy + 6); v.addColorStop(0, css(haze.col, 0)); v.addColorStop(1, css(haze.col, haze.a)); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = v; ctx.fillRect(-1600, hy - haze.h, 3200, haze.h + 6); }
    ctx.restore();
  }
  // 地面の下地(地平から手前へ)
  function ground(ctx, c, top, bottom) {
    const hy = c.pitch < -1.25 ? -2000 : Y.horizonY(c) - c.cy;
    ctx.save(); ctx.translate(c.cx, c.cy); ctx.rotate(c.roll || 0);
    const g = ctx.createLinearGradient(0, Math.max(-1400, hy), 0, Math.max(-1400, hy) + 900); g.addColorStop(0, top); g.addColorStop(0.3, css(mix(top, bottom, 0.65))); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(-1600, hy, 3200, 3000); ctx.restore();
  }

  // ---- 盤(配線・ビア) ----
  // st: fogCol, fogD, wire, wireHi, maxD, litTraces(0..1 の割合)、litCol、litA、wireA
  function traces(ctx, c, CT, st) {
    const { fogCol = C.fog, fogD = 45, wire = C.verd, wireHi = C.verdHi, maxD = 140, litTraces = 0, litCol = C.mint, litA = 0.8, wireA = 1, minPx = 0.6, litFn = null } = st;
    const bins = new Map(), lit = [];
    if (st.pour !== 0) { ctx.save(); for (const q of CT.pours) { const cx2 = (q[0] + q[2]) / 2, cz2 = (q[1] + q[3]) / 2, d = dist(c, cx2, cz2); if (d > maxD * 0.8 || !inView(c, cx2, cz2, 1200)) continue; const k = 1 - Math.exp(-d / fogD); const pth = new Path2D(); const cs = [[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]], [q[0], q[1]]]; let ok = true; const ps = cs.map(([x, z]) => pj(c, x, 0, z)); if (ps.some((p) => p[2] < NEAR)) continue; ps.forEach((p, i) => (i ? pth.lineTo(p[0], p[1]) : pth.moveTo(p[0], p[1]))); ctx.fillStyle = css(mix(st.pourCol || "#0e2a27", fogCol, k), (0.35 + 0.3 * q[4]) * (1 - k) * (st.pour ?? 1)); ctx.fill(pth); } ctx.restore(); }
    for (const t of CT.traces) {
      const d = dist(c, t.xc, t.zc); if (d > maxD) continue;
      if (!inView(c, t.xc, t.zc, 900)) continue;
      const k = 1 - Math.exp(-d / fogD), px = Math.max(minPx, (t.w * c.f) / Math.max(0.5, d * 0.9 + 0.1));
      const isLit = litFn ? litFn(t) : t.kind === "bus" && t.r < litTraces;
      const key = Math.min(11, (k * 12) | 0) * 100 + Math.min(40, Math.round(px * 2));
      let p = bins.get(key); if (!p) { p = new Path2D(); bins.set(key, p); }
      for (let i = 1; i < t.pts.length; i++) segTo(p, c, t.pts[i - 1], t.pts[i]);
      if (isLit) lit.push([t, k, px]);
    }
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const [key, p] of bins) {
      const k = ((key / 100) | 0) / 12 + 0.04, px = (key % 100) / 2;
      ctx.strokeStyle = css(mix(wire, fogCol, k), wireA * (1 - k * 0.8)); ctx.lineWidth = Math.max(minPx, px); ctx.stroke(p);
      if (px > 2.4) { ctx.strokeStyle = css(mix(wireHi, fogCol, k), 0.3 * (1 - k) * wireA); ctx.lineWidth = px * 0.3; ctx.stroke(p); }
    }
    // ビア(近い所だけ。輪+穴)
    for (const v of CT.vias) {
      const d = dist(c, v[0], v[1]); if (d > 40) continue; const q = pj(c, v[0], 0, v[1]); if (q[2] < NEAR || q[0] < -50 || q[0] > W + 50 || q[1] < -50 || q[1] > H + 50) continue;
      const k = 1 - Math.exp(-d / fogD), rr = Math.max(0.7, (v[2] * c.f) / q[2]), sq = clamp(Math.abs(Math.sin(c.pitch)) + c.y / q[2] * 1.2 + 0.15, 0.15, 1);
      ctx.fillStyle = css(mix(wireHi, fogCol, k), 0.85 * (1 - k * 0.8) * wireA); ctx.beginPath(); ctx.ellipse(q[0], q[1], rr, rr * sq, c.roll || 0, 0, 7); ctx.fill();
      if (rr > 1.6) { ctx.fillStyle = css(C.ink, 0.9 * (1 - k)); ctx.beginPath(); ctx.ellipse(q[0], q[1], rr * 0.45, rr * 0.45 * sq, c.roll || 0, 0, 7); ctx.fill(); }
    }
    // 灯った配線(加算。にじみ → 芯)
    if (lit.length) {
      ctx.globalCompositeOperation = "lighter";
      const pw = new Path2D(), pc = new Path2D(); let mx = 0;
      for (const [t, k, px] of lit) { const a = litA * (1 - k * 0.7); if (a < 0.05) continue; for (let i = 1; i < t.pts.length; i++) { segTo(pw, c, t.pts[i - 1], t.pts[i]); segTo(pc, c, t.pts[i - 1], t.pts[i]); } mx = Math.max(mx, px); }
      ctx.strokeStyle = css(litCol, litA * 0.22); ctx.lineWidth = 5; ctx.stroke(pw);
      ctx.strokeStyle = css(litCol, litA * 0.85); ctx.lineWidth = 1.4; ctx.stroke(pc);
    }
    ctx.restore();
  }

  // ---- 信号(配線を走る光) ----
  // n 本。束の配線から seed で選ぶ。速さ sp(m/コマ)、尾の長さ tail(m)
  function signals(ctx, c, CT, f, { n = 60, seed = 5, sp = 0.09, tail = 2.2, col = C.mint, head = C.white, a = 0.95, maxD = 70, pick = null } = {}) {
    const r = rng(seed), B = CT.buses;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const t = B[(r() * B.length) | 0], ph = r(), s2 = sp * (0.6 + r() * 0.8), dir = r() < 0.5, aa = a * (0.55 + r() * 0.45);
      if (pick && !pick(t, i)) continue;
      const d = dist(c, t.xc, t.zc); if (d > maxD) continue;
      const L = t.len + tail, s = Y.mod(ph * L + f * s2, L), s1 = Math.min(s, t.len), s0 = Math.max(0, s - tail); if (s1 - s0 < 0.02) continue;
      const pts = dir ? t.pts : t.pts.slice().reverse(), seg = sub(pts, s0, s1);
      const sp2 = seg.map((p) => pj(c, p[0], 0.002, p[1])); if (sp2.some((q) => q[2] < NEAR)) continue;
      const k = 1 - Math.exp(-d / 60), px = clamp((t.w * 2.2 * c.f) / Math.max(0.6, sp2[sp2.length - 1][2]), 1.1, 9);
      for (let j = 1; j < sp2.length; j++) { const u = j / (sp2.length - 1); ctx.strokeStyle = css(col, aa * (0.15 + 0.85 * u) * (1 - k * 0.6)); ctx.lineWidth = px * (0.6 + 0.4 * u); ctx.beginPath(); ctx.moveTo(sp2[j - 1][0], sp2[j - 1][1]); ctx.lineTo(sp2[j][0], sp2[j][1]); ctx.stroke(); }
      const hp = sp2[sp2.length - 1]; ctx.fillStyle = css(head, aa); ctx.beginPath(); ctx.arc(hp[0], hp[1], px * 0.9, 0, 7); ctx.fill();
      if (px > 1.6) Y.glow(ctx, hp[0], hp[1], px * 9, col, 0.4 * aa * (1 - k));
    }
    ctx.restore();
  }

  // ---- 光の柱(遠くの区画から空へ) ----
  function pylonsDraw(ctx, c, CT, f, { col = C.mint, a = 1, grow = 1, sel = null } = {}) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    CT.pylons.forEach((p, i) => {
      if (sel && !sel(p, i)) return; const hh = p.h * grow; if (hh <= 0.05) return;
      const b = pj(c, p.X, 0, p.Z), t = pj(c, p.X, hh, p.Z); if (b[2] < NEAR) return;
      const w = Math.max(1, (0.09 * c.f) / b[2]), g = ctx.createLinearGradient(t[0], t[1], b[0], b[1]);
      g.addColorStop(0, css(col, 0)); g.addColorStop(1, css(col, p.a * a)); ctx.strokeStyle = g; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(t[0], t[1]); ctx.stroke();
      const ph = Y.mod(hash(p.seed, 3) + f * (0.004 + hash(p.seed, 4) * 0.006), 1), m = pj(c, p.X, hh * ph, p.Z);
      ctx.fillStyle = css(C.white, p.a * a * (1 - ph)); ctx.fillRect(m[0] - w, m[1] - 5, w * 2, 6);
      Y.glow(ctx, b[0], b[1], 10 + w * 6, col, 0.35 * a * p.a);
    });
    ctx.restore();
  }

  // ---- チップ(建物) ----
  // st: chipTop, chipSide, fogCol, fogD, rimCol, rimA, winCol, lit(chip) → 0..1 の灯りの割合, dawn(0..1), maxD, filter
  function chipsDraw(ctx, c, CT, f, st) {
    const { chipTop = "#0e2422", chipSide = "#050c0d", fogCol = C.fog, fogD = 45, rimCol = C.verdHi, rimA = 0.55, winCol = "#bafff0", lit = () => 0.3, maxD = 120, filter = null, roofLights = 1, sideLight = "#1d4a46", edgeA = 0.18 } = st;
    const list = [];
    for (const ch of CT.chips) {
      if (filter && !filter(ch)) continue; const d = dist(c, ch.X, ch.Z); if (d > maxD) continue;
      if (!inView(c, ch.X, ch.Z, 700) && !inView(c, ch.X, ch.Z, 700)) continue;
      list.push([d, ch]);
    }
    list.sort((a, b) => b[0] - a[0]);
    ctx.save(); ctx.lineJoin = "round";
    for (const [d, ch] of list) {
      const k = 1 - Math.exp(-d / fogD), x0 = ch.X - ch.w / 2, x1 = ch.X + ch.w / 2, z0 = ch.Z - ch.d / 2, z1 = ch.Z + ch.d / 2, h = ch.h;
      const Pp = (x, y, z) => pj(c, x, y, z);
      const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      const bot = corners.map(([x, z]) => Pp(x, 0, z)), top = corners.map(([x, z]) => Pp(x, h, z));
      if (bot.some((q) => q[2] < NEAR) || top.some((q) => q[2] < NEAR)) continue;
      const poly = (ps) => { ctx.beginPath(); ps.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
      // 接地の影
      ctx.fillStyle = css(C.ink, 0.5 * (1 - k)); poly([Pp(x0 - 0.12, 0, z0 - 0.08), Pp(x1 + 0.12, 0, z0 - 0.08), Pp(x1 + 0.25, 0, z1 + 0.3), Pp(x0 - 0.25, 0, z1 + 0.3)]); ctx.fill();
      const lf = clamp(lit(ch, f));
      // 側面(カメラ側を向く面だけ): 面の法線と、面の中心→カメラの向き
      const faces = [[0, 1, [0, -1]], [1, 2, [1, 0]], [2, 3, [0, 1]], [3, 0, [-1, 0]]];
      for (const [a, b, nrm] of faces) {
        const mx = (corners[a][0] + corners[b][0]) / 2, mz = (corners[a][1] + corners[b][1]) / 2;
        if ((c.x - mx) * nrm[0] + (c.z - mz) * nrm[1] <= 0) continue;
        const quad = [bot[a], bot[b], top[b], top[a]];
        const shade = nrm[1] !== 0 ? 1 : 0.72; // 正面と横で明るさを変える
        const g = ctx.createLinearGradient(0, Math.min(top[a][1], top[b][1]), 0, Math.max(bot[a][1], bot[b][1]));
        const base = mix(chipSide, fogCol, k);
        g.addColorStop(0, css(mix(base, mix(sideLight, fogCol, k), 0.55 * shade))); g.addColorStop(1, css(mix(base, "#000", 0.25)));
        ctx.fillStyle = g; poly(quad); ctx.fill();
        // 窓: 面の上の格子。小さすぎる時は面の色で平均の灯りを出す
        if (h > 0.25 && lf > 0.001) {
          const flen = Math.hypot(corners[b][0] - corners[a][0], corners[b][1] - corners[a][1]), cols = Math.max(1, Math.floor(flen / 0.17)), rows = Math.max(1, Math.floor((h - 0.08) / 0.15));
          const wpx = (0.07 * c.f) / bot[a][2];
          if (wpx < 1.1) { ctx.fillStyle = css(mix(winCol, fogCol, k * 0.7), 0.22 * lf * (1 - k * 0.5)); poly(quad); ctx.fill(); }
          else {
            const rs = rng(ch.seed + a * 7); ctx.fillStyle = css(mix(winCol, fogCol, k * 0.6), 1);
            for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
              const v = rs(), tw = rs(); if (v > lf) continue;
              // ゆっくり点いたり消えたり(数秒単位。強い明滅にしない)
              if (hash(ch.seed + i * 31 + j * 7, Math.floor((f + tw * 240) / 240)) < 0.06) continue;
              const u0 = (i + 0.22) / cols, u1 = (i + 0.78) / cols, y0 = 0.06 + (j + 0.25) * ((h - 0.08) / rows), y1 = y0 + (h - 0.08) / rows * 0.55;
              const ax = lerp(corners[a][0], corners[b][0], u0), az = lerp(corners[a][1], corners[b][1], u0), bx = lerp(corners[a][0], corners[b][0], u1), bz = lerp(corners[a][1], corners[b][1], u1);
              const q1 = Pp(ax, y0, az), q2 = Pp(bx, y0, bz), q3 = Pp(bx, y1, bz), q4 = Pp(ax, y1, az);
              ctx.globalAlpha = (0.45 + 0.55 * tw) * (1 - k * 0.55); ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.lineTo(q3[0], q3[1]); ctx.lineTo(q4[0], q4[1]); ctx.closePath(); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        }
        // 縦の角の細い光(面の端)
        if (k < 0.85) { ctx.strokeStyle = css(rimCol, edgeA * (1 - k)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top[a][0], top[a][1]); ctx.lineTo(bot[a][0], bot[a][1]); ctx.stroke(); }
      }
      // 上面(屋上)
      if (c.y > h) {
        const tc = mix(chipTop, fogCol, k), gt = ctx.createLinearGradient(top[0][0], top[0][1], top[2][0], top[2][1]);
        gt.addColorStop(0, css(tc)); gt.addColorStop(1, css(mix(tc, rimCol, 0.2 * (1 - k * 0.7)))); ctx.fillStyle = gt; poly(top); ctx.fill();
        // 刻印の枠と1番ピンの点(近い時だけ)
        if (d < 26) {
          const ins = 0.16, q = [[lerp(x0, x1, ins), lerp(z0, z1, ins)], [lerp(x0, x1, 1 - ins), lerp(z0, z1, ins)], [lerp(x0, x1, 1 - ins), lerp(z0, z1, 1 - ins)], [lerp(x0, x1, ins), lerp(z0, z1, 1 - ins)]].map(([x, z]) => Pp(x, h, z));
          ctx.strokeStyle = css("#9fd6cc", 0.2 * (1 - k)); ctx.lineWidth = Math.max(0.6, (0.012 * c.f) / q[0][2]); poly(q); ctx.stroke();
          const d0 = Pp(lerp(x0, x1, ins + 0.07), h, lerp(z0, z1, ins + 0.1)); ctx.fillStyle = css("#9fd6cc", 0.35 * (1 - k)); ctx.beginPath(); ctx.arc(d0[0], d0[1], Math.max(0.8, (0.025 * c.f) / d0[2]), 0, 7); ctx.fill();
        }
      }
      // 屋上の縁の光(奥の辺)
      ctx.strokeStyle = css(rimCol, rimA * (1 - k * 0.6)); ctx.lineWidth = Math.max(0.8, (0.02 * c.f) / top[2][2]); ctx.beginPath(); ctx.moveTo(top[3][0], top[3][1]); ctx.lineTo(top[2][0], top[2][1]); ctx.stroke();
      // ピン(低いチップの足)。近いものだけ
      if (ch.type === "ic" && d < 18) {
        const np = Math.max(3, Math.round(ch.w * 7)), pl = 0.07, pw = (ch.w / np) * 0.45; ctx.fillStyle = css(mix("#5e8f88", fogCol, k), 0.9 * (1 - k));
        for (let i = 0; i < np; i++) { const x = lerp(x0, x1, (i + 0.5) / np); for (const [za, zb] of [[z0 - pl, z0], [z1, z1 + pl]]) { poly([Pp(x - pw / 2, 0.01, za), Pp(x + pw / 2, 0.01, za), Pp(x + pw / 2, 0.02, zb), Pp(x - pw / 2, 0.02, zb)]); ctx.fill(); } }
      }
      // 塔の屋上の灯り(ゆっくり点滅、周期 1.6〜2.4 秒)
      if (ch.type === "tower" && roofLights > 0) {
        const per = 48 + (ch.seed % 24), on = Y.mod(f + ch.seed, per) < per * 0.5, q = Pp(ch.X, h + 0.05, ch.Z);
        if (on && q[2] > NEAR) { const s = clamp((0.05 * c.f) / q[2], 1, 5); ctx.fillStyle = css(winCol, roofLights * (1 - k * 0.5)); ctx.beginPath(); ctx.arc(q[0], q[1], s, 0, 7); ctx.fill(); Y.glow(ctx, q[0], q[1], s * 7, winCol, 0.35 * roofLights * (1 - k)); }
      }
    }
    ctx.restore();
  }

  return { gen, get, along, sub, sky, ground, traces, signals, pylons: pylonsDraw, chips: chipsDraw, segTo, NEAR, dist, inView };
})();
