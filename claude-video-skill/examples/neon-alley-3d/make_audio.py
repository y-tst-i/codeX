"""NEON ALLEY 15s — 音(決定的・seed固定)。
音楽 = GM 音源(fluidsynth)の MIDI、環境音・モーター・雷 = 合成、衝撃・金属 = CC0 録音 + 同梱 SFX。
出力: audio/mix.wav(44.1kHz ステレオ、ラウドネス未調整)
"""
import sys, os, subprocess
import numpy as np
import pretty_midi as pm
from scipy.signal import butter, sosfilt, fftconvolve

TOOLS = "/root/.claude/skills/video-with-claude-code/tools"
sys.path.insert(0, TOOLS)
import midi_render as M  # noqa: E402
import sfx_lib  # noqa: E402

SR = 44100
DUR = 15.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(20261007)
SFXD = "/root/.claude/skills/media-use/audio/assets/sfx"
HERE = os.path.dirname(os.path.abspath(__file__))
BEAT = 0.5


def put(x, t, g=1.0, pan=0.0):
    if x.ndim == 1:
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * gl * 1.414, x * gr * 1.414], 1)
    i = int(round(t * SR))
    if i < 0:
        x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n > 0:
        L[i:i + n] += x[:n, 0] * g; R[i:i + n] += x[:n, 1] * g


def filt(x, kind, hz, order=2):
    return sosfilt(butter(order, hz, kind, fs=SR, output="sos"), x, axis=0)


def tt(d):
    return np.arange(int(SR * d)) / SR


def pink(d):
    n = int(SR * d); w = rng.standard_normal(n)
    f = np.fft.rfft(w); k = np.arange(len(f)); k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), n) * 12


def load_mp3(name, gain=1.0):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(SFXD, name), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2) * gain


def kenney(name, idx=0, gain=1.0):
    x = sfx_lib.load(f"{name}_{idx:03d}" if "_" not in name[-4:] else name, SR, gain)
    return x


def kload(base, idx, gain=1.0):
    # sfx_lib の名前は "<base>_<nnn>" 形式(例: impactMetal_heavy_000)
    try:
        return sfx_lib.load(f"{base}_{idx:03d}", SR, gain)
    except Exception:
        return sfx_lib.load(base, SR, gain)


def trim(x, d, fade=0.15):
    n = min(len(x), int(d * SR)); x = x[:n].copy(); k = int(fade * SR)
    if k: x[-k:] *= np.linspace(1, 0, k)[:, None]
    return x


def mono(x):
    return x.mean(1) if x.ndim == 2 else x


# ---------------------------------------------------------------- S3 の時間地図(index.html と同じ式)
def smooth(a, b, x):
    k = min(1, max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k)


def rate(tau):
    return 1 - 0.9 * smooth(0.85, 1.2, tau) + 0.9 * smooth(2.35, 2.7, tau)


taus = np.arange(0, 3.5, 0.001); svals = np.cumsum([rate(x + 0.0005) * 0.001 for x in taus])
def real_of_story(s):
    return 7.0 + taus[np.searchsorted(svals, s)]
T_LAUNCH = real_of_story(0.75)
T_BOLT = real_of_story(1.10)
T_LAND = real_of_story(0.75 + (5.2 + np.sqrt(5.2 ** 2 + 2 * 13 * 0.38)) / 13)
T_SLOW_IN, T_SLOW_OUT = 7.0 + 0.95, 7.0 + 2.55
print(f"launch {T_LAUNCH:.3f} bolt {T_BOLT:.3f} land {T_LAND:.3f}")

# ---------------------------------------------------------------- 1) 環境音: 雨上がりの路地(場面で明るさを変える)
def drips(d, rate_hz, lo, hi, lv, seed):
    r = np.random.default_rng(seed); x = np.zeros(int(SR * d))
    for _ in range(int(d * rate_hz)):
        i = r.integers(0, len(x) - 3000); n = r.integers(300, 1400)
        f = r.uniform(lo, hi); tseg = np.arange(n) / SR
        # 水の粒: 下がる共鳴 + 短いノイズ
        ph = 2 * np.pi * np.cumsum(f * (1 + 0.6 * np.exp(-tseg * 60))) / SR
        x[i:i + n] += (np.sin(ph) * 0.6 + r.standard_normal(n) * 0.25) * np.exp(-tseg * r.uniform(40, 90)) * r.uniform(0.2, 1) * lv
    return x


amb = filt(pink(DUR), "bandpass", [300, 2600]) * 0.05
env = np.ones(N); tA = tt(DUR)
env *= 0.9 + 0.1 * np.sin(tA * 0.7)
env[: int(3.0 * SR)] *= 1.8                       # S1 は環境音が主役
env *= np.where(tA > 14.0, np.exp(-(tA - 14.0) * 2.2), 1)
amb *= env
put(np.stack([amb, np.roll(amb, 331)], 1), 0, 1.0)
put(drips(3.2, 22, 900, 2600, 0.08, 1), 0, 1.0, -0.2)
put(drips(3.2, 14, 600, 1500, 0.06, 2), 0, 1.0, 0.3)
put(drips(4.5, 10, 700, 1800, 0.04, 3), 10.5, 1.0, 0.1)

# ---------------------------------------------------------------- 2) 音楽(MIDI)
def mk(prog, notes, drum=False, vel=96):
    m = pm.PrettyMIDI(initial_tempo=120); ins = pm.Instrument(program=prog, is_drum=drum)
    for (p, s, e, *v) in notes:
        ins.notes.append(pm.Note(velocity=v[0] if v else vel, pitch=p, start=s, end=e))
    m.instruments.append(ins); return m


def render(m, tail=2.0):
    return M.render(m, tail=tail)


F2, Ab2, Bb2, C3, Db2, Eb2 = 41, 44, 46, 48, 37, 39
# S1: ハロー・パッド(GM 94)で Fm(add9) が膨らむ + エレピの雫(GM 4)
s1pad = render(mk(94, [(p, 0.0, 3.0, 70) for p in (53, 56, 60, 67)]), 1.5)
s1pad = M.scene_fx(s1pad, rev=3.0, wet=0.45, lp_hz=3200, damp_hz=4000)
g = np.minimum(1, tt(len(s1pad) / SR) / 1.8)[:, None]
put(s1pad * g, 0.0, 0.9)
ep = render(mk(4, [(79, 0.42, 0.9, 52), (75, 1.05, 1.5, 48), (84, 2.02, 2.5, 60), (80, 2.27, 2.6, 56)]), 1.5)
put(M.scene_fx(ep, rev=2.2, wet=0.5, hp_hz=300), 0.0, 0.5)

# S2: キック4つ打ち・スネア・16分ハット + シンセベース(GM 38)+ のこぎりアルペジオ(GM 81)
dr = []
for b in range(8):  # 3.0〜7.0 の8拍
    t0 = 3.0 + b * BEAT
    dr.append((36, t0, t0 + 0.1, 118))
    if b % 2 == 1: dr.append((38, t0, t0 + 0.1, 112))
    for k in range(4): dr.append((42, t0 + k * 0.125, t0 + k * 0.125 + 0.05, 70 + 20 * (k % 2 == 0)))
dr.append((49, 3.0, 3.6, 120))
dr += [(38, 6.625, 6.7, 100), (38, 6.75, 6.82, 108), (38, 6.875, 6.95, 118)]  # フィル
drums2 = render(mk(0, dr, drum=True), 1.5)
put(M.scene_fx(drums2, rev=0.8, wet=0.12), 0.0, 1.5)
bassn = []
roots = [F2] * 4 + [Db2] * 2 + [Eb2] * 2
for b in range(8):
    for k in range(4):
        t0 = 3.0 + b * BEAT + k * 0.125
        bassn.append((roots[b] + (12 if k % 2 else 0), t0, t0 + 0.11, 105))
bass2 = render(mk(38, bassn), 1.0)
put(M.scene_fx(bass2, rev=0.5, wet=0.08, lp_hz=2500), 0.0, 1.3)
arp = []
chords = [[65, 68, 72, 77]] * 4 + [[61, 65, 68, 73]] * 2 + [[63, 67, 70, 75]] * 2
for b in range(8):
    for k in range(4):
        t0 = 3.0 + b * BEAT + k * 0.125
        arp.append((chords[b][k] + 12, t0, t0 + 0.1, 80))
arp2 = render(mk(81, arp), 1.0)
put(M.scene_fx(arp2, rev=1.2, wet=0.3, hp_hz=400, lp_hz=6000), 0.0, 0.6, 0.25)

# S3: 7.0〜跳躍まで太鼓(GM 116 タイコ)+ ベースが続き、スロー区間は抜ける → 低いドローン
dr3 = [(36, 7.0, 7.1, 120), (49, 7.0, 7.8, 118), (38, 7.25, 7.35, 104), (36, 7.5, 7.6, 116), (38, 7.75, 7.85, 110)]
for k in range(4): dr3.append((42, 7.0 + k * 0.125, 7.05 + k * 0.125, 80))
put(M.scene_fx(render(mk(0, dr3, drum=True), 1.5), rev=1.0, wet=0.18), 0.0, 0.85)
tk = render(mk(116, [(48, 7.0, 7.4, 110), (48, 7.5, 7.9, 100)]), 1.5)
put(M.scene_fx(tk, rev=1.5, wet=0.3), 0.0, 0.6)
# スロー区間: チェロ+コントラバスの持続(GM 42/43)、暗い残響、音程はうなる
drone = render(mk(42, [(29, 7.85, 9.95, 90), (36, 7.85, 9.95, 80)]), 2.0)
drone = M.scene_fx(drone, rev=3.5, wet=0.55, lp_hz=900, damp_hz=1500)
gD = np.minimum(1, tt(len(drone) / SR) / 0.4)[:, None]
put(drone * gD, 0.0, 0.9)
# 着地後に再開: キック+スネアのフィル → 10.5 へ
dr3b = [(36, T_LAND, T_LAND + 0.1, 118), (38, 10.0, 10.08, 96), (38, 10.125, 10.2, 104), (38, 10.25, 10.32, 112), (38, 10.375, 10.45, 122)]
put(M.scene_fx(render(mk(0, dr3b, drum=True), 1.0), rev=0.8, wet=0.15), 0.0, 0.85)
bass3 = [(F2 + (12 if k % 2 else 0), T_LAND + k * 0.125, T_LAND + 0.1 + k * 0.125, 100) for k in range(4)]
put(M.scene_fx(render(mk(38, bass3), 1.0), rev=0.4, wet=0.1, lp_hz=2500), 0.0, 0.7)

# S4: オケヒット(GM 55)+ ブラス(GM 61)の和音 → 弦(GM 48)と合唱パッド(GM 91)→ 最後の和音 + ビブラフォン(GM 11)
hit = render(mk(55, [(p, 10.5, 10.9, 120) for p in (53, 60, 65, 68)]), 2.0)
put(M.scene_fx(hit, rev=2.0, wet=0.35), 0.0, 0.7)
br = render(mk(61, [(p, 10.5, 11.3, 112) for p in (41, 53, 60, 65)]), 1.5)
put(M.scene_fx(br, rev=1.8, wet=0.3), 0.0, 0.55)
strings = render(mk(48, [(p, 10.6, 13.6, 78) for p in (49, 56, 60, 65)] + [(p, 13.6, 15.0, 92) for p in (44, 51, 60, 63, 67)]), 3.0)
put(M.scene_fx(strings, rev=3.2, wet=0.45, damp_hz=5000), 0.0, 0.6)
chp = render(mk(91, [(p, 13.6, 15.0, 85) for p in (56, 60, 63, 67)]), 3.0)
put(M.scene_fx(chp, rev=3.5, wet=0.5), 0.0, 0.5)
vib = render(mk(11, [(72, 13.6, 14.6, 96), (79, 13.6, 14.6, 90), (84, 13.85, 14.8, 80), (87, 14.1, 15.0, 70)]), 2.0)
put(M.scene_fx(vib, rev=2.8, wet=0.5, hp_hz=300), 0.0, 0.5, 0.15)
# 文字が点くのに合わせて低いベースのパルス(タイトルを支える)
bass4 = [(Db2 + 12 * (k % 2), 11.2 + k * 0.25, 11.35 + k * 0.25, 90) for k in range(9)]
put(M.scene_fx(render(mk(38, bass4), 1.0), rev=0.8, wet=0.2, lp_hz=1800), 0.0, 0.55)

# ---------------------------------------------------------------- 3) 効果音
# 1.5 目の起動: グリッチ + サーボのうなり(倍音) + 小さな上昇(のこぎりのグライド、ローパス)
put(trim(load_mp3("glitch-2.mp3", 0.35), 0.45, 0.2), 1.48, 1.0, 0.0)
d = 0.7; tb = tt(d); f = 180 + 520 * (tb / d) ** 1.5
ph = 2 * np.pi * np.cumsum(f) / SR
servo = sum(np.sin(ph * h) / h for h in range(1, 7)) * np.minimum(1, tb / 0.05) * np.exp(-tb * 2.5) * 0.12
put(filt(servo, "lowpass", 3000), 1.55, 1.0)
put(kload("impactMetal_light", 1, 0.5), 1.5, 1.0)
# 2.3 モーターの空ぶかし
d = 0.6; tb = tt(d); f = 70 + 140 * np.sin(np.pi * np.minimum(1, tb / 0.5)) ** 2
mot = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.06 * np.minimum(1, tb / 0.05) * np.exp(-np.maximum(0, tb - 0.4) * 8)
put(filt(mot, "lowpass", 1200), 2.25, 1.0)
# 2.4〜3.0 ライザー + リバースシンバル(GM 119)
rs = load_mp3("riser.mp3", 0.6)
rs = rs[-int(0.75 * SR):] if len(rs) > int(0.75 * SR) else rs
put(rs, 3.0 - len(rs) / SR, 0.8)
rc = render(mk(119, [(60, 2.0, 3.0, 110)]), 0.2)
put(rc, 0.0, 0.5)
# 3.0 衝撃(場面の頭): 同梱の低い衝撃 + 録音の金属
put(trim(load_mp3("impact-bass-1.mp3", 0.5), 1.4, 0.6), 2.99, 1.0)
put(kload("impactPlate_heavy", 0, 0.7), 3.0, 1.0)

# S2: モーター(速度で音程が上がる)+ 車輪の水しぶき
d = 4.0; tb = tt(d); f = 95 + 60 * np.minimum(1, tb / 0.8) + 6 * np.sin(tb * 18)
ph = 2 * np.pi * np.cumsum(f) / SR
motor = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sign(np.sin(3 * ph))) * 0.05
motor = filt(motor, "lowpass", 900) * np.minimum(1, tb / 0.1) * np.where(tb > 3.85, np.exp(-(tb - 3.85) * 30), 1)
put(motor, 3.0, 1.0, -0.1)
spr = filt(pink(4.0), "bandpass", [800, 6000]) * 0.05 * (0.7 + 0.3 * np.abs(np.sin(tt(4.0) * 9)))
put(np.stack([spr, np.roll(spr, 500)], 1), 3.0, 1.0)
# 4.8〜5.4 回り込みの風切り(録音)
put(trim(load_mp3("whoosh-cinematic.mp3", 0.9), 1.3, 0.5), 4.6, 1.0)
# 6.97 箱を踏む直前の短い閃光: 金属のヒット
put(kload("impactMetal_heavy", 2, 0.6), 6.97, 1.0)
put(load_mp3("whoosh-short.mp3", 0.6), 6.9, 1.0)

# S3: 踏み切り(板と木)、スローで音が沈む、雷、火花、着地
put(kload("impactWood_heavy", 1, 0.8), T_LAUNCH - 0.02, 1.0)
put(kload("impactPlank_medium", 0, 0.6), T_LAUNCH - 0.12, 1.0)
# スローに入る「吸い込み」: 逆再生のシンバル風(ノイズのフェードイン→切断)
d = 0.35; tb = tt(d); suck = filt(pink(d), "highpass", 2000) * (tb / d) ** 3 * 0.25
put(suck, T_SLOW_IN - d, 1.0)
# 心音のような低いパルス(スロー区間)
for k, tk0 in enumerate(np.arange(T_SLOW_IN + 0.1, T_SLOW_OUT - 0.2, 0.55)):
    tb = tt(0.5); pulse = np.sin(2 * np.pi * (48 - 20 * tb) * tb) * np.exp(-tb * 9) * 0.35
    put(pulse, tk0, 1.0)
# 雷: クラック(高域ノイズ 6ms)+ 帯域の裂ける音 + 長い遠雷 + 同梱グリッチ + 金属の衝撃
d = 2.4; tb = tt(d)
crack = rng.standard_normal(len(tb)) * np.exp(-tb * 60) * 0.9
tear = filt(rng.standard_normal(len(tb)), "bandpass", [1500, 7000]) * np.exp(-tb * 7) * (0.6 + 0.4 * np.sign(np.sin(tb * 140))) * 0.35
rumble = filt(pink(d), "lowpass", 160) * np.minimum(1, tb / 0.15) * np.exp(-tb * 1.2) * 1.2
thunder = filt(crack, "highpass", 1500) + tear + rumble
thunder = M.scene_fx(np.stack([thunder, np.roll(thunder, 900)], 1), rev=3.5, wet=0.4, damp_hz=3000)
put(thunder, T_BOLT, 0.5)
put(trim(load_mp3("impact-bass-2.mp3", 0.45), 1.6, 0.6), T_BOLT, 1.0)
put(trim(load_mp3("glitch-3.mp3", 1.5), 0.8, 0.3), T_BOLT + 0.02, 1.0, -0.4)
# 火花のパチパチ(スローなので粒は粗く、間隔は長い)
r = np.random.default_rng(9)
for _ in range(38):
    t0 = T_BOLT + r.uniform(0.05, 1.3); n = r.integers(80, 400)
    put(filt(r.standard_normal(n), "highpass", 3000) * np.exp(-np.arange(n) / SR * 200) * r.uniform(0.05, 0.25), t0, 1.0, r.uniform(-0.7, 0))
# 着地: 金属板 + 水しぶき(帯域ノイズ)+ 低い衝撃
put(kload("impactPlate_heavy", 2, 0.8), T_LAND, 1.0)
d = 0.8; tb = tt(d); splash = filt(pink(d), "bandpass", [500, 5000]) * np.exp(-tb * 5) * np.minimum(1, tb / 0.01) * 0.5
put(np.stack([splash, np.roll(splash, 400)], 1), T_LAND, 1.0)
tb = tt(0.6); put(np.sin(2 * np.pi * (60 - 25 * tb) * tb) * np.exp(-tb * 7) * 0.5, T_LAND, 1.0)
# 10.0〜10.5 光の筋: ライザー + 風(録音)
rs2 = load_mp3("riser.mp3", 0.7); rs2 = rs2[-int(0.6 * SR):]
put(rs2, 10.5 - len(rs2) / SR, 1.0)
put(load_mp3("whoosh.mp3", 0.7), 10.05, 1.0)

# S4: 10.5 大きな衝撃 / 10.9〜12.0 タイヤの滑り / 文字の点灯ごとのネオン音 / 枠の点灯 / 13.6 最後の和音
put(trim(load_mp3("impact-bass-1.mp3", 0.55), 1.8, 0.8), 10.49, 1.0)
put(kload("impactMetal_heavy", 4, 0.6), 10.5, 1.0)
put(M.scene_fx(render(mk(0, [(49, 10.5, 11.5, 127), (57, 10.5, 11.5, 110)], drum=True), 2.0), rev=2.0, wet=0.3), 0.0, 0.6)
d = 1.15; tb = tt(d); fc = 2200 + 900 * np.sin(tb * 7)
sq = np.zeros(len(tb))
nzs = rng.standard_normal(len(tb))
for i0 in range(0, len(tb), 2048):  # 共鳴の帯域を動かした「キュッ」(水の上なので湿らせる)
    seg = nzs[i0:i0 + 2048]; c = fc[i0]
    sq[i0:i0 + len(seg)] = filt(seg, "bandpass", [c * 0.9, c * 1.1], 2)
sq *= np.minimum(1, tb / 0.08) * np.exp(-tb * 1.6) * 0.5
skid = sq + filt(pink(d), "bandpass", [400, 3000]) * np.exp(-tb * 2) * 0.25
put(np.stack([skid, np.roll(skid, 300)], 1), 10.95, 0.8)
for i in range(9):
    t0 = 10.5 + 0.7 + i * 0.16
    d = 0.22; tb = tt(d)
    buzz = sum(np.sin(2 * np.pi * 120 * h * tb) / h for h in range(1, 12)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 30 * tb))) * np.exp(-tb * 10) * 0.07
    zap = filt(rng.standard_normal(len(tb)), "bandpass", [2500, 9000]) * np.exp(-tb * 60) * 0.25
    put(buzz + zap, t0, 1.0, -0.8 + 0.2 * i)
put(kload("impactMetal_light", 3, 0.5), 10.5 + 2.1, 1.0)  # 枠の点灯
# ネオンの持続ハム(点灯後 → 13.6 から静かに下げる)
d = 4.0; tb = tt(d)
hum = sum(np.sin(2 * np.pi * 120 * h * tb + h) / (h * h) for h in range(1, 8)) * 0.02
hum *= np.minimum(1, tb / 0.6) * np.where(tb > 2.4, np.exp(-(tb - 2.4) * 1.5), 1)
put(hum, 11.2, 1.0)
# 2.85 の瞬き: 小さな電子音(録音のスイッチ)
put(kload("switch", 2, 0.35), 10.5 + 2.35, 1.0)
# 13.6 最後: 低い衝撃(弱め)で静止を締める
put(trim(load_mp3("impact-bass-2.mp3", 0.3), 1.4, 0.8), 13.58, 1.0)

# ---------------------------------------------------------------- 仕上げ
mix = np.stack([L, R], 1)
mix = filt(mix, "highpass", 28)
# ソフトクリップ(ピークを丸める)
mix = np.tanh(mix * 1.1) / 1.1
# 最後の 0.4 秒は余韻を下げる
fo = int(0.5 * SR); mix[-fo:] *= np.linspace(1, 0.15, fo)[:, None] ** 1.5
pk = np.abs(mix).max(); mix = mix / pk * 0.89
import scipy.io.wavfile as wf  # noqa: E402
wf.write(os.path.join(HERE, "mix.wav"), SR, (mix * 32767).astype(np.int16))
print("peak", pk, "len", len(mix) / SR)
