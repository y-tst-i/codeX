#!/usr/bin/env python3
"""audio/lyric_timeline.json と audio/cues.json を、描画が読む JS(data.gen.js)に写す(生成物。git に入れない)。
歌詞の時刻を直したら、これを走らせて(build_hf.sh も自動で走らせる)書き出し直す。
使い方: python3 -I gen_data.py <lyric_timeline.json> <cues.json> <出力 data.gen.js>
"""
import json, sys
lt, cues, out = sys.argv[1:4]
d = {"lyric": json.load(open(lt, encoding="utf-8")), "cues": json.load(open(cues, encoding="utf-8"))}
open(out, "w", encoding="utf-8").write("// 自動生成(src/film/tools/gen_data.py)。正本は audio/lyric_timeline.json と audio/cues.json。手で直さない\nconst MV_DATA = " + json.dumps(d, ensure_ascii=False) + ";\n")
print("wrote", out)
