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
import soundfile as sf

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
        r["bed_to_14s"] = BM.bed_stats(bgm, t1=14.0)
        r["sfx_peaks"] = sfx_peaks(d, events)
        r["sfx_peaks_pack"] = {k: v[0] for k, v in sfx_peaks(d, events, lv[cond]["mix"]["wav"]).items()}
        r["bgm_reduction"] = reduction(bgm_only, bgm)
        pk = json.load(open(os.path.join(C.WORK, d, "peak_dips.json")))
        r["peak_dips"] = {"full_band": len([p for p in pk["full_band"] if p[1] - p[0] > 0.11]),
                          "full_deepest_db": min([p[2] for p in pk["full_band"]], default=0.0),
                          "low_band": len(pk["low_band"]), "low_deepest_db": min([p[4] for p in pk["low_band"]], default=0.0)}
        r["bgm_limiter_db"] = m.get("bgm_limiter", {}).get("max_db")
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


def sfx_peaks(d, events, y_path=None):
    """仕上げのリミッターの後の、効果音の頂点(合図ごと)。仕上げ前の和(stem_music + stem_sfx)を mix.wav に 5 ms ごとの最小二乗のゲイン a で
    当てはめ、効果音ステム × a の標本ピーク(dBFS)を、合図の同期点 -20 ms〜+100 ms で取る。同じ名前の合図は 1 つの窓にまとめる。
    y_path を渡すと、その WAV(比較パックの WAV = さらにゲインと -2.3 dBTP のリミッター)で同じことをする。
    戻り値 {合図: [リミッターの後の頂点, リミッターの前の頂点(仕上げのゲインの後)]}"""
    if y_path:
        y, _ = sf.read(y_path, dtype="float64", always_2d=True); y = y[: C.N]
    else:
        y = rd(d, "mix.wav")
    mus, sfx = rd(d, "stem_music.wav"), rd(d, "stem_sfx.wav")
    pre = mus + sfx
    pre = pre - pre.mean(0)
    h = int(0.005 * C.SR); n = len(y) // h * h
    num = (y[:n] * pre[:n]).reshape(-1, h, 2).sum((1, 2)); den = (pre[:n] ** 2).reshape(-1, h, 2).sum((1, 2))
    a = np.clip(np.where(den > 1e-9, num / np.maximum(den, 1e-12), 1.0), 0, 1.05)
    a = np.repeat(a, h); a = np.r_[a, np.full(len(y) - n, a[-1])]
    out = {}
    names = {}
    for e in events:
        names.setdefault(e["cue"], []).append(e["sync_at_s"])
    for cue, ts in names.items():
        i0, i1 = int((min(ts) - 0.02) * C.SR), int((max(ts) + 0.10) * C.SR)
        s_ = sfx[i0:i1]
        out[cue] = [round(float(20 * np.log10(np.abs(s_ * a[i0:i1, None]).max() + 1e-12)), 2),
                    round(float(20 * np.log10(np.abs(s_).max() + 1e-12)), 2)]
    return out


def reduction(ref, x, bands=((40, 250), (250, 4000), (4000, 16000)), t1=14.0):
    """BGM だけ(低域の下げ・谷・頂点を守る下げ・BGM のリミッターの前)に対して、ミックスの中の BGM が帯域ごとに何 dB 下がったか。
    30 ms の RMS を 10 ms ずつずらし、最も下がった所(フェードは両方に入っているので差には出ない。14.0 s まで)"""
    from scipy.signal import butter, sosfiltfilt
    out = {}
    for lo, hi in bands:
        sos = butter(4, [lo, hi], "bandpass", fs=C.SR, output="sos")
        a, b = sosfiltfilt(sos, ref.mean(1)), sosfiltfilt(sos, x.mean(1))
        ra, ts = BM._slide_db(a, 0.03); rb, _ = BM._slide_db(b, 0.03)
        sel = (ts >= 0.3) & (ts <= t1) & (ra > ra.max() - 50)
        dd = rb[sel] - ra[sel]
        i = int(np.argmin(dd))
        out[f"{lo}-{hi}"] = {"max_cut_db": round(float(dd[i]), 1), "at_s": round(float(ts[sel][i]), 2)}
    return out


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
            "total_bytes": res["total_bytes"],
            "mix_limiter_range_db": rng(lambda r: r["mix_limiter_db"]), "music_bus_limiter_range_db": rng(lambda r: r["music_bus_limiter_db"]),
            "bgm_limiter_range_db": rng(lambda r: r["bgm_limiter_db"]),
            "bed100_to_14s_range": rng(lambda r: r["bed_to_14s"]["rms100_min_below_median_db"]),
            "sfx_peak_spread": spread(R, "sfx_peaks"), "sfx_peak_spread_pack": spread(R, "sfx_peaks_pack"),
            "peak_dips_full_deepest_db": min(r["peak_dips"]["full_deepest_db"] for r in R),
            "peak_dips_low_deepest_db": min(r["peak_dips"]["low_deepest_db"] for r in R),
            "bgm_reduction_max": {k: min(r["bgm_reduction"][k]["max_cut_db"] for r in R) for k in R[0]["bgm_reduction"]}}


def spread(R, key):
    """合図ごとの、5 本の効果音の頂点の差(最大 − 最小)。大きい順"""
    cues = list(R[0][key])
    val = lambda r, c: r[key][c][0] if isinstance(r[key][c], list) else r[key][c]
    rows = sorted(((round(max(val(r, c) for r in R) - min(val(r, c) for r in R), 2), c) for c in cues), reverse=True)
    return {"max_db": rows[0][0], "max_cue": rows[0][1], "over_1db": [c for d_, c in rows if d_ > 1.0], "top3": rows[:3],
            "median_db": round(float(np.median([d_ for d_, _ in rows])), 2)}


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
    row("仕上げのゲイン dB / 仕上げのリミッター dB / BGM だけのリミッター dB / 音楽バスのリミッター dB", lambda c, r: f"{r['master_gain_db']} / {r['mix_limiter_db']} / {r['bgm_limiter_db']} / {r['music_bus_limiter_db']}")
    fade_note = lambda r, k: "(**最小はフェードの範囲**)" if r.get("end_fade") and r["bed"][f"{k}_min_at_s"] >= r["end_fade"]["start_s"] else ""
    row("BGM(ミックスの中)100 ms 最小 dBFS / 中央値からの差 dB(10 ms ずらし)", lambda c, r: f"{r['bed']['rms100_min_dbfs']} / {r['bed']['rms100_min_below_median_db']}({r['bed']['rms100_min_at_s']} s){fade_note(r, 'rms100')}")
    row("同 100 ms・14.0 s まで(足したフェードの前)", lambda c, r: f"{r['bed_to_14s']['rms100_min_below_median_db']}({r['bed_to_14s']['rms100_min_at_s']} s)")
    row("同 50 ms", lambda c, r: f"{r['bed']['rms50_min_dbfs']} / {r['bed']['rms50_min_below_median_db']}({r['bed']['rms50_min_at_s']} s){fade_note(r, 'rms50')}")
    row("同 50 ms・14.0 s まで", lambda c, r: f"{r['bed_to_14s']['rms50_min_below_median_db']}({r['bed_to_14s']['rms50_min_at_s']} s)")
    row("BGM だけ(谷の前)100 ms / 50 ms の中央値からの差", lambda c, r: f"{r['bed_bgm_only']['rms100_min_below_median_db']} / {r['bed_bgm_only']['rms50_min_below_median_db']}")
    row("ベッドの合否 100 ms / 50 ms(-15 dB 以内)", lambda c, r: f"{r['rule_check']['bgm_bed_within_limit']} / {r['bed50_within_limit']}")
    row("効果音の静けさの窓(始まり・終わりを除く)", lambda c, r: r["rule_check"]["sfx_quiet_windows_inner"])
    row("拍: 音の立ち上がりのすき間の最大 s(BGM だけ)/ テンポ", lambda c, r: f"{r['beat_audio']['max_onset_gap_s']}({r['beat_audio']['max_onset_gap_at_s']} s から)/ {r['beat_audio']['tempo_bpm_librosa']}")
    row("earshot テンポ / 拍の明瞭度 / 拍の間隔の最大 s", lambda c, r: (lambda e: f"{e['tempo']} / {e['pulse_clarity']} / {e['beat_interval_max_s']}" if e else "—")(r.get("earshot_bgm")))
    row("120 Hz 未満の重なり", lambda c, r: r["low_overlaps"] or "なし")
    row("中域で埋もれる: 30 ms・1/3 oct で < 3 dB", lambda c, r: f"{len(r['mid_buried_30ms'])}/{r['n_mid_events']} {r['mid_buried_30ms']}")
    row("中域で埋もれる: 30 ms・1/6 oct で < 3 dB", lambda c, r: f"{len(r['mid_buried_30ms_sixth'])} {r['mid_buried_30ms_sixth']}")
    row("中域で埋もれる: 120 ms で < 0 dB", lambda c, r: len(r["mid_buried_120ms"]))
    row("中域の谷の窓 / 最も深い dB / 重なり", lambda c, r: f"{r['band_dips']['count']} / {r['band_dips']['deepest_db']} / {r['band_dips']['overlapping']}")
    row("頂点を守る下げ: 全帯域の窓 / 最も深い dB / 低域(40–250 Hz)の窓 / 最も深い dB", lambda c, r: f"{r['peak_dips']['full_band']} / {r['peak_dips']['full_deepest_db']} / {r['peak_dips']['low_band']} / {r['peak_dips']['low_deepest_db']}")
    row("BGM が下がった量の最大(BGM だけに対して。40–250 / 250–4k / 4k–16k Hz、30 ms、14.0 s まで)", lambda c, r: " / ".join(f"{v['max_cut_db']}({v['at_s']} s)" for v in r["bgm_reduction"].values()))
    row("終わりのフェード", lambda c, r: (lambda f: f"{f['start_s']} s から {f['length_s']} s" if f else "なし")(r.get("end_fade")))
    row("モノラル LUFS(ステレオとの差)", lambda c, r: f"{r['mono_lufs']}({r['mono_minus_stereo_db']})")
    row("クリップ / 映像の MD5 一致", lambda c, r: f"{r['clip_samples']} / {r['video_md5_matches_source']}")
    conds = list(res["conditions"])
    L += ["", "## 効果音の頂点(合図ごと、dBFS)",
          "仕上げ前の和(音楽ステム + 効果音ステム)を mix.wav に 5 ms ごとの最小二乗のゲインで当てはめ、効果音ステム × そのゲインの標本ピーク。"
          "同期点 -20 ms〜+100 ms。「前」は仕上げのリミッターの前(仕上げのゲインの後)。「差」は 5 本の最大 − 最小、「パックの差」は比較パックの WAV(さらに -2.3 dBTP のリミッター)で同じ測り方。", "",
          "| 合図 | " + " | ".join(f"{c}(`{res['conditions'][c]['code']}`)" for c in conds) + " | 差 | パックの差 | 前(5 本の範囲) |", "|---|" + "---|" * (len(conds) + 3)]
    for cue in res["conditions"][conds[0]]["sfx_peaks"]:
        v = [res["conditions"][c]["sfx_peaks"][cue] for c in conds]
        vp = [res["conditions"][c]["sfx_peaks_pack"][cue] for c in conds]
        pre = [x[1] for x in v]
        L.append(f"| {cue} | " + " | ".join(str(x[0]) for x in v) + f" | {round(max(x[0] for x in v) - min(x[0] for x in v), 2)} | "
                 f"{round(max(vp) - min(vp), 2)} | {min(pre)}〜{max(pre)} |")
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
         "S9 = 第2ラウンドの light の BGM を score2 から作り直した物(低域の下げ・谷の前、身振りなし、48 kHz)。D1–D4 = `../audio_studio_pc/D*.wav`(44.1 kHz → 48 kHz に変換して測定)。"
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
    row("終わり: 判定の理由(記録ベース。平行調は同じ扱い)→ 足したフェード", lambda a, m: "。".join(m["ending_reasons"]) + (f"。{m['ending_note']}" if m.get("ending_note") else "")
        + " → " + (f"{m['end_fade']['start_s']} s から {m['end_fade']['length_s']} s" if m["end_fade"] else "なし"))
    row("帯域: 120 Hz 未満 / 200 Hz–4 kHz / 8 kHz 超 の割合・重心 Hz", lambda a, m: f"{a['bands']['lt120']} / {a['bands']['b200_4k']} / {a['bands']['gt8k']}・{a['bands']['centroid_hz']}")
    row("帯域幅(平均スペクトルが最大から -60 dB)Hz", lambda a, m: round(a["bandwidth_-60db_hz"]))
    row("クリップ / 直流 L,R / 左右の相関 / 波高率 dB", lambda a, m: f"{a['tech']['clip_samples']} / {a['tech']['dc']} / {a['tech']['lr_corr']} / {a['tech']['crest_db']}")
    row("モノラルの大きさ − ステレオ dB", lambda a, m: a["mono_lufs_minus_stereo"])
    row("ミックスへのゲイン dB(-14 LUFS へ / C の音楽バスに合わせる)", lambda a, m: f"{m.get('gain_to_-14_lufs_db')} / {m.get('bgm_gain_to_match_C_db')}")
    p = os.path.join(KEYDIR, "AUDIT_ROUND3_BY_PLAN.md")
    open(p, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", p)


if __name__ == "__main__":
    main()
