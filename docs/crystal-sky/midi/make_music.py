#!/usr/bin/env python3
"""「水晶の空」20秒の予告編の曲 — MIDI + FluidSynth(MuseScore General)で2案を作る。
  M1 荘厳: ニ短調 → 小節5からニ長調。ゆったりした長い音価、ホルンとトロンボーン。
  M2 冒険的: ホ短調 → 小節5からト長調(平行調)。低弦の駆ける刻み、トランペットの主題。
96 BPM・4拍子・1小節 2.5 秒 × 8 小節 = 20.000 秒。10.000 秒(小節5の頭)に最大の一撃。
乱数は使わない(残響の IR は seed 固定)。旋律はこのファイルで新しく書いたもの。

usage: python3 make_music.py [M1|M2 ...]   (引数なしで両方)
出力: このフォルダに M1.wav / M2.wav(-14 LUFS)・M1.mp3 / M2.mp3、
      stems/ に打撃(一撃)だけ・下地だけの未調整 WAV(audio_measure.py の --hits/--bed 用)
音量の仕上げは sound-kit/tools/assemble.sh(2回通しの loudnorm)を、黒い20秒の映像と一緒に通して使う。
"""
import os, subprocess, sys, tempfile
import numpy as np
import pretty_midi as pm
import scipy.io.wavfile as wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(HERE, "../../../claude-video-skill/sound-kit/tools"))
sys.path.insert(0, KIT)
import midi_render as M  # noqa: E402

SR = M.SR
BPM = 96
BEAT = 60 / BPM          # 0.625 s
BAR = 4 * BEAT           # 2.5 s
LEN = 20.0
HIT = 10.0               # 小節5の頭

def b(bar, beat=0.0):
    """小節(1始まり)と拍(0始まり)→ 秒"""
    return (bar - 1) * BAR + beat * BEAT

N = pm.note_name_to_number


class Song:
    def __init__(self):
        self.m = pm.PrettyMIDI(initial_tempo=BPM)
        self.parts = {}

    def part(self, name, program, drum=False):
        ins = pm.Instrument(program=program, is_drum=drum, name=name)
        self.parts[name] = ins
        return ins

    def note(self, name, pitch, t0, t1, vel):
        p = N(pitch) if isinstance(pitch, str) else pitch
        self.parts[name].notes.append(pm.Note(velocity=int(vel), pitch=p, start=t0, end=t1))

    def chord(self, name, pitches, t0, t1, vel):
        for p in pitches:
            self.note(name, p, t0, t1, vel)

    def expr(self, name, points, cc=11, step=0.04):
        """CC11(表情)を折れ線で動かす。points=[(秒, 0..127), ...]"""
        ins = self.parts[name]
        for (ta, va), (tb, vb) in zip(points, points[1:]):
            t = ta
            while t < tb:
                v = va + (vb - va) * (t - ta) / (tb - ta)
                ins.control_changes.append(pm.ControlChange(cc, int(round(v)), t))
                t += step
        ins.control_changes.append(pm.ControlChange(cc, int(points[-1][1]), points[-1][0]))

    def volume(self, name, v):
        self.parts[name].control_changes.append(pm.ControlChange(7, v, 0.0))

    def timp_roll(self, pitch, t0, t1, v0, v1, rate=0.0625):
        """ティンパニのロール(細かい連打で強弱を変える)"""
        t, k = t0, 0
        n = int((t1 - t0) / rate)
        while t < t1 - 1e-6:
            v = v0 + (v1 - v0) * (k / max(1, n - 1))
            self.note("timp", pitch, t, t + rate * 1.5, v)
            t += rate; k += 1

    def midi(self, names):
        out = pm.PrettyMIDI(initial_tempo=BPM)
        out.instruments = [self.parts[n] for n in names if n in self.parts]
        return out


# ---------------------------------------------------------------- M1 荘厳
def song_m1():
    s = Song()
    for n, p in [("harp", 46), ("strings", 48), ("lowstr", 48), ("choir", 52), ("horn", 60),
                 ("bone", 57), ("timp", 47), ("celesta", 8)]:
        s.part(n, p)
    s.part("cym", 48, drum=True)   # 48 = オーケストラ・キット(36 大太鼓 / 49 シンバル)
    for n, v in [("harp", 100), ("strings", 96), ("lowstr", 100), ("choir", 88), ("horn", 100),
                 ("bone", 84), ("timp", 118), ("celesta", 72)]:
        s.volume(n, v)
    s.volume("cym", 127)

    # 和音: 1 Dm / 2 B♭(add9) / 3 Gm / 4 Asus4→A / 5 D / 6 G→A / 7-8 D
    # 主題モチーフ(5音): D–A–G–F(短調)→ D–A–G–F#(長調)。上行の5度と下行の順次進行。
    # ハープ: 8分の分散和音(小節1〜4)、終わりは上行のアルペジオ1回
    arp = {1: ["D3", "A3", "D4", "F4", "A4", "F4", "D4", "A3"],
           2: ["Bb2", "F3", "C4", "D4", "F4", "D4", "C4", "F3"],
           3: ["G2", "D3", "G3", "Bb3", "D4", "Bb3", "G3", "D3"],
           4: ["A2", "E3", "A3", "D4", "E4", "C#4", "A3", "E3"]}
    for bar, ns in arp.items():
        for i, p in enumerate(ns):
            vel = 62 + 5 * (bar - 1) + (8 if i == 0 else 0)
            s.note("harp", p, b(bar, i * 0.5), b(bar, i * 0.5) + 1.2, vel)
    for i, p in enumerate(["D3", "A3", "D4", "F#4", "A4", "D5", "F#5", "A5"]):  # 小節7: 上行
        s.note("harp", p, b(7, i * 0.25), b(8, 4), 64 - i * 2)

    # 弦(高): ささやくパッド → 盛り上げ → 主題 → 長い和音
    s.chord("strings", ["A3", "D4", "F4"], b(1), b(2), 80)
    s.chord("strings", ["Bb3", "D4", "F4"], b(2), b(3), 80)
    s.chord("strings", ["Bb3", "D4", "G4"], b(3), b(4), 78)
    s.chord("strings", ["A3", "D4", "E4"], b(4), b(4, 2), 84)
    s.chord("strings", ["A3", "C#4", "E4"], b(4, 2), b(5), 90)
    # 小節5〜6: 主題(長調)をバイオリンの高音で。和音は他に任せ、弦は旋律だけ
    mel = [("D5", 5, 0, 1.5), ("A5", 5, 1.5, 0.5), ("G5", 5, 2, 1), ("F#5", 5, 3, 1),
           ("E5", 6, 0, 2), ("A5", 6, 2, 2), ("F#5", 7, 0, 4)]
    for p, bar, bt, d in mel:
        s.note("strings", p, b(bar, bt), b(bar, bt + d), 112)
    s.chord("strings", ["A4", "D5"], b(7), b(8, 3.2), 92)
    s.note("strings", "D5", b(8), b(8, 3.2), 88)
    s.expr("strings", [(0, 70), (b(3), 84), (b(4, 2.5), 118), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 127), (b(5), 127), (b(7), 110),
                       (b(8), 86), (b(8, 3.4), 40), (LEN, 30)])

    # 低弦: 持続の低音(小節1〜2は控えめ)、小節3〜4は4分の刻み、5〜6は長い根音
    s.note("lowstr", "D2", b(1), b(2), 72)
    s.note("lowstr", "Bb1", b(2), b(3), 74)
    for bar, root in [(3, "G2"), (4, "A2")]:
        for k in range(8):
            s.note("lowstr", root, b(bar, k * 0.5), b(bar, k * 0.5 + 0.42), 70 + 5 * (bar - 3) + (6 if k % 2 == 0 else 0))
    s.chord("lowstr", ["D2", "D3"], b(5), b(6), 112)
    s.chord("lowstr", ["G2", "G3"], b(6), b(6, 2), 104)
    s.chord("lowstr", ["A2", "A3"], b(6, 2), b(7), 106)
    s.chord("lowstr", ["D2", "A2"], b(7), b(8, 3.3), 86)
    s.expr("lowstr", [(0, 72), (b(3), 84), (b(4, 2.5), 120), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 127), (b(5), 127), (b(7), 104),
                      (b(8, 3.4), 40), (LEN, 30)])

    # 合唱「アー」: 遠くの持続 → 最高潮の和音 → 余韻
    s.chord("choir", ["A4", "D5"], b(1), b(3), 66)
    s.chord("choir", ["G4", "D5"], b(3), b(4), 64)
    s.chord("choir", ["A4", "E5"], b(4), b(5), 72)
    s.chord("choir", ["F#4", "A4", "D5"], b(5), b(6), 110)
    s.chord("choir", ["G4", "B4", "D5"], b(6), b(6, 2), 104)
    s.chord("choir", ["A4", "C#5", "E5"], b(6, 2), b(7), 106)
    s.chord("choir", ["F#4", "A4", "D5"], b(7), b(8, 3.4), 92)
    s.expr("choir", [(0, 60), (b(3), 74), (b(4, 2.5), 108), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 124), (b(5), 124), (b(7), 108),
                     (b(8), 84), (b(8, 3.5), 36), (LEN, 26)])

    # ホルン: 小節3〜4でモチーフ(短調)、5〜6で主題を1オクターブ下で重ねる
    for p, bar, bt, d, v in [("D4", 3, 0, 1.5, 78), ("A4", 3, 1.5, 0.5, 82), ("G4", 3, 2, 1, 84), ("F4", 3, 3, 1, 86),
                             ("E4", 4, 0, 2, 92), ("C#4", 4, 2, 2, 96)]:
        s.note("horn", p, b(bar, bt), b(bar, bt + d), v)
    for p, bar, bt, d in [("D4", 5, 0, 1.5), ("A4", 5, 1.5, 0.5), ("G4", 5, 2, 1), ("F#4", 5, 3, 1),
                          ("E4", 6, 0, 2), ("A4", 6, 2, 2)]:
        s.note("horn", p, b(bar, bt), b(bar, bt + d), 112)
    s.chord("horn", ["F#3", "D4"], b(7), b(8, 2), 76)
    s.expr("horn", [(0, 80), (b(3), 80), (b(4, 2.5), 124), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 127), (b(5), 127), (b(7), 96), (b(8, 2), 50), (LEN, 40)])

    # トロンボーン: 最高潮の和音だけ(中低域、旋律とぶつけない)
    s.chord("bone", ["D3", "A3"], b(5), b(5, 3.6), 112)
    s.chord("bone", ["D3", "B3"], b(6), b(6, 1.8), 104)
    s.chord("bone", ["C#3", "A3"], b(6, 2), b(6, 3.8), 106)

    # ティンパニ: 小節2終わりから小さく、小節4の後半でロールを強めて「ためる」、10.000 秒に一撃
    s.note("timp", "D2", b(1), b(1) + 1.5, 40)
    s.timp_roll("A1", b(4, 1), b(4, 3.5), 20, 72)
    s.note("timp", "D2", HIT, HIT + 2.0, 127)
    s.note("timp", "A1", b(6, 2), b(6, 2) + 1.0, 100)
    s.note("timp", "D2", b(7), b(7) + 2.5, 70)

    # 大太鼓+シンバル: 10.000 秒の一撃だけ。直前は弦・合唱・ホルンを少し引いて(CC11)「ためる」
    s.note("cym", 49, HIT, HIT + 2.0, 120)
    s.note("cym", 36, HIT, HIT + 2.0, 127)

    # チェレスタ: 小節2の遠い光(モチーフの予告)、小節7〜8のきらめき
    for p, bt in [("D6", 0), ("A6", 1.5), ("G6", 2), ("F6", 3)]:
        s.note("celesta", p, b(2, bt), b(2, bt) + 1.0, 50)
    for p, bt in [("D6", 2), ("A6", 3.5), ("G6", 4), ("F#6", 5), ("D6", 6)]:
        s.note("celesta", p, b(7, bt), b(7, bt) + 1.6, 52)

    s.hits = ["timp", "cym", "bone"]
    s.fx = dict(rev=3.2, wet=0.34, damp_hz=6500, hp_hz=35)
    return s


# ---------------------------------------------------------------- M2 冒険的
def song_m2():
    s = Song()
    for n, p in [("harp", 46), ("strings", 48), ("lowstr", 48), ("choir", 52), ("horn", 60),
                 ("tpt", 56), ("timp", 47), ("celesta", 8)]:
        s.part(n, p)
    s.part("cym", 48, drum=True)   # 48 = オーケストラ・キット(36 大太鼓 / 49 シンバル)
    for n, v in [("harp", 100), ("strings", 96), ("lowstr", 100), ("choir", 86), ("horn", 100),
                 ("tpt", 80), ("timp", 118), ("celesta", 72)]:
        s.volume(n, v)
    s.volume("cym", 127)

    # 和音: 1 Em / 2 Cmaj7 / 3 Am7 / 4 Dsus4→D(ト長調の属和音)/ 5 G / 6 Em→C→D / 7-8 G
    # 主題モチーフ(5音、付点): E–G–B–A–F#(短調)→ G–B–D–C–A(長調)。3度で駆け上がって順次で降りる。
    # ハープ: 小節1〜2は8分の上下する音型(駆ける気配を最初から)
    pat = {1: ["E3", "B3", "E4", "G4", "B4", "G4", "E4", "B3"],
           2: ["C3", "G3", "B3", "E4", "G4", "E4", "B3", "G3"],
           3: ["A2", "E3", "G3", "C4", "E4", "C4", "G3", "E3"],
           4: ["D3", "A3", "D4", "G4", "A4", "F#4", "D4", "A3"]}
    for bar, ns in pat.items():
        for i, p in enumerate(ns):
            vel = 54 + 6 * (bar - 1) + (8 if i % 4 == 0 else 0)
            s.note("harp", p, b(bar, i * 0.5), b(bar, i * 0.5) + 0.9, vel)
    for i, p in enumerate(["G3", "D4", "G4", "B4", "D5", "G5", "B5", "D6"]):  # 小節7: 上行
        s.note("harp", p, b(7, i * 0.25), b(8, 4), 64 - i * 2)

    # 低弦: 「タ・タタ」の駆ける刻み(小節2の後半から。5〜6 は最も強く)
    roots = {2: "C3", 3: "A2", 4: "D3", 5: "G2", 6: None}
    for bar in (2, 3, 4, 5, 6):
        start_beat = 2 if bar == 2 else 0
        for beat in range(start_beat, 4):
            if bar == 6:
                root = "E2" if beat < 2 else ("C3" if beat == 2 else "D3")
            else:
                root = roots[bar]
            t = b(bar, beat)
            base = 60 + 8 * (bar - 2) if bar < 5 else 108
            acc = 10 if beat in (0, 2) else 0
            s.note("lowstr", root, t, t + 0.28, min(127, base + acc))
            s.note("lowstr", root, t + BEAT * 0.5, t + BEAT * 0.72, base - 8)
            s.note("lowstr", root, t + BEAT * 0.75, t + BEAT * 0.97, base - 6)
    s.note("lowstr", "E2", b(1), b(2, 2), 58)                      # 小節1〜2前半: 持続の低音
    s.chord("lowstr", ["G2", "D3"], b(7), b(8, 3.3), 84)
    s.expr("lowstr", [(0, 74), (b(3), 90), (b(4, 2.5), 122), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 127), (b(5), 127), (b(7), 104),
                      (b(8, 3.4), 40), (LEN, 30)])

    # 弦(高): パッド → 小節5〜6で主題を高音で → 長い和音
    s.chord("strings", ["B3", "E4", "G4"], b(1), b(2), 68)
    s.chord("strings", ["B3", "E4", "G4"], b(2), b(3), 70)
    s.chord("strings", ["C4", "E4", "G4"], b(3), b(4), 80)
    s.chord("strings", ["D4", "G4", "A4"], b(4), b(4, 2), 86)
    s.chord("strings", ["D4", "F#4", "A4"], b(4, 2), b(5), 92)
    mel = [("G5", 5, 0, 0.5), ("B5", 5, 0.5, 0.5), ("D6", 5, 1, 1.5), ("C6", 5, 2.5, 0.5), ("A5", 5, 3, 1),
           ("B5", 6, 0, 1.5), ("A5", 6, 1.5, 0.5), ("G5", 6, 2, 1), ("F#5", 6, 3, 1), ("G5", 7, 0, 4)]
    for p, bar, bt, d in mel:
        s.note("strings", p, b(bar, bt), b(bar, bt + d), 112)
    s.chord("strings", ["B4", "D5"], b(7), b(8, 3.2), 90)
    s.note("strings", "G5", b(8), b(8, 3.2), 84)
    s.expr("strings", [(0, 70), (b(3), 86), (b(4, 2.5), 118), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 127), (b(5), 127), (b(7), 108),
                       (b(8), 84), (b(8, 3.4), 40), (LEN, 30)])

    # 合唱「オー」系の母音を「アー」の音色で: 遠い持続 → 最高潮 → 余韻
    s.chord("choir", ["B4", "E5"], b(1), b(3), 54)
    s.chord("choir", ["C5", "E5"], b(3), b(4), 64)
    s.chord("choir", ["A4", "D5"], b(4), b(5), 74)
    s.chord("choir", ["G4", "B4", "D5"], b(5), b(6), 110)
    s.chord("choir", ["G4", "B4", "E5"], b(6), b(6, 2), 102)
    s.chord("choir", ["G4", "C5", "E5"], b(6, 2), b(6, 3), 104)
    s.chord("choir", ["F#4", "A4", "D5"], b(6, 3), b(7), 106)
    s.chord("choir", ["G4", "B4", "D5"], b(7), b(8, 3.4), 92)
    s.expr("choir", [(0, 60), (b(3), 76), (b(4, 2.5), 108), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 124), (b(5), 124), (b(7), 108),
                     (b(8), 84), (b(8, 3.5), 36), (LEN, 26)])

    # ホルン: 小節3〜4でモチーフ(短調、付点)、5〜6は和音で支える
    for p, bar, bt, d, v in [("E4", 3, 0, 0.5, 80), ("G4", 3, 0.5, 0.5, 82), ("B4", 3, 1, 1.5, 88),
                             ("A4", 3, 2.5, 0.5, 86), ("F#4", 3, 3, 1, 88),
                             ("A4", 4, 0, 2, 94), ("F#4", 4, 2, 1, 96), ("A4", 4, 3, 1, 100)]:
        s.note("horn", p, b(bar, bt), b(bar, bt + d), v)
    s.chord("horn", ["B3", "D4"], b(5), b(6), 106)
    s.chord("horn", ["B3", "E4"], b(6), b(6, 2), 100)
    s.chord("horn", ["C4", "E4"], b(6, 2), b(6, 3), 102)
    s.chord("horn", ["A3", "D4"], b(6, 3), b(7), 104)
    s.chord("horn", ["B3", "D4"], b(7), b(8, 2), 72)
    s.expr("horn", [(0, 80), (b(3), 82), (b(4, 2.5), 124), (b(4, 3.85), 52), (b(4, 3.97), 52), (b(4, 3.99), 127), (b(5), 127), (b(7), 96), (b(8, 2), 50), (LEN, 40)])

    # トランペット: 主題(長調)をバイオリンの1オクターブ下で、小節5〜6だけ
    for p, bar, bt, d in [("G4", 5, 0, 0.5), ("B4", 5, 0.5, 0.5), ("D5", 5, 1, 1.5), ("C5", 5, 2.5, 0.5), ("A4", 5, 3, 1),
                          ("B4", 6, 0, 1.5), ("A4", 6, 1.5, 0.5), ("G4", 6, 2, 1), ("F#4", 6, 3, 1)]:
        s.note("tpt", p, b(bar, bt), b(bar, bt + d) - 0.03, 104)

    # ティンパニ: 小節4後半のロールで「ためる」→ 10.000 秒に一撃 → 小節6後半の8分の連打
    s.timp_roll("D2", b(4, 1), b(4, 3.5), 22, 74)
    s.note("timp", "G2", HIT, HIT + 2.0, 127)
    for k, p in enumerate(["D2", "D2", "D2", "D2"]):
        s.note("timp", p, b(6, 2 + k * 0.5), b(6, 2 + k * 0.5) + 0.4, 86 + 6 * k)
    s.note("timp", "G2", b(7), b(7) + 2.5, 72)

    s.note("cym", 49, HIT, HIT + 2.0, 120)
    s.note("cym", 36, HIT, HIT + 2.0, 127)

    # チェレスタ: 小節2の遠い光、小節7〜8でモチーフ(長調)のこだま
    for p, bt in [("E6", 0), ("G6", 0.5), ("B6", 1)]:
        s.note("celesta", p, b(2, bt), b(2, bt) + 1.0, 48)
    for p, bt in [("G6", 2), ("B6", 2.5), ("D7", 3), ("C7", 4.5), ("A6", 5), ("G6", 6)]:
        s.note("celesta", p, b(7, bt), b(7, bt) + 1.6, 50)

    s.hits = ["timp", "cym", "tpt"]
    s.fx = dict(rev=2.4, wet=0.28, damp_hz=7500, hp_hz=35)
    return s


# ---------------------------------------------------------------- 書き出し
def render(s, names):
    x = M.render(s.midi(names), tail=4.0)
    x = M.scene_fx(x, **s.fx)
    n = int(LEN * SR)
    x = x[:n] if len(x) >= n else np.pad(x, ((0, n - len(x)), (0, 0)))
    # 最後の 0.6 秒だけ、残響の尾を 0 に閉じる(クリック防止。曲そのものは 15 秒からの和音の自然な減衰で終える)
    k = int(0.6 * SR)
    x[-k:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]
    return x


def wav16(path, x):
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


def soft_limit(x, ceil=0.6):
    """短い頂点(一撃の頭)だけを丸め、ラウドネスを -14 に上げた時に真のピークが -1 dBTP を超えないようにする"""
    a = np.abs(x)
    y = np.where(a <= ceil, x, np.sign(x) * (ceil + (1 - ceil) * np.tanh((a - ceil) / (1 - ceil))))
    return y


def finish(name, x, work):
    """sound-kit/tools/assemble.sh(2回通しの loudnorm -14 LUFS)を、黒い20秒の映像と一緒に通し、音だけ取り出す"""
    raw = os.path.join(work, f"{name}_raw.wav")
    x = x / (np.abs(x).max() + 1e-9) * 0.98
    wav16(raw, soft_limit(x))
    scenes = os.path.join(work, "scenes"); os.makedirs(scenes, exist_ok=True)
    if not os.path.exists(os.path.join(scenes, "black.mp4")):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=320x180:r=30:d=20",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", os.path.join(scenes, "black.mp4")], check=True)
    subprocess.run(["bash", os.path.join(KIT, "assemble.sh"), scenes, "black", raw, os.path.join(work, f"{name}.mp4")],
                   check=True, stdout=subprocess.DEVNULL)
    out = os.path.join(HERE, f"{name}.wav")
    # assemble.sh の出力 soundtrack.wav(48 kHz)を 20.000 秒ちょうどに揃えて保存
    # loudnorm 後の残りの差(±0.5 dB 程度)を直線の音量で -14.0 に寄せる(下げる方向なら真のピークも下がる)
    r = subprocess.run(["ffmpeg", "-nostats", "-i", os.path.join(scenes, "soundtrack.wav"), "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    I = float(r[r.rfind("Summary:"):].split("I:")[1].split("LUFS")[0])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(scenes, "soundtrack.wav"),
                    "-af", f"volume={-14.0 - I:.2f}dB,apad=whole_dur=20,atrim=0:20", "-c:a", "pcm_s16le", out], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-c:a", "libmp3lame", "-b:a", "256k",
                    os.path.join(HERE, f"{name}.mp3")], check=True)
    return out


def main():
    which = sys.argv[1:] or ["M1", "M2"]
    work = tempfile.mkdtemp(prefix="crystal_midi_")
    os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)
    for name in which:
        s = {"M1": song_m1, "M2": song_m2}[name]()
        s.midi(list(s.parts)).write(os.path.join(HERE, f"{name}.mid"))
        full = render(s, list(s.parts))
        hits = render(s, s.hits)
        bed = render(s, [n for n in s.parts if n not in s.hits])
        g = 0.98 / (np.abs(full).max() + 1e-9)          # 打撃・下地の stem は全体と同じ倍率で保存(比較用)
        wav16(os.path.join(HERE, "stems", f"{name}_hits.wav"), hits * g)
        wav16(os.path.join(HERE, "stems", f"{name}_bed.wav"), bed * g)
        print(name, "->", finish(name, full, work))


if __name__ == "__main__":
    main()
