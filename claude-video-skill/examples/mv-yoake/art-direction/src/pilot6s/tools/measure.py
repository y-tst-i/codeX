#!/usr/bin/env python3
"""6秒試作の書き出し(mp4 から取り出した PNG)を測る。描画のコードではなく、出来上がった動画の画素から測る。
- 字ごとの彫れた割合(最後のコマに対する割合)→ 彫り始めのコマ・読めるコマ(85%)を、歌詞の語頭(lyric_timeline.json)と比べる
- 色版(琥珀)の画素: 字の日・窓の2か所に分けて数える → 刷りの始まりのコマ
- 空・川・回路の線・窓・町の領域ごとの「前のコマから変わった画素」→ 彫りの一撃のコマ → 曲のアクセントとのずれの表
- 黒コマ(平均の明るさ)
使い方: python3 -I measure.py <frames_dir> <plan.json> <timing.gen.js> <out_dir>
出力: per_frame.csv、lyric_check.md、sync_measured.md、measure.json"""
import sys, os, json, csv
import numpy as np
from PIL import Image

fdir, plan_p, timing_p, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
plan = json.load(open(plan_p, encoding="utf-8"))
tj = open(timing_p, encoding="utf-8").read(); T = json.loads(tj[tj.index("{"): tj.rindex("}") + 1])
F0, F1 = T["range"]; N = F1 - F0
files = sorted(f for f in os.listdir(fdir) if f.endswith(".png"))
assert len(files) == N, (len(files), N)

# 領域(描画の座標。1920×1080)
R = {
    "window": (870, 540, 990, 700),        # 灯る窓と照らされた壁(色版を数える)
    "panes": (884, 554, 944, 628),          # 窓の桟の中(窓を彫ったコマを見る)
    "circuit": (930, 640, 1545, 750),       # 字の足もとから窓への線(窓の領域を除いて数える)
    "sky": (60, 60, 1480, 700),             # 空(字の列より左。町も含む → 変化の画素で見る)
    "water": (60, 770, 1500, 1025),         # 川
    "city": (60, 230, 1070, 705),           # 町
}
L = plan["letters"]
def box(a):
    x0, y0, x1, y1 = a; return (int(x0), int(y0), int(x1) + 1, int(y1) + 1)

def load(i):
    return np.asarray(Image.open(os.path.join(fdir, files[i])).convert("RGB")).astype(np.int16)

def lum(a):
    return (a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114)

def amber(a):  # 琥珀の色版: 赤が強く青が弱い(紙は 236,227,205、墨は 20,23,31)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (r - b > 90) & (r - g > 45) & (r > 120)

rows, prev = [], None
last = load(N - 3)  # 版ずれの前の、彫り終えたコマ(曲の 318)を基準にする
lastL = lum(last)
let_final, let_base = [], []  # 字の枠には、最初のコマから彫ってある土手の線などが入るので、最初のコマを 0 として測る
firstL = lum(load(0))
for l in L:
    x0, y0, x1, y1 = box(l["bb"]); let_final.append(float((lastL[y0:y1, x0:x1] > 128).mean())); let_base.append(float((firstL[y0:y1, x0:x1] > 128).mean()))
for i in range(N):
    a = load(i); Y = lum(a); A = amber(a)
    row = {"local": i, "song": F0 + i, "mean_luma": round(float(Y.mean()), 2)}
    for k, l in enumerate(L):
        x0, y0, x1, y1 = box(l["bb"]); row["let_" + l["ch"]] = round((float((Y[y0:y1, x0:x1] > 128).mean()) - let_base[k]) / max(1e-6, let_final[k] - let_base[k]), 3)
    sx0, sy0 = int(min(L[0]["bb"][0], L[1]["bb"][0])) - 6, int(L[0]["bb"][1]) - 6
    sx1, sy1 = int(max(L[0]["bb"][2], L[1]["bb"][2])) + 6, int(L[1]["bb"][3]) + 6
    row["amber_sun"] = int(A[sy0:sy1, sx0:sx1].sum())
    x0, y0, x1, y1 = R["window"]; row["amber_window"] = int(A[y0:y1, x0:x1].sum())
    row["amber_total"] = int(A.sum())
    row["amber_places"] = int(row["amber_sun"] > 200) + int(row["amber_window"] > 200)  # 字の日(2字で1か所の版)+窓
    for name in ("sky", "water", "city", "circuit", "window", "panes"):
        x0, y0, x1, y1 = R[name]
        sub = Y[y0:y1, x0:x1]
        row["carved_" + name] = round(float((sub > 128).mean()), 4)
        if prev is None: row["chg_" + name] = 0
        else:
            d = np.abs(Y[y0:y1, x0:x1] - prev[y0:y1, x0:x1]) > 60
            if name == "circuit":  # 窓の領域を除く
                wx0, wy0, wx1, wy1 = R["window"]; d[max(0, wy0 - y0):wy1 - y0, max(0, wx0 - x0):wx1 - x0] = False
            row["chg_" + name] = int(d.sum())
    row["chg_total"] = 0 if prev is None else int((np.abs(Y - prev) > 60).sum())
    rows.append(row); prev = Y
with open(os.path.join(out, "per_frame.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

S = lambda i: F0 + i
def first(pred, start=0):
    for i in range(start, N):
        if pred(rows[i]): return i
    return None

# ---- 歌詞(字の彫り)----
words = {w["text"]: w for w in T["words"]}
want = [("暗", "暗"), ("闇", "闇"), ("の", "の"), ("数", "数"), ("だ", "だけ"), ("け", "だけ")]
lyr = []
for ch, wname in want:
    k = "let_" + ch
    s = first(lambda r: r[k] > 0.01); rd = first(lambda r: r[k] >= 0.85); full = first(lambda r: r[k] >= 0.98)
    on = words[wname]["start"]
    lyr.append({"char": ch, "word": wname, "onset": on, "confidence": words[wname]["confidence"],
                "carve_start": S(s) if s is not None else None, "start_diff": (S(s) - on) if s is not None else None,
                "readable85": S(rd) if rd is not None else None, "readable_diff": (S(rd) - on) if rd is not None else None,
                "full98": S(full) if full is not None else None})

# ---- 刷り ----
sun_print = first(lambda r: r["amber_sun"] > 200)
sun_full = first(lambda r: r["amber_sun"] >= 0.95 * rows[N - 3]["amber_sun"])
win_print = first(lambda r: r["amber_window"] > 200)
win_full = first(lambda r: r["amber_window"] >= 0.95 * rows[N - 3]["amber_window"])

# ---- 彫りの一撃(領域ごとの変化の始まり)----
def onset(name, start_song, thr):
    i = first(lambda r: r["chg_" + name] > thr, start_song - F0); return S(i) if i is not None else None
ev = {
    "sun_print": S(sun_print) if sun_print is not None else None,
    "window_print": S(win_print) if win_print is not None else None,
    "circuit_carve": onset("circuit", plan["E"]["dake"] + 1, 150),
    "window_carve": onset("panes", plan["E"]["via"] + 1, 150),
    "sky_burst": onset("sky", plan["E"]["winPrint"] + 3, 400),
    "water_reflection": onset("water", plan["E"]["kagayaki"], 400),
    "city_detail": onset("city", plan["E"]["no"] + 1, 60),
}
# 291 輝きは増す: 空の彫った割合の増え方(283〜300)
sky = [r["carved_sky"] for r in rows]
thick = {S(i): round(sky[i] - sky[i - 1], 4) for i in range(1, N) if 280 <= S(i) <= 302}

acc = [a for a in T["accents"] if F0 <= a["frame30"] < F1]
intent = {  # アクセント → この試作でそこに合わせた事象(合わせないアクセントは空)
    plan["E"]["sunPrint"]: ("字の日に色版を刷る(ばれん)", "sun_print"),
    plan["E"]["city"][0]: ("町の光の側の彫り(太陽に近い建物から)", "city_detail"),
    plan["E"]["via"]: ("字の足もとのビア+回路の線を彫り始める", "circuit_carve"),
    plan["E"]["winCarve"]: ("窓を彫る(線が届く)", "window_carve"),
    plan["E"]["winPrint"] + 1: ("窓に色版(1コマ手前に刷る=274の手前)", "window_print"),
    plan["E"]["skyBurst"]: ("地平に近い空の筋を彫る", "sky_burst"),
    plan["E"]["water"]: ("川の映りを彫る", "water_reflection"),
}
sync = []
for a in acc:
    f = a["frame30"]; it = intent.get(f)
    m = ev.get(it[1]) if it else None
    # このアクセントの ±1 コマに、何かの彫り・刷りが始まったか(全体の変化の画素)
    near = [rows[i]["chg_total"] for i in range(max(1, f - F0 - 1), min(N, f - F0 + 2))]
    sync.append({"accent": f, "strength": a["strength"], "kick": a["kick"], "intended": it[0] if it else "(合わせない)",
                 "measured": m, "diff": (m - f) if m is not None else None, "chg_total_pm1_max": max(near) if near else 0})

res = {"frames": N, "black_frames": [S(r["local"]) for r in rows if r["mean_luma"] < 8], "lyrics": lyr, "events": ev,
       "sun_print_full": S(sun_full) if sun_full is not None else None, "window_print_full": S(win_full) if win_full is not None else None,
       "sky_carved_delta_280_302": thick, "sync": sync,
       "amber_places_max": max(r["amber_places"] for r in rows), "amber_px_last": rows[N - 1]["amber_total"],
       "first_frame_mean_luma": rows[0]["mean_luma"], "first_frame_carved": {k: rows[0]["carved_" + k] for k in ("sky", "water", "city")}}
json.dump(res, open(os.path.join(out, "measure.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

with open(os.path.join(out, "lyric_check.md"), "w", encoding="utf-8") as f:
    f.write("| 字 | 語 | 語頭(lyric_timeline) | 確度 | 彫り始め(実測、字の面積の1%) | ずれ | 読める(85%) | 語頭から | 彫り終え(98%) |\n|---|---|---:|---|---:|---:|---:|---:|---:|\n")
    for x in lyr:
        f.write(f"| {x['char']} | {x['word']} | {x['onset']} | {x['confidence']} | {x['carve_start']} | {x['start_diff']:+d} | {x['readable85']} | +{x['readable_diff']} | {x['full98']} |\n")
with open(os.path.join(out, "sync_measured.md"), "w", encoding="utf-8") as f:
    f.write("| アクセント(曲のコマ) | 強さ | 低音 | 合わせた事象 | 実測の始まり | ずれ(コマ) | ±1コマの変化画素の最大 |\n|---:|---:|---:|---|---:|---:|---:|\n")
    for x in sync:
        d = "" if x["diff"] is None else f"{x['diff']:+d}"
        f.write(f"| {x['accent']} | {x['strength']} | {x['kick']} | {x['intended']} | {x['measured'] if x['measured'] is not None else ''} | {d} | {x['chg_total_pm1_max']} |\n")
print(json.dumps({k: res[k] for k in ("events", "black_frames", "amber_places_max", "sun_print_full", "window_print_full")}, ensure_ascii=False))
for x in lyr: print(x)
for x in sync: print(x)
print("sky delta", thick)
