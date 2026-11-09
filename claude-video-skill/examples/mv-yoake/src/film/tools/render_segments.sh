#!/usr/bin/env bash
# 5 秒(150 コマ)ずつ 11 区間に分けて HyperFrames で書き出す(最後は 90 コマ)。中断しても、できた区間は飛ばして再開できる。
# 歌詞の時刻を直した時は、変わった区間の segNN.mp4 を消してから走らせれば、その区間だけ書き直す。
#   使い方: bash render_segments.sh <HyperFrames のフォルダ> <区間の出力フォルダ> [区間番号 …(省略で全部)]
set -uo pipefail
hf="${1:?HFフォルダ}"; out="${2:?出力フォルダ}"; shift 2; mkdir -p "$out"
segs="${*:-0 1 2 3 4 5 6 7 8 9 10}"
frames() { ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$1" 2>/dev/null; }
for i in $segs; do
  s=$((i * 5)); e=$((s + 5)); want=150; if [ "$e" -gt 53 ]; then e=53; want=90; fi
  f="$out/seg$(printf %02d $i).mp4"
  if [ -f "$f" ] && [ "$(frames "$f")" = "$want" ]; then echo "skip seg$i"; continue; fi
  t0=$(date +%s)
  (cd "$hf" && npx hyperframes render --start "$s" --end "$e" --crf 12 -o "$f.tmp.mp4" --quiet > "$out/seg$i.log" 2>&1) && mv "$f.tmp.mp4" "$f"
  echo "seg$i frames=$(frames "$f") want=$want $(( $(date +%s) - t0 ))s"
done
