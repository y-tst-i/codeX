#!/bin/bash
# usage: sheet.sh <id> [cols] [rows]  -> chk/<id>.png (均等サンプルの一覧)
id=$1; c=${2:-3}; r=${3:-3}
f=out/$id.mp4
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f)
n=$((c*r))
fps=$(python3 -c "print($n/$d)")
ffmpeg -y -loglevel error -i $f -vf "fps=$fps,scale=640:-1,tile=${c}x${r}:padding=4:color=gray" -frames:v 1 chk/$id.png
