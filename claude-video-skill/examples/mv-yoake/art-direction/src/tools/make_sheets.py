#!/usr/bin/env python3
"""見出しつきの比較シートを作る(汎用・短い)。
使い方:
  python3 -I make_sheets.py grid <出力.png> <列数> <幅> <見出し>=<画像> ...      # 横並びの格子(各画像を幅に縮小)
  見出しに「-」を渡すと空きのマス。見出しは ASCII(ラベル用の和文フォントを持ち込まないため)。
"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def grid(out, cols, width, items):
    h = round(width * 9 / 16); pad = 14; lab = 30
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new("RGB", (pad + cols * (width + pad), pad + rows * (h + lab + pad)), (232, 232, 228))
    d = ImageDraw.Draw(sheet); f = ImageFont.truetype(FONT, 17)
    for i, (label, path) in enumerate(items):
        x = pad + (i % cols) * (width + pad); y = pad + (i // cols) * (h + lab + pad)
        if path == "-":
            continue
        im = Image.open(path).convert("RGB").resize((width, h), Image.LANCZOS)
        d.text((x, y + 4), label, fill=(30, 30, 30), font=f)
        sheet.paste(im, (x, y + lab))
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "grid":
        grid(a[1], int(a[2]), int(a[3]), [tuple(s.split("=", 1)) for s in a[4:]])
