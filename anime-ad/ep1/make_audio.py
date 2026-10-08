"""第1話「レベル1の冒険者」 83秒 — 場面ごとに音の世界を変えた完全合成スコア。
BPM120 (1拍=0.5s)。主人公テーマ(AKIRA)を楽器・調・テンポを変えて全編に登場させる。
"""
import sys
import numpy as np
from instruments import *   # noqa: F401,F403  (mix, kick, ks, flute, ... を使う)
import instruments as I

BEAT = 0.5
mix = I.mix
tt = I.tt
nz = I.nz
rng = I.rng

# 場面の開始(全体秒)
T0, T1, T2, T3, T4, T5, T6, T7, T8 = 0.0, 6.0, 16.0, 26.0, 35.0, 44.0, 56.0, 65.0, 75.0
END = 83.0

NOTE = {"E3": 164.81, "G3": 196.0, "A3": 220.0, "B3": 246.94, "C4": 261.63, "D4": 293.66, "E4": 329.63,
        "F#4": 369.99, "G4": 392.0, "A4": 440.0, "B4": 493.88, "C5": 523.25, "D5": 587.33, "E5": 659.25,
        "G5": 783.99, "A5": 880.0, "B5": 987.77, "D6": 1174.66, "E6": 1318.51}

# 主人公テーマ: (音名, 開始拍, 長さ拍)  — のんきで明るいペンタトニック
AKIRA = [("G4", 0, .5), ("A4", .5, .5), ("B4", 1, 1), ("D5", 2, .5), ("B4", 2.5, .5), ("A4", 3, 1),
         ("G4", 4, .5), ("A4", 4.5, .5), ("B4", 5, .5), ("D5", 5.5, .5), ("E5", 6, 1.5), ("D5", 7.5, .5)]


def theme(T, play, mult=1.0, speed=1.0, gain=1.0, start=0, end=99, **kw):
    for n, b, d in AKIRA:
        tb = b * BEAT * speed
        if start <= tb < end:
            play(T + tb, NOTE[n] * mult, d * BEAT * speed, gain, **kw)


# ---- 楽器ラッパー (time, freq, dur, gain)
def p_ks(t, f, d, g, pan=0.0, send=0.35, decay=0.997):
    mix(t, I.ks(f, max(d, 0.5) + 0.4, decay, 0.4), 0.55 * g, pan, send)


def p_flute(t, f, d, g, pan=0.1, send=0.45):
    mix(t, I.flute(f, d + 0.15, 0.9, slide=0.03), 0.4 * g, pan, send)


def p_marimba(t, f, d, g, pan=0.0, send=0.25):
    mix(t, I.pluck_marimba(f, 1.0, 0.45), 0.5 * g, pan, send)


def p_brass(t, f, d, g, pan=0.0, send=0.3):
    mix(t, I.brass([f / 2, f], d + 0.1, 1.0, att=0.04, rel=0.12), 0.38 * g, pan, send)


def p_bassoon(t, f, d, g, pan=-0.2, send=0.2):
    mix(t, I.lp(I.saw(f / 2, d + 0.05, 10), 3) * np.exp(-tt(d + 0.05) / (d + 0.05)) * 0.9, 0.35 * g, pan, send)


def p_choir(t, f, d, g, send=0.5):
    mix(t, I.choir(f, d + 0.4, 0.8, att=0.15, rel=0.3), 0.6 * g, 0.0, send)


# ---- 追加のSE
def rain(d, lv=1.0):
    return I.hp(nz(d), 4) * lv * (0.7 + 0.3 * np.sin(2 * np.pi * 0.7 * tt(d)))


def thunder(lv=1.0):
    t = tt(2.5)
    return (I.lp(nz(2.5), 60) * np.exp(-t / 0.9) + 0.5 * I.hp(nz(2.5), 5) * np.exp(-t / 0.05)) * lv


def growl(d=0.6, lv=1.0):
    t = tt(d)
    s = I.saw(70, d, 12) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 28 * t)))
    return I.lp(s, 3) * np.sin(np.pi * t / d) * lv


def snore(d=1.2, lv=1.0):
    t = tt(d)
    s = I.lp(I.saw(55, d, 10), 4) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.8 * t)) ** 2
    return s * lv


def creak(d=0.8, f0=180, lv=1.0):
    t = tt(d)
    f = f0 * (1 + 0.4 * np.sin(2 * np.pi * 3 * t) + 0.5 * t / d)
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / I.SR)) * 0.4 + I.bp(nz(d), 300, 1800) * 0.8
    return I.lp(s, 2) * np.sin(np.pi * t / d) ** 0.7 * lv


def cloth(d=1.2, lv=1.0):
    t = tt(d)
    return I.bp(nz(d), 200, 2500) * np.sin(np.pi * t / d) ** 2 * lv


def murmur(d, lv=1.0):
    t = tt(d)
    return I.bp(nz(d), 250, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.9 * t + 1)) * lv


def clink(lv=1.0):
    return I.ping(rng.uniform(2200, 3400), 0.25, lv, 0.05)


def footstep(lv=1.0):
    t = tt(0.12)
    return (np.sin(2 * np.pi * 80 * t) * np.exp(-t / 0.03) + I.lp(nz(0.12), 12) * np.exp(-t / 0.02) * 0.5) * lv


def buzzer(lv=1.0):
    return I.sfx("error.mp3", lv)


def glitch_burst(d=0.08, lv=1.0):
    n = nz(d)
    q = np.round(n * 3) / 3
    return q * np.minimum(1, tt(d) / 0.005) * lv


def drums(t0, t1, level=1.0, hats=True, kick_pat=(0, 2), snare_pat=(1, 3)):
    """BPM120 の基本ビート。1小節=4拍=2秒。"""
    n = int(round((t1 - t0) / BEAT))
    for i in range(n):
        tb = t0 + i * BEAT
        b = i % 4
        if b in kick_pat:
            mix(tb, I.kick(0.9 * level), 0.85)
        if b in snare_pat:
            mix(tb, I.snare(0.8 * level), 0.7, 0.1)
        if hats:
            mix(tb, I.hat(0.45 * level), 0.28, 0.3)
            mix(tb + BEAT / 2, I.hat(0.35 * level), 0.22, -0.3)


# ====================================================================== 場面
def e0():
    """紙芝居の幕開け: 舞台照明のスイッチ、幕の布ずれ、拍子木、筆、琴。"""
    T = T0
    mix(T + 0.5, I.click(1.0, 900), 0.6)                     # 照明ON ぱちっ
    mix(T + 0.5, I.chip_thud(0.8), 0.4)
    mix(T + 0.5, I.sine_sweep(110, 120, 5.5) * 0.04, 1.0)     # ランプの低いうなり
    mix(T + 1.0, cloth(1.6, 1.0), 0.4, pan=-0.5)              # 幕(左)
    mix(T + 1.0, cloth(1.6, 1.0), 0.4, pan=0.5)               # 幕(右)
    for tc in (1.2, 1.8, 2.3):
        mix(T + tc, creak(0.3, 220, 0.5), 0.2, pan=rng.uniform(-.6, .6))
    # CUE-C 2.5 判: 拍子木 カッ・カッ
    for tc in (2.5, 2.6):
        t = tt(0.1)
        mix(T + tc, np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.012) + 0.4 * I.hp(nz(0.1), 2) * np.exp(-t / 0.01), 0.6)
    mix(T + 2.5, I.chip_thud(1.0), 0.6)
    # 琴でテーマ(3.0〜): 筆の運びに合わせる
    theme(T + 3.0, p_ks, 1.0, 1.0, 0.9, end=4.0, pan=-0.2, send=0.5)
    for k, tc in enumerate((3.05, 3.55, 4.05)):               # 筆の擦れ(3画)
        mix(T + tc, I.bp(nz(0.4), 800, 6000) * np.sin(np.pi * tt(0.4) / 0.4) ** 1.5, 0.22, pan=0.2)
    # CUE-E 4.5 ロゴ: きらめき+小さな鐘
    mix(T + 4.5, I.twinkle(1.0, 2637), 0.5, send=0.6)
    mix(T + 4.5, I.bell(659.25, 2.0, 0.8), 0.4, send=0.6)
    mix(T + 4.6, I.ks(329.63, 1.6, 0.998, 0.4), 0.4, send=0.5)


def e1():
    """温かいギルド: ざわめき、ジョッキ、ウクレレ風の弾き語り、扉の鐘、水晶、判子。"""
    T = T1
    mix(T, murmur(10.0, 1.0), 0.18, send=0.2)
    for tc in (0.7, 1.9, 3.1, 5.4, 7.2, 8.6):
        mix(T + tc, clink(0.7), 0.25, pan=rng.uniform(-.8, .8), send=0.3)
    # 弾き語り風の伴奏(G - D - Em - C、2拍ごと)
    chords = [(98.0, [196.0, 246.94, 293.66]), (73.42, [146.83, 185.0, 220.0]),
              (82.41, [164.81, 196.0, 246.94]), (65.41, [130.81, 164.81, 196.0])]
    for i in range(20):
        tb = T + i * BEAT
        root, tones = chords[(i // 4) % 4]
        if i % 2 == 0:
            mix(tb, I.ks(root * 2, 0.6, 0.996, 0.5), 0.35, -0.3, 0.2)
        else:
            for k, f in enumerate(tones):
                mix(tb + k * 0.012, I.ks(f * 2, 0.4, 0.995, 0.5), 0.17, 0.3, 0.25)
    # 軽いパーカッション(カホン風)
    for i in range(20):
        if i % 4 == 0:
            mix(T + i * BEAT, I.tom(120, 0.7, 0.2), 0.45)
        if i % 4 == 2:
            mix(T + i * BEAT, I.hp(nz(0.05), 3) * np.exp(-I.tt(0.05) / 0.012), 0.3)
    # CUE-A 2.0 扉: 軋み+ドアベル
    mix(T + 1.85, creak(0.5, 200, 0.7), 0.4, pan=0.6)
    mix(T + 2.0, I.bell(1568.0, 1.2, 0.8), 0.35, pan=0.5, send=0.4)
    # CUE-B 3.5 着席: カウンターに手をつく
    mix(T + 3.5, I.chip_thud(0.8), 0.45)
    # CUE-C 4.5 水晶: 神秘的なパッド+測定中の素早いブリップ
    mix(T + 4.4, I.pad([E4 if False else 329.63, 493.88, 659.25], 1.8, 0.8, att=0.6, rel=0.5, harm=5), 0.5, send=0.5)
    t, rate = 4.5, 8
    while t < 5.5:
        mix(T + t, I.blip(1500 + 700 * (t - 4.5), 0.6), 0.28, pan=-0.2)
        rate += 1.2
        t += 1.0 / rate
    # CUE-D 5.5 チラつき(2フレーム)→ Lv.1 確定
    mix(T + 5.5, glitch_burst(0.07, 0.6), 0.7)
    mix(T + 5.57, I.ping(1175.0, 0.8, 0.6, 0.3), 0.4, send=0.5)
    mix(T + 5.57, I.ping(1568.0, 0.8, 0.4, 0.3), 0.28, send=0.5)
    # CUE-E 6.0 判子
    mix(T + 6.0, I.chip_thud(1.0), 0.6)
    mix(T + 6.0, I.pluck_marimba(587.0, 1.0), 0.45)
    # 8.2 アキラ一礼: マリンバの「ぽこ」2連
    mix(T + 8.2, I.pluck_marimba(784.0, 1.0), 0.45)
    mix(T + 8.35, I.pluck_marimba(988.0, 1.0), 0.45)
    # CUE-F 9.0 扉
    mix(T + 9.0, I.bell(1568.0, 1.0, 0.7), 0.3, pan=0.5, send=0.4)


def e2():
    """草原: フルートのテーマ+ピチカート+シェイカー。魔物は可笑しい効果音で退場。"""
    T = T2
    # 鳥
    for tc, f in ((0.3, 3000), (0.45, 3300), (1.8, 2900), (1.95, 3200), (6.2, 3100), (6.35, 3400)):
        mix(T + tc, I.sine_sweep(f, f * 1.25, 0.06) * 0.2, 0.15, pan=0.7, send=0.4)
    mix(T, I.bp(nz(10), 300, 2000) * 0.01, 1.0)
    # テーマをフルートで(2周)
    theme(T + 0.0, p_flute, 1.0, 1.0, 1.0)
    theme(T + 4.0, p_flute, 1.0, 1.0, 1.0, end=6.0)
    # ピチカートの低音+シェイカー
    for i in range(20):
        tb = T + i * BEAT
        root = (98.0, 73.42, 82.41, 65.41)[(i // 4) % 4]
        if i % 2 == 0:
            mix(tb, I.ks(root, 0.45, 0.994, 0.5), 0.4, -0.2, 0.15)
        mix(tb, I.hp(nz(0.04), 2) * np.exp(-I.tt(0.04) / 0.01), 0.25, 0.4)
    # CUE-A 2.5 スライム登場 ぽよん
    mix(T + 2.5, I.slide_whistle(300, 700, 0.14), 0.3)
    mix(T + 2.5, I.pluck_marimba(392.0, 1.0, 0.3), 0.45)
    # CUE-B 3.0 くしゃみ → 蒸発
    sn = I.bp(nz(0.18), 900, 3200) * np.exp(-tt(0.18) / 0.05)
    mix(T + 2.95, sn, 1.1)                                   # くしゅんっ(笑いどころなので強め)
    mix(T + 2.97, I.snare(0.5), 0.35)
    mix(T + 3.0, I.hp(nz(0.5), 3) * np.sin(np.pi * tt(0.5) / 0.5) ** 1.2, 0.6)     # ぷしゅっ(蒸気)
    mix(T + 3.05, I.twinkle(0.6, 3136), 0.3, pan=0.3, send=0.4)
    mix(T + 2.97, I.blip(1400, 0.8), 0.4, pan=0.8)                                  # UI 0→1
    # CUE-C 4.5 狼のうなり
    mix(T + 4.5, growl(0.9, 0.8), 0.35, pan=0.5, send=0.2)
    # CUE-D 5.5 つまずき「わっ！」→ 狼が飛ぶ → キラーン
    mix(T + 5.45, I.slide_whistle(600, 250, 0.12), 0.3)
    mix(T + 5.5, I.chip_thud(0.8), 0.4)
    mix(T + 5.6, I.slide_whistle(400, 2400, 0.5), 0.3, pan=0.6)
    mix(T + 6.1, I.twinkle(1.0, 3520), 0.5, pan=0.8, send=0.6)
    mix(T + 5.47, I.blip(1500, 0.8), 0.4, pan=0.8)                                  # UI 1→2
    # CUE-E 7.5 熊: ドスン×3 → ぐるぐる飛ぶ
    for tc in (7.2, 7.35, 7.5):
        mix(T + tc, I.tom(65, 1.0, 0.3), 0.55 if tc < 7.5 else 0.9)
        mix(T + tc, I.hp(nz(0.04), 2) * np.exp(-I.tt(0.04) / 0.02), 0.2)
    mix(T + 7.97, I.sine_sweep(500, 1800, 0.6) * (0.7 + 0.3 * np.sin(2 * np.pi * 14 * tt(0.6))), 0.25, pan=-0.5)
    mix(T + 8.5, I.twinkle(0.8, 2349), 0.4, pan=-0.6, send=0.6)
    mix(T + 7.97, I.blip(1600, 0.8), 0.4, pan=0.8)                                  # UI 2→3
    # CUE-F 9.0 満足げ: 上昇3音
    for k, f in enumerate((587.0, 740.0, 880.0)):
        mix(T + 9.0 + k * 0.09, I.pluck_marimba(f, 1.0, 0.3), 0.4)


def e3():
    """稲光: 雨と雷鳴、重い弦のうなり、ティンパニと金管、群れの咆哮。F5の静寂とF6の大音。"""
    T = T3
    mix(T, rain(9.0, 0.5), 0.12, send=0.1)
    mix(T, I.pad([41.2, 61.7, 82.41], 9.0, 1.0, att=1.2, rel=1.0, harm=5, trem=0.0), 0.7, send=0.3)
    def lightning(tf, lv=1.0):
        mix(T + tf, I.hp(nz(0.07), 3) * np.exp(-I.tt(0.07) / 0.02), 0.9 * lv)
        mix(T + tf + 0.02, thunder(lv), 0.8 * lv, send=0.3)
    lightning(1.0, 0.7)                                       # F1
    lightning(2.5, 0.9)                                       # F2
    mix(T + 2.5, I.brass([E2 := 82.41, 123.47], 1.4, 1.0, att=0.06, rel=0.8), 0.6, send=0.3)
    mix(T + 2.5, I.taiko(1.0), 0.7)
    lightning(4.0, 1.0)                                       # F3 大群
    for k in range(10):                                       # 地鳴りの連打(クレッシェンド)
        mix(T + 4.0 + k * 0.1, I.tom(60, 0.4 + 0.07 * k, 0.4), 0.4 + 0.04 * k)
    mix(T + 4.0, growl(1.5, 1.0), 0.4, pan=-0.2, send=0.3)
    lightning(5.0, 0.9)                                       # F4 倒れる
    for k, tc in enumerate((5.0, 5.12, 5.28)):
        mix(T + tc, I.chip_thud(1.0), 0.6, pan=-0.5 + 0.5 * k)
        mix(T + tc + 0.05, I.ping(1200 + 200 * k, 0.5, 0.5, 0.15), 0.25, send=0.4)
    lightning(6.0, 0.6)                                       # F5 膝をつく: 他の音を落とす
    for tc in (6.1, 6.6):
        mix(T + tc, I.kick(0.5), 0.5)                         # 弱い心拍
    mix(T + 6.0, I.flute(NOTE["E4"], 1.4, 0.7, slide=0.05), 0.3, send=0.7)
    lightning(7.5, 1.0)                                       # F6 最大
    mix(T + 7.5, I.choir(220, 1.5, 1.0, att=0.2, rel=0.8), 0.6, send=0.6)
    mix(T + 7.5, I.sub_boom(0.8, 1.5, 32), 0.7)
    # 8.6 遠くの小さな白い点(=アキラの接近): ぽつ、と一音だけ
    mix(T + 8.55, I.pluck_marimba(784.0, 1.0, 0.4), 0.3, pan=0.4, send=0.6)


def e4():
    """魔王城の廊下: 足音、松明のパチパチ、いびき、ファゴット風のテーマ(忍び足)。最後に光が溢れる。"""
    T = T4
    mix(T, I.pad([55.0, 82.41], 9.0, 0.8, att=1.0, rel=0.8, harm=5), 0.5, send=0.3)
    for k in range(60):                                       # 松明のパチパチ
        mix(T + rng.uniform(0, 9), I.hp(nz(0.02), 2) * np.exp(-I.tt(0.02) / 0.006), 0.10 + 0.15 * rng.random(), pan=rng.uniform(-1, 1))
    for i in range(17):                                       # 足音(拍ごと)
        mix(T + 0.25 + i * BEAT, footstep(0.5 + 0.1 * (i % 2)), 0.28, pan=0.0)
    # 忍び足テーマ(ファゴット風・ゆっくり・オクターブ下)
    theme(T + 1.0, p_bassoon, 0.5, 1.4, 1.0, end=6.0)
    # CUE-A 3.0 宝物庫の扉 通過: 軋み
    mix(T + 3.0, creak(0.7, 160, 0.8), 0.35, pan=-0.6)
    # CUE-B 4.0 いびき(2匹)+お辞儀のぺこ
    mix(T + 4.0, snore(1.4, 1.0), 0.4, pan=-0.5)
    mix(T + 4.2, snore(1.4, 1.0) * 0.8, 0.35, pan=0.5)
    mix(T + 4.8, I.pluck_marimba(660.0, 1.0, 0.3), 0.35)
    mix(T + 4.95, I.pluck_marimba(520.0, 1.0, 0.3), 0.35)
    # CUE-C 5.5 牢獄の扉がガタガタ
    for k in range(10):
        mix(T + 5.5 + k * 0.05, I.ping(rng.uniform(500, 900), 0.2, 0.5, 0.05), 0.2, pan=0.6)
    mix(T + 5.5, I.tom(70, 0.8, 0.4), 0.3)
    # CUE-D 6.5 魔王の間: 不穏な弦のクラスター
    mix(T + 6.5, I.pad([82.41, 87.31, 123.47, 130.81], 2.4, 1.0, att=0.8, rel=0.8, harm=7, trem=7), 0.55, send=0.4)
    mix(T + 6.5, I.taiko(0.8), 0.5)
    # 7.5 アキラ「あ、ここかも」: 小さな明るい2音(落差)
    mix(T + 7.6, I.pluck_marimba(784.0, 1.0, 0.3), 0.4)
    mix(T + 7.75, I.pluck_marimba(988.0, 1.0, 0.3), 0.4)
    # CUE-E 8.2 扉が開き光が溢れる: 軋み+聖歌+ライザー(純白へ)
    mix(T + 8.0, creak(1.0, 130, 0.9), 0.4, send=0.2)
    mix(T + 8.2, I.choir(329.63, 0.9, 1.0, att=0.3, rel=0.2), 0.7, send=0.6)
    mix(T + 8.2, I.choir(493.88, 0.9, 0.7, att=0.3, rel=0.2), 0.6, send=0.6)
    mix(T + 8.2, I.riser(0.8, 1.0), 0.4)


def e5():
    """魔王の間: 白→荘厳。魔王のモチーフ(半音)の金管と太鼓。うっかりの一振りで音が消え、静寂とマリンバだけ。"""
    T = T5
    mix(T, I.choir(165.0, 1.5, 1.0, att=0.3, rel=1.0), 0.6, send=0.6)
    mix(T, I.hp(nz(0.5), 6) * np.sin(np.pi * tt(0.5) / 0.5), 0.2)
    # 太鼓(2拍ごと)+ 魔王モチーフ(E-F-E 半音) 低い金管
    for i in range(0, 14):
        mix(T + 0.5 + i * 2 * BEAT, I.tom(55, 0.7, 0.8), 0.45)
    for tc, f in ((1.0, 82.41), (2.0, 87.31), (3.0, 82.41)):
        mix(T + tc, I.brass([f, f * 1.5], 1.0, 1.0, att=0.08, rel=0.5), 0.5, send=0.35)
    mix(T + 1.0, I.sub_boom(0.7, 1.5, 34), 0.5)                # CUE-A 瞳が光る
    mix(T + 1.0, I.ping(1480.0, 0.8, 0.5, 0.2), 0.2, send=0.6)
    mix(T, I.pad([55.0, 82.41, 98.0], 8.0, 0.8, att=1.0, rel=0.5, harm=6), 0.5, send=0.3)
    # 3.5 アキラ「すみません」: ピチカートの落差
    mix(T + 3.6, I.pluck_marimba(740.0, 1.0, 0.3), 0.35)
    mix(T + 3.9, I.pluck_marimba(660.0, 1.0, 0.3), 0.3)
    # CUE-B 5.5 魔王の高笑い: 悪役の金管ファンファーレ(下降)
    for k, f in enumerate((220.0, 196.0, 174.6, 164.8)):
        mix(T + 5.5 + k * 0.4, I.brass([f / 2, f], 0.55, 1.0, att=0.04, rel=0.2), 0.5, send=0.3)
    mix(T + 5.5, I.sub_boom(1.0, 1.5, 32), 0.7)
    # CUE-C 7.0 手を振り上げる: ティンパニ・ロール+ライザー
    for k in range(16):
        mix(T + 7.0 + k * 0.0625, I.tom(80, 0.4 + 0.04 * k, 0.3), 0.35 + 0.02 * k)
    mix(T + 7.0, I.riser(1.0, 1.0), 0.5)
    # CUE-D 8.0 アキラの手 → 突然の無音(上の音を切る=ここから先は微かな音だけ)
    mix(T + 8.0, I.whoosh(0.6, 0.7), 0.25, pan=0.0, send=0.3)    # ふわっ
    # CUE-E 8.5 空気の揺らぎ: 低いスウェル+ガラスのきらめき(静かに)
    mix(T + 8.5, I.sine_sweep(40, 90, 1.2) * np.sin(np.pi * tt(1.2) / 1.2) * 0.6, 0.6)
    mix(T + 8.5, I.twinkle(0.6, 2093), 0.3, send=0.7)
    for k in range(18):                                       # 光の粒(まばら)
        mix(T + 8.8 + rng.uniform(0, 2.4), I.ping([1568.0, 1760.0, 2093.0, 2349.0][int(rng.integers(0, 4))], 0.8, 0.5, 0.2), 0.08 + 0.1 * rng.random(),
            pan=rng.uniform(-1, 1), send=0.7)
    mix(T + 9.0, I.bp(nz(3.0), 200, 900) * 0.4, 0.06)           # 風
    # 10.0 アキラ「…あれ？ いない」→ ぽよ / 11.0 とぼけたマリンバ2音
    mix(T + 10.3, I.slide_whistle(400, 800, 0.12), 0.25)
    mix(T + 11.0, I.pluck_marimba(784.0, 1.0, 0.4), 0.4, send=0.3)
    mix(T + 11.3, I.pluck_marimba(659.0, 1.0, 0.4), 0.4, send=0.3)


def e6():
    """夕焼け: 弦と尺八とピアノ風アルペジオで、テーマを大らかな長調に。レオンの手でユーモラスな低音。"""
    T = T6
    mix(T, I.pad([E3 := 164.81, 246.94, 329.63], 9.0, 1.0, att=1.5, rel=1.5, harm=8), 0.6, send=0.5)
    # 尺八 → ゆっくりテーマ
    theme(T + 0.5, p_flute, 1.0, 1.8, 1.0, end=9.0)
    # ピアノ風アルペジオ(G・D・Em・C、2拍ごと)
    arp = [(196.0, 247.0, 294.0, 392.0), (147.0, 185.0, 220.0, 294.0), (165.0, 196.0, 247.0, 330.0), (131.0, 165.0, 196.0, 262.0)]
    for i in range(18):
        tones = arp[(i // 4) % 4]
        mix(T + i * BEAT, I.pluck_marimba(tones[i % 4] * 2, 1.0, 0.5), 0.28, 0.2, 0.4)
    # CUE-A 1.5 光の粒
    for k in range(12):
        mix(T + 1.5 + rng.uniform(0, 3.0), I.ping([1568.0, 1976.0, 2349.0][int(rng.integers(0, 3))], 0.7, 0.5, 0.2), 0.08 + 0.1 * rng.random(), pan=rng.uniform(-1, 1), send=0.7)
    # CUE-B 3.0 「あった！」: チャイム+マリンバ上昇
    mix(T + 3.0, I.bell(1175.0, 1.5, 0.8), 0.35, send=0.5)
    for k, f in enumerate((587.0, 740.0, 880.0, 1175.0)):
        mix(T + 3.0 + k * 0.07, I.pluck_marimba(f, 1.0, 0.3), 0.35)
    # CUE-C 4.5 摘む: ぽん+きらめき
    mix(T + 4.5, I.pluck_marimba(1047.0, 1.0, 0.3), 0.45)
    mix(T + 4.5, I.twinkle(0.6, 2637), 0.3, send=0.5)
    # CUE-D 5.0 レオン: 瓦礫の崩れる音 + ユーモラスな低い金管(ぶー) → 弦が高まる
    mix(T + 5.0, I.hp(nz(0.4), 3) * np.exp(-tt(0.4) / 0.12), 0.35, pan=-0.5)
    for k in range(8):
        mix(T + 5.0 + k * 0.05, I.ping(rng.uniform(300, 700), 0.3, 0.5, 0.05), 0.12, pan=-0.5)
    mix(T + 5.4, I.brass([98.0, 147.0], 0.7, 1.0, att=0.1, rel=0.3), 0.45, send=0.3)
    # 6.0〜 クレーン上昇: 合唱が大きく
    mix(T + 6.0, I.choir(329.63, 3.0, 1.0, att=1.2, rel=1.2), 0.65, send=0.6)
    mix(T + 6.0, I.choir(493.88, 3.0, 0.7, att=1.2, rel=1.2), 0.55, send=0.6)
    mix(T + 6.0, I.pad([196.0, 293.66, 392.0, 587.33], 3.4, 1.0, att=1.4, rel=1.4, harm=8), 0.6, send=0.5)


def e7():
    """夜のギルド: 静かな生活音、とぼけたピチカート、水晶HUDのデジタル音、折り返しのグリッチとブザー、ミナの沈黙。"""
    T = T7
    mix(T, I.lp(nz(10.0), 40) * 0.012, 1.0)
    mix(T, murmur(10.0, 0.5), 0.06, send=0.2)
    # とぼけたピチカート(2拍に1つ)
    for i in range(0, 8):
        mix(T + i * BEAT * 2, I.ks((98.0, 82.41, 73.42, 98.0)[i % 4], 0.5, 0.994, 0.5), 0.3, -0.2, 0.2)
    # 1.0 カゴ
    mix(T + 1.0, I.chip_thud(0.7), 0.3)
    mix(T + 1.0, I.pluck_marimba(659.0, 1.0, 0.3), 0.3)
    # CUE-A 3.0 水晶を取り出す: ガラスのチャイム
    mix(T + 3.0, I.bell(1976.0, 1.5, 0.6), 0.3, send=0.5)
    # CUE-B/C 4.0〜6.5 HUDのカウントアップ: 加速するブリップ+上昇するシンセ
    t = 4.0
    while t < 6.5:
        p = (t - 4.0) / 2.5
        rate = 6 + 38 * p ** 1.6
        mix(T + t, I.blip(900 + 2500 * p, 0.7, 0.03), 0.3, pan=-0.2 + 0.4 * p)
        t += 1.0 / rate
    mix(T + 4.0, I.sine_sweep(120, 1800, 2.5, 2.0) * np.linspace(0.1, 0.8, int(I.SR * 2.5)) * 0.35, 0.5, send=0.2)
    mix(T + 4.0, I.pad([82.41, 123.47], 2.6, 0.8, att=1.5, rel=0.1, harm=5, trem=9), 0.5, send=0.3)
    # CUE-D 6.5 折り返し: グリッチ→無音1拍→チャイム+ブザー
    mix(T + 6.5, glitch_burst(0.12, 1.0), 0.6)
    mix(T + 6.5, I.sine_sweep(2400, 60, 0.18) * 0.5, 0.5)
    mix(T + 6.52, buzzer(0.8), 0.4)                          # 警告バナー(Lv.65537が読める約0.5秒はほぼ無音)
    # 7.0 Lv.1 に確定: とぼけたチャイム(ちーん)+低い「ぽよ」
    mix(T + 7.0, I.glitch_burst(0.05, 0.5) if hasattr(I, "glitch_burst") else glitch_burst(0.05, 0.5), 0.3)
    mix(T + 7.02, I.bell(1568.0, 1.6, 0.8), 0.35, send=0.5)
    mix(T + 7.02, I.pluck_marimba(392.0, 1.0, 0.4), 0.35)
    # 7.0〜8.2 ミナ「…表示、直しておきますね。」: 無音に近い(ルームトーンのみ)
    # CUE-E 8.5 アキラの「？」: スライドホイッスル+とぼけたマリンバ
    mix(T + 8.5, I.slide_whistle(420, 980, 0.2), 0.3)
    mix(T + 8.5, I.pluck_marimba(1047.0, 1.0, 0.4), 0.4)
    mix(T + 9.0, I.pluck_marimba(784.0, 1.0, 0.4), 0.35)
    mix(T + 9.25, I.pluck_marimba(659.0, 1.0, 0.4), 0.35)


def e8():
    """次回予告: 元気なバンド。0.5秒ごとのカットにポップ音。タイトルは1文字ずつ上昇音階。0.5秒の無音のあと、ロゴ。"""
    T = T8
    drums(T, T + 6.0, 1.0)
    for i in range(12):
        tb = T + i * BEAT
        root = (98.0, 73.42, 82.41, 65.41)[(i // 4) % 4]
        mix(tb, I.bass(root, 0.25, 1.0), 0.6)
        mix(tb + BEAT / 2, I.bass(root, 0.2, 0.8), 0.5)
        mix(tb, I.guitar(root * 2, 0.2, 0.9, True), 0.35, -0.3)
    # 各カット(0.5秒ごと)のポップ音 0.0〜2.5
    for k in range(6):
        mix(T + k * BEAT, I.sfx("pop.mp3", 0.9), 0.35, pan=-0.5 + 0.2 * k)
    # テーマをブラス+マリンバで
    theme(T + 0.0, p_brass, 1.0, 1.0, 1.0, end=3.0)
    theme(T + 0.0, p_marimba, 2.0, 1.0, 0.8, end=3.0)
    # CUE-A 2.5〜5.0 タイトル1文字ずつ(0.3秒おき・上昇音階)
    for k, f in enumerate((523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1174.66, 1318.51)):
        mix(T + 2.5 + k * 0.3, I.ping(f, 0.5, 0.8, 0.12), 0.35, pan=-0.6 + 0.17 * k, send=0.4)
        mix(T + 2.5 + k * 0.3, I.snare(0.5), 0.35)
    # CUE-B 5.0 フラッシュバック: テープ早送りの擦れ
    mix(T + 5.0, I.whoosh(0.5, 1.0, rev=False), 0.4)
    mix(T + 5.0, I.sine_sweep(300, 2400, 0.5) * 0.15, 0.4)
    # CUE-C 6.0 突然の無音 → 「つづく」小さなマリンバ2音
    mix(T + 6.15, I.pluck_marimba(784.0, 1.0, 0.5), 0.4, send=0.4)
    mix(T + 6.3, I.pluck_marimba(659.0, 1.0, 0.5), 0.4, send=0.4)
    # CUE-D 6.5 ロゴ: 鐘+合唱+ティンパニ
    mix(T + 6.5, I.bell(659.25, 2.0, 1.0), 0.5, send=0.5)
    mix(T + 6.5, I.choir(329.63, 1.4, 1.0, att=0.1, rel=0.6), 0.6, send=0.5)
    mix(T + 6.5, I.taiko(1.0), 0.6)
    mix(T + 6.5, I.crash(0.6, 1.2), 0.35, send=0.3)


def write(L, R, path):
    import wave
    pcm = (np.stack([L, R], axis=1) * 0.89 * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(I.SR); w.writeframes(pcm.tobytes())


def master(out):
    ir, ir2 = I.reverb_ir(2.6), I.reverb_ir(2.6, seed=9)
    n = 1 << int(np.ceil(np.log2(I.N + len(ir))))
    wl = np.fft.irfft(np.fft.rfft(I.WL, n) * np.fft.rfft(ir, n), n)[:I.N]
    wr = np.fft.irfft(np.fft.rfft(I.WR, n) * np.fft.rfft(ir2, n), n)[:I.N]
    L = I.DL + wl * 0.8; R = I.DR + wr * 0.8
    k = int(END * I.SR)
    L, R = L[:k], R[:k]
    pk = max(np.abs(L).max(), np.abs(R).max())
    L, R = L / pk, R / pk
    L, R = np.tanh(L * 1.2) / np.tanh(1.2), np.tanh(R * 1.2) / np.tanh(1.2)
    f0 = int(I.SR * (END - 0.5))
    fade = np.ones(k); fade[f0:] = np.linspace(1, 0, k - f0) ** 1.4
    write(L * fade, R * fade, out)
    print("wrote", out)


if __name__ == "__main__":
    for f in (e0, e1, e2, e3, e4, e5, e6, e7, e8):
        f()
    master(sys.argv[1] if len(sys.argv) > 1 else "soundtrack_raw.wav")
