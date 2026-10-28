#!/usr/bin/env python3
"""earshot の効果音バンクの検証(手順2)。用途別の代表を描画して形を測り、knob(dur / apex / pitch / seed)が
言った通りに効くかを数値で確かめる。1プロセスで回す(CLI は毎回起動が重いため)。モデルは使わない。
usage: $HOME/earshot_env/bin/python docs/sound-upgrade/scripts/earshot_probe.py [out.json]
出力: 標準出力に表、out.json(既定 docs/sound-upgrade/work/earshot_probe.json)に全数値。
"""
import json
import os
import sys
import time

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "claude-video-skill", "sound-kit"))
import sound_index as SI  # noqa: E402  measure() を共用(Kenney と同じ物差し)

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs", "sound-upgrade", "work", "earshot_probe.json")
GROUPS = {
    "Whoosh/Swish": ["whoosh_fast/crisp", "whoosh_fast/tight", "swish/soft", "swish/bright", "swipe/paper", "swipe/velvet", "swipe/cloth", "whoosh_big/thump"],
    "Cut Hit/Impact": ["cut_hit/punch", "cut_hit/kick", "pro_impact/short", "knock/wood", "knock/desk", "tap/soft"],
    "UI Pop/Click": ["ui_pop/soft", "ui_pop/step", "pro_pop_in/round", "fit/click/floss_lid", "pro_click/tink", "fit/land.light/fingertip_book"],
    "Reverse Swell/Riser": ["reverse_swell/dark", "reverse_swell/breath", "reverse_swell/cymbal", "riser/dark"],
    "Chime/Mallet": ["mallet/glock", "mallet/celesta", "mallet/marimba", "mallet/pluck", "notify/mid_tine", "pluck/kalimba_soft"],
    "Glitch/Shutter": ["glitch/mid", "glitch/burst", "shutter/dslr", "shutter/quick"],
    "Sub Hit": ["cut_hit/sub", "pro_sub_drop/quick", "pro_sub_drop/ref"],
}


def main():
    t0 = time.time()
    from earshot.forge import bank, sfx
    t_import = time.time() - t0
    res = {"import_s": round(t_import, 2), "groups": {}, "knobs": {}}
    first = True
    for g, ids in GROUPS.items():
        rows = []
        for i in ids:
            t = time.time()
            y, meta = bank.render(i, sr=48000)
            dt = time.time() - t
            m = SI.measure(y)
            m.update({"id": i, "render_s": round(dt, 3), "checks_ok": (meta.get("checks") or {}).get("ok"),
                      "warnings": (meta.get("checks") or {}).get("warnings")})
            if first:
                m["first_render_in_process"] = True; first = False
            rows.append(m)
        res["groups"][g] = rows
    # apex / dur: whoosh 系で目標の頂点にどれだけ合うか(自前の 1 ms 包絡でも測り直す)
    ap = []
    for i in ["whoosh_fast/crisp", "swipe/velvet", "swipe/paper", "swish/soft", "whoosh_big/thump"]:
        for dur, apex in [(0.6, 0.30), (0.8, 0.32), (1.15, 0.55), (0.45, 0.12)]:
            try:
                y, meta = bank.render(i, dur=dur, apex=apex, sr=48000)
                m = SI.measure(y)
                e = (meta.get("edits") or {}).get("apex") or {}
                ap.append({"id": i, "dur": dur, "apex": apex, "len_s": round(len(y) / 48000, 4),
                           "earshot_err_ms": e.get("err_ms"), "own_peak_s": m["peak_s"],
                           "own_err_ms": round((m["peak_s"] - apex) * 1000, 1), "ok": (meta.get("checks") or {}).get("ok")})
            except Exception as ex:  # noqa: BLE001
                ap.append({"id": i, "dur": dur, "apex": apex, "error": str(ex)[:160]})
    res["knobs"]["apex_dur"] = ap
    # pitch: 音程の指定が測った音程と合うか
    pt = []
    for i, notes in [("mallet/glock", ["Bb4", "Eb5", "G5"]), ("mallet/celesta", ["Eb5", "Bb5"]), ("ui_pop/soft", ["Eb4", "G4", "Bb4"]),
                     ("notify/mid_tine", ["G5", "Bb5"]), ("cut_hit/sub", ["Eb2"]), ("knock/wood", ["Bb4"]), ("whoosh_fast/crisp", ["C5"])]:
        for n in notes:
            try:
                y, meta = bank.render(i, pitch=n, sr=48000)
                e = (meta.get("edits") or {}).get("pitch") or {}
                pt.append({"id": i, "pitch": n, "measured_hz": e.get("measured_hz"), "cents_off": e.get("cents_off"), "ok": e.get("ok")})
            except Exception as ex:  # noqa: BLE001
                pt.append({"id": i, "pitch": n, "refused": str(ex)[:200]})
    res["knobs"]["pitch"] = pt
    # seed: テイク違いがどれだけ違うか(重心・長さのばらつき、包絡の相関)
    sd = []
    for i in ["ui_pop/soft", "fit/land.light/fingertip_book", "knock/wood", "fit/click/floss_lid", "swipe/paper"]:
        ms, envs = [], []
        for s in range(1, 6):
            y, meta = bank.render(i, seed=s, sr=48000)
            ms.append(SI.measure(y)); mono = np.asarray(y).mean(1) if np.ndim(y) == 2 else np.asarray(y)
            envs.append(np.sqrt(np.convolve(mono ** 2, np.ones(240) / 240, "same"))[::48])
        L = min(len(e) for e in envs); E = np.stack([e[:L] for e in envs])
        cc = np.corrcoef(E); off = cc[~np.eye(len(E), dtype=bool)]
        sd.append({"id": i, "centroid_hz": [m["centroid_hz"] for m in ms], "dur_s": [m["dur_s"] for m in ms],
                   "env_corr_mean": round(float(off.mean()), 3)})
    res["knobs"]["seed"] = sd
    res["total_s"] = round(time.time() - t0, 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(res, open(OUT, "w"), ensure_ascii=False, indent=1)
    for g, rows in res["groups"].items():
        print(f"== {g}")
        for m in rows:
            print(f'  {m["id"]:30s} {m["dur_s"]:5.2f}s atk {m["attack_ms"]:5.0f}ms t20 {m["t20_ms"]} t40 {m["t40_ms"]} '
                  f'cen {m["centroid_hz"]:6.0f}Hz lo150 {m["lo150"]:.2f} hi4k {m["hi4k"]:.2f} corr {m["corr"]:.2f} '
                  f'render {m["render_s"]:.2f}s ok={m["checks_ok"]} {m["warnings"] or ""}')
    print("== apex/dur"); [print("  ", r) for r in ap]
    print("== pitch"); [print("  ", r) for r in pt]
    print("== seed"); [print("  ", r) for r in sd]
    print("import", res["import_s"], "s  total", res["total_s"], "s")


if __name__ == "__main__":
    main()
