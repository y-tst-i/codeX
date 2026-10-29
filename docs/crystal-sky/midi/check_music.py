#!/usr/bin/env python3
"""M1/M2 の数値検査(長さ・無音区間・ラウドネス・真のピーク・10.000 秒の一撃の位置)。
AI は音を聴けないので、ここに出るのは測定値だけ。
usage: python3 check_music.py M1.wav [M2.wav ...]
"""
import re, subprocess, sys, wave
import numpy as np

HIT = 10.0

def load(path):
    w = wave.open(path)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768.0
    return x.reshape(-1, w.getnchannels()), w.getframerate()

def ebur128(path):
    r = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    g = lambda k: float(re.search(k + r":\s+(-?[\d.]+)", s).group(1))
    return g("I"), g("LRA"), g("Peak")

def db(v):
    return 20 * np.log10(v + 1e-12)

def check(path):
    x, sr = load(path)
    m = x.mean(1)
    print(f"== {path}")
    print(f"長さ {len(x) / sr:.3f} s ({len(x)} サンプル @ {sr} Hz)")
    I, LRA, TP = ebur128(path)
    print(f"統合ラウドネス {I:.1f} LUFS(目標 -14 前後) / LRA {LRA:.1f} LU / 真のピーク {TP:.1f} dBTP(≤ -1)")

    # 無音区間: 100 ms の窓を 10 ms ずつずらした RMS
    win, hop = int(0.1 * sr), int(0.01 * sr)
    sq = np.concatenate([[0], np.cumsum(m ** 2)])
    starts = np.arange(0, len(m) - win + 1, hop)
    rms = db(np.sqrt((sq[starts + win] - sq[starts]) / win))
    t = starts / sr
    med = np.median(rms)
    for lo, hi, label in [(0, 19.0, "0〜19.0 s(最後の余韻の尾を除く)"), (0, 20.0, "全体(0〜20 s)")]:
        sel = (t >= lo) & (t + 0.1 <= hi + 1e-9)
        k = np.argmin(rms[sel])
        print(f"RMS(100ms/10ms) {label}: 最小 {rms[sel][k]:.1f} dBFS @ {t[sel][k]:.2f} s、"
              f"中央値 {med:.1f} → 差 {rms[sel][k] - med:+.1f} dB(目安 -15 dB 以内)")
    for thr in (-15, -25, -40):
        below = t[rms < med + thr]
        print(f"  中央値{thr:+d} dB を下回る最初の時刻: " + (f"{below[0]:.2f} s" if len(below) else "なし"))
    sil = t[rms < -60]
    print(f"  -60 dBFS 未満の窓: {len(sil)} 個" + (f"(最初 {sil[0]:.2f} s)" if len(sil) else ""))

    # 10.000 秒の一撃: 10 ms 刻みの短い RMS(20 ms 窓)の立ち上がり(dB の増分)
    w2 = int(0.02 * sr)
    s2 = np.arange(0, len(m) - w2 + 1, hop)
    e = db(np.sqrt((sq[s2 + w2] - sq[s2]) / w2))
    te = (s2 + w2) / sr                                   # 窓の終わりの時刻
    rise = np.diff(e, prepend=e[0])
    big = np.argmax(rise)
    near = (te > HIT - 0.3) & (te < HIT + 0.3)
    kn = np.where(near)[0][np.argmax(rise[near])]
    print(f"立ち上がり(20ms RMS の増分)最大: {te[big]:.3f} s で +{rise[big]:.1f} dB / 10.0±0.3 s の最大: {te[kn]:.3f} s で +{rise[kn]:.1f} dB")
    # 振幅が初めて「一撃後 200 ms の最大値の半分」を超える時刻(頭の位置)
    i0, i1 = int((HIT - 0.1) * sr), int((HIT + 0.2) * sr)
    a = np.abs(m[i0:i1]); pk = a.max()
    onset = (i0 + np.argmax(a > 0.5 * pk)) / sr
    print(f"一撃の頭(10.0 s 付近で振幅が最大値の半分を超える時刻): {onset:.4f} s(ずれ {1000 * (onset - HIT):+.1f} ms)")
    pre = db(np.sqrt(np.mean(m[int(9.6 * sr):int(9.98 * sr)] ** 2)))
    post = db(np.sqrt(np.mean(m[int(10.0 * sr):int(10.38 * sr)] ** 2)))
    print(f"直前 9.60〜9.98 s の RMS {pre:.1f} dBFS → 直後 10.00〜10.38 s {post:.1f} dBFS(差 {post - pre:+.1f} dB)")
    # 小節ごとの RMS(曲の形の確認)
    print("小節ごとの RMS (dBFS): " + " ".join(
        f"{k + 1}:{db(np.sqrt(np.mean(m[int(k * 2.5 * sr):int((k + 1) * 2.5 * sr)] ** 2))):.1f}" for k in range(8)))
    # 0.5 秒ごとの RMS(最後の余韻の減り方)
    print("15〜20 s の 0.5 秒ごとの RMS: " + " ".join(
        f"{db(np.sqrt(np.mean(m[int(q * sr):int((q + 0.5) * sr)] ** 2))):.1f}" for q in np.arange(15, 20, 0.5)))
    print()

for p in sys.argv[1:]:
    check(p)
