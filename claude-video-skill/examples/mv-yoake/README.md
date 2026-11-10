# MV『夜明けの回路』(2D モーショングラフィックス、53.0秒)

**第2段階(アニメーション実装・書き出し・検査)の初稿まで**。第1段階(美術方向・歌詞時刻・スタイルフレーム)は利用者が承認済み。
- 第2段階: 描画のソース `src/film/`、自己点検と実測 `REVIEW_STAGE2.md`、音ハメの実測 `SYNC_MEASURED.md`、歌詞の表示の検査 `LYRIC_DISPLAY_CHECK.md`、意図した間 `holds.json`
- 企画と美術方向: `BRIEF.md` / 歌詞の時刻表: `LYRIC_TIMELINE.md`(元データ `audio/lyric_timeline.json`)/ ショット表: `SHOTS.md`(台帳 `audio/cues.json`、検査結果 `SYNC_TABLE.md`)/ 自己点検: `REVIEW_STAGE1.md` / 静止画: `frames/`
- 曲の同期の地図: `audio/sync_map.json`(アクセント130個・音量・文字起こし。第三者の測定をそのまま写した物)

## 曲(権利の注意)
- Suno『夜明けの回路』曲A の 122.0〜175.0秒の切り出し(利用者が Suno の無料プランで作成、歌詞は利用者のオリジナル)。**音声ファイルはリポジトリに入れていない**。無料プランは個人・非商用、Suno への表記が条件と報告されている(第三者の解説。公開前に現在の規約を確認する)。

## 再現
```bash
cd claude-video-skill/examples/mv-yoake
# 1) 書体(OFL)を取ってサブセット化(assets/fonts は git 管理外)
mkdir -p /tmp/fs && (cd /tmp/fs && for p in zen-old-mincho dela-gothic-one zen-kaku-gothic-new; do npm pack @fontsource/$p; done && for f in *.tgz; do mkdir -p ${f%.tgz} && tar xzf $f -C ${f%.tgz}; done)
FONTSOURCE_DIR=/tmp/fs bash src/tools/setup_fonts.sh
# 2) 字形の点列(src/lib/glyphs.js、git 管理外)
python3 -I src/tools/glyph_lines.py src/lib/glyphs.js MIN=/tmp/fs/fontsource-zen-old-mincho-5.3.1/package:900 DELA=/tmp/fs/fontsource-dela-gothic-one-5.3.0/package:400 -- src/jp_text.txt
# 3) スタイルフレーム(?sf=1..4、&fx=0 で効果なし、&f=コマ番号)
cd src && node tools/render_still.mjs "still.html?sf=1" ../out/sf1.png "still.html?sf=1&fx=0" ../out/sf1_fx0.png && cd ..
python3 -I src/tools/sheets.py out frames 1 2 3 4          # 効果あり/なしの比較、540px の一覧
# 4) 歌詞の時刻の裏取り(曲の mp3 が要る。faster-whisper の入った Python)
python3 -I src/tools/vocal_isolate.py <曲.mp3> voc16.wav 16000
<whisper の python> src/tools/whisper_check.py wc.json lyrics.txt orig=<曲16k.wav> voc=voc16.wav orig22=<曲16k.wav>@22.0 ...
python3 -I src/tools/pitch_map.py <曲.mp3> audio/sync_map.json wc.json <出力> "22-29,40-47"
python3 -I src/tools/lyric_table.py audio/lyric_timeline.json LYRIC_TIMELINE.md
python3 -I src/tools/lyric_check_video.py audio/lyric_timeline.json audio/sync_map.json <曲.mp3> /tmp/fs/fontsource-zen-kaku-gothic-new-5.3.1/package 700 lyric_timing_check.mp4 960
# 5) ショット表の台帳検査
python3 -I src/tools/cue_check.py audio/cues.json audio/sync_map.json audio/lyric_timeline.json SYNC_TABLE.md
```
- Python は numpy・scipy・Pillow・fontTools(brotli)が要る。Chromium は playwright(`/opt/pw-browsers`)を使う。
- フォントファイル・`glyphs.js`(フォント由来の輪郭)・音声・動画はコミットしない(`.gitignore`)。

## 第2段階: 動画を作る(初稿 yoake_v1)
描画は HyperFrames のコンポジション(canvas 1 枚。止めたタイムラインの時刻 → コマ番号 f → `FILM.renderAt(ctx, f)`。全コマが f の純関数)。
- `src/film/core.js`(時刻の読み取り・緩急・カメラ)、`city.js`(回路の街: 生成と描画)、`type.js`(字の描き方)、`film.js`(組み立てと仕上げ)、`shots_night.js`(S1〜S5)、`shots_chorus.js`(S6〜S9)、`shots_dawn.js`(S10)
- **歌詞の時刻はコードに書かない**: `audio/lyric_timeline.json` を `tools/gen_data.py` が `data.gen.js`(git 管理外)に写し、描画は `Y.word("闇")`・`Y.phrase("輝きは増す")`・`Y.charStarts(句)` で読む。ショットの境目も歌詞の句の頭から計算する(`film.js` の `B`)。曲のアクセントは `audio/cues.json` から(`Y.acc(769)` は台帳に無い番号だとエラー)。

```bash
cd claude-video-skill/examples/mv-yoake
# 0) 書体と字形の点列(上の「再現」1〜2)
# 1) HyperFrames のプロジェクトを作る(歌詞の時刻・台帳を埋め込み直す)。曲は任意(プレビュー用)
bash src/film/tools/build_hf.sh /tmp/yoake_hf <曲.mp3>
(cd /tmp/yoake_hf && npx hyperframes check)                       # エラー 0
# 2) 5 秒(150 コマ)ずつ 11 区間に書き出す(中断しても、できた区間は飛ばして再開)
bash src/film/tools/render_segments.sh /tmp/yoake_hf /tmp/yoake_segs
# 3) つないで曲を付ける(映像 1590 コマ、音 AAC 256k 48kHz、曲は加工しない)
bash src/film/tools/assemble.sh /tmp/yoake_segs <曲.mp3> yoake_v1.mp4
# 4) 検査
python3 ../../tools/review_checks.py yoake_v1.mp4 --holds holds.json
python3 -I src/film/tools/measure_sync.py yoake_v1.mp4 audio/sync_map.json audio/lyric_timeline.json SYNC_MEASURED.md
node src/film/tools/frames.mjs --textlog 0-1589 /tmp/textlog.json && python3 -I src/film/tools/lyric_check.py /tmp/textlog.json audio/lyric_timeline.json LYRIC_DISPLAY_CHECK.md
node src/film/tools/frames.mjs --hash 0,38,141,409,769,784,1002,1340,1589      # 順・逆・飛ばしの seek で同じ画素か
node src/film/tools/frames.mjs /tmp/fx0 220,812,1490 --fx0                      # 効果を切った版
bash src/film/tools/sheets.sh yoake_v1.mp4 /tmp/sheets 407,669,769,862,1000,1171,1340
```

### 歌詞の時刻を直した時(利用者の耳の確認の後)
1. `audio/lyric_timeline.json` の該当する句・語の `start`(と `end`)を直す(整数コマ、終端排他)。`python3 -I src/tools/lyric_table.py audio/lyric_timeline.json LYRIC_TIMELINE.md` で表も更新。
2. `bash src/film/tools/build_hf.sh /tmp/yoake_hf` で埋め込み直す。
3. 時刻が動いた区間の `segNN.mp4`(NN = コマ ÷ 150。前後の区間にまたがる時は両方)を消して `render_segments.sh` を再実行 → `assemble.sh`。
4. `lyric_check.py` と `measure_sync.py` で確かめる。
- 句の頭でカットしているショット(S4・S7・S8・S9)は、境目も一緒に動く(句の頭の 2 コマ前で切る。`film.js` の `LEAD`)。
