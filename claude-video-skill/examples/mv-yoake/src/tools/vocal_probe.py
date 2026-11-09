#!/usr/bin/env python3
"""歌声の位置を波形から推定する補助(汎用。AIは音を聴けないので、文字起こしの時刻を裏取りするための数値と絵)。

やること(numpy / scipy / PIL だけ。librosa 不要):
  1. ステレオの中央成分を取り出す: |M| - a|S|(M=(L+R)/2, S=(L-R)/2)。歌は中央に置かれることが多い。
  2. 調波/打撃の分離(時間方向/周波数方向のメディアン)で、調波側だけを残す。
  3. 歌の帯域(300〜3500Hz)の中央・調波のエネルギー(dB)と、調波のスペクトル変化(語頭の候補)を 10ms 刻みで出す。
  4. 区間ごとに画像: 上=中央・調波のスペクトログラム(対数周波数 100〜5000Hz)、
     中=歌の帯域のエネルギー、下=語頭の候補。縦線=1秒ごと(太線=5秒)、色の縦線=文字起こしの語の開始。
注意: 中央に置いたシンセ・ベースも残る。歌があるかの「目安」で、断定には使わない。

使い方: python3 -I vocal_probe.py <音声> <sync_map.json> <出力フォルダ> [区間 "0-27,22-53"]
出力: probe.json(10ms ごとの値と、語頭の候補)、probe_<a>-<b>.png
"""
import json, os, subprocess, sys
import numpy as np
from scipy import ndimage, signal
from PIL import Image, ImageDraw

src, smap, out = sys.argv[1:4]
spans = [tuple(float(x) for x in s.split("-")) for s in (sys.argv[4] if len(sys.argv) > 4 else "0-27,22-53").split(",")]
os.makedirs(out, exist_ok=True)
SR = 22050
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
L, R = x[:, 0], x[:, 1]
N, HOP = 2048, 220  # 220 サンプル = 約 10ms
f, t, ZM = signal.stft((L + R) / 2, fs=SR, nperseg=N, noverlap=N - HOP, boundary=None)
_, _, ZS = signal.stft((L - R) / 2, fs=SR, nperseg=N, noverlap=N - HOP, boundary=None)
t = t  # 窓の中心の時刻
M, S = np.abs(ZM), np.abs(ZS)
C = np.maximum(M - 1.0 * S, 0)  # 中央成分
H = ndimage.median_filter(C, size=(1, 19))  # 時間方向(約0.19s)
P = ndimage.median_filter(C, size=(19, 1))  # 周波数方向
mask = H ** 2 / (H ** 2 + P ** 2 + 1e-12)
CH = C * mask
band = (f >= 300) & (f <= 3500)
eps = 1e-9
voc_db = 10 * np.log10((CH[band] ** 2).sum(0) + eps)
all_db = 10 * np.log10((M[band] ** 2).sum(0) + eps)
ratio_db = voc_db - all_db  # 中央・調波が全体に占める割合(歌がある所で上がる目安)
lg = np.log1p(CH[(f >= 200) & (f <= 4000)] * 50)
flux = np.maximum(np.diff(lg, axis=1, prepend=lg[:, :1]), 0).sum(0)
flux = ndimage.uniform_filter1d(flux, 3)
flux_n = flux / (np.percentile(flux, 99) + eps)
# 語頭の候補: flux の山(0.12s 以上離す)
pk, pr = signal.find_peaks(flux_n, height=0.35, distance=int(0.12 / (HOP / SR)))
sm = json.load(open(smap))
words = sm.get("whisper_words_relative", [])
json.dump({"hop_s": HOP / SR, "t": np.round(t, 3).tolist(), "voc_db": np.round(voc_db, 2).tolist(), "ratio_db": np.round(ratio_db, 2).tolist(),
           "flux": np.round(flux_n, 3).tolist(), "onsets": [{"t": round(float(t[i]), 3), "frame30": int(round(t[i] * 30)), "h": round(float(flux_n[i]), 2)} for i in pk]},
          open(os.path.join(out, "probe.json"), "w"))

# ---- 画像 ----
fmin, fmax, rows = 100, 5000, 300
fl = np.geomspace(fmin, fmax, rows)
idx = np.searchsorted(f, fl)
pxs = 100  # 1秒あたりの画素
for a, b in spans:
    i0, i1 = np.searchsorted(t, a), np.searchsorted(t, b)
    seg = 20 * np.log10(CH[idx][:, i0:i1] + 1e-6)
    lo, hi = np.percentile(seg, 40), np.percentile(seg, 99.7)
    img = np.clip((seg - lo) / (hi - lo), 0, 1)[::-1]
    W = int((b - a) * pxs)
    spec = Image.fromarray((img * 255).astype(np.uint8)).resize((W, rows * 2))
    spec = Image.merge("RGB", (spec, spec.point(lambda v: int(v * 0.8)), spec.point(lambda v: int(v * 0.4))))
    G = Image.new("RGB", (W, rows * 2 + 360), (10, 10, 14)); G.paste(spec, (0, 0)); d = ImageDraw.Draw(G)
    X = lambda tt: int((tt - a) * pxs)
    def curve(arr, y0, hgt, col, lo_, hi_):
        pts = [(X(t[i]), y0 + hgt - int(np.clip((arr[i] - lo_) / (hi_ - lo_), 0, 1) * hgt)) for i in range(i0, i1)]
        d.line(pts, fill=col, width=2)
    y1 = rows * 2
    curve(voc_db, y1 + 10, 150, (120, 220, 255), np.percentile(voc_db, 5), np.percentile(voc_db, 99.5))
    curve(ratio_db, y1 + 10, 150, (255, 170, 80), np.percentile(ratio_db, 5), np.percentile(ratio_db, 99.5))
    curve(flux_n, y1 + 180, 160, (200, 255, 140), 0, 1.2)
    for s in range(int(np.ceil(a)), int(b) + 1):
        d.line([(X(s), 0), (X(s), G.height)], fill=(90, 90, 90) if s % 5 else (200, 200, 200), width=1 if s % 5 else 2)
        d.text((X(s) + 2, 2), str(s), fill=(255, 255, 255))
    for w in words:
        if a <= w["s"] <= b:
            d.line([(X(w["s"]), y1 - 40), (X(w["s"]), y1 + 175)], fill=(255, 80, 160), width=2)
            d.text((X(w["s"]) + 3, y1 - 38), f'{w["s"]:.2f}', fill=(255, 120, 190))
    for i in pk:
        if a <= t[i] <= b: d.line([(X(t[i]), y1 + 340), (X(t[i]), y1 + 352)], fill=(200, 255, 140), width=2)
    G.save(os.path.join(out, f"probe_{int(a)}-{int(b)}.png"))
print("onset candidates", len(pk), "images", len(spans))
