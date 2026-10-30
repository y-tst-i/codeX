#!/usr/bin/env python3
"""LUMIWAKE 15s teaser の音(BGM + 効果音)。決定的(seed 固定)。
使う道具: tools/midi_render.py(MIDI → 無料GM音源)、tools/sfx_lib.py(Kenney CC0)。合成は風切り・低音の一撃・ライザーの一部だけ。
120 BPM(1拍 0.5 s)。山: 4.00(ドロップ)/ 8.00 / 10.50(最大)/ 13.00(解決)。
出力: out/music.wav, out/sfx.wav, out/hits.wav(打撃音だけ), out/mix_raw.wav, cues.json
usage: python3 make_audio.py  (リポジトリの tools/ を import するので、このフォルダで実行)
"""
import json, os, sys
import numpy as np
import pretty_midi as pm
import scipy.io.wavfile as wavfile
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "tools"))
import midi_render as M  # noqa: E402
import sfx_lib as SL  # noqa: E402

SR = M.SR
DUR = 15.0
N = int(SR * DUR)
FR = 1 / 30  # 1コマ。打撃音の頂点は「絵の出来事 + 1コマ」
rng = np.random.default_rng(20261030)
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)


def bus():
    return np.zeros(N), np.zeros(N)


def st(x):
    return np.stack([x, x], 1) if x.ndim == 1 else x


def place(b, x, t, g=1.0, pan=0.0):
    x = st(np.asarray(x, dtype=np.float64))
    gl, gr = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    i = int(round(t * SR))
    if i < 0:
        x = x[-i:]; i = 0
    n = min(len(x), N - i)
    if n > 0:
        b[0][i:i + n] += x[:n, 0] * g * gl; b[1][i:i + n] += x[:n, 1] * g * gr


def peak_at(x):
    return int(np.argmax(np.abs(st(x)).sum(1))) / SR


def hit(b, x, t_event, g=1.0, pan=0.0):
    """頂点が t_event + 1コマ に来るように置く。"""
    place(b, x, t_event + FR - peak_at(x), g, pan)


def filt(x, lo=None, hi=None):
    if lo and hi: sos = butter(2, [lo, hi], "bandpass", fs=SR, output="sos")
    elif lo: sos = butter(2, lo, "highpass", fs=SR, output="sos")
    else: sos = butter(2, hi, "lowpass", fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def pink(d):
    n = int(SR * d); w = rng.standard_normal(n)
    f = np.fft.rfft(w); k = np.arange(len(f)); k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), n)


def whoosh(d, apex, lo=300, hi=4000):
    """帯域を絞ったピンクノイズの風切り。apex(秒)で最大。"""
    x = pink(d); t = np.arange(len(x)) / SR
    env = np.where(t < apex, (t / apex) ** 2.2, np.exp(-(t - apex) / 0.09))
    y = filt(x, lo, hi) * env
    return y / (np.abs(y).max() + 1e-9)


def boom(d=1.6, f0=34):
    t = np.arange(int(SR * d)) / SR
    f = f0 + 46 * np.exp(-t / 0.3)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    y[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return y


def kenney(name, g=1.0):
    return SL.load(name, sr=SR, gain=g).astype(np.float64)


# ============================================================ 音楽(MIDI)
BPM, BEAT = 120, 0.5
m = pm.PrettyMIDI(initial_tempo=BPM)
D = 50  # D3
# 和音(ルートのMIDI番号と構成): Dm, Bb, F, C を 1小節(2 s)ずつ
CH = {"Dm": [50, 53, 57], "Bb": [46, 50, 53], "F": [53, 57, 60], "C": [48, 52, 55], "Dsus2": [50, 52, 57]}
PROG = ["Dm", "Bb", "F", "C", "Dm", "Bb", "F", "C"]  # 0–16 s の小節


def ins(prog, drum=False):
    i = pm.Instrument(program=prog, is_drum=drum); m.instruments.append(i); return i


def note(i, p, s, e, v=90):
    i.notes.append(pm.Note(velocity=int(v), pitch=int(p), start=float(s), end=float(e)))


pad = ins(89)      # ウォームパッド: 0–15 s 切れ目なく(間も鳴らす)
arp = ins(12)      # マリンバの分散和音
bass = ins(38)     # シンセベース(2.0 から)
strings = ins(48)  # 弦(タイトルから)
hitorch = ins(55)  # オーケストラヒット(10.5 の一撃だけ)
glock = ins(9)     # グロッケン(ゲート通過・光の帯のきらめき)
drums = ins(0, True)

for bar, c in enumerate(PROG):
    s = bar * 2.0
    if s >= 15: break
    chord = CH[c]
    # 10.5 以降は Bb → C → (13.0) Dsus2 で解決
    if s >= 10: continue
    for p in chord: note(pad, p + 12, s, s + 2.0, 62 if s < 4 else 70)
    # マリンバ 16分の分散和音(0–9.75)。間(9.75–10.5)は抜く
    pat = [chord[0], chord[1], chord[2], chord[1] + 12, chord[2], chord[0] + 12, chord[1] + 12, chord[2]]
    for j in range(16):
        tt = s + j * 0.125
        if tt >= 9.75: break
        v = (52 if tt < 2 else 64 if tt < 4 else 74) + (8 if j % 4 == 0 else 0)
        note(arp, pat[j % 8] + 24, tt, tt + 0.12, v)
    # ベース
    if s >= 2.0:
        for j in range(8):
            tt = s + j * 0.25
            if tt >= 9.75: break
            if s < 4.0 and j % 2: continue
            note(bass, chord[0] - 12, tt, tt + 0.22, 88 if j % 2 == 0 else 72)
# 間(9.75–10.5): パッドだけ(Dm を保持。BGM を切らない)
for p in CH["Dm"]: note(pad, p + 12, 9.75, 10.6, 58)
# タイトル 10.5–13.0: Bb(1.25 s)→ C(1.25 s)、13.0 から Dsus2 で解決して 15 s まで
for (c, s, e) in [("Bb", 10.5, 11.75), ("C", 11.75, 13.0), ("Dsus2", 13.0, 15.0)]:
    for p in CH[c]:
        note(pad, p + 12, s, e, 74)
        note(strings, p, s, e, 80 if c != "Dsus2" else 70)
        note(strings, p + 12, s, e, 70 if c != "Dsus2" else 60)
    note(bass, CH[c][0] - 12, s, e, 84 if c != "Dsus2" else 70)
for p in [38, 50, 57, 62, 65]: note(hitorch, p, 10.5, 11.1, 110)
# タイトル中の分散和音(マリンバ、8分で軽く)
for j in range(10):
    tt = 10.5 + j * 0.25; c = "Bb" if tt < 11.75 else "C"; ch = CH[c]
    note(arp, ch[j % 3] + 24, tt, tt + 0.2, 62)
for j in range(4):  # 解決後は 4分で4つだけ、だんだん弱く
    tt = 13.0 + j * 0.5; note(arp, CH["Dsus2"][j % 3] + 24, tt, tt + 0.4, 60 - j * 8)
# グロッケン: ゲート通過(2.5/3.0/3.5)と光の帯(11.0–12.0)、きらめき 11.93
for k, tt in enumerate([2.5, 3.0, 3.5]): note(glock, [74, 81, 86][k], tt + FR, tt + 0.5, 84)
for k, tt in enumerate(np.arange(11.0, 12.0, 0.125)): note(glock, [74, 77, 81, 86, 89, 93, 86, 81][k % 8], tt, tt + 0.3, 48 + k * 3)
note(glock, 98, 11.93, 12.5, 80)
# ドラム(GM: 36 キック、38 スネア、42 ハット、49 クラッシュ、119 は別楽器)
KICK, SNARE, HAT, CRASH = 36, 38, 42, 49
for j in range(int(2.0 / 0.5), int(9.75 / 0.5)):
    tt = j * 0.5; note(drums, KICK, tt, tt + 0.1, 100 if tt >= 4 else 80)
    if tt >= 4.0 and j % 2 == 1: note(drums, SNARE, tt, tt + 0.1, 92)
for j in range(int(2.0 / 0.25), int(9.75 / 0.25)):
    tt = j * 0.25; note(drums, HAT, tt + 0.125, tt + 0.2, 60 if tt < 4 else 70)
for tt in np.arange(7.5, 8.0, 0.125): note(drums, SNARE, tt, tt + 0.08, 70 + (tt - 7.5) * 60)  # 8.0 へのフィル
for tt in [4.0, 8.0, 10.5]: note(drums, CRASH, tt, tt + 1.5, 110)
for tt in [10.5, 11.0, 11.5, 12.0, 12.5]: note(drums, KICK, tt, tt + 0.1, 96 if tt == 10.5 else 70)
# 逆再生シンバル(GM 119)で 4.0 と 10.5 へ持ち上げる
rev = ins(119)
note(rev, 60, 3.0, 4.0, 90); note(rev, 60, 9.9, 10.5, 96)

music = M.render(m, tail=1.0)[:N].astype(np.float64)
# 解決後は 14.2 から 15.0 へフェード(曲の終わり)
k0 = int(14.2 * SR); music[k0:] *= np.linspace(1, 0.15, N - k0)[:, None] if len(music) == N else 1
music = M.scene_fx(music, rev=1.6, wet=0.18, hp_hz=40)[:N]

# ============================================================ 効果音
S = bus(); HITS = bus()
cues = {}
def cue(name, t): cues[name] = int(round(t * 30))

# S1: コピーの線(0.40)= 小さなクリック、飛行の風切り
hit(S, kenney("select_001"), 0.40, 0.35, -0.3); cue("copy_line", 0.40)
place(S, whoosh(1.7, 0.95, 200, 2500), 0.2, 0.18, 0.2)
# S1→S2 ホイップ(頂点 2.00)
w = whoosh(0.8, 0.4, 400, 6000); hit(S, w, 2.0, 0.55); cue("whip", 2.0)
# HUD のポップ(Kenney の UI 音を入れ替えて)
for k, (tt, nm) in enumerate([(2.10, "select_002"), (2.35, "click_001"), (2.60, "select_004"), (2.85, "click_003"), (3.10, "switch_002")]):
    hit(S, kenney(nm), tt + 0.05, 0.42, [-0.6, 0.6, -0.5, 0.5, 0][k])
cue("hud_first", 2.10)
# ゲート通過: 金属の軽い当たり(グロッケンは音楽側)
for tt in [2.5, 3.0, 3.5]:
    x = kenney("impactMetal_light_002", 0.5); hit(S, x, tt, 0.5); hit(HITS, x, tt, 0.5); cue(f"gate_{tt}", tt)
# 3.5–4.0 ライザー(帯域ノイズが上がる)+ 4.0 の一撃
r = whoosh(0.9, 0.86, 800, 9000); place(S, r, 3.1, 0.35)
for x, g in [(boom(), 0.9), (kenney("impactPlate_heavy_001"), 0.8)]:
    hit(S, x, 4.0, g); hit(HITS, x, 4.0, g)
cue("drop_F1", 4.0)
# 針の刻み
for tt in [4.18, 4.28, 4.38]: hit(S, kenney("tick_001"), tt, 0.3)
# 帯のトランジション(5.38–6.0 で覆う)と 6.0 の入れ替え
place(S, whoosh(0.75, 0.55, 300, 5000), 5.38, 0.45)
x = kenney("switch_004", 0.8); hit(S, x, 6.0, 0.6); hit(HITS, x, 6.0, 0.6); cue("swap_F2", 6.0)
# F2: 島のポップ 7つ(小さく)、航路が描かれる音(弱い風切り)、到着の丸
for i in range(7): hit(S, kenney(["drop_001", "drop_002", "drop_003"][i % 3]), 6.15 + i * 0.07 + 0.06, 0.28, -0.6 + i * 0.2)
place(S, whoosh(1.0, 0.9, 600, 3000), 6.45, 0.15)
hit(S, kenney("confirmation_001"), 7.5, 0.45); cue("goal_circle", 7.5)
# スクランブルの刻み(RUN 09)
for i in range(6): hit(S, kenney("tick_002"), 6.2 + 0.18 * i, 0.18)
# F3: 8.0 のカット + カードが立ち上がる 4つ + 準備完了の点
x = kenney("impactSoft_heavy_002", 0.9); hit(S, x, 8.0, 0.7); hit(HITS, x, 8.0, 0.7); cue("cut_F3", 8.0)
for i in range(4): hit(S, kenney(["impactWood_light_000", "impactWood_light_001", "impactWood_light_002", "impactWood_light_003"][i]), 8.15 + 0.12 * i + 0.12, 0.45, -0.5 + i * 0.3)
for i in range(4): hit(S, kenney("select_003"), 8.15 + 0.12 * i + 0.34 + 0.05, 0.22)
# 9.75–10.5: 効果音なし(静けさ1)。10.5 最大の一撃
for x, g in [(boom(2.2, 30), 1.0), (kenney("impactMetal_heavy_003"), 0.75), (kenney("impactPlate_heavy_003"), 0.6)]:
    hit(S, x, 10.5, g); hit(HITS, x, 10.5, g)
cue("title_land", 10.5)
# 光の帯は音楽(グロッケン)で。13.0 以降: 発売日のスクランブル刻み → 13.9 で確定音(小さく)、その後は静けさ2
for i in range(10): hit(S, kenney("tick_004"), 13.25 + 0.07 * i, 0.16)
hit(S, kenney("confirmation_002"), 13.9, 0.3); cue("date_lock", 13.88)

sfx = np.stack(S, 1); hits = np.stack(HITS, 1)
mix = music * 0.9 + sfx * 0.8
mix = mix / (np.abs(mix).max() + 1e-9) * 0.7


def wr(name, x):
    wavfile.write(os.path.join(HERE, "out", name), SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


wr("music.wav", music * 0.9 / (np.abs(mix).max() + 1e-9)); wr("sfx.wav", sfx * 0.8); wr("hits.wav", hits * 0.8); wr("mix_raw.wav", mix)
json.dump(cues, open(os.path.join(HERE, "cues.json"), "w"), indent=1, ensure_ascii=False)
print("ok", {k: round(v / 30, 2) for k, v in cues.items()})
