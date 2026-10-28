#!/bin/bash
# 第2ラウンド: C の効果音のまま BGM を 2 案に差し替え、比較パック・検査まで通す。出力は docs/sound-upgrade/work/(git の外)だけ。
# usage: bash build_round2.sh       (前提: build_all.sh を 1 度通してある = WORK/C/raw_*.wav がある)
#   LISTEN=1   earshot timeline で BGM だけの拍も測る(モデル)
#   PUBLISH=1  git の中の compare_round2/(動画・BGM だけの音声)と answer_key/ANSWER_KEY_ROUND2.md も更新する
set -e
cd "$(dirname "$0")"
PY=${PY:-$HOME/earshot_env/bin/python}
export EARSHOT_HOME=${EARSHOT_HOME:-$HOME/earshot_env/home}
P=""; [ "${PUBLISH:-0}" = 1 ] && P="--publish"
E=""; [ "${LISTEN:-0}" = 1 ] && E="--earshot"
"$PY" make_C.py
"$PY" make_round2.py
"$PY" finish_round2.py $P
"$PY" qa_round2.py $E $P
