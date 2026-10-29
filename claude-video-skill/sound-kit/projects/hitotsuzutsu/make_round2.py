#!/usr/bin/env python3
"""第2ラウンド: C(併用版)の効果音を**同じ標本のまま**使い、BGM だけを新しい 2 案(score2.py の warm / light)に差し替える。
- 効果音・C の音程の身振り(チェレスタ・ビブラフォン)・部屋の空気は、make_C.py が書いた仕上げ前の層(WORK/C/raw_*.wav)をそのまま使う
- 新しい BGM は、「BGM + 身振り」の統合ラウドネスを C の音楽バス(仕上げ前)と同じに合わせてから混ぜる(効果音と音楽の釣り合いを C と同じに)
- 低い効果音の瞬間(大チェック・タイトル着地)は C と同じく音楽の 160 Hz 未満だけを下げる
- 仕上げは mixer.finish(音楽バスの先のリミッター → -14 LUFS / -2 dBTP)
usage: python make_round2.py      前提: make_C.py を実行済み(WORK/C/raw_*.wav)
出力: WORK/R2_warm/、WORK/R2_light/(mix.wav・stem_*.wav・raw_bgm_only.wav・events.json・master.json・onsets.json)
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402
import score2  # noqa: E402
from mixer import finish  # noqa: E402
import qa  # noqa: E402

F1 = 1 / 30
# 低い効果音の瞬間に音楽の 160 Hz 未満を下げる: make_C.py の 2 つ + 詳細の着地。タイトルは C より深く長く(新しい BGM は止めずに鳴っているため)
# タイトル着地は解決の主音のベースなので -6 dB・0.12 s に浅くした(前の版は -20 dB・0.25 s で、主音が約 0.4 s 消えていた)
DUCKS = [(C.T("main_check") + F1, 0.15, -15.0), (C.T("title_land") + F1, 0.12, -6.0), (C.T("expand_land") + F1, 0.15, -20.0)]
MARGIN = 6.0       # 中域: 効果音の頂点の 30 ms で、効果音が音楽より MARGIN dB 上になるよう、足りない分だけ BGM のその帯域を一瞬下げる
CAP = -6.0         # 1 つの窓で下げる量の上限(dB)。重なった窓は足さずに深い方を取る
RAMP = 0.05        # 下げ始め・戻りの時間(s)
NO_DIP = {"hover_select"}   # C で -8 dB に絞った「ほぼ聞こえない」布の音。BGM を下げて出すと、BGM の谷の方が目立つ(ベッドが -15 dB を超えた)


def rd(name):
    x, sr = sf.read(os.path.join(C.WORK, "C", name), dtype="float64", always_2d=True)
    assert sr == C.SR
    return x[: C.N]


def main(plans=("warm", "light")):
    sfx, gest, room, cmus = rd("raw_sfx.wav"), rd("raw_gestures.wav"), rd("raw_room.wav"), rd("raw_music.wav")
    events = json.load(open(os.path.join(C.WORK, "C", "events.json")))
    L_c = C.ebur(cmus)[0]
    for plan in plans:
        os.makedirs(os.path.join(C.WORK, f"R2_{plan}"), exist_ok=True)
        st, onsets = score2.build(plan)
        bgm = score2.bus(st, low_duck_times=DUCKS)
        g = C.db(L_c - C.ebur(bgm + gest)[0])
        bgm = bgm * g
        # 下げる量は、下げる前の BGM に対して 1 回だけ求める(前の版は 2 回繰り返して同じ窓に -6 dB が 2 度掛かっていた)
        ev = qa.overlap(events, bgm + gest, sfx)
        dips = []
        for e in sorted(ev, key=lambda e: e["measured_peak_s"]):
            need = e["sfx_over_music_30ms_db"] - MARGIN
            if need >= 0 or e["cue"] in NO_DIP:
                continue
            item = [e["measured_peak_s"] - 0.03, e["measured_peak_s"] + 0.12, min(e["bands_hz"]) / 1.26, max(e["bands_hz"]) * 1.26, max(CAP, need)]
            if dips and item[0] <= dips[-1][1]:     # 時間が重なる窓は 1 つにまとめる(帯域は広げ、深さは深い方、上限 CAP)
                p = dips[-1]
                dips[-1] = [p[0], max(p[1], item[1]), min(p[2], item[2]), max(p[3], item[3]), max(CAP, min(p[4], item[4]))]
            else:
                dips.append(item)
        out = os.path.join(C.WORK, f"R2_{plan}")
        C.write(os.path.join(out, "raw_bgm_only.wav"), bgm, "FLOAT")          # BGM だけの音声の元(谷を入れる前)
        bgm = C.band_dip(bgm, dips, ramp=RAMP)
        C.write(os.path.join(out, "raw_bgm_in_mix.wav"), bgm, "FLOAT")
        json.dump([[round(v, 3) for v in d] for d in dips], open(os.path.join(out, "band_dips.json"), "w"))
        json.dump({"onsets": onsets}, open(os.path.join(out, "onsets.json"), "w"))
        finish(f"R2_{plan}", bgm + gest, room, sfx, events,
               {"plan": plan, "bgm_gain_to_match_C_db": round(20 * np.log10(g), 2), "C_music_lufs_premaster": L_c})


if __name__ == "__main__":
    main(tuple(sys.argv[1:]) or ("warm", "light"))
