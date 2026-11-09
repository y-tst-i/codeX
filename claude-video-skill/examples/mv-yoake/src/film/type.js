// 文字の描き方(glyphs.js の点列から。fillText を使わない)。歌詞の字は TYPE.mark で「どの句の何字目が、どの濃さで出たか」を記録する(機械検査)。
// 種類: traced(光が輪郭をなぞる)/ glass(暗いガラスの面+光の縁)/ circuit(面の中に光る配線が走る)/ fire(朱)/ plum(朝の濃い紫)/ weak(消えかけた声: 輪郭がふるえて欠ける)
const TYPE = (() => {
  const { clamp, lerp, P, eOut, smooth, hash, rng, css, mix, K } = Y;
  const C = K.C;
  const mark = (ph, i, a) => Y.textMark(ph + "|" + i, clamp(a));
  const one = (it) => ({ items: [it] });

  // 字ごとの「点く」入り: start から dur コマで 不透明度 0→1、ぼかし blur→0(motion.md の「1字ずつ 0.3→1+わずかなぼかし」)
  const fadeIn = (f, s, dur = 4, from = 0) => clamp(lerp(from, 1, smooth(P(f, s, s + dur))));

  // ---- なぞる(第1段階 SF1 の litText を動画用に) ----
  // progs[i]: 字ごとの進み 0..1。未着手の字は刻まれた薄い輪郭(読める濃さの下地)
  function traced(ctx, L, ox, oy, size, progs, o = {}) {
    const { ph = "", lineW = 3, col = C.mint, core = C.white, faceTop = "#0d3534", faceBot = "#04100f", unlit = C.verdHi, unlitA = 0.5, glowA = 0.5, alpha = 1, fill = 1 } = o;
    const heads = [];
    L.items.forEach((it, i) => {
      const p = progs[i] ?? 0, g1 = one(it);
      ctx.save(); ctx.globalAlpha = alpha; K.textPath(ctx, g1, ox, oy, size);
      const gr = ctx.createLinearGradient(0, oy + it.y - size * 0.9, 0, oy + it.y + size * 0.15); gr.addColorStop(0, faceTop); gr.addColorStop(1, faceBot);
      ctx.fillStyle = gr; ctx.globalAlpha = alpha * fill * (0.3 + 0.7 * smooth(p)); ctx.fill("nonzero");
      ctx.globalAlpha = alpha; ctx.lineWidth = 1.4; ctx.strokeStyle = css(unlit, unlitA * (1 - smooth(p) * 0.6)); ctx.stroke(); ctx.restore();
      mark(ph, i, alpha * (p > 0 ? 0.5 + 0.5 * smooth(p) : 0.25 * unlitA));
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = alpha;
      if (K.st.fx) { ctx.save(); ctx.filter = `blur(${lineW * 2.2}px)`; K.traceText(ctx, g1, ox, oy, size, p, { col: css(col, glowA), w: lineW * 3.2 }); ctx.restore(); }
      K.traceText(ctx, g1, ox, oy, size, p, { col: css(col, 0.95), w: lineW });
      const hs = K.traceText(ctx, g1, ox, oy, size, p, { col: css(core, 0.95), w: lineW * 0.38 });
      if (p >= 1 && K.st.fx) { K.textPath(ctx, g1, ox, oy, size); ctx.clip("nonzero"); const g2 = ctx.createLinearGradient(0, oy + it.y - size, 0, oy + it.y + size * 0.2); g2.addColorStop(0, css(col, 0.2)); g2.addColorStop(1, css(col, 0.03)); ctx.fillStyle = g2; ctx.fillRect(ox + it.x - 10, oy + it.y - size, size * 1.2, size * 1.3); }
      ctx.restore();
      heads.push(...hs);
    });
    for (const h of heads) Y.glow(ctx, h[0], h[1], 30, col, 0.75 * alpha);
    ctx.save(); ctx.globalAlpha = alpha; for (const h of heads) { ctx.fillStyle = core; ctx.beginPath(); ctx.arc(h[0], h[1], lineW * 0.95, 0, 7); ctx.fill(); } ctx.restore();
    return heads;
  }

  // ---- ガラスの字: 暗い面(上が明るい)+光の縁+外のにじみ。alphas[i]: 字ごとの不透明度、blurs[i]: ぼかし(px) ----
  function glass(ctx, L, ox, oy, size, alphas, o = {}) {
    const { ph = "", rim = C.mint, rimW = Math.max(1.6, size * 0.012), faceTop = "#17504b", faceBot = "#03110f", glowA = 0.55, inner = 0.18, blurs = null, dy = null, shadow = 0.6 } = o;
    L.items.forEach((it, i) => {
      const a = alphas[i] ?? 1; mark(ph, i, a); if (a <= 0.003) return;
      const g1 = one(it), b = blurs ? blurs[i] : 0, yy = oy + (dy ? dy[i] : 0);
      ctx.save(); ctx.globalAlpha = a; if (b > 0.3 && K.st.fx) ctx.filter = `blur(${b}px)`;
      if (shadow > 0) { ctx.save(); ctx.translate(size * 0.03, size * 0.05); K.textPath(ctx, g1, ox, yy, size); ctx.fillStyle = `rgba(0,4,4,${shadow})`; if (K.st.fx) ctx.filter = `blur(${size * 0.035 + b}px)`; ctx.fill("nonzero"); ctx.restore(); }
      if (K.st.fx && glowA > 0) { ctx.save(); K.textPath(ctx, g1, ox, yy, size); ctx.filter = `blur(${size * 0.03 + b}px)`; ctx.strokeStyle = css(rim, glowA); ctx.lineWidth = rimW * 4; ctx.stroke(); ctx.restore(); }
      K.textPath(ctx, g1, ox, yy, size);
      const gr = ctx.createLinearGradient(0, yy + it.y - size * 0.9, 0, yy + it.y + size * 0.12); gr.addColorStop(0, faceTop); gr.addColorStop(1, faceBot);
      ctx.fillStyle = gr; ctx.fill("nonzero");
      if (inner > 0) { ctx.save(); ctx.clip("nonzero"); const g2 = ctx.createLinearGradient(0, yy + it.y - size, 0, yy + it.y); g2.addColorStop(0, css(rim, inner)); g2.addColorStop(0.5, css(rim, 0)); ctx.fillStyle = g2; ctx.fillRect(ox + it.x - 10, yy + it.y - size, size * 1.3, size * 1.2); ctx.restore(); }
      ctx.lineJoin = "round"; ctx.strokeStyle = css(rim, 0.95); ctx.lineWidth = rimW; ctx.stroke();
      ctx.restore();
    });
  }

  // ---- 回路の字: 面(白〜ミント)に、太く光る配線を刻み、その上を信号が流れる(540px でも見える太さ: 字の大きさの 2.2%) ----
  function circuitPattern(seed, w, h, size) {
    return Y.once(`cp${seed}_${w | 0}_${h | 0}_${size}`, () => {
      const r = rng(seed), out = [], step = size * 0.11;
      for (let i = 0; i < Math.round((w * h) / (size * size) * 9); i++) {
        let x = Math.round((r() * w) / step) * step, y = Math.round((r() * h) / step) * step; const pts = [[x, y]];
        let d = (r() * 4) | 0; const n = 2 + ((r() * 4) | 0);
        for (let s = 0; s < n; s++) { const l = step * (1 + ((r() * 4) | 0)); const dv = [[1, 0], [0, 1], [0.7071, 0.7071], [0.7071, -0.7071]][d]; x += dv[0] * l; y += dv[1] * l; pts.push([x, y]); d = (d + (r() < 0.5 ? 1 : 3)) % 4; }
        out.push({ pts, ph: r(), v: 0.6 + r() * 1.2 });
      }
      return out;
    });
  }
  function circuit(ctx, L, ox, oy, size, f, o = {}) {
    const { ph = "", alpha = 1, seed = 4, faceA = "#e9fff9", faceB = "#1f8f7e", trace = C.mint, rim = C.white, glowA = 0.55, scale = 1, cx = ox + L.w / 2, cy = oy + size / 2, dx = 0, sq = 1 } = o;
    for (let i = 0; i < L.items.length; i++) mark(ph, i, alpha);
    if (alpha <= 0.003) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx + dx, cy + size * 0.5); ctx.scale(scale * (2 - sq), scale * sq); ctx.translate(-cx, -cy - size * 0.5);
    // 落ち影と外のにじみ
    ctx.save(); ctx.translate(size * 0.04, size * 0.06); K.textPath(ctx, L, ox, oy, size); ctx.fillStyle = "rgba(0,6,6,0.8)"; if (K.st.fx) ctx.filter = `blur(${size * 0.04}px)`; ctx.fill("nonzero"); ctx.restore();
    if (K.st.fx) { ctx.save(); K.textPath(ctx, L, ox, oy, size); ctx.filter = `blur(${size * 0.035}px)`; ctx.strokeStyle = css(trace, glowA); ctx.lineWidth = size * 0.05; ctx.stroke(); ctx.restore(); }
    // 面(暗い緑青のガラス)+縁の暗い線
    K.textPath(ctx, L, ox, oy, size);
    const g = ctx.createLinearGradient(0, oy, 0, oy + size); g.addColorStop(0, faceA); g.addColorStop(1, faceB);
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(1,14,13,0.95)"; ctx.lineWidth = Math.max(4, size * 0.03); ctx.stroke(); ctx.fillStyle = g; ctx.fill("nonzero");
    ctx.save(); ctx.clip("nonzero");
    // 刻んだ配線: 暗い溝(太さ 3.2%)→ 光る芯(2.2%)→ 流れる信号(破線のずれ)
    const pat = circuitPattern(seed, L.w + size, size * 1.2, size);
    ctx.lineCap = "round"; ctx.lineJoin = "miter";
    const path = new Path2D(); for (const t of pat) { t.pts.forEach((p, k) => (k ? path.lineTo(ox - size * 0.3 + p[0], oy - size * 0.1 + p[1]) : path.moveTo(ox - size * 0.3 + p[0], oy - size * 0.1 + p[1]))); }
    ctx.strokeStyle = "rgba(4,46,40,0.85)"; ctx.lineWidth = size * 0.036; ctx.stroke(path);
    ctx.strokeStyle = css(trace, 0.9); ctx.lineWidth = size * 0.012; ctx.stroke(path);
    ctx.globalCompositeOperation = "lighter"; ctx.setLineDash([size * 0.12, size * 0.5]); ctx.lineDashOffset = -f * size * 0.045; ctx.strokeStyle = css(C.mint, 0.9); ctx.lineWidth = size * 0.018; ctx.stroke(path); ctx.setLineDash([]);
    ctx.globalCompositeOperation = "source-over";
    for (const t of pat) { const e = t.pts[t.pts.length - 1]; ctx.fillStyle = "rgba(4,46,40,0.9)"; ctx.beginPath(); ctx.arc(ox - size * 0.3 + e[0], oy - size * 0.1 + e[1], size * 0.03, 0, 7); ctx.fill(); }
    // 面の陰影(上が明るく下に影)
    const sh = ctx.createLinearGradient(0, oy, 0, oy + size); sh.addColorStop(0, "rgba(255,255,255,0.25)"); sh.addColorStop(0.5, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(0,60,55,0.45)");
    ctx.fillStyle = sh; ctx.fillRect(ox - 20, oy - 20, L.w + 40, size + 40);
    ctx.restore();
    K.textPath(ctx, L, ox, oy, size); ctx.strokeStyle = css(rim, 0.95); ctx.lineWidth = Math.max(1.8, size * 0.007); ctx.stroke();
    ctx.restore();
  }

  // ---- 輪郭の点列(画面座標)。step px ごとに取り直す。粒・ほどけ・形の変化に使う ----
  function samplePts(L, ox, oy, size, step = 6) {
    const out = [];
    L.items.forEach((it, ci) => {
      for (const cn of Y.contours(it, ox, oy, size)) {
        let acc = 0; for (let i = 2; i < cn.length; i += 2) {
          const ax = cn[i - 2], ay = cn[i - 1], bx = cn[i], by = cn[i + 1], l = Math.hypot(bx - ax, by - ay);
          while (acc <= l) { const k = acc / (l || 1); out.push([lerp(ax, bx, k), lerp(ay, by, k), ci]); acc += step; }
          acc -= l;
        }
      }
    });
    return out;
  }
  return { mark, fadeIn, traced, glass, circuit, samplePts };
})();
