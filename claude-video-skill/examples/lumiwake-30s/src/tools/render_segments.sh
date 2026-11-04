#!/usr/bin/env bash
# 区間ごとに HyperFrames で書き出す(中断しても、できている区間は飛ばして再開できる)。
#   使い方: bash render_segments.sh <出力フォルダ> [区間の秒数=5]   → <出力>/seg_00.mp4 ...(音なし)
# 結合は ffmpeg の concat フィルタ(コマ数を合わせるため再エンコード)。結合と音の付与は assemble_film.sh。
set -uo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"; out="${1:?出力フォルダ}"; seg="${2:-5}"; mkdir -p "$out"; cd "$here/hf"
n=$(( 30 / seg ))
for i in $(seq 0 $((n-1))); do
  f="$out/seg_$(printf %02d $i).mp4"; [ -s "$f" ] && { echo "skip $f"; continue; }
  s=$(( i*seg )); e=$(( s+seg ))
  echo "render $s-$e s"; npx --yes hyperframes@0.9.13 render --start $s --end $e --fps 30 --crf 14 --workers 4 --quiet -o "$f.part.mp4" > "$out/seg_$i.log" 2>&1 && mv "$f.part.mp4" "$f" || { echo "FAILED seg $i"; tail -5 "$out/seg_$i.log"; exit 1; }
done
echo all-segments-done
