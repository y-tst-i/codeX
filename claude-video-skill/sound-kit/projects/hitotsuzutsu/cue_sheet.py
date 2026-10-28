#!/usr/bin/env python3
"""B / C の実際の配置(WORK/B|C/events.json)から、音響キュー表の表を docs/sound-upgrade/CUE_SHEET.md に書き込む。
手で書いた説明は残し、<!-- tables:begin --> と <!-- tables:end --> の間だけを置き換える。
列: 合図 / 絵の時刻 / 素材(出どころ)/ 鳴り始め / 同期点(頂点か立ち上がり)の時刻 / 音量(素材に掛けたゲイン dB と、基準にした下地 LUFS)/
    加工 / 余韻(素材の長さ)/ 音楽との関係(メモ)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402

DOC = os.path.join(C.REPO, "docs", "sound-upgrade", "CUE_SHEET.md")
WORK_DOC = os.path.join(C.WORK, "CUE_SHEET_tables.md")


def src_of(s):
    s = str(s)
    if "/" in s:
        return f"earshot `{s}`"
    return f"Kenney `{s}`"


def fx(e):
    out = []
    if e.get("hp"): out.append(f"HP {e['hp']}")
    if e.get("lp"): out.append(f"LP {e['lp']}")
    if e.get("rate"): out.append(f"速さ ×{e['rate']}")
    if e.get("pitch"): out.append(f"音程 {e['pitch']}")
    if e.get("dur"): out.append(f"dur {e['dur']}")
    if e.get("apex"): out.append(f"apex {e['apex']}")
    if e.get("max_s"): out.append(f"{e['max_s']} s で切る")
    if e.get("pan"): out.append(f"パン {e['pan']:+.2f}")
    if e.get("peak_capped"): out.append("頂点の上限")
    return "、".join(out) or "—"


def table(cond):
    ev = json.load(open(os.path.join(C.WORK, cond, "events.json")))
    info = json.load(open(os.path.join(C.WORK, cond, "master.json")))
    lines = [f"### {cond} の表(実際に置いた値。`make_{cond}.py` の実行結果から自動生成)", "",
             "「絵のコマ」= 狙った絵のコマ番号(30 fps)。「狙い − 絵」= 音を向けた時刻と絵のコマの差(意図した前後: 連打の最小間隔、"
             "層を後ろにずらす等)、「同期点 − 絵」= 素材の同期点が実際に来た時刻と絵のコマの差。", "",
             "| # | 合図 | 絵のコマ (s) | 素材 | 鳴り始め (s) | 同期点 (s) | 狙い − 絵 / 同期点 − 絵 (ms) | ゲイン dB / 下地 LUFS | 加工 | メモ(音楽との関係・理由) |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for i, e in enumerate(ev, 1):
        sync = e.get("align") or ("peak" if cond == "C" else "onset")
        fr = f"f{e['pic_frame']} ({e['pic_frame_s']:.3f})" if "pic_frame" in e else "—"
        dd = f"{e['aim_minus_frame_ms']:+.0f} / {e['sync_minus_frame_ms']:+.0f}" if "pic_frame" in e else "—"
        lines.append(f"| {i} | {e['cue']} | {fr} | {src_of(e.get('sound'))}{' (' + e['role'] + ')' if e.get('role') else ''} | "
                     f"{e['start_s']:.3f} | {e['sync_at_s']:.3f}({sync}) | {dd} | {e['gain_db']:+.1f} / {e['bed_lufs']:.1f}{'(基準値)' if e['bed_nominal'] else ''} | "
                     f"{fx(e)} | {e.get('note', '')} |")
    lines += ["", f"音を付けなかった合図({cond}):", ""]
    for k, v in info.get("silent", {}).items():
        lines.append(f"- `{k}`: {v}")
    lines += ["", f"仕上げ({cond}): {info['lufs']} LUFS、真のピーク {info['tp']} dBTP、LRA {info['lra']} LU、リミッター最大 {info['limiter_max_db']} dB。"
              f"音楽が止まっている所の下地の基準値 {info.get('nominal_bed_lufs')} LUFS(仕上げ前)。", ""]
    return "\n".join(lines)


def main():
    """既定では WORK/CUE_SHEET_tables.md にだけ書く。--publish で git の中の CUE_SHEET.md の表の部分を置き換える"""
    body = "\n" + table("B") + "\n" + table("C") + "\n"
    open(WORK_DOC, "w", encoding="utf-8").write(body)
    if "--publish" not in sys.argv:
        print("wrote", WORK_DOC, "(git の中の CUE_SHEET.md を更新するには --publish)")
        return
    doc = open(DOC, encoding="utf-8").read()
    a, b = "<!-- tables:begin -->", "<!-- tables:end -->"
    doc = doc[: doc.index(a) + len(a)] + body + doc[doc.index(b):]
    open(DOC, "w", encoding="utf-8").write(doc)
    print("updated", DOC)


if __name__ == "__main__":
    main()
