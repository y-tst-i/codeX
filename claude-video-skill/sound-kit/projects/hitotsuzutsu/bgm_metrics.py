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
