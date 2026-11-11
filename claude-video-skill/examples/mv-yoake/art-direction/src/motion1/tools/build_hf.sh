#!/usr/bin/env bash
# 動きの本制作の HyperFrames プロジェクトを作る(生成物。git に入れない)。時刻データを作り直し、描画のソース・字形の点列・紙のスキャンを assets/ に写す。
#   使い方: bash build_hf.sh <出力フォルダ> <区間> [look|clean] [cam]
#   区間: A = 冒頭 S1〜S4、M = 中盤 S5〜S9、B = 夜明け、DA = 夜明けの構図 A、S8 などショットの ID、<F0>:<N>(tools/partrange.py)
#   cam: 2.5D の層のカメラ。0 = 切る(第1段の方式)、1 = 入れる、省略 = 描画の既定(A7_CAM_DEFAULT)
#   前提: 字形の点列 ../gen/glyphs.js(../tools/setup_v2.sh で TEXT=text_v3.txt。書体は OFL、git に入れない)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; src="$(cd "$here/.." && pwd)"; ex="$(cd "$src/../.." && pwd)"
out="${1:?出力フォルダ}"; part="${2:?区間}"; look="${3:-look}"; cam="${4:-null}"; mkdir -p "$out/assets"
python3 -I "$here/tools/gen_timing.py" "$ex" "$here/gen/timing.gen.js" >/dev/null
read -r F0 N < <(python3 -I "$here/tools/partrange.py" "$ex/audio/cues.json" "$ex/audio/lyric_timeline.json" "$part")
cp "$src/gen/glyphs.js" "$src/common.js" "$src"/cand_a7*.js "$src/cand_a6_cuts.js" "$src/cand_a6_dawn.js" "$here/gen/timing.gen.js" "$src/assets/paper_acg_Paper006_gray.jpg" "$out/assets/"
if [ ! -f "$out/assets/gsap.min.js" ]; then tmp="$(mktemp -d)"; (cd "$tmp" && npm pack gsap@3.14.2 >/dev/null 2>&1 && tar xzf gsap-*.tgz); cp "$tmp/package/dist/gsap.min.js" "$out/assets/gsap.min.js"; fi
v=true; [ "$look" = clean ] && v=false
dur=$(python3 -I -c "import sys;print(f'{int(sys.argv[1])/30:.6f}')" "$N")
sed -e "s#/\*LOOK\*/true#$v#" -e "s#/\*CAM\*/null#$cam#" -e "s#/\*F0\*/0#$F0#" -e "s#/\*N\*/1#$N#" -e "s#/\*DUR\*/#$dur#g" -e "s#/\*PART\*/#$part#" -e "s#/\*F0\*/#$F0#g" -e "s#/\*FL\*/#$((F0 + N - 1))#" "$here/index.template.html" > "$out/index.html"
printf '{"id":"m1","name":"m1"}\n' > "$out/meta.json"
printf '{"$schema":"https://hyperframes.heygen.com/schema/hyperframes.json","paths":{"blocks":"compositions","components":"compositions/components","assets":"assets"}}\n' > "$out/hyperframes.json"
echo "built $out part=$part look=$look cam=$cam F0=$F0 N=$N dur=$dur"
