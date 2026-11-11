# 01 技術調査：MV系2D/2.5Dモーショングラフィックス制作

## A. 調査の射程と、わかったこと・わからないこと

本調査の主題はTEMACAの「純恋愛のインゴット • Motion Graphics」を入口とした、**MV映像の制作原理の汎用化**。個別作品のプロジェクトファイル、コンポジション、キーフレーム、プラグイン、カメラ位置を直接確認していないため「この作品は○○の具体的なプラグインで作られた」と断言できない。作者の公開Showreel、Coloso講座のカリキュラム、公式技術資料を根拠に「こういう作業工程・機能が必要」と抽出する。

作者のColoso講座のカタログでは、音楽の分析、企画、ストーリーボード、スタイルフレーム、Value/Speed Graph、文字モーション、キャラクターRig、2.5D空間、カメラ、LookDev、音楽アクセント、インサート、演出の緩急が明示されている。[確認]
- https://coloso.jp/products/dictionary-temaca-jp
- https://coloso.jp/products/dictionary-temaca-dub-jp
- 作者Showreel / Breakdown: https://www.youtube.com/watch?v=_LFJ4rPWNCc

**注意：講座の見出しに「52講」、内容情報に「45講」等の表示揺れが見られる。講義数の正確性は必要なら購入前に確認。**

### 映像の強さを分解した仮説（この章のみ設計判断）
「高密度＝全要素が常に動く」ではない。各ショットに 1)主役となる文字/人物/形、2)主役を引き立てる二次動作、3)奥行き/質感、4)音のアクセント、5)次カットへの出口を設ける。特に、要素が動いていても視線を追えること、色・形・音の優先順位があることを重要視する。

## B. 作者の公開講座から読み取れる制作工程（一次情報）

| 工程 | Colosoの具体的な公開内容 | 自作スキルへ抽象化する機能 |
|---|---|---|
| プリプロ | テーマ・メッセージ・参考資料・ビジュアルムード・絵コンテ | creative brief / reference analysis / moodboard |
| 楽曲分析 | 例題楽曲とイラストの分析・曲に基づく構想 | BPM/オンセット/セクション/歌唱イベントのマップ |
| スタイルフレーム | Verse/Chorusごとのレイアウトとルック作成 | keyframes.png ×3, 視覚ルール |
| モーション | Speed/Value graph、複数動きの重ね合わせ | ease library / overlap / anticipation |
| タイポグラフィ | フォント、文字分離、タイポの密度とジャンプ率 | SplitText/書記素分割、日本語組版 |
| キャラクター | Puppet Pin、Duik Angela、髪・服・呼吸 | rig-lite (別フェーズ) |
| カメラ | 2.5DのZ配置、Nullカメラ、HandHeld、画面転換 | parallax camera rig / camera solve |
| LookDev | 光・影・rim、gradients、トーン、ノイズ | color and composite pipeline |
| 演出 | scene split、間引き、insert、音楽強調、メリハリ | event-driven director / pacing metrics |

一次ソース： https://coloso.jp/products/dictionary-temaca-jp

## C. 技術候補・出典・運用ポイント

### C1. HyperFrames = 完成映像の時間とフレームを管理する母体
- **HyperFrames GitHub / docs**：https://github.com/heygen-com/hyperframes
  - [確認] HTMLからMP4、GSAP等のseek可能なアニメーション、Puppeteer/FFmpegでのフレーム単位レンダリング。
  - 用途：動画構成、clipごとの開始・終了、音声、最終出力。
- **HyperFrames GSAP Adapter**：https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/adapters/gsap.md
  - [確認] `gsap.timeline({ paused:true })`、`window.__timelines[compositionId]`、絶対時刻シーク。
  - 用途：字・図形・カメラの全アニメーションを停止状態で登録する。
- **HyperFrames core/determinism rules**：https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-core/references/determinism-rules.md
  - [確認] 任意時刻へのシーク、フォント準備後にtimelineを組む、乱数やwall-clockによらない絵。
  - 用途：途中フレームから出力しても同じ結果になる。
- **HyperFrames CLI**：https://hyperframes.app/docs/5-packages/cli
  - [確認] preview, render, lint, snapshot、doctorなど。CLIと公式スキルのバージョンでコマンド差がありうる。
  - 用途：環境確認・スナップショット・最終検査。現地で `--help` を必ず確認。
- **HyperFrames Animation Rules**：https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/rules-index.md
  - [確認] 1つのpaused timeline、`fromTo` explicit states、unseeded random禁止、animation targetsのtransform優先、グループstaggerは約0.5秒を越えない目安（公式レシピ上のルール）。
  - 用途：下流の振り付け生成器の制約条件。

### C2. GSAP — モーションと字の制御
- **GSAP SplitText**：https://gsap.com/docs/v3/Plugins/SplitText/
  - [確認] chars/words/lines分割、mask、autoSplit、フォントload待ち、onSplitでの再生成、日本語など外国語への対応。
  - 用途：歌詞・見出しの文字出現、マスクスライド、斜め文字、stagger。
  - 注意：SplitTextの動作対象・DOM変更とHyperFramesの非同期初期化が衝突しないよう、フォントロード→split→timeline build→registerの順序を守る。
- **GSAP MotionPathPlugin**：https://gsap.com/docs/v3/Plugins/MotionPathPlugin/
  - [確認] SVGパス上の移動、向きの自動回転、曲線補間。path配列時のresolution標準12。
  - 用途：カメラ・小物・装飾・線に沿うテキスト等。
- **GSAP MorphSVGPlugin**：https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/
  - [確認] 数・型の異なるSVG pathのモーフ。`curveMode`、`shapeIndex`等で調整できる。
  - 用途：モチーフA→Bの図形変形、文字周りのオーガニックな形の成長。
- **GSAP DrawSVGPlugin**：https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/
  - [確認] SVG strokeの書き順風の表示を制御。
  - 用途：線画・枠・手書き風ライン。
- **GSAP License（GitHub README）**：https://github.com/greensock/GSAP/blob/master/README.md
  - [確認] 全プラグインが無償商用利用可能になったが、標準ライセンスでありMITと同一ではない。ライブラリそのものの再配布やSaaS制作基盤化は条件を読む。
- **Webflowの無償化発表**：https://webflow.com/updates/gsap-becomes-free
  - [確認] 2025年4月30日、従来の有料プラグインを含む全機能の無料化。

### C3. 2.5Dカメラと素材空間
- [確認] Coloso講座では3Dレイヤー/Z軸、Nullを使うカメラ制御、HandHeld、ショット・角度に基づくトランジションが公開されている。
- [試験提案] CSS 3Dは軽量なレイヤー移動、three.jsは奥行き・パース・照明が複雑なショットに採用。1動画で両方を無闇に混在させず、同じ2D絵の画面座標が一致するか評価。
- [試験提案] 背景Z=-300、遠景=-120、中景=-40、主役=0、前景=+80など「仮想奥行き単位」。投影法・perspectiveを固定して A/B 比較し、奥行き値そのものを公式推奨値と見なさない。
- 重要：CSS `preserve-3d`、`perspective`、`backface-visibility` は3Dの向きや遮蔽に関わる。参考：https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backface-visibility
- [試験提案] カメラは位置と注視点を別パラメータにし、被写体の顔とタイトルのSafe Areaを優先。大きなカメラ回転の連発を避ける。

### C4. Illustrator/画像や文字を動かす「軽量Rig」
- [確認] Coloso講座はPuppet Pin、Duik Angela等を紹介。ただし、**それらをブラウザ上で同じ処理に置換する標準APIがあるわけではない**。
- [試験提案] 近景キャラ・人物イラストは「顔/髪/胸/腕/服/背景」を権利処理された個別パーツで用意し、各パーツのpivot＋メッシュ変形を制御。
- 段階：v1 = limb rotation/head tilt/blink/breathing、v2 = hair secondary motion、v3 = mesh warp、v4 = character shot switching。
- 判定：顔の特徴を壊さず、パーツの隙間、重なり順、身体の歪み、ループの不自然さを抑えられるか。初期マイルストーンからは分離。

### C5. 音楽解析とイベント設計
- **librosa beat_track**：https://librosa.org/doc/main/api/generated/librosa.beat.beat_track.html
  - [確認] オンセット強度を測り、テンポ推定、拍の時刻を検出する。標準 `sr=22050`, `hop_length=512`, `start_bpm=120.0` 等はAPIのデフォルト。
  - 用途：ビート推定の**候補**作成。曲構造の自動理解とは別。
- **librosa HPSS**：https://librosa.org/doc/main/api/generated/librosa.effects.hpss.html
  - [確認] 音楽をharmonic/percussiveに分離できる。
  - 用途：打楽器のアクセント抽出の補助。
- **aubio**：https://github.com/aubio/aubio
  - [確認] onset/tempoの検出を提供。GPL-3.0-or-laterを採用しており、ソフト配布/組み込みのライセンス設計は要注意。
  - 用途：librosaの比較候補（導入は必要な場合のみ）。
- [試験提案] 音楽解析結果を `beats.json` として凍結。候補イベントに `confidence`、`type`（beat/onset/drop/section/lyric）を付け、人間またはClaudeが重要度を選ぶ。
- [試験提案] 20秒の全打点を装飾で埋めない。フレーズ開始とサビ入りなど重要イベントの上位10〜20件に演出を割当てる。数値は試験用。

### C6. 日本語文字組みと字幕同期
- **MDN Intl.Segmenter**：https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
  - [確認] `granularity:'grapheme'` は書記素クラスタ単位で分割し、`word` はロケールに依存して単語分割できる。
  - 用途：絵文字・結合文字を不正に切らず、日本語の文字単位アニメーションの前処理。
- **Noto Sans JP**：https://github.com/google/fonts/blob/main/ofl/notosansjp/METADATA.pb
  - [確認] Google Fonts配布版のライセンスはOFL。
  - 用途：バックアップフォント。フォントファイルは動画制作環境に留め、再配布/添付はしない。
- [試験提案] 組版QA：行頭禁則、孤立した助詞、長音・句読点、ルビ、漢字＋仮名混合でのバウンディングボックス、縦書き、欧文混在、縮小時の可読性。
- [試験提案] 最終1920×1080画面における「表示する主な日本語テキスト」の最小サイズを48〜56pxから検証（公式基準ではない）。美術的意図を持つ装飾小文字は別扱い。

### C7. 合成・仕上げ/LookDev
- [確認] TEMACA講座は光と影、Color/Gradient Overlay、Satin、Bevel and Emboss、Inner/Outer Glow、Light Wrap、Lumetri/Tritone/Levels/Curves、Diffuse、RGB Spectrum、Edge Blur、Vignette、ノイズ合成を説明。
- [試験提案] 合成処理の順序は「主役の形を成立→光方向→色/環境→輪郭光→テクスチャ→控えめな仕上げ」。処理の順番を変えたA/Bを試す。
- [試験提案] バックグラウンドに微小グレイン、テキストには局所的なシャドウ、強調点だけにGlow。最初から強いBlur/Chromatic Aberrationで品質を誤魔化さない。
- [試験提案] `prefers-reduced-motion` 対応はWeb公開時には重要だが、動画レンダリングではキャプチャのseekと視覚結果を優先。

### C8. QA / 終盤トラブルシューティング
- **HyperFrames CLI**：https://hyperframes.app/docs/5-packages/cli — snapshot・render・lint等（導入版のフラグ確認が必要）。
- **FFprobe**：https://www.ffmpeg.org/ffprobe.html — ストリーム形式・フレーム数の検証。
- **FFmpeg Filters**：https://www.ffmpeg.org/ffmpeg-filters.html — blackdetect、freeze判定など。
- **Playwright visual snapshot**：https://playwright.dev/docs/test-snapshots — スクリーンショットの視覚的回帰確認。OS/ブラウザ差異には注意。
- [試験提案] 検査対象：真っ黒/真っ白、フォントの□、パーツ欠損、影の汚れ、音ズレ、カメラでの見切れ、カット境界、意図しない繰り返し、無意味な全画面エフェクト。

## D. 実装候補機能の技術比較

| 機能 | 第一候補 | 代替/後回し | リスク/理由 |
|---|---|---|---|
| 文字演出 | HTML + GSAP SplitText | SVG文字パス | 日本語フォントreadiness/文字形状 |
| デザイン図形 | SVG + GSAP | Canvas/WebGL | SVG pathが編集しやすい |
| 図形モーフ | GSAP MorphSVG | 自前Path補間 | pathのねじれ/形状固有差 |
| 線の成長 | GSAP DrawSVG | dashoffset手書き | 動画seek依存を要確認 |
| フレームカメラ | CSS3D + GSAP | three.jsオルソカメラ | 3Dの透視差が必要なら後者 |
| 人物Rig | パーツ2Dリグ | 三角メッシュワープ | 初期はパーツ破綻が最重要 |
| 音楽イベント | librosa + 手動/AIレビュー | aubio | 誤拍/半拍/複合拍子/権利 |
| 音楽同期 | 凍結JSONイベント | リアルタイム音反応 | フレームseek時の再現性 |
| 合成 | CSS/SVG/filterから段階導入 | 大規模ポストシェーダ | パフォーマンス/色空間/視認性 |
| 最終動画 | HyperFrames + FFmpeg | 別編集ソフト | 現行ワークフローを維持 |
| QA | CLI + ffprobe + custom checks | 完全自動AI評価 | 人間の美術判断は残る |

## E. 安っぽさを生む失敗と反証可能な改善実験

1. **文字を大きく出すだけ**：タイミング・字間・視線・文脈が単純。→字単位/語単位/塊単位を同じ文章で比較。
2. **全カットが同じease**：画面全体が同じリズム。→少数の主役動作と時間差の二次動作を対比。
3. **全拍で画面を動かす**：視聴疲労・視認性低下。→強拍/フレーズ頭/サビ頭のイベント重要度に応じて差をつける。
4. **カメラをずっと動かす**：動かす意味がなくなる。→固定/移動/停止の緩急、主役が見えるholdを確保。
5. **2.5Dが紙人形風**：前景と背景のz差/影/ライティングが薄い。→前景の遮蔽、明暗、被写体サイズ、視差を画角単位で検証。
6. **文字化け・カーニング崩れ**：font not ready、文字分割・CSSの干渉。→font preload→組版→split→timeline registration。
7. **一貫性のない色・質感**：カットごとに自律生成で画風が変わる。→style bibleと3枚のstyle frameをFreeze。
8. **マスクで文字が切れる**：transformOrigin、overflow、baselineの不整合。→文字bboxを記録し境界3フレームで撮影。
9. **時間ジャンプで動きが異なる**：RAF、乱数、累積frame update。→絶対tの関数・seek順逆検査。
10. **擬似物理が破綻**：ランダムノイズやバネを毎フレーム積分。→解析的サイン・固定キーフレーム・事前ベイクの3候補。
11. **長すぎる空白や暗転**：タイムラインが短い・意図不明のカット。→構成表/scene interval coverage検査。
12. **合成頼り**：Bloom/blurを上げて主役の素の形を隠す。→FX offパスでの中間チェック。
13. **複数素材の権利が混ざる**：音楽の商用使用範囲、楽曲同期権、イラストの権利等。→各assetをmanifestに記録、未確認は使用禁止。
14. **コードを直しても画面を見ない**：lintはパスするが演出が弱い。→各ショットのstyle frameと連続フレーム、最終MP4をレビュー。
15. **参照作品を1:1模倣**：創作/権利上の問題。→学ぶのは工法、文字・曲・イラスト・ショット列は新規制作。

## F. 数値・設定値の出典区分

| 数値 | 由来 | 扱い |
|---|---|---|
| 1920×1080 / 30fps | ユーザー既存映像M4とHyperFrames使用条件 | [確認] 今回採用 |
| 15秒/450 frames (M4) | `ffprobe`で現物検証 | [確認] |
| 10秒/300 frames | 本実験で設定 | [試験提案] |
| `gsap.timeline({ paused:true })` | HyperFrames公式GSAP adapter | [確認] |
| `MotionPath` resolution default 12 | GSAP公式 | [確認] |
| librosa `hop_length=512`, `sr=22050` | librosa beat_track APIの既定値 | [確認] |
| グループstagger ≤約0.5秒 | HyperFramesのアニメーションルール上の目安 | [確認、適用はショット次第] |
| 主文の最小48〜56px | 1080p画面での視認実験案 | [試験提案] |
| 文字出現0.25〜0.6秒 | 試作時間の初期値 | [試験提案] |
| 最大6〜9カット/10秒 | テストの比較上限案 | [試験提案] |
| 主役hold 0.4〜1.0秒 | 読解時間の試験条件 | [試験提案] |
| 粒子100〜300 | MVP用軽量演出テスト | [試験提案] |
| カメラのZ値 | 任意の仮想座標系 | [試験提案] |

## G. 素材とライセンス

- HyperFrames: リポジトリのLICENSEを採用した版で確認。 https://github.com/heygen-com/hyperframes
- GSAP: 標準ライセンス。無償商用使用可能だがMIT扱いしない。 https://github.com/greensock/GSAP/blob/master/README.md
- Noto Sans JP: OFLのフォント。プロジェクトに配置するときは必要に応じてライセンス表記を保管。 https://github.com/google/fonts/blob/main/ofl/notosansjp/METADATA.pb
- Kenney個別アセット: CC0（ただし各パックを確認）。 https://kenney.nl/support
- aubio: GPLv3以降。配布形態への影響に注意。 https://github.com/aubio/aubio
- librosa: 現地のLICENSE確認。ライブラリを利用するだけであって、音楽の利用権は得られない。 https://github.com/librosa/librosa
- 楽曲：曲名・作者・URL・許諾元・同期/映像への使用の可否・配信範囲・要クレジット・改変可否・証拠の写しを記録。
- TEMACAの講座教材や有料素材：ソースが公開・視聴可能でも、素材の再利用権が付随するとは限らない。許諾なく取り込まない。

## H. 参照資料一覧（直接確認したURL）

| # | タイトル | URL | 要旨と導入ポイント |
|---|---|---|---|
| 1 | TEMACA講座公開カリキュラム | https://coloso.jp/products/dictionary-temaca-jp | 音楽分析→構成→文字→カメラ→LookDevという制作フロー |
| 2 | TEMACA Showreel/Breakdown | https://www.youtube.com/watch?v=_LFJ4rPWNCc | 作者本人の実作例紹介（詳細パラメータは未公開） |
| 3 | HyperFrames | https://github.com/heygen-com/hyperframes | 映像構成/レンダー基盤 |
| 4 | HyperFrames GSAP adapter | https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/adapters/gsap.md | seek-safe root timeline |
| 5 | HyperFrames deterministic rules | https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-core/references/determinism-rules.md | 乱数/seek/準備完了の制約 |
| 6 | HyperFrames animation rules | https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/rules-index.md | モーションの原子的ルール |
| 7 | HyperFrames CLI | https://hyperframes.app/docs/5-packages/cli | snapshot/render/lint/doctor |
| 8 | GSAP SplitText | https://gsap.com/docs/v3/Plugins/SplitText/ | 文字分割・マスク・フォント対応 |
| 9 | GSAP MotionPath | https://gsap.com/docs/v3/Plugins/MotionPathPlugin/ | 曲線移動・自動回転 |
| 10 | GSAP MorphSVG | https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/ | ベクター形状モーフ |
| 11 | GSAP DrawSVG | https://gsap.com/docs/v3/Plugins/DrawSVGPlugin/ | ストローク描画 |
| 12 | GSAP readme | https://github.com/greensock/GSAP/blob/master/README.md | 無料化と標準ライセンス |
| 13 | Webflow発表 | https://webflow.com/updates/gsap-becomes-free | 2025年プラグイン無償化 |
| 14 | librosa beat_track | https://librosa.org/doc/main/api/generated/librosa.beat.beat_track.html | 自動拍検出と誤差の位置づけ |
| 15 | librosa HPSS | https://librosa.org/doc/main/api/generated/librosa.effects.hpss.html | リズム成分の分離 |
| 16 | aubio | https://github.com/aubio/aubio | onset/tempo検出、GPLに注意 |
| 17 | MDN Intl.Segmenter | https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter | 日本語文字分割 |
| 18 | Noto Sans JP | https://github.com/google/fonts/blob/main/ofl/notosansjp/METADATA.pb | OFL日本語書体 |
| 19 | FFprobe | https://www.ffmpeg.org/ffprobe.html | 完成映像のfps・フレーム検証 |
| 20 | FFmpeg filters | https://www.ffmpeg.org/ffmpeg-filters.html | 黒/白/静止/無音の診断 |
| 21 | Playwright visual comparisons | https://playwright.dev/docs/test-snapshots | 画面差分と環境固定 |
| 22 | Kenney support | https://kenney.nl/support | 個別パックCC0/帰属の確認 |

## I. 「純恋愛のインゴット」個別の制作方法についての検証限界

- 本調査は動画の全フレーム解析/AEソース解析を行っていない。個別作品での使用プラグイン・作業日数・テンプレート・自作素材/借用素材の内訳は**未確認**。
- Colosoの講義テーマを「作者の全作品で必ず使っている具体的手順」とするのは誤り。
- 作品の高密度アニメーションを模写するのではなく、**抽象原理（タイポの視覚階層・モーションの時間差・カメラの奥行き・音楽との連動・合成）**を使ったオリジナル検証を推奨。

