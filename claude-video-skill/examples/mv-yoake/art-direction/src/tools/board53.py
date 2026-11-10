#!/usr/bin/env python3
"""53秒の静止画ボード(案A+C)と、色と形の流れ図 v3 を作る。
使い方: python3 -I board53.py <art-direction/frames フォルダ>
  出力: frames/board53/board.png(look)、board_clean.png、board_540.png(各コマ 540px 幅=スマホ相当)、frames/color_shape_script_v3.png
各コマの下に「カット・秒・コマ・歌詞」を入れる。ラベルの和文はシステムの WenQuanYi Zen Hei(描画の確認用。作品の書体ではない。リポジトリに入れない)。
数値(彫った割合・色版の割合)は描画ページの計測値(board53/stats.jsonl と ART_REVIEW_v2.md の 8/16 秒の実測)。
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

LABEL_FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
BG = (232, 232, 228)
INK, INK_DAWN, PAPER = "#14171f", "#2b2033", "#ece3cd"

# カット(SHOTS.md の S1〜S10 に1枚ずつ)。file は frames からの相対。stat: None なら stats.jsonl から
CUTS = [
    ("S1", 60, "間奏", "版木と最初の一刀(信号)", "style_ac_02s", None),
    ("S2", 240, "暗闇の数だけ", "字の中の日 → 線 → 窓", "../style_ac_08s", {"carved": 0.0932, "plate": 0.0060, "colors": [INK, "#e2742a"]}),
    ("S3", 370, "輝きは増す", "灯り8つと水面の映り8本", "style_ac_12s", None),
    ("S4", 480, "ひとつ、またひとつ", "坂の町の窓2つを線がつなぐ", "../style_ac_16s", {"carved": 0.084, "plate": 0.0077, "colors": [INK, "#e2742a"]}),
    ("S5", 740, "夜明けの", "「火」の当たり(溜め)", "style_ac_25s", None),
    ("S6", 840, "夜明けの回路に 火を灯して", "字の中の回路と、火の放射", "style_ac_28s", None),
    ("S7", 950, "消えかけた声を 光に変えて", "字が刀の線にほどける", "style_ac_32s", None),
    ("S8", 1080, "止まらない 止まれない", "高架の路面が灯る", "style_ac_36s", None),
    ("S9", 1200, "まだ、", "字と燃え残りの読点と線だけ", "style_ac_40sa", None),
    ("S10", 1470, "夜が明ける", "紙の朝・明の日・太陽", "style_ac_49s", None),
]


def tc(f):
    s = f / 30
    return f"{int(s // 60)}:{s % 60:04.1f}"


def load_stats(d):
    out = {}
    for line in open(os.path.join(d, "board53", "stats.jsonl"), encoding="utf-8"):
        j = json.loads(line)
        if j["out"].endswith("_look.png"):
            st = j["stats"]
            cols = [st["ink"]] + list(dict.fromkeys(c for c, _ in st["plate_each"] if _ > 0))
            out[j["out"][: -len("_look.png")]] = {"carved": st["carved_in_block"], "plate": st["plate_of_frame"], "colors": cols}
    return out


def path_of(d, base, v):
    b = base[3:] if base.startswith("../") else os.path.join("board53", base)
    return os.path.join(d, f"{b}_{v}.png")


def board(d, v, tw, cols, out):
    th = round(tw * 9 / 16); pad = 16; lab = max(46, round(tw * 0.085))
    f1 = ImageFont.truetype(LABEL_FONT, max(15, round(tw * 0.03))); f2 = ImageFont.truetype(LABEL_FONT, max(14, round(tw * 0.026)))
    rows = (len(CUTS) + cols - 1) // cols
    head = 44
    sheet = Image.new("RGB", (pad + cols * (tw + pad), head + pad + rows * (th + lab + pad)), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 12), f"夜明けの回路 53秒 — 案A+C 静止画ボード({v})  S1〜S10 を時間順に1枚ずつ  TECH_PASS_ART_PENDING", fill=(30, 30, 30), font=ImageFont.truetype(LABEL_FONT, 22))
    for i, (sid, f, lyr, what, base, _) in enumerate(CUTS):
        x = pad + (i % cols) * (tw + pad); y = head + pad + (i // cols) * (th + lab + pad)
        im = Image.open(path_of(d, base, v)).convert("RGB").resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (x, y))
        dr.text((x, y + th + 5), f"{sid}  {tc(f)}  f{f}   {lyr}", fill=(25, 25, 25), font=f1)
        dr.text((x, y + th + 5 + f1.size + 4), what, fill=(95, 95, 95), font=f2)
    sheet.save(out); print(out, sheet.size)


def script(d, stats, out):
    tw, th = 300, 169; pad = 18; n = len(CUTS)
    W = pad + n * (tw + pad); H = 760
    im = Image.new("RGB", (W, H), BG); dr = ImageDraw.Draw(im)
    F = lambda s: ImageFont.truetype(LABEL_FONT, s)
    dr.text((pad, 14), "色と形の流れ図 v3 — 暗い版画(墨+琥珀1点)→ 琥珀の色版が広がる(28秒)→ 最も黒い版(40秒)→ 紙の朝(墨が茄子紺に、色版4色)", fill=(25, 25, 25), font=F(24))
    dr.text((pad, 48), "上: 各カットの look / 中: 彫った割合(版木の中の紙)と色版の割合(画面)/ 下: 使った色(左端が墨)。数値はページの計測値", fill=(80, 80, 80), font=F(18))
    y0 = 90; ybar = y0 + th + 64; bh = 200
    pts_c, pts_p = [], []
    for i, (sid, f, lyr, what, base, st) in enumerate(CUTS):
        st = st or stats[base]
        x = pad + i * (tw + pad)
        im.paste(Image.open(path_of(d, base, "look")).convert("RGB").resize((tw, th), Image.LANCZOS), (x, y0))
        dr.text((x, y0 + th + 6), f"{sid} {tc(f)}", fill=(25, 25, 25), font=F(20)); dr.text((x, y0 + th + 32), lyr, fill=(70, 70, 70), font=F(17))
        # 棒: 彫った割合(0〜80%)と色版(0〜60%)
        cv, pv = st["carved"], st["plate"]
        dr.rectangle([x, ybar, x + tw, ybar + bh], outline=(190, 190, 186))
        hc = bh * min(cv, 0.8) / 0.8; hp = bh * min(pv, 0.6) / 0.6
        dr.rectangle([x + 40, ybar + bh - hc, x + 130, ybar + bh], fill=(236, 227, 205), outline=(120, 120, 110))
        dr.rectangle([x + 170, ybar + bh - hp, x + 260, ybar + bh], fill=(226, 116, 42))
        dr.text((x + 40, ybar + bh + 6), f"彫り {cv * 100:.1f}%", fill=(40, 40, 40), font=F(17)); dr.text((x + 170, ybar + bh + 6), f"色版 {pv * 100:.2f}%", fill=(40, 40, 40), font=F(17))
        pts_c.append((x + 85, ybar + bh - hc)); pts_p.append((x + 215, ybar + bh - hp))
        # 色の帯
        cols = st["colors"]; sw = tw / max(1, len(cols)); ys = ybar + bh + 40
        for k, c in enumerate(cols):
            rgb = tuple(int(c[j:j + 2], 16) for j in (1, 3, 5))
            dr.rectangle([x + k * sw, ys, x + (k + 1) * sw - 4, ys + 40], fill=rgb, outline=(150, 150, 150))
        dr.text((x, ys + 46), f"色 {len(cols)}(墨{'=茄子紺' if cols[0] == INK_DAWN else ''}+{len(cols) - 1})", fill=(60, 60, 60), font=F(17))
    dr.line(pts_c, fill=(60, 60, 60), width=3); dr.line(pts_p, fill=(200, 90, 30), width=3)
    dr.text((pad, H - 40), "彫り(白い棒)は 2秒 4% → 8・16秒 8〜9% → 28秒 24% → 40秒 2%(意図した底)→ 49秒 74%。琥珀は 0 → 字の日・窓 → 28秒の火で最大 → 40秒は読点だけ → 49秒は太陽と明の日。49秒で初めて薔薇・淡黄のぼかし摺りが加わる", fill=(50, 50, 50), font=F(18))
    im.save(out); print(out, im.size)


if __name__ == "__main__":
    d = sys.argv[1]
    st = load_stats(d)
    board(d, "look", 576, 5, os.path.join(d, "board53", "board.png"))
    board(d, "clean", 576, 5, os.path.join(d, "board53", "board_clean.png"))
    board(d, "look", 540, 2, os.path.join(d, "board53", "board_540.png"))
    script(d, st, os.path.join(d, "color_shape_script_v3.png"))
