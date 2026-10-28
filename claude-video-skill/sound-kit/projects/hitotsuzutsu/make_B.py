#!/usr/bin/env python3
"""B = earshot 版。効果音はすべて earshot の効果音バンク(キット kit_B.json を earshot kit render で描画)。
音楽は新しい BGM(score.py、B と C で共通)。置き方は earshot の launch 型の考え方(ベッドに対する大きさ bed_db、
カットに対する位置 offset_ms、連続の最小間隔 min_gap_ms、山の前のステップダウン)を、この映像に合わせて直した値で使う。
usage: $HOME/earshot_env/bin/python make_B.py      出力: docs/sound-upgrade/work/B/(mix.wav ほか)
合図表(人が読む版): docs/sound-upgrade/CUE_SHEET.md の B
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402
import score  # noqa: E402
from mixer import Mixer, finish  # noqa: E402
from earshot.forge import kit as K  # noqa: E402

KIT_JSON = os.path.join(HERE, "kit_B.json")
KIT_DIR = os.path.join(C.KIT, ".cache", "earshot", "kit_hitotsuzutsu_B")
T = C.T

# 合図表(B)。t = 絵の時刻。role / pitch / take はキットの中の音。trim_db = bed_db からの微調整、pan = 左右
CARD_PAN = [-0.35, 0.0, 0.35, -0.35, 0.0, 0.35]          # カードの列(左・中・右)に合わせる
EVENTS = []
card_t = K.space_run([T(f"card_land_{i}") for i in range(1, 6)] + [T("card_land_6_all")], 100)
for i, t in enumerate(card_t):
    EVENTS.append(dict(cue=f"card_land_{i + 1}" if i < 5 else "card_land_6_all", t=t, role="land.light", take=i,
                       pan=CARD_PAN[i], trim_db=[0, -2, -3, -3, -2, 1.5][i], lp=6000,
                       note="カードが枠に収まる: 紙を指で置く音。最後の1枚だけ少し強く(一覧が揃った)"))
EVENTS += [
    dict(cue="hover_select", t=T("hover_select"), role="whoosh.hover", trim_db=-5.0, note="選ばれたカードが浮く: ごく弱い空気"),
    dict(cue="select_click", t=T("select_click"), role="click", take=0, trim_db=-3.0, note="クリック(ほぼ無音の窓の直後なので 3 dB 控える。v4 は earshot timeline で周りより +36 dB)"),
    dict(cue="expand_mid", t=(T("expand_start") + T("expand_land")) / 2, role="whoosh.short", take=0, pan=0.1, hp=180,
         note="カード → 詳細(0.6 s easeInOut の一番速い所に頂点、+37 ms)"),
    dict(cue="expand_land", t=T("expand_land"), role="land", take=0, lp=3000, note="詳細画面が落ち着く"),
    dict(cue="step_check_1", t=T("step_check_1"), role="pop", pitch="G4", pan=-0.3, note="ステップ 1(Cm9 の G)"),
    dict(cue="step_check_2", t=T("step_check_2"), role="pop", pitch="Bb4", pan=0.0, note="ステップ 2(Bb)"),
    dict(cue="step_check_3", t=T("step_check_3"), role="pop", pitch="D5", pan=0.3, note="ステップ 3(D)"),
    dict(cue="main_check", t=T("main_check"), role="click", take=1, trim_db=1.0, note="大チェック: 押す"),
    dict(cue="main_check", t=T("main_check"), role="click.confirm", pitch="G5", note="大チェック: 確定の音(Eb/G の G)。音楽は 0.35 s 前から下げてある"),
    dict(cue="back_click", t=T("back_click"), role="click", take=2, trim_db=-2.0, pan=-0.4, note="← 一覧へ"),
    dict(cue="shrink_mid", t=(T("shrink_start") + T("shrink_land")) / 2, role="whoosh.short", take=1, trim_db=-2.5, pan=-0.2, hp=180,
         note="詳細 → カード(戻り。行きより弱く)"),
    dict(cue="count_roll", t=T("count_roll"), role="tick", take=0, pan=0.5, note="数字が回る 1"),
    dict(cue="count_roll_b", t=K.space_run([T("count_roll"), T("count_roll") + 0.04], 66)[1], role="tick", take=1, pan=0.5,
         trim_db=-2.0, note="数字が回る 2(66 ms 後)"),
    dict(cue="count_lock", t=T("count_lock"), role="pop", pitch="Eb5", pan=0.5, note="3 に決まって弾む"),
    dict(cue="portal_end", t=T("portal_end"), role="swell", note="輪の窓が開ききる(頂点 +42 ms)。音楽も 0.35 s 前に少し下げる"),
]
bar_names = ["bar_1", "bar_2", "bar_3", "bar_4", "bar_5", "bar_6", "bar_today"]
bar_t = K.space_run([T(n) for n in bar_names], 110)
for k, (n, t, p) in enumerate(zip(bar_names, bar_t, ["C5", "Eb5", "F5", "G5", "Bb5", "C6", "Eb6"])):
    EVENTS.append(dict(cue=n, t=t, role="bell", pitch=p, pan=-0.6 + 0.2 * k, trim_db=[2.0, 1.5, 1.0, 0.5, 0, 0, 0][k], lp=7000,
                       note="棒が左から伸びる(1 本 1 音、上がっていく)"))
EVENTS += [
    dict(cue="bar_today_land", t=T("bar_today_land"), role="bell.accent", pitch="Bb5", pan=0.6, note="今日の棒が収まる(連続の終わりのアクセント)"),
    dict(cue="title_line", t=T("title_line") + 0.12, role="whoosh.line", trim_db=-8.0, note="基線が区切り線へ伸びる(ほぼ無音の窓の中なので弱く。v3 は earshot timeline で周りより +27 dB と突出)"),
    dict(cue="title_land", t=T("title_land"), role="drop", lp=2500, peak_cap_db=16.0, note="タイトル着地: Eb に合わせた柔らかい低い打点 + 音楽の解決"),
    dict(cue="tagline_land", t=T("tagline_land"), role="tock", take=1, trim_db=-7.0, note="ひとことが収まる(0.1 s 後のアイコンが主役なので、ごく弱く)"),
    dict(cue="icon_pop", t=T("icon_pop"), role="pop.icon", pitch="G5", pan=-0.25, peak_cap_db=14.0, note="アイコンが弾んで出る"),
]
SILENT = {
    "cursor_visible": "カーソルの先が見え始めるだけ。ほぼ無音の窓(1.95–2.95 s)を守る",
    "hint_step_1": "次に押す所の薄い輪の脈。飾りで、音を付けると主役(チェック)の前に気が散る",
    "count_grow": "戻り(shrink)の動きと同時で、主役は数の入れ替わり(count_roll)",
    "week_heading_in": "窓のスウェルの頂点と同時。別の音を重ねない",
    "bars_exit": "タイトル前の一拍(ほぼ無音の窓 11.6–12.2 s)。棒が沈むのは音を抜くことで見せる",
    "title_rise": "着地(title_land)に音を集める。せり上がりは音楽のピアノの1音(弱く)で",
    "shrink_land": "カードが戻る(8.067)と数字が回る(8.133)が 66 ms しか離れていない。2 つの打点を重ねず、数字の音(count_roll)に任せる(v1 は両方鳴らし、sync_check で count_roll の立ち上がりが -2.5 dB)",
    "end_hold": "静止。音楽の余韻だけ",
}


def main():
    lock = K.render(KIT_JSON, KIT_DIR, log=print)
    print(lock["summary"])
    st = score.build()
    music = score.music_bus(st) * score.stepdown(T("portal_end") + 0.042, -5.0, 0.4)
    mx = Mixer(music, room=st["room"])
    for ev in EVENTS:
        mx.from_kit(dict(ev), lock, KIT_DIR)
    finish("B", music, st["room"], mx.bus, mx.log, {"kit_summary": lock["summary"], "silent": SILENT,
                                                       "nominal_bed_lufs": round(mx.nominal_bed, 2)})


if __name__ == "__main__":
    main()
