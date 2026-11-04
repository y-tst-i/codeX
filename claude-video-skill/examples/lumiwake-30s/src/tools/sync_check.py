#!/usr/bin/env python3
"""audio/cues.json と audio/sync_map.json を突き合わせて検査し、SYNC_TABLE.md を書く(汎用: 映像のヒットと曲のアクセントの台帳検査)。
検査: ①ショットが 0〜frames を隙間・重なりなく覆う ②各イベントがショットの範囲に入る ③acc 付きのイベントは |frame - frame30| <= 1
      ④強さ 0.8 以上のアクセントが全部割り当て済みか(未割り当ては表示) ⑤構成の境目(1.0, 7.56, 20.5, 24.6 秒)が入っているか
使い方: python3 -I sync_check.py <cues.json> <sync_map.json> [出力.md]
"""
import json, sys
cues = json.load(open(sys.argv[1])); sm = json.load(open(sys.argv[2])); out = sys.argv[3] if len(sys.argv) > 3 else None
acc = {a["frame30"]: a for a in sm["accents"]}; ok = True; fps = cues["fps"]
sh = cues["shots"]; pos = 0
for s in sh:
    if s["start"] != pos: print("GAP/OVERLAP at", s["id"], s["start"], "expected", pos); ok = False
    if s["end"] <= s["start"]: print("EMPTY", s["id"]); ok = False
    pos = s["end"]
if pos != cues["frames"]: print("TOTAL", pos, "!=", cues["frames"]); ok = False
rows = []; used = set()
for e in cues["events"]:
    s = next((x for x in sh if x["id"] == e["shot"]), None)
    if not s or not (s["start"] <= e["frame"] < s["end"]): print("EVENT OUT OF SHOT", e); ok = False
    if "acc" in e:
        a = acc.get(e["acc"])
        if not a: print("NO ACCENT", e); ok = False; continue
        lag = e["frame"] - a["frame30"]; used.add(a["frame30"])
        if abs(lag) > 1: print("LAG", e["frame"], a["frame30"], lag); ok = False
        rows.append((e["frame"], f'{e["frame"]/fps:.3f}', e["shot"], f'{a["t"]:.3f}', a["frame30"], f'{lag:+d}', f'{a["strength"]:.2f}', f'{a["kick"]:.2f}', e["what"]))
    else:
        rows.append((e["frame"], f'{e["frame"]/fps:.3f}', e["shot"], f'境目 {e["boundary"]}s', "-", "-", "-", "-", e["what"]))
strong = [a for a in sm["accents"] if a["strength"] >= 0.8 or a["kick"] >= 0.9]
miss = [a for a in strong if a["frame30"] not in used]
for a in miss: print("UNASSIGNED strong accent", a)
for b in (1.0, 7.56, 20.5, 24.6):
    if not any(abs(e.get("boundary", -9) - b) < 0.01 or (e.get("acc") == round(b * 30) and b == 7.56) for e in cues["events"]) and not any(e["frame"] == round(b * 30) or abs(e["frame"] - b * 30) <= 1 for e in cues["events"]): print("BOUNDARY MISSING", b); ok = False
if out:
    L = ["# 音ハメ台帳(自動生成: src/tools/sync_check.py)", "", f"映像のヒットのコマ = 曲のアクセントのコマ(frame30)。許容 ±1 コマ、目標 0〜1。フレームは0始まり。", "",
         "## ショット", "| ID | コマ [開始,終了) | 秒 | 内容 | 曲 |", "|---|---|---|---|---|"]
    for s in sh: L.append(f'| {s["id"]} | {s["start"]}–{s["end"]} | {s["start"]/fps:.2f}–{s["end"]/fps:.2f} | {s["name"]} | {s["music"]} |')
    L += ["", "## イベントとアクセントの対応", "| 映像のコマ | 秒 | ショット | 曲のアクセント(秒) | アクセントのコマ | ずれ | 強さ | 低音 | 映像の出来事 |", "|---|---|---|---|---|---|---|---|---|"]
    for r in sorted(rows): L.append("| " + " | ".join(str(c) for c in r) + " |")
    L += ["", f"強いアクセント(強さ0.8以上、または低音0.9以上)は {len(strong)} 個、うち割り当て済み {len(strong)-len(miss)}、未割り当て {len(miss)}。"]
    open(out, "w", encoding="utf-8").write("\n".join(L) + "\n")
print("OK" if ok else "FAIL", "events", len(cues["events"]), "strong", len(strong), "unassigned", len(miss))
sys.exit(0 if ok else 1)
