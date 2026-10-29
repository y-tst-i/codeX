#!/usr/bin/env python3
"""C(ハイブリッド)の素材選びの下調べ: 用途ごとに Kenney と earshot の候補を同じ文で earshot rank にかけ、
realness(録音らしさの推定)も付ける。モデル(CLAP / AST)は1プロセスで1回だけ読む。
これは「選ぶ材料の1つ」で、点数だけでは決めない(docs/sound-upgrade/CUE_SHEET.md に、何を採ったか・なぜかを書く)。
usage: EARSHOT_HOME=$HOME/earshot_env/home $HOME/earshot_env/bin/python docs/sound-upgrade/scripts/rank_candidates.py
出力: docs/sound-upgrade/work/rank_candidates.json と標準出力の表
"""
import json
import os
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
KIT = os.path.join(ROOT, "claude-video-skill", "sound-kit")
sys.path.insert(0, KIT); sys.path.insert(0, os.path.join(KIT, "tools"))
import earshot_cache  # noqa: E402
import sfx_lib  # noqa: E402

ROLES = {
    "card_land": ("a light paper card placed softly on a desk",
                  ["impactGeneric_light_000", "impactGeneric_light_002", "bookPlace1", "bookPlace3", "bookClose", "drop_002", "drop_003",
                   "impactSoft_medium_001", "footstep_carpet_000", "cloth1"],
                  ["fit/land.light/fingertip_book", "tap/soft", "knock/wood", "ui_pop/soft", "fit/land.light/finger_wood"]),
    "click": ("a soft quiet computer mouse click",
              ["click_001", "click_002", "click_003", "select_001", "switch_002", "toggle_001", "tick_001", "metalClick"],
              ["fit/click/floss_lid", "pro_click/mouse", "click/soft", "fit/snap/switch_flip"]),
    "swipe": ("a short soft paper swipe whoosh",
              ["cloth1", "cloth3", "bookFlip1", "bookFlip2", "maximize_001", "minimize_001", "scratch_001"],
              ["swipe/paper", "swipe/cloth", "swish/soft", "fit/whoosh.short/bamboo_swish", "whoosh_fast/tight"]),
    "check": ("a gentle satisfying tick of a checkbox",
              ["switch_002", "switch_004", "toggle_002", "toggle_004", "select_003", "confirmation_001", "pluck_001", "drop_001"],
              ["ui_pop/soft", "knock/wood", "mallet/pluck", "fit/tick/domino", "notify/mid_wood"]),
    "counter": ("a small mechanical counter digit flipping",
                ["scroll_001", "scroll_003", "tick_002", "switch_005", "metalLatch"],
                ["pro_hover_tick/soft", "shutter/quick", "fit/tick/domino", "click/thock"]),
    "title_land": ("a soft heavy thud of a book landing on a table",
                   ["impactSoft_heavy_000", "impactSoft_heavy_002", "bookPlace2", "bookClose", "impactWood_heavy_000", "impactPlank_medium_000"],
                   ["cut_hit/sub", "pro_pop_in/deep", "fit/hit/bamboo_tok", "knock/desk"]),
    "pop": ("a soft round pop of an icon appearing",
            ["drop_003", "pluck_002", "bong_001", "maximize_003", "glass_001"],
            ["fit/pop/mouth_plop", "ui_pop/soft", "ui_pop/wide", "pro_pop_in/round", "fit/pop/lip_pop"]),
}


def main():
    from earshot import api
    t0 = time.time()
    out = {}
    for role, (q, ken, ear) in ROLES.items():
        paths, label = [], {}
        for n in ken:
            try:
                p = sfx_lib.path(n); paths.append(p); label[p] = ("kenney", n)
            except KeyError:
                print("  (no such Kenney sound)", n)
        for i in ear:
            p = earshot_cache.take_path(i)[0]; paths.append(p); label[p] = ("earshot", i)
        r = api.rank(paths, q)
        rows = []
        for x in r["results"]:
            src, name = label[x["path"]]
            rl = api.realness(x["path"])
            rows.append({"source": src, "name": name, "z": x["z"], "verdict": x["verdict"], "sounds_most_like": x["sounds_most_like"],
                         "p_real": None if rl.get("p_real") is None else round(float(rl["p_real"]), 3), "real_verdict": rl.get("verdict")})
        out[role] = {"query": q, "rows": rows}
        print(f"== {role}: '{q}'")
        for x in rows:
            print(f'  {x["source"]:7s} {x["name"]:30s} z {x["z"]:+5.2f} {x["verdict"]:9s} real {x["p_real"] if x["p_real"] is None else round(x["p_real"], 2)} ({x["real_verdict"]})  ~ {x["sounds_most_like"]}')
    out["_seconds"] = round(time.time() - t0, 1)
    p = os.path.join(ROOT, "docs", "sound-upgrade", "work", "rank_candidates.json")
    json.dump(out, open(p, "w"), ensure_ascii=False, indent=1)
    print("seconds", out["_seconds"])


if __name__ == "__main__":
    main()
