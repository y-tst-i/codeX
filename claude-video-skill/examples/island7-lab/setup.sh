#!/bin/bash
# 材料をそろえる(リポジトリには入れない): three.js 0.181.2 と Noto Sans JP。ページは http で開く。
set -e
cd "$(dirname "$0")"
bash ../../tools/fetch_three.sh assets
mkdir -p fonts && ( cd fonts && npm pack @fontsource/noto-sans-jp@5.2.8 --silent >/dev/null && tar xzf fontsource-noto-sans-jp-5.2.8.tgz && rm -rf sans && mv package sans && rm fontsource-*.tgz )
pip install -q numpy matplotlib pillow
echo 'python3 -m http.server 8767 --bind 127.0.0.1 &  のあと  node lab.mjs stills 1 0 120 300'
