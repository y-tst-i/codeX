// HUD(ゲーム画面の表示)の動き。値は全部コマ番号 f の関数(台帳 SHOTS.md の「数字の流れ」)。
// 読ませる物(NEAR MISS / PERFECT / STREAK の大きい数字 / 小包の割れ / DELIVERED)は大きく、雰囲気の物(ラベル・距離・ゲージ)は小さく。
// 数字のスクランブルは Motion Prompt #129、ポップは #001、カウントアップは #007 の数値を使う。
// Motion Prompt #121-144 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#129
// Motion Prompt #001-024 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#001
const HUD2 = (() => {
  const P = PAINT, W = WORLD, H = HUD, { css, mix } = P, { clamp, lerp, keys, eOut, eOut5, eIOs, backIn, backOut, spring, decay, hash } = K2;
  const AMB = W.C.amber, HOT = W.C.amberHot, LBL = "#bfe3e6";

  // ---- 値 ----
  const PICKS = [299, 331, 351, 370, 383];
  const lumi = (f) => {
    if (f < 90) return 0.58;
    let v = 0; for (const p of PICKS) v += clamp((f - p - 8) / 6) * 0.2; // 光の粒がゲージに届いて(8コマ後)満ちる
    if (f >= 435) v = keys(f, [[435, 1], [445, 0.6], [455, 0.6], [462, 0.45], [467, 0.3], [487, 0.3], [497, 0.5], [539, 0.5], [545, 0.6], [559, 0.6], [565, 0.7], [578, 0.7], [584, 0.8], [591, 0.8], [597, 0.9], [610, 0.9], [614, 1.0]]);
    return v;
  };
  const ghostOf = (fn, f) => Math.max(fn(f), fn(f - 8) * 0.999);
  const parcelHP = (f) => (f < 435 ? 3 : 2);
  const dist = (f) => (f < 90 ? 1.2 : keys(f, [[232, 1.0], [330, 0.9], [420, 0.8], [507, 0.6], [610, 0.4], [700, 0.0]], (x) => x));
  const STREAK = [[0, 3], [24, 4], [232, 1], [299, 2], [331, 3], [351, 4], [370, 5], [383, 6], [409, 7], [435, 0], [539, 1], [559, 2], [578, 3], [591, 4], [610, 7], [617, 8], [624, 9], [630, 10], [637, 11], [643, 12]];
  const streakAt = (f) => { let v = 0, at = 0; for (const [ff, n] of STREAK) if (f >= ff) { v = n; at = ff; } return [v, at]; };
  // 表示の有無と起動の進み(S3 で起動)
  const vis = (f) => (f < 90 ? 1 - K2.P(f, 70, 88) : f < 232 ? 0 : f < 719 ? 1 - K2.P(f, 712, 718) : 0);
  const boot = (f) => (f < 90 ? 1 : K2.P(f, 232, 262));

  // 数字のスクランブル(#129: 未確定の字は約 0.062 秒ごとに変わり、左から 0.18 秒おきに確定)
  function scram(str, f, f0) {
    const glyphs = "0123456789"; let o = "";
    [...str].forEach((ch, i) => { const lock = f0 + Math.round((0.45 * 0.4 + 0.18 * i) * 30); o += f >= lock || !/[0-9]/.test(ch) ? ch : glyphs[Math.floor(hash(Math.floor(f / 2), i * 13 + 7) * 10)]; });
    return o;
  }
  // 板を左から開く(#002 のずらし)
  function reveal(ctx, x, y, w, h, k, fn) { if (k <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(x - 6, y - 6, (w + 12) * eOut5(k), h + 12); ctx.clip(); fn(); ctx.restore(); }

  function parcel(ctx, f, x, y) {
    const hp = parcelHP(f), hit = f - 435, red = f >= 435 ? Math.exp(-hit / 6) : 0;
    H.plate(ctx, x, y, 300, 86, { edge: red > 0.05 ? mix(AMB, "#ff5a40", red) : AMB, a: 0.62 + 0.25 * red });
    H.text(ctx, "PARCEL", x + 22, y + 32, { size: 22, col: LBL, track: 3 });
    for (let i = 0; i < 3; i++) {
      const cx = x + 44 + i * 56, cy = y + 60, r = 15, lit = i < hp;
      if (i === 2 && f >= 435 && hit < 18) { // 割れて飛ぶ破片
        for (let k = 0; k < 6; k++) { const a = hash(k, 3) * 6.28, d = 6 + hit * (3 + hash(k, 5) * 4), gy = 0.25 * hit * hit; ctx.save(); ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d + gy); ctx.rotate(hit * (hash(k, 7) - 0.5)); ctx.globalAlpha = 1 - hit / 18; ctx.fillStyle = k % 2 ? css(AMB) : "#fff6dc"; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -2); ctx.lineTo(-1, 7); ctx.closePath(); ctx.fill(); ctx.restore(); }
      }
      ctx.save(); ctx.beginPath(); ctx.roundRect(cx - r * 0.75, cy - r, r * 1.5, r * 2, 5);
      ctx.fillStyle = lit ? css(AMB) : "rgba(60,70,90,0.9)"; ctx.fill(); ctx.strokeStyle = W.C.ink; ctx.lineWidth = 3; ctx.stroke();
      if (lit) { ctx.fillStyle = "#fff6dc"; ctx.fillRect(cx - 4, cy - 7, 8, 12); P.glow(ctx, cx, cy, 34, AMB, 0.35); }
      else { ctx.strokeStyle = "rgba(220,240,255,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 12); ctx.lineTo(cx + 2, cy - 2); ctx.lineTo(cx - 4, cy + 4); ctx.lineTo(cx + 6, cy + 13); ctx.stroke(); }
      ctx.restore();
    }
    const sc = f >= 435 ? 1 + 0.45 * decay((f - 435) / 30, 15, 6.5) : 1;
    ctx.save(); ctx.translate(x + 236, y + 58); ctx.scale(sc, sc); H.text(ctx, "×" + hp, 0, 14, { size: 40, col: red > 0.3 ? "#ffd0c0" : HOT, align: "center" }); ctx.restore();
  }
  function destPlate(ctx, f, x, y) {
    const d = dist(f), s = f >= 232 && f < 262 ? scram(d.toFixed(1), f, 236) : d.toFixed(1);
    H.dest(ctx, x, y, "灯台島まで", s);
  }
  function gauge(ctx, f, x, y) {
    const v = lumi(f), gv = ghostOf(lumi, f), full = f >= 391 && f < 435 ? 1 : 0;
    H.plate(ctx, x, y, 500, 64, { edge: full ? HOT : AMB });
    H.text(ctx, "LUMI", x + 20, y + 42, { size: 26, col: LBL, track: 2 });
    const bx = x + 140, bw = 330, bh = 20, by = y + 22;
    ctx.save(); ctx.fillStyle = "rgba(30,40,60,0.9)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "rgba(255,246,220,0.5)"; ctx.fillRect(bx, by, bw * gv, bh);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, css(W.C.amberDeep)); g.addColorStop(1, css(HOT)); ctx.fillStyle = g; ctx.fillRect(bx, by, bw * v, bh);
    for (let i = 1; i < 5; i++) { ctx.fillStyle = "rgba(8,14,28,0.9)"; ctx.fillRect(bx + (bw * i) / 5 - 1.5, by, 3, bh); }
    // 段が満ちた瞬間の光(各段 6 コマ)
    for (const p of PICKS) { const dt = f - p - 14; if (dt >= 0 && dt < 10) { const i = PICKS.indexOf(p); ctx.globalAlpha = 1 - dt / 10; ctx.fillStyle = "#ffffff"; ctx.fillRect(bx + (bw * i) / 5, by - 3 * (1 - dt / 10), bw / 5, bh + 6 * (1 - dt / 10)); ctx.globalAlpha = 1; } }
    ctx.restore(); P.glow(ctx, bx + bw * v, by + bh / 2, 46, AMB, 0.5);
    if (full) { const ph = (f - 391) / 30; P.glow(ctx, bx + bw / 2, by + bh / 2, 260, AMB, 0.18 + 0.1 * Math.sin(ph * 9)); }
  }
  function streakSmall(ctx, f, x, y) {
    const [n, at] = streakAt(f), dt = (f - at) / 30, sc = 1 + 0.3 * decay(dt, 15, 7), broke = n === 0 && f >= 435 && f < 507;
    H.text(ctx, "STREAK", x, y, { size: 22, col: LBL, align: "right", track: 3, stroke: 5 });
    ctx.save(); ctx.translate(x - 50, y + 46); ctx.scale(sc, sc);
    H.text(ctx, "×" + n, 50, 12, { size: 52, col: broke ? mix("#ff8a70", "#9aa8b8", K2.P(f, 440, 470)) : HOT, align: "right", stroke: 9 });
    ctx.restore();
  }

  // 全体を描く(画面に固定。shake は画面の揺れの一部を受ける)。hideStreak: S7 の大きな数字を出している間は隅の数字を隠す
  function draw(ctx, f, { shake = [0, 0], hideStreak = false } = {}) {
    const a = vis(f); if (a <= 0.003 || P.mode.sil) return;
    const b = boot(f);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(shake[0] * 0.5, shake[1] * 0.5);
    const k = (i) => (f < 90 ? 1 : clamp((b * 30 - i * 2.4) / 8));
    reveal(ctx, 44, 40, 300, 86, k(0), () => parcel(ctx, f, 44, 40));
    reveal(ctx, 1516, 40, 360, 96, k(1), () => destPlate(ctx, f, 1876, 40));
    reveal(ctx, 44, 970, 500, 64, k(2), () => gauge(ctx, f, 44, 970));
    if (!hideStreak) reveal(ctx, 1700, 160, 180, 120, k(3), () => streakSmall(ctx, f, 1876, 182));
    ctx.restore();
  }

  // ---- 結果の言葉のポップ(#001: 拡大 1−e^(−6.5t)·cos(15t)、回転 −0.35rad→0 を 1−e^(−6t)·cos(11t)、退場は backIn s=2.2) ----
  function pop(ctx, x, y, big, small, f, f0, { size = 84, hold = 40, out = 8, rot = -0.06, col = HOT, subCol = "#ffffff", glowCol = AMB, subSize = 0.6, slam = false } = {}) {
    const dt = (f - f0) / 30; if (f < f0 || f > f0 + hold + out) return;
    const ex = backIn(K2.P(f, f0 + hold, f0 + hold + out), 2.2);
    let sc = slam ? 1 + 0.4 * Math.max(0, 1 - dt * 7.5) ** 2 - 0.12 * Math.max(0, decay(dt - 0.13, 15, 6.5)) * (dt > 0.13 ? 1 : 0) : spring(dt, 15, 6.5);
    sc *= 1 - ex; if (sc <= 0.01) return;
    const r = rot - 0.35 * (1 - spring(dt, 11, 6)) * (slam ? 0.2 : 1);
    ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.scale(sc, sc);
    P.glow(ctx, 0, -size * 0.3, size * 3.2, glowCol, 0.22);
    ctx.save(); ctx.font = `400 ${size}px HUD`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.wordSpacing = Math.round(size * -0.35) + "px"; ctx.letterSpacing = "2px";
    ctx.lineJoin = "round"; ctx.strokeStyle = W.C.ink; ctx.lineWidth = size * 0.22; ctx.strokeText(big, 0, 0);
    const g = ctx.createLinearGradient(0, -size * 0.8, 0, size * 0.1); g.addColorStop(0, "#ffffff"); g.addColorStop(0.55, css(col)); g.addColorStop(1, css(mix(col, W.C.amberDeep, 0.5))); ctx.fillStyle = g; ctx.fillText(big, 0, 0); ctx.restore();
    if (small) { const s2 = spring(dt - 0.12, 17, 7); if (s2 > 0.01) { ctx.save(); ctx.translate(0, size * 0.98); ctx.scale(s2, s2); H.text(ctx, small, 0, 0, { size: size * subSize, col: subCol, stroke: size * 0.16, align: "center" }); ctx.restore(); } }
    ctx.restore();
  }
  return { draw, pop, lumi, dist, streakAt, parcelHP, PICKS, scram };
})();
