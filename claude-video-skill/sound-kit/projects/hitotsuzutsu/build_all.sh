#!/bin/bash
# B と C を作り直し、比較パック・検査・キュー表まで通す。
# usage: bash build_all.sh            (モデルを使う earshot の分析も回すなら LISTEN=1 bash build_all.sh)
set -e
cd "$(dirname "$0")"
PY=${PY:-$HOME/earshot_env/bin/python}
export EARSHOT_HOME=${EARSHOT_HOME:-$HOME/earshot_env/home}
"$PY" make_B.py
"$PY" make_C.py
"$PY" finish.py
"$PY" qa.py
"$PY" cue_sheet.py
if [ "${LISTEN:-0}" = 1 ]; then "$PY" listen_earshot.py; fi
