#!/usr/bin/env python3
"""earshot の効果音バンク(252個、コードで描画する)を「必要な時だけ」描画してキャッシュする薄い橋渡し。
全部を事前に WAV 化しない。同じ指定(id・seed・dur・apex・pitch)は2回目からキャッシュを読むだけ。

前提: earshot を入れた Python(例 $HOME/earshot_env/bin/python。導入は docs/sound-upgrade/HOWTO.md)。
      バンクの描画はモデル不要・ネットワーク不要(earshot の docs/SFX.md)。
キャッシュ: このフォルダの .cache/earshot/(.gitignore 済み。消しても再生成できる)。EARSHOT_TAKE_CACHE で変更可。

Python:
    import earshot_cache as E
    y, meta = E.take("ui_pop/soft", seed=3, pitch="Eb5")        # (n,2) float32 48 kHz、meta = 測定値と監査(checks)
    y, meta = E.take("swipe/velvet", dur=0.65, apex=0.30)      # 動きに合わせる: 長さ 0.65 s、頂点を 0.30 s に
    p = E.take_path("fit/click/floss_lid", seed=2)              # キャッシュの WAV のパス(earshot の分析に渡す時)
CLI:
    python earshot_cache.py render ID [--seed N] [--dur S] [--apex S] [--pitch NOTE] [-o out.wav]
    python earshot_cache.py info ID
"""
import argparse
import hashlib
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.environ.get("EARSHOT_TAKE_CACHE", os.path.join(HERE, ".cache", "earshot"))
SR = 48000


def _key(sound_id, seed, dur, apex, pitch, peak_db):
    import earshot
    from earshot.forge import bank
    k = json.dumps([sound_id, seed, dur, apex, str(pitch) if pitch is not None else None, peak_db,
                    bank.VERSION, getattr(earshot, "__version__", "?")], sort_keys=True)
    return hashlib.sha1(k.encode()).hexdigest()[:16]


def take_path(sound_id, seed=None, dur=None, apex=None, pitch=None, peak_db=-1.0):
    """描画してキャッシュに置き、(wav のパス, meta) を返す。キャッシュにあれば描画しない"""
    import soundfile as sf
    from earshot.forge import bank
    os.makedirs(CACHE, exist_ok=True)
    k = _key(sound_id, seed, dur, apex, pitch, peak_db)
    base = os.path.join(CACHE, sound_id.replace("/", "__") + "__" + k)
    wav, js = base + ".wav", base + ".json"
    if os.path.exists(wav) and os.path.exists(js):
        return wav, json.load(open(js, encoding="utf-8"))
    y, meta = bank.render(sound_id, seed=seed, dur=dur, apex=apex, pitch=pitch, peak_db=peak_db, sr=SR)
    y = np.asarray(y, np.float32)
    sf.write(wav, y, SR, subtype="FLOAT")
    meta = json.loads(json.dumps(meta, default=lambda o: o.tolist() if hasattr(o, "tolist") else str(o)))
    meta.update({"id": sound_id, "seed_req": seed, "dur_req": dur, "apex_req": apex, "pitch_req": pitch})
    json.dump(meta, open(js, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return wav, meta


def take(sound_id, seed=None, dur=None, apex=None, pitch=None, peak_db=-1.0):
    """(y (n,2) float32 48 kHz, meta)"""
    import soundfile as sf
    p, meta = take_path(sound_id, seed, dur, apex, pitch, peak_db)
    y, sr = sf.read(p, dtype="float32", always_2d=True)
    if y.shape[1] == 1:
        y = np.repeat(y, 2, 1)
    return y, meta


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("render"); r.add_argument("id"); r.add_argument("--seed", type=int); r.add_argument("--dur", type=float)
    r.add_argument("--apex", type=float); r.add_argument("--pitch"); r.add_argument("-o")
    i = sub.add_parser("info"); i.add_argument("id")
    a = ap.parse_args(argv)
    if a.cmd == "render":
        p, meta = take_path(a.id, a.seed, a.dur, a.apex, a.pitch)
        if a.o:
            import shutil; shutil.copy(p, a.o); p = a.o
        print(p)
        print(json.dumps({k: meta.get(k) for k in ("dur_s", "onset_s", "peak_s", "end_s", "attack_ms", "centroid_hz", "checks", "edits")},
                         ensure_ascii=False, default=str)[:1500])
    else:
        from earshot.forge import bank
        print(json.dumps(bank.get(a.id), ensure_ascii=False, default=str, indent=1)[:4000])


if __name__ == "__main__":
    main(sys.argv[1:])
