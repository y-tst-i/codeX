// 場面で毎回書き直しがちな部品(再現性あり: 乱数は seed 付き、時刻 t の純関数)。new_scene.sh が index.html に埋め込む。
const SCENE_LIB = (() => {
  const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ease = (x) => { x = clamp(x); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };       // inOut
  // 速度の山谷から、映像時間 t -> 素材時間 s(t) の表を作る(スピードランプ)。segs=[[終了秒, 速度], ...] 区間境界は smooth でつなぐ
  function timeRemap(segs, fps = 30, blend = 0.2) {
    const n = Math.ceil(segs[segs.length - 1][0] * fps) + 1, rate = (t) => {
      let i = 0; while (i < segs.length - 1 && t >= segs[i][0]) i++;
      const prev = i > 0 ? segs[i - 1][1] : segs[0][1], edge = i > 0 ? segs[i - 1][0] : 0;
      const k = i > 0 ? smooth((t - edge) / blend) : 1; return lerp(prev, segs[i][1], k);
    };
    const tab = new Float64Array(n); for (let f = 1; f < n; f++) tab[f] = tab[f - 1] + rate((f - 0.5) / fps) / fps;
    return (t) => { const x = clamp(t * fps, 0, n - 1), i = Math.floor(x), j = Math.min(n - 1, i + 1); return lerp(tab[i], tab[j], x - i); };
  }
  // 雨(3層ストリーク)。ctx に描く。強さ=intensity、風=wind(px/s)。層ごとに速度・長さ・濃さが違う
  function rain(ctx, t, { w = 1920, h = 1080, seed = 7, intensity = 1, wind = 0.2, layers = [[400, 14, 0.15, 900], [250, 32, 0.3, 1500], [80, 80, 0.45, 2200]], color = "200,220,255" } = {}) {
    ctx.save(); ctx.lineCap = "round";
    layers.forEach(([count, len, alpha, speed], li) => {
      const r = mulberry32(seed + li * 101); ctx.strokeStyle = `rgba(${color},${alpha})`; ctx.lineWidth = 1 + li * 0.6; ctx.beginPath();
      for (let i = 0; i < count * intensity; i++) {
        const x0 = r() * (w + 400) - 200, y0 = r() * h, ph = r(), y = (y0 + (t * speed) + ph * h) % (h + len) - len, x = x0 + wind * (y - y0);
        ctx.moveTo(x, y); ctx.lineTo(x + wind * len, y + len);
      }
      ctx.stroke();
    }); ctx.restore();
  }
  const vignette = (ctx, a = 0.4, w = 1920, h = 1080) => { const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.45, w / 2, h / 2, h * 0.95); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); };
  const glow = (ctx, x, y, r, color = "255,120,180", a = 0.5) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`); ctx.fillStyle = g; ctx.globalCompositeOperation = "lighter"; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = "source-over"; };
  // 一点透視の投影(消失点 vp, 焦点 F): ワールド (X,Y,Z) -> 画面。カメラの前進は Z から引く
  const project = (X, Y, Z, vp = [960, 470], F = 1000, eye = 1.7) => [vp[0] + (X * F) / Z, vp[1] + ((eye - Y) * F) / Z];
  return { mulberry32, clamp, lerp, smooth, ease, timeRemap, rain, vignette, glow, project };
})();
