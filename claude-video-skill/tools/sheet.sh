#!/bin/bash
# コンタクトシート: mp4 から均等サンプルした N 枚を1枚の画像に並べる(目視レビュー用。PIL不要)
# usage: sheet.sh <in.mp4> <out.png> [cols=4] [rows=3]
# 終了コード: 画像ができたら 0、引数不足は 1、ffprobe/ffmpeg の失敗はそのコード(2D試験で「画像が出るのに 2」と報告あり。再現せず、2026-10-30)
set -e
[ $# -ge 2 ] || { echo "usage: sheet.sh <in.mp4> <out.png> [cols=4] [rows=3]" >&2; exit 1; }
f=$1; out=$2; c=${3:-4}; r=${4:-3}
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
# 小数の計算は awk(Windows の Git Bash でも動く。python3 は Store のスタブのことがあるので使わない)。
# %.17g は python の print と同じ double を表す(ffmpeg が読む値は前と同じ)
fps=$(awk -v c="$c" -v r="$r" -v d="$d" 'BEGIN{printf "%.17g", c*r/d}')
ffmpeg -y -loglevel error -i "$f" -vf "fps=$fps,scale=640:-1,tile=${c}x${r}:padding=4:color=gray" -frames:v 1 "$out"
[ -s "$out" ] || { echo "sheet.sh: $out ができませんでした" >&2; exit 1; }
exit 0
