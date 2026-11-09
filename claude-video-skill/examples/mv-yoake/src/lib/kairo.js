// 『夜明けの回路』の描画部品。scene-lib.js / depth.js / paint.js / glyphs.js の後に読む。
// 約束(seek-safe): 絵は引数と時刻(コマ番号 f)だけで決まる。乱数は seed 付き。Math.random / Date.now を使わない。
// 作業 canvas は使うたびに reset(paint.js の buf)。効果は KAIRO.fx が false なら描かない(形と色だけ残す)。
const KAIRO = (() => {
  const { mulberry32, clamp, lerp, smooth } = SCENE_LIB;
  const { rgb, mix, css } = DEPTH;
  const W = 1920, H = 1080;
  const st = { fx: true };

  // ---- 色(美術方向 B「光跡と黎明」。LUMIWAKE の紺〜琥珀とは別: 緑青の金属 × 燐光のミント × 朱 × 薔薇〜桃の朝) ----
  const C = {
    ink: "#020506", deep: "#06161a", fog: "#0c2a2e", slate: "#12302f",
    verd: "#265a54", verdHi: "#5a9a8e", verdDk: "#143532",          // 緑青(酸化した銅)。消えている配線
    mint: "#8cffe0", mintDeep: "#1fd6b0", white: "#f4fffb",          // 燐光(灯っている配線・光の線)
    fire: "#ff5a36", rose: "#ff4f8b",                                // 朱(火)、薔薇(声)
    dawn: ["#120f2a", "#3a2560", "#8a3f7c", "#e4677a", "#ff9c76", "#ffc48e", "#ffd7a2"], // 夜明けの空(上→地平)
    plum: "#2a1438",
  };

  // ---- 地面(配線の盤)の透視: 世界 (X, Z, 高さ Y) → 画面 ----
  // cam: { hy: 地平線の y, F: 焦点, h: 目の高さ, x: 横位置, roll: 傾き(rad, 呼ぶ側で回す), z0: 手前の切り }
  const proj = (cam, X, Z, Y = 0) => [W / 2 + ((X - cam.x) * cam.F) / Z, cam.hy + ((cam.h - Y) * cam.F) / Z];

  // ---- 配線の生成(基板の配線らしく 0/45/90 度で曲がる。seed 付き) ----
  // 返り値: traces[{pts:[[X,Z],...], len, w, kind}], vias[[X,Z,r]], chips[{X,Z,w,d,h}]
  function board(seed, { xr = 70, z0 = 1.2, z1 = 140, n = 520, chipsN = 70, bundles = 0.55, chipZ0 = 3.2 } = {}) {
    const r = mulberry32(seed), traces = [], vias = [], chips = [];
    const dirs = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]].map(([a, b]) => { const l = Math.hypot(a, b); return [a / l, b / l]; });
    // 奥ほど密度を下げすぎないよう、Z は対数で配る
    const zAt = (u) => z0 * Math.pow(z1 / z0, u);
    for (let i = 0; i < chipsN; i++) {
      const Z = Math.max(chipZ0, zAt(Math.pow(r(), 0.75) * 0.9 + 0.06)), X = (r() * 2 - 1) * xr * (0.12 + 0.88 * Z / z1);
      const big = r() < 0.12;
      chips.push({ X, Z, w: (0.35 + r() * 1.3) * (big ? 2 : 1), d: (0.3 + r() * 1.1) * (big ? 1.6 : 1), h: 0.04 + Math.pow(r(), 2.5) * (big ? 1.1 : 0.45), seed: (r() * 1e6) | 0 });
    }
    let made = 0;
    while (made < n) {
      const u = Math.pow(r(), 0.85);
      let Z = zAt(u), X = (r() * 2 - 1) * xr * (0.1 + 0.9 * u);
      const sc = 0.22 + Z * 0.05; // 遠くほど一区間を長く(画面で見える長さをそろえる)
      let di = r() < 0.55 ? (r() < 0.5 ? 0 : 4) : ((r() * 8) | 0);
      const c = [[X, Z]];
      const steps = 2 + ((r() * 6) | 0);
      for (let s = 0; s < steps; s++) {
        const l = (0.3 + r() * 2.6) * sc, d = dirs[di];
        X += d[0] * l; Z += d[1] * l; if (Z < z0 * 0.7) break; c.push([X, Z]);
        di = (di + (r() < 0.5 ? 1 : 7) * (r() < 0.7 ? 1 : 0) + 8) % 8;
      }
      if (c.length < 2) continue;
      // 束(平行な配線)。中心線を法線方向にずらす(角は留め継ぎ)
      const k = r() < bundles ? 3 + ((r() * 6) | 0) : 1, w = (0.012 + r() * 0.018) * sc * 2.2, gap = w * (2.4 + r() * 1.2);
      for (let j = 0; j < k; j++) {
        const off = (j - (k - 1) / 2) * gap, pts = [];
        for (let i = 0; i < c.length; i++) {
          const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)], p0 = c[i];
          let n1 = [0, 0], cnt = 0;
          const seg = (p, q) => { const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
          if (i > 0) { const s1 = seg(c[i - 1], p0); n1[0] += s1[0]; n1[1] += s1[1]; cnt++; }
          if (i < c.length - 1) { const s2 = seg(p0, c[i + 1]); n1[0] += s2[0]; n1[1] += s2[1]; cnt++; }
          const nl = Math.hypot(n1[0], n1[1]) || 1, nx = n1[0] / nl, nz = n1[1] / nl;
          const miter = cnt === 2 ? 1 / Math.max(0.5, (nx * seg(c[i - 1], p0)[0] + nz * seg(c[i - 1], p0)[1])) : 1;
          pts.push([p0[0] + nx * off * miter, p0[1] + nz * off * miter]);
        }
        let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        traces.push({ pts, len, w, seed: (r() * 1e6) | 0 }); made++;
        if (r() < 0.35) vias.push([pts[0][0], pts[0][1], w * 1.7]);
        if (r() < 0.35) vias.push([pts[pts.length - 1][0], pts[pts.length - 1][1], w * 1.7]);
      }
    }
    return { traces, vias, chips };
  }

  // 折れ線上の位置 s(0..len)の点
  function along(pts, s) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= s) { const k = (s - acc) / (l || 1); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
      acc += l;
    }
    return pts[pts.length - 1];
  }
  // 折れ線の [s0, s1] 部分の点列
  function sub(pts, s0, s1) {
    const out = [along(pts, s0)]; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc > s0 && acc < s1) out.push(b);
    }
    out.push(along(pts, s1)); return out;
  }

  // ---- 盤を描く ----
  // light(Z): 盤の明るさ(0..1)、tint: 配線の色の上書き(夜明けの照り返し)
  function drawBoard(ctx, B, cam, { fogCol = C.fog, fogD = 55, wire = C.verd, wireHi = C.verdHi, skyRefl = null, minPx = 0.7, near = 2.2, chipTop = "#0e2422", chipSide = "#050c0d", windows = 0.0, windowCol = C.mint, dawn = 0, chipFog = 1, afterTraces = null, chipFilter = null } = {}) {
    const fogA = (Z) => 1 - Math.exp(-Z / fogD);
    // 配線(奥から手前へ)
    const tr = B.traces.slice().sort((a, b) => b.pts[0][1] - a.pts[0][1]);
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const t of tr) {
      const Z = t.pts[0][1]; if (Z < cam.z0) continue;
      const k = fogA(Z), px = Math.max(minPx, (t.w * cam.F) / Z);
      ctx.strokeStyle = css(mix(dawn > 0 ? mix(wire, wireHi, 0.3) : wire, fogCol, k), (1 - k * 0.85) * (Z < near ? 0.0 : 1));
      ctx.lineWidth = px; ctx.beginPath();
      t.pts.forEach((p, i) => { const q = proj(cam, p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.stroke();
      // 金属の照り(上側に細い明るい線)
      if (px > 2.2) { ctx.strokeStyle = css(mix(wireHi, fogCol, k), 0.35 * (1 - k)); ctx.lineWidth = px * 0.3; ctx.stroke(); }
    }
    for (const v of B.vias) {
      const Z = v[1]; if (Z < cam.z0 || Z < near) continue; const k = fogA(Z), q = proj(cam, v[0], Z), r = Math.max(0.8, (v[2] * cam.F) / Z);
      ctx.fillStyle = css(mix(wireHi, fogCol, k), 0.9 * (1 - k * 0.8)); ctx.beginPath(); ctx.ellipse(q[0], q[1], r, r * Math.min(1, cam.h / Z * 1.5 + 0.25), 0, 0, 7); ctx.fill();
      ctx.fillStyle = css(C.ink, 0.9 * (1 - k)); ctx.beginPath(); ctx.ellipse(q[0], q[1], r * 0.45, r * 0.45 * Math.min(1, cam.h / Z * 1.5 + 0.25), 0, 0, 7); ctx.fill();
    }
    if (afterTraces) { ctx.save(); afterTraces(ctx); ctx.restore(); }
    // チップ(建物のように立つ箱)。奥から
    const ch = B.chips.filter((c) => !chipFilter || chipFilter(c)).sort((a, b) => b.Z - a.Z);
    for (const c of ch) {
      if (c.Z - c.d / 2 < cam.z0) continue;
      const k = fogA(c.Z) * chipFog;
      const x0 = c.X - c.w / 2, x1 = c.X + c.w / 2, zf = c.Z - c.d / 2, zb = c.Z + c.d / 2;
      const P = (x, z, y) => proj(cam, x, z, y);
      // 上面
      const top = [P(x0, zf, c.h), P(x1, zf, c.h), P(x1, zb, c.h), P(x0, zb, c.h)];
      const front = [P(x0, zf, 0), P(x1, zf, 0), P(x1, zf, c.h), P(x0, zf, c.h)];
      const side = c.X > cam.x ? [P(x0, zf, 0), P(x0, zb, 0), P(x0, zb, c.h), P(x0, zf, c.h)] : [P(x1, zf, 0), P(x1, zb, 0), P(x1, zb, c.h), P(x1, zf, c.h)];
      const poly = (ps, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ps.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); };
      // 接地の影(盤の上に少し広く暗く)
      poly([P(x0 - 0.15, zf - 0.1, 0), P(x1 + 0.15, zf - 0.1, 0), P(x1 + 0.3, zb + 0.4, 0), P(x0 - 0.3, zb + 0.4, 0)], css(C.ink, 0.5 * (1 - k)));
      poly(side, css(mix(chipSide, fogCol, k)));
      poly(front, css(mix(dawn ? mix(chipSide, "#3a1f2e", dawn) : chipSide, fogCol, k)));
      { const tc = mix(chipTop, fogCol, k), gt = ctx.createLinearGradient(0, top[0][1], 0, top[2][1]);
        gt.addColorStop(0, css(tc)); gt.addColorStop(1, css(mix(tc, dawn ? "#ff9f86" : wireHi, (dawn ? 0.45 : 0.22) * (1 - k * 0.7)))); poly(top, gt); }
      // 上面の刻印(シルク印刷の細い枠と1番ピンの点)。近いチップだけ
      if (c.Z < 16) {
        const ins = 0.18, q = [P(lerp(x0, x1, ins), lerp(zf, zb, ins), c.h), P(lerp(x0, x1, 1 - ins), lerp(zf, zb, ins), c.h), P(lerp(x0, x1, 1 - ins), lerp(zf, zb, 1 - ins), c.h), P(lerp(x0, x1, ins), lerp(zf, zb, 1 - ins), c.h)];
        ctx.strokeStyle = css(dawn ? "#ffd8c0" : "#9fd6cc", 0.22 * (1 - k)); ctx.lineWidth = Math.max(0.6, 0.012 * cam.F / c.Z);
        ctx.beginPath(); q.forEach((p2, j) => (j ? ctx.lineTo(p2[0], p2[1]) : ctx.moveTo(p2[0], p2[1]))); ctx.closePath(); ctx.stroke();
        const d0 = P(lerp(x0, x1, ins + 0.08), lerp(zf, zb, ins + 0.12), c.h); ctx.fillStyle = css(dawn ? "#ffd8c0" : "#9fd6cc", 0.35 * (1 - k)); ctx.beginPath(); ctx.arc(d0[0], d0[1], Math.max(0.8, 0.02 * cam.F / c.Z), 0, 7); ctx.fill();
      }
      // 上面の奥の縁の光(地平の空の照り返し・逆光のリム)
      ctx.strokeStyle = css(mix(dawn ? "#ffd9b0" : wireHi, fogCol, k * 0.6), (0.75 - k * 0.4) * (dawn ? 1 : 0.55)); ctx.lineWidth = Math.max(0.8, 0.025 * cam.F / c.Z);
      ctx.beginPath(); ctx.moveTo(top[3][0], top[3][1]); ctx.lineTo(top[2][0], top[2][1]); ctx.stroke();
      // 足(ピン): 手前と奥の長い辺に並ぶ小さな金属の脚。近いチップだけ
      if (c.Z < 22) {
        const np = Math.max(3, Math.round(c.w * 7)), pl = 0.07, pw = c.w / np * 0.45;
        ctx.fillStyle = css(mix(dawn ? "#c98f86" : "#5e8f88", fogCol, k), 0.9 * (1 - k));
        for (let i = 0; i < np; i++) {
          const x = lerp(x0, x1, (i + 0.5) / np);
          for (const [za, zb2] of [[zf - pl, zf], [zb, zb + pl]]) {
            const q = [P(x - pw / 2, za, 0.012), P(x + pw / 2, za, 0.012), P(x + pw / 2, zb2, 0.02), P(x - pw / 2, zb2, 0.02)];
            ctx.beginPath(); q.forEach((p2, j) => (j ? ctx.lineTo(p2[0], p2[1]) : ctx.moveTo(p2[0], p2[1]))); ctx.closePath(); ctx.fill();
          }
        }
      }
      // 窓(小さな灯り。眠らない街)
      if (windows > 0) {
        const r = mulberry32(c.seed); const nx = Math.max(1, Math.round(c.w * 3)), ny = Math.max(1, Math.round(c.h * 4));
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          if (r() > windows) continue;
          const u = (i + 0.5) / nx, v = (j + 0.5) / ny, q = P(lerp(x0, x1, u), zf - 0.001, c.h * v);
          const s = Math.max(0.7, 0.05 * cam.F / c.Z);
          ctx.fillStyle = css(mix(windowCol, fogCol, k * 0.8), (0.4 + r() * 0.6) * (1 - k * 0.6));
          ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
        }
      }
    }
    ctx.restore();
  }

  // 灯った信号(配線の一部 [s0,s1] が光る。頭が白く、尾はミントで消える)
  function signal(ctx, cam, pts, s0, s1, { col = C.mint, head = C.white, w = 0.08, glowR = 1, a = 1, near = 0 } = {}) {
    const seg = sub(pts, Math.max(0, s0), s1); if (seg.length < 2) return;
    const sp = seg.map((p) => proj(cam, p[0], p[1]));
    const Z = seg[seg.length - 1][1], px = Math.max(1.2, (w * cam.F) / Z);
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    // 尾: 区間ごとに透明度を上げる
    for (let i = 1; i < sp.length; i++) {
      const k = i / (sp.length - 1);
      ctx.strokeStyle = css(col, a * (0.25 + 0.75 * k)); ctx.lineWidth = px * (0.7 + 0.5 * k);
      ctx.beginPath(); ctx.moveTo(sp[i - 1][0], sp[i - 1][1]); ctx.lineTo(sp[i][0], sp[i][1]); ctx.stroke();
    }
    const hp = sp[sp.length - 1];
    ctx.fillStyle = css(head, a); ctx.beginPath(); ctx.arc(hp[0], hp[1], px * 1.3, 0, 7); ctx.fill();
    ctx.restore();
    if (st.fx) PAINT.glow(ctx, hp[0], hp[1], px * 14 * glowR, col, 0.55 * a);
    return hp;
  }

  // ---- 文字 ----
  // 字の並び(横書き/縦書き)を計算: 各字の原点(左上基準の em 座標)
  function layout(fam, str, size, { vertical = false, track = 0, lead = 1.0 } = {}) {
    const G = GLYPHS[fam], out = []; let x = 0, y = 0;
    for (const ch of [...str]) {
      const g = G.g[ch]; if (!g) { if (ch === " ") { vertical ? (y += size * 0.5) : (x += size * 0.4); } continue; }
      if (vertical) {
        // 縦書き: 字の箱(1em)を縦に積む。句読点(、。)は右上へ
        const punct = "、。".includes(ch);
        out.push({ ch, g, x: punct ? size * 0.55 : (size - g.adv * size) / 2, y: y + size * 0.88 - (punct ? size * 0.62 : 0) });
        y += size * (lead + track);
      } else {
        out.push({ ch, g, x, y: size * 0.88 });
        x += g.adv * size + track * size;
      }
    }
    return { items: out, w: vertical ? size : x - track * size, h: vertical ? y - track * size : size * lead };
  }
  // 字の輪郭のパスを g に足す(fill 用)
  function glyphPath(g, it, ox, oy, size) {
    for (const c of it.g.c) {
      const p = c.p; g.moveTo(ox + it.x + p[0] * size, oy + it.y + p[1] * size);
      for (let i = 2; i < p.length; i += 2) g.lineTo(ox + it.x + p[i] * size, oy + it.y + p[i + 1] * size);
      g.closePath();
    }
  }
  function textPath(g, L, ox, oy, size) { g.beginPath(); for (const it of L.items) glyphPath(g, it, ox, oy, size); }
  // 輪郭を途中まで描く: prog(0..1) は文字列全体の進み(字ごとに順番になぞる)。返り値は光の頭の位置の一覧
  function traceText(ctx, L, ox, oy, size, prog, { col = C.mint, w = 3, head = C.white, perChar = 1 } = {}) {
    const n = L.items.length, heads = [];
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = col; ctx.lineWidth = w;
    L.items.forEach((it, ci) => {
      const local = clamp(prog * n - ci * perChar); if (local <= 0) return;
      // 字の中の輪郭は同時に進める(長さに比例)
      for (const c of it.g.c) {
        const p = c.p, total = c.len, lim = total * local; let acc = 0;
        ctx.beginPath(); ctx.moveTo(ox + it.x + p[0] * size, oy + it.y + p[1] * size);
        let hx = 0, hy = 0;
        for (let i = 2; i < p.length; i += 2) {
          const l = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
          if (acc + l > lim) { const k = (lim - acc) / l; hx = p[i - 2] + (p[i] - p[i - 2]) * k; hy = p[i - 1] + (p[i + 1] - p[i - 1]) * k; ctx.lineTo(ox + it.x + hx * size, oy + it.y + hy * size); break; }
          acc += l; hx = p[i]; hy = p[i + 1]; ctx.lineTo(ox + it.x + hx * size, oy + it.y + hy * size);
        }
        ctx.stroke();
        if (local < 1) heads.push([ox + it.x + hx * size, oy + it.y + hy * size]);
      }
    });
    ctx.restore();
    return heads;
  }

  // ---- 効果 ----
  // 明るい所だけを縮めてぼかし、足す(ブルーム)。横長に伸ばした光(アナモルフィックの筋)も
  function bloom(ctx, { thr = 0.55, a = 0.9, streak = 0.35, streakCol = null, knee = 1.6, src = null } = {}) {
    if (!st.fx) return;
    const s = src || ctx.canvas, w = W / 4, h = H / 4;
    // 1/4 に縮めて、明るさが thr を超えた分だけを残す(本当の閾値。画素で処理)
    const [c1, g1] = PAINT.buf("bl1", w, h); g1.drawImage(s, 0, 0, w, h);
    const im = g1.getImageData(0, 0, w, h), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255, k = l > thr ? Math.pow((l - thr) / (1 - thr), knee) / (l || 1) : 0;
      d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
    }
    g1.putImageData(im, 0, 0);
    const [c2, g2] = PAINT.buf("bl2", w, h); g2.filter = "blur(4px)"; g2.drawImage(c1, 0, 0); g2.filter = "blur(16px)"; g2.globalCompositeOperation = "lighter"; g2.drawImage(c1, 0, 0); g2.filter = "blur(40px)"; g2.drawImage(c1, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a; ctx.imageSmoothingQuality = "high"; ctx.drawImage(c2, 0, 0, W, H);
    if (streak > 0) {
      // 横に長い筋: 横だけ強く縮めてから戻す
      const [c3, g3] = PAINT.buf("bl3", 40, h); g3.imageSmoothingQuality = "high"; g3.drawImage(c1, 0, 0, 40, h);
      if (streakCol) { g3.globalCompositeOperation = "multiply"; g3.fillStyle = streakCol; g3.fillRect(0, 0, 40, h); }
      ctx.globalAlpha = streak; ctx.filter = "blur(1.5px)"; ctx.drawImage(c3, 0, 0, W, H);
    }
    ctx.restore();
  }
  // 仕上げ(画素の1回の処理): 色収差(端ほど強い)・トーン(黒を少し持ち上げて色を乗せる)・周辺減光・粒(コマごとに変わる hash)
  function grade(ctx, f, { ca = 2.2, vig = 0.42, grain = 9, toe = [4, 10, 12], shoulder = 0.92, letterbox = 0 } = {}) {
    if (!st.fx) { if (letterbox > 0) bars(ctx, letterbox); return; }
    const img = ctx.getImageData(0, 0, W, H), d = img.data, src = new Uint8ClampedArray(d);
    const cx = W / 2, cy = H / 2, R2 = cx * cx + cy * cy;
    let h = (f * 2654435761) >>> 0;
    for (let y = 0; y < H; y++) {
      const dy = y - cy;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, dx = x - cx, rr = (dx * dx + dy * dy) / R2;
        const off = Math.round(ca * rr * 2 * (dx / cx));
        const xr = Math.min(W - 1, Math.max(0, x + off)), xb = Math.min(W - 1, Math.max(0, x - off));
        let r = src[(y * W + xr) * 4], g = src[i + 1], b = src[(y * W + xb) * 4 + 2];
        // トーン: 黒の持ち上げ(色付き)と肩
        r = toe[0] + r * (1 - toe[0] / 255); g = toe[1] + g * (1 - toe[1] / 255); b = toe[2] + b * (1 - toe[2] / 255);
        if (shoulder < 1) { const s = 255 * shoulder; r = r > s ? s + (r - s) * 0.55 : r; g = g > s ? s + (g - s) * 0.55 : g; b = b > s ? s + (b - s) * 0.55 : b; }
        const v = 1 - vig * Math.pow(rr, 1.25);
        h ^= h << 13; h ^= h >>> 17; h ^= h << 5; const n = ((h >>> 0) / 4294967296 - 0.5) * grain;
        d[i] = r * v + n; d[i + 1] = g * v + n; d[i + 2] = b * v + n;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (letterbox > 0) bars(ctx, letterbox);
  }
  function bars(ctx, hpx) { ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, hpx); ctx.fillRect(0, H - hpx, W, hpx); ctx.restore(); }

  // 漂う粒(光の塵)。被写界深度で大きさとぼけを変える
  function dust(ctx, seed, f, { n = 140, col = C.mint, a = 0.6, drift = [0.15, -0.35] } = {}) {
    const r = mulberry32(seed);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const z = r(), x0 = r() * W, y0 = r() * H, ph = r() * 6.28, s = 0.6 + Math.pow(z, 3) * 9;
      const x = (x0 + drift[0] * f * (0.3 + z) * 3 + W * 4) % W, y = (y0 + drift[1] * f * (0.3 + z) * 3 + H * 4) % H;
      const al = a * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ph + f * 0.07))) * (z > 0.85 ? 0.35 : 1);
      if (st.fx && s > 3) { PAINT.glow(ctx, x, y, s * 2.2, col, al * 0.5); }
      else { ctx.fillStyle = css(col, al); ctx.beginPath(); ctx.arc(x, y, s * 0.35, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  return { st, C, W, H, proj, board, along, sub, drawBoard, signal, layout, glyphPath, textPath, traceText, bloom, grade, bars, dust, mulberry32, clamp, lerp, smooth, rgb, mix, css };
})();
