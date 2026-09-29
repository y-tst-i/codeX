"""ISLAND 7 動画用の音源合成ライブラリ（数式合成のみ・外部音源なし）。

island7-opening/gen_bgm.py の楽器定義を共通化したもの。
"""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, fc, o=2):
    return signal.sosfilt(signal.butter(o, min(fc, SR * .45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, o=2):
    return signal.sosfilt(signal.butter(o, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2):
    return signal.sosfilt(signal.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(d * SR)).astype(np.float64)
def saw_f(freq_arr):  # 周波数配列から位相積分した鋸波
    ph = np.cumsum(freq_arr) / SR
    return 2 * (ph - np.floor(ph + .5))
def saw(f, d, det=0.0, ph=None):
    t = tt(d); p = (f * 2 ** (det / 1200) * t + (rng.random() if ph is None else ph)) % 1
    return 2 * p - 1
def sine_sweep(f0, f1, d, k=12.0):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * k)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def adsr(d, a=.01, rel=.1, total=None):
    n = int(d * SR); e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(rel * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e

# ---- 楽器 ----
def taiko(p=1.0, d=1.4):
    t = tt(d)
    body = sine_sweep(150 * p, 52 * p, d, 14) * np.exp(-t * 5.5)
    body += .35 * sine_sweep(260 * p, 120 * p, d, 20) * np.exp(-t * 11)
    slap = lp(noise(d), 1400) * np.exp(-t * 32) * 1.2
    return np.tanh(1.6 * (body + slap))

def sub(d=1.2, f0=70, f1=32):
    t = tt(d); return sine_sweep(f0, f1, d, 5) * np.exp(-t * 2.6)

def snare(d=.35):
    t = tt(d)
    return bp(noise(d), 1200, 6000) * np.exp(-t * 18) * .9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28) * .6

def braam(root=45, d=3.6, chord=(0, 7, 12), bright=1.0, short=False):
    """映画予告の『ヴォーン』。デチューン鋸波 → フィルタ開閉 → 歪み。"""
    t = tt(d); x = np.zeros_like(t)
    for iv in chord:
        f = hz(root + iv)
        for dt in (-14, -5, 5, 14):
            x += saw(f, d, dt)
    x /= len(chord) * 4
    env_f = np.clip(t / .09, 0, 1) * np.exp(-t * (3.0 if short else .9))
    cuts = [180, 550, 1400, 3600 * bright]
    layers = [lp(x, c, 2) for c in cuts]
    pos = env_f * (len(cuts) - 1)
    y = np.zeros_like(t)
    for i, L in enumerate(layers):
        w = np.clip(1 - np.abs(pos - i), 0, 1)
        y += L * w
    amp = np.clip(t / .025, 0, 1) * np.exp(-t * (4.0 if short else .75))
    y = np.tanh(2.4 * y * amp)
    y += .6 * np.sin(2 * np.pi * hz(root - 12) * t) * amp
    return y

def spic(m, d=.16):
    """ストリングスのスピッカート（刻み）。"""
    t = tt(d); x = sum(saw(hz(m), d, dt) for dt in (-9, 0, 9)) / 3
    x += .5 * sum(saw(hz(m + 12), d, dt) for dt in (-6, 6)) / 2
    return lp(x, 3200) * np.exp(-t * 16) * np.clip(t / .004, 0, 1)

def pad(notes, d, a=1.2, rel=1.5, fc=1400, choir=False):
    t = tt(d); x = np.zeros_like(t)
    vib = 1 + .003 * np.sin(2 * np.pi * 5.2 * t)
    for m in notes:
        for dt in (-12, -4, 4, 12):
            x += saw_f(hz(m) * 2 ** (dt / 1200) * vib)
    x /= len(notes) * 4
    y = lp(x, fc)
    if choir:
        y = bp(y, 550, 850) * 1.6 + bp(y, 1000, 1300) * 1.0 + y * .3
    e = np.minimum(np.clip(t / a, 0, 1), np.clip((d - t) / rel, 0, 1))
    return y * e

def bell(m, d=2.5):
    t = tt(d)
    return sum(np.sin(2 * np.pi * hz(m) * k * t) * np.exp(-t * (1.6 + k * 1.3)) / k for k in (1, 2.01, 3.02, 4.2))

def tick(f=3000, d=.05):
    t = tt(d); return hp(noise(d), f) * np.exp(-t * 180) + np.sin(2 * np.pi * f * .6 * t) * np.exp(-t * 90) * .5

def crash(d=2.5):
    t = tt(d); return hp(noise(d), 3500) * np.exp(-t * 1.8) * .7

def rev_swell(d=1.0, fc=3000):
    t = tt(d); e = (t / d) ** 3
    return hp(noise(d), fc) * e * .9

def riser(d, f0=150, f1=2400):
    t = tt(d); k = t / d
    f = f0 * (f1 / f0) ** k
    x = lp(saw_f(f), 5000) * .4
    nz = bp(noise(d), 800, 9000) * .5
    return (x + nz * k) * k ** 2.2

def thunder(d=2.2):
    t = tt(d)
    crack = hp(noise(d), 1800) * np.exp(-t * 14) * 1.1
    roll = lp(noise(d), 220, 4) * (np.exp(-t * 1.4) * (1 + .6 * np.sin(2 * np.pi * 3.3 * t))) * 5
    return crack + roll

def heartbeat():
    return np.concatenate([sub(.28, 75, 40) * 1.0, np.zeros(int(.02 * SR)), sub(.5, 70, 38) * .75])

def blip(m, d=.18):
    t = tt(d); return np.sin(2 * np.pi * hz(m) * t * (1 + t * 2)) * np.exp(-t * 22)

def shimmer(d):
    t = tt(d); x = np.zeros_like(t)
    for m in (81, 88, 93, 96, 100):
        x += np.sin(2 * np.pi * hz(m) * t + rng.random() * 6) * (.6 + .4 * np.sin(2 * np.pi * (.3 + rng.random() * .5) * t))
    e = np.minimum(np.clip(t / .5, 0, 1), np.clip((d - t) / .5, 0, 1))
    return x / 5 * e

def power_down(d=1.2):
    t = tt(d); f = 400 * np.exp(-t * 3) + 25
    return lp(saw_f(f), 1500) * np.exp(-t * 1.2) * .8

# ---- 和声 ----
PROG = [(45, (57, 60, 64)), (41, (53, 57, 60)), (48, (55, 60, 64)), (43, (55, 59, 62))]  # Am F C G
OST = [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2]
