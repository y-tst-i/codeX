#!/usr/bin/env bash
# フォントを assets/fonts/ に用意する(git には入れない)。
#   YUTA_DIR: ゆうたONE パックの YutaONE_Fonts フォルダ(利用者が入手した物。再配布しない)
#   FONTSOURCE_DIR: npm pack で取った @fontsource/zen-old-mincho と noto-sans-jp を展開したフォルダ
# 和文は src/jp_text.txt にある字だけにサブセット化する(SIL OFL 1.1)。
set -euo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"; out="$here/assets/fonts"; mkdir -p "$out"
: "${YUTA_DIR:?YUTA_DIR を指定}"; : "${FONTSOURCE_DIR:?FONTSOURCE_DIR を指定}"
cp "$YUTA_DIR/Vectura-FREE/Y1Vectura.otf" "$out/hud.otf"
cp "$YUTA_DIR/FullmoonMarch-FREE/Y1FullmoonMarch.otf" "$out/logo.otf"
zen="$(ls -d "$FONTSOURCE_DIR"/fontsource-zen-old-mincho-*/package | head -1)"; noto="$(ls -d "$FONTSOURCE_DIR"/fontsource-noto-sans-jp-*/package | head -1)"
python3 -I "$here/src/tools/subset_jp.py" "$zen" 900 JPM "$here/src/jp_text.txt" "$out"
python3 -I "$here/src/tools/subset_jp.py" "$noto" 700 JPG "$here/src/jp_text.txt" "$out"
python3 -I "$here/src/tools/subset_jp.py" "$noto" 500 JPG "$here/src/jp_text.txt" "$out"
cat "$out"/JPM-900.css "$out"/JPG-700.css "$out"/JPG-500.css > "$out/jp.css"
ls -la "$out"
