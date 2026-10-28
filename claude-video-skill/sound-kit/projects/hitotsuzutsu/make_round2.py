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
DUCKS = [(C.T("main_check") + F1, 0.15, -15.0), (C.T("title_land") + F1, 0.25, -20.0), (C.T("expand_land") + F1, 0.15, -15.0)]
MARGIN = 6.0       # 中域: 効果音の頂点の 30 ms で、効果音が音楽より MARGIN dB 上になるよう、足りない分だけ BGM のその帯域を一瞬下げる(最大 -6 dB)


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
        dips = []
        for _ in range(2):                         # 測る → その帯域を下げる、を 2 回
            ev = qa.overlap(events, bgm + gest, sfx)
            add = []
            for e in ev:
                need = e["sfx_over_music_30ms_db"] - MARGIN
                if need < 0:
                    lo, hi = min(e["bands_hz"]) / 1.26, max(e["bands_hz"]) * 1.26
                    add.append((e["measured_peak_s"] - 0.03, e["measured_peak_s"] + 0.12, lo, hi, max(-6.0, need)))
            bgm = C.band_dip(bgm, add)
            dips += add
        json.dump([[round(v, 3) for v in d] for d in dips], open(os.path.join(C.WORK, f"R2_{plan}", "band_dips.json"), "w"))
        out = os.path.join(C.WORK, f"R2_{plan}")
        C.write(os.path.join(out, "raw_bgm_only.wav"), bgm, "FLOAT")
        json.dump({"onsets": onsets}, open(os.path.join(out, "onsets.json"), "w"))
        finish(f"R2_{plan}", bgm + gest, room, sfx, events,
               {"plan": plan, "bgm_gain_to_match_C_db": round(20 * np.log10(g), 2), "C_music_lufs_premaster": L_c})


if __name__ == "__main__":
    main(tuple(sys.argv[1:]) or ("warm", "light"))
