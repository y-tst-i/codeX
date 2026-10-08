#!/usr/bin/env python3
"""STILLDUSK 15s PV — soundtrack (docs/SOUND_BIBLE.md の合図表どおり)。
出力: soundtrack_raw.wav (44.1kHz / stereo / 16bit / 661500 samples = 15.000s / peak -1 dBFS)
決定的: 乱数は numpy default_rng(seed) のみ(seed: s1=101 s2=202 s3=303 s4=404 s5=505)。
各 put() は real / syn(合成) を分けて積むので、合成音のエネルギー比を最後に出せる(syn_share.txt)。
"""
import os, sys, subprocess
import numpy as np
import scipy.io.wavfile as wavfile
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.ndimage import minimum_filter1d, uniform_filter1d

TOOLS = "/home/user/codeX/claude-video-skill/tools"
sys.path.insert(0, TOOLS)
import pretty_midi as pm
import midi_render as M
import sfx_lib as S

B = os.path.dirname(os.path.abspath(__file__))
SR = 44100
DUR = 15.0
N = int(round(SR * DUR))
EXT = "/root/.claude/skills/media-use/audio/assets/sfx/"
G = lambda g: g / 30.0          # フレーム -> 秒
DB = lambda d: 10 ** (d / 20)


# ---------------------------------------------------------------- 基本部品
def pink(n, seed):
    """ピンクノイズ(1/f、FFT 整形)。白色ノイズは単体では使わない。"""
    r = np.random.default_rng(seed)
    X = np.fft.rfft(r.standard_normal(n))
    f = np.arange(len(X)); f[0] = 1
    y = np.fft.irfft(X / np.sqrt(f), n)
    return (y / (np.abs(y).max() + 1e-12)).astype(np.float64)


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, kind, fs=SR, output="sos"), x, axis=0)


def tv_filt(x, fn, block=256):
    """時変フィルタ。fn(t_sec) -> sos。ブロックごとに係数を替え、状態を引き継ぐ。"""
    x = np.atleast_2d(x.T).T
    y = np.zeros_like(x); zi = None
    for i in range(0, len(x), block):
        sos = fn((i + block / 2) / SR)
        if zi is None: zi = np.zeros((sos.shape[0], 2, x.shape[1]))
        y[i:i + block], zi = sosfilt(sos, x[i:i + block], axis=0, zi=zi)
    return y


def lp_sos(c): return butter(2, float(np.clip(c, 30, SR * 0.45)), "lowpass", fs=SR, output="sos")
def bp_sos(lo, hi): return butter(2, [float(np.clip(lo, 20, SR * 0.4)), float(np.clip(hi, lo * 1.2, SR * 0.45))], "bandpass", fs=SR, output="sos")


def st(x, pan=0.0):
    """mono -> stereo(定電力パン)。stereo はそのまま(パンだけ傾ける)。"""
    a = (pan + 1) * np.pi / 4
    if x.ndim == 1: return np.stack([x * np.cos(a), x * np.sin(a)], 1) * np.sqrt(2)
    return x * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)


def onset(x, thr=0.3):
    m = np.abs(x if x.ndim == 1 else x.sum(1))
    return int(np.argmax(m > thr * m.max()))


def peak(x):
    m = np.abs(x if x.ndim == 1 else x.sum(1))
    return int(np.argmax(uniform_filter1d(m, 441)))


def varispeed(x, rate):
    """rate(出力サンプルごとの再生速度)で読み進める。0.5 = 1オクターブ下・2倍の長さ。"""
    x = np.atleast_2d(x.T).T
    rate = np.broadcast_to(rate, (int(len(x) / np.min(rate)) + 1,)) if np.ndim(rate) == 0 else rate
    pos = np.concatenate([[0], np.cumsum(rate)[:-1]])
    pos = pos[pos < len(x) - 1]
    idx = np.arange(len(x))
    return np.stack([np.interp(pos, idx, x[:, c]) for c in range(x.shape[1])], 1)


def env_exp(n, tau, a=0.002):
    t = np.arange(n) / SR
    return np.minimum(t / a, 1) * np.exp(-t / tau)


def room(x, sec, wet, damp, seed, lp=None, hp=None):
    return M.scene_fx(np.atleast_2d(x.T).T.astype(np.float32), rev=sec, wet=wet, damp_hz=damp, lp_hz=lp, hp_hz=hp, seed=seed).astype(np.float64)


def ext(name):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", EXT + name, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).astype(np.float64)


def sfx(name): return S.load(name, sr=SR).astype(np.float64)


def bright(x): return x + 1.2 * filt(x, "highpass", 3000)   # 命中のガラスだけ高域を持ち上げる


def gm(prog, notes, tail=2.0, drum=False, gain=0.8):
    m = pm.PrettyMIDI(initial_tempo=150)
    ins = pm.Instrument(program=prog, is_drum=drum)
    for p, v, s, e in notes:
        ins.notes.append(pm.Note(velocity=int(np.clip(v, 1, 127)), pitch=int(p), start=float(s), end=float(e)))
    m.instruments.append(ins)
    return M.render(m, tail=tail, gain=gain).astype(np.float64)


class Bus:
    """real(録音・GM音源)と syn(合成)を別々に持つ。線形処理は両方に同じくかける。"""
    def __init__(s): s.a = {"real": np.zeros((N, 2)), "syn": np.zeros((N, 2))}

    def put(s, x, t, g=1.0, pan=0.0, align="start", syn=False):
        x = st(np.asarray(x, dtype=np.float64), pan) * g
        off = {"start": 0, "onset": onset(x, 0.2) if align == "onset" else 0, "peak": peak(x) if align == "peak" else 0}[align]
        if align == "onset":                      # 立ち上がりの前は 3ms だけ残す(合図より前に漏らさない)
            pre = int(0.003 * SR); cut = max(0, off - pre)
            x = x[cut:].copy(); off -= cut; x[:off] *= np.linspace(0, 1, off)[:, None] if off else 1
        i = int(round(t * SR)) - off
        if i < 0: x = x[-i:]; i = 0
        n = min(len(x), N - i)
        if n > 0: s.a["syn" if syn else "real"][i:i + n] += x[:n]

    def fx(s, fn):
        for k in s.a:
            y = fn(s.a[k]); y = y[:N]
            s.a[k] = np.pad(y, ((0, N - len(y)), (0, 0)))

    def gain(s, env):
        for k in s.a: s.a[k] *= env[:, None]

    def sum(s): return s.a["real"] + s.a["syn"]


T = np.arange(N) / SR


def ramp_env(points):
    """[(t, dB), ...] の折れ線(dB補間)。"""
    ts, ds = zip(*points)
    return DB(np.interp(T, ts, ds))


# ================================================================ s1_hatch 0.0–2.0 (seed 101)
s1 = Bus()
r1 = np.random.default_rng(101)
# 機内のうなり: 55/110/165Hz をゆらがせた倍音 + 低域の細かいノイズ(合成)
t1 = T[:int(2.0 * SR)]
wob = 1 + 0.004 * np.sin(2 * np.pi * 0.37 * t1) + 0.003 * np.sin(2 * np.pi * 0.83 * t1 + 1.1)
ph = 2 * np.pi * 55 * np.cumsum(wob) / SR
hum = sum(a * np.sin(k * ph + r1.uniform(0, 6.28)) for k, a in [(1, 1.0), (2, 0.6), (3, 0.45), (4, 0.18), (6, 0.08)])
hum *= 1 + 0.15 * np.sin(2 * np.pi * 3.1 * t1)
hum = hum / np.abs(hum).max() + 0.5 * filt(pink(len(t1), 1011), "bandpass", [60, 400])
hum *= np.interp(t1, [0, 0.9, 1.75, 1.8], [0.25, 1, 1, 0])
s1.put(hum, 0.0, g=0.10, syn=True)
# コントラバスの低いトレモロ (GM 43)
nt = []
for i, s in enumerate(np.arange(0, 1.78, 1 / 12)):
    for p in (28, 35):
        nt.append((p, 30 + 40 * min(s / 1.2, 1) + r1.integers(-3, 3), s, s + 1 / 11))
cb = gm(43, nt, tail=0.3)
cb[:, :] *= np.interp(np.arange(len(cb)) / SR, [0, 1.75, 1.8, 9], [1, 1, 0, 0])[:, None]
s1.put(cb, 0.0, g=0.9)
# G24 非常灯の回転機構: 金属のクリック(録音)+ ヘリのローター(GM 125)を下げてモーター音に + 息を吸う(GM 121)
s1.put(sfx("metalClick"), G(24), g=2.6, pan=0.35, align="onset")
mot = gm(125, [(30, 70, 0, 0.42)], tail=0.15)
mot *= np.interp(np.arange(len(mot)) / SR, [0, 0.03, 0.4, 0.57], [0, 1, 0.6, 0])[:, None]
s1.put(filt(mot, "lowpass", 1500), G(24), g=1.8, pan=0.3)
br = gm(121, [(60, 70, 0, 0.38)], tail=0.2)
s1.put(filt(br, "bandpass", [400, 3000]), G(24) + 0.02, g=1.6, pan=-0.1)
# G36 扉の破裂: 金属板(録音)×2 + 留め金 + 油圧の抜け(ピンクノイズの帯域、合成)
door = np.zeros(int(1.0 * SR))
for nm, g in [("impactPlate_heavy_002", 1.0), ("impactMetal_medium_000", 0.8), ("impactMetal_light_003", 0.5)]:
    x = sfx(nm); x = np.roll(np.pad(x, (0, len(door))), -onset(x))[:len(door)]; door += x * g
door = filt(door, "lowpass", 5000)
s1.put(door, G(36), g=1.0, pan=-0.05)
s1.put(sfx("metalLatch"), G(36) + 0.03, g=0.45, pan=0.3, align="onset")
nh = int(0.75 * SR)
HISS = filt(pink(nh, 1012), "bandpass", [1800, 7500]) * np.interp(np.arange(nh) / SR, [0, 0.008, 0.12, 0.75], [0, 1, 0.55, 0]) ** 1.5
s1.put(HISS, G(36), g=0.35, pan=0.15, syn=True)
# 空間: 金属の箱、短く暗い(0.4s、高域を削る)
s1.fx(lambda x: room(x, 0.4, 0.35, 2500, 11, lp=6000))
s1.gain(np.where(T < 1.8, 1, np.where(T < 1.82, 1 - (T - 1.8) / 0.02, 0)) + 0 * T)

# ================================================================ s2_drop 2.0–4.4 (seed 202)
r2 = np.random.default_rng(202)
wind = Bus()
# 風の轟音: J カット (G42 -20dB → G54 全開) → s2 で帯域が上から下へ
nw = int(3.4 * SR)
w = np.stack([pink(nw, 2021), pink(nw, 2022)], 1)
cen = lambda t: np.interp(t + 1.3, [1.3, 2.0, 3.9, 4.6], [3500, 3000, 300, 250])
w = tv_filt(w, lambda t: bp_sos(cen(t) / 2.2, cen(t) * 2.2))
tw = np.arange(nw) / SR + 1.3
gust = 1 + 0.25 * np.sin(2 * np.pi * 0.9 * tw) + 0.15 * np.sin(2 * np.pi * 2.3 * tw + 0.7)
w *= (gust * np.interp(tw, [1.3, 1.4, 1.8, 3.9, 4.0, 4.3, 4.6], [0, 0.1, 1, 0.85, 0.35, 0.25, 0]))[:, None]
wind.put(w, 1.3, g=1.1, syn=True)
# G108 クラッシュズーム: ピンクノイズの通過音 + 同梱 whoosh-cinematic(山を G108 に)
npz = int(0.75 * SR)
tp = np.arange(npz) / SR - 0.45            # 0 = G108
wp = tv_filt(pink(npz, 2023), lambda t: bp_sos(np.interp(t - 0.45, [-0.45, 0, 0.3], [500, 2800, 700]) / 1.8, np.interp(t - 0.45, [-0.45, 0, 0.3], [500, 2800, 700]) * 1.8))[:, 0]
wp *= np.where(tp < 0, np.exp(tp / 0.12), np.exp(-tp / 0.09))
wind.put(st(wp, 0) * np.stack([np.interp(tp, [-0.45, 0.3], [0.5, 1.4]), np.interp(tp, [-0.45, 0.3], [1.4, 0.5])], 1), G(108) - 0.45, g=0.35, syn=True)
wc = ext("whoosh-cinematic.mp3"); pk = peak(wc)
wc = wc[pk - int(0.5 * SR): pk + int(0.6 * SR)] * np.interp(np.arange(int(1.1 * SR)) / SR, [0, 0.3, 0.6, 1.1], [0, 1, 0.7, 0])
wind.put(filt(wc, "highpass", 150), G(108), g=0.55, align="peak")

s2 = Bus()
# 太鼓 (GM 116): G72, 84, 96, 108
for k, gf in enumerate([72, 84, 96, 108]):
    tk = gm(116, [(41, 120 if k in (0, 2) else 105, 0, 0.3), (36, 100, 0, 0.3)], tail=1.0)
    s2.put(tk, G(gf), g=1.0 + 0.6 * (k == 3), pan=[-0.15, 0.15, -0.1, 0.1][k], align="onset")
# ブラス・セクション (GM 61) の刻み: G72 と G96
for t0, up in [(G(72), 0), (G(96), 3)]:
    nts = []
    for dt, ln, v in [(0, 0.17, 115), (0.1, 0.07, 95), (0.2, 0.17, 110)]:
        for p in (38, 45, 50, 53):
            nts.append((p + up, v, dt, dt + ln))
    s2.put(gm(61, nts, tail=0.6), t0, g=0.55, align="onset")
# リバースシンバル (GM 119): G96→G108 に膨らみ、山を G108 に
rc = gm(119, [(60, 100, 0, 1.6)], tail=0.4)
rp = peak(rc); rc = rc[max(0, rp - int(0.4 * SR)): rp + int(0.05 * SR)]
rc *= np.interp(np.arange(len(rc)) / SR, [0, 0.1, len(rc) / SR - 0.02, len(rc) / SR], [0, 1, 1, 0])[:, None]
s2.put(rc, G(108), g=0.5, align="peak")
# 打撃にだけ長く明るい尾 (2.0s)
s2.fx(lambda x: room(x, 2.0, 0.32, 9000, 21))
# ほぼ無音① G118–119: 風・太鼓の尾を -30dB
duck1 = ramp_env([(0, 0), (G(117.6), 0), (G(118), -30), (G(120) - 0.003, -30), (G(120), 0), (15, 0)])
s2.gain(duck1); wind.gain(duck1)

# G120 着地: 低い衝撃(同梱 impact-bass-1 を減衰させて)+採掘の衝撃・柔らかい重い衝撃(録音)+オケヒット(GM 55)+クラッシュ+サブ40Hz
land = Bus()
ib = ext("impact-bass-1.mp3"); o = onset(ib); ib = ib[o:] * env_exp(len(ib) - o, 0.45, 0.001)
land.put(filt(ib, "lowpass", 2500), G(120), g=0.55)
for nm, g, pn in [("impactMining_002", 0.7, -0.2), ("impactSoft_heavy_001", 0.8, 0.2), ("impactMining_004", 0.4, 0.35)]:
    land.put(sfx(nm), G(120), g=g, pan=pn, align="onset")
land.put(gm(55, [(50, 127, 0, 0.5), (62, 120, 0, 0.5)], tail=1.2), G(120), g=0.7, align="onset")
land.put(gm(0, [(49, 115, 0, 1.5), (57, 100, 0, 1.5)], tail=2.0, drum=True), G(120), g=0.55, align="onset")
ns = int(1.7 * SR); tsub = np.arange(ns) / SR
sub = (np.sin(2 * np.pi * 40 * tsub) + 0.3 * np.sin(2 * np.pi * 80 * tsub + 0.4)) * env_exp(ns, 0.45, 0.004)
land.put(sub, G(120), g=0.45, syn=True)
land.fx(lambda x: room(x, 2.0, 0.3, 8000, 22))
# Lカット①: 着地の轟音(ごく低い地鳴り)が s3 の G170 まで
nr = int((G(170) - G(120)) * SR)
rum = filt(pink(nr, 2024), "bandpass", [30, 180]) * np.interp(np.arange(nr) / SR, [0, 0.01, 0.4, nr / SR], [0, 1, 0.45, 0]) ** 1.3
land.put(np.stack([rum, filt(pink(nr, 2025), "bandpass", [30, 180]) * np.interp(np.arange(nr) / SR, [0, 0.01, 0.4, nr / SR], [0, 1, 0.45, 0]) ** 1.3], 1), G(120), g=0.5, syn=True)

# ================================================================ s3_stalk 4.4–7.6 (seed 303)
r3 = np.random.default_rng(303)
s3 = Bus()
# 暗い風 200–1.5kHz(合成)
n3 = int(3.4 * SR); t3 = np.arange(n3) / SR + 4.2
dw = filt(np.stack([pink(n3, 3031), pink(n3, 3032)], 1), "bandpass", [200, 1500])
dw *= (np.interp(t3, [4.2, 4.6, 7.0], [0, 1, 0.9]) * (1 + 0.3 * np.sin(2 * np.pi * 0.31 * t3) + 0.2 * np.sin(2 * np.pi * 0.77 * t3 + 2)))[:, None]
s3.put(dw, 4.2, g=0.11, syn=True)
# 砂粒のさらさら: 疎な粒(帯域を絞ったピンクの微小バースト)
gr = np.zeros((n3, 2)); gsrc = filt(pink(n3, 3033), "bandpass", [1500, 3800])
for k in range(int(3.0 * 140)):
    i = int(r3.uniform(0, n3 - 200)); L = int(r3.uniform(40, 160)); a = r3.uniform(0.2, 1)
    pnv = r3.uniform(-0.8, 0.8)
    seg = gsrc[i:i + L] * np.hanning(L) * a
    gr[i:i + L] += np.stack([seg * (1 - pnv) / 2, seg * (1 + pnv) / 2], 1)
gr *= np.interp(t3, [4.2, 4.7, 7.0], [0, 1, 1])[:, None]
s3.put(gr, 4.2, g=0.25, syn=True)
# 足音 G156,168,180,192,204: 雪(=塩の砂の踏みしめ)を 5 種順に。強さ・左右を seed で
for k, gf in enumerate([156, 168, 180, 192, 204]):
    s3.put(sfx(f"footstep_snow_00{k}"), G(gf), g=0.55 * r3.uniform(0.8, 1.1), pan=r3.uniform(-0.25, 0.25), align="onset")
# G168 遠い金属のきしみ(録音、ピッチを下げて遠く)
s3.put(filt(varispeed(sfx("creak2"), 0.8)[:, 0], "bandpass", [250, 2200]), G(168), g=0.35, pan=-0.55, align="onset")
# 尺八系の息の長音 (GM 77) G168–G209、ごく小さく
sh = gm(77, [(55, 50, 0, 1.33)], tail=0.15)
sh *= np.interp(np.arange(len(sh)) / SR, [0, 0.4, 1.2, 1.38], [0, 1, 1, 0])[:, None]
s3.put(sh, G(168), g=0.22, pan=0.2)
# G198 クロスヘア: 布ずれ + ベルトの小さな音
s3.put(sfx("cloth3"), G(198), g=1.2, pan=0.25, align="onset")
s3.put(sfx("clothBelt"), G(198) + 0.06, g=0.4, pan=0.35)
# 空間: 中程度で暗い(1.5s、4kHz で落とす)
s3.fx(lambda x: room(x, 1.5, 0.38, 4000, 31, lp=4000))
# ほぼ無音② G210–227: -40dB / s3→s4 は絵と音が同時のハードカット(G228)
s3.gain(ramp_env([(0, 0), (G(209), 0), (G(210), -40), (15, -40)]) * (T < G(228)))
free = Bus()
# 残すもの: 40Hz の低いうなり(倍音つき、合成)と G216 の心音(GM 35)1回
nl = int((G(228) - 6.4) * SR); tl = np.arange(nl) / SR
lowh = (np.sin(2 * np.pi * 40 * tl) + 0.35 * np.sin(2 * np.pi * 80 * tl + 1) + 0.6 * filt(pink(nl, 3034), "lowpass", 90) / 0.1) * np.interp(tl, [0, 0.5, nl / SR - 0.003, nl / SR], [0, 1, 1, 0])
free.put(lowh, 6.4, g=0.022, syn=True)
hb = gm(0, [(35, 110, 0, 0.12), (35, 72, 0.13, 0.2)], tail=0.2, drum=True)
hb *= np.interp(np.arange(len(hb)) / SR, [0, 0.2, 0.26], [1, 1, 0])[:, None]
free.put(filt(hb, "lowpass", 400), G(216), g=0.55, align="onset")
free.gain((T < G(228)).astype(float))

# ================================================================ s4_shot 7.6–12.0 (seed 404)
r4 = np.random.default_rng(404)
shot = Bus()
# 銃声: クラック(5ms高域)+胴鳴り(帯域ノイズ80ms)+金属・打撃(録音)+GM 127 Gunshot+キック+低い唸り
nc = int(0.005 * SR); crack = filt(pink(nc + 200, 4041), "highpass", 3500)[:nc] * np.exp(-np.arange(nc) / SR / 0.0015)
crack /= np.abs(crack).max()
shot.put(crack, G(228), g=1.3, syn=True)
nb = int(0.08 * SR); body = filt(pink(nb, 4042), "bandpass", [250, 2500]); body = body / np.abs(body).max() * env_exp(nb, 0.025, 0.0005)
shot.put(body, G(228), g=1.2, syn=True)
shot.put(sfx("impactMetal_heavy_001"), G(228), g=0.8, pan=0.05, align="onset")
shot.put(sfx("impactPunch_heavy_000"), G(228), g=1.3, align="onset")
shot.put(gm(127, [(50, 127, 0, 0.6)], tail=1.0), G(228), g=1.4, align="onset")
shot.put(gm(0, [(36, 127, 0, 0.2)], tail=0.5, drum=True), G(228), g=0.8, align="onset")
ng = int(0.7 * SR); growl = filt(pink(ng, 4043), "bandpass", [35, 140]); growl = growl / np.abs(growl).max() * env_exp(ng, 0.18, 0.004)
shot.put(growl, G(228), g=0.9, syn=True)
shot.fx(lambda x: room(x, 4.0, 0.3, 3000, 41))
# G234–245: 音が吸い込まれる — 尾をピッチダウン(速度 1→0.5)+ ローパス 8k→300Hz
i0 = int(G(234) * SR)
for k in shot.a:
    a = shot.a[k]; tail = a[i0:].copy()
    rate = np.interp(np.arange(len(tail)) / SR, [0, G(245) - G(234)], [1.0, 0.5])
    v = varispeed(tail, rate)
    v = tv_filt(v, lambda t: lp_sos(np.exp(np.interp(t, [0, G(246) - G(234)], [np.log(8000), np.log(300)]))))
    v *= ramp_env([(0, 0), (G(234), 0), (G(246), -18), (G(258), -34), (G(300), -60), (15, -80)])[i0:i0 + len(v)][:, None]
    xf = int(0.004 * SR); out = np.zeros_like(a); out[:i0] = a[:i0]
    out[i0:i0 + len(v)] = v[:N - i0]
    out[i0 - xf:i0 + xf] = a[i0 - xf:i0 + xf] * np.linspace(1, 0, 2 * xf)[:, None] + out[i0 - xf:i0 + xf] * np.linspace(0, 1, 2 * xf)[:, None]
    shot.a[k] = out

slow = Bus()
# 吸い込まれた低いうなり(環境、合成)
ns4 = int((G(306) - G(234)) * SR); ts4 = np.arange(ns4) / SR
sd = filt(np.stack([pink(ns4, 4044), pink(ns4, 4045)], 1), "lowpass", 160) * np.interp(ts4, [0, 0.4, ts4[-1] - 0.3, ts4[-1]], [0, 1, 1, 0])[:, None]
sd *= ramp_env([(0, 0), (G(244) - G(234), 0), (G(247) - G(234), -12), (G(257) - G(234), -12), (G(266) - G(234), 0), (15, 0)])[:len(sd)][:, None]
slow.put(sd, G(234), g=0.12, syn=True)
# 弦の低いクラスター (GM 49) G234–G330
clu = gm(49, [(p, 70, 0, G(330) - G(234)) for p in (36, 37, 39, 40, 43)], tail=1.0)
clu *= np.interp(np.arange(len(clu)) / SR, [0, 0.35, 3.0, 3.2, 3.3], [0, 1, 1, 1, 0.0])[:, None]
# ローパス: スロー区間は 300Hz に閉じる → G306 で開く
cut4 = lambda t: np.exp(np.interp(t + G(234), [G(234), G(246), G(306), G(318)], [np.log(1500), np.log(320), np.log(320), np.log(14000)]))
clu *= ramp_env([(0, 0), (G(244) - G(234), 0), (G(247) - G(234), -9), (G(257) - G(234), -9), (G(266) - G(234), 0), (15, 0)])[:len(clu)][:, None]
slow.put(tv_filt(clu, lambda t: lp_sos(cut4(t))), G(234), g=0.5)
# ティンパニのロール (GM 47) G282→G305 クレッシェンド
roll = [(43, 45 + 75 * (s / (G(305) - G(282))) ** 1.3, s, s + 0.06) for s in np.arange(0, G(305) - G(282), 0.055)]
slow.put(filt(gm(47, roll, tail=0.5), "lowpass", 2500), G(282), g=1.3)
slow.fx(lambda x: room(x, 4.0, 0.4, 1500, 42))

fast = Bus()
# G306 加速: 弦の上行グリッサンド (GM 48)
gl = [(48 + i, 50 + 2 * i, i * 0.032, i * 0.032 + 0.1) for i in range(24)]
fast.put(gm(48, gl, tail=0.4), G(306), g=1.8, pan=-0.2)
# 歪んだギター (GM 30 Distortion Guitar) の刻み 16分→32分
gt = []
for s in np.arange(0, 0.4, 0.1): gt += [(p, 85 + 20 * s, s, s + 0.07) for p in (40, 47)]
for s in np.arange(0.4, G(330) - G(306) - 0.02, 0.05): gt += [(p, 100 + 30 * (s - 0.4), s, s + 0.035) for p in (40, 47)]
fast.put(gm(30, gt, tail=0.3), G(306), g=2.6, pan=0.2)
# G330 命中: ガラス(録音)+ティンパニの一撃+ギターの和音(長く鳴らして Lカット②)+低いブーム
fast.put(bright(sfx("impactGlass_heavy_001")), G(330), g=2.0, pan=0.1, align="onset")
fast.put(bright(sfx("impactGlass_medium_002")), G(330), g=1.5, pan=-0.2, align="onset")
fast.put(bright(sfx("impactGlass_heavy_004")), G(330) + 0.012, g=1.2, pan=0.4, align="onset")
fast.put(gm(47, [(38, 127, 0, 0.8)], tail=1.0), G(330), g=0.5, align="onset")
ib2 = ext("impact-bass-2.mp3"); pk2 = peak(ib2); ib2 = ib2[pk2 - int(0.004 * SR):] * env_exp(len(ib2) - pk2 + int(0.004 * SR), 0.3, 0.004)
fast.put(filt(ib2, "lowpass", 900), G(330), g=0.25)
# 破片 G330–342: ガラスの小片 5 個を左右に散らす
for k in range(5):
    tk = G(331) + k * 0.075 + r4.uniform(0, 0.03)
    fast.put(bright(sfx(f"impactGlass_light_00{k}")), tk, g=0.9 * (1 - 0.13 * k), pan=(-1) ** k * r4.uniform(0.4, 0.85), align="onset")
fast.fx(lambda x: room(x, 0.3, 0.25, 12000, 43))
# ギター和音は Lカット②として G380 まで鳴らす(加工の後に足す=乾いた空間の外の尾)
chord = gm(30, [(p, 120, 0, 1.4) for p in (40, 47, 52, 55)], tail=0.4)
chord *= np.interp(np.arange(len(chord)) / SR, [0, 0.2, 1.0, G(380) - G(330), 2.0], [1, 0.6, 0.18, 0, 0])[:, None]
tail_g = Bus(); tail_g.put(chord, G(330), g=0.5, align="onset")
tail_g.fx(lambda x: room(x, 1.2, 0.3, 6000, 44))
tail_g.gain(ramp_env([(0, 0), (G(370), 0), (G(380), -40), (15, -80)]))

# ================================================================ s5_title 11.8–15.0 (seed 505)
s5 = Bus()
# Jカット②: 地平線の乾いた微風(明るめの帯域、合成)を G354 から
n5 = N - int(G(354) * SR); t5 = np.arange(n5) / SR + G(354)
bz = filt(np.stack([pink(n5, 5051), pink(n5, 5052)], 1), "bandpass", [350, 3500])
bz *= (np.interp(t5, [G(354), G(354) + 0.02, G(360), G(372), 14.0, 14.7], [0, 1, 0.35, 1, 1, 0]) * (1 + 0.2 * np.sin(2 * np.pi * 0.23 * t5)))[:, None]
s5.put(bz, G(354), g=0.09, syn=True)
# 合唱の息 (GM 53) が先に入る
cb5 = gm(53, [(57, 80, 0, 0.3), (62, 72, 0, 0.3)], tail=0.3)
cb5 *= np.interp(np.arange(len(cb5)) / SR, [0, 0.05, 0.2, 0.3], [0.5, 1, 0.5, 0])[:, None]
s5.put(cb5, G(354), g=1.6)
# G372 扉: s1 の油圧の抜けを 1 オクターブ下げて柔らかく(呼応)+ 扉のきしみ(録音)を小さく
hs = varispeed(HISS, 0.5)[:, 0]; hs = filt(hs, "lowpass", 2500) * np.interp(np.arange(len(hs)) / SR, [0, 0.04, 1.5], [0, 1, 1])
s5.put(hs, G(372), g=0.45, pan=-0.1, syn=True)
s5.put(filt(varispeed(sfx("doorOpen_1"), 0.85)[:, 0], "lowpass", 3000), G(372), g=0.3, pan=0.15, align="onset")
# G384 タイトルの山: 合唱 ウー (GM 53) + 低いピアノのオクターブ (GM 0) + サブの膨らみ
ch = gm(53, [(p, 95, 0, G(420) - G(384)) for p in (50, 57, 62, 64, 69)], tail=1.0)
ch *= ramp_env([(0, 0), (0.5, 0), (G(408) - G(384) - 0.05, -7), (G(420) - G(384), -7), (G(420) - G(384) + 0.35, -18), (15, -30)])[:len(ch)][:, None]
s5.put(ch, G(384), g=0.5)
s5.put(gm(0, [(26, 110, 0, 1.8), (38, 105, 0, 1.8)], tail=1.0), G(384), g=1.1, align="onset")
nsw = int(2.2 * SR); tsw = np.arange(nsw) / SR
swell = (np.sin(2 * np.pi * 36.7 * tsw) + 0.4 * np.sin(2 * np.pi * 73.4 * tsw)) * np.interp(tsw, [0, 0.03, 0.35, 2.2], [0, 0.5, 1, 0]) ** 1.5
s5.put(swell, G(384), g=0.22, syn=True)
# G408 COMING SOON: ハープの開いた5度 (GM 46) を和音で1回
s5.put(gm(46, [(p, 95, 0, 1.2) for p in (50, 57, 64)], tail=1.5), G(408), g=1.8, pan=0.1, align="onset")
# 広く明るめ、長い (3.0s)。最後は高域を抜いて消える
s5.fx(lambda x: room(x, 3.0, 0.38, 10000, 51))
s5.fx(lambda x: tv_filt(x, lambda t: lp_sos(np.exp(np.interp(t, [0, 14.0, 14.7], [np.log(16000), np.log(16000), np.log(500)])))))

# ================================================================ mix
buses = [s1, wind, s2, land, s3, free, shot, slow, fast, tail_g, s5]
real = sum(b.a["real"] for b in buses); syn = sum(b.a["syn"] for b in buses)
mix = real + syn
# 簡易ルックアヘッド・リミッタ(ゲインは real/syn に同じくかける)
thr = 0.5 * np.abs(mix).max()
pk_ = np.abs(mix).max(1)
graw = np.minimum(1, thr / np.maximum(pk_, 1e-9))
w = int(0.003 * SR)
g = uniform_filter1d(minimum_filter1d(graw, 2 * w + 1), w)
g = np.minimum(g, graw)
# 最後: G441 以降はほぼ無音、末尾 10ms で 0
end = ramp_env([(0, 0), (14.55, 0), (14.7, -45), (15, -70)]) * np.clip((DUR - T) / 0.01, 0, 1) * np.clip(T / 0.005, 0, 1)
real *= (g * end)[:, None]; syn *= (g * end)[:, None]
mix = real + syn
sc = DB(-1.0) / np.abs(mix).max()
mix *= sc; real *= sc; syn *= sc
assert len(mix) == N
wavfile.write(os.path.join(B, "soundtrack_raw.wav"), SR, np.round(np.clip(mix, -1, 1) * 32767).astype(np.int16))
e_syn = float((syn ** 2).sum()); e_all = float((mix ** 2).sum())
# 合成音の「鳴っている時間」の割合も出す(合成が -20dB 以上で主役になっている 50ms 窓の割合)
win = int(0.05 * SR); k = N // win
rs = np.sqrt((syn[:k * win] ** 2).reshape(k, win, 2).mean((1, 2))); ra = np.sqrt((real[:k * win] ** 2).reshape(k, win, 2).mean((1, 2)))
dom = float(np.mean(rs > ra))
with open(os.path.join(B, "chk_syn_share.txt"), "w") as f:
    f.write(f"syn_energy_share={e_syn / e_all:.3f}\nsyn_dominant_window_share={dom:.3f}\n")
print("wrote soundtrack_raw.wav", N, "samples; syn energy share %.3f, syn-dominant windows %.3f" % (e_syn / e_all, dom))
