// 『夜明けの回路』— 組み立て。FILM.renderAt(ctx, f) が 0〜1589 のどのコマも単独で描く(コマ番号 f の純関数)。
// 流れ: 作業 canvas を reset → ショットの絵 → ブルーム(閾値より明るい所だけ)→ 露出の閃光(絵を自分に足す=色を残す。白い板を使わない)
//       → ズーム/向きのぼかし → 色ずれ(衝撃のコマだけ)→ 仕上げ(色収差・トーン・周辺減光・粒・黒帯)→ 終わりの暗転。
// ショットの境目は lyric_timeline.json と cues.json から計算する(歌詞の時刻が直れば境目も動く)。
const FILM = (() => {
  const { clamp, lerp, wbuf, phrase, word, acc, LT, K, W, H, N } = Y;
  const LEAD = 2; // 歌詞の句で切る時、句の頭の何コマ前で切るか(字が語頭のコマで読めるように)
  const sect = (prefix) => { const s = LT.structure.find((x) => x.name.startsWith(prefix)); if (!s) throw new Error("区間が無い: " + prefix); return s; };
  // 境目(コマ)。S1→S2→S3 と S4→S5 はカメラが続く(切らない)。S9→S10 は字の光が広がって次の世界を開く
  const B = {
    S1: 0,
    S2: word("暗"),
    S3: phrase("輝きは増す").start,
    S4: phrase("ひとつ、またひとつ").start - LEAD,
    S5: sect("伸ばし").start,
    S6: acc(769),
    S7: phrase("消えかけた声を").start - LEAD,
    S8: phrase("止まらない").start - LEAD,
    S9: phrase("まだ、光は消えない").start - LEAD,
    S10: acc(1340),
    END: N,
  };
  const SHOTS = [];
  const reg = (s) => { SHOTS.push(s); SHOTS.sort((a, b) => a.a - b.a); };
  let grainReady = false;
  async function init() {
    // 英字の副題だけ fillText(使う全文字を先に読み込み、一度描いて字形を温める)。和文は glyphs.js の点列で描くので待ちが絵に出ない
    const latin = "YOAKE NO KAIRO";
    await Promise.all(["700 34px KAKU", "700 40px KAKU"].map((f) => document.fonts.load(f, latin)));
    await document.fonts.ready;
    const [, wg] = wbuf("warm", 64, 64); wg.font = "700 34px KAKU"; wg.fillText(latin, 0, 40);
    for (const s of SHOTS) if (s.init) s.init();
    grainReady = true; return true;
  }
  // 露出の閃光: 絵を自分に足す(暗い緑は明るい緑になる。白い板を重ねないので色が抜けない)
  function exposure(g, c, k) {
    if (k <= 0.01 || !K.st.fx) return; const [b, gb] = wbuf("exp"); gb.drawImage(c, 0, 0);
    g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = Math.min(1, k); g.drawImage(b, 0, 0); g.restore();
  }
  function zoomBlur(g, c, amt, cx = W / 2, cy = H / 2, n = 6) {
    if (amt <= 0.002 || !K.st.fx) return; const [b, gb] = wbuf("zb"); gb.drawImage(c, 0, 0);
    g.save(); for (let i = 1; i <= n; i++) { const s = 1 + (amt * i) / n; g.globalAlpha = 0.5 / i + 0.06; g.setTransform(s, 0, 0, s, cx - cx * s, cy - cy * s); g.drawImage(b, 0, 0); } g.restore();
  }
  function dirBlur(g, c, dx, dy, n = 6) {
    if (Math.hypot(dx, dy) < 0.5 || !K.st.fx) return; const [b, gb] = wbuf("db"); gb.drawImage(c, 0, 0);
    g.save(); for (let i = 1; i <= n; i++) { g.globalAlpha = 1 / (i + 1); g.drawImage(b, (dx * i) / n - dx / 2, (dy * i) / n - dy / 2); } g.restore();
  }
  // 色ずれ(赤と青緑を左右に)。衝撃のコマだけ
  function chroma(g, c, d) {
    if (d < 0.5 || !K.st.fx) return;
    const [r, gr] = wbuf("caR"); gr.drawImage(c, 0, 0); gr.globalCompositeOperation = "multiply"; gr.fillStyle = "#ff0000"; gr.fillRect(0, 0, W, H);
    const [q, gq] = wbuf("caC"); gq.drawImage(c, 0, 0); gq.globalCompositeOperation = "multiply"; gq.fillStyle = "#00ffff"; gq.fillRect(0, 0, W, H);
    g.save(); g.fillStyle = "#000"; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "lighter"; g.drawImage(r, d, 0); g.drawImage(q, -d, 0); g.restore();
  }
  const shotAt = (f) => { let s = SHOTS[0]; for (const x of SHOTS) if (f >= x.a) s = x; return s; };
  function compose(f) {
    f = clamp(Math.round(f), 0, N - 1);
    const [c, g] = wbuf("frame"); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const s = shotAt(f);
    g.save(); const fx = s.draw(g, f) || {}; g.restore();
    if (fx.bloom !== false) K.bloom(g, Object.assign({ thr: 0.55, a: 0.8, streak: 0.35, streakCol: "#5ff0d0" }, fx.bloom || {}));
    exposure(g, c, fx.exposure || 0);
    if (fx.zoomBlur) zoomBlur(g, c, ...fx.zoomBlur);
    if (fx.dirBlur) dirBlur(g, c, ...fx.dirBlur);
    if (fx.chroma) chroma(g, c, fx.chroma);
    if (fx.top) { g.save(); fx.top(g); g.restore(); }
    K.grade(g, f, Object.assign({ ca: 2.0, vig: 0.42, grain: 10, toe: [3, 9, 10] }, fx.grade || {}, { letterbox: fx.letterbox || 0 }));
    if (fx.fade > 0) { g.save(); g.globalAlpha = clamp(fx.fade); g.fillStyle = "#020203"; g.fillRect(0, 0, W, H); g.restore(); }
    return [c, s];
  }
  function renderAt(out, f) {
    const [c, s] = compose(f);
    out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.globalCompositeOperation = "copy"; out.filter = "none"; out.drawImage(c, 0, 0); out.restore();
    return s.id;
  }
  // 機械検査用: そのコマで描かれた歌詞の字と不透明度(仕上げは省く)
  function textAt(f) {
    const [, g] = wbuf("tlog"); Y.textLogBegin(); const s = shotAt(f); g.save(); s.draw(g, f); g.restore(); return { shot: s.id, text: Y.textLogEnd() };
  }
  return { init, renderAt, textAt, reg, SHOTS, B, LEAD };
})();
