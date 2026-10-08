"""30s anime-CM soundtrack, fully synthesized (no samples, no network). 160 BPM, Em-C-G-D."""
import numpy as np, wave, sys

SR = 44100
DUR = 30.0
N = int(SR * (DUR + 1.5))
BPM = 160
BEAT = 60 / BPM          # 0.375 s
BAR = BEAT * 4           # 1.5 s
rng = np.random.default_rng(7)  # seeded: identical output every run

L = np.zeros(N, dtype=np.float64)
R = np.zeros(N, dtype=np.float64)


def add(t, sig, gain=1.0, pan=0.0):
    """mix `sig` into the stereo bus at time t (s). pan -1..1."""
    i = int(t * SR)
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), N - i)
    if n <= 0:
        return
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    L[i:i + n] += sig[:n] * gl
    R[i:i + n] += sig[:n] * gr


def tt(d):
    return np.arange(int(SR * d)) / SR


def lowpass(x, k):
    if k <= 1:
        return x
    return np.convolve(x, np.ones(k) / k, mode="same")


def highpass(x, k=8):
    return x - lowpass(x, k)


def noise(d):
    return rng.standard_normal(int(SR * d))


# ---------------------------------------------------------------- drums
def kick(level=1.0):
    t = tt(0.42)
    f = 46 + 110 * np.exp(-t / 0.028)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.17)
    s += 0.5 * np.exp(-t / 0.004) * noise(0.42)
    return s * level


def snare(level=1.0):
    t = tt(0.3)
    n = highpass(noise(0.3), 5) * np.exp(-t / 0.075)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.06)
    return (0.9 * n + 0.5 * tone) * level


def hat(level=1.0, d=0.05):
    t = tt(d)
    return highpass(noise(d), 3) * np.exp(-t / 0.014) * level


def taiko(level=1.0):
    t = tt(0.9)
    f = 58 + 60 * np.exp(-t / 0.05)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.33)
    s += 0.35 * lowpass(noise(0.9), 40) * np.exp(-t / 0.09)
    return s * level


def impact(level=1.0):
    """sub boom + crash tail."""
    t = tt(2.2)
    f = 62 * np.exp(-t / 0.35) + 26
    ph = 2 * np.pi * np.cumsum(f) / SR
    boom = np.sin(ph) * np.exp(-t / 0.55)
    crash = highpass(noise(2.2), 4) * np.exp(-t / 0.5) * 0.35
    thump = lowpass(noise(2.2), 60) * np.exp(-t / 0.18) * 0.8
    return (boom + crash + thump) * level


def reverse_swell(d=0.5, level=1.0):
    t = tt(d)
    n = highpass(noise(d), 6) * (t / d) ** 2
    return n * level


def riser(d, level=1.0):
    t = tt(d)
    p = t / d
    f = 220 * (10 ** (p * 1.0))          # 220 -> 2200 Hz
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * 0.5 + np.sign(np.sin(ph * 0.5)) * 0.15
    n = highpass(noise(d), 5) * 0.8
    return (s + n) * (p ** 2.2) * level


def whoosh(d=0.45, level=1.0, rev=False):
    t = tt(d)
    p = t / d
    env = np.sin(np.pi * p) ** 2
    n = noise(d)
    # sweep the band by blending low/high passes
    lo = lowpass(n, 24)
    hi = highpass(n, 6)
    s = (lo * (1 - p) + hi * p) if not rev else (lo * p + hi * (1 - p))
    return s * env * level


def scratch(level=1.0):
    t = tt(0.32)
    f = 1100 - 900 * (t / 0.32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sign(np.sin(ph)) * 0.4 + highpass(noise(0.32), 4) * 0.6
    return s * np.exp(-t / 0.2) * level


def pon(freq=720, level=1.0):
    t = tt(0.22)
    f = freq * (1 - 0.35 * t / 0.22)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.07) * level


def twinkle(level=1.0):
    t = tt(0.9)
    s = sum(np.sin(2 * np.pi * f * t) * a for f, a in
            ((2093, 1.0), (2637, 0.7), (3136, 0.6), (4186, 0.4)))
    return s * np.exp(-t / 0.28) * level * 0.25


# ---------------------------------------------------------------- tonal
CHORDS = [  # (root bass Hz, chord tones Hz)
    (82.41, [164.8, 196.0, 246.9]),    # Em
    (65.41, [130.8, 164.8, 196.0]),    # C
    (98.00, [196.0, 246.9, 293.7]),    # G
    (73.42, [146.8, 185.0, 220.0]),    # D
]


def chord_at(t):
    return CHORDS[int(t // BAR) % 4]


def saw(f, d, harm=10, det=0.0):
    t = tt(d)
    s = np.zeros_like(t)
    for k in range(1, harm + 1):
        s += np.sin(2 * np.pi * f * (1 + det) * k * t + k) / k
    return s


def pad(freqs, d, level=1.0, att=0.5, rel=0.4):
    t = tt(d)
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.004):
            s += saw(f, d, 8, det)
    s = lowpass(s, 3)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel)
    return s * env * level / (len(freqs) * 3)


def stab(freqs, level=1.0, d=0.32):
    t = tt(d)
    s = np.zeros_like(t)
    for f in freqs:
        s += saw(f * 2, d, 12)
    env = np.exp(-t / 0.11) * np.minimum(1, t / 0.006)
    return lowpass(s, 2) * env * level / len(freqs)


def bass(f, d=0.3, level=1.0):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sign(np.sin(2 * np.pi * f * t))
    s = lowpass(s, 4)
    env = np.exp(-t / 0.2) * np.minimum(1, t / 0.004)
    return s * env * level


def lead(f, d, level=1.0):
    t = tt(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t)
    s = np.zeros_like(t)
    for k in range(1, 7):
        s += np.sin(2 * np.pi * f * vib * k * t) / k
    env = np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.12)
    return s * env * level


# ---------------------------------------------------------------- arrangement
def beats(t0, t1, step=BEAT):
    t = t0
    while t < t1 - 1e-6:
        yield t
        t += step


def drive(t0, t1, level=1.0, hats16=False):
    """full-energy groove between t0 and t1."""
    for t in beats(t0, t1):
        add(t, kick(0.9 * level), 0.9)
        beat_idx = int(round((t - t0) / BEAT)) % 4
        if beat_idx in (1, 3):
            add(t, snare(0.8 * level), 0.7, 0.08)
        if beat_idx == 3 and t + BEAT / 2 < t1:
            add(t + BEAT / 2, kick(0.7 * level), 0.7)
    for t in beats(t0, t1, BEAT / (4 if hats16 else 2)):
        add(t, hat(0.5 * level), 0.35, 0.3 if int(t / BEAT * 2) % 2 else -0.3)
    for t in beats(t0, t1, BAR):
        add(t, taiko(0.9 * level), 0.7)
    for t in beats(t0, t1, BEAT / 2):          # driving eighth bass
        root, _ = chord_at(t)
        add(t, bass(root, 0.2, 0.8 * level), 0.65)


def pads(t0, t1, level=1.0, octave=1.0):
    for t in beats(t0, t1, BAR):
        _, tones = chord_at(t)
        d = min(BAR + 0.25, t1 - t + 0.25)
        add(t, pad([f * octave for f in tones], d, level), 0.6)


def stabs(t0, t1, level=1.0):
    for t in beats(t0, t1, BAR):
        _, tones = chord_at(t)
        add(t, stab(tones, level), 0.55)
        add(t + BEAT * 1.5, stab(tones, level * 0.8), 0.45)


def main():
    # ---- A 0.0-3.0 : dread. drone + heartbeat
    add(0.0, pad([82.41, 123.5, 164.8], 3.4, 0.9, att=1.2, rel=0.2), 0.5)
    for t in beats(0.0, 3.0, BEAT * 2):
        add(t, kick(0.5), 0.55)
    add(0.0, impact(0.55), 0.7)
    add(1.5 - 0.3, reverse_swell(0.3, 0.6), 0.5)
    add(1.5, impact(0.85), 0.8)

    # ---- B 3.0-6.0 : hero appears, tension builds
    add(3.0 - 0.35, whoosh(0.35, 0.7), 0.6, -0.3)
    add(3.0, impact(0.4), 0.6)
    pads(3.0, 6.0, 0.8)
    for i, t in enumerate(beats(3.0, 6.0)):
        add(t, kick(0.45 + 0.04 * i), 0.55)
    for t in beats(4.5, 6.0, BEAT / 2):
        add(t, hat(0.4), 0.3)
    add(4.5, impact(0.6), 0.65)
    add(4.5, twinkle(0.7), 0.4, 0.4)
    add(4.5, riser(1.5, 0.8), 0.55)
    for i, t in enumerate(beats(5.25, 6.0, BEAT / 4)):
        add(t, snare(0.35 + 0.1 * i), 0.5)

    # ---- C 6.0-10.5 : IMPACT + drive
    add(6.0 - 0.04, reverse_swell(0.04, 0.0), 0.0)
    add(6.0, impact(1.4), 1.0)
    add(6.0, taiko(1.2), 0.9)
    add(6.0, scratch(0.0), 0.0)
    drive(6.0, 10.5)
    pads(6.0, 10.5, 1.0)
    stabs(7.5, 10.5, 0.9)
    add(7.5, impact(1.0), 0.85)
    add(7.5, twinkle(1.0), 0.6, 0.5)          # "kiraan"
    add(7.9, twinkle(0.8), 0.5, 0.2)
    add(9.0, pon(540, 0.9), 0.6)              # joke stamp

    # ---- D 10.5-15.0 : one-hit montage (a hit every 0.75 s)
    for i, t in enumerate(beats(10.5, 14.25, 0.75)):
        add(t - 0.2, whoosh(0.2, 0.5), 0.5, -0.4 if i % 2 else 0.4)
        add(t, impact(0.55), 0.75)
        add(t, snare(0.9), 0.8)
        add(t, kick(1.0), 0.9)
    for t in beats(10.5, 14.25, BEAT / 2):
        root, _ = chord_at(t)
        add(t, bass(root, 0.16, 0.7), 0.6)
    pads(10.5, 15.0, 1.0, octave=2.0)
    add(14.25, riser(0.75, 1.0), 0.7)
    for i, t in enumerate(beats(14.25, 15.0, BEAT / 4)):
        add(t, snare(0.5 + 0.08 * i), 0.55)
    add(14.25, impact(0.9), 0.8)              # "zenbu ichigeki"

    # ---- E 15.0-19.5 : TITLE. full epic
    add(15.0 - 0.3, reverse_swell(0.3, 0.8), 0.6)
    add(15.0, impact(1.6), 1.0)
    add(15.0, taiko(1.2), 0.9)
    drive(15.0, 19.5, 1.05, hats16=True)
    pads(15.0, 19.5, 1.2)
    pads(15.0, 19.5, 0.6, octave=2.0)
    stabs(15.0, 19.5, 1.0)
    # little hero lead line over the chords
    mel = [(15.0, 329.6, 0.75), (15.75, 392.0, 0.375), (16.125, 440.0, 0.375),
           (16.5, 493.9, 0.75), (17.25, 440.0, 0.375), (17.625, 392.0, 0.375),
           (18.0, 329.6, 0.75), (18.75, 392.0, 0.75)]
    for t, f, d in mel:
        add(t, lead(f, d, 0.6), 0.4, 0.15)
    add(17.25, impact(0.8), 0.8)               # tagline hit
    add(17.25, twinkle(0.8), 0.5, -0.3)

    # ---- F 19.5-23.25 : comedy beat (thin, bouncy)
    add(19.5, scratch(1.0), 0.8)
    for t in beats(19.5, 23.25, BEAT * 2):
        add(t, kick(0.6), 0.6)
    for t in beats(19.875, 23.25, BEAT * 2):
        add(t, hat(0.8, 0.08), 0.4)
    for i, t in enumerate(beats(19.5, 22.5, BEAT)):
        root, _ = chord_at(15.0 + (i // 4) * BAR)
        add(t, bass(root * 2, 0.14, 0.5), 0.5)
    for k, t in enumerate((19.5, 20.25, 21.0)):
        add(t, pon(600 + 90 * k, 1.0), 0.6)
    add(21.75, pon(880, 1.0), 0.7)
    add(21.75, twinkle(0.4), 0.3)
    for i, t in enumerate(beats(22.5, 23.25, BEAT / 2)):
        add(t, snare(0.4 + 0.15 * i), 0.5)
    add(22.5, riser(0.75, 0.8), 0.5)

    # ---- G 23.25-27.0 : words + broadcast announcement
    drive(23.25, 27.0, 1.0, hats16=True)
    pads(23.25, 27.0, 1.2)
    stabs(23.25, 27.0, 1.0)
    for t in (23.25, 24.0, 24.75):
        add(t, impact(1.0), 0.85)
    add(25.5 - 0.3, reverse_swell(0.3, 0.8), 0.5)
    add(25.5, impact(1.2), 0.9)
    add(25.5, taiko(1.0), 0.8)
    add(26.625, riser(0.375, 0.8), 0.6)

    # ---- H 27.0-30.0 : end card, ring out on Em
    add(27.0, impact(1.7), 1.0)
    add(27.0, taiko(1.2), 0.9)
    add(27.0, pad([82.41, 164.8, 196.0, 246.9, 329.6], 3.4, 1.4, att=0.05, rel=1.8), 0.7)
    add(27.0, stab([164.8, 196.0, 246.9], 1.2, d=1.2), 0.55)
    add(27.75, twinkle(1.0), 0.5, 0.3)

    # ---- master: gentle saturation + fade, normalise
    # sidechain-ish: nothing fancy; just soft clip
    mx = max(np.abs(L).max(), np.abs(R).max())
    L2, R2 = L / mx, R / mx
    L2, R2 = np.tanh(L2 * 1.6) / np.tanh(1.6), np.tanh(R2 * 1.6) / np.tanh(1.6)
    n = int(SR * DUR)
    L2, R2 = L2[:n], R2[:n]
    fade = np.ones(n)
    f0 = int(SR * 29.4)
    fade[f0:] = np.linspace(1, 0, n - f0) ** 1.5
    L2 *= fade * 0.9
    R2 *= fade * 0.9
    pcm = (np.stack([L2, R2], axis=1) * 32767).astype("<i2")
    out = sys.argv[1] if len(sys.argv) > 1 else "assets/soundtrack_raw.wav"
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", out, f"{n / SR:.2f}s")


main()
