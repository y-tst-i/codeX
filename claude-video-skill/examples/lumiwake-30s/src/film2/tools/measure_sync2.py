#!/usr/bin/env python3
"""v2 の書き出し(mp4)から、映像のヒットの実際のコマを測り、曲のアクセント(sync_map.json)と効果音の頂点と比べる。
映像: 480x270 の輝度に落とし、事象ごとに決めた領域で「前のコマより明るくなった量(正の差の平均)」が最大のコマを、台帳のコマ ±3 の中で探す
     (光る事象は明るさが増える。カメラが動くだけの変化は正負が打ち消し合うので拾いにくい)。数字の切り替わり(STREAK)は絶対差で測る。
音: mp4 の音で、効果音ごとの帯域の包絡の頂点を、(frame+1)/30 秒 ±80ms の中で探す。
使い方: python3 -I measure_sync2.py <film.mp4> <cues.json> <sync_map.json> <出力.md>
"""
import sys, json, subprocess, numpy as np
mp4, cues_p, sm_p, out = sys.argv[1:5]
cues = json.load(open(cues_p)); sm = json.load(open(sm_p)); fps = 30; W, H = 480, 270
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
V = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32); nf = len(V)
# 事象 → (領域 x0,y0,x1,y1 は 1920x1080 の座標, 測り方 pos=明るくなった量 / abs=絶対差, 中身)
FULL = (0, 0, 1920, 1080)
M = {
    22: (FULL, "pos", "稲妻の閃光"), 227: (FULL, "pos", "点火(カット)"), 240: ((300, 0, 1500, 1000), "pos", "灯りの輪"), 253: ((300, 200, 1400, 1080), "pos", "光の粒"),
    299: ((500, 200, 1500, 900), "pos", "粒1のはじけ"), 331: ((300, 200, 1400, 900), "pos", "粒2"), 351: ((300, 200, 1500, 900), "pos", "粒3"), 370: ((400, 150, 1600, 900), "pos", "粒4"), 383: ((500, 150, 1700, 900), "pos", "粒5"),
    403: (FULL, "pos", "加速(ズームのぼかし)"), 409: ((850, 160, 1700, 480), "pos", "NEAR MISS の文字"), 429: ((0, 0, 1000, 600), "pos", "嵐の腕の中の光"),
    435: (FULL, "abs", "被弾(衝撃のコマ)"), 455: ((500, 200, 1400, 900), "pos", "二撃目のはじけ"), 487: ((400, 100, 1500, 1000), "pos", "立て直しの輪"),
    507: (FULL, "abs", "カット"), 539: ((300, 200, 1400, 1080), "pos", "門1"), 559: ((300, 200, 1400, 1080), "pos", "門2"), 578: ((300, 200, 1400, 1080), "pos", "門3"), 591: ((300, 200, 1400, 1080), "pos", "門4"),
    610: (FULL, "abs", "PERFECT(衝撃のコマ)"), 617: ((1300, 330, 1820, 680), "abs", "STREAK ×8"), 624: ((1300, 330, 1820, 680), "abs", "×9"), 630: ((1300, 330, 1820, 680), "abs", "×10"), 637: ((1300, 330, 1820, 680), "abs", "×11"), 643: ((1300, 330, 1820, 680), "abs", "×12"),
    682: ((1650, 560, 1860, 700), "pos", "灯台の窓"), 723: (FULL, "abs", "点火とロゴ(カット)"),
}
def score(roi, f, mode):
    x0, y0, x1, y1 = [v // 4 for v in roi]; a = V[f, y0:y1, x0:x1]; b = V[f - 1, y0:y1, x0:x1]; d = a - b
    return float(np.clip(d, 0, None).mean()) if mode == "pos" else float(np.abs(d).mean())
acc = {a["frame30"]: a for a in sm["accents"]}; rows = []; bad = 0
for e in cues["events"]:
    f = e["frame"]
    if "acc" not in e or f not in M: continue
    roi, mode, what = M[f]; c = [(score(roi, k, mode), k) for k in range(max(1, f - 3), min(nf, f + 4))]; m, got = max(c)
    a = acc[e["acc"]]; lag = got - a["frame30"]; ok = abs(lag) <= 1; bad += not ok
    rows.append((f, what, got, a["frame30"], lag, a["strength"], ok, m))
aud = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(aud, dtype=np.float32); SR = 48000
from scipy.signal import butter, sosfilt
srows = []
for name, frame, band, tgt in (("稲妻の裂け音", 435, (1000, 8000), (435 + 1) / 30), ("PERFECT の鈴", 610, (1000, 8000), (610 + 1) / 30), ("点火の低い音", 723, (60, 400), 24.133)):
    y = sosfilt(butter(4, list(band), btype="band", fs=SR, output="sos"), x); i0 = int((tgt - 0.08) * SR); i1 = int((tgt + 0.08) * SR)
    env = np.convolve(np.abs(y[i0:i1]), np.ones(48) / 48, mode="same"); k = int(np.argmax(env)); tp = (i0 + k) / SR
    srows.append((name, frame, tgt, tp, (tp - tgt) * 1000, (tp * 30) - frame))
L = ["# 同期の実測 v2(書き出した mp4 から。`src/film2/tools/measure_sync2.py`)", "", f"映像のコマ数 {nf}。ずれ = 実測した映像のヒットのコマ − 曲のアクセントのコマ(許容 ±1、目標 0〜1)。", "",
     "## 映像のヒットと曲のアクセント", "| 台帳のコマ | 事象 | 実測のコマ | アクセントのコマ | ずれ | 強さ | 判定 | 測った値 |", "|---|---|---|---|---|---|---|---|"]
for r in rows: L.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]:+d} | {r[5]:.2f} | {'OK' if r[6] else '要確認'} | {r[7]:.2f} |")
L += ["", f"測れた {len(rows)} 件、±1 を超えた {bad} 件。測っていない事象: 224(灯りの吸い込み、明るさの変化が連続)・253 以外の小さな粒・467(いちばん暗い所。暗くなる流れの底)・696(差し出す姿勢、ゆっくり)。", "",
      "## 効果音の頂点(最終 mp4 の音。目標 = 絵のコマの1コマ後。723 は依頼の 24.133 秒)", "| 効果音 | 絵のコマ | 目標の時刻(s) | 実測の頂点(s) | 差(ms) | 絵のコマからの遅れ(コマ) |", "|---|---|---|---|---|---|"]
for r in srows: L.append(f"| {r[0]} | {r[1]} | {r[2]:.4f} | {r[3]:.4f} | {r[4]:+.1f} | {r[5]:+.2f} |")
L += ["", "注: 効果音の頂点は帯域の包絡の最大で、聞こえ始め(立ち上がり)とは違う。AI は音を聴けないので、聞こえ方は人が確認する。"]
open(out, "w", encoding="utf-8").write("\n".join(L) + "\n"); print("\n".join(L))
