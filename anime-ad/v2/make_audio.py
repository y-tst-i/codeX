"""『レベル1なのに世界最強』30秒CM — 場面ごとに音の世界を変える完全合成サウンドトラック。
同梱SFX(impact-bass 等)は一部で重ねて使う。決定的(seed固定)。BPM150 / 1拍=0.4s。
"""
import numpy as np, wave, subprocess, sys, os

SR = 44100
DUR = 30.0
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
    buf = nz(L / SR) * 1.0
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


# ------------------------------------------------------------------ scenes
E2, A2, B2, C3, D3 = 82.41, 110.0, 123.47, 130.81, 146.83
NOTE = {"E4": 329.63, "G4": 392.0, "A4": 440.0, "B4": 493.88, "D5": 587.33, "E5": 659.25, "G5": 783.99,
        "A5": 880.0, "B5": 987.77, "D4": 293.66, "C5": 523.25, "F#4": 369.99, "E3": 164.81, "B3": 246.94}


def s1(T=0.0):
    """百万の赤: 冷たい虚空。唸り、群れのざわめき、加速するデジタル・カウント、孤独な一点の音。"""
    # 低い唸り(2.0までゆっくり上昇する)
    mix(T, pad([41.2, 61.7], 4.2, 1.0, att=1.4, rel=0.15, harm=5), 0.9, send=0.2)
    # 群れのざわめき: 帯域ノイズの粒が密度を増す
    for k in range(260):
        tk = 0.4 + 1.8 * (k / 260) ** 1.6
        mix(T + tk, hp(nz(0.03), 3) * np.exp(-tt(0.03) / 0.006), 0.05 + 0.1 * tk / 2, pan=rng.uniform(-.8, .8))
    sw = bp(nz(3.4), 150, 900) * (tt(3.4) / 3.4) ** 1.5
    mix(T + 0.4, sw, 0.35, send=0.15)
    # カウンター・ティック: 速度が上がり音程も上がる
    t, k = 0.4, 0
    while t < 2.0:
        rate = 7 + 30 * ((t - 0.4) / 1.6) ** 1.5
        mix(T + t, click(0.5, 1800 + 1500 * (t - 0.4)), 0.5, pan=-0.2)
        t += 1.0 / rate
    # CUE-A 2.0: 数字到達 — 深い心拍(ドゥン・ドゥン)
    mix(T + 2.0, sub_boom(1.0, 2.0, 32), 0.95, send=0.25)
    mix(T + 2.0, tom(60, 1.0, 0.5), 0.6)
    mix(T + 2.22, tom(60, 0.6, 0.4), 0.45)
    mix(T + 2.0, ping(220, 1.2, 0.4, 0.5), 0.25, send=0.4)
    # ✕ x4: 落ちていくガラスの金属音
    for i, tc in enumerate((2.4, 2.6, 2.8, 3.0)):
        mix(T + tc, ping(1760 * 0.84 ** i, 0.5, 0.8, 0.12), 0.45, pan=-0.5 + 0.33 * i, send=0.3)
        mix(T + tc, click(0.8, 900), 0.5)
    # CUE-C 3.2: 沈み込む判子 — 鈍い木の音+低い息
    mix(T + 3.2, chip_thud(1.0), 0.9)
    mix(T + 3.2, sub_boom(0.6, 0.9, 40), 0.6)
    # CUE-D 3.6: 孤独な点 — 澄んだ高音1発、長い残響
    mix(T + 3.6, ping(1760, 1.5, 0.8, 0.5), 0.5, send=0.8)
    mix(T + 3.6, ping(2637, 1.2, 0.4, 0.4), 0.22, send=0.8)


def s2(T=4.0):
    """対峙: 弦のトレモロの緊張、タイムパニ、金管の唸り。風。"""
    # 白フラッシュのあとの逆回転シンバル→風
    mix(T - 0.5, hp(nz(0.5), 6) * (tt(0.5) / 0.5) ** 2, 0.35)
    mix(T + 0.0, crash(0.6, 1.2), 0.4, send=0.3)
    wind = bp(nz(4.0), 200, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * tt(4.0) + 1))
    mix(T, wind, 0.18, send=0.1)
    # 弦トレモロ(E短調のパワーなし和音)
    mix(T + 0.1, pad([E2 * 2, 196.0, 246.94], 3.6, 0.8, att=0.8, rel=0.3, harm=10, trem=11), 0.85, send=0.3)
    # CUE-A 0.6: テープ whoosh
    mix(T + 0.45, sfx("whoosh-cinematic.mp3", 0.9, 0.0, 0.9), 0.6, pan=-0.3)
    # CUE-B 1.2: Lv.1 ポップ
    mix(T + 1.2, sfx("pop.mp3", 0.9), 0.5, pan=-0.4)
    mix(T + 1.2, ping(1320, 0.5, 0.5, 0.1), 0.3, pan=-0.4, send=0.4)
    # CUE-C 1.6: Lv.999 — ティンパニ+低い金管の一撃
    mix(T + 1.6, tom(70, 1.2, 1.0), 0.8)
    mix(T + 1.6, sub_boom(0.8, 1.5, 34), 0.8, send=0.25)
    mix(T + 1.6, brass([E2 * 2, E2 * 3], 1.2, 1.0, att=0.05, rel=0.6), 0.55, send=0.3)
    # 2.0-3.2 ライザー + タイプ音(魔王の台詞: 15文字)
    mix(T + 2.0, sfx("riser.mp3", 0.8, 0.0, 1.3), 0.45)
    mix(T + 2.0, riser(1.2, 1.0), 0.35)
    for k in range(15):
        mix(T + 2.0 + k * (1.2 / 15), click(0.6, 1500 + 60 * (k % 5)), 0.4, pan=0.4)
    # CUE-D 3.2: 瞳が光る — きらめき(ライザー切断)
    mix(T + 3.2, twinkle(1.0, 3136), 0.5, send=0.5)
    mix(T + 3.2, ping(3951, 0.8, 0.5, 0.2), 0.2, send=0.6)
    # CUE-E 3.6 拳を握る: きしみ+低い脈
    sq_ = bp(nz(0.25), 600, 2500) * np.minimum(1, tt(0.25) / 0.05) * np.exp(-tt(0.25) / 0.12)
    mix(T + 3.6, sq_, 0.25)
    mix(T + 3.6, tom(55, 0.8, 0.5), 0.5)
    # 暗転: 音が吸い込まれる(0.2秒)
    mix(T + 3.78, whoosh(0.22, 0.7, rev=False), 0.3)


def s3(T=8.0):
    """一撃: 無音→巨大な衝撃→耳鳴り→割れる→スローモーションの余韻(尺八)。"""
    # 0.0-0.3 の静寂: 微かな耳鳴り
    mix(T + 0.0, tinnitus(4300, 0.7, 0.05), 0.4)
    mix(T + 0.2, ping(2400, 0.3, 0.3, 0.1), 0.2, send=0.6)       # 瞳の光
    # A1..A3 ストップモーションのカチカチ(上昇)
    for k, tc in enumerate((0.3, 0.4, 0.5)):
        mix(T + tc, click(1.0, 1200 + 700 * k), 0.7)
        mix(T + tc, tom(110 + 25 * k, 0.5, 0.2), 0.4)
    # CUE-B 0.6: 接触。最大の衝撃。
    mix(T + 0.6, sfx("impact-bass-1.mp3", 1.0), 1.0)
    mix(T + 0.6, sfx("impact-bass-2.mp3", 0.7), 0.6)
    mix(T + 0.6, sub_boom(1.0, 3.0, 28), 1.0, send=0.2)
    mix(T + 0.6, crash(1.0, 1.6), 0.5, send=0.4)
    mix(T + 0.6, hp(nz(0.05), 2) * 1.5, 0.8)
    mix(T + 0.6, taiko(1.2), 0.7)
    # 衝撃直後の音の「引き」(耳鳴り+低い唸りだけ)
    # CUE-C 0.7 ドッ
    mix(T + 0.7, tom(75, 1.2, 0.5), 0.8)
    # CUE-D 0.9-1.2 ヒビ→割れる: ガラスの割れ + 散らばる破片のきらめき(ペンタ)
    for k in range(18):
        tk = 0.9 + 0.3 * (k / 18) ** 0.8
        mix(T + tk, hp(nz(0.04), 3) * np.exp(-tt(0.04) / 0.008), 0.35, pan=rng.uniform(-1, 1))
    for k in range(34):
        tk = 1.1 + rng.uniform(0, 1.7)
        f = [1318.5, 1568.0, 1760.0, 2093.0, 2349.3][int(rng.integers(0, 5))]
        mix(T + tk, ping(f, 0.7, 0.8, 0.12), 0.1 + 0.15 * rng.random(), pan=rng.uniform(-1, 1), send=0.5)
    mix(T + 0.62, tinnitus(3600, 2.0, 0.12), 0.7, send=0.2)
    # スローモーション: 風と、ローパスした低い地鳴り
    mix(T + 1.2, bp(nz(4.0), 100, 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * tt(4.0))), 0.35, send=0.2)
    mix(T + 1.2, pad([E2, 123.47], 4.0, 0.9, att=1.5, rel=1.0, harm=5), 0.6, send=0.3)
    # 尺八(ペンタ): E4 → G4 → A4 → B4 (CUE-E 2.0 の筆に合わせて入る)
    mix(T + 1.6, flute(NOTE["E4"], 1.0, 0.8, slide=0.06), 0.4, send=0.6)
    mix(T + 2.6, flute(NOTE["G4"], 0.9, 0.8, slide=0.05), 0.4, send=0.6)
    mix(T + 3.5, flute(NOTE["A4"], 1.0, 0.8, slide=0.05), 0.4, send=0.6)
    mix(T + 4.3, flute(NOTE["B4"], 1.0, 0.8, slide=0.04), 0.35, send=0.7)
    # CUE-E 2.0 筆: すっと擦れる + 低い和太鼓
    mix(T + 1.85, bp(nz(0.45), 800, 5000) * np.sin(np.pi * tt(0.45) / 0.45) ** 1.5, 0.3, pan=0.6)
    mix(T + 2.0, tom(65, 0.9, 0.9), 0.5, send=0.2)
    # CUE-F 2.6 キラーン(遠く右上)
    mix(T + 2.6, twinkle(1.0, 2637), 0.5, pan=0.8, send=0.7)
    # CUE-G 4.0 判子: ぽん
    mix(T + 4.0, pluck_marimba(587, 1.0), 0.6, send=0.3)
    mix(T + 4.0, chip_thud(0.7), 0.5)



def s5_bed(T=13.2):
    """カタログ連発の下に敷く一定のビート(5つの個別SFXの下で勢いを保つ)。"""
    for b in range(10):
        tb = T + b * BEAT
        mix(tb, kick(0.85), 0.8)
        if b % 2 == 1:
            mix(tb, snare(0.7), 0.6, 0.1)
        mix(tb, hat(0.4), 0.22, pan=0.3)
        mix(tb + BEAT / 2, hat(0.3), 0.2, pan=-0.3)
        mix(tb, bass(E2 if b % 4 < 2 else A2, 0.22, 0.9), 0.55)
    # 全体を貫くライザー(次のタイトルへ): 16.0-17.2
    mix(T + 2.8, riser(1.2, 1.0), 0.3)

def s5_common_pre(T):
    mix(T, whoosh(0.18, 0.7), 0.35, pan=-0.3)


def s5a(T=13.2):
    """ピクセル世界: チップチューン。"""
    # カットイン: 8bitのコイン風ジングル C-E-G-C
    for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
        mix(T + 0.0 + k * 0.04, sq(f, 0.06, 0.6, 0.5, 0.04), 0.35)
    # CUE-A 0.15 指が弾かれる準備: ピッ
    mix(T + 0.15, sq(880, 0.05, 0.5, 0.25, 0.03), 0.3)
    # CUE-B 0.25 デコピン: ぺちっ(ノイズ+下降矩形波)
    mix(T + 0.25, sq(300, 0.08, 0.6, 0.5, 0.03) * np.linspace(1, 0.4, int(SR * 0.08)), 0.6)
    mix(T + 0.25, hp(nz(0.04), 2) * np.exp(-tt(0.04) / 0.01), 0.4)
    # ドラゴン発射: ぴゅーっと上昇
    t = tt(0.32); f = 300 + 1900 * (t / 0.32) ** 1.2
    mix(T + 0.28, np.where((np.cumsum(f) / SR) % 1.0 < 0.25, 1.0, -1.0) * np.exp(-t / 0.3), 0.3)
    # CUE-D 0.6 で終了: ゲームクリア風 3音
    for k, f in enumerate((784.0, 988.0, 1175.0)):
        mix(T + 0.6 + k * 0.06, sq(f, 0.1, 0.6, 0.5, 0.06), 0.3)


def s5b(T=14.0):
    """漫画ページ: 紙のパシッ、スライドホイッスル、コマの "シュッ"。"""
    # 魔法陣のきらめき(0.0-0.2)
    for k in range(5):
        mix(T + 0.0 + k * 0.035, ping(1568 * (1 + 0.12 * k), 0.4, 0.8, 0.1), 0.22, pan=-0.6 + 0.3 * k, send=0.5)
    # コマの枠が叩き込まれる音
    for tc in (0.02, 0.1, 0.17):
        mix(T + tc, whoosh(0.07, 1.0), 0.28, pan=rng.uniform(-.6, .6))
        mix(T + tc, click(0.8, 600), 0.4)
    # CUE-B 0.25 ビンタ: 肌を打つ破裂音(帯域ノイズ+低い胴鳴り)
    slap = bp(nz(0.12), 900, 4500) * np.exp(-tt(0.12) / 0.025)
    mix(T + 0.25, slap, 1.0)
    mix(T + 0.25, tom(140, 1.0, 0.18), 0.6)
    mix(T + 0.25, crash(0.3, 0.3), 0.3)
    # 0.45 吹っ飛ぶ: スライドホイッスル
    mix(T + 0.42, slide_whistle(500, 2000, 0.35), 0.25, pan=0.5)
    # CUE-D 0.6 判子 ぽん
    mix(T + 0.6, pluck_marimba(784, 1.0), 0.55)


def s5c(T=14.8):
    """水墨: 琴の爪弾き、剣の折れる金属音、拍子木。"""
    mix(T + 0.0, ks(293.66, 0.5, 0.996, 0.4), 0.45, send=0.4)   # D
    mix(T + 0.08, ks(440.0, 0.5, 0.996, 0.4), 0.4, send=0.4)    # A
    mix(T + 0.15, ks(587.33, 0.5, 0.996, 0.4), 0.4, send=0.4)   # D5
    # CUE-B 0.25 折れる: 金属の非整数倍音の長い響き + 乾いた割れ
    t = tt(0.8); sw = np.zeros_like(t)
    for r, a, tau in ((1, 1, .5), (2.76, .8, .35), (5.4, .6, .25), (8.93, .4, .18), (13.3, .3, .12)):
        sw += a * np.sin(2 * np.pi * 1320 * r * t) * np.exp(-t / tau)
    mix(T + 0.25, sw * 0.3, 0.8, send=0.5)
    mix(T + 0.25, hp(nz(0.03), 2) * np.exp(-tt(0.03) / 0.005), 0.9)
    # 0.45 切っ先が回って飛ぶ: 風を切る回転音
    spin = hp(nz(0.3), 6) * (0.5 + 0.5 * np.sin(2 * np.pi * 26 * tt(0.3))) * np.exp(-tt(0.3) / 0.15)
    mix(T + 0.45, spin, 0.2, pan=0.5)
    # CUE-D 0.6 拍子木 カッ・カッ
    for tc in (0.6, 0.66):
        t = tt(0.1)
        mix(T + tc, np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.012) + 0.4 * hp(nz(0.1), 2) * np.exp(-t / 0.01), 0.55)


def s5d(T=15.6):
    """空気の歪み: 息を吸う → くしゃみ → 風圧。"""
    # 0.0-0.25 ハ…ハ…
    for tc, g in ((0.02, 0.4), (0.13, 0.6)):
        n = bp(nz(0.1), 300, 2500) * np.sin(np.pi * tt(0.1) / 0.1)
        mix(T + tc, n, g * 0.6)
    # CUE-B 0.25 ハクション!: 声帯っぽい帯域ノイズ(フォルマント)+下降するピッチ + 大きな風
    t = tt(0.3)
    ff = 700 * (1 - 0.45 * t / 0.3)
    voice = np.sin(2 * np.pi * np.cumsum(ff) / SR) * 0.4 + bp(nz(0.3), 1200, 3000) * 0.9
    mix(T + 0.25, voice * np.exp(-t / 0.1), 0.7)
    mix(T + 0.28, whoosh(0.5, 1.0), 0.8, send=0.2)
    mix(T + 0.28, sub_boom(0.4, 0.8, 50), 0.4)
    # 0.45 兵器が吹っ飛ぶ: ドップラー下降
    mix(T + 0.42, slide_whistle(1600, 300, 0.35), 0.2, pan=-0.4)
    # CUE-D 0.6 ぴょん
    mix(T + 0.6, slide_whistle(300, 900, 0.1), 0.35)
    mix(T + 0.6, pluck_marimba(1046, 1.0, 0.3), 0.4)


def s5e(T=16.4):
    """金の目: 聖歌 → 銅鑼 → 水晶が砕ける → 白へ吸い込まれる。"""
    mix(T + 0.0, choir(220, 0.8, 1.0, att=0.3, rel=0.2), 0.9, send=0.5)
    mix(T + 0.0, choir(329.6, 0.8, 0.7, att=0.3, rel=0.2), 0.7, send=0.5)
    mix(T + 0.25, gong(98, 3.0, 1.0), 0.7, send=0.5)       # CUE-B
    mix(T + 0.25, sub_boom(0.6, 1.5, 40), 0.5)
    # 0.45 水晶のひび: 高域のきらめきカスケード
    for k in range(10):
        mix(T + 0.45 + k * 0.012, ping(2349 * (1 + 0.18 * k), 0.4, 0.8, 0.08), 0.18, pan=rng.uniform(-1, 1), send=0.5)
    # 0.65-0.8 ホワイトアウトへの吸い込み(上昇ノイズ)
    up = hp(nz(0.18), 4) * (tt(0.18) / 0.18) ** 1.5
    mix(T + 0.62, up, 0.6)
    mix(T + 0.62, sine_sweep(600, 3500, 0.18) * 0.3, 0.5)


def s6(T=17.2):
    """タイトル大爆発: バンド全開(ドラム・歪みギター・ベース・金管・主題)。最もうるさい。"""
    beat = BEAT
    # 衝撃(CUE-A 0.2)
    mix(T + 0.0, hp(nz(0.2), 6) * (tt(0.2) / 0.2) ** 2, 0.3)
    mix(T + 0.2, sfx("impact-bass-2.mp3", 1.0), 1.0)
    mix(T + 0.2, sub_boom(1.0, 2.5, 30), 1.0, send=0.2)
    mix(T + 0.2, crash(1.0, 2.2), 0.7, send=0.3)
    mix(T + 0.2, taiko(1.2), 0.8)
    # 4文字が組み上がる 0.2-0.9: 上昇アルペジオ(金属のきらめき)
    for k, f in enumerate([E5 for E5 in (659.25, 783.99, 880.0, 987.77, 1174.7, 1318.5, 1568.0)]):
        mix(T + 0.25 + k * 0.1, ping(f, 0.5, 0.7, 0.14), 0.3, pan=-0.6 + 0.2 * k, send=0.4)
    # CUE-B 0.9 着地: シンバル+キック+ドロップEmパワーコード
    mix(T + 0.9, crash(0.9, 1.6), 0.55, send=0.3)
    mix(T + 0.9, kick(1.2), 0.9)
    mix(T + 0.9, guitar(E2 * 2, 0.5, 1.0, mute=False), 0.7, pan=-0.3)
    mix(T + 0.9, brass([E2 * 4, E2 * 6], 0.7, 1.0), 0.45, send=0.2)
    # ドラムグルーブ(0.9以降、BPM150)
    t0 = T + 0.9
    for b in range(int((5.2 - 0.9) / beat)):
        tb = t0 + b * beat
        if b % 2 == 0:
            mix(tb, kick(1.0), 0.9)
        else:
            mix(tb, snare(1.0), 0.8, 0.1)
        mix(tb, hat(0.5), 0.3, pan=0.3)
        mix(tb + beat / 2, hat(0.4), 0.25, pan=-0.3)
        if b % 4 == 3:
            mix(tb + beat / 2, kick(0.8), 0.7)
        # ベース
        root = E2 if (b // 4) % 2 == 0 else C3
        mix(tb, bass(root, 0.22, 1.0), 0.65)
        mix(tb + beat / 2, bass(root, 0.18, 0.8), 0.55)
        # ギターのパームミュート
        mix(tb, guitar(root * 2, 0.2, 0.9, True), 0.4, pan=-0.35)
        mix(tb + beat / 2, guitar(root * 2, 0.15, 0.7, True), 0.35, pan=0.35)
    # CUE-C 1.0 上に迫り上がる: 逆再生スウェル
    mix(T + 0.75, hp(nz(0.3), 6) * (tt(0.3) / 0.3) ** 2, 0.3)
    # 主題メロディ(リード+金管): E4 G4 A4 B4 | D5 B4 A4 G4
    mel = [("E5", 0.9, 0.4), ("G5", 1.3, 0.4), ("A5", 1.7, 0.4), ("B5", 2.1, 0.8),
           ("A5", 2.9, 0.4), ("G5", 3.3, 0.4), ("E5", 3.7, 0.8), ("G5", 4.5, 0.6)]
    for n, tm, d in mel:
        mix(T + tm, brass([NOTE[n] / 2, NOTE[n]], d + 0.05, 1.0, att=0.03, rel=0.1), 0.38, pan=0.1, send=0.2)
    # CUE-D 2.0 光が走る: シャーン
    mix(T + 1.9, sine_sweep(1200, 5200, 0.3) * np.exp(-tt(0.3) / 0.25) * 0.4, 0.5, send=0.5)
    mix(T + 1.95, hp(nz(0.4), 4) * np.sin(np.pi * tt(0.4) / 0.4), 0.25)
    # CUE-E 2.6 赤いテープ: スネア+ぽん+小インパクト
    mix(T + 2.6, snare(1.2), 0.8)
    mix(T + 2.6, pluck_marimba(1175, 1.0), 0.5)
    mix(T + 2.6, tom(70, 1.0, 0.5), 0.5)
    # 2.6以降: 金の粒の降る音(高いきらめき、seed固定)
    for k in range(40):
        tk = 2.7 + rng.uniform(0, 2.4)
        f = [1568.0, 1760.0, 1975.5, 2349.3, 2637.0][int(rng.integers(0, 5))]
        mix(T + tk, ping(f, 0.6, 0.6, 0.1), 0.06 + 0.1 * rng.random(), pan=rng.uniform(-1, 1), send=0.5)


def s7(T=22.4):
    """脱力: 突然の静けさ。マリンバの粒と、文字を打つ小さなブリップだけ。"""
    # ルームトーン(ほぼ無音)
    mix(T, lp(nz(3.6), 40) * 0.01, 1.0)
    # CUE-A 0.5 首を向ける: 布ずれ
    mix(T + 0.5, whoosh(0.25, 0.4), 0.2)
    # CUE-B 1.0 吹き出し: ぽん
    mix(T + 1.0, pluck_marimba(659, 1.0), 0.45, send=0.3)
    # タイプのブリップ: "え、今の…" 5文字 1.0-1.6 / "技だったの？" 6文字 1.8-2.6
    for k in range(5):
        mix(T + 1.0 + 0.12 + k * 0.11, blip(880 + 60 * (k % 3), 0.7), 0.35)
    for k in range(6):
        mix(T + 1.8 + k * 0.13, blip(988 + 70 * (k % 3), 0.7), 0.35)
    # CUE-D 2.7 「？」ぽよん: ボイン
    mix(T + 2.7, slide_whistle(420, 980, 0.2), 0.3)
    mix(T + 2.7, pluck_marimba(1046, 1.0, 0.4), 0.45)
    # CUE-E 3.0 字幕: 下降2音(ポロン)
    mix(T + 3.0, pluck_marimba(880, 1.0), 0.4, send=0.3)
    mix(T + 3.15, pluck_marimba(659, 1.0), 0.4, send=0.3)
    # 遠くの小鳥(控えめ)
    for tc, f in ((0.3, 3000), (0.42, 3300), (2.3, 2900), (2.4, 3200)):
        mix(T + tc, sine_sweep(f, f * 1.25, 0.06) * 0.2, 0.18, pan=0.7, send=0.4)


def s8(T=26.0):
    """荘厳な告知: 余韻の空気→重い一撃→ハープ→管弦の和音→鐘。祝祭のあとの静かな威厳。"""
    # 0.0 白が紺へ: きらめく空気(逆残響)
    mix(T + 0.0, pad([E2 * 4, 196.0 * 2, 246.94 * 2], 1.6, 1.0, att=0.5, rel=0.3, harm=6), 0.5, send=0.5)
    # CUE-A 0.4 重い一撃: 低い太鼓+ホール残響+低弦
    mix(T + 0.4, sfx("impact-bass-1.mp3", 0.8), 0.7, send=0.3)
    mix(T + 0.4, taiko(1.2), 0.7, send=0.4)
    mix(T + 0.4, sub_boom(0.9, 3.0, 32), 0.8)
    # ハープ(KS)のアルペジオ: 線が描かれる 0.4-1.6 (Em9 の上昇)
    for k, f in enumerate((164.81, 246.94, 329.63, 392.0, 493.88, 587.33, 659.25, 783.99)):
        mix(T + 0.45 + k * 0.15, ks(f, 1.4, 0.998, 0.4), 0.35, pan=-0.6 + 0.17 * k, send=0.5)
    # CUE-B 1.6 満ちる: 管弦の和音(Em→E の明るい解決)
    mix(T + 1.6, pad([E2 * 2, 164.81, 246.94, 329.63, 493.88], 2.4, 1.2, att=0.4, rel=1.4, harm=8), 0.75, send=0.4)
    mix(T + 1.6, choir(329.63, 2.3, 0.8, att=0.4, rel=1.2), 0.7, send=0.5)
    mix(T + 1.6, choir(493.88, 2.3, 0.5, att=0.4, rel=1.2), 0.5, send=0.5)
    mix(T + 1.6, brass([E2 * 4, E2 * 6], 1.8, 0.8, att=0.15, rel=0.9), 0.35, send=0.4)
    mix(T + 1.6, bell(659.25, 3.0, 1.0), 0.5, send=0.5)
    # CUE-C 1.8 ラベル: 小さなチャイム
    mix(T + 1.8, sfx("chime.mp3", 0.8), 0.35, pan=0.3)
    # CUE-D 2.2 放送決定: 低い一音+高い鐘
    mix(T + 2.2, bass(E2, 1.0, 1.0, tau=0.6), 0.7)
    mix(T + 2.2, bell(987.77, 3.0, 1.0), 0.45, send=0.6)
    mix(T + 2.2, tom(60, 0.8, 0.8), 0.4)
    # CUE-E 2.8 注釈: ごく淡い高域のきらめき
    mix(T + 2.8, twinkle(0.5, 3520), 0.3, send=0.7)
    # 余韻→無音へ(フェードはマスターで)


def master():
    ir = reverb_ir(2.6)
    ir2 = reverb_ir(2.6, seed=9)
    n = 1 << int(np.ceil(np.log2(N + len(ir))))
    FW = np.fft.rfft(WL, n) * np.fft.rfft(ir, n)
    FR = np.fft.rfft(WR, n) * np.fft.rfft(ir2, n)
    wl = np.fft.irfft(FW, n)[:N]; wr = np.fft.irfft(FR, n)[:N]
    L = DL + wl * 0.8; R = DR + wr * 0.8
    k = int(DUR * SR)
    L, R = L[:k], R[:k]
    pk = max(np.abs(L).max(), np.abs(R).max())
    L, R = L / pk, R / pk
    # 柔らかいサチュレーション(やりすぎない)+全体フェード(最後の0.4秒)
    L, R = np.tanh(L * 1.25) / np.tanh(1.25), np.tanh(R * 1.25) / np.tanh(1.25)
    f0 = int(SR * 29.6)
    fade = np.ones(k); fade[f0:] = np.linspace(1, 0, k - f0) ** 1.4
    L *= fade; R *= fade
    return L, R


def write(L, R, path):
    pcm = (np.stack([L, R], axis=1) * 0.89 * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    s1(); s2(); s3()
    s5_bed(); s5a(); s5b(); s5c(); s5d(); s5e()
    s6(); s7(); s8()
    L, R = master()
    out = sys.argv[1] if len(sys.argv) > 1 else "soundtrack_raw.wav"
    write(L, R, out)
    print("wrote", out)
