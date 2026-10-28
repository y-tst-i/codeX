#!/usr/bin/env python3
"""機械的な検査(モデルなし)。比較パックの 3 本と、B / C のステムを測る。数値で確かめられる物だけ。
 1 統合ラウドネス・真のピーク・LRA(ebur128、WAV と MP4 の両方)/ スマホ帯域(200 Hz–6 kHz)のラウドネス
 2 クリップ(|x| >= 0.999 のサンプルと連続)/ 直流 / デジタル無音(< -90 dBFS が 50 ms 以上)/ ほぼ無音の窓(100 ms RMS < -40 dBFS が 0.3 s 以上)
 3 合図の同期: B / C の各効果音の「実際の頂点」(効果音ステムの 1 ms 包絡の最大)と絵の時刻の差(ms)。既存の sync_check.py も実行
 4 帯域の重なり: 各効果音の頭 120 ms で、効果音のエネルギーの 80 % を持つ 1/3 オクターブ帯での「効果音 − 音楽」(dB)。
   低域(< 120 Hz)で効果音と音楽が両方 -40 dBFS より大きい合図の数
 5 場面ごとの音楽の重心・RMS・左右相関(A は元の make_audio.py を再現したステムで)
 6 モノラル互換: 0.5L+0.5R の統合ラウドネス(ffmpeg ebur128、モノラル 1 チャンネルとして)と、場面ごとのモノラル化の損失
   10·log10(mean(((L+R)/2)²) / mean((L²+R²)/2))(0 dB = 左右が同じ、-3 dB = 無相関、それより下 = 逆相寄り)
 7 低音の重なり: 120 Hz 未満(4 次 LP)の効果音ステムと音楽ステムの RMS(dBFS、同期点の -20〜+100 ms)。
   判定: 両方 -40 dBFS より大きく、差が 6 dB 未満 = 「重なり」
 8 音楽バスの頂点(仕上げのゲイン後、リミッターの前)、比較用 WAV の標本ピーク、15 kHz 以上の割合、ebur128 と loudnorm の差
usage: $HOME/earshot_env/bin/python qa.py [--a-stems DIR]   出力: WORK/qa.json と標準出力
A のステムは prepare.py が WORK/A_repro/ に再現する。無ければ A の場面分析だけ飛ばす
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


def mono(mp4, x):
    import re
    r = subprocess.run(["ffmpeg", "-nostats", "-i", mp4, "-vn", "-af", "pan=mono|c0=0.5*c0+0.5*c1,ebur128", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    mi = float(re.search(r"I:\s+(-?[\d.]+) LUFS", r[r.rfind("Summary:"):]).group(1))
    st = C.ebur(mp4)[0]
    sec = []
    for name, a, b in SECTIONS:
        s = x[int(a * C.SR):int(b * C.SR)]
        loss = 10 * np.log10(((s.mean(1)) ** 2).mean() / (((s ** 2).mean(1)).mean() + 1e-20) + 1e-20)
        corr = float((s[:, 0] * s[:, 1]).sum() / np.sqrt((s[:, 0] ** 2).sum() * (s[:, 1] ** 2).sum() + 1e-20))
        sec.append({"section": name, "mono_loss_db": round(float(loss), 2), "lr_corr": round(corr, 2)})
    return {"mono_lufs": mi, "stereo_lufs": st, "mono_minus_stereo_db": round(mi - st, 2), "mono_sections": sec}


def loudnorm_vs_ebur(wav):
    import re
    r = subprocess.run(["ffmpeg", "-nostats", "-i", wav, "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    ln = float(re.search(r'"input_i" : "(-?[\d.]+)"', r).group(1))
    eb = C.ebur(wav)[0]
    return {"ebur128_lufs": eb, "loudnorm_input_i": ln, "diff_lu": round(ln - eb, 2)}


def low_overlap(events, music, sfx):
    from scipy.signal import butter, sosfilt
    sos = butter(4, 120, "lp", fs=C.SR, output="sos")
    ml, sl = sosfilt(sos, music, axis=0), sosfilt(sos, sfx, axis=0)
    rows = []
    for e in events:
        a = max(0, int((e["sync_at_s"] - 0.02) * C.SR)); b = int((e["sync_at_s"] + 0.10) * C.SR)
        rs = 10 * np.log10((sl[a:b] ** 2).mean() + 1e-20); rm = 10 * np.log10((ml[a:b] ** 2).mean() + 1e-20)
        rows.append({"cue": e["cue"], "sound": e.get("sound"), "sfx_low_dbfs": round(float(rs), 1), "music_low_dbfs": round(float(rm), 1),
                     "overlap": bool(rs > -40 and rm > -40 and abs(rs - rm) < 6)})
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
    ap = argparse.ArgumentParser()
    ap.add_argument("--a-stems", default=os.path.join(C.WORK, "A_repro", "motion2d-hitotsuzutsu", "sound"))
    a = ap.parse_args()
    key = json.load(open(os.path.join(C.REPO, "docs", "sound-upgrade", "answer_key", "key.json")))
    levels = json.load(open(os.path.join(C.WORK, "compare_levels.json")))
    res = {"key_hidden_in": "docs/sound-upgrade/answer_key/ANSWER_KEY.md", "conditions": {}}
    cues_t = {n: C.T(n) for n in ["card_land_1", "card_land_6_all", "select_click", "expand_land", "step_check_1", "step_check_2",
                                   "step_check_3", "main_check", "back_click", "shrink_land", "count_roll", "count_lock", "portal_end",
                                   "bar_today_land", "title_land", "icon_pop"]}
    cj = os.path.join(C.WORK, "sync_cues.json"); json.dump(cues_t, open(cj, "w"))
    for cond in "ABC":
        code = key[cond]; mp4 = levels[cond]["mp4"]; wav = levels[cond]["wav"]
        x = decode(mp4)
        r = {"code": code, "wav_lufs_tp_lra": levels[cond]["wav_lufs_tp_lra"], "mp4_lufs_tp_lra": C.ebur(mp4),
             "phone_band_lufs": phone_lufs(mp4), **basic(x), **mono(mp4, x),
             "wav_sample_peak_dbfs": levels[cond]["wav_sample_peak_dbfs"], "mp4_hf15k_share_db": levels[cond]["mp4_hf15k_share_db"],
             "mp4_bytes": levels[cond]["mp4_bytes"], "loudnorm_vs_ebur128": loudnorm_vs_ebur(wav)}
        tlp = os.path.join(C.WORK, "earshot", f"{code}_timeline.json")
        if os.path.exists(tlp):
            tl = json.load(open(tlp)); s = tl["sync"]
            r["earshot_timeline"] = {"tempo": tl["music"].get("tempo"), "pulse_clarity": tl["music"].get("pulse_clarity"),
                                     **{f"{k}_{m}": s[k]["stats"].get(m) for k in ("cues", "cuts") for m in
                                        ("hit_within_1_frame", "chance_within_1_frame", "hit_within_100ms", "chance_within_100ms",
                                         "median_abs_offset_ms", "no_sound")}}
        sc = subprocess.run([sys.executable, os.path.join(C.KIT, "tools", "sync_check.py"), mp4, cj], capture_output=True, text=True).stdout
        r["sync_check_py"] = sc.strip().splitlines()
        if cond in "BC":
            ev = json.load(open(os.path.join(C.WORK, cond, "events.json")))
            mus, _ = sf.read(os.path.join(C.WORK, cond, "stem_music.wav"), dtype="float64")
            sfx, _ = sf.read(os.path.join(C.WORK, cond, "stem_sfx.wav"), dtype="float64")
            r["events"] = overlap(ev, mus, sfx)
            r["low_overlap"] = low_overlap(ev, mus, sfx)
            r["music_bus_peak_dbfs"] = round(float(20 * np.log10(np.abs(mus).max())), 2)
            r["music_bus_samples_over_0dbfs"] = int((np.abs(mus) > 1.0).sum())
            r["music_sections"] = sections(mus)
            r["sfx_sources"] = sorted({e.get("sound") for e in ev})
            r["n_sfx_events"] = len(ev)
        elif os.path.exists(os.path.join(a.a_stems, "stem_music.wav")):
            mus, _ = sf.read(os.path.join(a.a_stems, "stem_music.wav"), dtype="float64")
            if len(mus) != C.N:   # A は 48 kHz で書かれている
                mus = np.pad(mus[: C.N], ((0, max(0, C.N - len(mus))), (0, 0)))
            r["music_sections"] = sections(mus)
        else:
            r["music_sections"] = []
            print(f"(A のステムが無いので A の場面分析は飛ばす: {a.a_stems}。prepare.py で作れる)")
        res["conditions"][cond] = r
    json.dump(res, open(os.path.join(C.WORK, "qa.json"), "w"), ensure_ascii=False, indent=1)
    for cond, r in res["conditions"].items():
        print(f"== {cond} ({r['code']}) mp4 I/TP/LRA {r['mp4_lufs_tp_lra']} wav {r['wav_lufs_tp_lra']} phone {r['phone_band_lufs']} "
              f"clip {r['clip_samples']}/{r['clip_runs_3plus']} dc {r['dc']} corr {r['lr_corr']}")
        print("   near-silent:", r["near_silent_windows"], " digital-silence blocks:", len(r["digital_silence_50ms_blocks"]))
        print(f"   mono {r['mono_lufs']} (mono-stereo {r['mono_minus_stereo_db']}) sections:", [(s['section'][:4], s['mono_loss_db'], s['lr_corr']) for s in r['mono_sections']])
        print(f"   sample peak {r['wav_sample_peak_dbfs']} hf15k {r['mp4_hf15k_share_db']} bytes {r['mp4_bytes']} loudnorm {r['loudnorm_vs_ebur128']}")
        if "music_bus_peak_dbfs" in r:
            print(f"   music bus peak {r['music_bus_peak_dbfs']} dBFS, samples > 0 dBFS: {r['music_bus_samples_over_0dbfs']}; low overlaps:",
                  [(o['cue'], o['sfx_low_dbfs'], o['music_low_dbfs']) for o in r['low_overlap'] if o['overlap']])
        if "earshot_timeline" in r:
            print("   earshot:", r["earshot_timeline"])
        for s in r["music_sections"]:
            print(f"   {s['section']:28s} rms {s['rms_db']:6.1f} cen {s['centroid_hz']:5d} lo150 {s['lo150_share']:.2f} corr {s['lr_corr']}")
        for e in r.get("events", []):
            print(f"   {e['cue']:16s} {str(e['sound'])[:24]:24s} peak-pic {e['peak_minus_picture_ms']:6.1f} ms  sfx-music {e['sfx_over_music_db']:5.1f} / 30ms {e['sfx_over_music_30ms_db']:5.1f} dB "
                  f"low s/m {e['low_sfx_db']:6.1f}/{e['low_music_db']:6.1f} bands {e['bands_hz'][0]}-{e['bands_hz'][-1]}")
        for line in r["sync_check_py"][2:]:
            print("   sync_check:", line)


if __name__ == "__main__":
    main()
