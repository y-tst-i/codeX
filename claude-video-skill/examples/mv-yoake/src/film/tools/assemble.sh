#!/usr/bin/env bash
# 11 区間をつないで 1590 コマにし、曲(53.0 秒)を付ける。映像は 1 回だけ再エンコード、音は AAC 256k 48kHz(曲は加工しない)。
#   使い方: bash assemble.sh <区間のフォルダ> <曲.mp3> <出力.mp4>
set -euo pipefail
d="${1:?}"; mp3="${2:?}"; out="${3:?}"
ins=(); fl=""; for i in $(seq 0 10); do ins+=(-i "$d/seg$(printf %02d $i).mp4"); fl="$fl[$i:v]fps=30,setpts=PTS-STARTPTS[a$i];"; done
cat=""; for i in $(seq 0 10); do cat="$cat[a$i]"; done
ffmpeg -v error -y "${ins[@]}" -i "$mp3" -filter_complex "${fl}${cat}concat=n=11:v=1:a=0,format=yuv420p[v]" \
  -map "[v]" -map 11:a -frames:v 1590 -c:v libx264 -preset slow -crf 16 -r 30 -c:a aac -b:a 256k -ar 48000 -t 53 -movflags +faststart "$out"
ffprobe -v error -count_frames -show_entries stream=codec_name,nb_read_frames,width,height,r_frame_rate,sample_rate:format=duration -of compact "$out"
