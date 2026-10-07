#!/bin/bash
# 場面mp4をハードカットで連結し、音を載せる(映像は一度だけ再エンコード、音は loudnorm -14 LUFS)
# usage: assemble.sh <scenes_dir> "<scene1 scene2 ...>" <soundtrack_raw.wav> <out.mp4>
set -e
dir=$1; order=$2; wav=$3; out=$4
: > "$dir/list.txt"
for s in $order; do echo "file '$PWD/$dir/$s.mp4'" >> "$dir/list.txt"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$dir/list.txt" -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -r 30 -an "$dir/video_only.mp4"
# loudnorm は1回通しだと短い動画(15秒など)で目標に届かない(STILLDUSK: -16.8 LUFS)。→ 2回通し: 1回目で測り、2回目で測定値を渡して直線補正。
# それでもピーク(TP -2)が先に当たって届かない音(山と谷の差が大きい: ピーク-ラウドネス差 > 18 dB)は、軽い圧縮(ratio 2.5)を先にかけてから通す。
# STILLDUSK の素材で -16.8(1回通し) → -15.1(2回通しのみ) → -14.4(2回+軽い圧縮)、幅(LRA)は 6.7→7.2 LU。圧縮を切る: COMP=0 assemble.sh ...
meas() { ffmpeg -hide_banner -nostats -i "$1" -af "loudnorm=I=-14:TP=-2:LRA=14:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p'; }
j() { echo "$m" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
src="$wav"; m=$(meas "$src")
if [ "${COMP:-1}" = 1 ] && python3 -c "import sys;sys.exit(0 if float('$(j input_tp)')-float('$(j input_i)')>18 else 1)"; then
  ffmpeg -y -loglevel error -i "$wav" -af "acompressor=threshold=-22dB:ratio=2.5:attack=10:release=200:makeup=1" "$dir/soundtrack_comp.wav"
  src="$dir/soundtrack_comp.wav"; m=$(meas "$src")
fi
ffmpeg -y -loglevel error -i "$src" -af "loudnorm=I=-14:TP=-2:LRA=14:measured_I=$(j input_i):measured_LRA=$(j input_lra):measured_TP=$(j input_tp):measured_thresh=$(j input_thresh):offset=$(j target_offset):linear=true" -ar 48000 "$dir/soundtrack.wav"
ffmpeg -y -loglevel error -i "$dir/video_only.mp4" -i "$dir/soundtrack.wav" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$out"
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,width,height,r_frame_rate -show_entries format=duration -of default=nw=1 "$out"
# 共有用(30MB上限対策): 2パスで約25MB
#   ffmpeg -y -i "$out" -c:v libx264 -preset slow -b:v 2350k -pass 1 -an -f null /dev/null
#   ffmpeg -y -i "$out" -c:v libx264 -preset slow -b:v 2350k -pass 2 -pix_fmt yuv420p -c:a copy -movflags +faststart small.mp4
# ピークが高い時: ffmpeg -i out.mp4 -c:v copy -af "volume=-1.5dB" -c:a aac -b:a 160k fixed.mp4
