#!/usr/bin/env bash
# v6(53秒ボード v4)の静止画を全部書き出す。ORDER=rev で逆順(決定性の検査用)。
# 出力: $OUT/style_ac_f<コマ>_{look,clean}.png と stats_v4.jsonl。既定の OUT はリポジトリの外(1920px の静止画は git に入れない)。
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${OUT:?OUT(書き出し先。リポジトリの外。例: scratchpad/mv2d/v4_frames)を指定}"; mkdir -p "$OUT"
FS=(${FRAMES:-60 240 370 480 740 840 950 1080 1200 1380 1430 1470 1560}); VS=(${VIEWS:-look clean})
args=()
if [ "${ORDER:-fwd}" = rev ]; then for ((i=${#FS[@]}-1;i>=0;i--)); do for ((k=${#VS[@]}-1;k>=0;k--)); do v=${VS[$k]}; args+=("$here/styleframes_v6.html?f=${FS[$i]}&v=$v" "$OUT/style_ac_f$(printf %04d ${FS[$i]})_$v.png"); done; done
else for f in "${FS[@]}"; do for v in "${VS[@]}"; do args+=("$here/styleframes_v6.html?f=$f&v=$v" "$OUT/style_ac_f$(printf %04d $f)_$v.png"); done; done; fi
node "$here/tools/render_v2.mjs" "${args[@]}" > "$OUT/${STATS:-stats_v4.jsonl}"
