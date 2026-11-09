#!/usr/bin/env bash
# 6区間をつないで 900 コマにし、完成した音(30.000秒)を付ける。映像は1回だけ再エンコード、音は AAC 256k 48kHz。
#   使い方: bash assemble.sh <区間のフォルダ> <音.wav> <出力.mp4>
set -euo pipefail
d="${1:?}"; wav="${2:?}"; out="${3:?}"
ffmpeg -v error -y -i "$d/seg0.mp4" -i "$d/seg1.mp4" -i "$d/seg2.mp4" -i "$d/seg3.mp4" -i "$d/seg4.mp4" -i "$d/seg5.mp4" -i "$wav" \
  -filter_complex "[0:v]fps=30[a0];[1:v]fps=30[a1];[2:v]fps=30[a2];[3:v]fps=30[a3];[4:v]fps=30[a4];[5:v]fps=30[a5];[a0][a1][a2][a3][a4][a5]concat=n=6:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -map 6:a -frames:v 900 -c:v libx264 -preset slow -crf 15 -r 30 -c:a aac -b:a 256k -ar 48000 -t 30 -movflags +faststart "$out"
ffprobe -v error -count_frames -show_entries stream=codec_name,nb_read_frames,width,height,r_frame_rate:format=duration -of compact "$out"
