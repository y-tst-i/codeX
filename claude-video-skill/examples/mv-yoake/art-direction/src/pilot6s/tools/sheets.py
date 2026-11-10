#!/usr/bin/env python3
"""(画像の中の見出しは PIL の既定の字体で描くので英数字だけ)
6秒試作の確認用の画像を作る(書き出した mp4 から取り出したコマ fr_look/・fr_clean/ を使う。描画のコードは使わない)。
使い方: python3 -I sheets.py <作業フォルダ(fr_look, fr_clean, pngseq_look がある)> <出力フォルダ(frames/pilot6s)>
出力:
  contact_0.2s.png      0.2秒(6コマ)刻み+最後のコマ、31枚(look)
  boundaries.png        始まり・ショットの境目(52/133)・終わりの前後のコマ(look)
  check_540.png         540px 幅に縮小した、各語頭+10コマ・刷りの後・終わり(字と窓が分かるか)
  fx_off_clean.png      効果(刷りの質感・版ずれの見た目)を切った版の 0.5秒刻み、look と並べる
  events_zoom.png       刷り(189〜192、273〜276)・空の筋(283〜296)・版ずれ(318〜320)の拡大
"""
import sys, os, json
from PIL import Image, ImageDraw

w, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
F0 = 141
fr = lambda v, i: Image.open(os.path.join(w, f"fr_{v}", f"{i:03d}.png")).convert("RGB")
BG, FG = (28, 28, 30), (235, 235, 235)

def grid(items, cols, tw, label_h=20, crop=None, path=None):
    th = None; tiles = []
    for im, lab in items:
        if crop: im = im.crop(crop)
        r = tw / im.width; t = im.resize((tw, round(im.height * r)), Image.LANCZOS); th = max(th or 0, t.height); tiles.append((t, lab))
    rows = (len(tiles) + cols - 1) // cols
    rh = [max(t.height for t, _ in tiles[r * cols:(r + 1) * cols]) for r in range(rows)]  # 行ごとの高さ(切り抜きの大きさが行で違う)
    S = Image.new("RGB", (cols * tw + (cols + 1) * 4, sum(rh) + rows * (label_h + 4) + 4), BG); d = ImageDraw.Draw(S)
    for k, (t, lab) in enumerate(tiles):
        r = k // cols; x, y = 4 + (k % cols) * (tw + 4), 4 + sum(rh[:r]) + r * (label_h + 4)
        d.text((x + 2, y + 3), lab, fill=FG); S.paste(t, (x, y + label_h))
    S.save(path, optimize=True); print(path, S.size)

lab = lambda i: f"{i/30:.2f}s  local {i}  song {F0 + i}"
grid([(fr("look", i), lab(i)) for i in list(range(0, 180, 6)) + [179]], 4, 470, path=os.path.join(out, "contact_0.2s.png"))
grid([(fr("look", i), lab(i)) for i in (0, 1, 2, 51, 52, 53, 132, 133, 134, 177, 178, 179)], 3, 620, path=os.path.join(out, "boundaries.png"))
plan = json.load(open(os.path.join(w, "plan.json"), encoding="utf-8")); E = plan["E"]
pts = [("kan+10", E["kan"] + 10), ("yami+10", E["yami"] + 10), ("no+10", E["no"] + 10), ("kazu+10", E["kazu"] + 10), ("dake+10", E["dake"] + 10),
       ("sun print+4", E["sunPrint"] + 4), ("window print+3", E["winPrint"] + 3), ("kagayaki+8", E["kagayaki"] + 8), ("last before misreg", F0 + 177)]
grid([(fr("look", s - F0).resize((540, 304), Image.LANCZOS), f"{n}  song {s}") for n, s in pts], 3, 540, path=os.path.join(out, "check_540.png"))
items = []
for i in list(range(0, 180, 15)) + [177]:
    items += [(fr("look", i), "look  " + lab(i)), (fr("clean", i), "clean " + lab(i))]
grid(items, 4, 470, path=os.path.join(out, "fx_off_clean.png"))
z = []
for i in (188, 189, 190, 191, 192): z.append((fr("look", i - F0).crop((1480, 90, 1720, 470)), f"sun plate song {i}"))
for i in (272, 273, 274, 275, 276): z.append((fr("look", i - F0).crop((780, 470, 1060, 750)), f"window song {i}"))
for i in (282, 283, 285, 288, 290, 291, 293, 296, 299, 302): z.append((fr("look", i - F0).crop((560, 240, 1500, 760)), f"sky song {i}"))
for i in (318, 319, 320): z.append((fr("look", i - F0).crop((780, 470, 1060, 750)), f"misreg window song {i}"))
z.append((Image.new("RGB", (10, 10), BG), ""))
z.append((Image.new("RGB", (10, 10), BG), ""))
for i in (318, 319, 320): z.append((fr("look", i - F0).crop((1480, 90, 1720, 470)), f"misreg letters song {i}"))
grid(z, 5, 300, path=os.path.join(out, "events_zoom.png"))
