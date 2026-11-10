#!/usr/bin/env bash
# スタイルフレームの準備: 書体(OFL-1.1)を npm pack で取り、字形の点列 src/gen/glyphs.js を作る。
# フォント・字形データはリポジトリに入れない(src/.gitignore の gen/)。
#   FS: 書体を展開する作業フォルダ(リポジトリの外。例: scratchpad)
# 使い方: FS=/tmp/fs bash src/tools/setup.sh && node ../../src/tools/render_still.mjs "src/styleframes.html?c=A&v=look" a.png
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"; : "${FS:?FS(書体の作業フォルダ)を指定}"; mkdir -p "$FS" "$here/gen"
(cd "$FS" && for p in shippori-mincho-b1 zen-kaku-gothic-new dela-gothic-one kaisei-tokumin; do ls fontsource-$p-*.tgz >/dev/null 2>&1 || npm pack @fontsource/$p >/dev/null; done && for f in *.tgz; do mkdir -p "${f%.tgz}" && tar xzf "$f" -C "${f%.tgz}"; done)
pk() { ls -d "$FS"/fontsource-$1-*/package | head -1; }
python3 -I "$here/../../src/tools/glyph_lines.py" "$here/gen/glyphs.js" SMB="$(pk shippori-mincho-b1)":800 KAKU="$(pk zen-kaku-gothic-new)":500 DELA="$(pk dela-gothic-one)":400 TOK="$(pk kaisei-tokumin)":800 -- "$here/text.txt"
