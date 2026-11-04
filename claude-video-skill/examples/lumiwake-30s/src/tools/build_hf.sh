#!/usr/bin/env bash
# HyperFrames のプロジェクト(../hf)を作る。フォント・gsap・束ねた描画コードは生成物(git 管理外)。
#   使い方: bash build_hf.sh   (assets/fonts は先に setup_fonts.sh で用意)
set -euo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"; hf="$here/hf"; tools="$here/../../tools/assets"
mkdir -p "$hf/assets/fonts"; cp "$here"/assets/fonts/* "$hf/assets/fonts/"
if [ ! -f "$hf/assets/gsap.min.js" ]; then tmp="$(mktemp -d)"; (cd "$tmp" && npm pack gsap@3.14.2 >/dev/null 2>&1 && tar xzf gsap-*.tgz); cp "$tmp/package/dist/gsap.min.js" "$hf/assets/gsap.min.js"; fi
cat "$tools/scene-lib.js" "$tools/depth.js" "$here/src/lib/paint.js" "$here/src/lib/world.js" "$here/src/lib/spirit.js" "$here/src/lib/hud.js" "$here/src/lib/logo-glyphs.js" "$here/src/lib/logo.js" "$here/src/film/film.js" > "$hf/assets/film.js"
cp "$here/src/film/index.template.html" "$hf/index.html"
printf '{"id":"lumiwake-30s","name":"lumiwake-30s"}\n' > "$hf/meta.json"
printf '{"$schema":"https://hyperframes.heygen.com/schema/hyperframes.json","paths":{"blocks":"compositions","components":"compositions/components","assets":"assets"}}\n' > "$hf/hyperframes.json"
echo "built $hf"
