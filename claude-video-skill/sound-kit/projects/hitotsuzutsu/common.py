"""「ひとつずつ」(15 s・30 fps・96 BPM)の音づくりで B / C が共有する部品。
映像の合図(cues.json)、ステレオの置き方、空間(リバーブ)、EQ、仕上げ(ラウドネスと真のピーク)。
既存の sound-kit/tools(midi_render.py・sfx_lib.py)は変更せず import するだけ。
"""
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, fftconvolve, lfilter, resample_poly, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.abspath(os.path.join(HERE, "..", ".."))          # claude-video-skill/sound-kit
REPO = os.path.abspath(os.path.join(KIT, "..", ".."))
sys.path.insert(0, os.path.join(KIT, "tools"))
sys.path.insert(0, KIT)
import midi_render as M  # noqa: E402  既存
import sfx_lib as S      # noqa: E402  既存

WORK = os.environ.get("SOUND_WORK", os.path.join(REPO, "docs", "sound-upgrade", "work"))
SR = 48000
DUR = 15.0
N = int(DUR * SR)
FPS = 30
BPM = 96
BEAT = 60 / BPM            # 0.625 s
BAR = 4 * BEAT             # 2.5 s
CUES_FILE = os.path.join(HERE, "cues.json")
CUES = {c["name"]: c["frame"] for c in json.load(open(CUES_FILE, encoding="utf-8"))["cues"]}


def T(name):
    """合図の絵の時刻(秒)= コマ番号 / 30"""
    return CUES[name] / FPS


def db(d):
    return 10 ** (d / 20)


def zeros():
    return np.zeros((N, 2), np.float64)


# ------------------------------------------------------------------ 音の置き方
def stereo(x, pan=0.0):
    """mono -> (n,2) 等パワーのパン。stereo はそのまま(バランスだけ)"""
    x = np.asarray(x, np.float64)
    gl, gr = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2), np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    if x.ndim == 1:
        return np.stack([x * gl, x * gr], 1)
    return x * np.array([min(1, gl), min(1, gr)])


def fades(x, a=0.0008, r=0.006):
    """頭と尾に数 ms のフェード(プツッを防ぐ)"""
    x = np.array(x, np.float64, copy=True)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    sh = (-1,) + (1,) * (x.ndim - 1)
    x[:na] *= np.linspace(0, 1, na).reshape(sh)
    x[-nr:] *= np.linspace(1, 0, nr).reshape(sh)
    return x


def add(bus, x, start_s):
    """bus(N,2)の start_s 秒に x(n,2)を足す。はみ出しは切る"""
    i = int(round(start_s * SR))
    if i < 0:
        x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n > 0:
        bus[i:i + n] += x[:n]
    return bus


def env_points(pts):
    """[(t, dB)] を直線でつないだ音量の包絡 (N,1)"""
    t = np.arange(N) / SR
    ts, ds = zip(*sorted(pts))
    return db(np.interp(t, ts, ds))[:, None]


def load_kenney(name, sr=SR):
    p = S.path(name)
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2).astype(np.float64)


def peak_index(x):
    """1 ms RMS 包絡の最大の位置(サンプル)= 音の「頂点」"""
    m = np.asarray(x).mean(1) if np.ndim(x) == 2 else np.asarray(x)
    hop = SR // 1000
    k = len(m) // hop
    e = (m[: k * hop].reshape(k, hop) ** 2).mean(1)
    return int(np.argmax(e)) * hop + hop // 2


# ------------------------------------------------------------------ フィルタ
def hp(x, f, order=2):
    return sosfilt(butter(order, f, "hp", fs=SR, output="sos"), x, axis=0)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "lp", fs=SR, output="sos"), x, axis=0)


def peq(x, f, gain_db, q=1.0):
    """RBJ のピーキング EQ"""
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w), 1 - al * A]); a = np.array([1 + al / A, -2 * np.cos(w), 1 - al / A])
    return lfilter(b / a[0], a / a[0], x, axis=0)


def shelf(x, f, gain_db, kind="low"):
    """RBJ のシェルフ EQ(S=1)"""
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f / SR; c = np.cos(w); al = np.sin(w) / 2 * np.sqrt(2)
    sA = 2 * np.sqrt(A) * al
    if kind == "low":
        b = [A * ((A + 1) - (A - 1) * c + sA), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sA)]
        a = [(A + 1) + (A - 1) * c + sA, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sA]
    else:
        b = [A * ((A + 1) + (A - 1) * c + sA), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sA)]
        a = [(A + 1) - (A - 1) * c + sA, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sA]
    b, a = np.array(b), np.array(a)
    return lfilter(b / a[0], a / a[0], x, axis=0)


# ------------------------------------------------------------------ 空間(リバーブ)
def room_ir(rt=1.2, pre=0.012, bright=6000.0, lo_mult=1.25, hi_mult=0.45, er=0.35, width=0.6, seed=11):
    """部屋のインパルス応答(ステレオ)。初期反射(数本のタップ)+ 後部残響(3 帯域で減衰の速さを変える:
    低域は長く、高域は短く = 本物の部屋に近い)。midi_render.make_ir(全帯域が同じ速さで減衰する雑音)より自然な尾を狙う。
    rt = 中域の残響時間(-60 dB まで)"""
    r = np.random.default_rng(seed)
    n = int((rt * 1.3 + pre + 0.05) * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    # 初期反射: 5〜45 ms、左右で少しずらす
    for k in range(8):
        d = pre + 0.004 + r.uniform(0.0, 0.040)
        g = er * (0.75 ** k) * r.uniform(0.6, 1.0)
        for c in range(2):
            j = int((d + r.uniform(0, 0.003) * (c + 1)) * SR)
            if j < n:
                ir[j, c] += g * (1 if r.random() > 0.3 else -1)
    # 後部残響: 3 帯域の雑音、それぞれの減衰
    tail = np.zeros((n, 2))
    for f_lo, f_hi, mult in ((20, 300, lo_mult), (300, 3000, 1.0), (3000, 16000, hi_mult)):
        nz = r.standard_normal((n, 2))
        if f_lo > 20:
            nz = hp(nz, f_lo)
        nz = lp(nz, min(f_hi, bright if f_hi > 3000 else f_hi))
        tau = rt * mult / 6.91
        tail += nz * np.exp(-np.maximum(t - pre, 0) / tau)[:, None]
    tail *= np.clip((t - pre) / 0.02, 0, 1)[:, None]          # 20 ms で立ち上がる(初期反射の後)
    mid = tail.mean(1, keepdims=True); side = tail - mid
    tail = mid + side * width        # 0.6: 尾の左右を少し揃える(1.0 = 無相関の尾は、モノラル化で 3 dB 落ちる)
    ir += tail / np.sqrt((tail ** 2).sum(0, keepdims=True) + 1e-12) * 0.9
    return ir


_IR = {}


def reverb(x, wet, **kw):
    """x (n,2) に部屋の響きを wet の量だけ足す。尾が切れないよう長さを延ばして返す"""
    if wet <= 0:
        return x
    key = tuple(sorted(kw.items()))
    if key not in _IR:
        _IR[key] = room_ir(**kw)
    ir = _IR[key]
    w = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], 1)
    out = np.pad(x, ((0, len(w) - len(x)), (0, 0))) + w * wet
    return out


# ------------------------------------------------------------------ 仕上げ
def ebur(x_or_path):
    """ffmpeg ebur128: (統合 LUFS, 真のピーク dBTP, LRA)"""
    with tempfile.TemporaryDirectory() as d:
        p = x_or_path
        if not isinstance(p, str):
            p = os.path.join(d, "m.wav"); sf.write(p, np.asarray(x_or_path, np.float32), SR, subtype="FLOAT")
        r = subprocess.run(["ffmpeg", "-nostats", "-i", p, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                           capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    g = lambda pat: float(re.search(pat, s).group(1))
    return g(r"I:\s+(-?[\d.]+) LUFS"), g(r"Peak:\s+(-?[\d.]+) dBFS"), g(r"LRA:\s+(-?[\d.]+) LU")


def limiter(x, ceil_db=-2.0, look=0.004, rel=0.09):
    """4 倍オーバーサンプルの頂点で求める先読みリミッター。戻り値 (y, 最大の削り量 dB, 1 dB 以上削った時刻)"""
    os4 = np.abs(resample_poly(x, 4, 1, axis=0)).max(1)
    os_ = os4[: len(x) * 4].reshape(-1, 4).max(1)[: len(x)]
    g = np.minimum(1, db(ceil_db) / (os_ + 1e-12))
    la = int(look * SR)
    g = minimum_filter1d(g, 2 * la + 1)
    a = np.exp(-1 / (rel * SR)); out = np.empty_like(g); v = 1.0
    for i in range(len(g)):
        v = g[i] if g[i] < v else a * v + (1 - a) * g[i]; out[i] = v
    gr = 20 * np.log10(out + 1e-12)
    hits = []
    for i in np.nonzero(gr < -1.0)[0]:
        if not hits or i / SR - hits[-1][0] > 0.15:
            hits.append([round(i / SR, 2), round(float(gr[i]), 1)])
        else:
            hits[-1][1] = min(hits[-1][1], round(float(gr[i]), 1))
    return x * out[:, None], float(gr.min()), hits


def master(mix, target=-14.0, ceil_db=-2.0):
    """統合ラウドネスを target に、真のピークを ceil_db 以下に(AAC で約 1 dB 上がるため WAV は -2 dBTP)。
    直流を取り、ゲインとリミッターを交互に詰める。戻り値 (y, info)"""
    mix = mix - mix.mean(0)
    I, _, _ = ebur(mix)
    gain = db(target - I); y = mix; red = 0.0; hits = []
    for _ in range(8):
        y, red, hits = limiter(mix * gain, ceil_db)
        I2, TP, LRA = ebur(y)
        if abs(I2 - target) < 0.05:
            break
        gain *= db(target - I2)
    y = fades(y, 0.002, 0.012)
    I2, TP, LRA = ebur(y)
    return y, {"lufs": I2, "tp": TP, "lra": LRA, "gain_db": round(20 * np.log10(gain), 2),
               "limiter_max_db": round(red, 2), "limiter_hits": hits}


def write(path, x, subtype="PCM_24"):
    """PCM は ±1 に収めて書く。FLOAT(ステム)は削らずにそのまま書く(頂点を後で正しく測れるように)"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = np.asarray(x, np.float64)
    if subtype != "FLOAT":
        x = np.clip(x, -1, 1)
    sf.write(path, x.astype(np.float32), SR, subtype=subtype)


def low_duck(x, times, depth_db=-9.0, f=160.0, pre=0.015, hold=0.12, rel=0.15):
    """周波数を選んだダッキング(既定 160 Hz: 検査の 120 Hz より少し上で切り、116 Hz の Bb2 なども確実に含める): x の f Hz 未満だけを times の各時刻のまわりで下げる(低い効果音とベースの重なりを解く)。
    ゼロ位相のフィルタで low を取り、high = x - low なので、下げない所は元の音と完全に同じ"""
    from scipy.signal import sosfiltfilt
    low = sosfiltfilt(butter(4, f, "lp", fs=SR, output="sos"), x, axis=0)
    high = x - low
    pts = [(0, 0)]
    for item in times:               # 時刻だけ、または (時刻, 保持秒, 深さ dB)
        t, h, d = (item, hold, depth_db) if np.isscalar(item) else (tuple(item) + (hold, depth_db))[:3]
        pts += [(t - pre - 0.03, 0), (t - pre, d), (t + h, d), (t + h + rel, 0)]
    g = env_points(pts + [(DUR, 0)])
    return high + low * g
