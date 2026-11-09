#!/usr/bin/env python3
"""歌を強調した音声を作る(汎用。文字起こしの裏取り用。分離の精度は低いが、中央の調波成分だけを残す)。
中央成分 |M|-|S| → 調波のマスク → 300〜5000Hz → M の位相で戻す。
使い方: python3 -I vocal_isolate.py <音声> <出力.wav> [サンプリング 16000]
"""
import subprocess, sys
import numpy as np
from scipy import ndimage, signal
from scipy.io import wavfile

src, dst = sys.argv[1:3]; SR = int(sys.argv[3]) if len(sys.argv) > 3 else 16000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
N = 1024 if SR <= 16000 else 2048; HOP = N // 4
f, t, ZM = signal.stft((x[:, 0] + x[:, 1]) / 2, fs=SR, nperseg=N, noverlap=N - HOP)
_, _, ZS = signal.stft((x[:, 0] - x[:, 1]) / 2, fs=SR, nperseg=N, noverlap=N - HOP)
M, S = np.abs(ZM), np.abs(ZS)
C = np.maximum(M - S, 0)
H = ndimage.median_filter(C, size=(1, 17)); P = ndimage.median_filter(C, size=(17, 1))
mask = (H ** 2 / (H ** 2 + P ** 2 + 1e-12)) * (C / (M + 1e-12))
mask *= ((f >= 300) & (f <= 5000))[:, None]
_, y = signal.istft(ZM * mask, fs=SR, nperseg=N, noverlap=N - HOP)
y = y[: len(x)]; y = y / (np.abs(y).max() + 1e-9) * 0.9
wavfile.write(dst, SR, (y * 32767).astype(np.int16))
print(dst, len(y) / SR, "s")
