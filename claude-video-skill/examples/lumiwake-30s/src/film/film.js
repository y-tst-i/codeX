// LUMIWAKE 30秒ティザー本編。FILM.renderAt(ctx, f): コマ番号 f(0〜899)から絵が決まる純関数(乱数は seed 付き、状態の積み上げなし)。
// 台帳: audio/cues.json(映像のヒットのコマ)。ここのコマ番号は台帳と同じ。背景は init で1回だけ焼いて(bake)、毎コマは位置を変えて貼る。
// 約束: ヒットストップだけは世界の時計 ts を止める(tw)。UI と音ハメのイベントは f(表示コマ)で決める。
const FILM = (() => {
  const P = PAINT, W = WORLD, H = HUD, C = W.C, { css, mix, lerp, clamp, mulberry32 } = P, SM = SCENE_LIB.smooth;
  const FW = 1920, FH = 1080;
  const B = {};
  const HIT = { f: 610, n: 2 }; // ヒットストップ: 610 から n コマ止める(式: f<h ? f : f<h+n ? h : f-n+1)。n は ?hs= で変えて比べる
  let HS_N = HIT.n, inited = false;
  const tw = (f) => (f < HIT.f ? f : f < HIT.f + HS_N ? HIT.f : f - HS_N + 1);
  const kf = (f, pts) => { if (f <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], SM((f - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]))); return pts[pts.length - 1][1]; };
  const spr = (x) => (x <= 0 ? 0 : x >= 1.6 ? 1 : 1 - Math.exp(-7 * x) * Math.cos(14 * x));
  const bump = (f, a, b, c) => (f < a || f > c ? 0 : f < b ? SM((f - a) / (b - a)) : 1 - SM((f - b) / (c - b)));
  const fade = (f, a, b) => clamp((f - a) / (b - a));

  function bake(name, w, h, ox, oy, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.translate(ox, oy); fn(g); B[name] = { c, ox, oy }; }
  const put = (ctx, name, dx = 0, dy = 0, a = 1) => { const b = B[name]; ctx.save(); ctx.globalAlpha = a; ctx.drawImage(b.c, dx - b.ox, dy - b.oy); ctx.restore(); };

  // ---- 焼く物(init で1回) ----
  function drawVortex(g, eye) {
    const arms = 7, rr = mulberry32(17);
    for (let layer = 0; layer < 2; layer++) for (let a = 0; a < arms; a++) {
      const pts = [], ph = a / arms * Math.PI * 2 + layer * 0.45 + rr() * 0.4, r0 = lerp(60, 260, rr()), r1 = lerp(700, 1250, rr()), turn = lerp(1.6, 2.6, rr());
      for (let k = 0; k <= 12; k++) { const q = k / 12, r = lerp(r0, r1, Math.pow(q, 1.2)), th = ph + q * turn; pts.push([eye[0] + Math.cos(th) * r, eye[1] + Math.sin(th) * r * 0.58 + (P.fbm(q * 3, a, 5, 2) - 0.5) * 80]); }
      const samp = P.sampleSpline(pts, 10), base = layer === 0 ? "#2e2652" : "#231c40";
      P.shade(g, (gg) => P.ribbonPath(gg, samp, (u) => lerp(14, 260, u) * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.6 * (0.55 + 0.45 * P.fbm(u * 6, a, 3, 3))), {
        box: [eye[0] - 1400, eye[1] - 950, 2800, 1900], silColor: "#888", L: [0, -1],
        base: (gg) => { const gr = gg.createRadialGradient(eye[0], eye[1], 40, eye[0], eye[1], 1100); gr.addColorStop(0, "#9aa6e8"); gr.addColorStop(0.25, base); gr.addColorStop(1, "#0d0a1c"); return gr; },
        hiCol: layer === 0 ? "#a99be0" : "#7f74b8", hi: 9, hiA: 0.7, shCol: "#06040e", sh: 40, shA: 0.7, blur: 6, tex: 0.25, texSeed: 7 + a, texScale: 0.015,
      });
    }
  }
  function init() {
    bake("sky", FW, FH, 0, 0, (g) => { W.sky(g, { glowAt: [1360, 190] }); W.stars(g, { t: 0.7, n: 420 }); });
    bake("skyPano", FW, FH, 0, 0, (g) => { W.sky(g, { glowAt: [1560, 190] }); W.stars(g, { t: 0.7, n: 520 }); });
    bake("far", 3000, FH, 500, 0, (g) => { W.cloudBank(g, { seed: 2, x0: -500, x1: 2500, yb: 660, hgt: 70, d: 0.92, under: 500 }); W.island(g, { seed: 8, cx: 1480, top: 470, w: 240, d: 0.86 }); W.island(g, { seed: 15, cx: 1090, top: 540, w: 150, d: 0.9, town: false }); W.island(g, { seed: 18, cx: -120, top: 520, w: 200, d: 0.88 }); });
    bake("mid", 3400, FH, 700, 0, (g) => { W.cloudBank(g, { seed: 5, x0: -700, x1: 2700, yb: 820, hgt: 120, d: 0.62, under: 400, warm: 0.18, warmAt: [600, 860, 420] }); W.island(g, { seed: 4, cx: 250, top: 600, w: 440, d: 0.5, L: [0.6, -0.8] }); W.island(g, { seed: 23, cx: 2100, top: 660, w: 380, d: 0.5, L: [0.6, -0.8] }); });
    bake("front", 3000, FH, 500, 0, (g) => { W.island(g, { seed: 21, cx: 1820, top: 960, w: 620, depthH: 300, d: 0, town: false, falls: false, lamp: 0, L: [0.6, -0.8], lightSide: { col: C.amber, w: 5, L: [-0.9, -0.3], a: 0.7 } }); W.cloudBank(g, { seed: 9, x0: -500, x1: 700, yb: 1110, hgt: 150, d: 0.25, under: 100 }); });
    bake("storm", FW, FH, 0, 0, (g) => { W.stormMass(g, { seed: 6, cx: 330, cy: 120, rx: 560, ry: 220, swirl: 1.4, inner: 0.5 }); });
    bake("vortex", 2800, 1900, 1400, 950, (g) => drawVortex(g, [0, 0]));
    // 暗い灯台島(S2)。灯台は別に描く
    bake("darkIsle", 700, 700, 350, 350, (g) => { W.island(g, { seed: 31, cx: 0, top: 0, w: 420, depthH: 260, d: 0.55, lamp: 0, falls: true }); });
    // パノラマ(S8): 消灯版と点灯版
    const isl = [[150, 690, 150, 41], [520, 740, 120, 42], [860, 700, 170, 43], [1240, 750, 130, 44], [1560, 690, 190, 45], [1830, 740, 120, 46]];
    for (const lit of [0, 1]) bake(lit ? "panoLit" : "panoDark", FW, FH, 0, 0, (g) => {
      W.cloudBank(g, { seed: 2, x0: -200, x1: 2100, yb: 760, hgt: 60, d: 0.95, under: 400 });
      for (const [x, y, w, sd] of isl) W.island(g, { seed: sd, cx: x, top: y, w, d: 0.82, lamp: lit, falls: false });
      W.cloudBank(g, { seed: 7, x0: -200, x1: 2100, yb: 1000, hgt: 90, d: 0.55, under: 200, warm: lit ? 0.3 : 0.05, warmAt: [960, 1000, 700] });
      W.island(g, { seed: 4, cx: 130, top: 820, w: 420, depthH: 260, d: 0.35, lamp: lit, L: [0.6, -0.8] });
      W.island(g, { seed: 12, cx: 1830, top: 850, w: 380, depthH: 240, d: 0.35, lamp: lit, L: [0.6, -0.8] });
    });
    bake("logo", FW, FH, 0, 0, (g) => { LOGO.draw(g, 960, 400, 1280, { t: 0 }); });
    inited = true;
  }

  // ---- 部品 ----
  const streamAt = (samp, x) => { let i = 1; while (i < samp.length - 2 && samp[i][0] < x) i++; const a = samp[i - 1], b = samp[i + 1]; return [samp[i][0], samp[i][1], Math.atan2(b[1] - a[1], b[0] - a[0])]; };
  function cam(ctx, o, fn) { ctx.save(); ctx.translate(FW / 2 + (o.dx || 0), FH / 2 + (o.dy || 0)); ctx.rotate(o.tilt || 0); ctx.scale(o.zoom || 1, o.zoom || 1); ctx.translate(-FW / 2, -FH / 2); fn(); ctx.restore(); }
  const shake = (f, f0, amp, dur = 10) => { const k = f - f0; if (k < 0 || k >= dur) return [0, 0]; const d = (1 - k / dur) ** 2 * amp; return [Math.sin(k * 5.3 + 1) * d, Math.cos(k * 7.1) * d * 0.7]; };
  const flash = (ctx, f, f0, a0, dur) => { const k = f - f0; if (k < 0 || k >= dur) return; ctx.save(); ctx.fillStyle = `rgba(255,250,235,${a0 * (1 - k / dur) ** 1.4})`; ctx.fillRect(0, 0, FW, FH); ctx.restore(); };
  function ring(ctx, x, y, r, a, col = "#fff6dc", lw = 5, sq = 0.38) { if (a <= 0.01) return; ctx.save(); ctx.strokeStyle = css(col, a); ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, r, r * sq, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  function burst(ctx, x, y, f, f0, n = 26, seed = 5, len = 160, col = "#fff1c9") { const k = f - f0; if (k < 0 || k > 16) return; const r = mulberry32(seed), u = k / 16; ctx.save(); ctx.lineCap = "round"; for (let i = 0; i < n; i++) { const a = r() * 6.283, d0 = 30 + r() * 40, d1 = d0 + (60 + r() * len) * (1 - (1 - u) ** 2); ctx.strokeStyle = css(col, (1 - u) * 0.9); ctx.lineWidth = 3 * (1 - u) + 1; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0 * 0.8); ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1 * 0.8); ctx.stroke(); } ctx.restore(); }
  const pose = (base, o) => Object.assign({}, SPIRIT.POSES[base], o);
  const sp = (ctx, x, y, s, rot, ps, t, extra) => SPIRIT.draw(ctx, x, y, s, rot, ps, "P", Object.assign({ t, lift: 0.0 }, extra));
  // 吹き出しの数字(行動の結果)
  function pops(ctx, f, list) { for (const p of list) { const k = f - p.f; if (k < 0 || k > 44) continue; const sc = 1 + (p.from || 0.5) * (1 - spr(k / 9)), a = k < 2 ? 0.6 : k > 36 ? 1 - (k - 36) / 8 : 1; ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.scale(sc, sc); ctx.translate(-p.x, -p.y); H.pop(ctx, p.x, p.y, p.big, p.small, { size: p.size || 58, rot: p.rot ?? -0.06 }); ctx.restore(); } }
  function text(ctx, s, x, y, f, a, b, o = {}) { const k = fade(f, a, a + 10) * (1 - fade(f, b - 8, b)); if (k <= 0) return; ctx.save(); ctx.globalAlpha = k; H.text(ctx, s, x, y + (1 - SM(fade(f, a, a + 12))) * 18, Object.assign({ font: "JPM", weight: 900, size: 64, col: "#f4ead2", align: "center", stroke: 11, strokeCol: "rgba(8,12,26,0.88)", track: 6 }, o)); ctx.restore(); }
  function hud(ctx, f, o = {}) { // 画面に固定の表示。o.parcel(0..3)、o.dist、o.gauge、o.ghost、o.show
    const a = o.a ?? 1; if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
    const [sx, sy] = o.shake || [0, 0]; ctx.translate(sx, sy);
    if (o.parcel != null) H.parcel(ctx, 44, 40 - (1 - a) * 30, o.parcel);
    if (o.dist != null) H.dest(ctx, 1876, 40 - (1 - a) * 30, "灯台島まで", typeof o.dist === "number" ? o.dist.toFixed(1) : o.dist);
    if (o.gauge != null) H.gauge(ctx, 44, 970 + (1 - a) * 30, o.gauge, o.ghost ?? o.gauge);
    if (o.streak != null && o.streak > 0) { const k = o.streakK ?? 99, sc = 1 + 0.5 * (1 - spr(k / 8)); ctx.save(); ctx.translate(1860, 500); ctx.scale(sc, sc); ctx.translate(-1860, -500); H.streak(ctx, 1860, 470, o.streak); ctx.restore(); }
    ctx.restore();
  }
  function bolts(ctx, f, spec) { for (const b of spec) { const k = f - b.f; if (k < 0 || k >= b.dur) continue; const a = (1 - k / b.dur) ** 0.8 * (k % 3 === 2 ? 0.6 : 1); W.bolt(ctx, b.x0, b.y0, b.x1, b.y1, { seed: b.seed + (k >> 1), width: b.w || 7, branches: b.br ?? 4, a }); } }

  // ---- 乗る場面の共通部 ----
  // 乗る: 空・遠景・嵐・中景・気流・精・前景。cx は世界の横移動(px)
  function rideScene(ctx, f, ts, o) {
    const cx = o.cx;
    cam(ctx, { tilt: o.tilt ?? -0.05, zoom: (o.zoom ?? 1.06) , dx: o.dx, dy: o.dy }, () => {
      put(ctx, "sky"); W.moon(ctx, 1370 - cx * 0.02, 175, 56);
      put(ctx, "far", -cx * 0.15);
      if (o.storm !== false) { ctx.save(); const sc = o.stormScale ?? 1; ctx.translate(330, 120); ctx.scale(sc, sc); ctx.translate(-330, -120); put(ctx, "storm", 0, o.stormDy || 0, o.stormA ?? 1); ctx.restore(); }
      put(ctx, "mid", -cx * 0.4);
      o.mid && o.mid();
      const pts = o.pts(ts); const samp = W.stream(ctx, pts, { width: o.sw ?? 46, t: ts / 30 * (o.flow ?? 1), seed: 4, taper: [0.35, 1], sparks: o.sparks ?? 120 });
      o.afterStream && o.afterStream(samp);
      put(ctx, "front", -cx * 0.9);
    });
  }

  // ---- ショット ----
  function S1(ctx, f) { // 0–90
    const ts = f, sx = 700 + 380 * SM(f / 90), cx = f * 2.2;
    const k = bump(f, 16, 30, 52);
    rideScene(ctx, f, ts, { cx, pts: () => [[-160, 1010], [380, 935], [820, 835], [1240, 710], [1640, 560], [2120, 390]], mid: null, afterStream: (samp) => {
      const hit = [560, 868]; // 稲妻の着弾(22〜)
      bolts(ctx, f, [{ f: 22, dur: 9, x0: 300, y0: 250, x1: hit[0], y1: hit[1], seed: 11, w: 7 }]);
      if (f >= 22 && f < 60) { const k2 = f - 22; P.glow(ctx, hit[0], hit[1], 260 * (1 - k2 / 38), "#bfeeff", 0.55 * (1 - k2 / 38)); ring(ctx, hit[0], hit[1], 60 + k2 * 9, 0.85 * (1 - k2 / 38), "#dff8ff", 4, 0.38); }
      burst(ctx, hit[0], hit[1], f, 22, 40, 31, 170, "#e1faff");
      if (f < 36) W.speedLines(ctx, { n: 46, seed: 3, angle: Math.PI + Math.atan2(-170, 400), spread: 0.08, a: 0.18 * (1 - fade(f, 24, 36)), col: "#d6f0ff" });
      const at = streamAt(samp, sx), up = 105 + 70 * k;
      const ps = SPIRIT.poseMix(pose("fly", { expr: 0 }), pose("dodge", { expr: 1 }), k); ps.glow = lerp(1, 0.7, fade(f, 30, 90));
      sp(ctx, at[0] + 20, at[1] - up, 2.3, at[2] - k * 0.35, ps, f / 30);
    } });
    W.motes(ctx, { n: 46, seed: 12, t: f / 30, vx: -900, streak: -70, size: [2, 7], a: 0.55 * (1 - fade(f, 30, 90) * 0.6) });
    const dim = fade(f, 30, 90) * 0.3; if (dim > 0) { ctx.fillStyle = `rgba(6,12,30,${dim})`; ctx.fillRect(0, 0, FW, FH); }
    flash(ctx, f, 22, 0.32, 3);
    pops(ctx, f, [{ f: 40, x: 1330, y: 280, big: "NEAR MISS", small: "+150  ×4", from: 0.6 }]);
    hud(ctx, f, { parcel: 3, dist: "1.2", gauge: f < 40 ? 0.58 : 0.62, ghost: 0.72, shake: shake(f, 22, 8, 8) });
  }

  const S2_ISLE = [1250, 640];
  function lighthouse(ctx, x, y, h, lit, t, beamA = 1) { // 灯台。lit 0..1
    const w = h * 0.26; ctx.save();
    P.shade(ctx, (g) => { g.moveTo(x - w, y); g.lineTo(x - w * 0.62, y - h); g.lineTo(x + w * 0.62, y - h); g.lineTo(x + w, y); g.closePath(); }, { box: [x - h, y - h * 1.5, h * 2, h * 1.6], base: css("#e9e1d0"), silColor: "#222", L: [0.6, -0.8], hiCol: "#ffffff", hi: h * 0.05, hiA: 0.6, shCol: css("#58566e"), sh: h * 0.12, shA: 0.85, blur: 2 });
    ctx.fillStyle = css("#b6402f", 0.9); for (const [a, b] of [[0.2, 0.38], [0.58, 0.76]]) { ctx.beginPath(); ctx.moveTo(x - w * (1 - 0.38 * a), y - h * a); ctx.lineTo(x + w * (1 - 0.38 * a), y - h * a); ctx.lineTo(x + w * (1 - 0.38 * b), y - h * b); ctx.lineTo(x - w * (1 - 0.38 * b), y - h * b); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = css("#3a3350"); ctx.fillRect(x - w * 0.8, y - h * 1.02, w * 1.6, h * 0.05);
    ctx.fillStyle = lit > 0.05 ? css(mix("#3a3a52", C.amberHot, lit)) : css("#2a3044"); ctx.beginPath(); ctx.roundRect(x - w * 0.5, y - h * 1.2, w, h * 0.18, 4); ctx.fill();
    ctx.fillStyle = css("#5b2f3a"); ctx.beginPath(); ctx.moveTo(x - w * 0.62, y - h * 1.2); ctx.lineTo(x, y - h * 1.38); ctx.lineTo(x + w * 0.62, y - h * 1.2); ctx.closePath(); ctx.fill();
    if (lit > 0.05) { const lx = x, ly = y - h * 1.11; P.glow(ctx, lx, ly, h * 2.4 * lit, C.amber, 0.5 * lit); P.glow(ctx, lx, ly, h * 0.6 * lit, "#fff6dc", 0.8 * lit);
      const sw = Math.sin(t * 1.6) * 0.9; ctx.save(); ctx.globalCompositeOperation = "lighter"; for (const dir of [1, -1]) { const a0 = sw * dir; const g = ctx.createLinearGradient(lx, ly, lx + Math.cos(a0) * h * 6 * dir, ly + Math.sin(a0) * h * 1.2); g.addColorStop(0, css(C.amberHot, 0.5 * lit * beamA)); g.addColorStop(1, css(C.amber, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + dir * h * 6, ly - h * 1.1 + a0 * h); ctx.lineTo(lx + dir * h * 6, ly + h * 0.9 + a0 * h); ctx.closePath(); ctx.fill(); } ctx.restore(); }
    ctx.restore();
  }

  function S2(ctx, f) { // 90–227 谷。音に無い動きだけ
    const lf = f - 90, u = lf / 137, cx = 40 + lf * 0.9;
    cam(ctx, { tilt: -0.012, zoom: lerp(1.0, 1.07, u), dx: -u * 28, dy: u * 10 }, () => {
      put(ctx, "sky"); W.moon(ctx, 1370, 175, 56); put(ctx, "far", -cx * 0.15);
      // 暗い灯台島(遠い)。窓は暗い
      ctx.save(); ctx.globalAlpha = 0.95; put(ctx, "darkIsle", S2_ISLE[0], S2_ISLE[1] + 40); lighthouse(ctx, S2_ISLE[0] + 20, S2_ISLE[1] + 30, 150, 0, f / 30); ctx.restore();
      // 嵐の壁: 左上から近づく
      const sc = lerp(0.9, 1.7, u * u), a = lerp(0.6, 1, u); ctx.save(); ctx.translate(0, 0); ctx.scale(sc, sc); put(ctx, "storm", -60 * u, -20 * u, a); ctx.restore();
      put(ctx, "mid", -cx * 0.4);
      // 遠い稲光(音なし): 150 と 196 に雲の中が一瞬光る
      for (const [ff, ax, ay] of [[150, 320, 150], [196, 520, 230]]) { const k = f - ff; if (k >= 0 && k < 6) P.glow(ctx, ax, ay, 420, "#bfe9ff", 0.5 * (1 - k / 6)); }
      // 小さな灯りの精が低く飛ぶ
      const gx = 330 + lf * 3.0, gy = 760 + Math.sin(lf * 0.09) * 18 - u * 30, inhale = bump(f, 214, 224, 227);
      const ps = pose("fly", { flap: 0.25, tail: 0.55 + inhale * 0.6, glow: 0.42 + inhale * 1.1, swing: 0.2 });
      const spts = [[-100, 860], [500, 840], [1000, 800], [1500, 760], [2100, 700]]; W.stream(ctx, spts.map((p) => [p[0], p[1] + 30 + Math.sin(f * 0.05 + p[0] * 0.003) * 6]), { width: 16, t: f / 30, a: 0.55 * (1 - inhale), sparks: 40, taper: [0.2, 1] });
      sp(ctx, gx, gy, 1.5, -0.04 + Math.sin(lf * 0.06) * 0.03, ps, f / 30);
      if (f >= 218) { ring(ctx, gx, gy, 40 + (f - 218) * 12, 0.5 * (f - 218) / 9, "#ffd89a", 3, 0.5); }
      put(ctx, "front", -cx * 0.9);
    });
    W.motes(ctx, { n: 36, seed: 15, t: f / 30, vx: -120, size: [2, 6], a: 0.4, col: "#cfe6ff" });
    text(ctx, "嵐を抜けて、灯りを届けろ。", 960, 930, f, 100, 180);
    hud(ctx, f, { parcel: 3, dist: 1.2, a: 0.8 });
  }

  // ---- S3〜S5: 乗る ----
  const ridePts = (ts) => { const p = ts * 0.045; return [[-200, 930 + Math.sin(p) * 16], [300, 850 + Math.sin(p + 1) * 24], [800, 790 + Math.sin(p + 2) * 26], [1300, 700 + Math.sin(p + 3) * 22], [1800, 600 + Math.sin(p + 4) * 20], [2250, 480]]; };
  const PICK = [299, 331, 351, 370, 383];
  const gaugeAt = (f) => kf(f, [[0, 0.58], [227, 0.1], [299, 0.1], [303, 0.3], [331, 0.3], [335, 0.5], [351, 0.5], [355, 0.7], [370, 0.7], [374, 0.85], [383, 0.85], [387, 1.0], [434, 1.0], [440, 0.6], [467, 0.35], [490, 0.5], [507, 0.5], [539, 0.5], [592, 0.9], [610, 1.0]]);
  function rideShot(ctx, f, ts, extra) {
    const cx = 40 + (f - 227) * 7 + (extra.boost || 0) * 80;
    const sxp = 900, zoomB = 1 + 0.08 * bump(f, 403, 407, 420);
    cam(ctx, { tilt: -0.04 + (extra.tilt || 0), zoom: 1.06 * zoomB, dx: extra.sdx, dy: extra.sdy }, () => {
      put(ctx, "sky"); W.moon(ctx, 1370 - cx * 0.02, 175, 56); put(ctx, "far", -cx * 0.15);
      if (extra.storm !== false) { ctx.save(); const sc = extra.stormScale || 1.05; ctx.translate(330, 120); ctx.scale(sc, sc); ctx.translate(-330, -120); put(ctx, "storm"); ctx.restore(); }
      put(ctx, "mid", -cx * 0.4);
      const pts = ridePts(ts), sg = f < 232 ? clamp((f - 227) / 5) : 1;
      const samp = W.stream(ctx, pts, { width: 46 * (0.7 + 0.3 * sg) + (extra.boost || 0) * 12, t: ts / 30 * (1.4 + (extra.boost || 0)), seed: 4, taper: [0.35, 1], sparks: 130 });
      extra.beforeSpirit && extra.beforeSpirit(samp);
      const at = streamAt(samp, sxp), bob = Math.sin(ts * 0.14) * 9;
      const ps = pose("fly", Object.assign({ tail: 1 + (extra.boost || 0) * 0.9, glow: 1.1 }, extra.ps));
      sp(ctx, at[0] + 20 + (extra.spx || 0), at[1] - 110 + bob + (extra.spy || 0), 2.1, at[2] + (extra.rot || 0), ps, ts / 30);
      put(ctx, "front", -cx * 0.9);
    });
  }
  function S3(ctx, f) { // 227–300
    const ts = f; rideShot(ctx, f, ts, { beforeSpirit: () => {} });
    W.speedLines(ctx, { n: 60, seed: 3, angle: Math.PI + 0.3, spread: 0.1, a: 0.2, col: "#d6f0ff" });
    const spx = 920, spy = 700;
    ring(ctx, spx, spy, 80 + (f - 240) * 18, f >= 240 && f < 252 ? 0.7 * (1 - (f - 240) / 12) : 0, "#fff1c9", 5, 0.5);
    burst(ctx, spx, spy, f, 253, 30, 8, 200);
    for (const F of [299]) { const k = F - f; if (k > 0 && k < 26) { const px = spx + k * 26, py = spy - 20 - k * 3; P.glow(ctx, px, py, 40, "#fff1c9", 0.9); P.glow(ctx, px, py, 14, "#ffffff", 1); } }
    W.motes(ctx, { n: 50, seed: 22, t: f / 30, vx: -1400, streak: -90, size: [2, 7], a: 0.5 });
    flash(ctx, f, 227, 0.95, 5);
    pops(ctx, f, [{ f: 299, x: 980, y: 600, big: "+30", small: "", size: 56, from: 0.8 }]);
    const a = fade(f, 229, 242); hud(ctx, f, { parcel: 3, dist: kf(f, [[227, 1.2], [300, 1.0]]), gauge: gaugeAt(f), ghost: Math.min(1, gaugeAt(f) + 0.1), a });
  }
  function S4(ctx, f) { // 300–420
    const ts = f, boost = bump(f, 403, 409, 424), spx = 920, spy = 700;
    rideShot(ctx, f, ts, { boost });
    W.speedLines(ctx, { n: 50 + Math.round(boost * 60), seed: 3, angle: Math.PI + 0.3, spread: 0.1, a: 0.2 + boost * 0.25, col: "#d6f0ff" });
    for (const F of PICK.slice(1).concat([396])) { const k = F - f; if (k > 0 && k < 26) { const px = spx + k * 26, py = spy - 20 - k * 3; P.glow(ctx, px, py, 40, "#fff1c9", 0.9); P.glow(ctx, px, py, 14, "#ffffff", 1); } if (f >= F && f < F + 8) ring(ctx, spx, spy, 60 + (f - F) * 14, 0.6 * (1 - (f - F) / 8), "#fff1c9", 4, 0.5); }
    W.motes(ctx, { n: 50, seed: 22, t: f / 30, vx: -1400 - boost * 1200, streak: -90, size: [2, 7], a: 0.5 });
    pops(ctx, f, [331, 351, 370, 383].map((F) => ({ f: F, x: 980, y: 600, big: "+30", small: "", size: 56, from: 0.8 })).concat([{ f: 409, x: 1330, y: 280, big: "NEAR MISS", small: "+150  ×7", from: 0.6 }]));
    hud(ctx, f, { parcel: 3, dist: kf(f, [[300, 1.0], [420, 0.7]]), gauge: gaugeAt(f), ghost: Math.min(1, gaugeAt(f) + 0.12), streak: f >= 409 ? 7 : 0, streakK: f - 409 });
  }
  function S5(ctx, f) { // 420–507 失敗
    const ts = f, hit = f >= 435, k435 = f - 435, k455 = f - 455;
    const tumble = f >= 455 ? SM(clamp((f - 455) / 30)) * (1 - SM(clamp((f - 482) / 10))) * -Math.PI * 2 : 0;
    const recoil = bump(f, 435, 438, 452), glowM = f < 435 ? 1.1 : f < 467 ? lerp(0.9, 0.3, SM((f - 435) / 32)) : lerp(0.3, 1.4, SM((f - 467) / 24)) * (f > 495 ? lerp(1, 0.85, (f - 495) / 12) : 1);
    const [shx, shy] = shake(f, 435, 18, 12), [s2x, s2y] = shake(f, 455, 12, 9);
    const spirit = { spx: -recoil * 40, spy: recoil * 30, rot: tumble - recoil * 0.4, ps: { expr: hit && f < 487 ? 1 : 0, glow: glowM, swing: hit ? 0.9 : 0.3 } };
    // 嵐が迫る: 腕の稲妻
    const stormScale = lerp(1.05, 1.5, fade(f, 420, 435));
    rideShot(ctx, f, ts, Object.assign({ stormScale, sdx: shx + s2x, sdy: shy + s2y, tilt: recoil * 0.03, beforeSpirit: (samp) => {
      const at = streamAt(samp, 900), tgt = [at[0] + 20, at[1] - 40];
      if (f >= 429 && f < 435) { const kk = f - 429; P.glow(ctx, 380, 190, 500, "#bfe9ff", 0.35 * (kk % 2 ? 1 : 0.5)); if (kk >= 3) W.bolt(ctx, 380, 190, 640 + kk * 30, 420 + kk * 30, { seed: 21, width: 3, branches: 1, a: 0.5 }); }
      bolts(ctx, f, [{ f: 435, dur: 8, x0: 380, y0: 190, x1: tgt[0], y1: tgt[1], seed: 5, w: 9, br: 5 }, { f: 455, dur: 8, x0: 300, y0: 170, x1: tgt[0] - 260, y1: tgt[1] + 120, seed: 9, w: 8, br: 4 }]);
    } }, spirit));
    // 荷物の被弾: 火花と割れ
    const px = 940, py = 745; burst(ctx, px, py, f, 435, 36, 17, 190, "#e1faff"); burst(ctx, px - 200, py + 60, f, 455, 26, 18, 150, "#e1faff");
    if (f >= 435 && f < 455) { const kk = f - 435; ring(ctx, px, py, 40 + kk * 12, 0.8 * (1 - kk / 20), "#dff8ff", 4, 0.5); }
    if (f >= 467 && f < 487) { const kk = f - 467; ctx.fillStyle = `rgba(4,8,20,${0.32 * Math.sin(Math.PI * kk / 20)})`; ctx.fillRect(0, 0, FW, FH); }
    W.speedLines(ctx, { n: 40, seed: 3, angle: Math.PI + 0.3, spread: 0.1, a: 0.14, col: "#d6f0ff" });
    W.motes(ctx, { n: 40, seed: 22, t: f / 30, vx: -1200, streak: -70, size: [2, 6], a: 0.45 });
    flash(ctx, f, 435, 0.6, 3); flash(ctx, f, 455, 0.35, 2);
    const hp = f < 435 ? 3 : f < 441 ? (f % 2 ? 2.6 : 2) : 2;
    pops(ctx, f, [{ f: 436, x: 1050, y: 360, big: "HIT", small: "PARCEL -1", size: 64, from: 0.9, rot: 0.05 }]);
    hud(ctx, f, { parcel: hp, dist: kf(f, [[420, 0.7], [507, 0.65]]), gauge: gaugeAt(f), ghost: f >= 435 ? Math.min(1, gaugeAt(f) + 0.3) : 1, shake: [shx + s2x, shy + s2y] });
  }

  // ---- S6: 嵐の目の門 ----
  const ARC = [[-120, 300], [260, 640], [720, 880], [1160, 900], [1520, 740], [1800, 470], [2000, 180]];
  const eye = [700, 430];
  function vortexScene(ctx, f, ts, tilt, zoom, o) {
    const ph = ts * 0.0035;
    cam(ctx, { tilt, zoom, dx: o.dx, dy: o.dy }, () => {
      ctx.fillStyle = css("#090816"); ctx.fillRect(-300, -300, FW + 600, FH + 600);
      if (o.under) { const ua = o.underA ?? 1; put(ctx, "sky", 0, 0, ua); put(ctx, "far", -ts * 0.4, 0, ua); put(ctx, "mid", -ts * 0.9, 0, ua); }
      ctx.save(); ctx.globalAlpha = o.vA ?? 1; ctx.translate(eye[0], eye[1]); ctx.rotate(ph); put(ctx, "vortex", 0, 0); ctx.restore();
      P.glow(ctx, eye[0], eye[1], 340 + Math.sin(ts * 0.2) * 20, "#bfe9ff", 0.6 * (o.vA ?? 1)); P.glow(ctx, eye[0], eye[1], 90, "#ffffff", 0.9 * (o.vA ?? 1));
      const fl = (ts >> 3) & 3; if (o.vA == null || o.vA > 0.4) { W.bolt(ctx, eye[0] - 30, eye[1] - 20, eye[0] - 380, eye[1] - 260, { seed: 3 + fl, width: 5, branches: 3, a: 0.9 }); W.bolt(ctx, eye[0] + 40, eye[1] + 30, eye[0] + 300, eye[1] + 330, { seed: 8 + fl, width: 6, branches: 4, a: 0.9 }); }
      const samp = W.stream(ctx, ARC, { width: 50, t: ts / 30 * 1.6, seed: 6, taper: [0.3, 1], sparks: 150 });
      o.afterStream && o.afterStream(samp);
    });
  }
  const GATES = [539, 559, 578, 591], X0 = 150, X1 = 1130, X2 = 1700;
  const spX = (f) => (f < 610 ? lerp(X0, X1, (f - 507) / 103) : lerp(X1, X2, SM(clamp((f - 612) / 111))));
  function S6(ctx, f) { // 507–610
    const ts = f, k = (f - 507) / 103, tilt = lerp(0.04, 0.13, k), zoom = lerp(1.05, 1.12, k);
    const [shx, shy] = [0, 0];
    vortexScene(ctx, f, ts, tilt, zoom, { afterStream: (samp) => {
      // 門(ring): 近づいて通り抜ける
      for (const F of GATES) {
        const x = spX(F), a = streamAt(samp, x), d = F - f; if (d < -14 || d > 30) continue;
        const rr = d > 0 ? lerp(120, 40, 1 - d / 30) : 40 + (-d) * 26, al = clamp(d > 0 ? 0.9 : 0.9 * (1 + d / 14)), rx = Math.max(10, rr * 0.5);
        const path = (g) => { g.save(); g.translate(a[0], a[1]); g.rotate(a[2] + Math.PI / 2); g.beginPath(); g.ellipse(0, 0, rx, rr, 0, 0, 7); g.restore(); };
        P.bloom(ctx, (gg) => { path(gg); gg.strokeStyle = css(C.amber, 0.9); gg.lineWidth = 14; gg.stroke(); }, { blur: 16, a: 0.8 * al });
        ctx.save(); path(ctx); ctx.strokeStyle = css(d > 0 ? "#fff1c9" : "#ffe6a8", al); ctx.lineWidth = d > 0 ? 8 : 14; ctx.stroke(); ctx.restore();
      }
      const x = spX(f), at = streamAt(samp, x), ps = pose("fly", { tail: 1.25, glow: 1.25, flap: 0.5 });
      sp(ctx, at[0] + 10, at[1] - 125, 2.2, at[2] * 0.9, ps, ts / 30);
    } });
    W.speedLines(ctx, { n: 50, seed: 13, cx: 900, cy: 700, r0: 360, r1: 1400, col: "#e8f6ff", a: 0.16 });
    W.motes(ctx, { n: 36, seed: 4, t: f / 30, vx: 700, streak: 90, col: "#d8ecff", size: [1.5, 5], a: 0.4 });
    flash(ctx, f, 507, 0.4, 3); for (const F of GATES) flash(ctx, f, F, 0.22, 2);
    const n = GATES.filter((F) => f >= F).length, lastF = GATES.filter((F) => f >= F).pop() ?? 0;
    pops(ctx, f, GATES.map((F, i) => ({ f: F, x: 1000, y: 330 - i * 4, big: "GATE", small: "+" + (60 + i * 20), size: 52, from: 0.7, rot: -0.05 })));
    hud(ctx, f, { parcel: 2, dist: kf(f, [[507, 0.65], [610, 0.5]]), gauge: gaugeAt(f), ghost: gaugeAt(f), streak: n, streakK: f - lastF });
  }
  // ---- S7: PERFECT ----
  const STREAKS = [[617, 8], [624, 9], [630, 10], [637, 11], [643, 12]];
  function S7(ctx, f) { // 610–723
    const ts = tw(f), burstK = fade(f, 615, 640), vA = 1 - SM(fade(f, 636, 690)), tilt = lerp(0.13, 0.04, SM(fade(f, 612, 700)));
    const [shx, shy] = shake(f, 615, 10, 10);
    vortexScene(ctx, f, ts, tilt, lerp(1.12, 1.05, SM(fade(f, 612, 700))), { under: true, underA: SM(fade(f, 618, 700)), vA, dx: shx, dy: shy, afterStream: (samp) => {
      // 灯台島(右上に近づく)
      const lk = fade(f, 676, 723), lx = 1690, ly = 470, sc = lerp(0.35, 1.0, lk);
      if (f >= 676) { ctx.save(); ctx.globalAlpha = fade(f, 676, 690); ctx.translate(lx, ly); ctx.scale(sc, sc); ctx.translate(-lx, -ly); put(ctx, "darkIsle", lx - 30, ly + 150); lighthouse(ctx, lx - 10, ly + 140, 150, f >= 682 ? 0.25 : 0, f / 30); ctx.restore(); if (f >= 682) P.glow(ctx, lx - 120 * sc, ly + 90 * sc, 70, C.amber, 0.5 * Math.min(1, (f - 682) / 6)); }
      const x = spX(f), at = streamAt(samp, x), offer = SM(fade(f, 696, 712));
      const ps = SPIRIT.poseMix(pose("fly", { tail: 1.25, glow: 1.3, flap: 0.5, expr: 2 }), pose("offer", { glow: 1.4 }), offer);
      sp(ctx, at[0] + 10, at[1] - 125, 2.2 * lerp(1, 0.85, offer), at[2] * 0.9 * (1 - offer * 0.5), ps, ts / 30);
      // 610: 白い輪(ヒットストップ中も広がる=表示コマで決める)
      const k = f - 610; if (k >= 0 && k < 30) { ring(ctx, at[0], at[1] - 100, 150 + k * 22, 0.95 * (1 - k / 30), "#ffffff", 7, 0.9); ring(ctx, at[0], at[1] - 100, 110 + k * 36, 0.55 * (1 - k / 30), "#ffe9b8", 3, 0.9); }
    } });
    if (f >= 615) W.speedLines(ctx, { n: 90, seed: 13, cx: 1050, cy: 780, r0: 260, r1: 1500, col: "#e8f6ff", a: 0.3 * (1 - burstK * 0.5) });
    flash(ctx, f, 610, 0.5, 3); flash(ctx, f, 643, 0.22, 4);
    const sN = STREAKS.filter((s) => f >= s[0]).pop(), n = sN ? sN[1] : 7, lastF = sN ? sN[0] : 610;
    pops(ctx, f, [{ f: 610, x: 1060, y: 300, big: "PERFECT", small: "+800", size: 96, from: 0.5, rot: -0.08 }]);
    hud(ctx, f, { parcel: 2, dist: kf(f, [[610, 0.5], [723, 0.1]]), gauge: 1.0, ghost: 1.0, streak: n, streakK: f - lastF });
    const lt = fade(f, 700, 723); if (lt > 0) { ctx.fillStyle = `rgba(255,248,230,${0.0})`; }
  }

  // ---- S8: ロゴ・点灯・保持 ----
  const ROUTE = [[150, 678], [520, 730], [860, 688], [1240, 738], [1560, 668], [1830, 728]];
  function S8(ctx, f) { // 723–900
    const lf = f - 723, [shx, shy] = shake(f, 723, 9, 9), push = 1 + 0.02 * (lf / 177), lit = SM(fade(f, 723, 790));
    ctx.save(); ctx.translate(FW / 2 + shx, FH / 2 + shy); ctx.scale(push, push); ctx.translate(-FW / 2, -FH / 2);
    put(ctx, "skyPano"); W.moon(ctx, 1590, 170, 50);
    put(ctx, "panoDark");
    // 点灯の波: 灯台島(1560,690)から広がる円の中だけ点灯版
    const R = lf * 55; ctx.save(); ctx.beginPath(); ctx.arc(1560, 700, R, 0, Math.PI * 2); ctx.clip(); put(ctx, "panoLit"); ctx.restore();
    if (lf < 45) ring(ctx, 1560, 700, R, 0.6 * (1 - lf / 45), "#fff1c9", 6, 0.55);
    lighthouse(ctx, 1590, 690, 120, 1, f / 30, fade(f, 723, 745) * (1 - fade(f, 800, 860) * 0.6));
    // 航路の光: 右から左へ引かれる
    const route = P.sampleSpline(ROUTE.slice().reverse(), 16), rp = clamp((f - 735) / 55), nR = Math.max(2, Math.round(route.length * rp));
    ctx.save(); ctx.lineCap = "round"; const rs = route.slice(0, nR); P.bloom(ctx, (g) => { g.strokeStyle = css(C.amber); g.lineWidth = 8; g.beginPath(); rs.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }, { blur: 14, a: 0.8 }); ctx.strokeStyle = css(C.amberHot, 0.85); ctx.lineWidth = 2.5; ctx.setLineDash([2, 10]); ctx.beginPath(); rs.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
    // ロゴの背後を沈めて読みやすく
    const g = ctx.createRadialGradient(960, 400, 100, 960, 400, 900); g.addColorStop(0, "rgba(6,10,22,0.55)"); g.addColorStop(1, "rgba(6,10,22,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, FW, FH);
    // ロゴ着地(723): 1.28→1 のばね+2コマの閃光
    const sc = 1 + 0.28 * (1 - spr(lf / 10)), la = fade(f, 723, 725);
    ctx.save(); ctx.globalAlpha = la; ctx.translate(960, 440); ctx.scale(sc, sc); ctx.translate(-960, -440); put(ctx, "logo");
    P.glow(ctx, 855, 337, 150 * (1 + 0.15 * Math.sin(f * 0.2)), C.amber, 0.25); ctx.restore();
    // 先端の精(スウッシュの端 x≈1700,y≈440)
    const bob = Math.sin(f * 0.13) * 8, en = fade(f, 735, 760);
    ctx.save(); ctx.globalAlpha = en; sp(ctx, 1648, 400 + bob, 1.0, -0.15, pose("offer", { glow: 1.3, flap: 0.4, expr: 2, tail: 0.6, swing: 0.2 }), f / 30); ctx.restore();
    text(ctx, "届けた灯りが、空の道になる。", 960, 640, f, 760, 840, { size: 58 });
    const dA = fade(f, 810, 826); if (dA > 0) { ctx.save(); ctx.globalAlpha = dA; H.text(ctx, "※架空のゲームのコンセプト映像です。発売の予定はありません。", 960, 1030, { font: "JPG", weight: 500, size: 32, col: "#cfe2e4", align: "center", stroke: 6, strokeCol: "rgba(8,12,26,0.8)" }); ctx.restore(); }
    W.motes(ctx, { n: 30, seed: 8, t: f / 30, vx: -60, size: [2, 6], a: 0.4 });
    ctx.restore();
    flash(ctx, f, 723, 0.85, 5);
  }

  // ---- 入口 ----
  function renderAt(ctx, f) {
    f = Math.max(0, Math.min(899, Math.round(f)));
    ctx.save(); ctx.fillStyle = "#050812"; ctx.fillRect(0, 0, FW, FH); if (!inited) { ctx.restore(); return; }
    if (f < 90) S1(ctx, f); else if (f < 227) S2(ctx, f); else if (f < 300) S3(ctx, f); else if (f < 420) S4(ctx, f); else if (f < 507) S5(ctx, f); else if (f < 610) S6(ctx, f); else if (f < 723) S7(ctx, f); else S8(ctx, f);
    P.finish(ctx, f / 30, { vig: 0.5 });
    ctx.restore();
  }
  return { init, renderAt, setHitstop: (n) => { HS_N = n; }, tw, B, bakeMs: 0 };
})();
