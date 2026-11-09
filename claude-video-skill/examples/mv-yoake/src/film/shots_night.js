// S1〜S5(夜): 回路の街 → 字をなぞる光 → 上昇 → 真上 → 吸い込まれる溜め。
// S1→S2→S3 は1本のカメラ(切らない): ドリーイン #027 → 横へのパン(視差 #016)→ クレーンアップ #031。S4→S5 も1本: 真上 #181 → 引き(予備動作 #121)。
// 時刻: 歌詞は lyric_timeline.json(Y.word / Y.phrase / Y.charStarts)、曲のアクセントは cues.json(Y.acc)から。
(() => {
  const { clamp, lerp, P, eIO, eIOs, eOut, eOut5, eIn, smooth, spring, keys, hash, rng, pj, cam3, css, mix, word, phrase, wordOr, charStarts, acc, K, W, H } = Y;
  const C = K.C, B = FILM.B, LB = 60; // 黒帯(2.0:1)
  const CT = () => CITY.get(11);

  // ================= S1〜S3: 低い視点 → 上昇 =================
  const A = { first: acc(10), hook: acc(38), win: [acc(57), acc(85), acc(113)], fall: acc(189), unravel: acc(274), horizon: acc(283), wave: acc(350) };
  const craneEnd = B.S4; // 上昇はクレーンの終わり=真上のカットまで
  function camNight(f) {
    const z = keys(f, [[0, -4.5], [A.unravel, 2.6, eIO], [craneEnd, 4.6, eIOs]]);
    const x = keys(f, [[0, -0.7], [B.S2, -0.55], [A.unravel, 1.5, eIO], [craneEnd, 2.2]]);
    const up = eIO(P(f, A.unravel, craneEnd)); // #031 クレーンアップ: 高さ 1.4→9 m(ここでは 1.15→12)、前へ 0→1.5 m、cubic in-out
    const y = lerp(1.15, 12, up);
    const pitch = -0.86 * Math.atan2(y - 1.0, 9 + up * 1.5) + 0.86 * Math.atan2(0.15, 9);
    const yaw = keys(f, [[0, 0.05], [B.S2, 0.03], [A.unravel, -0.04, eIO], [craneEnd, -0.06]]);
    return cam3({ x, y, z, yaw, pitch, f: 980, cx: W / 2, cy: 520 - up * 40 });
  }
  // 街区ごとの窓の灯り(0..1)。57/85/113 で 左/中/右 の街区が点く(そのコマで 6 割、8 コマで残り)
  const jump = (f, a, d = 8) => (f < a ? 0 : 0.6 + 0.4 * eOut(P(f, a, a + d)));
  function litNight(ch, f) {
    const side = ch.X < -5 ? 0 : ch.X < 6 ? 1 : 2;
    let v = 0.05 + 0.04 * hash(ch.seed, 1) + 0.55 * jump(f, A.win[side]);
    if (ch.Z > 55) v += 0.25 * jump(f, A.horizon + Math.round(clamp((Math.abs(ch.X) - 0) / 40) * 0), 6);
    v += 0.12 * smooth(P(f, B.S3, A.wave)) + 0.3 * jump(f, A.wave + Math.round(clamp(Math.hypot(ch.X - 2, ch.Z - 30) / 60) * 6), 6);
    return v * (0.75 + 0.25 * ch.wr);
  }
  // 冒頭の信号: 10 で奥(Z=62)に灯り、38 でカメラの真下を走り抜ける(大通りの中央の配線の上)
  function hookSignal(ctx, c, f) {
    const z0 = 62, cz = camNight(A.hook).z + 0.4;
    if (f < A.first - 1) return;
    // 灯った点(10 で頂点、30 コマで落ち着く)
    const q = pj(c, 0.3, 0.02, z0);
    if (q[2] > 0.3) { const k = f < A.first ? 0.3 : Math.exp(-(f - A.first) / 14); Y.glow(ctx, q[0], q[1], 60 + 160 * k, C.mint, 0.35 + 0.6 * k); Y.glow(ctx, q[0], q[1], 14 + 20 * k, C.white, 0.9); }
    if (f < A.first || f > A.hook + 14) return;
    // 頭の位置: 加速しながら手前へ(eIn)。38 でカメラの面を越える
    const zh = f <= A.hook ? lerp(z0, cz, eIn(P(f, A.first, A.hook))) : cz - (f - A.hook) * 2.2;
    const tail = 4 + 30 * P(f, A.first, A.hook);
    const pts = []; for (let i = 0; i <= 24; i++) { const z = Math.max(zh, zh + (tail * i) / 24); pts.push(pj(c, 0.3, 0.01, z)); }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    for (let i = 1; i < pts.length; i++) { if (pts[i][2] < 0.3 || pts[i - 1][2] < 0.3) continue; const u = 1 - i / 24, w = clamp((0.05 * c.f) / pts[i][2], 1, 30); ctx.strokeStyle = css(i < 3 ? C.white : C.mint, 0.25 + 0.75 * u); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
    ctx.restore();
    const h0 = pts.find((p) => p[2] > 0.3); if (h0) Y.glow(ctx, h0[0], Math.min(h0[1], H + 40), 50 + 260 * P(f, A.hook - 8, A.hook), C.mint, 0.8);
    // 38: 画面の下で光がはじける(局所。横に長い光の筋)
    const k = f < A.hook ? 0 : Math.exp(-(f - A.hook) / 5);
    if (k > 0.01) { Y.glow(ctx, W / 2 + 40, H - 40, 520 * k + 120, C.mint, 0.75 * k); ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, css(C.mint, 0)); g.addColorStop(0.5, css(C.white, 0.85 * k)); g.addColorStop(1, css(C.mint, 0)); ctx.fillStyle = g; ctx.fillRect(0, H - 120, W, 4 + 6 * k); ctx.restore(); }
  }
  // 大通りの中央の配線は、信号が通った後しばらく灯る
  const avenueLit = (f) => (f < A.hook ? 0 : 0.85 * Math.exp(-(f - A.hook) / 40) + 0.2 * smooth(P(f, A.win[2], B.S3)));

  // ---- 文字(S2): 縦書き2列。字ごとに歌の語頭のコマでなぞり始める ----
  const SZ = 150, colA = { x: 1560, y: 150, s: "暗闇の" }, colB = { x: 1370, y: 150, s: "数だけ" };
  const PH1 = "暗闇の数だけ";
  const lay = () => Y.once("s2lay", () => ({ A: Y.layout("MIN", colA.s, SZ, { vertical: true, lead: 1.04 }), B: Y.layout("MIN", colB.s, SZ, { vertical: true, lead: 1.04 }) }));
  const starts1 = () => charStarts(PH1); // 暗 闇 の 数 だ け
  function s2text(ctx, f) {
    const L = lay(), st = starts1(), TR = 14;
    const gone = smooth(P(f, A.unravel, A.unravel + 14)); // 274 から光の粒にほどける
    const alpha = 1 - gone; if (alpha <= 0.002) { for (let i = 0; i < 6; i++) TYPE.mark(PH1, i, 0); return; }
    // 予告(刻まれた薄い輪郭)は列の最初の字の 8 コマ前から
    const preA = smooth(P(f, st[0] - 8, st[0])), preB = smooth(P(f, st[3] - 10, st[3]));
    // 189: なぞり終えた「暗闇」が光り、粒が落ちる
    const pulse = f >= A.fall ? Math.exp(-(f - A.fall) / 7) : 0;
    const pr = st.map((s) => clamp((f - s) / TR));
    // 字の後ろの下地(読みやすさ)。柔らかい暗がり
    { const g = ctx.createRadialGradient(1490, 400, 40, 1490, 400, 560); g.addColorStop(0, `rgba(0,3,4,${0.6 * alpha * Math.max(preA, preB)})`); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(900, 0, 1020, 1080); }
    // 光の柱: 列の左に沿って地面から上る(字が始まる 10 コマ前から伸びて、なぞる字の高さへ)
    for (const [col, i0, x] of [[colA, 0, colA.x - 22], [colB, 3, colB.x - 22]]) {
      const s0 = st[i0], grow = eOut(P(f, s0 - 10, s0)); if (grow <= 0) continue;
      const cur = Math.max(0, Math.min(2, st.slice(i0, i0 + 3).filter((s) => f >= s).length - 1));
      const yTop = col.y + cur * SZ * 1.04 + 10, yb = 900, yt = lerp(yb, yTop, grow);
      ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = "lighter"; const g = ctx.createLinearGradient(0, yt, 0, yb); g.addColorStop(0, css(C.white, 0.95)); g.addColorStop(0.15, css(C.mint, 0.8)); g.addColorStop(1, css(C.mint, 0.15));
      ctx.fillStyle = g; ctx.fillRect(x - 1.5, yt, 3, yb - yt); if (K.st.fx) { ctx.filter = "blur(8px)"; ctx.fillStyle = css(C.mint, 0.25); ctx.fillRect(x - 10, yt, 20, yb - yt); } ctx.restore();
      Y.glow(ctx, x, yt, 40, C.mint, 0.8 * alpha); Y.glow(ctx, x, yb, 70, C.mint, 0.45 * alpha * grow);
      // 根元の輪(地面に落ちた光の環)
      ctx.save(); ctx.globalAlpha = alpha * 0.6 * grow; ctx.strokeStyle = C.mint; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, yb, 46, 9, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    const pA = pr.slice(0, 3).map((p, i) => (preA > 0 ? p : 0)), pB = pr.slice(3);
    ctx.save(); ctx.globalAlpha = 1;
    TYPE.traced(ctx, L.A, colA.x, colA.y, SZ, pA, { ph: PH1, lineW: 3.2, alpha: alpha * preA, glowA: 0.5 + 0.4 * pulse });
    // 2列目は句の 4 字目から(mark の番号を合わせる)
    TYPE.traced(ctx, { items: L.B.items }, colB.x, colB.y, SZ, pB, { ph: "_B", lineW: 3.2, alpha: alpha * preB });
    ctx.restore();
    for (let i = 0; i < 3; i++) TYPE.mark(PH1, 3 + i, alpha * preB * (pB[i] > 0 ? 0.5 + 0.5 * smooth(pB[i]) : 0.12));
    if (pulse > 0.01) for (let i = 0; i < 2; i++) { const b = Y.charBox(L.A, i, colA.x, colA.y, SZ); Y.glow(ctx, b.cx, b.cy, 140, C.mint, 0.5 * pulse * alpha); }
  }
  // 189: 「暗闇」の輪郭から光の粒が落ちる(#015 パーティクル: 重力 470 px/s²、寿命 1.5 秒、後半 30% で消える)
  function fallParticles(ctx, f) {
    const t = (f - A.fall) / 30; if (t < 0 || t > 1.6) return;
    const pts = Y.once("s2pts", () => TYPE.samplePts({ items: lay().A.items.slice(0, 2) }, colA.x, colA.y, SZ, 9)), r = rng(189);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i], vx = (r() - 0.5) * 120, vy = -40 - r() * 160, life = 0.9 + r() * 0.6, tt = t - r() * 0.12; if (tt < 0 || tt > life) continue;
      const x = p[0] + vx * tt, y = Math.min(905, p[1] + vy * tt + 0.5 * 470 * 1.8 * tt * tt), a = (tt < 0.06 ? tt / 0.06 : 1) * (tt > life * 0.7 ? 1 - (tt - life * 0.7) / (life * 0.3) : 1);
      ctx.fillStyle = css(r() < 0.3 ? C.white : C.mint, a * 0.9); ctx.beginPath(); ctx.arc(x, y, 1.6 + r() * 1.8, 0, 7); ctx.fill();
      if (y >= 904) Y.glow(ctx, x, y, 24, C.mint, 0.3 * a);
    }
    ctx.restore();
  }
  // 274: 字が光の粒にほどけて上へ(カメラが上がるので、粒は画面の上へ流れる)
  function unravelParticles(ctx, f) {
    const t = (f - A.unravel) / 30; if (t < 0 || t > 1.4) return;
    const pts = Y.once("s2all", () => TYPE.samplePts({ items: [...lay().A.items] }, colA.x, colA.y, SZ, 7).concat(TYPE.samplePts({ items: [...lay().B.items] }, colB.x, colB.y, SZ, 7))), r = rng(274);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const p of pts) {
      const d = r() * 0.25, tt = t - d, life = 0.7 + r() * 0.6; if (tt < 0 || tt > life) continue;
      const x = p[0] + (r() - 0.5) * 90 * tt - 40 * tt * tt, y = p[1] - (60 + r() * 220) * tt * tt * 1.6, a = 1 - tt / life;
      ctx.fillStyle = css(r() < 0.25 ? C.white : C.mint, a); ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
    }
    ctx.restore();
  }

  // ---- 文字(S3): 空に横書き「輝きは増す」。字ごとに点く(1 字 4 コマ、語頭の 2 コマ前から)----
  const PH2 = "輝きは増す", SZ3 = 168;
  function s3text(ctx, f) {
    const L = Y.once("s3lay", () => Y.layout("MIN", PH2, SZ3, { track: 0.06 })), st = charStarts(PH2, { step: 3 });
    const ox = (W - L.w) / 2, oy = 120, out = smooth(P(f, B.S4 - 10, B.S4 - 1));
    const al = st.map((s) => TYPE.fadeIn(f, s - 2, 4) * (1 - out)), bl = st.map((s, i) => 10 * (1 - TYPE.fadeIn(f, s - 2, 5)) + 8 * out);
    if (Math.max(...al) <= 0) { for (let i = 0; i < 5; i++) TYPE.mark(PH2, i, 0); return; }
    { const g = ctx.createRadialGradient(W / 2, oy + SZ3 * 0.5, 30, W / 2, oy + SZ3 * 0.5, 620); g.addColorStop(0, `rgba(0,4,5,${0.7 * Math.max(...al)})`); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.save(); ctx.setTransform(1, 0, 0, 0.45, 0, (oy + SZ3 * 0.5) * 0.55); ctx.fillStyle = g; ctx.fillRect(0, -400, W, 2000); ctx.restore(); }
    // 350: 光の波が字にも来る(字の縁が一瞬明るく)
    const wv = f >= A.wave ? Math.exp(-(f - A.wave) / 8) : 0;
    TYPE.glass(ctx, L, ox, oy, SZ3, al, { ph: PH2, blurs: bl, rim: mix(C.mint, C.white, 0.3 * wv), glowA: 0.5 + 0.4 * wv, faceTop: "#1c5c55", faceBot: "#02100e" });
  }

  function drawNight(g, f) {
    const c = camNight(f), CTy = CT();
    const hy = Y.horizonY(c);
    CITY.sky(g, c, ["#010203", "#020607", "#03090b", "#0a2024", "#123236"], { stars: 1, f, haze: { col: "#1d5a56", a: 0.32, h: 300 } });
    CITY.ground(g, c, "#0b2023", "#010405");
    // 盤の艶(地平のもやを映す)
    if (K.st.fx) { const gx = W * 0.5 - c.yaw * 900, g2 = g.createRadialGradient(gx, hy + 50, 20, gx, hy + 50, 900); g2.addColorStop(0, css("#2a6a66", 0.25)); g2.addColorStop(1, css("#000", 0)); g.save(); g.setTransform(1, 0, 0, 0.35, 0, (hy + 50) * 0.65); g.globalCompositeOperation = "lighter"; g.fillStyle = g2; g.fillRect(0, 0, W, H * 4); g.restore(); }
    const pyl = 0.5 + 0.5 * jump(f, A.win[2], 12);
    CITY.pylons(g, c, CTy, f, { a: pyl, grow: 0.55 + 0.45 * jump(f, A.win[2], 14) });
    const nSig = 26 + Math.round(30 * smooth(P(f, A.win[0], B.S3))) + (f >= A.wave ? 60 : 0) + Math.round(20 * smooth(P(f, B.S3, A.wave)));
    const litT = 0.02 + 0.06 * smooth(P(f, A.win[0], B.S3)) + 0.06 * smooth(P(f, B.S3, A.wave)) + (f >= A.wave ? 0.12 * jump(f, A.wave, 6) : 0);
    const av = avenueLit(f);
    CITY.traces(g, c, CTy, { fogD: 40, maxD: 150, litTraces: litT, litFn: (t) => (t.kind === "avenue" ? av > 0.05 && t.r < 0.6 : t.kind === "bus" && t.r < litT), litA: 0.75 });
    CITY.signals(g, c, CTy, f, { n: nSig, seed: 9, sp: 0.11, maxD: 90 });
    hookSignal(g, c, f);
    CITY.chips(g, c, CTy, f, { fogD: 38, maxD: 150, lit: litNight, winCol: "#bafff0", rimA: 0.5 });
    // 283: 地平の街区の波 ①(地平線に沿った光の帯が一瞬明るく。局所)
    { const k = f >= A.horizon ? Math.exp(-(f - A.horizon) / 9) : 0; if (k > 0.01 && hy > 0) { g.save(); g.globalCompositeOperation = "lighter"; const gg = g.createLinearGradient(0, hy - 60, 0, hy + 30); gg.addColorStop(0, css(C.mint, 0)); gg.addColorStop(0.7, css(C.mint, 0.35 * k)); gg.addColorStop(1, css(C.mint, 0)); g.fillStyle = gg; g.fillRect(0, hy - 60, W, 90); g.restore(); } }
    // 350: 灯りが一気に増える波(画面中央から広がる光の環。局所)
    { const k = f >= A.wave ? 1 - P(f, A.wave, A.wave + 18) : 0; if (k > 0) { const R = 1.5 + 70 * eOut5(P(f, A.wave, A.wave + 18)), path = new Path2D(); let prev = null;
      for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2, pt = [2 + Math.cos(a) * R, 30 + Math.sin(a) * R]; if (prev) CITY.segTo(path, c, prev, pt); prev = pt; }
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round"; g.strokeStyle = css(C.mint, 0.25 * k); g.lineWidth = 10; g.stroke(path); g.strokeStyle = css(C.white, 0.7 * k); g.lineWidth = 1.6; g.stroke(path); g.restore();
      const q = pj(c, 2, 0, 30); if (q[2] > 0.3) Y.glow(g, q[0], q[1], 380, C.mint, 0.4 * k * k); } }
    // 手前のぼけ玉(被写界深度)
    if (K.st.fx) { const br = rng(5); for (let i = 0; i < 7; i++) { const x = br() * W, y = 820 + br() * 260 + (c.y - 1.15) * 60, rr = 40 + br() * 90; const gg = g.createRadialGradient(x, y, rr * 0.6, x, y, rr); gg.addColorStop(0, css(C.mintDeep, 0.04 + br() * 0.05)); gg.addColorStop(0.92, css(C.mint, 0.08)); gg.addColorStop(1, css(C.mint, 0)); g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = gg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.restore(); } }
    if (f >= B.S2 - 12 && f < B.S3 + 6) { s2text(g, f); fallParticles(g, f); unravelParticles(g, f); }
    else for (let i = 0; i < 6; i++) TYPE.mark(PH1, i, 0);
    if (f >= B.S3 - 6) s3text(g, f); else for (let i = 0; i < 5; i++) TYPE.mark(PH2, i, 0);
    K.dust(g, 31, f, { n: 110, col: "#a6fff0", a: 0.5, drift: [0.12, -0.3 - (c.y - 1.15) * 0.08] });
    return { bloom: { thr: 0.5, a: 0.85, streak: 0.4 }, grade: { ca: 2.0, vig: 0.5, grain: 11, toe: [3, 9, 10] }, letterbox: LB };
  }
  // ================= S4〜S5: 真上(#181)→ 引き → 吸い込み(#121 予備動作) =================
  const PH3 = "ひとつ、またひとつ", PH4 = "繋がってく", PH5 = "夜明けの回路に";
  const nodeA = [0.6, 26.4], nodeB = [6.6, 28.4], X0 = 3.2, Z0 = 27;
  const T4 = () => Y.once("t4", () => ({ a: phrase(PH3).start, b: wordOr(PH3, "またひとつ", 0.42), burstA: acc(425), burstB: acc(500), link: phrase(PH4).start, yo: word("夜明けの"), crack: acc(755), hit: acc(769) }));
  function camPlan(f) {
    const t = T4();
    let h = keys(f, [[B.S4, 9.5], [B.S5, 12.5, eIOs]]);
    if (f > B.S5) h = f <= t.yo ? lerp(12.5, 21, eIOs(P(f, B.S5, t.yo))) : lerp(21, 95, eIn(P(f, t.yo, t.hit - 1))); // 伸ばしでゆっくり遠ざかり、弱起から一気に引く(はじける前の溜め)
    const roll = keys(f, [[B.S4, -0.04], [B.S5, 0.16, eIOs], [t.yo, 0.26, eIOs], [t.hit - 1, 0.95, eIn]]);
    return cam3({ x: X0, y: h, z: Z0, pitch: -Math.PI / 2 + 0.03, roll, f: 980, cx: W / 2, cy: H / 2 });
  }
  const sc = (c) => c.f / (c.y - 0.0); // 地面での 1 m あたりの px
  // 地面に置いた物を画面に描くための変換(真上なので、平行移動・回転・拡大だけ)
  function onBoard(g, c, X, Z, fn) { const q = pj(c, X, 0, Z); g.save(); g.translate(q[0], q[1]); g.rotate(c.roll); fn(g, sc(c)); g.restore(); }
  // #003 バースト(数値は Motion Prompt のまま: 輪 44→90・線幅 16→0 を 0.6 秒 quintic out、放射線 10 本、点 10 個)を S 倍
  function burst(g, x, y, dt, S, cols = [C.mint, C.white], dotCols = [C.mint, "#9fe8ff"]) {
    if (dt < 0 || dt > 0.8) return;
    const q = eOut5(clamp(dt / 0.6));
    g.save(); g.translate(x, y); g.lineCap = "round"; g.globalCompositeOperation = "lighter";
    if (dt < 0.6) { g.strokeStyle = css(C.mint, 0.3 * (1 - q)); g.lineWidth = 40 * S * (1 - q); g.beginPath(); g.arc(0, 0, (44 + 46 * q) * S, 0, 7); g.stroke(); g.strokeStyle = css(C.white, 0.95); g.lineWidth = 16 * S * (1 - q) * 0.6; g.stroke(); }
    const len = 36 * S * (1 - P(dt, 0.22, 0.7)), ro = (64 + 66 * eOut5(clamp(dt / 0.7))) * S;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.31;
      if (len > 0.5) { const lg = g.createLinearGradient(Math.cos(a) * (ro - len), Math.sin(a) * (ro - len) * 0.82, Math.cos(a) * ro, Math.sin(a) * ro * 0.82); lg.addColorStop(0, css(cols[i % 2], 0)); lg.addColorStop(1, css(cols[i % 2], 0.9)); g.strokeStyle = lg; g.lineWidth = 9 * S * 0.32; g.beginPath(); g.moveTo(Math.cos(a) * (ro - len), Math.sin(a) * (ro - len) * 0.82); g.lineTo(Math.cos(a) * ro, Math.sin(a) * ro * 0.82); g.stroke(); }
      const da = 1 - P(dt, 0.3, 0.72), dr = (58 + 92 * eOut5(clamp(dt / 0.72))) * S, b = a + Math.PI / 10;
      if (da > 0) { g.globalAlpha = da; g.fillStyle = dotCols[i % 2]; g.beginPath(); g.arc(Math.cos(b) * dr * 1.45 * 0.7, Math.sin(b) * dr * 0.78, lerp(8, 4.8, q) * S * 0.6, 0, 7); g.fill(); g.globalAlpha = 1; }
    }
    g.restore();
  }
  // 点(ノード)。出る時はばね 1 − e^(−6.5t)·cos(16t)(#003 の点火と同じ式)
  function node(g, c, P0, t0, tb, f) {
    if (f < t0 - 6) return;
    const q = pj(c, P0[0], 0, P0[1]), s = sc(c) / 100;
    const ant = f < t0 ? 1 - 0.3 * eIOs(P(f, t0 - 6, t0)) : 0.7 + 0.3 * (1 - Math.exp(-6.5 * ((f - t0) / 30)) * Math.cos(16 * ((f - t0) / 30)));
    const flash = f >= tb ? Math.exp(-(f - tb) / 6) : 0, R = 16 * s * ant * (1 + 0.6 * flash);
    Y.glow(g, q[0], q[1], R * 9, C.mint, 0.5 + 0.4 * flash); g.save(); g.globalCompositeOperation = "lighter";
    g.strokeStyle = css(C.mint, 0.95); g.lineWidth = 3 * s; g.beginPath(); g.arc(q[0], q[1], R * 1.6, 0, 7); g.stroke();
    g.fillStyle = C.white; g.beginPath(); g.arc(q[0], q[1], R * 0.7, 0, 7); g.fill(); g.restore();
    burst(g, q[0], q[1], (f - tb) / 30, 1.9 * s * 1.3);
  }
  // 「ひとつ、またひとつ」: 盤に刷られた白い文字(シルク印刷)。字ごとに点く。完成した行に光が斜めに通る(#022 ライトスイープ)
  function s4ink(g, c, f) {
    const t = T4(), size = 1.12, s = sc(c), px = size * s;
    const L = Y.layout("MIN", PH3, px, { track: 0.04 });
    const st = [...PH3].map((ch, i) => (i < 4 ? t.a - 2 + i * 3 : t.b - 14 + (i - 4) * 3));
    const out = smooth(P(f, t.link - 12, t.link - 2));
    const al = st.map((x) => TYPE.fadeIn(f, x, 4) * (1 - out)), bl = st.map((x) => 6 * (1 - TYPE.fadeIn(f, x, 5)) + 6 * out);
    onBoard(g, c, X0 - (L.w / s) / 2, Z0 - 2.3, (g2) => {
      // 下地(盤を少し暗く)
      const gg = g2.createRadialGradient(L.w / 2, px * 0.5, 20, L.w / 2, px * 0.5, L.w * 0.65); gg.addColorStop(0, `rgba(0,4,4,${0.6 * Math.max(...al)})`); gg.addColorStop(1, "rgba(0,0,0,0)"); g2.save(); g2.scale(1, 0.4); g2.fillStyle = gg; g2.fillRect(-200, -800, L.w + 400, 2400); g2.restore();
      TYPE.glass(g2, L, 0, 0, px, al, { ph: PH3, blurs: bl, faceTop: "#e9fff8", faceBot: "#8fd9c8", rim: C.mint, glowA: 0.45, inner: 0, shadow: 0.7 });
      // #022 ライトスイープ: 幅 116 px の白い帯(中央 0.72)+ 78 px 離れた 12 px の帯(0.5)、24 度、0.45〜1.5 秒 quadratic in-out
      const sw = P(f, t.burstB - 34, t.burstB - 2); if (sw > 0 && sw < 1 && K.st.fx) {
        g2.save(); Y.K.textPath(g2, L, 0, 0, px); g2.clip("nonzero"); const k = px / 140, x = lerp(-130 * k, L.w + 130 * k, eIOs(sw));
        g2.translate(x, px / 2); g2.rotate(0.42); const lg = g2.createLinearGradient(-58 * k, 0, 58 * k, 0); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,255,255,0.72)"); lg.addColorStop(1, "rgba(255,255,255,0)");
        g2.fillStyle = lg; g2.fillRect(-58 * k, -px * 2, 116 * k, px * 4); g2.fillStyle = "rgba(255,255,255,0.5)"; g2.fillRect(78 * k, -px * 2, 12 * k, px * 4); g2.restore();
      }
    });
  }
  // 「繋がってく」: 字の輪郭が盤の配線になって引かれる(#004 ラインドロー: 輪郭の見える範囲を cubic in-out で伸ばし、先頭に光の点)
  function s4link(g, c, f) {
    const t = T4(), size = 2.35, s = sc(c), px = size * s;
    const L = Y.layout("MIN", PH4, px, { track: 0.05 }), st = charStarts(PH4), DUR = 16;
    const left = X0 - (L.w / s) / 2;
    onBoard(g, c, left, Z0 + 1.6, (g2) => {
      const done = [];
      L.items.forEach((it, i) => {
        const p = eIO(clamp((f - st[i]) / DUR)); TYPE.mark(PH4, i, p > 0 ? 0.5 + 0.5 * p : 0); if (p <= 0) return;
        const cs = Y.contours(it, 0, 0, px);
        // 面(完成した字だけ、薄いミントで塗る: 540px でも読めるように)
        if (p >= 1) { g2.save(); Y.K.textPath(g2, { items: [it] }, 0, 0, px); g2.fillStyle = css(C.mint, 0.16); g2.fill("nonzero"); g2.restore(); }
        g2.save(); g2.lineCap = "round"; g2.lineJoin = "round";
        for (const cn of cs) {
          let total = 0; for (let k = 2; k < cn.length; k += 2) total += Math.hypot(cn[k] - cn[k - 2], cn[k + 1] - cn[k - 1]);
          const lim = total * p; let acc2 = 0; const path = new Path2D(); path.moveTo(cn[0], cn[1]); let hx = cn[0], hy = cn[1];
          for (let k = 2; k < cn.length; k += 2) { const l = Math.hypot(cn[k] - cn[k - 2], cn[k + 1] - cn[k - 1]); if (acc2 + l > lim) { const u = (lim - acc2) / l; hx = cn[k - 2] + (cn[k] - cn[k - 2]) * u; hy = cn[k - 1] + (cn[k + 1] - cn[k - 1]) * u; path.lineTo(hx, hy); break; } acc2 += l; hx = cn[k]; hy = cn[k + 1]; path.lineTo(hx, hy); }
          g2.strokeStyle = css(C.verdDk, 0.95); g2.lineWidth = px * 0.05; g2.stroke(path);
          g2.strokeStyle = css(C.mint, 0.95); g2.lineWidth = px * 0.022; g2.stroke(path);
          if (p >= 1 && K.st.fx) { g2.save(); g2.globalCompositeOperation = "lighter"; g2.setLineDash([px * 0.08, px * 0.45]); g2.lineDashOffset = -f * px * 0.03; g2.strokeStyle = css(C.white, 0.9); g2.lineWidth = px * 0.026; g2.stroke(path); g2.restore(); }
          g2.fillStyle = css(C.verdHi, 0.9); g2.beginPath(); g2.arc(cn[0], cn[1], px * 0.03, 0, 7); g2.fill();
          if (p < 1) done.push([hx, hy]);
        }
        g2.restore();
      });
      for (const h of done) { Y.glow(g2, h[0], h[1], px * 0.2, C.mint, 0.8); g2.fillStyle = C.white; g2.beginPath(); g2.arc(h[0], h[1], px * 0.025, 0, 7); g2.fill(); }
    });
    // 点から字へ伸びる配線(45 度で一度曲がる)
    const lk = eIO(P(f, t.link - 4, t.link + 14)); if (lk <= 0) return;
    const ends = [[nodeA, [left + 0.2, Z0 + 1.6 - size * 0.5]], [nodeB, [left + L.w / s - 0.2, Z0 + 1.6 - size * 0.4]]];
    g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (const [a, b] of ends) {
      const mid = [a[0] + Math.sign(b[0] - a[0]) * Math.abs(b[1] - a[1]), b[1]], pts = [a, [a[0], a[1]], mid, b];
      let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const seg = CITY.sub(pts, 0, tot * lk).map((p) => pj(c, p[0], 0.01, p[1]));
      g.strokeStyle = css(C.mint, 0.9); g.lineWidth = 3; g.beginPath(); seg.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      const hd = seg[seg.length - 1]; if (lk < 1) Y.glow(g, hd[0], hd[1], 40, C.mint, 0.8);
    }
    g.restore();
  }
  // 「夜明けの」(S5): 中央に小さく。字ごとに点く(語頭の 2 コマ前から 4 コマ)
  function s5text(g, f) {
    const L = Y.once("s5lay", () => Y.layout("MIN", "夜明けの", 118, { track: 0.12 })), st = charStarts(PH5).slice(0, 4);
    const al = st.map((x) => TYPE.fadeIn(f, x - 2, 4)), bl = st.map((x) => 8 * (1 - TYPE.fadeIn(f, x - 2, 5)));
    if (Math.max(...al) <= 0) { for (let i = 0; i < 4; i++) TYPE.mark(PH5, i, 0); return; }
    const ox = (W - L.w) / 2, oy = H / 2 - 59;
    const gg = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 420); gg.addColorStop(0, `rgba(0,3,4,${0.75 * Math.max(...al)})`); gg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gg; g.fillRect(0, 0, W, H);
    TYPE.glass(g, L, ox, oy, 118, al, { ph: PH5, blurs: bl, faceTop: "#f4fffb", faceBot: "#9ff2dc", rim: C.white, glowA: 0.6, inner: 0, shadow: 0.5 });
  }
  function drawPlan(g, f) {
    const t = T4(), c = camPlan(f), CTy = CT();
    g.fillStyle = "#020809"; g.fillRect(0, 0, W, H);
    // 灯りの広がり(点からの距離 R の内側の配線が灯る)
    const RA = f < t.burstA ? 0 : 3 + 13 * eOut(P(f, t.burstA, t.burstA + 70)) + 10 * smooth(P(f, t.link, B.S6)), RB = f < t.burstB ? 0 : 3 + 12 * eOut(P(f, t.burstB, t.burstB + 60)) + 10 * smooth(P(f, t.link, B.S6));
    const far = smooth(P(f, B.S5, B.S6)) * 60;
    const litFn = (tr) => tr.r < 0.75 && (Math.hypot(tr.xc - nodeA[0], tr.zc - nodeA[1]) < RA || Math.hypot(tr.xc - nodeB[0], tr.zc - nodeB[1]) < RB || (far > 0 && Math.hypot(tr.xc - X0, tr.zc - Z0) < far && tr.r < 0.35));
    CITY.traces(g, c, CTy, { fogD: 400, maxD: 200, litFn, litA: 0.8, minPx: 0.5 });
    CITY.signals(g, c, CTy, f, { n: 180, seed: 15, sp: 0.08, maxD: 200, tail: 1.6, pick: (tr) => Math.hypot(tr.xc - X0, tr.zc - Z0) < Math.max(RA, RB, far) + 2 });
    CITY.chips(g, c, CTy, f, { fogD: 400, maxD: 200, lit: (ch) => 0.5, winCol: "#bafff0", rimA: 0.6, chipTop: "#0f2a27", sideLight: "#2a6a64" });
    node(g, c, nodeA, t.a, t.burstA, f); node(g, c, nodeB, t.b, t.burstB, f);
    if (f < t.link) s4ink(g, c, f); else for (let i = 0; i < 9; i++) TYPE.mark(PH3, i, 0);
    if (f >= t.link - 6) s4link(g, c, f); else for (let i = 0; i < 5; i++) TYPE.mark(PH4, i, 0);
    // S5: 中心へ吸い込まれる光の筋(予備動作)と、755 のひび
    if (f >= t.yo - 4) {
      const r = rng(735), u = P(f, t.yo - 4, t.hit);
      g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (let i = 0; i < 160; i++) { const a0 = r() * 6.283, r0 = 260 + r() * 900, d = r() * 0.4, k = eIn(clamp((u - d) / (1 - d))); if (k <= 0) continue; const rr = r0 * (1 - k), a = a0 + k * 0.9, l = 20 + 120 * k; g.strokeStyle = css(r() < 0.3 ? C.white : C.mint, 0.25 + 0.6 * k); g.lineWidth = 1.2 + k * 2; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr * 0.8); g.lineTo(W / 2 + Math.cos(a) * (rr + l), H / 2 + Math.sin(a) * (rr + l) * 0.8); g.stroke(); }
      g.restore();
      Y.glow(g, W / 2, H / 2, 200 + 300 * u, C.mint, 0.25 * u);
    }
    s5text(g, f);
    if (f >= t.crack && f < t.crack + 12) {
      const k = Math.exp(-(f - t.crack) / 4), ext = eOut(P(f, t.crack, t.crack + 3)), r = rng(755), pts = []; for (let i = 0; i <= 26; i++) pts.push([W / 2 - 520 + i * 40, H / 2 + 92 + (i % 2 ? 1 : -1) * r() * 16]);
      g.save(); g.globalCompositeOperation = "lighter"; g.lineJoin = "miter"; const cut = (p) => Math.abs(p[0] - W / 2) <= 520 * ext;
      for (const [w2, a2, col] of [[10, 0.3, C.mint], [2.2, 0.95, C.white]]) { g.strokeStyle = css(col, a2 * k); g.lineWidth = w2; g.beginPath(); pts.filter(cut).forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
      g.restore(); Y.glow(g, W / 2, H / 2 + 92, 300, C.mint, 0.5 * k);
    }
    K.dust(g, 41, f, { n: 80, col: "#a6fff0", a: 0.4, drift: [0.05, -0.12] });
    const dip = f >= t.hit - 3 ? 0.4 : 0; // ディップカット: 切る前の 3 コマを 4 割暗く
    const fx = { bloom: { thr: 0.5, a: 0.85, streak: 0.35 }, grade: { ca: 2.0, vig: 0.5, grain: 11, toe: [3, 9, 10] }, letterbox: LB };
    if (f > t.yo) fx.zoomBlur = [0.05 * eIn(P(f, t.yo, t.hit)), W / 2, H / 2];
    if (dip) fx.top = (g2) => { g2.fillStyle = "rgba(0,0,0,0.4)"; g2.fillRect(0, 0, W, H); };
    return fx;
  }
  FILM.reg({ id: "S4", a: B.S4, draw: drawPlan });
  FILM.reg({ id: "S5", a: B.S5, draw: drawPlan });
  FILM.reg({ id: "S1", a: B.S1, draw: drawNight });
  FILM.reg({ id: "S2", a: B.S2, draw: drawNight });
  FILM.reg({ id: "S3", a: B.S3, draw: drawNight });
  window.NIGHT = { camNight, A };
})();
