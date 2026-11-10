#!/usr/bin/env python3
"""Offline JSON structure checks. Not an artistic-quality oracle."""
import argparse
import json
from pathlib import Path

REQUIRED = ("id", "name", "expression_mode", "concept", "visual_metaphor", "focal_subject",
            "design_grammar", "color_script", "typography", "motion_signature",
            "asset_plan", "anti_patterns", "risk")


def validate_candidates(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    errors, warnings = [], []
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or len(candidates) < 3:
        return ["At least three candidates are required"], []
    ids, modes, metaphors, subjects = set(), set(), set(), set()
    for i, c in enumerate(candidates, 1):
        for k in REQUIRED:
            v = c.get(k)
            if v is None or v == "" or (isinstance(v, list) and not v):
                errors.append(f"Candidate {i}: missing {k}")
        cid = c.get("id")
        if cid in ids:
            errors.append(f"Duplicate candidate id: {cid}")
        ids.add(cid)
        modes.add(c.get("expression_mode"))
        metaphors.add(str(c.get("visual_metaphor", "")).strip())
        subjects.add(str(c.get("focal_subject", "")).strip())
    if len(modes) < 3:
        errors.append("Three distinct expression_mode values required (not palette swaps)")
    if len(metaphors) < 3:
        warnings.append("Repeated visual_metaphor: reviewer must confirm genuine variety")
    if len(subjects) < 3:
        warnings.append("Repeated focal_subject: reviewer must confirm genuine variety")
    return errors, warnings


def validate_shots(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    errors, warnings = [], []
    fps, duration = data.get("fps"), data.get("duration_frames")
    if not isinstance(fps, int) or fps <= 0:
        errors.append("fps must be positive integer")
    if not isinstance(duration, int) or duration <= 0:
        errors.append("duration_frames must be positive integer")
    shots = data.get("shots", [])
    if not isinstance(shots, list) or not shots:
        errors.append("shots must be nonempty list")
        return errors, warnings
    previous_end = 0
    for i, shot in enumerate(shots, 1):
        a, b = shot.get("start_frame"), shot.get("end_frame")
        if not isinstance(a, int) or not isinstance(b, int):
            errors.append(f"Shot {i}: integer start/end required")
            continue
        if a != previous_end:
            errors.append(f"Shot {i}: gap/overlap at {previous_end} → {a}")
        if b <= a:
            errors.append(f"Shot {i}: nonpositive duration")
        previous_end = b
    if isinstance(duration, int) and previous_end != duration:
        errors.append(f"Timeline ends at {previous_end}, expected {duration}")
    if any("purpose" not in shot or not shot.get("purpose") for shot in shots):
        warnings.append("A shot has no creative purpose")
    return errors, warnings


def main():
    parser = argparse.ArgumentParser(description="Validate art candidates and shot timing; do NOT score aesthetics")
    parser.add_argument("--candidates", type=Path, required=True)
    parser.add_argument("--shots", type=Path, required=True)
    args = parser.parse_args()
    all_errors, all_warnings = [], []
    for label, fn, path in (("candidates", validate_candidates, args.candidates), ("shots", validate_shots, args.shots)):
        errors, warnings = fn(path)
        all_errors.extend(f"{label}: {e}" for e in errors)
        all_warnings.extend(f"{label}: {w}" for w in warnings)
    report = {"status": "FAIL" if all_errors else "STRUCTURE_PASS_ART_NOT_TESTED",
              "errors": all_errors, "warnings": all_warnings}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(1 if all_errors else 0)


if __name__ == "__main__":
    main()
