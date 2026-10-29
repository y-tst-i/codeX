"""BGM(音楽ベッド)だけを測る道具(第2ラウンド)。モデルは使わない。
- bed_stats: 100 ms・50 ms・400 ms の RMS(dBFS)を 10 ms ずつずらして測った最小・中央値・最小の時刻
  (最初の 0.3 s と最後の 0.4 s は除く = 曲の入りと終わりの減衰。区切り窓だと谷が隠れるので、ずらす)
- beat_stats: 音の立ち上がり(librosa の onset 検出)の時刻と、そのすき間の最大。テンポの推定(librosa beat_track)
- notes_gap: 楽譜(MIDI の発音時刻の一覧)からの、発音のすき間の最大
"""
import numpy as np

import common as C


def _slide_db(m, win, hop=0.01):
    """win 秒の RMS を hop 秒ずつずらして(区切り窓では谷が隠れるため)。戻り値 (dB の列, 窓の中心の時刻)"""
    w, h = int(win * C.SR), int(hop * C.SR)
    c = np.r_[0.0, np.cumsum(m.astype(np.float64) ** 2)]
    starts = np.arange(0, len(m) - w, h)
    e = (c[starts + w] - c[starts]) / w
    return 10 * np.log10(e + 1e-24), (starts + w / 2) / C.SR


def bed_stats(x, t0=0.3, t1=None):
    """100 ms と 50 ms の RMS を 10 ms ずつずらして測り、最小・中央値・最小の時刻(最初の 0.3 s と最後の 0.4 s は除く)。
    400 ms も同じ方式で参考に出す"""
    x = np.asarray(x, np.float64)
    m = x.mean(1) if x.ndim == 2 else x
    t1 = t1 or (len(m) / C.SR - 0.4)
    out = {"method": "RMS, window slid by 10 ms"}
    for win in (0.1, 0.05, 0.4):
        r, ts = _slide_db(m, win)
        sel = (ts >= t0) & (ts <= t1)
        rr, tt = r[sel], ts[sel]
        i = int(np.argmin(rr)); med = float(np.median(rr))
        k = f"rms{int(round(win * 1000))}"
        out[f"{k}_min_dbfs"] = round(float(rr[i]), 1)
        out[f"{k}_min_at_s"] = round(float(tt[i]), 2)
        out[f"{k}_median_dbfs"] = round(med, 1)
        out[f"{k}_min_below_median_db"] = round(float(rr[i] - med), 1)
    return out


def beat_stats(x, t0=0.3, t1=14.4):
    import librosa
    m = (np.asarray(x).mean(1) if np.ndim(x) == 2 else np.asarray(x)).astype(np.float32)
    y = librosa.resample(m, orig_sr=C.SR, target_sr=22050)
    on = librosa.onset.onset_detect(y=y, sr=22050, units="time", backtrack=False)
    on = np.array([t for t in on if t0 <= t <= t1])
    gaps = np.diff(np.r_[t0, on, t1]) if len(on) else np.array([t1 - t0])
    tempo, beats = librosa.beat.beat_track(y=y, sr=22050, units="time")
    bgaps = np.diff(beats) if len(beats) > 1 else np.array([0.0])
    return {"onsets": int(len(on)), "max_onset_gap_s": round(float(gaps.max()), 3),
            "max_onset_gap_at_s": round(float(np.r_[t0, on][int(np.argmax(gaps))]), 2),
            "tempo_bpm_librosa": round(float(np.atleast_1d(tempo)[0]), 1),
            "beat_interval_median_s": round(float(np.median(bgaps)), 3), "beat_interval_max_s": round(float(bgaps.max()), 3)}


def notes_gap(onsets, t0=0.0, t1=14.4):
    """楽譜の発音時刻の一覧 -> すき間の最大(秒)と場所"""
    on = np.sort(np.array([t for t in onsets if t0 <= t <= t1]))
    g = np.diff(np.r_[t0, on, t1])
    i = int(np.argmax(g))
    return {"max_note_gap_s": round(float(g[i]), 3), "max_note_gap_from_s": round(float(np.r_[t0, on][i]), 3)}


# ------------------------------------------------------------------ 第3ラウンド(外から来た BGM の点検)
KS_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KS_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]


def _chroma(m, t0=None, t1=None):
    import librosa
    a = int((t0 or 0) * C.SR); b = int((t1 or len(m) / C.SR) * C.SR)
    y = librosa.resample(m[a:b].astype(np.float32), orig_sr=C.SR, target_sr=22050)
    ch = librosa.feature.chroma_cqt(y=y, sr=22050)
    return ch.mean(1)


def key_estimate(x, t0=None, t1=None):
    """Krumhansl–Schmuckler の調の推定(全体、または区間)。戻り値: 1 位の調・相関・2 位"""
    m = np.asarray(x).mean(1) if np.ndim(x) == 2 else np.asarray(x)
    c = _chroma(m, t0, t1)
    rows = []
    for k in range(12):
        rows.append((float(np.corrcoef(c, np.roll(KS_MAJ, k))[0, 1]), NOTES[k] + " major"))
        rows.append((float(np.corrcoef(c, np.roll(KS_MIN, k))[0, 1]), NOTES[k] + " minor"))
    rows.sort(reverse=True)
    return {"key": rows[0][1], "r": round(rows[0][0], 3), "second": rows[1][1], "r2": round(rows[1][0], 3)}


def ending_stats(x, tonic=3):
    """終わり方: 最後の 2 s の 100 ms RMS の動き、最後の 1 s の和音らしさ(主和音 Eb-G-Bb の 3 音が音の重さに占める割合と、
    最後の 1 s の調の推定)。tonic = 主音の音名番号(3 = Eb)"""
    m = np.asarray(x).mean(1) if np.ndim(x) == 2 else np.asarray(x)
    r, ts = _slide_db(m, 0.1, 0.05)
    med = float(np.median(r))
    tail = [(round(float(t), 2), round(float(v - med), 1)) for t, v in zip(ts, r) if t >= len(m) / C.SR - 2.0][::4]
    c = _chroma(m, len(m) / C.SR - 1.0, None)
    triad = [tonic % 12, (tonic + 4) % 12, (tonic + 7) % 12]
    share = float(c[triad].sum() / c.sum())
    best = max(range(12), key=lambda k: c[[k, (k + 4) % 12, (k + 7) % 12]].sum())
    return {"last2s_db_vs_median_every_0.2s": tail, "last_100ms_db_vs_median": round(float(r[-1] - med), 1),
            "tonic_triad_share_last1s": round(share, 3), "strongest_major_triad_last1s": NOTES[best],
            "key_last2s": key_estimate(x, len(m) / C.SR - 2.0, None)["key"]}


def band_shares(x):
    """エネルギーの割合: 120 Hz 未満 / 200 Hz–4 kHz(効果音と競合する帯域)/ 8 kHz 超、と重心"""
    m = np.asarray(x).mean(1) if np.ndim(x) == 2 else np.asarray(x)
    P = np.abs(np.fft.rfft(m)) ** 2; f = np.fft.rfftfreq(len(m), 1 / C.SR)
    tot = P[(f >= 20) & (f <= 20000)].sum() + 1e-30
    sh = lambda a, b: round(float(P[(f >= a) & (f < b)].sum() / tot), 3)
    return {"lt120": sh(20, 120), "b200_4k": sh(200, 4000), "gt8k": sh(8000, 20001),
            "centroid_hz": round(float((P * f)[(f >= 20)].sum() / P[(f >= 20)].sum()))}


def tech_stats(x):
    """クリップ・直流・左右の相関・ピーク・ノイズの床(50 ms RMS の 5 パーセンタイル)・波高率"""
    x = np.asarray(x, np.float64)
    m = x.mean(1)
    r, _ = _slide_db(m, 0.05, 0.05)
    corr = float((x[:, 0] * x[:, 1]).sum() / np.sqrt((x[:, 0] ** 2).sum() * (x[:, 1] ** 2).sum() + 1e-30))
    pk = float(np.abs(x).max())
    rms = float(np.sqrt((x ** 2).mean()))
    return {"clip_samples": int((np.abs(x) >= 0.999).sum()), "dc": [round(float(v), 5) for v in x.mean(0)], "lr_corr": round(corr, 3),
            "peak_dbfs": round(20 * np.log10(pk + 1e-12), 2), "floor_p5_50ms_dbfs": round(float(np.percentile(r, 5)), 1),
            "crest_db": round(20 * np.log10(pk / (rms + 1e-12)), 1)}
