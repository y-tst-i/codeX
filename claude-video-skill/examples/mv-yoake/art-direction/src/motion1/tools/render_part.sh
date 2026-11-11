#!/usr/bin/env bash
# 区間を HyperFrames で書き出し、曲の該当区間を付ける。生成物は全部リポジトリの外(<作業フォルダ>)。
#   使い方: bash render_part.sh <作業フォルダ> <曲の mp3(MV の 53 秒の切り出し。MV の 0 秒 = このファイルの 0 秒)> <区間> [look|clean|both] [出力の mp4] [cam 0|1]
#   区間は build_hf.sh と同じ(A・M・B・DA・S8・<F0>:<N>)。作業の名前は <区間>(cam を付けたら <区間>_cam<0|1>)
#   出力: <作業フォルダ>/video_<名前>_{look,clean}.mp4(音なし)、<出力の mp4>(音つき、look。既定 <作業フォルダ>/yoake_v4_part<区間>.mp4)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; ex="$(cd "$here/../../.." && pwd)"
w="${1:?作業フォルダ}"; mp3="${2:?曲の mp3}"; part="${3:?区間}"; which="${4:-both}"; final="${5:-$w/yoake_v4_part$part.mp4}"; cam="${6:-}"; mkdir -p "$w"
name="$part"; [ -n "$cam" ] && name="${part}_cam$cam"; name="${name//:/_}"
read -r F0 N < <(python3 -I "$here/tools/partrange.py" "$ex/audio/cues.json" "$ex/audio/lyric_timeline.json" "$part")
a=$(python3 -I -c "import sys;print(int(sys.argv[1])/30)" "$F0"); d=$(python3 -I -c "import sys;print(int(sys.argv[1])/30)" "$N")
ffmpeg -v error -y -i "$mp3" -ss "$a" -t "$d" -c:a pcm_s16le "$w/audio_$name.wav"   # 出力側で切る(サンプル単位で正確)
for v in look clean; do
  [ "$which" != both ] && [ "$which" != "$v" ] && continue
  bash "$here/tools/build_hf.sh" "$w/hf_${name}_$v" "$part" "$v" "${cam:-null}"
  t0=$(date +%s)
  (cd "$w/hf_${name}_$v" && npx hyperframes render --crf 12 -o "$w/video_${name}_$v.mp4" --quiet > "$w/render_${name}_$v.log" 2>&1)
  echo "rendered $name $v in $(( $(date +%s) - t0 ))s"
done
if [ -f "$w/video_${name}_look.mp4" ]; then
  ffmpeg -v error -y -i "$w/video_${name}_look.mp4" -i "$w/audio_$name.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest "$final"
  ffprobe -v error -count_frames -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration -of compact "$final"
fi
