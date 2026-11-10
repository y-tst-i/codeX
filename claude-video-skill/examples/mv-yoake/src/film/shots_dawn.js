// S10(山2〜終わり): 1340 で「消えない」の光が外へ広がって次の世界を開き(字から開く円)、夜の色が紫へ。
// 冒頭と同じ低い視点・同じ街(seed 11)で、空を見上げた所からティルトダウン(#026)して地平へ。1415 で太陽の縁、1431「夜」をなぞる、
// 1491 の後は題「夜明けの回路」(終わりの画を約 3 秒)。最後に 2% 寄り、最後の 12 コマで暗転(#187)。
// 第1段階の弱点(SF3/SF4 の手前の盤が平板)への手当て: 手前に前ボケの大きなチップ、チップの長い影、照り返しの道の上のきらめき、配線の金属の艶。
(() => {
  const { clamp, lerp, P, eIO, eIOs, eOut, eOut5, smooth, keys, hash, rng, pj, cam3, css, mix, rgb, word, phrase, charStarts, acc, K, W, H, N } = Y;
  const C = K.C, B = FILM.B, PH = "夜が明ける";
  const T = () => Y.once("t10", () => ({ hit: acc(1340), sun: acc(1415), yo: word("夜"), ga: word("が明ける"), end: phrase(PH).end }));
  const NIGHT = ["#04030c", "#0b0820", "#181236", "#2a1d4a", "#45285e", "#6a3466", "#7a3a62"];
  const DAWN = C.dawn; // 群青 → 紫 → 薔薇 → 桃 → 地平の白い金
  const sunX = 1180;
  function camDawn(f) {
    const t = T();
    const pitch = keys(f, [[t.hit, 0.3], [t.sun, 0.0, eIO]]); // #026 ティルト(上 → 地平。cubic in-out)
    const push = eIOs(P(f, t.end, N)); // 最後の 2% 寄り(焦点距離で)
    return cam3({ x: 0.4, y: 1.15, z: lerp(-3, 0.6, P(f, t.hit, N)), pitch, f: 980 * (1 + 0.02 * push), cx: W / 2, cy: 640 });
  }
  const dawnK = (f) => smooth(P(f, T().hit, T().yo + 20));
  function drawDawn(g, f) {
    const t = T(), c = camDawn(f), CT = CITY.get(11), k = dawnK(f), hy = Y.horizonY(c);
    const pal = NIGHT.map((n, i) => css(mix(n, DAWN[i], k)));
    CITY.sky(g, c, pal, { stars: 1 - k, f });
    // 太陽: 1415 まで地平の下(地平の光だけ育つ)。1415 で縁が出て、ゆっくり昇る
    const rise = f < t.sun ? 0 : 0.14 + 0.45 * eOut(P(f, t.sun, N)), sunY = hy + 70 - 140 * rise;
    const flash = f >= t.sun ? Math.exp(-(f - t.sun) / 8) : 0, pre = smooth(P(f, t.hit, t.sun));
    if (K.st.fx) { Y.glow(g, sunX, hy, 1000, "#ff8a72", (0.15 + 0.25 * k) * (0.4 + 0.6 * pre), "screen"); Y.glow(g, sunX, hy, 300 + 120 * flash, "#ffd9a8", (0.25 + 0.3 * k) * pre + 0.35 * flash, "screen"); }
    // 光の筋(太陽から。ごく薄く。昇ってから)
    if (K.st.fx && rise > 0) { const rr = rng(77); g.save(); g.globalCompositeOperation = "screen"; g.filter = "blur(6px)"; for (let i = 0; i < 11; i++) { const a = Math.PI + 0.2 + rr() * (Math.PI - 0.4), wd = 0.004 + rr() * 0.014, L = 700 + rr() * 800; const gg = g.createRadialGradient(sunX, sunY, 60, sunX, sunY, L); gg.addColorStop(0, css("#ffe2b8", (0.08 + rr() * 0.08) * rise * 1.6)); gg.addColorStop(1, css("#ffe2b8", 0)); g.fillStyle = gg; g.beginPath(); g.moveTo(sunX, sunY); g.arc(sunX, sunY, L, a - wd, a + wd); g.closePath(); g.fill(); } g.restore(); }
    if (rise > 0) { g.save(); g.beginPath(); g.rect(0, 0, W, hy); g.clip(); g.fillStyle = "#fff8ec"; g.beginPath(); g.arc(sunX, sunY, 66, 0, 7); g.fill(); g.restore(); if (K.st.fx) Y.glow(g, sunX, hy, 110, "#fff4dc", 0.6 * rise + 0.4 * flash, "screen"); }
    // 薄い雲の帯
    { const cr = rng(3); for (let i = 0; i < 14; i++) { const y = hy - 520 + cr() * 420, x = cr() * W, w = 300 + cr() * 900, h = 6 + cr() * 18, kk = 1 - Math.abs(x - sunX) / W; const cc = mix("#4a2660", "#ffc0a0", clamp((y - hy + 600) / 600 * 0.8 + kk * 0.3)), gc = g.createLinearGradient(0, y - h / 2, 0, y + h / 2); gc.addColorStop(0, css(cc, 0.25 * k)); gc.addColorStop(1, css(mix(cc, "#ffe8c8", 0.5 * kk), 0.6 * k)); g.fillStyle = gc; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, 7); g.fill(); } }
    // 盤: 空を映す(上ほど明るい桃、手前は暗い紫)
    { const gg = g.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, css(mix("#3a2050", "#f2a08c", k))); gg.addColorStop(0.12, css(mix("#24143a", "#9a4f74", k))); gg.addColorStop(0.5, css(mix("#120a20", "#3a1f40", k))); gg.addColorStop(1, "#140a1a"); g.fillStyle = gg; g.fillRect(0, hy, W, H - hy + 400); }
    // チップの長い影(太陽を背に手前へ)
    const sxAt = (Z) => ((sunX - W / 2) * Z) / c.f + c.x, lane = (ch) => Math.abs(ch.X - sxAt(ch.Z)) > 0.9 + ch.w / 2 + 0.04 * ch.Z;
    if (k > 0.05) { g.save(); g.fillStyle = `rgba(25,8,28,${0.45 * k})`; for (const ch of CT.chips) { if (ch.Z < c.z + 1.4 || ch.Z > c.z + 60 || !lane(ch) || (ch.Z < c.z + 22 && Math.abs(ch.X - c.x) < 10)) continue; const dir = (ch.X - sxAt(ch.Z)) * 0.08, Lz = ch.h * 5.5, Pp = (x, z) => pj(c, x, 0, z); const a = Pp(ch.X - ch.w / 2, ch.Z - ch.d / 2), b = Pp(ch.X + ch.w / 2, ch.Z - ch.d / 2), d2 = Pp(ch.X + ch.w / 2 + dir * Lz, ch.Z - ch.d / 2 - Lz), e = Pp(ch.X - ch.w / 2 + dir * Lz, ch.Z - ch.d / 2 - Lz); if ([a, b, d2, e].some((q) => q[2] < 0.3)) continue; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(d2[0], d2[1]); g.lineTo(e[0], e[1]); g.closePath(); g.fill(); } g.restore(); }
    // 照り返しの道(盤の上の光の道。横はやわらかく、手前ほど広く薄い)
    if (K.st.fx && rise > 0 || pre > 0.3) { const [c2, g2] = Y.wbuf("refl", W, Math.max(1, Math.round(H - hy))); const rg = g2.createLinearGradient(0, 0, 0, H - hy); rg.addColorStop(0, css("#fff0d8", 0.85 * Math.max(rise * 1.4, pre * 0.4))); rg.addColorStop(0.35, css("#ffb48a", 0.3 * k)); rg.addColorStop(1, css("#ff8a7a", 0)); g2.fillStyle = rg; g2.beginPath(); g2.moveTo(sunX - 50, 0); g2.lineTo(sunX + 50, 0); g2.lineTo(sunX + 380, H - hy); g2.lineTo(sunX - 380, H - hy); g2.closePath(); g2.fill(); g.save(); g.globalCompositeOperation = "screen"; if (K.st.fx) g.filter = "blur(30px)"; g.drawImage(c2, 0, hy); g.restore(); }
    const sunSignals = (gx) => {
      gx.save(); gx.globalCompositeOperation = "screen"; gx.lineCap = "round";
      for (const tr of CT.traces) { const Z = tr.zc; if (Z < c.z + 0.8 || Z > c.z + 80) continue; const d = Math.abs(tr.xc - sxAt(Z)), kk = Math.exp(-Math.pow(d / (0.6 + 0.06 * Z), 2)) * k; if (kk < 0.05) continue; gx.strokeStyle = css("#ffd9b0", 0.8 * kk); gx.lineWidth = Math.max(0.8, (tr.w * c.f) / (Z - c.z)); gx.beginPath(); tr.pts.forEach((p, i) => { const q = pj(c, p[0], 0, p[1]); i ? gx.lineTo(q[0], q[1]) : gx.moveTo(q[0], q[1]); }); gx.stroke(); }
      gx.restore();
      // 太陽へ向かう光(配線の上を走る)
      const r = rng(21);
      for (let i = 0; i < 26; i++) { const Z0 = c.z + 1.2 + Math.pow(r(), 1.5) * 10, X0 = sxAt(Z0) + (r() - 0.5) * (1.6 + Z0 * 0.15), Zs = c.z + 60, sx = sxAt(Zs); const pts = [[X0, Z0], [X0, Z0 + 1.2 + r() * 2], [lerp(X0, sx, 0.3), Z0 + 6 + r() * 4], [sx, Zs]]; const len = pts.slice(1).reduce((s, p, kk) => s + Math.hypot(p[0] - pts[kk][0], p[1] - pts[kk][1]), 0), ph = r(), s1 = (ph * len + f * 0.25) % len; const seg = CITY.sub(pts, Math.max(0, s1 - 2.6), s1).map((p) => pj(c, p[0], 0.01, p[1])); if (seg.some((q) => q[2] < 0.3)) continue; gx.save(); gx.globalCompositeOperation = "lighter"; gx.lineCap = "round"; gx.strokeStyle = css(mix(C.mint, "#ffe6c0", k), 0.9); gx.lineWidth = clamp(30 / seg[seg.length - 1][2], 1, 4); gx.beginPath(); seg.forEach((q, j) => (j ? gx.lineTo(q[0], q[1]) : gx.moveTo(q[0], q[1]))); gx.stroke(); gx.restore(); }
    };
    CITY.traces(g, c, CT, { fogCol: css(mix("#3a2050", "#f0a08a", k)), fogD: 30, wire: css(mix("#2a3a4a", "#6a3458", k)), wireHi: css(mix(C.verdHi, "#ffb894", k)), maxD: 140, pourCol: "#2a1430", litFn: () => false });
    sunSignals(g);
    CITY.chips(g, c, CT, f, { chipTop: css(mix("#121a2a", "#2c1532", k)), chipSide: css(mix("#060a12", "#170a1c", k)), fogCol: css(mix("#3a2050", "#f0a08a", k)), fogD: 30, rimCol: css(mix(C.verdHi, "#ffd2a0", k)), rimA: 0.55 + 0.45 * k, edgeA: 0.18 + 0.5 * k, sideLight: css(mix("#1d3a46", "#8a3a5a", k)), winCol: "#ffe0c0", lit: (ch) => 0.4 * (1 - k) * (0.6 + 0.4 * hash(ch.seed, 10)), maxD: 140, roofLights: 1 - k, filter: (ch) => lane(ch) && !(ch.Z < c.z + 22 && Math.abs(ch.X - c.x) < 10) });
    // 照り返しの道の上のきらめき(配線の金属の艶。数コマごとに場所が変わる)
    if (rise > 0 && K.st.fx) { const fi = Math.floor(f / 3); g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 40; i++) { const Z = c.z + 2 + hash(fi, i) * 30, X = sxAt(Z) + (hash(fi, i + 99) - 0.5) * (0.5 + Z * 0.05), q = pj(c, X, 0, Z); if (q[2] < 0.3) continue; const s = clamp(12 / q[2], 1, 4); g.fillStyle = css("#fff6e6", 0.7 * rise); g.fillRect(q[0] - s * 3, q[1] - 0.5, s * 6, 1.2); g.fillRect(q[0] - 0.5, q[1] - s * 1.5, 1.2, s * 3); } g.restore(); }
    // 前ボケ: 手前の大きなチップ2つ(ぼかし、上の縁に朝の光)
    { const [lc, lg] = Y.wbuf("fg10"); for (const [x0, y0, w0, h0] of [[-120, 900, 620, 260], [1500, 950, 560, 200]]) { lg.fillStyle = "#0e0612"; lg.beginPath(); lg.roundRect(x0, y0, w0, h0 + 200, 18); lg.fill(); lg.strokeStyle = css("#ffc8a0", 0.85 * k + 0.2); lg.lineWidth = 3; lg.beginPath(); lg.moveTo(x0 + 18, y0); lg.lineTo(x0 + w0 - 18, y0); lg.stroke(); for (let i = 0; i < 9; i++) { lg.fillStyle = css("#4a2a3a", 0.9); lg.fillRect(x0 + 30 + i * (w0 - 60) / 9, y0 - 14, 16, 14); } }
      g.save(); if (K.st.fx) g.filter = "blur(7px)"; g.drawImage(lc, 0, 0); g.restore(); }
    // 文字
    if (f < t.end + 13) {
      const size = 168, L = Y.once("t10lay", () => Y.layout("MIN", PH, size, { track: 0.07 })), ox = (W - L.w) / 2, oy = 210, st = charStarts(PH), TR = 8;
      const out = smooth(P(f, t.end + 4, t.end + 12)), pr = st.map((s) => clamp((f - s) / TR));
      if (K.st.fx) { const hg = g.createRadialGradient(W / 2, oy + size / 2, 50, W / 2, oy + size / 2, 700); hg.addColorStop(0, `rgba(255,240,220,${0.35 * k * (1 - out)})`); hg.addColorStop(1, "rgba(255,240,220,0)"); g.fillStyle = hg; g.fillRect(0, 0, W, hy); }
      g.save(); if (out > 0 && K.st.fx) g.filter = `blur(${out * 10}px)`;
      L.items.forEach((it, i) => {
        const one = { items: [it] }, p = pr[i], pre2 = smooth(P(f, st[i] - 8, st[i])), a = (1 - out) * (0.12 * pre2 + 0.88 * smooth(p));
        TYPE.mark(PH, i, (1 - out) * (p > 0 ? 0.5 + 0.5 * smooth(p) : 0.12 * pre2));
        g.save(); g.globalAlpha = 1 - out; K.textPath(g, one, ox, oy, size); g.fillStyle = css(C.plum, Math.max(0, 0.12 * pre2 + 0.88 * smooth(p))); g.fill("nonzero"); g.restore();
        if (p > 0 && p < 1) { const hs = K.traceText(g, one, ox, oy, size, p, { col: "#fff3dc", w: 3 }); for (const h of hs) Y.glow(g, h[0], h[1], 26, "#fff3dc", 0.8); }
        if (p >= 1) { g.save(); g.globalAlpha = 1 - out; K.textPath(g, one, ox, oy, size); g.clip("nonzero"); const gg2 = g.createLinearGradient(0, oy, 0, oy + size); gg2.addColorStop(0, "rgba(255,190,150,0.0)"); gg2.addColorStop(1, "rgba(255,150,130,0.35)"); g.fillStyle = gg2; g.fillRect(ox + it.x, oy, size, size * 1.1); g.restore(); }
      });
      g.restore();
    } else for (let i = 0; i < 5; i++) TYPE.mark(PH, i, 0);
    // 題(終わりの画): 字ごとに 3 コマずつ 0.3→1+わずかなぼかし(motion.md)、下に1本の光の線が引かれる(#004)、英字の副題
    if (f >= t.end + 6) {
      const s1 = 112, L1 = Y.once("titlelay", () => Y.layout("MIN", "夜明けの回路", s1, { track: 0.16 })), ox = (W - L1.w) / 2, oy = 290, t0 = t.end + 6;
      L1.items.forEach((it, i) => { const a = TYPE.fadeIn(f, t0 + i * 3, 5), b = 6 * (1 - a); if (a <= 0) return; g.save(); g.globalAlpha = lerp(0.3, 1, a) * smooth(P(f, t0 + i * 3, t0 + i * 3 + 2)); if (b > 0.3 && K.st.fx) g.filter = `blur(${b}px)`; K.textPath(g, { items: [it] }, ox, oy, s1); g.fillStyle = C.plum; g.fill("nonzero"); g.restore(); });
      const ln = eIO(P(f, t0 + 10, t0 + 32)); if (ln > 0) { const y = oy + s1 * 1.32, pts = [[ox, y], [ox + L1.w * 0.62, y], [ox + L1.w * 0.62 + 30, y + 30], [ox + L1.w, y + 30]], tot = L1.w * 0.62 + 42.4 + L1.w * 0.38 - 30; const seg = CITY.sub(pts, 0, tot * ln); g.save(); g.lineCap = "round"; g.strokeStyle = css(C.plum, 0.85); g.lineWidth = 4; g.beginPath(); seg.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.strokeStyle = css("#fff3dc", 0.9); g.lineWidth = 1.2; g.stroke(); g.restore(); const hd = seg[seg.length - 1]; if (ln < 1) Y.glow(g, hd[0], hd[1], 30, "#fff3dc", 0.9); }
      const ea = smooth(P(f, t0 + 18, t0 + 28)); if (ea > 0) { g.save(); g.globalAlpha = ea; g.font = "700 34px KAKU"; g.fillStyle = css(C.plum, 0.88); g.textAlign = "center"; g.letterSpacing = "14px"; g.fillText("YOAKE NO KAIRO", W / 2 + 7, oy + s1 * 1.32 + 92); g.restore(); }
    }
    // レンズのフレア(太陽から画面の中心を通る線上に、薄い輪を 3 つ)
    if (K.st.fx && rise > 0) { [[0.45, 60, 0.1], [0.9, 26, 0.16], [1.35, 110, 0.07]].forEach(([k2, rad, al]) => { const x = sunX + (W / 2 - sunX) * k2 * 2, y = hy + (H / 2 - hy) * k2 * 2; const gg = g.createRadialGradient(x, y, rad * 0.7, x, y, rad); gg.addColorStop(0, css("#ffd0b0", al * 0.4 * rise)); gg.addColorStop(0.85, css("#ffe6c8", al * rise)); gg.addColorStop(1, css("#ffe6c8", 0)); g.save(); g.globalCompositeOperation = "screen"; g.fillStyle = gg; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); g.restore(); }); }
    K.dust(g, 12, f, { n: 70, col: css(mix("#a6fff0", "#fff0d8", k)), a: 0.45, drift: [0.1, -0.2] });
  }
  function draw(g, f) {
    const t = T();
    drawDawn(g, f);
    // 1340: 「消えない」の光が外へ広がり、円の内側に朝の世界が開く(円の外は前のショットの最後のコマ)
    const ir = eOut(P(f, t.hit, t.hit + 24));
    if (ir < 1) {
      const [sc, sg] = Y.wbuf("s9last"); CHORUS.drawS9(sg, t.hit - 1);
      const cx = 1350, cy = 520, R = 30 + 2300 * ir;
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.moveTo(cx + R, cy); g.arc(cx, cy, R, 0, Math.PI * 2, true); g.closePath(); g.clip("evenodd"); g.drawImage(sc, 0, 0); g.restore();
      g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = css("#ffd0e0", 0.9 * (1 - ir)); g.lineWidth = 6 + 30 * (1 - ir); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.strokeStyle = css(C.white, 0.95 * (1 - ir)); g.lineWidth = 3; g.stroke(); g.restore();
      Y.glow(g, cx, cy, 420 * (1 - ir) + 80, "#ffd0e0", 0.35 * (1 - ir));
    }
    const dh = f - t.hit;
    const fx = { bloom: { thr: 0.8, a: 0.42, streak: 0.3, streakCol: "#ffd0a0" }, grade: { ca: 1.4, vig: 0.32, grain: 9, toe: [10, 6, 12], shoulder: 0.94 } };
    fx.exposure = dh >= 0 ? 0.32 * Math.exp(-dh / 5) : 0;
    fx.chroma = dh >= 0 && dh < 8 ? 6 * Math.exp(-dh / 3) : 0;
    fx.fade = eIOs(P(f, N - 12, N - 1)); // #187 フェードアウト(quadratic in-out)
    return fx;
  }
  FILM.reg({ id: "S10", a: B.S10, draw });
})();
