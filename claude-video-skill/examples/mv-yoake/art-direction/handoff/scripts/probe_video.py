#!/usr/bin/env python3
"""Probe source video and extract stills at explicit timestamps; requires FFmpeg/ffprobe."""
import argparse
import json
import shutil
import subprocess
from pathlib import Path


def run(*args):
    return subprocess.run(args, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("video", type=Path)
    p.add_argument("--out", type=Path, default=Path("review_baseline"))
    p.add_argument("--times", type=float, nargs="+", default=[8, 16, 28, 40, 49])
    args = p.parse_args()
    for cmd in ("ffprobe", "ffmpeg"):
        if not shutil.which(cmd):
            raise SystemExit(f"Missing executable: {cmd}")
    if not args.video.is_file():
        raise SystemExit(f"Video not found: {args.video}")
    args.out.mkdir(parents=True, exist_ok=True)
    meta = json.loads(run("ffprobe", "-v", "error", "-show_entries",
                          "format=duration:stream=codec_type,width,height,r_frame_rate", "-of", "json", str(args.video)).stdout)
    (args.out / "video_probe.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    duration = float(meta.get("format", {}).get("duration", "0"))
    for t in args.times:
        if not (0 <= t < duration):
            raise SystemExit(f"Out-of-range timestamp {t}, duration={duration}")
        path = args.out / f"at_{t:g}s.jpg"
        # Seek accurately by decoding from beginning. Slower but aligned to requested timestamp.
        run("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(args.video),
            "-vf", f"select='gte(t,{t})'", "-frames:v", "1", "-q:v", "2", str(path))
    print(f"Extracted {len(args.times)} frames in {args.out}; see video_probe.json")


if __name__ == "__main__":
    main()
