#!/usr/bin/env python3
"""文字起こしで行の時刻を裏取りする(faster-whisper の入った Python で動かす。汎用)。
同じ音を条件を変えて何回か起こし、語の開始時刻がそろうかを見る(そろわない行は「要確認」)。
  条件: 入力(原音/歌の強調)× 切り出しの開始(0 と、途中から)× 文脈の手がかり(元の歌詞の有無)
使い方: <whisper の python> whisper_check.py <出力.json> <歌詞.txt> <名前=wav[@開始秒]> ...
"""
import json, sys
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

out, lyr = sys.argv[1:3]; prompt = open(lyr, encoding="utf-8").read().strip()
m = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=4)
res = {}
for spec in sys.argv[3:]:
    name, rest = spec.split("=", 1); path, _, off = rest.partition("@"); off = float(off or 0)
    a = decode_audio(path, sampling_rate=16000)[int(off * 16000):]
    for use_prompt in (True, False):
        segs, _ = m.transcribe(a, language="ja", word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=False, initial_prompt=prompt if use_prompt else None)
        key = f"{name}{'+P' if use_prompt else ''}"
        res[key] = [{"s": round(w.start + off, 2), "e": round(w.end + off, 2), "w": w.word, "p": round(w.probability, 2)} for s in segs for w in (s.words or [])]
        print(key, "".join(w["w"] for w in res[key])[:120])
json.dump(res, open(out, "w"), ensure_ascii=False, indent=0)
