"""ISLAND 7 ルール説明動画の BGM/SE を合成して bgm.mp3 に書き出す。

オープニングと同じ主題（Am-F-C-G・ベルのモチーフ）を、説明向けに落ち着かせたアレンジ。
96BPM（1小節 = 2.5 秒）。章の区切りは index.html の CH と同じ秒数。

  pip install numpy scipy lameenc
  python3 gen_bgm.py            # -> bgm.mp3
"""
import os, sys
import numpy as np
from scipy import signal
import lameenc

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'audio'))
from synth_lib import *  # noqa: F401,F403  (SR, rng, tt, hz, lp, hp, bp, noise, 各楽器, PROG, OST)

DUR = 125.0
N = int(SR * DUR)
BAR, S16 = 2.5, 2.5 / 16

def bus(): return np.zeros((2, N), np.float32)
music_dry, music_send = bus(), bus()
fx_dry, fx_send = bus(), bus()

def put(b, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or len(sig) == 0: return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    b[0, i:i + len(sig)] += sig * l * 1.4142
    b[1, i:i + len(sig)] += sig * r * 1.4142
def M(t, sig, g=1.0, pan=0.0, rev=0.3): put(music_dry, t, sig, g, pan); put(music_send, t, sig, g * rev, pan)
def F(t, sig, g=1.0, pan=0.0, rev=0.3): put(fx_dry, t, sig, g, pan); put(fx_send, t, sig, g * rev, pan)

# ---- 説明向けの軽い打楽器 ----
def kick(d=.32):
    t = tt(d); return sine_sweep(120, 44, d, 22) * np.exp(-t * 11)
def hat(d=.05):
    t = tt(d); return hp(noise(d), 8000) * np.exp(-t * 90)
def rim(d=.08):
    t = tt(d); return bp(noise(d), 1500, 4000) * np.exp(-t * 60) * .7 + np.sin(2 * np.pi * 820 * t) * np.exp(-t * 70) * .5
def pluck(m, d=.5):
    t = tt(d); x = sum(saw(hz(m), d, dt) for dt in (-6, 6)) / 2
    return lp(x, 2600) * np.exp(-t * 7) * np.clip(t / .003, 0, 1)
def swoosh(d=.6):
    t = tt(d); k = t / d; return bp(noise(d), 500, 7000) * np.sin(np.pi * k) ** 2 * .6
def down(d=.24):
    t = tt(d); f = 700 * np.exp(-t * 4.5) + 200
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * .8
def beep(f=220, d=.15):
    t = tt(d); return lp(np.sign(np.sin(2 * np.pi * f * t)), 1600) * np.clip((d - t) / .02, 0, 1) * .5
def up(m=76):
    return np.concatenate([blip(m, .09) * .8, blip(m + 7, .16)])

THEME = [(0, 76), (1.0, 81), (2.0, 83), (2.5, 84), (3.5, 83), (4.0, 79), (5.0, 76)]  # オープニングのベルの旋律

def section(t0, t1, v_ost=0, v_kick=0, v_hat=0, v_pad=.3, v_pluck=0, choir=False, rim_on=False):
    """1 章ぶんの伴奏。拍子は 2.5 秒/小節で固定。"""
    nb = int(round((t1 - t0) / BAR))
    for b in range(nb):
        bt = t0 + b * BAR
        root, ch = PROG[b % 4]
        if v_pad: M(bt, pad(ch, BAR + .05, a=.25, rel=.25, fc=1300, choir=choir), v_pad, rev=.55)
        if v_pad: M(bt, pad((root,), BAR + .05, a=.05, rel=.2, fc=260), v_pad * 1.2, rev=.1)
        for k in range(16):
            x = bt + k * S16
            if v_ost:
                m = ch[OST[k]] + (12 if k in (6, 14) else 0)
                M(x, spic(m, .14), v_ost * (1 if k % 4 == 0 else .7), pan=(.25 if k % 2 else -.25), rev=.3)
            if v_kick and k % 4 == 0: M(x, kick(), v_kick * (1 if k % 8 == 0 else .75), rev=.08)
            if v_hat and k % 4 == 2: M(x, hat(), v_hat, pan=.2, rev=.1)
            if rim_on and k in (4, 12): M(x, rim(), .22, pan=-.2, rev=.25)
            if v_pluck and k % 2 == 0:
                m = ch[[0, 2, 1, 2, 0, 1, 2, 1][(k // 2) % 8]] + 12
                M(x, pluck(m), v_pluck, pan=(-.35 if k % 4 else .35), rev=.4)

def theme(t0, g=.2, oct=0):
    for dt, m in THEME: M(t0 + dt * (BAR / 4), bell(m + oct, 2.6), g, pan=(-.25 if m % 2 else .25), rev=.6)

def chapter_hit(t, g=.6):
    M(t, sub(1.0, 70, 34), g); F(t - .55, swoosh(.6), .5, rev=.3); M(t, taiko(.9), g * .8, rev=.4)

# =====================================================================
# タイムライン（index.html の CH / 各シーンと同じ秒数）
# =====================================================================
# 0–7.5 イントロ
section(0, 7.5, v_pad=.32)
theme(.4, .22)
M(.5, braam(33, 3.5, chord=(0, 7, 12)), .55, rev=.6); M(.5, sub(2.0, 60, 28), .8)
F(4.2, swoosh(.5), .4); M(4.2, bell(88, 2), .15, rev=.6)
M(5.8, riser(1.7, 150, 2200), .35, rev=.3)

# 7.5–20 MISSION
chapter_hit(7.5)
section(7.5, 20, v_ost=.18, v_kick=.35, v_pad=.3, v_pluck=0)
for i in range(4): F(8.9 + i * .3, blip(72 + i * 2), .22, pan=-.4, rev=.3)
for i in range(4): F(10.3 + i * .3, blip(76 + i * 2), .22, pan=.4, rev=.3)
for i in range(7): F(15.2 + i * .5, blip(69 + [0, 2, 3, 5, 7, 8, 12][i], .2), .25, rev=.35)
M(18.2, braam(45, 1.2, short=True), .35, rev=.5)

# 20–42.5 4つの力
chapter_hit(20)
section(20, 22.5, v_ost=.2, v_kick=.4, v_pad=.3)
for i in range(4): F(20.6 + i * .35, blip(69 + i * 3, .25), .26, rev=.35)
section(22.5, 42.5, v_ost=.26, v_kick=.45, v_hat=.05, v_pad=.3, choir=True, rim_on=True)
for i, x in enumerate((22.5, 27.5, 32.5, 37.5)):
    M(x, braam(45 + (0, -4, 3, -2)[i], .8, short=True), .45, rev=.45); M(x, taiko(.9), .6, rev=.4)
    M(x + .1, bell((81, 84, 88, 86)[i], 2.2), .16, rev=.6)
    for d in (1.5, 2.7): F(x + d, up(76 + i * 2), .22, rev=.35)

# 42.5–67.5 行動
chapter_hit(42.5)
section(42.5, 67.5, v_ost=.2, v_kick=.5, v_hat=.06, v_pad=.26, v_pluck=.08, rim_on=True)
F(44.95, down(), .32); F(46.45, down(), .32)                      # ACTION トークン消費
F(49.2, blip(84, .2), .3); [F(49.9 + k * .22, blip(79 + k * 3, .12), .25) for k in range(3)]   # 資材 +3
F(53.1, swoosh(.4), .4); F(53.4, swoosh(.4), .4, pan=.3); F(55.0, blip(88, .25), .3); F(55.8, swoosh(.5), .35)
F(59.5, swoosh(.6), .35); M(60.3, braam(45, .9, short=True), .55, rev=.5); M(60.3, taiko(.9), .8, rev=.5); F(60.5, up(79), .3)
[F(63.8 + k * .3, blip(76, .1), .25) for k in range(2)]; F(64.6, up(81), .3)

# 67.5–82.5 全部はできない → 何を優先する？
chapter_hit(67.5, .7)
section(67.5, 75, v_pad=.22)                                      # ブレイク（ドラム無し）
for k in range(12): F(67.5 + k * .625, tick(3000 if k % 2 == 0 else 2100), .1, rev=.2)
for i, x in enumerate((69.0, 70.2, 71.4)): F(x, down(), .3); F(x + .1, up(72 + i * 3), .2)
F(72.4, beep(), .5); F(72.7, beep(), .5)
M(73.0, braam(44, 2.0, chord=(0, 6, 12)), .6, rev=.6); M(73.0, sub(1.6, 70, 30), .8)
section(75, 82.5, v_ost=.22, v_kick=.4, v_pad=.3)
for x in (75.4, 76.3, 77.2, 78.1): F(x, tick(2600, .06), .25, rev=.2)
M(78.9, riser(1.4, 150, 2600), .45, rev=.3)
M(80.3, braam(45, 2.2, chord=(0, 7, 12, 15)), .8, rev=.6); M(80.3, taiko(.8), .9, rev=.5); F(80.3, crash(1.8), .3, rev=.5); M(80.3, sub(1.5, 70, 30), .9)

# 82.5–95 情報
chapter_hit(82.5)
section(82.5, 95, v_ost=.14, v_kick=.3, v_pad=.3, v_pluck=.06)
F(84.0, sub(.7, 90, 40), .5); F(85.4, sub(.7, 90, 40), .5)
for k in range(5): F(87 + k * .6, blip(84 + k * 2, .3), .22, rev=.5)
M(91.2, braam(45, 1.6, chord=(0, 7, 12, 16)), .6, rev=.6); M(91.2, taiko(.9), .7, rev=.5); theme(91.4, .14, 12)

# 95–105 チーム
chapter_hit(95)
section(95, 105, v_ost=.2, v_kick=.45, v_hat=.05, v_pad=.3, v_pluck=.09, rim_on=True)
for i, x in enumerate((95.6, 96.6, 97.6, 98.6)): F(x, blip(72 + i * 3, .2), .3, pan=(-.5, .5, -.2, .2)[i], rev=.35)
F(100.0, swoosh(.5), .4); M(100.5, bell(84, 2.5), .22, rev=.6); M(100.62, bell(88, 2.5), .18, rev=.6); M(100.5, taiko(.9), .6, rev=.5)

# 105–115 日が進む → DAY7
chapter_hit(105, .7)
section(105, 110, v_ost=.28, v_kick=.55, v_hat=.07, v_pad=.32, choir=True)
for i in range(6):
    x = 105.1 + i * .8
    M(x, snare(), .22 + i * .06, rev=.3); M(x, taiko(1.2 + i * .06), .35 + i * .06, rev=.3); F(x, tick(2400 + i * 200), .15)
M(108.6, riser(1.5, 120, 3000), .6, rev=.3)
M(110.1, braam(33, 3.0, chord=(0, 7, 12, 15)), 1.0, rev=.55); M(110.1, sub(2.0, 60, 26), 1.0); F(110.1, crash(2.5), .45, rev=.6)
F(110.1, thunder(), .5, rev=.5)
for x, i in ((110.8, 0), (111.6, 1), (113.2, 3), (114.0, 4)):
    M(x, taiko(.8), .9, rev=.4); M(x, braam(45 + (0, 1, 0, 3, -2)[i], .7, short=True), .5, rev=.4)
F(112.4, shimmer(.8), .3, rev=.8)                                  # 台風の目：一瞬の静けさ

# 115–120 まとめ
section(115, 120, v_pad=.28, v_pluck=.07)
M(115.0, pad((57, 61, 64, 69), 5.2, a=.6, rel=1.0, fc=2200, choir=True), .35, rev=.6)
for i, x in enumerate((115.3, 116.1, 116.9, 117.7, 118.5)): M(x, bell((76, 79, 81, 83, 88)[i], 2.0), .18, rev=.6)
M(118.9, riser(1.1, 200, 2600), .35, rev=.3)

# 120–125 タイトル
M(120.0, braam(33, 4.5, chord=(0, 7, 12, 16, 19)), 1.1, rev=.65); M(120.0, sub(2.5, 55, 25), 1.0); M(120.0, taiko(.75), .9, rev=.6)
F(120.0, crash(3.5), .45, rev=.7); F(120.2, shimmer(4.5), .25, rev=.8)
M(120.0, pad((57, 61, 64, 69, 73, 76), 5.0, a=.3, rel=2.0, fc=3000, choir=True), .3, rev=.7)
M(122.5, braam(45, 2.4, chord=(0, 4, 7, 12)), .7, rev=.6); M(122.5, taiko(.8), .8, rev=.5); F(122.5, bell(93, 2.4), .18, rev=.7)

# =====================================================================
# リバーブ・ミックス・マスタリング（オープニングと同じ処理）
# =====================================================================
def make_ir(d=2.6):
    t = tt(d); ir = np.zeros((2, len(t)))
    for c in range(2):
        n = rng.standard_normal(len(t)) * np.exp(-t * 2.5)
        n = lp(n, 6000) * .6 + lp(n, 1800) * .4
        n[: int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
        ir[c] = n
    return ir / np.sqrt((ir ** 2).sum() / 2)
IR = make_ir()
def reverb(send): return np.stack([signal.fftconvolve(send[c], IR[c])[:N] for c in range(2)]) * .55
def auto(points):
    xs, ys = zip(*points); return np.interp(np.arange(N) / SR, xs, ys)

music = music_dry + reverb(music_send)
fx = fx_dry + reverb(fx_send)
duck = auto([(0, 1), (112.3, 1), (112.4, .15), (113.1, .15), (113.2, 1), (114.75, 1), (114.8, 0), (115.0, 0), (115.2, 1), (125, 1)])
mix = music * duck + fx * .9 * np.minimum(1, duck + .6)
mix = np.stack([hp(mix[c], 28) for c in range(2)])
lvl = np.abs(mix).max(0)
env = np.maximum(signal.sosfilt(signal.butter(1, 6, 'low', fs=SR, output='sos'), lvl), 1e-6)
thr = np.percentile(env, 70)
mix = mix * np.minimum(1, (thr / env) ** .45)
mix *= auto([(0, 1), (DUR - 1.5, 1), (DUR, 0)])
mix = mix / np.abs(mix).max() * 1.3
mix = np.tanh(mix) / np.tanh(1.3) * .93

pcm = (np.clip(mix.T, -1, 1) * 32767).astype(np.int16)
enc = lameenc.Encoder(); enc.set_bit_rate(192); enc.set_in_sample_rate(SR); enc.set_channels(2); enc.set_quality(2)
data = enc.encode(pcm.tobytes()) + enc.flush()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bgm.mp3')
open(out, 'wb').write(data)
rms = lambda a, b: 20 * np.log10(np.sqrt((mix[:, int(a * SR):int(b * SR)] ** 2).mean()) + 1e-9)
print(f"wrote {out} {len(data)/1e6:.2f}MB")
print(" ".join(f"{s}:{rms(s, s + 5):.0f}" for s in range(0, 125, 5)))
