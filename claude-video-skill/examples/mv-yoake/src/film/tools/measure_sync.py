#!/usr/bin/env python3
"""書き出した mp4 から、映像のヒットの実際のコマを測り、曲のアクセント(sync_map.json)と歌の語頭(lyric_timeline.json)と比べる(汎用の型。領域の表だけ作品ごと)。
映像: 480x270 の輝度に落とし、事象ごとに決めた領域で「前のコマより明るくなった量(正の差の平均)」か「絶対差」を出す。
  アクセント: 台帳のコマ ±3 の中で最大のコマ = ヒットのコマ。
  語頭: 語頭 -6〜+6 の中で、最大値の 35% を最初に超えたコマ = 字が動き始めたコマ(なぞり・点灯・叩きつけ)。
許容 ±1 コマ。使い方: python3 -I measure_sync.py <film.mp4> <sync_map.json> <lyric_timeline.json> <出力.md>
"""
import sys, json, subprocess, numpy as np
mp4, sm_p, lt_p, out = sys.argv[1:5]
sm = json.load(open(sm_p)); lt = json.load(open(lt_p, encoding="utf-8")); W, H = 480, 270
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
V = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.float32); nf = len(V)
FULL = (0, 0, 1920, 1080)
# 強いアクセント(強さ 0.8 以上か低音 0.5 以上)の 18 個: 領域(1920x1080 の座標)、測り方、映像の出来事
ACC = {
    10: ((700, 380, 1220, 640), "pos", "奥で最初の信号が灯る"), 38: ((0, 760, 1920, 1080), "pos", "信号が手前を走り抜ける"),
    57: ((0, 200, 760, 760), "pos", "左の街区の窓"), 85: ((560, 200, 1360, 760), "pos", "中の街区の窓"), 113: ((1160, 150, 1920, 760), "pos", "右の街区の窓と光の柱"),
    189: ((1420, 80, 1800, 640), "pos", "なぞり終えた字が光り、粒が落ちる"), 274: ((1250, 80, 1800, 1000), "abs", "字が光の粒にほどける"), 283: ((0, 300, 1920, 620), "pos", "地平の街区の波"),
    350: ((0, 150, 1920, 1080), "pos", "灯りが一気に増える波"), 425: ((300, 250, 1100, 950), "pos", "点①がはじける"), 500: ((900, 100, 1700, 800), "pos", "点②がはじける"),
    755: ((360, 520, 1560, 720), "pos", "中心の光のひび"), 769: (FULL, "pos", "山1: 回路がはじけ黒帯が開く"), 812: ((1500, 120, 1900, 420), "pos", "「火」が灯る"),
    845: ((1350, 0, 1920, 520), "pos", "火の粉"), 1123: ((200, 560, 1720, 1080), "pos", "路面が一斉に灯る"), 1340: (FULL, "pos", "山2: 字の光が広がり朝が開く"), 1415: ((880, 440, 1500, 760), "pos", "地平に太陽の縁"),
}
# 主な語頭: 領域、測り方
VOC = {
    "暗": ((1500, 100, 1760, 300), "pos"), "闇": ((1500, 260, 1760, 460), "pos"), "数": ((1300, 100, 1560, 300), "pos"), "輝きは増す": ((300, 100, 1620, 330), "pos"),
    "ひとつ、またひとつ": ((300, 600, 1400, 950), "pos"), "繋がってく": ((350, 200, 1600, 800), "pos"), "夜明けの": ((600, 440, 1320, 640), "pos"), "回路に": ((100, 280, 1300, 760), "abs"),
    "火を灯して": ((1550, 150, 1850, 420), "pos"), "消えかけた声を": ((300, 220, 1620, 440), "pos"), "光に変えて": ((300, 220, 1620, 460), "pos"), "止まらない": ((200, 120, 1720, 420), "abs"),
    "止まれない": ((1450, 40, 1820, 1080), "abs"), "まだ、": ((1430, 100, 1640, 560), "pos"), "光は": ((1430, 560, 1640, 900), "pos"), "消えない": ((1230, 260, 1440, 940), "pos"),
    "夜": ((560, 190, 820, 400), "pos"), "が明ける": ((780, 190, 1380, 400), "pos"),
}
def score(roi, f, mode):
    x0, y0, x1, y1 = [v // 4 for v in roi]; d = V[f, y0:y1, x0:x1] - V[f - 1, y0:y1, x0:x1]
    return float(np.clip(d, 0, None).mean()) if mode == "pos" else float(np.abs(d).mean())
acc = {a["frame30"]: a for a in sm["accents"]}; rows = []; bad = 0
for f, (roi, mode, what) in ACC.items():
    c = [(score(roi, k, mode), k) for k in range(max(1, f - 3), min(nf, f + 4))]; m, got = max(c); a = acc[f]
    lag = got - f; ok = abs(lag) <= 1; bad += not ok
    rows.append((f, what, got, lag, a["strength"], a.get("low", a.get("kick", 0)), ok, m))
starts = {}
for L in lt["lines"]:
    for p in L["phrases"]:
        starts.setdefault(p["text"], (p["start"], p["confidence"]))
        for w in p.get("words", []): starts[w["text"]] = (w["start"], w["confidence"])
vrows = []; vbad = 0
for name, (roi, mode) in VOC.items():
    on, conf = starts[name]; c = [(score(roi, k, mode), k) for k in range(max(1, on - 6), min(nf, on + 7))]; mx = max(v for v, _ in c)
    got = next(k for v, k in c if v >= 0.35 * mx); lag = got - on; ok = -3 <= lag <= 1; vbad += not ok
    vrows.append((name, conf, on, got, lag, ok, mx))
L = ["# 音ハメの実測(書き出した mp4 から。`src/film/tools/measure_sync.py`)", "", f"映像のコマ数 {nf}。AI は音を聴けないので、これは映像の側の測定(曲のアクセントのコマは第三者の測定 `audio/sync_map.json`)。", "",
     "## 強いアクセント 18 個と映像のヒット(許容 ±1 コマ)", "| アクセント | 映像の出来事 | 実測のコマ | ずれ | 強さ | 低音 | 判定 | 測った値 |", "|---|---|---|---|---|---|---|---|"]
for r in rows: L.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]:+d} | {r[4]:.2f} | {r[5] or 0:.2f} | {'OK' if r[6] else '要確認'} | {r[7]:.2f} |")
L += ["", f"18 個のうち ±1 を超えた {bad} 個。", "", "## 主な語頭と、字が動き始めたコマ(語頭 -6〜+6 の中で、変化が最大値の 35% を最初に超えたコマ。合格 -3〜+1)",
      "| 語・句 | 確度 | 語頭(lyric_timeline) | 実測 | ずれ | 判定 | 測った最大値 |", "|---|---|---|---|---|---|---|"]
for r in vrows: L.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]:+d} | {'OK' if r[5] else '要確認'} | {r[6]:.2f} |")
L += ["", f"語頭 {len(vrows)} 個のうち 範囲外 {vbad} 個。字は語頭の 2 コマ前から出し始める設計(読める状態で語頭に合わせる)なので、-2 前後は意図どおり。"]
open(out, "w", encoding="utf-8").write("\n".join(L) + "\n"); print("\n".join(L))
