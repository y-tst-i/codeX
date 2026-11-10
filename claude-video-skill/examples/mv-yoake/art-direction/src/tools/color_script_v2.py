#!/usr/bin/env python3
"""色と形の変遷図 v2(案A+C)。8/16/40秒は描いた絵(look)の縮小、28/49秒は計画の模式図(木版の描画ではない)。
数値: 8/16/40 は render_v2.mjs が出した実測(彫った割合=版木の中の紙の割合、色版=画面に対する割合)、28/49 は計画値。
使い方: python3 -I color_script_v2.py <frames フォルダ> <出力.png>
見出しは ASCII(ラベル用の和文フォントを持ち込まないため。make_sheets.py と同じ)。
"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONTB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
INK, PAPER, AMBER, ROSE = (20, 23, 31), (236, 227, 205), (209, 103, 34), (205, 92, 110)
TW, TH = 352, 198

COLS = [
    # 時刻, 歌, 実描画?, 彫った割合, 色版, 色版の役割, 形と構図
    ("8s f240", "kurayami no kazu dake", "DRAWN", 0.093, 0.0060, "amber: 1 window + the 'hi' (sun) inside 2 letters", "flat horizon, river, town row; vertical type right; arcs flattened into streaks"),
    ("16s f480", "hitotsu, mata hitotsu", "DRAWN", 0.084, 0.0077, "amber: 2 windows (one, another); cut line joins them", "hill slope falling to the right, houses 2x larger; horizontal type in 2 steps"),
    ("28s f840", "kairo ni / hi wo tomoshite", "PLAN", 0.38, 0.04, "amber: the letter 'hi' (fire) + the fire in 'tomo(su)'", "block-filling carved letters, radial knife cuts from the fire (keeps v1 big-type layout)"),
    ("40s f1200", "mada,", "DRAWN", 0.048, 0.0006, "amber: only the comma (an ember); 1 thin line to a roof", "town close & low, all windows dark; sky = fine dark lines; single huge column"),
    ("49s f1470", "yoru ga akeru", "PLAN", 0.78, 0.15, "2nd plate (rose) for the first time + amber sun; 'hi' in 'ake(ru)'", "block carved away = paper morning; sun at the 8s arc centre (rhyme)"),
]


def sketch28(d, x, y):
    d.rectangle([x, y, x + TW, y + TH], fill=INK)
    cx, cy = x + 268, y + 118
    for k in range(26):  # 火から放射する刀の跡(模式)
        import math
        a = k / 26 * 2 * math.pi
        d.line([cx + math.cos(a) * 30, cy + math.sin(a) * 30, cx + math.cos(a) * 140, cy + math.sin(a) * 140], fill=PAPER, width=3)
    for i in range(3):  # 「回路に」の彫った大きな字(箱で代用)
        x0 = x + 18 + i * 74
        d.rectangle([x0, y + 70, x0 + 62, y + 150], fill=PAPER)
        d.rectangle([x0 + 16, y + 90, x0 + 46, y + 130], fill=INK)
    d.rectangle([cx - 22, cy - 34, cx + 22, cy + 34], fill=AMBER)  # 火
    d.rectangle([x + 330, y + 40, x + 342, y + 70], fill=AMBER)  # 灯の火へん


def sketch49(d, x, y):
    d.rectangle([x, y, x + TW, y + TH], fill=PAPER)
    d.rectangle([x, y, x + TW, y + 22], fill=INK)  # 彫り残した夜(上の端だけ)
    d.rectangle([x, y + 22, x + TW, y + 70], fill=ROSE)  # 2版目
    d.pieslice([x + TW // 2 - 46, y + 120, x + TW // 2 + 46, y + 212], 180, 360, fill=AMBER)  # 地平の太陽(8秒の弧の中心)
    pts = [(x, y + 166), (x + 30, y + 166), (x + 30, y + 140), (x + 52, y + 140), (x + 52, y + 166), (x + 96, y + 166), (x + 100, y + 120), (x + 106, y + 166), (x + 250, y + 166), (x + 262, y + 150), (x + 280, y + 166), (x + TW, y + 166), (x + TW, y + TH), (x, y + TH)]
    d.polygon(pts, fill=INK)
    for i in range(5):
        d.rectangle([x + 70 + i * 44, y + 84, x + 104 + i * 44, y + 112], outline=INK, width=4)
    d.rectangle([x + 70 + 2 * 44 + 6, y + 88, x + 70 + 2 * 44 + 16, y + 108], fill=AMBER)  # 明の日


def main(frames, out):
    W = 30 + len(COLS) * (TW + 26)
    H = 640
    sheet = Image.new("RGB", (W, H), (232, 232, 228))
    d = ImageDraw.Draw(sheet)
    f, fb, fs = ImageFont.truetype(FONT, 15), ImageFont.truetype(FONTB, 18), ImageFont.truetype(FONT, 13)
    d.text((20, 14), "Route A+C (woodcut + 'sun inside the letter') colour & shape script v2.  DRAWN = rendered frame (look);  PLAN = schematic only, not rendered", fill=(15, 15, 15), font=fb)
    thumbs = {"8s f240": "style_ac_08s_look.png", "16s f480": "style_ac_16s_look.png", "40s f1200": "style_ac_40s_look.png"}
    for i, (t, song, kind, carved, plate, role, shape) in enumerate(COLS):
        x, y = 20 + i * (TW + 26), 70
        d.text((x, y - 24), f"{t}  '{song}'", fill=(20, 20, 20), font=f)
        if kind == "DRAWN":
            sheet.paste(Image.open(f"{frames}/{thumbs[t]}").convert("RGB").resize((TW, TH), Image.LANCZOS), (x, y))
        else:
            sk = Image.new("RGB", (TW + 1, TH + 1)); (sketch28 if t.startswith("28") else sketch49)(ImageDraw.Draw(sk), 0, 0); sheet.paste(sk, (x, y))  # 枠の外にはみ出さないよう別の画像に描く
            d.rectangle([x, y, x + TW, y + TH], outline=(200, 40, 40), width=3)
            d.text((x + 8, y + TH - 20), "PLAN (schematic)", fill=(200, 40, 40), font=fs)
        # 棒: 彫った割合(紙)と色版
        by = y + TH + 16
        d.text((x, by), f"carved (paper) {carved*100:.1f}%  {'measured' if kind == 'DRAWN' else 'plan'}", fill=(20, 20, 20), font=fs)
        d.rectangle([x, by + 18, x + TW, by + 32], fill=INK)
        d.rectangle([x, by + 18, x + int(TW * carved), by + 32], fill=PAPER, outline=(120, 120, 120))
        d.text((x, by + 40), f"colour plate {plate*100:.2f}% of frame  {'measured' if kind == 'DRAWN' else 'plan'}", fill=(20, 20, 20), font=fs)
        d.rectangle([x, by + 58, x + TW, by + 72], fill=(210, 210, 205))
        d.rectangle([x, by + 58, x + max(2, int(TW * min(1, plate / 0.16))), by + 72], fill=ROSE if t.startswith("49") else AMBER)
        d.text((x, by + 80), "(bar scale: full = 16%)", fill=(90, 90, 90), font=fs)
        yy = by + 104
        for label, txt in (("plate:", role), ("shape:", shape)):
            words, line = txt.split(), ""
            d.text((x, yy), label, fill=(60, 60, 60), font=fs); yy += 17
            for w in words:
                if d.textlength(line + " " + w, font=fs) > TW:
                    d.text((x, yy), line.strip(), fill=(20, 20, 20), font=fs); yy += 16; line = ""
                line += " " + w
            d.text((x, yy), line.strip(), fill=(20, 20, 20), font=fs); yy += 22
    d.text((20, H - 28), "Rule: light exists only where the block is cut; the plate is printed only on cut paper. Plate role grows 8s -> 28s -> 49s (window/sun-in-letter -> fire -> 2nd plate); 40s is the deliberate dip.", fill=(40, 40, 40), font=fs)
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
