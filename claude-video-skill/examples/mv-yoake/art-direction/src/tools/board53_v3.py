#!/usr/bin/env python3
"""53秒の静止画ボード v3(案A+C、cand_a5*.js)と、独立審査の必須修正ごとの修正前(v2)/後(v3)の比較画像、色の流れ図 v4 を作る。
board53.py・board53_v2.py は変えない。旧ボード・旧画像は上書きしない。
使い方: python3 -I board53_v3.py <art-direction/frames フォルダ>
  出力(frames/board53/ の下):
    board_v3.png(look)、board_v3_clean.png、board_v3_540.png(各コマ 540px 幅=スマホ相当)
    v3/cmp_<カット>.png(上 look・下 clean、左 v2・右 v3、各 960px)と v3/cmp_<カット>_540.png
    v3/seq_dawn.png・_540.png(46〜53秒: 上 v2 の4枚、下 v3 の4枚)
    v3/fix1_dawn〜fix5_material.png(修正ごとの拡大の比較。左 v2・右 v3)と _540.png
  出力(frames/ の下): color_shape_script_v4.png(色の流れ図。琥珀の量は描画の実測。v2 と v3 を並べる)
ラベルの和文はシステムの WenQuanYi Zen Hei(確認用。作品の書体ではない。リポジトリに入れない)。
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

LABEL_FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
BG = (232, 232, 228)

# (カット, コマ, 歌, v3 の主役, v2 の画像(frames からの相対), v3 の画像)
CUTS = [
    ("S1", 60, "間奏", "版木の木目・節1つ・最初の一刀(溝)", "board53/v2/style_ac_f0060", "board53/v3/style_ac_f0060"),
    ("S2", 240, "暗闇の数だけ", "藍のぼかしの空に黒い町、窓の楔13本、字から窓への溝", "style_ac_08s", "board53/v3/style_ac_f0240"),
    ("S3", 370, "輝きは増す", "手前の舟の提灯1つと、画面の下までの映り", "board53/v2/style_ac_f0370", "board53/v3/style_ac_f0370"),
    ("S4", 480, "ひとつ、またひとつ", "坂の大きな黒、灯る窓2つと溝、3つ目の手前で止まる", "style_ac_16s", "board53/v3/style_ac_f0480"),
    ("S5", 740, "夜明けの", "彫り始めの火、芯は平らな琥珀", "board53/v2/style_ac_f0740", "board53/v3/style_ac_f0740"),
    ("S6", 840, "夜明けの回路に 火を灯して", "明暗を逆に: 琥珀の全面、墨の字と回路", "board53/v2/style_ac_f0840", "board53/v3/style_ac_f0840"),
    ("S7", 950, "消えかけた声を 光に変えて", "「て」から溝5本が窓へ", "board53/style_ac_32s", "board53/v3/style_ac_f0950"),
    ("S8", 1080, "止まらない 止まれない", "空=墨・町明かり=帯・水=割れた刀、列車の窓だけ琥珀", "board53/v2/style_ac_f1080", "board53/v3/style_ac_f1080"),
    ("S9", 1200, "まだ、", "木目の版木に「まだ、」、読点から溝", "board53/style_ac_40sa", "board53/v3/style_ac_f1200"),
    ("S9→10", 1380, "(間)衝撃3の後", "構図A 引き: 手前の屋根と櫓、空を彫り取る", "board53/v2/style_ac_f1380", "board53/v3/style_ac_f1380"),
    ("S9→10", 1430, "(間)太陽の縁", "構図A: 淡黄、直径600pxの太陽の縁", "board53/v2/style_ac_f1430", "board53/v3/style_ac_f1430"),
    ("S10", 1470, "夜が明ける", "構図B 寄り: 明の日=昇る太陽", "board53/v2/style_ac_f1470", "board53/v3/style_ac_f1470"),
    ("終わり", 1560, "(余韻)題", "構図C: 昇りきった太陽、霞、題箋", "board53/v2/style_ac_f1560", "board53/v3/style_ac_f1560"),
]


def F(s):
    return ImageFont.truetype(LABEL_FONT, s)


def tc(f):
    s = f / 30
    return f"{int(s // 60)}:{s % 60:04.1f}"


def load(d, base, v):
    return Image.open(os.path.join(d, f"{base}_{v}.png")).convert("RGB")


def fit(im, w):
    return im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)


def board(d, v, tw, cols, out):
    th = round(tw * 9 / 16); pad = 16; lab = max(48, round(tw * 0.09)); head = 44
    f1, f2 = F(max(15, round(tw * 0.03))), F(max(14, round(tw * 0.026)))
    rows = (len(CUTS) + cols - 1) // cols
    sheet = Image.new("RGB", (pad + cols * (tw + pad), head + pad + rows * (th + lab + pad)), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 12), f"夜明けの回路 53秒 — 案A+C 静止画ボード v3({v})  独立審査の必須修正5+乱数の直し  TECH_PASS_ART_PENDING", fill=(30, 30, 30), font=F(22))
    for i, (sid, f, lyr, what, _, base) in enumerate(CUTS):
        x = pad + (i % cols) * (tw + pad); y = head + pad + (i // cols) * (th + lab + pad)
        sheet.paste(fit(load(d, base, v), tw), (x, y))
        dr.text((x, y + th + 5), f"{sid}  {tc(f)}  f{f}   {lyr}", fill=(25, 25, 25), font=f1)
        dr.text((x, y + th + 5 + f1.size + 4), what, fill=(95, 95, 95), font=f2)
    sheet.save(out); print(out, sheet.size)


def compare(d, sid, before, after, tw, out):
    th = round(tw * 9 / 16); pad = 14; head = 40; lab = 28
    sheet = Image.new("RGB", (pad + 2 * (tw + pad), head + 2 * (th + lab) + pad * 2), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 10), f"{sid} 修正前(v2, 左)/修正後(v3, 右)  上 look・下 clean", fill=(30, 30, 30), font=F(20 if tw > 600 else 17))
    for r, v in enumerate(("look", "clean")):
        y = head + r * (th + lab + pad)
        for c, (base, name) in enumerate(((before, "前 v2"), (after, "後 v3"))):
            x = pad + c * (tw + pad)
            sheet.paste(fit(load(d, base, v), tw), (x, y + lab))
            dr.text((x, y + 4), f"{name}  {v}", fill=(60, 60, 60), font=F(17))
    sheet.save(out); print(out, sheet.size)


def seq(d, tw, out):
    th = round(tw * 9 / 16); pad = 14; head = 40; lab = 30; items = [c for c in CUTS if c[1] >= 1380]
    sheet = Image.new("RGB", (pad + len(items) * (tw + pad), head + 2 * (th + lab) + 2 * pad), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 10), "46〜53秒 上: v2(同じ構図の版替え4枚)/下: v3(構図 A→A→B→C)", fill=(30, 30, 30), font=F(20 if tw > 600 else 16))
    for r, k in enumerate((4, 5)):
        for i, c in enumerate(items):
            x = pad + i * (tw + pad); y = head + r * (th + lab + pad)
            sheet.paste(fit(load(d, c[k], "look"), tw), (x, y + lab))
            dr.text((x, y + 4), f"{'v2' if r == 0 else 'v3'}  f{c[1]}  {c[3] if r else ''}"[:40], fill=(60, 60, 60), font=F(15))
    sheet.save(out); print(out, sheet.size)


# 修正ごとの拡大の比較: (題, [(説明, v2 画像, v2 の切り抜き, v3 画像, v3 の切り抜き)])。切り抜きは 1920×1080 の座標
FIX = {
    "fix1_dawn": ("必須1 夜明けの決め絵(全体)", [
        ("1430: 太陽の大きさ・破線の弧・手前の影", "board53/v2/style_ac_f1430", None, "board53/v3/style_ac_f1430", None),
        ("1470: 字と太陽の関係", "board53/v2/style_ac_f1470", None, "board53/v3/style_ac_f1470", None)]),
    "fix2_grooves": ("必須2 回路の線を刀で彫った溝に(太さ均一+丸い端子 → 根元が太く先が尖る、角の行き過ぎ、ふちの欠け)", [
        ("S1 最初の一刀", "board53/v2/style_ac_f0060", (0, 560, 1000, 940), "board53/v3/style_ac_f0060", (0, 560, 1000, 940)),
        ("S2 字から窓へ", "style_ac_08s", (840, 520, 1640, 800), "board53/v3/style_ac_f0240", (840, 520, 1640, 800)),
        ("S4 窓から窓へ", "style_ac_16s", (480, 520, 1500, 900), "board53/v3/style_ac_f0480", (480, 420, 1500, 800)),
        ("S7 字がほどける", "board53/style_ac_32s", (1000, 140, 1900, 980), "board53/v3/style_ac_f0950", (1000, 140, 1900, 980))]),
    "fix3_values": ("必須3 S3・S8 の明暗(540px と白黒の明るさ)", [
        ("S3", "board53/v2/style_ac_f0370", None, "board53/v3/style_ac_f0370", None),
        ("S8", "board53/v2/style_ac_f1080", None, "board53/v3/style_ac_f1080", None)]),
    "fix4_type": ("必須4 文字組み(曲線の角・字間・ふちからの距離・S6 の黒い丸)", [
        ("S9「まだ」の「ま」の輪", "board53/style_ac_40sa", (1160, 60, 1480, 420), "board53/v3/style_ac_f1200", (1160, 120, 1480, 480)),
        ("S10「夜が明ける」の字間", "board53/v2/style_ac_f1470", (440, 120, 1500, 380), "board53/v3/style_ac_f1470", (100, 300, 1600, 1000)),
        ("S6「を灯して」とふち", "board53/v2/style_ac_f0840", (1500, 300, 1920, 1080), "board53/v3/style_ac_f0840", (1500, 220, 1920, 1000)),
        ("S8「止まれない」とふち", "board53/v2/style_ac_f1080", (1000, 780, 1920, 1080), "board53/v3/style_ac_f1080", (880, 740, 1920, 1080))]),
    "fix5_material": ("必須5 版の素材感(横のぶれ → 木目と墨のむら、エアブラシ → 平らな版・粒のあるぼかし)", [
        ("墨の版の地(S7 の空いた所、等倍)", "board53/style_ac_32s", (300, 420, 780, 690), "board53/v3/style_ac_f0950", (300, 420, 780, 690)),
        ("S5 火の芯(放射グラデーション → 平らな版)", "board53/v2/style_ac_f0740", (840, 240, 1360, 760), "board53/v3/style_ac_f0740", (840, 240, 1360, 760)),
        ("S8 列車(グラデーション → 刀と平らな版)", "board53/v2/style_ac_f1080", (300, 300, 1300, 620), "board53/v3/style_ac_f1080", (40, 60, 1040, 380)),
        ("S6 放射(なめらかな放射 → 全面の平らな琥珀・ふちなし)", "board53/v2/style_ac_f0840", None, "board53/v3/style_ac_f0840", None)]),
}


def fixsheet(d, key, tw, out, gray=False):
    title, rows = FIX[key]
    pad = 14; head = 44; lab = 26
    tiles = []
    for name, b2, c2, b3, c3 in rows:
        A = load(d, b2, "look"); B = load(d, b3, "look")
        if c2: A = A.crop(c2)
        if c3: B = B.crop(c3)
        A, B = fit(A, tw), fit(B, tw)
        if gray: A, B = A.convert("L").convert("RGB"), B.convert("L").convert("RGB")
        tiles.append((name, A, B))
    H = head + sum(max(a.height, b.height) + lab + pad for _, a, b in tiles) + pad
    sheet = Image.new("RGB", (pad + 2 * (tw + pad), H), BG); dr = ImageDraw.Draw(sheet)
    dr.text((pad, 12), title + ("(白黒)" if gray else ""), fill=(30, 30, 30), font=F(19 if tw > 600 else 15))
    y = head
    for name, a, b in tiles:
        dr.text((pad, y + 3), f"{name}   左 v2 / 右 v3", fill=(60, 60, 60), font=F(16 if tw > 600 else 14))
        sheet.paste(a, (pad, y + lab)); sheet.paste(b, (pad * 2 + tw, y + lab)); y += max(a.height, b.height) + lab + pad
    sheet.save(out); print(out, sheet.size)


def amber_v2(d):
    """v2 ボードの各カットの琥珀の版の量(描画の実測。stats_v2.jsonl・stats.jsonl、S2・S4 は color_shape_script_v2 の実測値)"""
    out = {}
    for line in open(os.path.join(d, "board53", "v2", "stats_v2.jsonl"), encoding="utf-8"):
        j = json.loads(line)
        if j["page"].endswith("v=look"):
            out[j["stats"]["f"]] = sum(v for c, v in j["stats"]["plate_each"] if c == "#e2742a")
    for line in open(os.path.join(d, "board53", "stats.jsonl"), encoding="utf-8"):
        j = json.loads(line)
        if j["page"] in ("t=32&v=look", "t=40&mode=a&v=look"):
            out[950 if j["page"].startswith("t=32") else 1200] = sum(v for c, v in j["stats"]["plate_each"] if c == "#e2742a")
    out[240], out[480] = 0.0060, 0.0077
    return out


def amber_v3(d):
    out = {}
    for line in open(os.path.join(d, "board53", "v3", "stats_v3.jsonl"), encoding="utf-8"):
        j = json.loads(line)
        if j["page"].endswith("v=look"):
            out[j["stats"]["f"]] = j["stats"]["amber_of_frame"]
    return out


def color_script(d, out):
    a2, a3 = amber_v2(d), amber_v3(d)
    tw = 230; th = round(tw * 9 / 16); pad = 12; n = len(CUTS)
    W = pad + n * (tw + pad); Hh = 70 + 2 * (th + 20) + 360
    sheet = Image.new("RGB", (W, Hh), BG); dr = ImageDraw.Draw(sheet)
    dr.text((pad, 12), "色と形の流れ図 v4(案A+C)  上の段 v2・中の段 v3。下: 琥珀の版の量(画面に対する割合、描画の実測)。v3 は 0〜24.7秒で 0→0.5→0.9→1.1→2.5% と段々に増え、28秒で全面(84%)、40秒で 0.06%", fill=(20, 20, 20), font=F(17))
    for i, c in enumerate(CUTS):
        x = pad + i * (tw + pad)
        for r, k in enumerate((4, 5)):
            y = 50 + r * (th + 20)
            sheet.paste(fit(load(d, c[k], "look"), tw), (x, y))
            dr.text((x, y + th + 2), f"{'v2' if r == 0 else 'v3'} {c[0]} {tc(c[1])}", fill=(50, 50, 50), font=F(13))
    # 棒グラフ(対数で見やすく: 0.05%〜100%)
    import math
    gy0 = 70 + 2 * (th + 20); gh = 250; base = gy0 + gh
    lo, hi = math.log10(0.0005), math.log10(1.0)
    ypos = lambda v: base - (max(lo, math.log10(max(v, 0.0005))) - lo) / (hi - lo) * gh
    for t in (0.001, 0.01, 0.1, 1.0):
        y = ypos(t); dr.line([(pad, y), (W - pad, y)], fill=(200, 200, 196)); dr.text((W - pad - 60, y - 14), f"{t * 100:g}%", fill=(120, 120, 120), font=F(12))
    for i, c in enumerate(CUTS):
        x = pad + i * (tw + pad) + tw // 2
        for k, (src, col) in enumerate(((a2, (150, 150, 150)), (a3, (209, 103, 34)))):
            v = src.get(c[1], 0); xx = x - 40 + k * 44
            dr.rectangle([xx, ypos(v), xx + 36, base], fill=col)
            dr.text((xx - 4, ypos(v) - 16), f"{v * 100:.2f}", fill=(40, 40, 40), font=F(12))
    dr.text((pad, base + 10), "灰 = v2、橙 = v3(琥珀の版が刷られた画素の割合、k>0.5)。縦軸は対数。v2 の S2・S4 は color_shape_script_v2 の実測値", fill=(60, 60, 60), font=F(14))
    sheet.save(out); print(out, sheet.size)
    return a2, a3


if __name__ == "__main__":
    d = sys.argv[1]
    b = os.path.join(d, "board53"); o3 = os.path.join(b, "v3")
    board(d, "look", 576, 5, os.path.join(b, "board_v3.png"))
    board(d, "clean", 576, 5, os.path.join(b, "board_v3_clean.png"))
    board(d, "look", 540, 2, os.path.join(b, "board_v3_540.png"))
    for sid, f, _, _, before, after in CUTS:
        name = f"{sid}_f{f}".replace("→", "-")
        compare(d, sid, before, after, 960, os.path.join(o3, f"cmp_{name}.png"))
        compare(d, sid, before, after, 540, os.path.join(o3, f"cmp_{name}_540.png"))
    seq(d, 960, os.path.join(o3, "seq_dawn.png")); seq(d, 540, os.path.join(o3, "seq_dawn_540.png"))
    for k in FIX:
        fixsheet(d, k, 960, os.path.join(o3, f"{k}.png")); fixsheet(d, k, 540, os.path.join(o3, f"{k}_540.png"))
    fixsheet(d, "fix3_values", 540, os.path.join(o3, "fix3_values_540_gray.png"), gray=True)
    a2, a3 = color_script(d, os.path.join(d, "color_shape_script_v4.png"))
    json.dump({"amber_v2": a2, "amber_v3": a3}, open(os.path.join(o3, "amber_flow.json"), "w"), indent=1)
