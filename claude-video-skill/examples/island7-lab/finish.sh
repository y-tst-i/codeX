#!/bin/bash
# 仕上げ(motion-lab.md §7・§8): FFV1 の区切りをつなぐ → 粒 → H.264 High 60fps CRF 14 + AAC → 音をデコードして測る → 3回通し → X 用 GIF → 機械チェック
set -e
cd "$(dirname "$0")"
T=../../tools
ls out/chunks/c{0..7}.mkv >/dev/null
printf "file '%s'\n" $(for c in 0 1 2 3 4 5 6 7; do echo "$PWD/out/chunks/c$c.mkv"; done) > out/chunks/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/chunks/list.txt -c copy out/master_ffv1.mkv
# 1ループの MP4(先頭と末尾 96 サンプルにフェードした音)。粒は seed 付き(allf=t は時間方向に変わるが、ffmpeg の乱数は決定的)
ffmpeg -v error -y -i out/master_ffv1.mkv -i out/mix_single.wav -vf "noise=c0s=3:allf=t,format=yuv420p" -c:v libx264 -profile:v high -preset slow -crf 14 -r 60 \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/island7-lab.mp4
# 3回通し(継ぎ目の確認と投稿用。音は継ぎ目のないマスターを3回)
ffmpeg -v error -y -stream_loop 2 -i out/master_ffv1.mkv -i out/mix_x3.wav -vf "noise=c0s=3:allf=t,format=yuv420p" -c:v libx264 -profile:v high -preset slow -crf 16 -r 60 \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/island7-lab_x3.mp4
# X 用 GIF: 24fps・720px・全体で1つのパレット。コマの長さは 1/100 秒単位なので 4,4,4,4,4,5… に並ぶ(全体 8.00 秒)
ffmpeg -v error -y -i out/master_ffv1.mkv -vf "fps=24,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop 0 out/island7-lab.gif
python3 - <<'EOF'
from PIL import Image
im = Image.open('out/island7-lab.gif'); d = []
try:
    while True: d.append(im.info['duration']); im.seek(im.tell() + 1)
except EOFError: pass
from collections import Counter
print(f'GIF: {len(d)} コマ、合計 {sum(d) / 1000:.2f} 秒、コマの長さ {dict(Counter(d))} ms')
EOF
ls -la out/island7-lab.mp4 out/island7-lab_x3.mp4 out/island7-lab.gif
echo '--- 音(MP4 をデコードして測る)'; python3 $T/audio_measure.py out/island7-lab.mp4 --cues cues.json
echo '--- 機械チェック(3回通し)'; python3 $T/review_checks.py out/island7-lab_x3.mp4
