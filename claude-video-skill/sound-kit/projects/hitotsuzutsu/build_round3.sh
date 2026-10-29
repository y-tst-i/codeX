#!/bin/bash
# 第3ラウンド(条件 D): Audio Studio の BGM D1–D4 と S9 の BGM を点検し、5 本とも同じ規則で C の効果音の下に置き、比較パックと検査まで通す。
# 出力は docs/sound-upgrade/work/(git の外)だけ。
# usage: bash build_round3.sh       (前提: build_all.sh を 1 度通してある = WORK/C/raw_*.wav と WORK/src/ がある)
#   LISTEN=1   earshot timeline で BGM だけの拍も測る(モデル)
#   PUBLISH=1  git の中の compare_round3/(動画・BGM だけの音声)と answer_key/ の第3ラウンドの表も更新する
#              (記号の表 answer_key/round3_key.json が無い時に新しく引くのも PUBLISH=1 の時だけ)
set -e
cd "$(dirname "$0")"
PY=${PY:-$HOME/earshot_env/bin/python}
export EARSHOT_HOME=${EARSHOT_HOME:-$HOME/earshot_env/home}
P=""; [ "${PUBLISH:-0}" = 1 ] && P="--publish"
E=""; [ "${LISTEN:-0}" = 1 ] && E="--earshot"
"$PY" make_C.py
"$PY" audit_round3.py             # S9 の BGM も score2 から作り直す(warm → light の順。WORK/R3_S9_source.wav)
"$PY" make_round3.py
"$PY" finish_round3.py $P
"$PY" qa_round3.py $E $P
