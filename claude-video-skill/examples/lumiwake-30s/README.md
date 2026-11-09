# LUMIWAKE 30秒ティザー(2D再試験 第2回)

架空のゲーム『LUMIWAKE』の30秒ティザー。**第2段階の前半(静止画とショット表)まで**。アニメーション・音の合成・書き出しは、ユーザーの承認後(後半)。
- 企画: `BRIEF.md` / ショット表: `SHOTS.md` / 音ハメ台帳: `SYNC_TABLE.md`(`audio/cues.json` と `audio/sync_map.json` から `src/tools/sync_check.py` が作る)/ 自己点検: `REVIEW_STAGE1.md` / 静止画: `frames/`
- 主役は人型でない「灯りの精」(`src/lib/spirit.js`)。人型のミオ(`courier2.js`)は廃止(比較用に残す)。

## 曲(権利の注意)
- Suno『Hopeful Bittersweet』(Suno の無料プランで生成)の 159.84〜189.84 秒の30秒切り出し。**音声ファイルはリポジトリに入れていない**。
- 無料プランは個人・非商用、Suno への表記が条件と報告されている(第三者の解説。公開前に Suno の現在の規約をユーザーが確認する)。

## 再現
```bash
cd claude-video-skill/examples/lumiwake-30s
PATH=/usr/bin:$PATH YUTA_DIR=<YutaONE_Fonts> FONTSOURCE_DIR=<npm pack で展開した物> bash src/tools/setup_fonts.sh   # assets/fonts を作る(git 管理外)
python3 -I src/tools/glyph_paths.py assets/fonts/logo.otf "LUMiWAKE" out.json --track -30   # ロゴの字形パス → src/lib/logo-glyphs.js(git 管理外)
cd src && node tools/render_still.mjs "still.html?sf=1" ../frames/sf1.png        # ?fx=0 効果なし / ?sil=1 シルエット / ?char=mio 人型版
node tools/render_still.mjs "spirit_sheet.html?sheet=designs" ../frames/spirit_sheet.png
python3 -I tools/sync_check.py ../audio/cues.json ../audio/sync_map.json ../SYNC_TABLE.md
```
フォントファイルと `logo-glyphs.js`(フォントの輪郭データ)は、再配布しない約束のためコミットしない。

## 第2段階の後半(初稿 v1 の書き出しまで)
- 実装: `src/film/film.js`(`FILM.renderAt(ctx, f)`、全コマがコマ番号 f の純関数。背景は init で1回焼き、毎コマは位置を変えて貼る)。HyperFrames のコンポジションは `src/film/index.template.html` から `bash src/tools/build_hf.sh` で `hf/` に作る(生成物・git 管理外)。`npx hyperframes check` は lint/runtime/layout 0件(警告は「音なし」のみ。音は書き出し後に付ける)。
- 書き出し: `bash src/tools/render_segments.sh <出力フォルダ>`(5秒ごと6区間、できた区間は飛ばして再開)→ `bash src/tools/assemble_film.sh <区間のフォルダ> <mix.wav> <出力.mp4>`(900コマに結合、音を付ける)。クラウドの実測: 焼き込み約10秒、1コマ約1.2秒、4並列で5秒区間が約130秒、全体約13分。
- 音: `python3 -I src/tools/make_audio.py <曲.mp3> <出力.wav> --report <json>`(曲+効果音3発。後で ffmpeg の loudnorm 2回通し)。曲の調の推定は `src/tools/estimate_key.py`。
- 検査: `tools/review_checks.py`、`src/tools/measure_sync.py`(映像のヒットと曲のアクセント・効果音の実測 → `SYNC_MEASURED.md`)。
- mp4・音声・フォント・`logo-glyphs.js` はコミットしない。成果物の mp4 は scratchpad の `film2d/lumiwake_30s_v1.mp4`。

## 初稿 v2(別の担当・Opus・effort high が、同じ設計から作り直した版。品質比較の試験)
- 前の実装(`src/film/`・v1 の動画)は読まずに、設計(BRIEF・SHOTS・SYNC_TABLE・`audio/cues.json`)、部品(`src/lib/` の paint・world・hud・logo)、静止画の約束(`frames/sf1〜3`・`spirit_sheet.png`)だけを使って新しく組んだ。新しいファイルは全部 `src/film2/`。
- 実装: `src/film2/film2.js`(`FILM2.renderAt(ctx, f)`。作業 canvas は毎コマ reset、全コマがコマ番号 f の純関数)、`shots_a.js`(S1〜S4)、`shots_b.js`(S5〜S8)、`spirit2.js`(主役の作り直し: 葉3枚の翼・1.3R の小包・朱と白金の尾)、`plates.js`(背景を一度だけ焼く)、`hud2.js`(HUD の値と動き)、`core.js`(緩急・ばね・カメラ・気流・はじけ)。
- 動きの多くは Motion Prompt のギャラリーの数値を移植(ショットと番号の対応は各ファイルの先頭。#001 #002 #003 #005 #007 #024 #026 #029 #032 #034 #035 #036 #038 #040 #046 #121 #129 #176 #183 #184 ほか)。
- 開発用の描画: `node src/film2/tools/frames.mjs <出力> 0,22,227`(preview.html でコマを JPEG に)、`--hash 5,227,840` で順・逆・飛ばしの順に描いて画素の hash を比べる(決定性)、`--fx0` 効果を切った版、`--hs 1|2|4` ヒットストップのコマ数を変える。
- HyperFrames: `bash src/film2/tools/build_hf.sh <フォルダ>`(生成物・git 管理外)→ `bash src/film2/tools/render_segments.sh <フォルダ> <区間フォルダ>`(5秒×6区間、できた区間は飛ばして再開)→ `bash src/film2/tools/assemble.sh <区間フォルダ> <final_B.wav> <出力.mp4>`(900コマにつなぎ、音を AAC 256k 48kHz で付ける。音は作り直さない)。
- 検査: `tools/review_checks.py`、`python3 -I src/film2/tools/measure_sync2.py <mp4> audio/cues.json audio/sync_map.json SYNC_MEASURED_V2.md`(映像のヒットのコマと曲のアクセント・効果音の頂点)、`bash src/film2/tools/sheets.sh <mp4> <出力>`(コンタクトシート・540px・カット境界)。
- 成果物の mp4 は scratchpad の `film2d/lumiwake_30s_v2_opus.mp4`(リポジトリには入れない)。自己点検は `REVIEW_STAGE1.md` の「追加5」。
