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
    ap = argparse.ArgumentParser(); ap.add_argument("--earshot", action="store_true")
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
        bgm = rd(d, "raw_bgm_only.wav") * g
        mus, sfx = rd(d, "stem_music.wav"), rd(d, "stem_sfx.wav")
        mp4 = lv[cond]["mix"]["file"]
        x = qa.decode(mp4)
        r = {"code": lv[cond]["code"], "mp4_lufs_tp_lra": C.ebur(mp4), "clip_samples": int((np.abs(x) >= 0.999).sum()),
             **{k: v for k, v in qa.mono(mp4, x).items() if k != "mono_sections"},
             "video_md5": lv[cond]["mix"]["video_md5"], "video_md5_matches_source": lv[cond]["mix"]["video_md5"] == lv["_source_video_md5"],
             "bgm_m4a_lufs_tp_lra": [lv[cond]["bgm"]["lufs"], lv[cond]["bgm"]["tp"], lv[cond]["bgm"]["lra"]],
             "mix_limiter_db": m["limiter_max_db"], "music_bus_peak_dbfs": m.get("music_bus_peak_dbfs_after_gain"),
             "bed": BM.bed_stats(bgm), "beat_audio": BM.beat_stats(bgm), "sfx_quiet_windows": sfx_quiet(sfx)}
        on = os.path.join(C.WORK, d, "onsets.json")
        if os.path.exists(on):
            r["beat_score"] = BM.notes_gap(json.load(open(on))["onsets"])
        ev = qa.overlap(events, mus, sfx)
        lo = qa.low_overlap(events, mus, sfx)
        mid = [e for e in ev if 250 <= np.median(e["bands_hz"]) <= 4000]
        r["low_overlaps"] = [(o["cue"], o["sfx_low_dbfs"], o["music_low_dbfs"]) for o in lo if o["overlap"]]
        r["mid_buried_30ms"] = [(e["cue"], e["sfx_over_music_30ms_db"]) for e in mid if e["sfx_over_music_30ms_db"] < 3]
        r["mid_buried_120ms"] = [(e["cue"], e["sfx_over_music_db"]) for e in mid if e["sfx_over_music_db"] < 0]
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
        print(f"   mid buried 30ms {len(r['mid_buried_30ms'])}/{r['n_mid_events']} {r['mid_buried_30ms']}  120ms {len(r['mid_buried_120ms'])}")
        if "earshot_bgm" in r:
            print("   earshot", {k: v for k, v in r["earshot_bgm"].items() if k != "summary"})
    json.dump(res, open(os.path.join(C.WORK, "qa_round2.json"), "w"), ensure_ascii=False, indent=1, default=str)


if __name__ == "__main__":
    main()
