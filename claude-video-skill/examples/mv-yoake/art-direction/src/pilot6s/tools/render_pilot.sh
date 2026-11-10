#!/usr/bin/env bash
# 6秒試作を HyperFrames で書き出し、曲の該当区間(4.70〜10.70秒)を付け、コマを取り出して測る。生成物は全部リポジトリの外(<作業フォルダ>)。
#   使い方: bash render_pilot.sh <作業フォルダ> <曲の mp3(MV の 53秒の切り出し)> [look|clean|both]
#   出力: <作業フォルダ>/yoake_art_pilot6s.mp4(音つき、look)、pilot6s_video_{look,clean}.mp4、fr_{look,clean}/、meas_{look,clean}/
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; src="$(cd "$here/.." && pwd)"
w="${1:?作業フォルダ}"; mp3="${2:?曲の mp3}"; which="${3:-both}"; mkdir -p "$w"
a=$(python3 -I -c "import json,sys;p=json.load(open(sys.argv[1]));print(p['song_range'][0]/p['fps'])" "$src/../PILOT_6S_PROPOSAL.json")
ffmpeg -v error -y -i "$mp3" -ss "$a" -t 6.0 -c:a pcm_s16le "$w/pilot_audio.wav"   # 出力側で切る(デコードしてから捨てる=サンプル単位で正確)
node "$src/tools/render_v2.mjs" "$here/dev.html?f=end" "$w/plan_end.png" | python3 -I -c "import sys,json;s=json.loads(sys.stdin.readline())['stats'];json.dump({'E':s['E'],'letters':s['letters'],'letters_end':s['letters_end']},open(sys.argv[1],'w'),ensure_ascii=False)" "$w/plan.json"
for v in look clean; do
  [ "$which" != both ] && [ "$which" != "$v" ] && continue
  bash "$here/tools/build_hf.sh" "$w/pilot6s_hf_$v" "$v"
  (cd "$w/pilot6s_hf_$v" && npx hyperframes render --crf 12 -o "$w/pilot6s_video_$v.mp4" --quiet > "$w/render_$v.log" 2>&1)
  rm -rf "$w/fr_$v"; mkdir -p "$w/fr_$v"; ffmpeg -v error -y -i "$w/pilot6s_video_$v.mp4" -start_number 0 "$w/fr_$v/%03d.png"
  python3 -I "$here/tools/measure.py" "$w/fr_$v" "$w/plan.json" "$here/gen/timing.gen.js" "$w/meas_$v" > "$w/meas_$v.log"
done
ffmpeg -v error -y -i "$w/pilot6s_video_look.mp4" -i "$w/pilot_audio.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest "$w/yoake_art_pilot6s.mp4"
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,duration -of compact "$w/yoake_art_pilot6s.mp4"
