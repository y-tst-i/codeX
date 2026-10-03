"""STILLDUSK 15秒の「連続したBGMの層(ベッド)」。ヒットや効果音の下に、曲として流れ続ける低域のうねりと脈動を敷く。
場面の山に合わせて盛り上げ、設計書のほぼ無音の窓(下記 DUCK)では絞る。決定的。usage: python3 make_bed.py bed.wav
"""
import sys, numpy as np, scipy.io.wavfile as wf
sys.path.insert(0, "/home/user/codeX/claude-video-skill/tools")
import pretty_midi as pm, midi_render as M
SR = 44100; F = 1 / 30.0; B = 0.4                                  # 1フレーム=1/30s、1拍=0.4s(150BPM)
def ins(prog): return pm.Instrument(program=prog)
def note(i, p, t, d, v): i.notes.append(pm.Note(velocity=int(v), pitch=int(p), start=t, end=t + d))
def ramp(i, t0, t1, v0, v1, cc=11, n=30):
    for k in range(n + 1): i.control_changes.append(pm.ControlChange(cc, int(v0 + (v1 - v0) * k / n), t0 + (t1 - t0) * k / n))
m = pm.PrettyMIDI(initial_tempo=150)
# 1. 低弦のうなり: コントラバス A1 を全編、再発音しながら持続。場面ごとに強さが変わる
cb = ins(43)
for t0, t1 in ((0, 2.0), (2.0, 4.4), (4.4, 7.6), (7.6, 12.0), (12.0, 15.0)): note(cb, 33, t0, t1 - t0 + 0.3, 85); note(cb, 40, t0 + 0.0, t1 - t0 + 0.3, 60)
ramp(cb, 0, 2.0, 25, 60); ramp(cb, 2.0, 4.4, 60, 85); ramp(cb, 4.4, 7.6, 85, 70); ramp(cb, 7.6, 10.2, 45, 45); ramp(cb, 10.2, 11.0, 45, 110); ramp(cb, 11.0, 12.0, 60, 40); ramp(cb, 12.0, 15.0, 70, 45)
# 2. 弦アンサンブル: 開放五度(A2/E3)の持続。s2 で膨らみ、s4 加速で一気に上がり、s5 で解決(D を足して開く)
st = ins(48)
for p in (45, 52, 57): note(st, p, 2.0, 9.4, 70)                    # s2〜s4加速まで
ramp(st, 2.0, 4.4, 20, 80); ramp(st, 4.4, 7.6, 70, 55); ramp(st, 7.6, 10.2, 35, 35); ramp(st, 10.2, 11.0, 35, 127)
for p in (45, 52, 57, 62, 64): note(st, p, 12.0, 3.0, 75)           # s5: A D E A D(sus に開く)
ramp(st, 12.0, 12.6, 20, 85); ramp(st, 12.6, 15.0, 85, 30)
# 3. 脈動: 太鼓とティンパニ。s2 から拍ごとに弱く刻み、s3 で強まり、照準(G210〜)で止まる。s4 加速で再開
tk, tp = ins(116), ins(47)
t = 2.0
while t < 7.0: note(tk, 33, t, 0.3, 28 + 40 * (t - 2.0) / 5.0); t += B
for k in range(8): note(tp, 33, 10.2 + k * B / 2, 0.2, 40 + k * 10)  # 加速の連打
# 4. 高い弦のきらめき(ハーモニクス風): s5 のみ、音数は少なく
hp = ins(46)
for tt_, p in ((12.4, 81), (13.0, 76), (13.6, 69)): note(hp, p, tt_, 1.2, 50)
for x in (cb, st, tk, tp, hp): m.instruments.append(x)
x = M.render(m, tail=1.0)[: int(15.0 * SR)]
x = M.scene_fx(x, rev=2.4, wet=0.3, damp_hz=5000, lp_hz=9000)[: int(15.0 * SR)]
# 絞る窓(設計書のほぼ無音: G118–119、G210–227、G246–258)と、場面頭の呼吸
t = np.arange(len(x)) / SR; env = np.ones(len(x))
for a, b in ((118 * F, 120 * F), (210 * F, 228 * F), (246 * F, 259 * F)):
    env *= 1 - 0.92 * np.clip(np.minimum((t - a) / 0.06, (b - t) / 0.06 + 0) , 0, 1) * ((t >= a) & (t <= b))
x = x * env[:, None]
fade = np.ones(len(x)); fade[int(14.5 * SR):] = np.linspace(1, 0, len(x) - int(14.5 * SR)); x = x * fade[:, None]
rms = np.sqrt((x ** 2).mean()); x = x / rms * 10 ** (-27 / 20)        # ベッドの平均を -27 dBFS RMS に(上の音より下)
x = np.clip(x, -0.99, 0.99); wf.write(sys.argv[1], SR, (x * 32767).astype("<i2")); print("bed ok", x.shape)
