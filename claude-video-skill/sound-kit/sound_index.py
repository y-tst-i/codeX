#!/usr/bin/env python3
"""Kenney(録音系 CC0、282個)と earshot(コードで描画するバンク、252個)を横断して、検索・比較・選択する薄い索引。
選ぶ基準は「どこの音か」ではなく「映像の動きに合うか」。長さ・立ち上がり・余韻・重心(明るさ)・低域/高域の割合を
同じ物差しで測って並べる。既存の sfx_lib.py は変更せず import して使う。

使う Python: earshot を入れた環境(例 $HOME/earshot_env/bin/python)。Kenney だけなら numpy と ffmpeg で動く。

CLI:
  sound_index.py build [--no-earshot]              索引を作る(index/sound_index.json)。earshot はメモリ上で描画して測る(WAV は書かない)
  sound_index.py find [語] [--role R] [--source kenney|earshot] [--dur 0.05-0.3] [--centroid 300-1500] [--attack-max 20] [--top 20]
  sound_index.py like NAME [--source ...] [--top 10]   NAME に測定値が近い音(出どころを問わず)
  sound_index.py show NAME [NAME ...]               1件ずつ全項目
  sound_index.py realness NAME [NAME ...]           earshot の realness(録音らしさ)を測って索引に書き足す(モデルを読む)
  NAME = Kenney の名前(例 bookPlace1)か earshot の id(例 ui_pop/soft)

項目: name, source, pack/category, kind, roles(用途), origin(録音か合成か), license, dur_s, onset_s, peak_s, attack_ms,
      t20_ms / t40_ms(頂点から -20/-40 dB に下がるまで = 余韻), centroid_hz(重心), lo150 / hi4k(150 Hz 未満 / 4 kHz 超の
      エネルギーの割合), corr(左右の相関、1 = モノ), knobs(調整できる範囲), realness(測った物だけ), notes
注意: 測定値は音の形を表すだけで、良し悪しや「映像に合うか」は人が聴いて決める。realness はモデルの推定で、品質の点数ではない。
"""
import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "tools"))
import sfx_lib  # noqa: E402  既存(変更しない)

INDEX = os.path.join(HERE, "index", "sound_index.json")
SR = 48000

# Kenney の種類 -> 用途(earshot の役割名にそろえる。複数可)
KENNEY_ROLES = [
    (r"^footstep", ["footstep"]), (r"^impactBell", ["bell", "hit"]), (r"^impactGeneric", ["tap", "land.light"]),
    (r"^impactGlass", ["tick.crisp", "hit"]), (r"^impactMetal", ["hit", "tock"]), (r"^impactMining", ["hit"]),
    (r"^impactPlank|^impactWood", ["tock", "land"]), (r"^impactPlate", ["hit", "land"]), (r"^impactPunch", ["hit", "drop"]),
    (r"^impactSoft", ["land", "land.light"]), (r"^impactTin", ["tock", "tick"]),
    (r"^(back|close|open|maximize|minimize)", ["ui.transition"]), (r"^bong", ["bell"]), (r"^click", ["click"]),
    (r"^confirmation", ["click.confirm"]), (r"^drop", ["pop", "land.light"]), (r"^error", ["error"]),
    (r"^glass", ["tick.crisp", "bell"]), (r"^glitch", ["glitch"]), (r"^pluck", ["text", "pop"]), (r"^question", ["bell"]),
    (r"^scratch", ["scratch"]), (r"^scroll", ["tick"]), (r"^select", ["click", "tick"]), (r"^switch|^toggle", ["snap", "click"]),
    (r"^tick", ["tick"]), (r"^book", ["land.light", "paper"]), (r"^cloth", ["whoosh.short", "cloth"]), (r"^creak", ["creak"]),
    (r"^door", ["door"]), (r"^(drawKnife|knifeSlice)", ["whoosh.short", "metal"]), (r"^handleCoins", ["coins"]),
    (r"^(dropLeather|handleSmallLeather|beltHandle|clothBelt)", ["land.light", "cloth"]), (r"^metal(Click|Latch)", ["snap", "click"]),
    (r"^metalPot|^chop", ["hit"]),
]
KENNEY_ORIGIN = {
    "impact-sounds": "recorded foley (Kenney Impact Sounds; per-file method not stated)",
    "rpg-audio": "recorded foley (Kenney RPG Audio; per-file method not stated)",
    "interface-sounds": "designed UI sounds (Kenney Interface Sounds; recorded or synthesized not stated)",
}


# ------------------------------------------------------------------ 測定(Kenney と earshot を同じ物差しで)
def measure(y, sr=SR):
    """y: (n,) か (n,ch) -> 形の測定値。1 ms の RMS 包絡から onset(最大の -30 dB 以内に入った所)、peak、attack、
    頂点から -20 / -40 dB に下がるまで(余韻)、end(-50 dB 以内の最後)。スペクトルはパワーで重み付け"""
    y = np.asarray(y, np.float64)
    st = y if y.ndim == 2 else y[:, None]
    m = st.mean(1)
    n = len(m)
    if n < 16 or np.abs(m).max() < 1e-7:
        return {"dur_s": round(n / sr, 4), "silent": True}
    hop = max(1, sr // 1000)
    k = n // hop
    env = np.sqrt((m[: k * hop].reshape(k, hop) ** 2).mean(1)) + 1e-12
    db = 20 * np.log10(env / env.max())
    pk = int(np.argmax(env))
    on = int(np.argmax(db > -30))
    after = db[pk:]
    t20 = int(np.argmax(after < -20)) if (after < -20).any() else None
    t40 = int(np.argmax(after < -40)) if (after < -40).any() else None
    end = int(np.nonzero(db > -50)[0][-1])
    P = np.abs(np.fft.rfft(m * np.hanning(n))) ** 2
    f = np.fft.rfftfreq(n, 1 / sr)
    band = (f >= 20) & (f <= 20000)
    tot = P[band].sum() + 1e-20
    cen = float((P[band] * f[band]).sum() / tot)
    corr = 1.0
    if st.shape[1] >= 2:
        L, R = st[:, 0], st[:, 1]
        corr = float((L * R).sum() / (np.sqrt((L * L).sum() * (R * R).sum()) + 1e-20))
    return {"dur_s": round(n / sr, 4), "onset_s": round(on / 1000, 4), "peak_s": round(pk / 1000, 4),
            "attack_ms": float(pk - on), "t20_ms": t20, "t40_ms": t40, "end_s": round(end / 1000, 4),
            "centroid_hz": round(cen, 1), "lo150": round(float(P[band & (f < 150)].sum() / tot), 3),
            "hi4k": round(float(P[band & (f > 4000)].sum() / tot), 3), "corr": round(corr, 3),
            "peak_dbfs": round(float(20 * np.log10(np.abs(st).max() + 1e-12)), 2)}


def load_kenney(name, sr=SR):
    p = sfx_lib.path(name)
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2).copy()


def kenney_rows():
    rows = []
    for it in sfx_lib.items():
        roles = next((r for pat, r in KENNEY_ROLES if re.search(pat, it["kind"])), ["other"])
        row = {"name": it["name"], "source": "kenney", "pack": it["pack"], "kind": it["kind"], "roles": roles,
               "origin": KENNEY_ORIGIN.get(it["pack"], "Kenney"), "license": "CC0 1.0 (Kenney, kenney.nl)",
               "knobs": "外部加工のみ: 音量・EQ・トリム・再生速度(音程と長さが一緒に変わる)。素材は1テイク",
               "path": os.path.relpath(sfx_lib.path(it["name"]), HERE)}
        row.update(measure(load_kenney(it["name"])))
        rows.append(row)
    return rows


def earshot_rows():
    from earshot.forge import bank
    rows = []
    for e in bank.list_sounds():
        full = bank.get(e["id"])
        typ = full.get("type")
        cat = full.get("category")
        if typ == "fit":
            origin = "code model fitted from a CC0 recording (earshot fit; no samples ship)"
            lic = "MIT (earshot code) / source recording CC0 1.0 (earshot docs/CREDITS_FIT.md)"
        else:
            origin = "code-synthesized (earshot forge recipe)"
            lic = "MIT (earshot, Copyright (c) 2026 Leon Lin)"
        kn = e.get("knobs") or {}
        knobs = []
        if kn.get("dur"): knobs.append(f"dur({kn['dur']})")
        if kn.get("apex"): knobs.append("apex(頂点の時刻)")
        p = kn.get("pitch")
        if isinstance(p, dict) and p.get("range_hz"):
            knobs.append(f"pitch {p['range_hz'][0]:.0f}-{p['range_hz'][1]:.0f} Hz")
        knobs.append("seed(テイク違い)")
        row = {"name": e["id"], "source": "earshot", "pack": cat, "kind": cat, "roles": e.get("kinds") or [],
               "origin": origin, "license": lic, "knobs": ", ".join(knobs), "notes": (full.get("notes") or "")[:160],
               "bank_audit": full.get("audit")}
        try:
            y, meta = bank.render(e["id"], sr=SR, checks=False)
            row.update(measure(y))
        except Exception as ex:  # noqa: BLE001
            row["error"] = f"{type(ex).__name__}: {ex}"[:200]
        rows.append(row)
    return rows


# ------------------------------------------------------------------ 索引の読み書きと検索
def load_index():
    return json.load(open(INDEX, encoding="utf-8"))


def save_index(idx):
    os.makedirs(os.path.dirname(INDEX), exist_ok=True)
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write('{"version": 1, "fields": %s,\n "items": [\n' % json.dumps(idx["fields"], ensure_ascii=False))
        f.write(",\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in idx["items"]))
        f.write("\n]}\n")


def _rng(s):
    a, b = s.split("-")
    return float(a), float(b)


FEAT = ("dur_s", "attack_ms", "t20_ms", "centroid_hz", "lo150", "hi4k")


def _vec(r):
    def lg(v): return np.log10(1 + max(0.0, float(v if v is not None else 2000.0)))
    return np.array([lg(r.get("dur_s", 0) * 1000), lg(r.get("attack_ms")), lg(r.get("t20_ms")),
                     np.log10(max(20.0, r.get("centroid_hz") or 20)), 3 * (r.get("lo150") or 0), 3 * (r.get("hi4k") or 0)])


def find(items, q=None, role=None, source=None, dur=None, centroid=None, attack_max=None):
    out = []
    for r in items:
        if q and q.lower() not in (r["name"] + " " + r.get("kind", "") + " " + r.get("notes", "")).lower(): continue
        if role and not any(role == x or x.startswith(role) for x in r.get("roles", [])): continue
        if source and r["source"] != source: continue
        if dur and not (_rng(dur)[0] <= r.get("dur_s", 0) <= _rng(dur)[1]): continue
        if centroid and not (_rng(centroid)[0] <= (r.get("centroid_hz") or 0) <= _rng(centroid)[1]): continue
        if attack_max is not None and (r.get("attack_ms") or 0) > attack_max: continue
        out.append(r)
    return out


def like(items, name, source=None, top=10):
    base = next(r for r in items if r["name"] == name)
    pool = [r for r in items if r["name"] != name and "error" not in r and not r.get("silent") and (not source or r["source"] == source)]
    X = np.stack([_vec(r) for r in pool]); sd = X.std(0) + 1e-9
    d = np.sqrt((((X - _vec(base)) / sd) ** 2).sum(1))
    return [(pool[i], float(d[i])) for i in np.argsort(d)[:top]]


def line(r, extra=""):
    t20 = r.get("t20_ms"); rl = r.get("realness", {})
    return (f'{r["name"]:34s} {r["source"]:7s} {r.get("dur_s", 0):5.2f}s atk{r.get("attack_ms", 0):5.0f}ms '
            f't20 {("%5.0f" % t20) if t20 is not None else "  -  "}ms cen{r.get("centroid_hz", 0):6.0f}Hz '
            f'lo{r.get("lo150", 0):.2f} hi{r.get("hi4k", 0):.2f} {",".join(r.get("roles", []))[:22]:22s}'
            f'{(" real%.2f" % rl["p_real"]) if rl.get("p_real") is not None else ""}{extra}')


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build"); b.add_argument("--no-earshot", action="store_true")
    f = sub.add_parser("find"); f.add_argument("q", nargs="?"); f.add_argument("--role"); f.add_argument("--source")
    f.add_argument("--dur"); f.add_argument("--centroid"); f.add_argument("--attack-max", type=float); f.add_argument("--top", type=int, default=30)
    l = sub.add_parser("like"); l.add_argument("name"); l.add_argument("--source"); l.add_argument("--top", type=int, default=10)
    s = sub.add_parser("show"); s.add_argument("names", nargs="+")
    rl = sub.add_parser("realness"); rl.add_argument("names", nargs="+")
    a = ap.parse_args(argv)
    if a.cmd == "build":
        items = kenney_rows() + ([] if a.no_earshot else earshot_rows())
        save_index({"fields": ["name", "source", "pack", "kind", "roles", "origin", "license", "knobs", "dur_s", "onset_s",
                               "peak_s", "attack_ms", "t20_ms", "t40_ms", "end_s", "centroid_hz", "lo150", "hi4k", "corr",
                               "peak_dbfs", "realness", "notes", "path", "bank_audit"], "items": items})
        print(f"{len(items)} items -> {INDEX}")
        return
    idx = load_index(); items = idx["items"]
    if a.cmd == "find":
        rows = find(items, a.q, a.role, a.source, a.dur, a.centroid, a.attack_max)
        for r in rows[: a.top]: print(line(r))
        print(f"({len(rows)} matches)")
    elif a.cmd == "like":
        for r, d in like(items, a.name, a.source, a.top): print(line(r, f"  dist {d:.2f}"))
    elif a.cmd == "show":
        for n in a.names: print(json.dumps(next(r for r in items if r["name"] == n), ensure_ascii=False, indent=1))
    elif a.cmd == "realness":
        from earshot import api
        import earshot_cache
        by = {r["name"]: r for r in items}
        for n in a.names:
            r = by[n]
            p = os.path.join(HERE, r["path"]) if r["source"] == "kenney" else earshot_cache.take_path(n)[0]
            res = api.realness(p)
            r["realness"] = {"p_real": round(float(res["p_real"]), 3), "verdict": res.get("verdict"), "by": "earshot realness 0.4.0"}
            print(line(r))
        save_index(idx)


if __name__ == "__main__":
    main(sys.argv[1:])
