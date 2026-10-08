"""技法ショーケース 15秒「雨の夜、傘の赤」 — 場面ごとに音の世界を変える。BPM120。"""
import sys, wave, numpy as np
import instruments as I
mix, tt, nz, rng = I.mix, I.tt, I.nz, I.rng
def rain(d, lv=1.0): return I.hp(nz(d), 4) * lv * (0.75 + 0.25 * np.sin(2 * np.pi * 0.8 * tt(d)))
def step(lv=1.0):
    t = tt(0.14); return (I.lp(nz(0.14), 6) * np.exp(-t / 0.03) + 0.4 * np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.04)) * lv
def splash(d=0.25, lv=1.0): return I.bp(nz(d), 1500, 6000) * np.exp(-tt(d) / 0.07) * lv
A2, E2 = 110.0, 82.41

# ---- s1 0.0-3.5 : 濡れた路地。雨、ネオンのうなり、足音(拍ごと)、低いパッド
mix(0, rain(3.6, 0.5) * np.minimum(1, tt(3.6) / 0.4), 0.2, send=0.1)
mix(0, I.sine_sweep(120, 120, 3.6) * 0.03 + I.sine_sweep(240, 240, 3.6) * 0.02, 1.0)            # ネオンのハム
mix(0, I.pad([55.0, 82.41, 110.0], 3.8, 1.0, att=1.2, rel=0.6, harm=5), 0.5, send=0.4)
for i in range(7):
    mix(0.5 + i * 0.5, step(0.6 + 0.1 * (i % 2)), 0.3, pan=-0.1 + 0.03 * i)
    mix(0.5 + i * 0.5 + 0.02, splash(0.12, 0.5), 0.12, pan=0.2)
mix(2.9, I.riser(0.6, 0.8), 0.25)                                                           # 出口の光へ
# ---- s2 3.5-7.0 : 一致のつなぎ。カットごとに上がる澄んだ音、真上へ引くライザー
mix(3.5, I.bell(659.25, 1.6, 0.8), 0.45, send=0.5)                                          # 傘の円
mix(4.0, I.bell(880.0, 1.4, 0.8), 0.45, send=0.5); mix(4.0, I.click(1.0, 1400), 0.5)        # 信号の赤へ(マッチ1)
mix(4.5, I.bell(1174.66, 1.6, 0.8), 0.5, send=0.5); mix(4.5, I.click(1.0, 1800), 0.5)       # 俯瞰へ(マッチ2)
mix(3.5, rain(3.5, 0.4), 0.14, send=0.2)
mix(4.5, I.pad([164.81, 246.94, 329.63], 2.6, 0.9, att=1.0, rel=0.6, harm=6), 0.5, send=0.5)
mix(4.5, I.riser(2.0, 0.9), 0.3)
# ---- s3 7.0-11.0 : 加速。ハードカットの衝撃、走る足音、スローで低くこもる、ファストで高く速く、ウィップ
mix(7.0, I.kick(1.1), 0.9); mix(7.0, I.crash(0.5, 0.8), 0.3); mix(6.95, I.whoosh(0.2, 0.6), 0.3)
mix(7.0, rain(4.0, 0.9), 0.22, send=0.1)
for i in range(8):                                                                          # 通常(7.0-8.0): 走る
    mix(7.0 + i * 0.25, step(0.9), 0.4); mix(7.0 + i * 0.25, I.hat(0.4), 0.15, 0.3)
mix(8.0, I.sub_boom(0.7, 1.2, 45), 0.6)                                                     # スロー(8.0-8.5): 低く
mix(8.0, I.sine_sweep(180, 60, 0.6) * np.exp(-tt(0.6) / 0.4) * 0.5, 0.5, send=0.6)
mix(8.02, I.lp(nz(0.6), 30) * np.sin(np.pi * tt(0.6) / 0.6), 0.3)
mix(8.2, splash(0.5, 1.0), 0.3, send=0.4)
for i in range(4): mix(8.5 + i * 0.25, step(0.9), 0.4)                                     # 通常に戻る
for i in range(20): mix(9.5 + i * 0.07, step(0.5), 0.22, pan=-0.3 + 0.03 * i)               # ファスト(9.5-11.0)
for i in range(8): mix(9.5 + i * 0.1875, I.snare(0.5 + 0.06 * i), 0.4)
mix(10.5, I.whoosh(0.5, 1.0), 0.6, pan=0.0); mix(10.5, I.sine_sweep(400, 3000, 0.5) * 0.12, 0.5)  # ウィップ
# ---- s4 11.0-15.0 : 雨上がり。雨が引く→光が差す瞬間に和音、鳥、余韻
mix(11.0, rain(2.6, 0.8) * np.linspace(1, 0.0, int(I.SR * 2.6)), 0.2, send=0.2)
mix(11.0, I.pad([55.0, 82.41], 1.8, 0.9, att=0.6, rel=0.8, harm=5), 0.4, send=0.4)
mix(12.5, I.sfx("sparkle.mp3", 0.9), 0.35, send=0.3)                                        # 雲が割れる(1.5秒)
mix(12.5, I.choir(329.63, 2.2, 0.9, att=0.4, rel=0.9), 0.5, send=0.6)
mix(12.5, I.pad([196.0, 246.94, 293.66, 392.0], 2.4, 1.0, att=0.5, rel=1.0, harm=8), 0.55, send=0.5)  # Gの長和音=金の光
mix(12.5, I.bell(784.0, 2.5, 1.0), 0.4, send=0.6)
for tc, f in ((12.9, 3000), (13.05, 3400), (13.8, 3100), (13.95, 3500)):
    mix(tc, I.sine_sweep(f, f * 1.25, 0.06) * 0.2, 0.18, pan=0.7, send=0.4)
for tc in (13.4, 14.2): mix(tc, I.ping(2349.0, 0.5, 0.7, 0.1), 0.2, pan=-0.4, send=0.5)       # 雫
mix(14.0, I.bell(1046.5, 1.5, 0.8), 0.3, send=0.6)                                          # 「雨上がり」
# ---- master
ir, ir2 = I.reverb_ir(2.4), I.reverb_ir(2.4, seed=9)
n = 1 << int(np.ceil(np.log2(I.N + len(ir))))
wl = np.fft.irfft(np.fft.rfft(I.WL, n) * np.fft.rfft(ir, n), n)[:I.N]; wr = np.fft.irfft(np.fft.rfft(I.WR, n) * np.fft.rfft(ir2, n), n)[:I.N]
L, R = I.DL + wl * 0.8, I.DR + wr * 0.8; k = int(15.0 * I.SR); L, R = L[:k], R[:k]
pk = max(np.abs(L).max(), np.abs(R).max()); L, R = L / pk, R / pk
L, R = np.tanh(L * 1.2) / np.tanh(1.2), np.tanh(R * 1.2) / np.tanh(1.2)
f0 = int(I.SR * 14.6); fade = np.ones(k); fade[f0:] = np.linspace(1, 0, k - f0) ** 1.4
pcm = (np.stack([L * fade, R * fade], axis=1) * 0.89 * 32767).astype("<i2")
w = wave.open(sys.argv[1] if len(sys.argv) > 1 else "soundtrack_raw.wav", "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(I.SR); w.writeframes(pcm.tobytes()); w.close()
print("ok")
