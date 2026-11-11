# 2D と 2.5D の同じコマを上下に並べる(区間の中のコマ番号 idx、縮小 sc、切り抜き box)
import sys, subprocess, numpy as np
from PIL import Image, ImageDraw
a, b, out, idxs, sc = sys.argv[1], sys.argv[2], sys.argv[3], [int(x) for x in sys.argv[4].split(',')], float(sys.argv[5])
box = [int(x) for x in sys.argv[6].split(',')] if len(sys.argv) > 6 else [0, 0, 1920, 1080]
def grab(p):
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", p, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE); got = {}; k = 0
    while True:
        bb = pr.stdout.read(1920 * 1080 * 3)
        if len(bb) < 1920 * 1080 * 3: break
        if k in idxs: got[k] = Image.frombuffer("RGB", (1920, 1080), bb, "raw", "RGB", 0, 1).copy().crop(box)
        k += 1
    return got
A, B = grab(a), grab(b); w, h = int((box[2]-box[0]) * sc), int((box[3]-box[1]) * sc)
S = Image.new("RGB", (len(idxs) * (w + 4) + 4, 2 * (h + 18) + 4), (28, 28, 30)); d = ImageDraw.Draw(S)
for i, k in enumerate(idxs):
    for r, (G, nm) in enumerate(((A, "2D"), (B, "2.5D"))):
        x, y = 4 + i * (w + 4), 4 + r * (h + 18); d.text((x + 2, y + 2), f"{nm} +{k}", fill=(235, 235, 235)); S.paste(G[k].resize((w, h), Image.LANCZOS), (x, y + 16))
S.save(out, quality=85); print(out, S.size)
