#!/usr/bin/env python3
"""第3ラウンド(条件 D): PC の Audio Studio で作った BGM(D1–D4、docs/sound-upgrade/audio_studio_pc/)を、
第2ラウンドの S9(light)と同じやり方で C の効果音の下に置く。BGM の編曲・中身は変えない(下げる処理だけ)。
- 読み込み: 44.1 kHz → 48 kHz(多相フィルタ、audit_round3.load_d)。長さは 15.000 s のまま
- 大きさ: まず BGM だけを統合 -14.0 LUFS にそろえる(D4 の小ささを直す。そろえた後のピーク・床は audit_round3 で確認)。
  次に S9 と同じく「BGM + C の音程の身振り」の統合ラウドネスを C の音楽バス(仕上げ前)に合わせる(効果音との釣り合いを 5 本でそろえる)
- 低い効果音の瞬間(大チェック・タイトル着地・詳細の着地): S9 と同じ make_round2.DUCKS で 200 Hz 未満だけを下げる
- 中域: S9 と同じ規則で、効果音の頂点の 30 ms で効果音が音楽より MARGIN dB 上になるよう、足りない分だけ BGM のその帯域を一瞬下げる
  (下げる前の BGM に対して 1 回だけ求め、時間の重なる窓は 1 つにまとめる。上限 -6 dB、立ち上がり・戻り 50 ms の raised cosine)
- 終わり方: 最後の 2 s の調が全体の調と同じで、最後の 100 ms が中央値より 9 dB 以上下がっていれば「主音に解決して終わる」とみなし何もしない。
  そうでなければ END_FADE(開始 s, 長さ s)の raised cosine のフェードを足す。案ごとの判定と値は WORK/R3_Dn/master.json の end_fade
- 仕上げ: mixer.finish(S9 と同じ。音楽バスのリミッター → -14 LUFS / -2 dBTP)
usage: python make_round3.py [D1 D2 ...]   前提: make_C.py・make_round2.py・audit_round3.py を実行済み
出力: WORK/R3_D1/ … WORK/R3_D4/(mix.wav・stem_*.wav・raw_bgm_only.wav(谷の前、フェード後)・raw_bgm_in_mix.wav・band_dips.json・master.json)
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audit_round3 as A  # noqa: E402
import common as C  # noqa: E402
import qa  # noqa: E402
from make_round2 import CAP, DUCKS, MARGIN, NO_DIP, RAMP, rd  # noqa: E402  S9 と同じ値
from mixer import finish  # noqa: E402

END_FADE = (14.0, 1.0)      # 主音に解決しない案だけ: 14.0 s から 1.0 s(終わりの静止 13.6 s の後。タイトル着地 12.57 s には掛からない)


def resolves(a):
    e = a["ending"]
    return bool(e["key_last2s"] == a["key"]["key"] and e["last_100ms_db_vs_median"] <= -9.0)


def end_fade(x, start, length):
    t = np.arange(len(x)) / C.SR
    u = np.clip((t - start) / length, 0, 1)
    return x * (0.5 + 0.5 * np.cos(np.pi * u))[:, None]


def plan_dips(events, bgm, gest, sfx):
    """make_round2.py と同じ規則(谷は下げる前の BGM に対して 1 回だけ)"""
    ev = qa.overlap(events, bgm + gest, sfx)
    dips = []
    for e in sorted(ev, key=lambda e: e["measured_peak_s"]):
        need = e["sfx_over_music_30ms_db"] - MARGIN
        if need >= 0 or e["cue"] in NO_DIP:
            continue
        item = [e["measured_peak_s"] - 0.03, e["measured_peak_s"] + 0.12, min(e["bands_hz"]) / 1.26, max(e["bands_hz"]) * 1.26, max(CAP, need)]
        if dips and item[0] <= dips[-1][1]:
            p = dips[-1]
            dips[-1] = [p[0], max(p[1], item[1]), min(p[2], item[2]), max(p[3], item[3]), max(CAP, min(p[4], item[4]))]
        else:
            dips.append(item)
    return dips


def main(plans=tuple(A.PLANS)):
    sfx, gest, room, cmus = rd("raw_sfx.wav"), rd("raw_gestures.wav"), rd("raw_room.wav"), rd("raw_music.wav")
    events = json.load(open(os.path.join(C.WORK, "C", "events.json")))
    audit = json.load(open(os.path.join(C.WORK, "R3_audit.json")))
    L_c = C.ebur(cmus)[0]
    for plan in plans:
        out = os.path.join(C.WORK, f"R3_{plan}")
        os.makedirs(out, exist_ok=True)
        x, src = A.load_d(plan)
        I0 = C.ebur(x)[0]
        g14 = -14.0 - I0
        bgm = x * C.db(g14)                                   # BGM だけで -14 LUFS
        bgm = C.low_duck(bgm, list(DUCKS), f=200.0)           # S9 と同じ低域の一瞬の下げ
        ok = resolves(audit[plan])
        fade = None if ok else {"start_s": END_FADE[0], "length_s": END_FADE[1], "shape": "raised cosine to silence at 15.0 s"}
        if fade:
            bgm = end_fade(bgm, *END_FADE)
        g = C.db(L_c - C.ebur(bgm + gest)[0])                 # 効果音との釣り合いを C・S9 と同じに
        bgm = bgm * g
        dips = plan_dips(events, bgm, gest, sfx)
        C.write(os.path.join(out, "raw_bgm_only.wav"), bgm, "FLOAT")
        bgm = C.band_dip(bgm, dips, ramp=RAMP)
        C.write(os.path.join(out, "raw_bgm_in_mix.wav"), bgm, "FLOAT")
        json.dump([[round(v, 3) for v in d] for d in dips], open(os.path.join(out, "band_dips.json"), "w"))
        info = {"plan": plan, "source": src, "source_lufs": I0, "gain_to_-14_lufs_db": round(g14, 2),
                "bgm_gain_to_match_C_db": round(20 * np.log10(g), 2), "C_music_lufs_premaster": L_c,
                "ending_resolves_to_tonic": ok, "ending_measure": {"key": audit[plan]["key"]["key"], "key_last2s": audit[plan]["ending"]["key_last2s"],
                                                                   "last_100ms_db_vs_median": audit[plan]["ending"]["last_100ms_db_vs_median"]},
                "end_fade": fade, "low_ducks": DUCKS, "dip_rule": {"margin_db": MARGIN, "cap_db": CAP, "ramp_s": RAMP, "no_dip": sorted(NO_DIP)}}
        finish(f"R3_{plan}", bgm + gest, room, sfx, events, info)
        print(plan, "dips", len(dips), "fade", fade)


if __name__ == "__main__":
    main(tuple(sys.argv[1:]) or tuple(A.PLANS))
