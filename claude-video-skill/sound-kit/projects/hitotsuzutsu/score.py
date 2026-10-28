"""「ひとつずつ」の新しい BGM(MIDI + FluidSynth + MuseScore General)。B と C で共有する。
A の BGM の監査(docs/sound-upgrade/MIX_NOTES.md)で見えた弱点への対策:
  - A は全編「弦アンサンブル + パッド」の持続音が土台で、場面の楽器は合図に1音ずつ当てる飾り → 拍の推進力が無く、音色の変化が小さい
  - → 場面ごとに「役割の違う楽器」で組み立て直す: 鍵盤(一覧)→ 撥弦の刻み+ベース+シェイカー(詳細)→ 弦の持ち上げ(大チェック・戻り)
       → 弦のクレッシェンド(窓)→ エレピ+軽いキック+ベース(グラフ = 一番動く所)→ 止める(タイトル前の一拍)→ ピアノ+弦+声の解決(タイトル)
  - 和声は Eb メジャー。合図と和音の変わり目をそろえる: 0 Ebmaj9 / 2.5 Abmaj9 / 5.0 Cm9 / 6.875 Eb/G(大チェック)/ 7.5 Abmaj9 /
    8.75 Bbsus4(窓)/ 10.0 Abmaj9(グラフ)/ 11.25 Bb(今日の棒)/ 12.567 Eb add9(タイトル = 解決)
  - 演奏表現: ベロシティと発音時刻を seed 固定で少し揺らす(拍の頭の打点は揺らさない)、ペダル(CC64)、弦の強弱(CC11)
  - 空間: 場面ごとに部屋を変える(common.room_ir: 帯域ごとに減衰の速さが違う尾)。全体に同じ残響をかけない
  - 山の前の「ステップダウン」: 大チェックの 0.35 s 前に音楽を下げ、打点で戻す(earshot の launch 型の考え方。効果音の下でいちいちダッキングしない)
build() -> {stem 名: (N,2)}。値は仕上げ前の素の音量。
"""
import numpy as np
import pretty_midi as pm

from common import BEAT, DUR, M, N, SR, T, add, db, env_points, hp, lp, peq, reverb, shelf, zeros

RNG = np.random.default_rng(20261028)

# 和音(開始, 終了, ベース音, 和音の構成音)
CHORDS = [
    (0.0, 2.5, 39, [58, 62, 65, 67]),          # Ebmaj9   (Eb2 | Bb3 D4 F4 G4)
    (2.5, 5.0, 44, [60, 63, 67, 70]),          # Abmaj9   (Ab2 | C4 Eb4 G4 Bb4)
    (5.0, 6.875, 36, [63, 67, 70, 74]),        # Cm9      (C2  | Eb4 G4 Bb4 D5)
    (6.875, 7.5, 43, [58, 63, 67, 70]),        # Eb/G     (G2  | Bb3 Eb4 G4 Bb4)  大チェック
    (7.5, 8.75, 44, [60, 63, 67, 70]),         # Abmaj9
    (8.75, 10.0, 46, [63, 65, 70, 72]),        # Bbsus4   (Bb2 | Eb4 F4 Bb4 C5)   窓
    (10.0, 11.25, 44, [60, 63, 67, 70]),       # Abmaj9   グラフ
    (11.25, 12.567, 46, [62, 65, 70, 74]),     # Bb       (Bb2 | D4 F4 Bb4 D5)    今日の棒 → 止め
    (12.567, DUR, 39, [55, 58, 65, 67, 75]),   # Eb add9  (Eb2 | G3 Bb3 F4 G4 Eb5) タイトル
]


def chord_at(t):
    for a, b, bass, ch in CHORDS:
        if a <= t < b:
            return bass, ch
    return CHORDS[-1][2], CHORDS[-1][3]


def hum(t, amt=0.008, on_grid=False):
    """発音時刻の揺れ(拍の頭の打点は on_grid=True で揺らさない)"""
    return t if on_grid else max(0.0, t + RNG.uniform(-amt, amt))


def vel(v, amt=6):
    return int(np.clip(v + RNG.integers(-amt, amt + 1), 1, 127))


def part(program, notes, drum=False, ccs=(), tail=3.0, gain=0.8):
    """notes: [(pitch, start, end, vel)] 絶対時刻。ccs: [(番号, 値, 時刻)]。全長 (N,2) を返す(加工前)"""
    m = pm.PrettyMIDI(initial_tempo=96)
    ins = pm.Instrument(program=program, is_drum=drum)
    for p, s, e, v in notes:
        ins.notes.append(pm.Note(velocity=int(v), pitch=int(p), start=float(s), end=float(max(e, s + 0.02))))
    for num, val, t in ccs:
        ins.control_changes.append(pm.ControlChange(number=int(num), value=int(val), time=float(t)))
    m.instruments.append(ins)
    x = M.render(m, tail=tail, sr=SR, gain=gain).astype(np.float64)
    out = zeros(); n = min(N, len(x)); out[:n] = x[:n]
    return out


def gate(x, t0, t1, fin=0.02, fout=0.3):
    """t0..t1 だけ残す(尾は fout 秒で消す)"""
    t = np.arange(N) / SR
    g = np.clip((t - t0) / fin + 1, 0, 1) * np.clip((t1 + fout - t) / fout, 0, 1)
    return x * g[:, None]


def width(x, w):
    m = x.mean(1, keepdims=True); s = x - m
    return m + s * w


def pan(x, p):
    gl, gr = np.cos((p + 1) * np.pi / 4) * np.sqrt(2), np.sin((p + 1) * np.pi / 4) * np.sqrt(2)
    return x * np.array([min(1.2, gl), min(1.2, gr)])


def fit_len(x):
    x = x[:N]
    return np.pad(x, ((0, N - len(x)), (0, 0))) if len(x) < N else x


# ------------------------------------------------------------------ 各場面
def keys_list():
    """S1 一覧(0–3.75): ピアノを柔らかく(低いベロシティ + 高域を落とす = フェルトピアノ寄り)。小さく暖かい部屋。
    カードの着地(0.67–1.27、6 回の連打)の間は和音を伸ばすだけにして刻まない(v1 は 8 分で刻んでいて、カードの音が
    198–1000 Hz で音楽より 8–16 dB 下に埋もれた: qa.py の帯域の重なり)。一覧が揃った拍 2(1.25)から上の旋律が歌い出す。
    1.85–3.0 はカーソルが漂うだけの「ほぼ無音」の窓 → 2.5 の和音もごく弱く"""
    b0, ch0 = chord_at(0.0)
    notes = [(b0, 0.0, 2.3, 42), (b0 + 12, 0.02, 2.3, 30)] + [(p, 0.03 + 0.025 * i, 2.3, 26) for i, p in enumerate(ch0)]
    notes += [(79, 1.25, 1.9, vel(40)), (77, 1.5625, 2.2, vel(34)), (74, 1.875, 2.4, vel(28))]   # G5 F5 D5(揃った後の一言)
    b1, ch1 = chord_at(2.6)
    notes += [(b1, 2.5, 3.8, 20)] + [(p, 2.5 + 0.03 * i, 3.8, 17) for i, p in enumerate(ch1[:3])]
    notes += [(70, 3.125, 3.8, vel(30)), (72, 3.4375, 3.9, vel(32))]       # 選ぶ前のピックアップ
    ccs = [(64, 127, 0.0), (64, 0, 2.45), (64, 127, 2.5), (64, 0, 3.85)]
    x = part(0, notes, ccs=ccs)
    x = lp(x, 3200); x = shelf(x, 250, -2.0, "low"); x = hp(x, 45)
    x = reverb(x, 0.22, rt=0.7, pre=0.008, bright=4000, width=0.8, seed=21)
    return fit_len(x) * db(-3.0)


def detail_band():
    """S2 詳細(3.75–6.875): ナイロンギターの 8 分の刻み + 指弾きベース + シェイカー。乾いた中くらいの部屋(明るめ)。
    大チェックの前 0.35 s は刻みを止める(ステップダウン)"""
    g, b, d = [], [], []
    t = 3.75
    while t < 6.5:
        bass, ch = chord_at(t)
        i = int(round((t - 3.75) / (BEAT / 2)))
        on_beat = i % 2 == 0
        p = ch[[0, 2, 1, 3][i % 4]] - 12 + (12 if i % 8 == 7 else 0)
        g.append((p, hum(t, 0.007, on_beat), t + 0.28, vel(58 if on_beat else 48)))
        if i % 4 == 0:
            g.append((ch[1] - 12, hum(t + 0.012, 0.004), t + 0.5, vel(44)))
        t += BEAT / 2
    for t0 in np.arange(3.75, 6.5, BEAT):               # ベース: 拍ごと、1 拍目と 3 拍目を少し強く
        bass, _ = chord_at(t0)
        k = int(round((t0 - 3.75) / BEAT))
        b.append((bass - 12 if bass > 40 else bass, t0, t0 + BEAT * 0.85, vel(78 if k % 2 == 0 else 64, 4)))
    for t0 in np.arange(5.0, 6.45, BEAT / 4):           # シェイカーは 5.0(ステップ 1)から。拍の頭はチェックの音に空ける
        k = int(round((t0 - 5.0) / (BEAT / 4)))
        if k % 4 == 0:
            continue
        d.append((70, hum(t0, 0.004), t0 + 0.05, vel(44 if k % 2 == 0 else 32, 5)))
    gx = part(24, g, tail=2.0)
    gx = hp(gx, 150); gx = peq(gx, 2800, -1.5, 1.2); gx = pan(gx, -0.22)
    gx = reverb(gx, 0.16, rt=0.6, pre=0.004, bright=8000, width=1.0, seed=22)
    bx = part(33, b, tail=1.0)
    bx = lp(bx, 1800); bx = hp(bx, 38); bx = peq(bx, 110, 1.5, 0.9)
    dx = part(0, d, drum=True, tail=1.0)
    dx = hp(dx, 2500); dx = pan(dx, 0.35)
    dx = reverb(dx, 0.12, rt=0.6, pre=0.004, bright=9000, seed=23)
    return {"guitar": fit_len(gx) * db(-4.0), "bass": fit_len(bx) * db(-6.5), "perc": fit_len(dx) * db(-16.0)}


def strings_arc():
    """S3–S4a(6.875–10.0)+ タイトル: 弦アンサンブル。大チェックで開き(Eb/G)、戻り(Abmaj9)で落ち着き、
    窓(Bbsus4、8.75–9.9)で CC11 のクレッシェンド → 10.0 のグラフで引く。タイトルでもう一度(解決の和音の内声)"""
    n, ccs = [], []
    for a, b_, bass, ch in CHORDS[3:6]:
        n += [(p - 12 if p > 66 else p, a + 0.01 * i, b_ + 0.15, 62) for i, p in enumerate(ch[:3])]
        n.append((bass, a, b_ + 0.15, 58))
    ccs += [(11, 70, 6.80), (11, 96, 7.0), (11, 72, 7.6), (11, 64, 8.7), (11, 86, 9.4), (11, 112, 9.95), (11, 40, 10.25), (11, 0, 10.6)]
    # 止めの窓(11.6–12.2)の下で ppp の持続(完全な無音にしない)
    n += [(58, 11.35, 12.6, 30), (62, 11.35, 12.6, 30)]
    ccs += [(11, 30, 11.3), (11, 22, 12.0)]
    # タイトルの解決(12.567〜): 内声
    n += [(p, 12.567, 15.2, 58) for p in (51, 58, 67)]
    ccs += [(11, 34, 12.5), (11, 92, 12.75), (11, 84, 13.6), (11, 50, 14.6), (11, 30, 15.0)]
    x = part(48, n, ccs=ccs, tail=3.0)
    x = hp(x, 70); x = lp(x, 5500); x = peq(x, 350, -2.0, 1.0)      # 5.5 kHz より上はクリックの帯域に空ける
    x = width(x, 1.25)
    x = reverb(x, 0.30, rt=1.6, pre=0.015, bright=6000, width=1.0, seed=24)
    return fit_len(x) * db(-6.0)


def graph_groove():
    """S4b グラフ(10.0–11.55): エレピ(Rhodes)の 8 分のシンコペーション + 軽いキック/リム + シェイカー + 8 分のベース。
    一番動く所。明るい広めの部屋。11.55(棒が沈む)でぴたりと止め、尾だけ残す"""
    e, k, b = [], [], []
    stop = 11.55
    for t0 in np.arange(10.0, stop, BEAT / 2):
        i = int(round((t0 - 10.0) / (BEAT / 2)))
        bass, ch = chord_at(t0)
        if i in (0, 3, 4, 7):                            # 1 と 2.5 拍目に和音(押し出し)
            for j, p in enumerate(ch):
                if abs(t0 - 11.25) < 0.01:      # 今日の棒の着地(11.25)は効果音に空ける(Bb の和音はベースと弦が受け持つ)
                    continue
                v = 60 if i in (0, 4) else 52
                e.append((p, hum(t0 + 0.006 * j, 0.004, i in (0, 4)), t0 + (0.55 if i in (3, 7) else 0.3), vel(v)))
        b.append((bass - 12 if bass > 40 else bass, t0, t0 + BEAT / 2 - 0.04, vel(80 if i % 2 == 0 else 66, 4)))
    for t0 in np.arange(10.0, stop, BEAT):
        j = int(round((t0 - 10.0) / BEAT))
        k.append((36, t0, t0 + 0.1, vel(54 if j % 2 == 0 else 44, 3)))
        if j % 2 == 1:
            k.append((37, t0, t0 + 0.05, vel(40, 4)))
    for t0 in np.arange(10.0, stop, BEAT / 4):
        q = int(round((t0 - 10.0) / (BEAT / 4)))
        k.append((70, hum(t0, 0.004, q % 4 == 0), t0 + 0.04, vel(50 if q % 2 == 0 else 34, 5)))
    # 今日の棒の着地(11.25 = 拍 18)で Bb に解決しかけ、11.55 で止める(L カット: エレピの尾だけ残す)
    ex = part(4, e, tail=2.5)
    ex = gate(ex, 9.95, stop - 0.02, fout=0.35)
    ex = hp(ex, 120); ex = peq(ex, 900, -1.5, 1.0); ex = width(pan(ex, 0.18), 1.2)
    ex = reverb(ex, 0.26, rt=1.2, pre=0.012, bright=7000, width=1.0, seed=25)
    kx = part(0, k, drum=True, tail=1.0)
    kx = gate(kx, 9.95, stop, fout=0.12)
    kx = hp(kx, 50); kx = lp(kx, 9000)
    kx = reverb(kx, 0.08, rt=0.8, pre=0.006, bright=7000, seed=26)
    bx = part(33, b, tail=1.0)
    bx = gate(bx, 9.95, stop, fout=0.1)
    bx = lp(bx, 1600); bx = hp(bx, 38)
    return {"rhodes": fit_len(ex) * db(-7.0), "drums": fit_len(kx) * db(-10.0), "bass2": fit_len(bx) * db(-7.5)}


def title_resolve():
    """S5 タイトル(12.2–15): 線の向こうから文字がせり上がる所でピアノの1音(ピックアップ)→ 12.567 で Eb add9 に解決。
    ピアノ + 合唱(ごく薄く)+ 低い Eb。長く暗いホール。最後のコマでもかすかに鳴っている(切らない)"""
    t0 = 12.567 + 0.07          # 着地の音(効果音)を先に聞かせ、70 ms 後に和音が開く(同時だと着地の音が 157–396 Hz で 14 dB 埋もれた)
    p = [(70, 12.233, 12.5, 30)]      # せり上がりに 1 音だけ(v5 は 12.40 にもう 1 音あり、着地の立ち上がりが sync_check で 1.5 dB しか無かった)
    p += [(39, t0, 15.3, 58), (46, t0, 15.3, 48)]
    p += [(q, t0 + 0.018 * i, 15.3, v) for i, (q, v) in enumerate([(55, 50), (58, 48), (65, 52), (67, 54), (75, 56)])]
    p += [(79, 13.75, 15.3, 34)]                         # 静止の間に高い G をひとつ(余韻の中で)
    x = part(0, p, ccs=[(64, 127, 12.55), (64, 127, 15.0)], tail=3.5)
    x = lp(x, 6000); x = hp(x, 35)
    x = reverb(x, 0.34, rt=2.6, pre=0.02, bright=4500, width=1.0, seed=27)
    c = part(52, [(q, 12.6, 15.3, 40) for q in (63, 67, 70)], ccs=[(11, 50, 12.5), (11, 80, 13.2), (11, 60, 14.5)], tail=3.0)
    c = hp(c, 220); c = lp(c, 5000); c = width(c, 1.3)
    c = reverb(c, 0.4, rt=2.6, pre=0.02, bright=4500, seed=28)
    return {"keys_title": fit_len(x) * db(-4.5), "choir": fit_len(c) * db(-17.0)}


def room_tone():
    """部屋の空気(合成。ピンクノイズを帯域で絞る)。ほぼ無音の窓でも完全なデジタル無音にしない。仕上げ前 -57 dBFS(仕上げ後はおよそ -45 dBFS。v1 の -46 は仕上げ後 -34 dBFS で大きすぎた)"""
    w = RNG.standard_normal((N, 2))
    f = np.fft.rfftfreq(N, 1 / SR); f[0] = f[1]
    y = np.fft.irfft(np.fft.rfft(w, axis=0) / np.sqrt(f)[:, None], N, axis=0)
    y = hp(lp(y, 2500), 200); y /= np.abs(y).max()
    return y * db(-57) * env_points([(0, -6), (0.5, 0), (14.0, 0), (15.0, -10)])


# 各パートの「鳴っている区間」の RMS(dBFS、仕上げ前)の目標。音量の釣り合いを数値で固定する(描画の揺れに左右されない)
LEVELS = {"keys": (0.0, 1.8, -31.5), "guitar": (3.75, 6.5, -31.0), "bass": (3.75, 6.5, -34.0), "perc": (5.0, 6.45, -43.0),
          "strings": (6.9, 10.0, -31.0), "rhodes": (10.0, 11.5, -30.0), "drums": (10.0, 11.5, -38.0), "bass2": (10.0, 11.5, -36.0),
          "keys_title": (12.6, 14.5, -29.0), "choir": (12.8, 14.5, -43.0)}


def level_to(x, t0, t1, target):
    seg = x[int(t0 * SR):int(t1 * SR)]
    r = 10 * np.log10((seg.mean(1) ** 2).mean() + 1e-20)
    return x * db(target - r)


def build():
    st = {"keys": keys_list()}
    st.update(detail_band())
    st["strings"] = strings_arc()
    st.update(graph_groove())
    st.update(title_resolve())
    # 打楽器的なパート(ベース・キック・エレピ・ギター)は、それぞれの頭を先に抑える(楽器ごとのコンプ)。
    # v2 では仕上げ前の音楽だけで 0 dBFS に届く所が 5.3 / 6.0 / 10.1 s にあり、リミッターが 3.4 dB 削っていた
    for k in ("bass", "bass2", "drums", "rhodes", "guitar"):
        st[k] = peak_comp(st[k], 8.0, 4.0, 0.002, 0.04)
    for k, (a, b, tg) in LEVELS.items():
        st[k] = level_to(st[k], a, b, tg)
    st["room"] = room_tone()
    return st


def stepdown(t_hit, depth_db=-8.0, lead=0.35, back=0.04):
    """山の前のステップダウン: t_hit の lead 秒前から depth まで下げ、打点で戻す (N,1)"""
    return env_points([(0, 0), (t_hit - lead - 0.08, 0), (t_hit - lead, depth_db), (t_hit - 0.005, depth_db), (t_hit + back, 0), (DUR, 0)])


def music_bus(st, extra=None):
    """音楽の束ね: 全体の強弱(場面の弧)+ ステップダウン + 低域の整理。room(環境音)は別に足す"""
    keys = [k for k in st if k != "room"]
    m = sum(st[k] for k in keys)
    if extra is not None:
        m = m + extra
    # 場面の弧: 一覧は控えめ → 詳細で前へ → 戻りで一度引く → グラフが一番前 → 止め → タイトルで開いて余韻
    arc = env_points([(0, -6), (0.6, -2.5), (1.75, -2.5), (1.95, -22), (2.95, -22), (3.6, -2.5), (5.0, -1), (6.4, 0),
                      (7.6, -1.5), (8.7, -2.5), (9.9, 0), (10.0, 0.0), (11.5, 0.0), (11.62, -16), (12.2, -16),
                      (12.5, -1.0), (14.0, -1.5), (15.0, -9)])
    m = m * arc * stepdown(T("main_check") + 1 / 30, -8.0, 0.35)
    m = hp(m, 32, 4)
    return peak_comp(m)


def peak_comp(x, below_peak_db=6.0, ratio=4.0, att=0.003, rel=0.03):
    """音楽バスの頂点だけを抑える圧縮(ピアノやエレピの打鍵の頭、キック)。-14 LUFS と真のピーク -2 dBTP の間は
    12 dB しかないので、頭が尖ったままだと仕上げのリミッターが大きく削る(B の初回で 0 dBFS 超が 2 か所)。
    速い戻り(30 ms)で頭だけを取る: 遅い戻り(150 ms)は持続音まで潰して LRA が 4.7 → 2.3 LU に縮んだ(測定)"""
    from scipy.ndimage import maximum_filter1d
    env = maximum_filter1d(np.abs(x).max(1), int(0.002 * SR))
    thr = env.max() * db(-below_peak_db)
    aa, ar = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    e = np.empty_like(env); v = 0.0
    for i in range(len(env)):
        c = aa if env[i] > v else ar
        v = c * v + (1 - c) * env[i]; e[i] = v
    over = np.maximum(e / thr, 1.0)
    return x * (over ** (1 / ratio - 1))[:, None]
