#!/usr/bin/env python3
"""「ひとつずつ」の音(BGM + 効果音)。seed 固定、毎回同じ結果。
出力(このフォルダ):
  stem_music.wav … 音楽(ベッド+場面の楽器)+ 部屋の空気(環境音)
  stem_sfx.wav   … 効果音だけ(録音素材 CC0 + 窓の通過音)
  mix.wav        … 仕上げ済み(-14 LUFS 目標、真のピーク -2.2 dBTP 以下)
  cues_frames.json … audio_measure.py 用の {名前: コマ}
設計(場面ごとに 楽器の系統 / 空間 / 帯域 を変える):
  ベッド 全編   … 弦アンサンブル(48)+ウォームパッド(89)。F | Dm7 | Bbmaj7 | Gm7 | C sus | F(12.5 s のタイトルで解決)
  A 一覧 0–3.75   … ナイロンギター(24)。乾いた小部屋(0.5 s)、ハイパス 220 Hz
  B 詳細 3.75–7.4 … マリンバ(12)+ ビブラフォン(11)(大チェック)。中くらいの部屋(1.1 s)
  C 戻り・数 7.4–8.75 … カリンバ(108)。とても近い・暗い(0.35 s、ローパス 4 kHz)
  D 窓・棒 8.75–11.6 … ハープ(46)のグリッサンド(窓の 0.3 s 前から = Jカット)+ ピチカート(45)。明るい広間(1.6 s)
  E タイトル 11.95–15 … ピアノ(0)+ チェレスタ(8)(アイコン)。長く暗い響き(2.8 s)。終わりの静止で余韻
  ほぼ無音: 1.95–3.00 s(カーソルが漂う間)、11.30–11.95 s(棒が沈む間 = タイトル前の一拍)
"""
import os, sys, json, subprocess, re, tempfile
import numpy as np
import scipy.io.wavfile as wavfile
from scipy.signal import butter, sosfilt, resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(os.path.dirname(ROOT), "claude-video-skill", "tools"))
import pretty_midi as pm
import midi_render as M
import sfx_lib as S

SR = 48000
DUR = 15.0
N = int(DUR * SR)
FPS = 30
RNG = np.random.default_rng(20261028)
cues = {c["name"]: c["frame"] for c in json.load(open(os.path.join(ROOT, "cues.json")))["cues"]}
json.dump(cues, open(os.path.join(HERE, "cues_frames.json"), "w"), indent=1)
db = lambda d: 10 ** (d / 20)
BEAT = 0.625


def fit(x):
    x = x[:N]
    return np.pad(x, ((0, N - len(x)), (0, 0))) if len(x) < N else x


def fades(x, a=0.0005, r=0.004):
    x = x.copy(); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    sh = (-1,) + (1,) * (x.ndim - 1)
    x[:na] *= np.linspace(0, 1, na).reshape(sh); x[-nr:] *= np.linspace(1, 0, nr).reshape(sh)
    return x


# ---------------------------------------------------------------- 音楽
def midi_layer(notes, program, fx, gain_db, tail=3.0):
    """notes: [(pitch, start, end, vel)]。場面ごとの scene_fx をかけて全長の (N,2) にする"""
    m = pm.PrettyMIDI(initial_tempo=96)
    ins = pm.Instrument(program=program)
    for p, s, e, v in notes:
        ins.notes.append(pm.Note(velocity=int(v), pitch=int(p), start=float(s), end=float(e)))
    m.instruments.append(ins)
    x = M.render(m, tail=tail, sr=SR)
    x = M.scene_fx(x, sr=SR, seed=7, **fx)
    return fit(x) * db(gain_db)


def env_points(pts):
    """[(t, dB)] を直線でつないだ音量の包絡(N,)"""
    t = np.arange(N) / SR
    ts, ds = zip(*pts)
    return db(np.interp(t, ts, ds))[:, None]


bars = [0.0, 2.5, 5.0, 7.5, 10.0, 12.5]
chords = [[53, 57, 60, 64],        # Fmaj7
          [50, 53, 57, 60],        # Dm7
          [46, 50, 53, 57],        # Bbmaj7
          [43, 46, 50, 53],        # Gm7
          [48, 53, 55, 58],        # C7sus4(解決を待つ)
          [41, 48, 53, 57, 60]]    # F(解決)
bed_notes, pad_notes = [], []
for i, (b, ch) in enumerate(zip(bars, chords)):
    e = (bars[i + 1] + 0.12) if i + 1 < len(bars) else 15.0
    for p in ch:
        bed_notes.append((p, b, e, 54 if i < 5 else 62))
        pad_notes.append((p + 12, b, e, 40))
bed = midi_layer(bed_notes, 48, dict(rev=2.4, wet=0.35, lp_hz=5200, hp_hz=110, damp_hz=4500), -4.5)
bed += midi_layer(pad_notes, 89, dict(rev=2.4, wet=0.35, lp_hz=4500, hp_hz=200, damp_hz=4000), -8.5)
# ベッドの強弱: 静かな所で下げる(ゼロにしない)、山の前で上げる、最後は余韻で消える
bed *= env_points([(0, -10), (0.6, -4), (1.75, -4), (1.95, -30), (2.95, -30), (3.4, -5), (6.6, -4),
                   (6.85, -8), (7.1, -3), (9.0, -4), (10.0, -3), (11.3, -1.5), (11.45, -30), (11.9, -28),
                   (12.45, 0), (13.6, -2), (14.4, -10), (15.0, -40)])

# A 一覧: ナイロンギター。窓 1 では弾かない
gA = []
for t, p in [(0.04, 65), (0.66, 69), (1.29, 72), (1.29, 60), (3.17, 62), (3.42, 65)]:
    gA.append((p, t, t + 1.2, 58))
layA = midi_layer(gA, 24, dict(rev=0.5, wet=0.2, lp_hz=7000, hp_hz=220, damp_hz=6000), -8)

# B 詳細: マリンバ(ステップ)+ ビブラフォン(大チェック)。打撃音の頂点を奪わないよう 40 ms 後ろ
o = 0.04
tB = [(cues["step_check_1"] + 1) / FPS + o, (cues["step_check_2"] + 1) / FPS + o, (cues["step_check_3"] + 1) / FPS + o]
gB = [(70, tB[0], tB[0] + 0.5, 60), (74, tB[1], tB[1] + 0.5, 64), (77, tB[2], tB[2] + 0.5, 68), (62, 3.80, 4.6, 46)]
layB = midi_layer(gB, 12, dict(rev=1.1, wet=0.25, lp_hz=7500, hp_hz=180, damp_hz=6500), -4)
tm = (cues["main_check"] + 1) / FPS + 0.045
gV = [(p, tm, tm + 1.6, 74) for p in (70, 74, 77, 81)]
layV = midi_layer(gV, 11, dict(rev=1.1, wet=0.3, lp_hz=8000, hp_hz=200, damp_hz=6500), -12)

# C 戻り・数: カリンバ(近い・暗い)
tc = (cues["count_roll"] + 1) / FPS + 0.04
gC = [(67, 7.52, 8.0, 50), (70, tc, tc + 0.6, 62), (74, (cues["count_lock"] + 1) / FPS + 0.04, 9.0, 56)]
layC = midi_layer(gC, 108, dict(rev=0.35, wet=0.15, lp_hz=4000, hp_hz=200, damp_hz=3500), -4)

# D 窓・棒: ハープのグリッサンド(窓の少し前から)+ ピチカートの上り
g0 = (cues["portal_start"] + 1) / FPS - 0.3
gl = [55, 58, 60, 62, 65, 67, 70, 72, 74, 77, 79, 82]
gH = [(p, g0 + k * 0.045, g0 + k * 0.045 + 1.4, 40 + 2 * k) for k, p in enumerate(gl)]
layH = midi_layer(gH, 46, dict(rev=1.6, wet=0.35, lp_hz=9000, hp_hz=250, damp_hz=8000), -8)
bar_names = ["bar_1", "bar_2", "bar_3", "bar_4", "bar_5", "bar_6", "bar_today"]
bar_pitch = [60, 62, 65, 67, 70, 72, 77]
gP = [(p, (cues[n] + 1) / FPS + 0.035, (cues[n] + 1) / FPS + 0.4, 58 + 3 * k) for k, (n, p) in enumerate(zip(bar_names, bar_pitch))]
tl = (cues["bar_today_land"] + 1) / FPS + 0.04
gP += [(53, tl, tl + 0.5, 62), (60, tl, tl + 0.5, 60)]
layP = midi_layer(gP, 45, dict(rev=1.6, wet=0.3, lp_hz=9000, hp_hz=200, damp_hz=8000), -4)

# E タイトル: ピアノの解決和音(線が伸び始めた所から上り、着地で開く)+ アイコンにチェレスタ
tt = (cues["title_land"] + 1) / FPS + 0.05
gE = [(60, (cues["title_line"] + 1) / FPS + 0.05, 12.6, 40), (65, (cues["title_rise"] + 1) / FPS + 0.05, 12.6, 46)]
gE += [(p, tt, 15.0, v) for p, v in [(41, 70), (53, 66), (60, 60), (65, 62), (69, 64), (72, 58)]]
layE = midi_layer(gE, 0, dict(rev=2.8, wet=0.4, lp_hz=6000, hp_hz=60, damp_hz=4000), -8)
ti = (cues["icon_pop"] + 1) / FPS + 0.05
gI = [(84, ti, ti + 1.0, 50), (89, ti + 0.11, ti + 1.2, 44)]
layI = midi_layer(gI, 8, dict(rev=2.8, wet=0.4, lp_hz=9000, hp_hz=400, damp_hz=5000), -12)
endfade = env_points([(0, 0), (13.9, 0), (15.0, -22)])
quiet_env = env_points([(0, 0), (1.85, 0), (2.0, -24), (2.95, -24), (3.1, 0), (11.4, 0), (11.55, -24), (11.9, -24), (12.0, 0), (15, 0)])
music = quiet_env * (bed + layA + layB + layV + layC + layH + layP + (layE + layI) * endfade)

# 環境音(合成): ピンクノイズを帯域で絞った部屋の空気。静かな窓でも完全な無音にしない
def pink(n):
    w = RNG.standard_normal((n, 2))
    f = np.fft.rfftfreq(n, 1 / SR); f[0] = f[1]
    X = np.fft.rfft(w, axis=0) / np.sqrt(f)[:, None]
    y = np.fft.irfft(X, n, axis=0)
    return y / np.abs(y).max()
amb = sosfilt(butter(2, [250, 2500], "bandpass", fs=SR, output="sos"), pink(N), axis=0)
amb *= db(-44) * env_points([(0, -6), (0.5, 0), (13.6, 0), (15, -12)])
synth_music = amb.copy()


def bus_comp(x, below_peak_db=12.0, ratio=4.0, att=0.002, rel=0.12):
    """音楽バスの軽いピーク・コンプ(撥弦の頭だけを抑え、打撃音が頂点を取れるようにする)"""
    env = np.abs(x).max(1)
    thr = env.max() * db(-below_peak_db)
    aa, ar = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); e = np.empty_like(env); v = 0.0
    for i in range(len(env)):
        c = aa if env[i] > v else ar; v = c * v + (1 - c) * env[i]; e[i] = v
    over = np.maximum(e / thr, 1.0)
    return x * (over ** (1 / ratio - 1))[:, None]


music = bus_comp(music) + amb

# ---------------------------------------------------------------- 効果音(録音素材)
sfx = np.zeros((N, 2)); synth_sfx = np.zeros((N, 2))


def place(name, frame, gain_db, pan=0.0, shift=0.0, lp=None, hp=None, target=None, crest=6):
    """録音素材の最大の山を「コマ+1」(+shift 秒)に置く"""
    x = S.load(name, sr=SR)
    if hp: x = sosfilt(butter(2, hp, "hp", fs=SR, output="sos"), x)
    if lp: x = sosfilt(butter(2, lp, "lp", fs=SR, output="sos"), x)
    x = fades(x / (np.abs(x).max() + 1e-9))
    pk = int(np.argmax(np.abs(x)))
    # 鋭すぎる頭を丸める: 頂点を「頭 60 ms の平均の crest dB 上」までに抑える(量は保ち、針だけ削る。位置は変わらない)
    seg = x[max(0, pk - int(0.005 * SR)): pk + int(0.06 * SR)]
    ceil = np.sqrt((seg ** 2).mean()) * db(crest)
    if ceil < 1:
        x = ceil * np.tanh(x / ceil)
    t0 = int(round(((frame + 1) / FPS + shift) * SR)) - pk
    s = max(0, t0); x = x[s - t0:]
    e = min(N, s + len(x))
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    (target if target is not None else sfx)[s:e] += np.stack([x[:e - s] * L, x[:e - s] * R], 1) * db(gain_db) * np.sqrt(2)


# カードの着地: 小さな紙のクリック(同系統、少しずつ違う)
for k, (n, nm) in enumerate(zip(["card_land_1", "card_land_2", "card_land_3", "card_land_4", "card_land_5", "card_land_6_all"],
                               ["drop_001", "drop_002", "drop_003", "drop_004", "drop_001", "toggle_003"])):
    place(nm, cues[n], -19 + [0, -3, -3, -3, 0, -6][k] + RNG.uniform(-1, 1), pan=[-0.4, 0, 0.4, -0.4, 0, 0.4][k], lp=3500)
place("bookFlip3", cues["card_land_1"], -30, shift=0.03, lp=5000)          # 紙が擦れる手触り(山はクリックより後)
place("select_001", cues["hover_card_1"], -20, pan=-0.3, lp=5000)
place("select_002", cues["hover_select"], -42, pan=0.0, lp=5000)
place("click_001", cues["select_click"], -11, lp=6000, crest=9)
place("toggle_004", cues["expand_start"], -24, lp=5000)
place("maximize_001", cues["expand_land"], -38, shift=-0.05, lp=4000, hp=300)
place("drop_001", cues["expand_land"], -25, lp=5000)
for k, n in enumerate(["step_check_1", "step_check_2", "step_check_3"]):
    place(["toggle_002", "toggle_001", "toggle_002"][k], cues[n], -28 + k * 0.5, pan=[-0.3, 0, 0.3][k], lp=7000)
# 大チェック(山): 押す音 + 確定音 + 紙の重い置き
place("click_001", cues["main_check"], -15, lp=8000, crest=12)
place("confirmation_002", cues["main_check"], -25, shift=0.045)
place("bookPlace1", cues["main_check"], -27, shift=0.05, lp=3000)
place("toggle_004", cues["back_click"], -21, lp=5000)
place("minimize_001", cues["shrink_start"], -28, lp=4000, hp=300)
place("drop_002", cues["shrink_land"], -30, lp=5000)
place("toggle_001", cues["count_roll"], -22, pan=0.4, lp=5000)
place("drop_002", cues["count_lock"], -18, pan=0.4, lp=4000)
# 窓の通過音(合成): ピンクノイズの帯域を上げていく(サインのスイープは使わない)
d = 1.15; n = int(d * SR); s0 = int((cues["portal_start"] + 1) / FPS * SR) - int(0.15 * SR)
w = pink(n); tt_ = np.linspace(0, 1, n)
lo = sosfilt(butter(2, 500, "lp", fs=SR, output="sos"), w, axis=0)
hi = sosfilt(butter(2, [900, 4000], "bandpass", fs=SR, output="sos"), w, axis=0)
wh = (lo * (1 - tt_)[:, None] + hi * tt_[:, None]) * (np.sin(np.pi * tt_) ** 1.5)[:, None]
wh = wh / np.abs(wh).max() * db(-34)
synth_sfx[s0:s0 + n] += wh
place("glass_002", cues["portal_start"], -17, lp=6000, target=None)
place("drop_003", cues["portal_end"], -28, lp=4000)
for k, n_ in enumerate(bar_names):
    place(["pluck_001", "pluck_002"][k % 2], cues[n_], -23 + k * 0.4, pan=-0.6 + k * 0.2, lp=3000)
place("drop_004", cues["bar_today_land"], -20, pan=0.5, lp=4000)
# bars_exit は窓 2 の中なので音を付けない(意図した静けさ)
place("bookFlip2", cues["title_line"], -30, shift=0.06, lp=5000)
place("toggle_002", cues["title_line"], -40, lp=3500)
# タイトル着地(山): 柔らかい打撃 + 木 + 紙
place("impactSoft_medium_000", cues["title_land"], -19, lp=5000, crest=7)
place("impactWood_medium_000", cues["title_land"], -26, shift=0.03, lp=4000)
place("bookPlace2", cues["title_land"], -28, shift=0.04, lp=2500)
place("cloth4", cues["title_rise"], -26, lp=5000)
place("drop_003", cues["tagline_land"], -18, lp=3500)
place("pluck_002", cues["icon_pop"], -20, pan=-0.3, lp=7000)
sfx = sfx + synth_sfx

# ---------------------------------------------------------------- 仕上げ
def write(path, x):
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


def lufs_tp(x):
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "m.wav"); wavfile.write(p, SR, x.astype(np.float32))
        r = subprocess.run(["ffmpeg", "-nostats", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", s).group(1))


def limiter(x, ceil_db=-2.4, look=0.003, rel=0.08):
    """4 倍オーバーサンプルの頂点で求める先読みリミッター"""
    os_ = np.abs(resample_poly(x, 4, 1, axis=0)).max(1).reshape(-1, 4).max(1)[:len(x)]
    g = np.minimum(1, db(ceil_db) / (os_ + 1e-12))
    la = int(look * SR)
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(g, 2 * la + 1)
    a = np.exp(-1 / (rel * SR)); out = np.empty_like(g); v = 1.0
    for i in range(len(g)):
        v = g[i] if g[i] < v else a * v + (1 - a) * g[i]; out[i] = v
    if os.environ.get("DIAG"):
        idx = np.argsort(out)[:200000:50]; seen = []
        for i in idx:
            if all(abs(i - j) > 4800 for j in seen) and out[i] < 0.9: seen.append(i)
        print("limiter >1 dB at:", [(round(i / SR, 2), round(20 * np.log10(out[i]), 1)) for i in sorted(seen)])
    return x * out[:, None], 20 * np.log10(out.min())


mix = music + sfx
mix -= mix.mean(0)
I, _ = lufs_tp(mix)
gain = db(-14.0 - I); red = 0.0
for it in range(8):
    y, red = limiter(mix * gain)
    I2, TP = lufs_tp(y)
    if abs(I2 + 14) < 0.1: break
    gain *= db(-14.0 - I2)
y = fades(y, 0.002, 0.01)
write(os.path.join(HERE, "mix.wav"), y)
sg = gain * min(1.0, 0.98 / max(np.abs(music * gain).max(), np.abs(sfx * gain).max()))  # 2 本を同じ倍率で、切れないように
print(f"stems written at mix gain {20 * np.log10(sg / gain):+.1f} dB")
write(os.path.join(HERE, "stem_music.wav"), music * sg)
write(os.path.join(HERE, "stem_sfx.wav"), sfx * sg)

# 数値のメモ
I2, TP = lufs_tp(y)
E = lambda v: float((v ** 2).sum())
synth_share = (E(synth_music) + E(synth_sfx)) / E(music + sfx)
w = int(0.1 * SR); r = 20 * np.log10(np.sqrt((y[: N // w * w].mean(1).reshape(-1, w) ** 2).mean(1)) + 1e-9)
quiet = [i * 0.1 for i, v in enumerate(r) if v < -42]
print(f"mix: {I2:.1f} LUFS, TP {TP:.1f} dBTP, limiter max {red:.1f} dB, synth energy share {100 * synth_share:.1f}%")
runs, st = [], None
for i, v in enumerate(r):
    if v < -40 and st is None: st = i
    if (v >= -40 or i == len(r) - 1) and st is not None:
        if i - st >= 3: runs.append((st * 0.1, i * 0.1))
        st = None
print("near-silent windows (100 ms RMS < -40 dBFS, >=0.3 s):", [(round(a, 1), round(b, 1)) for a, b in runs])
print("RMS per 100ms (dBFS):", " ".join(f"{v:.0f}" for v in r))
