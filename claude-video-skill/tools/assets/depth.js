// 質感・奥行きの部品(Canvas 2D)。ベタ塗りの 2D に「粒・光・接地・陰・空気・層の厚み・簡易3D」を足す。
// 約束: 絵は時刻 t と引数だけで決まる(乱数は seed 付き mulberry32。Math.random / Date.now は使わない)。
//       内部のキャッシュ(粒・球の陰)は引数だけをキーにするので、どの順で seek しても同じ絵になる。
// 埋め込み方: scene-lib.js の「後」に連結する(SCENE_LIB の mulberry32 / clamp / lerp / smooth を使う)。
//   シェル: lib="$(cat tools/assets/scene-lib.js)
//   $(cat tools/assets/depth.js)"        … new_scene.sh の lib= に足す要領。既存の index.html なら SCENE_LIB 定義の直後に貼る。
//   使う側: const { grain, contactShadow, reflection, spot, shadeSphere, hazeLayer, paperLayer, lightSweep } = DEPTH;
//   ※ ビネットは SCENE_LIB.vignette と名前が重なるので DEPTH.vignette(...) と書く。
// 重ねる順(奥→手前): spot/floor → 遠景 hazeLayer・paperLayer → reflection → contactShadow → 主役(shadeSphere / drawMesh)
//                     → lightSweep → DEPTH.vignette → grain(最前面)
// 色は "#rrggbb" / "#rgb" / [r,g,b] のどれでもよい。解説: references/depth-and-texture.md
const DEPTH = (() => {
  const { mulberry32, clamp, lerp, smooth } = SCENE_LIB;

  // ---- 色 ----
  const rgb = (c) => {
    if (Array.isArray(c)) return c;
    let s = String(c).replace("#", "");
    if (s.length === 3) s = s.split("").map((ch) => ch + ch).join("");
    const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, k) => { a = rgb(a); b = rgb(b); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; };
  const css = (c, a = 1) => { c = rgb(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
  const luma = (c) => { c = rgb(c); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  // 陰の色: 黒を混ぜず、同系色を暗くして少し青へ寄せる / 光の色: 少し暖かい白を混ぜる
  const darkOf = (c) => { c = rgb(c); return [c[0] * 0.3 + 8, c[1] * 0.33 + 10, c[2] * 0.42 + 24]; };
  const brightOf = (c) => mix(c, [255, 247, 232], 0.4);
  // 3点ランプ(暗→地→明)。k=0..1
  const ramp = (dark, base, bright, k) => (k < 0.5 ? mix(dark, base, k * 2) : mix(base, bright, (k - 0.5) * 2));

  // ---- 作業用キャンバス(名前ごとに1枚を使い回す) ----
  const bufs = {};
  const buf = (name, w, h) => {
    let b = bufs[name];
    if (!b) { b = bufs[name] = document.createElement("canvas"); }
    if (b.width !== w || b.height !== h) { b.width = w; b.height = h; }
    const g = b.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none"; g.clearRect(0, 0, w, h);
    return [b, g];
  };

  // ---- 粒(紙・フィルム) ----
  // fps 回/秒だけ模様が入れ替わる(毎コマ変えるとうるさい)。点は白と黒、濃さ alpha[0]〜alpha[1] を3段に分けて一括で塗る。
  // count 省略時は画面の画素数 × density(1080p で約2.5万点)。
  const grainCache = { key: "", canvas: null };
  function grain(ctx, t, { w = 1920, h = 1080, count, density = 0.012, alpha = [0.03, 0.08], size = [1, 2.4], seed = 11, fps = 12, tint = [[255, 255, 255], [0, 0, 0]] } = {}) {
    const f = Math.floor(t * fps + 1e-6), n = count ?? Math.round(w * h * density);
    const key = [w, h, n, alpha, size, seed, f, tint].join("|");
    if (grainCache.key !== key) {
      const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
      const r = mulberry32((seed * 7919) ^ (f * 104729 + 17)), lv = 3, paths = [];
      for (let k = 0; k < tint.length * lv; k++) paths.push(new Path2D());
      for (let i = 0; i < n; i++) {
        const x = r() * w, y = r() * h, s = lerp(size[0], size[1], r()), ci = r() * tint.length | 0, ai = r() * lv | 0;
        paths[ci * lv + ai].rect(x, y, s, s);
      }
      paths.forEach((p, k) => { const ai = k % lv, ci = (k / lv) | 0; g.fillStyle = css(tint[ci], lerp(alpha[0], alpha[1], ai / (lv - 1))); g.fill(p); });
      grainCache.key = key; grainCache.canvas = c;
    }
    ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.drawImage(grainCache.canvas, 0, 0); ctx.restore();
  }

  // ---- 周辺減光(非線形・楕円・色つき) ----
  // 中心から inner までは素通し、そこから外へ s^power で濃くなる。暖色にすると夕景・紙っぽくなる(例 color "#3c1400")。
  function vignette(ctx, a = 0.45, { w = 1920, h = 1080, color = "#000000", inner = 0.45, outer = 1.45, power = 2.2 } = {}) {
    const c = rgb(color), R = w / 2;
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, R * inner, 0, 0, R * outer);
    for (let i = 0; i <= 8; i++) { const s = i / 8; g.addColorStop(s, css(c, a * Math.pow(s, power))); }
    ctx.fillStyle = g; ctx.fillRect(-R, -R, w, w); ctx.restore();
  }

  // ---- スポット背景 / 床 ----
  // (x,y) を中心に color を a の濃さで足す。base を渡すと先に全面を base で塗る(上寄りの y にすると「撮影台」になる)。
  function spot(ctx, x, y, r, color = "#ffffff", a = 0.35, { w = 1920, h = 1080, base, falloff = 1.8 } = {}) {
    if (base) { ctx.fillStyle = css(base); ctx.fillRect(0, 0, w, h); }
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    for (let i = 0; i <= 6; i++) { const s = i / 6; g.addColorStop(s, css(color, a * Math.pow(1 - s, falloff))); }
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  // 床: groundY から下へ top→bottom の縦グラデ。奥(上端)を少し明るくすると床が後ろへ伸びて見える。
  function floor(ctx, groundY, top, bottom, { w = 1920, h = 1080 } = {}) {
    const g = ctx.createLinearGradient(0, groundY, 0, h); g.addColorStop(0, css(top)); g.addColorStop(1, css(bottom));
    ctx.fillStyle = g; ctx.fillRect(0, groundY, w, h - groundY);
  }

  // ---- 接地影 ----
  // (x,y)=床に触れる点、w=物の幅。lift=床からの高さ(px)。高いほど小さく薄くなる。芯(濃い)+裾(広く薄い)の2重。
  function contactShadow(ctx, x, y, w, { alpha = 0.4, lift = 0, flat = 0.17, color = "#000000" } = {}) {
    const k = 1 / (1 + Math.max(0, lift) / (w * 0.5)), c = rgb(color);
    ctx.save(); ctx.translate(x, y); ctx.scale(1, flat);
    [[0.62 + 0.38 * k, alpha * k * k * 0.6], [0.38 + 0.2 * k, alpha * k * k * k]].forEach(([sc, a]) => {
      const rw = (w / 2) * sc, g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
      g.addColorStop(0, css(c, a)); g.addColorStop(0.45, css(c, a * 0.7)); g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g; ctx.fillRect(-rw, -rw, rw * 2, rw * 2);
    });
    ctx.restore();
  }

  // ---- 床への映り込み ----
  // drawFn(g) は本体と同じ座標で描く関数。groundY で上下反転し、fade px で消える。本体より「先に」呼ぶ。
  function reflection(ctx, drawFn, groundY, { alpha = 0.16, fade = 260, blur = 0, w = 1920, h = 1080 } = {}) {
    const [b, g] = buf("reflection", w, h);
    g.save(); if (blur) g.filter = `blur(${blur}px)`; g.translate(0, groundY * 2); g.scale(1, -1); drawFn(g); g.restore();
    g.globalCompositeOperation = "destination-in";
    const m = g.createLinearGradient(0, groundY, 0, groundY + fade);
    for (let i = 0; i <= 5; i++) { const s = i / 5; m.addColorStop(s, `rgba(0,0,0,${Math.pow(1 - s, 2)})`); }
    g.fillStyle = m; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.fillRect(0, 0, w, groundY); // 床より上は消す
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(b, 0, 0); ctx.restore();
  }

  // ---- 球の陰(擬似法線) ----
  // 円内の位置 (nx,ny) から nz=√(1−nx²−ny²) を作り、光 light との角度で 暗→地→明 を混ぜる。黒は使わない。
  // light=[lx,ly] か [lx,ly,lz](画面座標: x右・y下・z手前)。steps=2〜3 でトゥーン調。rim=縁の照り返し 0〜1。
  // 画素計算は (r, 色, 光, …) ごとに1回だけ(キャッシュ)。squash=[sx,sy] で着地の潰れ。
  const sphereCache = new Map();
  function shadeSphere(ctx, x, y, r, base, { light = [-0.5, -0.65], dark, bright, ambient = 0.1, wrap = 0.3, spec = 0.35, shine = 28, rim = 0.35, rimColor, steps = 0, squash = [1, 1] } = {}) {
    const L0 = light.length > 2 ? light : [light[0], light[1], 0.6], ln = Math.hypot(...L0), L = L0.map((v) => v / ln);
    const B = rgb(base), D = rgb(dark ?? darkOf(B)), W = rgb(bright ?? brightOf(B)), RC = rgb(rimColor ?? mix(W, [200, 225, 255], 0.5));
    const key = [r.toFixed(2), B, D, W, L.map((v) => v.toFixed(3)), ambient, wrap, spec, shine, rim, RC, steps].join("|");
    let c = sphereCache.get(key);
    if (!c) {
      const S = Math.ceil(r * 2) + 2, o = S / 2; c = document.createElement("canvas"); c.width = c.height = S;
      const g = c.getContext("2d"), img = g.createImageData(S, S), d = img.data;
      const H = [L[0], L[1], L[2] + 1], hn = Math.hypot(...H); H[0] /= hn; H[1] /= hn; H[2] /= hn;
      for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
        const dx = (px + 0.5 - o) / r, dy = (py + 0.5 - o) / r, q = dx * dx + dy * dy, edge = clamp((1 - Math.sqrt(q)) * r + 0.5);
        if (edge <= 0) continue;
        const nz = Math.sqrt(Math.max(0, 1 - q)), nl = dx * L[0] + dy * L[1] + nz * L[2];
        let k = ambient + (1 - ambient) * clamp((nl + wrap) / (1 + wrap));
        let s = spec * Math.pow(Math.max(0, dx * H[0] + dy * H[1] + nz * H[2]), shine);
        if (steps > 1) { k = Math.round(k * (steps - 1)) / (steps - 1); s = s > spec * 0.5 ? spec : 0; }
        let col = ramp(D, B, W, k);
        const rr = rim * Math.pow(1 - nz, 2.5) * clamp(0.5 - nl); // 光の反対側の縁だけ
        col = mix(col, RC, clamp(rr)); col = mix(col, [255, 255, 255], clamp(s));
        const i = (py * S + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255 * edge;
      }
      g.putImageData(img, 0, 0);
      if (sphereCache.size > 48) sphereCache.delete(sphereCache.keys().next().value);
      sphereCache.set(key, c);
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(squash[0], squash[1]); ctx.drawImage(c, -c.width / 2, -c.height / 2); ctx.restore();
  }

  // ---- 空気遠近 ----
  // depth01: 0=手前 1=最も遠い。色を灰へ寄せ(彩度↓)、さらに空の色 sky へ寄せる(明度・コントラスト↓)。
  //   c' = mix( mix(c, 灰(c), desat·d), sky, amount·d^1.2 )
  const hazeColor = (c, depth01, sky, { amount = 0.7, desat = 0.5 } = {}) => {
    const d = clamp(depth01), y = luma(c); return css(mix(mix(c, [y, y, y], desat * d), sky, amount * Math.pow(d, 1.2)));
  };
  // 層ごと: drawFn(g) で描いた層に sky を amount·d^1.2 だけ被せ、blur·d px ぼかして重ねる(遠景のピンぼけ)。
  function hazeLayer(ctx, drawFn, depth01, sky, { amount = 0.7, blur = 0, w = 1920, h = 1080 } = {}) {
    const d = clamp(depth01), [b, g] = buf("haze", w, h);
    drawFn(g); g.globalCompositeOperation = "source-atop"; g.fillStyle = css(sky, amount * Math.pow(d, 1.2)); g.fillRect(0, 0, w, h);
    ctx.save(); if (blur * d > 0.3) ctx.filter = `blur(${(blur * d).toFixed(2)}px)`; ctx.drawImage(b, 0, 0); ctx.restore();
  }

  // ---- 視差 ----
  // カメラの移動量 cam(px、数値か [x,y])から層ごとのずれを返す。既定は 遠:中:近 = 1:3:9(近景がカメラと同じだけ動く)。
  const parallaxLayers = (cam, ratios = [1, 3, 9]) => {
    const top = Math.max(...ratios), cx = Array.isArray(cam) ? cam[0] : cam, cy = Array.isArray(cam) ? cam[1] : 0;
    return ratios.map((q) => [-cx * q / top, -cy * q / top]);
  };

  // ---- 動く光の帯 ----
  // 矩形 (x,y,w,h) の中を、光の帯がゆっくり往復する(range の間を sin で)。clip(g) で形を渡すとその中だけに出る。
  // 止まった物でも「光が動く」と生きて見える。缶の照り・窓光・ガラスの反射に。
  function lightSweep(ctx, t, { x = 0, y = 0, w = 1920, h = 1080, clip, angle = 0.3, width = 0.16, speed = 0.8, phase = 0, range = [0.15, 0.85], color = "#ffffff", alpha = 0.35, mode = "screen" } = {}) {
    const u = lerp(range[0], range[1], 0.5 + 0.5 * Math.sin(t * speed + phase)), bw = w * width, L = Math.hypot(w, h);
    ctx.save();
    if (clip) { ctx.beginPath(); clip(ctx); ctx.clip(); }
    ctx.globalCompositeOperation = mode; ctx.translate(x + u * w, y + h / 2); ctx.rotate(angle);
    const g = ctx.createLinearGradient(-bw, 0, bw, 0);
    for (let i = 0; i <= 8; i++) { const s = i / 8, e = 1 - Math.abs(s * 2 - 1); g.addColorStop(s, css(color, alpha * smooth(e) * smooth(e))); }
    ctx.fillStyle = g; ctx.fillRect(-bw, -L, bw * 2, L * 2); ctx.restore();
    return u;
  }
  // 円柱(缶・柱)の横グラデ。u=照りの位置(0..1、lightSweep の戻り値を渡すと帯と揃う)。
  function cylinderFill(ctx, x0, x1, base, u = 0.35, { dark, bright } = {}) {
    const B = rgb(base), D = rgb(dark ?? darkOf(B)), W = rgb(bright ?? brightOf(B)), g = ctx.createLinearGradient(x0, 0, x1, 0);
    [[0, D], [0.08, mix(D, B, 0.6)], [clamp(u - 0.14), B], [u, W], [clamp(u + 0.1), B], [0.86, mix(B, D, 0.5)], [1, D]]
      .sort((a, b) => a[0] - b[0]).forEach(([s, c]) => g.addColorStop(s, css(c)));
    return g;
  }

  // ---- 切り絵の層(紙の厚み) ----
  // drawFn(g) で描いた層をまとめて1枚にし、その輪郭に落ち影を付けて重ねる(層の中で影が重ならない)。
  function paperLayer(ctx, drawFn, { shadowBlur = 12, dx = 0, dy = 4, shadow = "rgba(8,6,20,0.38)", w = 1920, h = 1080 } = {}) {
    const [b, g] = buf("paper", w, h); drawFn(g);
    ctx.save(); ctx.shadowColor = shadow; ctx.shadowBlur = shadowBlur; ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy; ctx.drawImage(b, 0, 0); ctx.restore();
  }

  // ---- 簡易3D: 細分した二十面体 ----
  // level=細分回数(0=20面, 1=80面, 2=320面)。jitter=頂点半径の乱れ(0.12 → 0.88〜1.12倍)。面が少ないほど作品らしい。
  function icosphere(level = 1, { seed = 3, jitter = 0.12, squashY = 0.92 } = {}) {
    const p = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p], [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const norm = (v) => { const n = Math.hypot(...v); return v.map((a) => a / n); };
    V = V.map(norm);
    for (let l = 0; l < level; l++) {
      const mid = new Map(), m = (a, b) => { const k = a < b ? a + "_" + b : b + "_" + a; if (!mid.has(k)) { V.push(norm(V[a].map((x, i) => (x + V[b][i]) / 2))); mid.set(k, V.length - 1); } return mid.get(k); };
      const NF = []; F.forEach(([a, b, c]) => { const ab = m(a, b), bc = m(b, c), ca = m(c, a); NF.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }); F = NF;
    }
    const r = mulberry32(seed);
    V = V.map(([x, y, z]) => { const s = 1 + (r() * 2 - 1) * jitter; return [x * s, y * s * squashY, z * s]; });
    return { V, F };
  }
  // 回して(rotY→rotX)、裏向きの面を捨て、奥から塗る。面の明るさは光との角度で 暗→地→明。継ぎ目は同色の細線で消す。
  function drawMesh(ctx, mesh, { x = 960, y = 540, size = 200, rotY = 0, rotX = 0.35, base = "#2fa597", dark, bright, light = [-0.5, -0.7, 0.6], ambient = 0.12, seam = 0.8, persp = 4 } = {}) {
    const B = rgb(base), D = rgb(dark ?? darkOf(B)), W = rgb(bright ?? brightOf(B));
    const ln = Math.hypot(...light), L = light.map((v) => v / ln), cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    const P = mesh.V.map(([a, b, c]) => { const x1 = a * cy + c * sy, z1 = -a * sy + c * cy; return [x1, b * cx - z1 * sx, b * sx + z1 * cx]; });
    const faces = [];
    mesh.F.forEach((f) => {
      const [A, Bv, C] = f.map((i) => P[i]), u = Bv.map((v, i) => v - A[i]), v = C.map((w, i) => w - A[i]);
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const nn = Math.hypot(...n); n = n.map((q) => q / nn);
      const ctr = [0, 1, 2].map((i) => (A[i] + Bv[i] + C[i]) / 3);
      if (n[0] * ctr[0] + n[1] * ctr[1] + n[2] * ctr[2] < 0) n = n.map((q) => -q); // 外向きにそろえる
      if (n[2] <= 0) return; // 裏面は描かない
      faces.push([ctr[2], [A, Bv, C], n]);
    });
    faces.sort((a, b) => a[0] - b[0]);
    ctx.save(); ctx.lineJoin = "round"; ctx.lineWidth = seam;
    faces.forEach(([, pts, n]) => {
      const k = ambient + (1 - ambient) * Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), col = css(ramp(D, B, W, k));
      ctx.beginPath(); pts.forEach(([px, py, pz], i) => { const s = size * persp / (persp - pz); ctx[i ? "lineTo" : "moveTo"](x + px * s, y + py * s); }); ctx.closePath();
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }

  return { rgb, mix, css, luma, darkOf, brightOf, ramp, grain, vignette, spot, floor, contactShadow, reflection, shadeSphere, hazeColor, hazeLayer, parallaxLayers, lightSweep, cylinderFill, paperLayer, icosphere, drawMesh };
})();
