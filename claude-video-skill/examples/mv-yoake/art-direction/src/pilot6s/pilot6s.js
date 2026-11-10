// 6秒の動きの試作(Phase 4)「暗闇の数だけ」A+C(木版画+字の中の日)。曲の 141〜320 コマ(4.70〜10.70秒、180 コマ)。
// 絵は cand_a2.js の 8秒(S8、採用値 win=4 / sky=2 / sun=2)をそのまま写し、各刀の跡・窓・字・色版に「開始コマと速さ」を与えて、
// 曲のコマ番号 F の純関数にした版。F = Infinity で描くと、静止画 style_ac_08s_{look,clean}.png と同じ画素になる(検査で md5 を比べる)。
// 動きの語彙は3つだけ: 彫る(刀の跡が刃先から伸びる/字は粗彫り→仕上げ)、刷る(ばれんの1回、4コマ)、版ずれ(色版が紙とずれる、最後の2コマ)。
// フェード・グロー・粒子・カメラ移動は使わない(不透明度を時間で変える処理は1つも無い)。
// 時刻は PILOT_TIMING(tools/gen_timing.py が audio/lyric_timeline.json と audio/sync_map.json から作る)だけから決める。コマ番号を直書きしない。
// 決まりごと: Math.random / Date.now / 前のコマの状態を使わない。乱数は固定シード。作業 canvas は毎コマ buf() で初期化。
const PILOT6S = (() => {
  const { W, H, clamp, lerp, smooth, rng, hash, fbm, vnoise, buf, mix, vertical, pathOf, dpClosed: dp, resample, stroke, perPixel, noiseField, bbox } = AD;
  const INK = "#14171f", PAPER = "#ece3cd", PLATE = "#e2742a";
  const BX0 = 56, BY0 = 46, BX1 = 1864, BY1 = 1034;
  let F = Infinity; // 描いているコマ(曲のコマ番号)。Infinity = 全部彫り終えた静止画

  // ===== 時刻の決め方(規則だけ。数値は歌詞の時刻とアクセントの表から) =====
  const T = PILOT_TIMING;
  const word = (t) => { const w = T.words.find((x) => x.text === t); if (!w) throw new Error("歌詞の語が無い: " + t); return w.start; };
  const phrase = (t) => { const p = T.phrases.find((x) => x.text === t); if (!p) throw new Error("歌詞の句が無い: " + t); return p.start; };
  const accIn = (a, b) => T.accents.filter((x) => x.frame30 >= a && x.frame30 <= b);
  const strongest = (a, b, key = "strength") => { const c = accIn(a, b); if (!c.length) throw new Error(`アクセントが無い ${a}..${b}`); return c.reduce((m, x) => (x[key] > m[key] ? x : m)).frame30; };
  const E = (() => {
    const e = { start: T.range[0], end: T.range[1] };
    e.kan = word("暗"); e.yami = word("闇"); e.no = word("の"); e.kazu = word("数"); e.dake = word("だけ"); e.kagayaki = phrase("輝きは増す");
    e.letters = [e.kan, e.yami, e.no, e.kazu, e.dake, e.dake + 4]; // 「だけ」は1語。2字目は4コマ遅れて彫り始める
    e.sunPrint = strongest(e.yami + 20, e.no - 1); // 暗・闇が読めた後の最も強いアクセントで、字の日に刷る(ばれん1回)
    e.city = [accIn(e.no + 1, e.dake)[0].frame30, e.dake + 12]; // の の後の最初のアクセントから、だけ が読めるまで: 町の光の側の彫り
    e.via = strongest(e.dake + 10, e.dake + 22); // だけ が読めた後: 字の足もとにビアを打ち、線を窓へ彫る
    e.winCarve = strongest(e.via + 6, e.via + 14); // 線が窓に届く → 窓を彫る
    e.winPrint = strongest(e.winCarve + 4, e.kagayaki - 1, "kick") - 1; // 輝きは増す の手前の、低音の最も強いアクセントの1コマ前に窓へ刷る(同時に出さない)
    e.skyBurst = strongest(e.winPrint + 5, e.kagayaki - 1); // 地平に近い空の筋を彫る
    e.thicken = e.kagayaki; // 輝きは増す: 空の筋が太く・長くなる(本数は増やさない)
    e.water = accIn(e.kagayaki, e.end)[0].frame30; // 川の映り
    e.misreg = [e.end - 2, e.end - 1]; // 最後の2コマ: 版ずれ(次のカットへ)
    return e;
  })();

  // ===== 共通(cand_a2.js と同じ式) =====
  function blockPath(g) {
    const pts = [], step = 8, n = (a, s) => (fbm(a * 0.02, s, 41, 3) - 0.5) * 7 + (hash(a | 0, s, 7) < 0.03 ? -4 : 0);
    for (let x = BX0; x <= BX1; x += step) pts.push([x, BY0 + n(x, 1)]);
    for (let y = BY0; y <= BY1; y += step) pts.push([BX1 + n(y, 2), y]);
    for (let x = BX1; x >= BX0; x -= step) pts.push([x, BY1 + n(x, 3)]);
    for (let y = BY1; y >= BY0; y -= step) pts.push([BX0 + n(y, 4), y]);
    g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath();
  }
  const cutW = (w, seed, entry, exit, n) => (u, i) => { const a = u < entry ? 0.55 + 0.45 * (u / entry) : 1, b = u > 1 - exit ? Math.pow((1 - u) / exit, 0.75) : 1; return w * a * b * (0.86 + 0.28 * vnoise(i * 0.15, seed * 0.37, 5)); };
  function cut(g, spine, w, seed, { entry = 0.08, exit = 0.4, jit = 0.6 } = {}) {
    const sp = resample(spine, 3); g.beginPath(); stroke(g, sp, cutW(w, seed, entry, exit), { jit, seed }); g.fill();
  }
  // 時刻つきの刀: sc = { s: 彫り始めのコマ, d: 刃先が終わりまで進むコマ数, wk: 幅の倍率, pmax: 長さの上限 }。
  // 彫り終えて wk = pmax = 1 なら cut() と同じ画素。途中は刃先までの帯(幅の式は全長で決めるので、伸びても形が変わらない)。
  function gcut(g, spine, w, seed, opts = {}, sc) {
    const wk = sc ? sc.wk ?? 1 : 1, pmax = sc ? sc.pmax ?? 1 : 1;
    if (!sc || (F >= sc.s + sc.d - 1 && wk === 1 && pmax === 1)) return cut(g, spine, w, seed, opts);
    const p = clamp((F - sc.s + 1) / sc.d) * pmax; if (p <= 0) return; // s のコマで刃先が 1/d 進んでいる(s = 彫りが見え始めるコマ)
    const { entry = 0.08, exit = 0.4, jit = 0.6 } = opts, sp = resample(spine, 3), n = sp.length, m = Math.max(2, Math.ceil(p * (n - 1)) + 1);
    const wf = cutW(w * wk, seed, entry, exit);
    const sub = sp.slice(0, m), done = p >= 1;
    g.beginPath(); stroke(g, sub, (u, i) => wf(i / (n - 1), i) * (done ? 1 : Math.min(1, 0.35 + (m - 1 - i) / 2.5)), { jit, seed }); g.fill();
  }
  const poly = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
  const facet = (cs, eps, s) => cs.map((ct, k) => dp(ct, eps).map(([x, y], i) => [x + (hash(i, k, s) - 0.5) * 1.4, y + (hash(i, k + 50, s) - 0.5) * 1.4]));
  const J = (pts, s, gy = 1e9) => pts.map(([x, y], i) => [x + (hash(i, 1, s) - 0.5) * 3, y + (y < gy ? (hash(i, 2, s) - 0.5) * 3 : 0)]);
  function keepOut(g, letters, lw = 34) { g.fillStyle = "#000"; g.strokeStyle = "#000"; g.lineJoin = "round"; g.lineWidth = lw; for (const L of letters) { g.beginPath(); pathOf(g, L.cs); g.stroke(); g.fill("nonzero"); } }
  function letterPlate(pg, L, { rect, contour }) {
    pg.save(); pg.beginPath();
    if (rect) { const [a, b, c, d] = rect; pg.rect(L.x0 + a * L.size, L.base + b * L.size, (c - a) * L.size, (d - b) * L.size); pg.clip(); pg.beginPath(); pathOf(pg, L.cs); pg.fill("nonzero"); }
    else { pathOf(pg, [L.cs[contour]]); pg.fill("nonzero"); }
    pg.restore();
  }
  // ビア(刺した丸)は丸刀の一突き: 打つコマから全部ある
  const via = (g, x, y, r0, at) => { if (F < at) return; g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, r0, 0, 7); g.fill(); g.fillStyle = "#000"; g.beginPath(); g.arc(x, y, r0 * 0.38, 0, 7); g.fill(); g.fillStyle = "#fff"; };

  // ===== 字を彫る: 輪郭(島)ごとに、粗彫り(刀幅の 74% の帯を並べ、帯の間に細い黒が残る)→ 仕上げ(帯の間を彫る) =====
  // 帯は島の長い向きに沿って、上→下・左→右へ伸びる。島の順は上から、同じ高さなら右から(縦書きの筆順に近い順)。
  const area = (ct) => { let a = 0; for (let i = 0; i < ct.length; i++) { const p = ct[i], q = ct[(i + 1) % ct.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  function letterPlan(fcs, s0) {
    const ar = fcs.map(area), big = ar.reduce((m, a, i) => (Math.abs(a) > Math.abs(ar[m]) ? i : m), 0), sg = Math.sign(ar[big]);
    const isl = fcs.map((ct, k) => ({ k, bb: bbox([ct]) })).filter((o, k) => Math.sign(ar[k]) === sg && Math.abs(ar[k]) > 30);
    isl.sort((a, b) => (Math.abs(a.bb[1] - b.bb[1]) > 14 ? a.bb[1] - b.bb[1] : b.bb[2] - a.bb[2]));
    const stag = Math.min(1.0, 4.5 / isl.length);
    let end = s0;
    isl.forEach((o, j) => {
      const [x0, y0, x1, y1] = o.bb, w = x1 - x0, h = y1 - y0; o.vert = h >= w * 0.8; o.s = s0 + j * stag;
      const across = o.vert ? w : h; o.m = Math.max(1, Math.ceil(across / 14)); o.bw = across / o.m;
      o.rough = o.s + (o.m - 1) * 0.3 + 1.6; o.fine = o.s + 3.6 + (o.m - 1) * 0.3 + 2.2; end = Math.max(end, o.fine);
    });
    return { isl, end: Math.ceil(end) };
  }
  function bandRect(g, o, j, lo, hi, p, seed) { // 帯 j の [lo, hi](帯の幅の割合)を、長さ p まで
    const [x0, y0, x1, y1] = o.bb, c0 = (j + 0.5) * o.bw, ja = (hash(j, 1, seed) - 0.5) * 3.2, jb = (hash(j, 2, seed) - 0.5) * 3.2; // 帯の縁は手の揺れで不揃い
    const a = c0 + (lo - 0.5) * o.bw + ja, b = c0 + (hi - 0.5) * o.bw + jb, tip = (0.25 + 0.3 * hash(j, 3, seed)) * o.bw;
    g.beginPath();
    if (o.vert) { const L = (y1 - y0 + 4) * p, ya = y0 - 2; g.moveTo(x0 + a, ya); g.lineTo(x0 + b, ya); g.lineTo(x0 + b, ya + L); g.lineTo(x0 + a, ya + L - (p < 1 ? tip : 0)); }
    else { const L = (x1 - x0 + 4) * p, xa = x0 - 2; g.moveTo(xa, y0 + a); g.lineTo(xa, y0 + b); g.lineTo(xa + L - (p < 1 ? tip : 0), y0 + b); g.lineTo(xa + L, y0 + a); }
    g.closePath(); g.fill();
  }
  function carveLetters(g, letters, seed, starts, plans) {
    g.fillStyle = "#fff";
    letters.forEach((L, i) => {
      const fcs = facet(L.cs, Math.min(3.3, L.size * 0.019), seed + i), pl = plans[i];
      if (F >= pl.end) { g.fillStyle = "#fff"; g.beginPath(); pathOf(g, fcs); g.fill("nonzero"); return; } // 彫り終えた字は cand_a2.js の carve() と同じ
      if (F < starts[i]) return;
      const bb = bbox(fcs), bx = Math.floor(bb[0]) - 6, by = Math.floor(bb[1]) - 6, bw = Math.ceil(bb[2] - bx) + 6, bh = Math.ceil(bb[3] - by) + 6;
      const [lc, lg] = buf("letterCarve", bw, bh); lg.translate(-bx, -by); lg.fillStyle = "#fff";
      for (const o of pl.isl) {
        if (F < o.s) continue;
        lg.save(); lg.beginPath(); pathOf(lg, [fcs[o.k]]); lg.clip("nonzero");
        for (let j = 0; j < o.m; j++) {
          const pr = clamp((F - (o.s + j * 0.3) + 1) / 1.6); if (pr > 0) bandRect(lg, o, j, 0.13, 0.87, pr, seed * 7 + i * 31 + o.k);
          const pf = clamp((F - (o.s + 3.6 + j * 0.3) + 1) / 2.2); if (pf > 0) bandRect(lg, o, j, -0.06, 1.06, pf, seed * 7 + i * 31 + o.k + 500);
        }
        lg.restore();
      }
      lg.globalCompositeOperation = "destination-in"; lg.beginPath(); pathOf(lg, fcs); lg.fill("nonzero"); // 字の穴(カウンター)は彫らない
      g.drawImage(lc, bx, by);
    });
  }

  // ===== 刷る: ばれんの1回(4コマ)。版の上の刷れた所は、ばれんの進み(上→下 / 左→右)とインクの乗りのむらで決まる(0 か 1。透明度の変化は使わない) =====
  function baren(pg, rect, strike, dir, seed) {
    const q = 0.4 + 0.2 * (F - strike); if (q >= 1) return; // strike のコマで版の4割、4コマ目で刷り終える
    const [x0, y0, x1, y1] = rect.map(Math.round), w = x1 - x0, h = y1 - y0;
    if (F < strike) { pg.clearRect(x0, y0, w, h); return; } // 刷る前
    const img = pg.getImageData(x0, y0, w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (!d[i + 3]) continue;
      const u = dir === "down" ? y / h : x / w, n1 = fbm((x0 + x) * 0.03, (y0 + y) * 0.03, seed, 3), n2 = fbm((x0 + x) * 0.11, (y0 + y) * 0.11, seed + 9, 2);
      if (!(u + 0.3 * (n1 - 0.5) < q * 1.2 - 0.05 && n2 < 0.42 + 0.75 * q)) d[i + 3] = 0;
    }
    pg.putImageData(img, x0, y0);
  }

  // ===== 刷りの画素処理(cand_a2.js の print() と同じ。紙の繊維・インクのむらの表は位置だけの関数なので1回だけ作る) =====
  let NF = null;
  const fields = () => NF || (NF = {
    grain: noiseField(W, H, 6, (x, y) => fbm(x * 0.0022, y * 0.09, 61, 3)), blot: noiseField(W, H, 8, (x, y) => fbm(x * 0.006, y * 0.006, 62, 4)),
    fiber: noiseField(W, H, 3, (x, y) => fbm(x * 0.05, y * 0.05, 63, 3)), edge: noiseField(W, H, 3, (x, y) => vnoise(x * 0.35, y * 0.35, 64)),
  });
  function print(ctx, mask, plate, look, shift = [0, 0]) {
    const ink = AD.hex(INK), paper = AD.hex(PAPER), pc = AD.hex(PLATE);
    const [o, og] = buf("out"); og.drawImage(mask, 0, 0);
    const md = mask.getContext("2d").getImageData(0, 0, W, H).data, pd = plate.getContext("2d").getImageData(0, 0, W, H).data;
    let bd = md;
    if (look) { const [b, bg] = buf("blur"); bg.filter = "blur(0.9px)"; bg.drawImage(mask, 0, 0); bd = bg.getImageData(0, 0, W, H).data; }
    const { grain, blot, fiber, edge } = fields();
    let inBlock = 0, carved = 0, plated = 0;
    const ox = (look ? -3 : 0) + shift[0], oy = (look ? 2 : 0) + shift[1];
    perPixel(o, (x, y) => {
      const i = (y * W + x) * 4; let v = bd[i] / 255;
      if (x > BX0 + 8 && x < BX1 - 8 && y > BY0 + 8 && y < BY1 - 8) { inBlock++; if (md[i] > 127) carved++; }
      if (look) { const t = 0.5 + (edge(x, y) - 0.5) * 0.42; v = smooth((v - (t - 0.1)) / 0.2); } else v = v > 0.5 ? 1 : 0;
      let ic = ink, pp = paper;
      if (look) {
        const thin = clamp((grain(x, y) - 0.45) * 2.2) * 0.13 + (blot(x, y) - 0.5) * 0.12, speck = hash((x / 2) | 0, (y / 2) | 0, 71) < 0.0007 ? 0.45 : 0;
        ic = mix(ink, paper, clamp(thin + speck, 0, 0.6) * 0.5 + 0.02);
        const f = (fiber(x, y) - 0.5) * 0.09; pp = [paper[0] * (1 + f), paper[1] * (1 + f), paper[2] * (1 + f * 1.2)];
      }
      let c = mix(ic, pp, v);
      const px = x + ox, py = y + oy; let pv = 0;
      if (px >= 0 && py >= 0 && px < W && py < H) pv = pd[(py * W + px) * 4 + 3] / 255;
      if (pv > 0) { const k = pv * v * (look ? 0.82 + 0.3 * (blot((x * 1.7) % W, (y * 1.7) % H) - 0.5) : 1); if (k > 0.5) plated++; c = [lerp(c[0], c[0] * pc[0] / 255, k), lerp(c[1], c[1] * pc[1] / 255, k), lerp(c[2], c[2] * pc[2] / 255, k)]; }
      return c;
    });
    ctx.drawImage(o, 0, 0);
    return { carved_in_block: +(carved / inBlock).toFixed(4), plate_of_frame: +(plated / (W * H)).toFixed(4) };
  }

  // ===== 8秒の版(cand_a2.js の S8。採用値だけ残し、刀ごとに時刻を付けた) =====
  const EMB = 712, EMB2 = 760, SUN = [960, 742];
  const arcPts = (cx, cy, r, a0, a1, wob, seed, ex, ey) => { const n = Math.max(3, Math.ceil((Math.abs(a1 - a0) * r * 1.3) / 4)), out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = r + (fbm(a * 3, seed, 11, 2) - 0.5) * wob; out.push([cx + Math.cos(a) * rr * ex, cy + Math.sin(a) * rr * ey]); } return out; };
  const SKY_PRE = 0.3; // これより暗い筋(地平から遠い)は、最初のコマから彫ってある(夜の空)
  // 空の筋の時刻: 明るい筋(地平に近い)は skyBurst から、太陽の位置から外へ 7 コマで彫られる。輝きは増す(thicken)で、明るい筋ほど太く長くなる
  function skySched(rad, tone, seed) {
    if (tone < SKY_PRE) return null;
    const k = smooth((tone - SKY_PRE) / 0.45), x = clamp((F - E.thicken + 1) / 7), e = 1 - Math.pow(1 - x, 3); // 輝きは増す のコマで一番大きく太る(ease-out)
    return { s: E.skyBurst + 4 * clamp((rad - 230) / 400) + 0.6 * hash(seed, 3, 5), d: 2.5, wk: lerp(1 - 0.42 * k, 1, e), pmax: lerp(1 - 0.3 * k, 1, e) };
  }
  function sky(g) {
    const r = rng(101); g.fillStyle = "#fff"; let n = 0;
    const ex = 1.78, ey = 0.70;
    for (let rad = 52; rad < 1180;) {
      const base = Math.pow(1 - smooth((rad - 46) / 900), 1.35); if (base < 0.03) break; n++;
      let a = Math.PI + (r() * 30) / rad;
      while (a < 2 * Math.PI) {
        const len = (60 + r() * 170) / rad * 1.25, a1 = Math.min(2 * Math.PI, a + len);
        const pts = arcPts(SUN[0], SUN[1], rad, a, a1, 7, (rad * 13) | 0, ex, ey).filter((p) => p[1] < EMB - 2 && p[0] > BX0 - 10 && p[0] < BX1 + 10);
        const my = pts.length ? pts[(pts.length / 2) | 0][1] : 0, tone = base * (0.45 + 0.55 * (1 - smooth((EMB - my) / 560)));
        let w = 1.1 + 9.5 * tone, gap = lerp(52, 9, tone), skip = 0.15 * (1 - tone);
        const am = (a + a1) / 2, steep = Math.abs(Math.cos(am)), high = smooth((EMB - my - 260) / 300);
        skip += 0.92 * smooth((steep - 0.66) / 0.24) + 0.35 * high;
        gap *= 1 + 1.4 * high; w *= 1 - 0.3 * high;
        if (pts.length > 3 && r() > skip) { const seed = (rad * 7 + a * 100) | 0; gcut(g, pts, w * (0.75 + 0.5 * r()), seed, { entry: 0.12, exit: 0.55, jit: 0.7 }, skySched(rad, tone, seed)); }
        a = a1 + (5 + r() * gap) / rad;
      }
      const band = 0.75 + 0.6 * fbm(rad * 0.0045, 3.7, 19, 2);
      rad += (10 + rad * 0.016 + r() * 4) * band;
    }
    return n;
  }
  const WATER_PRE = 0.35; // 太陽の映りから遠い暗い筋は最初から。映り(明るい筋)は water から、土手から下へ 10 コマで
  function water(g) {
    const r = rng(202); g.fillStyle = "#fff";
    for (let y = EMB2 + 9; y < BY1 - 4; y += 5.5 + (y - EMB2) * 0.036) {
      let x = BX0 - 20 + r() * 40;
      while (x < BX1) {
        const half = 120 + (y - EMB2) * 0.55, d = Math.abs(x - SUN[0]) / half, tone = Math.max(0.18 * (1 - (y - EMB2) / 400), Math.pow(clamp(1 - d), 1.6) * (1 - (y - EMB2) / 520));
        const len = lerp(30, 150, r()) * lerp(0.6, 1.2, tone), w = lerp(1.1, 7.5, tone) * (0.7 + 0.6 * r());
        if (r() < 0.25 + tone) {
          const wob = (vnoise(x * 0.01, y * 0.05, 3) - 0.5) * 3, seed = (x * 3 + y * 7) | 0;
          const sc = tone < WATER_PRE ? null : { s: E.water + 9 * clamp((y - EMB2 - 25) / 200) + 0.5 * hash(seed, 4, 5), d: 3 };
          gcut(g, [[x, y + wob], [x + len * 0.5, y + wob + (r() - 0.5) * 1.5], [x + len, y + wob]], w, seed, { entry: 0.12, exit: 0.5 }, sc);
        }
        x += len + lerp(40, 8, tone) * (0.5 + r());
      }
    }
  }
  const CITY = [
    J([[BX0 - 10, EMB], [BX0 - 10, 318], [70, 318], [70, 302], [86, 302], [86, 270], [92, 262], [114, 262], [120, 270], [120, 302], [134, 302], [134, 318], [152, 318], [152, EMB]], 1, EMB),
    J([[150, EMB], [150, 566], [208, 524], [266, 566], [266, EMB]], 2, EMB),
    J([[262, EMB], [262, 474], [296, 474], [296, 444], [338, 444], [338, 430], [356, 430], [356, 444], [394, 444], [394, 474], [420, 474], [420, EMB]], 3, EMB),
    J([[418, EMB], [418, 636], [434, 636], [442, 232], [462, 232], [470, 600], [480, 600], [480, EMB]], 4, EMB),
    J([[476, EMB], [476, 500], [552, 500], [552, 478], [600, 478], [600, 500], [644, 500], [644, EMB]], 5, EMB),
    J([[712, EMB], [712, 612], [754, 584], [796, 612], [796, 602], [830, 578], [864, 602], [864, EMB]], 7, EMB),
    J([[860, EMB], [860, 526], [884, 526], [884, 514], [952, 514], [952, 526], [980, 526], [980, EMB]], 8, EMB),
    J([[976, EMB], [976, 650], [1064, 676], [1064, EMB]], 9, EMB),
  ];
  const TOWER = { tank: [[650, 474], [681, 450], [712, 474], [708, 528], [654, 528]], legs: [[[660, 528], [654, EMB]], [[702, 528], [708, EMB]], [[660, 560], [704, 612]], [[704, 560], [658, 612]], [[657, 612], [705, 612]], [[656, 652], [706, 652]]] };
  const MAST = [[[918, 514], [918, 300]], [[904, 360], [932, 360]], [[908, 410], [928, 410]], [[918, 300], [906, 330]]];
  const WINDOWS = [[94, 360], [96, 420], [118, 510], [118, 600], [196, 610], [316, 520], [512, 560], [588, 620], [606, 540], [748, 650], [1010, 690]];
  // 町の輪郭(刀の縁)は最初のコマからある(版の構図を最初に見せる)。町の光の側の彫りと小さい窓は、太陽に近い建物から順に彫る
  const cx = (b) => { let xl = 1e9, xr = -1; for (const [x] of b) { xl = Math.min(xl, x); xr = Math.max(xr, x); } return [xl, xr]; };
  const CITY_RANK = (() => { const idx = CITY.map((b, i) => i).sort((i, j) => Math.abs((cx(CITY[i])[0] + cx(CITY[i])[1]) / 2 - SUN[0]) - Math.abs((cx(CITY[j])[0] + cx(CITY[j])[1]) / 2 - SUN[0])); const rk = []; idx.forEach((b, r) => (rk[b] = r)); return rk; })();
  const cityStart = (b) => lerp(E.city[0], E.city[1] - 8, CITY_RANK[b] / (CITY.length - 1));
  const buildingAt = (x) => { const i = CITY.findIndex((b) => { const [a, c] = cx(b); return x >= a && x < c; }); return i < 0 ? CITY.length - 1 : i; };
  function city(g) {
    g.strokeStyle = "#fff"; g.lineJoin = "miter"; g.lineWidth = 6;
    for (const b of CITY) { g.beginPath(); poly(g, b); g.stroke(); }
    g.beginPath(); poly(g, TOWER.tank); g.stroke(); g.lineWidth = 11; for (const [a, b] of TOWER.legs.concat(MAST)) { g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.fillStyle = "#000"; for (const b of CITY) { g.beginPath(); poly(g, b); g.fill(); }
    g.beginPath(); poly(g, TOWER.tank); g.fill(); g.strokeStyle = "#000"; g.lineCap = "butt";
    for (const [i, [a, b]] of TOWER.legs.entries()) { g.lineWidth = i < 2 ? 6 : 3.2; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    for (const [i, [a, b]] of MAST.entries()) { g.lineWidth = i === 0 ? 4.5 : 2.6; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    g.fillStyle = "#000"; g.fillRect(0, EMB, W, EMB2 - EMB);
  }
  function cityDetail(g) {
    g.fillStyle = "#fff"; const r = rng(303);
    CITY.forEach((b, bi) => {
      const [xl, xr] = cx(b), right = (xl + xr) / 2 < SUN[0], xe = right ? xr : xl, sg = right ? 1 : -1, s0 = cityStart(bi);
      const xrTop = b.filter(([x]) => Math.abs(x - xe) < 6).reduce((m, p) => Math.min(m, p[1]), 1e9);
      for (let y = xrTop + 6; y < EMB - 6; y += 6 + r() * 3) {
        const k = 1 - (y - xrTop) / (EMB - xrTop), len = (8 + 30 * k) * (0.6 + 0.6 * r());
        if (r() < 0.25) continue;
        gcut(g, [[xe - 3 * sg, y], [xe - (3 + len) * sg, y + (r() - 0.5) * 2]], 1.4 + 1.6 * k, (y * 31 + xe) | 0, { entry: 0.05, exit: 0.7, jit: 0.3 }, { s: s0 + 6 * (y - xrTop) / (EMB - xrTop), d: 2 });
      }
    });
    for (const [i, [x, y]] of WINDOWS.entries()) { if (F < cityStart(buildingAt(x)) + 4) continue; const w = 9 + hash(i, 3, 9) * 6, h = 12 + hash(i, 4, 9) * 7; g.beginPath(); poly(g, [[x, y], [x + w, y + (hash(i, 5, 9) - 0.5) * 2], [x + w + (hash(i, 6, 9) - 0.5) * 2, y + h], [x, y + h + (hash(i, 7, 9) - 0.5) * 2]]); g.fill(); }
    for (const [a, b, y] of [[480, 640, 512], [480, 640, 532], [866, 976, 540], [300, 390, 458]]) gcut(g, [[a + 4, y], [b - 4, y + 1]], 1.6, a + y, { entry: 0.02, exit: 0.3, jit: 0.4 }, { s: cityStart(buildingAt(a + 8)) + 3, d: 3 });
    for (let x = BX0 + 30; x < BX1; x += 60 + r() * 70) { if (x > 1490 && x < 1700) continue; cut(g, [[x, EMB + 6], [x + (r() - 0.5) * 3, EMB2 - 8]], 1.3, x | 0, { entry: 0.1, exit: 0.5, jit: 0.3 }); }
    cut(g, [[BX0, EMB2 - 1], [BX1, EMB2 - 1]], 1.6, 77, { entry: 0.01, exit: 0.02, jit: 0.8 });
  }
  // 灯る窓(採用 W4): 壁の光の彫りは窓から外へ、窓の桟は1枚ずつ
  function handWindow(g, x, y, w, h, cols, rows, seed, at) {
    const bar = Math.max(5, w * 0.11), pw = (w - bar * (cols - 1)) / cols, ph = (h - bar * (rows - 1)) / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i; if (F < at + k) continue;
      const q = (a) => (hash(k, a, seed) - 0.5) * 2.4, sx = 1 + (hash(k, 9, seed) - 0.5) * 0.12, sy = 1 + (hash(k, 10, seed) - 0.5) * 0.12;
      const x0 = x + i * (pw + bar), y0 = y + j * (ph + bar), P = [[x0 + q(1), y0 + q(2)], [x0 + pw * sx + q(3), y0 + q(4)], [x0 + pw * sx + q(5), y0 + ph * sy + q(6)], [x0 + q(7), y0 + ph * sy + q(8)]];
      g.beginPath(); poly(g, P); g.fill();
    }
  }
  function wallLight(g, cx0, cy0, r0, seed, k, at) {
    const rr = rng(seed); g.fillStyle = "#fff";
    for (let yy = cy0 - r0 * 0.75; yy < cy0 + r0 * 1.05; yy += 4.6 * k) for (let xx = cx0 - r0 * 0.95 + rr() * 8; xx < cx0 + r0 * 0.95; xx += (12 + rr() * 8) * k) {
      const d = Math.hypot((xx + 6 - cx0) / 1.3, yy - cy0) / r0; if (d > 1 || rr() < d * 0.45) continue;
      gcut(g, [[xx, yy], [xx + (9 + 14 * (1 - d)) * k, yy + (rr() - 0.5)]], (1.0 + 3.4 * (1 - d)) * k, (xx * 5 + yy) | 0, { entry: 0.1, exit: 0.6, jit: 0.3 }, { s: at + 1 + 5 * d, d: 2 });
    }
  }
  const WIN = { f: [882, 552, 64, 78], light: [914, 591, 90, 1.2], plate: [916, 600, 132, 112] };
  function litWindow(g) {
    wallLight(g, WIN.light[0], WIN.light[1], WIN.light[2], 404, WIN.light[3], E.winCarve);
    const [x, y, w, h] = WIN.f; g.fillStyle = "#000"; g.fillRect(x, y, w, h); g.fillStyle = "#fff"; handWindow(g, x + 5, y + 5, w - 10, h - 10, 2, 2, 31, E.winCarve);
  }
  const TX = 1594, TT = 104, SIZES = [170, 170, 122, 122, 122, 122];
  const letters = () => vertical("SMB", "暗闇の数だけ", TX, TT, SIZES, 1.03);
  // 回路の線: 字の足もとのビアから土手を左へ、窓の下の縁まで(via → winCarve の間に刃先が進む)
  const CIRCUIT = [[TX - 64, 736], [1250, 736], [1120, 736], [1046, 736], [1016, 706], [1016, 686], [988, 658], [934, 658], [914, 640], [914, 628]];
  function circuit(g) {
    g.fillStyle = "#fff"; const s = E.via, d = E.winCarve - E.via;
    gcut(g, CIRCUIT, 6.2, 909, { entry: 0.01, exit: 0.015, jit: 0.9 }, { s, d });
    let tot = 0; const acc = [0]; for (let i = 1; i < CIRCUIT.length; i++) acc.push((tot += Math.hypot(CIRCUIT[i][0] - CIRCUIT[i - 1][0], CIRCUIT[i][1] - CIRCUIT[i - 1][1])));
    const at = (i) => Math.max(s, s - 1 + Math.ceil((acc[i] / tot) * d)); // 刃先が通ったコマで打つ
    for (const [x, y, r0, i] of [[TX - 64, 736, 9, 0], [1046, 736, 7, 3], [988, 658, 6, 6]]) via(g, x, y, r0, at(i));
  }

  function draw(ctx, frame, { look = true } = {}) {
    F = frame;
    const [m, g] = buf("maskP6");
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
    g.save(); g.beginPath(); blockPath(g); g.fillStyle = "#000"; g.fill(); g.clip();
    const L = letters();
    const plans = L.map((Li, i) => letterPlan(facet(Li.cs, Math.min(3.3, Li.size * 0.019), 300 + i), E.letters[i]));
    const arcs = sky(g); water(g); city(g); keepOut(g, L); cityDetail(g); circuit(g); litWindow(g); carveLetters(g, L, 300, E.letters, plans);
    g.restore();
    const [p, pg] = buf("plateP6"); pg.fillStyle = "#000"; const e = WIN.plate;
    pg.save(); pg.beginPath(); poly(pg, CITY[6]); pg.clip(); pg.beginPath(); pg.ellipse(e[0], e[1], e[2], e[3], 0, 0, 7); pg.fill(); pg.restore();
    baren(pg, [e[0] - e[2], e[1] - e[3], e[0] + e[2], e[1] + e[3]], E.winPrint, "right", 811);
    letterPlate(pg, L[0], { rect: [0.04, -0.80, 0.36, -0.12] }); letterPlate(pg, L[1], { contour: 6 });
    const sb = bbox(L[0].cs.concat(L[1].cs)); baren(pg, [sb[0] - 4, sb[1] - 4, sb[2] + 4, sb[3] + 4], E.sunPrint, "down", 812);
    const shift = F === E.misreg[0] ? [-7, 4] : F === E.misreg[1] ? [-17, 9] : [0, 0];
    const st = print(ctx, m, p, look, shift);
    return Object.assign(st, { frame: F, sky_arcs: arcs, letters_end: plans.map((pl) => pl.end) });
  }
  return { draw, E, letterRects: () => letters().map((L) => ({ ch: L.ch, bb: bbox(L.cs) })) };
})();
