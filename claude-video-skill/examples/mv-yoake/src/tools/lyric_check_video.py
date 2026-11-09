#!/usr/bin/env python3
"""歌詞の時刻確認用の下書き動画(汎用。音つき・黒地・低解像度。聴いて、文字の出るタイミングがずれていないかを人が確かめる)。
表示: 行の文字。語(または句)は推定の語頭のコマで灰→白に変わり、変わった瞬間の4コマは黄色。要確認の語頭はオレンジの下線。
     左上に秒とコマ番号、右上に曲の区間名、右下の丸は強いアクセント(強さ0.8以上か低音0.5以上)で3コマ光る。
使い方: python3 -I lyric_check_video.py <lyric_timeline.json> <sync_map.json> <曲.mp3> <@fontsource の package(和文ゴシック)> <weight> <出力.mp4> [幅 960]
"""
import glob, io, json, os, subprocess, sys
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

tl, sm, audio, pkg, weight, out = sys.argv[1:7]; Wd = int(sys.argv[7]) if len(sys.argv) > 7 else 960
T = json.load(open(tl, encoding="utf-8")); S = json.load(open(sm, encoding="utf-8"))
fps, N = T["fps"], T["frames"]; Hd = Wd * 9 // 16; k = Wd / 960

# 字 → その字を含む分割フォント(woff2 を TTF に直して PIL で読む)
files = sorted(glob.glob(os.path.join(pkg, "files", f"*-{weight}-normal.woff2")))
cmaps = []
for f in files:
    ft = TTFont(f); cmaps.append((f, set(ft.getBestCmap().keys())))
cache = {}
def font_for(ch, size):
    key = (ch, size)
    if key in cache: return cache[key]
    for f, cm in cmaps:
        if ord(ch) in cm:
            fk = (f, size)
            if fk not in cache:
                ft = TTFont(f); ft.flavor = None; b = io.BytesIO(); ft.save(b); b.seek(0); cache[fk] = ImageFont.truetype(b, size)
            cache[key] = cache[fk]; return cache[fk]
    cache[key] = None; return None
def text_w(s, size):
    w = 0
    for ch in s:
        fo = font_for(ch, size); w += fo.getlength(ch) if fo else size * 0.5
    return w
def draw_text(d, x, y, s, size, fill):
    for ch in s:
        fo = font_for(ch, size)
        if fo: d.text((x, y), ch, font=fo, fill=fill); x += fo.getlength(ch)
        else: x += size * 0.5
    return x

# 表示する語(token)の一覧: (行, 文字, 開始, 要確認か)
lines = []
for L in T["lines"]:
    toks = []
    for p in L["phrases"]:
        if "words" in p:
            for i, w in enumerate(p["words"]): toks.append((w["text"], w["start"], w["confidence"] == "要確認"))
        else: toks.append((p["text"], p["start"], p["confidence"] == "要確認"))
        toks.append((" ", None, False))
    lines.append({"start": L["start"], "end": L["end"], "toks": toks[:-1], "id": L["id"]})
acc = [a["frame30"] for a in S["accents"] if a["strength"] >= 0.8 or a["kick"] >= 0.5]
cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{Wd}x{Hd}", "-r", str(fps), "-i", "-", "-i", audio,
       "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-t", f"{N / fps:.4f}", out]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
big, small = int(52 * k), int(20 * k)
for f in range(N):
    im = Image.new("RGB", (Wd, Hd), (0, 0, 0)); d = ImageDraw.Draw(im)
    draw_text(d, 14 * k, 10 * k, f"{f / fps:6.2f}s  f={f}", small, (150, 150, 150))
    sec = next((s for s in T["structure"] if s["start"] <= f < s["end"]), None)
    if sec: x = Wd - 14 * k - text_w(sec["name"], small); draw_text(d, x, 10 * k, sec["name"], small, (120, 160, 170))
    cur = next((L for L in lines if L["start"] <= f < L["end"]), None)
    nxt = next((L for L in lines if L["start"] > f), None)
    if cur:
        s = "".join(t[0] for t in cur["toks"]); size = big if text_w(s, big) < Wd * 0.9 else int(big * Wd * 0.9 / text_w(s, big))
        x = (Wd - text_w(s, size)) / 2; y = Hd * 0.42
        for txt, st, unsure in cur["toks"]:
            on = st is not None and f >= st; fresh = st is not None and 0 <= f - st < 4
            col = (255, 222, 60) if fresh else (245, 245, 245) if on else (70, 70, 70)
            x2 = draw_text(d, x, y, txt, size, col)
            if unsure and st is not None: d.rectangle([x, y + size * 1.25, x2 - 4 * k, y + size * 1.25 + 3 * k], fill=(255, 140, 40))
            x = x2
    if nxt and (not cur or nxt["start"] - f < 45):
        s = "".join(t[0] for t in nxt["toks"]); x = (Wd - text_w(s, int(26 * k))) / 2
        draw_text(d, x, Hd * 0.72, s, int(26 * k), (55, 55, 55))
    lit = any(0 <= f - a < 3 for a in acc)
    cx, cy, r = Wd - 30 * k, Hd - 30 * k, 11 * k
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(120, 255, 170) if lit else (25, 25, 25))
    draw_text(d, 14 * k, Hd - 32 * k, "白=推定の語頭を過ぎた語 / 黄=語頭の瞬間 / 橙の下線=要確認 / 右下の丸=強いアクセント", int(15 * k), (110, 110, 110))
    p.stdin.write(im.tobytes())
p.stdin.close(); p.wait()
print(out, "frames", N)
