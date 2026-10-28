"""Read-only local media verification; technical success is not subjective QA."""
from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys


def run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, text=True, encoding='utf-8', errors='replace')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--report', type=Path, required=True)
    for name in ('width', 'height', 'audio-rate'):
        parser.add_argument('--'+name, type=int)
    for name in ('fps', 'duration', 'lufs'):
        parser.add_argument('--'+name, type=float)
    parser.add_argument('--duration-tolerance', type=float, default=.12)
    parser.add_argument('--true-peak', type=float)
    parser.add_argument('--allow-silent', action='store_true')
    args = parser.parse_args()
    source, report = args.source.resolve(), args.report.resolve()
    if not source.is_file() or report == source:
        parser.error('Readable local source and a separate report path are required')
    if report.exists():
        parser.error('Report exists; choose a new evidence path')
    if not all(shutil.which(tool) for tool in ('ffprobe', 'ffmpeg')):
        parser.error('Use an existing FFmpeg/FFprobe environment')
    probe = run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(source)])
    if probe.returncode:
        parser.error('ffprobe failed: '+probe.stderr[-1200:])
    metadata = json.loads(probe.stdout)
    videos = [s for s in metadata['streams'] if s.get('codec_type') == 'video']
    audios = [s for s in metadata['streams'] if s.get('codec_type') == 'audio']
    checks = {'video_streams': len(videos) == 1,
              'audio_streams': len(audios) == 1 or (args.allow_silent and not audios)}
    v = videos[0] if videos else {}
    for field in ('width', 'height'):
        wanted = getattr(args, field)
        if wanted is not None:
            checks[field] = v.get(field) == wanted
    if args.fps is not None:
        try:
            checks['fps'] = abs(float(Fraction(v.get('avg_frame_rate', '0/1'))) - args.fps) <= .02
        except (ValueError, ZeroDivisionError):
            checks['fps'] = False
    if args.duration is not None:
        checks['duration'] = abs(float(metadata['format'].get('duration', -1)) - args.duration) <= args.duration_tolerance
    if args.audio_rate is not None:
        checks['audio_rate'] = bool(audios) and int(audios[0]['sample_rate']) == args.audio_rate
    decode = run(['ffmpeg', '-hide_banner', '-nostdin', '-v', 'error', '-xerror', '-i', str(source),
                  '-map', '0:v', '-map', '0:a?', '-f', 'null', '-'])
    checks['full_decode'] = decode.returncode == 0 and not decode.stderr.strip()
    loudness = None
    if args.lufs is not None or args.true_peak is not None:
        if audios:
            # Scan parameters are not acceptance targets unless requested below.
            scan_i = args.lufs if args.lufs is not None else -16
            scan_tp = args.true_peak if args.true_peak is not None else -1.5
            scan = run(['ffmpeg', '-hide_banner', '-nostdin', '-nostats', '-i', str(source), '-map', '0:a:0',
                        '-af', f'loudnorm=I={scan_i}:TP={scan_tp}:LRA=11:print_format=json', '-f', 'null', '-'])
            match = re.search(r'\{\s*"input_i"[\s\S]*?\}', scan.stderr)
            if scan.returncode == 0 and match:
                loudness = json.loads(match.group())
        if args.lufs is not None:
            checks['loudness'] = loudness is not None and abs(float(loudness['input_i']) - args.lufs) <= 1
        if args.true_peak is not None:
            checks['true_peak'] = loudness is not None and float(loudness['input_tp']) <= args.true_peak + .2
    with source.open('rb') as handle:
        checksum = hashlib.file_digest(handle, 'sha256').hexdigest()
    requested = {key: getattr(args, key) for key in ('width', 'height', 'fps', 'duration', 'audio_rate', 'lufs', 'true_peak')}
    result = {'source': str(source), 'sha256': checksum, 'checks': checks, 'requested_spec': requested,
              'technical_pass': all(checks.values()), 'metadata': metadata,
              'loudness': loudness, 'decode_error': decode.stderr,
              'visual_review': 'NOT_VERIFIED_BY_THIS_SCRIPT',
              'audio_listening': 'NOT_VERIFIED_BY_THIS_SCRIPT'}
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'technical_pass': result['technical_pass'], 'checks': checks,
                      'report': str(report)}, ensure_ascii=False))
    return 0 if result['technical_pass'] else 1


if __name__ == '__main__':
    sys.exit(main())
