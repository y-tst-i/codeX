#!/usr/bin/env python3
"""6秒試作の時刻データを作る: 歌詞の語頭(audio/lyric_timeline.json)・曲のアクセント(audio/sync_map.json)・試作の区間(PILOT_6S_PROPOSAL.json)を
1つの JS(const PILOT_TIMING)に埋め込む。pilot6s.js はこの値だけから彫り・刷りの時刻を決める(コマ番号を直書きしない)。
使い方: python3 -I gen_timing.py <mv-yoake のフォルダ> <出力 .js>"""
import json, sys, os
ex, out = sys.argv[1], sys.argv[2]
lt = json.load(open(os.path.join(ex, "audio/lyric_timeline.json"), encoding="utf-8"))
sm = json.load(open(os.path.join(ex, "audio/sync_map.json"), encoding="utf-8"))
pp = json.load(open(os.path.join(ex, "art-direction/PILOT_6S_PROPOSAL.json"), encoding="utf-8"))
a, b = pp["song_range"]
phrases, words = [], []
for line in lt["lines"]:
    for p in line["phrases"]:
        phrases.append({"text": p["text"], "start": p["start"], "end": p["end"], "confidence": p.get("confidence")})
        for w in p.get("words", []):
            words.append({"text": w["text"], "start": w["start"], "confidence": w.get("confidence")})
acc = [{"frame30": x["frame30"], "strength": x["strength"], "kick": x.get("kick", 0)} for x in sm["accents"] if a - 30 <= x["frame30"] <= b + 30]
data = {"range": [a, b], "fps": lt["fps"], "words": words, "phrases": phrases, "accents": acc,
        "source": "audio/lyric_timeline.json, audio/sync_map.json, art-direction/PILOT_6S_PROPOSAL.json(song_range)"}
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
open(out, "w", encoding="utf-8").write("// 自動生成(tools/gen_timing.py)。手で直さない\nconst PILOT_TIMING = " + json.dumps(data, ensure_ascii=False) + ";\n")
print("wrote", out, len(words), "words", len(acc), "accents", "range", a, b)
