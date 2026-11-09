#!/usr/bin/env bash
# フォントを assets/fonts/ に用意する(git には入れない。.gitignore)。
#   FONTSOURCE_DIR: npm pack で取って展開した @fontsource/zen-old-mincho, dela-gothic-one, zen-kaku-gothic-new の親フォルダ
#     例: mkdir fs && cd fs && for p in zen-old-mincho dela-gothic-one zen-kaku-gothic-new; do npm pack @fontsource/$p; done
#         for f in *.tgz; do mkdir -p ${f%.tgz} && tar xzf $f -C ${f%.tgz}; done
#   YUTA_DIR(任意): ゆうたONE の YutaONE_Fonts フォルダ。あれば英字の補助に Vectura を使う(再配布不可。コピーするだけ)
# 和文は src/jp_text.txt にある字だけにサブセット化する(どれも SIL OFL 1.1)。
set -euo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"; out="$here/assets/fonts"; mkdir -p "$out"
: "${FONTSOURCE_DIR:?FONTSOURCE_DIR を指定}"
pk() { ls -d "$FONTSOURCE_DIR"/fontsource-$1-*/package | head -1; }
py="python3 -I $here/src/tools/subset_jp.py"
$py "$(pk zen-old-mincho)" 900 MIN "$here/src/jp_text.txt" "$out"
$py "$(pk zen-old-mincho)" 600 MIN "$here/src/jp_text.txt" "$out"
$py "$(pk dela-gothic-one)" 400 DELA "$here/src/jp_text.txt" "$out"
$py "$(pk zen-kaku-gothic-new)" 700 KAKU "$here/src/jp_text.txt" "$out"
$py "$(pk zen-kaku-gothic-new)" 400 KAKU "$here/src/jp_text.txt" "$out"
cat "$out"/MIN-900.css "$out"/MIN-600.css "$out"/DELA-400.css "$out"/KAKU-700.css "$out"/KAKU-400.css > "$out/jp.css"
if [ -n "${YUTA_DIR:-}" ] && [ -f "$YUTA_DIR/Vectura-FREE/Y1Vectura.otf" ]; then cp "$YUTA_DIR/Vectura-FREE/Y1Vectura.otf" "$out/latin.otf"; fi
ls "$out" | wc -l
