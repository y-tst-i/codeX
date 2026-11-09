// ショット S1〜S4(0〜419 コマ)。各ショットは draw(g, f) で絵を描き、仕上げの指定(fx)を返す。
// 動きの出典(Motion Prompt): S1 #029 追い撮り・#036 ダッチ・#121 予備動作・#001 ポップ・#038 速度の変化・#026 ティルト /
//   S2 #183 状況の引き・#005 マスクの出現(縦書きに直した)・#184 超寄り / S3 #046 スマッシュカット・#003 はじけ・#002 ずらし・#129 スクランブル /
//   S4 #029 追い撮り(引き)・#003・#007・#121・#032 ドリーズーム・#038
// Motion Prompt #001-192 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/
const SA = (() => {
  const P = PAINT, W = WORLD, C = W.C, { css, mix } = P;
  const { clamp, lerp, keys, eIO, eIOs, eOut, eOut5, eIn, expoOut, backOut, backIn, spring, decay, hash, rng, plate, blurred, camApply, layerImg, toScreen, stream, streamPath, along, glow, burst, impactShake } = K2;

  // ---- 共通: 空(カメラの傾きに追従する大きな面)と月 ----
  function sky(g, cam, { top = C.skyTop, mid = C.skyMid, low = C.skyLow, hor = C.horizon, glowAt = [1400, 200], py = 0.05, glowA = 0.32 } = {}) {
    g.save(); camApply(g, { ...cam, z: 1 }, [0, py]);
    const gr = g.createLinearGradient(0, -900, 0, 900); gr.addColorStop(0, top); gr.addColorStop(0.45, mid); gr.addColorStop(0.78, low); gr.addColorStop(1, hor);
    g.fillStyle = gr; g.fillRect(-2000, -1400, 4000, 2800);
    const r = g.createRadialGradient(glowAt[0] - 960, glowAt[1] - 540, 0, glowAt[0] - 960, glowAt[1] - 540, 900); r.addColorStop(0, `rgba(150,205,215,${glowA})`); r.addColorStop(0.5, `rgba(90,150,170,${glowA * 0.3})`); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(-2000, -1400, 4000, 2800); g.restore();
  }
  const moonAt = (g, cam, p, wx, wy, R) => { g.save(); camApply(g, cam, p); W.moon(g, wx, wy, R); g.restore(); };
  // 光の粒(前景のぼけ)。画面座標で、カメラの速さ vx, vy に応じて流れる
  function motes(g, f, { n = 40, seed = 12, ox = 0, oy = 0, col = C.amberHot, size = [2, 8], a = 0.5, streak = 0, ang = 0 } = {}) {
    if (!P.mode.fx) return;
    const r = rng(seed); g.save(); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const z = r(), x = K2.mod(r() * 2400 - ox * (0.4 + z), 2400) - 240, y = K2.mod(r() * 1400 - oy * (0.4 + z), 1400) - 160, s = lerp(size[0], size[1], z), al = a * (0.3 + 0.7 * r()) * (0.6 + 0.4 * Math.sin(f * 0.21 + i));
      if (streak > 0) { g.strokeStyle = css(col, al * 0.55); g.lineWidth = s * 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang) * streak * (0.4 + z), y - Math.sin(ang) * streak * (0.4 + z)); g.stroke(); }
      const gg = g.createRadialGradient(x, y, 0, x, y, s); gg.addColorStop(0, css(col, al)); gg.addColorStop(1, css(col, 0)); g.fillStyle = gg; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    }
    g.restore();
  }
  // 雨・風の筋(画面座標、斜め)
  function rain(g, f, { n = 120, seed = 31, ang = 1.9, speed = 2600, len = [40, 140], a = 0.18, col = "#cfe6ff", w = [1, 2.2] } = {}) {
    if (!P.mode.fx) return;
    const r = rng(seed), t = f / 30, dx = Math.cos(ang), dy = Math.sin(ang); g.save(); g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const z = r(), l = lerp(len[0], len[1], z), sp = speed * (0.5 + z), D = 2600, s0 = K2.mod(r() * D + t * sp, D), x0 = r() * 2400 - 240 - dx * 1300, y0 = r() * 400 - 700;
      const x = x0 + dx * s0, y = y0 + dy * s0; g.strokeStyle = css(col, a * (0.4 + 0.6 * z)); g.lineWidth = lerp(w[0], w[1], z); g.beginPath(); g.moveTo(x, y); g.lineTo(x - dx * l, y - dy * l); g.stroke();
    }
    g.restore();
  }

  // ======================= S1 フック(0〜89) =======================
  // 追い撮り: 精は画面の (900, 590) に留まり、世界が流れる。0.73s(22)に稲妻が真後ろの気流を撃つ → 回避 → NEAR MISS。
  // 1.0s(30)から速度を落とし(#038)、彩度を下げて谷へ。58〜89 でカメラを上へ振る(#026。S2 の冒頭へ同じ向きでつなぐ)。
  const S1 = { id: "S1", a: 0, b: 90 };
  let tw1 = null; // 世界の時刻(速度の変化を積分した表。f だけで決まる)
  S1.init = () => { tw1 = [0]; for (let f = 1; f <= 120; f++) { const fm = f - 0.5, rate = fm < 30 ? 1 : lerp(1, 0.38, eIOs(clamp((fm - 30) / 26))); tw1.push(tw1[f - 1] + rate / 30); } };
  const baseY = (x) => -0.3 * x + 40 * Math.sin(x / 520);
  S1.draw = (g, f) => {
    const t = f / 30, tw = tw1[f], v = 920; // 精の速さ(世界の画素/秒)
    const sx0 = tw * v, sy0 = baseY(sx0) - 150; // 経路上の精
    // 予備動作 15〜21(後ろへ 24px、つぶれ)→ 21〜24 跳ね上がる(backOut)→ 30〜62 で経路に戻る
    const wind = eIOs(K2.P(f, 14, 21)) * (1 - K2.P(f, 21, 23)), launch = backOut(K2.P(f, 21, 25), 1.4) * (1 - eIOs(K2.P(f, 32, 64)));
    const dx = -24 * wind + 40 * launch, dy = 8 * wind - 108 * launch;
    const sx = sx0 + dx, sy = sy0 + dy + 6 * Math.sin(t * 5.2);
    // カメラ: 精の少し右上を見る。22 で寄り(+6%)→ 戻る。30 から少し引き、58〜 上へ振る(加速して切る)
    const tilt = eIn(K2.P(f, 58, 90)) * 560;
    const z = 1.02 + 0.06 * Math.max(0, decay((f - 22) / 30, 9, 9)) * (f >= 22 ? 1 : 0) - 0.06 * eIOs(K2.P(f, 30, 80));
    const cam = { x: sx0 + 70, y: sy0 - 40 - tilt, z, r: -0.05 - 0.02 * eIOs(K2.P(f, 40, 89)) };
    const bolt = f >= 22 && f <= 27, bk = [1, 0.9, 0.55, 0.3, 0.45, 0.12][f - 22] || 0;
    sky(g, cam, { glowAt: [1360, 190] });
    g.save(); camApply(g, cam, 0.02); g.drawImage(PL.stars("s1", 2800, 1500, { n: 620 }), -1400, -950); g.restore();
    moonAt(g, cam, [0.03, 0.05], 450, -380, 56);
    const far = PL.clouds("s1far", { seed: 2, w: 4400, hgt: 70, d: 0.92, under: 520 });
    layerImg(g, far.c, cam, [0.12, 0.2], -1600, 140 - far.top);
    const i8 = PL.island("s1i8", { seed: 8, w: 240, d: 0.86 }), i15 = PL.island("s1i15", { seed: 15, w: 150, d: 0.9, town: false });
    layerImg(g, i8.c, cam, [0.18, 0.25], 560 - i8.cx, -60 - i8.top); layerImg(g, i15.c, cam, [0.18, 0.25], 160 - i15.cx, 20 - i15.top); layerImg(g, i8.c, cam, [0.18, 0.25], 1250 - i8.cx, 40 - i8.top, { scale: 0.7 });
    // 嵐(追ってくる。横の視差 0.9)。稲妻の前は中が光る(予兆 12〜21)
    const st = PL.storm2("s1", { seed: 6, rx: 560, ry: 220, swirl: 1.4, inner: 0.5 });
    layerImg(g, st.c, cam, [0.9, 0.35], -560 - st.cx, -420 - st.cy);
    { const [qx, qy] = toScreen(cam, [0.9, 0.35], -560 + 120, -420 + 60), pre = K2.P(f, 10, 21) * (f < 24 ? 1 : 0) + bk * 0.6; if (pre > 0) { glow(g, qx, qy, 520, "#9fd8ff", 0.35 * pre); glow(g, qx, qy, 200, "#e6f8ff", 0.4 * pre); } }
    const mid = PL.clouds("s1mid", { seed: 5, w: 4400, hgt: 120, d: 0.62, under: 420, warm: 0.18, warmAt: [1600, 40, 500] });
    layerImg(g, mid.c, cam, [0.45, 0.5], -1500, 380 - mid.top);
    const i4 = PL.island("s1i4", { seed: 4, w: 440, d: 0.5 });
    layerImg(g, i4.c, cam, [0.5, 0.55], -380 - i4.cx, 120 - i4.top); layerImg(g, i4.c, cam, [0.5, 0.55], 1700 - i4.cx, 260 - i4.top, { scale: 0.8 });
    // 光の気流(主役の面)
    const xs = []; for (let x = Math.floor((sx0 - 1700) / 260) * 260; x <= sx0 + 1900; x += 260) xs.push([x, baseY(x)]);
    const samp = streamPath(xs, 14);
    // 稲妻が当たる所: 19 コマ目に精がいた所の真下の気流
    const hx = tw1[19] * v - 10, hy = baseY(hx);
    g.save(); camApply(g, cam, 1);
    stream(g, samp, { width: 48, flow: t * 1500, seed: 4, taper: [1, 1], streaks: 80 });
    if (f >= 22) { // 着弾の跡(気流の焦げ・輪)
      const dt = (f - 22) / 30, k = Math.max(0, 1 - dt / 0.8);
      g.save(); g.strokeStyle = `rgba(220,248,255,${0.85 * k})`; g.lineWidth = 5 * k + 1; g.beginPath(); g.ellipse(hx, hy, 60 + 240 * eOut(dt / 0.8), 22 + 90 * eOut(dt / 0.8), -0.29, 0, 7); g.stroke(); g.restore();
      const r = rng(31); g.save(); g.lineCap = "round"; for (let i = 0; i < 40; i++) { const a = r() * 6.28, l = (40 + r() * 220) * eOut(Math.min(1, dt * 4)), x = hx + Math.cos(a) * (20 + r() * 30), y = hy + Math.sin(a) * (10 + r() * 16); g.globalAlpha = k; g.strokeStyle = r() < 0.5 ? "rgba(225,250,255,0.9)" : css(C.amberHot, 0.9); g.lineWidth = 1.5 + r() * 3; g.beginPath(); g.moveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } g.restore();
    }
    g.restore();
    if (bolt && bk > 0) { // 稲妻(嵐 → 着弾点)。2 コマごとに形を変える
      const [bx0, by0] = toScreen(cam, [0.9, 0.35], -560 + 200, -420 + 130), [bx1, by1] = toScreen(cam, 1, hx, hy);
      W.bolt(g, bx0, by0, bx1, by1, { seed: 11 + Math.floor((f - 22) / 2), width: 8, branches: 5, rough: 0.2, a: bk });
      glow(g, bx1, by1, 380, "#bfeeff", 0.6 * bk); glow(g, bx1, by1, 120, "#ffffff", 0.7 * bk);
    }
    // 精
    const pose = f < 19 ? SPIRIT2.poseMix("fly", "fly", 0) : f < 30 ? SPIRIT2.poseMix("fly", "dodge", eOut(K2.P(f, 19, 23))) : SPIRIT2.poseMix("dodge", "fly", eIOs(K2.P(f, 30, 50)));
    pose.sx *= 1 + 0.16 * wind - 0.08 * launch * (f < 30 ? 1 : 0); pose.sy *= 1 - 0.14 * wind + 0.1 * launch * (f < 30 ? 1 : 0);
    const ang = Math.atan2(baseY(sx0 + 30) - baseY(sx0 - 30), 60);
    const [px, py] = toScreen(cam, 1, sx, sy);
    SPIRIT2.draw(g, px, py, 2.0 * cam.z, ang + cam.r, pose, { t, smear: f >= 21 && f < 27 ? [-30, 70] : null, rim: bk > 0.2 ? "#bfeeff" : null });
    // 手前: 暗い岩(視差 1.4)と、ぼかした雲(1.8)
    const fg = PL.island("s1fg", { seed: 21, w: 620, depthH: 300, d: 0.0, town: false, falls: false, lamp: 0, L: [0.6, -0.8], lightSide: { col: C.amber, w: 5, L: [-0.9, -0.3], a: 0.7 } });
    layerImg(g, blurred("s1fgb", fg.c, 3), cam, [1.4, 1.25], 1500 - fg.cx, 260 - fg.top + baseY(1500));
    layerImg(g, PL.wisp("s1", { seed: 9, w: 1500, hgt: 150, blur: 16 }), cam, [1.8, 1.4], 900, baseY(900) + 30);
    layerImg(g, PL.wisp("s1", { seed: 9, w: 1500, hgt: 150, blur: 16 }), cam, [1.8, 1.4], 2500, baseY(2500) + 60);
    const spd = (tw1[f] - tw1[Math.max(0, f - 1)]) * 30;
    motes(g, f, { n: 46, seed: 12, ox: sx0 * 1.2, oy: sy0 * 1.2 - tilt * 1.2, streak: 60 * spd, ang: -0.29, size: [2, 7], a: 0.55 });
    W.speedLines(g, { n: Math.round(40 * spd), seed: 3 + (f % 3), angle: Math.PI - 0.29, spread: 0.08, a: 0.14 * spd, col: "#d6f0ff" });
    const val = K2.P(f, 30, 62);
    return {
      exposure: [0.55, 0.3, 0.12, 0, 0.1][f - 22] || 0,
      dirBlur: f >= 76 ? [0, (f - 76) * 3.2] : null,
      grade: { sat: 1 - 0.3 * val, tint: ["#2a4a6a", 0.25 * val, "soft-light"], dark: 0.12 * val },
      overlay: (o) => {
        HUD2.draw(o, f);
        HUD2.pop(o, 1230, 330, "NEAR MISS", "+150  ×4", f, 24, { size: 92, hold: 44, out: 8, subSize: 0.55 });
      },
    };
  };
  FILM2.reg(S1);


  // ======================= S2 谷(90〜226): 音の無い区間。偽の効果音は足さず、動き(風・雨・光・文字)で見せる =======================
  // S2a 90〜179 状況の引き(#183): 上へ振った動きが減速して止まり、ゆっくり寄る。暗い灯台島、迫る嵐、灯りを落として低く飛ぶ小さな精。
  //   主張1 は縦書き2列。#005 のマスクの出現(線が伸び、その線の陰から字がすべり出る)を縦に直した。
  // S2b 180〜226 超寄り(#184): 精の横顔。灯りがしぼみ(吸う)、224 で一瞬ふくらむ → 227 で点火(S3)。
  const S2 = { id: "S2", a: 90, b: 227 };
  const S2SKY = { top: "#060a18", mid: "#101d34", low: "#1d3644", hor: "#2e5560", glowAt: [380, 160], glowA: 0.2 };
  function s2back(g, f, cam, blurK = 0) {
    const t = f / 30;
    sky(g, cam, S2SKY);
    if (!blurK) { g.save(); camApply(g, cam, 0.02); g.globalAlpha = 0.7; g.drawImage(PL.stars("s2", 2800, 1500, { n: 380, seed: 9 }), -1400, -1000); g.restore(); moonAt(g, cam, [0.03, 0.05], -560, -330, 44); }
    const far = PL.clouds("s2far", { seed: 3, w: 4200, hgt: 60, d: 0.95, under: 520, skyCol: "#2a4a55" });
    const farB = blurK ? blurred("s2farB", far.c, 6) : far.c;
    layerImg(g, farB, cam, [0.1, 0.12], -2100, 170 - far.top);
    // 嵐の壁(右と上)。ゆっくり近づく(拡大・左へ)と、中の無音の稲光(局所の光)
    const app = K2.P(f, 90, 227), sa = PL.storm2("s2a", { seed: 7, rx: 900, ry: 420, swirl: 2.0, arms: 6, inner: 0.25 }), sb = PL.storm2("s2b", { seed: 13, rx: 620, ry: 300, swirl: 1.6, inner: 0.15 });
    const saI = blurK ? blurred("s2aB", sa.c, 8) : sa.c, sbI = blurK ? blurred("s2bB", sb.c, 8) : sb.c;
    g.save(); camApply(g, cam, [0.3, 0.3]); const k1 = 1 + 0.22 * app; g.translate(820 - 60 * app, -240); g.scale(k1, k1); g.rotate(0.07 * app); g.drawImage(saI, -sa.cx, -sa.cy); g.restore();
    g.save(); camApply(g, cam, [0.36, 0.36]); const k2 = 1 + 0.26 * app; g.translate(-120 - 40 * app, -520); g.scale(k2, k2); g.drawImage(sbI, -sb.cx, -sb.cy); g.restore();
    for (const [f0, wx, wy, pp] of [[104, 1100, -320, 0.3], [126, 760, -200, 0.3], [127, 900, -120, 0.3], [143, 1300, -60, 0.3], [157, -80, -470, 0.36], [171, 620, -260, 0.3], [192, 1000, -200, 0.3], [205, 700, -150, 0.3]]) {
      const d = f - f0; if (d < 0 || d > 3) continue; const k = [1, 0.4, 0.7, 0.15][d];
      const [qx, qy] = toScreen(cam, pp, wx, wy); glow(g, qx, qy, 420, "#8fc8ff", 0.32 * k); glow(g, qx, qy, 140, "#dff4ff", 0.4 * k);
    }
    // 灯台島(遠く、灯りなし)
    const isl = PL.island("s2lh", { seed: 33, w: 360, d: 0.62, lamp: 0, falls: true }), lh = PL.lighthouse("s2lh", { h: 150, lit: 0, d: 0.6 });
    const ix = 330, iy = 40;
    g.save(); camApply(g, cam, [0.22, 0.25]); if (blurK) g.filter = "blur(5px)";
    g.drawImage(lh.c, ix - lh.ox, iy - lh.oy + 4); g.drawImage(isl.c, ix - isl.cx, iy - isl.top); g.restore();
    const mid = PL.clouds("s2mid", { seed: 11, w: 4200, hgt: 110, d: 0.7, under: 420, skyCol: "#2a4a55" });
    layerImg(g, blurK ? blurred("s2midB", mid.c, 5) : mid.c, cam, [0.5, 0.5], -2100 + 120 * t * 0.3, 420 - mid.top);
  }
  S2.draw = (g, f) => {
    const t = f / 30;
    if (f < 180) {
      // カメラ: 上へ振った動きの続き(90〜110 で減速して止まる)→ ゆっくり寄る(110〜179)
      const up = 300 * (1 - expoOut(K2.P(f, 90, 112))), z = 1 + 0.16 * eIO(K2.P(f, 104, 180));
      const cam = { x: 150 * eIO(K2.P(f, 96, 180)), y: up - 40 * eIO(K2.P(f, 104, 180)), z, r: -0.012 - 0.02 * eIO(K2.P(f, 104, 180)) };
      s2back(g, f, cam);
      // 精: 左から中央へ、低く。灯りを落とす(lum 0.55)
      const u = K2.P(f, 92, 180), wx = lerp(-760, 40, eIOs(u)), wy = 220 + 18 * Math.sin(t * 3.1);
      const [px, py, zz] = toScreen(cam, [0.85, 0.85], wx, wy);
      SPIRIT2.draw(g, px, py, 0.7 * zz, -0.06, "glide", { t, lum: 0.55, tailLen: 1.4, lift: 0.1 });
      layerImg(g, PL.wisp("s2", { seed: 19, w: 1700, hgt: 170, blur: 18, dark: 0.55 }), cam, [1.7, 1.5], -900 - 420 * (t - 3), 330); layerImg(g, PL.wisp("s2", { seed: 19, w: 1700, hgt: 170, blur: 18, dark: 0.55 }), cam, [2.3, 1.8], 1500 - 700 * (t - 3), 420);
      rain(g, f, { n: 110, a: 0.13, ang: 1.95, speed: 2400 });
      motes(g, f, { n: 18, seed: 44, ox: t * 120, oy: -t * 20, size: [2, 5], a: 0.25, col: "#cfe6ff" });
      return {
        letterbox: 1, dirBlur: f < 94 ? [0, [34, 18, 8, 3][f - 90]] : null,
        grade: { sat: 0.7, tint: ["#203a5a", 0.3, "soft-light"], dark: 0.1 },
        bloom: { a: 0.45, a2: 0.3 },
        overlay: (o) => {
          // 主張1(縦書き2列。右の列から読む)。線が伸びる → 線の陰から字がすべり出る → 左へ抜けて消える
          const cols = [["嵐を抜けて、", 360, 100], ["灯りを届けろ。", 262, 106]], size = 72, y0 = 186;
          for (const [str, cx, f0] of cols) {
            const lineK = eIO(K2.P(f, f0, f0 + 12)) * (1 - eIO(K2.P(f, 170, 179))), slide = 1 - eOut5(K2.P(f, f0 + 8, f0 + 28)), exit = backIn(K2.P(f, 168, 179), 1.2);
            const lx = cx + size * 0.62, len = [...str].length * size * 1.1 + 20, cyM = y0 + len / 2;
            if (lineK > 0) { o.save(); o.fillStyle = css(C.amber, 0.9); o.fillRect(lx - 2, cyM - (len / 2) * lineK, 4, len * lineK); o.restore(); glow(o, lx, cyM, 60, C.amber, 0.25 * lineK); }
            o.save(); o.beginPath(); o.rect(lx - 400, 0, 400, 1080); o.clip();
            K2.vtext(o, str, cx + 130 * slide - 160 * exit, y0, size, { col: "#f6ecd6", stroke: 9, strokeCol: "rgba(4,8,20,0.75)", alpha: () => 1 - K2.P(f, 174, 179) });
            o.restore();
          }
        },
      };
    }
    // ---- S2b: 超寄り ----
    const u = K2.P(f, 180, 224), z = Math.pow(1.32, eIO(u));
    const cam = { x: 260 + 30 * u, y: -60, z: 1.25 * z, r: 0.02 };
    s2back(g, f, cam, 1);
    // 風に流れる雨の筋(手前・速い)
    rain(g, f, { n: 70, seed: 52, a: 0.2, ang: 2.75, speed: 3200, len: [80, 260], w: [1.5, 3] });
    // 灯りがしぼむ(200〜222)→ 224 で吸い込んでふくらむ → 226 に向けて明るく
    const shrink = eIOs(K2.P(f, 198, 222)), inh = f >= 224 ? eOut(K2.P(f, 223, 226)) : 0;
    const lum = 0.5 - 0.18 * shrink + 0.75 * inh, sc = 2.55 * z * (1 - 0.04 * shrink + 0.1 * inh);
    const pose = SPIRIT2.poseMix("glide", "fly", 0.3); pose.sy *= 1 - 0.05 * shrink + 0.08 * inh; pose.sx *= 1 + 0.03 * shrink - 0.03 * inh; pose.flap = 0.12; if (f >= 224) pose.expr = 1;
    const px = 820 - 40 * u, py = 500 + 10 * Math.sin(t * 2.6);
    // 吸い込まれる光の粒(体へ向かう)
    if (f >= 196) { const r = rng(61); for (let i = 0; i < 26; i++) { const a = r() * 6.28, d0 = 300 + r() * 500, ph = K2.mod((f - 196) / 26 + r(), 1), d = d0 * (1 - eIn(ph)); const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d * 0.7; glow(g, x, y, 10 + 10 * r(), C.amberHot, 0.55 * Math.sin(ph * Math.PI)); } }
    SPIRIT2.draw(g, px, py, sc, -0.05, pose, { t, lum, tailLen: 1.3, lift: 0.05 });
    if (inh > 0) { g.save(); g.strokeStyle = css(C.amberHot, 0.6 * (1 - inh)); g.lineWidth = 6; g.beginPath(); g.arc(px, py, 120 + 260 * inh, 0, 7); g.stroke(); g.restore(); }
    layerImg(g, PL.wisp("s2b", { seed: 23, w: 1500, hgt: 190, blur: 26, dark: 0.6 }), cam, [1.9, 1.6], 300 - 300 * u, 120);
    return { letterbox: 1, grade: { sat: 0.72, tint: ["#203a5a", 0.3, "soft-light"], dark: 0.08 * (1 - inh) }, bloom: { a: 0.45 + 0.3 * inh, a2: 0.3 + 0.2 * inh }, exposure: f === 226 ? 0.15 : 0 };
  };
  FILM2.reg(S2);


  // ======================= S3 点火(227〜299)+ S4 ルール(300〜419): 1つの長回し =======================
  // 227 のスマッシュカット(#046)で暗→明・静→動を反転。精が点火して気流へ飛び込む(寄り・ダッチ −7°)。
  // 270〜330 でカメラが水平に戻りながら引き(#029 の追い撮りを引きで)、S4 は精が画面の中を左から右へ進む。
  // 光の粒を5つ拾い(299/331/351/370/383)、粒はゲージへ飛んで段が満ちる(原因→結果)。403 で加速(#121 予備動作 → #032 ドリーズーム)、409 NEAR MISS。
  const S34 = { id: "S3", a: 227, b: 420 };
  const PATH34 = (() => { const pts = [[-500, -620], [0, -300], [600, 120], [1200, 520], [1800, 760], [2400, 860]]; for (let x = 3000; x <= 11000; x += 400) pts.push([x, 900 + 150 * Math.sin(x / 700) + 50 * Math.sin(x / 300)]); return pts; })();
  let samp34 = null, s34 = null;
  S34.init = () => {
    samp34 = streamPath(PATH34, 16); s34 = {}; let s = 700;
    for (let f = 227; f <= 430; f++) { s34[f] = s; const fm = f + 0.5; let rate = fm < 300 ? lerp(1700, 1250, K2.P(fm, 227, 300)) : 1150; if (fm >= 395 && fm < 403) rate *= 1 - 0.55 * Math.sin(Math.PI * K2.P(fm, 395, 403)); if (fm >= 403) rate = 1150 + 1500 * Math.exp(-(fm - 403) / 9); s += rate / 30; }
  };
  // 精の世界座標(気流の上 130px)
  function spirit34(f) {
    const s = s34[Math.min(430, Math.max(227, f))], [x, y, a] = along(samp34, s), nx = Math.sin(a), ny = -Math.cos(a), off = 128 - 70 * (1 - eOut(K2.P(f, 227, 250)));
    return [x + nx * off, y + ny * off, a];
  }
  function cam34(f) {
    const [sx, sy] = spirit34(f);
    // 縦はなめらかに追う(前後の気流の高さの平均)
    let my = 0; for (let k = -4; k <= 4; k++) my += spirit34(Math.min(430, Math.max(227, f + k * 3)))[1]; my /= 9;
    const zz = keys(f, [[227, 1.5], [236, 1.32], [272, 1.3], [326, 0.8], [348, 0.84], [372, 1.02], [394, 0.9], [403, 0.86], [407, 0.92], [420, 0.9]], eIOs);
    // 精の画面上の位置(横): S3 は 820、S4 で 600 → 1120 へ進み、加速で 1380 まで先行してからカメラが追いつく
    const scrX = keys(f, [[227, 820], [290, 820], [326, 600], [396, 1060], [402, 1010], [409, 1380], [419, 1180]], eIOs);
    const scrY = keys(f, [[227, 470], [300, 520], [330, 600], [362, 470], [392, 640], [420, 560]], eIOs);
    const r = keys(f, [[227, -0.12], [270, -0.1], [326, 0], [352, 0.07], [378, -0.06], [400, 0.0]], eIOs);
    return { x: sx + (960 - scrX) / zz, y: lerp(sy, my, K2.P(f, 280, 330)) + (540 - scrY) / zz, z: zz, r };
  }
  const PICK_AT = [299, 331, 351, 370, 383];
  S34.draw = (g, f) => {
    const t = f / 30, cam = cam34(f), [sx, sy, sa] = spirit34(f), boostK = f >= 403 ? Math.exp(-(f - 403) / 10) : 0;
    sky(g, cam, { top: "#0c1832", mid: "#1a3a5a", low: "#2f6b78", hor: "#5a9c98", glowAt: [1500, 180], glowA: 0.3 });
    g.save(); camApply(g, cam, 0.02); g.drawImage(PL.stars("s34", 2800, 1500, { n: 520, seed: 14 }), -1400, -1000); g.restore();
    moonAt(g, cam, [0.03, 0.06], 520, -360, 50);
    // 遠景(加速の瞬間は遠景だけ拡大 = ドリーズームの感じ #032)
    const dz = 1 + 0.22 * boostK * K2.P(f, 403, 405);
    const far = PL.clouds("s34far", { seed: 2, w: 4400, hgt: 80, d: 0.9, under: 520 });
    g.save(); g.translate(960, 540); g.scale(dz, dz); g.translate(-960, -540);
    layerImg(g, far.c, cam, [0.1, 0.14], -1800, 220 - far.top);
    const isl = [["s34a", 8, 260, 0.82, 300, 120], ["s34b", 15, 170, 0.86, 1100, 60], ["s34c", 12, 300, 0.8, 1900, 140], ["s34d", 4, 200, 0.84, 2700, 90]];
    for (const [nm, sd, w, d, x, y] of isl) { const I = PL.island(nm, { seed: sd, w, d, lamp: 1 }); layerImg(g, I.c, cam, [0.2, 0.24], x - I.cx, y - I.top); }
    const st = PL.storm2("s34", { seed: 5, rx: 700, ry: 260, swirl: 1.6, inner: 0.35 });
    layerImg(g, st.c, cam, [0.25, 0.25], 3200 - st.cx, -160 - st.cy);
    g.restore();
    const mid = PL.clouds("s34mid", { seed: 5, w: 4400, hgt: 130, d: 0.6, under: 460, warm: 0.2, warmAt: [2200, 60, 900] });
    layerImg(g, mid.c, cam, [0.5, 0.55], -2000, 560 - mid.top); layerImg(g, mid.c, cam, [0.5, 0.55], 2400, 560 - mid.top);
    // 気流の下の雲(主役の面)
    const low = PL.clouds("s34low", { seed: 17, w: 4400, hgt: 150, d: 0.35, under: 500, warm: 0.35, warmAt: [2200, 20, 2200] });
    for (let k = -1; k < 3; k++) layerImg(g, low.c, cam, 1, 400 + k * 4300, 1130 - low.top);
    // 気流と光の粒
    g.save(); camApply(g, cam, 1);
    const spd = (s34[Math.min(430, f + 1)] - s34[f]) * 30;
    stream(g, samp34, { width: 54, flow: s34[f] * 1.4, seed: 4, taper: [0.5, 1], streaks: 110, hot: 1 + 0.4 * boostK });
    PICK_AT.forEach((pf, i) => {
      if (f >= pf) return; const [ox, oy] = spirit34(pf), bob = 8 * Math.sin(t * 6 + i);
      glow(g, ox, oy + bob, 170, C.amber, 0.5); glow(g, ox, oy + bob, 60, "#ffffff", 0.8);
      g.save(); const og = g.createRadialGradient(ox - 8, oy + bob - 8, 2, ox, oy + bob, 28); og.addColorStop(0, "#ffffff"); og.addColorStop(0.5, css(C.amberHot)); og.addColorStop(1, css(C.amber)); g.fillStyle = og; g.beginPath(); g.arc(ox, oy + bob, 26, 0, 7); g.fill();
      g.strokeStyle = css(C.ink, 0.7); g.lineWidth = 4; g.stroke(); g.strokeStyle = css(C.amberHot, 0.85); g.lineWidth = 4; g.setLineDash([14, 10]); g.lineDashOffset = -t * 60; g.beginPath(); g.arc(ox, oy + bob, 46 + 4 * Math.sin(t * 9 + i), 0, 7); g.stroke(); g.setLineDash([]); g.restore();
    });
    g.restore();
    // 精
    const wind = eIOs(K2.P(f, 395, 402)) * (f < 403 ? 1 : 0), launch = f >= 403 ? Math.sin(Math.PI * Math.min(1, (f - 403) / 8)) : 0;
    const pose = SPIRIT2.poseMix("fly", "dodge", 0.35 * launch + (f < 250 ? 0.4 * (1 - K2.P(f, 227, 250)) : 0));
    pose.sx *= 1 + 0.22 * wind + 0.4 * launch; pose.sy *= 1 - 0.24 * wind - 0.2 * launch;
    const [px, py] = toScreen(cam, 1, sx - 44 * wind, sy + 6 * Math.sin(t * 5.5));
    const ign = f < 245 ? 1 - K2.P(f, 227, 245) : 0;
    SPIRIT2.draw(g, px, py, 1.75 * cam.z, sa + cam.r - 0.18 * wind + 0.08 * launch, pose, { t, lum: 1 + 0.6 * ign, tailLen: 1 + 0.9 * boostK + 0.4 * ign, smear: launch > 0.2 ? [-140 * launch, 0] : null });
    // 粒を拾う(はじけ #003)
    PICK_AT.forEach((pf) => { const dt = (f - pf) / 30; if (dt >= 0 && dt < 0.8) { const [ox, oy] = spirit34(pf), [qx, qy] = toScreen(cam, 1, ox, oy); burst(g, qx, qy, dt, { scale: 0.75 * cam.z, n: 10 }); const k = [1, 0.5, 0.2][f - pf] || 0; if (k) { glow(g, qx, qy, 300, C.amberHot, 0.6 * k); glow(g, qx, qy, 90, "#ffffff", 0.9 * k); } } });
    // 227 点火のはじけ、240 灯りの輪、253 光の粒
    if (f >= 227 && f < 252) { burst(g, px, py, (f - 227) / 30, { scale: 2.2 }); g.save(); g.globalCompositeOperation = "lighter"; const r = rng(71), k = 1 - K2.P(f, 227, 245); for (let i = 0; i < 16; i++) { const a = r() * 6.28; g.strokeStyle = css(C.amber, 0.22 * k); g.lineWidth = 8 + r() * 24; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * 1600, py + Math.sin(a) * 1600); g.stroke(); } g.restore(); }
    if (f >= 240 && f < 243) glow(g, px, py, 420, C.amberHot, [0.5, 0.25, 0.1][f - 240]);
    if (f >= 240 && f < 262) { const dt = (f - 240) / 30; g.save(); g.strokeStyle = `rgba(255,250,235,${0.8 * (1 - dt / 0.7)})`; g.lineWidth = 8 * (1 - dt / 0.7) + 1; g.beginPath(); g.arc(px, py, 120 + 520 * eOut5(dt / 0.7), 0, 7); g.stroke(); g.restore(); }
    if (f >= 253 && f < 275) { const dt = (f - 253) / 30, r = rng(83); g.save(); g.globalCompositeOperation = "lighter"; for (let i = 0; i < 40; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.6, v = 300 + r() * 700, x = px + Math.cos(a) * v * dt - 120, y = py + 120 + Math.sin(a) * v * dt + 600 * dt * dt; glow(g, x, y, 10 + r() * 14, r() < 0.5 ? C.amberHot : "#ffffff", 0.8 * (1 - dt / 0.73)); } g.restore(); }
    // 409 のニアミス: 上から嵐の腕と稲妻が精の真上をかすめる
    if (f >= 398 && f <= 416) {
      const k = f < 405 ? K2.P(f, 398, 405) * 0.35 : [1, 1, 0.8, 0.9, 0.5, 0.6, 0.25, 0.3, 0.1, 0.1, 0.05, 0][f - 405] || 0;
      const [hx, hy] = along(samp34, s34[410]), [ax, ay] = toScreen(cam, 1, hx + 40, hy - 20);
      if (f >= 405) W.bolt(g, ax + 260, -60, ax, ay, { seed: 40 + Math.floor((f - 405) / 2), width: 8, branches: 4, rough: 0.2, a: k });
      glow(g, ax, ay, 260, "#bfeeff", 0.5 * k);
    }
    // 手前を横切る岩の島(視差 1.35、少しぼかす)
    { const I = PL.island("s34fg", { seed: 26, w: 520, depthH: 360, d: 0.05, lamp: 1, falls: false, lightSide: { col: C.amber, w: 6, L: [0.2, 1], a: 0.6 } }), IB = blurred("s34fgB", I.c, 4);
      for (const [x, y] of [[5200, 300], [8600, 420]]) layerImg(g, IB, cam, [1.35, 1.2], x - I.cx, y - I.top); }
    // 手前の雲(ぼけ)と粒
    const wsp = PL.wisp("s34", { seed: 9, w: 1600, hgt: 160, blur: 18, dark: 0.3 });
    for (let k = 0; k < 4; k++) layerImg(g, wsp, cam, [1.6, 1.4], 1200 + k * 2600, 1320);
    motes(g, f, { n: 50, seed: 12, ox: cam.x * 1.3, oy: cam.y * 1.3, streak: 30 + 0.06 * spd, ang: sa, size: [2, 8], a: 0.5 });
    if (boostK > 0.05) W.speedLines(g, { n: 90, seed: 21 + (f % 4), cx: px, cy: py, r0: 260, r1: 1500, a: 0.35 * boostK, col: "#fff1d6" });
    const lb = f < 233 ? 1 - eOut(K2.P(f, 227, 233)) : 0;
    return {
      letterbox: lb, exposure: ([0.4, 0.2, 0.08][f - 227] || 0) + ([0.22, 0.1][f - 403] || 0), zoomBlur: f < 234 ? [0.1 * (1 - K2.P(f, 227, 234)), px, py] : boostK > 0.2 ? [0.07 * boostK, px, py] : null,
      grade: { tint: ["#ffb060", 0.08, "soft-light"] }, bloom: { a: 0.6, a2: 0.4 },
      overlay: (o) => {
        HUD2.draw(o, f);
        PICK_AT.forEach((pf, i) => {
          const [ox, oy] = spirit34(pf), [qx, qy] = toScreen(cam34(pf), 1, ox, oy);
          HUD2.pop(o, qx + 80, qy - 110, "+30", null, f, pf, { size: 66, hold: 14, out: 6, rot: -0.04 });
          // 光の粒がゲージへ飛ぶ(8 コマ、弧を描く)
          const dt = f - pf; if (dt >= 0 && dt <= 8) { const u = eIOs(dt / 8), tx = 184 + 66 * i + 33, ty = 992, mx = lerp(qx, tx, u), my = lerp(qy, ty, u) - Math.sin(u * Math.PI) * 160; glow(o, mx, my, 50, C.amber, 0.7); glow(o, mx, my, 16, "#ffffff", 0.95); }
        });
        HUD2.pop(o, 1250, 330, "NEAR MISS", "+150  ×7", f, 409, { size: 92, hold: 14, out: 6, subSize: 0.55 });
        if (f >= 409 && f < 412) glow(o, 1250, 300, 520, C.amber, [0.4, 0.2, 0.08][f - 409]);
      },
    };
  };
  FILM2.reg(S34);
  const S4mark = { id: "S4", a: 300, b: 300 }; // 台帳上の境目(描画は S34 が受け持つ)

  FILM2.TESTS.spirit = (g, f) => {
    const t = f / 30; sky(g, { x: 0, y: 0, z: 1, r: 0 });
    const poses = ["fly", "dodge", "offer", "hurt"];
    poses.forEach((p, i) => SPIRIT2.draw(g, 280 + i * 450, 400, 1.7, 0, p, { t }));
    [0.35, 0.55, 0.8].forEach((s, i) => SPIRIT2.draw(g, 400 + i * 420, 850, s, 0, "fly", { t }));
    SPIRIT2.draw(g, 1600, 850, 1.0, 0, "glide", { t, lum: 0.45 });
  };
  return { sky, moonAt, motes, rain, baseY, spirit34, cam34 };
})();
