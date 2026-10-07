# tools/ — 動画制作の再利用スクリプト

| ファイル | 用途 |
|---|---|
| `sheet.sh` | mp4 から均等にコマを抜いて1枚のコンタクトシートにする(目視レビュー) |
| `assemble.sh` | 場面mp4をハードカット連結+音(loudnorm -14 LUFS。2回通し+必要なら軽い圧縮)。共有用2パス圧縮・ピーク調整のコマンドをコメントで同梱 |
| `sync_check.py` | 映像の閃光と音の立ち上がりのずれを数値で確認(合図JSONを渡すと1件ずつ) |
| `audio_instruments.py` | numpy だけで作る楽器・効果音ライブラリ(キック/スネア/ハット/タイコ/Karplus-Strong弦/合唱/フルート/金管/鐘/銅鑼/ライザー/ホイッスル/リバーブ等)。`import audio_instruments as I` して `I.mix(t, I.kick(), gain)` のように、時刻を指定して重ねる。決定的(seed固定)。BPMと合図表に合わせて場面ごとに音の世界を変える |

音の作り方の実例: リポジトリ `anime-ad/ep1/make_audio.py`(場面ごとの音設計)。
