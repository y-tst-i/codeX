"""Validate proposed shot-plan continuity; not tied to HyperFrames internals.
Run: python validate_shot_spec.py shot_spec.example.json
"""
import json
import sys
from pathlib import Path


def validate(path):
    spec = json.loads(Path(path).read_text(encoding='utf-8'))
    project = spec['project']
    shots = spec['shots']
    total = project['duration_frames']
    errors = []
    cursor = 0
    ids = set()
    for shot in shots:
        sid = shot['id']
        a, b = shot['start_frame'], shot['end_frame']
        if sid in ids: errors.append(f'{sid}: duplicate id')
        ids.add(sid)
        if not isinstance(a, int) or not isinstance(b, int) or b <= a:
            errors.append(f'{sid}: invalid interval {a}..{b}')
        if a != cursor:
            errors.append(f'{sid}: expected start {cursor}; got {a}')
        for motion in shot.get('motion', []):
            ma, mb = motion['from_frame'], motion['to_frame']
            if not (a <= ma < mb <= b):
                errors.append(f'{sid}: invalid motion {ma}..{mb} outside {a}..{b}')
        cursor = b
    if cursor != total: errors.append(f'last end {cursor} != duration {total}')
    if project['fps'] <= 0: errors.append('fps must be positive')
    return errors


if __name__ == '__main__':
    errors = validate(sys.argv[1])
    if errors:
        print('\n'.join(errors))
        sys.exit(1)
    print('shot spec continuity: PASS')

