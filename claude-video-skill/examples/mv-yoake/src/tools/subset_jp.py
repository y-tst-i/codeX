#!/usr/bin/env python3
"""@fontsource の分割 woff2 から、使う文字だけを取り出して woff2 と CSS を作る(汎用)。
分割ファイルごとに必要な字だけを残し、@font-face に unicode-range を付けて同じ family 名で並べる。

使い方: python3 -I subset_jp.py <fontsource の package フォルダ> <weight> <family 名> <文字が入ったテキスト> <出力フォルダ>
例: python3 -I subset_jp.py .../fontsource-zen-old-mincho-5.3.1/package 900 JPM jp_text.txt assets/fonts
出力: <出力>/<family>-<weight>-<n>.woff2 と <出力>/<family>-<weight>.css。足りない字があれば止まる。
"""
import sys, os, glob, re, io
from fontTools.ttLib import TTFont
from fontTools import subset

pkg, weight, fam, textf, out = sys.argv[1:6]
text = open(textf, encoding="utf-8").read()
need = sorted({ord(c) for c in text if not c.isspace()} | {0x20})
files = sorted(glob.glob(os.path.join(pkg, "files", f"*-{weight}-normal.woff2")))
files = [f for f in files if not re.search(r"-(latin|latin-ext|cyrillic|vietnamese)-", f)] + [f for f in files if re.search(r"-(latin)-", f)]
left, css, k = set(need), [], 0
os.makedirs(out, exist_ok=True)
for f in files:
    if not left: break
    cm = TTFont(f).getBestCmap(); have = sorted(c for c in left if c in cm)
    if not have: continue
    opt = subset.Options(); opt.flavor = "woff2"; opt.layout_features = ["*"]
    font = TTFont(f); s = subset.Subsetter(opt); s.populate(unicodes=have); s.subset(font)
    name = f"{fam}-{weight}-{k}.woff2"; font.flavor = "woff2"; font.save(os.path.join(out, name)); k += 1
    rng = ",".join(f"U+{c:04X}" for c in have)
    css.append(f"@font-face{{font-family:'{fam}';font-weight:{weight};src:url('{name}') format('woff2');unicode-range:{rng};}}")
    left -= set(have)
if left - {0x20}:
    sys.exit("missing: " + "".join(chr(c) for c in sorted(left)))
open(os.path.join(out, f"{fam}-{weight}.css"), "w").write("\n".join(css) + "\n")
print(fam, weight, "files", k, "chars", len(need))
