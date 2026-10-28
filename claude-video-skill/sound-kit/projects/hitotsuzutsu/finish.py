#!/usr/bin/env python3
"""比較パックを作る: A(既存の音、ラウドネスだけ揃えたコピー)/ B / C を、同じ統合ラウドネス・同じ真のピーク上限・同じ符号化
(AAC 192 kbps 48 kHz)で、映像は -c:v copy(再エンコードなし)で付け直し、名前を伏せた記号のファイル名で書き出す。
元の A(元の mp4 とその音声)は変更しない。
usage: $HOME/earshot_env/bin/python finish.py
入力: WORK/src/video_only.mp4, WORK/src/A_original_audio.wav, WORK/B/mix.wav, WORK/C/mix.wav
出力: docs/sound-upgrade/compare/<記号>.mp4(git に入れる軽い物)、WORK/compare_wav/<記号>.wav(git の外)、
      docs/sound-upgrade/compare/ANSWER_KEY.md(正解表。最初は利用者に見せない)
記号の対応は WORK/compare_key.json に保存し、2 回目以降も同じ記号を使う(消すと新しく引き直す)。
"""
import json
import os
import secrets
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402

TARGET, CEIL_WAV, CEIL_MP4 = -14.0, -2.0, -1.0
COMPARE = os.path.join(C.REPO, "docs", "sound-upgrade", "compare")
WAVDIR = os.path.join(C.WORK, "compare_wav")
SRC = {"A": os.path.join(C.WORK, "src", "A_original_audio.wav"),
       "B": os.path.join(C.WORK, "B", "mix.wav"), "C": os.path.join(C.WORK, "C", "mix.wav")}
DESC = {"A": "既存の sound-kit 版(motion2d-hitotsuzutsu の元の音そのまま。ラウドネスと真のピークだけ比較用に揃えた)",
        "B": "earshot 版(効果音はすべて earshot のバンク/キット。BGM は新しい MIDI)",
        "C": "ハイブリッド版(Kenney の録音 + earshot + MIDI の楽器で音程の身振り。BGM は B と同じ土台)"}


def codes():
    p = os.path.join(C.WORK, "compare_key.json")
    if os.path.exists(p):
        return json.load(open(p))
    pool = [a + str(d) for a in "HJKMQRVWXZ" for d in range(2, 10)]
    picks = []
    while len(picks) < 3:
        c = secrets.choice(pool)
        if c not in picks and c[0] not in [x[0] for x in picks]:
            picks.append(c)
    key = dict(zip(["A", "B", "C"], picks))
    json.dump(key, open(p, "w"))
    return key


def match_loudness(x):
    """ゲインだけで TARGET に。真のピークが CEIL_WAV を超える時だけリミッター(A は超えなければゲインのみ)"""
    I, TP, _ = C.ebur(x)
    y = x * C.db(TARGET - I)
    I2, TP2, _ = C.ebur(y)
    lim = 0.0
    if TP2 > CEIL_WAV:
        y, lim, _ = C.limiter(y, CEIL_WAV)
        for _ in range(4):
            I3, TP3, _ = C.ebur(y)
            if abs(I3 - TARGET) < 0.05: break
            y, lim, _ = C.limiter(y * C.db(TARGET - I3), CEIL_WAV)
    return y, {"in_lufs": I, "in_tp": TP, "gain_db": round(TARGET - I, 2), "limiter_db": round(lim, 2)}


def mux(code, wav):
    out = os.path.join(COMPARE, f"{code}.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(C.WORK, "src", "video_only.mp4"), "-i", wav,
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-shortest", "-movflags", "+faststart", out], check=True)
    return out


def main():
    os.makedirs(COMPARE, exist_ok=True); os.makedirs(WAVDIR, exist_ok=True)
    key = codes()
    rows = {}
    for cond, src in SRC.items():
        x, sr = sf.read(src, dtype="float64", always_2d=True)
        if sr != C.SR:
            from scipy.signal import resample_poly
            x = resample_poly(x, C.SR, sr, axis=0)
        x = x[: C.N]
        y, info = match_loudness(x)
        wav = os.path.join(WAVDIR, f"{key[cond]}.wav")
        C.write(wav, y)
        mp4 = mux(key[cond], wav)
        I, TP, LRA = C.ebur(mp4)
        info.update({"wav_lufs_tp_lra": C.ebur(wav), "mp4_lufs": I, "mp4_tp": TP, "mp4_lra": LRA, "mp4": mp4, "wav": wav,
                     "mp4_mb": round(os.path.getsize(mp4) / 1e6, 2)})
        if TP > CEIL_MP4:
            print(f"!! {cond} ({key[cond]}) true peak after AAC {TP} > {CEIL_MP4}")
        rows[cond] = info
        print(cond, key[cond], json.dumps(info, ensure_ascii=False))
    json.dump(rows, open(os.path.join(C.WORK, "compare_levels.json"), "w"), ensure_ascii=False, indent=1)
    lines = ["# 正解表(ANSWER_KEY)", "",
             "> **この表は、試聴の評価が終わるまで利用者に見せない前提のファイルです。** 先に `LISTENING_SHEET.md` で評価してから開いてください。", "",
             "| 記号 | 条件 | 中身 |", "|---|---|---|"]
    for cond in "ABC":
        lines.append(f"| `{key[cond]}` | {cond} | {DESC[cond]} |")
    lines += ["", "揃えた条件(3 本とも): 統合ラウドネス -14.0 LUFS、真のピーク上限 -2 dBTP(WAV)/ -1 dBTP(MP4、AAC 192 kbps 48 kHz)、"
              "映像は同じ映像トラックを -c:v copy。", "",
              "| 記号 | 元の統合 LUFS | 揃えたゲイン dB | リミッター dB | MP4 の LUFS | MP4 の真のピーク dBTP | MP4 の LRA |", "|---|---|---|---|---|---|---|"]
    for cond in "ABC":
        r = rows[cond]
        lines.append(f"| `{key[cond]}` | {r['in_lufs']} | {r['gain_db']} | {r['limiter_db']} | {r['mp4_lufs']} | {r['mp4_tp']} | {r['mp4_lra']} |")
    lines += ["", "A の音は元の mp4 の AAC を一度復号して WAV にし、B / C と同じ手順で AAC にし直した(A だけ符号化が 2 回目になる)。"
              "元の A(`motion2d-hitotsuzutsu/hitotsuzutsu_final.mp4` の音)は変更していない。", ""]
    open(os.path.join(COMPARE, "ANSWER_KEY.md"), "w", encoding="utf-8").write("\n".join(lines))


if __name__ == "__main__":
    main()
