#!/usr/bin/env bash
# 完成した mp4 から確認用の画像を作る: コンタクトシート(0.5秒刻み60枚、1枚320px)、540px 縮小(要所12枚)、カット境界の前後1コマ。
#   使い方: bash sheets.sh <film.mp4> <出力フォルダ>
set -euo pipefail
v="${1:?}"; o="${2:?}"; mkdir -p "$o"
ffmpeg -v error -y -i "$v" -vf "select='not(mod(n\,15))',scale=320:-1,tile=6x10:padding=2" -frames:v 1 -q:v 3 "$o/contact_v2.jpg"
sel=""; for f in 24 120 160 215 240 345 409 440 470 539 591 612 643 690 706 735 790 830 870; do sel="$sel+eq(n\,$f)"; done
ffmpeg -v error -y -i "$v" -vf "select='${sel:1}',scale=540:-1,tile=4x5:padding=2" -frames:v 1 -q:v 3 "$o/check540_v2.jpg"
sel=""; for f in 89 90 91 226 227 228 299 300 301 419 420 421 506 507 508 609 610 611 612 722 723 724; do sel="$sel+eq(n\,$f)"; done
ffmpeg -v error -y -i "$v" -vf "select='${sel:1}',scale=420:-1,tile=6x4:padding=2" -frames:v 1 -q:v 3 "$o/boundaries_v2.jpg"
ls -la "$o"
