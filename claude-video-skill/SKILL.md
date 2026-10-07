---
name: video-with-claude-code
description: Claude Codeで動画・モーショングラフィックス・PV・解説動画・ポッドキャスト用アニメを作るときの実践ノウハウ集。HyperFrames(HTML→MP4)を前提に、プロンプトの型、事前に渡す素材、音(BGM/SFX/ナレーション)、マルチエージェント分業、品質チェック、コスト感をまとめる。Use when the user asks to make/animate/render a video, promo, launch video, explainer, motion graphic, captions, or podcast overlays with Claude Code. 動画を作る前に必ず読む。
---

# Claude Code × 動画制作 実践ガイド

動画生成AIではなく、**コードで1コマずつ描画してMP4に書き出す**方式を使う。
再現性があり(同じ入力→同じ映像)、文字・図解・ブランド色を細かく制御できる。
フレームワークは **HyperFrames**(HeyGen製、Apache 2.0、HTML+CSS+GSAP等 → headless Chrome + FFmpeg)。

詳細な仕様は HyperFrames 公式スキルが正本。このスキルは「何を・どの順で・どう頼むか」の横断ノウハウ。
→ 具体的なプロンプト雛形は `references/prompt-templates.md`、事例メモは `references/case-notes.md`。

## 0. 入口ルール

1. 動画系の依頼が来たら、まず `/hyperframes`(ルーター)を読む。無ければ §1 で導入する。
2. **作る前に確認する3点**(曖昧なら聞く。決まっていれば聞かない):尺、用途(SNS/LP/社内)、トーン。
3. 実装は小さく始める。最初の1本は **10〜15秒**。当たりが出てから伸ばす。

## 1. 導入(初回のみ)

要件: Node.js 22+、FFmpeg。

```bash
# Claude Code プラグインとして(推奨。以降 /hyperframes:hyperframes で呼べる)
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes

# またはスキル単体
npx skills add heygen-com/hyperframes        # 対話ピッカー: Core Skills を選ぶ
npx hyperframes skills update                # 最新mainからコア一式を入れ直す(エージェント向け)
```

手動でやるなら: `npx hyperframes init my-video` → `preview` → `render`。

## 2. ワークフロー(ワークフロー別スキルの使い分け)

| やりたいこと | 使うスキル |
|---|---|
| Webサイト/プロダクトの宣伝・LP紹介(〜3分) | `/product-launch-video` |
| 製品なしで概念・トピックの解説 | `/faceless-explainer` |
| GitHub PR の変更点解説 | `/pr-to-video` |
| 既存の話者動画に字幕 | `/embedded-captions` |
| 既存のインタビュー/ポッドキャストにグラフィック重ね | `/talking-head-recut` |
| 10秒未満のキネティックタイポ・ロゴ・数値演出 | `/motion-graphics` |
| 楽曲に合わせたビート同期動画 | `/music-to-video` |
| スライド/ピッチ資料 | `/slideshow` |
| 上記以外・長尺・ブランドリール | `/general-video` |
| Remotion からの移植 | `/remotion-to-hyperframes` |

ドメイン系(必要なときだけ): `hyperframes-core`(構成の契約)、`hyperframes-animation`(動き)、`hyperframes-creative`(配色・フォント・ナレーション・`frame.md`)、`media-use`(BGM/SFX/画像/声の調達・生成)、`hyperframes-audio`(ミックス)、`hyperframes-cli`、`hyperframes-registry`(既製ブロックの検索・導入)。

## 3. 品質を決める要因(効果の大きい順)

1. **プロジェクトフォルダを参照させる**。最大の差はここ。事例では以下を渡して品質が跳ねた。
   - 実アプリ画面(iOSシミュレータをClaudeが操作して録画させた)
   - 実データ(クエリはClaudeが書き、人間が実行して結果を渡す)
   - ブランド資料・ロゴ・フォント・ポジショニング文書(`read {{POSITIONING_DOCS}} first`)
   - → プロンプトに「プロジェクト全体のコンテキストを使って」と一言入れるだけでも違う。
2. **制約を明文化する**(下記 §4)。「何をしないか」を書くとAI臭さが消える。
3. **effort は用途で選ぶ**。短尺・型が決まっているなら medium で足りる。ゼロから作り込むなら max/extra-high。
4. **デザインは先に固定**。スタイルバイブル(配色・フォント・コンポーネント)を最初に作り、全カットが同じ番組に見えるようにする。`frame.md` / `design.md` を使う。
5. **音を足す**。ナレーション、BGM、効果音のヒットで体感品質が上がる(§5)。

## 4. プロンプトに必ず入れる骨格

```
[尺・形式]  Create a {N}s motion-graphics film explaining {PRODUCT}.
[技術]      HyperFrames + GSAP, no voiceover / no footage(必要に応じて)
[スタイル]  キャンバス色、タイポの方向性、動きの語彙、切替テンポ(例: 1.5〜2秒に1アイデア)
[コピー]    先に {資料} を読む。誠実な文面のみ。
[禁止]      画面クローム(スクラバー/タイムコード/fps)、制作用語の画面表示、
            捏造した数値・顧客名・成果、禁止語リスト、囲み付きロゴ画像
[音]        どの瞬間にどの音か。ラウドネス目標(-14 LUFS 等)
[検証]      lint/check/snapshot を通してから報告
```

- **事実を作らせない**: 数字・引用・固有名詞は原文どおりか、出典のあるものだけ。
- **ロゴは実ファイル**を指定。文字は指定フォントで。
- 動きは「1遷移につき主役の動き1つ」。汎用の push/slide/rotate を避けると既視感が減る。

## 5. 音まわり

- BGM: Gemini Lyria / Suno / CC0素材 / コード生成。**出典を記録する**(CC0か生成物のみ)。
- 効果音: 着地・ハンコ・ロゴのヒットに合わせる。Claudeは音を聴けないので、**波形を数値解析してビートに合わせる**(事例あり)。`hyperframes beats` が使える。
- ナレーション: ElevenLabs、Gemini TTS、OpenAI TTS、ローカルTTS(無料だが品質は一段落ちるとの声)。Fal AI経由で音声・音楽・SFXを一括調達する構成もある。
- 仕上げ: ラウドネスはAAC再エンコード**後**に再計測(目安 -14 LUFS / -2 dBTP)。

## 6. 長尺・大量生産: 分業パターン

ポッドキャスト全編に35〜50個のアニメを入れる事例の型:

1. **企画役**(高effort): タイムスタンプごとに「どこにアニメを入れるか+コンセプト」を洗い出す。
2. **制作役**(medium): 1アニメずつ作る。共通のスタイルバイブル+コンポーネントキットを先に作らせる。
3. **審査役**(高effort): 1回だけ採点(ブランド整合、視覚的面白さ、話の流れへの関連、創造的判断)。
4. **修正は「明らかにダメ」だけ**差し戻す。全件やり直しのループはしない。
5. 最後に全体を結合し、個別アニメのフォルダも納品。

運用ルール例: 全画面化時は話者を右下PiP、カメラの寄り/ズームはしない、各グラフィックは音声が途切れない区間に収め、グラフィック間に数秒の顔出しを残す。

## 7. HyperFrames で最初に踏む地雷(lint が後から指摘する)

- 同じプロパティに CSS の初期 `transform` と GSAP を併用しない → `gsap.fromTo()` か `xPercent/yPercent`。
- `window.__timelines["id"]` は root の `data-composition-id` と一致させる。タイムラインは `paused: true` を**ちょうど1本**。
- `repeat: -1`、実時間クロック、`Math.random`(seed無し)、ネットワーク取得は禁止(決定的レンダリングのため)。
- `<audio>` には必ず `id`(無いと**無音**になる)。`<video>/<audio>` に `crossorigin` を付けない。
- `.clip` 要素に `autoAlpha` / `visibility` / `display` をtweenしない(子要素を動かす)。
- フォントは `@font-face` でローカルファイルを指す。
- 全 from 状態を t=0 で設定する(シークしても壊れない)。
- 根の `#root` に `1920px` 等を直書きしない(`data-width/height` が正)。
- Linux では `render` 後のサマリを確認。`screenshot` + `software gpu` は遅い経路。

## 8. 検証ループ(レンダ前)

```bash
npx hyperframes lint
npx hyperframes check                      # lint/runtime/layout/motion/contrast が 0 件
npx hyperframes snapshot --at <時刻,...>    # 要所のフレームを目視
npx hyperframes preview --background        # ユーザーが確認・編集
npx hyperframes render                      # ユーザー承認後に書き出し
```

lint が1件でもエラーだと layout/contrast 監査が走らず「0 samples」になる。**0件=クリーン**と誤読しない。

## 9. コスト・時間の目安(事例からの自己申告値。参考程度)

- 15秒の短尺: 約5分。Maxプランの5時間枠の約5%。
- 約1分のサービス紹介: 20分、5時間枠の約20%。
- 約1分の作り込み(Max effort、DesignLoop+ElevenLabs): 8時間15分。
- 見積もりが数千ドルの制作物を medium effort の一発プロンプトで代替できた、という報告あり。

## 10. 出力が出たあとにやること

- 必ずユーザーに**プレビューを見せる**。承認前にフルレンダしない(時間とトークンの節約)。
- 気になる点が「文字デザインが単調」なら、`/hyperframes-creative` の `frame.md`、または既製デザイン(hyperframes.dev/design)を土台にする。
- 再利用したい型は、プロジェクトの `frame.md` とプロンプトとして保存する。
