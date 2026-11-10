#!/usr/bin/env bash
# 計測用の計画(描画が決めた時刻・字の位置・測る領域)を、各カットの頭のコマの __stats から集める。
#   使い方: bash plan.sh <作業フォルダ>   → <作業フォルダ>/plan.json
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; src="$(cd "$here/.." && pwd)"; w="${1:?作業フォルダ}"; mkdir -p "$w/plan_png"
args=(); for f in 0 141 291 409 1340 1431 1520; do args+=("$src/styleframes_v7.html?f=$f&v=mask" "$w/plan_png/f$f.png"); done
node "$src/tools/render_v2.mjs" "${args[@]}" | python3 -I -c "
import sys,json
out={}
for line in sys.stdin:
    line=line.strip()
    if not line.startswith('{'): continue
    d=json.loads(line); s=d['stats']; out[str(s['f'])]={k:s.get(k) for k in ('cut_id','comp','events','letters','mbox')}
json.dump(out,open(sys.argv[1],'w'),ensure_ascii=False,indent=1); print('plan', list(out))" "$w/plan.json"
