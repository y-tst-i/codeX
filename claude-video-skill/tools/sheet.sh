#!/bin/bash
# コンタクトシート: mp4 から均等サンプルした N 枚を1枚の画像に並べる(目視レビュー用。PIL不要)
# usage: sheet.sh <in.mp4> <out.png> [cols=4] [rows=3]
f=$1; out=$2; c=${3:-4}; r=${4:-3}
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
fps=$(python3 -c "print($c*$r/$d)")
ffmpeg -y -loglevel error -i "$f" -vf "fps=$fps,scale=640:-1,tile=${c}x${r}:padding=4:color=gray" -frames:v 1 "$out"
