#!/usr/bin/env python3
"""lyric_timeline.json から人が読む表(Markdown)を作る(汎用)。
使い方: python3 -I lyric_table.py <lyric_timeline.json> <出力.md>
"""
import json, sys
T = json.load(open(sys.argv[1], encoding="utf-8")); fps = T["fps"]
L = ["# 歌詞の時刻表(自動生成: src/tools/lyric_table.py)", "", T["rule"], "", "方法: " + T["method"], "",
     "## 曲の区間", "| コマ [開始,終了) | 秒 | 区間 | 根拠・注 |", "|---|---|---|---|"]
for s in T["structure"]: L.append(f"| {s['start']}–{s['end']} | {s['start']/fps:.2f}–{s['end']/fps:.2f} | {s['name']} | {s.get('note', '')} |")
L += ["", "## 行(元の歌詞)", "| 行 | 歌詞 | コマ [開始,終了) | 秒 | 確度 |", "|---|---|---|---|---|"]
for l in T["lines"]: L.append(f"| {l['id']} | {l['text']} | {l['start']}–{l['end']} | {l['start']/fps:.2f}–{l['end']/fps:.2f} | {l['confidence']} |")
L += ["", "## 句・語と根拠", "| 行 | 句・語 | 開始コマ(秒) | 終了コマ | 確度 | 根拠 |", "|---|---|---|---|---|---|"]
for l in T["lines"]:
    for p in l["phrases"]:
        L.append(f"| {l['id']} | **{p['text']}** | {p['start']}({p['start']/fps:.2f}) | {p['end']} | {p['confidence']} | {p['evidence']} |")
        for w in p.get("words", []): L.append(f"| | └ {w['text']} | {w['start']}({w['start']/fps:.2f}) | | {w['confidence']} | |")
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(L) + "\n"); print("ok")
