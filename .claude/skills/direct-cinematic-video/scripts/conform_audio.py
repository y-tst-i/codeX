"""Two-pass audio conformance with unchanged video packets and no source overwrite."""
import argparse
from fractions import Fraction
import json
from pathlib import Path
import re
import subprocess
import sys


def run(command):
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(result.stderr[-2000:] or result.stdout[-2000:])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--work-dir', type=Path, required=True)
    parser.add_argument('--lufs', type=float, required=True)
    parser.add_argument('--true-peak', type=float, required=True)
    parser.add_argument('--rate', type=int, required=True)
    parser.add_argument('--duration', type=float, required=True)
    args = parser.parse_args()
    source, output, work = args.source.resolve(), args.output.resolve(), args.work_dir.resolve()
    candidate = output.with_name(output.stem+'.candidate.mp4')
    if not source.is_file() or output == source or output.exists() or candidate.exists():
        parser.error('Use an existing source and a new separate output path')
    if not -70 <= args.lufs <= -5 or not -9 <= args.true_peak <= 0 or args.rate <= 0 or args.duration <= 0:
        parser.error('Invalid explicit delivery target')
    work.mkdir(parents=True, exist_ok=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    probe = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(source)]).stdout)
    video = next(s for s in probe['streams'] if s['codec_type']=='video')
    if not any(s['codec_type']=='audio' for s in probe['streams']):
        parser.error('There is no audio to conform; do not invent an audio bed')
    scan = run(['ffmpeg','-hide_banner','-nostdin','-nostats','-i',str(source),'-map','0:a:0',
                '-af',f'loudnorm=I={args.lufs}:TP={args.true_peak}:LRA=11:print_format=json','-f','null','-'])
    match = re.search(r'\{\s*"input_i"[\s\S]*?\}',scan.stderr)
    if not match:
        raise RuntimeError('No measured loudness; conformance was not attempted')
    measured = json.loads(match.group())
    (work/'loudness_before.json').write_text(json.dumps(measured,indent=2),encoding='utf-8')
    filter_text = (f'loudnorm=I={args.lufs}:TP={args.true_peak}:LRA=11:'
                   f'measured_I={measured["input_i"]}:measured_TP={measured["input_tp"]}:'
                   f'measured_LRA={measured["input_lra"]}:measured_thresh={measured["input_thresh"]}:'
                   f'offset={measured["target_offset"]}:linear=true:print_format=json,'
                   f'aresample={args.rate},atrim=end={args.duration},asetpts=PTS-STARTPTS')
    command = ['ffmpeg','-hide_banner','-nostdin','-i',str(source),'-map','0:v:0','-map','0:a:0',
               '-c:v','copy','-af',filter_text,'-c:a','aac','-b:a','192k','-ar',str(args.rate),
               '-t',str(args.duration),'-movflags','+faststart',str(candidate)]
    (work/'conform_command.json').write_text(json.dumps(command,ensure_ascii=False,indent=2),encoding='utf-8')
    result = run(command)
    (work/'conform_log.txt').write_text(result.stderr,encoding='utf-8')
    report = work/'technical.json'
    checker = Path(__file__).with_name('media_check.py')
    run([sys.executable,str(checker),str(candidate),'--report',str(report),
         '--width',str(video['width']),'--height',str(video['height']),
         '--fps',str(float(Fraction(video['avg_frame_rate']))),'--duration',str(args.duration),
         '--audio-rate',str(args.rate),'--lufs',str(args.lufs),'--true-peak',str(args.true_peak)])
    def video_hash(path):
        return run(['ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-c','copy','-f','hash','-hash','sha256','-']).stdout.strip()
    hashes = {'source':video_hash(source),'candidate':video_hash(candidate)}
    hashes['unchanged_video_packets'] = hashes['source'] == hashes['candidate']
    (work/'video_preservation.json').write_text(json.dumps(hashes,indent=2),encoding='utf-8')
    if not hashes['unchanged_video_packets']:
        raise RuntimeError('Video changed; candidate retained and output not promoted')
    candidate.rename(output)
    verified = json.loads(report.read_text(encoding='utf-8'))
    verified['source'] = str(output)
    verified['conformed_from'] = str(source)
    report.write_text(json.dumps(verified,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'output':str(output),'technical_pass':verified['technical_pass'],
                      'sha256':verified['sha256'],'unchanged_video_packets':True},ensure_ascii=False))


if __name__ == '__main__':
    main()
