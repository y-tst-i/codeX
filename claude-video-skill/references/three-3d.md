# three.js で立体の場面を作る(HyperFrames・ヘッドレス Chrome・ソフトウェアGL)

立体感(接地の影、AO、ピントの奥行き、光のにじみ)が要る場面だけ three.js を使う。2D で足りる場面は `new_scene.sh`(Canvas2D)のほうが数倍速い。
three は **0.181.2 固定**。CDN はこの環境で証明書エラーになるので、`npm pack` で取ってプロジェクトの `assets/three/` に置く(約0.9MB。スキルには同梱しない)。

## 1. 手順
1. ひな形: `tools/new_scene_three.sh <dir> <秒> [#背景色] [--post none|bloom|fast|std]`
   - `hyperframes init` → gsap(DOM 用)→ `fetch_three.sh`(three 本体 min + 必要な addons を import を辿って配置)→ `post.js` → `index.html`。
   - 書くのは `build()`(物と光を1回作る)と `update(t)`(時刻 t の状態にする純関数)だけ。見本の床・球3つ・光をそのまま置き換える。
2. 確認: `cd <dir> && npx hyperframes check`(error 0。`GPU stall due to ReadPixels` の警告は無害)。
3. コマ確認: `npx hyperframes snapshot --at 0.5,2,4 --no-end --timeout 60000`(重い場面は timeout を延ばす)。
4. 書き出し: まず `--post fast` で通し、決め所だけ重い設定にする。`npx hyperframes render --output ../out/<id>.mp4`。
5. 足りない addon は `tools/fetch_three.sh <dir>/assets loaders/GLTFLoader.js` のように追加する(依存は自動で辿る)。

## 2. 時間の約束(seek 安全)
- ルートの `data-duration` は**必須**(three アダプタは長さを推定しない。無いと "zero duration")。
- 3D は `hf-seek`(`e.detail.time`)と `window.__hfThreeTime` で描く。rAF・`setAnimationLoop`・`Clock` を時間の基準にしない。
- gsap の timeline は DOM(文字など)専用。**gsap の onUpdate で3Dを描かない**(hf-seek と二重に描かれ、時間が倍になる)。ひな形は `tl.set({}, {}, DUR)` で長さだけ合わせている。
- `renderer.setPixelRatio(1)`、サイズは固定。重い準備は `window.__hf.buildReady["key"] = Promise` で待たせる。
- 乱数は `mulberry32(seed)`。物理・粒子は「t から直接計算」か「固定刻みで 0→t を毎回再計算」。

## 3. パスの順
- 標準(three 公式): `RenderPass → (GTAOPass) → UnrealBloomPass → OutputPass → (LUTPass / FXAA)`。
  `OutputPass` がトーンマッピングと sRGB 変換をする。LUT と FXAA は sRGB の入力が要るので **OutputPass の後**。
- lemo-opuscar(`tools/assets/three/post.js` の元): `シーン(MSAA×4+深度) → GTAO → 物理DoF → Bloom → ビネット/色補正(線形域) → OutputPass(Neutral)`。
  色補正を OutputPass の**前**(線形 HDR 域)で掛けるのが特徴。
- `post.js` の使い方:
  ```js
  import { makePost } from "./assets/post.js";
  const post = makePost(renderer, scene, camera, 1920, 1080, { quality: "fast" }); // 'fast' | 'std' + 個別上書き
  renderer.setSize(post.W, post.H, false);   // ssaa 2 なら 3840×2160 で描き、canvas は CSS で 1920×1080
  post.dof.focus = 距離; post.dof.aper = 60; post.render();  // render() = composer.render(0)
  ```
  | 設定 | ssaa | MSAA | DoF タップ | GTAO | 用途 |
  |---|---|---|---|---|---|
  | `fast` | 1 | 0 | 32 | なし | ソフトウェアGL・下書き・通常の本番 |
  | `std` | 2 | 4 | 96 | あり | GPU のある環境(lemo の既定) |
  | `{quality:"fast", ao:true}` | 1 | 0 | 32 | あり | 接地感が要るカットだけ |
  `dof:false / bloom:false / grade:false` で個別に外せる(DoF も AO も無ければ素の RenderPass になる)。

## 4. 数値の目安
- **DoF(錯乱円)**: `c = clamp(aper*(1/focus − 1/z), −maxCoc, maxCoc)`[px]。z はカメラからの距離、負=手前ボケ、正=奥ボケ。
  aper と maxCoc は ssaa 倍される。集める処理は黄金角スパイラル(`r = maxCoc·sqrt((i+.5)/N)`, `θ = i·2.39996`)、
  **中心より奥のサンプルは広がりを中心の CoC 以下に抑える**(背景が前景ににじまない)。
  目安: 実寸(メートル)の机上なら focus .3・aper 4・maxCoc 16(lemo 既定)。数メートルの場面なら aper 30〜80・maxCoc 10〜16。
  ピントは主役の距離を毎フレーム `camera.position.distanceTo(主役)` で入れる。ピント送りは focus を t の関数にする。正射影カメラは自動で orthographic の深度式になる。
- **GTAO**: `radius .25, distanceExponent 1.2, thickness 1, scale 2.5, distanceFallOff .6, samples 16`、デノイズ `lumaPhi 10, depthPhi 2, normalPhi 3, radius 6·ssaa, rings 2, samples 16`、合成 `col *= mix(1, pow(ao,1.6), .85)`。
  ブロックや箱庭は AO が無いと「貼り付けた」ように見える。球や人物は接地影のぼかしで代用できることが多い。
- **Bloom**: `UnrealBloomPass(res, strength .2, radius .5, threshold 1.6)`(HDR で 1.6 を超えた所だけ)。光らせる物は `emissiveIntensity` 4〜8。公式サンプルの 1.5/0.4/0.85 は強すぎて画面全体がにじむ。
- **色補正(線形域)**: ビネット .35、warm 0〜.1、sat 1.05〜1.1、contrast `c(1+k)/(1+k·c/(c+.6))` で k .15〜.26。
- **トーンマッピング**: `NeutralToneMapping`(既定)。ACES は紙・白の色がずれ、AgX はアクセント色が白く飛びやすい。exposure 1.0〜1.15。
- グレイン: ページで描かず ffmpeg で足す(`noise=c0s=2:allf=t`)。ページで描くと圧縮が効かず遅い。

## 5. seek の落とし穴(r181 のソースで確認)
1. `composer.render()` を引数なしで呼ぶと内部 Clock の差分を使う → **`composer.render(0)`**(post.js の `render()` はそうなっている)。
2. `FilmPass` は `time += delta` で積み上げる → 毎フレーム `filmPass.uniforms.time.value = t` を直接代入。
3. `GlitchPass` は毎フレーム `Math.random()`、`TAARenderPass`・`AfterimagePass` は前フレームの履歴を使う → **使わない**。
4. `GTAOPass`・`SSAOPass` はノイズ表を `Math.random`(SimplexNoise)で作る → ワーカーごとに絵が変わる恐れ。
   post.js は生成の間だけ seed 付き乱数に差し替えている(実測: workers 1 と 2 で全フレーム一致)。自分で作るときも同じようにする。
5. モーションブラーは TAA/Afterimage ではなく、1フレーム内で t−Δ〜t を数回描いて平均するか、HyperFrames エンジンの motionBlur を使う。
6. カメラと光は毎フレーム滑らかに動かす(キャラは 12fps のコマ打ちでもよいが、カメラまでコマ打ちにするとカクつく)。

## 6. ライティングの原則
- **やわらかい面光源/平行光源で主光を作り、HDRI は弱く**(environmentIntensity .2〜.5)。明るい環境光だけだと CG っぽい。
- ひな形: キー `DirectionalLight #fff4e8` 2.2(影 2048²、bias −1e-4、normalBias .02、PCFSoft)+ 冷たいリム `#9fc4ff` 1.2 を後ろから + 半球光 .4 + `RoomEnvironment` を PMREM で焼いた弱い環境(ファイル不要)。
- 板ポリやキャラは背後光だと真っ黒 → 主役の少し手前に冷たいフィルライト。白を白く保つため電球色の HDRI は避ける。
- `RectAreaLight` は `RectAreaLightUniformsLib.init()` が要り、MeshStandard/Physical のみ。ソフトウェアGLでは重い。
- **HDRI(Poly Haven、CC0)**: 1k で足りる(1〜2MB)。
  ```bash
  curl -sS -A "claude-video-skill/1.0 (research)" https://api.polyhaven.com/files/studio_small_09 | jq -r '.hdri["1k"].hdr.url'
  # → https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr を assets/ に保存
  ```
  API は**固有の User-Agent(か Referer)を付ける**決まり。読み込みは `HDRLoader`(`RGBELoader` は r180 で非推奨)→ `tex.mapping = EquirectangularReflectionMapping` → `scene.environment = tex`。
  HDRLoader は DefaultLoadingManager 経由なので、HyperFrames が読み込み完了を待ってくれる。

## 7. 素材のライセンス
| 素材 | ライセンス | 扱い |
|---|---|---|
| Poly Haven(HDRI・テクスチャ・モデル) | CC0 | 表示不要。CREDITS に出典を書く(このリポジトリの流儀) |
| ambientCG(PBR テクスチャ) | CC0 | 同上 |
| Kenney 3D | CC0 | 同上 |
| CC BY 3.0 / 4.0 の素材(音楽・モデル) | 帰属表示が必須 | 作者名・題名・出典 URL・ライセンス名を動画の説明欄/クレジットに |
| **Quaternius** | **2026-08-28 から Quaternius Asset License(QAL)v1.0** | 商用可・クレジット不要だが**素材の再配布は禁止 → 公開リポジトリに .glb を入れない**(作業フォルダで使い、取得手順だけ書く)。FAQ の「CC0」表記は古い |
| three.js 公式サンプルのモデル | モデルごとに別 | Soldier.glb など Mixamo 由来は避ける |
| lemo-opuscar のコード | MIT | `post.js` は著作権表示つきで同梱(`LICENSE-lemo-opuscar.txt`)。lemo の署名・エンドカード・LEGO 等の商標は作品に入れない |

## 8. 速度(実測)と対策
1920×1080、SwiftShader(`software gpu`、4コア)、見本の場面(床・球3つ・影・環境光)、`--workers 1`、30フレームの capture 時間 ÷ 30(キャプチャとエンコード込み):
| 設定 | ms/フレーム | 450フレーム(15秒)の見込み |
|---|---|---|
| ポストなし(`--post none`) | 約 580 | 約 4.4 分 |
| Bloom のみ(`--post bloom`) | 約 1,020 | 約 7.7 分 |
| DoF32 + Bloom + 色補正(`--post fast`) | 約 1,500 | 約 11 分 |
| GTAO + DoF32 + Bloom + 色補正(fast + `ao:true`) | 約 2,750 | 約 21 分 |
| `std`(ssaa2・MSAA4・GTAO・DoF96) | 約 16,900 | 約 2 時間 7 分 |
- **`--workers 2` にしても速くならない**(GTAO 入り 30 フレームで 82.6 秒 → 80.7 秒)。SwiftShader が既に全コアを使っている。
- 決定性: 別々のブラウザで同じ t を撮った PNG が完全一致、seek の順番を逆にしても一致、workers 1 と 2 で全フレーム一致。
- 対策(効く順): ① 既定は `fast`、GTAO は決め所のカットだけ ② 追加コストの実測: Bloom +0.45 秒、DoF+色補正 +0.5 秒、GTAO +1.25 秒、ssaa2 は約6倍
  ③ AO は接地影のぼかし(床に置く半透明の円)で代用 ④ 影の mapSize 1024 ⑤ 粒子は InstancedMesh で1回の描画に
  ⑥ 書き出し前に `--fps 10` で全体を短時間に確認 ⑦ GPU のある環境なら `--browser-gpu` で `std` が実用になる(lemo の報告: GPU で数十 ms/フレーム)。
- WebGL が動かないとき: `npx hyperframes doctor` で Chrome を確認。HyperFrames は既定でソフトウェア描画(`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`)で起動する。
  `--no-browser-gpu` で強制、環境変数 `PRODUCER_BROWSER_GPU_MODE=software`。WebGPU 系(TypeGPU・liquid-glass)はこの環境では動かない。

## 9. 手本と出典
- HyperFrames の既製部品 `glass-shard-title`(three r181・HDRLoader・transmission・FogExp2)を読むと MeshPhysical の扱いがわかる(`npx hyperframes catalog --query glass`)。
- three r181: `examples/jsm/postprocessing/{EffectComposer,GTAOPass,UnrealBloomPass,OutputPass,FilmPass}.js`、公式サンプル webgl_postprocessing_gtao / 3dlut。
- lemo-opuscar(MIT): TECHNIQUE.md・core/three/post.js。HyperFrames: `hyperframes-animation/adapters/three.md`。
