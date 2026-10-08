# BRIEFS — 場面ごとの実装指示(各10行以内)

共通: `K=/home/user/codeX/claude-video-skill`、`B=/tmp/claude-0/-home-user-codeX/d5574950-8955-5b0b-bf13-7c6be25a8755/scratchpad/skilltest/B`。道具は `$K` から実行。全員 `$B/docs/BIBLE.md` を全部読む(81行)。SKILL.md・handbook・辞書は丸ごと読まない。技法は `python3 tools/cin.py <slug>` で1項目ずつ。参照画像 `$B/../ref/ref_sheet.png` を見比べる(真似るのは水準、絵柄・登場物は真似ない)。出力は**無音 mp4・フレーム数厳守**。検証は BIBLE §9。報告12行以内(フレーム数・先頭/末尾フレームの座標と色・未達点)。保存先以外に書かない・commit しない。

## s1 — 90f(3.0s)/ Canvas 2D / effort medium(`video-opus`)
- 雛形: `bash tools/new_scene.sh $B/work/s1 3 '#03161A' --depth` → `draw(t)` だけ。書き出し `$B/out/s1_raw.mp4` → `bash tools/look_pass.sh $B/out/s1_raw.mp4 $B/out/s1.mp4 cinematic`。
- 読む: `$B/docs/SCENES.md` 16–41行(s1 カード)、`$K/references/depth-and-texture.md` §3。
- slug: `lenses/macro` `effects/bokeh` `atmosphere/wet-down` `camera-movement/whip-pan`。
- つなぎ: 0f は暗いティール(平均輝度 8% 以下)。89f は左向きの横の筋で、LED の白い筋 **y=600・x 300–1700・太さ 10px・#E8F4FF**(s2 がこれを受ける)。82f の踏み込みは明るさの山(同期の検出に使う)。
- 合図: 30f 着水 / 45f ピント送り / 60f 奥の光 / 82f 踏む / 84f ウィップ開始。

## s2 — 120f(4.0s)/ Canvas 2D / effort medium(`video-opus`)
- 雛形: `bash tools/new_scene.sh $B/work/s2 4 '#14030A' --depth` → `draw(t)`。書き出し `$B/out/s2_raw.mp4` → `look_pass.sh ... $B/out/s2.mp4 cinematic`。
- 読む: SCENES.md 43–67行(s2 カード)、BIBLE §2(ロボットの寸法・色)、`depth-and-texture.md` §3。
- slug: `camera-movement/tracking` `camera-movement/parallax` `time-and-motion/motion-blur` `lighting/neon-practical`(看板の光の当て方だけ。文字は出さない)。
- つなぎ: 局所 0–5f は左向きの流れ(bx 90→0)で y=600 の白い筋を受け、5f で前面ライト (905,600) に収束。最終 119f はロボット中心 **(1320,420)・−12°・右上へ上昇**(s3 が受ける)。
- 合図(局所 f): 0 カット / 15・30・45・60・75・90 看板通過 / 100 沈み込み / 105 跳躍。

## ★s3 見せ場 — 135f(4.5s)/ three.js 3D / **effort high**(`general-purpose` + `model: opus`)
- 雛形: `bash tools/new_scene_three.sh $B/work/s3 4.5 '#03061A' --post fast` → `build()` と `update(t)`。書き出し `$B/out/s3_raw.mp4` → `ffmpeg -i s3_raw.mp4 -vf noise=c0s=2:allf=t -c:v libx264 -crf 16 -pix_fmt yuv420p $B/out/s3.mp4`(look_pass はかけない)。
- 読む: SCENES.md 69–93行(s3 カード)、BIBLE §2・§7、`$K/references/three-3d.md` 全部(107行)。
- slug: `camera-movement/orbit-360` `time-and-motion/speed-ramp` `effects/particles` `effects/light-flash`。
- つなぎ: 局所 0f はロボット中心 **(1240,470)・前上がり15°・上昇中**(s2 の跳躍の続き)。局所 133–134f は**全画面 #FFFFFF**、中心 (960,500) に放射の筋の名残(s4 が受ける)。
- 要点: カメラは等速、ロボット・水滴・火花だけ時間率 r(静止 局所 52–75f)。宙の水滴は InstancedMesh、seed 付き。床の映り込みは BIBLE §7 の反転複製。
- 見せ場なので: 先に `--fps 10` で通しを確認 → 局所 0・60・105・130f の snapshot を参照画像と見比べて1回手直し → 本番。

## ★s4 タイトル(見せ場)— 105f(3.5s)/ three.js 3D / **effort high**(`general-purpose` + `model: opus`)
- 雛形: `bash tools/new_scene_three.sh $B/work/s4 3.5 '#120803' --post fast` → `build()` と `update(t)`。書き出し `$B/out/s4_raw.mp4` → `ffmpeg -i s4_raw.mp4 -vf noise=c0s=2:allf=t -c:v libx264 -crf 16 -pix_fmt yuv420p $B/out/s4.mp4`(look_pass はかけない)。
- 読む: SCENES.md 95–118行(s4 カード)、BIBLE §2・§6・§7、`three-3d.md` 全部。
- slug: `lighting/neon-practical` `effects/typography` `atmosphere/wet-down`。
- 文字は `NEON ALLEY` の一筆書きの管(TubeGeometry、太さ 10px 相当)。フォントは使わない。字形が別の字に見えないか snapshot で確認。
- つなぎ: 局所 0f は白〜クリーム(平均輝度 85% 以上)、11f までに琥珀へ戻る。局所 75–104f は完全な静止(最終30fの全フレームが同一であることを md5 で確認)。
- 見せ場なので: 局所 0・15・45・60・104f の snapshot を参照画像と見比べて1回手直し → 本番。

## 音 — 15.000s / 44.1kHz / effort medium(`video-opus`)
- 読む: `$B/docs/SOUND_BIBLE.md` 全部、SCENES.md 120–146行(合図表)、`$K/references/sfx-catalog.md`。
- 作る: `$B/audio/make_audio.py`(seed 固定)→ `$B/audio/neon_alley.wav`(661,500 サンプル)と `$B/audio/cues.json`。
- 検証: SOUND_BIBLE §5 の 1・3・4(数値)。報告12行以内。

## 結合(進行役)
- `cd $B && bash $K/tools/assemble.sh out "s1 s2 s3 s4" audio/neon_alley.wav out/neon_alley.mp4`(**場面フォルダは相対パスで渡す**: 中で `$PWD/<dir>` と連結するので絶対パスだと壊れる)→ 450f・-14 LUFS を確認 → `sync_check.py` → `review_checks.py` → `sheet.sh`。
