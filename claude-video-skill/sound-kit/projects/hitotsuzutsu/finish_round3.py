#!/usr/bin/env python3
"""第3ラウンドの比較パック: 効果音は 5 本とも C のまま、BGM だけが違う 5 本(第2ラウンドの S9 = light と、Audio Studio の D1–D4)。
5 本とも第2ラウンドと同じ手順: WAV → ゲインで統合 -14.0 LUFS(ffmpeg ebur128)→ 同じリミッター(真のピーク -2.3 dBTP)→
  動画: AAC 192 kbps 48 kHz、映像は -c:v copy / BGM だけ: 谷を入れる前の BGM(D は終わりのフェード後)に、最後 80 ms・最初 5 ms のフェード
  → 同じ手順で -14.0 LUFS → AAC 160 kbps の m4a
記号は git の中の固定の表 docs/sound-upgrade/answer_key/round3_key.json(無ければ --publish の時だけ引いて作る。前のラウンドの記号・頭文字と重ならない。
頭文字 D は条件名と紛れるので使わない)。
usage: python finish_round3.py             → WORK/compare_round3/
       python finish_round3.py --publish   → さらに docs/sound-upgrade/compare_round3/(動画・BGM だけ)と answer_key/ANSWER_KEY_ROUND3.md
"""
import argparse
import json
import os
import secrets
import shutil
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402
import finish_round2 as F2  # noqa: E402  level()・md5_video() を第2ラウンドと同じ物で

DOCS = os.path.join(C.REPO, "docs", "sound-upgrade")
GIT_OUT = os.path.join(DOCS, "compare_round3")
KEYDIR = os.path.join(DOCS, "answer_key")
KEYFILE = os.path.join(KEYDIR, "round3_key.json")
OUT = os.path.join(C.WORK, "compare_round3")
COND = {"S9": ("R3_S9", "基準: 第2ラウンドの S9(light「軽い撥弦とマリンバ」、MIDI + FluidSynth で作曲した BGM)。曲は同じで、ミックスは D1–D4 と同じ規則で作り直した"),
        "D1": ("R3_D1", "Audio Studio(Stable Audio 3 small music)の生成 BGM D1: ピチカート + マリンバ"),
        "D2": ("R3_D2", "Audio Studio の生成 BGM D2: エレピ + ベース + ブラシ"),
        "D3": ("R3_D3", "Audio Studio の生成 BGM D3: ナイロン弦ギター"),
        "D4": ("R3_D4", "Audio Studio の生成 BGM D4: シンセパッド")}


def codes(publish):
    if os.path.exists(KEYFILE):
        return json.load(open(KEYFILE))
    if not publish:
        sys.exit(f"{KEYFILE} が無い。新しく記号を引く時は --publish を付けて実行する(git の中の対応表と食い違わないように)")
    used = set(json.load(open(os.path.join(KEYDIR, "key.json"))).values()) | set(json.load(open(os.path.join(KEYDIR, "round2_key.json"))).values())
    letters = [a for a in "BCGHJKLMNRTWX" if a not in {u[0] for u in used}]
    picks = []
    while len(picks) < len(COND):
        c = secrets.choice(letters) + str(secrets.choice(range(2, 10)))
        if c not in used and c[0] not in [x[0] for x in picks]:
            picks.append(c)
    key = dict(zip(COND, picks))
    os.makedirs(KEYDIR, exist_ok=True)
    json.dump(key, open(KEYFILE, "w"), indent=1)
    return key


def audio_bit_rate(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=bit_rate", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return int(r.stdout.strip())


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--publish", action="store_true")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    key = codes(a.publish)
    rows = {}
    for cond, (d, desc) in COND.items():
        mix, _ = sf.read(os.path.join(C.WORK, d, "mix.wav"), dtype="float64", always_2d=True)
        bgm, _ = sf.read(os.path.join(C.WORK, d, "raw_bgm_only.wav"), dtype="float64", always_2d=True)
        r = {"code": key[cond]}
        bgm = bgm[: C.N].copy()
        nf, ni = int(0.08 * C.SR), int(0.005 * C.SR)
        bgm[-nf:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nf)))[:, None]
        bgm[:ni] *= np.linspace(0, 1, ni)[:, None]
        for kind, x, ext, br in (("mix", mix, "mp4", "192k"), ("bgm", bgm, "m4a", "160k")):
            y, lim = F2.level(x[: C.N])
            stem = f"{key[cond]}{'_bgm' if kind == 'bgm' else ''}"
            wav = os.path.join(OUT, stem + ".wav")
            C.write(wav, y)
            o = os.path.join(OUT, f"{stem}.{ext}")
            if kind == "mix":
                cmd = ["ffmpeg", "-v", "error", "-y", "-i", os.path.join(C.WORK, "src", "video_only.mp4"), "-i", wav, "-map", "0:v:0",
                       "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", br, "-ar", "48000", "-shortest", "-movflags", "+faststart", o]
            else:
                cmd = ["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "aac", "-b:a", br, "-ar", "48000", "-movflags", "+faststart", o]
            subprocess.run(cmd, check=True)
            I, TP, LRA = C.ebur(o)
            r[kind] = {"file": o, "wav": wav, "limiter_db": lim, "lufs": I, "tp": TP, "lra": LRA, "bytes": os.path.getsize(o),
                       "wav_sample_peak_dbfs": round(float(20 * np.log10(np.abs(y).max())), 3)}
            r[kind]["audio_bit_rate"] = audio_bit_rate(o)
            if kind == "mix":
                r[kind]["video_md5"] = F2.md5_video(o)
        rows[cond] = r
        print(cond, json.dumps(r, ensure_ascii=False)[:500])
    rows["_source_video_md5"] = F2.md5_video(os.path.join(C.WORK, "src", "hitotsuzutsu_final.mp4"))
    rows["_total_bytes"] = sum(rows[c][k]["bytes"] for c in COND for k in ("mix", "bgm"))
    json.dump(rows, open(os.path.join(C.WORK, "compare_round3_levels.json"), "w"), ensure_ascii=False, indent=1)
    print("total bytes", rows["_total_bytes"])
    if not a.publish:
        print("(WORK にだけ書いた。git の中を更新するには --publish)")
        return
    os.makedirs(GIT_OUT, exist_ok=True)
    for cond in COND:
        for kind in ("mix", "bgm"):
            shutil.copy(rows[cond][kind]["file"], GIT_OUT)
    write_key(key, rows)
    print("published:", GIT_OUT, KEYDIR)


def write_key(key, rows):
    masters = {c: json.load(open(os.path.join(C.WORK, COND[c][0], "master.json"))) for c in COND}
    L = ["# 正解表(第3ラウンド)", "",
         "> **試聴の評価が終わるまで利用者に見せない前提のファイルです。** 先に `../compare_round3/LISTENING_SHEET_ROUND3.md` で評価してから開いてください。", "",
         "固定の対応表(機械用): `round3_key.json`。", "",
         "| 記号 | 条件 | 中身 | 終わりのフェード(判定の理由) |", "|---|---|---|---|"]
    for c in COND:
        f = masters[c].get("end_fade")
        fs = f"{f['start_s']} s から {f['length_s']} s(raised cosine、15.0 s で無音)" if f else "なし"
        why = "。".join(masters[c].get("ending_reasons") or [])
        if masters[c].get("ending_note"):
            why += "。" + masters[c]["ending_note"]
        L.append(f"| `{key[c]}`(`{key[c]}.mp4` / `{key[c]}_bgm.m4a`) | {c} | {COND[c][1]} | {fs}({why}) |")
    L += ["", "5 本とも効果音は C(併用版)の同じ標本で、C の音程の身振り(チェレスタ・ビブラフォン、Eb 長調の音)も 5 本とも同じ物が入っている。"
          "違うのは BGM だけ。BGM だけの音声には身振りを含めていない。", "",
          "そろえた条件: WAV → ゲインで統合 -14.0 LUFS(ffmpeg ebur128)→ 同じリミッター(-2.3 dBTP)→ 動画は AAC 192 kbps・映像 -c:v copy、BGM だけの音声は AAC 160 kbps の m4a。", "",
          "| 記号 | 種類 | LUFS | 真のピーク dBTP | LRA | 標本ピーク dBFS | リミッター dB | 音声のビットレート bps | バイト |", "|---|---|---|---|---|---|---|---|---|"]
    for c in COND:
        for kind in ("mix", "bgm"):
            q = rows[c][kind]
            L.append(f"| `{key[c]}` | {'動画' if kind == 'mix' else 'BGM だけ'} | {q['lufs']} | {q['tp']} | {q['lra']} | {q['wav_sample_peak_dbfs']} | {q['limiter_db']} | {q['audio_bit_rate']} | {q['bytes']} |")
    br = {c: rows[c]["mix"]["audio_bit_rate"] for c in COND}
    top = max(br, key=br.get)
    L += ["", "## 評価で気を付けること",
          f"- D1(`{key['D1']}`)と D3(`{key['D3']}`)の ③「効果音と合っているか」は、Eb 長調に固定した身振り(チェレスタ・ビブラフォン)と BGM の調が合わないことを含めた評価になる"
          "(プロンプトでは 4 本とも「E-flat major」を指定したが、モデルはその指定どおりにならなかった。調の推定は `AUDIT_ROUND3_BY_PLAN.md`)。", "",
          "## 既知の手がかり(消せなかった物)",
          f"- 基準の `{key['S9']}` は、第2ラウンドで聴いた S9 と同じ曲。ミックスは第3ラウンドの規則で作り直したので、第2ラウンドの S9 のファイルとはバイト単位では同じではない。"
          "第2ラウンドを覚えている人には曲で基準が分かる。",
          "- 生成 BGM(D1–D4)は高い音域がほとんど無い(平均スペクトルが最大から -60 dB になる所: D1・D3 約 7.9 kHz、D2 約 14.0 kHz、D4 約 4.2 kHz。S9 は約 20.9 kHz)。"
          "BGM だけの音声では、こもった感じとして分かるかもしれない。",
          "- 生成 BGM 4 本は終わりにフェードを足した(上の表)。S9 は作曲した終わり方(タイトルで Eb に解決して減衰)。",
          f"- 動画の音声のビットレートが条件で違う(上の表。最大は `{key[top]}` の {br[top] / 1000:.1f} kbps。AAC の指定は 5 本とも 192 kbps で、中身によって実際の値が変わる)。",
          "- LRA・リミッターの量・ファイルの大きさが条件で違う(上の表)。",
          "- 条件ごとの検査の数値は `QA_ROUND3_BY_CONDITION.md`、D1–D4 と S9 の BGM の点検は `AUDIT_ROUND3_BY_PLAN.md`(このフォルダ)。", ""]
    open(os.path.join(KEYDIR, "ANSWER_KEY_ROUND3.md"), "w", encoding="utf-8").write("\n".join(L))


if __name__ == "__main__":
    main()
