#!/bin/bash
# 場面mp4をハードカットで連結し、音を載せる(映像は一度だけ再エンコード、音は loudnorm -14 LUFS)
# usage: assemble.sh <scenes_dir> "<scene1 scene2 ...>" <soundtrack_raw.wav> <out.mp4>
set -e
dir=$1; order=$2; wav=$3; out=$4
: > "$dir/list.txt"
for s in $order; do echo "file '$PWD/$dir/$s.mp4'" >> "$dir/list.txt"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$dir/list.txt" -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -r 30 -an "$dir/video_only.mp4"
ffmpeg -y -loglevel error -i "$wav" -af "loudnorm=I=-14:TP=-2:LRA=14" -ar 48000 "$dir/soundtrack.wav"
ffmpeg -y -loglevel error -i "$dir/video_only.mp4" -i "$dir/soundtrack.wav" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$out"
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -show_entries format=duration -of default=nw=1 "$out"
# 共有用(30MB上限対策): 2パスで約25MB
#   ffmpeg -y -i "$out" -c:v libx264 -preset slow -b:v 2350k -pass 1 -an -f null /dev/null
#   ffmpeg -y -i "$out" -c:v libx264 -preset slow -b:v 2350k -pass 2 -pix_fmt yuv420p -c:a copy -movflags +faststart small.mp4
# ピークが高い時: ffmpeg -i out.mp4 -c:v copy -af "volume=-1.5dB" -c:a aac -b:a 160k fixed.mp4
