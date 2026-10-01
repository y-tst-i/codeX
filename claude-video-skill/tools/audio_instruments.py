"""(第1話用に流用) 『レベル1なのに世界最強』30秒CM — 場面ごとに音の世界を変える完全合成サウンドトラック。
同梱SFX(impact-bass 等)は一部で重ねて使う。決定的(seed固定)。BPM150 / 1拍=0.4s。
"""
import numpy as np, wave, subprocess, sys, os

SR = 44100
DUR = 83.0
N = int(SR * (DUR + 2))
rng = np.random.default_rng(20261001)
SFX_DIR = "/root/.claude/skills/media-use/audio/assets/sfx"

DL = np.zeros(N); DR = np.zeros(N)      # dry bus
WL = np.zeros(N); WR = np.zeros(N)      # reverb send
BEAT = 0.4


# ------------------------------------------------------------------ plumbing
def mix(t, sig, g=1.0, pan=0.0, send=0.0):
    i = int(round(t * SR))
    if i < 0:
        sig = sig[-i:]; i = 0
    n = min(len(sig), N - i)
    if n <= 0:
        return
    s = sig[:n]
    gl = np.cos((pan + 1) * np.pi / 4); gr = np.sin((pan + 1) * np.pi / 4)
    DL[i:i + n] += s * g * gl; DR[i:i + n] += s * g * gr
    if send:
        WL[i:i + n] += s * g * send * gl; WR[i:i + n] += s * g * send * gr


def tt(d):
    return np.arange(int(SR * d)) / SR


def lp(x, k):
    return x if k <= 1 else np.convolve(x, np.ones(int(k)) / int(k), mode="same")


def hp(x, k=8):
    return x - lp(x, k)


def bp(x, lo, hi):
    return lp(hp(x, max(2, int(SR / max(lo, 1) / 2))), max(1, int(SR / hi)))


def nz(d):
    return rng.standard_normal(int(SR * d))


def env_ad(d, a=0.005, tau=0.2):
    t = tt(d)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / tau)


def sfx(name, gain=1.0, start=0.0, dur=None):
    p = os.path.join(SFX_DIR, name)
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True).stdout
    x = np.frombuffer(out, dtype=np.float32).astype(np.float64)
    x = x[int(start * SR):]
    if dur:
        x = x[:int(dur * SR)]
    return x * gain


def sine_sweep(f0, f1, d, curve=1.0):
    t = tt(d); p = (t / d) ** curve
    f = f0 + (f1 - f0) * p
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def reverb_ir(d=2.4, seed=5):
    r = np.random.default_rng(seed)
    t = np.arange(int(SR * d)) / SR
    ir = r.standard_normal(len(t)) * np.exp(-t / (d / 5.5))
    ir = lp(ir, 3) * (1 - np.exp(-t / 0.012))
    return ir / np.sqrt((ir ** 2).sum())


# ------------------------------------------------------------------ instruments
def kick(lv=1.0):
    t = tt(0.4)
    f = 46 + 120 * np.exp(-t / 0.025)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) + 0.4 * np.exp(-t / 0.003) * nz(0.4)) * lv


def snare(lv=1.0):
    t = tt(0.3)
    return (0.9 * hp(nz(0.3), 5) * np.exp(-t / 0.07) + 0.5 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.055)) * lv


def hat(lv=1.0, d=0.06):
    return hp(nz(d), 3) * np.exp(-tt(d) / 0.014) * lv


def tom(f=90, lv=1.0, d=0.6):
    t = tt(d)
    ff = f * (1 + 0.8 * np.exp(-t / 0.05))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / 0.22) * lv


def taiko(lv=1.0):
    t = tt(1.1)
    ff = 56 + 70 * np.exp(-t / 0.05)
    s = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / 0.4)
    s += 0.35 * lp(nz(1.1), 40) * np.exp(-t / 0.1)
    return s * lv


def sub_boom(lv=1.0, d=2.4, f0=30):
    t = tt(d)
    f = f0 + 40 * np.exp(-t / 0.35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9) * lv


def crash(lv=1.0, d=2.2):
    t = tt(d)
    return hp(nz(d), 4) * np.exp(-t / 0.6) * lv


def ks(f, d, decay=0.997, bright=0.45, lv=1.0):
    n = int(SR * d); L = max(2, int(SR / f))
    buf = rng.standard_normal(L)
    buf = lp(buf, 2) if bright < 0.5 else buf
    out = np.zeros(n)
    for i in range(n):
        j = i % L
        out[i] = buf[j]
        buf[j] = decay * 0.5 * (buf[j] + buf[(j + 1) % L])
    return out / (np.abs(out).max() + 1e-9) * lv


def saw(f, d, harm=12, det=0.0, ph=0.0):
    t = tt(d); s = np.zeros_like(t)
    for k in range(1, harm + 1):
        s += np.sin(2 * np.pi * f * (1 + det) * k * t + ph * k) / k
    return s


def pad(freqs, d, lv=1.0, att=0.6, rel=0.6, harm=8, trem=0.0):
    t = tt(d); s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.004):
            s += saw(f, d, harm, det, ph=rng.random())
    s = lp(s, 3)
    e = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (d - t)) / rel)
    if trem:
        e = e * (1 - 0.35 + 0.35 * np.sin(2 * np.pi * trem * t))
    return s * e * lv / (len(freqs) * 3)


def choir(f, d, lv=1.0, att=0.5, rel=0.5):
    t = tt(d); s = np.zeros_like(t)
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.2 * t)
    for det in (-0.006, 0.0, 0.006):
        for k in range(1, 40):
            fk = f * k
            if fk > 6000:
                break
            a = (np.exp(-((fk - 800) / 220) ** 2) + 0.7 * np.exp(-((fk - 1200) / 250) ** 2)
                 + 0.35 * np.exp(-((fk - 2900) / 400) ** 2))
            s += a * np.sin(2 * np.pi * fk * (1 + det) * vib * t + rng.random() * 6) / (k ** 0.3)
    e = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (d - t)) / rel)
    return s * e * lv / 12


def flute(f, d, lv=1.0, slide=0.0):
    t = tt(d)
    fr = f * (1 + slide * np.exp(-t / 0.12)) * (1 + 0.006 * np.sin(2 * np.pi * 5.0 * t) * np.minimum(1, t / 0.4))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    s += 0.35 * bp(nz(d), f * 0.9, f * 3) * 0.6
    e = np.minimum(1, t / 0.12) * np.minimum(1, np.maximum(0, (d - t)) / 0.35)
    return s * e * lv


def brass(freqs, d, lv=1.0, att=0.08, rel=0.3):
    t = tt(d); s = np.zeros_like(t)
    for f in freqs:
        s += saw(f, d, 14, 0.0)
    e = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (d - t)) / rel)
    return lp(s, 2) * e * lv / len(freqs)


def guitar(root, d=0.35, lv=1.0, mute=True):
    t = tt(d); s = np.zeros_like(t)
    for m in (1.0, 1.5, 2.0):
        s += saw(root * m, d, 18)
    s = np.tanh(s * 2.2)
    e = np.exp(-t / (0.09 if mute else 0.4)) * np.minimum(1, t / 0.004)
    return lp(s, 2) * e * lv * 0.6


def bass(f, d=0.3, lv=1.0, tau=0.18):
    t = tt(d)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sign(np.sin(2 * np.pi * f * t))
    return lp(x, 4) * np.exp(-t / tau) * np.minimum(1, t / 0.004) * lv


def ping(f, d=1.0, lv=1.0, tau=0.3):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t)) * np.exp(-t / tau) * lv


def bell(f, d=2.5, lv=1.0):
    t = tt(d); s = np.zeros_like(t)
    for r, a, tau in ((1, 1, 1.2), (2.76, .6, .8), (5.4, .4, .5), (8.93, .25, .3)):
        s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau)
    return s * lv * 0.5


def gong(f=110, d=3.0, lv=1.0):
    t = tt(d); s = np.zeros_like(t)
    for r, a, tau in ((1, 1, 1.6), (1.51, .7, 1.4), (2.0, .6, 1.2), (2.74, .5, 1.0), (3.46, .4, .8), (5.1, .3, .5)):
        s += a * np.sin(2 * np.pi * f * r * t + rng.random()) * np.exp(-t / tau)
    return s * np.minimum(1, t / 0.03) * lv * 0.4


def sq(f, d, lv=1.0, duty=0.5, tau=None):
    t = tt(d)
    x = np.where((t * f) % 1.0 < duty, 1.0, -1.0)
    e = np.minimum(1, (d - t) / 0.01) * (np.exp(-t / tau) if tau else 1)
    return x * e * lv


def whoosh(d=0.5, lv=1.0, rev=False, lo=0.1, hi=0.9):
    t = tt(d); p = t / d
    env = np.sin(np.pi * p) ** 2
    n = nz(d)
    a = lp(n, 26); b = hp(n, 5)
    s = a * (1 - p) + b * p if not rev else a * p + b * (1 - p)
    return s * env * lv


def riser(d, lv=1.0):
    t = tt(d); p = t / d
    f = 220 * 10 ** p
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (0.5 * np.sin(ph) + 0.7 * hp(nz(d), 5)) * p ** 2.2 * lv


def slide_whistle(f0, f1, d, lv=1.0):
    t = tt(d)
    return sine_sweep(f0, f1, d, 1.0) * np.minimum(1, t / 0.02) * np.minimum(1, (d - t) / 0.05) * lv


def tinnitus(f=4200, d=1.5, lv=1.0):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / (d / 3)) * lv


def pluck_marimba(f, lv=1.0, d=0.5):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)) * np.exp(-t / 0.12) * lv


def blip(f, lv=1.0, d=0.05):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.minimum(1, t / 0.004) * np.exp(-t / 0.025) * lv


def twinkle(lv=1.0, base=2093):
    t = tt(1.0)
    s = sum(a * np.sin(2 * np.pi * base * r * t) for r, a in ((1, 1), (1.26, .7), (1.5, .6), (2, .4)))
    return s * np.exp(-t / 0.3) * lv * 0.25


def click(lv=1.0, f=2400):
    t = tt(0.025)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) * lv


def chip_thud(lv=1.0):
    t = tt(0.18)
    return (np.sin(2 * np.pi * 90 * t * (1 - 0.4 * t / 0.18)) * np.exp(-t / 0.05) + 0.3 * lp(nz(0.18), 8) * np.exp(-t / 0.02)) * lv


