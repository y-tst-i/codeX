#!/usr/bin/env python3
"""乱数を位置の hash に直したことの検査: 同じカットを「彫りの進み」2段階で描き、前の段で彫ってあった所(紙)が後の段でも紙のままかを数える。
赤 = 前の段で紙だったのに後の段で墨になった画素(刀が入れ替わった=ちらつきの元)、緑 = 後の段で新しく彫った画素、灰 = 変わらない。
使い方: python3 -I hash_check_v3.py <hash フォルダ>   出力: diff_*.png と hash_check.txt
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
PAIRS = [("v4(呼び出し順の乱数)夜明け f1360→f1380", "v4_f1360", "v4_f1380"), ("v5(位置の hash)夜明け f1360→f1380", "v5_f1360", "v5_f1380"),
         ("v5 S5 粗彫り p=0.5→1.0", "v5_s5_p050", "v5_s5_p100"), ("v5 S1 最初の一刀 p=0.55→1.0", "v5_s1_p055", "v5_s1_p100")]
F = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", 26)
lines = []
for name, a, b in PAIRS:
    A = Image.open(os.path.join(d, a + ".png")).convert("L"); Bm = Image.open(os.path.join(d, b + ".png")).convert("L")
    pa, pb = A.load(), Bm.load(); w, h = A.size
    out = Image.new("RGB", (w, h)); po = out.load(); lost = gain = carvedA = 0
    for y in range(h):
        for x in range(w):
            ca, cb = pa[x, y] > 128, pb[x, y] > 128
            if ca: carvedA += 1
            if ca and not cb: lost += 1; po[x, y] = (230, 30, 30)
            elif cb and not ca: gain += 1; po[x, y] = (40, 200, 80)
            else: v = 70 if cb else 18; po[x, y] = (v, v, v)
    dr = ImageDraw.Draw(out); txt = f"{name}: 前の段の紙 {carvedA} px のうち墨に戻った {lost} px({100 * lost / max(1, carvedA):.2f}%)、新しく彫った {gain} px"
    dr.rectangle([0, 0, w, 44], fill=(255, 255, 255)); dr.text((12, 8), txt, fill=(0, 0, 0), font=F)
    out.save(os.path.join(d, f"diff_{a}_{b}.png")); out.resize((w // 2, h // 2), Image.LANCZOS).save(os.path.join(d, f"diff_{a}_{b}_960.png"))
    lines.append(txt); print(txt)
open(os.path.join(d, "hash_check.txt"), "w").write("\n".join(lines) + "\n")
