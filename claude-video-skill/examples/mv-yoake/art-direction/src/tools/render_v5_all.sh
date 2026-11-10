#!/usr/bin/env bash
# v5(53秒ボード v3)の静止画を全部書き出す。ORDER=rev で逆順(決定性の検査用)。出力: $OUT/style_ac_f<コマ>_{look,clean}.png と stats_v3.jsonl
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; OUT="${OUT:-$here/../frames/board53/v3}"; mkdir -p "$OUT"
FS=(60 240 370 480 740 840 950 1080 1200 1380 1430 1470 1560); VS=(look clean)
args=()
if [ "${ORDER:-fwd}" = rev ]; then for ((i=${#FS[@]}-1;i>=0;i--)); do for v in clean look; do args+=("$here/styleframes_v5.html?f=${FS[$i]}&v=$v" "$OUT/style_ac_f$(printf %04d ${FS[$i]})_$v.png"); done; done
else for f in "${FS[@]}"; do for v in "${VS[@]}"; do args+=("$here/styleframes_v5.html?f=$f&v=$v" "$OUT/style_ac_f$(printf %04d $f)_$v.png"); done; done; fi
node "$here/tools/render_v2.mjs" "${args[@]}" > "$OUT/${STATS:-stats_v3.jsonl}"
