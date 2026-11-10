# 01 調査 — 高品質なコード制作モーショングラフィックスの構築原理

## A. 今回確認できた主要事実

### A1. 制作フローに美術段階を置くことはプロの標準的な考え方
**School of Motion — A Guide to Completing Your Motion Design Project**
- URL: https://schoolofmotion.com/blog/guide-completing-motion-design-project
- 【確実】アイデア→ムードボード→絵コンテ→**Styleframes**→Animatic→制作ボード→アニメーション→コンポジット・カラー・音の工程を説明。Styleframesは複数案を作り比較する。
- 活用：映像コード生成の前に、絵としての品質を審査するゲートを設ける。最終アニメーションの後だけレビューする従来方式を改める。

### A2. HyperFramesはすでに美術スタイル機構を持つ
**HyperFrames Visual Style Library**
- URL: https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-creative/references/visual-styles.md
- 【確実】視覚スタイルを名前・気分・カラー・文字・動き・禁止要素等と結びつけている。Swiss Pulse / Velvet Standard / Deconstructed / Maximalist Typeなどを含む。
- 活用：新規の独自スタイル辞書を大量に重複実装しない。既存の文法を読み込み、作品固有の表現を追記する。

**HyperFrames Design Picker**
- URL: https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-creative/references/design-picker.md
- 【確実】ムードボードと個別調整を分けて候補を示す。色だけを変える案を異なる方向性として扱わない。
- 活用：美術候補3方向は「作り方・世界の解釈・主役」が違うことを必須とする。インストール版の実装が使えるなら再利用する。

**HyperFrames Design Spec (frame.md / design.md)**
- URL: https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-creative/references/design-spec.md
- 【確実】前提条件を機械可読なfrontmatterで保持。`frame.md -> design.md -> DESIGN.md` を優先して解決する。
- 活用：今回の仕様は `frame.md` を上書きせず、既存ファイルの所在・仕様・優先度を監査した上で互換形式を追記する。

**HyperFrames Video Composition**
- URL: https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-creative/references/video-composition.md
- 【確実】Webページと動画フレームは設計が違う。動画の主役、文字サイズ、色の存在感、装飾、視線誘導を考慮する。例示数値（見出し64〜120px、本文28〜42px等）はガイドの出発点であって普遍的下限ではない。
- 活用：可読性・視線誘導・画面密度を映像用の評価に変更。ロゴ1つなど低密度を意図するカットは例外扱い。

**HyperFrames General Video Skill**
- URL: https://github.com/heygen-com/hyperframes/blob/main/skills/general-video/SKILL.md
- 【確実】HTML着手前にデザインソースを解決し、コンセプト・フォント・主役・アンカー・背景処理を決める。
- 活用：新規 `art-director` 技術の初手で、既存スキルにそのプロセスがないか確認する。

### A3. コードのみでもデザイン性の高い作品は存在する
**MotionHunt: Claude Code Examples**
- URL: https://motion-hunt.com/tools/claude-code
- 【確実】Claude Code / Remotion / HyperFrames / SVG / Canvas 等の公開作品や制作記録を一覧化。複数の表現方式が使われている。
- 注意：ギャラリーのランキングは画質評価の客観指標ではなく、表示件数・ランキングは随時変わる。

**@aykutuces — Kinetic Typography（キュレーション）**
- URL: https://motion-hunt.com/v/kinetic-typography-motion-design-video-made-with-claude
- 【作者報告】作者は参照スクリーンショットを先に渡し、Claudeが配色・フォント・レイアウトを分析してスタイルガイドを作り、音声と文字出現を同期させたと説明。RemotionとHyperFramesを利用したという。
- 活用：一発プロンプトの魔法ではなく、参照分析とスタイルルールの定着が再現性に寄与するという仮説を試験する。

**36 Motion Graphic Styles You Can Build with Claude**
- URL: https://mndr.ai/blog/motion-graphics-with-claude/
- 【作者報告】36種類のコードベース映像表現を選択し、GSAP/Remotion/Manim/Blender等を使い分けた実験を公開。
- 活用：同じ題材でもフラット/キネティック/パペット/紙・印刷/写真合成等の画作りがあり、単一3Dパイプラインに固定しない。

**Scenes — HyperFrames作例集**
- URL: https://scenes.design/
- 【確実】HTML/CSS/GSAPのコードシーン例を公開。
- 活用：アートディレクションがよい2D作例をリファレンスとして分析。固有の完成シーンを無断転載しない。

### A4. 動画は「時間」でデザインする
**GSAP Timeline / seek()**
- URL: https://gsap.com/docs/v3/GSAP/Timeline/
- URL: https://gsap.com/docs/v3/GSAP/Timeline/seek%28%29/
- 【確実】timelineを任意時刻にseekできる。画面を動かす技術そのものは既存インフラで足りる可能性がある。
- 活用：新しいエフェクト群よりも、どの場面で何を動かすかを定義する美術・演出データを先に作る。

**HyperFrames GSAP adapter**
- URL: https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-animation/adapters/gsap.md
- 【確実】paused timelineを `window.__timelines[compositionId]` に登録。シークのための規約がある。
- 活用：実装時にこの契約を守る。詳細はインストール版のソース・文書を優先。

**GSAP SplitText**
- URL: https://gsap.com/docs/v3/Plugins/SplitText/
- 【確実】文字/単語/行の分割、マスク、フォント読み込み後の再計算に対応。
- 活用：「筆文字と明朝とゴシックを無秩序に変える」より、統一文字をショット内で変形・空間と連動させる。

### A5. 安価な外観の克服方法は3Dポリゴンの追加だけではない
**MDN SVG Filter**
- URL: https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Filters
- URL: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence
- 【確実】SVGのフィルタでノイズ・マーブル風のテクスチャ・影・エッジ等を合成できる。フィルタ範囲が狭いと影やブラーがクリップする。
- 活用：ベクターとフォントのデザインを壊さずに深さや質感を加える技術として比較。
- 注意：フィルタを多用すれば美術がよくなるわけではなく、意図なきノイズはむしろ安っぽい。

### A6. ライセンスと利用技術
**HyperFrames Apache 2.0**
- URL: https://github.com/heygen-com/hyperframes
- 【確実】リポジトリはApache-2.0。含まれる外部素材・フォント・音楽の許諾とは別。

**GSAP standard no-charge license**
- URL: https://github.com/greensock/gsap
- URL: https://gsap.com/standard-license
- 【確実】GSAPは標準のno-chargeライセンス。MITやApacheと同一視してはいけない。再配布/組込/サービス化等は標準ライセンスを確認。

**HyperFrames Typography**
- URL: https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes-creative/references/typography.md
- 【確実】利用可能フォントと埋め込み、フォールバックを解説。日本語はNoto Sans JPが同梱リストにある。文字がきちんとロードされるかレンダリング時に検証する。

**Unsplash License（写真を使う場合）**
- URL: https://unsplash.com/license
- 【確実】所定条件の商用利用を認める。ただし画像の無修正での販売、類似・競合サービスへの画像集合化などは禁止。
- 活用：写真を採用した場合、掲載ページ、著作者、取得日、改変の有無を台帳に残す。人物・商標・建物等の追加の権利にも注意。

## B. 制作上の論点と実証方法【設計仮説】
1. **主役がない背景を造形密度で埋めない。** 消失点・大量の小窓・発光線の総量より、意味のあるシルエット・余白・印象的な焦点を優先。
2. **1枚絵の完成度を最初に測る。** 色・輪郭・比率・視線・感情を、FX OFFの状態でもレビュー。
3. **スタイル案を美的に区別する。** 配色だけでなく、主役・描画の仕組み・動きの文法・画面構図・質感が違う案を3つ。
4. **素材を無理にコード化しない。** 権利処理済みイラスト・写真・テクスチャを使うことを認める。同時に優れたSVGだけの映像も許す。
5. **映像としての連続性も重要。** 8秒単体の絵だけ良くても、16秒、26秒、40秒、49秒へ美術モチーフがつながらなければ不合格。
6. **数値では品質を証明できない。** 色数、エッジ密度、輝度ヒストグラムなどは技術的な変化の指標。『美しい／安っぽい』の最終判断は人間の美術レビューを残す。

## C. 確認できなかったもの
- 対象ユーザーのWindows側Claude Codeプロジェクトの現在のコード・バージョン。
- @aykutucesなど作者公開作品の制作内部を完全再現するための全ソース・素材・作業時間。
- 『夜明けの回路』の背景構成を生成したプログラム内部。映像から観察はできるが実装手法を断言できない。
- スタイルフレーム導入によって商用品質に至るという保証。導入後のA/B比較が必要。
