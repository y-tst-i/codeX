#!/bin/bash
# 第1話: 9場面をハードカットで連結 → 音を載せる。 usage: assemble.sh <out.mp4>
set -e
cd "$(dirname "$0")"
OUT=${1:-ep1_final.mp4}
ORDER="e0-title e1-guild e2-meadow e3-castle e4-corridor e5-throne e6-sunset e7-epilogue e8-next"
: > list.txt
for s in $ORDER; do echo "file 'out/$s.mp4'" >> list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -r 30 -an video_only.mp4
ffmpeg -y -loglevel error -i soundtrack_raw.wav -af "loudnorm=I=-14:TP=-2:LRA=14" -ar 48000 soundtrack.wav
ffmpeg -y -loglevel error -i video_only.mp4 -i soundtrack.wav -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -show_entries format=duration -of default=nw=1 "$OUT"
