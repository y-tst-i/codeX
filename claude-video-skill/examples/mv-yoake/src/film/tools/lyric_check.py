#!/usr/bin/env python3
"""歌詞が lyric_timeline.json の通りのコマに出ているかを機械で確かめる(汎用: 歌詞もの・字幕もの)。
入力: frames.mjs --textlog が書いた「各コマで描かれた歌詞の字と不透明度」(描画のコードが TYPE.mark で記録)。
判定(語・句の頭の字ごと): 出始め(不透明度 0.3 以上の最初のコマ)が語頭の -4〜+3 コマ、読める(0.8 以上)のが語頭 +10 コマ以内。
あわせて、句ごとに「読める状態が続いたコマ数」を出す(目安: 0.5 秒 + 1 語 0.3 秒)。
使い方: python3 -I lyric_check.py <textlog.json> <lyric_timeline.json> <出力.md>
"""
import json, sys
log, lt_p, out = sys.argv[1], sys.argv[2], sys.argv[3]
T = {int(k): v for k, v in json.load(open(log, encoding="utf-8")).items()}
lt = json.load(open(lt_p, encoding="utf-8"))
frames = sorted(T)
def series(key):
    s = {}
    for f in frames:
        for k, a in T[f]["text"]:
            if k == key: s[f] = max(s.get(f, 0), a)
    return s
rows, bad, holds = [], 0, []
for L in lt["lines"]:
    for p in L["phrases"]:
        text = p["text"]; chars = list(text)
        heads = [(0, p["start"], text if not p.get("words") else p["words"][0]["text"], p["confidence"] if not p.get("words") else p["words"][0]["confidence"])]
        if p.get("words"):
            ci = 0
            for w in p["words"]:
                heads.append((ci, w["start"], w["text"], w["confidence"])); ci += len(w["text"])
            heads = heads[1:]
        ser = [series(f"{text}|{i}") for i in range(len(chars))]
        for ci, onset, wt, conf in heads:
            s = ser[ci]; app = next((f for f in frames if s.get(f, 0) >= 0.3), None); rd = next((f for f in frames if s.get(f, 0) >= 0.8), None)
            ok = app is not None and rd is not None and -4 <= app - onset <= 3 and rd - onset <= 10
            bad += not ok
            rows.append((L["id"], wt, conf, onset, app, None if app is None else app - onset, rd, None if rd is None else rd - onset, "OK" if ok else "要確認"))
        # 句全体が読める状態(全部の字が 0.8 以上)の続いたコマ数
        allr = [f for f in frames if all(se.get(f, 0) >= 0.8 for se in ser)]
        holds.append((text, p["start"], p["end"], (allr[0], allr[-1], len(allr)) if allr else None, len(p.get("words") or [1])))
M = ["# 歌詞の表示の機械検査(`src/film/tools/lyric_check.py`)", "",
     "描画のコードが記録した字ごとの不透明度(`frames.mjs --textlog`)を、`audio/lyric_timeline.json` の語頭と比べた。出始め = 0.3 以上の最初のコマ、読める = 0.8 以上の最初のコマ。",
     "合格: 出始めが語頭の -4〜+3 コマ、読めるのが語頭 +10 コマ以内(なぞる字は、語頭で光がなぞり始める演出なので、読めるまでに数コマかかる)。", "",
     "| 行 | 語・句の頭 | 確度 | 語頭 | 出始め | ずれ | 読める | ずれ | 判定 |", "|---|---|---|---|---|---|---|---|---|"]
for r in rows: M.append("| " + " | ".join("-" if x is None else (f"{x:+d}" if isinstance(x, int) and i in (5, 7) else str(x)) for i, x in enumerate(r)) + " |")
M += ["", f"語・句の頭 {len(rows)} 個のうち 要確認 {bad} 個。", "", "## 句が読める状態で出ている長さ", "| 句 | 歌の区間 [開始,終了) | 全部の字が読める区間 | コマ数(秒) | 目安(0.5 秒 + 0.3 秒×語) |", "|---|---|---|---|---|"]
for t, s, e, h, nw in holds:
    need = round((0.5 + 0.3 * max(1, nw)) * 30)
    M.append(f"| {t} | {s}–{e} | {'-' if not h else f'{h[0]}–{h[1]}'} | {'-' if not h else f'{h[2]}({h[2]/30:.1f})'} | {need}{'' if h and h[2] >= need else ' 未満'} |")
open(out, "w", encoding="utf-8").write("\n".join(M) + "\n"); print("\n".join(M)); sys.exit(1 if bad else 0)
