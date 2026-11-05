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
