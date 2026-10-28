#!/usr/bin/env python3
"""機械的な検査(モデルなし)。比較パックの 3 本と、B / C のステムを測る。数値で確かめられる物だけ。
 1 統合ラウドネス・真のピーク・LRA(ebur128、WAV と MP4 の両方)/ スマホ帯域(200 Hz–6 kHz)のラウドネス
 2 クリップ(|x| >= 0.999 のサンプルと連続)/ 直流 / デジタル無音(< -90 dBFS が 50 ms 以上)/ ほぼ無音の窓(100 ms RMS < -40 dBFS が 0.3 s 以上)
 3 合図の同期: B / C の各効果音の「実際の頂点」(効果音ステムの 1 ms 包絡の最大)と絵の時刻の差(ms)。既存の sync_check.py も実行
 4 帯域の重なり: 各効果音の頭 120 ms で、効果音のエネルギーの 80 % を持つ 1/3 オクターブ帯での「効果音 − 音楽」(dB)。
   低域(< 120 Hz)で効果音と音楽が両方 -40 dBFS より大きい合図の数
 5 場面ごとの音楽の重心・RMS・左右相関(A は元の make_audio.py を再現したステムで)
usage: $HOME/earshot_env/bin/python qa.py [--a-stems DIR]   出力: WORK/qa.json と標準出力
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import common as C  # noqa: E402

SECTIONS = [("一覧 0-3.75", 0.0, 3.75), ("詳細 3.75-6.87", 3.75, 6.87), ("大チェック・戻り・数 6.87-8.75", 6.87, 8.75),
            ("窓 8.75-10.0", 8.75, 10.0), ("グラフ 10.0-11.55", 10.0, 11.55), ("止め 11.6-12.2", 11.6, 12.2), ("タイトル 12.2-15", 12.2, 15.0)]


def decode(path):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-f", "f32le", "-ac", "2", "-ar", str(C.SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2).astype(np.float64)


def phone_lufs(path):
    import re
    r = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-vn", "-af",
                        "highpass=f=200:poles=2,highpass=f=200:poles=2,lowpass=f=6000:poles=2,lowpass=f=6000:poles=2,ebur128",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", r[r.rfind("Summary:"):]).group(1))


def basic(x):
    m = np.abs(x)
    clip = int((m >= 0.999).sum())
    runs = 0
    flat = (m.max(1) >= 0.999).astype(int)
    if flat.any():
        d = np.diff(np.r_[0, flat, 0]); runs = int((np.nonzero(d == -1)[0] - np.nonzero(d == 1)[0] >= 3).sum())
    w = int(0.1 * C.SR); mono = x.mean(1)
    r = 20 * np.log10(np.sqrt((mono[: len(mono) // w * w].reshape(-1, w) ** 2).mean(1)) + 1e-12)
    near = []; st = None
    for i, v in enumerate(list(r) + [0]):
        if v < -40 and st is None: st = i
        if v >= -40 and st is not None:
            if i - st >= 3: near.append([round(st * 0.1, 1), round(i * 0.1, 1), round(float(r[st:i].mean()), 1)])
            st = None
    w2 = int(0.05 * C.SR)
    r2 = 20 * np.log10(np.abs(mono[: len(mono) // w2 * w2].reshape(-1, w2)).max(1) + 1e-12)
    digital = [round(i * 0.05, 2) for i, v in enumerate(r2) if v < -90]
    corr = float((x[:, 0] * x[:, 1]).sum() / np.sqrt((x[:, 0] ** 2).sum() * (x[:, 1] ** 2).sum() + 1e-20))
    return {"clip_samples": clip, "clip_runs_3plus": runs, "dc": [round(float(v), 6) for v in x.mean(0)],
            "near_silent_windows": near, "digital_silence_50ms_blocks": digital, "lr_corr": round(corr, 3),
            "rms_100ms_min_db": round(float(r.min()), 1), "rms_100ms_max_db": round(float(r.max()), 1)}


def thirds():
    f = 1000 * 2 ** (np.arange(-17, 14) / 3)        # 20 Hz .. 20 kHz
    return f


def band_db(x, fc):
    n = len(x)
    P = np.abs(np.fft.rfft(x * np.hanning(n))) ** 2
    f = np.fft.rfftfreq(n, 1 / C.SR)
    out = []
    for c in fc:
        lo, hi = c / 2 ** (1 / 6), c * 2 ** (1 / 6)
        out.append(P[(f >= lo) & (f < hi)].sum() + 1e-20)
    return np.array(out)


def overlap(events, music, sfx):
    fc = thirds(); rows = []
    ts = sorted(e["sync_at_s"] for e in events)
    for e in events:
        t = e["sync_at_s"]
        a = max(0, int((t - 0.02) * C.SR)); b = a + int(0.12 * C.SR)
        s, m = sfx[a:b].mean(1), music[a:b].mean(1)
        if len(s) < 100: continue
        Ps, Pm = band_db(s, fc), band_db(m, fc)
        order = np.argsort(Ps)[::-1]; cum = np.cumsum(Ps[order]) / Ps.sum()
        sel = order[: int(np.searchsorted(cum, 0.8)) + 1]
        margin = 10 * np.log10(Ps[sel].sum() / Pm[sel].sum())

        lo = fc < 120
        lo_s = 10 * np.log10(Ps[lo].sum() / len(s)); lo_m = 10 * np.log10(Pm[lo].sum() / len(s))
        # 実際の頂点(1 ms 包絡)と絵の時刻の差
        # 窓: 絵の時刻 -60 ms 〜 +150 ms。ただし隣の効果音の同期点との中間で切る(連打の隣を拾わない)
        others = [u for u in ts if abs(u - e["sync_at_s"]) > 1e-4]
        prev = max([u for u in others if u < e["sync_at_s"]], default=-9); nxt = min([u for u in others if u > e["sync_at_s"]], default=99)
        lo_t = max(e["t"] - 0.06, (prev + e["sync_at_s"]) / 2); hi_t = min(e["t"] + 0.15, (nxt + e["sync_at_s"]) / 2)
        w0 = max(0, int(lo_t * C.SR)); w1 = int(hi_t * C.SR)
        seg = sfx[w0:w1].mean(1); hop = C.SR // 1000; k = len(seg) // hop
        env = (seg[: k * hop].reshape(k, hop) ** 2).mean(1)
        pk_t = w0 / C.SR + (int(np.argmax(env)) + 0.5) / 1000
        # 短い窓(30 ms、測った頂点の 10 ms 前から): クリックのような短い音は 120 ms で薄まるので、両方を出す
        a2 = max(0, int((pk_t - 0.010) * C.SR)); b2 = a2 + int(0.03 * C.SR)
        Ps2, Pm2 = band_db(sfx[a2:b2].mean(1), fc), band_db(music[a2:b2].mean(1), fc)
        o2 = np.argsort(Ps2)[::-1]; c2 = np.cumsum(Ps2[o2]) / Ps2.sum(); sel2 = o2[: int(np.searchsorted(c2, 0.8)) + 1]
        margin30 = 10 * np.log10(Ps2[sel2].sum() / Pm2[sel2].sum())
        rows.append({"cue": e["cue"], "sound": e.get("sound"), "picture_s": round(e["t"], 3), "planned_sync_s": e["sync_at_s"],
                     "measured_peak_s": round(pk_t, 3), "peak_minus_picture_ms": round((pk_t - e["t"]) * 1000, 1),
                     "bands_hz": [int(fc[i]) for i in sorted(sel)], "sfx_over_music_db": round(float(margin), 1), "sfx_over_music_30ms_db": round(float(margin30), 1),
                     "low_sfx_db": round(float(lo_s), 1), "low_music_db": round(float(lo_m), 1)})
    return rows


def sections(x):
    out = []
    for name, a, b in SECTIONS:
        seg = x[int(a * C.SR):int(b * C.SR)]; m = seg.mean(1)
        P = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2; f = np.fft.rfftfreq(len(m), 1 / C.SR)
        band = (f > 20) & (f < 20000)
        cen = float((P[band] * f[band]).sum() / P[band].sum())
        lo = float(P[band & (f < 150)].sum() / P[band].sum())
        corr = float((seg[:, 0] * seg[:, 1]).sum() / np.sqrt((seg[:, 0] ** 2).sum() * (seg[:, 1] ** 2).sum() + 1e-20))
        out.append({"section": name, "rms_db": round(float(10 * np.log10((m ** 2).mean() + 1e-20)), 1),
                    "centroid_hz": round(cen), "lo150_share": round(lo, 2), "lr_corr": round(corr, 2)})
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--a-stems", default="/home/user/sndwork/a_repro/motion2d-hitotsuzutsu/sound")
    a = ap.parse_args()
    key = json.load(open(os.path.join(C.WORK, "compare_key.json")))
    levels = json.load(open(os.path.join(C.WORK, "compare_levels.json")))
    res = {"key_hidden_in": "docs/sound-upgrade/compare/ANSWER_KEY.md", "conditions": {}}
    cues_t = {n: C.T(n) for n in ["card_land_1", "card_land_6_all", "select_click", "expand_land", "step_check_1", "step_check_2",
                                   "step_check_3", "main_check", "back_click", "shrink_land", "count_roll", "count_lock", "portal_end",
                                   "bar_today_land", "title_land", "icon_pop"]}
    cj = os.path.join(C.WORK, "sync_cues.json"); json.dump(cues_t, open(cj, "w"))
    for cond in "ABC":
        code = key[cond]; mp4 = levels[cond]["mp4"]; wav = levels[cond]["wav"]
        x = decode(mp4)
        r = {"code": code, "wav_lufs_tp_lra": levels[cond]["wav_lufs_tp_lra"], "mp4_lufs_tp_lra": C.ebur(mp4),
             "phone_band_lufs": phone_lufs(mp4), **basic(x)}
        sc = subprocess.run([sys.executable, os.path.join(C.KIT, "tools", "sync_check.py"), mp4, cj], capture_output=True, text=True).stdout
        r["sync_check_py"] = sc.strip().splitlines()
        if cond in "BC":
            ev = json.load(open(os.path.join(C.WORK, cond, "events.json")))
            mus, _ = sf.read(os.path.join(C.WORK, cond, "stem_music.wav"), dtype="float64")
            sfx, _ = sf.read(os.path.join(C.WORK, cond, "stem_sfx.wav"), dtype="float64")
            r["events"] = overlap(ev, mus, sfx)
            r["music_sections"] = sections(mus)
            r["sfx_sources"] = sorted({e.get("sound") for e in ev})
            r["n_sfx_events"] = len(ev)
        else:
            mus, _ = sf.read(os.path.join(a.a_stems, "stem_music.wav"), dtype="float64")
            r["music_sections"] = sections(mus)
        res["conditions"][cond] = r
    json.dump(res, open(os.path.join(C.WORK, "qa.json"), "w"), ensure_ascii=False, indent=1)
    for cond, r in res["conditions"].items():
        print(f"== {cond} ({r['code']}) mp4 I/TP/LRA {r['mp4_lufs_tp_lra']} wav {r['wav_lufs_tp_lra']} phone {r['phone_band_lufs']} "
              f"clip {r['clip_samples']}/{r['clip_runs_3plus']} dc {r['dc']} corr {r['lr_corr']}")
        print("   near-silent:", r["near_silent_windows"], " digital-silence blocks:", len(r["digital_silence_50ms_blocks"]))
        for s in r["music_sections"]:
            print(f"   {s['section']:28s} rms {s['rms_db']:6.1f} cen {s['centroid_hz']:5d} lo150 {s['lo150_share']:.2f} corr {s['lr_corr']}")
        for e in r.get("events", []):
            print(f"   {e['cue']:16s} {str(e['sound'])[:24]:24s} peak-pic {e['peak_minus_picture_ms']:6.1f} ms  sfx-music {e['sfx_over_music_db']:5.1f} / 30ms {e['sfx_over_music_30ms_db']:5.1f} dB "
                  f"low s/m {e['low_sfx_db']:6.1f}/{e['low_music_db']:6.1f} bands {e['bands_hz'][0]}-{e['bands_hz'][-1]}")
        for line in r["sync_check_py"][2:]:
            print("   sync_check:", line)


if __name__ == "__main__":
    main()
