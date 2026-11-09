// 『夜明けの回路』第2段階 — 共通の道具。scene-lib.js / depth.js / paint.js / glyphs.js / kairo.js / data.gen.js の後に読む。
// 約束(seek-safe): 絵はコマ番号 f(と引数)だけで決まる。Math.random / Date.now / 経過時間の累積を使わない。乱数は seed 付き。
// 作業 canvas は使うたびに reset(wbuf)。歌詞の時刻は audio/lyric_timeline.json(MV_DATA.lyric)からだけ読む(コードに直書きしない)。
//
// 緩急・ばねの式とカメラの投影は Motion Prompt の kit(motion / camera)から(式は kit のまま)。
// Motion Prompt #001-024 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#001
// Motion Prompt #025-048 · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#025
const Y = (() => {
  const W = 1920, H = 1080, FPS = 30, N = 1590;
  // ---- 緩急(kit motion) ----
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, x) => a + (b - a) * x;
  const P = (t, a, b) => clamp((t - a) / (b - a));
  const eIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eIOs = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const eOut = (x) => 1 - Math.pow(1 - x, 3);
  const eOut5 = (x) => 1 - Math.pow(1 - x, 5);
  const eIn = (x) => x * x * x;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const backOut = (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  const backIn = (x, s = 1.70158) => (s + 1) * x * x * x - s * x * x;
  const spring = (t, w = 14, d = 7) => (t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(w * t));
  const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const mod = (a, n) => ((a % n) + n) % n;
  const hash = (n, s = 0) => { let h = (n * 374761393 + s * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const rng = (seed) => SCENE_LIB.mulberry32(seed);
  // 区間キー [[f, v, ease?], ...]
  const keys = (f, ks, ease = eIOs) => {
    if (f <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) if (f <= ks[i][0]) { const a = ks[i - 1], b = ks[i], e = b[2] || ease; return lerp(a[1], b[1], e((f - a[0]) / (b[0] - a[0]))); }
    return ks[ks.length - 1][1];
  };

  // ---- 作業 canvas(名前ごと。毎回 reset して状態を持ち越さない) ----
  const pool = {};
  function wbuf(name, w = W, h = H) {
    let c = pool[name]; if (!c) c = pool[name] = document.createElement("canvas");
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d"); if (g.reset) g.reset();
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.clearRect(0, 0, w, h);
    return [c, g];
  }
  // 引数だけで決まる物の記憶(配線の生成など。中身はコマに依らない)
  const memo = {}; const once = (k, fn) => (memo[k] ??= fn());

  // ---- 歌詞の時刻(lyric_timeline.json が正本) ----
  const LT = MV_DATA.lyric, CUES = MV_DATA.cues;
  const phrases = LT.lines.flatMap((L) => L.phrases.map((p) => ({ ...p, line: L.id })));
  function phrase(text) { const p = phrases.find((q) => q.text === text); if (!p) throw new Error("lyric_timeline に句が無い: " + text); return p; }
  // 語の開始(句の words にあればそれ、無ければ句の開始)
  function word(text) {
    for (const p of phrases) { if (p.text === text) return p.start; for (const w of p.words || []) if (w.text === text) return w.start; }
    throw new Error("lyric_timeline に語が無い: " + text);
  }
  // 句の中の語の開始。JSON に語が無い時だけ、句の長さの割合 frac で置く(推定。JSON に語を足せばそちらが使われる)
  function wordOr(phraseText, wordText, frac) { const p = phrase(phraseText); const w = (p.words || []).find((x) => x.text === wordText); return w ? w.start : Math.round(p.start + (p.end - p.start) * frac); }
  // 字ごとの開始コマ: 語の時刻があれば語の中で step ずつ、無ければ句の中を等分(上限 step)。句読点は前の字と同じ
  function charStarts(phraseText, { step = 6, spread = 0.5 } = {}) {
    const p = phrase(phraseText), chars = [...p.text], out = [];
    if (p.words && p.words.length) {
      const ws = p.words; let ci = 0;
      ws.forEach((w, wi) => {
        const next = wi + 1 < ws.length ? ws[wi + 1].start : p.end, n = [...w.text].length, st = Math.min(step, (next - w.start) / Math.max(1, n));
        [...w.text].forEach((ch, k) => { out[ci++] = Math.round(w.start + k * st); });
      });
      while (out.length < chars.length) out.push(out[out.length - 1] ?? p.start);
    } else {
      const n = chars.length, st = Math.min(step, ((p.end - p.start) * spread) / n);
      chars.forEach((ch, k) => out.push(Math.round(p.start + k * st)));
    }
    return chars.map((ch, i) => ("、。".includes(ch) && i > 0 ? out[i - 1] : out[i]));
  }
  // 曲のアクセント(cues.json の acc 事象)。台帳に無い番号は誤り
  const ACCS = new Set(CUES.events.filter((e) => e.kind === "acc").map((e) => e.acc));
  function acc(n) { if (!ACCS.has(n)) throw new Error("cues.json に無いアクセント: " + n); return n; }

  // ---- 文字の見え方の記録(機械検査用: どの歌詞がどの不透明度で描かれたか) ----
  let tlog = null;
  function textMark(text, a) { if (tlog) tlog.push([text, +a.toFixed(3)]); }
  function textLogBegin() { tlog = []; } function textLogEnd() { const t = tlog; tlog = null; return t; }

  // ---- カメラ(kit camera の proj に、画面の中心 cx,cy と回転 roll を足した物) ----
  function cam3(o) { return Object.assign({ x: 0, y: 1.2, z: 0, yaw: 0, pitch: 0, roll: 0, f: 980, cx: W / 2, cy: H / 2 }, o); }
  function pj(c, X, Yw, Z) {
    const dx = X - c.x, dy = Yw - c.y, dz = Z - c.z;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
    let sx = (c.f * x1) / z2, sy2 = (-c.f * y2) / z2;
    if (c.roll) { const cr = Math.cos(c.roll), sr = Math.sin(c.roll); const a = sx * cr - sy2 * sr; sy2 = sx * sr + sy2 * cr; sx = a; }
    return [c.cx + sx, c.cy + sy2, z2];
  }
  // 地平線の画面 y(roll を除く)
  const horizonY = (c) => c.cy + c.f * Math.tan(c.pitch);

  // ---- 文字(glyphs.js の点列で描く。fillText を使わない) ----
  const K = KAIRO;
  const layout = (fam, s, size, o) => K.layout(fam, s, size, o);
  function charBox(L, i, ox, oy, size) { const it = L.items[i]; return { x: ox + it.x, y: oy + it.y - size * 0.88, w: it.g.adv * size, h: size, cx: ox + it.x + (it.g.adv * size) / 2, cy: oy + it.y - size * 0.42 }; }
  // 字の輪郭の点列(画面座標)を取り出す。返り値: [[x,y,...], ...] 輪郭ごと
  function contours(it, ox, oy, size) { return it.g.c.map((c) => { const p = c.p, o = new Array(p.length); for (let i = 0; i < p.length; i += 2) { o[i] = ox + it.x + p[i] * size; o[i + 1] = oy + it.y + p[i + 1] * size; } return o; }); }

  // ---- 光 ----
  function glow(ctx, x, y, r, col, a = 0.6, op = "lighter") { if (r <= 0 || a <= 0) return; PAINT.glow(ctx, x, y, r, col, a, { op }); }
  const { rgb, mix, css } = DEPTH;

  return { W, H, FPS, N, clamp, lerp, P, eIO, eIOs, eOut, eOut5, eIn, smooth, backOut, backIn, spring, expoOut, mod, hash, rng, keys, wbuf, once,
    LT, CUES, phrase, word, wordOr, charStarts, acc, textMark, textLogBegin, textLogEnd, cam3, pj, horizonY, layout, charBox, contours, glow, rgb, mix, css, K };
})();
