"""重低音（ダブステップ系）BGM 用の合成・ミックスライブラリ。外部音源なし。

- 帯域制限オシレーター（polyBLEP）でエイリアスを抑える
- 時間変化する状態変数フィルタ（numba）でワブル／グロウルを作る
- サイドチェイン、バス処理、ルックアヘッド・リミッターで音圧を出す

  pip install numpy scipy numba lameenc
"""
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d
from numba import njit
import lameenc

SR = 44100
rng = np.random.default_rng(11)

# ---------------------------------------------------------------- 基本
def ns(d): return int(round(d * SR))
def tt(d): return np.arange(ns(d)) / SR
def hz(m): return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)
def _sos(kind, fc, o): return signal.butter(o, fc, kind, fs=SR, output='sos')
def lp(x, fc, o=2): return signal.sosfilt(_sos('low', min(fc, SR * .45), o), x, axis=-1)
def hp(x, fc, o=2): return signal.sosfilt(_sos('high', fc, o), x, axis=-1)
def bp(x, lo, hi, o=2): return signal.sosfilt(_sos('band', [lo, min(hi, SR * .45)], o), x, axis=-1)
def noise(d): return rng.standard_normal(ns(d))
def sat(x, drive=2.0): return np.tanh(x * drive) / np.tanh(drive)
def rms(x): return float(np.sqrt(np.mean(np.square(x))) + 1e-12)
def fade(n, a=.003, r=.02):
    t = np.arange(n) / SR; d = n / SR
    return np.minimum(np.clip(t / max(a, 1e-4), 0, 1), np.clip((d - t) / max(r, 1e-4), 0, 1))

@njit(cache=True)
def _svf(x, fc, q, mode, sr):
    y = np.empty_like(x); ic1 = 0.0; ic2 = 0.0; k = 1.0 / q
    for n in range(x.size):
        g = np.tan(np.pi * fc[n] / sr)
        a1 = 1.0 / (1.0 + g * (g + k)); a2 = g * a1; a3 = g * a2
        v3 = x[n] - ic2; v1 = a1 * ic1 + a2 * v3; v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2
        if mode == 0: y[n] = v2
        elif mode == 1: y[n] = v1
        else: y[n] = x[n] - k * v1 - v2
    return y

def svf(x, fc, q=.707, mode='lp'):
    fc = np.ascontiguousarray(np.clip(np.broadcast_to(np.asarray(fc, float), x.shape), 20, SR * .45))
    return _svf(np.ascontiguousarray(x, dtype=np.float64), fc, float(q), {'lp': 0, 'bp': 1, 'hp': 2}[mode], float(SR))

# ---------------------------------------------------------------- 帯域制限オシレーター
def _blep(p, dt):
    y = np.zeros_like(p)
    m = p < dt; t = p[m] / dt[m]; y[m] = t + t - t * t - 1
    m = p > 1 - dt; t = (p[m] - 1) / dt[m]; y[m] = t * t + t + t + 1
    return y
def _phase(freq, n, ph0):
    dt = np.ascontiguousarray(np.broadcast_to(np.asarray(freq, float), (n,))) / SR
    p = (np.cumsum(dt) + (rng.random() if ph0 is None else ph0)) % 1.0
    return p, dt
def saw(freq, n, ph0=None):
    p, dt = _phase(freq, n, ph0); return 2 * p - 1 - _blep(p, dt)
def square(freq, n, ph0=None):
    p, dt = _phase(freq, n, ph0); q = (p + .5) % 1
    return (2 * p - 1 - _blep(p, dt)) - (2 * q - 1 - _blep(q, dt))
def sine(freq, n, ph0=0.0):
    dt = np.broadcast_to(np.asarray(freq, float), (n,)) / SR
    return np.sin(2 * np.pi * (np.cumsum(dt) + ph0))

# ---------------------------------------------------------------- ドラム
def kick(d=.55, f0=220, f1=45, click=1.0):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t * 34)
    body = sine(f, t.size) * np.exp(-t * 5.8)
    cl = hp(noise(d), 3000) * np.exp(-t * 260) * .45 + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 180) * .35
    return sat(body + cl * click, 2.4) * fade(t.size, .0005, .03)

def snare(d=.7, tone=190):
    t = tt(d)
    body = sine(tone + 70 * np.exp(-t * 45), t.size) * np.exp(-t * 16)
    nz = bp(noise(d), 1400, 11000) * np.exp(-t * 8.5)
    clap = sum(bp(noise(d), 900, 5000) * np.exp(-np.clip(t - o, 0, None) * 60) * (t >= o) for o in (0, .011, .023))
    return sat(body * .9 + nz * .75 + clap * .45, 2.0) * fade(t.size, .0005, .05)

def hat(open_=False, v=1.0):
    d = .3 if open_ else .07; t = tt(d)
    return hp(noise(d), 7200, 4) * np.exp(-t * (14 if open_ else 75)) * v

def tom(m=50, d=.45):
    t = tt(d); f = hz(m) * (1 + .6 * np.exp(-t * 30))
    return sat(sine(f, t.size) * np.exp(-t * 8) + bp(noise(d), 400, 3000) * np.exp(-t * 30) * .3, 1.8)

def crash(d=3.0):
    t = tt(d); x = hp(noise(d), 3800)
    return (x * np.exp(-t * 1.4) + bp(noise(d), 6000, 14000) * np.exp(-t * 3) * .5) * .55

def rev_crash(d=1.5):
    return crash(d)[::-1] * np.linspace(0, 1, ns(d)) ** 1.5

# ---------------------------------------------------------------- ベース
def sub(m, d, a=.004, r=.06, glide=None):
    n = ns(d); f = hz(m) * np.ones(n)
    if glide is not None: f = f * 2 ** (np.linspace(0, glide, n) / 12)
    return sat(sine(f, n), 1.3) * fade(n, a, r)

VOW = {'a': (730, 1090, 2440), 'o': (570, 840, 2410), 'u': (300, 870, 2240),
       'e': (530, 1840, 2480), 'i': (270, 2290, 3010)}

def lfo_wave(n, rate, shape='cos', ramp=None):
    """0..1 の LFO。rate は Hz（120BPM なら 4=8分, 8=16分, 6=3連8分）。ramp=(r0,r1) でレートを加速。"""
    t = np.arange(n) / SR
    if ramp: ph = np.cumsum(np.linspace(ramp[0], ramp[1], n)) / SR
    else: ph = rate * t
    ph = ph % 1.0
    if shape == 'cos': return .5 - .5 * np.cos(2 * np.pi * ph)
    if shape == 'down': return 1 - ph
    if shape == 'up': return ph
    if shape == 'sq': return (ph < .5).astype(float)
    return ph

def growl(m, d, kind='fm', rate=4.0, vow=('o', 'a'), shape='cos', ramp=None, glide=None, drive=3.2, bright=1.0):
    """ダブステップのワブル／グロウル（ステレオ 2×n）。120Hz 以下はカット（サブは別）。"""
    n = ns(d); t = np.arange(n) / SR
    f = hz(m) * np.ones(n)
    if glide is not None: f = f * 2 ** (np.asarray(glide) / 12 if np.ndim(glide) else np.linspace(0, glide, n) / 12)
    L = lfo_wave(n, rate, shape, ramp) if (rate or ramp) else np.clip(t / (d * .4), 0, 1)
    out = np.zeros((2, n))
    for ch, det in ((0, -11), (1, 11)):
        fc = f * 2 ** (det / 1200)
        if kind == 'wob':
            x = saw(fc, n) * .55 + saw(fc * 1.004, n) * .4 + square(fc * .5, n) * .45
            cut = 90 * (4200 * bright / 90) ** (.06 + .94 * L)
            y = svf(x, cut, 6.0, 'lp') + svf(x, cut * 2.1, 3.0, 'bp') * .35
        elif kind == 'reese':
            x = sum(saw(fc * 2 ** (dd / 1200), n) for dd in (-18, -6, 6, 18)) / 3
            y = svf(x, 260 + 900 * L * bright, 1.6, 'lp')
        else:  # 'fm' / 'yoy'：FM で倍音を作り、母音フォルマントでしゃべらせる
            idx = 1.2 + (7.5 if kind == 'fm' else 5.0) * L
            mod = np.sin(2 * np.pi * np.cumsum(fc * (2.0 if kind == 'fm' else 1.0)) / SR)
            car = np.sin(2 * np.pi * np.cumsum(fc) / SR + idx * mod)
            x = np.tanh(car * 3.0) * .7 + saw(fc, n) * .35
            v0, v1 = np.array(VOW[vow[0]], float), np.array(VOW[vow[1]], float)
            y = np.zeros(n)
            for i, gg in enumerate((1.0, .7, .35)):
                F = v0[i] + (v1[i] - v0[i]) * L
                y += svf(x, F * bright, 7.0, 'bp') * gg
            y += x * .12
        y = sat(y / (rms(y) * 4 + 1e-9) * drive, 1.4)
        y = hp(y, 115, 4)
        out[ch] = y
    return out / (rms(out) * 4) * fade(n, .003, .015)

def growl_seq(pat, t0, step, root):
    """(step, len, semi, kind, rate, vow[, extra]) の並びをグロウル信号の列 [(t, sig, semi, len秒)] に。"""
    ev = []
    for p in pat:
        s, l, semi, kind, rate, vow = p[:6]; ex = p[6] if len(p) > 6 else {}
        ev.append((t0 + s * step, growl(root + 12 + semi, l * step, kind, rate, vow or ('o', 'a'), **ex), semi, l * step))
    return ev

# ---------------------------------------------------------------- 上モノ
def supersaw(notes, d, fc=2600, a=.02, r=.4, voices=7, spread=24, fc_end=None):
    n = ns(d); out = np.zeros((2, n))
    for m in notes:
        for k in range(voices):
            det = (k - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            x = saw(hz(m) * 2 ** (det / 1200), n)
            if k == (voices - 1) // 2: out += x * .5
            else: out[k % 2] += x
    cut = fc if fc_end is None else np.geomspace(fc, fc_end, n)
    out = np.stack([svf(out[c], cut, .9, 'lp') for c in range(2)])
    return out / (rms(out) * 5 + 1e-9) * fade(n, a, r)

def pluck(m, d=.35, fc=3200):
    n = ns(d); t = np.arange(n) / SR
    x = saw(hz(m), n) * .6 + saw(hz(m) * 1.006, n) * .4
    return svf(x, fc * np.exp(-t * 9) + 250, 1.2, 'lp') * np.exp(-t * 6) * fade(n, .002, .03)

def lead(m, d, fc=4200):
    n = ns(d); t = np.arange(n) / SR; vib = 2 ** (.15 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / .3 - .5, 0, 1) / 12)
    out = np.zeros((2, n))
    for ch, det in ((0, -9), (1, 9)):
        x = saw(hz(m) * vib * 2 ** (det / 1200), n) * .6 + square(hz(m) * vib * 2 ** (-det / 1200), n) * .3
        out[ch] = svf(x, fc, 1.1, 'lp')
    return out / (rms(out) * 5) * fade(n, .01, .12)

def noise_riser(d, lo=300, hi=9000):
    n = ns(d); k = np.linspace(0, 1, n)
    return svf(noise(d), np.geomspace(lo, hi, n), 2.0, 'bp') * k ** 2.2 * .9

def pitch_riser(d, m0=48, m1=84):
    n = ns(d); k = np.linspace(0, 1, n)
    f = hz(m0) * 2 ** ((m1 - m0) * k ** 1.5 / 12)
    x = saw(f, n) * .5 + saw(f * 1.01, n) * .5
    return svf(x, 800 + 6000 * k, 2.0, 'lp') * k ** 2 * .7

def downlifter(d=1.5):
    n = ns(d); k = np.linspace(0, 1, n)
    return svf(noise(d), np.geomspace(8000, 200, n), 1.5, 'bp') * (1 - k) ** 2 * .8

def impact(d=3.0, v=1.0):
    t = tt(d)
    body = sine(28 + 70 * np.exp(-t * 7), t.size) * np.exp(-t * 1.6)
    hit = kick(d, 260, 38)
    nz = lp(noise(d), 1200, 4) * np.exp(-t * 4) * 1.4
    return sat(body * 1.1 + hit * .8 + nz, 2.0) * v * fade(t.size, .0005, .3)

def gate(sig, t0, rate):
    """1/rate 秒ごとに半分だけ鳴らすスタッター。"""
    n = sig.shape[-1]; ph = (np.arange(n) / SR * rate) % 1.0
    g = np.clip((.55 - ph) * 60, 0, 1)
    return sig * g

# ---------------------------------------------------------------- ミキサー
class Mix:
    BUSES = ('drums', 'bass', 'sub', 'music', 'fx', 'intro')
    def __init__(self, dur):
        self.dur = dur; self.N = ns(dur)
        self.b = {k: np.zeros((2, self.N)) for k in self.BUSES}
        self.rev = np.zeros((2, self.N)); self.drev = np.zeros((2, self.N))
        self.sc_kick = []; self.sc_all = []; self.auto = {}; self.lpauto = {}

    def put(self, bus, t, sig, g=1.0, pan=0.0, rev=0.0, drev=0.0):
        i = ns(t)
        if i >= self.N or i < 0: return
        sig = np.asarray(sig, float)
        if sig.ndim == 1:
            l, r = np.cos((pan + 1) * np.pi / 4) * 1.4142, np.sin((pan + 1) * np.pi / 4) * 1.4142
            sig = np.stack([sig * l, sig * r])
        sig = sig[:, : self.N - i] * g; n = sig.shape[1]
        self.b[bus][:, i:i + n] += sig
        if rev: self.rev[:, i:i + n] += sig * rev
        if drev: self.drev[:, i:i + n] += sig * drev

    def duck(self, t, depth=.8, kick_=True):
        self.sc_all.append((t, depth))
        if kick_: self.sc_kick.append((t, depth))

    def _sc(self, trig, rel=.11):
        g = np.ones(self.N)
        for t, d in trig:
            i = ns(t); n = min(ns(.5), self.N - i)
            if n <= 0: continue
            x = np.arange(n) / SR
            env = 1 - d * np.minimum(x / .004, 1) * np.exp(-np.maximum(x - .004, 0) / rel)
            g[i:i + n] = np.minimum(g[i:i + n], env)
        return g

    def _auto(self, pts):
        xs, ys = zip(*pts); return np.interp(np.arange(self.N) / SR, xs, ys)

    @staticmethod
    def _ir(d, decay, seed):
        r = np.random.default_rng(seed); t = tt(d); ir = np.zeros((2, t.size))
        for c in range(2):
            x = r.standard_normal(t.size) * np.exp(-t * decay)
            ir[c] = lp(x, 7000) * .6 + lp(x, 2000) * .4
            ir[c, :ns(.015)] *= np.linspace(0, 1, ns(.015))
        return ir / np.sqrt((ir ** 2).sum() / 2)

    def render(self, loud_db=-11.0, ceiling_db=-.8, bass_gain=1.0, sub_gain=1.0):
        N = self.N
        for k, pts in self.lpauto.items():
            cut = self._auto(pts)
            self.b[k] = np.stack([svf(self.b[k][c], cut, .8, 'lp') for c in range(2)])
        sc = self._sc(self.sc_all); sck = self._sc(self.sc_kick, .08)
        conv = lambda x, ir: np.stack([signal.fftconvolve(x[c], ir[c])[:N] for c in range(2)])
        rev = conv(hp(self.rev, 200), self._ir(3.2, 2.0, 1)) * .5
        drev = conv(hp(self.drev, 250), self._ir(1.1, 6.0, 2)) * .5
        b = self.b
        bass = b['bass'] * bass_gain * (1 - .5 * (1 - sc)); subb = lp(b['sub'], 140, 4) * sck * sub_gain
        music = b['music'] * (1 - .6 * (1 - sc))
        mix = b['drums'] + b['intro'] + bass + subb + music + b['fx'] + rev * (1 - .5 * (1 - sc)) + drev
        for k, pts in self.auto.items():
            if k == 'master': mix *= self._auto(pts)
        # 低域はモノラルに
        lo = lp(mix.mean(0), 130, 4); mix = hp(mix, 130, 4) + lo
        mix = hp(mix, 24, 2)
        # グルー・コンプ
        env = uniform_filter1d(np.abs(mix).max(0), ns(.03))
        thr = np.percentile(env, 85); gc = np.where(env > thr, (thr / np.maximum(env, 1e-9)) ** (1 - 1 / 2.5), 1.0)
        mix = mix * uniform_filter1d(gc, ns(.02))
        # ラウドネス合わせ → サチュレーション → ルックアヘッド・リミッター
        w = ns(3.0); st = np.sqrt(uniform_filter1d(np.square(mix).mean(0), w))
        top = np.percentile(st, 97); mix = mix * (10 ** (loud_db / 20) / top)
        mix = np.tanh(mix * 1.25) / 1.25 * 1.05
        ceil = 10 ** (ceiling_db / 20); peak = maximum_filter1d(np.abs(mix).max(0), ns(.006))
        gl = np.minimum(1, ceil / np.maximum(peak, 1e-9))
        gl = uniform_filter1d(minimum_filter1d(gl, ns(.012)), ns(.012))
        mix = np.clip(mix * gl, -ceil, ceil)
        self.out = mix
        return mix

    def export(self, path, kbps=192):
        pcm = (self.out.T * 32767).astype(np.int16)
        e = lameenc.Encoder(); e.set_bit_rate(kbps); e.set_in_sample_rate(SR); e.set_channels(2); e.set_quality(2)
        data = e.encode(pcm.tobytes()) + e.flush(); open(path, 'wb').write(data)
        seg = lambda a, b: 20 * np.log10(np.sqrt(np.mean(self.out[:, ns(a):ns(b)] ** 2)) + 1e-9)
        step = 5 if self.dur > 90 else 4
        print(f"wrote {path} {len(data)/1e6:.2f}MB  peak {20*np.log10(np.abs(self.out).max()):.1f}dBFS")
        print(" ".join(f"{s}:{seg(s, s + step):.0f}" for s in range(0, int(self.dur), step)))

# ---------------------------------------------------------------- バリエーション（同じ音の使い回しを避ける）
def _j(x, pct):  # ±pct のゆらぎ
    return x * (1 + (rng.random() * 2 - 1) * pct)

def hit(kind='boom', d=3.0, v=1.0):
    """衝撃音の種類違い。毎回わずかに音程・減衰をゆらす。
    boom: 低く長い／slam: 短く硬い金属感／deep: 超低域だけ沈む／glitch: 途切れるデジタル／sweep: 吸い込んでから落ちる／gong: 金属の余韻"""
    t = tt(d); n = t.size
    if kind == 'slam':
        body = sine(_j(45, .06) + 180 * np.exp(-t * 40), n) * np.exp(-t * 7)
        metal = sum(np.sin(2 * np.pi * _j(f, .03) * t) for f in (317, 541, 823, 1277)) / 4 * np.exp(-t * 9) * .5
        crack = hp(noise(d), 2500) * np.exp(-t * 30) * .9
        x = sat(body * 1.2 + metal + crack, 2.4)
    elif kind == 'deep':
        x = sat(sine(_j(24, .05) + 60 * np.exp(-t * 3), n) * np.exp(-t * 1.1) * 1.4 + lp(noise(d), 300, 4) * np.exp(-t * 2) * 2, 1.6)
    elif kind == 'glitch':
        base = hit('boom', d, 1.0)
        g = np.ones(n); seg = ns(_j(.045, .2))
        for k in range(0, min(n, ns(.7)), seg):
            if rng.random() < .45: g[k:k + seg] = 0
        return sat(base * g + hp(noise(d), 4000) * np.exp(-t * 20) * .4 * g, 1.5) * v
    elif kind == 'sweep':
        pre = ns(.35); tail = hit('boom', d - .35, 1.0)
        k = np.linspace(0, 1, pre); inh = svf(noise(.35), np.geomspace(300, 9000, pre), 2, 'bp') * k ** 3
        return np.concatenate([inh * .9, tail]) * v
    elif kind == 'gong':
        body = sine(_j(38, .05) + 50 * np.exp(-t * 12), n) * np.exp(-t * 2.2)
        ring = sum(np.sin(2 * np.pi * _j(f, .02) * t + rng.random() * 6) * np.exp(-t * (1.2 + i * .5)) for i, f in enumerate((110, 177, 263, 391, 587))) / 5
        x = sat(body + ring * .7 + lp(noise(d), 900) * np.exp(-t * 6), 1.8)
    else:
        body = sine(_j(28, .08) + _j(70, .1) * np.exp(-t * _j(7, .15)), n) * np.exp(-t * _j(1.6, .15))
        x = sat(body * 1.1 + kick(d, _j(260, .1), _j(38, .05)) * .8 + lp(noise(d), _j(1200, .3), 4) * np.exp(-t * 4) * 1.4, 2.0)
    return x * v * fade(n, .0005, .3)

def se(kind, m=76, v=1.0):
    """UI 効果音。種類で役割を分ける（どれも毎回わずかにゆらす）。"""
    if kind == 'pop':      # 出現
        d = .16; t = tt(d); f = hz(m) * (1 + 1.2 * np.exp(-t * 60)); return sine(f, t.size) * np.exp(-t * 26) * v
    if kind == 'coin':     # 資材を得る
        d = .5; t = tt(d); x = sum(np.sin(2 * np.pi * hz(m + i) * t) * np.exp(-t * (7 + i)) for i in (0, 12, 19)) / 2
        x[:ns(.07)] *= 0; x += np.sin(2 * np.pi * hz(m - 5) * t) * np.exp(-t * 30) * (t < .07)
        return x * v
    if kind == 'glass':    # 選択・決定
        d = 1.2; t = tt(d); return sum(np.sin(2 * np.pi * hz(m) * r * t) * np.exp(-t * (3 + i * 2)) / (i + 1) for i, r in enumerate((1, 2.76, 5.4, 8.9))) * v
    if kind == 'flip':     # カードをめくる
        d = .25; t = tt(d); x = bp(noise(d), 1500, 9000) * np.sin(np.pi * np.clip(t / .12, 0, 1)) * (t < .12)
        return (x + hp(noise(d), 3000) * np.exp(-np.clip(t - .12, 0, None) * 120) * (t >= .12) * .8) * v
    if kind == 'swish':    # ドラッグ・移動
        d = .45; t = tt(d); k = t / d; return svf(noise(d), np.geomspace(600, 6000, t.size), 3, 'bp') * np.sin(np.pi * k) ** 2 * .9 * v
    if kind == 'lock':     # 設置・はめ込む
        d = .3; t = tt(d); x = hp(noise(d), 1800) * np.exp(-t * 90) + sine(hz(m - 24) * (1 + np.exp(-t * 50)), t.size) * np.exp(-t * 25) * .8
        return sat(x + np.roll(x, ns(.045)) * .6, 1.5) * v
    if kind == 'down':     # 行動を消費
        d = .28; t = tt(d); return sine(hz(m) * np.exp(-t * 5), t.size) * np.exp(-t * 10) * sat(np.ones(t.size), 1) * v
    if kind == 'error':    # 足りない・警告
        d = .38; t = tt(d); x = square(np.full(t.size, hz(m - 24)), t.size) * .5 + square(np.full(t.size, hz(m - 23.4)), t.size) * .5
        return lp(x, 1800) * ((t % .19) < .13) * fade(t.size, .002, .02) * .6 * v
    if kind == 'ping':     # 情報・レーダー
        d = 1.4; t = tt(d); x = np.sin(2 * np.pi * hz(m) * t) * np.exp(-t * 3.5); return (x + np.roll(x, ns(.22)) * .4 + np.roll(x, ns(.44)) * .18) * v
    if kind == 'type':     # 文字が出る・カウント
        d = .06; t = tt(d); return (bp(noise(d), 2000, 7000) * np.exp(-t * 110) + np.sin(2 * np.pi * hz(m + 12) * t) * np.exp(-t * 90) * .4) * v
    if kind == 'chime':    # 完了・上昇
        return np.concatenate([se('pop', m, v * .8)[: ns(.08)], se('glass', m + 7, v)])
    raise ValueError(kind)
