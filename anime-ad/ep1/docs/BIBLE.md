# BIBLE(第1話) — 『レベル1なのに世界最強』 第1話「レベル1の冒険者」(架空・オリジナル / 約83秒)

先に作った30秒CMの本編(第1話ショート版)。**9場面を別々のエージェントが並列で作り、最後に ffmpeg でハードカット連結する**。
共通設計は `/tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/ep1/`(以下 ep1/)。場面別の内容は `ep1/SCENES.md`。

## 作品・キャラ(見た目は `ep1/shared/*.svg`。class名の付いた部位をGSAPで動かせる。自分の場面用に描き足してよいが、キャラ性は保つ)
- アキラ(主人公・`hero.svg`): 黒シルエット+金リム、尖った髪、赤い鉢巻とマフラー。のんき・礼儀正しい。表示上は「Lv.1」(実は…は最終場面で明かす)。
- ミナ(ギルド受付嬢・`mina.svg`): 水色のベスト、ポニーテール。無表情で淡々。仕事は正確。
- レオン(勇者・`leon.svg`): 白銀の鎧、金髪、剣。自信家で声が大きい。
- ゾルギア(魔王・`demon.svg`): 巨大な角、赤い瞳、胸の核。威圧的だが小物感もある。
- スライム(`slime.svg`)、狼(`wolf.svg`): 草原のモンスター。
- 魔王軍=赤い点の大群(CMの冒頭で見せた)。第1話では「赤い光の粒」としても登場してよい。
- 笑いの核: **アキラは何も悪気なく、うっかりで全部を一撃で終わらせる**。本人はまったく気づかない。

## 画面の共通仕様
- 1920x1080 / 30fps。**音声なし**(音楽・効果音は別担当が全場面を通して作る)。台詞は**字幕**で出す(声優の声は無い)。
- 場面間は**ハードカット**。各場面の「入り/出」は SCENES.md に指定。時刻は**その場面の先頭からの秒(local)**。合図(cue)は ±1フレームで守る(音がこの時刻に合わせて作られる)。
- BPM120: 1拍=0.5秒=15フレーム。場面の長さは0.5秒の倍数。
- 色: ink #0a0a12 / paper #fffdf5 / gold #ffc400 / orange #ff7a18 / red #ff2a4d / cyan #19d3ff を基調にしつつ、**場面ごとの世界の色**を持ってよい。
- **字幕の共通仕様**(台詞のある場面は必ずこれ。一貫して同じ見た目にする):
  画面下 y=930〜1010、中央揃え、Noto Sans JP 700 / 48px / 色 #fffdf5 / 縁取り=黒(#0a0a12) 6px相当(text-shadowのリング)。
  最大幅1500px。出る時は0.1秒のフェードイン、消える時は0.1秒のフェードアウト。話者名は付けない。台詞は SCENES.md の文言を**一字も変えない**。
  ※字幕の下に暗い帯(黒の半透明)は敷かない(絵を邪魔しない)。
- 禁止: 画面にスクラバー・タイムコード・fps等の制作用UI。制作用語の画面表示。実在の作品名・人名・放送局。
- **似たカットを作らない**: 前作CMは「似たカットの使い回し」と批判された。各場面は SCENES.md の**固有の世界・固有の技法**を主役にする。
  「文字を大きく縮ませながら叩きつける」は多用しない(使うなら1場面1回まで)。集中線・放射光は第1話では**使わない**(CMで使い切った)。
- **日本語フォント**: `Noto Sans JP` 以外のGoogle Fontsは check が `font_family_without_font_face` を出す。TTFを取得して必要な字だけサブセット化し、`@font-face` で `assets/fonts/` を指す。
  文字が数フレーム遅れて出ないよう、フォントの先読み用の隠し要素を置く。豆腐(□)が出ていないかスナップショットで必ず確認。
- GSAPはCDN不可: `<script src="assets/gsap.min.js">`(`ep1/shared/gsap.min.js` をコピー)。

## 技術ルール(HyperFrames)
- 作業は自分専用ディレクトリ: `/tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/ep1/work/<id>/`
  ```bash
  mkdir -p .../ep1/work && cd .../ep1/work
  npx hyperframes init <id> --non-interactive --example=blank --skill=general-video
  cp .../ep1/shared/gsap.min.js <id>/assets/gsap.min.js   # CDNはこの環境で証明書エラーになる。必ずローカル参照: <script src="assets/gsap.min.js">
  cp .../ep1/shared/hero.svg .../ep1/shared/demon.svg <id>/assets/   # 使うなら
  ```
- **必読**: `/root/.claude/skills/hyperframes-core/SKILL.md`(構成の契約・決定性・lintの地雷)。
  動きは `/root/.claude/skills/hyperframes-animation/`(rules-index.md, techniques.md, adapters/)を見て選ぶ。
  手作りの前に**レジストリを検索**: `npx hyperframes catalog --query "<語>"` → `npx hyperframes add <name>`。
  使えそうな既製品: camera-shake, char-slam-explode, shutter-slam, beat-accent, beat-freeze-cut, logo-sting,
  halftone-field, halftone-dissolve, vfx-shatter, camera-dolly-zoom, focus-rack, light-sweep-pass,
  editorial-flash-overlay, ink-bleed-reveal, particle-text-dissolve, confetti, rgb-glitch-text, glitch, flash-through-white。
  (追加したものは自分の場面の見た目に必ず合わせて調整すること。デフォルトのまま貼らない。)
- ルート構成: 単独コンポジション。root は `data-composition-id="main" data-start="0" data-duration="<秒>" data-width="1920" data-height="1080"`。
  `window.__timelines["main"]` に paused の GSAP timeline を**1本だけ**登録。
- 決定性: `Math.random` 禁止(seed付きPRNGを使う)、`Date.now`禁止、`repeat:-1`禁止、ネットワーク取得禁止。
  canvas描画は「t の関数として毎フレーム全再描画」する(状態を積み上げない)。
- フォント: `Noto Sans JP`(400/700)は同梱。それ以外のGoogle Fontsはビルド時に自動取得されるので font-family に書くだけで使える
  (候補: Dela Gothic One / DotGothic16 / Yuji Boku / Yuji Syuku / Shippori Mincho B1 / Zen Antique / Rampart One /
  Reggae One / RocknRoll One / Hachi Maru Pop / Zen Maru Gothic / Potta One / Space Mono)。**必ずスナップショットで字形を確認**。
- 検証(必須、この順):
  1. `npx hyperframes check` → error 0 件(info/警告のうち nested_structure 系は無視可。他は直す)
  2. `npx hyperframes snapshot --at <合図の時刻を含む8〜12点>` → 画像を**自分で見て**直す。
     (レイアウト崩れ・文字のはみ出し・豆腐・重なり・空っぽの画面がないか。)
  3. `npx hyperframes render -o /tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/ep1/out/<id>.mp4 --quiet`
     (数分かかる。Bashは run_in_background:true で実行し、完了通知を待つ。親シェルが先に終わると中断される。)
  4. `ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -of default=nw=1 <mp4>`
     で **フレーム数 = 秒数×30 ちょうど**、1920x1080、30fps を確認。
  5. 書き出したmp4から合図のフレームを2〜3枚 `ffmpeg -ss` で抜いて目視確認。
- 報告に含める: 使った技法、使ったレジストリ部品、実際の合図の時刻(秒)と実フレーム数、気になる点。
- 不要な物は作らない(README等不要)。作業ディレクトリ外のファイルは触らない。リポジトリ(/home/user/codeX)には触らない。
