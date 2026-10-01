# BIBLE(技法ショーケース 15秒「雨の夜、傘の赤」) — 辞書(映画の技法424件)の見本

目的: `video-with-claude-code` の技法辞書を使うと何が作れるかを、15秒で見せる。4場面を別々のエージェントが作り、ffmpegでハードカット連結する。
**各場面は、割り当てた技法のエントリ(辞書)を読み、その「HyperFramesでの作り方」の数値・方式を出発点に実装する。**
辞書: `/home/user/codeX/claude-video-skill/references/cinematic/`(INDEX.md、START_HERE.md、各グループのmd)。エントリの探し方: `grep -n '`<cat>/<slug>`' /home/user/codeX/claude-video-skill/references/cinematic/*.md`。

## 共通
- 1920x1080 / 30fps / 音声なし(音は別担当)。BPM120=1拍15フレーム。台詞・字幕なし。画面に文字は原則出さない(S4の最後だけ指定あり)。
- 世界: 現代の夜の繁華街。雨。**主役は赤い傘をさした人物のシルエット**(黒い人影+赤い傘 #ff2a4d)。実在の店名・ロゴ・人物は出さない。
- パレット(全場面共通の約束): ink #0a0a12 / 夜の青緑 #0f3a4a・#1f6f86 / ネオンの桃 #ff3d8b・橙 #ff9a3d / 傘の赤 #ff2a4d / 雨上がりの金 #ffc46b。
- **光源の約束**: 夜はネオン(看板)と街灯が光源。雨で濡れた路面が反射する。S4で雨が上がり、朝日(ゴールデンアワー)に変わる=**色の変化は「出来事」として1回だけ起こす**。
- 乱数は seed付きPRNG。各場面の最初と最後のフレームは、SCENES.mdの「つなぎ」に従う。
- 使い回し禁止: 各場面は割り当てた技法を主役にし、他の場面と見た目・動き・サイズが被らないようにする。
- 日本語フォントを使う場合は ep1 と同じ扱い(TTF取得→サブセット→@font-face)。GSAPはローカル `assets/gsap.min.js`。

## 技術ルール(HyperFrames)
- 作業は自分専用ディレクトリ: `/tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/show/work/<id>/`
  ```bash
  mkdir -p .../show/work && cd .../show/work
  npx hyperframes init <id> --non-interactive --example=blank --skill=general-video
  cp .../show/shared/gsap.min.js <id>/assets/gsap.min.js   # CDNはこの環境で証明書エラーになる。必ずローカル参照: <script src="assets/gsap.min.js">
  cp .../show/shared/hero.svg .../show/shared/demon.svg <id>/assets/   # 使うなら
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
  3. `npx hyperframes render -o /tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/vid/show/out/<id>.mp4 --quiet`
     (数分かかる。Bashは run_in_background:true で実行し、完了通知を待つ。親シェルが先に終わると中断される。)
  4. `ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -of default=nw=1 <mp4>`
     で **フレーム数 = 秒数×30 ちょうど**、1920x1080、30fps を確認。
  5. 書き出したmp4から合図のフレームを2〜3枚 `ffmpeg -ss` で抜いて目視確認。
- 報告に含める: 使った技法、使ったレジストリ部品、実際の合図の時刻(秒)と実フレーム数、気になる点。
- 不要な物は作らない(README等不要)。作業ディレクトリ外のファイルは触らない。リポジトリ(/home/user/codeX)には触らない。
