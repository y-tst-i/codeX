#!/usr/bin/env python3
"""第3ラウンド: PC の Audio Studio で作った BGM(D1–D4)と、第2ラウンドの light(S9)の BGM を、同じ物差しで測る。モデルは使わない。
- 長さ・標本化周波数・ビット数(元のファイル)
- BGM ベッドの落ち込み: 100 ms / 50 ms の RMS を 10 ms ずつずらした最小と中央値の差(ルール: -15 dB 以内)
- 拍: 音の立ち上がりのすき間の最大・テンポ(librosa)
- 調の推定(Krumhansl–Schmuckler、全体)と、C の音程の身振り(Eb 長調)との関係
- 終わり方: 最後の 2 s の大きさの動き、最後の 1 s の和音らしさ、最後の 2 s の調
- C の音程の身振り(Eb 長調の音)のうち、推定した調の音階に入らない音の数
- 帯域: 帯域幅(平均スペクトルが最大から -60 dB の所)、120 Hz 未満 / 200 Hz–4 kHz(効果音と競合)/ 8 kHz 超の割合と重心
- 技術: クリップ・直流・左右の相関・ピーク・ノイズの床・モノラルの大きさ。-14 LUFS にそろえた後のピークと床も(D4 の持ち上げ)
usage: python audit_round3.py     出力: WORK/R3_audit.json と標準出力
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bgm_metrics as BM  # noqa: E402
import common as C  # noqa: E402

PC = os.path.join(C.REPO, "docs", "sound-upgrade", "audio_studio_pc")
PLANS = ["D1", "D2", "D3", "D4"]
# C の音程の身振り(make_C.music_gestures のチェレスタ 12 音・ビブラフォン 4 音)と木の打音 Bb4。5 本とも同じ物がミックスに入る
GESTURE_MIDI = [79, 82, 86, 72, 75, 77, 79, 82, 84, 87, 87, 94, 67, 70, 75, 79, 70]


def gesture_fit(key):
    """推定した調の音階(長調 / 自然短音階 + 導音)に入らない身振りの音の数"""
    tonic = BM.NOTES.index(key.split()[0])
    steps = [0, 2, 4, 5, 7, 9, 11] if key.endswith("major") else [0, 2, 3, 5, 7, 8, 10, 11]
    scale = {(tonic + s) % 12 for s in steps}
    out = [BM.NOTES[p % 12] for p in GESTURE_MIDI if p % 12 not in scale]
    return {"gesture_notes": len(GESTURE_MIDI), "outside_scale": len(out), "outside_names": sorted(set(out))}


def load_d(name):
    """D*.wav(44.1 kHz)を 48 kHz の (n,2) float64 に(多相フィルタ 160/147)。長さを 15.000 s にそろえる"""
    x, sr = sf.read(os.path.join(PC, name + ".wav"), dtype="float64", always_2d=True)
    info = sf.info(os.path.join(PC, name + ".wav"))
    src = {"sr": sr, "subtype": info.subtype, "channels": info.channels, "frames": info.frames, "dur_s": round(info.frames / sr, 4)}
    if x.shape[1] == 1:
        x = np.repeat(x, 2, 1)
    if sr != C.SR:
        g = np.gcd(C.SR, sr)
        x = resample_poly(x, C.SR // g, sr // g, axis=0)
    y = np.zeros((C.N, 2)); n = min(C.N, len(x)); y[:n] = x[:n]
    return y, src


def load_s9():
    x, _ = sf.read(os.path.join(C.WORK, "R2_light", "raw_bgm_only.wav"), dtype="float64", always_2d=True)
    return x[: C.N], {"sr": C.SR, "note": "WORK/R2_light/raw_bgm_only.wav(第2ラウンドの light の BGM、谷を入れる前・身振りなし)"}


def mono_lufs(x):
    m = x.mean(1, keepdims=True).repeat(2, 1)
    return C.ebur(m)[0]


def bandwidth(x):
    """長時間の平均スペクトル(Welch)が最大から 60 dB 下がるまでの一番高い周波数"""
    from scipy.signal import welch
    f, P = welch(x.mean(1), C.SR, nperseg=8192)
    Pd = 10 * np.log10(P + 1e-30)
    return float(f[np.where(Pd > Pd.max() - 60)[0].max()])


def hf_dbfs(x, f=10000.0):
    """f Hz 超の成分の RMS(dBFS)。小さい BGM を持ち上げた時に高い帯域の雑音が出ないかを見る"""
    from scipy.signal import butter, sosfiltfilt
    h = sosfiltfilt(butter(4, f, "hp", fs=C.SR, output="sos"), x.mean(1))
    return round(float(10 * np.log10((h ** 2).mean() + 1e-30)), 1)


def beat_phase(x):
    """librosa の拍の時刻の、映像の拍の格子(0.625 s)からのずれ: 中央値と標準偏差(s)"""
    import librosa
    y = librosa.resample(x.mean(1).astype(np.float32), orig_sr=C.SR, target_sr=22050)
    _, beats = librosa.beat.beat_track(y=y, sr=22050, units="time")
    ph = beats % C.BEAT
    ph = np.where(ph > C.BEAT / 2, ph - C.BEAT, ph)
    return {"median_s": round(float(np.median(ph)), 3), "sd_s": round(float(ph.std()), 3)}


def measure(x):
    I, TP, LRA = C.ebur(x)
    xn = x * C.db(-14.0 - I)
    return {"lufs": I, "tp": TP, "lra": LRA, "mono_lufs_minus_stereo": round(mono_lufs(x) - I, 2),
            "tech": BM.tech_stats(x), "tech_at_-14": {**{k: v for k, v in BM.tech_stats(xn).items() if k in ("peak_dbfs", "floor_p5_50ms_dbfs", "clip_samples")}, "hf_gt10k_dbfs": hf_dbfs(xn)},
            "gain_to_-14_db": round(-14.0 - I, 2),
            "bed": BM.bed_stats(x), "beat": BM.beat_stats(x), "beat_phase_vs_grid": beat_phase(x), "key": BM.key_estimate(x), "ending": BM.ending_stats(x),
            "bands": BM.band_shares(x), "bandwidth_-60db_hz": bandwidth(x)}


def main():
    res = {}
    items = [("S9", *load_s9())] + [(p, *load_d(p)) for p in PLANS]
    for name, x, src in items:
        r = {"source": src, **measure(x)}
        r["gesture_fit"] = gesture_fit(r["key"]["key"])
        res[name] = r
        b = r["bed"]
        print(f"== {name} {src.get('dur_s', 15.0)} s  LUFS {r['lufs']} TP {r['tp']} LRA {r['lra']}  gain->-14 {r['gain_to_-14_db']}  mono {r['mono_lufs_minus_stereo']}")
        print(f"   bed100 {b['rms100_min_below_median_db']} @ {b['rms100_min_at_s']}  bed50 {b['rms50_min_below_median_db']} @ {b['rms50_min_at_s']}")
        print("   beat", r["beat"]); print("   key", r["key"], r["gesture_fit"], "bw", r["bandwidth_-60db_hz"]); print("   end", r["ending"])
        print("   bands", r["bands"], " tech", r["tech"], " at -14", r["tech_at_-14"])
    json.dump(res, open(os.path.join(C.WORK, "R3_audit.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
