#!/usr/bin/env python3
"""第3ラウンドの検査(S9 と Audio Studio の D1–D4)。数値で確かめられる物だけ。中身は qa_round2.py と同じ物差し:
 1 BGM ベッドの落ち込み(ミックスの中の BGM、仕上げ後の大きさ): 100 ms / 50 ms の RMS を 10 ms ずつずらした最小と中央値の差
   (ルール 4: 100 ms で -15 dB 以内。50 ms も同じ -15 dB で参考に判定)。効果音の静けさの窓
 2 拍: 音の立ち上がりのすき間の最大とテンポ(librosa)、--earshot で earshot timeline のテンポ・拍の明瞭度
 3 帯域の干渉: 120 Hz 未満の重なり、中域で効果音が音楽に埋もれる件数(30 ms・1/3 oct と 1/6 oct で < 3 dB、120 ms で < 0 dB)
 4 比較用の動画: ラウドネス・真のピーク・LRA・クリップ・モノラル(0.5L+0.5R)・映像の MD5
usage: python qa_round3.py [--earshot] [--publish]
出力: WORK/qa_round3.json と標準出力。--publish で、記号が分かる値を answer_key/QA_ROUND3_BY_CONDITION.md と
      answer_key/AUDIT_ROUND3_BY_PLAN.md にだけ書く(QA_ROUND3.md には記号と結び付く値を書かない)
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bgm_metrics as BM  # noqa: E402
import common as C  # noqa: E402
import qa  # noqa: E402
from finish_round3 import COND  # noqa: E402
from qa_round2 import rd, sfx_quiet  # noqa: E402

KEYDIR = os.path.join(C.REPO, "docs", "sound-upgrade", "answer_key")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--earshot", action="store_true"); ap.add_argument("--publish", action="store_true")
    a = ap.parse_args()
    lv = json.load(open(os.path.join(C.WORK, "compare_round3_levels.json")))
    events = json.load(open(os.path.join(C.WORK, "C", "events.json")))
    res = {"source_video_md5": lv["_source_video_md5"], "total_bytes": lv["_total_bytes"], "conditions": {}}
    api = None
    if a.earshot:
        from earshot import api
    for cond, (d, _) in COND.items():
        m = json.load(open(os.path.join(C.WORK, d, "master.json")))
        g = C.db(m["gain_db"])
        bgm_only = rd(d, "raw_bgm_only.wav") * g
        bgm = rd(d, "raw_bgm_in_mix.wav") * g
        mus, sfx = rd(d, "stem_music.wav"), rd(d, "stem_sfx.wav")
        mp4 = lv[cond]["mix"]["file"]
        x = qa.decode(mp4)
        r = {"code": lv[cond]["code"], "mp4_lufs_tp_lra": C.ebur(mp4), "clip_samples": int((np.abs(x) >= 0.999).sum()),
             **{k: v for k, v in qa.mono(mp4, x).items() if k != "mono_sections"},
             "video_md5": lv[cond]["mix"]["video_md5"], "video_md5_matches_source": lv[cond]["mix"]["video_md5"] == lv["_source_video_md5"],
             "bgm_m4a_lufs_tp_lra": [lv[cond]["bgm"]["lufs"], lv[cond]["bgm"]["tp"], lv[cond]["bgm"]["lra"]],
             "mix_limiter_db": m["limiter_max_db"], "music_bus_limiter_db": m.get("music_bus_limiter_db"),
             "music_bus_peak_dbfs": m.get("music_bus_peak_dbfs_after_gain"), "master_gain_db": m["gain_db"],
             "end_fade": m.get("end_fade"),
             "bed": BM.bed_stats(bgm), "bed_bgm_only": BM.bed_stats(bgm_only), "beat_audio": BM.beat_stats(bgm_only), "sfx_quiet_windows": sfx_quiet(sfx)}
        r["rule_check"] = qa.rule_check(r["bed"], r["sfx_quiet_windows"])
        r["bed50_within_limit"] = bool(r["bed"]["rms50_min_below_median_db"] >= -15.0)
        dd = json.load(open(os.path.join(C.WORK, d, "band_dips.json")))
        r["band_dips"] = {"count": len(dd), "deepest_db": min([x_[4] for x_ in dd], default=0),
                          "overlapping": sum(1 for p, q in zip(dd, dd[1:]) if q[0] <= p[1])}
        ev = qa.overlap(events, mus, sfx)
        lo = qa.low_overlap(events, mus, sfx)
        mid = [e for e in ev if 250 <= np.median(e["bands_hz"]) <= 4000]
        r["low_overlaps"] = [(o["cue"], o["sfx_low_dbfs"], o["music_low_dbfs"]) for o in lo if o["overlap"]]
        r["mid_buried_30ms"] = [(e["cue"], e["sfx_over_music_30ms_db"]) for e in mid if e["sfx_over_music_30ms_db"] < 3]
        r["mid_buried_120ms"] = [(e["cue"], e["sfx_over_music_db"]) for e in mid if e["sfx_over_music_db"] < 0]
        r["mid_buried_30ms_sixth"] = [(e["cue"], e["sfx_over_music_30ms_sixth_db"]) for e in mid if e["sfx_over_music_30ms_sixth_db"] < 3]
        r["n_mid_events"] = len(mid)
        if api:
            tl = api.timeline(lv[cond]["bgm"]["wav"])
            beats = tl["music"].get("beats") or []
            bi = np.diff(beats) if len(beats) > 1 else np.array([0])
            r["earshot_bgm"] = {"tempo": tl["music"].get("tempo"), "pulse_clarity": tl["music"].get("pulse_clarity"), "beats": len(beats),
                                "beat_interval_max_s": round(float(bi.max()), 3), "beat_interval_median_s": round(float(np.median(bi)), 3)}
        res["conditions"][cond] = r
        print(f"== {cond} ({r['code']}) mp4 {r['mp4_lufs_tp_lra']} clip {r['clip_samples']} mono {r['mono_lufs']} ({r['mono_minus_stereo_db']}) "
              f"md5 ok {r['video_md5_matches_source']} limiter {r['mix_limiter_db']} music bus {r['music_bus_limiter_db']} / peak {r['music_bus_peak_dbfs']}")
        print("   bed", {k: v for k, v in r["bed"].items() if "below" in k or "at_s" in k}, " bed50 ok", r["bed50_within_limit"])
        print("   beat audio", r["beat_audio"])
        print("   sfx quiet", r["sfx_quiet_windows"], " low overlaps", r["low_overlaps"], " dips", r["band_dips"])
        print(f"   mid buried 30ms {len(r['mid_buried_30ms'])}/{r['n_mid_events']} {r['mid_buried_30ms']}  120ms {len(r['mid_buried_120ms'])}"
              f"  30ms 1/6oct {len(r['mid_buried_30ms_sixth'])}")
        print("   rule", r["rule_check"])
        if "earshot_bgm" in r:
            print("   earshot", r["earshot_bgm"])
    res["aggregate"] = aggregate(res)
    print("aggregate", json.dumps(res["aggregate"], ensure_ascii=False))
    json.dump(res, open(os.path.join(C.WORK, "qa_round3.json"), "w"), ensure_ascii=False, indent=1, default=str)
    if a.publish:
        by_condition(res, lv)
        audit_by_plan()


def aggregate(res):
    """記号と結び付かない、5 本まとめての値(QA_ROUND3.md に書く物)"""
    R = list(res["conditions"].values())
    rng = lambda f: [min(f(r) for r in R), max(f(r) for r in R)]
    return {"n": len(R), "video_md5_all_match": all(r["video_md5_matches_source"] for r in R),
            "mp4_lufs_range": rng(lambda r: r["mp4_lufs_tp_lra"][0]), "mp4_tp_max": max(r["mp4_lufs_tp_lra"][1] for r in R),
            "bgm_lufs_range": rng(lambda r: r["bgm_m4a_lufs_tp_lra"][0]), "bgm_tp_max": max(r["bgm_m4a_lufs_tp_lra"][1] for r in R),
            "clip_total": sum(r["clip_samples"] for r in R), "mono_minus_stereo_range": rng(lambda r: r["mono_minus_stereo_db"]),
            "bed100_pass": sum(bool(r["rule_check"]["bgm_bed_within_limit"]) for r in R),
            "bed50_pass": sum(r["bed50_within_limit"] for r in R),
            "sfx_quiet_ok": sum(bool(r["rule_check"]["sfx_quiet_ok"]) for r in R),
            "band_dips_deepest_db": min(r["band_dips"]["deepest_db"] for r in R),
            "band_dips_overlapping_total": sum(r["band_dips"]["overlapping"] for r in R),
            "low_overlaps_total": sum(len(r["low_overlaps"]) for r in R),
            "mid_buried_30ms_range": rng(lambda r: len(r["mid_buried_30ms"])), "n_mid_events": R[0]["n_mid_events"],
            "total_bytes": res["total_bytes"]}


def by_condition(res, lv):
    L = ["# 第3ラウンドの検査の条件ごとの数値(正解表の一部)", "",
         "> **試聴の評価が終わるまで利用者に見せない前提のファイルです。** ファイルの大きさ・LRA などから記号が分かるため、`../QA_ROUND3.md` から分けた。", "",
         "| 項目 | " + " | ".join(f"{c}(`{r['code']}`)" for c, r in res["conditions"].items()) + " |", "|---|" + "---|" * len(res["conditions"])]

    def row(name, f):
        L.append(f"| {name} | " + " | ".join(str(f(c, r)) for c, r in res["conditions"].items()) + " |")
    row("動画 統合 LUFS / 真のピーク dBTP / LRA", lambda c, r: " / ".join(str(v) for v in r["mp4_lufs_tp_lra"]))
    row("BGM だけ m4a LUFS / 真のピーク / LRA", lambda c, r: " / ".join(str(v) for v in r["bgm_m4a_lufs_tp_lra"]))
    row("動画 / BGM だけ のバイト数", lambda c, r: f"{lv[c]['mix']['bytes']} / {lv[c]['bgm']['bytes']}")
    row("比較パックのリミッター dB(動画 / BGM だけ)", lambda c, r: f"{lv[c]['mix']['limiter_db']} / {lv[c]['bgm']['limiter_db']}")
    row("仕上げのゲイン dB / 仕上げのリミッター dB / 音楽バスのリミッター dB", lambda c, r: f"{r['master_gain_db']} / {r['mix_limiter_db']} / {r['music_bus_limiter_db']}")
    row("BGM(ミックスの中)100 ms 最小 dBFS / 中央値からの差 dB(10 ms ずらし)", lambda c, r: f"{r['bed']['rms100_min_dbfs']} / {r['bed']['rms100_min_below_median_db']}({r['bed']['rms100_min_at_s']} s)")
    row("同 50 ms", lambda c, r: f"{r['bed']['rms50_min_dbfs']} / {r['bed']['rms50_min_below_median_db']}({r['bed']['rms50_min_at_s']} s)")
    row("BGM だけ(谷の前)100 ms / 50 ms の中央値からの差", lambda c, r: f"{r['bed_bgm_only']['rms100_min_below_median_db']} / {r['bed_bgm_only']['rms50_min_below_median_db']}")
    row("ベッドの合否 100 ms / 50 ms(-15 dB 以内)", lambda c, r: f"{r['rule_check']['bgm_bed_within_limit']} / {r['bed50_within_limit']}")
    row("効果音の静けさの窓(始まり・終わりを除く)", lambda c, r: r["rule_check"]["sfx_quiet_windows_inner"])
    row("拍: 音の立ち上がりのすき間の最大 s(BGM だけ)/ テンポ", lambda c, r: f"{r['beat_audio']['max_onset_gap_s']}({r['beat_audio']['max_onset_gap_at_s']} s から)/ {r['beat_audio']['tempo_bpm_librosa']}")
    row("earshot テンポ / 拍の明瞭度 / 拍の間隔の最大 s", lambda c, r: (lambda e: f"{e['tempo']} / {e['pulse_clarity']} / {e['beat_interval_max_s']}" if e else "—")(r.get("earshot_bgm")))
    row("120 Hz 未満の重なり", lambda c, r: r["low_overlaps"] or "なし")
    row("中域で埋もれる: 30 ms・1/3 oct で < 3 dB", lambda c, r: f"{len(r['mid_buried_30ms'])}/{r['n_mid_events']} {r['mid_buried_30ms']}")
    row("中域で埋もれる: 30 ms・1/6 oct で < 3 dB", lambda c, r: f"{len(r['mid_buried_30ms_sixth'])} {r['mid_buried_30ms_sixth']}")
    row("中域で埋もれる: 120 ms で < 0 dB", lambda c, r: len(r["mid_buried_120ms"]))
    row("BGM の帯域を一瞬下げた窓 / 最も深い dB / 重なり", lambda c, r: f"{r['band_dips']['count']} / {r['band_dips']['deepest_db']} / {r['band_dips']['overlapping']}")
    row("終わりのフェード", lambda c, r: (lambda f: f"{f['start_s']} s から {f['length_s']} s" if f else "なし")(r.get("end_fade")))
    row("モノラル LUFS(ステレオとの差)", lambda c, r: f"{r['mono_lufs']}({r['mono_minus_stereo_db']})")
    row("クリップ / 映像の MD5 一致", lambda c, r: f"{r['clip_samples']} / {r['video_md5_matches_source']}")
    p = os.path.join(KEYDIR, "QA_ROUND3_BY_CONDITION.md")
    open(p, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", p)


def audit_by_plan():
    """audit_round3.py の値(元の BGM の点検)と、make_round3.py の処理の記録"""
    au = json.load(open(os.path.join(C.WORK, "R3_audit.json")))
    ms = {c: json.load(open(os.path.join(C.WORK, COND[c][0], "master.json"))) for c in COND}
    names = list(COND)
    L = ["# 第3ラウンド: BGM の点検(元のファイル。案ごと)", "",
         "> **試聴の評価が終わるまで利用者に見せない前提のファイルです。** 調・帯域幅などから、どの記号が作曲した BGM かが分かるため。", "",
         "S9 = 第2ラウンドの light の BGM(谷を入れる前、身振りなし、48 kHz)。D1–D4 = `../audio_studio_pc/D*.wav`(44.1 kHz → 48 kHz に変換して測定)。"
         "ベッドの値は元の大きさのまま(差だけを見るので大きさに依らない)。作り: `audit_round3.py`。", "",
         "| 項目 | " + " | ".join(names) + " |", "|---|" + "---|" * len(names)]

    def row(name, f):
        L.append(f"| {name} | " + " | ".join(str(f(au[c], ms[c])) for c in names) + " |")
    row("長さ s / 元の標本化周波数・形式", lambda a, m: f"{a['source'].get('dur_s', 15.0)} / {a['source']['sr']} {a['source'].get('subtype', 'FLOAT')}")
    row("統合 LUFS / 真のピーク dBTP / LRA(元)", lambda a, m: f"{a['lufs']} / {a['tp']} / {a['lra']}")
    row("-14 LUFS にそろえるゲイン dB → その時の標本ピーク dBFS / 床(50 ms の 5 %)dBFS / 10 kHz 超 dBFS", lambda a, m: f"{a['gain_to_-14_db']} → {a['tech_at_-14']['peak_dbfs']} / {a['tech_at_-14']['floor_p5_50ms_dbfs']} / {a['tech_at_-14']['hf_gt10k_dbfs']}")
    row("ベッド 100 ms / 50 ms の中央値からの差 dB(時刻)", lambda a, m: f"{a['bed']['rms100_min_below_median_db']}({a['bed']['rms100_min_at_s']})/ {a['bed']['rms50_min_below_median_db']}({a['bed']['rms50_min_at_s']})")
    row("拍: テンポ / 拍の間隔の中央値・最大 s / 立ち上がりのすき間の最大 s", lambda a, m: f"{a['beat']['tempo_bpm_librosa']} / {a['beat']['beat_interval_median_s']}・{a['beat']['beat_interval_max_s']} / {a['beat']['max_onset_gap_s']}")
    row("拍の位置: 格子(0.625 s)からのずれの中央値 / 標準偏差 s", lambda a, m: f"{a['beat_phase_vs_grid']['median_s']} / {a['beat_phase_vs_grid']['sd_s']}")
    row("調の推定(相関)/ 2 位", lambda a, m: f"{a['key']['key']}({a['key']['r']})/ {a['key']['second']}({a['key']['r2']})")
    row("C の身振り 17 音のうち調の音階の外", lambda a, m: f"{a['gesture_fit']['outside_scale']} {a['gesture_fit']['outside_names'] or ''}")
    row("終わり: 最後の 2 s の調 / 最後の 1 s で一番強い長三和音 / 主和音(Eb)の割合", lambda a, m: f"{a['ending']['key_last2s']} / {a['ending']['strongest_major_triad_last1s']} / {a['ending']['tonic_triad_share_last1s']}")
    row("終わり: 最後の 100 ms の中央値からの差 dB", lambda a, m: a["ending"]["last_100ms_db_vs_median"])
    row("終わり: 判定 → 足したフェード", lambda a, m: "作曲した終わり方(処理なし)" if "end_fade" not in m else (f"解決しない → {m['end_fade']['start_s']} s から {m['end_fade']['length_s']} s" if m["end_fade"] else "解決する → なし"))
    row("帯域: 120 Hz 未満 / 200 Hz–4 kHz / 8 kHz 超 の割合・重心 Hz", lambda a, m: f"{a['bands']['lt120']} / {a['bands']['b200_4k']} / {a['bands']['gt8k']}・{a['bands']['centroid_hz']}")
    row("帯域幅(平均スペクトルが最大から -60 dB)Hz", lambda a, m: round(a["bandwidth_-60db_hz"]))
    row("クリップ / 直流 L,R / 左右の相関 / 波高率 dB", lambda a, m: f"{a['tech']['clip_samples']} / {a['tech']['dc']} / {a['tech']['lr_corr']} / {a['tech']['crest_db']}")
    row("モノラルの大きさ − ステレオ dB", lambda a, m: a["mono_lufs_minus_stereo"])
    row("ミックスへのゲイン dB(-14 LUFS へ / C の音楽バスに合わせる)", lambda a, m: f"{m.get('gain_to_-14_lufs_db', '—')} / {m.get('bgm_gain_to_match_C_db')}")
    p = os.path.join(KEYDIR, "AUDIT_ROUND3_BY_PLAN.md")
    open(p, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", p)


if __name__ == "__main__":
    main()
