#!/usr/bin/env python3
"""第2ラウンドの検査(基準 = C、新しい warm / light)。数値で確かめられる物だけ。
 1 BGM ベッドの落ち込み: 仕上げ後の大きさに換算した BGM だけの音の 100 ms / 400 ms RMS の最小と中央値(bgm_metrics.bed_stats)
   効果音の静けさ: 効果音ステムの 100 ms RMS < -40 dBFS が 0.3 s 以上続く窓
 2 拍の連続: 楽譜の発音のすき間の最大(新しい 2 案のみ)、音の立ち上がりのすき間の最大とテンポ(librosa)、
   --earshot で earshot timeline のテンポ・拍の明瞭度・拍の間隔の最大(BGM だけの音)
 3 帯域の干渉: 120 Hz 未満の重なり(qa.low_overlap と同じ判定)、中域(主な帯域 250 Hz–4 kHz)で効果音が音楽に埋もれる件数
   (頂点の 30 ms で「効果音 − 音楽」< 3 dB)と 120 ms 窓の件数
 4 比較用の動画: ラウドネス・真のピーク・LRA・クリップ・モノラル(0.5L+0.5R)・映像の MD5
usage: python qa_round2.py [--earshot]     出力: WORK/qa_round2.json と標準出力
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bgm_metrics as BM  # noqa: E402
import common as C  # noqa: E402
import qa  # noqa: E402

DIRS = {"base": "C", "warm": "R2_warm", "light": "R2_light"}


def rd(*p):
    x, _ = sf.read(os.path.join(C.WORK, *p), dtype="float64", always_2d=True)
    return x[: C.N]


def sfx_quiet(sfx):
    m = sfx.mean(1); w = int(0.1 * C.SR)
    r = 20 * np.log10(np.sqrt((m[: len(m) // w * w].reshape(-1, w) ** 2).mean(1)) + 1e-12)
    out, st = [], None
    for i, v in enumerate(list(r) + [0]):
        if v < -40 and st is None: st = i
        if v >= -40 and st is not None:
            if i - st >= 3: out.append([round(st * 0.1, 1), round(i * 0.1, 1)])
            st = None
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--earshot", action="store_true"); ap.add_argument("--publish", action="store_true")
    a = ap.parse_args()
    lv = json.load(open(os.path.join(C.WORK, "compare_round2_levels.json")))
    events = json.load(open(os.path.join(C.WORK, "C", "events.json")))
    res = {"source_video_md5": lv["_source_video_md5"], "conditions": {}}
    api = None
    if a.earshot:
        from earshot import api
    for cond, d in DIRS.items():
        m = json.load(open(os.path.join(C.WORK, d, "master.json")))
        g = C.db(m["gain_db"])
        bgm_only = rd(d, "raw_bgm_only.wav") * g
        p_in = os.path.join(C.WORK, d, "raw_bgm_in_mix.wav")
        bgm = rd(d, "raw_bgm_in_mix.wav") * g if os.path.exists(p_in) else bgm_only
        mus, sfx = rd(d, "stem_music.wav"), rd(d, "stem_sfx.wav")
        mp4 = lv[cond]["mix"]["file"]
        x = qa.decode(mp4)
        r = {"code": lv[cond]["code"], "mp4_lufs_tp_lra": C.ebur(mp4), "clip_samples": int((np.abs(x) >= 0.999).sum()),
             **{k: v for k, v in qa.mono(mp4, x).items() if k != "mono_sections"},
             "video_md5": lv[cond]["mix"]["video_md5"], "video_md5_matches_source": lv[cond]["mix"]["video_md5"] == lv["_source_video_md5"],
             "bgm_m4a_lufs_tp_lra": [lv[cond]["bgm"]["lufs"], lv[cond]["bgm"]["tp"], lv[cond]["bgm"]["lra"]],
             "mix_limiter_db": m["limiter_max_db"], "music_bus_peak_dbfs": m.get("music_bus_peak_dbfs_after_gain"),
             "master_gain_db": m["gain_db"],
             "bed": BM.bed_stats(bgm), "bed_bgm_only": BM.bed_stats(bgm_only), "beat_audio": BM.beat_stats(bgm_only), "sfx_quiet_windows": sfx_quiet(sfx)}
        r["rule_check"] = qa.rule_check(r["bed"], r["sfx_quiet_windows"])
        dp = os.path.join(C.WORK, d, "band_dips.json")
        if os.path.exists(dp):
            dd = json.load(open(dp)); r["band_dips"] = {"count": len(dd), "deepest_db": min([x[4] for x in dd], default=0)}
        on = os.path.join(C.WORK, d, "onsets.json")
        if os.path.exists(on):
            r["beat_score"] = BM.notes_gap(json.load(open(on))["onsets"])
        ev = qa.overlap(events, mus, sfx)
        lo = qa.low_overlap(events, mus, sfx)
        mid = [e for e in ev if 250 <= np.median(e["bands_hz"]) <= 4000]
        r["low_overlaps"] = [(o["cue"], o["sfx_low_dbfs"], o["music_low_dbfs"]) for o in lo if o["overlap"]]
        r["mid_buried_30ms"] = [(e["cue"], e["sfx_over_music_30ms_db"]) for e in mid if e["sfx_over_music_30ms_db"] < 3]
        r["mid_buried_120ms"] = [(e["cue"], e["sfx_over_music_db"]) for e in mid if e["sfx_over_music_db"] < 0]
        r["mid_buried_30ms_sixth"] = [(e["cue"], e["sfx_over_music_30ms_sixth_db"]) for e in mid if e["sfx_over_music_30ms_sixth_db"] < 3]
        r["n_mid_events"] = len(mid)
        if api:
            bw = lv[cond]["bgm"]["wav"]
            tl = api.timeline(bw)
            beats = tl["music"].get("beats") or []
            bi = np.diff(beats) if len(beats) > 1 else np.array([0])
            r["earshot_bgm"] = {"tempo": tl["music"].get("tempo"), "pulse_clarity": tl["music"].get("pulse_clarity"),
                                "beats": len(beats), "beat_interval_max_s": round(float(bi.max()), 3),
                                "beat_interval_median_s": round(float(np.median(bi)), 3), "gaps": [g_ for g_ in (tl.get("loudness") or {}).get("gaps", [])][:5] if isinstance(tl.get("loudness"), dict) else None,
                                "summary": tl.get("summary", "")[:600]}
        res["conditions"][cond] = r
        print(f"== {cond} ({r['code']}) mp4 {r['mp4_lufs_tp_lra']} clip {r['clip_samples']} mono {r['mono_lufs']} ({r['mono_minus_stereo_db']}) "
              f"md5 ok {r['video_md5_matches_source']} limiter {r['mix_limiter_db']} music peak {r['music_bus_peak_dbfs']}")
        print("   bed", r["bed"]); print("   beat audio", r["beat_audio"], " score", r.get("beat_score"))
        print("   sfx quiet", r["sfx_quiet_windows"], " low overlaps", r["low_overlaps"])
        print(f"   mid buried 30ms {len(r['mid_buried_30ms'])}/{r['n_mid_events']} {r['mid_buried_30ms']}  120ms {len(r['mid_buried_120ms'])}"
              f"  30ms 1/6oct {len(r['mid_buried_30ms_sixth'])} {r['mid_buried_30ms_sixth']}")
        print("   rule", r["rule_check"], " dips", r.get("band_dips"), " gain", r["master_gain_db"], " bed(BGM only)", r["bed_bgm_only"]["rms100_min_below_median_db"])
        if "earshot_bgm" in r:
            print("   earshot", {k: v for k, v in r["earshot_bgm"].items() if k != "summary"})
    json.dump(res, open(os.path.join(C.WORK, "qa_round2.json"), "w"), ensure_ascii=False, indent=1, default=str)
    if a.publish:
        by_condition(res, lv)


def by_condition(res, lv):
    """条件ごとの数値(記号が分かる値)は正解表のフォルダにだけ書く"""
    L = ["# 第2ラウンドの検査の条件ごとの数値(正解表の一部)", "",
         "> **試聴の評価が終わるまで利用者に見せない前提のファイルです。** ファイルの大きさ・LRA などから記号が分かるため、`../QA_ROUND2.md` から分けた。", "",
         "| 項目 | " + " | ".join(f"{c}(`{r['code']}`)" for c, r in res["conditions"].items()) + " |", "|---|" + "---|" * len(res["conditions"])]
    def row(name, f):
        L.append(f"| {name} | " + " | ".join(str(f(c, r)) for c, r in res["conditions"].items()) + " |")
    row("動画 統合 LUFS / 真のピーク dBTP / LRA", lambda c, r: " / ".join(str(v) for v in r["mp4_lufs_tp_lra"]))
    row("BGM だけ m4a LUFS / 真のピーク / LRA", lambda c, r: " / ".join(str(v) for v in r["bgm_m4a_lufs_tp_lra"]))
    row("動画 / BGM だけ のバイト数", lambda c, r: f"{lv[c]['mix']['bytes']} / {lv[c]['bgm']['bytes']}")
    row("比較パックのリミッター dB(動画 / BGM だけ)", lambda c, r: f"{lv[c]['mix']['limiter_db']} / {lv[c]['bgm']['limiter_db']}")
    row("仕上げのゲイン dB", lambda c, r: r["master_gain_db"])
    row("BGM(ミックスの中)100 ms 最小 dBFS / 中央値からの差 dB(10 ms ずらし)", lambda c, r: f"{r['bed']['rms100_min_dbfs']} / {r['bed']['rms100_min_below_median_db']}({r['bed']['rms100_min_at_s']} s)")
    row("同 50 ms", lambda c, r: f"{r['bed']['rms50_min_dbfs']} / {r['bed']['rms50_min_below_median_db']}")
    row("BGM だけ 100 ms 最小 / 中央値からの差", lambda c, r: f"{r['bed_bgm_only']['rms100_min_dbfs']} / {r['bed_bgm_only']['rms100_min_below_median_db']}")
    row("ルール 4 の合否(ベッド -15 dB 以内 / 静けさの窓 2 か所以上)", lambda c, r: f"{r['rule_check']['bgm_bed_within_limit']} / {r['rule_check']['sfx_quiet_ok']}")
    row("効果音の静けさの窓(始まり・終わりを除く)", lambda c, r: r["rule_check"]["sfx_quiet_windows_inner"])
    row("拍: 楽譜の発音のすき間の最大 s", lambda c, r: (r.get("beat_score") or {}).get("max_note_gap_s", "—"))
    row("拍: 音の立ち上がりのすき間の最大 s(BGM だけ)", lambda c, r: f"{r['beat_audio']['max_onset_gap_s']}({r['beat_audio']['max_onset_gap_at_s']} s から)")
    row("earshot テンポ / 拍の明瞭度 / 拍の間隔の最大 s", lambda c, r: (lambda e: f"{e['tempo']} / {e['pulse_clarity']} / {e['beat_interval_max_s']}" if e else "—")(r.get("earshot_bgm")))
    row("120 Hz 未満の重なり", lambda c, r: r["low_overlaps"] or "なし")
    row("中域で埋もれる: 30 ms・1/3 oct で < 3 dB", lambda c, r: f"{len(r['mid_buried_30ms'])}/{r['n_mid_events']} {r['mid_buried_30ms']}")
    row("中域で埋もれる: 30 ms・1/6 oct で < 3 dB", lambda c, r: f"{len(r['mid_buried_30ms_sixth'])} {r['mid_buried_30ms_sixth']}")
    row("中域で埋もれる: 120 ms で < 0 dB", lambda c, r: len(r["mid_buried_120ms"]))
    row("BGM の帯域を一瞬下げた窓(重複を除く)/ 最も深い dB", lambda c, r: (lambda d: f"{d['count']} / {d['deepest_db']}" if d else "なし")(r.get("band_dips")))
    row("モノラル LUFS(ステレオとの差)", lambda c, r: f"{r['mono_lufs']}({r['mono_minus_stereo_db']})")
    row("クリップ / 映像の MD5 一致", lambda c, r: f"{r['clip_samples']} / {r['video_md5_matches_source']}")
    p = os.path.join(C.REPO, "docs", "sound-upgrade", "answer_key", "QA_ROUND2_BY_CONDITION.md")
    open(p, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", p)


if __name__ == "__main__":
    main()
