// ショット S5〜S8(420〜899)。
// 動きの出典(Motion Prompt): S5 #034 手持ち・#024 衝撃の揺れ・#170 バレルロール(一部)・#122 余韻 / S6 #035 FPV・#176 くぐり抜け・#003・#036 /
//   S7 #040 フリーズ(ヒットストップ)・#038 速度の変化・#007 カウントアップ・#001 / S8 #024(小)・#004 線を引く・#022 光の帯・#005
// Motion Prompt #001-192 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/
const SB = (() => {
  const P = PAINT, W = WORLD, C = W.C, { css, mix } = P;
  const { clamp, lerp, keys, eIO, eIOs, eOut, eOut5, eIn, expoOut, backOut, backIn, spring, decay, hash, rng, plate, blurred, camApply, layerImg, toScreen, stream, streamPath, along, glow, burst, impactShake, handheld } = K2;
  const { sky, moonAt, motes, rain } = SA;

  // 衝撃のコマ(1コマ): 絵を2色(濃紺と氷色/藍と琥珀)に置き換える。白い板を重ねないので灰色に抜けない
  function impactFrame(g, c, dark, light, { inv = true } = {}) {
    const [b, gb] = K2.wbuf("imp", 1920, 1080); gb.filter = `grayscale(1) contrast(2.2)${inv ? " invert(1)" : ""}`; gb.drawImage(c, 0, 0); gb.filter = "none";
    gb.globalCompositeOperation = "multiply"; gb.fillStyle = light; gb.fillRect(0, 0, 1920, 1080);
    g.save(); g.fillStyle = dark; g.fillRect(0, 0, 1920, 1080); g.globalCompositeOperation = "screen"; g.drawImage(b, 0, 0); g.restore();
  }
  // 嵐の腕(先の細い帯。中の稲光で光る)
  function tendril(g, root, ang, len, t, { width = 120, lit = 0, seed = 1, amp = 0.35, w = 2.2 } = {}) {
    const n = 8, pts = SPIRIT2.chain(root, ang, Array(n).fill(len / n), t, { amp, w, lag: 0.5, droop: 0.25 }), samp = P.sampleSpline(pts, 10);
    const wf = (u) => width * (1 - u) ** 0.9 + 6;
    g.save();
    P.ribbonPath(g, samp, (u) => wf(u) * 1.25); g.fillStyle = "rgba(20,12,40,0.45)"; g.filter = "blur(10px)"; g.fill(); g.filter = "none";
    P.ribbonPath(g, samp, wf); const gr = g.createLinearGradient(samp[0][0], samp[0][1], samp[samp.length - 1][0], samp[samp.length - 1][1]); gr.addColorStop(0, "#23173f"); gr.addColorStop(1, "#3c2a66"); g.fillStyle = gr; g.fill();
    g.strokeStyle = "rgba(160,150,220,0.35)"; g.lineWidth = 3; g.stroke();
    if (lit > 0) { // 中の稲光(ひびの線)
      const r = rng(seed); g.save(); P.ribbonPath(g, samp, wf); g.clip(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
      for (let k = 0; k < 7; k++) { let i = Math.floor(r() * (samp.length - 8)), x = samp[i][0], y = samp[i][1]; g.strokeStyle = `rgba(200,240,255,${0.8 * lit})`; g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { i = Math.min(samp.length - 1, i + 2); x = samp[i][0] + (r() - 0.5) * wf(i / samp.length) * 1.4; y = samp[i][1] + (r() - 0.5) * wf(i / samp.length) * 1.4; g.lineTo(x, y); } g.stroke(); }
      g.restore(); glow(g, samp[Math.floor(samp.length * 0.6)][0], samp[Math.floor(samp.length * 0.6)][1], 380, "#8fc8ff", 0.35 * lit);
    }
    g.restore();
    return samp;
  }

  // ======================= S5 失敗(420〜506) =======================
  // 寄り・手持ち(#034)。429 予兆(腕の中が光る)→ 435 被弾: 衝撃のコマ1枚+揺れ(#024、中)+色ずれ、小包にひび、PARCEL 3→2
  // → 455 二撃目: きりもみ(1回転、カメラも少し傾く #170 の一部)→ 467 いちばん暗い → 487 立て直し(灯りがふくらむ)。
  const S5 = { id: "S5", a: 420, b: 507 };
  S5.draw = (g, f) => {
    const t = f / 30, u = (f - 420) / 30;
    const [sx1, sy1, sr1] = impactShake((f - 435) / 30, 1.7);
    const calm = 1 - eIOs(K2.P(f, 487, 506)), [hx, hy, hr] = handheld(u, 0.8 + 0.8 * calm * (f >= 435 ? 1 : 0.6));
    const spin = f >= 455 ? -Math.PI * 2 * eOut(K2.P(f, 455, 474)) : 0, bank = -0.22 * Math.sin(Math.PI * K2.P(f, 455, 480));
    const cam = { x: 700 * u, y: 0, z: 1.0, r: hr + sr1 + bank - 0.04, sx: hx + sx1, sy: hy + sy1 };
    sky(g, cam, { top: "#0a0718", mid: "#1c1436", low: "#2c2a52", hor: "#3d4a6a", glowAt: [600, 120], glowA: 0.15 });
    const sa = PL.storm2("s5a", { seed: 21, rx: 760, ry: 330, swirl: 2.2, arms: 6, inner: 0.2 }), sb = PL.storm2("s5b", { seed: 24, rx: 520, ry: 240, swirl: 1.8, inner: 0.25 });
    layerImg(g, sa.c, cam, [0.3, 0.3], -700 - sa.cx, -480 - sa.cy); layerImg(g, sa.c, cam, [0.3, 0.3], 900 - sa.cx, -420 - sa.cy, { scale: 0.9 });
    layerImg(g, sb.c, cam, [0.55, 0.5], 300 - sb.cx, 520 - sb.cy); layerImg(g, sb.c, cam, [0.55, 0.5], 1500 - sb.cx, 600 - sb.cy);
    const low = PL.clouds("s5low", { seed: 29, w: 4200, hgt: 120, d: 0.55, under: 400, skyCol: "#2a2a4a" });
    layerImg(g, low.c, cam, [0.7, 0.7], -1600, 460 - low.top);
    // 細く途切れがちな気流
    const xs = []; for (let x = Math.floor((cam.x - 1600) / 300) * 300; x <= cam.x + 1800; x += 300) xs.push([x, 330 + 60 * Math.sin(x / 400)]);
    g.save(); camApply(g, cam, 1); stream(g, streamPath(xs, 12), { width: 26, flow: t * 1100, seed: 8, taper: [1, 1], streaks: 40, a: 0.55 + 0.3 * Math.sin(t * 13) * 0.3 }); g.restore();
    // 嵐の腕: 左上から(429 予兆・435 被弾)、右上から(455 の二撃目で払う)
    const lit1 = f < 429 ? 0 : f < 435 ? K2.P(f, 429, 435) : Math.max(0, 1 - (f - 435) / 10);
    g.save(); camApply(g, { ...cam, x: 0, y: 0 }, 0); // 画面座標(カメラの揺れ・傾きだけ受ける)
    g.translate(-960, -540);
    tendril(g, [-120, -220], 0.85 + 0.1 * Math.sin(t * 1.7), 1250, t, { width: 280, lit: lit1, seed: 3 + Math.floor(f / 2) });
    const sweep = f < 448 ? 0 : eIOs(K2.P(f, 448, 456)) * (1 - eIOs(K2.P(f, 460, 476)));
    tendril(g, [2150, -160], 2.4 - 0.5 * sweep + 0.06 * Math.sin(t * 2), 1000 + 350 * sweep, t + 1, { width: 300, lit: sweep > 0.8 && f < 459 ? 0.8 : 0, seed: 9, amp: 0.25 });
    g.restore();
    // 精: 被弾で左下へ飛ばされ、二撃目で1回転、467 で沈み、487 から持ち直す
    const knock = f < 435 ? 0 : eOut(K2.P(f, 435, 441)) * (1 - eIOs(K2.P(f, 445, 470)));
    const sink = eIOs(K2.P(f, 456, 467)) * (1 - eIOs(K2.P(f, 487, 500))), rise = eIOs(K2.P(f, 494, 506));
    let px = 880 - 90 * knock + 260 * rise, py = 520 + 50 * knock + 110 * sink - 60 * rise + 10 * Math.sin(t * 5);
    const hurt = f >= 435 && f < 452 ? 1 - K2.P(f, 446, 452) : f >= 455 && f < 490 ? 1 - K2.P(f, 484, 490) : 0;
    const pose = SPIRIT2.poseMix(f < 429 ? "fly" : "dodge", "hurt", hurt); if (f >= 429 && f < 435) pose.expr = 1; if (f >= 487) pose.expr = 0;
    const lum = keys(f, [[420, 1], [434, 1], [436, 0.75], [455, 0.7], [467, 0.32], [487, 0.32], [495, 1.2], [506, 1.1]], eIOs);
    const [spx, spy] = [px, py];
    SPIRIT2.draw(g, spx, spy, 2.25, -0.05 + 0.45 * knock + spin, pose, { t, lum, crack: f >= 435 ? 1 : 0, rim: f >= 429 && f < 440 ? "#bfeeff" : null, smear: f >= 455 && f < 466 ? [-60, 40] : f >= 496 ? [-120 * rise, 30] : null, tailLen: 1 + 0.6 * rise });
    // 435 の着弾(小包)と破片、455 の打撃点、487 の立て直しの輪
    if (f >= 435 && f < 452) { const dt = (f - 435) / 30, pq = [spx + 20, spy + 140]; burst(g, pq[0], pq[1], dt, { scale: 1.4, ring: "#dff7ff", lines: ["#bfeeff", "#ffffff"], dots: ["#9fd8ff", "#ffb347"] }); for (let k = 0; k < 3; k++) { const a = -2.2 + k * 0.5, d = 60 + 900 * dt, x = pq[0] + Math.cos(a) * d, y = pq[1] + Math.sin(a) * d + 900 * dt * dt; g.save(); g.translate(x, y); g.rotate(dt * 12 + k); g.fillStyle = "#a8744a"; g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(-14, -10); g.lineTo(16, -6); g.lineTo(2, 14); g.closePath(); g.fill(); g.stroke(); g.restore(); } }
    if (f >= 435 && f <= 438) { const [bx0, by0] = [380 + cam.sx, 210 + cam.sy]; W.bolt(g, bx0, by0, spx + 20, spy + 130, { seed: 61 + (f - 435), width: 10, branches: 5, rough: 0.2, a: [1, 0.85, 0.5, 0.25][f - 435] }); }
    if (f >= 455 && f < 470) burst(g, spx + 70, spy - 60, (f - 455) / 30, { scale: 1.2, ring: "#c9b8ff", lines: ["#8d7cc2", "#ffffff"], dots: ["#6a5aa8", "#dff7ff"] });
    if (f >= 487 && f < 506) { const dt = (f - 487) / 30; g.save(); g.strokeStyle = css(C.amberHot, 0.8 * (1 - dt / 0.63)); g.lineWidth = 10 * (1 - dt / 0.63) + 2; g.beginPath(); g.arc(spx, spy, 110 + 420 * eOut5(dt / 0.63), 0, 7); g.stroke(); g.restore(); glow(g, spx, spy, 500, C.amber, 0.35 * (1 - dt / 0.63)); }
    rain(g, f, { n: 150, seed: 33, a: 0.2, ang: 2.1, speed: 3000, len: [60, 200] });
    motes(g, f, { n: 26, seed: 46, ox: cam.x * 1.3, oy: 0, size: [2, 6], a: 0.3, col: "#c9b8ff" });
    const dark = keys(f, [[420, 0.05], [455, 0.12], [467, 0.42], [487, 0.36], [497, 0.05]], eIOs);
    return {
      exposure: { 436: 0.45, 437: 0.22, 438: 0.1, 455: 0.25, 456: 0.1, 487: 0.18, 488: 0.08 }[f] || 0,
      chroma: f >= 436 && f < 442 ? 14 * (1 - (f - 436) / 6) : f >= 455 && f < 458 ? 8 : 0,
      grade: { sat: 0.85 - 0.35 * (dark > 0.3 ? (dark - 0.05) : 0), tint: ["#3a3070", 0.25, "soft-light"], dark },
      bloom: { a: 0.55, a2: 0.35 },
      post: f === 435 ? (q, c) => impactFrame(q, c, "#140a3c", "#bff4ff", { inv: false }) : null,
      overlay: (o) => {
        HUD2.draw(o, f, { shake: [sx1, sy1] });
        HUD2.pop(o, 1250, 330, "NEAR MISS", "+150  ×7", f, 409, { size: 92, hold: 14, out: 6, subSize: 0.55 });
      },
    };
  };
  FILM2.reg(S5);

  // ======================= S6 再挑戦: 嵐の目をめぐる門(507〜609) =======================
  // FPV(#035)で渦の奥(消失点)へ。門は奥から近づき、ちょうどアクセントのコマに精を囲んで通り過ぎる(#176 のくぐり抜け)。
  // 読ませる数字は出さず、渦の目のまわりの「4つの灯」が1つずつ点く(何個通ったかが形で分かる)。591 で4つそろい、目が開く。
  const S6 = { id: "S6", a: 507, b: 610 };
  const GATES = [539, 559, 578, 591], VP = [1150, 450];
  function sp6(f) { const t = f / 30, open = eIn(K2.P(f, 591, 610)); return [lerp(800 + 30 * Math.sin(t * 2.3), 1040, open), lerp(650 + 26 * Math.sin(t * 3.1 + 1), 510, open), lerp(1.65, 1.15, open)]; }
  S6.draw = (g, f) => {
    const t = f / 30, open = eIn(K2.P(f, 591, 610));
    const r = keys(f, [[507, 0.12], [536, -0.13], [556, 0.13], [575, -0.11], [589, 0.08], [609, 0.0]], eIOs);
    let punch = 0; for (const gf of GATES) if (f >= gf) punch += 0.05 * Math.max(0, decay((f - gf) / 30, 12, 9));
    const zc = 1 + punch + 0.35 * open; // 渦の目へ寄る(消失点を中心に)
    g.save(); g.translate(960, 540); g.rotate(r); g.translate(-960, -540);
    g.translate(VP[0], VP[1]); g.scale(zc, zc); g.translate(-VP[0], -VP[1]);
    g.fillStyle = "#07051a"; g.fillRect(-800, -800, 3520, 2680);
    // 渦: 3枚の嵐の層が奥から手前へ広がり続ける(無限のトンネル)。回る向きと速さを層ごとに変える
    const vs = PL.storm2("s6v", { seed: 31, rx: 900, ry: 900, swirl: 3.2, arms: 7, inner: 0.6 });
    for (let i = 0; i < 4; i++) {
      const k = K2.mod(t * 0.42 + i / 4, 1), sc = 0.25 * Math.exp(2.6 * k), a = Math.min(1, k * 4) * (1 - K2.P(k, 0.8, 1));
      g.save(); g.globalAlpha = a; g.translate(VP[0], VP[1]); g.rotate(t * (0.5 + 0.2 * i) * (i % 2 ? -1 : 1) + i); g.scale(sc, sc * 0.82); g.drawImage(vs.c, -vs.cx, -vs.cy); g.restore();
    }
    // 渦の帯(対数螺旋の太い帯が回る。縁に藤色の光)
    for (let b = 0; b < 7; b++) {
      const pts = [], rot0 = b * 0.8976 + t * 0.9 * (1 + 0.04 * b); for (let k = 0; k <= 26; k++) { const th = k * 0.22, rr = 60 * Math.exp(0.21 * th) * (1 + 0.05 * b); pts.push([VP[0] + Math.cos(th + rot0) * rr * 1.25, VP[1] + Math.sin(th + rot0) * rr * 0.95]); }
      const smp = P.sampleSpline(pts, 6), wd = (u) => 30 + 520 * u * u;
      g.save(); g.globalAlpha = 0.75; P.ribbonPath(g, smp, wd); const bg = g.createRadialGradient(VP[0], VP[1], 40, VP[0], VP[1], 1600); bg.addColorStop(0, "#4a3a8a"); bg.addColorStop(0.4, "#2a1d52"); bg.addColorStop(1, "#120b26"); g.fillStyle = bg; g.fill();
      g.strokeStyle = "rgba(170,160,230,0.35)"; g.lineWidth = 3; g.stroke(); g.restore();
    }
    // 目(消失点): 4つの灯で閉じている。門を通るたびに1つ点く
    const eyeR = 70 + 230 * open + 6 * Math.sin(t * 8);
    glow(g, VP[0], VP[1], Math.min(eyeR * 4, 520), "#7f9cff", 0.32 + 0.1 * open); glow(g, VP[0], VP[1], eyeR * 1.3, "#dff7ff", 0.5 + 0.15 * open);
    g.save(); g.fillStyle = css(mix("#cfe9ff", "#ffffff", open), 0.9); g.beginPath(); g.arc(VP[0], VP[1], eyeR * 0.55, 0, 7); g.fill(); g.restore();
    GATES.forEach((gf, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 2 + t * 0.6, rr = 170 + 60 * open, x = VP[0] + Math.cos(a) * rr, y = VP[1] + Math.sin(a) * rr, on = f >= gf, dt = (f - gf) / 30;
      g.save(); g.fillStyle = on ? css(C.amberHot) : "#1a2a44"; g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); g.stroke(); if (!on) { g.strokeStyle = "rgba(160,220,255,0.85)"; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 18, 0, 7); g.stroke(); } g.restore();
      if (on) { glow(g, x, y, 120 + 200 * Math.max(0, 1 - dt / 0.4), C.amber, 0.7); if (dt < 0.5) { g.save(); g.strokeStyle = css(C.amberHot, 1 - dt / 0.5); g.lineWidth = 6; g.beginPath(); g.arc(x, y, 30 + 140 * eOut(dt / 0.5), 0, 7); g.stroke(); g.restore(); } }
    });
    // 光の気流: 手前から渦の目へ巻き込む螺旋
    const sp = sp6(f), spiral = []; for (let k = 0; k <= 60; k++) { const u = k / 60, ang = Math.atan2(sp[1] - VP[1], sp[0] - VP[0]) - u * 5.5 - 0.6 + Math.sin(t) * 0.1, rad = Math.hypot(sp[0] - VP[0], sp[1] - VP[1]) * 1.6 * Math.pow(1 - u, 1.6) + 10; spiral.push([VP[0] + Math.cos(ang) * rad * 1.15, VP[1] + Math.sin(ang) * rad * 0.85 + 60 * (1 - u)]); }
    stream(g, streamPath(spiral, 6), { width: 70, flow: t * 1800, seed: 5, taper: [1, 0.1], streaks: 90, dir: -1 });
    W.speedLines(g, { n: 70, seed: 21 + (f % 3), cx: VP[0], cy: VP[1], r0: 280, r1: 1700, a: 0.22 + 0.2 * open, col: "#dff3ff" });
    // 門: 奥から近づき、アクセントのコマで精を囲む。通過後は一気に広がって消える
    const gateDraw = (gf, i) => {
      const d = (gf - f) / 30; if (d > 1.4 || d < -0.25) return;
      const sc = d >= 0 ? 1 / (1 + 3.4 * d) : 1 + 9 * -d, a = d >= 0 ? Math.min(1, (1.4 - d) * 2.5) : 1 - -d / 0.25;
      const cx = lerp(VP[0], sp[0], Math.min(1, sc)) + (d < 0 ? (sp[0] - VP[0]) * (sc - 1) * 0.3 : 0), cy = lerp(VP[1], sp[1], Math.min(1, sc)) + (d < 0 ? (sp[1] - VP[1]) * (sc - 1) * 0.3 : 0);
      const R = 300 * sc, hot = d < 0 ? 1 : Math.max(0, 1 - d / 0.08);
      g.save(); g.globalAlpha = a; g.translate(cx, cy); g.rotate(t * 0.8 + i);
      g.strokeStyle = C.ink; g.lineWidth = 30 * sc; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
      g.strokeStyle = css(mix(C.amber, "#ffffff", hot)); g.lineWidth = 20 * sc; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
      g.strokeStyle = css(C.amberHot, 0.9); g.lineWidth = 6 * sc; g.beginPath(); g.arc(0, 0, R * 0.86, 0, 7); g.stroke();
      for (let k = 0; k < 8; k++) { const aa = (k / 8) * 6.283; g.save(); g.rotate(aa); g.fillStyle = css(C.amberHot); g.strokeStyle = C.ink; g.lineWidth = 4 * sc; g.beginPath(); g.moveTo(R - 26 * sc, 0); g.lineTo(R, -16 * sc); g.lineTo(R + 26 * sc, 0); g.lineTo(R, 16 * sc); g.closePath(); g.fill(); g.stroke(); g.restore(); }
      g.restore();
      glow(g, cx, cy, R * 1.5, C.amber, 0.25 * a + 0.4 * hot);
    };
    // 奥の門(まだ精より奥)→ 精 → 手前を通り過ぎた門
    GATES.forEach((gf, i) => { if (f < gf) gateDraw(gf, i); });
    const pose = SPIRIT2.poseMix("fly", "dodge", 0.25 + 0.15 * Math.sin(t * 3));
    SPIRIT2.draw(g, sp[0], sp[1], sp[2], -0.32 + 0.1 * Math.sin(t * 2.3), pose, { t, tailLen: 1.5, lift: 0.4 });
    GATES.forEach((gf, i) => { if (f >= gf) gateDraw(gf, i); if (f >= gf && f < gf + 20) burst(g, sp[0], sp[1], (f - gf) / 30, { scale: 1.35 }); });
    g.restore();
    motes(g, f, { n: 40, seed: 52, ox: t * 900, oy: t * 300, streak: 90, ang: Math.atan2(540 - VP[1], 960 - VP[0]), size: [2, 7], a: 0.45 });
    const cut = f < 509 ? [0.12, 0.05][f - 507] : 0;
    return {
      zoomBlur: [0.05 + 0.1 * open + (cut || 0), VP[0], VP[1]], exposure: f === 507 ? 0.2 : 0,
      grade: { tint: ["#4a3a90", 0.2, "soft-light"] }, bloom: { a: 0.6, a2: 0.4 },
      overlay: (o) => HUD2.draw(o, f),
    };
  };
  FILM2.reg(S6);

  // ======================= S7 山場(610〜722) =======================
  // 610 PERFECT: ヒットストップ(#040 の考え方。世界の時計 w を HS コマ止め、UI と音ハメの事象は表示のコマ f で決める)。
  //   止めたコマ: 610 は衝撃のコマ(藍と琥珀の2色。白い板を重ねない)、611 は止まった絵。612〜614 は 0.3 倍の溜め、615 から 2.4 倍で一気に流れる(#038)。
  // 617/624/630/637/643: 光の輪を5つくぐり、STREAK の大きな数字が ×8→×12(#007: 途中は流れ、最後の ×12 で止まって色が変わり大きく弾む)。643 で空が一段明るくなる(閃光ではなく、明るさが残る)。
  // 682 灯台島が見えて窓が灯る → 696 小包を差し出す → 702 灯室へ → DELIVERED → 712〜722 灯りを吸い込む(次の点火の予備動作)。
  const S7 = { id: "S7", a: 610, b: 723 };
  let w7 = null;
  const HS = () => (typeof window !== "undefined" && window.HS) || 2;
  S7.init = () => { w7 = {}; let w = 0; const hs = HS(); for (let f = 610; f <= 723; f++) { if (f >= 610 + hs) { const rate = f < 615 ? 0.3 : f < 696 ? 1 + 1.4 * Math.exp(-(f - 615) / 8) : lerp(1, 0.35, eIOs(K2.P(f, 696, 712))); w += rate / 30; } w7[f] = w; } };
  const STRK = [617, 624, 630, 637, 643];
  S7.draw = (g, f) => {
    if (!w7 || w7.hs !== HS()) { S7.init(); w7.hs = HS(); }
    const w = w7[f], t = 20.333 + w, frozen = f < 610 + HS();
    const lift = eOut(K2.P(f, 643, 650));
    const push = eIOs(K2.P(f, 700, 723)), lhx = keys(f, [[676, 2150], [682, 1760], [696, 1420], [722, 1260]], eIOs), lhy = 720, lhs = keys(f, [[676, 0.7], [696, 0.95], [722, 1.15]], eIOs);
    const lampP = [lhx, lhy - 260 * 0.875 * lhs];
    const zc = 1 + 0.5 * push, [zx, zy] = lampP;
    const [shx, shy, shr] = impactShake((f - 610) / 30, 0.7);
    const cam = { x: 1400 * w, y: -60 * Math.sin(w * 0.8), z: 1, r: -0.06 + 0.03 * Math.sin(w * 1.3) + shr, sx: shx, sy: shy };
    g.save(); g.translate(zx, zy); g.scale(zc, zc); g.translate(-zx, -zy);
    sky(g, cam, { top: css(mix("#0b1730", "#13284a", lift)), mid: css(mix("#1c3c62", "#2a5680", lift)), low: css(mix("#3a7a8a", "#5a9aa0", lift)), hor: css(mix("#6aa8a0", "#9ccab8", lift)), glowAt: [1500, 200], glowA: 0.35 + 0.15 * lift });
    g.save(); camApply(g, cam, 0.02); g.drawImage(PL.stars("s7", 2800, 1500, { n: 700, seed: 18 }), -1400, -1000); g.restore();
    moonAt(g, cam, [0.02, 0.04], 560, -330, 78);
    // 空の光の帯(琥珀のオーロラ。643 から強く)
    g.save(); g.globalCompositeOperation = "lighter"; for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 8; i++) pts.push([i * 300 - 200 - K2.mod(cam.x * 0.05, 300), 180 + k * 90 + 60 * Math.sin(i * 0.9 + w * 1.2 + k)]); P.ribbonPath(g, P.sampleSpline(pts, 8), () => 70 - k * 15); g.fillStyle = css(k === 1 ? "#7fd6c8" : C.amber, (0.06 + 0.1 * lift) * (k === 1 ? 0.8 : 1)); g.filter = "blur(18px)"; g.fill(); g.filter = "none"; } g.restore();
    const far = PL.clouds("s7far", { seed: 41, w: 4600, hgt: 90, d: 0.85, under: 520 });
    layerImg(g, far.c, cam, [0.1, 0.12], -1700, 380 - far.top);
    const isl = [["s7a", 43, 220, 0.8, 1300, 300], ["s7b", 45, 280, 0.78, 2500, 330], ["s7c", 42, 200, 0.82, 3600, 280]];
    for (const [nm, sd, wd, d, x, y] of isl) { const I = PL.island(nm, { seed: sd, w: wd, d, lamp: 1 }); layerImg(g, I.c, cam, [0.2, 0.2], x - I.cx, y - I.top); }
    // 後ろへ遠ざかる嵐の渦(610 で精の真後ろ → 縮んで左下へ)
    const vs = PL.storm2("s6v", { seed: 31, rx: 900, ry: 900, swirl: 3.2, arms: 7, inner: 0.6 }), rec = eOut(clamp(w / 1.6));
    g.save(); g.translate(lerp(720, -100, rec), lerp(560, 760, rec)); g.rotate(w * 0.8); const vsc = lerp(1.6, 0.45, rec); g.scale(vsc, vsc * 0.85); g.globalAlpha = 1 - 0.5 * rec; g.drawImage(vs.c, -vs.cx, -vs.cy); g.restore();
    glow(g, lerp(720, -100, rec), lerp(560, 760, rec), 700 * (1 - 0.6 * rec), "#9fd8ff", 0.6 * (1 - rec));
    const mid = PL.clouds("s7mid", { seed: 47, w: 4600, hgt: 160, d: 0.5, under: 500, warm: 0.15, warmAt: [2300, 40, 1400] });
    layerImg(g, mid.c, cam, [0.45, 0.4], -1200, 640 - mid.top); layerImg(g, mid.c, cam, [0.45, 0.4], 3300, 640 - mid.top);
    // 灯台島(682 から)
    if (f >= 676) {
      const I = PL.island("s7lh", { seed: 33, w: 380, d: 0.25, lamp: 0 }), L = PL.lighthouse("s7lh", { h: 260, lit: 0, d: 0.2 });
      g.save(); g.translate(lhx, lhy); g.scale(lhs, lhs); g.drawImage(L.c, -L.ox, -L.oy + 6); g.drawImage(I.c, -I.cx, -I.top); g.restore();
      if (f >= 682) { const k = K2.P(f, 682, 686); glow(g, lhx, lhy - 260 * 0.42 * lhs, 70 * lhs, C.amber, 0.7 * k); g.save(); g.fillStyle = css(C.amberHot, k); g.fillRect(lhx - 5 * lhs, lhy - 260 * 0.45 * lhs, 10 * lhs, 13 * lhs); g.restore(); }
      const suck = eIn(K2.P(f, 704, 723)); glow(g, lampP[0], lampP[1], 110 + 200 * suck, C.amber, 0.3 + 0.35 * suck); glow(g, lampP[0], lampP[1], 30 + 60 * suck, "#fff6dc", 0.5 + 0.4 * suck);
    }
    // STREAK の光の輪(615 から右から流れてきて、アクセントのコマで精が通る)
    const spx0 = 720, spy0 = 560;
    const appr = eIOs(K2.P(f, 690, 702)), spx = lerp(spx0, lampP[0] - 120 * lhs, appr), spy = lerp(spy0 + 14 * Math.sin(w * 5), lampP[1] + 40 * lhs, appr);
    STRK.forEach((sf, i) => {
      if (f < 612 || f >= sf + 14) return; const x = spx0 + 46 * (sf - f) + 40, y = spy0 - 30 - 18 * Math.sin(i * 1.7), a = Math.min(1, (f - 612) / 4);
      if (f < sf) { g.save(); g.globalAlpha = a; g.strokeStyle = C.ink; g.lineWidth = 16; g.beginPath(); g.ellipse(x, y, 60, 120, 0, 0, 7); g.stroke(); g.strokeStyle = css(C.amberHot); g.lineWidth = 9; g.stroke(); g.restore(); glow(g, x, y, 200, C.amber, 0.4 * a); }
      else burst(g, spx0 + 30, spy0, (f - sf) / 30, { scale: 1.2 + 0.25 * i, ring: i === 4 ? "#ffffff" : "#fff1c9" });
    });
    // 精
    const pose = f >= 690 ? SPIRIT2.poseMix("fly", "offer", eIOs(K2.P(f, 696, 704))) : frozen ? SPIRIT2.poseMix("dodge", "offer", 0.5) : SPIRIT2.poseMix("fly", "dodge", 0.25 * Math.max(0, Math.sin(w * 4)));
    if (frozen || (f >= 610 && f < 660)) pose.expr = 2;
    SPIRIT2.draw(g, spx, spy, 1.7, -0.22 * (1 - appr) + 0.05 * appr, pose, { t, tailLen: f < 696 ? 1.6 : 1.0, lum: 1.15 + 0.2 * lift, noParcel: f >= 708, smear: f >= 615 && f < 625 ? [-160, 30] : null });
    if (f >= 702 && f < 712) { const k = eIn(K2.P(f, 702, 711)), bx = lerp(spx + 60, lampP[0], k), by = lerp(spy + 90, lampP[1], k); g.save(); g.translate(bx, by); g.scale(1 - 0.8 * k, 1 - 0.8 * k); g.fillStyle = "#b07a4a"; g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.roundRect(-30, -26, 60, 52, 7); g.fill(); g.stroke(); g.restore(); glow(g, bx, by, 90, C.amber, 0.6 * k); }
    // 610 の白い輪(はじけ)と放射線
    if (f >= 610 && f < 640) { const dt = f < 610 + HS() ? 0.05 : (f - 610) / 30; burst(g, spx0, spy0, dt, { scale: 2.6, ring: "#e8fbff", lines: ["#bfeeff", "#ffd894"], dots: ["#ffb347", "#dff7ff"] }); }
    if (f >= 615 && f < 640) W.speedLines(g, { n: 110, seed: 30 + (f % 4), cx: spx0, cy: spy0, r0: 240, r1: 1700, a: 0.4 * (1 - K2.P(f, 615, 640)), col: "#fff1d6" });
    if (frozen) W.speedLines(g, { n: 80, seed: 30, cx: spx0, cy: spy0, r0: 260, r1: 1600, a: 0.35, col: "#e8fbff" });
    motes(g, 610 + Math.round(w * 30), { n: 50, seed: 77, ox: cam.x * 1.4, oy: 0, streak: frozen ? 0 : 60 + 120 * Math.max(0, 1 - (f - 615) / 30), ang: -0.1, size: [2, 8], a: 0.5 });
    if (f >= 704) { const r = rng(91); for (let i = 0; i < 30; i++) { const a = r() * 6.28, ph = K2.mod((f - 704) / 14 + r(), 1), d = (200 + r() * 700) * (1 - eIn(ph)); glow(g, lampP[0] + Math.cos(a) * d, lampP[1] + Math.sin(a) * d * 0.7, 14, C.amberHot, 0.7 * Math.sin(ph * Math.PI)); } }
    g.restore();
    const rel = f >= 615 && f < 623 ? 0.16 * (1 - (f - 615) / 8) : 0;
    return {
      post: f === 610 ? (q, c) => impactFrame(q, c, "#1b0d3e", "#ffd38a", { inv: false }) : null,
      zoomBlur: rel > 0 ? [rel, spx0, spy0] : null, exposure: f === 643 ? 0.3 : f === 644 ? 0.12 : 0,
      grade: { tint: ["#ffb060", 0.08 + 0.08 * lift, "soft-light"], dark: 0.5 * eIOs(K2.P(f, 704, 723)) }, bloom: { a: 0.6 + 0.1 * lift - 0.25 * K2.P(f, 704, 723), a2: 0.4 - 0.2 * K2.P(f, 704, 723) },
      overlay: (o) => {
        HUD2.draw(o, f, { shake: [shx, shy], hideStreak: f >= 612 && f < 700 });
        // PERFECT(叩きつけて着地 → 652 まで静止 → 上へ抜ける)と +800
        HUD2.pop(o, 900, 250, "PERFECT", "+800", f, 610, { size: 128, hold: 42, out: 7, slam: true, rot: -0.05, subSize: 0.46 });
        // STREAK の大きな数字(617 で出る → 643 の ×12 で止まって弾む → 688〜700 で隅の HUD へ縮む)
        if (f >= 617 && f < 700) {
          const [n, at] = HUD2.streakAt(f), dt = (f - at) / 30, fin = n === 12, mv = eIOs(K2.P(f, 688, 700));
          const x = lerp(1560, 1830, mv), y = lerp(560, 230, mv), sc = lerp(1, 0.36, mv) * spring((f - 617) / 30, 15, 6.5) * (1 + (fin ? 0.32 : 0.16) * decay(dt, 15, 7));
          o.save(); o.translate(x, y); o.scale(sc, sc); o.globalAlpha = 1 - 0.6 * mv;
          glow(o, 0, -40, 320, C.amber, 0.25 + (fin ? 0.25 * Math.exp(-dt * 3) : 0));
          HUD.text(o, "STREAK", 0, -150, { size: 40, col: "#dff3f6", align: "center", track: 6, stroke: 8 });
          o.save(); o.font = "400 170px HUD"; o.textAlign = "center"; o.lineJoin = "round"; o.strokeStyle = C.ink; o.lineWidth = 34; o.strokeText("×" + n, 0, 30); o.fillStyle = fin ? css(mix("#ffffff", C.amberHot, K2.P(f, 643, 649))) : "#ffffff"; o.fillText("×" + n, 0, 30); o.restore();
          o.restore();
        }
        HUD2.pop(o, 960, 190, "DELIVERED", null, f, 703, { size: 120, hold: 30, out: 0, slam: true, rot: 0 });
      },
    };
  };
  FILM2.reg(S7);

  // ======================= S8 点火・ロゴ(723〜899) =======================
  // 723: 灯台の点火(灯室の光+回る光の帯+雲の上を広がる光の波。局所の光で、画面全体は白くしない)と、ロゴの着地(拡大 1.12→1 とぼかし→0、揺れは小 #024×0.45)。
  // 光の波が通った島から順に灯り、航路の光が島をつなぐ(#004 の線を引く)。スウッシュは左から右へ描かれ、その先端に精が乗って、最後は先端に留まる(主役を最後まで)。
  // 760〜840 主張2(1字ずつ、ぼかしから)。810〜900 架空の注記(2行、読める大きさ)。738 から 2% のゆっくりした寄り。
  const S8 = { id: "S8", a: 723, b: 900 };
  const LOGO_C = [960, 392], LOGO_W = 1240, LH = [300, 1000];
  const ISL8 = [[700, 742, 140, 42], [1010, 712, 170, 43], [1300, 752, 130, 44], [1580, 700, 190, 45], [1850, 744, 120, 46], [90, 700, 120, 41]];
  let logo8 = null;
  function logoPlates() {
    if (logo8) return logo8;
    const A = plate("logoA", 1920, 1080, (g) => LOGO.draw(g, LOGO_C[0], LOGO_C[1], LOGO_W, { swoosh: 0 }));
    let geo = null; const B = plate("logoB", 1920, 1080, (g) => { geo = LOGO.draw(g, LOGO_C[0], LOGO_C[1], LOGO_W, { swoosh: 1 }); });
    const M = plate("logoMask", 1920, 1080, (g) => { g.drawImage(B, 0, 0); });
    logo8 = { A, B, M, geo }; return logo8;
  }
  S8.init = () => logoPlates();
  S8.draw = (g, f) => {
    const t = f / 30, L = logoPlates(), d = (f - 723) / 30;
    const [shx, shy, shr] = impactShake(d, 0.45), push = 1 + 0.02 * eIOs(K2.P(f, 738, 900));
    const cam = { x: 0, y: 0, z: 1, r: shr * 0.5, sx: shx, sy: shy };
    g.save(); g.translate(960 + shx, 540 + shy); g.scale(push, push); g.rotate(shr * 0.5); g.translate(-960, -540);
    sky(g, { x: 0, y: 0, z: 1, r: 0 }, { glowAt: [1560, 190], glowA: 0.3 });
    g.save(); g.globalAlpha = 0.9; g.drawImage(PL.stars("s8", 2000, 1100, { n: 560, seed: 5, maxY: 0.75 }), -40, -10); g.restore();
    for (let i = 0; i < 14; i++) { const x = hash(i, 3) * 1920, y = hash(i, 5) * 600, tw = 0.5 + 0.5 * Math.sin(t * (2 + hash(i, 7) * 3) + i); glow(g, x, y, 10, "#dff0ff", 0.5 * tw); }
    W.moon(g, 1590, 170, 50);
    const far = PL.clouds("s8far", { seed: 2, w: 2400, hgt: 60, d: 0.95, under: 420 });
    g.drawImage(far.c, -240, 770 - far.top);
    // 光の波(灯台から雲の面を広がる楕円)。波が通った島から灯る
    const waveR = d < 0 ? 0 : 2200 * eOut(clamp(d / 1.6));
    ISL8.forEach(([x, y, w, sd], i) => {
      const lit = clamp((waveR - Math.hypot(x - LH[0], (y - LH[1]) * 3)) / 160);
      const I0 = PL.island("s8i" + i + "_0", { seed: sd, w, d: 0.82, lamp: 0, falls: false }), I1 = PL.island("s8i" + i + "_1", { seed: sd, w, d: 0.82, lamp: 1, falls: false });
      g.drawImage(I0.c, x - I0.cx, y - I0.top); if (lit > 0) { g.save(); g.globalAlpha = lit; g.drawImage(I1.c, x - I1.cx, y - I1.top); g.restore(); glow(g, x, y - w * 0.1, 90, C.amber, 0.45 * lit); }
    });
    if (waveR > 0 && waveR < 2200) { g.save(); g.translate(LH[0], LH[1] - 250); g.scale(1, 0.18); const k = 1 - waveR / 2200; g.strokeStyle = css(C.amberHot, 0.7 * k); g.lineWidth = 26 * k + 4; g.beginPath(); g.arc(0, 0, waveR, 0, 7); g.stroke(); g.globalCompositeOperation = "lighter"; g.strokeStyle = css(C.amber, 0.3 * k); g.lineWidth = 120 * k; g.stroke(); g.restore(); }
    // 航路の光: 灯台 → 島々をつなぐ点線が順に引かれる(#004)
    const nodes = [[LH[0], LH[1] - 270], ...ISL8.slice(0, 5).map(([x, y, w]) => [x, y - w * 0.12])];
    const route = P.sampleSpline(nodes, 16), RL = route[route.length - 1][2], drawn = RL * eIO(K2.P(f, 742, 808));
    if (drawn > 0) {
      g.save(); g.lineCap = "round"; g.beginPath(); let started = false; for (const p of route) { if (p[2] > drawn) break; started ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); started = true; }
      g.strokeStyle = css(C.amber, 0.35); g.lineWidth = 10; g.filter = "blur(4px)"; g.stroke(); g.filter = "none"; g.strokeStyle = css(C.amberHot, 0.9); g.lineWidth = 3; g.setLineDash([3, 11]); g.lineDashOffset = -t * 40; g.stroke(); g.setLineDash([]); g.restore();
      const [hx, hy] = along(route, drawn); if (drawn < RL) { glow(g, hx, hy, 40, C.amberHot, 0.9); }
    }
    const mid = PL.clouds("s8mid", { seed: 7, w: 2400, hgt: 90, d: 0.55, under: 200, warm: 0.3, warmAt: [400, 0, 900] });
    g.drawImage(mid.c, -240, 1010 - mid.top);
    // 灯台(左下)。723 で点火
    const ign = f >= 723 ? 1 : 0, Lt = PL.lighthouse("s8lh", { h: 300, lit: 1, d: 0.15 }), Is = PL.island("s8lh", { seed: 33, w: 420, d: 0.3, lamp: 1, falls: false });
    g.drawImage(Lt.c, LH[0] - Lt.ox, LH[1] - Lt.oy + 8); g.drawImage(Is.c, LH[0] - Is.cx, LH[1] - Is.top);
    const lamp = [LH[0], LH[1] - Lt.lampY], fl = 1 + 0.6 * Math.exp(-d * 4);
    // 回る光の帯(2本)
    g.save(); g.globalCompositeOperation = "lighter"; for (const k of [0, Math.PI]) { const a = -0.25 + 0.5 * Math.sin(t * 0.9 + k); const gr = g.createLinearGradient(lamp[0], lamp[1], lamp[0] + Math.cos(a) * 1500, lamp[1] + Math.sin(a) * 1500); gr.addColorStop(0, css(C.amberHot, 0.32 * fl)); gr.addColorStop(1, css(C.amber, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(lamp[0], lamp[1]); g.lineTo(lamp[0] + Math.cos(a - 0.06) * 1500, lamp[1] + Math.sin(a - 0.06) * 1500); g.lineTo(lamp[0] + Math.cos(a + 0.06) * 1500, lamp[1] + Math.sin(a + 0.06) * 1500); g.closePath(); g.fill(); } g.restore();
    glow(g, lamp[0], lamp[1], 260 * fl, C.amber, 0.55); glow(g, lamp[0], lamp[1], 70 * fl, "#fffaf0", 0.95);
    if (d < 0.6) burst(g, lamp[0], lamp[1], d, { scale: 1.6 });
    // ロゴの後ろを少し沈める(読みやすさ)
    { const q = g.createRadialGradient(960, 420, 100, 960, 420, 900); q.addColorStop(0, "rgba(6,10,22,0.5)"); q.addColorStop(1, "rgba(6,10,22,0)"); g.fillStyle = q; g.fillRect(0, 0, 1920, 1080); }
    // ロゴ: 着地(723〜)。スウッシュは左から右へ描かれる(728〜770)。光の帯が字の上を通る(792〜822 #022)
    const land = 1 + 0.12 * Math.max(0, decay(d, 12, 8)) * (d < 0.05 ? 1 : 1), bl = Math.max(0, 8 * (1 - d / 0.2));
    const swX = keys(f, [[728, LOGO_C[0] - LOGO_W * 0.62], [772, LOGO_C[0] + LOGO_W * 0.62]], eIOs);
    glow(g, LOGO_C[0], LOGO_C[1], 900, C.amber, 0.2 * Math.exp(-d * 2) + 0.06);
    g.save(); g.translate(LOGO_C[0], LOGO_C[1]); g.scale(land, land); g.translate(-LOGO_C[0], -LOGO_C[1]); if (bl > 0.3) g.filter = `blur(${bl}px)`;
    g.drawImage(L.A, 0, 0); g.filter = "none";
    if (f >= 728) { g.save(); g.beginPath(); g.rect(0, 0, swX, 1080); g.clip(); g.drawImage(L.B, 0, 0); g.restore(); }
    g.restore();
    const sw = K2.P(f, 792, 822); if (sw > 0 && sw < 1) { const [b, gb] = K2.wbuf("sweep", 1920, 1080); const x = lerp(LOGO_C[0] - 900, LOGO_C[0] + 900, eIOs(sw)); gb.translate(x, LOGO_C[1]); gb.rotate(0.42); const lg = gb.createLinearGradient(-90, 0, 90, 0); lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, "rgba(255,255,255,0.75)"); lg.addColorStop(1, "rgba(255,255,255,0)"); gb.fillStyle = lg; gb.fillRect(-90, -700, 180, 1400); gb.fillStyle = "rgba(255,255,255,0.45)"; gb.fillRect(110, -700, 14, 1400); gb.setTransform(1, 0, 0, 1, 0, 0); gb.globalCompositeOperation = "destination-in"; gb.drawImage(L.B, 0, 0); g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.8; g.drawImage(b, 0, 0); g.restore(); }
    // ランタン(i)のゆらぎ
    const lp = L.geo.lamp; glow(g, lp[0], lp[1], 110 + 10 * Math.sin(t * 7), C.amber, 0.25 + 0.1 * Math.exp(-d * 3));
    // 精: スウッシュの先端に乗って進み、最後は先端に留まる
    const S = L.geo.swS, n = S.length; let k = 0; while (k < n - 2 && S[k][0] < swX - 30) k++;
    const tipK = Math.min(n - 3, k), ang = Math.atan2(S[tipK + 2][1] - S[tipK][1], S[tipK + 2][0] - S[tipK][0]);
    if (f >= 728) {
      const e = S[tipK], bob = f > 772 ? 6 * Math.sin(t * 3) : 0, pose = SPIRIT2.poseMix("fly", "offer", eIOs(K2.P(f, 768, 790)));
      SPIRIT2.draw(g, e[0] - 46 * Math.cos(ang), e[1] - 46 * Math.sin(ang) - 52 + bob, 0.9, ang * 0.7, pose, { t, noParcel: true, tailLen: f < 772 ? 1.4 : 0.9, lift: 0.0 });
      if (f < 772) glow(g, e[0], e[1], 120, C.amberHot, 0.6);
    }
    motes(g, f, { n: 34, seed: 8, ox: t * 50, oy: -t * 12, size: [2, 6], a: 0.4 });
    g.restore();
    return {
      bloom: { a: 0.5, a2: 0.35 }, exposure: f === 723 ? 0.22 : 0,
      grade: { tint: ["#ffb060", 0.06, "soft-light"] },
      overlay: (o) => {
        // 主張2(1字ずつ: ぼかし 8→0、0.067 秒おき)。832〜840 でぼけて消える
        const s2 = "届けた灯りが、空の道になる。";
        if (f >= 760 && f < 841) K2.htext(o, s2, 960, 668, 70, { col: "#f6ecd6", track: 4, stroke: 10, strokeCol: "rgba(6,10,24,0.82)",
          alpha: (i) => clamp((f - 760 - i * 2) / 5) * (1 - K2.P(f, 832, 840)), blur: (i) => 8 * (1 - clamp((f - 760 - i * 2) / 5)) + 8 * K2.P(f, 832, 840) });
        // 架空の注記(810〜900)。2行・読める大きさ・下に暗い帯
        if (f >= 810) {
          const a = eOut(K2.P(f, 810, 820)), dy = 8 * (1 - a);
          const q = o.createLinearGradient(0, 900, 0, 1080); q.addColorStop(0, "rgba(4,6,16,0)"); q.addColorStop(1, `rgba(4,6,16,${0.75 * a})`); o.fillStyle = q; o.fillRect(0, 880, 1920, 200);
          o.save(); o.globalAlpha = a;
          HUD.text(o, "※架空のゲームのコンセプト映像です。", 960, 990 + dy, { font: "JPG", weight: 700, size: 46, col: "#f2ead8", align: "center", stroke: 8, strokeCol: "rgba(6,10,24,0.85)" });
          HUD.text(o, "発売の予定はありません。", 960, 1050 + dy, { font: "JPG", weight: 500, size: 40, col: "#d8e6e8", align: "center", stroke: 7, strokeCol: "rgba(6,10,24,0.85)" });
          o.restore();
        }
      },
    };
  };
  FILM2.reg(S8);
  return { impactFrame, tendril, GATES };
})();
