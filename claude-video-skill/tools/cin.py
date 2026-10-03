#!/usr/bin/env python3
"""映画技法の辞書から「必要な1項目だけ」を表示する(辞書は全体で約1MB。丸ごと読むと膨大なトークンになる)。
usage:
  cin.py <slug>            例: cin.py camera-movement/dolly-zoom   (スラッグの一部でも可: cin.py dolly-zoom)
  cin.py -s <キーワード>    名前・スラッグ・一言から候補を一覧(日本語可)。最大15件
  cin.py <slug> <slug>...  複数まとめて表示
場面カードを書く/担当に渡す時は、該当項目のこの出力だけを渡す(ファイル全体を読ませない)。
"""
import re, sys, glob, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references", "cinematic")
HEAD = re.compile(r"^### (.+?)\s+\(`([^`]+)`\)\s*$")

def entries():
    for p in sorted(glob.glob(os.path.join(D, "*.md"))):
        if os.path.basename(p) in ("START_HERE.md", "INDEX.md"):
            continue
        cur = None
        for line in open(p, encoding="utf-8"):
            m = HEAD.match(line.rstrip("\n"))
            if m:
                if cur: yield cur
                cur = {"name": m.group(1), "slug": m.group(2), "file": os.path.basename(p), "body": [line]}
            elif line.startswith("## ") and cur:
                yield cur; cur = None
            elif cur:
                cur["body"].append(line)
        if cur: yield cur

def main(a):
    if not a: print(__doc__); return 1
    es = list(entries())
    if a[0] == "-s":
        q = " ".join(a[1:]).lower(); n = 0
        for e in es:
            text = (e["name"] + " " + e["slug"] + " " + "".join(e["body"][1:4])).lower()
            if q in text:
                print(f'{e["slug"]}  — {e["name"]}  [{e["file"]}]'); n += 1
                if n >= 15: break
        if not n: print("該当なし")
        return 0
    for q in a:
        hit = [e for e in es if e["slug"] == q] or [e for e in es if q in e["slug"]]
        if not hit: print(f"(見つからない: {q}。cin.py -s <キーワード> で探す)"); continue
        for e in hit[:3]: print("".join(e["body"]).rstrip() + "\n")
    return 0

if __name__ == "__main__": sys.exit(main(sys.argv[1:]))
