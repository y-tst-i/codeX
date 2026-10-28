#!/usr/bin/env python3
"""第2ラウンドの比較パック: 効果音は 3 本とも C のまま、BGM だけが違う 3 本(基準 = C の BGM、新しい warm、新しい light)。
3 本とも同じ手順: WAV → ゲインで統合 -14.0 LUFS(ffmpeg ebur128)→ 同じリミッター(真のピーク -2.3 dBTP)→
  動画: AAC 192 kbps 48 kHz、映像は -c:v copy / BGM だけ: 同じ手順で -14.0 LUFS → AAC 160 kbps の m4a
記号は git の中の固定の表 docs/sound-upgrade/answer_key/round2_key.json(無ければ引いて作る。第1ラウンドの記号とは重ならない)。
usage: python finish_round2.py             → WORK/compare_round2/
       python finish_round2.py --publish   → さらに docs/sound-upgrade/compare_round2/ と answer_key/ANSWER_KEY_ROUND2.md
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

TARGET, CEIL = -14.0, -2.3
DOCS = os.path.join(C.REPO, "docs", "sound-upgrade")
GIT_OUT = os.path.join(DOCS, "compare_round2")
KEYDIR = os.path.join(DOCS, "answer_key")
KEYFILE = os.path.join(KEYDIR, "round2_key.json")
OUT = os.path.join(C.WORK, "compare_round2")
COND = {"base": ("C", "基準: C(併用版)そのまま。BGM は第1ラウンドの物(今の Z9 と同じ音)"),
        "warm": ("R2_warm", "新しい BGM 案 1「温かいピアノと弦」: ピアノのオスティナート + アコースティックベース + 弦 + シェイカー + 弱いキック"),
        "light": ("R2_light", "新しい BGM 案 2「軽い撥弦とマリンバ」: ピチカートのオスティナート + マリンバの旋律 + 指弾きベース + エレピ + リム/ハット/キック")}


def codes(publish):
    if os.path.exists(KEYFILE):
        return json.load(open(KEYFILE))
    if not publish:
        sys.exit(f"{KEYFILE} が無い。新しく記号を引く時は --publish を付けて実行する(git の中の対応表と食い違わないように)")
    used = set(json.load(open(os.path.join(KEYDIR, "key.json"))).values())
    pool = [a + str(d) for a in "BCDFGLNPST" for d in range(2, 10)]
    picks = []
    while len(picks) < 3:
        c = secrets.choice(pool)
        if c not in used and c[0] not in [x[0] for x in picks]:
            picks.append(c)
    key = dict(zip(["base", "warm", "light"], picks))
    os.makedirs(KEYDIR, exist_ok=True)
    json.dump(key, open(KEYFILE, "w"), indent=1)
    return key


def level(x):
    I0 = C.ebur(x)[0]
    y = x * C.db(TARGET - I0)
    lim = 0.0
    for _ in range(5):
        y2, lim, _ = C.limiter(y, CEIL)
        I2 = C.ebur(y2)[0]
        if abs(I2 - TARGET) < 0.03:
            break
        y = y * C.db(TARGET - I2)
    return y2, round(lim, 2)


def md5_video(mp4):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-map", "0:v:0", "-c", "copy", "-f", "md5", "-"], capture_output=True, text=True)
    return r.stdout.strip()


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
        nf, ni = int(0.08 * C.SR), int(0.005 * C.SR)            # BGM だけの音声: 最後に 80 ms・最初に 5 ms のフェード
        bgm[-nf:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, nf)))[:, None]
        bgm[:ni] *= np.linspace(0, 1, ni)[:, None]
        for kind, x, ext, br in (("mix", mix, "mp4", "192k"), ("bgm", bgm, "m4a", "160k")):
            y, lim = level(x[: C.N])
            wav = os.path.join(OUT, f"{key[cond]}{'_bgm' if kind == 'bgm' else ''}.wav")
            C.write(wav, y)
            o = os.path.join(OUT, f"{key[cond]}{'_bgm' if kind == 'bgm' else ''}.{ext}")
            if kind == "mix":
                cmd = ["ffmpeg", "-v", "error", "-y", "-i", os.path.join(C.WORK, "src", "video_only.mp4"), "-i", wav, "-map", "0:v:0",
                       "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", br, "-ar", "48000", "-shortest", "-movflags", "+faststart", o]
            else:
                cmd = ["ffmpeg", "-v", "error", "-y", "-i", wav, "-c:a", "aac", "-b:a", br, "-ar", "48000", "-movflags", "+faststart", o]
            subprocess.run(cmd, check=True)
            I, TP, LRA = C.ebur(o)
            r[kind] = {"file": o, "wav": wav, "limiter_db": lim, "lufs": I, "tp": TP, "lra": LRA, "bytes": os.path.getsize(o),
                       "wav_sample_peak_dbfs": round(float(20 * np.log10(np.abs(y).max())), 3)}
            if kind == "mix":
                r[kind]["video_md5"] = md5_video(o)
        rows[cond] = r
        print(cond, json.dumps(r, ensure_ascii=False)[:600])
    rows["_source_video_md5"] = md5_video(os.path.join(C.WORK, "src", "hitotsuzutsu_final.mp4"))
    json.dump(rows, open(os.path.join(C.WORK, "compare_round2_levels.json"), "w"), ensure_ascii=False, indent=1)
    if not a.publish:
        print("(WORK にだけ書いた。git の中を更新するには --publish)")
        return
    os.makedirs(GIT_OUT, exist_ok=True)
    for cond in COND:
        for kind in ("mix", "bgm"):
            shutil.copy(rows[cond][kind]["file"], GIT_OUT)
    L = ["# 正解表(第2ラウンド)", "", "> **試聴の評価が終わるまで利用者に見せない前提のファイルです。** 先に `../compare_round2/LISTENING_SHEET_ROUND2.md` で評価してから開いてください。", "",
         "| 記号 | 条件 | 中身 |", "|---|---|---|"]
    L += [f"| `{key[c]}`(`{key[c]}.mp4` / `{key[c]}_bgm.m4a`) | {c} | {COND[c][1]} |" for c in COND]
    L += ["", "3 本とも効果音は C(併用版)の同じ標本。違うのは BGM だけ。BGM だけの音声には、C の音程の身振り(チェレスタ・ビブラフォン)を"
          "効果音の側として含めていない(動画には 3 本とも同じ物が入っている)。基準の BGM だけの音声は、C の BGM から身振りを除いて同じ処理で作り直した物"
          "(身振りと一緒に掛かっていた音楽バスの圧縮の掛かり方がわずかに違う)。", "",
          "そろえた条件: WAV → ゲインで統合 -14.0 LUFS(ffmpeg ebur128)→ 同じリミッター(-2.3 dBTP)→ 動画は AAC 192 kbps・映像 -c:v copy、BGM だけの音声は AAC 160 kbps の m4a。", "",
          "| 記号 | 種類 | LUFS | 真のピーク dBTP | LRA | 標本ピーク dBFS | リミッター dB | バイト |", "|---|---|---|---|---|---|---|---|"]
    for c in COND:
        for kind in ("mix", "bgm"):
            q = rows[c][kind]
            L.append(f"| `{key[c]}` | {'動画' if kind == 'mix' else 'BGM だけ'} | {q['lufs']} | {q['tp']} | {q['lra']} | {q['wav_sample_peak_dbfs']} | {q['limiter_db']} | {q['bytes']} |")
    lim_b = {c: rows[c]["bgm"]["limiter_db"] for c in COND}
    L += ["", "## 既知の手がかり(消せなかった物)",
          "- 基準の BGM は、第1ラウンドで聴いた Z9 と同じ C のミックス(効果音も同じ)。第1ラウンドを覚えている人には基準が分かる。",
          "- LRA が条件で大きく違う(上の表)。静と動の差の大きさは編曲の違いそのもので、そろえていない。",
          f"- BGM だけの音声を -14 LUFS にそろえる時のリミッターの量が違う({', '.join(f'{key[c]} {lim_b[c]} dB' for c in COND)})。基準は BGM に深い落ち込みがあるため大きい。",
          "- ファイルの大きさが数 KB 違う(AAC の結果。上の表)。",
          "- 条件ごとの検査の数値は `QA_ROUND2_BY_CONDITION.md`(このフォルダ)。", ""]
    open(os.path.join(KEYDIR, "ANSWER_KEY_ROUND2.md"), "w", encoding="utf-8").write("\n".join(L))
    print("published:", GIT_OUT, KEYDIR)


if __name__ == "__main__":
    main()
