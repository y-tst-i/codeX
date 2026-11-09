// スタイルフレーム(静止画)。STILLS[n](ctx, f): 曲のコマ番号 f の絵(全部 f と引数だけで決まる)。
// 1: 220コマ(7.33秒)ブリッジ「暗闇の数だけ」 2: 812コマ(27.07秒)サビ「火を灯して」の点火 3: 1480コマ(49.33秒)「夜が明ける」 4: 1560コマ 終わりの画
const STILLS = (() => {
  const K = KAIRO, { C, W, H, proj, mix, css, clamp, lerp, smooth, mulberry32 } = K;
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);

  // ---- 共通: 夜の空と盤 ----
  function nightSky(ctx, hy, { haze = 0.5 } = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, hy + 40);
    g.addColorStop(0, "#010203"); g.addColorStop(0.55, "#03090b"); g.addColorStop(0.9, "#0a2024"); g.addColorStop(1, "#123236");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 40);
    // 地平線のもや(遠い街の灯りの照り返し)。縦は滑らかな帯、横は左寄りに明るい
    if (K.st.fx) {
      const v = ctx.createLinearGradient(0, hy - 260, 0, hy + 80); v.addColorStop(0, css("#1d5a56", 0)); v.addColorStop(0.75, css("#1d5a56", 0.28 * haze)); v.addColorStop(1, css("#2c7a70", 0.4 * haze));
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = v; ctx.fillRect(0, hy - 260, W, 340);
      const hx = ctx.createLinearGradient(0, 0, W, 0); hx.addColorStop(0, "rgba(0,0,0,0)"); hx.addColorStop(0.45, "rgba(0,0,0,0)"); hx.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = hx; ctx.fillRect(0, hy - 260, W, 340); ctx.restore();
    }
    // 星(ごく少なく)
    const sr = mulberry32(17); ctx.save();
    for (let i = 0; i < 90; i++) { const x = sr() * W, y = sr() * (hy - 120), a = 0.15 + sr() * 0.45; ctx.fillStyle = css("#cfeee8", a * (1 - y / hy)); ctx.fillRect(x, y, 1.6, 1.6); }
    ctx.restore();
  }
  // 遠くで空へ上る細い光(信号の柱)。上る光の粒はコマで動く
  function pylons(ctx, hy, seed, n, f, { col = C.mint } = {}) {
    const r = mulberry32(seed);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const x = 80 + r() * (W - 160), h = 80 + Math.pow(r(), 2) * 360, a = 0.2 + r() * 0.45, w = 1 + r() * 1.4;
      const g = ctx.createLinearGradient(0, hy - h, 0, hy); g.addColorStop(0, css(col, 0)); g.addColorStop(1, css(col, a));
      ctx.fillStyle = g; ctx.fillRect(x, hy - h, w, h);
      const ph = (r() + f * (0.004 + r() * 0.006)) % 1; ctx.fillStyle = css(C.white, a * (1 - ph)); ctx.fillRect(x - 0.5, hy - h * ph - 6, w + 1, 6);
    }
    ctx.restore();
  }
  function boardGround(ctx, hy, top = "#0a1e21", bottom = "#020607") {
    const g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, top); g.addColorStop(0.25, css(mix(top, bottom, 0.6))); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
  }
  // 光が文字をなぞる: 字ごとの開始コマ starts[i]、なぞりにかかるコマ dur
  function charProg(f, starts, dur) { return starts.map((s) => clamp((f - s) / dur)); }
  // 字ごとの進み(0..1)で文字を描く。done の字は「ガラスの字」(暗い面+縁の光)、途中の字は輪郭の途中まで、未着手は刻まれた薄い輪郭
  function litText(ctx, L, ox, oy, size, progs, o = {}) {
    const { lineW = 3, col = C.mint, core = C.white, faceTop = "#0d3534", faceBot = "#04100f", unlit = C.verdHi, unlitA = 0.5, glowA = 0.5 } = o;
    const heads = [];
    L.items.forEach((it, i) => {
      const p = progs[i] ?? 0, one = { items: [it] };
      // 面(なぞり終わった字ほど濃く)
      ctx.save(); K.textPath(ctx, one, ox, oy, size);
      const gr = ctx.createLinearGradient(0, oy + it.y - size * 0.9, 0, oy + it.y + size * 0.15);
      gr.addColorStop(0, faceTop); gr.addColorStop(1, faceBot);
      ctx.fillStyle = gr; ctx.globalAlpha = 0.35 + 0.65 * smooth(p); ctx.fill("nonzero");
      ctx.globalAlpha = 1; ctx.lineWidth = 1.4; ctx.strokeStyle = css(unlit, unlitA * (1 - smooth(p) * 0.6)); ctx.stroke();
      ctx.restore();
      if (p <= 0) return;
      // 光の輪郭(外側のにじみ → 色 → 白い芯)
      if (K.st.fx) { ctx.save(); ctx.filter = `blur(${lineW * 2.2}px)`; K.traceText(ctx, one, ox, oy, size, p, { col: css(col, glowA), w: lineW * 3.2 }); ctx.restore(); }
      K.traceText(ctx, one, ox, oy, size, p, { col: css(col, 0.95), w: lineW });
      const hs = K.traceText(ctx, one, ox, oy, size, p, { col: css(core, 0.95), w: lineW * 0.38 });
      // 字の面の中の光(なぞり終わった字だけ、上から下へ薄いミント)
      if (p >= 1 && K.st.fx) { ctx.save(); K.textPath(ctx, one, ox, oy, size); ctx.clip("nonzero"); const g2 = ctx.createLinearGradient(0, oy + it.y - size, 0, oy + it.y + size * 0.2); g2.addColorStop(0, css(col, 0.18)); g2.addColorStop(1, css(col, 0.02)); ctx.fillStyle = g2; ctx.fillRect(ox + it.x - 10, oy + it.y - size, size * 1.2, size * 1.3); ctx.restore(); }
      heads.push(...hs);
    });
    for (const h of heads) PAINT.glow(ctx, h[0], h[1], 28, col, 0.7);
    for (const h of heads) { ctx.fillStyle = core; ctx.beginPath(); ctx.arc(h[0], h[1], lineW * 0.9, 0, 7); ctx.fill(); }
    return heads;
  }
  // 遠くの配線を走る小さな信号(「暗闇の数だけ 輝きは増す」: 数は時刻で増やせる)
  function ambientSignals(ctx, B, cam, f, { n = 40, col = C.mint, seed = 5, a = 0.9, minZ = 3 } = {}) {
    const r = mulberry32(seed);
    for (let i = 0; i < n; i++) {
      const t = B.traces[(r() * B.traces.length) | 0], ph = r(), sp = 0.04 + r() * 0.08;
      if (t.pts[0][1] < minZ) continue;
      const tail = t.len * 0.35, s1 = ((ph * (t.len + tail) + f * sp * (1 + t.pts[0][1] * 0.05)) % (t.len + tail));
      K.signal(ctx, cam, t.pts, s1 - tail, Math.min(s1, t.len), { col, w: t.w * 1.6, a: a * (0.5 + r() * 0.5), glowR: 0.6 });
    }
  }

  // ================= SF1: ブリッジの入り(220コマ) =================
  function sf1(ctx, f = 220) {
    const hy = 520, cam = { hy, F: 980, h: 1.15, x: 0, z0: 0.7 };
    nightSky(ctx, hy, { haze: 0.8 });
    boardGround(ctx, hy, "#0b2023", "#010405");
    const B = K.board(11, { n: 2600, chipsN: 120, xr: 42, z0: 0.9, z1: 90, chipZ0: 5 });
    // 盤の艶(もやを映す広い照り)
    if (K.st.fx) { const g = ctx.createRadialGradient(W * 0.42, hy + 60, 20, W * 0.42, hy + 60, 900); g.addColorStop(0, css("#2a6a66", 0.22)); g.addColorStop(1, css("#000", 0)); ctx.save(); ctx.setTransform(1, 0, 0, 0.35, 0, (hy + 60) * 0.65); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 4); ctx.restore(); }
    pylons(ctx, hy, 23, 14, f);
    K.drawBoard(ctx, B, cam, { fogD: 38, windows: 0.22, windowCol: "#bafff0", afterTraces: (c) => ambientSignals(c, B, cam, f, { n: 34, seed: 9, a: 0.85 }) });
    // 文字: 縦書き2列「暗闇の」「数だけ」(右から左)
    const size = 150, LA = K.layout("MIN", "暗闇の", size, { vertical: true, lead: 1.04 }), LB = K.layout("MIN", "数だけ", size, { vertical: true, lead: 1.04 });
    const xA = 1560, xB = 1370, y0 = 150;
    // 字の後ろの下地(読みやすさ。黒い柔らかい影)
    if (true) { const g = ctx.createRadialGradient(1520, 380, 40, 1520, 380, 520); g.addColorStop(0, "rgba(0,0,0,0.72)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(900, -200, 1100, 1200); }
    // 光の道: 手前の盤から、文字の列の下へ走り、列を上る細い光
    const hero = [[-0.9, 0.95], [-0.9, 2.2], [1.0, 4.1], [2.9, 4.1], [3.9, 5.1], [4.6, 6.2]];
    const heroLen = hero.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - hero[i][0], p[1] - hero[i][1]), 0);
    // 道の配線そのもの(消えた銅)
    ctx.save(); ctx.strokeStyle = css(C.verd, 0.9); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = 2.5; ctx.beginPath(); hero.forEach((p, i) => { const q = proj(cam, p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.restore();
    // 光(なぞり終わった所まで全部灯り、尾は長く残る)。道の先から「の」の最後の画へ、細い光が上る
    const tip = proj(cam, 4.6, 6.2);
    K.signal(ctx, cam, hero, 0, heroLen, { col: C.mint, w: 0.03, a: 0.95, glowR: 1.0 });
    const noEnd = [xA + size * 0.62, y0 + size * 2.9];
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = css(C.mint, 0.95); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0], noEnd[1] + 30); ctx.lineTo(noEnd[0], noEnd[1]); ctx.stroke(); ctx.restore();
    if (K.st.fx) { PAINT.glow(ctx, tip[0], tip[1], 90, C.mint, 0.5); }
    // 字ごとの開始(歌の語頭のコマ。lyric_timeline: 暗141 闇160 の192 数215 だけ238)
    const pA = charProg(f, [141, 160, 192], 22), pB = charProg(f, [215, 238, 246], 22);
    litText(ctx, LA, xA, y0, size, pA, { lineW: 3.2 });
    litText(ctx, LB, xB, y0, size, pB, { lineW: 3.2 });
    // 手前のぼけた光(被写界深度。効果ありの時だけ)
    if (K.st.fx) { const br = mulberry32(5); for (let i = 0; i < 6; i++) { const x = br() * W, y = 860 + br() * 220, rr = 40 + br() * 80; const g = ctx.createRadialGradient(x, y, rr * 0.6, x, y, rr); g.addColorStop(0, css(C.mintDeep, 0.05 + br() * 0.05)); g.addColorStop(0.92, css(C.mint, 0.09)); g.addColorStop(1, css(C.mint, 0)); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill(); ctx.restore(); } }
    K.dust(ctx, 31, f, { n: 120, col: "#a6fff0", a: 0.55 });
    K.bloom(ctx, { thr: 0.5, a: 0.85, streak: 0.4, streakCol: "#5ff0d0" });
    K.grade(ctx, f, { ca: 2.0, vig: 0.5, grain: 11, toe: [3, 9, 10], letterbox: 60 });
  }

  // ================= SF2: サビ「火を灯して」の点火(812コマ) =================
  function sf2(ctx, f = 812) {
    // 正面の回路の壁: 中心へ向かう放射の配線(奥へ吸い込まれる)。背景は深い緑黒
    const cx = 1240, cy = 500;
    const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, 1400); bg.addColorStop(0, "#0d3a37"); bg.addColorStop(0.45, "#05181a"); bg.addColorStop(1, "#010304");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.045); ctx.translate(-W / 2, -H / 2);
    // 放射の配線(基板の 45 度の曲がりを持つ、中心へ集まる線)。奥ほど細く暗い
    const r = mulberry32(812), rays = 260;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + r() * 0.02, R0 = 40 + r() * 140, R1 = 1500;
      const bend = (r() - 0.5) * 0.35, mid = R0 + (R1 - R0) * (0.25 + r() * 0.4);
      const P = (rad, ang) => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.82];
      const pts = [P(R0, a), P(mid, a), P(mid + 90, a + bend * 0.25), P(R1, a + bend * 0.25)];
      const lit = r() < 0.38, w = 1 + r() * 3.5;
      const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[3][0], pts[3][1]);
      if (lit) { g.addColorStop(0, css(C.white, 0.0)); g.addColorStop(0.15, css(C.mint, 0.9)); g.addColorStop(1, css(C.mintDeep, 0.25)); }
      else { g.addColorStop(0, css(C.verd, 0.0)); g.addColorStop(0.3, css(C.verd, 0.55)); g.addColorStop(1, css(C.verdDk, 0.7)); }
      ctx.strokeStyle = g; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      if (r() < 0.5) { const v = pts[1]; ctx.fillStyle = css(lit ? C.mint : C.verdHi, 0.8); ctx.beginPath(); ctx.arc(v[0], v[1], w * 1.6, 0, 7); ctx.fill(); }
    }
    // 中心の光(サビ入りの爆発の名残。769 から 43 コマ)
    // 文字の後ろの下地(線を静める暗い面。読みやすさ)
    { const g = ctx.createRadialGradient(660, 470, 60, 660, 470, 640); g.addColorStop(0, "rgba(1,8,8,0.85)"); g.addColorStop(0.6, "rgba(1,8,8,0.55)"); g.addColorStop(1, "rgba(1,8,8,0)"); ctx.save(); ctx.setTransform(1, 0, 0, 0.62, 0, 470 * 0.38); ctx.fillStyle = g; ctx.fillRect(-200, -600, 1900, 2400); ctx.restore(); }
    // 消失点の光(下地の後に描く)
    if (K.st.fx) { PAINT.glow(ctx, cx, cy, 460, C.mint, 0.35); PAINT.glow(ctx, cx, cy, 90, C.white, 0.95); PAINT.glow(ctx, cx, cy, 24, C.white, 1); }
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
    // 色の帯(斜めの朱〜薔薇の光の帯。幅方向にぼかし、縁に細い光の線)
    { ctx.save(); const ang = Math.atan2(470 - 900, W + 200), L = Math.hypot(W + 200, 430);
      ctx.translate(-100, 960); ctx.rotate(ang);
      const gw = ctx.createLinearGradient(0, -80, 0, 80); gw.addColorStop(0, css(C.rose, 0)); gw.addColorStop(0.45, css(C.rose, 0.32)); gw.addColorStop(0.6, css(C.fire, 0.42)); gw.addColorStop(1, css(C.fire, 0));
      ctx.globalCompositeOperation = K.st.fx ? "lighter" : "source-over"; ctx.fillStyle = gw; ctx.fillRect(0, -80, L, 160);
      const gl2 = ctx.createLinearGradient(0, 0, L, 0); gl2.addColorStop(0, css(C.fire, 0)); gl2.addColorStop(0.5, css("#ffb08a", 0.9)); gl2.addColorStop(1, css(C.fire, 0.2));
      ctx.fillStyle = gl2; ctx.fillRect(0, -2, L, 3); ctx.globalAlpha = 0.6; ctx.fillRect(0, 34, L, 1.5); ctx.restore(); }
    // 大きな文字「夜明けの」「回路に」: 面は白〜ミント、中に暗い配線が刻まれ、縁は白、落ち影が壁に落ちる
    const s1 = 150, s2 = 380, L1 = K.layout("MIN", "夜明けの", s1, { track: 0.04 }), L2 = K.layout("MIN", "回路に", s2, { track: -0.02 });
    const o1 = [190, 150], o2 = [150, 330];
    const bigText = (L, o, size, seed) => {
      // 落ち影(右下へ、ぼかし)
      ctx.save(); ctx.translate(size * 0.05, size * 0.07); K.textPath(ctx, L, o[0], o[1], size); ctx.fillStyle = "rgba(0,6,6,0.75)"; if (K.st.fx) ctx.filter = `blur(${size * 0.04}px)`; ctx.fill("nonzero"); ctx.restore();
      // 面
      ctx.save(); K.textPath(ctx, L, o[0], o[1], size);
      const g = ctx.createLinearGradient(0, o[1], 0, o[1] + size); g.addColorStop(0, "#e9fff9"); g.addColorStop(0.45, "#8fefd8"); g.addColorStop(1, "#1f8f7e");
      ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(1,14,13,0.9)"; ctx.lineWidth = Math.max(4, size * 0.03); ctx.stroke();
      ctx.fillStyle = g; ctx.fill("nonzero"); ctx.clip("nonzero");
      // 字の中の配線(刻み)。字の面の上で、45 度で曲がる細い線
      const rr = mulberry32(seed); ctx.lineCap = "square"; ctx.lineJoin = "miter";
      for (let i = 0; i < size * 0.22; i++) {
        let x = o[0] + rr() * L.w, y = o[1] + rr() * size; ctx.beginPath(); ctx.moveTo(x, y);
        let d = (rr() * 4) | 0; const steps = 2 + ((rr() * 4) | 0);
        for (let s = 0; s < steps; s++) { const l = 10 + rr() * size * 0.22; const dv = [[1, 0], [0, 1], [0.7, 0.7], [0.7, -0.7]][d]; x += dv[0] * l; y += dv[1] * l; ctx.lineTo(x, y); d = (d + (rr() < 0.5 ? 1 : 3)) % 4; }
        ctx.strokeStyle = css("#0b4a42", 0.7); ctx.lineWidth = 1.2 + rr() * 2.4; ctx.stroke();
        ctx.fillStyle = css("#0b4a42", 0.75); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
      }
      // 上からの光の帯(面の陰影: 上が明るく、下に影の帯)
      const sh = ctx.createLinearGradient(0, o[1], 0, o[1] + size); sh.addColorStop(0, "rgba(255,255,255,0.25)"); sh.addColorStop(0.5, "rgba(255,255,255,0)"); sh.addColorStop(0.85, "rgba(0,60,55,0.0)"); sh.addColorStop(1, "rgba(0,60,55,0.45)");
      ctx.fillStyle = sh; ctx.fillRect(o[0] - 20, o[1] - 20, L.w + 40, size + 40);
      ctx.restore();
      // 縁の光
      ctx.save(); K.textPath(ctx, L, o[0], o[1], size); ctx.lineJoin = "round"; ctx.strokeStyle = css(C.white, 0.9); ctx.lineWidth = Math.max(1.5, size * 0.006); ctx.stroke(); ctx.restore();
    };
    bigText(L1, o1, s1, 3); bigText(L2, o2, s2, 4);
    // 「火を灯して」縦書き・朱。「火」が今灯る(812=アクセント強さ0.93)。光は字の後ろに置き、字そのものは読める明るさにとどめる
    const s3 = 132, L3 = K.layout("MIN", "火を灯して", s3, { vertical: true, lead: 1.0 }), o3 = [1630, 200];
    const p3 = charProg(f, [806, 812, 818, 824, 830], 6);
    const fx0 = o3[0] + s3 / 2, fy0 = o3[1] + s3 * 0.5;
    // 背後の光は弱め、字のすぐ外側は暗く締める(光で色が抜けるのを防ぐ。前回の弱点)
    if (K.st.fx) { PAINT.glow(ctx, fx0, fy0 - 60, 460, C.fire, 0.34); PAINT.glow(ctx, fx0, fy0 - 90, 150, "#ffb070", 0.22); }
    { const g = ctx.createRadialGradient(fx0, fy0, s3 * 0.3, fx0, fy0, s3 * 0.85); g.addColorStop(0, "rgba(30,4,2,0.55)"); g.addColorStop(1, "rgba(30,4,2,0)"); ctx.fillStyle = g; ctx.fillRect(fx0 - s3, fy0 - s3, s3 * 2, s3 * 2); }
    const er = mulberry32(44);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 80; i++) { const a = -Math.PI / 2 + (er() - 0.5) * 2.4, d = 60 + Math.pow(er(), 0.7) * 420, x = fx0 + Math.cos(a) * d * 0.9, y = fy0 + 40 + Math.sin(a) * d * 0.8, s = 1 + er() * 3.2; ctx.fillStyle = css(er() < 0.5 ? "#ffcf8a" : C.fire, 0.45 + er() * 0.5); ctx.beginPath(); ctx.ellipse(x, y, s, s * 2.6, a + Math.PI / 2, 0, 7); ctx.fill(); }
    ctx.restore();
    L3.items.forEach((it, i) => {
      const one = { items: [it] }, p = p3[i];
      ctx.save(); K.textPath(ctx, one, o3[0], o3[1], s3); ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(20,4,2,0.85)"; ctx.lineWidth = 6; ctx.stroke();
      const g = ctx.createLinearGradient(0, o3[1] + it.y - s3 * 0.9, 0, o3[1] + it.y + s3 * 0.1);
      if (p > 0) { g.addColorStop(0, "#ffe7c4"); g.addColorStop(0.5, "#ff9a58"); g.addColorStop(1, "#e2361e"); }
      else { g.addColorStop(0, "#3a0f0a"); g.addColorStop(1, "#1a0605"); }
      ctx.fillStyle = g; ctx.fill("nonzero");
      ctx.strokeStyle = css(p > 0 ? "#fff0d8" : C.fire, p > 0 ? 0.8 : 0.75); ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    });
    ctx.restore(); // 傾き
    K.dust(ctx, 8, f, { n: 90, col: "#b0fff0", a: 0.5, drift: [0.4, -0.1] });
    K.bloom(ctx, { thr: 0.7, a: 0.6, streak: 0.45, streakCol: "#ffb08a" });
    K.grade(ctx, f, { ca: 3.4, vig: 0.38, grain: 10, toe: [4, 8, 9] });
  }

  // ================= SF3 / SF4: 夜が明ける(1480コマ)と終わりの画(1560コマ) =================
  function dawnScene(ctx, f, { text = "夜が明ける", starts = [1431, 1456, 1462, 1468, 1474], end = false } = {}) {
    const hy = 640, cam = { hy, F: 980, h: 1.15, x: 0.4, z0: 0.7 }, sunX = 1180;
    // 空(上: 群青 → 紫 → 薔薇 → 桃 → 地平の白い金)
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    const D = C.dawn; [0, 0.22, 0.45, 0.68, 0.85, 0.95, 1].forEach((k, i) => g.addColorStop(k, D[i]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy + 2);
    // 太陽(地平に半分)と大きな光
    if (K.st.fx) { PAINT.glow(ctx, sunX, hy, 1000, "#ff8a72", 0.38, { op: "screen" }); PAINT.glow(ctx, sunX, hy, 260, "#ffd9a8", 0.5, { op: "screen" }); }
    // 光の筋(太陽から放射。ごく薄く)
    if (K.st.fx) { const rr = mulberry32(77); ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.filter = "blur(6px)"; for (let i = 0; i < 13; i++) { const a = Math.PI + 0.2 + rr() * (Math.PI - 0.4), wd = 0.004 + rr() * 0.016, L = 700 + rr() * 800; const g = ctx.createRadialGradient(sunX, hy, 60, sunX, hy, L); g.addColorStop(0, css("#ffe2b8", 0.1 + rr() * 0.1)); g.addColorStop(1, css("#ffe2b8", 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sunX, hy); ctx.arc(sunX, hy, L, a - wd, a + wd); ctx.closePath(); ctx.fill(); } ctx.restore(); }
    ctx.fillStyle = "#fff8ec"; ctx.beginPath(); ctx.arc(sunX, hy + 14, 66, Math.PI, 0); ctx.fill();
    if (K.st.fx) PAINT.glow(ctx, sunX, hy, 110, "#fff4dc", 0.7, { op: "screen" });
    // 薄い雲の帯(横に長い、太陽側が明るい)
    const cr = mulberry32(3);
    for (let i = 0; i < 14; i++) {
      const y = 120 + cr() * (hy - 220), x = cr() * W, w = 300 + cr() * 900, h = 6 + cr() * 18, k = 1 - Math.abs(x - sunX) / W;
      const cc = mix("#4a2660", "#ffc0a0", clamp(y / hy * 0.8 + k * 0.3)), gcl = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
      gcl.addColorStop(0, css(cc, 0.25)); gcl.addColorStop(1, css(mix(cc, "#ffe8c8", 0.5 * k), 0.6));
      ctx.fillStyle = gcl; ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, 7); ctx.fill();
    }
    // 盤: 空を映す(上ほど明るい桃、手前は暗い紫)
    const gg = ctx.createLinearGradient(0, hy, 0, H); gg.addColorStop(0, "#f2a08c"); gg.addColorStop(0.12, "#9a4f74"); gg.addColorStop(0.5, "#3a1f40"); gg.addColorStop(1, "#140a1a");
    ctx.fillStyle = gg; ctx.fillRect(0, hy, W, H - hy);
    const B = K.board(11, { n: 2600, chipsN: 120, xr: 42, z0: 0.9, z1: 90, chipZ0: 5 });
    // チップの長い影(太陽を背に、手前へ伸びる)
    ctx.save(); ctx.fillStyle = "rgba(25,8,28,0.45)";
    const sxAt0 = (Z) => (sunX - W / 2) * Z / cam.F + cam.x;
    for (const c of B.chips) { if (c.Z < 1.4 || Math.abs(c.X - sxAt0(c.Z)) <= 0.9 + c.w / 2 + 0.04 * c.Z) continue; const sx = (sunX - W / 2) * c.Z / cam.F + cam.x; const dir = (c.X - sx) * 0.08, Lz = c.h * 5.5; const P = (x, z) => proj(cam, x, z); const a = P(c.X - c.w / 2, c.Z - c.d / 2), b = P(c.X + c.w / 2, c.Z - c.d / 2), d2 = P(c.X + c.w / 2 + dir * Lz, c.Z - c.d / 2 - Lz), e = P(c.X - c.w / 2 + dir * Lz, c.Z - c.d / 2 - Lz); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d2[0], d2[1]); ctx.lineTo(e[0], e[1]); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // 太陽の照り返し(盤の上の光の道。横はやわらかく、手前ほど広く薄い)
    if (K.st.fx) {
      const [c2, g2] = PAINT.buf("refl", W, H - hy);
      const rg = g2.createLinearGradient(0, 0, 0, H - hy); rg.addColorStop(0, css("#fff0d8", 0.85)); rg.addColorStop(0.35, css("#ffb48a", 0.3)); rg.addColorStop(1, css("#ff8a7a", 0.0));
      g2.fillStyle = rg; g2.beginPath(); g2.moveTo(sunX - 50, 0); g2.lineTo(sunX + 50, 0); g2.lineTo(sunX + 380, H - hy); g2.lineTo(sunX - 380, H - hy); g2.closePath(); g2.fill();
      ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.filter = "blur(30px)"; ctx.drawImage(c2, 0, hy); ctx.restore();
    }
    // 配線を走る光(全部太陽へ向かう)。チップより前に描く(奥行きの順)
    const sxAt = (Z) => (sunX - W / 2) * Z / cam.F + cam.x, lane = (c) => Math.abs(c.X - sxAt(c.Z)) > 0.9 + c.w / 2 + 0.04 * c.Z;
    const sunSignals = (ctx) => {
      // 太陽への通り道の配線が照り返しで光る(暖色の艶)
      ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.lineCap = "round";
      for (const t of B.traces) { const Z = t.pts[0][1]; if (Z < cam.z0) continue; const d = Math.abs(t.pts[0][0] - sxAt(Z)); const k = Math.exp(-Math.pow(d / (0.6 + 0.06 * Z), 2)); if (k < 0.05) continue;
        ctx.strokeStyle = css("#ffd9b0", 0.85 * k); ctx.lineWidth = Math.max(0.8, (t.w * cam.F) / Z); ctx.beginPath(); t.pts.forEach((p, i) => { const q = proj(cam, p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); }
      ctx.restore();
    const r = mulberry32(21);
    for (let i = 0; i < 26; i++) {
      const Z0 = 1.0 + Math.pow(r(), 1.5) * 10, X0 = sxAt(Z0) + (r() - 0.5) * (1.6 + Z0 * 0.15), Zs = 60, sx = sxAt(Zs);
      const pts = [[X0, Z0], [X0, Z0 + 1.2 + r() * 2], [lerp(X0, sx, 0.3), Z0 + 6 + r() * 4], [sx, Zs]];
      const len = pts.slice(1).reduce((s, p, k) => s + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0), ph = r();
      const s1 = (ph * len + f * 0.25) % len;
      K.signal(ctx, cam, pts, s1 - 2.6, s1, { col: "#ffe6c0", head: "#ffffff", w: 0.022, a: 0.95, glowR: 0.5 });
    }
    };
    K.drawBoard(ctx, B, cam, { chipFog: 0.6, fogCol: "#f0a08a", fogD: 30, wire: "#45213f", wireHi: "#ffb894", chipTop: "#2c1532", chipSide: "#170a1c", dawn: 1, windows: 0, afterTraces: sunSignals, chipFilter: lane });
    // 文字(濃い紫の明朝。明るい空の上で、なぞった光の名残の金の縁)
    if (!end) {
      const size = 168, L = K.layout("MIN", text, size, { track: 0.07 }), ox = (W - L.w) / 2, oy = 250;
      const pr = charProg(f, starts, 10);
      if (K.st.fx) { const hg = ctx.createRadialGradient(W / 2, oy + size / 2, 50, W / 2, oy + size / 2, 700); hg.addColorStop(0, "rgba(255,240,220,0.35)"); hg.addColorStop(1, "rgba(255,240,220,0)"); ctx.fillStyle = hg; ctx.fillRect(0, 0, W, hy); }
      L.items.forEach((it, i) => {
        const one = { items: [it] }, p = pr[i];
        ctx.save(); K.textPath(ctx, one, ox, oy, size); ctx.fillStyle = css(C.plum, 0.15 + 0.85 * smooth(p)); ctx.fill("nonzero"); ctx.restore();
        if (p > 0 && p < 1) K.traceText(ctx, one, ox, oy, size, p, { col: "#fff3dc", w: 3 });
        if (p >= 1) { ctx.save(); K.textPath(ctx, one, ox, oy, size); ctx.clip("nonzero"); const gg2 = ctx.createLinearGradient(0, oy, 0, oy + size); gg2.addColorStop(0, "rgba(255,190,150,0.0)"); gg2.addColorStop(1, "rgba(255,150,130,0.35)"); ctx.fillStyle = gg2; ctx.fillRect(ox + it.x, oy, size, size * 1.1); ctx.restore(); }
      });
    } else {
      const s1 = 112, L1 = K.layout("MIN", "夜明けの回路", s1, { track: 0.16 }), ox = (W - L1.w) / 2, oy = 300;
      ctx.save(); K.textPath(ctx, L1, ox, oy, s1); ctx.fillStyle = C.plum; ctx.fill("nonzero"); ctx.restore();
      // 文字の下に1本の光の線(なぞった回路の名残: 横線が太陽へ)
      ctx.save(); ctx.strokeStyle = css("#fff3dc", 0.95); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox, oy + s1 * 1.32); ctx.lineTo(ox + L1.w * 0.62, oy + s1 * 1.32); ctx.lineTo(ox + L1.w * 0.62 + 30, oy + s1 * 1.32 + 30); ctx.lineTo(ox + L1.w, oy + s1 * 1.32 + 30); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.font = "700 34px KAKU"; ctx.fillStyle = css(C.plum, 0.85); ctx.textAlign = "center"; ctx.letterSpacing = "14px"; ctx.fillText("YOAKE NO KAIRO", W / 2 + 7, oy + s1 * 1.32 + 90); ctx.restore();
    }
    // レンズのフレア(太陽から画面の中心を通る線上に、薄い輪を3つ)
    if (K.st.fx) { [[0.45, 60, 0.10], [0.9, 26, 0.16], [1.35, 110, 0.07]].forEach(([k2, rad, al]) => { const x = sunX + (W / 2 - sunX) * k2 * 2, y = hy + (H / 2 - hy) * k2 * 2; const g = ctx.createRadialGradient(x, y, rad * 0.7, x, y, rad); g.addColorStop(0, css("#ffd0b0", al * 0.4)); g.addColorStop(0.85, css("#ffe6c8", al)); g.addColorStop(1, css("#ffe6c8", 0)); ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); ctx.restore(); }); }
    K.dust(ctx, 12, f, { n: 70, col: "#fff0d8", a: 0.45, drift: [0.1, -0.2] });
    K.bloom(ctx, { thr: 0.8, a: 0.4, streak: 0.3, streakCol: "#ffd0a0" });
    K.grade(ctx, f, { ca: 1.4, vig: 0.32, grain: 9, toe: [10, 6, 12], shoulder: 0.94 });
  }
  const sf3 = (ctx, f = 1490) => dawnScene(ctx, f);
  const sf4 = (ctx, f = 1560) => dawnScene(ctx, f, { end: true });
  return { 1: sf1, 2: sf2, 3: sf3, 4: sf4, defaultFrame: { 1: 220, 2: 812, 3: 1490, 4: 1560 } };
})();
