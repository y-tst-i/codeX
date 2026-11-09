#!/usr/bin/env python3
"""文字の輪郭を折れ線(点列)にして JS に書く(汎用。光が文字の輪郭をなぞる・輪郭の途中まで描く、に使う)。
@fontsource の分割 woff2 から、その字を含むファイルを探して輪郭を取り、曲線を細かい折れ線にする。
座標は 1em=1、y は下向き、ベースライン=0。各輪郭は [x0,y0,x1,y1,...] と長さ。字ごとに送り幅 adv。
フォント由来のデータなので git に入れない(.gitignore の src/lib/glyphs.js)。

使い方: python3 -I glyph_lines.py <出力.js> <名前>=<fontsource の package>:<weight> ... -- <文字のテキストファイル>
例: python3 -I glyph_lines.py src/lib/glyphs.js MIN=fs/fontsource-zen-old-mincho-5.3.1/package:900 -- src/jp_text.txt
"""
import glob, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

out = sys.argv[1]; i = sys.argv.index("--"); specs = sys.argv[2:i]; text = open(sys.argv[i + 1], encoding="utf-8").read()
chars = sorted({c for c in text if not c.isspace()})

class FlatPen(BasePen):
    def __init__(self, gs, step):
        super().__init__(gs); self.cs = []; self.cur = None; self.step = step
    def _moveTo(self, p): self.cur = [p]; self.cs.append(self.cur)
    def _lineTo(self, p): self.cur.append(p)
    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]; L = sum(((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** .5 for a, b in zip([p0, p1, p2], [p1, p2, p3]))
        n = max(2, int(L / self.step))
        for k in range(1, n + 1):
            t = k / n; u = 1 - t
            self.cur.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]; L = sum(((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** .5 for a, b in zip([p0, p1], [p1, p2]))
        n = max(2, int(L / self.step))
        for k in range(1, n + 1):
            t = k / n; u = 1 - t
            self.cur.append((u*u*p0[0] + 2*u*t*p1[0] + t*t*p2[0], u*u*p0[1] + 2*u*t*p1[1] + t*t*p2[1]))
    def _closePath(self):
        if self.cur and self.cur[0] != self.cur[-1]: self.cur.append(self.cur[0])
    _endPath = _closePath

res = {}
for spec in specs:
    name, rest = spec.split("=", 1); pkg, weight = rest.rsplit(":", 1)
    files = sorted(glob.glob(os.path.join(pkg, "files", f"*-{weight}-normal.woff2")))
    fonts = [(f, TTFont(f)) for f in files]
    g = {}; upm = None; asc = desc = None
    for c in chars:
        for f, ft in fonts:
            cm = ft.getBestCmap()
            if ord(c) in cm:
                upm = ft["head"].unitsPerEm; asc = ft["hhea"].ascent; desc = ft["hhea"].descent
                gs = ft.getGlyphSet(); gn = cm[ord(c)]; pen = FlatPen(gs, upm / 160); gs[gn].draw(pen)
                cs = []
                for cont in pen.cs:
                    pts = [(round(x / upm, 4), round(-y / upm, 4)) for x, y in cont]
                    L = sum(((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** .5 for a, b in zip(pts, pts[1:]))
                    cs.append({"len": round(L, 4), "p": [v for pt in pts for v in pt]})
                g[c] = {"adv": round(gs[gn].width / upm, 4), "c": cs}
                break
    res[name] = {"asc": round(asc / upm, 4), "desc": round(desc / upm, 4), "g": g}
    miss = [c for c in chars if c not in g]
    print(name, "glyphs", len(g), "missing", "".join(miss))
open(out, "w", encoding="utf-8").write("// 自動生成(glyph_lines.py)。フォント由来の輪郭データ。git に入れない\nconst GLYPHS = " + json.dumps(res, ensure_ascii=False, separators=(",", ":")) + ";\n")
