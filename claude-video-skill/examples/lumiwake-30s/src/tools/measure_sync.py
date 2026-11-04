#!/usr/bin/env python3
"""書き出した mp4 から、映像のヒットの実際のコマを測り、曲のアクセント(sync_map.json)・効果音の頂点と比べる(汎用)。
映像: 480x270 の輝度に落とし、イベントごとに決めた領域(全面/STREAK の数字/ゲージ/小包の表示/吹き出し)の「前のコマとの差」が最大のコマを、台帳のコマ±3 の中で探す。
音: mp4 の音から、台帳の効果音の時刻 ±80ms の中で、1〜8kHz の立ち上がり(スペクトルの増分)が最大の時刻を探す。
使い方: python3 -I measure_sync.py <film.mp4> <cues.json> <sync_map.json> <出力.md>
"""
import sys, json, subprocess, numpy as np
mp4, cues_p, sm_p, out = sys.argv[1:5]; cues = json.load(open(cues_p)); sm = json.load(open(sm_p)); fps = 30
W, H = 480, 270; raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
V = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32); nf = len(V); print("frames", nf)
ROI = {"full": (0, 0, 1920, 1080), "streak": (1600, 430, 1900, 560), "gauge": (44, 970, 544, 1034), "parcel": (44, 40, 344, 126), "pop": (900, 180, 1900, 420), "pick": (860, 540, 1260, 700)}
def diff(roi, f):
    x0, y0, x1, y1 = [v // 4 for v in roi]; a = V[f, y0:y1, x0:x1]; b = V[f - 1, y0:y1, x0:x1]; return float(np.abs(a - b).mean())
def onset(roi, f0, win=3):
    c = [(diff(roi, f), f) for f in range(max(1, f0 - win), min(nf, f0 + win + 1))]; m = max(c)[0]; first = [f for d, f in c if d >= 0.6 * m]; return min(first), m
# イベントごとの測り方(領域)
metric = {22: "full", 224: None, 227: "full", 240: None, 253: None, 299: "pick", 331: "pick", 351: "pick", 370: "pick", 383: "pick", 403: None, 409: "pop", 429: None, 435: "parcel", 455: "full", 467: None, 487: None, 507: "full", 539: "streak", 559: "streak", 578: "streak", 591: "streak", 610: "pop", 617: "streak", 624: "streak", 630: "streak", 637: "streak", 643: "streak", 723: "full"}
acc = {a["frame30"]: a for a in sm["accents"]}; rows = []; bad = 0
for e in cues["events"]:
    f = e["frame"]; m = metric.get(f)
    if "acc" not in e or m is None: continue
    got, mag = onset(ROI[m], f); a = acc[e["acc"]]; lag = got - a["frame30"]; ok = abs(lag) <= 1; bad += (not ok)
    rows.append((f, m, got, a["frame30"], lag, a["strength"], ok, mag))
# 音: 効果音の頂点
aud = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout; x = np.frombuffer(aud, dtype=np.float32); SR = 48000
from scipy.signal import butter, sosfilt
y = sosfilt(butter(4, [1000, 8000], btype="band", fs=SR, output="sos"), x)
srows = []
for name, frame in (("稲妻の裂け音", 435), ("ガラスの鈴", 610), ("低い灯り音(100〜800Hz)", 723)):
    t0 = (frame + 1) / fps; i0 = int((t0 - 0.08) * SR); i1 = int((t0 + 0.08) * SR)
    if name.startswith("低い"): yy = sosfilt(butter(4, [100, 800], btype="band", fs=SR, output="sos"), x)
    else: yy = y
    seg = np.abs(yy[i0:i1]); env = np.convolve(seg, np.ones(48) / 48, mode="same"); k = int(np.argmax(env)); tp = (i0 + k) / SR
    srows.append((name, frame, t0, tp, (tp - t0) * 1000))
L = ["# 同期の実測(書き出した mp4 から。`src/tools/measure_sync.py`)", "", f"映像のコマ数 {nf}。ずれ = 実測した映像のヒットのコマ − 曲のアクセントのコマ(許容 ±1)。", "",
     "## 映像のヒットと曲のアクセント", "| 台帳のコマ | 測った領域 | 実測のコマ | アクセントのコマ | ずれ | 強さ | 判定 | 差の大きさ |", "|---|---|---|---|---|---|---|---|"]
for r in rows: L.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]:+d} | {r[5]:.2f} | {'OK' if r[6] else '要確認'} | {r[7]:.1f} |")
L += ["", f"測れた {len(rows)} 件、±1 を超えた {bad} 件。測れない事象(領域を決められない小さな動き: 224・240・253・403・429・467・487)は未測定。", "",
      "## 効果音の頂点(最終 mp4 の音。目標 = 絵のコマの1コマ後 = (frame+1)/30 秒)", "| 効果音 | 絵のコマ | 目標の時刻(s) | 実測の頂点(s) | 差(ms) |", "|---|---|---|---|---|"]
for r in srows: L.append(f"| {r[0]} | {r[1]} | {r[2]:.4f} | {r[3]:.4f} | {r[4]:+.1f} |")
open(out, "w", encoding="utf-8").write("\n".join(L) + "\n"); print("\n".join(L))
