#!/usr/bin/env bash
# 6秒試作の HyperFrames プロジェクトを作る(生成物。git に入れない)。時刻データを作り直し、描画のソースと字形の点列を assets/ に写す。
#   使い方: bash build_hf.sh <出力フォルダ> [look|clean]
#   前提: 字形の点列 ../gen/glyphs.js(../tools/setup_v2.sh で作る。書体は OFL、git に入れない)
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; src="$(cd "$here/.." && pwd)"; ex="$(cd "$src/../.." && pwd)"
out="${1:?出力フォルダ}"; look="${2:-look}"; mkdir -p "$out/assets"
python3 -I "$here/tools/gen_timing.py" "$ex" "$here/gen/timing.gen.js" >/dev/null
cp "$src/gen/glyphs.js" "$src/common.js" "$here/pilot6s.js" "$here/gen/timing.gen.js" "$out/assets/"
if [ ! -f "$out/assets/gsap.min.js" ]; then tmp="$(mktemp -d)"; (cd "$tmp" && npm pack gsap@3.14.2 >/dev/null 2>&1 && tar xzf gsap-*.tgz); cp "$tmp/package/dist/gsap.min.js" "$out/assets/gsap.min.js"; fi
v=true; [ "$look" = clean ] && v=false
sed "s#/\*LOOK\*/true#$v#" "$here/index.template.html" > "$out/index.html"
printf '{"id":"pilot6s","name":"pilot6s"}\n' > "$out/meta.json"
printf '{"$schema":"https://hyperframes.heygen.com/schema/hyperframes.json","paths":{"blocks":"compositions","components":"compositions/components","assets":"assets"}}\n' > "$out/hyperframes.json"
echo "built $out ($look)"
