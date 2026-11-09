#!/usr/bin/env python3
"""確認用の並べ画像(汎用): 効果なし/ありの左右比較と、幅 540px に縮めた一覧。
使い方: python3 -I sheets.py <PNG のフォルダ(sfN.png と sfN_fx0.png)> <出力フォルダ> N1 N2 ...
"""
import sys, os
from PIL import Image, ImageDraw
src, out, *ns = sys.argv[1:]
os.makedirs(out, exist_ok=True)
for n in ns:
    a = Image.open(f"{src}/sf{n}_fx0.png").convert("RGB").resize((960, 540), Image.LANCZOS)
    b = Image.open(f"{src}/sf{n}.png").convert("RGB").resize((960, 540), Image.LANCZOS)
    S = Image.new("RGB", (1930, 560), (40, 40, 40)); S.paste(a, (0, 20)); S.paste(b, (970, 20))
    d = ImageDraw.Draw(S); d.text((8, 4), f"sf{n}: left = effects OFF (fx=0)", fill=(230, 230, 230)); d.text((978, 4), "right = effects ON", fill=(230, 230, 230))
    S.save(f"{out}/fx_compare_sf{n}.jpg", quality=88)
tiles = [Image.open(f"{src}/sf{n}.png").convert("RGB").resize((540, 304), Image.LANCZOS) for n in ns]
cols = 2; rows = (len(tiles) + 1) // 2
S = Image.new("RGB", (cols * 550 + 10, rows * 314 + 10), (40, 40, 40))
for i, t in enumerate(tiles): S.paste(t, (10 + (i % cols) * 550, 10 + (i // cols) * 314))
S.save(f"{out}/check_540.jpg", quality=90)
print("ok")
