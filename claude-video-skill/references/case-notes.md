# 事例メモ

出典: Skillry「Opus 5.5 videos」(https://skillry.dev/ai-videos/opus-5-5)。投稿者の自己申告で、再検証はしていない。
動画は全てClaude Code等 + HyperFrames(HTMLをコマ描画してMP4化)。動画生成モデルは使っていない例が多い。

## 事例から抽出した共通パターン

| 観点 | 内容 |
|---|---|
| 導入 | HyperFramesスキルを入れる→`/hyperframes`で依頼。Cursorでも同じ手順で動く |
| 効く入力 | プロジェクトフォルダ参照(実アプリ画面・実データ・ブランド素材)。ここで質が分かれる |
| 弱点の声 | 「文字デザインが平板」(→ designスキル/`frame.md`で補う)、「方向性を足せばもっと良くなる」 |
| 良い評価 | 決定的で細部まで制御できる、数値化した波形で音ハメ、ゼロショットで成立 |

## 個別事例

- **@ik_builds**(15秒、Opus 5.5 medium): 紙キャンバス+マーカー+キネティックタイポ。1発プロンプトが共有されている → `prompt-templates.md` B。
- **@stokebuilder**(ポッドキャスト): 35〜50個のフルスクリーンアニメ。企画/制作/審査の分業 → C。
- **@jesscaroline7**(ショーリール): 実アプリのiOSシミュレータ画面、DBから取った実データ、3Dジオラマ(画像生成→Higgsfieldで動かす)、BGMはSuno、SFXはSoundly。Opus 5.5 effort max / Max 5x。
- **@thayto_dev / @danilowm**: 最小プロンプトの再現。Max effortで5時間枠の約5%。Cursorでも可。
- **@jayjohnsonai**: 約5分、effort最高(ultracode)。
- **@Javi_llofriu**(約1分): AI代理店のサービス紹介を20分で作成。Max枠の5時間分の約20%。
- **@vince-builds**(Opus 5.5 Max、8時間15分): DesignLoop+hyperframeスキル+ElevenLabsを渡した作り込み型。
- **@itsahmedharoon**: ゼロショットのイントロ。オープンソースTTSを自分でダウンロードして実行、タービン音などSFXも自力で配置。
- **@Majin_AppSheet**(10秒): 「スキルを入れて『おまかせ』と返事しただけ」。BGMはGemini Lyria、効果音は拍を解析して着地/ハンコに同期。Claudeは音を聴けないのに波形の数値で合わせる。
- **@henritoivar**: ゼロショット。音(SFX/BGM)もコード生成、映像はCSS/HTML/JSのみで画像・動画アセット無し。ナレーションだけOpenAI TTS。「決定的で細部制御できる説明動画向き」。
- **@mappletour**: ゲームPV。ランキング上位のリプレイを実際に撮影し、拍に合わせて「ギリギリ!」を重ねる。日英2本を一晩で。
- **@georgejimenez98**: ElevenLabs(Music/SFX/Voices)をFal AI経由、HyperFramesはローカル。
- **@jake11moran**: `/session-story`(コミュニティスキル)。ローカルのClaude Code履歴を読み、自分のセッションを動画化する。
  https://github.com/heygen-com/hyperframes-community-skills/tree/master/skills/session-story
- **@washow_cfo**(日本語): 「AI臭さがあるので、どこかで見たスタイリッシュなスタイルに寄せた」CM風。Claude Code + Gemini TTS + HyperFrames。
- **@mattworkman**: staging/edit に HyperFrames、素材に ThreeJS + fal の画像・動画モデル。「文字デザインが平板なのでfal用デザインスキルが欲しい」という所感。
- **@_petert**(日本語): Gemini Flash + Three.js 併用で架空の広告・家計簿・VR紹介。Three.js は3D表現の定番ペア。

## 使われている周辺技術

GSAP / Three.js / Canvas / SVG / CSS / GLSL(シェーダー) / ElevenLabs / Gemini TTS・Lyria / OpenAI TTS / Fal AI / Suno / Soundly / Higgsfield / DesignLoop / Tesseract(結合) / Seedance(動画生成)。

## HyperFrames 側の事実(公式README・スキルから確認済み)

- Apache 2.0、Node 22+、FFmpeg必須。headless Chromeでフレームをシークして撮影→FFmpegでエンコード。
- ローカル、Docker、AWS Lambda で書き出し可能。`npx hyperframes cloud render` でHeyGen側レンダも。
- カタログ: `npx hyperframes add data-chart` / `flash-through-white` / `instagram-follow` など既製ブロック。
- `frame.md`: デザインシステム(design.md)を「画面用」に変換する仕様。https://www.hyperframes.dev/design にテンプレあり。
- 公式スキルは計21本(ルーター `/hyperframes`、制作ワークフロー群、ドメイン群)。入口は必ず `/hyperframes`。
- Remotion比較: 公式はReact(Remotion)ではなくプレーンHTMLに賭ける立場。長尺クラウドレンダの成熟度はRemotion Lambdaが上と明記。

## リンク

- 事例ギャラリー: https://skillry.dev/ai-videos/opus-5-5
- HyperFrames: https://github.com/heygen-com/hyperframes / https://hyperframes.heygen.com/introduction
- クイックスタート: https://hyperframes.heygen.com/quickstart
- カタログ: https://hyperframes.heygen.com/catalog/blocks/data-chart
- コミュニティスキル: https://github.com/heygen-com/hyperframes-community-skills
