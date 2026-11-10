#!/usr/bin/env python3
"""動きの本制作(第1段)の時刻データを作る: 歌詞の語頭(audio/lyric_timeline.json)と曲のアクセント(audio/sync_map.json)を
1つの JS(const M1_TIMING)に埋め込む。cand_a7_cuts.js・cand_a7_dawn.js はこの値と規則だけで彫り・刷りの時刻を決める。
「要確認」の語頭もそのまま使い、confidence を残す(利用者の耳で直したら、このスクリプト → 書き出しで全部ついてくる)。
使い方: python3 -I gen_timing.py <mv-yoake のフォルダ> <出力 .js>"""
import json, sys, os
ex, out = sys.argv[1], sys.argv[2]
lt = json.load(open(os.path.join(ex, "audio/lyric_timeline.json"), encoding="utf-8"))
sm = json.load(open(os.path.join(ex, "audio/sync_map.json"), encoding="utf-8"))
cu = json.load(open(os.path.join(ex, "audio/cues.json"), encoding="utf-8"))
phrases, words = [], []
for line in lt["lines"]:
    for p in line["phrases"]:
        phrases.append({"text": p["text"], "start": p["start"], "end": p["end"], "confidence": p.get("confidence")})
        for w in p.get("words", []):
            words.append({"text": w["text"], "start": w["start"], "confidence": w.get("confidence")})
acc = [{"frame30": x["frame30"], "strength": x["strength"], "kick": x.get("kick", 0)} for x in sm["accents"]]
shots = [{"id": s["id"], "start": s["start"], "end": s["end"]} for s in cu["shots"]]
data = {"fps": lt["fps"], "frames": cu["frames"], "shots": shots, "words": words, "phrases": phrases, "accents": acc,
        "source": "audio/lyric_timeline.json, audio/sync_map.json, audio/cues.json(shots)"}
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, "w", encoding="utf-8").write("// 自動生成(motion1/tools/gen_timing.py)。手で直さない\nconst M1_TIMING = " + json.dumps(data, ensure_ascii=False) + ";\n")
print("wrote", out, len(words), "words", len(phrases), "phrases", len(acc), "accents", len(shots), "shots")
