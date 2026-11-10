#!/usr/bin/env python3
"""53秒の静止画ボード v2(案A+C)と、作り直したカットの修正前/後の比較画像を作る。board53.py(v1)は変えない。
使い方: python3 -I board53_v2.py <art-direction/frames フォルダ>
  出力(すべて frames/board53/ の下。旧ボード board*.png は上書きしない):
    board_v2.png(look)、board_v2_clean.png、board_v2_540.png(各コマ 540px 幅=スマホ相当)
    v2/cmp_<カット>.png(上 look・下 clean、左が修正前・右が修正後、各 960px)と v2/cmp_<カット>_540.png(各 540px)
    v2/seq_dawn.png と v2/seq_dawn_540.png(S9→S10 の版が増える途中 1380・1430 → 1470 → 題 1560)
ラベルの和文はシステムの WenQuanYi Zen Hei(確認用。作品の書体ではない。リポジトリに入れない)。
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

LABEL_FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
BG = (232, 232, 228)

# (カット, コマ, 歌, 主役, 画像の基準名(frames からの相対、_look/_clean を付ける), v2 で新しく描いたか)
CUTS = [
    ("S1", 60, "間奏", "版木の木目と、最初の一刀(信号)", "board53/v2/style_ac_f0060", True),
    ("S2", 240, "暗闇の数だけ", "字の中の日 → 線 → 窓(v1 のまま)", "style_ac_08s", False),
    ("S3", 370, "輝きは増す", "灯りが水に映って欠片に増える", "board53/v2/style_ac_f0370", True),
    ("S4", 480, "ひとつ、またひとつ", "坂の町の窓2つを線がつなぐ(v1 のまま)", "style_ac_16s", False),
    ("S5", 740, "夜明けの", "彫り始めの「火」と火種", "board53/v2/style_ac_f0740", True),
    ("S6", 840, "夜明けの回路に 火を灯して", "放射を 68 本の不揃いな丸刀に", "board53/v2/style_ac_f0840", True),
    ("S7", 950, "消えかけた声を 光に変えて", "字が刀の線にほどける(v1 のまま)", "board53/style_ac_32s", False),
    ("S8", 1080, "止まらない 止まれない", "下から見上げる高架と列車の窓の刀", "board53/v2/style_ac_f1080", True),
    ("S9", 1200, "まだ、", "字と燃え残りの読点と線(v1 のまま)", "board53/style_ac_40sa", False),
    ("S9→10", 1380, "(間)衝撃3の後", "版1枚: 空を地平から彫り取る", "board53/v2/style_ac_f1380", True),
    ("S9→10", 1430, "(間)太陽の縁", "版3枚: 淡黄・琥珀が刷られた", "board53/v2/style_ac_f1430", True),
    ("S10", 1470, "夜が明ける", "版4枚: 薔薇・明の日・太陽", "board53/v2/style_ac_f1470", True),
    ("終わり", 1560, "(余韻)題", "題箋「夜明けの回路」と印", "board53/v2/style_ac_f1560", True),
]
# 修正前/後の比較(前は v1 のボードの絵)
PAIRS = [
    ("S1", "board53/style_ac_02s", "board53/v2/style_ac_f0060"),
    ("S3", "board53/style_ac_12s", "board53/v2/style_ac_f0370"),
    ("S5", "board53/style_ac_25s", "board53/v2/style_ac_f0740"),
    ("S6", "board53/style_ac_28s", "board53/v2/style_ac_f0840"),
    ("S8", "board53/style_ac_36s", "board53/v2/style_ac_f1080"),
    ("S10", "board53/style_ac_49s", "board53/v2/style_ac_f1470"),
]


def F(s):
    return ImageFont.truetype(LABEL_FONT, s)


def tc(f):
    s = f / 30
    return f"{int(s // 60)}:{s % 60:04.1f}"


def img(d, base, v, w):
    im = Image.open(os.path.join(d, f"{base}_{v}.png")).convert("RGB")
    return im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)


def board(d, v, tw, cols, out):
    th = round(tw * 9 / 16); pad = 16; lab = max(48, round(tw * 0.09))
    f1, f2 = F(max(15, round(tw * 0.03))), F(max(14, round(tw * 0.026)))
    rows = (len(CUTS) + cols - 1) // cols; head = 44
    sheet = Image.new("RGB", (pad + cols * (tw + pad), head + pad + rows * (th + lab + pad)), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 12), f"夜明けの回路 53秒 — 案A+C 静止画ボード v2({v})  ●=v2 で描き直し・新規  TECH_PASS_ART_PENDING", fill=(30, 30, 30), font=F(22))
    for i, (sid, f, lyr, what, base, new) in enumerate(CUTS):
        x = pad + (i % cols) * (tw + pad); y = head + pad + (i // cols) * (th + lab + pad)
        sheet.paste(img(d, base, v, tw), (x, y))
        dr.text((x, y + th + 5), f"{'●' if new else '○'} {sid}  {tc(f)}  f{f}   {lyr}", fill=(25, 25, 25), font=f1)
        dr.text((x, y + th + 5 + f1.size + 4), what, fill=(95, 95, 95), font=f2)
    sheet.save(out); print(out, sheet.size)


def compare(d, sid, before, after, tw, out):
    th = round(tw * 9 / 16); pad = 14; head = 40; lab = 28
    sheet = Image.new("RGB", (pad + 2 * (tw + pad), head + 2 * (th + lab) + pad * 2), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 10), f"{sid} 修正前(v1, 左)/修正後(v2, 右)  上 look・下 clean  自己審査用", fill=(30, 30, 30), font=F(20 if tw > 600 else 17))
    for r, v in enumerate(("look", "clean")):
        y = head + r * (th + lab + pad)
        for c, (base, name) in enumerate(((before, "前 v1"), (after, "後 v2"))):
            x = pad + c * (tw + pad)
            sheet.paste(img(d, base, v, tw), (x, y + lab))
            dr.text((x, y + 4), f"{name}  {v}", fill=(60, 60, 60), font=F(17))
    sheet.save(out); print(out, sheet.size)


def seq(d, tw, out):
    th = round(tw * 9 / 16); pad = 14; head = 40; lab = 30; items = [c for c in CUTS if c[1] >= 1380]
    sheet = Image.new("RGB", (pad + len(items) * (tw + pad), head + th + lab + pad), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 10), "S9→S10 の版が増える途中(1つの関数 dawn(f) を f だけ変えて描いた)", fill=(30, 30, 30), font=F(20 if tw > 600 else 17))
    for i, (sid, f, lyr, what, base, _) in enumerate(items):
        x = pad + i * (tw + pad)
        sheet.paste(img(d, base, "look", tw), (x, head + lab))
        dr.text((x, head + 4), f"f{f}  {what}", fill=(60, 60, 60), font=F(16))
    sheet.save(out); print(out, sheet.size)


if __name__ == "__main__":
    d = sys.argv[1]
    b = os.path.join(d, "board53")
    board(d, "look", 576, 5, os.path.join(b, "board_v2.png"))
    board(d, "clean", 576, 5, os.path.join(b, "board_v2_clean.png"))
    board(d, "look", 540, 2, os.path.join(b, "board_v2_540.png"))
    for sid, before, after in PAIRS:
        compare(d, sid, before, after, 960, os.path.join(b, "v2", f"cmp_{sid}.png"))
        compare(d, sid, before, after, 540, os.path.join(b, "v2", f"cmp_{sid}_540.png"))
    seq(d, 960, os.path.join(b, "v2", "seq_dawn.png"))
    seq(d, 540, os.path.join(b, "v2", "seq_dawn_540.png"))
