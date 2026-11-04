#!/usr/bin/env python3
"""曲の調を推定する(汎用): ffmpeg で mono 22.05kHz に落とし、STFT から 12 音のクロマを集計し、Krumhansl-Schmuckler の長調/短調の型との相関で調を推定する。
結果は「推定」(確実ではない)。区間ごと(0〜7.5 / 7.5〜20.5 / 20.5〜30 秒)でも出す。使い方: python3 -I estimate_key.py <曲.mp3>"""
import sys, subprocess, numpy as np
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
sr = 22050
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
def chroma(seg):
    n = 8192; hop = 4096; win = np.hanning(n); C = np.zeros(12)
    freqs = np.fft.rfftfreq(n, 1 / sr); ok = (freqs > 60) & (freqs < 2000); pc = (np.round(12 * np.log2(freqs[ok] / 440.0)) + 9) % 12
    for i in range(0, len(seg) - n, hop):
        m = np.abs(np.fft.rfft(seg[i:i + n] * win))[ok] ** 2
        for k in range(12): C[k] += m[pc == k].sum()
    return C / (C.sum() + 1e-12)
def key(C):
    best = []
    for tonic in range(12):
        for nm, prof in (("major", MAJ), ("minor", MIN)):
            best.append((np.corrcoef(C, np.roll(prof, tonic))[0, 1], NAMES[tonic] + " " + nm))
    best.sort(reverse=True); return best[:3]
for a, b in ((0, 30), (0, 7.5), (7.5, 20.5), (20.5, 30)):
    C = chroma(x[int(a * sr):int(b * sr)]); print(f"{a}-{b}s", [(f"{r:.3f}", k) for r, k in key(C)], "chroma", " ".join(f"{NAMES[i]}:{C[i]:.2f}" for i in np.argsort(-C)[:5]))
