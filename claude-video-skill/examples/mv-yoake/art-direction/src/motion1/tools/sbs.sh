#!/usr/bin/env bash
# 2D と 2.5D の並べた確認動画(左 2D・右 2.5D、各 960 幅)と、0.2 秒刻みの並べたシート
set -euo pipefail
a="$1"; b="$2"; out="$3"; sheet="$4"
ffmpeg -v error -y -i "$a" -i "$b" -filter_complex "[0:v]scale=960:540[l];[1:v]scale=960:540[r];[l][r]hstack=inputs=2,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='2D':x=12:y=10:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='2.5D':x=972:y=10:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5[v]" -map "[v]" -map 0:a -c:v libx264 -crf 16 -pix_fmt yuv420p -c:a copy "$out"
ffmpeg -v error -y -i "$out" -vf "select='not(mod(n\,6))',scale=640:180,tile=3x12" -frames:v 1 -q:v 3 "$sheet" || true
