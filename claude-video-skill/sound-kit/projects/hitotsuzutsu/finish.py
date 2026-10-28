#!/usr/bin/env python3
"""比較パックを作る: A(既存の音)/ B / C を、名前を伏せた記号のファイル名で、同じ条件にそろえて書き出す。
そろえる条件(3 本とも同じ手順):
  1. AAC 1 世代: A は元の mp4 の AAC(44.1 kHz・約 255 kbps)そのもの。B / C も同じ形(44.1 kHz・256 kbps の AAC)に
     1 度符号化してから戻す。A だけ高域(15 kHz 以上)が欠ける・符号化の癖がある、という手がかりを減らすため(音質より伏せ方を優先。
     B / C の元の WAV は WORK/B|C/mix.wav に残る)
  2. ffmpeg で 48 kHz に戻す → ゲインで統合 -14.0 LUFS(ffmpeg ebur128 で測る)→ 3 本とも同じリミッター(真のピーク -2.3 dBTP、
     A の元の値)を通す(標本ピークの天井をそろえる)
  3. AAC 192 kbps・48 kHz で映像(-c:v copy、変更なし)と結合
記号の対応は git の中の固定の表 docs/sound-upgrade/answer_key/key.json を読む(作り直しても記号は変わらない)。
usage: python finish.py              → WORK/compare/<記号>.mp4、WORK/compare_wav/<記号>.wav、WORK/compare_levels.json
       python finish.py --publish    → さらに docs/sound-upgrade/compare/ に mp4 を写し、answer_key/ANSWER_KEY.md を書く
       python finish.py --new-key    → 記号を引き直す(git の中の表と mp4 を作り直す時だけ)
"""
import argparse
import json
import os
import secrets
import shutil
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402

TARGET, CEIL = -14.0, -2.3
DOCS = os.path.join(C.REPO, "docs", "sound-upgrade")
COMPARE_GIT = os.path.join(DOCS, "compare")
KEYDIR = os.path.join(DOCS, "answer_key")
KEYFILE = os.path.join(KEYDIR, "key.json")
OUT = os.path.join(C.WORK, "compare")
WAVDIR = os.path.join(C.WORK, "compare_wav")
SRC = {"A": os.path.join(C.WORK, "src", "A_original_audio.m4a"),
       "B": os.path.join(C.WORK, "B", "mix.wav"), "C": os.path.join(C.WORK, "C", "mix.wav")}
DESC = {"A": "既存の sound-kit 版(motion2d-hitotsuzutsu の元の音そのまま。比較用にラウドネスと頂点の天井だけそろえた)",
        "B": "earshot 版(効果音はすべて earshot のバンク/キット。BGM は新しい MIDI)",
        "C": "ハイブリッド版(Kenney の録音 + earshot + MIDI の楽器で音程の身振り。BGM は B と同じ土台)"}


def codes(new):
    if os.path.exists(KEYFILE) and not new:
        return json.load(open(KEYFILE))
    pool = [a + str(d) for a in "HJKMQRVWXZ" for d in range(2, 10)]
    picks = []
    while len(picks) < 3:
        c = secrets.choice(pool)
        if c[0] not in [x[0] for x in picks]:
            picks.append(c)
    key = dict(zip(["A", "B", "C"], picks))
    os.makedirs(KEYDIR, exist_ok=True)
    json.dump(key, open(KEYFILE, "w"), indent=1)
    return key


def decode48(path):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-f", "f32le", "-ac", "2", "-ar", str(C.SR), "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(out, np.float32).reshape(-1, 2).astype(np.float64)[: C.N]
    return np.pad(x, ((0, C.N - len(x)), (0, 0)))


def one_aac_generation(wav):
    """A と同じ形(44.1 kHz・256 kbps AAC)に 1 度符号化して戻す"""
    with tempfile.TemporaryDirectory() as d:
        m4a = os.path.join(d, "g.m4a")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ar", "44100", "-c:a", "aac", "-b:a", "256k", m4a], check=True)
        return decode48(m4a)


def hf_share(x, f0=15000):
    m = x.mean(1); P = np.abs(np.fft.rfft(m)) ** 2; f = np.fft.rfftfreq(len(m), 1 / C.SR)
    return float(10 * np.log10(P[f >= f0].sum() / P[(f >= 20)].sum() + 1e-30))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--publish", action="store_true"); ap.add_argument("--new-key", action="store_true")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True); os.makedirs(WAVDIR, exist_ok=True)
    key = codes(a.new_key)
    rows = {}
    for cond in "ABC":
        x = decode48(SRC[cond]) if cond == "A" else one_aac_generation(SRC[cond])
        I0, TP0, _ = C.ebur(x)
        y = x * C.db(TARGET - I0)
        lim = 0.0
        for _ in range(5):
            y2, lim, _ = C.limiter(y, CEIL)
            I2, _, _ = C.ebur(y2)
            if abs(I2 - TARGET) < 0.03:
                break
            y = y * C.db(TARGET - I2)
        y = y2
        wav = os.path.join(WAVDIR, f"{key[cond]}.wav")
        C.write(wav, y)
        mp4 = os.path.join(OUT, f"{key[cond]}.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(C.WORK, "src", "video_only.mp4"), "-i", wav,
                        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                        "-shortest", "-movflags", "+faststart", mp4], check=True)
        I, TP, LRA = C.ebur(mp4)
        dec = decode48(mp4)
        rows[cond] = {"code": key[cond], "in_lufs": I0, "in_tp": TP0, "limiter_db": round(lim, 2), "wav_lufs_tp_lra": C.ebur(wav),
                      "wav_sample_peak_dbfs": round(float(20 * np.log10(np.abs(y).max())), 3),
                      "mp4_lufs": I, "mp4_tp": TP, "mp4_lra": LRA, "mp4_hf15k_share_db": round(hf_share(dec), 1),
                      "wav_hf15k_share_db": round(hf_share(y), 1), "mp4": mp4, "wav": wav, "mp4_bytes": os.path.getsize(mp4)}
        print(cond, json.dumps(rows[cond], ensure_ascii=False))
    json.dump(rows, open(os.path.join(C.WORK, "compare_levels.json"), "w"), ensure_ascii=False, indent=1)
    if not a.publish:
        print("(WORK にだけ書いた。git の中の比較パックを更新するには --publish)")
        return
    os.makedirs(COMPARE_GIT, exist_ok=True)
    for cond in "ABC":
        shutil.copy(rows[cond]["mp4"], os.path.join(COMPARE_GIT, f"{key[cond]}.mp4"))
    L = ["# 正解表(ANSWER_KEY)", "",
         "> **この表は、試聴の評価が終わるまで利用者に見せない前提のファイルです。** 先に `../compare/LISTENING_SHEET.md` で評価してから開いてください。", "",
         "| 記号 | 条件 | 中身 |", "|---|---|---|"]
    L += [f"| `{key[c]}` | {c} | {DESC[c]} |" for c in "ABC"]
    L += ["", "そろえた条件(3 本とも同じ手順、`finish.py`): AAC 1 世代(A は元の 44.1 kHz AAC、B / C は同じ形に 1 度符号化して戻す)→ "
          f"48 kHz → ゲインで統合 {TARGET} LUFS(ffmpeg ebur128)→ 同じリミッター(真のピーク {CEIL} dBTP)→ AAC 192 kbps 48 kHz、映像は -c:v copy。", "",
          "| 記号 | 元の統合 LUFS | リミッター dB | WAV 標本ピーク dBFS | MP4 LUFS | MP4 真のピーク dBTP | MP4 LRA | 15 kHz 以上の割合 dB | MP4 バイト |",
          "|---|---|---|---|---|---|---|---|---|"]
    for c in "ABC":
        r = rows[c]
        L.append(f"| `{key[c]}` | {r['in_lufs']} | {r['limiter_db']} | {r['wav_sample_peak_dbfs']} | {r['mp4_lufs']} | {r['mp4_tp']} | {r['mp4_lra']} | "
                 f"{r['mp4_hf15k_share_db']} | {r['mp4_bytes']} |")
    L += ["", "## 既知の手がかり(消せなかった物)",
          "- 中身そのものの違い(BGM が A と B / C で違う、など)は伏せられない。`../QA.md` §4 の交絡を参照。",
          "- MP4 のバイト数が数 KB 違う(AAC の符号化の結果。ファイルの大きさから条件は分からないが、完全には同じにできない)。",
          "- 15 kHz 以上のエネルギーの割合が A だけ約 10 dB 少ない(上の表)。符号化ではなく中身の違い(A の元のミックスは符号化の前から少ない。"
          "A は効果音を 3〜8 kHz で LP している)。B / C の高域を削らないとそろわないので、削っていない。",
          "- 標本ピークの天井は 3 本とも同じリミッターでそろえた(差 0.01 dB 未満)。AAC の世代数も 3 本とも 2 回でそろえた(音質より伏せ方を優先)。",
          "- 測定値(LRA など)は条件で違う。評価者には測定値を見せない。", ""]
    open(os.path.join(KEYDIR, "ANSWER_KEY.md"), "w", encoding="utf-8").write("\n".join(L))
    print("published:", COMPARE_GIT, KEYDIR)


if __name__ == "__main__":
    main()
