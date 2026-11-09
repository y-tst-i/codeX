# MV『夜明けの回路』(2D モーショングラフィックス、53.0秒)

**第1段階(美術方向・歌詞時刻・スタイルフレーム)まで**。アニメーション・書き出し・音の合成は、利用者が静止画と歌詞時刻を承認してから(第2段階)。
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
