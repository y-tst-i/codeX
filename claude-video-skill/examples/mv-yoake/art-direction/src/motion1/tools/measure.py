#!/usr/bin/env python3
"""書き出した mp4(look)の画素から測る(描画のコードではなく、出来上がった動画から)。
- 各コマ: 平均の明るさ(黒コマ)、前のコマから変わった画素(|ΔY|>60)、琥珀の画素
- 音ハメ: 描画が強いアクセントに合わせた事象(plan.json の events)ごとに、測る領域の中で「変化の山(彫り)」または「琥珀・墨の増え始め(刷り)」のコマを探し、アクセントとのずれを出す
- 歌詞: 字ごとに、字の箱の中の「字らしい画素」(空の上・墨の上の字は明るい画素、夜明けの墨の字は暗い画素)の割合を、語頭の1コマ前を 0・カットの最後を 1 として、
  彫り(刷り)始め(1%)と読める(85%)のコマを出す
使い方: python3 -I measure.py <video.mp4> <plan.json> <timing.gen.js> <A|B> <out_dir>
出力: per_frame.csv、sync_measured.md、lyric_check.md、measure.json"""
import sys, os, json, csv, subprocess
import numpy as np

vid, plan_p, timing_p, part, out = sys.argv[1:6]
os.makedirs(out, exist_ok=True)
plan = json.load(open(plan_p, encoding="utf-8"))
tj = open(timing_p, encoding="utf-8").read(); T = json.loads(tj[tj.index("{"): tj.rindex("}") + 1])
shots = {s["id"]: s for s in T["shots"]}
F0, N = {"A": (0, shots["S5"]["start"]), "M": (shots["S5"]["start"], shots["S10"]["start"] - shots["S5"]["start"]), "B": (shots["S10"]["start"], T["frames"] - shots["S10"]["start"])}[part]
W, H = 1920, 1080

# ---- 事象(曲のコマ・アクセント・測る領域・種類)----
ev = []
def add(name, frame, box, kind, thr, acc=None):
    ev.append({"name": name, "frame": int(frame), "box": [int(v) for v in box], "kind": kind, "thr": thr, "accent": acc})
def cutp(cid): return next(v for v in plan.values() if (v.get("cut_id") or v.get("comp")) == cid)
lyr = []  # (字, 語頭, 箱, 明/暗, 最後のコマ, 確度の語)
if part == "A":
    e = cutp("S1")["events"]
    add("S1 最初の一刀①(左の水平)", e["a1"], [40, 820, 340, 920], "chg", 300, e["a1"]); add("S1 一刀②(45度と水平)", e["a2"], [300, 700, 700, 900], "chg", 300, e["a2"]); add("S1 一刀③(x=900 まで)", e["a3"], [650, 630, 930, 730], "chg", 300, e["a3"])
    for r in e["rings"]: add(f"S1 節の年輪 {r}", r, [1060, 180, 1540, 460], "chg", 60, r)
    c = cutp("S2"); e = c["events"]; L = c["letters"]
    sb = [min(L[0]["bb"][0], L[1]["bb"][0]) - 6, L[0]["bb"][1] - 6, max(L[0]["bb"][2], L[1]["bb"][2]) + 6, L[1]["bb"][3] + 6]
    add("S2 字の日に琥珀を刷る", e["sunPrint"], sb, "amber", 300, e["sunPrint"]); add("S2 町の光の側の刀(始まり)", e["city"][0], [56, 230, 1070, 712], "chg", 40, e["city"][0])
    for i, k in enumerate(e["knives"]): add(f"S2 影の白い刀 {i+1}", k, [[106, 410, 148, 432], [90, 574, 148, 596], [346, 550, 414, 572], [294, 636, 390, 660], [560, 594, 634, 616], [594, 666, 644, 688]][i], "chg", 20, k)
    add("S2 字の下から窓へ溝", e["via"], [1150, 716, 1560, 758], "chg", 60, e["via"]); add("S2 窓の桟を彫る", e["winCarve"], [884, 554, 944, 628], "chg", 150, e["winCarve"])
    add("S2 窓・壁・映りに琥珀", e["winPrint"] + 1, [850, 520, 1000, 900], "amber", 300, e["winPrint"] + 1); add("S2 窓のまわりの楔(内→外)", e["burst"], [560, 250, 1450, 705], "chg", 200, e["burst"])
    for ch, s in zip("暗闇の数だけ", e["letters"]):
        bb = next(x["bb"] for x in L if x["ch"] == ch); lyr.append((ch, s, bb, "light", shots["S2"]["end"] - 1, "だけ" if ch in "だけ" else ch))
    c = cutp("S3"); e = c["events"]; L = c["letters"]
    add("S3 提灯に琥珀", e["lanPrint"], [1180, 450, 1310, 620], "amber", 300, e["lanPrint"]); add("S3 岸の灯 2 つに琥珀", e["lit1"], [56, 150, 1864, 420], "amber", 40, e["lit1"])
    add("S3 輝きは増す: 残りの灯と映りの欠片", e["masu"], [1000, 600, 1500, 1030], "chg", 200, e["masu"])
    for w_ in e["waves"]: add(f"S3 岸の灯の映り {w_}", w_, [56, 330, 1864, 1030], "chg", 100, w_)
    for ch, s in zip("輝きは増す", e["letters"]):
        bb = next(x["bb"] for x in L if x["ch"] == ch); lyr.append((ch, s, bb, "light", shots["S3"]["end"] - 1, "輝きは増す"))
    c = cutp("S4"); e = c["events"]; L = c["letters"]; mb = c["mbox"]
    add("S4 窓1の桟を彫る", e["w1Carve"], mb["W1"], "chg", 150, e["w1Carve"]); add("S4 窓1に琥珀(ひとつ)", e["w1Print"], [mb["W1"][0] - 60, mb["W1"][1] - 60, mb["W1"][2] + 60, mb["W1"][3] + 60], "amber", 300, e["w1Print"])
    for k in e["g1Push"]: add(f"S4 溝①を押す {k}", k, [mb["G1"][0] - 10, mb["G1"][1] - 10, mb["G1"][2] + 10, mb["G1"][3] + 10], "chg", 30, k)
    add("S4 窓2の桟を彫る", e["w2Carve"], mb["W2"], "chg", 150, e["w2Carve"]); add("S4 窓2に琥珀(またひとつ)", e["w2Print"], [mb["W2"][0] - 60, mb["W2"][1] - 60, mb["W2"][2] + 60, mb["W2"][3] + 60], "amber", 300, e["w2Print"])
    for k in e["g2Push"][1:]: add(f"S4 溝②を押す {k}", k, [mb["G2"][0] - 10, mb["G2"][1] - 14, mb["G2"][2] + 10, mb["G2"][3] + 14], "chg", 20, k)
    dx = mb.get("camEndDx", 0); sh_ = lambda bx, d=dx: [bx[0] + d - 10, bx[1], bx[2] + d + 10, bx[3]]  # 第2段: S4 の後半はカメラが左へ動いた後(終わりの位置で測る)
    add("S4 3つ目の窓の枠", e["w3"], sh_(mb["W3"]), "chg", 30, e["w3"]); add("S4 3つ目の窓に琥珀", e["w3Print"], sh_([mb["W3"][0] - 50, mb["W3"][1] - 50, mb["W3"][2] + 50, mb["W3"][3] + 50]), "amber", 300, e["w3Print"])
    if "W4raw" in mb: add("S4 4つ目の窓に琥珀(枝の先)", e["w4Print"], sh_([mb["W4raw"][0] - 50, mb["W4raw"][1] - 50, mb["W4raw"][2] + 50, mb["W4raw"][3] + 50]), "amber", 300, e["w4Print"])
    for i, (ch, s) in enumerate(zip("ひとつ、", e["t1"])): lyr.append((ch, s, L[i]["bb"], "light", shots["S4"]["end"] - 1, "ひとつ、またひとつ"))
    for i, (ch, s) in enumerate(zip("またひとつ", e["t2"])): lyr.append((ch, s, L[4 + i]["bb"], "light", shots["S4"]["end"] - 1, "ひとつ、またひとつ"))
    for i, (ch, s) in enumerate(zip("繋がってく", e["t3"])): lyr.append((ch, s, L[9 + i]["bb"], "light", shots["S4"]["end"] - 1, "繋がってく"))
elif part == "M":
    c = cutp("S5"); e = c["events"]; mb = c["mbox"]; L = c["letters"]
    for k in e["heads"][:2]: add(f"S5 左から来る溝を押す {k}", k, mb["groove"], "chg", 30, k)
    add("S5 芯の最後の太い丸刀", e["hero"], mb["core"], "chg", 300, e["hero"]); add("S5 芯に琥珀(火が灯る)", e["hero"], mb["core"], "amber", 300, e["hero"])
    for ch, s_ in zip("夜明けの", e["t"]): lyr.append((ch, s_, next(x["bb"] for x in L if x["ch"] == ch), "light", shots["S5"]["end"] - 1, "夜明けの"))
    c = cutp("S6"); e = c["events"]; mb = c["mbox"]; L = c["letters"]
    add("S6 芯の琥珀が全面に(刷り替え)", e["flood"], [0, 0, W, H], "amber", 20000, e["flood"])
    for k in e["gPush"]: add(f"S6 畝を路から火へ押す {k}", k, [620, 300, 1300, 560], "ink", 300, k)  # 字(回路に)の箱を外した領域
    add("S6 火のまわりの面を一刀で彫り取る", e["face"], mb["face"], "chg", 2000, e["face"])
    for k in e["wedges"]: add(f"S6 楔 {k}", k, [1150, 40, 1600, 420], "chg", 150, k)
    T2 = [x for x in L if x["ch"] in "回路に"][:3]
    for x, s_ in zip(T2, e["t2"]): lyr.append((x["ch"], s_, x["bb"], "dark", shots["S6"]["end"] - 1, "回路に"))
    fh = next(x for x in L if x["ch"] == "火"); lyr.append(("火", e["hi"], fh["bb"], "dark", shots["S6"]["end"] - 1, "火を灯して"))
    for x, s_ in zip([x for x in L if x["ch"] in "を灯して"][-4:], e["t3"]): lyr.append((x["ch"], s_, x["bb"], "dark", shots["S6"]["end"] - 1, "火を灯して"))
    c = cutp("S7"); e = c["events"]; mb = c["mbox"]; L = c["letters"]
    for k in e["roof"]: add(f"S7 窓のまわりの屋根の刀 {k}", k, mb["roof"], "chg", 40, k)
    hb = L[7]["bb"]; add("S7 光 に琥珀", e["hikaPrint"], [hb[0] - 8, hb[1] - 8, hb[2] + 8, hb[3] + 8], "amber", 300, e["hikaPrint"])
    for k in e["push"]: add(f"S7 て から溝がほどけて窓へ {k}", k, mb["grooves"], "chg", 150, k)
    add("S7 窓に琥珀(設計は拍 991 の +2)", e["win"] + 2, mb["window"], "amber", 300, e["win"])
    for x, s_ in zip(L[:7], e["t1"]): lyr.append((x["ch"], s_, x["bb"], "light", shots["S7"]["end"] - 1, "消えかけた声を"))
    for x, s_ in zip(L[7:], e["t2"]): lyr.append((x["ch"], s_, x["bb"], "light", shots["S7"]["end"] - 1, "光に変えて"))
    c = cutp("S8"); e = c["events"]; mb = c["mbox"]; L = c["letters"]
    for k, bx in zip(e["rail"], ([56, 150, 669, 270], [870, 150, 1300, 330], [1250, 150, 1870, 480])): add(f"S8 レールを押して延ばす {k}(2.5D で動いている。字の箱を外した領域)", k, bx, "chg", 60, k)
    for i, k in enumerate(e["cars"]): add(f"S8 列車の {i+1} 両目に琥珀(設計は拍の +2)", k + 2, mb["train"], "amber", 300, k)
    add("S8 川が灯る(低音)", e["lit"], mb["water"], "chg", 1000, e["lit"])
    for x, s_ in zip(L[:5], e["t1"]): lyr.append((x["ch"], s_, x["bb"], "light", s_ + 10, "止まらない"))  # 2.5D で字が動くので、最後のコマでなく語頭+10 を 1 とする
    for x, s_ in zip(L[5:], e["t2"]): lyr.append((x["ch"], s_, x["bb"], "light", shots["S8"]["end"] - 1, "止まれない"))
    c = cutp("S9"); e = c["events"]; mb = c["mbox"]; L = c["letters"]
    add("S9 読点に琥珀(燃え残り)", e["comma"], mb["comma"], "amber", 200, e["comma"])
    for k in e["drop"]: add(f"S9 読点の下の溝を押す {k}", k, mb["drop"], "chg", 30, k)
    for x, s_ in zip(L[:3], e["t"]): lyr.append((x["ch"], s_, x["bb"], "light", 1300, "まだ、"))
    for x, s_ in zip(L[3:], e["t4"]): lyr.append((x["ch"], s_, x["bb"], "light", 1300, "光は" if x["ch"] in "光は" else "消えない"))
else:
    c = cutp("A"); e = c["events"]; mb = c["mbox"]
    add("1340 衝撃: 版ずれ+空の最初の一刀", e["hit"], [0, 0, W, H], "chg", 5000, e["hit"])
    for k in e["carve"]: add(f"空を押して彫る {k}", k, mb["sky"], "chg", 2000, k)
    add("信号が鉄塔に届く=太陽の縁・淡黄を刷る(1402 は統括の指定。アクセントではない)", e["arrive"], mb["sun"], "amber", 2000, None)
    for k in e["sunSteps"][1:]: add(f"太陽を一段上に刷り直す {k}", k, mb["sun"], "amber", 300, k)
    c = cutp("B"); e = c["events"]; L = c["letters"]
    add("信号が「明」の日の中へ届き、日の穴に琥珀を二度摺り", e["sigIn"], c["mbox"]["hi"], "deep", 300, e["sigIn"])
    names = ["夜", "が", "明", "け", "る"]; starts = [e["yo"], e["ga"], e["mei"], e["ke"], e["ru"]]
    for ch, s, x in zip(names, starts, L): lyr.append((ch, s, x["bb"], "dark", 1519, "夜" if ch == "夜" else "が明ける"))
    add("「明」を刷る", e["mei"], next(x["bb"] for x in L if x["ch"] == "明"), "ink", 3000, e["mei"])
    c = cutp("C"); e = c["events"]; mb = c["mbox"]
    add("題を墨で刷る", e["title"], mb["cart"], "ink", 500, e["title"]); add("信号が地平の鉄塔まで届く", e["arrive"], mb["pylon"], "amberAny", 10, e["arrive"])
    lyr.append(("題", e["title"], mb["cart"], "dark", F0 + N - 1, None))

# ---- 動画を読む ----
cmd = ["ffmpeg", "-v", "error", "-i", vid, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
rows, prev = [], None
reg = {i: [] for i in range(len(ev))}; lyrc = {i: [] for i in range(len(lyr))}
frames_last = {}
k = 0
while True:
    buf = p.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    a = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.int16)
    Y = a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    A = (r - b > 110) & (r - g > 70) & (r > 150) & (g < 150)  # 琥珀(淡黄・薔薇は除く)
    D = None if prev is None else (np.abs(Y - prev) > 60)
    row = {"local": k, "song": F0 + k, "mean_luma": round(float(Y.mean()), 2), "chg_total": 0 if D is None else int(D.sum()), "amber_total": int(A.sum())}
    for i, e_ in enumerate(ev):
        x0, y0, x1, y1 = e_["box"]
        if e_["kind"] == "chg": reg[i].append(0 if D is None else int(D[y0:y1, x0:x1].sum()))
        elif e_["kind"] in ("amber", "amberAny"): reg[i].append(int(A[y0:y1, x0:x1].sum()))
        elif e_["kind"] == "deep": reg[i].append(int(((r > 150) & (g < 75) & (b < 40))[y0:y1, x0:x1].sum()))
        else: reg[i].append(int((Y[y0:y1, x0:x1] < 80).sum()))
    for i, l in enumerate(lyr):
        x0, y0, x1, y1 = [int(v) for v in l[2]]; sub = Y[y0:y1 + 1, x0:x1 + 1]
        lyrc[i].append(float((sub > 150).mean()) if l[3] == "light" else float((sub < 80).mean()))
    rows.append(row); prev = Y; k += 1
p.wait()
assert len(rows) == N, (len(rows), N)
with open(os.path.join(out, "per_frame.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
L_ = lambda s: s - F0
acc = {a["frame30"]: a for a in T["accents"]}
res_ev = []
for i, e_ in enumerate(ev):
    v = reg[i]; f = e_["frame"]; lo, hi = max(1, L_(f) - 4), min(N - 1, L_(f) + 6)
    if e_["kind"] == "chg":
        win = list(range(max(1, L_(f) - 3), min(N, L_(f) + 4))); pk = max(win, key=lambda j: v[j]); m = F0 + pk if v[pk] > e_["thr"] else None; val = v[pk]
    else:
        base = v[max(0, L_(f) - 5)]; m = None; val = 0
        for j in range(lo, hi + 1):
            if (v[j] - base > e_["thr"]) if e_["kind"] != "amberAny" else (v[j] - base > e_["thr"]): m = F0 + j; val = v[j] - base; break
    a = acc.get(e_["accent"]) if e_["accent"] is not None else None
    res_ev.append({**e_, "measured": m, "diff": None if m is None or e_["accent"] is None else m - e_["accent"], "value": val, "strength": a["strength"] if a else None, "kick": a.get("kick") if a else None})
# 強いアクセント(0.7 以上)のうち、合わせなかった物
used = {e_["accent"] for e_ in ev if e_["accent"] is not None}
strong_unused = [a["frame30"] for a in T["accents"] if F0 <= a["frame30"] < F0 + N and a["strength"] >= 0.7 and a["frame30"] not in used]
words = {w["text"]: w for w in T["words"]}; phrases = {p["text"]: p for p in T["phrases"]}
res_ly = []
for i, l in enumerate(lyr):
    ch, s, bb, kind, last, word = l; v = lyrc[i]; cutstart = s in (0, 141, 291, 409, 669, 769, 864, 1002, 1173, 1340, 1431, 1520); base = 0.0 if cutstart else v[max(0, L_(s) - 1)]; fin_ = v[L_(min(last, F0 + N - 1))]  # 語頭がカットの頭なら、前のコマは別の絵なので 0 から
    prog = [(x - base) / max(1e-6, fin_ - base) for x in v]
    st = next((F0 + j for j in range(max(0, L_(s) - (0 if cutstart else 2)), N) if prog[j] > 0.01), None); rd = next((F0 + j for j in range(max(0, L_(s) - (0 if cutstart else 2)), N) if prog[j] >= 0.85), None)
    conf = (words.get(word) or phrases.get(word) or {}).get("confidence") if word else None
    res_ly.append({"char": ch, "onset": s, "word": word, "confidence": conf, "start": st, "start_diff": None if st is None else st - s, "readable85": rd, "readable_diff": None if rd is None else rd - s})
black = [r["song"] for r in rows if r["mean_luma"] < 8]
res = {"part": part, "frames": N, "song_range": [F0, F0 + N - 1], "black_frames": black, "min_mean_luma": min(r["mean_luma"] for r in rows), "events": res_ev, "strong_accents_not_used": strong_unused, "lyrics": res_ly}
json.dump(res, open(os.path.join(out, "measure.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
with open(os.path.join(out, "sync_measured.md"), "w", encoding="utf-8") as f:
    f.write("| 事象 | 合わせたアクセント(曲のコマ) | 強さ | 低音 | 実測(動画の画素) | ずれ(コマ) | 測り方 |\n|---|---:|---:|---:|---:|---:|---|\n")
    for x in res_ev:
        d = "" if x["diff"] is None else f"{x['diff']:+d}"
        how = {"chg": "領域の変化画素の山(±3)", "amber": "琥珀の増え始め", "amberAny": "琥珀の増え始め", "ink": "墨の画素の増え始め", "deep": "二度摺りの濃い琥珀の増え始め"}[x["kind"]]
        f.write(f"| {x['name']} | {x['accent'] if x['accent'] is not None else '(規則: ' + str(x['frame']) + ')'} | {x['strength'] if x['strength'] is not None else ''} | {x['kick'] if x['kick'] is not None else ''} | {x['measured'] if x['measured'] is not None else '検出なし'} | {d} | {how} |\n")
    f.write(f"\n強いアクセント(0.7 以上)で、何も合わせなかった物: {strong_unused}\n")
with open(os.path.join(out, "lyric_check.md"), "w", encoding="utf-8") as f:
    f.write("| 字 | 語頭(曲のコマ) | 確度 | 彫り・刷り始め(実測、1%) | ずれ | 読める(85%) | 語頭から |\n|---|---:|---|---:|---:|---:|---:|\n")
    for x in res_ly:
        f.write(f"| {x['char']} | {x['onset']} | {x['confidence'] or '(推定)'} | {x['start']} | {'' if x['start_diff'] is None else '%+d' % x['start_diff']} | {x['readable85']} | {'' if x['readable_diff'] is None else '+%d' % x['readable_diff']} |\n")
print(json.dumps({"black": black, "min_luma": res["min_mean_luma"], "events_diff": [(x["name"], x["diff"]) for x in res_ev], "unused": strong_unused}, ensure_ascii=False))
for x in res_ly: print(x["char"], x["onset"], x["start_diff"], x["readable_diff"])
