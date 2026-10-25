#!/usr/bin/env python3
"""録音済みの効果音(CC0)の検索と読み込み。数式合成の効果音の代わりに使う(定番の合成音を避けるため)。
CLI:  sfx_lib.py list            パックと種類ごとの件数
      sfx_lib.py find <語>        名前に語を含むものを一覧(長さ付き)  例: find footstep_wood / find glass / find door
Python: import sfx_lib as S; x = S.load("footstep_wood_002", sr=44100, gain=0.8)  # -> mono float32。I.mix(t, x, ...) などで重ねる
        S.pick("footstep_wood", seed=3)  # 同じ種類から seed で1つ選ぶ(足音を毎回変えるため)
"""
import os, sys, json, subprocess, re
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "assets", "sfx-cc0")
MANIFEST = os.path.join(LIB, "manifest.json")


def build_manifest():
    items = []
    for pack in sorted(os.listdir(LIB)):
        d = os.path.join(LIB, pack)
        if not os.path.isdir(d): continue
        for f in sorted(os.listdir(d)):
            if not f.endswith(".ogg"): continue
            out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(d, f)], capture_output=True, text=True).stdout.strip()
            name = f[:-4]; kind = re.sub(r"[_]?\d+$", "", name)
            items.append({"name": name, "pack": pack, "kind": kind, "dur": round(float(out or 0), 3)})
    json.dump(items, open(MANIFEST, "w"), ensure_ascii=False, indent=0)
    return items


def items():
    if not os.path.exists(MANIFEST): return build_manifest()
    return json.load(open(MANIFEST))


def path(name):
    for it in items():
        if it["name"] == name: return os.path.join(LIB, it["pack"], name + ".ogg")
    raise KeyError(name)


def load(name, sr=44100, gain=1.0):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", path(name), "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"], capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy() * gain


def pick(kind, seed=0):
    c = [it["name"] for it in items() if it["kind"] == kind or it["name"].startswith(kind)]
    if not c: raise KeyError(kind)
    return c[int(seed) % len(c)]


def main(a):
    if not a or a[0] == "list":
        import collections
        c = collections.Counter((it["pack"], it["kind"]) for it in items())
        for (p, k), n in sorted(c.items()): print(f"{p:18s} {k:28s} x{n}")
    elif a[0] == "find":
        q = " ".join(a[1:]).lower()
        for it in items():
            if q in it["name"].lower() or q in it["kind"].lower(): print(f'{it["name"]:30s} {it["dur"]:5.2f}s  [{it["pack"]}]')
    else: print(__doc__)


if __name__ == "__main__": main(sys.argv[1:])
