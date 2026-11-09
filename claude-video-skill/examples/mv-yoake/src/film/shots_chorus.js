// S6〜S9(最後のサビ): 回路の壁(サビの家の舞台)→ 消えかけた声 → 疾走 → 消えない字。
// 第1段階の弱点への手当て: SF2 の放射線(定番の集中線)を、コアから 0/45/90 度で折れて広がる配線(束・ビア・部品)に置き換えた。
// 字の中の配線は太く光らせ、信号を流す(540px でも見える)。
(() => {
  const { clamp, lerp, P, eIO, eIOs, eOut, eOut5, eIn, smooth, keys, hash, rng, pj, cam3, css, mix, word, phrase, charStarts, acc, K, W, H } = Y;
  const C = K.C, B = FILM.B;
  const PH5 = "夜明けの回路に", PH6 = "火を灯して", PH7 = "消えかけた声を", PH8 = "光に変えて", PH9 = "止まらない", PH10 = "止まれない", PH11 = "まだ、光は消えない";
  const markAll = (ph, n, a) => { for (let i = 0; i < n; i++) TYPE.mark(ph, i, a); };

  // ================= S6: 回路の壁 =================
  const T6 = () => Y.once("t6", () => ({ hit: acc(769), slam: word("回路に"), fireIn: phrase(PH6).start, fire: acc(812), embers: acc(845) }));
  // 正面の回路の壁(サビの家の舞台)。中心のコア(チップ)から、ピンの並びが 0/45/90 度で折れながら外へ広がる配線(基板の引き出し)。
  // 第1段階の SF2 の放射線(定番の集中線)を、折れ・束・ビア・チップのある配線に置き換えた。カメラは壁に向かって押し込む(#027)。
  const ZW = 12; // 壁の Z
  const wall = () => Y.once("wall", () => {
    const r = rng(812), routes = [], chips = [], vias = [], CORE = 0.9;
    const dirs = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
    // コアの4辺のピンから外へ: まっすぐ → 45 度 → まっすぐ …(束で)
    for (let side = 0; side < 4; side++) for (let k = 0; k < 14; k++) {
      const n = side * 2, along = (k + 0.5) / 14 * 2 - 1, nx = dirs[n][0], ny = dirs[n][1], tx = -ny, ty = nx;
      let x = nx * CORE + tx * along * CORE * 0.92, y = ny * CORE + ty * along * CORE * 0.92; const pts = [[x, y]];
      let di = n, L0 = 0.3 + r() * 0.5; x += dirs[di][0] * L0; y += dirs[di][1] * L0; pts.push([x, y]);
      di = (n + (along > 0 ? 1 : 7)) % 8; const L1 = Math.abs(along) * (0.8 + r() * 1.4); x += dirs[di][0] * L1; y += dirs[di][1] * L1; pts.push([x, y]);
      di = n; let R = Math.hypot(x, y);
      while (R < 18) { const l = 1 + r() * 4; x += dirs[di][0] * l; y += dirs[di][1] * l; pts.push([x, y]); if (r() < 0.4) { const nd = (di + (r() < 0.5 ? 1 : 7)) % 8; if (Math.abs(((nd - n + 12) % 8) - 4) >= 2) di = nd; } R = Math.hypot(x, y); }
      const lanes = r() < 0.3 ? 1 : 2 + ((r() * 4) | 0);
      for (let j = 0; j < lanes; j++) { const off = (j - (lanes - 1) / 2) * 0.07, q = pts.map(([a, b], i) => (i === 0 ? [a, b] : [a + tx * off, b + ty * off])); let len = 0; for (let i = 1; i < q.length; i++) len += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); routes.push({ pts: q, len, d: r(), w: 0.022 + r() * 0.016, ph: r(), right: q[q.length - 1][0] > 0 }); }
      if (r() < 0.5) vias.push([...pts[pts.length - 1], 0.07]);
    }
    // 壁全体の細かい配線(密度。0/45/90 度)
    for (let i = 0; i < 700; i++) { let x = (r() * 2 - 1) * 24, y = (r() * 2 - 1) * 14; if (Math.abs(x) < 1.4 && Math.abs(y) < 1.4) continue; const q = [[x, y]]; let di = (r() * 8) | 0; for (let s2 = 0, n2 = 2 + ((r() * 4) | 0); s2 < n2; s2++) { const l = 0.4 + r() * 2.2; x += dirs[di][0] * l; y += dirs[di][1] * l; q.push([x, y]); di = (di + (r() < 0.5 ? 1 : 7) * (r() < 0.6 ? 1 : 0) + 8) % 8; } const k = r() < 0.4 ? 2 + ((r() * 3) | 0) : 1; for (let j = 0; j < k; j++) { const off = (j - (k - 1) / 2) * 0.06; routes.push({ pts: q.map(([a, b]) => [a + off, b + off * 0.3]), len: 3, d: 2, w: 0.016, ph: r(), minor: true }); } if (r() < 0.3) vias.push([x, y, 0.05]); }
    // 周りのチップ(小さい部品)と、その短い配線
    for (let i = 0; i < 120; i++) { const a = r() * 6.283, R = 2.6 + Math.pow(r(), 0.7) * 15, x = Math.cos(a) * R * 1.4, y = Math.sin(a) * R * 0.9, w = 0.3 + r() * 1.3, h = 0.25 + r() * 0.9; chips.push({ x, y, w, h, s: r() });
      for (let k = 0; k < 3; k++) { let px = x + (r() - 0.5) * w, py = y + h / 2; const q = [[px, py]]; for (let s2 = 0; s2 < 3; s2++) { const d2 = dirs[((r() * 8) | 0)]; px += d2[0] * (0.3 + r() * 1.2); py += d2[1] * (0.3 + r() * 1.2); q.push([px, py]); } routes.push({ pts: q, len: 3, d: 2, w: 0.016, ph: r(), minor: true }); } }
    return { routes, chips, vias, CORE };
  });
  function camTunnel(f) {
    const t = T6(), d = f - t.hit;
    const dist = 9.5 - 2.2 * eOut5(P(f, t.hit, t.hit + 10)) - 1.6 * eIOs(P(f, t.hit + 10, B.S7)); // はじけと同時に押し込み、その後ゆっくり寄る(#027 ドリーイン)
    const roll = -0.045 * eIO(P(f, t.hit, t.hit + 20)); // #036 ダッチアングル(ここでは -2.6 度)
    return cam3({ x: 0.0 + 0.25 * eIOs(P(f, t.hit, B.S7)), y: 0.05, z: ZW - dist, roll, f: 1000, cx: 1400, cy: 500 });
  }
  const WP = (c, x, y) => pj(c, x, y, ZW);
  function drawTunnel(g, c, f, { fireK = 0, fireR = 0, flood = 99 } = {}) {
    const T = wall(), core = WP(c, 0, 0), s = c.f / (ZW - c.z); // 1 m あたりの px
    const bg = g.createRadialGradient(core[0], core[1], 10, core[0], core[1], 1500); bg.addColorStop(0, "#0f3a36"); bg.addColorStop(0.25, "#061a19"); bg.addColorStop(0.7, "#020909"); bg.addColorStop(1, "#010303");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 部品
    g.save(); g.lineJoin = "round";
    for (const ch of T.chips) { const p = WP(c, ch.x - ch.w / 2, ch.y + ch.h / 2), w = ch.w * s, h = ch.h * s; g.fillStyle = css(mix("#030c0c", "#0f302d", ch.s)); g.fillRect(p[0], p[1], w, h); g.strokeStyle = css(C.verdHi, 0.35); g.lineWidth = 1; g.strokeRect(p[0], p[1], w, h); if (w > 26) { g.fillStyle = css(C.verdHi, 0.5); const np = Math.round(w / 9); for (let i = 0; i < np; i++) { g.fillRect(p[0] + (i + 0.3) * (w / np), p[1] - 4, w / np * 0.4, 4); g.fillRect(p[0] + (i + 0.3) * (w / np), p[1] + h, w / np * 0.4, 4); } } }
    g.restore();
    // 配線(消えた銅)と、灯った部分(コアからの距離 flood まで。はじけと同時に外へ広がる)
    const dark = new Path2D(), litP = new Path2D(), fireP = new Path2D(), minorP = new Path2D();
    const add = (path, pts) => pts.forEach((p, i) => { const q = WP(c, p[0], p[1]); i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]); });
    for (const rt of T.routes) {
      if (rt.minor) { add(minorP, rt.pts); continue; }
      add(dark, rt.pts);
      if (rt.d < 0.55) { const lim = Math.min(rt.len, flood); if (lim > 0.05) add(fireK > 0 && rt.right ? (Math.hypot(...rt.pts[rt.pts.length - 1]) < fireR + 30 ? fireP : litP) : litP, CITY.sub(rt.pts, 0, lim)); }
    }
    g.save(); g.lineCap = "round"; g.lineJoin = "miter";
    g.strokeStyle = css(C.verd, 0.5); g.lineWidth = Math.max(1, 0.02 * s); g.stroke(minorP);
    g.strokeStyle = css(C.verd, 0.9); g.lineWidth = Math.max(1.2, 0.03 * s); g.stroke(dark);
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = css(C.mint, 0.22); g.lineWidth = Math.max(4, 0.12 * s); g.stroke(litP); g.strokeStyle = css(C.mint, 0.95); g.lineWidth = Math.max(1.4, 0.032 * s); g.stroke(litP);
    if (fireK > 0) { g.strokeStyle = css(C.fire, 0.3 * fireK); g.lineWidth = Math.max(4, 0.14 * s); g.stroke(fireP); g.strokeStyle = css("#ffb070", 0.95 * fireK); g.lineWidth = Math.max(1.4, 0.034 * s); g.stroke(fireP); }
    // 信号: コアから外へ流れる光(灯った配線の上)
    for (const rt of T.routes) {
      if (rt.minor || rt.d >= 0.55) continue; const sp = 0.32, L = rt.len + 2, h0 = Y.mod(rt.ph * 40 + f * sp, L); if (h0 > Math.min(rt.len, flood)) continue;
      const seg = CITY.sub(rt.pts, Math.max(0, h0 - 1.6), h0), pp = new Path2D(); add(pp, seg);
      g.strokeStyle = css(fireK > 0 && rt.right ? "#ffe0b8" : C.white, 0.95); g.lineWidth = Math.max(1.6, 0.045 * s); g.stroke(pp);
    }
    g.restore();
    for (const v of T.vias) { const q = WP(c, v[0], v[1]); g.strokeStyle = css(C.verdHi, 0.9); g.lineWidth = 1.5; g.beginPath(); g.arc(q[0], q[1], v[2] * s, 0, 7); g.stroke(); }
    // コア(中心のチップ): 暗い面+縁+中で光る点
    const cs = T.CORE * s; g.fillStyle = "#03110f"; g.fillRect(core[0] - cs, core[1] - cs, cs * 2, cs * 2); g.strokeStyle = css(C.mint, 0.9); g.lineWidth = 2; g.strokeRect(core[0] - cs, core[1] - cs, cs * 2, cs * 2);
    g.strokeStyle = css(C.verdHi, 0.4); g.lineWidth = 1; g.strokeRect(core[0] - cs * 0.7, core[1] - cs * 0.7, cs * 1.4, cs * 1.4);
    return core;
  }
  const s6lay = () => Y.once("s6lay", () => ({ a: Y.layout("MIN", "夜明けの", 150, { track: 0.04 }), b: Y.layout("MIN", "回路に", 380, { track: -0.02 }), c: Y.layout("MIN", PH6, 132, { vertical: true, lead: 1.0 }) }));
  function drawS6(g, f) {
    const t = T6(), c = camTunnel(f), L = s6lay();
    // 784 の衝撃: 画面ごと揺れる(#024: x 15·e^(−5t)·sin(2π·5t)、y 11·e^(−5t)·cos(2π·6.5t)、回転 0.02·e^(−5t)。1920 幅に合わせて x,y を 2 倍、回転は 0.4 倍)
    const ts = (f - t.slam) / 30; let sx = 0, sy = 0, rot = 0;
    if (ts > 0 && ts < 1.1) { const e = Math.exp(-5 * ts); sx = 30 * e * Math.sin(2 * Math.PI * 5 * ts); sy = 22 * e * Math.cos(2 * Math.PI * 6.5 * ts); rot = 0.008 * e * Math.sin(2 * Math.PI * 5 * ts + 0.6); }
    g.save(); g.translate(W / 2 + sx, H / 2 + sy); g.rotate(rot); g.translate(-W / 2, -H / 2);
    const fireK = smooth(P(f, t.fire - 1, t.fire + 2)), fireR = 26 * eOut(P(f, t.fire, t.fire + 30)) - 2, flood = 1 + 24 * eOut(P(f, t.hit, t.hit + 24));
    const core = drawTunnel(g, c, f, { fireK, fireR, flood });
    // 769: 奥の点からはじける輪(#003 の数値を 4.2 倍)
    const vp = core;
    { const dt = (f - t.hit) / 30; if (dt >= 0 && dt < 0.8) { const q = eOut5(clamp(dt / 0.6)); g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = css(C.white, 0.9 * (1 - q)); g.lineWidth = 16 * 4.2 * (1 - q) * 0.5; g.beginPath(); g.arc(vp[0], vp[1], (44 + 46 * q) * 4.2 * 2.2, 0, 7); g.stroke(); g.restore(); } }
    Y.glow(g, vp[0], vp[1], 300, C.mint, 0.28); Y.glow(g, vp[0], vp[1], 60, C.white, 0.8);
    g.fillStyle = C.white; g.beginPath(); g.arc(vp[0], vp[1], 6, 0, 7); g.fill();
    // 文字の後ろの下地(配線を静める)
    { const gg = g.createRadialGradient(640, 470, 60, 640, 470, 680); gg.addColorStop(0, "rgba(1,8,8,0.85)"); gg.addColorStop(0.6, "rgba(1,8,8,0.5)"); gg.addColorStop(1, "rgba(1,8,8,0)"); g.save(); g.setTransform(1, 0, 0, 0.62, 0, 470 * 0.38); g.fillStyle = gg; g.fillRect(-200, -600, 1900, 2400); g.restore(); }
    g.save(); g.translate(W / 2, H / 2); g.rotate(c.roll); g.translate(-W / 2, -H / 2);
    // 「夜明けの」: はじけと同時に左上へ(既に歌われた句)
    const aIn = TYPE.fadeIn(f, t.hit, 3);
    TYPE.glass(g, L.a, 190, 140, 150, [aIn, aIn, aIn, aIn], { ph: PH5, faceTop: "#f2fffb", faceBot: "#7fe0c8", rim: C.white, glowA: 0.4, inner: 0, shadow: 0.75 });
    // 「回路に」: #008 の「ドン」: 3.4 倍 → 1 倍を語頭の 5 コマ前から cubic ease-in で、語頭のコマに着く。着いた後 横揺れ 10·e^(−9t)·sin(38t)(×3)、縦のつぶれ 20%·e^(−11t)
    {
      const tt = (f - t.slam) / 30, s0 = f < t.slam ? lerp(3.4, 1, eIn(P(f, t.slam - 5, t.slam))) : 1;
      const a = f < t.slam - 5 ? 0 : clamp((f - (t.slam - 5)) / 2), dx = tt > 0 ? 30 * Math.exp(-9 * tt) * Math.sin(38 * tt) : 0, sq = tt > 0 ? 1 - 0.2 * Math.exp(-11 * tt) : 1;
      if (a > 0) TYPE.circuit(g, L.b, 150, 320, 380, f, { ph: "_6", alpha: a, scale: s0, dx, sq, seed: 4 });
      for (let i = 0; i < 3; i++) TYPE.mark(PH5, 4 + i, a * (s0 < 1.6 ? 1 : 0.25)); // 3.4 倍の間は画面からはみ出して読めない
      // 着地の衝撃の輪(字の足元から)
      if (tt > 0 && tt < 0.5) { const q = eOut(tt / 0.5); g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = css(C.mint, 0.7 * (1 - q)); g.lineWidth = 10 * (1 - q); g.beginPath(); g.ellipse(150 + L.b.w / 2, 320 + 360, 300 + 500 * q, 40 + 70 * q, 0, 0, 7); g.stroke(); g.restore(); }
    }
    // 「火を灯して」: 縦書き・朱。字ごとに点く。「火」は 812 で灯り、#125 の二度打ちの脈(1 + 0.26·G(0) + 0.15·G(0.24 秒))
    {
      const st = charStarts(PH6), o3 = [1630, 196], s3 = 132, fx0 = o3[0] + s3 / 2, fy0 = o3[1] + s3 * 0.5;
      const G = (x, cc, w) => Math.exp(-Math.pow((x - cc) / w, 2)), dtF = (f - t.fire) / 30;
      const pulse = dtF >= -0.1 ? 1 + 0.26 * G(dtF, 0.0, 0.065) + 0.15 * G(dtF, 0.24, 0.07) : 1;
      if (fireK > 0) { Y.glow(g, fx0, fy0 - 60, 460, C.fire, 0.34 * fireK); Y.glow(g, fx0, fy0 - 90, 150, "#ffb070", 0.24 * fireK); }
      { const gg = g.createRadialGradient(fx0, fy0, s3 * 0.3, fx0, fy0, s3 * 0.85); gg.addColorStop(0, "rgba(30,4,2,0.55)"); gg.addColorStop(1, "rgba(30,4,2,0)"); g.fillStyle = gg; g.fillRect(fx0 - s3, fy0 - s3, s3 * 2, s3 * 2); }
      // 火の輪(#125 の輪: 1.2→2.4 倍を 0.8 秒、不透明 0.75→0、線幅 8.5→1.5)
      for (const [d0, aa] of [[0, 0.75], [0.24, 0.45]]) { const u = (dtF - d0) / 0.8; if (u < 0 || u > 1) continue; const q = eOut(u); g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = css(C.fire, aa * (1 - u)); g.lineWidth = lerp(8.5, 1.5, q); g.beginPath(); g.arc(fx0, fy0, s3 * lerp(0.6, 1.2, q), 0, 7); g.stroke(); g.restore(); }
      L.c.items.forEach((it, i) => {
        const a = TYPE.fadeIn(f, st[i] - 2, 4); TYPE.mark(PH6, i, a); if (a <= 0) return;
        const lit = i === 0 ? fireK : smooth(P(f, st[i], st[i] + 4)) * fireK;
        g.save(); g.globalAlpha = a; const cy = o3[1] + it.y - s3 * 0.42, sc = i === 0 ? pulse : 1;
        g.translate(fx0, cy); g.scale(sc, sc); g.translate(-fx0, -cy);
        K.textPath(g, { items: [it] }, o3[0], o3[1], s3); g.lineJoin = "round"; g.strokeStyle = "rgba(20,4,2,0.85)"; g.lineWidth = 6; g.stroke();
        const gr = g.createLinearGradient(0, o3[1] + it.y - s3 * 0.9, 0, o3[1] + it.y + s3 * 0.1);
        gr.addColorStop(0, css(mix("#4a140c", "#ffe7c4", lit))); gr.addColorStop(0.5, css(mix("#2a0a06", "#ff9a58", lit))); gr.addColorStop(1, css(mix("#1a0605", "#e2361e", lit)));
        g.fillStyle = gr; g.fill("nonzero"); g.strokeStyle = css(lit > 0.5 ? "#fff0d8" : C.fire, 0.85); g.lineWidth = 1.8; g.stroke(); g.restore();
      });
      // 845: 火の粉(#015: 初速 横 ±190 px/s・上 250〜400 px/s、重力 470 px/s²、寿命 1.5 秒)。#003 の点も
      const r = rng(845), dtE = (f - t.embers) / 30;
      g.save(); g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 84; i++) {
        const vx = (r() * 2 - 1) * 190 * 1.6, vy = -(250 + r() * 150) * 1.7, life = 0.8 + r() * 0.7, d = r() * 0.15, tt = dtE - d, s = 1.4 + r() * 2.6, col = r() < 0.5 ? "#ffcf8a" : C.fire;
        if (tt < 0 || tt > life) continue; const x = fx0 + vx * tt, y = fy0 - 20 + vy * tt + 0.5 * 470 * tt * tt, al = (tt < 0.06 ? tt / 0.06 : 1) * (tt > life * 0.7 ? 1 - (tt - life * 0.7) / (life * 0.3) : 1);
        g.fillStyle = css(col, al); g.beginPath(); g.ellipse(x, y, s, s * 2.4, Math.atan2(vy + 470 * tt, vx) + Math.PI / 2, 0, 7); g.fill();
      }
      // 漂う火の粉(灯った後ずっと)
      if (fireK > 0) { const r2 = rng(44); for (let i = 0; i < 46; i++) { const ph = r2(), sp = 2 + r2() * 4, u = Y.mod(ph + (f - t.fire) * sp / 900, 1), x = fx0 + (r2() - 0.5) * 360 + Math.sin(u * 9 + i) * 20, y = fy0 + 260 - u * 760, s = 1 + r2() * 2.4; g.fillStyle = css(r2() < 0.5 ? "#ffcf8a" : C.fire, fireK * (0.3 + 0.5 * (1 - u))); g.beginPath(); g.ellipse(x, y, s, s * 2.4, 0, 0, 7); g.fill(); } }
      g.restore();
    }
    g.restore(); // 傾き
    g.restore(); // 揺れ
    K.dust(g, 8, f, { n: 90, col: "#b0fff0", a: 0.5, drift: [0.4, -0.1] });
    const dh = f - t.hit, ds = f - t.slam;
    const fx = { bloom: { thr: 0.72, a: 0.55, streak: 0.45, streakCol: fireK > 0 ? "#ffb08a" : "#5ff0d0" }, grade: { ca: 3.2, vig: 0.38, grain: 10, toe: [4, 8, 9] } };
    fx.letterbox = 60 * (1 - eOut5(P(f, t.hit, t.hit + 7))); // 黒帯が開く(山1の解放)
    fx.exposure = (dh >= 0 ? 0.4 * Math.exp(-dh / 4) : 0) + (ds >= 0 ? 0.28 * Math.exp(-ds / 3) : 0);
    fx.zoomBlur = [dh >= 0 ? 0.16 * Math.exp(-dh / 6) : 0, 1400, 500];
    fx.chroma = (dh >= 0 && dh < 8 ? 7 * Math.exp(-dh / 3) : 0) + (ds >= 0 && ds < 6 ? 5 * Math.exp(-ds / 2) : 0);
    return fx;
  }
  FILM.reg({ id: "S6", a: B.S6, draw: drawS6 });

  // ================= S7: 消えかけた声 → 光に変えて(横長・ピント送り) =================
  const T7 = () => Y.once("t7", () => ({ a: phrase(PH7).start, b: phrase(PH8).start, end: B.S8 }));
  function camS7(f) { const u = f - B.S7; return cam3({ x: -26, y: 0.42, z: 44 - u * 0.035, yaw: Math.PI / 2 - 0.05, pitch: 0.02, f: 1250, cx: W / 2, cy: 700 }); }
  const s7lay = () => Y.once("s7lay", () => ({ a: Y.layout("MIN", PH7, 150, { track: 0.06 }), b: Y.layout("MIN", PH8, 176, { track: 0.08 }) }));
  function drawS7(g, f) {
    const t = T7(), c = camS7(f), CTy = CITY.get(11), L = s7lay();
    const focus = eIO(P(f, t.b - 2, t.b + 22)); // ピント送り: 手前の字 → 奥の街
    // 背景(街)を別の層に描いてぼかす
    const [bc, bg] = Y.wbuf("s7bg");
    CITY.sky(bg, c, ["#030208", "#06040c", "#0b0a14", "#1a1426", "#2a1a2c"], { stars: 0.6, f, haze: { col: "#5a2a4a", a: 0.35, h: 260 } });
    CITY.ground(bg, c, "#120d18", "#020204");
    const lit7 = (ch) => 0.25 + 0.35 * hash(ch.seed, 7) + 0.35 * focus;
    CITY.traces(bg, c, CTy, { fogD: 45, maxD: 120, wire: "#3a2a44", wireHi: "#8a5a7a", fogCol: "#1a1426", litFn: (tr) => tr.kind === "bus" && tr.r < 0.05 + 0.2 * focus, litCol: C.rose, litA: 0.7 });
    CITY.signals(bg, c, CTy, f, { n: 40 + Math.round(60 * focus), seed: 21, col: "#ff9ac0", head: "#fff0f6", sp: 0.09, maxD: 90 });
    CITY.chips(bg, c, CTy, f, { fogD: 42, maxD: 120, lit: lit7, winCol: "#ffd0e4", fogCol: "#1a1426", chipTop: "#1a1222", chipSide: "#08060c", rimCol: "#c98aa8", sideLight: "#3a2440", rimA: 0.45 });
    g.save(); if (K.st.fx) g.filter = `blur(${lerp(7, 0, focus)}px)`; g.drawImage(bc, 0, 0); g.restore();
    // 手前のぼけ(近くの光の玉と、左右の大きなチップの影)。ピント送りで大きくぼける
    if (K.st.fx) { const br = rng(9); g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 12; i++) { const x = br() * W + (f - B.S7) * (1.5 + br() * 2), y = 760 + br() * 320, rr = (30 + br() * 70) * (1 + focus * 0.8); const gg = g.createRadialGradient(x, y, rr * 0.55, x, y, rr); gg.addColorStop(0, css(i % 3 ? C.rose : C.mint, 0.05 + 0.05 * focus)); gg.addColorStop(0.9, css(i % 3 ? "#ff9ac0" : C.mint, 0.1 + 0.06 * focus)); gg.addColorStop(1, css(C.rose, 0)); g.fillStyle = gg; g.beginPath(); g.arc(x % (W + 200) - 100, y, rr, 0, 7); g.fill(); } g.restore(); }
    // 字の下地
    { const gg = g.createRadialGradient(W / 2, 330, 40, W / 2, 330, 800); gg.addColorStop(0, "rgba(4,1,6,0.75)"); gg.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.setTransform(1, 0, 0, 0.4, 0, 330 * 0.6); g.fillStyle = gg; g.fillRect(0, -800, W, 2800); g.restore(); }
    // 「消えかけた声を」: 弱い信号。輪郭が 3 コマごとにふるえ(#136 ラインボイル: 点ごとに ±3.5 px を hash で)、所々欠け、字ごとに明るさが揺れる(画面全体は明滅させない)
    const stA = charStarts(PH7), oxA = (W - L.a.w) / 2, oyA = 250;
    const out = P(f, t.b - 6, t.b + 6);
    if (out < 1) {
      const fi = Math.floor(f / 3);
      L.a.items.forEach((it, i) => {
        const on = f - (stA[i] - 2); let a = on < 0 ? 0 : on < 6 ? [0, 0.8, 0.15, 0.9, 0.5, 1][on] : 0.8 + 0.2 * hash(fi, i * 13 + 5);
        a *= 1 - smooth(out); TYPE.mark(PH7, i, a); if (a <= 0.01) return;
        const cs = Y.contours(it, oxA, oyA, 150);
        g.save(); g.globalAlpha = a;
        K.textPath(g, { items: [it] }, oxA, oyA, 150); g.fillStyle = "rgba(42,12,40,0.55)"; g.fill("nonzero");
        g.lineJoin = "round"; g.lineCap = "round";
        for (const [lw, col, al] of [[7, C.rose, 0.25], [2.4, "#ffc2da", 0.95]]) {
          g.strokeStyle = css(col, al); g.lineWidth = lw; g.setLineDash([30 + 40 * hash(fi, i), 6 + 10 * hash(fi, i + 50)]); g.lineDashOffset = hash(fi, i + 9) * 60;
          g.beginPath(); for (const cn of cs) { for (let k = 0; k < cn.length; k += 2) { const j = k / 2, x = cn[k] + (hash(fi * 7919 + j * 131, i * 17) - 0.5) * 5, y = cn[k + 1] + (hash(fi * 6007 + j * 97, i * 29 + 5) - 0.5) * 5; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); } g.stroke();
        }
        g.setLineDash([]); g.restore();
      });
    } else markAll(PH7, 7, 0);
    // 937: 輪郭がほどけて光の線になり、右の画面外へ流れる
    const pA = Y.once("s7ptsA", () => TYPE.samplePts(L.a, oxA, oyA, 150, 7)), r = rng(937), du = (f - (t.b - 6)) / 30;
    if (du > 0 && du < 1.6) {
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (const p of pA) { const acc2 = 1400 + r() * 2600, d = r() * 0.2, tt = du - d, wob = (r() - 0.5) * 60; if (tt <= 0) continue; const x1 = p[0] + 0.5 * acc2 * tt * tt, x0 = p[0] + 0.5 * acc2 * Math.max(0, tt - 0.07) ** 2, y = p[1] + wob * tt; if (x0 > W + 40) continue; g.strokeStyle = css(r() < 0.3 ? C.white : "#ff9ac0", 0.8 * (1 - tt / 1.6)); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1 + 2, y); g.stroke(); }
      g.restore();
    }
    // 「光に変えて」: 左から来る光の線が字の輪郭に集まる(#012 形の変化: 点の対応で補間、backOut s=1.6、行き過ぎ少し)。集まった字はガラスの字になる
    const stB = charStarts(PH8), oxB = (W - L.b.w) / 2, oyB = 250;
    const pB = Y.once("s7ptsB", () => TYPE.samplePts(L.b, oxB, oyB, 176, 6)), r2 = rng(938), DUR = 14;
    const prog = stB.map((s) => clamp((f - (s - 9)) / DUR));
    if (prog[0] > 0) {
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (const p of pB) { const k = prog[p[2]], sx0 = -200 - r2() * 900, wob = (r2() - 0.5) * 160; if (k <= 0 || k >= 1) continue; const e = Y.backOut(k, 1.6), x = lerp(sx0, p[0], e), y = lerp(p[1] + wob, p[1], eOut(k)), tl = 160 * (1 - k); g.strokeStyle = css(r2() < 0.3 ? C.white : C.mint, 0.85); g.lineWidth = 2; g.beginPath(); g.moveTo(x - tl, y); g.lineTo(x, y); g.stroke(); }
      g.restore();
      const al = prog.map((k) => smooth(P(k, 0.7, 1)));
      TYPE.glass(g, L.b, oxB, oyB, 176, al, { ph: PH8, faceTop: "#f6fffd", faceBot: "#a6f5e2", rim: C.white, glowA: 0.6, inner: 0, shadow: 0.6 });
    } else markAll(PH8, 5, 0);
    K.dust(g, 19, f, { n: 70, col: "#ffc2da", a: 0.35, drift: [0.25, -0.05] });
    return { bloom: { thr: 0.62, a: 0.7, streak: 0.4, streakCol: "#ff9ac0" }, grade: { ca: 2.4, vig: 0.45, grain: 10, toe: [6, 3, 9] } };
  }
  FILM.reg({ id: "S7", a: B.S7, draw: drawS7 });

  // ================= S8: 一人称の疾走(#035 FPV)=================
  const T8 = () => Y.once("t8", () => ({ a: phrase(PH9).start, b: phrase(PH10).start, bEnd: phrase(PH10).end, road: acc(1123), end: B.S9 }));
  const WHIP = 6; // #043 ホイップパン: 片側 0.2 秒(元は 0.4 秒。曲の速さに合わせて短く)、yaw 0.45 rad、quadratic in-out
  function camS8(f) {
    const u = (f - B.S8) / 30, T = (u * 2 * Math.PI) / 4.7, t = T8();
    const boost = smooth(P(f, t.road - 4, t.road + 10)) * 0.25;
    const z = -26 + (f - B.S8) * 0.72 + boost * Math.max(0, f - t.road) * 0.6;
    const whip = 0.45 * eIOs(P(f, t.end - WHIP, t.end));
    return cam3({ x: 0.3 + 0.35 * Math.sin(2 * T - 0.4), y: 0.62 + 0.22 * Math.sin(2 * T), z, roll: 0.11 * Math.sin(2 * T + 0.6), yaw: 0.05 * Math.sin(2 * T) + whip, pitch: -0.035, f: 820, cx: W / 2, cy: 560 });
  }
  const s8lay = () => Y.once("s8lay", () => ({ a: Y.layout("DELA", PH9, 220, { track: 0.02 }), b: Y.layout("DELA", PH10, 200, { vertical: true, lead: 1.0 }) }));
  function dela(g, L, ox, oy, size, a, { face = ["#ffffff", "#c9fff1"], rim = C.mint, glowA = 0.6, per = null } = {}) {
    L.items.forEach((it, i) => {
      const s = per ? per[i] : 1, b = Y.charBox(L, i, ox, oy, size);
      g.save(); g.globalAlpha = a; g.translate(b.cx, b.cy); g.scale(s, s); g.translate(-b.cx, -b.cy);
      const one = { items: [it] };
      if (K.st.fx) { g.save(); K.textPath(g, one, ox, oy, size); g.filter = `blur(${size * 0.05}px)`; g.fillStyle = css(rim, glowA); g.fill("nonzero"); g.restore(); }
      K.textPath(g, one, ox, oy, size); g.lineJoin = "round"; g.strokeStyle = "rgba(0,12,10,0.9)"; g.lineWidth = size * 0.05; g.stroke();
      const gr = g.createLinearGradient(0, b.y, 0, b.y + size); gr.addColorStop(0, face[0]); gr.addColorStop(1, face[1]); g.fillStyle = gr; g.fill("nonzero");
      g.restore();
    });
  }
  function drawS8(g, f) {
    const t = T8(), c = camS8(f), CTy = CITY.get(11), L = s8lay();
    const road = f >= t.road ? 1 : 0, rk = f >= t.road ? Math.exp(-(f - t.road) / 18) : 0;
    CITY.sky(g, c, ["#010203", "#020607", "#041012", "#0c2a2c", "#164040"], { stars: 0.6, f, haze: { col: "#1d6a62", a: 0.4, h: 300 } });
    CITY.ground(g, c, "#0b2224", "#010405");
    CITY.pylons(g, c, CTy, f, { a: 0.9 });
    CITY.traces(g, c, CTy, { fogD: 42, maxD: 130, litFn: (tr) => (tr.kind === "avenue" ? road || tr.r < 0.45 : tr.kind === "bus" && tr.r < 0.18 + 0.25 * road), litA: 0.8 + 0.2 * rk, litCol: rk > 0.3 ? mix(C.mint, C.white, rk * 0.6) : C.mint });
    CITY.signals(g, c, CTy, f, { n: 200, seed: 33, sp: 0.16, maxD: 90, tail: 3.2 });
    // 大通りを手前へ流れる光(速さを出す。路面の上の白い線)
    { const r = rng(1002); g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; for (let i = 0; i < 26; i++) { const x = 0.3 + (r() - 0.5) * 1.3, ph = r(), zz = c.z + Y.mod(ph * 60 - (f - B.S8) * 0.6, 60), p0 = pj(c, x, 0.01, zz), p1 = pj(c, x, 0.01, zz + 2.5 + r() * 2); if (p0[2] < 0.3 || p1[2] < 0.3) continue; g.strokeStyle = css(C.white, 0.7); g.lineWidth = clamp(60 / p0[2], 1, 6); g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke(); } g.restore(); }
    // 1123: 路面が一斉に灯る(局所: 路面の帯だけ明るく)
    if (rk > 0.01) { const p = pj(c, 0.3, 0, c.z + 3), q = pj(c, 0.3, 0, c.z + 80); g.save(); g.globalCompositeOperation = "lighter"; const gg = g.createLinearGradient(0, p[1], 0, q[1]); gg.addColorStop(0, css(C.mint, 0.16 * rk)); gg.addColorStop(1, css(C.mint, 0)); if (K.st.fx) g.filter = "blur(24px)"; g.fillStyle = gg; g.beginPath(); g.moveTo(p[0] - 900, H); g.lineTo(p[0] + 900, H); g.lineTo(q[0] + 8, q[1]); g.lineTo(q[0] - 8, q[1]); g.closePath(); g.fill(); g.restore(); }
    CITY.chips(g, c, CTy, f, { fogD: 40, maxD: 120, lit: (ch) => 0.55 + 0.35 * hash(ch.seed, 8), winCol: "#c8fff2", rimA: 0.6, sideLight: "#24605a" });
    // スピード線(#035: 10 本、長さ 32〜76 px を外へ流す。1920 幅で 3.5 倍)
    { const u = (f - B.S8) / 30; g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + 0.3, ph = Y.mod(u * 2.2 + i * 0.37, 1), r0 = (120 + ph * 160) * 3.5, l = (32 + 44 * Math.abs(Math.cos(a))) * 3.5; g.strokeStyle = css(C.mint, 0.22 * (1 - ph)); g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0, 560 + Math.sin(a) * r0 * 0.45); g.lineTo(W / 2 + Math.cos(a) * (r0 + l), 560 + Math.sin(a) * (r0 + l) * 0.45); g.stroke(); } g.restore(); }
    // 「止まらない」: 横から叩きつけ(語頭の 5 コマ前から ease-in で左から、語頭で着地、#008 の横揺れ)。字ごとに歌の刻みで脈打つ
    const oyA = 150, oxA = (W - L.a.w) / 2, stA = charStarts(PH9, { step: 10, spread: 1 });
    {
      const tt = (f - t.a) / 30, exit = P(f, t.b - 2, t.b + 4);
      const x = f < t.a ? lerp(-1900, 0, eIn(P(f, t.a - 5, t.a))) : 0, dx = tt > 0 ? 34 * Math.exp(-9 * tt) * Math.sin(38 * tt) : 0;
      const a = (f < t.a - 5 ? 0 : 1) * (1 - exit), xo = x + dx - 2400 * eIn(exit);
      const per = stA.map((s) => 1 + 0.1 * Math.exp(-Math.max(0, f - s) / 3) * (f >= s ? 1 : 0));
      if (a > 0) { const bk = g.createRadialGradient(W / 2, oyA + 110, 40, W / 2, oyA + 110, 900); bk.addColorStop(0, "rgba(0,5,5,0.6)"); bk.addColorStop(1, "rgba(0,0,0,0)"); g.save(); g.setTransform(1, 0, 0, 0.35, 0, (oyA + 110) * 0.65); g.fillStyle = bk; g.fillRect(0, -1200, W, 4000); g.restore();
        for (let k = 4; k >= 1; k--) if (f < t.a || exit > 0) { const v = f < t.a ? 380 * eIn(P(f, t.a - 5, t.a)) : -500 * exit; dela(g, L.a, oxA + xo - v * k * 0.18, oyA, 220, a * 0.18); }
        dela(g, L.a, oxA + xo, oyA, 220, a, { per }); }
      markAll(PH9, 5, f < t.a - 1 ? 0 : a); // 語頭の 2 コマ前までは画面の外(左)
    }
    // 「止まれない」: 逆の軸(縦)から。上から落ちて語頭で着地、つぶれて戻る。着地直後に #023 グリッチ(0.14 秒 × 2 段、明るさは変えない)
    const oxB = W - 420, oyB = 70;
    {
      const tt = (f - t.b) / 30, exit = P(f, t.bEnd, t.bEnd + 8);
      const y = f < t.b ? lerp(-1300, 0, eIn(P(f, t.b - 5, t.b))) : 0, sq = tt > 0 && tt < 0.3 ? 1 - 0.18 * Math.sin((tt / 0.3) * Math.PI) : 1;
      const a = (f < t.b - 5 ? 0 : 1) * (1 - smooth(exit));
      markAll(PH10, 5, f < t.b - 1 ? 0 : a); // 語頭の 2 コマ前までは画面の外(上)
      if (a > 0) {
        const [tc, tg] = Y.wbuf("s8b"); tg.translate(oxB + 100, oyB + 1000); tg.scale(2 - sq, sq); tg.translate(-oxB - 100, -oyB - 1000);
        dela(tg, L.b, oxB, oyB + y, 200, 1, { face: ["#ffe4ee", "#ff8ab4"], rim: C.rose, glowA: 0.55 });
        const step = Math.floor((f - t.b) / 4); // 0.14 秒 ≒ 4 コマ
        g.save(); g.globalAlpha = a;
        if (f >= t.b && step < 2 && K.st.fx) {
          const R = rng(1056 + step * 7), rgb = 7 + R() * 9;
          // 色ずれ(朱と青緑の写しを左右へ)+帯のずれ
          g.globalCompositeOperation = "lighter"; g.globalAlpha = a * 0.5; g.drawImage(tc, -rgb, 2); g.globalAlpha = a; g.globalCompositeOperation = "source-over";
          g.drawImage(tc, 0, 0);
          for (let s = 0, n = 2 + ((R() * 3) | 0); s < n; s++) { const yy = oyB + R() * 1000, hh = 10 + R() * 26, d = (R() < 0.5 ? -1 : 1) * (18 + R() * 46); g.drawImage(tc, oxB - 60, yy, 360, hh, oxB - 60 + d, yy, 360, hh); }
        } else g.drawImage(tc, 0, 0);
        g.restore();
      }
    }
    K.dust(g, 13, f, { n: 60, col: "#c8fff2", a: 0.4, drift: [0, 1.2] });
    const fx = { bloom: { thr: 0.6, a: 0.75, streak: 0.5 }, grade: { ca: 3.0, vig: 0.42, grain: 10, toe: [3, 9, 10] } };
    // ホイップの横ぶれ(#043 は 9 枚の平均。ここでは向きのぼかし)
    const wk = P(f, t.end - WHIP, t.end); if (wk > 0) fx.dirBlur = [-260 * eIOs(wk), 0, 8];
    if (f >= t.a - 4 && f < t.a) fx.dirBlur = [140, 0, 6];
    return fx;
  }
  FILM.reg({ id: "S8", a: B.S8, draw: drawS8 });

  // ================= S9: まだ、光は消えない(#032 ドリーズーム → 1302 で止まる #040) =================
  const T9 = () => Y.once("t9", () => ({ a: word("まだ、"), b: word("光は"), c: word("消えない"), end: B.S10 }));
  // 1302 と 1338 は曲の区間の境目(cues.json の boundary)。境目は lyric_timeline の区間から取る
  const brkF = () => Y.once("brk", () => { const e = Y.CUES.events.filter((x) => x.kind === "boundary" && x.shot === "S9").map((x) => x.frame).sort((a, b) => a - b); return { brk: e[0], squeeze: e[1] }; });
  function camS9(f) {
    const t = T9(), k = brkF(), ff = Math.min(f, k.brk); // 1302 で止める(フリーズ)
    const d = lerp(3.2, 8, eIO(P(ff, B.S9, k.brk)));    // 被写体(光の柱、Z=zs)までの距離 3.2→8 m、焦点距離は d に比例(大きさは一定、背景だけ迫る)
    const zs = 20, wi = 0.45 * (1 - eIOs(P(f, B.S9, B.S9 + WHIP))); // 前のショットのホイップを受ける
    return cam3({ x: 0.3, y: 1.25, z: zs - d, yaw: -wi, pitch: 0.035, f: (560 * d) / 3.2, cx: W / 2, cy: 640 });
  }
  const s9lay = () => Y.once("s9lay", () => ({ a: Y.layout("MIN", "まだ、光は", 150, { vertical: true, lead: 1.06 }), b: Y.layout("MIN", "消えない", 150, { vertical: true, lead: 1.06 }) }));
  function drawS9(g, f) {
    const t = T9(), k = brkF(), c = camS9(f), CTy = CITY.get(11), L = s9lay(), ff = Math.min(f, k.brk);
    // 灯りが奥から順に落ちていき、1302 で街は真っ暗になる
    const off = (Z) => clamp(P(ff, B.S9 + 10 + (140 - Z) * 0.5, k.brk - 20 + (140 - Z) * 0.1) + (f >= k.brk ? 1 : 0));
    const lit9 = (ch) => (0.7 + 0.25 * hash(ch.seed, 9)) * (1 - off(ch.Z));
    const dark = smooth(P(f, k.brk - 4, k.brk + 2));
    CITY.sky(g, c, ["#010102", "#020406", "#040a0c", "#0a1c1e", css(mix("#123236", "#05090a", dark))], { stars: 1 - 0.5 * dark, f: ff });
    CITY.ground(g, c, "#0a1e20", "#010304");
    CITY.pylons(g, c, CTy, ff, { a: 1 - smooth(P(ff, B.S9, k.brk)) });
    CITY.traces(g, c, CTy, { fogD: 40, maxD: 140, wireA: 1 - 0.6 * dark, litFn: (tr) => tr.r < 0.2 * (1 - off(tr.zc)) && tr.kind !== "fill", litA: 0.75 });
    CITY.signals(g, c, CTy, ff, { n: Math.round(120 * (1 - smooth(P(ff, B.S9, k.brk)))), seed: 41, sp: 0.06, maxD: 100 });
    CITY.chips(g, c, CTy, ff, { fogD: 40, maxD: 140, lit: lit9, roofLights: 1 - dark, rimA: 0.5 * (1 - 0.7 * dark) });
    // 被写体: 大通りの中央に立つ 1 本の光の柱(大きさはドリーズームで一定)。最後まで消えない
    { const b = pj(c, 0.3, 0, 20), tp = pj(c, 0.3, 2.6, 20); g.save(); g.globalCompositeOperation = "lighter"; const gg = g.createLinearGradient(0, tp[1], 0, b[1]); gg.addColorStop(0, css(C.mint, 0)); gg.addColorStop(1, css(C.white, 0.95)); g.fillStyle = gg; g.fillRect(b[0] - 2, tp[1], 4, b[1] - tp[1]); g.restore(); Y.glow(g, b[0], b[1], 90, C.mint, 0.7); }
    // 文字: 語ごとに点く(灯りが消えていく街と逆に、字は明るくなる)。1302 からはさらに強く、1338 で一瞬しぼる(溜め)
    const st = charStarts(PH11), sq = f >= k.squeeze && f < t.end ? 0.45 : 1;
    const rise = 1 + 0.6 * smooth(P(f, k.brk, k.squeeze));
    const al = st.map((s) => TYPE.fadeIn(f, s - 2, 5, 0));
    const colX = [1450, 1250], oy = 120;
    { const gg = g.createRadialGradient(1380, 470, 40, 1380, 470, 520); gg.addColorStop(0, `rgba(0,3,4,${0.55 * (1 - dark)})`); gg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gg; g.fillRect(800, 0, 1120, H); }
    TYPE.glass(g, L.a, colX[0], oy, 150, al.slice(0, 5), { ph: "_9a", faceTop: "#e8fff9", faceBot: "#8fe8d4", rim: C.white, glowA: 0.45 * rise * sq, inner: 0, shadow: 0.5 });
    TYPE.glass(g, L.b, colX[1], oy + 150 * 1.06, 150, al.slice(5), { ph: "_9b", faceTop: "#e8fff9", faceBot: "#8fe8d4", rim: C.white, glowA: 0.45 * rise * sq, inner: 0, shadow: 0.5 });
    al.forEach((a, i) => TYPE.mark(PH11, i, a));
    if (dark > 0) for (const [x, y] of [[colX[0] + 75, oy + 400], [colX[1] + 75, oy + 480]]) Y.glow(g, x, y, 340, C.mint, 0.18 * dark * rise * sq);
    K.dust(g, 23, ff, { n: 60, col: "#a6fff0", a: 0.35 * (1 - 0.5 * dark), drift: [0.05, -0.15] });
    const fx = { bloom: { thr: 0.55, a: 0.8, streak: 0.4 }, grade: { ca: 2.0, vig: 0.5 + 0.1 * dark, grain: 10, toe: [3, 9, 10] } };
    const wk = 1 - P(f, B.S9, B.S9 + WHIP); if (wk > 0) fx.dirBlur = [260 * eIOs(wk), 0, 8];
    return fx;
  }
  FILM.reg({ id: "S9", a: B.S9, draw: drawS9 });
  window.CHORUS = { camS9, s9lay, T9, brkF, drawS9 };
})();
