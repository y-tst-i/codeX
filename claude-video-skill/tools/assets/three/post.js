// 後処理: シーン → (MSAA+深度) → [GTAO] → 物理 DoF(CoC∝|1/f−1/z|、黄金角スパイラルで集める)→ Bloom → 色補正/ビネット → OutputPass(トーンマッピング)
//
// 元: lemo-opuscar core/three/post.js(MIT, Copyright (c) 2026 LemoLab)
//     https://raw.githubusercontent.com/lemomo-ai/lemo-opuscar/main/core/three/post.js
//     許諾文は同じフォルダの LICENSE-lemo-opuscar.txt。
// 変更点(このスキル用): three 0.181.2 で動作確認 / quality 'fast'|'std' の切り替え(ソフトウェアGLでは fast)/
//   DoF のタップ数を define 化 / dof・ao・bloom・grade を個別に切れる / GTAO のノイズ生成を seed 付き乱数にして決定的に /
//   正射影カメラの深度に対応 / render() は composer.render(0)(Clock の差分を使わない=seek 安全)/ コメントを日本語化。
//
// 使い方:
//   const post = makePost(renderer, scene, camera, 1920, 1080, { quality: 'fast' });
//   renderer.setSize(post.W, post.H, false);   // ssaa>1 なら内部解像度で描き、canvas は CSS で 1920×1080 に縮める
//   post.dof.focus = 6; post.dof.aper = 30;    // ピント距離(ワールド単位)と絞り(px 換算の係数)
//   post.render();                             // hf-seek ごとに、シーンを時刻 t の状態にしてから呼ぶ
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// 速い設定(ソフトウェアGL・下書き)と標準設定(GPU・本番)。個別のキーで上書きできる。
export const PRESETS = {
  fast: { ssaa: 1, msaa: 0, taps: 32, ao: false, dof: true, bloom: true, grade: true },
  std: { ssaa: 2, msaa: 4, taps: 96, ao: true, dof: true, bloom: true, grade: true },
};

const fsVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const cocShader = {
  uniforms: { tColor: { value: null }, tDepth: { value: null }, tAO: { value: null }, aoAmt: { value: 0 }, aoDebug: { value: 0 }, focus: { value: .3 }, aper: { value: 4 }, maxCoc: { value: 18 }, near: { value: .01 }, far: { value: 50 } },
  vertexShader: fsVert,
  fragmentShader: `
    #include <packing>
    varying vec2 vUv; uniform sampler2D tColor, tDepth, tAO; uniform float aoAmt, focus, aper, maxCoc, near, far, aoDebug;
    void main(){
      float d = texture2D(tDepth, vUv).x;
      #ifdef ORTHO
      float z = -orthographicDepthToViewZ(d, near, far);
      #else
      float z = -perspectiveDepthToViewZ(d, near, far);
      #endif
      float c = clamp(aper * (1.0/focus - 1.0/z), -maxCoc, maxCoc);   // 負=手前ボケ、正=奥ボケ(px)
      vec3 col = texture2D(tColor, vUv).rgb;
      if (aoAmt > 0.) col *= mix(1., pow(texture2D(tAO, vUv).r, 1.6), aoAmt);
      if (aoDebug > .5) col = vec3(pow(texture2D(tAO, vUv).r, 1.6));
      gl_FragColor = vec4(col, c);
    }`,
};
const gatherShader = {
  uniforms: { tIn: { value: null }, res: { value: new THREE.Vector2(1920, 1080) }, maxCoc: { value: 18 } },
  vertexShader: fsVert,
  fragmentShader: `
    varying vec2 vUv; uniform sampler2D tIn; uniform vec2 res; uniform float maxCoc;
    void main(){
      vec4 c0 = texture2D(tIn, vUv); float a0 = abs(c0.a);
      if (maxCoc < .5) { gl_FragColor = vec4(c0.rgb, 1.); return; }
      vec3 acc = c0.rgb / (a0*a0 + 1.); float wsum = 1. / (a0*a0 + 1.);
      const int N = TAPS;
      for (int i = 0; i < N; i++) {
        float r = maxCoc * sqrt((float(i) + .5) / float(N));
        float th = float(i) * 2.39996;
        vec2 off = vec2(cos(th), sin(th)) * r / res;
        vec4 s = texture2D(tIn, vUv + off);
        float sa = abs(s.a);
        // 中心より奥のサンプルは、広がりを中心の CoC 以下に抑える(背景のボケがピントの合った前景ににじまない)
        if (s.a > c0.a) sa = min(sa, max(a0, 0.));
        float w = smoothstep(r - 1.5, r + .5, sa) / (sa*sa + 1.);
        acc += s.rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.);
    }`,
};

function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// GTAOPass はノイズ表を Math.random(SimplexNoise)で作る → 生成の間だけ seed 付きに差し替え、ワーカー間でも同じ絵にする
function seeded(seed, fn) {
  const orig = Math.random; Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = orig; }
}
const mat = (sh, defines = {}) => new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.clone(sh.uniforms), vertexShader: sh.vertexShader, fragmentShader: sh.fragmentShader, defines });

class DofScenePass extends Pass {
  constructor(scene, camera, w, h, o) {
    super(); this.scene = scene; this.camera = camera; this.needsSwap = true; this.s = o.ssaa;
    const rtOpt = { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h, THREE.FloatType) };
    if (o.msaa) rtOpt.samples = o.msaa;
    this.rt = new THREE.WebGLRenderTarget(w, h, rtOpt);
    this.rtC = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
    const ortho = camera.isOrthographicCamera ? { ORTHO: 1 } : {};
    this.coc = new FullScreenQuad(mat(cocShader, ortho));
    this.gat = new FullScreenQuad(mat(gatherShader, { TAPS: o.taps | 0 }));
    this.gat.material.uniforms.res.value.set(w, h);
    // 既定: ピント .3、絞り 4、最大ボケ 16px(ssaa 倍される)。dof:false なら maxCoc 0(集める処理を飛ばす)
    this.focus = .3; this.aper = 4; this.maxCoc = o.dof ? 16 : 0; this.aoAmt = 0; this.aoDebug = false;
    if (o.ao) {
      this.ao = seeded(o.seed ?? 1, () => new GTAOPass(scene, camera, w, h));
      this.ao.output = GTAOPass.OUTPUT.Off;
      this.ao.updateGtaoMaterial({ radius: o.aoRadius ?? .25, distanceExponent: 1.2, thickness: o.aoThickness ?? 1, scale: o.aoScale ?? 2.5, distanceFallOff: .6, samples: o.aoSamples ?? 16 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 * this.s, rings: 2, samples: 16 });
      this.aoAmt = o.aoAmt ?? .85;
    }
  }
  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(this.scene, this.camera);
    if (this.ao && this.aoAmt > 0) this.ao.render(renderer, null, null);
    const u = this.coc.material.uniforms;
    u.tColor.value = this.rt.texture; u.tDepth.value = this.rt.depthTexture; u.focus.value = this.focus; u.aper.value = this.aper * this.s; u.maxCoc.value = this.maxCoc * this.s;
    u.near.value = this.camera.near; u.far.value = this.camera.far;
    u.tAO.value = this.ao ? this.ao.gtaoMap : null; u.aoDebug.value = this.aoDebug ? 1 : 0; u.aoAmt.value = this.ao ? this.aoAmt : 0;
    renderer.setRenderTarget(this.rtC); this.coc.render(renderer);
    const g = this.gat.material.uniforms; g.tIn.value = this.rtC.texture; g.maxCoc.value = this.maxCoc * this.s;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.gat.render(renderer);
  }
}

// ビネット / 暖色 / 彩度 / 線形域のやわらかいコントラスト(OutputPass の前=線形 HDR 域で掛ける)
export const gradeShader = {
  uniforms: { tDiffuse: { value: null }, amt: { value: .35 }, fade: { value: 1 }, warm: { value: 0 }, contrast: { value: 0 }, sat: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float amt, fade, warm, contrast, sat;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - .5; d.x *= 1.25; float v = 1. - amt * smoothstep(.25, .85, length(d));
      c.rgb *= v * fade; c.rgb *= mix(vec3(1.), vec3(1.06, 1., .9), warm);
      float l = dot(c.rgb, vec3(.2126, .7152, .0722)); c.rgb = mix(vec3(l), c.rgb, sat);
      c.rgb = c.rgb * (1. + contrast) / (1. + contrast * c.rgb / (c.rgb + .6));
      gl_FragColor = c; }`,
};

export function makePost(renderer, scene, camera, w, h, opts = {}) {
  const o = { ...PRESETS[opts.quality || 'fast'], ...opts };
  const s = o.ssaa || 1, W = w * s, H = h * s;
  o.ssaa = s;
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
  let dof = null, bloom = null, vig = null;
  if (o.dof || o.ao) { dof = new DofScenePass(scene, camera, W, H, o); composer.addPass(dof); }
  else composer.addPass(new RenderPass(scene, camera));           // DoF も AO も使わないなら素の RenderPass(速い)
  if (o.bloom) { bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .2, .5, 1.6); composer.addPass(bloom); } // HDR で 1.6 を超えた所だけ光る
  if (o.grade) { vig = new ShaderPass(gradeShader); composer.addPass(vig); }
  const out = new OutputPass(); composer.addPass(out);
  // composer.render() を引数なしで呼ぶと内部 Clock の差分を使う → 必ず 0 を渡す
  return { composer, dof, bloom, vig, out, W, H, opts: o, render: () => composer.render(0) };
}
