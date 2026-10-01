#!/usr/bin/env python3
"""references/cinematic/*.md から INDEX.md を生成し、424技法の網羅を検証する。
usage: make_cinematic_index.py [techniques.json]   (techniques.json があれば slug の過不足を検証)
"""
import re, sys, glob, os, json
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references", "cinematic")
files = sorted(f for f in glob.glob(os.path.join(root, "*.md")) if not f.endswith("INDEX.md"))
entries = []
for fn in files:
    base = os.path.basename(fn)
    txt = open(fn, encoding="utf8").read()
    parts = re.split(r"\n(?=### )", txt)
    for p in parts[1:]:
        head = p.split("\n", 1)[0]
        m = re.match(r"### (.+?)\s*\(`([a-z0-9-]+)/([a-z0-9-]+)`\)", head)
        if not m:
            print("見出し形式エラー:", base, head[:80]); continue
        name, cat, slug = m.groups()
        one = re.search(r"\*\*一言\*\*[:：]\s*(.+)", p)
        diff = re.search(r"\*\*難易度/適性\*\*[:：]\s*(.+)", p)
        entries.append(dict(name=name.strip(), cat=cat, slug=slug, file=base,
                            one=(one.group(1).strip() if one else ""), diff=(diff.group(1).strip() if diff else "")))
out = ["# 映像技法 索引(自動生成)", "",
       f"全{len(entries)}技法。`ファイル` の該当エントリに、物語での役割・使う/使わない・失敗・HyperFramesでの作り方がある。",
       "出典: melies.co/cinematic-techniques(要約・再構成)。", ""]
by_cat = {}
for e in entries: by_cat.setdefault(e["cat"], []).append(e)
for cat in sorted(by_cat):
    out += [f"## {cat} ({len(by_cat[cat])})", "", "| 技法 | slug | ファイル | 一言 | 適性 |", "|---|---|---|---|---|"]
    for e in by_cat[cat]:
        one = e["one"].replace("|", "/")[:70]
        out.append(f"| {e['name']} | `{e['slug']}` | {e['file']} | {one} | {e['diff'][:24].replace('|','/')} |")
    out.append("")
open(os.path.join(root, "INDEX.md"), "w", encoding="utf8").write("\n".join(out))
print(f"INDEX.md: {len(entries)} entries from {len(files)} files")
if len(sys.argv) > 1:
    exp = {f"{t['cat']}/{t['slug']}" for t in json.load(open(sys.argv[1], encoding="utf8"))}
    got = {f"{e['cat']}/{e['slug']}" for e in entries}
    print("不足:", sorted(exp - got)); print("余分:", sorted(got - exp))
