#!/bin/bash
# B と C を作り直し、比較パック・検査・キュー表まで通す。出力は docs/sound-upgrade/work/(git の外)だけ。
# usage: bash build_all.sh
#   LISTEN=1   earshot のモデルを使う分析も回す(約 2 分、メモリ 2.4 GB)
#   PUBLISH=1  git の中の比較パック(compare/*.mp4)・answer_key/ANSWER_KEY.md・CUE_SHEET.md の表も更新する
set -e
cd "$(dirname "$0")"
PY=${PY:-$HOME/earshot_env/bin/python}
export EARSHOT_HOME=${EARSHOT_HOME:-$HOME/earshot_env/home}
P=""; [ "${PUBLISH:-0}" = 1 ] && P="--publish"
"$PY" prepare.py
"$PY" make_B.py
"$PY" make_C.py
"$PY" finish.py $P
if [ "${LISTEN:-0}" = 1 ]; then "$PY" listen_earshot.py; fi
"$PY" qa.py
"$PY" cue_sheet.py $P
