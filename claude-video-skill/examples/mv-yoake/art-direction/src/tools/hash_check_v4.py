#!/usr/bin/env python3
"""乱数を位置の hash に直したことの検査: 同じカットを「彫りの進み」2段階で描き、前の段で彫ってあった所(紙)が後の段でも紙のままかを数える。
赤 = 前の段で紙だったのに後の段で墨になった画素(刀が入れ替わった=ちらつきの元)、緑 = 後の段で新しく彫った画素、灰 = 変わらない。
使い方: python3 -I hash_check_v4.py <hash の静止画フォルダ> <出力フォルダ>   出力: <出力フォルダ>/diff_*_960.jpg と hash_check.txt(差分の大きい画像はリポジトリに入れない)
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
d, od = sys.argv[1], sys.argv[2]; os.makedirs(od, exist_ok=True)
PAIRS = [("v6 夜明け f1360→f1380(空の彫り+信号)", "v6_f1360", "v6_f1380"), ("v6 夜明け f1380→f1402(信号が鉄塔へ)", "v6_f1380", "v6_f1402"),
         ("v6 夜明け f1402→f1430(太陽の縁)", "v6_f1402", "v6_f1430"), ("v6 S5 粗彫り p=0.5→1.0", "v6_s5_p050", "v6_s5_p100"), ("v6 S1 最初の一刀 p=0.55→1.0", "v6_s1_p055", "v6_s1_p100")]
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
    out.resize((w // 2, h // 2), Image.LANCZOS).save(os.path.join(od, f"diff_{a}_{b}_960.jpg"), quality=88)
    lines.append(txt); print(txt)
open(os.path.join(od, "hash_check.txt"), "w").write("\n".join(lines) + "\n")
