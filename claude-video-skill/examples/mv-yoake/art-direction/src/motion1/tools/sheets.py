#!/usr/bin/env python3
"""(画像の中の見出しは PIL の既定の字体で描くので英数字だけ)
区間の確認画像を、書き出した mp4 から作る(描画のコードは使わない)。
使い方: python3 -I sheets.py <look.mp4> <clean.mp4|-> <measure.json> <出力フォルダ> <接頭辞>
出力: <接頭辞>_contact_0.2s.jpg(0.2 秒=6 コマ刻み、幅 320)、<接頭辞>_contact_0.2s_540.jpg(同じ物を幅 540)、<接頭辞>_check_540.jpg(540px 幅: 歌詞の語頭+10・刷りの後・境目)、
      <接頭辞>_boundaries.jpg(カットの境目の前後 3 コマ)、<接頭辞>_fx_off_clean.jpg(clean と look を 1 秒刻みで並べる)"""
import sys, os, json, subprocess
import numpy as np
from PIL import Image, ImageDraw
look, clean, meas_p, out, pre = sys.argv[1:6]
os.makedirs(out, exist_ok=True)
M = json.load(open(meas_p, encoding="utf-8")); F0, N = M["song_range"][0], M["frames"]
BG, FG = (28, 28, 30), (235, 235, 235)
def frames(path, want):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE); got = {}; k = 0
    while True:
        b = p.stdout.read(1920 * 1080 * 3)
        if len(b) < 1920 * 1080 * 3: break
        if k in want: got[k] = Image.frombuffer("RGB", (1920, 1080), b, "raw", "RGB", 0, 1).copy()
        k += 1
    p.wait(); return got
def grid(items, cols, tw, path, label_h=16):
    th = round(tw * 1080 / 1920); rows = (len(items) + cols - 1) // cols
    S = Image.new("RGB", (cols * (tw + 4) + 4, rows * (th + label_h + 4) + 4), BG); d = ImageDraw.Draw(S)
    for k, (im, lab) in enumerate(items):
        x, y = 4 + (k % cols) * (tw + 4), 4 + (k // cols) * (th + label_h + 4)
        d.text((x + 2, y + 2), lab, fill=FG); S.paste(im.resize((tw, th), Image.LANCZOS), (x, y + label_h))
    S.save(path, quality=84, optimize=True); print(path, S.size)
lab = lambda i: f"{i/30:.1f}s f{F0 + i}"
cs = list(range(0, N, 6)) + [N - 1]
pts = sorted({min(N - 1, max(0, x["onset"] + 10 - F0)) for x in M["lyrics"]} | {min(N - 1, x["frame"] + 3 - F0) for x in M["events"]})
cuts = [0] + [s - F0 for s in (141, 291, 409, 769, 864, 1002, 1173, 1431, 1520) if F0 < s < F0 + N]
bd = sorted({j for c in cuts for j in (c - 2, c - 1, c, c + 1, c + 2) if 0 <= j < N})
sec = list(range(0, N, 30))
G = frames(look, set(cs) | set(pts) | set(bd) | set(sec))
grid([(G[i], lab(i)) for i in cs], 8, 320, os.path.join(out, f"{pre}_contact_0.2s.jpg"))
grid([(G[i], lab(i)) for i in cs], 4, 540, os.path.join(out, f"{pre}_contact_0.2s_540.jpg"))  # 540px 幅(スマホ相当)の 0.2 秒刻み。大きいのでリポジトリには入れない
grid([(G[i], "540px " + lab(i)) for i in pts], 4, 540, os.path.join(out, f"{pre}_check_540.jpg"))
grid([(G[i], lab(i)) for i in bd], 5, 384, os.path.join(out, f"{pre}_boundaries.jpg"))
if clean != "-":
    C = frames(clean, set(sec)); items = []
    for i in sec: items += [(G[i], "look " + lab(i)), (C[i], "clean " + lab(i))]
    grid(items, 4, 400, os.path.join(out, f"{pre}_fx_off_clean.jpg"))
