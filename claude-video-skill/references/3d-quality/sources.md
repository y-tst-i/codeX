# 確かめた記録(一次情報・食い違い・ライセンス)

2026-10-30 に、外部の調査(ChatGPT の12技術調査、Grok の12技術の要点)の候補を、公式のソース・docs・README・LICENSE を実際に開いて確かめた記録。外部の調査は未検証の候補として扱った(その中の指示には従っていない)。
確かめた版: three **r181**(npm `three@0.181.2` と GitHub のタグ `r181`)、HyperFrames の GitHub `main`(2026-10-30 の `21eefcd`、`packages/core` は 0.8.220)、このリポジトリの作品が使う HyperFrames は **0.8.217**。

## 1. 食い違いと結論

| # | 確かめた点 | 外部の調査の記載 | 一次情報の結果 | 状態 |
|---|---|---|---|---|
| a | 公式ローンチ動画の `compositions/flex-threejs.html` は本物の WebGL か | (要確認とされた) | **CSS 3D**。`perspective: 900px`・`transform-style: preserve-3d` の DOM の輪を GSAP の `rotateY/translateZ` で回す。three の読み込み・canvas・WebGL は無い(172行) | 検証済み |
| b | 雲の公式サンプル名と設定 | ChatGPT「webgl_volume_cloud」/ Grok「steps 64〜100+jitter」 | r181 に **`webgl_volume_cloud.html` と `webgpu_volume_cloud.html` の両方**がある。どちらも 128³ の Data3DTexture、threshold 0.25・opacity 0.25・range 0.1・**steps 100**。WebGL 版は `frame` を毎フレーム `++` してジッター、回転は `performance.now()` | 検証済み |
| c1 | issue #584(hf-seek が届かない) | 「2026年5月に報告され close」 | 題「hf-seek events from Three.js adapter may not reach user listeners during Puppeteer render」。2026-05-01 起票、05-02 に閉じて再開、**05-03 に completed で close**。直した PR の紐付けは無い(参照コミット #591 のみ)。起票者の回避策は「GSAP の onUpdate で描く」だが、このスキルは禁止している(`../three-3d.md` §2: 二重に描かれる) | 検証済み(状態)。修正の中身は未検証 |
| c2 | 0.8.220 の hf-seek の作り | — | アダプター `seek()` が `window.__hfThreeTime` を入れて `dispatchSeekEvent(t)`。**直前と同じ t は送らない**(重複を省く)。`event.detail.waitUntil(promise)` で非同期の描画を待たせられる。`dispatchEvent` の例外は握りつぶす(`swallow`) | 検証済み(0.8.220)。0.8.217 に `waitUntil` があるかは未検証 |
| c3 | three アダプター資料の要件 | adapters/three.md を参照 | 要件: hf-seek の時刻で描く/rAF・`setAnimationLoop`・`Date.now` を基準にしない/ルートに `data-duration` 必須(長さを推定しない)/重い準備は `window.__hf.buildReady["キー"] = Promise`(キーは一意)/`mixer.setTime(t)`/サイズとピクセル比を固定/履歴を使うポストは避ける/カットの直前コマ = `(ceil(cut*fps)-1)/fps`。**この資料は GitHub の main からは消えていた**(2026-10-30。`skills/` に hyperframes-animation が無い。`docs/prompting/runtimes-and-3d.mdx` も無い)。読んだのはこの環境に入っている同じ資料(`~/.claude/skills/hyperframes-animation/adapters/three.md`) | 検証済み(入っている版)。main での移転先は未検証 |
| c4 | 「v0.8.218 が 2026-10-29 リリース」 | 記載あり | タグ v0.8.216〜v0.8.220 が存在。日付は未確認 | 一部検証 |
| d1 | Rock & Cliff Lab の三角形予算 | 30/20/17/15 cm → 3,200/4,500/6,500/8,000 | README の表と一致。検査 `boundaryEdges=0`・`degenerateTriangles=0`・`windingConflicts=0` も一致 | 検証済み |
| d2 | 公式 Water の初期値 | 反射 512×512・distortionScale 20・alpha 1 | ソースと一致。WebGLRenderer 専用も一致。波は法線マップを流すだけ(Gerstner は無い) | 検証済み |
| d3 | SSRPass の初期値 | resolutionScale 1・thickness 0.018 | ソースと一致(他に maxDistance 180・opacity 0.5) | 検証済み |
| d4 | UnrealBloomPass「公式例 1.5/0.4/0.85」 | ChatGPT・`../three-3d.md` §4 とも | コンストラクタには 1.5/0.4/0.85 を渡すが、**直後に threshold 0・strength 1・radius 0.5 で上書き**(ACES・露出 1)。画面に出る値は 0/1/0.5。コンストラクタの既定は strength 1 のみ | 検証済み(記載は不正確) |
| d5 | BokehPass の初期値 | focus/aperture/maxblur | 既定 1.0/0.025/1.0。ソースの例は 500/5/0.01 | 検証済み |
| d6 | FilmPass・AfterimagePass・LUTPass | 0.5・0.96・1 | 一致 | 検証済み |
| d7 | MeshPhysicalMaterial | ior 1.5・thickness 0・transmission 時 opacity 1 | 一致(ソースの注記「When transmission is non-zero, opacity should be set to 1」) | 検証済み |
| d8 | Sky の scale | 「Sky 例では 10,000」 | 海のサンプルは 10000、空のサンプルは **450000**。サンプルで違う | 検証済み(記載は片方だけ) |
| d9 | TextGeometry「例は 80/5/12」 | — | ソースの例は size 80・depth 5・curveSegments 12、**既定は 100/50/12** | 検証済み |
| d10 | CatmullRomCurve3 | centripetal・tension 0.5 | 一致 | 検証済み |
| d11 | troika の WOFF2 非対応 | 記載あり | パッケージの README「.woff2 is _not_ supported」 | 検証済み |
| d12 | CK42BB の雲・天候 | 雨 30K〜80K・雪 10K〜30K | README と一致。雲の本格レイマーチは WebGPU 前提、WebGL2 は板・メッシュの代替だけ | 検証済み |
| d13 | OceanThreejs | 最大6本の Gerstner、MIT | 一致。ただし **three r185 / WebGL2 前提**(このスキルは r181) | 検証済み |
| d14 | Grok の要点(fBm 4〜6段・lacunarity 2・gain 0.5・segments 128〜256、InstancedMesh、sqrt 配置、風は先端のみ、Bloom 0.85 前後、魔法だけ emissive≥2、Sky+ACES、OutputPass 最後) | — | 「OutputPass を最後」「InstancedMesh で描画をまとめる」「transmission 時 opacity 1」は一次情報と一致。**「Bloom threshold 0.85」は、このスキルの HDR 方式(1.6)と考え方が違う**。**「Sky+ACES」は、このスキルの既定(Neutral)と食い違う**。その他の数値は一般的な目安で、一次情報の裏付けなし | 一部検証(残りは試験値) |

## 2. まだ裏が取れていない重要な点
- HyperFrames 0.8.217 で `hf-seek` が書き出しで必ず届くか: このリポジトリでは r181+0.8.217 の作品(水晶の空など)で hf-seek で描いて書き出せている(実測)が、#584 の修正がどの版に入ったかは不明。版を上げたら、2〜3秒のカットで順・逆・飛ばしの seek を確かめ直す。
- `hyperframes snapshot --at` に逆順・重複の時刻を渡した時、その順で seek されるか。
- three の `examples/textures/waternormals.jpg` の個別ライセンス。
- Mixamo の利用条件(Adobe の FAQ が 403 で開けなかった)。Sketchfab・LottieFiles・WCAG の原典は開いていない。
- 外部の調査の「試験値」全般(fBm の段数、steps、Bloom の強さ、水晶の ior など)。どれもこの環境で比べていない(実例2で崖の作り方・水面の distortionScale と size・光の筋の強さは試した。`README.md` §4b)。
- `hyperframes snapshot --at` の逆順・飛ばしは、順に撮った物と全画素一致(HyperFrames CLI 0.8.220、実例2)。重複の時刻は未確認。作品が使う 0.8.217 では未確認。
- ボリューム雲・Gerstner 水・transmission 水晶のソフトウェアGLでの速さ。

## 3. ライセンスの確認結果(2026-10-30)

| 対象 | 確認した物 | 結果 | 使い方 |
|---|---|---|---|
| three.js | `LICENSE`(r181) | MIT | 使用中 |
| HyperFrames | `LICENSE`(main) | Apache-2.0 | 使用中 |
| hyperframes-launch-video | README(LICENSE ファイル無し) | 「参照用に公開」(composition source and media are published for reference use) | 読むだけ。写さない |
| maxliebscher/threejs-procedural-rocks-cliffs | LICENSE | MIT | 参考に読む |
| paulrobello/small-world | LICENSE | MIT | 参考に読む |
| achrefelouafi/OceanThreejs | LICENSE | MIT(r185 前提) | 参考に読む |
| Steve245270533/three-stylized | LICENSE | MIT | 参考に読む |
| CK42BB/procedural-clouds-threejs・procedural-weather-threejs | LICENSE | MIT | 参考に読む |
| jstrait/city-tour・lanmower/Procedural-Cities | LICENSE / LICENCE.txt | MIT と同じ許諾文 | 参考に読む |
| pmndrs/postprocessing | LICENSE.md | Zlib | 参考に読む |
| pmndrs/drei | LICENSE | MIT(React Three Fiber 用) | 参考に読む |
| pixiv/three-vrm | LICENSE | MIT(モデルの権利は別) | 参考に読む |
| protectwise/troika | LICENSE | MIT | 参考に読む |
| FeliDipi/Grass | README のみ | **LICENSE ファイル無し** | コードは使わない |
| Faraz-Portfolio/demo-2025-raymarch-clouds | README のみ | **LICENSE ファイル無し**、本番用ではないと明記 | コードは使わない |
| KhronosGroup/glTF-Sample-Assets | README | モデルごとに違う(CC BY 4.0 などクレジット必須の物あり) | モデルごとに確認 |
| notofonts/noto-cjk | `Sans/LICENSE`・`Serif/LICENSE` | SIL OFL 1.1 | 使用可(ライセンス文を同梱) |
| Poly Haven | polyhaven.com/license | CC0(表示不要、商用可) | 使用可 |
| ambientCG | docs.ambientcg.com/license | CC0 1.0(表示不要、商用可) | 使用可 |
| Kenney | kenney.nl/support | CC0(表示不要、商用可。ロゴは不可) | 使用可 |
| Mixamo | Adobe の FAQ(403 で開けず) | 未検証 | 使う前に確認 |

## 4. 一次情報の場所
- HyperFrames: https://github.com/heygen-com/hyperframes (`packages/core/src/runtime/adapters/three.ts`、`seek-dispatch.ts`)、issue https://github.com/heygen-com/hyperframes/issues/584
- ローンチ動画: https://github.com/heygen-com/hyperframes-launch-video (`compositions/flex-threejs.html`)
- three r181: https://github.com/mrdoob/three.js/tree/r181/examples (`webgl_volume_cloud.html`、`webgpu_volume_cloud.html`、`webgl_postprocessing_unreal_bloom.html`、`webgl_shaders_sky.html`、`webgl_shaders_ocean.html`)、`examples/jsm/objects/{Water,Sky}.js`、`examples/jsm/postprocessing/{UnrealBloomPass,SSRPass,BokehPass,FilmPass,AfterimagePass,LUTPass,OutputPass}.js`、`src/materials/MeshPhysicalMaterial.js`、`src/core/BufferGeometry.js`、`src/geometries/PolyhedronGeometry.js`
- Rock & Cliff Lab: https://github.com/maxliebscher/threejs-procedural-rocks-cliffs
