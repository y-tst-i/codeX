"""ISLAND 7 オープニング BGM（重低音・ダブステップ版）→ bgm_heavy.mp3

映像（index.html）のカット点と同じ秒数で組む。120BPM ハーフタイム、1小節 = 2 秒。
  python3 gen_bgm_heavy.py
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'audio'))
from dub_lib import *          # noqa: F401,F403
import synth_lib as S          # ベル・雷・時計など（オーケストラ版と共通の質感）

DUR = 75.0
mx = Mix(DUR)
BAR, ST = 2.0, .125
A, F_, C_, G = 33, 29, 36, 31                    # A1 F1 C2 G1
PROG = [A, F_, C_, G]
CH = {A: (57, 60, 64), F_: (53, 57, 60), C_: (55, 60, 64), G: (55, 59, 62)}

def K(t, v=1.0, bus='drums'): mx.put(bus, t, kick(), v, drev=.05); mx.duck(t, .85)
def SN(t, v=1.0, bus='drums'): mx.put(bus, t, snare(), v, drev=.35, rev=.08); mx.duck(t, .45, kick_=False)
def HH(t, v=.35, o=False, pan=.25, bus='drums'): mx.put(bus, t, hat(o), v, pan=pan, drev=.1)
def IMP(t, v=1.0, kind='boom', cr=True):
    if kind == 'sweep': t = t - .35
    mx.put('fx', t, hit(kind, 3.0), v, rev=.25)
    if cr: mx.put('fx', t + (.35 if kind == 'sweep' else 0), crash(3.2), .5 * v, rev=.3)
    mx.duck(t + (.35 if kind == 'sweep' else 0), .9)

def halftime(t0, bars, v=1.0, bus='drums', hats=True, extra=True):
    for b in range(bars):
        x = t0 + b * BAR
        K(x, v, bus); SN(x + 1.0, v * .95, bus)
        if extra: K(x + 1.375, v * .75, bus)
        if hats:
            for k in range(16):
                if k % 2 == 0: HH(x + k * ST, (.32 if k % 4 == 2 else .2) * v, pan=.2, bus=bus)
                elif k in (7, 15): HH(x + k * ST, .16 * v, pan=-.25, bus=bus)
            HH(x + 14 * ST, .22 * v, o=True, pan=-.2, bus=bus)

def pads(t0, bars, v=.5, fc=2400, bus='music', start=0):
    for b in range(bars):
        root = PROG[(b + start) % 4]
        mx.put(bus, t0 + b * BAR, supersaw(CH[root], BAR + .05, fc=fc, a=.03, r=.15), v, rev=.35)

def subline(t0, bars, v=.8, start=0):
    for b in range(bars):
        root = PROG[(b + start) % 4]
        for k in (0, 1):   # 2分音符で刻んでサイドチェインを効かせる
            mx.put('sub', t0 + b * BAR + k * 1.0, sub(root, .98, a=.004, r=.05), v)

def drop_bar(t0, root, pat, v=1.0, sub_v=.9):
    for t, sig, semi, ln in growl_seq(pat, t0, ST, root):
        mx.put('bass', t, sig, v, rev=.04)
        mx.put('sub', t, sub(root + (12 if semi >= 12 else 0) if semi in (0, 12) else root, ln * .98, r=.03), sub_v)

# グロウルのフレーズ（step, 長さ, 半音, 種類, LFO Hz, 母音[, 追加]）
P1 = [(0, 3, 0, 'fm', 6, ('o', 'a')), (3, 1, 12, 'fm', 16, ('u', 'e')), (4, 2, 0, 'wob', 8, None),
      (6, 2, 7, 'fm', 4, ('a', 'o')), (10, 2, 0, 'fm', 8, ('o', 'e')), (12, 1, 12, 'yoy', 8, ('u', 'a')),
      (13, 3, 0, 'wob', 0, None, {'ramp': (4, 16)})]
P2 = [(0, 2, 0, 'wob', 4, None), (2, 2, 3, 'fm', 8, ('o', 'i')), (4, 1, 12, 'yoy', 16, ('u', 'a')), (5, 3, 0, 'fm', 6, ('a', 'o')),
      (10, 1, 12, 'fm', 16, ('e', 'o')), (11, 1, 7, 'fm', 16, ('o', 'e')), (12, 4, 0, 'fm', 0, ('u', 'a'), {'ramp': (2, 24), 'glide': -5})]
P3 = [(0, 4, 0, 'fm', 3, ('o', 'a')), (4, 2, 12, 'wob', 8, None), (6, 2, 10, 'fm', 6, ('a', 'e')),
      (10, 2, 0, 'yoy', 4, ('u', 'a')), (12, 2, 3, 'fm', 8, ('o', 'e')), (14, 2, 12, 'wob', 16, None)]

# ============================================================ 0–7.6 コールドオープン
for i, x in enumerate((0.0, 1.0, 2.0)):
    IMP(x, .9, ('slam', 'glitch', 'deep')[i], cr=i == 0)
    mx.put('bass', x, growl(A + 12 + (0, 1, 3)[i], .7, 'fm', 10, ('o', 'a'), shape='down'), .9, rev=.15)
    mx.put('sub', x, sub(A + (0, 1, 3)[i], .7, r=.2), .9)
    mx.put('fx', x, S.thunder(), .6, pan=(-.4, .4, 0)[i], rev=.3)
mx.put('fx', 2.6, rev_crash(1.0), .8, rev=.2); mx.put('fx', 2.6, pitch_riser(1.0, 40, 76), .45)
IMP(3.6, 1.1)
mx.put('bass', 3.6, growl(A + 12, 3.8, 'reese', 0.6, None, shape='down', glide=-3), .8, rev=.25)
mx.put('sub', 3.6, sub(A, 3.8, r=1.5, glide=-5), 1.0)
mx.put('music', 3.6, S.braam(33, 4.0, chord=(0, 7, 12, 15)), .7, rev=.4)
for k in range(19):
    x = 4.4 + k * .5
    mx.put('fx', x, S.tick(3400 if k % 2 == 0 else 2200), .28 if x < 8 else .18, pan=(.15 if k % 2 else -.15), rev=.15)
mx.put('music', 4.4, S.bell(69, 3.5), .35, rev=.5)

# ============================================================ 7.6–14 島へ降下（静）
mx.put('music', 7.6, supersaw((57, 64, 69, 71, 76), 6.6, fc=900, a=1.2, r=1.5, fc_end=2400), .55, rev=.6)
mx.put('sub', 7.6, sub(A, 6.4, a=1.5, r=1.5), .35)
for x, m in ((8.4, 76), (9.4, 81), (10.4, 83), (10.9, 84), (11.9, 83), (12.4, 79), (13.1, 76)):
    mx.put('music', x, S.bell(m), .32, pan=(-.3 if m % 2 else .3), rev=.5)
mx.put('fx', 7.6, noise_riser(1.6, 3000, 400)[::-1] * .4, .4, rev=.3)

# ============================================================ 14–18 警報
for x in (14.0, 14.3): mx.put('fx', x, se('error', 84), .5, rev=.2)
mx.put('sub', 14.0, sub(A, 1.2, r=.8, glide=-7), .8)
mx.put('fx', 14.6, noise_riser(1.4), .55); mx.put('fx', 14.6, pitch_riser(1.4, 45, 69), .35)
K(15.0, .8)
IMP(16.0, 1.0, 'sweep')
mx.put('bass', 16.0, growl(A + 12, 1.9, 'fm', 2, ('u', 'a'), shape='down', glide=-2), .85, rev=.25)
mx.put('sub', 16.0, sub(A, 1.9, r=.6), .9)

# ============================================================ 18–40 ビルド
# 18–22：ローパスで閉じたドラム＋プラック（22 で全開）
halftime(18, 2, .9, bus='intro')
for k in range(32):
    x = 18 + k * ST; root = PROG[int(k / 16) % 4]
    m = CH[root][[0, 2, 1, 2, 0, 1, 2, 1][k % 8]] + 12
    mx.put('intro', x, pluck(m), .28, pan=(-.3 if k % 2 else .3), rev=.15)
mx.lpauto['intro'] = [(0, 20000), (17.9, 20000), (18.0, 500), (21.8, 4500), (22.0, 20000), (75, 20000)]
mx.put('fx', 20.0, noise_riser(2.0, 400, 6000), .35)
# 22–30：フルのハーフタイム＋リース・ベース＋コード
halftime(22, 4, 1.0)
pads(22, 4, .45, fc=2200)
subline(22, 4, .75)
for b in range(4):
    root = PROG[b % 4]
    mx.put('bass', 22 + b * BAR, growl(root + 12, BAR, 'reese', .5, None, shape='cos'), .55, rev=.05)
for x in (23.0, 24.5, 26.0, 27.5):          # 4つの力：グロウルの一撃
    mx.put('bass', x, growl(A + 12, .45, 'fm', 12, ('o', 'e'), shape='down'), .8, rev=.2)
    mx.put('fx', x, crash(.9), .25, rev=.2)
IMP(29.0, .8, 'gong')
# 30–35：動詞モンタージュ（毎秒ショット）
for i, x in enumerate((30.0, 31.0, 32.0, 33.0, 34.0)):
    K(x, 1.0); SN(x + .5, .6)
    v = ('o', 'a'), ('u', 'e'), ('a', 'o'), ('e', 'i'), ('o', 'u')
    mx.put('bass', x, growl(A + 12 + (0, -4, 3, -2, 0)[i], .48, 'fm', 8, v[i]), .9, rev=.12)
    mx.put('sub', x, sub(A + (0, -4, 3, -2, 0)[i], .48, r=.05), .9)
    for k in range(4): HH(x + .5 + k * ST, .2)
    mx.put('music', x, supersaw(CH[PROG[i % 4]], .45, fc=3000, a=.005, r=.1), .35, rev=.3)
    mx.put('fx', x + .05, (se('coin', 84), se('flip'), se('lock', 76), se('chime', 79), se('ping', 88))[i], .45, rev=.15)
# 35–38：DAY 1→6
for i in range(6):
    x = 35 + i * .5
    mx.put('drums', x, tom(45 + i * 2), .7, drev=.3); SN(x, .35 + i * .08); K(x, .6 + i * .05)
    mx.put('fx', x, se('type', 76 + i * 2), .5)
mx.put('music', 35, supersaw((57, 64, 69), 3.0, fc=600, a=.2, r=.1, fc_end=6000), .4, rev=.3)
# 38–40：ライザー
mx.put('fx', 38, noise_riser(2.0), .8); mx.put('fx', 38, pitch_riser(2.0, 45, 93), .5)
x, st = 38.0, .25
while x < 39.9:
    SN(x, .25 + (x - 38) * .3); st = .25 if x < 39 else .125 if x < 39.5 else .0625; x += st
mx.put('fx', 39.0, rev_crash(1.0), .6)

# ============================================================ 40–48 ブレイク
IMP(40.0, 1.0, 'deep', cr=False)
mx.put('sub', 40.0, sub(A - 12 + 12, 2.6, r=1.8, glide=-7), .9)
mx.put('music', 40.0, supersaw((69, 72, 76), 7.8, fc=1200, a=1.0, r=1.0), .22, rev=.6)
for k in range(5):
    t = 40.8 + k * 1.2
    mx.put('sub', t, sub(A, .22, r=.1, glide=-9), .9); mx.put('sub', t + .3, sub(A, .3, r=.15, glide=-9), .7)
for k in range(16): mx.put('fx', 40 + k * .5, S.tick(3000 if k % 2 == 0 else 2000), .12)
for i, x in enumerate((42.5, 43.0, 43.5)): mx.put('fx', x, se('down', 76 - i * 3), .5)
IMP(44.0, .9, 'slam')
mx.put('bass', 44.0, growl(A + 11, 1.2, 'fm', 3, ('u', 'a'), shape='down', glide=-3), .8, rev=.25)
for i, x in enumerate((45.3, 45.7, 46.1, 46.5)): mx.put('fx', x, se('pop', (74, 79, 71, 83)[i]), .45, pan=(-.5, .5, -.2, .2)[i], rev=.1)
K(47.0); SN(47.0, .8); K(47.25, .8)
mx.put('bass', 47.0, growl(A + 12, .6, 'fm', 6, ('o', 'a')), .85, rev=.2)

# ============================================================ 48–51.75 ビルド（DAY 7 へ）
mx.put('fx', 48, noise_riser(3.75, 250, 11000), .95); mx.put('fx', 48, pitch_riser(3.75, 40, 96), .55)
mx.put('music', 48, supersaw((57, 64, 69, 72), 3.75, fc=400, a=.1, r=.05, fc_end=9000), .5)
x = 48.0
while x < 51.72:
    SN(x, .25 + (x - 48) * .2)
    if (x - 48) % .5 < 1e-6 and x < 50: K(x, .6)
    x += .5 if x < 49 else .25 if x < 50 else .125 if x < 51 else .0625
mx.put('bass', 50.0, growl(A + 12, 1.7, 'wob', 0, None, ramp=(2, 32)), .5)

# ============================================================ 52–64 ドロップ（最終台風）
IMP(52.0, 1.15)
for b, (x, root, pat) in enumerate(((52, A, P1), (54, F_, P2))):
    halftime(x, 1, 1.05); drop_bar(x, root, pat, 1.0)
mx.put('fx', 53.5, crash(1.2), .3)
# 56–58 台風の目：無音に近く
mx.put('music', 56.0, S.shimmer(2.0), .5, rev=.6); mx.put('music', 56.0, S.bell(81, 2.2), .3, rev=.6)
mx.put('music', 56.0, supersaw((69, 76, 81), 2.0, fc=1400, a=.3, r=.4), .25, rev=.6)
mx.put('fx', 57.0, rev_crash(1.0), .7); mx.put('fx', 57.2, pitch_riser(.8, 57, 93), .4)
# 58– 再ドロップ（強）
IMP(58.0, 1.2, 'sweep')
halftime(58, 1, 1.1); drop_bar(58, C_, P3, 1.05)
for i, (bt, m) in enumerate(((0, 81), (.75, 79), (1.0, 76), (1.5, 79))):
    mx.put('music', 58 + bt, lead(m, .45 if i < 3 else .5), .35, rev=.3)
# 60 停電：パワーダウン
IMP(60.0, .9, 'glitch', cr=False)
mx.put('bass', 60.0, growl(G + 12, 1.2, 'wob', 8, None, glide=-24), 1.0, rev=.2)
mx.put('sub', 60.0, sub(G, 1.2, glide=-24, r=.2), 1.0)
halftime(60, 1, 1.1, hats=False)
drop_bar(61.25, G, [(0, 2, 0, 'fm', 16, ('o', 'e')), (2, 2, 12, 'yoy', 8, ('u', 'a')), (4, 2, 0, 'wob', 8, None)], 1.05)
# 62–64 フィル：スタッター
K(62.0, 1.1); SN(62.0, .8)
sig = growl(A + 12, 1.95, 'fm', 0, ('o', 'a'), ramp=(4, 32), glide=np.linspace(0, 12, ns(1.95)))
mx.put('bass', 62.0, gate(sig, 62, 8), 1.0)
mx.put('sub', 62.0, sub(A, 1.95, r=.02), .9)
x = 62.0
while x < 63.95:
    SN(x, .35 + (x - 62) * .3); K(x, .7) if (x - 62) % .5 < 1e-6 else None
    x += .25 if x < 63 else .125 if x < 63.5 else .0625

# ============================================================ 64.6– タイトル
IMP(64.6, 1.25); IMP(64.6, .5, 'gong', cr=False)
mx.put('music', 64.6, supersaw((45, 57, 61, 64, 69, 73, 76), 8.5, fc=900, a=.02, r=3.0, fc_end=5200), .75, rev=.55)
mx.put('bass', 64.6, growl(A + 12, 2.2, 'fm', 2, ('o', 'a'), shape='down'), .8, rev=.3)
mx.put('sub', 64.6, sub(A, 4.0, r=2.5), 1.0)
mx.put('music', 64.8, S.shimmer(6.0), .35, rev=.6)
for i, (x, m) in enumerate(((66.0, 81), (66.8, 85), (67.4, 88))):
    mx.put('music', x, S.bell(m, 3.0), .3, pan=(-.3, .3, 0)[i], rev=.5)
for i, x in enumerate((68.5, 69.5, 70.5)):
    K(x, .9 + i * .08); SN(x, .5 + i * .15)
    mx.put('bass', x, growl(A + 12 + (0, 3, 7)[i], .55, 'fm', 8, ('o', 'a')), .7 + i * .1, rev=.2)
    mx.put('sub', x, sub(A + (0, 3, 7)[i], .55), .9)
mx.put('fx', 70.8, rev_crash(.7), .6)
IMP(71.5, 1.15, 'slam')
mx.put('music', 71.5, supersaw((45, 57, 61, 64, 69, 76, 81), 3.4, fc=4000, a=.01, r=2.2), .8, rev=.6)
mx.put('bass', 71.5, growl(A + 12, 1.6, 'fm', 1.5, ('a', 'o'), shape='down'), .8, rev=.35)
mx.put('sub', 71.5, sub(A, 3.0, r=2.0), 1.0)
mx.put('music', 71.5, S.bell(93, 3.0), .3, rev=.6)

# ============================================================ オートメーション・書き出し
mx.auto['master'] = [(0, 1), (17.9, 1), (18.0, .8), (29.9, .8), (30.0, .95), (34.9, .95), (35.0, .85), (39.9, .9), (40.0, 1), (51.70, 1), (51.74, 0), (51.98, 0), (52.0, 1), (55.95, 1), (56.0, .35), (57.9, .35), (58.0, 1),
                     (63.95, 1), (64.0, 0), (64.58, 0), (64.6, 1), (DUR - 1.4, 1), (DUR, 0)]
mx.render(loud_db=-10.0, bass_gain=2.2, sub_gain=.6)
mx.export(os.path.join(HERE, 'bgm_heavy.mp3'))
