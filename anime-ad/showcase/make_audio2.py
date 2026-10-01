"""見本「雨の夜、傘の赤」15秒 — 音 v2。音楽=本物の楽器音源(GM)、環境音・足音=合成。場面ごとに楽器・空間・帯域を変える(SOUND_BIBLE.md)。
usage: python3 make_audio2.py [out.wav]   必要: fluidsynth, fluid-soundfont-gm, pretty_midi
"""
import sys, wave
import numpy as np
import pretty_midi as pm
sys.path.insert(0, "/home/user/codeX/claude-video-skill/tools")
import midi_render as M
import instruments as I
mix, tt, nz = I.mix, I.tt, I.nz
SR = I.SR
TOTAL = int(15.0 * SR)
ML = np.zeros(I.N); MR = np.zeros(I.N)          # 音楽バス


from scipy.signal import lfilter, butter, sosfilt
def pink(d):
    w = nz(d)
    return lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400], w)
def rain(d, lv=1.0, lo=250, hi=4500, patter=0.5, drops=140):
    """雨: ピンクノイズを帯域で絞った「地」+ ぱらぱらした水滴の粒。場面ごとに hi(明るさ)と patter(粒の目立ち)を変える。"""
    n = int(SR * d); x = sosfilt(butter(2, [lo, hi], "bp", fs=SR, output="sos"), pink(d))
    x = x / (x.std() + 1e-9) * 0.45
    k = int(d * drops); r = I.rng
    tick = sosfilt(butter(2, [1800, 6500], "bp", fs=SR, output="sos"), nz(0.012)) * np.exp(-tt(0.012) / 0.0025)
    for p, a in zip(r.integers(0, n - len(tick), k), r.uniform(0.3, 1.0, k)): x[p:p + len(tick)] += tick * a * patter * 1.2
    return x * lv * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * tt(d)))
def step(lv=1.0):
    t = tt(0.14); return (I.lp(nz(0.14), 6) * np.exp(-t / 0.03) + 0.4 * np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.04)) * lv
def splash(d=0.25, lv=1.0): return I.bp(nz(d), 1500, 6000) * np.exp(-tt(d) / 0.07) * lv


def inst(prog, drum=False): return pm.Instrument(program=prog, is_drum=drum)
def note(ins, p, t, d, v=80): ins.notes.append(pm.Note(velocity=int(v), pitch=int(p), start=t, end=t + d))
def ramp(ins, t0, t1, v0, v1, cc=11, n=24):
    for k in range(n + 1): ins.control_changes.append(pm.ControlChange(cc, int(v0 + (v1 - v0) * k / n), t0 + (t1 - t0) * k / n))
def scene(parts, t0, length, tail, gain, fx, cut=0.0):
    """パーツ(楽器)のリストを1場面ぶん鳴らし、場面ごとの加工をかけて時刻 t0 に置く。cut>0 なら場面の終わりを cut 秒でぶった切る(ハードカット用)。"""
    m = pm.PrettyMIDI(initial_tempo=120)
    for p in parts: m.instruments.append(p)
    x = M.render(m, tail=tail)
    x = M.scene_fx(x, **fx)
    x = x[: int((length + tail) * SR)]
    if cut:
        k = int(length * SR); x = x[:k]; x = M.fade_out(x, cut)
    M.place(ML, MR, x, t0, gain)


# =============================================================== 音楽(場面ごとに楽器・空間・帯域が違う)
# ---- s1 路地 0-3.5: エレピ+フレットレスベース+ビブラフォン、暗く長い残響
ep, bs, vb = inst(5), inst(35), inst(11)
for p in (57, 60, 64, 67, 71): note(ep, p, 0.0, 1.7, 58)
for p in (53, 57, 60, 64): note(ep, p, 1.75, 1.8, 60)
note(bs, 33, 0.0, 1.6, 78); note(bs, 36, 1.25, 0.4, 58); note(bs, 29, 1.75, 1.7, 80)
note(vb, 76, 1.0, 0.8, 62); note(vb, 72, 2.0, 0.8, 62); note(vb, 81, 2.75, 1.2, 68)
scene([ep, bs, vb], 0.0, 3.5, 2.0, 0.55, dict(rev=2.2, wet=0.38, damp_hz=3500, lp_hz=7000))

# ---- s2 一致 3.5-7.0: チェレスタ+ピチカート+ハープ+弦+ティンパニ、乾いて明るい
ce, pz, hp_, st, tp = inst(8), inst(45), inst(46), inst(48), inst(47)
for tm, p in ((0.0, 88), (0.5, 93), (1.0, 96)): note(ce, p, tm, 1.2, 88)
pat = (57, 64, 69, 72, 76, 72)
for i in range(7): note(pz, pat[i % 6], i * 0.25, 0.2, 72)
for i, p in enumerate((57, 60, 64, 67, 69, 72, 76, 79, 81)): note(hp_, p, 1.0 + i * 0.055, 0.8, 76)
for p in (57, 64, 69, 72): note(st, p, 1.5, 1.0, 100)
for p in (52, 59, 64, 68): note(st, p, 2.5, 1.0, 100)
ramp(st, 1.5, 3.45, 35, 127)
for i in range(11): note(tp, 45, 2.0 + i * 0.13, 0.12, 40 + i * 7)
scene([ce, pz, hp_, st, tp], 3.5, 3.5, 0.0, 0.62, dict(rev=0.5, wet=0.2, damp_hz=9000, hp_hz=150), cut=0.03)

# ---- s3 走り 7.0-11.0: ドラム+太鼓+シンセベース+ブラス+オケヒット+低弦、短く締まる
dr, tk, sb, br, oh, ts, tm_, rc = inst(0, True), inst(116), inst(38), inst(61), inst(55), inst(44), inst(47), inst(119)
KI, SN, HH, CR, T1, T2 = 36, 38, 42, 49, 45, 50
note(dr, CR, 0.0, 0.6, 105); note(dr, KI, 0.0, 0.2, 120)
for tcl in (0.5,): note(dr, KI, tcl, 0.2, 110); note(dr, SN, tcl, 0.2, 105)           # 7.0-8.0 通常
for i in range(4): note(dr, HH, i * 0.25, 0.1, 70 + (i % 2) * 15)
# 8.0-8.5 スロー: ドラム抜き(低弦+ティンパニだけ)
for p in (33, 45, 52): note(ts, p, 1.0, 0.7, 90)
note(tm_, 38, 1.0, 0.6, 120)
# 8.5-9.5 通常に復帰
note(dr, CR, 1.5, 0.8, 95); note(dr, KI, 1.5, 0.2, 118); note(dr, SN, 1.5, 0.2, 112)
for tcl in (2.0,): note(dr, KI, tcl, 0.2, 110); note(dr, SN, tcl, 0.2, 105)
for i in range(4): note(dr, HH, 1.5 + i * 0.25, 0.1, 72 + (i % 2) * 14)
for i, p in enumerate((T1, 47, T2)): note(dr, p, 2.25 + i * 0.0833, 0.15, 90 + i * 8)   # 9.5 直前のタム
# 9.5-10.5 ファスト: 16分ハット+スネア連打+キック
for i in range(8): note(dr, HH, 2.5 + i * 0.125, 0.08, 78 + (i % 2) * 16)
for i in range(8): note(dr, SN, 2.5 + i * 0.125, 0.1, 60 + i * 8)
for i in range(4): note(dr, KI, 2.5 + i * 0.25, 0.2, 112)
for tcl in (0.0, 0.5, 1.5, 2.0): note(tk, 45, tcl, 0.4, 112)
for i in range(4): note(tk, 45, 2.5 + i * 0.25, 0.3, 105)
for tcl in [0.0, 0.25, 0.5, 0.75] + [1.5 + i * 0.25 for i in range(8)]: note(sb, 33 if int(tcl / 0.25) % 4 != 2 else 45, tcl, 0.2, 100)
for tcl in (0.0, 1.5, 2.5): [note(br, p, tcl, 0.55, 112) for p in (45, 57, 60, 64)]
note(oh, 57, 0.0, 0.8, 120)
note(rc, 60, 2.2, 1.7, 100)                                                           # リバースシンバル→11.0に着地
scene([dr, tk, sb, br, oh, ts, tm_, rc], 7.0, 4.0, 0.0, 0.62, dict(rev=0.7, wet=0.14, damp_hz=6000), cut=0.025)

# ---- s4 夜明け 11.0-15.0: ピアノ+合唱+ハープ+フルート+鳥+チェレスタ、広く明るい
pn, ch, hp2, fl, bd, ce2 = inst(0), inst(52), inst(46), inst(73), inst(123), inst(8)
for p in (33, 40): note(pn, p, 0.0, 1.45, 48)
for p in (43, 55, 59, 62, 69): note(pn, p, 1.5, 2.4, 82)
for p in (55, 62, 67, 74): note(ch, p, 1.2, 2.6, 92)
ramp(ch, 1.2, 1.7, 15, 110); ramp(ch, 2.5, 3.8, 110, 40)
for i, p in enumerate((55, 59, 62, 67, 71, 74, 79, 83)): note(hp2, p, 1.5 + i * 0.12, 1.0, 74)
for i, p in enumerate((79, 74, 71, 67)): note(hp2, p, 2.7 + i * 0.2, 0.9, 62)
note(fl, 86, 1.9, 0.55, 74); note(fl, 83, 2.45, 0.55, 72); note(fl, 79, 3.0, 1.0, 70)
for tcl, p in ((1.95, 84), (2.2, 88), (2.8, 86), (3.1, 90)): note(bd, p, tcl, 0.3, 55)
note(ce2, 91, 3.0, 1.2, 82)
scene([pn, ch, hp2, fl, bd, ce2], 11.0, 4.0, 0.0, 0.6, dict(rev=3.2, wet=0.34, damp_hz=8000, hp_hz=80))

# =============================================================== 効果音・環境音(合成。音楽と別バス)
# s1
mix(0, rain(3.6, 0.9, lo=200, hi=2800, patter=0.25, drops=90) * np.minimum(1, tt(3.6) / 0.4), 0.2, send=0.1)
mix(0, I.sine_sweep(120, 120, 3.6) * 0.03 + I.sine_sweep(240, 240, 3.6) * 0.02, 1.0)
for i in range(7):
    mix(0.5 + i * 0.5, step(0.6 + 0.1 * (i % 2)), 0.3, pan=-0.1 + 0.03 * i); mix(0.52 + i * 0.5, splash(0.12, 0.5), 0.12, pan=0.2)
# s2
mix(3.5, rain(3.5, 0.8, lo=300, hi=5200, patter=0.6, drops=200), 0.12, send=0.2)
for tc, f in ((3.5, 1000), (4.0, 1400), (4.5, 1800)): mix(tc, I.click(1.0, f), 0.45)
mix(6.4, I.whoosh(0.6, 0.5, rev=True), 0.18)
# s3
mix(6.95, I.whoosh(0.2, 0.6), 0.25)
mix(7.0, rain(4.0, 1.0, lo=350, hi=6500, patter=0.9, drops=300), 0.2, send=0.1)
for i in range(4): mix(7.0 + i * 0.25, step(0.9), 0.38)
mix(8.0, I.sub_boom(0.7, 1.2, 45), 0.5)
mix(8.0, I.sine_sweep(180, 60, 0.6) * np.exp(-tt(0.6) / 0.4) * 0.5, 0.5, send=0.6)
mix(8.02, I.lp(nz(0.6), 30) * np.sin(np.pi * tt(0.6) / 0.6), 0.3)
mix(8.2, splash(0.5, 1.0), 0.3, send=0.4)
for i in range(4): mix(8.5 + i * 0.25, step(0.9), 0.38)
for i in range(20): mix(9.5 + i * 0.07, step(0.5), 0.2, pan=-0.3 + 0.03 * i)
mix(10.5, I.whoosh(0.5, 1.0), 0.6); mix(10.5, I.sine_sweep(400, 3000, 0.5) * 0.12, 0.5)
# s4
mix(11.0, rain(2.6, 0.9, lo=300, hi=3800, patter=0.5, drops=70) * np.linspace(1, 0.0, int(SR * 2.6)), 0.2, send=0.2)
mix(12.5, I.sfx("sparkle.mp3", 0.9), 0.3, send=0.3)
for tc in (13.4, 14.2): mix(tc, I.ping(2349.0, 0.5, 0.7, 0.1), 0.18, pan=-0.4, send=0.5)

# =============================================================== マスター
import os
_solo=os.environ.get('SOLO')
if _solo=='music': I.DL[:]=0;I.DR[:]=0;I.WL[:]=0;I.WR[:]=0
if _solo=='sfx': ML[:]=0;MR[:]=0
ir, ir2 = I.reverb_ir(1.6), I.reverb_ir(1.6, seed=9)
n = 1 << int(np.ceil(np.log2(I.N + len(ir))))
wl = np.fft.irfft(np.fft.rfft(I.WL, n) * np.fft.rfft(ir, n), n)[:I.N]; wr = np.fft.irfft(np.fft.rfft(I.WR, n) * np.fft.rfft(ir2, n), n)[:I.N]
L, R = I.DL + wl * 0.5 + ML, I.DR + wr * 0.5 + MR
L, R = L[:TOTAL], R[:TOTAL]
pk = max(np.abs(L).max(), np.abs(R).max()); L, R = L / pk, R / pk
L, R = np.tanh(L * 1.1) / np.tanh(1.1), np.tanh(R * 1.1) / np.tanh(1.1)
f0 = int(SR * 14.6); fade = np.ones(TOTAL); fade[f0:] = np.linspace(1, 0, TOTAL - f0) ** 1.4
pcm = (np.stack([L * fade, R * fade], axis=1) * 0.89 * 32767).astype("<i2")
w = wave.open(sys.argv[1] if len(sys.argv) > 1 else "soundtrack2_raw.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
print("ok")
