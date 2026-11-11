// 案A+C v7 動きの本制作 第2段: 2.5D の「層のカメラ」(Canvas 2D の層ごとの平行移動・拡大だけ。CSS3D・three.js は使わない)。
// 考え方: 版木の絵を Z の層(遠景・中景・主・前景)に分け、カメラの押し込み(push)と横移動(pan)を層の係数 z で薄めて掛ける。
//   投影: x' = fx + (x - fx)·(1 + push·z) + pan[0]·z、 y' = fy + (y - fy)·(1 + push·z) + pan[1]·z
//   z = 0 は無限遠(動かない)、z = 1 は主の層。係数の試験値は RESEARCH_2D_DIGEST の 遠 0.12 / 中 0.35 / 主 0.70 / 前 1.00。
//   焦点 (fx, fy) を地平の上に置くと、どの層でも地平の線は上下に動かない(層の継ぎ目が地平で割れない)。
// 刷った紙(紙のスキャン・ばれんのむら・墨の木目)は print の画面座標のままで、カメラに固定(刷った紙は動かない。毎コマ新しく刷る)。
// 層をまたぐ物(電線・信号の道・高架の桁)は、点ごとに z を変えて投影する(pathZ)。
// 切ると(ON = false)恒等変換になり、第1段(v7)と同じ画素になる。絵はコマ番号 f と cam の入/切だけで決まる。
const A7_CAM = (() => {
  let ON = false, st = null;
  const ID = [1, 0, 0, 1, 0, 0];
  // st = { fx, fy, push, pan: [dx, dy] }。コマごとに set で決める(コマの純関数)
  function set(o) { st = o ? Object.assign({ fx: 960, fy: 540, push: 0, pan: [0, 0] }, o) : null; }
  function mat(z) { if (!ON || !st || z == null) return ID; const s = 1 + st.push * z; return [s, 0, 0, s, st.fx * (1 - s) + st.pan[0] * z, st.fy * (1 - s) + st.pan[1] * z]; }
  const layer = (g, z) => { const m = mat(z); g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); };
  const pt = (p, z) => { const m = mat(z); return [m[0] * p[0] + m[4], m[3] * p[1] + m[5]]; };
  // 点ごとの z(zf(点, 番号))で投影した折れ線
  const pathZ = (P, zf) => P.map((p, i) => pt(p, zf(p, i)));
  // 折れ線の長さに沿って z を z0 → z1 に変える zf(電線のように手前から奥へ延びる物)
  function alongZ(P, z0, z1) { const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const L = cum[cum.length - 1] || 1; return (p, i) => z0 + (z1 - z0) * (cum[i] / L); }
  // 層ごとの今の動き(px/コマの検査用): z の層の点 p が、このコマで画面のどこにあるか
  const state = () => (ON && st ? { fx: st.fx, fy: st.fy, push: +st.push.toFixed(5), pan: st.pan.map((v) => +v.toFixed(3)) } : null);
  const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); }; // power2.inOut に近い(カメラの動きは両側をゆるめる)
  return { setOn: (v) => { ON = !!v; }, on: () => ON, set, mat, layer, pt, pathZ, alongZ, state, ease, Z: { FAR: 0.12, MID: 0.35, MAIN: 0.7, NEAR: 1.0 } };
})();
