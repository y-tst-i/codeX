#!/bin/bash
# コンタクトシート: mp4 から均等サンプルした N 枚を1枚の画像に並べる(目視レビュー用。PIL不要)
# usage: sheet.sh <in.mp4> <out.png> [cols=4] [rows=3]
# 終了コード: 画像ができたら 0、引数不足は 1、ffprobe/ffmpeg の失敗はそのコード(2D試験で「画像が出るのに 2」と報告あり。再現せず、2026-10-30)
set -e
[ $# -ge 2 ] || { echo "usage: sheet.sh <in.mp4> <out.png> [cols=4] [rows=3]" >&2; exit 1; }
f=$1; out=$2; c=${3:-4}; r=${4:-3}
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
fps=$(python3 -c "print($c*$r/$d)")
ffmpeg -y -loglevel error -i "$f" -vf "fps=$fps,scale=640:-1,tile=${c}x${r}:padding=4:color=gray" -frames:v 1 "$out"
[ -s "$out" ] || { echo "sheet.sh: $out ができませんでした" >&2; exit 1; }
exit 0
