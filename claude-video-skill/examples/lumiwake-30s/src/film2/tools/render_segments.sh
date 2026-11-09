#!/usr/bin/env bash
# 5秒ずつ6区間に分けて HyperFrames で書き出す(中断しても、できた区間は飛ばして再開できる)。
#   使い方: bash render_segments.sh <HyperFrames のフォルダ> <区間の出力フォルダ>
set -uo pipefail
hf="${1:?HFフォルダ}"; out="${2:?出力フォルダ}"; mkdir -p "$out"
for i in 0 1 2 3 4 5; do
  s=$((i * 5)); e=$((s + 5)); f="$out/seg$i.mp4"
  if [ -f "$f" ] && [ "$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)" = "150" ]; then echo "skip seg$i"; continue; fi
  t0=$(date +%s)
  (cd "$hf" && npx hyperframes render --start "$s" --end "$e" --crf 10 -o "$f.tmp.mp4" --quiet > "$out/seg$i.log" 2>&1) && mv "$f.tmp.mp4" "$f"
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null); echo "seg$i frames=$n $(( $(date +%s) - t0 ))s"
done
