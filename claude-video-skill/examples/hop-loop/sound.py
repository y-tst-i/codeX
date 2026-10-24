#!/usr/bin/env python3
"""HOP LOOP の音。numpy だけで合成(録音素材なし)。references/motion-lab.md §8 の決まりで作る。
- 打撃音の最初の頂点を「絵の出来事 + 1コマ」= (F + 1) * 800 サンプルに置く(cosine の位相で始め、アタック 0.5ms)
- 下地(ベッド)は 120 BPM・2小節、パッドとシェイカー。打撃音のコマの近くではシェイカーを休む
- 尾はループの頭へ折り返す(2回通すのと同じ)。各チャンネルの平均を引いて直流を消す
usage: python3 sound.py [gain_hits_db] [gain_bed_db] [master_db]  → out/hits.wav, out/bed.wav, out/mix.wav, cues.json
"""
import json, sys, wave
import numpy as np

SR, FPS, N = 48000, 60, 240
L = SR * N // FPS                      # 192000 サンプル = 4.0 秒
SPF = SR // FPS                        # 1コマ = 800 サンプル
rng = np.random.default_rng(7)         # seed 固定
g_hits = 10 ** (float(sys.argv[1]) / 20) if len(sys.argv) > 1 else 10 ** (1.0 / 20)   # 測って決めた既定: 打撃音 +1.0 / 下地 -4.5 / 全体 -1.2 dB
g_bed = 10 ** (float(sys.argv[2]) / 20) if len(sys.argv) > 2 else 10 ** (-4.5 / 20)
g_master = 10 ** (float(sys.argv[3]) / 20) if len(sys.argv) > 3 else 10 ** (-1.2 / 20)
hits = np.zeros((2, L)); bed = np.zeros((2, L))

def put(buf, start, sig, pan=0.0):
    """start から sig を足す。ループの端を越えた分は頭に折り返す。pan -1(左)〜1(右)"""
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    idx = (start + np.arange(len(sig))) % L
    np.add.at(buf[0], idx, gl * sig); np.add.at(buf[1], idx, gr * sig)

def fades(sig, ms_in=0.5, ms_out=4.0):
    """頭と尾に数msのフェード(プツッと切れないように)"""
    a, b = int(SR * ms_in / 1000), int(SR * ms_out / 1000)
    if a: sig[:a] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a))
    if b: sig[-b:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b))
    return sig

def tonal(partials, dur, decay, attack_ms=0.5):
    """cosine の位相で始まる倍音の和。頂点は attack の終わり(= 返す pre サンプル目)に来る"""
    pre = int(SR * attack_ms / 1000); n = pre + int(SR * dur); t = (np.arange(n) - pre) / SR
    env = np.where(t < 0, 0.5 - 0.5 * np.cos(np.pi * (np.arange(n) / max(pre, 1))), np.exp(-t / decay))
    # 4つ目の値は位相(省略で 0 = cosine)。同じコマの音と頂点が重なる時は sine 位相(-pi/2)でずらす
    sig = sum(p[1] * np.cos(2 * np.pi * p[0] * t + (p[3] if len(p) > 3 else 0)) * np.exp(-t / (decay * p[2])) for p in partials) * env
    return fades(sig, 0, 6), pre

def noise_burst(dur, lo, hi, decay):
    """帯域を絞ったノイズの短い粒(FFT で帯域を切る)"""
    n = int(SR * dur); x = rng.standard_normal(n)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(X, n); x /= np.abs(x).max() + 1e-12
    return fades(x * np.exp(-np.arange(n) / SR / decay), 0.3, 3)

def hit(frame, partials, dur, decay, gain, pan=0.0, click=0.0, snap=False):
    """頂点を (frame + 1) コマ目に置く打撃音。snap=True は頭を 3ms で 65% まで落とす(最初の山を一番大きくする)"""
    sig, pre = tonal(partials, dur, decay)
    if snap:
        tt = np.maximum(0, np.arange(len(sig)) - pre) / SR; sig *= 0.6 + 0.4 * np.exp(-tt / 0.0035)
    if click:
        c = noise_burst(0.012, 1500, 6000, 0.003) * click; sig[pre:pre + len(c)] += c
    put(hits, (frame + 1) * SPF - pre, gain * g_hits * sig, pan)

def mtof(m): return 440 * 2 ** ((m - 69) / 12)

cues = {}
# 4回の着地: 木の「コトッ」+ マリンバの音(文字ごとに上がる: C5 E5 G5 C6)。左右は文字の位置
for i, (fr, note) in enumerate(zip([30, 60, 90, 120], [72, 76, 79, 84])):
    pan = -0.5 + 0.33 * i
    g = [1.0, 1.0, 1.0, 0.85][i]                                                      # 1つ目は下地に埋もれたので上げる
    hit(fr, [(180, 1.0, 1.0), (412, 0.35, 0.5, -np.pi / 2)], 0.2, 0.08, 0.6 * g * [0.9, 1, 1, 1][i], pan, click=0.12, snap=True)        # 体の着地(低い木の音)
    f0 = mtof(note)
    hit(fr, [(f0, 1.0, 1.0, -np.pi / 2), (f0 * 3.93, 0.5, 0.3, -np.pi / 2), (f0 * 9.2, 0.1, 0.1, -np.pi / 2)], 0.9, 0.32, 0.30 * g, pan)  # 文字が点く音
    put(hits, (fr + 1) * SPF, 0.10 * [2.2, 1.0, 1.0, 0.8][i] * g_hits * noise_burst(0.12, 700, 4500, 0.04), pan)   # 小さな埃の音: 頂点を上げずに頭60msの量を足す
    cues[f"land_{i + 1}"] = fr
# 離陸: 短い上向きのふわっ(ノイズ)、頂点は合わせない柔らかい音
for fr in [12, 42, 72, 102]:
    s = noise_burst(0.09, 900, 4000, 0.05); s *= np.linspace(0.3, 1, len(s)) ** 2
    put(hits, (fr + 1) * SPF - len(s) // 2, 0.10 * g_hits * s)
# まばたき(140): ごく小さいポッ
hit(140, [(mtof(91), 1.0, 1.0)], 0.06, 0.012, 0.06, 0.5)
# 宙返り: 176〜210 で膨らむ風切り(ノイズの帯域が上がる)
n = (210 - 176) * SPF; w = noise_burst(n / SR, 300, 2500, 10.0)
env = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5; put(hits, 177 * SPF, 0.16 * g_hits * w * env, 0.0)
# 大きな着地(210): 低い「ドン」+ 木の音 + 和音
hit(210, [(70, 0.45, 0.25), (140, 0.4, 0.3, -np.pi / 2), (180, 1.0, 0.4)], 0.45, 0.16, 0.28, -0.6, click=0.1)
hit(210, [(mtof(60), 0.7, 1.0, -np.pi / 2), (mtof(64), 0.5, 1.0, -np.pi / 2), (mtof(67), 0.5, 1.0, -np.pi / 2), (mtof(60) * 3.93, 0.4, 0.3, -np.pi / 2)], 1.2, 0.4, 0.24, -0.6)
put(hits, 211 * SPF, 0.22 * g_hits * noise_burst(0.2, 500, 4000, 0.07), -0.6)
cues["big_land"] = 210
# 文字が右から順に消える(213, 216, 219)小さなカチ
for k, fr in enumerate([213, 216, 219]):
    hit(fr, [(mtof(84 - 5 * k), 0.6, 1.0)], 0.05, 0.01, 0.10, 0.4 - 0.3 * k, click=0.15)

# ---- 下地: パッド(C → F)、シェイカー(8分)、柔らかいキック(着地の無い拍だけ) ----
t = np.arange(L) / SR
def pad(notes, a, b):
    """周波数を 0.25Hz 刻みに丸めて4秒で周期的にし、切り替えは輪の上でなめらかにする(継ぎ目が切れない)"""
    s = np.zeros(L)
    for nt in notes:
        for det in (-0.12, 0.12):
            f = round(mtof(nt + det) * 4) / 4
            s += sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in range(1, 6))
    env = ((t >= a) & (t < b)).astype(float); win = int(SR * 0.25)
    e = np.real(np.fft.ifft(np.fft.fft(env) * np.fft.fft(np.roll(np.r_[np.ones(win) / win, np.zeros(L - win)], -win // 2))))
    return s * e
padsig = pad([48, 55, 64, 67, 74], 0.0, 2.0) + pad([53, 57, 60, 65, 72], 2.0, 4.0)
# ベース: 1拍ごとに根音(C2 → F2)、柔らかい三角波ふう。4秒で周期的
bass = np.zeros(L)
for beat in range(8):
    root = 36 if beat < 4 else 41; f = round(mtof(root) * 4) / 4
    a0 = int(beat * SR * 0.5); n = int(SR * 0.5); tt = np.arange(n) / SR
    tone = sum(np.sin(2 * np.pi * f * k * tt) / k ** 2 for k in (1, 3, 5)) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)
    env = np.minimum(1, tt / 0.01) * np.exp(-tt / 0.35); env[-480:] *= np.linspace(1, 0, 480)
    env *= [1, .55, .55, .55, .55, 1, 1, .55][beat]                    # 着地の拍は弱く(打撃音に頂点を譲る)
    bass[a0 + 1200:a0 + 1200 + n] += (tone * env)[:L - a0 - 1200] if a0 + 1200 + n > L else tone * env   # 拍から25ms 後ろ(着地とぶつけない)
bed[0] += g_bed * (0.12 * padsig + 0.10 * bass); bed[1] += g_bed * (0.12 * padsig + 0.10 * bass)
hit_frames = [30, 60, 90, 120, 210, 213, 216, 219]
for fr in range(0, N, 15):                                          # 8分 = 15コマ
    if any(abs(fr - h) <= 3 for h in hit_frames): continue
    s = noise_burst(0.05, 5000, 9000, 0.012) * (0.05 if fr % 30 else 0.03)
    put(bed, (fr + 1) * SPF + 120, g_bed * s, 0.3 if fr % 30 else -0.3)  # 着地から少しずらす
for fr in [0, 150, 180]:
    k, pre = tonal([(55, 1.0, 1.0), (110, 0.2, 0.5)], 0.25, 0.08)
    put(bed, (fr + 1) * SPF - pre, 0.22 * g_bed * k)

# 大きな着地の間だけ下地を 6dB 下げる(209〜224コマ、頭と尾は 30ms でなめらかに)
duck = np.ones(L); d0, d1 = 209 * SPF, 224 * SPF; r = int(SR * 0.03)
duck[d0:d1] = 0.5; duck[d0 - r:d0] = np.linspace(1, 0.5, r); duck[d1:d1 + r] = np.linspace(0.5, 1, r)
for fr in [30, 60, 90, 120]:                                        # 小さな着地でも 2.5dB だけ下げる(サイドチェイン)
    d0, d1 = fr * SPF, (fr + 9) * SPF; r = int(SR * 0.02)
    duck[d0:d1] = np.minimum(duck[d0:d1], 0.75); duck[d0 - r:d0] = np.minimum(duck[d0 - r:d0], np.linspace(1, 0.75, r)); duck[d1:d1 + r] = np.minimum(duck[d1:d1 + r], np.linspace(0.75, 1, r))
bed *= duck
for b in (hits, bed): b -= b.mean(axis=1, keepdims=True)           # 直流を消す
mix = (hits + bed) * g_master

def limiter(x, ceil_db=-2.6, release_ms=60):
    """先読みのピーク制限(信号は遅らせない: 頂点の位置が動かない)。戻り値: (出力, 最大の削り量 dB)"""
    ceil = 10 ** (ceil_db / 20); pk = np.abs(x).max(axis=0)
    need = np.minimum(1, ceil / np.maximum(pk, 1e-9))              # 各サンプルで必要な倍率
    look = int(SR * 0.0015)                                        # 1.5ms 先から下げ始める
    g = np.minimum.reduce([np.roll(need, -k) for k in range(look + 1)])
    r = np.exp(-1 / (SR * release_ms / 1000)); out = np.empty(L); cur = 1.0
    for _ in range(2):                                             # ループなので2周して継ぎ目もなめらかに
        for n in range(L):
            cur = g[n] if g[n] < cur else min(g[n], 1 - (1 - cur) * r); out[n] = cur
    print(f"  (一番削った所: {out.argmin() / SPF - 1:.1f} コマ目の頂点付近)")
    return x * out, -20 * np.log10(out.min())
mix, gr = limiter(mix)
hits *= g_master; bed *= g_master
print(f"リミッターの最大の削り量 {gr:.1f} dB(目安 1.5 以内)")

def save(path, x):
    y = np.clip(x, -1, 1); w = wave.open(path, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((y.T * 32767).astype("<i2").tobytes()); w.close()
import os; os.makedirs("out", exist_ok=True)
save("out/hits.wav", hits); save("out/bed.wav", bed); save("out/mix.wav", mix)   # mix.wav = 継ぎ目のないマスター
# 1ループの MP4 用: AAC の埋め草で継ぎ目が硬く止まるので、先頭と末尾の各96サンプル(2ms)に raised-cosine のフェード
m1 = mix.copy(); r = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, 96)); m1[:, :96] *= r; m1[:, -96:] *= r[::-1]
save("out/mix_single.wav", m1)
save("out/mix_x3.wav", np.tile(mix, 3))                                          # 3回通しの確認・投稿用
json.dump(cues, open("cues.json", "w"), indent=1)
