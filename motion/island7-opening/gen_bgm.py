"""ISLAND 7 オープニング用 BGM/SE を合成して bgm.mp3 に書き出す。

外部音源は使わず、全て数式で合成（著作権フリー）。
映像側 index.html のタイムライン（秒）と同じ時刻表で組んでいる。

  pip install numpy scipy lameenc
  python3 gen_bgm.py            # -> bgm.mp3
"""
import numpy as np
from scipy import signal
import lameenc, os

SR = 44100
DUR = 75.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

# ---- バス（ステレオ）----
def bus(): return np.zeros((2, N), np.float32)
music_dry, music_send = bus(), bus()   # 曲（ダッキング対象）
fx_dry, fx_send = bus(), bus()         # 効果音
eye_dry, eye_send = bus(), bus()       # 台風の目（ダッキングしない）

def put(b, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or len(sig) == 0: return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    b[0, i:i + len(sig)] += sig * l * 1.4142
    b[1, i:i + len(sig)] += sig * r * 1.4142

def M(t, sig, g=1.0, pan=0.0, rev=0.3):
    put(music_dry, t, sig, g, pan); put(music_send, t, sig, g * rev, pan)

def F(t, sig, g=1.0, pan=0.0, rev=0.3):
    put(fx_dry, t, sig, g, pan); put(fx_send, t, sig, g * rev, pan)

# ---- 基本部品 ----
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

def ostinato(t0, t1, v, bar_start=0):
    """16分音符の刻み（2秒=1小節, 120BPM）。"""
    k = 0
    t = t0
    while t < t1 - 1e-6:
        bar = int((t - t0) / 2 + 1e-6) + bar_start
        root, ch = PROG[bar % 4]
        m = ch[OST[k % 16]] + (12 if k % 16 in (6, 14) else 0)
        acc = 1.0 if k % 4 == 0 else .72
        M(t, spic(m), v * acc, pan=-.25 if k % 2 else .25, rev=.28)
        M(t, spic(m - 12), v * .45 * acc, rev=.2)
        k += 1; t = t0 + k * .125

def taiko_bar(t, v, pat=(1, 0, 0, 1, 0, 0, 1, 0), fill=False):
    for i, a in enumerate(pat):
        if a: M(t + i * .25, taiko(1.0 if i % 4 == 0 else 1.25), v * (1 if i == 0 else .75), pan=(-.3 if i % 2 else .3), rev=.35)
    if fill:
        for j, x in enumerate((1.5, 1.625, 1.75, 1.875)):
            M(t + x, taiko(1.5), v * (.45 + j * .12), pan=.4 - j * .25, rev=.3)

# =====================================================================
# タイムライン（index.html と同じ秒数）
# =====================================================================
# --- 0.0–7.6 コールドオープン：最終台風のフラッシュカット ---
M(0.0, pad((33, 40, 45), 3.7, a=.05, rel=.2, fc=260), .9, rev=.2)
for i, x in enumerate((0.0, 1.0, 2.0)):
    F(x, thunder(), .75, pan=(-.4, .4, 0)[i], rev=.5)
    M(x, taiko(.8), 1.0, rev=.4); M(x, sub(1.0), .9, rev=.1)
    M(x, braam(45 + (0, 1, 3)[i], .9, short=True), .5, rev=.4)
F(2.7, rev_swell(.9, 1500), .8, rev=.2)
M(2.7, riser(.9, 120, 900), .5, rev=.2)
M(3.6, braam(33, 4.2, chord=(0, 7, 12, 15)), 1.25, rev=.55)
M(3.6, sub(2.5, 60, 28), 1.0, rev=.1); F(3.6, crash(3.0), .5, rev=.6)
# 4.4 「7日前」：時計の音
for k in range(19):
    x = 4.4 + k * .5
    F(x, tick(3400 if k % 2 == 0 else 2200), .22 if x < 8 else .16, pan=(.15 if k % 2 else -.15), rev=.25)
F(4.4, bell(69, 3.5), .28, rev=.6)

# --- 7.6–14 穏やかな島（雲を抜けて降下）---
M(7.6, pad((57, 64, 69, 71), 6.8, a=1.4, rel=1.2, fc=1800), .5, rev=.6)
M(7.6, rev_swell(1.8, 600) * .5, .8, rev=.4)
for x, m in ((8.4, 76), (9.4, 81), (10.4, 83), (10.9, 84), (11.9, 83), (12.4, 79), (13.1, 76)):
    M(x, bell(m), .22, pan=(-.3 if m % 2 else .3), rev=.6)

# --- 14–18 警報 → 嵐の予告 ---
F(14.0, blip(79, .3), .35, rev=.3); F(14.3, blip(79, .3), .35, rev=.3)
M(14.0, sub(1.2, 90, 35), .8, rev=.2)
M(14.0, pad((45, 52, 57, 58), 2.0, a=1.5, rel=.1, fc=900), .45, rev=.4)
F(14.6, riser(1.4, 200, 1600), .4, rev=.3)
M(15.0, taiko(.9), .8, rev=.4)
M(16.0, braam(45, 3.2, chord=(0, 7, 12, 13)), 1.15, rev=.5)
M(16.0, sub(2.0, 60, 30), .9); F(16.0, crash(2.4), .45, rev=.5)

# --- 18–40 ビルドアップ（120BPM, 1小節=2秒）---
ostinato(18.0, 22.0, .38)
for b in (18, 20): M(b, taiko(1.0), .7, rev=.4)
ostinato(22.0, 38.0, .55, bar_start=2)
for i, b in enumerate(range(22, 38, 2)):
    taiko_bar(b, .75 + i * .03, fill=(b in (28, 34)))
for i, b in enumerate(range(18, 40, 2)):
    root, ch = PROG[i % 4]
    M(b, pad(ch, 2.05, a=.2, rel=.2, fc=1100 + i * 90, choir=(b >= 30)), .38 + i * .012, rev=.5)
    M(b, braam(root, 1.9, chord=(0, 12), bright=.6), .35 + (.2 if b >= 30 else 0), rev=.3)
# 4つの力：スタブ
for x in (23.0, 24.5, 26.0, 27.5):
    M(x, braam(45, .9, short=True), .7, rev=.4); M(x, taiko(.9), .9, rev=.4); F(x, crash(.8), .15, rev=.3)
M(29.0, braam(45, 1.2, chord=(0, 7, 12, 16), short=True), .9, rev=.5); F(29.0, crash(1.8), .35, rev=.5)
# 動詞モンタージュ（毎秒ヒット）
for i, x in enumerate((30.0, 31.0, 32.0, 33.0, 34.0)):
    M(x, taiko(.85), 1.0, rev=.4); M(x, braam(45 + (0, -4, 3, -2, 0)[i], .7, short=True), .65, rev=.35)
    M(x, sub(.6, 80, 40), .5)
# DAY 1→6 カウンター
for i in range(6):
    x = 35.0 + i * .5
    M(x, snare(), .45 + i * .08, pan=(-.3 if i % 2 else .3), rev=.35); M(x, taiko(1.3 + i * .08), .5 + i * .07, rev=.3)
    F(x, tick(2600 + i * 250), .2, rev=.2)
M(38.0, riser(2.0, 120, 3000), .75, rev=.3); F(38.0, rev_swell(2.0, 2500), .6, rev=.3)
for j in range(8): M(38.0 + j * .25, snare(), .2 + j * .06, rev=.3)

# --- 40–48 ブレイク：全部はできない ---
M(40.0, sub(2.6, 55, 26), 1.1); M(40.0, braam(33, 2.4, chord=(0, 12)), .7, rev=.6)
M(40.0, pad((81, 84, 88), 8.0, a=.8, rel=.8, fc=5000), .18, rev=.7)
for k in range(5): M(40.8 + k * 1.2, heartbeat(), .75 - (0 if k < 3 else .2), rev=.1)
for k in range(16): F(40.0 + k * .5, tick(3000 if k % 2 == 0 else 2000), .09, rev=.2)
for i, x in enumerate((42.5, 43.0, 43.5)): F(x, blip(64 - i * 3, .25), .35, rev=.3)
F(43.5, blip(52, .5) * .8, .35, rev=.3)
M(44.0, braam(44, 2.2, chord=(0, 6, 12)), 1.0, rev=.6); M(44.0, taiko(.8), 1.0, rev=.4)
F(44.0, crash(2.0), .35, rev=.5); M(44.0, sub(1.4, 70, 30), .9)
for i, x in enumerate((45.3, 45.7, 46.1, 46.5)): F(x, blip(72 + i * 2), .35, pan=(-.5, .5, -.2, .2)[i], rev=.35)
M(47.0, taiko(1.0), 1.0, rev=.4); M(47.25, taiko(1.2), .8, rev=.4)
M(47.0, braam(45, .9, short=True), .7, rev=.4)

# --- 48–51.75 ライザー（DAY 7 へ）---
M(48.0, riser(3.75, 90, 4200), .95, rev=.3); F(48.0, rev_swell(3.75, 2000), .7, rev=.3)
M(48.0, pad((45, 52, 57, 60, 64), 3.8, a=3.0, rel=.05, fc=2600, choir=True), .5, rev=.4)
x, st = 48.0, .5
while x < 51.7:
    M(x, snare(), .25 + (x - 48) * .14, pan=np.sin(x * 7) * .4, rev=.3)
    if st >= .25: M(x, taiko(1.1), .5 + (x - 48) * .1, rev=.3)
    st = .5 if x < 49.5 else .25 if x < 50.75 else .125 if x < 51.3 else .0625
    x += st

# --- 52–64 クライマックス：最終台風 ---
def storm_bar(b, root, ch, v=1.0, braam_on=True):
    ostinato(b, b + 2, .6 * v, bar_start=PROG.index((root, ch)))
    taiko_bar(b, .95 * v, pat=(1, 0, 1, 1, 0, 1, 1, 1), fill=True)
    for j in range(8): M(b + j * .25 + .125, snare(.2) * .4, .3 * v, rev=.2)
    M(b, pad(ch + (ch[0] + 12,), 2.05, a=.05, rel=.2, fc=2200, choir=True), .45 * v, rev=.5)
    if braam_on: M(b, braam(root, 2.0, chord=(0, 7, 12)), .85 * v, rev=.45)
    M(b, sub(1.0, 60, 32), .8 * v)

M(52.0, braam(33, 3.0, chord=(0, 7, 12, 15)), 1.3, rev=.55); M(52.0, sub(2.0, 60, 26), 1.1)
F(52.0, crash(3.0), .6, rev=.6); F(52.0, thunder(), .8, rev=.5)
storm_bar(52.0, *PROG[0], v=.85, braam_on=False)
storm_bar(54.0, *PROG[1])
F(53.5, lp(noise(2.5), 3000) * np.exp(-tt(2.5) * 1.2) * .5, .6, rev=.3)   # 大雨の一撃（短く）
F(54.75, thunder(1.8), .7, pan=.3, rev=.4); M(54.75, taiko(.7), 1.0, rev=.5)       # ルート崩壊
F(55.0, lp(noise(1.2), 400, 4) * np.exp(-tt(1.2) * 3) * 4, .8, rev=.3)
# 56–58 台風の目：無音に近い
for sg, g_, rv in ((shimmer(2.0), .36, .8), (bell(81, 2.2), .22, .8)):
    put(eye_dry, 56.0, sg, g_); put(eye_send, 56.0, sg, g_ * rv)
sg = rev_swell(.8, 2000); put(eye_dry, 57.2, sg, .7); put(eye_send, 57.2, sg, .14)
# 58 再突入
M(58.0, braam(33, 2.6, chord=(0, 7, 12, 15)), 1.3, rev=.5); F(58.0, crash(2.4), .55, rev=.5); F(58.0, thunder(), .7, pan=-.3, rev=.5)
storm_bar(58.0, *PROG[2], braam_on=False)
storm_bar(60.0, *PROG[3], v=1.05)
F(60.0, power_down(1.4), .9, rev=.3); F(60.0, thunder(1.4), .5, rev=.4)            # 停電
storm_bar(62.0, *PROG[0], v=1.1)
for j in range(16): M(62.0 + j * .125, taiko(1.3), .4 + j * .03, pan=np.sin(j) * .5, rev=.3)
M(63.0, riser(1.0, 300, 5000), .6, rev=.2)

# --- 64–75 タイトル ---
M(64.6, braam(33, 5.5, chord=(0, 7, 12, 16, 19)), 1.35, rev=.65)   # A メジャーで解決
M(64.6, sub(3.0, 55, 25), 1.2); M(64.6, taiko(.75), 1.0, rev=.6); F(64.6, crash(4.0), .6, rev=.7)
M(64.6, pad((57, 61, 64, 69, 73, 76), 9.5, a=.4, rel=3.0, fc=3200, choir=True), .38, rev=.7)
F(64.9, shimmer(6.0), .35, rev=.8)
for i, (x, m) in enumerate(((66.0, 81), (66.8, 85), (67.4, 88))):
    F(x, bell(m, 3.0), .22, pan=(-.3, .3, 0)[i], rev=.7)
for i, x in enumerate((68.5, 69.5, 70.5)):
    M(x, taiko(1.0 + i * .12), .7 + i * .1, rev=.4); F(x, tick(2400, .08), .35, rev=.3)
M(71.5, braam(45, 3.0, chord=(0, 4, 7, 12)), 1.1, rev=.6); M(71.5, taiko(.8), 1.0, rev=.5)
M(71.5, sub(2.0, 60, 28), 1.0); F(71.5, crash(3.0), .5, rev=.6)
F(71.5, bell(93, 3.0), .2, rev=.7)

# =====================================================================
# リバーブ・ミックス・マスタリング
# =====================================================================
def make_ir(d=2.8):
    t = tt(d); ir = np.zeros((2, len(t)))
    for c in range(2):
        n = rng.standard_normal(len(t)) * np.exp(-t * 2.3)
        n = lp(n, 6000) * .6 + lp(n, 1800) * .4
        n[: int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
        ir[c] = n
    return ir / np.sqrt((ir ** 2).sum() / 2)

IR = make_ir()
def reverb(send):
    return np.stack([signal.fftconvolve(send[c], IR[c])[:N] for c in range(2)]) * .55

music = music_dry + reverb(music_send)
fx = fx_dry + reverb(fx_send)

# ダッキング（台風の目・ブレイク直前の無音）
def auto(points):
    xs, ys = zip(*points); return np.interp(np.arange(N) / SR, xs, ys)
duck = auto([(0, 1), (51.70, 1), (51.74, 0), (51.98, 0), (52.0, 1), (55.9, 1), (56.0, .04), (57.85, .04), (58.0, 1),
             (63.95, 1), (64.0, 0), (64.58, 0), (64.6, 1), (75, 1)])
gate = auto([(0, 1), (51.70, 1), (51.74, .0), (51.98, 0), (52.0, 1), (63.95, 1), (64.0, 0), (64.58, 0), (64.6, 1), (75, 1)])
eyeb = eye_dry + reverb(eye_send)
mix = ((music + fx * .9) * duck + eyeb) * gate

# 低域カット・グルーコンプ・リミッター
mix = np.stack([hp(mix[c], 28) for c in range(2)])
lvl = np.abs(mix).max(0)
env = signal.sosfilt(signal.butter(1, 6, 'low', fs=SR, output='sos'), lvl)
env = np.maximum(env, 1e-6); thr = np.percentile(env, 70)
gain = np.minimum(1, (thr / env) ** .45)
mix = mix * gain
fade = auto([(0, 1), (DUR - 1.2, 1), (DUR, 0)])
mix *= fade
mix = mix / np.abs(mix).max() * 1.35
mix = np.tanh(mix) / np.tanh(1.35) * .93   # ソフトクリップで -0.6dBFS 付近

pcm = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
enc = lameenc.Encoder(); enc.set_bit_rate(192); enc.set_in_sample_rate(SR); enc.set_channels(2); enc.set_quality(2)
data = enc.encode(pcm.tobytes()) + enc.flush()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bgm.mp3')
open(out, 'wb').write(data)

# 区間ごとの音量（確認用）
rms = lambda a, b: 20 * np.log10(np.sqrt((mix[:, int(a * SR):int(b * SR)] ** 2).mean()) + 1e-9)
print(f"wrote {out} {len(data)/1e6:.2f}MB")
print(" ".join(f"{s}:{rms(s, s + 4):.0f}" for s in range(0, 75, 4)))
