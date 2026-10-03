#!/bin/bash
# three.js(3D)の1場面ぶんの HyperFrames プロジェクトを作る。three は 0.181.2 固定・ローカル配置(CDN は使わない)
# usage: new_scene_three.sh <dir> <秒数> [背景色 #rrggbb] [--post none|bloom|fast|std]
#   -> <dir>/index.html の build()(物を作る・1回)と update(t)(時刻 t の状態にする・純関数)だけ書けばよい
#   --post: none=ポストなし / bloom=Bloom のみ / fast=DoF+Bloom+色補正(ssaa1・32タップ・AOなし。既定) / std=GTAO+DoF+Bloom(ssaa2・96タップ。GPU 向け)
#   検証: cd <dir> && npx hyperframes check ; 書き出し: npx hyperframes render --output ../out/<id>.mp4
set -e
dir=$1; sec=$2; bg='#0b0d14'; post=fast; here=$(cd "$(dirname "$0")" && pwd)
[ -z "$dir" ] || [ -z "$sec" ] && { sed -n 2,6p "$0"; exit 1; }
shift 2
while [ $# -gt 0 ]; do case $1 in --post) post=$2; shift 2;; \#*) bg=$1; shift;; *) echo "不明な引数: $1"; exit 1;; esac; done
case $post in none|bloom|fast|std) ;; *) echo "--post は none|bloom|fast|std"; exit 1;; esac
mkdir -p "$(dirname "$dir")"
npx --yes hyperframes init "$dir" --non-interactive --skip-transcribe >/dev/null 2>&1 || npx --yes hyperframes init "$dir" --non-interactive >/dev/null
mkdir -p "$dir/assets"
cp "$here/assets/gsap.min.js" "$dir/assets/gsap.min.js"
cp "$here/assets/three/post.js" "$here/assets/three/LICENSE-lemo-opuscar.txt" "$dir/assets/"
bash "$here/fetch_three.sh" "$dir/assets"
cat > "$dir/index.html" <<'HTML'
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/gsap.min.js"></script>
    <script type="importmap">
      { "imports": { "three": "./assets/three/three.module.min.js", "three/addons/": "./assets/three/addons/" } }
    </script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: __BG__; }
      #root { position: relative; width: 1920px; height: 1080px; background: __BG__; overflow: hidden; }
      #gl { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; display: block; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="__DUR__" data-width="1920" data-height="1080">
      <canvas id="gl"></canvas>
      <!-- 文字などの DOM はここに置き、下の gsap timeline で動かす(3D は hf-seek で描く) -->
    </div>
    <script>
      // DOM 用の gsap timeline(3D の描画はここでしない。二重に描くと遅くなる)。長さを DUR に固定する。
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.set({}, {}, __DUR__);
      window.__timelines["main"] = tl;
    </script>
    <script type="module">
      import * as THREE from "three";
      import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
      import { makePost } from "./assets/post.js";

      const DUR = __DUR__, W = 1920, H = 1080;
      const POST = "__POST__"; // none | bloom | fast | std(上の説明を参照)
      // 乱数は必ず seed 付き(Math.random / Date.now / performance.now / clock は使わない)
      const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, k) => a + (b - a) * k;
      const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };

      const canvas = document.getElementById("gl");
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: POST === "none" || POST === "bloom", powerPreference: "high-performance", preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.NeutralToneMapping; // ACES は色がずれやすい。Neutral が既定
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("__BG__");
      const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 60);

      // 弱い環境光(HDRI ファイル無し)。Poly Haven の .hdr を使うなら HDRLoader → scene.environment に差し替える
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.35;

      // ポストの切り替え
      let post = null;
      if (POST === "bloom") post = makePost(renderer, scene, camera, W, H, { quality: "fast", dof: false, ao: false, grade: false });
      else if (POST === "fast" || POST === "std") post = makePost(renderer, scene, camera, W, H, { quality: POST });
      renderer.setSize(post ? post.W : W, post ? post.H : H, false); // ssaa>1 は内部で大きく描き、CSS で 1920×1080 に縮める

      // ★1回だけ: 物・光を作る(ここに場面を書く。下は見本: 床・球3つ・キー/リム/半球光)
      const S = {};
      function build() {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.85 }));
        floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
        const rnd = mulberry32(7), cols = [0xe8e4dc, 0xd9542b, 0x2b6fd9];
        S.balls = cols.map((c, i) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 64, 32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 + rnd() * 0.3, metalness: 0 }));
          m.position.set((i - 1) * 2.2, 0.8, -i * 1.6); m.castShadow = m.receiveShadow = true; scene.add(m); return m;
        });
        // 光る小球(emissiveIntensity>1 にして Bloom の閾値 1.6 を超えさせる)
        S.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 16), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd9a0, emissiveIntensity: 6 }));
        scene.add(S.lamp);
        const key = new THREE.DirectionalLight(0xfff4e8, 2.2); key.position.set(4, 7, 5); key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0001; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
        Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x9fc4ff, 1.2); rim.position.set(-5, 4, -6); scene.add(rim);
        scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2622, 0.4));
      }

      // ★時刻 t(秒)の純関数: 物・カメラ・ピントを t だけから決める(前フレームの状態を持たない)
      function update(t) {
        const k = smooth(0, DUR, t);
        camera.position.set(lerp(-3.5, 3.5, k), lerp(2.2, 1.6, k), lerp(9, 7, k));
        camera.lookAt(0, 0.8, -1.2);
        S.balls[0].position.y = 0.8 + Math.abs(Math.sin(t * 3)) * 0.6;
        S.lamp.position.set(Math.cos(t * 1.5) * 2.6, 1.9, -1.2 + Math.sin(t * 1.5) * 2.6);
        if (post && post.dof) { post.dof.focus = camera.position.distanceTo(S.balls[1].position); post.dof.aper = 60; post.dof.maxCoc = 12; }
        if (post && post.vig) { post.vig.uniforms.contrast.value = 0.15; post.vig.uniforms.sat.value = 1.05; }
      }

      function renderAt(t) {
        update(clamp(t, 0, DUR));
        if (post) post.render(); // = composer.render(0)。引数なしは Clock の差分を使うので禁止
        else renderer.render(scene, camera);
      }

      build();
      window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
      // シェーダーのコンパイル等の重い準備を待たせる(白コマ防止)
      window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
      window.__hf.buildReady["three-scene"] = Promise.resolve().then(() => renderAt(window.__hfThreeTime || 0));
    </script>
  </body>
</html>
HTML
sed -i "s|__DUR__|${sec}|g; s|__BG__|${bg}|g; s|__POST__|${post}|g" "$dir/index.html"
echo "作成: $dir/index.html (${sec}s, post=${post})"
