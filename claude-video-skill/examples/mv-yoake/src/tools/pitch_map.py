#!/usr/bin/env python3
"""旋律の高さの地図(汎用。歌の語頭・伸ばし・息継ぎを目で探すため)。
中央・調波の成分で、基本周波数の候補 150〜1000Hz を倍音の和(5倍音まで)で評価し、時刻×高さの画像にする。
歌はビブラート・しゃくり(曲線)、シンセは平らな直線になりやすい。下段は全体の音量(10ms)。
縦線: 細=0.5秒、太=1秒(数字は秒)。桃色=文字起こしの語の開始(複数条件を色の濃さで)。緑の点=曲のアクセント(frame30)。
使い方: python3 -I pitch_map.py <音声> <sync_map.json> <whisper_check の json か -> <出力フォルダ> "a-b,c-d"
"""
import json, os, subprocess, sys
import numpy as np
from scipy import ndimage, signal
from PIL import Image, ImageDraw

src, smap, wcj, out, spans = sys.argv[1:6]
spans = [tuple(float(v) for v in s.split("-")) for s in spans.split(",")]
os.makedirs(out, exist_ok=True)
SR = 22050
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
N, HOP = 4096, 220
f, t, ZM = signal.stft((x[:, 0] + x[:, 1]) / 2, fs=SR, nperseg=N, noverlap=N - HOP, boundary=None)
_, _, ZS = signal.stft((x[:, 0] - x[:, 1]) / 2, fs=SR, nperseg=N, noverlap=N - HOP, boundary=None)
M, S = np.abs(ZM), np.abs(ZS)
C = np.maximum(M - S, 0)
H = ndimage.median_filter(C, size=(1, 15)); P = ndimage.median_filter(C, size=(9, 1))
CH = C * H ** 2 / (H ** 2 + P ** 2 + 1e-12)
CH = np.log1p(CH * 30)
f0 = 150 * 2 ** (np.arange(0, 33 * 4) / 48)  # 1/4 半音刻み、150Hz〜約1000Hz
sal = np.zeros((len(f0), CH.shape[1]))
df = f[1] - f[0]
for h, wgt in zip(range(1, 6), [1, .8, .64, .5, .4]):
    k = np.clip(np.round(f0 * h / df).astype(int), 0, len(f) - 1)
    sal += wgt * CH[k]
sal = ndimage.uniform_filter(sal, size=(2, 2))
rms = 20 * np.log10(np.sqrt(ndimage.uniform_filter1d(((x[:, 0] + x[:, 1]) / 2) ** 2, HOP * 2)[::HOP]) + 1e-9)
tr = np.arange(len(rms)) * HOP / SR
sm = json.load(open(smap))
wsets = {"base": sm.get("whisper_words_relative", [])}
if wcj != "-" and os.path.exists(wcj): wsets.update(json.load(open(wcj)))
pxs = 200
for a, b in spans:
    i0, i1 = np.searchsorted(t, a), np.searchsorted(t, b)
    seg = sal[:, i0:i1]; lo, hi = np.percentile(seg, 50), np.percentile(seg, 99.8)
    img = (np.clip((seg - lo) / (hi - lo), 0, 1) ** 1.3)[::-1]
    W = int((b - a) * pxs); Hh = len(f0) * 3
    im = Image.fromarray((img * 255).astype(np.uint8)).resize((W, Hh), Image.BILINEAR)
    im = Image.merge("RGB", (im.point(lambda v: int(v * .55)), im.point(lambda v: int(v * .9)), im))
    G = Image.new("RGB", (W, Hh + 260), (8, 8, 12)); G.paste(im, (0, 20)); d = ImageDraw.Draw(G)
    X = lambda tt: int((tt - a) * pxs)
    j0, j1 = np.searchsorted(tr, a), np.searchsorted(tr, b)
    lo2, hi2 = np.percentile(rms[j0:j1], 2), rms[j0:j1].max()
    d.line([(X(tr[j]), Hh + 140 - int(np.clip((rms[j] - lo2) / (hi2 - lo2 + 1e-9), 0, 1) * 110)) for j in range(j0, j1)], fill=(230, 230, 230), width=1)
    for k in range(int(np.ceil(a * 2)), int(b * 2) + 1):
        s = k / 2; d.line([(X(s), 20), (X(s), G.height)], fill=(150, 150, 150) if k % 2 == 0 else (60, 60, 60), width=1)
        if k % 2 == 0: d.text((X(s) + 2, 4), f"{s:.0f}", fill=(255, 255, 255))
    for a_ in sm["accents"]:
        if a <= a_["t"] <= b:
            r = 2 + int(a_["strength"] * 5); xx = X(a_["t"]); d.ellipse([xx - r, Hh + 150 - r, xx + r, Hh + 150 + r], fill=(120, 255, 120) if a_["kick"] < 0.4 else (255, 220, 60))
            d.text((xx - 8, Hh + 160), str(a_["frame30"]), fill=(150, 220, 150))
    ys = Hh + 180
    for n, (k, ws) in enumerate(wsets.items()):
        y = ys + n * 12
        d.text((2, y - 2), k[:8], fill=(200, 200, 200))
        for w in ws:
            if a <= w["s"] <= b:
                d.line([(X(w["s"]), y), (X(w["s"]), y + 9)], fill=(255, 90, 170), width=2)
    # 高さの目盛り(左): 200, 300, 400, 600, 800 Hz
    for hz in (200, 300, 400, 600, 800):
        yy = 20 + Hh - int(np.log2(hz / 150) * 48 * 3)
        d.text((2, yy - 6), str(hz), fill=(255, 200, 120)); d.line([(30, yy), (40, yy)], fill=(255, 200, 120))
    G.save(os.path.join(out, f"pitch_{a:g}-{b:g}.png"))
print("ok")
