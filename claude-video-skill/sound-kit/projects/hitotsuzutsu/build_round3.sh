#!/bin/bash
# 第3ラウンド(条件 D): Audio Studio の BGM D1–D4 を点検し、C の効果音の下に置き、S9 と合わせた 5 本の比較パックと検査まで通す。
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
"$PY" make_round2.py                # 基準の S9(第2ラウンドの light)。warm も一緒に作る(light だけで作ると乱数の進み方が変わり、第2ラウンドと同じ音にならない)
"$PY" audit_round3.py
"$PY" make_round3.py
"$PY" finish_round3.py $P
"$PY" qa_round3.py $E $P
