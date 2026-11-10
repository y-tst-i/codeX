#!/usr/bin/env python3
"""53秒の静止画ボード v4(案A+C、cand_a6*.js)と、独立審査 v3 の必須修正ごとの修正前(v3)/後(v4)の比較画像を作る。
board53_v3.py 以前は変えない。旧ボード・旧画像は上書きしない。リポジトリの容量のため、出力はすべて JPEG(品質 90)。
v4 の 1920px の静止画はリポジトリの外(render_v6_all.sh の OUT)から読む。v3 の静止画は frames/board53/v3/ から読む。
使い方: python3 -I board53_v4.py <art-direction/frames フォルダ> <v4 の静止画フォルダ> [<v4 の別案の静止画フォルダ(比較用、任意)>]
  出力(frames/board53/ の下):
    board_v4.jpg(look)、board_v4_clean.jpg、board_v4_540.jpg(各コマ 540px 幅=スマホ相当)
    v4/fix1_dawn.jpg・_540.jpg(夜明け4枚、左 v3・右 v4)、v4/seq_dawn.jpg・_540.jpg(上 v3・下 v4)
    v4/fix2_s6_s8.jpg・_540.jpg、v4/fix3_texture_2x.jpg(質感を 2 倍に拡大。最近傍)、v4/fix4_unify.jpg・_540.jpg
  出力(v4 の静止画フォルダの下): cmp_<カット>.jpg(カットごとの前後。リポジトリに入れない)
ラベルの和文はシステムの WenQuanYi Zen Hei(確認用。作品の書体ではない。リポジトリに入れない)。
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

LABEL_FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
BG = (232, 232, 228)
Q = 90
CUTS = [
    ("S1", 60, "間奏", "版木の木目(節のまわりだけ密)・最初の一刀"),
    ("S2", 240, "暗闇の数だけ", "藍のぼかし(紙のスキャン)、窓の楔、影の中の刀、窓の映り"),
    ("S3", 370, "輝きは増す", "手前の舟の提灯と映り"),
    ("S4", 480, "ひとつ、またひとつ", "坂の町、窓2つと溝(放射を消した)"),
    ("S5", 740, "夜明けの", "彫り始めの火"),
    ("S6", 840, "夜明けの回路に 火を灯して", "全面の琥珀、刀で彫った面、楔7本、路→火の溝3本"),
    ("S7", 950, "消えかけた声を 光に変えて", "「て」から溝5本が窓へ"),
    ("S8", 1080, "止まらない 止まれない", "列車=琥珀の窓11個、桁の線は字から24px以上"),
    ("S9", 1200, "まだ、", "読点から太く落ちて細る溝"),
    ("S9→10", 1380, "(間)衝撃3の後", "工業の町の影、信号が櫓を上る"),
    ("S9→10", 1430, "(間)太陽の縁", "信号が電線で地平の鉄塔へ、太陽の縁"),
    ("S10", 1470, "夜が明ける", "電線が「明」の日へ入る"),
    ("終わり", 1560, "(余韻)題", "最初の窓から鉄塔まで灯った回路"),
]


def F(s):
    return ImageFont.truetype(LABEL_FONT, s)


def tc(f):
    s = f / 30
    return f"{int(s // 60)}:{s % 60:04.1f}"


def ld(d, f, v):
    return Image.open(os.path.join(d, f"style_ac_f{f:04d}_{v}.png")).convert("RGB")


def fit(im, w):
    return im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)


def save(im, out):
    im.save(out, quality=Q, optimize=True)
    print(out, im.size, os.path.getsize(out) // 1024, "KB")


def board(d4, v, tw, cols, out):
    th = round(tw * 9 / 16); pad = 16; lab = max(48, round(tw * 0.09)); head = 44
    f1, f2 = F(max(15, round(tw * 0.03))), F(max(14, round(tw * 0.026)))
    rows = (len(CUTS) + cols - 1) // cols
    sheet = Image.new("RGB", (pad + cols * (tw + pad), head + pad + rows * (th + lab + pad)), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 12), f"夜明けの回路 53秒 — 案A+C 静止画ボード v4({v})  独立審査 v3 の必須修正1〜4  TECH_PASS_ART_PENDING", fill=(30, 30, 30), font=F(22))
    for i, (sid, f, lyr, what) in enumerate(CUTS):
        x = pad + (i % cols) * (tw + pad); y = head + pad + (i // cols) * (th + lab + pad)
        sheet.paste(fit(ld(d4, f, v), tw), (x, y))
        dr.text((x, y + th + 5), f"{sid}  {tc(f)}  f{f}   {lyr}", fill=(25, 25, 25), font=f1)
        dr.text((x, y + th + 5 + f1.size + 4), what, fill=(95, 95, 95), font=f2)
    save(sheet, out)


def pairsheet(title, rows, tw, out, scale=None):
    """rows = [(説明, 前の画像, 前の切り抜き, 後の画像, 後の切り抜き)]。scale があれば切り抜きを scale 倍(最近傍)"""
    pad = 14; head = 44; lab = 26; tiles = []
    for name, A, ca, Bm, cb in rows:
        if ca: A = A.crop(ca)
        if cb: Bm = Bm.crop(cb)
        if scale: A = A.resize((A.width * scale, A.height * scale), Image.NEAREST); Bm = Bm.resize((Bm.width * scale, Bm.height * scale), Image.NEAREST)
        else: A, Bm = fit(A, tw), fit(Bm, tw)
        tiles.append((name, A, Bm))
    w = max(a.width for _, a, _ in tiles)
    H = head + sum(max(a.height, b.height) + lab + pad for _, a, b in tiles) + pad
    sheet = Image.new("RGB", (pad + 2 * (w + pad), H), BG); dr = ImageDraw.Draw(sheet)
    dr.text((pad, 12), title, fill=(30, 30, 30), font=F(19 if w > 600 else 15))
    y = head
    for name, a, b in tiles:
        dr.text((pad, y + 3), f"{name}   左 v3(前) / 右 v4(後)", fill=(60, 60, 60), font=F(16 if w > 600 else 13))
        sheet.paste(a, (pad, y + lab)); sheet.paste(b, (pad * 2 + w, y + lab)); y += max(a.height, b.height) + lab + pad
    save(sheet, out)


def seq(d3, d4, tw, out):
    th = round(tw * 9 / 16); pad = 14; head = 40; lab = 30; fs = [1380, 1430, 1470, 1560]
    sheet = Image.new("RGB", (pad + len(fs) * (tw + pad), head + 2 * (th + lab) + 2 * pad), BG)
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 10), "46〜53秒 上: v3(信号なし・松・寺のような屋根)/下: v4(工業の町・信号が櫓→電線→鉄塔→明の日→最初の窓から灯る回路)", fill=(30, 30, 30), font=F(18 if tw > 600 else 13))
    for r, d in enumerate((d3, d4)):
        for i, f in enumerate(fs):
            x = pad + i * (tw + pad); y = head + r * (th + lab + pad)
            sheet.paste(fit(ld(d, f, "look"), tw), (x, y + lab)); dr.text((x, y + 4), f"{'v3' if r == 0 else 'v4'}  f{f}", fill=(60, 60, 60), font=F(15))
    save(sheet, out)


if __name__ == "__main__":
    fr, d4 = sys.argv[1], sys.argv[2]
    d3 = os.path.join(fr, "board53", "v3"); b = os.path.join(fr, "board53"); o4 = os.path.join(b, "v4"); os.makedirs(o4, exist_ok=True)
    board(d4, "look", 576, 5, os.path.join(b, "board_v4.jpg"))
    board(d4, "clean", 576, 5, os.path.join(b, "board_v4_clean.jpg"))
    board(d4, "look", 540, 2, os.path.join(b, "board_v4_540.jpg"))
    L3 = lambda f: ld(d3, f, "look"); L4 = lambda f: ld(d4, f, "look")
    for tw, sfx in ((960, ""), (540, "_540")):
        pairsheet("必須1 夜明けに「信号」と「この町」を戻す(1380・1430・S10・終わり)", [(f"f{f}", L3(f), None, L4(f), None) for f in (1380, 1430, 1470, 1560)], tw, os.path.join(o4, f"fix1_dawn{sfx}.jpg"))
        seq(d3, d4, tw // 2 if tw > 600 else 270, os.path.join(o4, f"seq_dawn{sfx}.jpg"))
        pairsheet("必須2 S6・S8 の主役を版画の描き方で(S6: 刀で彫った面・楔7本・路→火の溝3本/S8: 琥珀の窓11個・字と線は24px以上)", [("S6 全体", L3(840), None, L4(840), None), ("S6 火のまわり(拡大)", L3(840), (1060, 60, 1700, 700), L4(840), (1060, 60, 1700, 700)),
                   ("S8 全体", L3(1080), None, L4(1080), None), ("S8 列車と「止まらない」(拡大)", L3(1080), (56, 60, 1100, 620), L4(1080), (56, 60, 1100, 620))], tw, os.path.join(o4, f"fix2_s6_s8{sfx}.jpg"))
        pairsheet("必須4 描き方の分裂を減らす(S1 の節・S1→S2・影の中の刀・S4 の放射・S9 の溝)", [("S1 節(横切る直線2本)", L3(60), (900, 120, 1700, 560), L4(60), (900, 120, 1700, 560)),
                   ("S1 → S2(同じ紙・同じ刀)", L3(60).resize((960, 540)), None, L4(60).resize((960, 540)), None), ("S2", L3(240), None, L4(240), None),
                   ("S2 影の中の刀・窓の弧・窓の映り(拡大)", L3(240), (56, 300, 1300, 860), L4(240), (56, 300, 1300, 860)), ("S4", L3(480), None, L4(480), None),
                   ("S9 読点の下の溝(拡大)", L3(1200), (1180, 560, 1500, 1040), L4(1200), (1180, 560, 1500, 1040))], tw, os.path.join(o4, f"fix4_unify{sfx}.jpg"))
    # 質感: 2 倍に拡大(最近傍。四角い粒と走査線が見えるように)
    Z = [("S2 空の上(走査線の横線)", 240, (1080, 60, 1480, 260)), ("S2 空の地平の近く(四角い粒)", 240, (1040, 520, 1440, 720)), ("S4 空の右", 480, (1400, 120, 1800, 320)),
         ("1430 空", 1430, (1300, 30, 1700, 230)), ("S10 空(薔薇→淡黄)", 1470, (1250, 380, 1650, 580)), ("S7 墨のベタ", 950, (300, 420, 700, 620))]
    pairsheet("必須3 ぼかし摺りのデジタルの砂目 → 紙のスキャン(CC0)の繊維と斑+ばれんのむら。2 倍に拡大(最近傍)", [(n, L3(f), c, L4(f), c) for n, f, c in Z], 0, os.path.join(o4, "fix3_texture_2x.jpg"), scale=2)
    # カットごとの前後(リポジトリに入れない)
    for sid, f, _, _ in CUTS:
        pairsheet(f"{sid} f{f}  左 v3 / 右 v4(上 look・下 clean)", [("look", L3(f), None, L4(f), None), ("clean", ld(d3, f, "clean"), None, ld(d4, f, "clean"), None)], 960, os.path.join(d4, f"cmp_{sid.replace('→', '-')}_f{f}.jpg"))
