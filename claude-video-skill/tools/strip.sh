#!/usr/bin/env bash
# 審査用: 指定区間を一定間隔で抜いて、時刻つきの連続画像1枚にする。
# 使い方: tools/strip.sh <in.mp4> <開始秒> <終了秒> <out.png> [間隔秒=0.2]
# 例: tools/strip.sh final.mp4 4 7 /tmp/strip.png 0.2   (3秒 = 15コマ、5列に並べる)
# 転換の前後は間隔を 0.0333 にして 1/30 秒刻みで見る(コマ数が多い時は区間を狭める)。
set -euo pipefail
if [ $# -lt 4 ]; then
  echo "使い方: $0 <in.mp4> <開始秒> <終了秒> <out.png> [間隔秒=0.2]" >&2
  exit 2
fi
in="$1"; ss="$2"; to="$3"; out="$4"; step="${5:-0.2}"

n=$(awk -v a="$ss" -v b="$to" -v s="$step" 'BEGIN{n=int((b-a)/s+0.5); if(n<1)n=1; print n}')
cols=5
[ "$n" -lt 5 ] && cols="$n"
rows=$(( (n + cols - 1) / cols ))

# 1コマの幅: 5列で 1枚が横 ~2400px 以内に収まるよう 480px
fontfile=""
for f in /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf /usr/share/fonts/dejavu/DejaVuSans.ttf; do
  [ -f "$f" ] && fontfile="$f" && break
done
label=""
if [ -n "$fontfile" ]; then
  # 各コマの左上に、その時刻(秒)を焼き込む。pts は -ss 後の相対時間なので開始秒を足す
  # 時刻 T=(t+開始秒) を 0.1 秒単位に丸め、整数部.小数1桁 で表示
  T="(t+$ss)*10+0.5"
  label=",drawtext=fontfile=$fontfile:text='%{eif\\:floor(($T)/10)\\:d}.%{eif\\:mod(floor($T)\\,10)\\:d}s':x=8:y=6:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4"
fi

ffmpeg -v error -y -ss "$ss" -to "$to" -i "$in" -an \
  -vf "fps=1/${step},scale=480:-2${label},tile=${cols}x${rows}:padding=4:color=black" \
  -frames:v 1 "$out"
echo "$out  (${n}コマ, 間隔 ${step}s, ${ss}s-${to}s)"
