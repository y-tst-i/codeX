"""BGM(音楽ベッド)だけを測る道具(第2ラウンド)。モデルは使わない。
- bed_stats: 100 ms と 400 ms の RMS(dBFS)の最小・中央値・最小の時刻(最初の 0.3 s と最後の 0.4 s は除く = 曲の入りと終わりの減衰)
- beat_stats: 音の立ち上がり(librosa の onset 検出)の時刻と、そのすき間の最大。テンポの推定(librosa beat_track)
- notes_gap: 楽譜(MIDI の発音時刻の一覧)からの、発音のすき間の最大
"""
import numpy as np

import common as C


def _rms_db(m, win):
    w = int(win * C.SR); k = len(m) // w
    return 20 * np.log10(np.sqrt((m[: k * w].reshape(k, w) ** 2).mean(1)) + 1e-12)


def bed_stats(x, t0=0.3, t1=None):
    x = np.asarray(x, np.float64)
    m = x.mean(1) if x.ndim == 2 else x
    t1 = t1 or (len(m) / C.SR - 0.4)
    out = {}
    for win in (0.1, 0.4):
        r = _rms_db(m, win)
        ts = (np.arange(len(r)) + 0.5) * win
        sel = (ts >= t0) & (ts <= t1)
        rr, tt = r[sel], ts[sel]
        i = int(np.argmin(rr))
        out[f"rms{int(win * 1000)}_min_dbfs"] = round(float(rr[i]), 1)
        out[f"rms{int(win * 1000)}_min_at_s"] = round(float(tt[i]), 2)
        out[f"rms{int(win * 1000)}_median_dbfs"] = round(float(np.median(rr)), 1)
        out[f"rms{int(win * 1000)}_min_below_median_db"] = round(float(rr[i] - np.median(rr)), 1)
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
