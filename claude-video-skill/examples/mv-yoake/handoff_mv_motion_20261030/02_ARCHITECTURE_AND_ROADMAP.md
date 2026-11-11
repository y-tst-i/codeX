# 02 研究に基づくアーキテクチャ・開発工程・受入設計

## 0. 方針
「TEMACA風の1本だけを作る」のではなく、**テーマと許諾済み楽曲から独立したMVモーショングラフィックスを自律制作する汎用パイプライン**を追加する。既存のM4などの2D UI系、crystal-sky等の3D系制作能力を退化させない。既存環境を現場監査して最適な構成を選び、不要な新ライブラリを増やさない。

高品質の定義：1)意図ある画面構成、2)曲と画面の論理的同期、3)美術的一貫性、4)滑らかかつ多様な動き、5)人間が読める文字、6)法線/視差/マスク等の技術的破綻がない、7)再現性、8)権利が明確。

## 1. 機能分担の候補

```
User brief / rights-cleared song / optional original illustrations
                  │
                  ▼
Creative brief + intent + hard constraints + right ledger
                  │
                  ▼
Audio preanalysis (beats/onsets/sections) ──┐
                  │                         │
                  ▼                         │
Direction: story arc, visual rules, pacing  ◄┘
                  │
                  ▼
Shot plan + beat cues + original wording + motion intent
                  │
                  ▼
Style frames (intro, middle, climax)  ←──── Human/AI look review
                  │
                  ▼
Animatic (low-res / low FX) ←───── rhythm / attention review
                  │
       ┌──────────┼───────────────┐
       ▼          ▼               ▼
  Typography   SVG / 2D Rig     2.5D Camera
  (DOM GSAP)    (SVG/Canvas)     (CSS3D/three.js)
       └──────────┼───────────────┘
                  ▼
HyperFrames Composition (seek-safe clip timelines)
                  │
                  ▼
Composite / color / optional FX / audio mix
                  │
                  ▼
Frame QA, render QA, human art review / change logs
                  │
             Gate PASS
                  ▼
             MP4 + manifests + source + review artifacts
```

### モジュール契約（設計案。現存とは限らない）

| Module | Inputs | Outputs | 主な失敗処理 |
|---|---|---|---|
| `brief-parser` | brief, duration, rights | brief.yaml | 曖昧な条件はassumptionとして記録 |
| `music-analyzer` | wav/mp3 | beat_map.json | 疑わしい拍は低confidenceとし人が修正 |
| `creative-director` | brief, beat map, references | direction.md / mood / storyboard | 画風/物語の破綻を検出して修正 |
| `styleframe-builder` | shots, asset ledger | keyframes PNG / style bible | 主役が小さい/色一貫性なしなら差戻し |
| `motion-choreographer` | events, shots | timeline specs | 時間競合/長すぎる文字/staggerを調整 |
| `render-adapter` | scene HTML, assets | snapshots / MP4 | seek deterministic ルール違反を差戻し |
| `visual-review` | renders, reference PNGs | quality_report.json | frame index + 理由 + 修正対象を指定 |
| `asset-rights` | files, source URLs | rights.csv | 未確認をフラグし本番使用禁止 |

## 2. 絵コンテ＋ショットDSL（Scene DSL）

AIが各ショットを自由にHTMLへ直書きすると一貫性が壊れるので、**意図を保持する中間仕様**を導入する。最終レンダラーはHyperFramesが持つ。

重要なフィールド：
- `shot_id, start_frame, end_frame` — 30fps integer framesを基準に時間を一元化。音声は必要ならsampleに変換。
- `subject` — 主役の文字/キャラ/図形、必要な時間・占有率。
- `intent` — 「発見」「緊張」「浮遊」「解放」などの画面意図。
- `visual_hierarchy` — primary, supporting, ambientに区分。
- `music_event_ref` — beat/phrase/hit など、全拍と1:1対応しない。
- `motion_components` — 入場/hold/二次運動/退出の時間と目的。
- `camera` — 位置・注視点・画角と速度曲線。
- `exit_transition` — 次カットの接続理由。トランジション単独の見栄えに流れない。
- `style` — palette, typography, texture, shadow, contrast, grain。
- `qa` — 読ませる文字の最小占有、bbox、主役視認、意図的暗転。
- `licensed_assets` — 素材名・ライセンス・使用範囲。

JSONスキーマを実装するなら、最初にバリデータ（zod等、既存依存があればそちらを使う）を定義する。`examples/shot_spec.example.json` は入力例であり今すぐ本番採用しない。

## 3. Time model とseek-safe実装

時間をフレーム整数と秒の間で相互変換し、シーンごとに厳密なintervalを保持する。30fpsなら `frame=0..299` で10秒（frame=300は動画外の終端）。

```js
const FPS = 30;
const sec = (frame) => frame / FPS;
const durationFrames = 300;
// 比較時は frame ごとにseek。丸め規則を仕様化。
```

### GSAPおよびHyperFramesへの接続（説明用パターン）
- Composition rootは `data-composition-id` を指定。
- 時間付きclipには `class="clip"`, `data-start`, `data-duration`, `data-track-index` が必要。
- `document.fonts.ready` 等の描画資産準備が完了してから、SplitTextを実行し、timelineを完全にbuildして登録する。
- `const tl = gsap.timeline({paused:true});`、根の `window.__timelines[compositionId]=tl` は**完成後に登録**。
- 途中seek用に `fromTo`、明示的な初期値、絶対位置を優先する。`onUpdate`で外部可変状態を積み上げない。
- RAF・wall-clock・ランダムシード未固定・アセットのrender時ネット取得は禁止。
- 親compositionに既存の子timelineを二重追加しない。sceneの時刻管理はHyperFramesの規約を優先。
- 3Dサブシーンは公式`hf-seek`アダプター。GSAPとThree.jsで二重に時間を進めない。

[一次情報] https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/adapters/gsap.md
[一次情報] https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-core/references/determinism-rules.md

## 4. 音楽設計

### 音響解析と演出設計を分離

音楽のbeatは自動で抽出できるが、**歌詞の意味、楽器の変化、サビ前の溜め、強拍の重要性は自動ビート列だけでは判断できない**。

1. 原曲利用権を確認し、BPM候補・オンセット・音量・区間を抽出する。
2. Claudeに「intro/verse/build/drop/outro」の構造候補を出させ、確度を明記。
3. 原曲を聴いたうえで強調イベント（cut、accent、motion、FX、hold）を選ぶ。
4. 強拍への完全同期ではなく±1〜2 framesの比較調整を行う（初期実験値）。
5. `cue_map.json`を凍結して、カット変更後も音楽側を勝手に編集しない。
6. スタイリングとして2倍/半分テンポの誤認を検査。

重要：スピーカと視覚の時間感覚を守る。歌詞情報を扱う場合は同期権・歌詞の使用許諾も確認する。

### 効果音
- 文字/図形の接地やカメラ移動の速度変化など「画面上の原因」と結びつけて配置。
- 曲の重要な周波数帯域をSFXで覆わない。自動Duckは音量比較を必須とする。
- 既存音キットが使えるか著作権・ライセンスとファイル実体を先に調べる。
- SFX数のノルマを設けず、無音や弱い音を演出の選択肢にする。

## 5. タイポグラフィ系モーションのパターンライブラリ

`type-motion`の実装候補。実装するのは必要なもののみで、プリセットのランダム連発を禁止。

| Pattern | 機能 | 実装候補 | 品質基準 |
|---|---|---|---|
| Mask Rise | 行/文字がマスク内から上昇 | SplitText + GSAP | ベースライン・句読点欠損なし |
| Stagger Tension | 列の文字に時間差 | GSAP stagger | 結合文字分割の破損なし |
| Type Push | 文字の拡大で画面転換 | transforms, clip-path | 主役を消さない |
| Type on Path | パス沿いの装飾文字 | SVG + MotionPath | 字形の回転不自然さを抑制 |
| Shape-to-Type | 図形からタイトルへ | SVG/MorphSVG | モーフのねじれ・画風一致 |
| Text Hold | 静止/緩い漂い | GSAP | 静止にも意図がある |
| Semantic Highlight | キーワードに視線誘導 | color/size/underline | 常に読める |
| Depth Echo | 背面の文字レイヤーの視差 | CSS 3D | 紙風の単調さを回避 |

**日本語**：`new Intl.Segmenter('ja-JP',{granularity:'grapheme'})` で書記素cluster、語単位はword、長いフレーズは編集判断で塊を分ける。日本語禁則、欧文混在、和文の重心をQAする。SplitText単独の自動改行に依存しすぎない。

## 6. 2.5D/カメラ・絵づくり

### カメラプラン
- 静止した3枚のstyle frameをまず作成し、その主役を崩さない範囲で動かす。
- ショットの入りと抜けで注視点を明示。主役はそのまま、背景だけ軽いparallaxを入れる場面も使う。
- 同じ方向・同じ速度のパンを連続しない。カメラの「止まる」「引く」「急速に寄る」「空間を横断する」に理由を持たせる。
- 傾き・ズーム・パララックス・フォーカス移動を同時に最大化しない。

### 2.5D空間の階層（例）
```
cameraRig
 ├─ distantBg       z = -300
 ├─ environment     z = -120
 ├─ typeBackground  z =  -40
 ├─ subjectText     z =    0
 ├─ graphicOverlay  z =   40
 └─ foreground      z =   80
```
数値は任意座標。CSSのperspectiveやthree.jsのカメラ設定に合わせる。最初に2DのスタイルフレームとZ配置後の投影が一致することを必ず確認する。

## 7. LookDev/コンポジット

### FXよりデザインを優先する優先順
1. レイアウト・文字の強弱・余白
2. 主役と背景の距離、フォーカス
3. 色・コントラスト
4. 光源とrim/highlight/shadow
5. 粒子・光・texture/grain
6. motion blur、chromatic aberration、vignette（必要な場合のみ）

### 中間レンダーの比較
- A：FX off + neutral background
- B：color/shadow only
- C：color/shadow + subtle FX
- D：all FX（候補）

DがBより主役を読みにくくするなら採用しない。FXの重さではなく、デザインと物語との相乗効果を評価する。

## 8. 人物キャラクターの別フェーズ

元イラストを自動でパーツ分解できることを前提としない。パーツ素材を明確なライセンスで取得できた場合にだけ実装。安全なレイヤー境界・隠れた裏地/髪の下を追加描画する工程・目と口の独立パーツ・リグのテストを設ける。最初の10秒ベンチマークは人物不要にして、音楽と文字/カメラ技術の根本を評価する。

## 9. 導入工程：Phase 0〜7

### Phase 0. 現状監査（編集禁止）
- Repo tree / `SKILL.md` / `CLAUDE.md` / `AGENTS.md` / scripts / package versions / license ledgerを読んで能力マップ。
- M4など既存の合格作品が再生成できるか確認。映像のベースライン（時間、解像度、fps、screenshot）を保存。
- 既存の2D/3D/音響skillの責務と衝突を一覧化。
**Gate0**：書面のaudit+アーキテクチャ図+現行テスト結果。未確認は明記。

### Phase 1. アートディレクション試験（コード最小）
- 10秒オリジナルの楽曲構造・テーマ・参考資料を設定。
- 3種類のコンセプトを検討し、1つ選び、3枚のstyle frameを作る。
- 10秒全体のショット表（3〜6ショット）と主役・視線・音の関連を明文化。
**Gate1**：3枚が同じ作品に見える、主役と感情曲線が読み取れる。Human/AIレビュー。違えば構図から修正。

### Phase 2. Seek-safe基盤 + 日本語タイポ
- HyperFrames/GSAPで文字の出現・hold・退出の縦切り。
- 日本語（濁点・結合文字・句読点・英数・絵文字）で文字分割test。
- 0sと任意の中間tへのseekで同じ絵。clip終端の黒フレームなし。
**Gate2**：seek前後一致、文字欠損なし、HyperFrames lint/doctorでエラーなし。

### Phase 3. 音楽同期+アニマティク
- 解析ツールから候補beat mapを作り、人間の調整箇所を保存。
- 最も強調するイベント2〜4個とそれ以外を差別化。
- 低負荷のアニマティクをレンダリングし、カットの意味・語句の読める時間を評価。
**Gate3**：音と映像のアクセントが矛盾しない。音に振り回されず静止に意味がある。

### Phase 4. 2.5D/図形演出
- 先に1カットだけ、CSS3Dとthree.jsオルソカメラを比較。
- MotionPath/MorphSVG/DrawSVGのうちシーンに必要なものだけ導入。
- 遮蔽・裏面・パース・被写体の視認・カメラ経路をテスト。
**Gate4**：主役が画角内、空間感が強化、transitionのためだけの動きなし。

### Phase 5. LookDev
- lighting、color、texture、glow、blurなどを分離してアートディレクション。
- レンダリングの軽さ・視認性・一貫性でA/B比較。
**Gate5**：FX offとonのどちらも構図が成立。FXが物語を損なわない。

### Phase 6. 完成QA + Review
- HyperFrames render、FFprobeで duration/fps/frame count/audio確認。
- 全フレームまたはカット境界前後の黒/白/静止検査＋フォント欠損＋重要被写体遮蔽。
- 指定フレームを正順/逆順/ランダムseekしてピクセル差分。GPU差は同じ環境で比較。
- 同一位置の前後フレームで速度の飛び・ポップ・ちらつきを確認。
**Gate6**：物理的/表示的故障がなく、美術レビューを通過。失敗箇所をログ化して局所修正。

### Phase 7. スキル化 + 反証実験
- 作った機能を既存Skillの責務に合わせ、薄いcontroller/refs/tasksとして統合。
- 主に使う`SKILL.md`は簡潔に保ち、詳細レシピはreferences/へ分離。
- 10秒MV以外に、異なるテーマ/楽曲/文字量の2本を生成して再利用性検証。
**Gate7**：再現可能な別作品2本が成立し、既存M4型のUI動画と3D動画の品質が退化していない。

## 10. QAの機械判定と人間判定を分離

**自動判定でPASS/FAILにできるもの**：シーン長、解像度、fps、ファイル/音声の有無、文字・写真の範囲、欠けたasset、時刻seek再現性、黒フレーム、突然の無音、未承認素材の存在（manifest内）。

**主観性が高く人間が確認するもの**：独自性、タイポと歌の情緒、全体リズム、色彩・質感、飽きない構成、視線誘導、エフェクト過多、見せ場の説得力。

自動スコアだけで高品質と宣言しない。人間の評価基準は`04_QA_SCORECARD.md`。

## 11. 障害パターン・技術的なフォールバック

| Failure | 検出 | 優先対処 | 代替 |
|---|---|---|---|
| 設置版と公式docsのCLI差異 | `--help`, `--version` | 現地APIを確認し記録 | 現版に合わせたscript |
| GSAP timeline空で登録 | seek時の真っ白/真っ暗 | font ready後に構築して登録 | precomputed spans |
| SplitText文字化け | 文字欠け/全角の不自然な切れ | font embed/segmentation改善 | グリフ単位アニメをやめ行単位 |
| MorphSVGねじれ | 中間形の飛び | パス整理・shapeIndex見直し | wipe/scale transition |
| カメラ視差で主役消失 | frame snapshots | Z配置/注視点の調整 | 2Dレイヤーへ戻す |
| ライブSFXがフレームズレ | 波形/口/接地の比較 | 音声を事前ベイク | シンプルな元曲のみ |
| GPUで破綻 | browser console, screenshot | shader/フィルタ軽量化 | 静止PNG背景＋GSAP前景 |
| ffmpeg音ズレ |音と映像のクロスイベント比較 | 先頭/末尾、PTS/trimを再調整 | 外部mux後の再検査 |
| 参照画像が未許諾 | rights manifest | 当該asset不使用 | オリジナル生成/CC0 |
| 主観評価が低い | scorecard/Human notes | 構図・モーションの原因を戻して修正 | 低FX・より短い試作に戻す |

## 12. 推奨ファイル配置（新規作成の前に既存と照合）

```
.claude/skills/mv-motion-director/
  SKILL.md
  references/
    workflow.md
    typography.md
    beat-mapping.md
    camera-2_5d.md
    lookdev.md
    quality-review.md
  scripts/          # 実装がある場合のみ
    analyze_audio.py
    audit_composition.ts
    render_review.ts
  assets/           # ライセンス台帳のある自作/許諾素材のみ
examples/mv-benchmark-10s/
  brief.md
  music/            # パッケージ配布時に音源を勝手に同梱しない
  shot_plan.json
  style_bible.md
  compositions/
  snapshots/
  reports/
```

## 13. リソース制約（ユーザー既知PCに合わせる）

Radeon 740M/メモリ16GB想定では、高解像度フルエフェクト×全尺の反復は重くなる可能性がある。[試験提案]
- 試作時は低解像度/短尺/FX offを選ぶ。最終のみ1920×1080/30fps。
- 同じ素材を何度も生成するのではなくキャッシュを利用。
- `npm install`・大量モデルDL・外部API課金・長時間GPU処理は、現環境の権限/容量を確認してから行う。
- Blenderへの全面移行はせず、after effectsが必要な理由がある場合だけ代替案として提示。

## 14. リスクと経営的な判断

- **美術方向が定まらないままエンジンを作る**のは最大リスク。style frame承認を先行。
- **一作品の最適化に偏る**のが次のリスク。別楽曲/別テーマでの反証を必須にする。
- **多機能化による技術的負債**を抑える。各モジュールは挿入/撤去可能に。
- **音源・歌詞・イラストの権利**を厳密に扱う。参考MVの音源/既存画を取り込まない。
- **無条件で自動修正を繰り返す**と改善の証拠を失う。各改修のbefore/after比較・ロールバックを必須とする。

