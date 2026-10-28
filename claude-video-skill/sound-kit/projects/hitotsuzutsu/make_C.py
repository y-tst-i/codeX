#!/usr/bin/env python3
"""C = ハイブリッド版。合図ごとに Kenney(録音系 CC0)と earshot(コードで描画)を使い分け、音程のある身振り
(チェック・グラフの棒・大チェック・アイコン)は効果音ではなく MIDI の楽器(チェレスタ・ビブラフォン)で音楽の中に置く。
- 紙・布・本の手触り(カード、詳細の着地、タイトル)= Kenney の録音(earshot rank で「紙」に近く、realness も高かった物)
- 長さと頂点を動きに合わせたい通過音 = earshot の swipe(dur / apex で動きの一番速い所に頂点)+ Kenney の紙の擦れを重ねる
- クリック = earshot の fit(CC0 録音をコード化した物)。Kenney の click_002/003 は 7〜12 ms と短すぎ、earshot も「無音」扱い
- 選び方は earshot の点数だけにしない。索引の測定値で絞った: カード = 頂点まで 7〜46 ms・頂点から -20 dB まで 8〜16 ms と短く重心 620〜1030 Hz の紙・本の音
  (bookPlace1/3、bookClose。0.16 s で切って 6 回の連打が重ならない長さに)、通過音 = 長さと頂点を動き(0.6 s easeInOut)に
  合わせられる earshot swipe(Kenney には通過音が無い)、チェック = 2 ms で立ち上がり重心が 3〜6 kHz と高い木の当たり
  (domino。ギター・ベースの帯域と離れ、音程は音楽に任せる)、タイトル = 重心 621 Hz の本を閉じる音を 0.9 倍速・2.6 kHz LP で暗く
- 置き方: 打撃の頂点を「絵のコマ + 1 コマ(33 ms)」に(このスキルの約束、motion-lab §8)。通過音は動きの最速点 + 1 コマ
音楽は score.py の BGM + C だけの MIDI の身振り。
usage: $HOME/earshot_env/bin/python make_C.py      出力: docs/sound-upgrade/work/C/
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402
import score  # noqa: E402
from mixer import Mixer, finish  # noqa: E402

T = C.T
F1 = 1000 / 30           # 1 コマ(ms)
LINE_FAST = 365          # 区切り線が一番速く伸びるコマ(実際の絵を測った。cues.json の title_line f359 は伸び始め)
CARD_PAN = [-0.35, 0.0, 0.35, -0.35, 0.0, 0.35]
CARD_SRC = ["bookPlace3", "bookPlace1", "bookPlace3", "bookPlace1", "bookPlace3", "bookClose"]
CARD_RATE = [1.06, 1.0, 0.97, 1.08, 1.02, 0.96]


def events():
    ev = []
    for i in range(6):
        cue = f"card_land_{i + 1}" if i < 5 else "card_land_6_all"
        ev.append(dict(src="kenney", id=CARD_SRC[i], rate=CARD_RATE[i], cue=cue, t=T(cue), align="peak", offset_ms=F1,
                       bed_db=[6, 4.5, 4, 4, 4.5, 7.5][i], pan=CARD_PAN[i], lp=5500, hp=120, trim_s=0.16,
                       note="カードが枠に収まる: 本・紙を置く録音(速さを少しずつ変えて同じ音の繰り返しを避ける)。最後の1枚は本を閉じる音で少し重く"))
    ev += [
        dict(src="kenney", id="cloth3", cue="hover_select", t=T("hover_select"), align="peak", offset_ms=0, bed_db=1.0, trim_db=-8.0, hp=300, lp=3000,
             trim_s=0.32, note="カードが浮く: 布の擦れをごく弱く"),
        dict(src="earshot", id="fit/click/floss_lid", seed=11, cue="select_click", t=T("select_click"), align="peak", offset_ms=F1,
             bed_db=6.0, note="クリック(CC0 録音をコード化した物)"),
        dict(src="earshot", id="swipe/paper", seed=5, dur=0.7, apex=0.33, cue="expand_mid", t=(T("expand_start") + T("expand_land")) / 2, pic_frame=125,
             align="peak", offset_ms=F1, bed_db=5.0, pan=0.1, hp=180, note="カード → 詳細: 頂点を動きの最速点 + 1 コマ"),
        dict(src="kenney", id="bookFlip2", cue="expand_mid", t=(T("expand_start") + T("expand_land")) / 2 + 0.08, pic_frame=125, align="peak",
             offset_ms=F1, bed_db=1.5, hp=1500, lp=9000, pan=0.15, note="紙のめくれの手触りを薄く重ねる(頂点を 80 ms ずらし、頭を重ねない)"),
        dict(src="kenney", id="bookPlace3", rate=0.92, cue="expand_land", t=T("expand_land"), align="peak", offset_ms=F1, bed_db=6.5,
             lp=2500, trim_s=0.2, note="詳細画面が落ち着く: 紙を置く録音を低く"),
        dict(src="earshot", id="fit/tick/domino", seed=1, cue="step_check_1", t=T("step_check_1"), align="peak", offset_ms=F1, bed_db=6.0, pan=-0.3,
             note="ステップ 1: 木の小さな当たり。音程は音楽のチェレスタが受け持つ"),
        dict(src="earshot", id="fit/tick/domino", seed=2, cue="step_check_2", t=T("step_check_2"), align="peak", offset_ms=F1, bed_db=6.0, pan=0.0,
             note="ステップ 2"),
        dict(src="earshot", id="fit/tick/domino", seed=3, cue="step_check_3", t=T("step_check_3"), align="peak", offset_ms=F1, bed_db=6.0, pan=0.3,
             note="ステップ 3"),
        dict(src="earshot", id="fit/click/floss_lid", seed=12, cue="main_check", t=T("main_check"), align="peak", offset_ms=F1, bed_db=7.0,
             note="大チェック: 押す。音楽は 0.35 s 前から下げ、ビブラフォンの和音が +35 ms で開く"),
        dict(src="kenney", id="bookPlace1", cue="main_check", t=T("main_check") + 0.05, pic_frame=206, align="peak", offset_ms=F1, bed_db=2.5, lp=1800,
             trim_s=0.2, note="大チェックの重さ(紙の置き)を低く、50 ms 後ろに"),
        dict(src="earshot", id="fit/click/floss_lid", seed=13, cue="back_click", t=T("back_click"), align="peak", offset_ms=F1, bed_db=4.0, pan=-0.4,
             note="← 一覧へ"),
        dict(src="earshot", id="swipe/cloth", seed=4, dur=0.6, apex=0.3, cue="shrink_mid", t=(T("shrink_start") + T("shrink_land")) / 2, pic_frame=233,
             align="peak", offset_ms=F1, bed_db=3.5, pan=-0.2, hp=250, note="詳細 → カード(布の通過音、行きと別の素材)"),
        dict(src="kenney", id="cloth3", cue="shrink_mid", t=(T("shrink_start") + T("shrink_land")) / 2 + 0.05, pic_frame=233, align="peak", offset_ms=F1,
             bed_db=0.5, hp=250, lp=4000, pan=-0.25, trim_s=0.35, note="布の録音を薄く重ねる"),
        dict(src="kenney", id="bookPlace1", rate=1.1, cue="shrink_land", t=T("shrink_land"), align="peak", offset_ms=F1, bed_db=0.5,
             lp=3500, pan=-0.1, trim_s=0.16, note="カードが一覧に戻る(66 ms 後に数字が回るので、ごく弱い紙の手触りだけ)"),
        dict(src="kenney", id="switch_005", cue="count_roll", t=T("count_roll"), align="peak", offset_ms=F1, bed_db=3.0, pan=0.5,
             hp=400, trim_s=0.2, note="数字が回る 1(機械的な切り替え)"),
        dict(src="earshot", id="fit/tick/domino", seed=7, cue="count_roll_b", t=T("count_roll") + 0.066, pic_frame=244, align="peak", offset_ms=F1, bed_db=2.0,
             pan=0.5, note="数字が回る 2"),
        dict(src="kenney", id="drop_003", cue="count_lock", t=T("count_lock"), align="peak", offset_ms=F1, bed_db=5.0, pan=0.5, lp=4000,
             note="3 に決まる(短い丸い音)"),
        dict(src="earshot", id="reverse_swell/cymbal", dur=1.3, cue="portal_end", t=T("portal_end"), align="peak", offset_ms=F1, bed_db=5.5,
             lp=9000, note="輪の窓が開ききる: 明るく広いリバースシンバルを弱く。弦のクレッシェンドと二人で上げる"),
        dict(src="earshot", id="knock/wood", pitch="Bb4", cue="bar_today_land", t=T("bar_today_land"), align="peak", offset_ms=F1, bed_db=9.0,
             pan=0.6, note="今日の棒が収まる(木。音程は Bb に合わせる)"),
        dict(src="kenney", id="bookFlip1", cue="title_line", t=LINE_FAST / 30, pic_frame=LINE_FAST, align="peak", offset_ms=F1, bed_db=2.0, trim_db=-8.0, hp=800,
             lp=9000, trim_s=0.75, note="基線が区切り線へ伸びる: 紙をめくる録音(頂点を線が一番速く伸びるコマ f365 + 1 コマに。実際の絵を測った)"),
        dict(src="kenney", id="bookClose", rate=0.9, cue="title_land", t=T("title_land"), align="peak", offset_ms=F1, bed_db=6.0, lp=2600, peak_cap_db=16.0,
             note="タイトル着地: 本を閉じる録音を遅く・暗く(重さ)。音楽の解決と同時"),
        dict(src="earshot", id="fit/pop/mouth_plop", seed=2, cue="icon_pop", t=T("icon_pop"), align="peak", offset_ms=F1, bed_db=4.5, peak_cap_db=14.0, pan=-0.25,
             note="アイコンが弾んで出る(CC0 録音をコード化した丸いポップ)+ チェレスタ 2 音(音楽)"),
    ]
    return ev


SILENT = {
    "cursor_visible": "ほぼ無音の窓(1.95–2.95 s)を守る",
    "hint_step_1": "飾りの輪。主役のチェックの前に気を散らさない",
    "count_grow": "戻りの動きと同時。主役は数の入れ替わり",
    "week_heading_in": "スウェルの頂点と同時",
    "bar_1..bar_today": "効果音は付けない。棒の1本ずつは音楽のチェレスタが受け持つ(頭の打撃を重ねない)",
    "bars_exit": "タイトル前の一拍(ほぼ無音の窓)",
    "title_rise": "着地に音を集める。せり上がりは音楽のピアノの1音(弱く)",
    "tagline_land": "アイコンの出(0.1 s 後)と重なる。2 つの打点を 100 ms で並べない",
    "end_hold": "静止。音楽の余韻だけ",
}


def music_gestures():
    """C だけの MIDI の身振り(効果音の代わりに音程を受け持つ)。チェレスタ(8)とビブラフォン(11)。効果音の頭を奪わないよう +35 ms"""
    d = 0.035
    cel = [(79, T("step_check_1") + F1 / 1000 + d, 0, 52), (82, T("step_check_2") + F1 / 1000 + d, 0, 56), (86, T("step_check_3") + F1 / 1000 + d, 0, 60)]
    bars = ["bar_1", "bar_2", "bar_3", "bar_4", "bar_5", "bar_6", "bar_today"]
    cel += [(p, T(n) + F1 / 1000 + d, 0, 46 + 3 * k) for k, (n, p) in enumerate(zip(bars, [72, 75, 77, 79, 82, 84, 87]))]
    cel += [(87, T("icon_pop") + F1 / 1000 + d, 0, 40), (94, T("icon_pop") + F1 / 1000 + d + 0.11, 0, 34)]
    cel = [(p, s, s + 0.9, v) for p, s, _, v in cel]
    x = score.part(8, cel, tail=2.5)
    x = C.hp(x, 300); x = C.lp(x, 9000)
    x = score.width(x, 1.0)
    x = C.reverb(x, 0.22, rt=1.3, pre=0.012, bright=7000, seed=41)
    x = score.fit_len(x)
    tm = T("main_check") + F1 / 1000 + d
    vib = score.part(11, [(p, tm + 0.012 * i, tm + 1.4, 64) for i, p in enumerate([67, 70, 75, 79])], tail=2.5)
    vib = C.hp(vib, 250); vib = score.width(vib, 1.0)
    vib = C.reverb(vib, 0.25, rt=1.4, pre=0.015, bright=6000, seed=42)
    vib = score.fit_len(vib)
    x = score.level_to(x, 5.0, 6.6, -36.0)
    vib = score.level_to(vib, tm, tm + 1.0, -33.0)
    return x + vib


def main():
    st = score.build()
    extra = music_gestures()
    # 低音の重なりを解く: タイトル着地(本を閉じる録音)の瞬間だけ音楽の 120 Hz 未満を下げる
    music = score.music_bus(st, extra=extra, low_duck_times=[(T("main_check") + F1 / 1000, 0.12, -9.0), (T("title_land") + F1 / 1000, 0.15, -15.0)])
    mx = Mixer(music, room=st["room"])
    for e in events():
        e = dict(e)
        if e.get("trim_s"):
            e["max_s"] = e.pop("trim_s")
        src = e.pop("src")
        if src == "kenney":
            _kenney(mx, e)
        else:
            mx.from_earshot(e)
    finish("C", music, st["room"], mx.bus, mx.log, {"silent": SILENT, "nominal_bed_lufs": round(mx.nominal_bed, 2)})


def _kenney(mx, e):
    """Kenney: 長すぎる尾は max_s で切ってフェード(録音の部屋鳴りや次の音を拾わない)"""
    import numpy as np
    y = C.load_kenney(e["id"])
    if e.get("rate"):
        from scipy.signal import resample
        y = resample(y, int(len(y) / e["rate"]), axis=0)
    if e.get("max_s"):
        n = int(e["max_s"] * C.SR)
        if len(y) > n:
            y = y[:n].copy(); k = min(n // 3, int(0.05 * C.SR)); y[-k:] *= np.linspace(1, 0, k)[:, None]
    pk = np.abs(y).max()
    if pk > 0.98:                       # 元の録音が 0 dBFS を超えている(bookClose / bookPlace)。頂点を -1 dBFS に下げてから使う
        y = y / pk * C.db(-1)
    sync = C.peak_index(y) / C.SR if e.get("align") == "peak" else 0.0
    mx.put(dict(e, sound=e["id"]), y, sync)


if __name__ == "__main__":
    main()
