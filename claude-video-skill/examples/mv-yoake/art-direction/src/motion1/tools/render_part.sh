#!/usr/bin/env bash
# 区間 A/B を HyperFrames で書き出し、曲の該当区間を付ける。生成物は全部リポジトリの外(<作業フォルダ>)。
#   使い方: bash render_part.sh <作業フォルダ> <曲の mp3(MV の 53 秒の切り出し。MV の 0 秒 = このファイルの 0 秒)> <A|B> [look|clean|both] [出力の mp4]
#   出力: <作業フォルダ>/video_<区間>_{look,clean}.mp4(音なし)、<出力の mp4>(音つき、look。既定 <作業フォルダ>/yoake_v4_part<区間>.mp4)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; ex="$(cd "$here/../../.." && pwd)"
w="${1:?作業フォルダ}"; mp3="${2:?曲の mp3}"; part="${3:?A|B}"; which="${4:-both}"; final="${5:-$w/yoake_v4_part$part.mp4}"; mkdir -p "$w"
read -r F0 N < <(python3 -I -c "import json,sys;c=json.load(open(sys.argv[1]));s={x['id']:x for x in c['shots']};p=sys.argv[2];print(*((0,s['S5']['start']) if p=='A' else (s['S10']['start'],c['frames']-s['S10']['start'])))" "$ex/audio/cues.json" "$part")
a=$(python3 -I -c "import sys;print(int(sys.argv[1])/30)" "$F0"); d=$(python3 -I -c "import sys;print(int(sys.argv[1])/30)" "$N")
ffmpeg -v error -y -i "$mp3" -ss "$a" -t "$d" -c:a pcm_s16le "$w/audio_$part.wav"   # 出力側で切る(サンプル単位で正確)
for v in look clean; do
  [ "$which" != both ] && [ "$which" != "$v" ] && continue
  bash "$here/tools/build_hf.sh" "$w/hf_${part}_$v" "$part" "$v"
  t0=$(date +%s)
  (cd "$w/hf_${part}_$v" && npx hyperframes render --crf 12 -o "$w/video_${part}_$v.mp4" --quiet > "$w/render_${part}_$v.log" 2>&1)
  echo "rendered $part $v in $(( $(date +%s) - t0 ))s"
done
if [ -f "$w/video_${part}_look.mp4" ]; then
  ffmpeg -v error -y -i "$w/video_${part}_look.mp4" -i "$w/audio_$part.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest "$final"
  ffprobe -v error -count_frames -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration -of compact "$final"
fi
