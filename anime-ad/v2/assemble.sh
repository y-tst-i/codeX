#!/bin/bash
# 場面mp4をハードカットで連結 → 音を載せて最終mp4。 usage: assemble.sh <out.mp4>
set -e
cd "$(dirname "$0")"
OUT=${1:-final.mp4}
ORDER="s1-million s2-faceoff s3-punch s5a s5b s5c s5d s5e s6-title s7-huh s8-announce"
: > list.txt
for s in $ORDER; do echo "file 'out/$s.mp4'" >> list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -r 30 -an video_only.mp4
ffmpeg -y -loglevel error -i video_only.mp4 -i soundtrack.wav -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -show_entries format=duration -of default=nw=1 "$OUT"
