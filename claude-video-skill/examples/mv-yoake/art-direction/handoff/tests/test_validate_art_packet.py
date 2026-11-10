import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from validate_art_packet import validate_candidates, validate_shots

ROOT = Path(__file__).resolve().parents[1]


class ArtPacketTests(unittest.TestCase):
    def test_example_candidates(self):
        errors, warnings = validate_candidates(ROOT / "examples/direction_candidates.example.json")
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_example_shots(self):
        errors, warnings = validate_shots(ROOT / "examples/shot_manifest.example.json")
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_palette_swaps_are_rejected(self):
        data = json.loads((ROOT / "examples/direction_candidates.example.json").read_text(encoding="utf-8"))
        for c in data["candidates"]:
            c["expression_mode"] = "3d"
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "bad.json"
            f.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            errors, _ = validate_candidates(f)
            self.assertTrue(any("distinct" in x for x in errors))

    def test_gap_is_rejected(self):
        data = json.loads((ROOT / "examples/shot_manifest.example.json").read_text(encoding="utf-8"))
        data["shots"][1]["start_frame"] += 1
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "bad.json"
            f.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            errors, _ = validate_shots(f)
            self.assertTrue(any("gap/overlap" in x for x in errors))


if __name__ == "__main__":
    unittest.main()
