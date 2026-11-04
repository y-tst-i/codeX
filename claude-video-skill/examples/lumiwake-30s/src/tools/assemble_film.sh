#!/usr/bin/env bash
# 区間の mp4 を結合し、音(mix.wav)を付ける。映像は1回だけ再エンコード(900コマ・30fps固定)、音は 192k AAC。
#   使い方: bash assemble_film.sh <区間のフォルダ> <mix.wav> <出力.mp4>
set -euo pipefail
d="${1:?}"; wav="${2:?}"; out="${3:?}"; list=(); inputs=(); fc=""; i=0
for f in "$d"/seg_[0-9][0-9].mp4; do inputs+=(-i "$f"); fc+="[$i:v]fps=30,setpts=N/30/TB[v$i];"; i=$((i+1)); done
cc=""; for j in $(seq 0 $((i-1))); do cc+="[v$j]"; done
ffmpeg -v error -y "${inputs[@]}" -i "$wav" -filter_complex "${fc}${cc}concat=n=$i:v=1:a=0[v]" -map "[v]" -map "$i:a" -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -frames:v 900 -t 30 -movflags +faststart "$out"
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames,width,height,r_frame_rate -of csv=p=0 "$out"
