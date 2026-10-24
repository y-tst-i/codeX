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

## Opus 5.5 Motion Lab(Florence、@flxrnc、2026-10)
指示書と追加指示を全部公開している連作。考え方・数値は `motion-lab.md`、指示書の型は `prompt-templates.md` F。数値は自己申告。
- **液体クローム**(6秒ループ、1:1): 塊が7つの滴に分かれ、それぞれ文字に流れ込んで溶けて戻る。レイマーチの形状+three.js の TextGeometry。映像の追加指示10回+音5回、約2時間45分。
- **実験1 雑な指示 vs 細かい指示**(イヤホン、6秒): 26語の側は紺の宇宙・光の輪・ブルーム・粒子・回転・勝手なコピーが出た。448語の側は追加指示15回+音12回。「形容詞を数値に替えるほど、モデルの定番が消える」。
- **実験2 ボクセルのマスコット**(8秒、480コマ): アニメの5原則を数値で指定し、起きるコマで原則名のラベルが点灯する。全コマを数値で照合する71項目の検査(初回6項目不合格)。追加指示4回、音0回。
- **CTRL+Z**(19秒、16:9、1140コマ): 金曜17:59に Enter を踏んで本番を落とし、Ctrl+Z で巻き戻すキャラ映像。爆発を逆算して最後のコマを0コマ目に一致させ、巻き戻しは時刻の付け替え。主役は Blender で作った GLB。書き出しは2倍・1コマ16サンプル・FFV1。音は numpy で全部合成(226の合図)。追加指示 映像8回+音5回。
- 記事中で紹介された他の例(数値は記事の記述): kirill sh の26語のショーリール(180万回)、Donald の音楽動画(5分話して12時間の自律作業、360万回)、Kevin Ngo の28秒の物語(64万回)、Chubby の3分の AI 史(Remotion、約7,400行)、Leon Lin の架空カレンダーアプリの紹介(1プロンプト・約8時間、音も全部コード)。

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
