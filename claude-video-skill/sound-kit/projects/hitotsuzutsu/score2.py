"""第2ラウンドの BGM(MIDI + FluidSynth + MuseScore General)。「1曲として聞こえる」ことを最優先に作り直した 2 案。
第1ラウンドの BGM(score.py)の問題(docs/sound-upgrade/BGM_AUDIT_ROUND2.md):
  場面ごとに楽器を丸ごと入れ替え、和音の変わり目が小節とずれ、主旋律が無く、BGM ごと -16〜-22 dB 落とす窓が 2 つ、
  立ち上がりの無い区間が最大 2.5 s(拍が途切れる)。
この版の約束(2 案に共通):
  - 調は Eb メジャー。和声は基本 1 小節(2.5 s = 4 拍)に 1 つ、4・5 小節目だけ 3 拍目で属和音へ(窓の開始 8.75 s と今日の棒 11.25 s
    という絵の山に合わせた意図): Eb | Ab | Cm9 | Ab–Bbsus4 | Ab–Bbsus4 | Eb(I | IV | vi | IV–Vsus | IV–Vsus | I、拍 20 で解決)
  - 主旋律 = 4 音のモチーフ(Bb-C-Eb-○、「ひと・つ・ず・つ」)。1, 2, 4, 5 小節で言い換え、タイトルの拍 20 で Eb に着地
  - 拍を刻む層(オスティナート)を全編に置く。静かな所も止めず、音数・音域・強さを下げるだけ(BGM の落ち込みは中央値から -15 dB 以内)
  - 場面の変化は楽器の足し引き・音域・密度・残響で付ける。1 つの部屋(残響)を全体に使い、タイトルだけ響きを足す
  - 効果音との帯域: カードの連打(0.67–1.27)の間はオスティナートを始めない/チェックの拍の頭は打楽器を抜く/
    低い効果音の瞬間は 160 Hz 未満を下げる(common.low_duck、make_round2.py)
plan "warm": 温かいピアノと弦(ピアノのオスティナート + アコースティックベース + 弦 + シェイカー + 弱いキック)
plan "light": 軽い撥弦とマリンバ(ピチカートのオスティナート + マリンバの旋律 + 指弾きベース + エレピ + リム/ハット/キック)
build(plan) -> (stems {名前: (N,2)}, onsets [楽譜の発音時刻])
"""
import numpy as np

import score as S
from common import BEAT, DUR, N, SR, T, db, env_points, hp, lp, peq, reverb

E = BEAT / 2        # 8 分
Q = BEAT            # 4 分
BAR = 4 * BEAT
# 和声: (開始, 終了, ベース, オスティナートの和音の音, 和音のパッド)
H = [
    (0.0, 2.5, 39, [51, 55, 58, 62, 65], [55, 58, 62, 65]),        # Ebmaj9
    (2.5, 5.0, 44, [51, 56, 60, 63, 67], [56, 60, 63, 67]),        # Abmaj7
    (5.0, 7.5, 36, [55, 58, 60, 62, 63], [55, 58, 62, 63]),        # Cm9
    (7.5, 8.75, 44, [51, 56, 60, 63, 67], [56, 60, 63, 67]),       # Abmaj7
    (8.75, 10.0, 34, [53, 58, 60, 63, 65], [53, 58, 63, 65]),      # Bb9sus4(窓: 解決を待つ)
    (10.0, 11.25, 44, [51, 56, 60, 63, 67], [56, 60, 63, 67]),     # Abmaj7(グラフ)
    (11.25, 12.5, 34, [53, 58, 63, 65, 70], [53, 58, 63, 65]),     # Bb sus4(今日の棒 → 止め)。D を避ける: C の身振り(今日の棒の Eb6)と短 9 度でぶつかるため
    (12.5, DUR + 1, 39, [55, 58, 63, 65, 70], [55, 58, 63, 65, 70]),  # Eb add9(タイトル)
]
# モチーフ(開始, [(音, 長さ), ...])。4 音目だけ言い換える
MOTIF = [
    (1.25, [(70, E), (72, E), (75, Q), (74, 2 * Q)]),             # 一覧が揃った拍 2: Bb C Eb D(maj7 の色で開いたまま)
    (3.75, [(70, E), (72, E), (75, Q), (72, 2 * Q)]),             # 選んだ拍 6: Bb C Eb C(Ab の上)
    (7.5, [(70, E), (72, E), (75, Q), (77, 3 * Q)]),              # 戻りの拍 12: Bb C Eb F(窓へ向けて上がる)
    (10.9375, [(70, E / 2), (72, E / 2), (75, E), (77, Q)]),      # 棒が揃った後の拍 17.5: 速く言って F へ(D は身振りの Eb6 と短 9 度になるので避けた)
    (12.1875, [(70, E / 2), (72, E / 2), (75, 4 * Q)]),           # タイトル: 拍 19.5 から上がって、拍 20(12.5)で Eb に着地
]
QUIET = [(1.95, 2.95), (11.6, 12.2)]
HOLES = [T("step_check_1"), T("step_check_2"), T("step_check_3"), T("main_check"), T("expand_land")]
# 伴奏の音数を減らして効果音に空ける所(中域の効果音の頂点の時刻。C の events から)。±THIN 秒にかかるオスティナートの音は弾かない
THIN_AT = [1.30, 7.80, 7.85, 8.17, 8.47, 11.30, 13.17]   # カードが浮く(3.07)の布は C で -8 dB に絞った「ほぼ聞こえない」音なので空けない
THIN = 0.08      # 効果音の静けさの窓(BGM は止めず、密度と音域を下げる)


def chord(t):
    for a, b, bass, ost, pad in H:
        if a <= t < b:
            return bass, ost, pad
    return H[-1][2], H[-1][3], H[-1][4]


def in_quiet(t):
    return any(a <= t < b for a, b in QUIET)


def ostinato(start, stop, vel, patt=(0, 2, 1, 3, 2, 4, 3, 1), shift=0, step=E, quiet_step=Q, quiet_vel=None, top_only_in_quiet=True):
    """和音の音を順にめぐる刻み。静けさの窓では 4 分に間引き、上の 2 音だけ・弱く(止めない)"""
    out = []
    t = start; k = 0
    while t < stop - 1e-6:
        _, ost, _ = chord(t + 1e-4)
        q = in_quiet(t)
        if q:
            p = ost[-1 - (k % 2)] if top_only_in_quiet else ost[patt[k % len(patt)] % len(ost)]
            out.append((p + shift, S.hum(t, 0.004, True), t + quiet_step * 0.9, S.vel(quiet_vel or max(18, vel - 14), 3)))
            t += quiet_step
        else:
            p = ost[patt[k % len(patt)] % len(ost)]
            on_beat = abs((t / Q) - round(t / Q)) < 1e-3
            if all(abs(t - h) > 0.05 for h in HOLES) and all(abs(t - h) > THIN for h in THIN_AT):   # 効果音の瞬間は弾かない
                out.append((p + shift, S.hum(t, 0.006, on_beat), t + step * 1.6, S.vel(vel + (6 if on_beat else 0))))
            t += step
        k += 1
    return out


def motif_notes(shift=0, vel=58):
    out = []
    for start, seq in MOTIF:
        t = start
        for i, (p, d) in enumerate(seq):
            out.append((p + shift, t, t + d * 0.95, S.vel(vel + (6 if i == 2 else 0), 3)))
            t += d
    return out


def bass_line(kind):
    out = []
    t = 0.0
    while t < 12.5 - 1e-6:                         # タイトルは下の長い主音 1 つだけ(同じ Eb2 を重ねて刻まない)
        bass, _, _ = chord(t + 1e-4)
        b = bass if bass < 46 else bass - 12
        q = in_quiet(t)
        if kind == "warm":
            if t < 2.5 or q:                       # 入り・静けさの窓: 4 分で弱く刻む(カードの連打の下でも拍を切らない)
                out.append((b, t, t + Q * 0.9, S.vel(48 if not q else 38, 3))); t += Q; continue
            out.append((b, t, t + Q * 0.9, S.vel(70 if abs(t % (2 * Q)) < 1e-3 else 60, 3)))
            if 10.0 <= t < 11.5 and abs(t % Q) < 1e-3:   # グラフ: 8 分で押す
                out.append((b + 12, t + E, t + E + E * 0.8, S.vel(54, 3)))
            t += Q
        else:                                      # light: 1 拍目・2 拍目の裏・4 拍目(シンコペーション)
            if t < 2.5 or q:
                out.append((b, t, t + Q * 1.8, S.vel(46, 3))); t += 2 * Q; continue
            pos = round(((t % BAR) / E)) % 8
            if pos in (0, 3, 6):
                end = t + E * 1.6
                for h in THIN_AT:                  # 効果音の瞬間にかかる音は手前で切る(伴奏の音数で空ける)
                    if t < h - THIN < end:
                        end = h - THIN
                out.append((b + (12 if pos == 3 else 0), t, max(t + 0.08, end), S.vel(74 if pos == 0 else 62, 3)))
            t += E
    # タイトルの解決: 主音を 1 オクターブ上(Eb3)で拍 20 に置き、低い Eb2 は着地の音(本を閉じる録音、12.60)の後の 8 分裏から。
    # 120 Hz 未満で着地の音と重ねないため(BGM 側の編曲で空ける。C の効果音は変えない)
    out = [(p, s, min(e, 12.48), v) for p, s, e, v in out]     # タイトルの前の音はタイトルで切る(前の和音の低音を残さない)
    if kind == "warm":
        out.append((51, 12.5, 12.9, 44))           # light は Eb3 を置かず、主音はエレピの和音(Eb4)に任せる
    out.append((39, 12.8125, 15.2, 56))
    return [n for n in out if n[1] < 15.0]


def perc(kind):
    """拍をつなぐ打楽器。チェック(拍 8・9・10)と大チェック(拍 11)の拍の頭、静けさの窓、タイトル以降は抜く"""
    out = []
    holes = [T("step_check_1"), T("step_check_2"), T("step_check_3"), T("main_check")]
    def free(t):
        return (not in_quiet(t) and all(abs(t - h) > 0.05 for h in holes) and all(abs(t - h) > THIN for h in THIN_AT)
                and t < 12.4)
    if kind == "warm":
        for t in np.arange(3.75, 11.55, E / 2):           # シェイカー 16 分(弱い)
            k = int(round((t - 3.75) / (E / 2)))
            if free(t):
                out.append((70, S.hum(t, 0.004), t + 0.05, S.vel(44 if k % 2 == 0 else 30, 4)))
        for t in np.arange(7.5, 11.5, Q):                 # キック 1・3 拍目だけ(戻り → グラフ)
            if free(t) and round((t % BAR) / Q) % 2 == 0:
                out.append((36, t, t + 0.1, S.vel(46, 3)))
    else:
        for t in np.arange(2.5, 12.4, Q):                 # リム 2・4 拍目
            if free(t) and round((t % BAR) / Q) % 2 == 1:
                out.append((37, t, t + 0.05, S.vel(46, 4)))
        for t in np.arange(5.0, 11.55, E):                # クローズドハット 8 分の裏だけ
            if free(t) and abs((t / Q) - round(t / Q)) > 1e-3:
                out.append((42, S.hum(t, 0.004), t + 0.04, S.vel(40, 4)))
        for t in np.arange(7.5, 11.5, Q):                 # キック 1・3 拍目
            if free(t) and round((t % BAR) / Q) % 2 == 0:
                out.append((36, t, t + 0.1, S.vel(50, 3)))
    return out


ROOM = dict(rt=1.3, pre=0.012, bright=5500, width=0.6, seed=51)     # 曲全体で 1 つの部屋


def build(plan):
    st, onsets = {}, []
    if plan == "warm":
        # ピアノ: 0–1.25 は和音を伸ばすだけ(カードの連打に空ける)→ 1.25 からオスティナート(Eb3–F4)→ タイトルは 4 分で静かに刻んで終わる
        pn = [(39, 0.0, 2.4, 40)] + [(p, 0.02 + 0.02 * i, 1.4, 34) for i, p in enumerate(H[0][4])]
        pn += ostinato(1.25, 12.5, 44)
        pn += [(p, 12.5 + 0.015 * i, 15.3, 50) for i, p in enumerate(H[7][4])]          # 解決の和音(190 Hz より上で構える)
        pn += ostinato(12.8125, 13.75, 50, patt=(4, 2, 3, 1), shift=12, step=E)        # タイトルの後も 8 分 → 4 分で刻み続けて終わる
        pn += ostinato(13.75, 14.4, 36, patt=(3, 1), shift=12, step=Q)
        ped = []
        for a, b_, *_ in H:                                                            # ペダルは小節(和音)ごとに踏み替える
            ped += [(64, 127, a + 0.01), (64, 0, min(b_, 13.1) - 0.02)]
        ped += [(64, 127, 13.13), (64, 0, 13.73), (64, 127, 13.76)]                     # タイトルでも拍ごとの刻みが聞こえるよう踏み替える
        x = S.part(0, pn, ccs=ped, tail=3.0)
        x = lp(x, 4500); x = hp(x, 70); x = S.width(x, 0.75)
        st["piano"] = x
        mel = S.part(0, motif_notes(shift=0, vel=60), tail=2.0)                         # 旋律: 同じピアノの右手(1 オクターブ上の Bb4–F5)
        st["melody"] = S.width(hp(lp(mel, 6000), 200), 0.6)
        st["bass"] = lp(hp(S.part(32, bass_line("warm"), tail=1.5), 38), 1500)
        # 弦: 3 小節目から薄く入り、窓(8.75–10)で膨らみ、グラフで引き、タイトルで解決の和音を支える
        sn = []
        for a, b_, bass, ost, pad in H[2:]:
            sn += [(p, a, min(b_, 15.0) + 0.1, 56) for p in pad[:3]]
        ccs = [(11, 40, 4.9), (11, 64, 6.0), (11, 52, 7.5), (11, 42, 7.75), (11, 46, 8.4), (11, 96, 9.9), (11, 58, 10.3), (11, 46, 11.6), (11, 40, 12.2), (11, 84, 12.8), (11, 60, 14.5)]
        s_ = S.part(48, sn, ccs=ccs, tail=2.5)
        st["strings"] = S.width(lp(hp(s_, 120), 5000), 0.7)
        st["perc"] = hp(S.part(0, perc("warm"), drum=True, tail=1.0), 60)
        levels = {"piano": (1.3, 11.5, -30.0), "melody": (1.25, 11.5, -36.0), "bass": (2.5, 11.5, -33.0), "strings": (5.0, 14.0, -33.0),
                  "perc": (3.75, 11.5, -41.0)}
        onsets = [n[1] for n in pn] + [n[1] for n in bass_line("warm")] + [n[1] for n in perc("warm")] + [n[1] for n in motif_notes()]
    elif plan == "light":
        # ピチカート: 0 から 4 分で刻み、1.25 から 8 分(G3–F4 + 1 オクターブ上)。左右に少しずつ振る
        pz = ostinato(0.0, 1.25, 40, step=Q, shift=12) + ostinato(1.25, 12.5, 46, shift=12, quiet_step=E)   # 静けさの窓も 8 分のまま、上の 2 音・弱く
        pz += ostinato(12.5, 14.4, 36, patt=(4, 3, 2, 1, 0, 1, 2, 3), shift=12, step=E)
        x = S.part(45, pz, tail=1.5)
        st["pizz"] = S.width(hp(lp(x, 7000), 180), 0.8)
        mel = S.part(12, motif_notes(shift=0, vel=72), tail=1.5)                        # 旋律: マリンバ(Bb4–F5)
        st["melody"] = S.width(hp(mel, 250), 0.6)
        st["bass"] = lp(hp(S.part(33, bass_line("light"), tail=1.0), 38), 1600)
        # エレピ: 小節の頭に和音(弱く)、グラフでは 2 拍目の裏にも、タイトルで解決の和音
        en = []
        for a, b_, bass, ost, pad in H:
            if a >= 12.5:
                en += [(p, a + 0.01 * i, 15.3, 54) for i, p in enumerate(pad)]
                continue
            if abs(a - 7.5) < 1e-6:          # 戻り(7.5–8.75): 頭に短く置いて空ける(戻りの通過音と数字の音に)
                en += [(p, a + 0.008 * i, a + 0.2, 44) for i, p in enumerate(pad)]
                continue
            if abs(a - 11.25) < 1e-6:        # 今日の棒の着地(11.30)に重ねず、次の 8 分裏から
                en += [(p, a + E + 0.008 * i, b_ + 0.03, 44) for i, p in enumerate(pad)]
                continue
            en += [(p, a + 0.008 * i, b_ + 0.03, 40 if a < 5.0 else 46) for i, p in enumerate(pad)]     # 和音は次の和音までつなぐ
            if 10.0 <= a < 11.25:
                en += [(p, a + 1.5 * Q, a + 1.9 * Q, 44) for p in pad]   # 2 拍目の裏の短い和音(今日の棒の着地 11.30 の前に切る)
        e_ = S.part(4, en, tail=2.5)
        st["epiano"] = S.width(lp(hp(e_, 150), 6000), 0.7)
        st["perc"] = hp(S.part(0, perc("light"), drum=True, tail=1.0), 60)
        levels = {"pizz": (0.0, 11.5, -31.0), "melody": (1.25, 11.5, -35.0), "bass": (2.5, 11.5, -33.0), "epiano": (0.0, 14.0, -36.0),
                  "perc": (2.5, 11.5, -39.0)}
        onsets = [n[1] for n in pz] + [n[1] for n in bass_line("light")] + [n[1] for n in perc("light")] + [n[1] for n in motif_notes()] + [n[1] for n in en]
    else:
        raise ValueError(plan)
    for k, (a, b, tg) in levels.items():
        st[k] = S.level_to(S.fit_len(st[k]), a, b, tg)
    for k in ("bass", "perc"):
        st[k] = S.peak_comp(st[k], 8.0, 4.0, 0.002, 0.04)
    return st, sorted(onsets)


def bus(st, low_duck_times=()):
    """1 つの部屋 + 場面の弧(なだらか。静けさの窓も -8 dB まで)+ 大チェックの前の小さなステップダウン + タイトルの響き"""
    dry = sum(st.values())
    m = reverb(dry, 0.22, **ROOM)[:N]
    tit = env_points([(0, -80), (12.3, -80), (12.6, 0), (15, 0)])       # タイトルからだけ、長い響きを足す
    xs = dry * tit
    m = m + (reverb(xs, 0.2, rt=2.4, pre=0.02, bright=4500, width=0.6, seed=52)[:N] - xs)
    arc = env_points([(0, -4), (0.6, -2.5), (1.85, -2.5), (2.05, -5), (2.85, -5), (3.5, -2), (5.0, -0.5), (6.4, 0), (7.6, -1),
                      (8.7, -1.5), (9.9, 0), (11.5, 0.0), (11.65, -6), (12.15, -6), (12.45, 0), (14.0, -0.5), (15.0, -6)])
    m = m * arc * S.stepdown(T("main_check") + 1 / 30, -5.0, 0.3)
    m = hp(m, 32, 4)
    if low_duck_times:
        from common import low_duck
        m = low_duck(m, list(low_duck_times), f=200.0)      # 200 Hz: 新しい BGM はオスティナートの下の音(Eb3 = 156 Hz)まで鳴っている
    return S.peak_comp(m)
