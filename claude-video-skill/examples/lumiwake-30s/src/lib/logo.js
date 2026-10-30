// ロゴ『LUMIWAKE』。既製の字形(LOGO_GLYPHS)をそのまま並べず、次の加工をする:
//  1) 全体を弓なりに反らす(中央が上がる。橋・航路のイメージ)
//  2) i の点を「灯り(ランタン)」に置き換え、i の軸は下 6 割だけ残す
//  3) 光の気流(スウッシュ)が L の下から E の先へ抜け、文字の下端を切り欠く(文字と帯の間に夜空のすき間)
//  4) 質感: 濃紺の縁取り → 紫紺の押し出し(厚み)→ 象牙〜琥珀の面、上の縁に月光、左に灯りのリム
// mono=true で白黒の形だけ(字形の審査用)。
const LOGO = (() => {
  const P = PAINT, W = WORLD, { css, mix, lerp, clamp, shade, glow } = P;
  // SVG パス(M L H V C Q Z, 絶対座標)をコマンド列に
  function parse(d) {
    const tok = d.match(/[MLHVCQZ]|-?[\d.]+(?:e-?\d+)?/g), cmds = []; let i = 0, cur = [0, 0], start = [0, 0], c = null;
    const num = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      if (/[A-Z]/.test(tok[i])) c = tok[i++];
      if (c === "M") { cur = [num(), num()]; start = cur; cmds.push(["M", cur]); c = "L"; }
      else if (c === "L") { cur = [num(), num()]; cmds.push(["L", cur]); }
      else if (c === "H") { cur = [num(), cur[1]]; cmds.push(["L", cur]); }
      else if (c === "V") { cur = [cur[0], num()]; cmds.push(["L", cur]); }
      else if (c === "Q") { const a = [num(), num()]; cur = [num(), num()]; cmds.push(["Q", a, cur]); }
      else if (c === "C") { const a = [num(), num()], b = [num(), num()]; cur = [num(), num()]; cmds.push(["C", a, b, cur]); }
      else if (c === "Z") { cmds.push(["Z"]); cur = start; c = null; }
      else i++;
    }
    return cmds;
  }
  const G = LOGO_GLYPHS, glyphs = G.glyphs.map((g) => ({ ...g, cmds: parse(g.d) }));
  // 反らし: 単位はフォント座標(高さ 700)。x の中央で arch だけ上がる
  const warp = (p, arch) => { const u = (p[0] - G.width / 2) / (G.width / 2); return [p[0], p[1] - arch * (1 - u * u)]; };
  function replay(g, cmds, M, arch) {
    const T = (p) => { const q = warp(p, arch); return [M[0] + q[0] * M[2], M[1] + q[1] * M[2]]; };
    for (const c of cmds) {
      if (c[0] === "M") g.moveTo(...T(c[1])); else if (c[0] === "L") g.lineTo(...T(c[1]));
      else if (c[0] === "Q") g.quadraticCurveTo(...T(c[1]), ...T(c[2])); else if (c[0] === "C") g.bezierCurveTo(...T(c[1]), ...T(c[2]), ...T(c[3])); else g.closePath();
    }
  }
  // 灯り(i の点の代わり)。フォント座標で中心 cx, cy
  function lanternPath(g, cx, cy, r, M, arch) {
    const T = (x, y) => { const q = warp([x, y], arch); return [M[0] + q[0] * M[2], M[1] + q[1] * M[2]]; };
    const pts = [[0, -1.25], [0.55, -0.85], [0.78, 0], [0.55, 0.85], [0, 1.1], [-0.55, 0.85], [-0.78, 0], [-0.55, -0.85]];
    g.moveTo(...T(cx + pts[0][0] * r, cy + pts[0][1] * r)); for (const p of pts.slice(1)) g.lineTo(...T(cx + p[0] * r, cy + p[1] * r)); g.closePath();
  }
  // 気流のスウッシュの中心線(フォント座標)
  const swooshPts = (arch) => [[-380, 190], [500, 128], [1800, 104], [3300, 98], [4800, 104], [5900, 112], [6750, -10], [7300, -330]].map((p) => warp(p, arch * 0.85));

  function draw(ctx, cx, cy, width, { mono = false, arch = 70, lamp = 1, swoosh = 1, t = 0 } = {}) {
    const sc = width / G.width, M = [cx - width / 2, cy + 350 * sc, sc];
    const iG = glyphs.find((g) => g.ch === "i"), iCx = (iG.bounds[0] + iG.bounds[2]) / 2;
    const lettersPath = (g, dy = 0) => { g.save(); g.translate(0, dy); for (const gl of glyphs) { if (gl.ch === "i") continue; replay(g, gl.cmds, M, arch); } g.restore(); };
    // i: 下 6 割(y > -430)だけ。クリップの代わりに、軸を描き直す(フォント座標で矩形+下のセリフは元の形を使う)
    const iPath = (g) => { const T = (x, y) => { const q = warp([x, y], arch); return [M[0] + q[0] * M[2], M[1] + q[1] * M[2]]; }; const x0 = 2790, x1 = 3007; g.moveTo(...T(x0, -400)); g.lineTo(...T(x1, -400)); g.lineTo(...T(x1, -134)); g.lineTo(...T(3074, 0)); g.lineTo(...T(2724, 0)); g.lineTo(...T(x0, -134)); g.closePath(); };
    const lamp0 = [iCx, -640], lampR = 150;
    const all = (g) => { g.beginPath(); lettersPath(g); iPath(g); lanternPath(g, lamp0[0], lamp0[1], lampR, M, arch); };
    // スウッシュの帯(画面座標)と、文字を切り欠くすき間
    const swS = P.sampleSpline(swooshPts(arch).map((p) => [M[0] + p[0] * M[2], M[1] + p[1] * M[2]]), 24);
    const swW = (u) => width * 0.022 * Math.min(1, u * 7) ** 0.8 * (1 - 0.6 * Math.max(0, u - 0.6) / 0.4);
    const cutW = (u) => swW(u) + width * 0.012;
    const k = clamp(swoosh);
    const swPart = swS.slice(0, Math.max(2, Math.round(swS.length * k)));

    // 文字の形(切り欠き済み)を作業キャンバスに作る
    const [lc, lg] = P.buf("logoShape", ctx.canvas.width, ctx.canvas.height);
    all(lg); lg.fillStyle = "#fff"; lg.fill();
    if (k > 0) { lg.globalCompositeOperation = "destination-out"; P.ribbonPath(lg, swPart, cutW); lg.fill(); lg.globalCompositeOperation = "source-over"; }

    if (mono || P.mode.sil) {
      // 白黒: 形を黒で
      const [mc, mg] = P.buf("logoMono", ctx.canvas.width, ctx.canvas.height); mg.drawImage(lc, 0, 0); mg.globalCompositeOperation = "source-in"; mg.fillStyle = "#111"; mg.fillRect(0, 0, mc.width, mc.height);
      ctx.drawImage(mc, 0, 0);
      if (k > 0) { P.ribbonPath(ctx, swPart, swW); ctx.fillStyle = "#111"; ctx.fill(); }
      return { M, sc, swooshEnd: swPart[swPart.length - 1], swS };
    }
    const tint = (src, col, name) => { const [c, g] = P.buf(name, src.width, src.height); g.drawImage(src, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); return c; };
    // 1) 外側の縁取り(濃紺)+押し出しの厚み(下へ 14px、紫紺の段)
    const ink = tint(lc, W.C.ink, "logoInk"), depth = Math.round(width * 0.011);
    ctx.save();
    const ring = (r) => [...Array(20)].map((_, i) => [Math.cos(i / 20 * 6.283) * r, Math.sin(i / 20 * 6.283) * r]);
    for (const [dx, dy] of ring(7)) ctx.drawImage(ink, dx, dy + depth);
    for (let i = depth; i >= 1; i--) { const side = tint(lc, css(mix("#3a2650", "#120c22", i / depth)), "logoSide"); ctx.drawImage(side, 0, i); }
    for (const [dx, dy] of ring(6)) ctx.drawImage(ink, dx, dy);
    ctx.restore();
    // 2) 面: 象牙→琥珀の縦グラデ、上の縁に月光、下に陰、左に灯りのリム(shade は形のパスが要るので、切り欠いた形をマスクに使う)
    const top = cy - 420 * sc - arch * sc, bot = cy + 360 * sc;
    const [fc, fg] = P.buf("logoFace", ctx.canvas.width, ctx.canvas.height);
    shade(fg, (g) => { g.beginPath(); g.rect(cx - width * 0.6, top - 40, width * 1.2, bot - top + 80); }, { box: [0, 0, fc.width, fc.height],
      base: (g) => { const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, "#fff6df"); gr.addColorStop(0.45, "#ffd894"); gr.addColorStop(0.8, "#f39a3c"); gr.addColorStop(1, "#c55a26"); return gr; } });
    fg.globalCompositeOperation = "destination-in"; fg.drawImage(lc, 0, 0); fg.globalCompositeOperation = "source-over";
    ctx.drawImage(fc, 0, 0);
    // 縁の光と陰: 形を上下にずらした差で帯を作る
    const bandOf = (dx, dy, col, a, bl, name) => { const [c, g] = P.buf(name, lc.width, lc.height); g.drawImage(lc, 0, 0); g.globalCompositeOperation = "destination-out"; g.filter = `blur(${bl}px)`; g.drawImage(lc, dx, dy); g.filter = "none"; g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); ctx.save(); ctx.globalAlpha = a; ctx.drawImage(c, 0, 0); ctx.restore(); };
    bandOf(0, 7, "#ffffff", 0.85, 1.5, "logoHi");
    bandOf(0, -10, "#8a3a1e", 0.55, 3, "logoSh");
    bandOf(5, 0, css(W.C.amberHot), 0.5 * lamp, 1, "logoRim");
    // 面の中の細い溝(縦の刻み。手彫りの看板の質感)
    ctx.save(); const [gc, gg] = P.buf("logoGroove", lc.width, lc.height); gg.drawImage(lc, 0, 0); gg.globalCompositeOperation = "source-in";
    const r = P.mulberry32(5); gg.strokeStyle = "rgba(120,50,20,0.22)"; gg.lineWidth = 1.2; for (let i = 0; i < 140; i++) { const x = cx - width / 2 + r() * width, y = top + r() * (bot - top); gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x + 2, y + 6 + r() * 16); gg.stroke(); }
    ctx.drawImage(gc, 0, 0); ctx.restore();
    // 3) 灯り(i の点): 中が光る
    const T = (x, y) => { const q = warp([x, y], arch); return [M[0] + q[0] * M[2], M[1] + q[1] * M[2]]; }, lp = T(lamp0[0], lamp0[1]);
    ctx.save(); ctx.beginPath(); lanternPath(ctx, lamp0[0], lamp0[1], lampR * 0.62, M, arch); const lgG = ctx.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], lampR * sc * 0.8); lgG.addColorStop(0, "#fffef5"); lgG.addColorStop(0.6, css(W.C.amber)); lgG.addColorStop(1, css(W.C.amberDeep)); ctx.fillStyle = lgG; ctx.fill(); ctx.restore();
    // 灯りの吊り手
    ctx.save(); ctx.strokeStyle = W.C.ink; ctx.lineWidth = Math.max(3, 14 * sc); ctx.beginPath(); const h0 = T(lamp0[0] - 50, lamp0[1] - lampR * 1.25), h1 = T(lamp0[0] + 50, lamp0[1] - lampR * 1.25), h2 = T(lamp0[0], lamp0[1] - lampR * 1.9); ctx.moveTo(...h0); ctx.quadraticCurveTo(...h2, ...h1); ctx.stroke(); ctx.restore();
    glow(ctx, lp[0], lp[1], width * 0.12 * lamp, W.C.amber, 0.5);
    glow(ctx, lp[0], lp[1], width * 0.03 * lamp, "#fff6dc", 0.9);
    // 4) スウッシュ(光の気流)
    if (k > 0) {
      P.bloom(ctx, (g) => { P.ribbonPath(g, swPart, (u) => swW(u) * 2.2); g.fillStyle = css(W.C.amberDeep); g.fill(); }, { blur: 26, a: 0.7 });
      P.ribbonPath(ctx, swPart, swW); const gr = ctx.createLinearGradient(swS[0][0], 0, swS[swS.length - 1][0], 0); gr.addColorStop(0, css(W.C.amberDeep, 0.3)); gr.addColorStop(0.4, css(W.C.amber)); gr.addColorStop(1, "#fff4d8"); ctx.fillStyle = gr; ctx.fill();
      P.ribbonPath(ctx, swPart, (u) => swW(u) * 0.3); ctx.fillStyle = "rgba(255,252,240,0.95)"; ctx.fill();
    }
    return { M, sc, lamp: lp, swooshEnd: swPart[swPart.length - 1], swS, top, bot };
  }
  return { draw, parse };
})();
