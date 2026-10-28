#!/usr/bin/env python3
"""earshot の分析を比較パックの 3 本(A / B / C)に1プロセスでかける(モデルは1回だけ読む)。
measure(モデルなし)/ timeline(映像と合図に対する同期)/ sheet(注釈つき PNG)/ critique(7 本の SaaS・AI 宣伝動画の
傾向との比較)/ describe・match(大チェックとタイトル着地の短い区間)/ sfx check(B と C で使った earshot の素材)。
注意(earshot docs/LIMITS.md): 好み・感情・ブランドらしさは判断できない。critique の範囲は作者が選んだ 7 本の様式で、
静かな映像には当てはまらない規則がある。点数の良さだけで採用を決めない。
usage: EARSHOT_HOME=$HOME/earshot_env/home $HOME/earshot_env/bin/python listen_earshot.py
出力: WORK/earshot/<記号>_*.json / .png、WORK/earshot/summary.json
"""
import glob
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402


def short(d, keys):
    return {k: d.get(k) for k in keys if k in d}


def main():
    from earshot import api
    out = os.path.join(C.WORK, "earshot"); os.makedirs(out, exist_ok=True)
    key = json.load(open(os.path.join(C.WORK, "compare_key.json")))
    lv = json.load(open(os.path.join(C.WORK, "compare_levels.json")))
    cues = {"fps": 30, "events": [{"f": C.CUES[n], "kind": n} for n in
                                  ["card_land_1", "card_land_6_all", "select_click", "expand_land", "step_check_1", "step_check_2",
                                   "step_check_3", "main_check", "back_click", "count_roll", "count_lock", "portal_end",
                                   "bar_today_land", "title_land", "icon_pop"]]}
    cj = os.path.join(out, "cues_earshot.json"); json.dump(cues, open(cj, "w"))
    summ = {"timing_s": {}}
    t0 = time.time()
    for cond in "ABC":
        code = key[cond]; wav, mp4 = lv[cond]["wav"], lv[cond]["mp4"]
        r = {"code": code}
        t = time.time(); m = api.measure(wav); r["measure"] = short(m, ["lufs", "true_peak_db", "lra", "loudness", "crest_db", "bandwidth_hz", "centroid_hz", "tempo_bpm", "key"])
        json.dump(m, open(os.path.join(out, f"{code}_measure.json"), "w"), default=str, indent=1)
        summ["timing_s"][f"{code}_measure"] = round(time.time() - t, 1)
        t = time.time(); tl = api.timeline(wav, video=mp4, cues=cj)
        json.dump(tl, open(os.path.join(out, f"{code}_timeline.json"), "w"), default=str, indent=1)
        r["timeline_summary"] = tl.get("summary"); r["timeline_sync"] = tl.get("sync")
        summ["timing_s"][f"{code}_timeline"] = round(time.time() - t, 1)
        t = time.time(); sh = api.sheet(wav, os.path.join(out, f"{code}_sheet.png"), video=mp4, cues=cj, tl=tl)
        r["sheet"] = sh.get("png"); summ["timing_s"][f"{code}_sheet"] = round(time.time() - t, 1)
        t = time.time(); cr = api.critique(wav, video=mp4)
        json.dump(cr, open(os.path.join(out, f"{code}_critique.json"), "w"), default=str, indent=1)
        r["critique_summary"] = cr.get("summary"); r["critique_verdict"] = cr.get("verdict")
        summ["timing_s"][f"{code}_critique"] = round(time.time() - t, 1)
        t = time.time()
        a, b = C.T("main_check") - 0.05, C.T("main_check") + 0.45
        r["describe_main_check"] = api.describe(wav, start=a, end=b).get("summary")
        r["match_main_check"] = short(api.match(wav, "a soft click and a gentle bright confirmation chime",
                                                alts=["a harsh electronic beep", "a cheap video game blip"], start=a, end=b), ["summary", "verdict", "z"])
        a, b = C.T("title_land") - 0.05, C.T("title_land") + 0.6
        r["describe_title_land"] = api.describe(wav, start=a, end=b).get("summary")
        r["match_title_land"] = short(api.match(wav, "a warm piano chord resolving with a soft low thud",
                                                alts=["a loud cinematic boom", "a synthesizer stab"], start=a, end=b), ["summary", "verdict", "z"])
        r["realness_whole"] = short(api.realness(wav), ["p_real", "verdict", "summary"])
        summ["timing_s"][f"{code}_describe_match_realness"] = round(time.time() - t, 1)
        summ[cond] = r
        print(f"== {cond} ({code})\n  measure: {r['measure']}\n  timeline: {r['timeline_summary']}\n  critique: {r['critique_summary']}\n"
              f"  describe main_check: {r['describe_main_check']}\n  match main_check: {r['match_main_check']}\n"
              f"  describe title_land: {r['describe_title_land']}\n  match title_land: {r['match_title_land']}\n  realness: {r['realness_whole']}")
    # sfx check: B のキットの全テイクと C で使った earshot の素材
    t = time.time(); chk = []
    for p in sorted(glob.glob(os.path.join(C.KIT, ".cache", "earshot", "kit_hitotsuzutsu_B", "*.wav"))):
        c = api.sfx_check(p); chk.append({"file": os.path.basename(p), "ok": c.get("ok"), "warnings": [w.get("code") for w in c.get("warnings", [])]})
    for p in sorted(glob.glob(os.path.join(C.KIT, ".cache", "earshot", "*.wav"))):
        c = api.sfx_check(p); chk.append({"file": os.path.basename(p), "ok": c.get("ok"), "warnings": [w.get("code") for w in c.get("warnings", [])]})
    summ["sfx_check"] = chk; summ["timing_s"]["sfx_check"] = round(time.time() - t, 1)
    print("sfx check:", sum(1 for c in chk if c["ok"]), "/", len(chk), "clean;", [c for c in chk if not c["ok"]])
    summ["timing_s"]["total"] = round(time.time() - t0, 1)
    json.dump(summ, open(os.path.join(out, "summary.json"), "w"), ensure_ascii=False, indent=1, default=str)
    print("timing", summ["timing_s"])


if __name__ == "__main__":
    main()
