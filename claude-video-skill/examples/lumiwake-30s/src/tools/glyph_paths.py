#!/usr/bin/env python3
"""文字列を、フォントの字形のアウトライン(SVG path)に変換して JSON で出す。
ロゴの下地づくり用。出力は字ごとの path・送り幅・位置(y は上向き=負に反転済み)。
フォントファイル自体は出力に含めない(パスだけ)。

使い方: python3 -I glyph_paths.py <font.otf> "LUMiWAKE" out.json [--size 1000] [--track 0]
"""
import json, sys, argparse
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ap = argparse.ArgumentParser()
ap.add_argument("font"); ap.add_argument("text"); ap.add_argument("out")
ap.add_argument("--size", type=float, default=1000)
ap.add_argument("--track", type=float, default=0, help="字間(em の 1/1000 単位)")
a = ap.parse_args()

f = TTFont(a.font)
gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm
s = a.size / upm
x = 0.0; glyphs = []
for ch in a.text:
    gn = cmap.get(ord(ch))
    if gn is None:
        sys.exit(f"missing glyph: {ch!r}")
    g = gs[gn]
    pen = SVGPathPen(gs)
    g.draw(TransformPen(pen, (s, 0, 0, -s, x, 0)))
    bp = BoundsPen(gs); g.draw(TransformPen(bp, (s, 0, 0, -s, x, 0)))
    glyphs.append({"ch": ch, "x": x, "adv": g.width * s, "d": pen.getCommands(), "bounds": bp.bounds})
    x += g.width * s + a.track * a.size / 1000
json.dump({"font": a.font.split("/")[-1], "size": a.size, "width": x, "glyphs": glyphs}, open(a.out, "w"))
print(a.out, "width", round(x, 1))
