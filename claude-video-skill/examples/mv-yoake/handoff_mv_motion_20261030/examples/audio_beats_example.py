"""Minimal, non-production example. Requires pip install librosa numpy.
Run only on self-created or authorized audio. No audio downloads or rights grants.
python audio_beats_example.py authorized_audio.wav --out beats.json
"""
import argparse
import json
from pathlib import Path
import numpy as np
import librosa


def analyze(path: str) -> dict:
    y, sr = librosa.load(path, sr=22050, mono=True)
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=512)
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, hop_length=512)
    return {
        "source_file": Path(path).name,
        "sample_rate_used": sr,
        "duration_seconds": round(float(len(y) / sr), 4),
        "tempo_bpm_estimate": float(np.asarray(tempo).reshape(-1)[0]),
        "beat_seconds_candidates": [round(float(x), 4) for x in librosa.frames_to_time(beat_frames, sr=sr, hop_length=512)],
        "onset_seconds_candidates": [round(float(x), 4) for x in librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)],
        "warning": "These are inferred rhythmic events, NOT verified chorus/lyric timings. Manual review required."
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("audio")
    p.add_argument("--out", default="beats.json")
    args = p.parse_args()
    if not Path(args.audio).is_file():
        p.error("Audio file does not exist")
    result = analyze(args.audio)
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {args.out}: BPM estimate {result['tempo_bpm_estimate']:.1f}")

