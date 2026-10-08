#!/usr/bin/env python3
"""審査の第1段(機械チェック): 完成動画を測って 合格/注意/不合格 を出す。

使い方:
  python3 tools/review_checks.py final.mp4 [--holds holds.json] [--still-th 0.5] [--verbose]

必要な物: ffmpeg / ffprobe / numpy(標準ライブラリ以外はこれだけ)。ネットワーク・書き込みなし。
測る項目と目安は references/review-gauntlet.md の表を参照。
  - 目安の出典: echris6/motion-video-kit の quality-bar.md(MIT)と、私たちの経験値。
  - 意図した間(ロゴ着地後など)は holds.json に登録すると「静止区間」の検査から外れる。
終了コード: 不合格が1つでもあれば 1、それ以外は 0。
"""
import argparse
import json
import re
import subprocess
import sys

import numpy as np

OK, WARN, NG = "合格", "注意", "不合格"
RESULTS = []


def report(level, name, detail):
    RESULTS.append((level, name, detail))
    print(f"[{level}] {name}: {detail}")


def run(cmd, binary=False):
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return p.stdout if binary else p.stdout.decode("utf-8", "replace"), p.stderr.decode("utf-8", "replace")


def probe(path):
    out, _ = run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path])
    return json.loads(out)


def frac(s):
    try:
        a, b = s.split("/")
        return float(a) / float(b) if float(b) else 0.0
    except Exception:
        return 0.0


def decode_gray(path, w, h):
    """全コマを縮小した灰色画像で読む(コマ落ちさせない)。"""
    base = ["ffmpeg", "-v", "error", "-i", path, "-an", "-vf", f"scale={w}:{h}:flags=area,format=gray",
            "-f", "rawvideo", "-pix_fmt", "gray", "-"]
    for flag in (["-fps_mode", "passthrough"], ["-vsync", "0"]):
        cmd = base[:5] + flag + base[5:]
        data, err = run(cmd, binary=True)
        if len(data) >= w * h:
            n = len(data) // (w * h)
            return np.frombuffer(data[: n * w * h], dtype=np.uint8).reshape(n, h, w)
    return np.zeros((0, h, w), dtype=np.uint8)


def runs_of(mask):
    """True が続く区間を (開始index, 終了index(含まない)) で返す。"""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(mask)))
    return out


def subtract(span, holds):
    """span=(s,e) 秒から holds の区間を引いた残りの区間リスト。"""
    pieces = [span]
    for hs, he in holds:
        nxt = []
        for s, e in pieces:
            if he <= s or hs >= e:
                nxt.append((s, e))
                continue
            if hs > s:
                nxt.append((s, hs))
            if he < e:
                nxt.append((he, e))
        pieces = nxt
    return pieces


def load_holds(path):
    if not path:
        return [], []
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        report(NG, "holds.json", f"読めません: {e}")
        return [], []
    items = data.get("holds", data) if isinstance(data, dict) else data
    spans, noreason = [], []
    for it in items:
        try:
            s, e = float(it["start"]), float(it["end"])
        except Exception:
            report(NG, "holds.json", f"start/end が読めない行があります: {it}")
            continue
        if e <= s:
            report(NG, "holds.json", f"end が start 以下です: {it}")
            continue
        spans.append((s, e))
        if not str(it.get("reason", "")).strip():
            noreason.append((s, e))
    return spans, noreason


def fmt_t(x):
    return f"{x:.2f}s"


def main():
    ap = argparse.ArgumentParser(description="完成動画の機械チェック(ffmpeg/ffprobe + numpy)")
    ap.add_argument("video")
    ap.add_argument("--holds", help="意図した間の台帳 holds.json")
    ap.add_argument("--still-th", type=float, default=0.5,
                    help="静止とみなすコマ差の上限(0-255の灰色平均、約0.1秒離れた2コマの差)。既定 0.5")
    ap.add_argument("--chg-th", type=float, default=0.15,
                    help="静止とみなす『6階調以上変わった画素の割合(%%)』の上限。既定 0.15")
    ap.add_argument("--min-still", type=float, default=0.2, help="静止区間として数える最短の長さ(秒)。既定 0.2")
    ap.add_argument("--verbose", action="store_true", help="コマ差の統計も表示")
    a = ap.parse_args()

    info = probe(a.video)
    vs = [s for s in info.get("streams", []) if s.get("codec_type") == "video"]
    au = [s for s in info.get("streams", []) if s.get("codec_type") == "audio"]
    if not vs:
        print("映像ストリームがありません")
        return 1
    v = vs[0]
    W, H = int(v["width"]), int(v["height"])
    fps = frac(v.get("avg_frame_rate", "0/1")) or frac(v.get("r_frame_rate", "0/1"))
    dur = float(info["format"].get("duration") or v.get("duration") or 0)
    print(f"== {a.video}  {W}x{H} {fps:.3f}fps {dur:.2f}s ==")

    # ---- 映像を読む
    long_side = 192
    sw = long_side if W >= H else max(2, round(long_side * W / H / 2) * 2)
    sh = long_side if H > W else max(2, round(long_side * H / W / 2) * 2)
    fr = decode_gray(a.video, sw, sh)
    n = len(fr)
    if n == 0:
        report(NG, "映像の読み込み", "コマを1枚も読めませんでした")
        return 1
    f32 = fr.astype(np.float32)
    mean = f32.reshape(n, -1).mean(axis=1)
    mx = f32.reshape(n, -1).max(axis=1)

    # ---- 1. フレーム数・解像度・fps
    expected = dur * fps
    if abs(n - expected) <= 1.5:
        report(OK, "コマ数", f"{n}コマ(長さ×fps={expected:.1f})")
    else:
        report(WARN, "コマ数", f"{n}コマ、長さ×fps={expected:.1f} とずれています(可変fps・欠けの疑い)")
    if abs(frac(v.get("r_frame_rate", "0/1")) - frac(v.get("avg_frame_rate", "0/1"))) > 0.01:
        report(WARN, "fps", f"r={v.get('r_frame_rate')} と avg={v.get('avg_frame_rate')} が違います(可変fps)")
    elif round(fps) in (24, 25, 30, 50, 60) and abs(fps - round(fps)) < 0.01:
        report(OK, "fps", f"{fps:.0f}fps 固定")
    else:
        report(WARN, "fps", f"{fps:.3f}fps(一般的でない値)")
    common = {(1920, 1080), (1080, 1920), (1280, 720), (720, 1280), (3840, 2160), (2160, 3840), (1080, 1080)}
    if (W, H) in common:
        report(OK, "解像度", f"{W}x{H}")
    else:
        report(WARN, "解像度", f"{W}x{H}(一般的な書き出しサイズではありません)")

    # ---- 2. 黒コマ
    black = (mean < 4) & (mx < 24)
    mids = [(s, e) for s, e in runs_of(black) if s > 0 and e < n]
    heads = [(s, e) for s, e in runs_of(black) if s == 0]
    tails = [(s, e) for s, e in runs_of(black) if e == n and s > 0]
    if mids:
        txt = ", ".join(f"{fmt_t(s / fps)}-{fmt_t(e / fps)}({e - s}コマ)" for s, e in mids[:6])
        report(NG, "黒コマ", f"途中に全黒があります: {txt}")
    else:
        extra = []
        if heads and heads[0][1] > 1:
            extra.append(f"冒頭に黒 {heads[0][1]}コマ")
        if tails and (tails[0][1] - tails[0][0]) / fps >= 0.5:
            extra.append(f"末尾に黒 {(tails[0][1] - tails[0][0]) / fps:.2f}s")
        if extra:
            report(WARN, "黒コマ", "、".join(extra) + "(0コマ目は完成した絵であるべき。意図なら可)")
        else:
            report(OK, "黒コマ", "途中・冒頭・末尾に問題のある全黒なし")

    # ---- 3. 全面の白に近いフラッシュ
    white = mean >= 235
    flashes = []
    for s, e in runs_of(white):
        if s == 0 or e == n:
            continue
        before = mean[max(0, s - 3)]
        after = mean[min(n - 1, e + 2)]
        if (e - s) / fps <= 0.5 and (before < 200 or after < 200):
            flashes.append(s / fps)
    dense = any(sum(1 for t in flashes if t0 <= t < t0 + 1.0) > 3 for t0 in flashes)
    if dense:
        report(NG, "白フラッシュ", f"1秒に3回を超える明滅があります({', '.join(fmt_t(t) for t in flashes[:8])})。光過敏の目安超え")
    elif flashes:
        report(WARN, "白フラッシュ", f"{len(flashes)}回: {', '.join(fmt_t(t) for t in flashes[:8])}(意図した演出か確認)")
    else:
        report(OK, "白フラッシュ", "全面の白いフラッシュなし")

    # ---- 4. 静止区間(約0.1秒離れた2コマの差で測る。ゆっくりした動きも拾うため)
    step = max(1, round(fps / 10))
    diff = np.zeros(n, dtype=np.float32)
    chg = np.zeros(n, dtype=np.float32)  # 6階調以上変わった画素の割合(%)。暗い場面の小さな動きを拾う
    if n > step:
        ad = np.abs(f32[step:] - f32[:-step]).reshape(n - step, -1)
        diff[step:] = ad.mean(axis=1)
        chg[step:] = (ad > 6).mean(axis=1) * 100
        diff[:step] = diff[step]
        chg[:step] = chg[step]
    if a.verbose:
        print(f"    コマ差(0.1s離れ) 中央値 {np.median(diff):.2f} / 10%点 {np.percentile(diff, 10):.2f} / 90%点 {np.percentile(diff, 90):.2f}")
    holds, noreason = load_holds(a.holds)
    # 静止 = 平均差が小さい かつ 変化した画素がほぼ無い(暗い場面でゆっくり動く物を静止と誤判定しないため)
    still = (diff < a.still_th) & (chg < a.chg_th)
    slow = (diff < a.still_th) & (chg >= a.chg_th)
    # 差を「この2コマの間に動かなかった」とみて、区間は [i-step+1, i] を覆う
    cover = np.zeros(n, dtype=bool)
    for i in np.where(still)[0]:
        cover[max(0, i - step + 1): i + 1] = True
    raw_runs = [(s / fps, e / fps) for s, e in runs_of(cover) if (e - s) / fps >= a.min_still]
    counted, exempt_end, exempt_hold = [], [], 0.0
    for s, e in raw_runs:
        pieces = subtract((s, e), holds)
        exempt_hold += (e - s) - sum(pe - ps for ps, pe in pieces)
        for ps, pe in pieces:
            if pe - ps < a.min_still:
                continue
            if pe >= dur - 0.05 and pe - ps <= 2.0:
                exempt_end.append((ps, pe))  # 最後の CTA の静止は2秒まで免除
            else:
                counted.append((ps, pe))
    total = sum(e - s for s, e in counted)
    budget = max(dur / 30.0, 0.3)
    longest = max(counted, key=lambda x: x[1] - x[0], default=None)
    desc = [f"{fmt_t(s)}-{fmt_t(e)}({e - s:.2f}s)" for s, e in counted[:8]]
    long_desc = [f"{fmt_t(s)}-{fmt_t(e)}({e - s:.2f}s)" for s, e in counted if e - s > 0.6]
    tail = f" / 末尾CTA免除 {', '.join(f'{fmt_t(s)}-{fmt_t(e)}' for s, e in exempt_end)}" if exempt_end else ""
    hold_txt = f" / 台帳で除外 {exempt_hold:.2f}s" if holds else ""
    head = f"静止の合計 {total:.2f}s(予算 {budget:.2f}s = 30秒あたり1秒)"
    if longest and longest[1] - longest[0] > 0.6:
        report(NG, "静止区間", f"{head}。0.6秒超の静止: {', '.join(long_desc)}(全区間: {', '.join(desc)}){tail}{hold_txt}。"
               "意図した間なら holds.json に登録、そうでなければ動きを足す")
    elif total > 2 * budget:
        report(NG, "静止区間", f"{head}。2倍超。{', '.join(desc)}{tail}{hold_txt}")
    elif total > budget:
        report(WARN, "静止区間", f"{head}。{', '.join(desc)}{tail}{hold_txt}")
    else:
        report(OK, "静止区間", f"{head}。{', '.join(desc) if desc else '数える静止なし'}{tail}{hold_txt}")
    # ゆっくり動くだけの長い区間(静止ではないが動きは小さい)
    cover_s = np.zeros(n, dtype=bool)
    for i in np.where(slow)[0]:
        cover_s[max(0, i - step + 1): i + 1] = True
    slow_runs = [(s / fps, e / fps) for s, e in runs_of(cover_s) if (e - s) / fps >= 1.5]
    if slow_runs:
        report(WARN, "ゆっくりした動き", ", ".join(f"{fmt_t(s)}-{fmt_t(e)}" for s, e in slow_runs[:6]) +
               " は静止ではないが動きが小さい(1.5秒以上)。見せ場でなければ動きを足すか短くする。連続画像で目視")
    # 台帳の健全性
    if holds:
        hold_total = sum(e - s for s, e in holds)
        if noreason:
            report(WARN, "holds.json", f"reason(理由)が空の行があります: {noreason}")
        if hold_total > 0.2 * dur:
            report(WARN, "holds.json", f"登録した間が合計 {hold_total:.1f}s(全体の{hold_total / dur * 100:.0f}%)。台帳が検査を骨抜きにしていないか")
        else:
            report(OK, "holds.json", f"{len(holds)}件・合計 {hold_total:.1f}s")

    # ---- 5. 冒頭0.3秒の動き
    k = min(n - 1, max(1, round(0.3 * fps)))
    head_motion = float(max(np.abs(f32[i] - f32[0]).mean() for i in range(1, k + 1))) if n > 1 else 0.0
    if head_motion >= 1.0:
        report(OK, "冒頭の動き", f"0.3秒以内に動きあり(0コマ目との最大差 {head_motion:.1f})")
    elif head_motion >= 0.3:
        report(WARN, "冒頭の動き", f"冒頭0.3秒の動きが小さい(差 {head_motion:.2f})")
    else:
        report(WARN, "冒頭の動き", f"冒頭0.3秒がほぼ静止(差 {head_motion:.2f})。意図した溜めなら可。0コマ目が完成した絵か目視")

    # ---- 6. 音声
    if not au:
        report(WARN, "音声", "音声ストリームがありません(無音の作品なら可)")
    else:
        adur = float(au[0].get("duration") or dur)
        if abs(adur - dur) > 0.15:
            report(WARN, "音の長さ", f"音 {adur:.2f}s と映像 {dur:.2f}s がずれています")
        _, err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-vn", "-af",
                      "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"])
        m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", err, re.S)
        if not m:
            report(WARN, "ラウドネス", "loudnorm の結果を読めませんでした")
        else:
            j = json.loads(m.group(0))
            lufs, tp, lra = float(j["input_i"]), float(j["input_tp"]), float(j["input_lra"])
            if -15.0 <= lufs <= -13.0:
                report(OK, "統合ラウドネス", f"{lufs:.1f} LUFS(目標 -14)")
            elif -17.0 <= lufs <= -12.0:
                report(WARN, "統合ラウドネス", f"{lufs:.1f} LUFS(目標 -14。落ち着いた作品は -16 まで可)")
            else:
                report(NG, "統合ラウドネス", f"{lufs:.1f} LUFS(目標 -14)")
            if tp <= -1.0:
                report(OK, "真のピーク", f"{tp:.1f} dBTP(上限 -1)")
            elif tp <= -0.1:
                report(WARN, "真のピーク", f"{tp:.1f} dBTP(上限 -1 を超過)")
            else:
                report(NG, "真のピーク", f"{tp:.1f} dBTP(クリップの恐れ)")
            if lra < 1.0:
                report(WARN, "音の起伏", f"LRA {lra:.1f} LU: 平らな壁のような音(迫力のある作品は3LU以上が目安)")
            else:
                report(OK, "音の起伏", f"LRA {lra:.1f} LU")
        _, err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-vn", "-af",
                      "silencedetect=noise=-50dB:d=0.3", "-f", "null", "-"])
        starts = [float(x) for x in re.findall(r"silence_start: ([-0-9.]+)", err)]
        ends = [float(x) for x in re.findall(r"silence_end: ([-0-9.]+)", err)]
        spans = []
        for i, s in enumerate(starts):
            s = max(0.0, s)
            e = ends[i] if i < len(ends) else adur
            spans.append((s, e))
        mid = [(s, e) for s, e in spans if s > 0.05 and e < adur - 0.05]
        edge = [(s, e) for s, e in spans if not (s > 0.05 and e < adur - 0.05)]
        tail_sil = [(s, e) for s, e in edge if e >= adur - 0.05 and e - s >= 1.0]
        if mid and max(e - s for s, e in mid) >= 2.0:
            report(NG, "無音区間", f"途中に2秒以上の無音: {', '.join(f'{fmt_t(s)}-{fmt_t(e)}' for s, e in mid)}")
        elif mid or tail_sil:
            allsp = mid + tail_sil
            report(WARN, "無音区間", f"{', '.join(f'{fmt_t(s)}-{fmt_t(e)}' for s, e in allsp)}(意図した間か確認。音楽がロゴより先に消えていないか)")
        else:
            report(OK, "無音区間", "-50dB 未満が0.3秒以上続く所なし")

    # ---- まとめ
    c = {k: sum(1 for r in RESULTS if r[0] == k) for k in (OK, WARN, NG)}
    print(f"-- 合格 {c[OK]} / 注意 {c[WARN]} / 不合格 {c[NG]}")
    return 1 if c[NG] else 0


if __name__ == "__main__":
    sys.exit(main())
