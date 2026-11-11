# 06 技術実装レシピ — Claude Code開発用

これは**現行リポジトリを確認した後に採用可否を判断する技術ノート**。コードは説明用の断片で、そのまま動作する完成HyperFramesアプリではない。具体値は「公式APIの仕様」と「本案件の初期試験値」を区別する。

## 1. Movie timing: 全てinteger frameで設計

- `[試験提案]` プロジェクトのマスター単位は30fpsの整数フレーム。`timeSec = frameIndex / 30`。
- 音楽イベントは解析時には秒で保持し、表示frameへ写像するときは丸め関数を統一する。
- `frameStart` は含む、`frameEnd` は含まない `[start,end)` の半開区間。
- 10秒なら `[0,300)`。frame299が最終出力の画。
- 30fpsで時間差1フレームは約33.33ms。マーカーを任意の拍へ丸めるときは、後で選んだrounding methodを変更しない。

```ts
export const FPS = 30;
export const framesToSeconds = (f: number) => f / FPS;
export const secondsToFrames = (s: number) => Math.round(s * FPS);
export function assertInterval(start: number, end: number) {
  if (!Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
    throw new Error('Invalid half-open frame interval');
  }
}
```

## 2. Seek-safe GSAP：非同期フォントの後にtimeline構築

公式参考：https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-core/references/determinism-rules.md

- scriptが読まれたら即timelineの器だけ登録する実装は、asyncで後から中身を追加する場合に空のまま取り込まれる危険がある。
- SplitText→GSAPの作成完了後に `window.__timelines['my-composition'] = tl`。
- 現行HyperFrames版のadapter/CLIがサポートする準備完了の仕組みがあればそれに従う。
- 変数を外で累積せず、`fromTo`を用いて時間ごとの状態を明示。

```js
async function buildSeekableScene() {
  await document.fonts.ready;
  // 実際のSplitTextライブラリをロード・register済みであること。
  const split = SplitText.create('.hero-title', {
    type: 'chars',
    mask: 'chars'
  });
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(split.chars,
    { yPercent: 120, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 0.42, stagger: 0.04,
      ease: 'power3.out', immediateRender: false }, 0.3);
  window.__timelines = window.__timelines || {};
  window.__timelines['my-composition'] = tl;
}
void buildSeekableScene();
```

**注意**：上のコードはcomposition scaffolding、クリップのdata属性、アセットload、HyperFramesのバージョンを省略している。`SplitText.create`がマスク範囲や文字間隔を変える場合があり、結果を実際にプレビューすること。

## 3. 日本語文字の分割/和文組版

https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter

```js
const chars = [...new Intl.Segmenter('ja-JP', {granularity:'grapheme'})
 .segment('夜明けの回路')].map(entry => entry.segment);
```

- ひらがな、漢字、濁点、結合文字、絵文字、句読点のfixtureを用意する。
- 自動単語分割が日本語として美しいとは限らない。`manual_breaks` をDSLで許可。
- 文字ごとのtransformで間隔が崩れるなら、親行・子グリフに責務分離。
- [試験提案] 文字主役の「入場0.25〜0.6秒」「読ませる0.4〜1.0秒」はまず比較条件として評価。長文・歌い方で変える。

## 4. 過度な連続トランジションの回避

ショットごとに `entrance/hold/exit` を明記する。カット間の『動きの因果』は次から選択：
- 方向継承（前カットの動き方向に次の物体が現れる）
- 形継承（円が次カットの光源などへ変わる）
- 色継承（目立つ1色が次カットで残る）
- 意味継承（文字の単語が次の画面のビジュアルへ変わる）
- 音継承（曲が切れず、映像だけ切替）

理由のないwipes, glows, camera spinsの連発を自動ディレクタが拒否できるよう `transition_intent` をDSLへ入れる。

## 5. モーションの時間差 (stagger) をデザインする

GSAP公式SplitText例：https://gsap.com/docs/v3/Plugins/SplitText/
HyperFrames原子ルール：https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/rules-index.md

- 複数文字/形状の全体入場時間がばらけすぎないよう、`(count-1)*stagger + duration` を計算。
- 重要な語は一塊、装飾的な粒子は個別にずらすなど、**意味のある粒度**で動かす。
- [公式レシピの目安] 多数要素のグループstaggerが約0.5秒を超えると、同じ拍に感じられない可能性がある。
- [試験提案] 固定stagger 0.04secと、非線形配置staggerを同一画面で比較して採用。

## 6. 速度曲線を意図で使い分ける

| 演出意図 | 曲線の候補 | 注意 |
|---|---|---|
| 視線を集める | power3.out | 常に同じeaseだと一律に見える |
| 強い到達感 | power4.out + 短いhold | 一瞬で止まりすぎると重い |
| 軽い漂い | sine.inOut | 全部漂わせない |
| テキストの緊張 | power2.in→cut | 読み時間を消さない |
| コミカルな反動 | back.out, elastic.out | ブランド/曲の空気に合う場合のみ |

上記曲線はGSAPの代表的なease名称。各用途への割当は**本案件のデザイン仮説**。

## 7. 2.5Dカメラの構成案

**方式A CSS3D**：文字/イラストがDOMで、影・filterがCSSで完結している場合に有力。主役DOMとカメラの親要素を分けてtransform。

```css
.scene { perspective: 1000px; }
.camera-rig { transform-style: preserve-3d; }
.layer { position: absolute; transform-style: preserve-3d; }
/* translateZの値はシーン寸法/投影法に合わせる */
```

**方式B three.js orthographic**：複雑な回転、奥行きの同時アニメーション、光源連動がある場合に候補。文字をテクスチャ化すると鮮明さが下がる場合がある。DOM文字をoverlayとして残す別案も比較。

どちらもカメラの位置とターゲットの補間を別に保持。3枚のstyle frameと一致する画角を優先し、パララックスの目立ちやすさが目的化しないようにする。

## 8. モーフ/マスク技術

- SVG モーフ：https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/
- 線の出現：https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/
- 曲線移動：https://gsap.com/docs/v3/Plugins/MotionPathPlugin/

`MorphSVG`は自動的に点数を揃えるが、形によってねじれや中間形状の不自然さが出る。変形自体が目標でないなら、clip-path/wipe/occlusionに落とす方が画面品質が上がることもある。

## 9. カメラFX/モーションブラー/タイミング

- 高速運動にblurを加える前に、シャープなフレームを確認し、オブジェクトの軌跡が読めるか評価する。
- HyperFramesは時刻指定描画なので、残像を累積して実現するエフェクトはそのままではフレーム順依存になりやすい。
- 動きブラーを実装するなら**指定フレーム周辺のサブフレームを固定回数合成する**方式を検討。ただしGPU/合成コストが大きくなるため低解像度で検証。
- [試験提案] モーションブラー：出力fps30、露光時間を1/60s程度の候補として比較。美術的に常時必要とは限らない。
- トランジションでフルスクリーンの真白/真黒を挿入するときは意図と長さをDSLに記録する。

## 10. 色・合成パイプライン

1. noFX / base colors
2. grayscale hierarchy check
3. lighting/shadows
4. selective glow
5. texture/grain
6. grade
7. export colorspace check

FXが参照style frameに比べて過剰なら後段を戻す。自動判定では主役文字部分の輝度・コントラスト/飽和画素数の相対比較を行い、誤検出をHuman reviewする。

## 11. QA観点：局所修正と回帰

同じカットの`styleframe.png`と中間時刻の画像を2系列で並べる。
- baseline = 凍結した旧版
- candidate = 修正版
- diff = 同時刻画面差
- affected area = 修正目的の領域マスク（定義できる場合）

画素差分だけで美的品質を判断しない。変更したい領域以外で画面全体の色やカメラが変わっていたら「副作用あり」として報告する。

```bash
# コマンドは導入版のhyperframes CLIで --help を確認してから実行
npx hyperframes snapshot <project-path> --at 1.2,3.4,5.5,7.9,9.96
npx hyperframes render --output master.mp4
ffprobe -v error -count_frames -show_entries stream=codec_type,width,height,r_frame_rate,nb_read_frames -of json master.mp4
ffmpeg -i master.mp4 -vf 'blackdetect=d=0.07:pix_th=0.1' -an -f null -
```

異なるバージョンでは`hyperframes snapshot`のオプションが変わる可能性がある。検証では実際のCLIのusageを優先。

## 12. 導入前に確かめるべき現地情報

- GSAPの導入版とSplitText/MorphSVGのimport方法（GSAP 3.13以上か、Pluginの依存状況）。
- HyperFramesのルート/シーンclipの実際のHTML構造。
- 動的font load後のtimeline readyを待つadapterの挙動。
- 既存のUI/3D/音響機能のどれがMVに再利用できるか。
- 生成環境でのSVG filterやCSS mix-blend-modeの描画差。
- ffmpeg/audioのタイムスタンプ補正とrender経路。
- 非同期画像/動画素材のシーク時読み込み完了をどう確認するか。
- オープンソース素材だけで制作できるか、画像/音源をユーザー提供する必要があるか。

