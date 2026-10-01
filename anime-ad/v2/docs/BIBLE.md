# BIBLE — 30秒アニメCM『レベル1なのに世界最強』(架空・オリジナル)

全員が守る共通ルール。各場面は別のエージェントが並列で作り、最後に ffmpeg で**ハードカット連結**する。
だから「場面ごとに別の世界・別の技法」にしてよいが、**下の共通項**と**進行表(SCENES.md)の合図(cue)**は絶対に守る。

## 作品
- 架空のTVアニメ。作品名『レベル1なのに世界最強』。既存作品・実在の放送局・実在人物は一切出さない。
- 主人公「アキラ」: レベル1。尖った髪、赤い鉢巻と赤いマフラー、黒いコート。見た目は `shared/hero.svg`。
- 魔王「ゾルギア」: レベル999。角、赤い瞳、胸の核。見た目は `shared/demon.svg`。
- 笑いの核: 「最強なのに本人はまったく本気じゃない」。敵がかわいそうなくらい一撃で終わる。

## 画面の共通仕様
- 1920x1080 / 30fps。音声なし(音は別担当が全場面を通して作る)。
- 色(場面ごとに主役の色を変えてよいが、この6色から外れすぎない):
  ink #0a0a12 / paper #fffdf5 / gold #ffc400 / orange #ff7a18 / red #ff2a4d / cyan #19d3ff
- 禁止: 画面にスクラバー・タイムコード・fps等の制作用UI。「ease」「stagger」等の制作用語の表示。
  捏造した数値・実績・口コミ・実在固有名詞。台詞・文言は SCENES.md の「コピー」から一字も変えない。
- 文字は SCENES.md が指定したフォントを使う。日本語が豆腐(□)になっていないか必ずスナップショットで確認。
- **使い回し禁止ルール(最重要)**: この映画は「似たカットの連続」と批判された。
  * 「文字が大きく縮みながら叩きつけられる(scale 2〜3 → 1 + stagger)」は **s6-title だけ**が使ってよい。他は使わない。
  * 「放射状の集中線」は **s3-punch と s5b だけ**。他は使わない。
  * 「回転する太陽光線(sunburst)」は **s2-faceoff だけ**。
  * 「ハーフトーンの網点」は **s5b / s6 / s8** だけ。
  * 各場面は SCENES.md に書いた**固有の技法**を主役にする。他の場面と同じ見た目になりそうなら変える。
- 画面揺れ(shake)は場面内で最大2回まで。レジストリの `camera-shake` コンポーネントがあればそれを使う。

## 技術ルール(HyperFrames)
- 作業は自分専用ディレクトリ: `/tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/v2/work/<id>/`
  ```bash
  mkdir -p .../v2/work && cd .../v2/work
  npx hyperframes init <id> --non-interactive --example=blank --skill=general-video
  cp .../v2/shared/gsap.min.js <id>/assets/gsap.min.js   # CDNはこの環境で証明書エラーになる。必ずローカル参照: <script src="assets/gsap.min.js">
  cp .../v2/shared/hero.svg .../v2/shared/demon.svg <id>/assets/   # 使うなら
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
  3. `npx hyperframes render -o /tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/v2/out/<id>.mp4 --quiet`
     (数分かかる。Bashは run_in_background:true で実行し、完了通知を待つ。親シェルが先に終わると中断される。)
  4. `ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -of default=nw=1 <mp4>`
     で **フレーム数 = 秒数×30 ちょうど**、1920x1080、30fps を確認。
  5. 書き出したmp4から合図のフレームを2〜3枚 `ffmpeg -ss` で抜いて目視確認。
- 報告に含める: 使った技法、使ったレジストリ部品、実際の合図の時刻(秒)と実フレーム数、気になる点。
- 不要な物は作らない(README等不要)。作業ディレクトリ外のファイルは触らない。リポジトリ(/home/user/codeX)には触らない。
