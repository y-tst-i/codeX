#!/usr/bin/env bash
# HyperFrames のプロジェクトを作る(生成物。git に入れない)。
#   使い方: bash build_hf.sh <出力フォルダ>   (フォントは先に ../../tools/setup_fonts.sh で assets/fonts に用意)
set -euo pipefail
src="$(cd "$(dirname "$0")/.." && pwd)"; ex="$(cd "$src/../.." && pwd)"; tools="$(cd "$ex/../../tools/assets" && pwd)"
out="${1:?出力フォルダ}"; mkdir -p "$out/assets/fonts"
cp "$ex"/assets/fonts/*.woff2 "$ex"/assets/fonts/hud.otf "$out/assets/fonts/"
if [ ! -f "$out/assets/gsap.min.js" ]; then tmp="$(mktemp -d)"; (cd "$tmp" && npm pack gsap@3.14.2 >/dev/null 2>&1 && tar xzf gsap-*.tgz); cp "$tmp/package/dist/gsap.min.js" "$out/assets/gsap.min.js"; fi
cat "$tools/scene-lib.js" "$tools/depth.js" "$ex/src/lib/paint.js" "$ex/src/lib/world.js" "$ex/src/lib/hud.js" "$ex/src/lib/logo-glyphs.js" "$ex/src/lib/logo.js" \
    "$src/core.js" "$src/spirit2.js" "$src/plates.js" "$src/hud2.js" "$src/film2.js" "$src/shots_a.js" "$src/shots_b.js" > "$out/assets/film2.js"
faces="$(sed "s#url('#url('assets/fonts/#g" "$ex/assets/fonts/jp.css" | tr '\n' ' ')"
python3 -I - "$src/index.template.html" "$out/index.html" "$faces" <<'PY'
import sys; t = open(sys.argv[1], encoding="utf-8").read(); open(sys.argv[2], "w", encoding="utf-8").write(t.replace("/*JP_FONT_FACES*/", sys.argv[3]))
PY
printf '{"id":"lumiwake2","name":"lumiwake2"}\n' > "$out/meta.json"
printf '{"$schema":"https://hyperframes.heygen.com/schema/hyperframes.json","paths":{"blocks":"compositions","components":"compositions/components","assets":"assets"}}\n' > "$out/hyperframes.json"
echo "built $out"
