#!/usr/bin/env python3
"""ショット表の台帳を機械で検査し、SYNC_TABLE.md を書く(汎用。LUMIWAKE の sync_check.py を一般化)。
検査: ①ショットが 0〜frames を隙間・重なりなく覆う ②各事象がショットの範囲に入る
      ③kind=acc は |frame - アクセントの frame30| <= 1 ④kind=vocal は lyric_timeline の句か語の start と一致
      ⑤強いアクセント(強さ>=0.8 か 低音>=0.5)を全部割り当てたか ⑥lyric_timeline の区間の境目が、ショットの境目か事象にあるか
      ⑦全面の衝撃(what に「全面の衝撃」)が3回以内
使い方: python3 -I cue_check.py <cues.json> <sync_map.json> <lyric_timeline.json> [出力.md]
"""
import json, sys
cues, sm, lt = (json.load(open(p, encoding="utf-8")) for p in sys.argv[1:4]); out = sys.argv[4] if len(sys.argv) > 4 else None
fps, N = cues["fps"], cues["frames"]; acc = {a["frame30"]: a for a in sm["accents"]}; ok = True; msgs = []
def bad(m):
    global ok; ok = False; msgs.append(m); print(m)
pos = 0
for s in cues["shots"]:
    if s["start"] != pos: bad(f"隙間/重なり: {s['id']} start {s['start']} (期待 {pos})")
    pos = s["end"]
if pos != N: bad(f"合計 {pos} != {N}")
starts = {}
for L in lt["lines"]:
    for p in L["phrases"]:
        starts[p["start"]] = (p["text"], p["confidence"])
        for w in p.get("words", []): starts[w["start"]] = (w["text"], w["confidence"])
used = set(); rows = []
for e in cues["events"]:
    s = next((x for x in cues["shots"] if x["id"] == e["shot"]), None)
    if not s or not (s["start"] <= e["frame"] < s["end"]): bad(f"事象がショットの外: {e['frame']} {e['shot']}")
    if e["kind"] == "acc":
        a = acc.get(e["acc"])
        if not a: bad(f"アクセントが無い: {e}"); continue
        lag = e["frame"] - a["frame30"]; used.add(a["frame30"])
        if abs(lag) > 1: bad(f"ずれ {lag}: {e['frame']} vs {a['frame30']}")
        rows.append((e["frame"], e["shot"], f"アクセント {a['frame30']}({a['t']:.2f}s 強さ{a['strength']:.2f}/低音{a['kick']:.2f})", f"{lag:+d}", e["what"]))
    elif e["kind"] == "vocal":
        if e["frame"] not in starts: bad(f"歌の語頭が lyric_timeline に無い: {e['frame']}")
        t, c = starts.get(e["frame"], ("?", "?"))
        rows.append((e["frame"], e["shot"], f"歌「{t}」の語頭({c})", "0", e["what"]))
    else:
        rows.append((e["frame"], e["shot"], "区間の境目", "-", e["what"]))
strong = [a for a in sm["accents"] if a["strength"] >= 0.8 or a["kick"] >= 0.5]
miss = [a for a in strong if a["frame30"] not in used]
for a in miss: bad(f"強いアクセントが未割り当て: {a['frame30']}")
shot_b = {s["start"] for s in cues["shots"]}; ev_f = {e["frame"] for e in cues["events"]}
for st in lt["structure"]:
    if st["start"] not in shot_b and not any(abs(st["start"] - f) <= 1 for f in ev_f): bad(f"区間の境目が無い: {st['start']} {st['name']}")
hits = [e for e in cues["events"] if "全面の衝撃" in e["what"]]
if len(hits) > 3: bad(f"全面の衝撃が {len(hits)} 回(3回まで)")
if out:
    L = ["# 音ハメ台帳(自動生成: src/tools/cue_check.py)", "", "映像のヒットのコマ = 曲のアクセントのコマ(許容 ±1)。歌の語頭は `audio/lyric_timeline.json` の推定(要確認を含む)。フレームは0始まり、30fps。これは設計で、実測ではない。", "",
         "## ショット", "| ID | コマ [開始,終了) | 秒 | 内容 | 曲 |", "|---|---|---|---|---|"]
    for s in cues["shots"]: L.append(f"| {s['id']} | {s['start']}–{s['end']} | {s['start']/fps:.2f}–{s['end']/fps:.2f} | {s['name']} | {s['music']} |")
    L += ["", "## 事象(映像のコマ順)", "| コマ | 秒 | ショット | 合わせる音 | ずれ | 映像の出来事 |", "|---|---|---|---|---|---|"]
    for r in sorted(rows): L.append(f"| {r[0]} | {r[0]/fps:.2f} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |")
    L += ["", f"強いアクセント(強さ0.8以上か低音0.5以上){len(strong)} 個のうち割り当て {len(strong)-len(miss)}、未割り当て {len(miss)}。全面の衝撃 {len(hits)} 回(上限3)。", "", "検査結果: " + ("OK" if ok else "FAIL: " + " / ".join(msgs))]
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
print("OK" if ok else "FAIL", "events", len(cues["events"]), "strong", len(strong), "unassigned", len(miss), "impacts", len(hits))
sys.exit(0 if ok else 1)
