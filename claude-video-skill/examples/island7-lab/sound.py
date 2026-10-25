#!/usr/bin/env python3
"""ISLAND 7 LAB の音(PROMPT.md の音の指示書)。numpy だけで合成、録音素材なし。8 秒・480 コマ・60fps・継ぎ目のないループ。
- 打撃の最初の頂点は (コマ + 1) * 800 サンプル。cosine の位相で始め、同じコマの別の音は sine の位相でずらす(頂点を重ねない)
- 下地: 120 BPM のマリンバ+ピチカートを着地から 40ms 後ろへ。嵐の間は抜いてパッド。PLAY の後は静かなパッドが 0コマ目へつながる
- 雷は厚みのある漫画的な爆発音(一瞬の山ではなく飽和させた塊)。スローで低く伸び、333 でテープが止まる
- 巻き戻し 333〜444: それまでの音全体(物語 0〜311 コマ)を逆再生・速回しした音 + テープのゆれ + モーターの唸り。444 で PLAY の音
- 尾は頭へ折り返す(2回通すのと同じ)。直流を消す。測ってから全体の音量を決める(sys.argv)
出力: out/hits.wav, out/bed.wav, out/mix.wav(継ぎ目なし), out/mix_single.wav(先頭と末尾 96 サンプルのフェード), out/mix_x3.wav, cues.json
"""
import json, os, sys, wave
import numpy as np
SR, FPS, N = 48000, 60, 480
L = SR * N // FPS; SPF = SR // FPS
LAND, BOLT, FREEZE, PLAY, STORM = [60, 90, 120, 150, 180, 210], 300, 333, 444, 240
rng = np.random.default_rng(7)
g_hit, g_bed, g_all = (10 ** (float(a) / 20) for a in (sys.argv[1:4] if len(sys.argv) > 3 else (-1.3, 10, 5.2)))   # 測って決めた既定: 打撃 -1.3 / 下地 +10 / 全体 +5.2 dB

def put(buf, start, sig, pan=0.0):
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    idx = (start + np.arange(len(sig))) % buf.shape[1]
    np.add.at(buf[0], idx, gl * sig); np.add.at(buf[1], idx, gr * sig)
def fades(x, a_ms=.5, b_ms=4):
    a, b = int(SR * a_ms / 1000), int(SR * b_ms / 1000)
    if a: x[:a] *= .5 - .5 * np.cos(np.linspace(0, np.pi, a))
    if b: x[-b:] *= .5 + .5 * np.cos(np.linspace(0, np.pi, b))
    return x
def tonal(partials, dur, decay, attack_ms=.5, snap=False):
    pre = int(SR * attack_ms / 1000); n = pre + int(SR * dur); t = (np.arange(n) - pre) / SR
    env = np.where(t < 0, .5 - .5 * np.cos(np.pi * np.arange(n) / max(pre, 1)), np.exp(-t / decay))
    x = sum(p[1] * np.cos(2 * np.pi * p[0] * t + (p[3] if len(p) > 3 else 0)) * np.exp(-t / (decay * p[2])) for p in partials) * env
    if snap: x *= .6 + .4 * np.exp(-np.maximum(t, 0) / .0035)
    return fades(x, 0, 6), pre
def noise(dur, lo, hi, decay, seed):
    n = int(SR * dur); x = np.random.default_rng(seed).standard_normal(n); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(X, n); x /= np.abs(x).max() + 1e-12; return fades(x * np.exp(-np.arange(n) / SR / decay), .3, 3)
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def hit(buf, frame, partials, dur, decay, gain, pan=0., snap=False, attack_ms=.5):
    x, pre = tonal(partials, dur, decay, attack_ms=attack_ms, snap=snap); put(buf, (frame + 1) * SPF - pre, gain * x, pan)

# ---- 物語の時刻の音(0〜311 コマ。巻き戻しの材料にも使う) ----
SL = int(SR * 5.6)
fh, fb = np.zeros((2, SL)), np.zeros((2, SL))
for k, (Lf, note) in enumerate(zip(LAND, [67, 69, 71, 72, 74, 76])):
    pan = -.3 + .12 * k                                                                                 # 左右に振りすぎると片側の頂点が上がる
    hit(fh, Lf, [(170, 1, 1), (390, .35, .5, -np.pi / 2)], .2, .07, .26, pan, snap=True)                   # 着地の木の音
    f0 = mtof(note); hit(fh, Lf, [(f0, 1, 1, -np.pi / 2), (f0 * 3.93, .4, .3, -np.pi / 2)], .8, .28, .3, pan)   # ラベルが点く音(sine 位相でずらす)
    d = noise(.12, 700, 4500, .04, Lf); put(fh, (Lf + 1) * SPF + int(SR * .008), .28 * d, pan)   # 頂点を上げずに頭 60ms の量を足す                                   # 小さな砂ぼこり
    s = noise(.1, 900, 3500, .05, Lf + 1); s *= np.linspace(.3, 1, len(s)) ** 2; put(fh, (Lf - 20 + 1) * SPF - len(s) // 2, .06 * s, pan)   # 離陸
    c = noise(.16, 250, 1200, .1, Lf + 2) * np.sin(np.linspace(0, np.pi, int(.16 * SR))); put(fh, (Lf - 30 + 1) * SPF, .035 * c, pan)     # しゃがみのきしみ
    for j in range(1, 10): hit(fh, Lf - 1 + j, [(mtof(note + 12 + (j % 3) * 5), 1, 1)], .04, .008, .025, pan)     # 設備が1個ずつ生える小さな音(着地のコマは打撃に譲る)
# 7日目: 低い警告と、雷までうなりが育つ
hit(fh, STORM, [(mtof(43), 1, 1), (mtof(50), .6, 1), (mtof(55), .4, 1)], 1.4, .5, .22, 0)
n = int(SR * (BOLT - STORM) / FPS); rum = noise((BOLT - STORM) / FPS, 70, 320, 9, 11); rum = np.tanh(3 * rum) / np.tanh(3) * .6 * np.linspace(0, 1, n) ** 1.5   # 雑音の鋭い頂点を丸める
rum = rum[:n - SPF - int(SR * .01)]; rum[-int(SR * .02):] *= np.linspace(1, 0, int(SR * .02)); put(fb, (STORM + 1) * SPF, .35 * rum)   # 雷の前で消す
# 雷: 鋭い割れ + 厚みのある漫画の爆発(飽和させた低域の塊)
crack = noise(.25, 1500, 7000, .03, 21); put(fh, (BOLT + 1) * SPF + int(SR * .002), .4 * crack, .5)
hit(fh, BOLT, [(1900, 1, 1), (3300, .6, .6), (620, .7, 1.5)], .04, .012, .2, .5, snap=True)   # 頭の「パチッ」で頂点をコマ+1に固定
bn = int(SR * 1.2); body = np.random.default_rng(22).standard_normal(bn); B = np.fft.rfft(body); fr_ = np.fft.rfftfreq(bn, 1 / SR); B[(fr_ < 55) | (fr_ > 900)] = 0
body = np.fft.irfft(B, bn); body /= np.abs(body).max(); env = np.minimum(1, np.arange(bn) / (SR * .012)) * np.exp(-np.arange(bn) / SR / .35)
boom = np.tanh(3.5 * body * env) / np.tanh(3.5); put(fh, (BOLT + 1) * SPF + int(SR * .012), .17 * fades(boom, 0, 20), 0)   # 割れの頂点の後から立ち上がる
# 下地: 120 BPM、着地から 40ms 後ろ。0〜240 のマリンバとピチカート、嵐はパッド
t = np.arange(SL) / SR
chords = [(55, 59, 62), (60, 64, 67), (57, 60, 64), (62, 66, 69)]
for beat in range(16):
    f = 30 * beat
    if f >= STORM: break
    ch = chords[(beat // 2) % 4]
    for e in range(2):
        hit(fb, f + 15 * e, [(mtof(ch[(beat + e) % 3] + 12), 1, 1), (mtof(ch[(beat + e) % 3] + 12) * 3.93, .25, .3)], .3, .12, .07 if f > 20 else .045, attack_ms=6)   # 下地は頭を丸める(合図ではない)
    hit(fb, f, [(mtof(ch[0]), 1, 1), (mtof(ch[0]) * 2, .3, .5)], .4, .16, .08, attack_ms=6)   # ピチカートを1オクターブ上(スマホで鳴る帯域へ)
fb[:, :] = np.roll(fb, int(SR * .04), axis=1)                                                    # 着地の頂点を譲る
pad = sum(np.sin(2 * np.pi * mtof(m) * t) / (1 + i) for i, m in enumerate((43, 50, 55, 58)))
penv = np.clip((t - STORM / FPS) / .4, 0, 1) * np.clip((BOLT / FPS - t) / .05, 0, 1)
fb += .05 * pad * penv
forward = fh + fb

# ---- 実時間の線へ並べる ----
hits, bed, rew = np.zeros((2, L)), np.zeros((2, L)), np.zeros((2, L))   # rew = 巻き戻しの音(自分の音量で鳴らす)
hits[:, :BOLT * SPF] = fh[:, :BOLT * SPF]; bed[:, :BOLT * SPF] = fb[:, :BOLT * SPF]
# 300〜333 のスロー: 物語の時刻 s(t) で読み、音程も下がる(読む速さ = ds/dt)
def story(f):
    u = (f - BOLT) / (FREEZE - BOLT); return BOLT + (FREEZE - BOLT) * (u - u * u + u ** 3 / 3)
idx = np.arange(BOLT * SPF, FREEZE * SPF); sf = np.array([story(i / SPF) for i in idx]); src = sf * SPF
for buf, srcbuf in ((hits, fh), (bed, fb)):
    for ch in range(2): buf[ch, idx] = np.interp(src, np.arange(SL), srcbuf[ch])
# テープが止まる(333): スローの最後は読む速さが 0 へ落ちるので、そのまま止まる。余韻を 30ms で切る
tail = np.linspace(1, 0, int(SR * .03)); hits[:, FREEZE * SPF - len(tail):FREEZE * SPF] *= tail; bed[:, FREEZE * SPF - len(tail):FREEZE * SPF] *= tail
# 巻き戻し 333〜444: 物語の音を逆に・速く(s(t) どおりに読む)+ ゆれ + 唸り
S_END = story(FREEZE - 1e-6)
def rewind_s(f):
    u = np.clip((f - FREEZE) / (PLAY - FREEZE), 0, 1); e = np.where(u < .5, 8 * u ** 4, 1 - (-2 * u + 2) ** 4 / 2); return S_END * (1 - e)
ridx = np.arange(FREEZE * SPF, PLAY * SPF); rs = rewind_s(ridx / SPF); wow = 1 + .004 * np.sin(2 * np.pi * 5.5 * ridx / SR)
rsrc = rs * SPF * wow
for ch in range(2): rew[ch, ridx] += .5 * np.interp(rsrc, np.arange(SL), forward[ch])
whirr = noise((PLAY - FREEZE) / FPS, 300, 2500, 99, 31) * .5 + .5 * np.sin(2 * np.pi * 118 * np.arange(len(ridx)) / SR) * .3
whirr *= np.sin(np.linspace(0, np.pi, len(ridx))) ** .5; put(rew, FREEZE * SPF, .05 * whirr[:len(ridx)])
# PLAY(444): 機械の「ガチャ」(低い胴 + 短いクリック)
hit(hits, PLAY, [(95, 1, 1), (210, .5, .4, -np.pi / 2)], .18, .05, .42, 0, snap=True)
put(hits, (PLAY + 1) * SPF, .25 * noise(.02, 2000, 7000, .004, 41))
# 静かなパッド: 444〜480 と 0〜60 を通して鳴る(継ぎ目をまたぐ)
pn = int(SR * 1.6); tp = np.arange(pn) / SR; calm = sum(np.sin(2 * np.pi * mtof(m) * tp) / (1 + i) for i, m in enumerate((55, 62, 67)))
calm *= np.sin(np.linspace(0, np.pi, pn)) ** .7; put(bed, (PLAY - 6) * SPF, .06 * calm)   # 黙らない

# ---- 下地を打撃の時だけ少し下げる(サイドチェイン)、直流、全体、制限 ----
tt = np.arange(L) / SR; sc = np.ones(L)
for f in LAND + [BOLT, PLAY]:
    t0 = (f + 1) / FPS; sc = np.minimum(sc, np.interp(tt, [t0 - .02, t0 - .005, t0 + .08, t0 + .3], [1, .75, .75, 1]))
bed *= sc; hits *= g_hit * g_all; bed *= g_bed * g_all; rew *= g_all; bed += rew   # 巻き戻しは測る時は下地に含める
for b in (hits, bed): b -= b.mean(axis=1, keepdims=True)
def limiter(x, ceil_db=-2.6, rel_ms=60):
    ceil = 10 ** (ceil_db / 20); need = np.minimum(1, ceil / np.maximum(np.abs(x).max(0), 1e-9)); k = int(SR * .0015); g = need.copy()
    for j in range(1, k + 1): g[:-j] = np.minimum(g[:-j], need[j:])
    r = np.exp(-1 / (SR * rel_ms / 1000)); out = np.empty(L); cur = 1.
    for _ in range(2):
        for n in range(L): cur = g[n] if g[n] < cur else min(g[n], 1 - (1 - cur) * r); out[n] = cur
    return x * out, -20 * np.log10(out.min()), out.argmin() / SPF
if os.environ.get('DEBUG'):
    raw = hits + bed
    for f in LAND + [BOLT, PLAY]:
        s0 = (f + 1) * SPF; seg = np.abs(raw[:, s0 - 800:s0 + 6000]).max(0); hseg = np.abs(hits[:, s0 - 800:s0 + 6000]).max(0); bseg = np.abs(bed[:, s0 - 800:s0 + 6000]).max(0)
        i = seg.argmax(); print(f, 'raw', round(20 * np.log10(seg.max()), 1), 'at ms', round((i - 800) / 48, 1), 'hit there', round(20 * np.log10(hseg[i] + 1e-9), 1), 'bed there', round(20 * np.log10(bseg[i] + 1e-9), 1))
mix, gr, at = limiter(hits + bed)
print(f'リミッターの最大の削り量 {gr:.1f} dB({at:.0f} コマ付近)')
def save(p, x):
    w = wave.open(p, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1).T * 32767).astype('<i2').tobytes()); w.close()
os.makedirs('out', exist_ok=True)
save('out/hits.wav', hits); save('out/bed.wav', bed); save('out/mix.wav', mix)
m1 = mix.copy(); r = .5 - .5 * np.cos(np.linspace(0, np.pi, 96)); m1[:, :96] *= r; m1[:, -96:] *= r[::-1]; save('out/mix_single.wav', m1)
save('out/mix_x3.wav', np.tile(mix, 3))
json.dump({**{f'land{k + 1}': f for k, f in enumerate(LAND)}, 'bolt': BOLT, 'play': PLAY}, open('cues.json', 'w'))
