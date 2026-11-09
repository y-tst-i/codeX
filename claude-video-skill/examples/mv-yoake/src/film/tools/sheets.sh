#!/usr/bin/env bash
# 完成した mp4 から確認用の画像を作る: コンタクトシート(0.5 秒刻み 106 枚)、540px 縮小(要所)、カット境界の前後 1 コマ、効果なしは別(frames.mjs --fx0)。
#   使い方: bash sheets.sh <film.mp4> <出力フォルダ> <境目のコマ(カンマ区切り)>
set -euo pipefail
v="${1:?}"; o="${2:?}"; cuts="${3:-}"; mkdir -p "$o"
ffmpeg -v error -y -i "$v" -vf "select='not(mod(n\,15))',scale=320:-1,tile=8x14:padding=2" -frames:v 1 -q:v 3 "$o/contact.jpg"
sel=""; for f in 20 100 200 240 330 440 520 600 745 790 830 900 960 1010 1070 1130 1220 1320 1380 1450 1480 1560; do sel="$sel+eq(n\,$f)"; done
ffmpeg -v error -y -i "$v" -vf "select='${sel:1}',scale=540:-1,tile=4x6:padding=2" -frames:v 1 -q:v 3 "$o/check540.jpg"
if [ -n "$cuts" ]; then sel=""; for c in ${cuts//,/ }; do for d in -1 0 1; do sel="$sel+eq(n\,$((c + d)))"; done; done
  ffmpeg -v error -y -i "$v" -vf "select='${sel:1}',scale=420:-1,tile=6x6:padding=2" -frames:v 1 -q:v 3 "$o/boundaries.jpg"; fi
ls -la "$o"
