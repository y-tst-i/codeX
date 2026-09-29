"""ISLAND 7 ルール説明 BGM（重低音版）→ bgm_heavy.mp3

字幕を読む邪魔をしないよう、普段はメロディアスなハーフタイム（96BPM, 1小節 = 2.5 秒）。
「何を優先する？」(80.3s) と「FINAL STORM」(110.1s) だけドロップさせる。秒数は index.html と共通。
  python3 gen_bgm_heavy.py
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'audio'))
from dub_lib import *          # noqa: F401,F403
import synth_lib as S

DUR = 125.0
mx = Mix(DUR)
BAR = 2.5; ST = BAR / 16; HB = BAR / 2
A, F_, C_, G = 33, 29, 36, 31
PROG = [A, F_, C_, G]
CH = {A: (57, 60, 64), F_: (53, 57, 60), C_: (55, 60, 64), G: (55, 59, 62)}
THEME = [(0, 76), (1.0, 81), (2.0, 83), (2.5, 84), (3.5, 83), (4.0, 79), (5.0, 76)]

def K(t, v=1.0): mx.put('drums', t, kick(), v, drev=.05); mx.duck(t, .8)
def SN(t, v=1.0): mx.put('drums', t, snare(), v, drev=.4, rev=.1); mx.duck(t, .35, kick_=False)
def HH(t, v=.3, o=False, pan=.2): mx.put('drums', t, hat(o), v, pan=pan, drev=.1)
def IMP(t, v=1.0): mx.put('fx', t, impact(3.0), v, rev=.25); mx.put('fx', t, crash(3.0), .5 * v, rev=.3); mx.duck(t, .9)
def CHAP(t, v=.6): IMP(t, v); mx.put('fx', t - .7, noise_riser(.7, 800, 8000), .35)

def section(t0, t1, drums=0.0, hats=0.0, pad=.35, pl=0.0, subv=.55, fc=2000, reese=0.0):
    nb = int(round((t1 - t0) / BAR))
    for b in range(nb):
        x = t0 + b * BAR; root = PROG[b % 4]
        if pad: mx.put('music', x, supersaw(CH[root], BAR + .05, fc=fc, a=.08, r=.2), pad, rev=.4)
        if subv:
            for k in (0, 1): mx.put('sub', x + k * HB, sub(root, HB * .97, r=.05), subv)
        if reese: mx.put('bass', x, growl(root + 12, BAR, 'reese', .4, None), reese, rev=.05)
        if drums:
            K(x, drums); SN(x + HB, drums * .85); K(x + 11 * ST, drums * .6)
        for k in range(16):
            s = x + k * ST
            if hats and k % 2 == 0: HH(s, hats * (1 if k % 4 == 2 else .6))
            if pl and k % 2 == 0:
                m = CH[root][[0, 2, 1, 2, 0, 1, 2, 1][(k // 2) % 8]] + 12
                mx.put('music', s, pluck(m, .3), pl, pan=(-.3 if k % 4 else .3), rev=.25)
        if hats: HH(x + 14 * ST, hats * .8, o=True, pan=-.2)

def theme(t0, g=.3, oct=0):
    for dt, m in THEME: mx.put('music', t0 + dt * (BAR / 4), S.bell(m + oct, 2.6), g, pan=(-.25 if m % 2 else .25), rev=.5)

def drop(t0, bars, pats, v=1.0):
    for b in range(bars):
        x = t0 + b * BAR; root = PROG[b % 4]
        K(x, 1.05); SN(x + HB, 1.0); K(x + 11 * ST, .75)
        for k in range(0, 16, 2): HH(x + k * ST, .25 if k % 4 == 2 else .15)
        for t, sig, semi, ln in growl_seq(pats[b % len(pats)], x, ST, root):
            mx.put('bass', t, sig, v, rev=.04)
            mx.put('sub', t, sub(root, ln * .98, r=.03), .9)

P1 = [(0, 3, 0, 'fm', 4.8, ('o', 'a')), (3, 1, 12, 'fm', 12.8, ('u', 'e')), (4, 3, 0, 'wob', 6.4, None),
      (10, 2, 7, 'fm', 6.4, ('a', 'o')), (12, 4, 0, 'wob', 0, None, {'ramp': (3.2, 12.8)})]
P2 = [(0, 2, 0, 'yoy', 6.4, ('u', 'a')), (2, 2, 3, 'fm', 9.6, ('o', 'i')), (4, 2, 12, 'fm', 12.8, ('e', 'o')),
      (10, 2, 0, 'fm', 4.8, ('o', 'a')), (12, 4, 0, 'fm', 0, ('u', 'a'), {'ramp': (2, 20), 'glide': -5})]

# ---------------------------------------------------------------- 0–7.5 イントロ
section(0, 7.5, pad=.35, subv=.35, fc=1200)
theme(.4, .35)
IMP(.5, .7); mx.put('bass', .5, growl(A + 12, 3.0, 'reese', .3, None, shape='down'), .8, rev=.2)
mx.put('fx', 4.2, S.bell(88, 2), .2, rev=.5)
mx.put('fx', 5.8, noise_riser(1.7), .45)

# ---------------------------------------------------------------- 7.5–20 MISSION
CHAP(7.5)
section(7.5, 20, drums=.7, hats=.22, pad=.3, subv=.5, fc=1800)
for i in range(4): mx.put('fx', 8.9 + i * .3, S.blip(72 + i * 2), .3, pan=-.4)
for i in range(4): mx.put('fx', 10.3 + i * .3, S.blip(76 + i * 2), .3, pan=.4)
for i in range(7): mx.put('fx', 15.2 + i * .5, S.blip(69 + [0, 2, 3, 5, 7, 8, 12][i], .2), .32)

# ---------------------------------------------------------------- 20–42.5 4つの力
CHAP(20)
section(20, 22.5, pad=.3, subv=.4)
for i in range(4): mx.put('fx', 20.6 + i * .35, S.blip(69 + i * 3, .25), .35)
section(22.5, 42.5, drums=.8, hats=.28, pad=.32, pl=.12, subv=.55, fc=2200, reese=.35)
for i, x in enumerate((22.5, 27.5, 32.5, 37.5)):
    IMP(x, .55); mx.put('bass', x, growl(A + 12 + (0, -4, 3, -2)[i], .5, 'fm', 10, ('o', 'e'), shape='down'), .9, rev=.15)
    mx.put('music', x + .1, S.bell((81, 84, 88, 86)[i], 2.2), .22, rev=.5)

# ---------------------------------------------------------------- 42.5–67.5 行動
CHAP(42.5)
section(42.5, 67.5, drums=.8, hats=.3, pad=.28, pl=.14, subv=.55, fc=2000)
for x in (44.95, 46.45): mx.put('fx', x, S.blip(60, .3), .35)
mx.put('fx', 49.2, S.blip(84, .2), .35)
for k in range(3): mx.put('fx', 49.9 + k * .22, S.blip(79 + k * 3, .12), .3)
IMP(60.3, .6); mx.put('bass', 60.3, growl(A + 12, .7, 'fm', 8, ('o', 'a')), .9, rev=.2)
mx.put('fx', 64.6, S.blip(81, .25), .35)

# ---------------------------------------------------------------- 67.5–75 ブレイク → 75–82.5 ビルド＆ミニドロップ
CHAP(67.5, .7)
section(67.5, 75, pad=.25, subv=.3, fc=900)
for k in range(12): mx.put('fx', 67.5 + k * .625, S.tick(3000 if k % 2 == 0 else 2100), .14)
for i, x in enumerate((69.0, 70.2, 71.4)): mx.put('fx', x, S.blip(64 - i * 3, .25), .4)
IMP(73.0, .8); mx.put('bass', 73.0, growl(A + 11, 1.5, 'fm', 2, ('u', 'a'), shape='down', glide=-3), .9, rev=.25)
section(75, 80, drums=.8, hats=.25, pad=.3, subv=.45, fc=900)
mx.put('fx', 77.8, noise_riser(2.5), .8); mx.put('fx', 77.8, pitch_riser(2.5, 45, 93), .45)
x = 78.8
while x < 80.25:
    SN(x, .3 + (x - 78.8) * .35); x += .3125 if x < 79.4 else .15625 if x < 79.9 else .078
IMP(80.3, 1.1)
drop(80.3, 1, [P1], 1.0)                               # 何を優先する？

# ---------------------------------------------------------------- 82.5–95 情報
CHAP(82.5, .5)
section(82.5, 95, drums=.6, hats=.2, pad=.32, pl=.1, subv=.45, fc=1600)
for k in range(5): mx.put('fx', 87 + k * .6, S.blip(84 + k * 2, .3), .3)
IMP(91.2, .75); theme(91.4, .25, 12)

# ---------------------------------------------------------------- 95–105 チーム
CHAP(95)
section(95, 105, drums=.85, hats=.3, pad=.3, pl=.14, subv=.55, fc=2400, reese=.3)
for i, x in enumerate((95.6, 96.6, 97.6, 98.6)): mx.put('fx', x, S.blip(72 + i * 3, .2), .38, pan=(-.5, .5, -.2, .2)[i])
IMP(100.5, .6); mx.put('music', 100.5, S.bell(84, 2.5), .3, rev=.5); mx.put('music', 100.62, S.bell(88, 2.5), .25, rev=.5)

# ---------------------------------------------------------------- 105–110 ビルド → 110.1 FINAL STORM ドロップ
CHAP(105, .6)
section(105, 110, hats=.25, pad=.3, subv=.4, fc=1000)
for i in range(6):
    x = 105.1 + i * .8
    mx.put('drums', x, tom(45 + i * 2), .7, drev=.3); SN(x, .3 + i * .08); K(x, .6 + i * .06)
mx.put('fx', 107.6, noise_riser(2.45), .9); mx.put('fx', 107.6, pitch_riser(2.45, 40, 96), .5)
x = 108.8
while x < 110.05:
    SN(x, .3 + (x - 108.8) * .4); x += .3125 if x < 109.4 else .15625 if x < 109.8 else .078
IMP(110.1, 1.2)
drop(110.1, 1, [P1], 1.05)
drop(110.1 + BAR, 1, [P2], 1.1)
mx.put('fx', 110.1, S.thunder(), .5, rev=.3)
mx.put('music', 112.4, S.shimmer(.8), .35, rev=.6)

# ---------------------------------------------------------------- 115–120 まとめ → 120 タイトル
mx.put('music', 115.0, supersaw((57, 61, 64, 69), 5.2, fc=1000, a=.8, r=1.0, fc_end=3500), .5, rev=.5)
mx.put('sub', 115.0, sub(A, 5.0, a=.8, r=1.0), .45)
for i, x in enumerate((115.3, 116.1, 116.9, 117.7, 118.5)): mx.put('music', x, S.bell((76, 79, 81, 83, 88)[i], 2.0), .28, rev=.5)
for k in range(8): HH(115 + k * .625, .15)
mx.put('fx', 118.9, noise_riser(1.1), .55); mx.put('fx', 119.2, rev_crash(.8), .5)
IMP(120.0, 1.2)
mx.put('music', 120.0, supersaw((45, 57, 61, 64, 69, 73, 76), 5.0, fc=900, a=.02, r=2.2, fc_end=5000), .7, rev=.55)
mx.put('bass', 120.0, growl(A + 12, 2.0, 'fm', 1.5, ('o', 'a'), shape='down'), .8, rev=.3)
mx.put('sub', 120.0, sub(A, 3.5, r=2.2), .9)
IMP(122.5, .8); mx.put('music', 122.5, S.bell(93, 2.4), .28, rev=.5)

mx.auto['master'] = [(0, 1), (112.3, 1), (112.4, .3), (113.1, .3), (113.2, 1), (114.75, 1), (114.8, 0), (115.0, 0), (115.2, 1),
                     (DUR - 1.5, 1), (DUR, 0)]
mx.render(loud_db=-12.0, bass_gain=2.2, sub_gain=.6)
mx.export(os.path.join(HERE, 'bgm_heavy.mp3'))
