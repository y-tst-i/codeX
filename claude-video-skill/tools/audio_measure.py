#!/usr/bin/env python3
"""音を数値で確かめる(Claude は聴けないので、測って直す)。references/motion-lab.md §8。
usage: audio_measure.py <mix.wav|final.mp4> [--cues cues.json] [--fps N]
                        [--hits stem_hits.wav --bed stem_bed.wav]
 1) 全体と、スマホの帯域(200Hz〜6kHz)の統合ラウドネス(LUFS)、真のピーク(dBTP)
 2) 帯域ごとのエネルギーの割合(60Hz未満 / 150Hz〜6kHz)と中央の周波数、直流(各チャンネルの平均)
 3) --cues {"名前": コマ番号}: 各合図の最大の頂点が「コマ+1」から何msずれたか(+は遅い)
    コマ番号を秒に直す fps は、mp4 なら動画から自動で読む(--fps で上書き可)。wav に --cues を使うときは --fps 必須
 4) --hits と --bed: 各合図の頭60msで、打撃音が下地より何dB上か(K特性)。目安 3〜6 dB
"""
import argparse, json, os, re, subprocess, tempfile, wave
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("--cues"); ap.add_argument("--fps", type=float, default=None)
ap.add_argument("--hits"); ap.add_argument("--bed")
a = ap.parse_args()

def video_fps(path):
    """動画の fps を ffprobe で読む(映像が無ければ None)。以前は既定 60 固定で、30fps の動画だと合図の時刻が半分になった"""
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate,r_frame_rate",
                        "-of", "default=nw=1:nk=1", path], capture_output=True, text=True).stdout.split()
    for v in r:
        n, _, d = v.partition("/")
        try:
            f = float(n) / float(d or 1)
        except (ValueError, ZeroDivisionError):
            continue
        if f > 0:
            return f
    return None

if a.cues and a.fps is None:
    a.fps = video_fps(a.src)
    if a.fps is None:
        ap.error("--cues を使うときは --fps が必要です(音だけのファイルからは fps が分かりません)。例: --fps 30")
tmp = tempfile.mkdtemp()

def load(path):
    """ffmpeg で 48kHz の 16bit wav にして読む(mp4 も可)。戻り値: (チャンネル×サンプル, sr)"""
    out = os.path.join(tmp, os.path.basename(path) + ".wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vn", "-ar", "48000", "-c:a", "pcm_s16le", out], check=True)
    w = wave.open(out); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768.0
    return x.reshape(-1, ch).T, w.getframerate()

def ebur128(path, af=""):
    """ffmpeg の ebur128 で統合ラウドネスと真のピークを読む"""
    f = (af + "," if af else "") + "ebur128=peak=true"
    r = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-vn", "-af", f, "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = r[r.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summ); p = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summ)
    return float(i.group(1)), float(p.group(1))

def biquad(x, b, a_):
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for n in range(len(x)):
        v = b[0] * x[n] + b[1] * x1 + b[2] * x2 - a_[1] * y1 - a_[2] * y2
        x2, x1, y2, y1 = x1, x[n], y1, v; y[n] = v
    return y

def kweight(x, sr):
    """BS.1770 の K 特性(高域の棚 + 高域通過)。短い窓にだけ使う"""
    G, Q, fc = 3.999843853973347, 0.7071752369554196, 1681.974450955533
    K = np.tan(np.pi * fc / sr); Vh = 10 ** (G / 20); Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a1 = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    Q2, fc2 = 0.5003270373238773, 38.13547087602444
    K = np.tan(np.pi * fc2 / sr); a0 = 1 + K / Q2 + K * K
    a2 = [1, 2 * (K * K - 1) / a0, (1 - K / Q2 + K * K) / a0]
    return biquad(biquad(x, b1, a1), [1, -2, 1], a2)

x, sr = load(a.src)
I, TP = ebur128(a.src)
Ip, _ = ebur128(a.src, "highpass=f=200:poles=2,highpass=f=200:poles=2,lowpass=f=6000:poles=2,lowpass=f=6000:poles=2")
print(f"長さ {x.shape[1] / sr:.3f}s  {sr}Hz  {x.shape[0]}ch")
print(f"統合ラウドネス {I:.1f} LUFS(目標 -14)  真のピーク {TP:.1f} dBTP(WAV は -2 以下、MP4 は -1 以下)")
print(f"スマホの帯域 200Hz〜6kHz: {Ip:.1f} LUFS(全体との差 {Ip - I:+.1f} dB。差が大きいほどスマホで小さく聞こえる)")
m = x.mean(axis=0); P = np.abs(np.fft.rfft(m)) ** 2; f = np.fft.rfftfreq(len(m), 1 / sr); tot = P.sum() + 1e-20
med = f[np.searchsorted(np.cumsum(P), tot / 2)]
print(f"エネルギー: 60Hz未満 {100 * P[f < 60].sum() / tot:.1f}%  150Hz〜6kHz {100 * P[(f >= 150) & (f <= 6000)].sum() / tot:.1f}%  中央 {med:.0f}Hz")
print("直流(各チャンネルの平均): " + "  ".join(f"{v:+.5f}" for v in x.mean(axis=1)))

if a.cues:
    cues = json.load(open(a.cues, encoding="utf8"))
    hx = load(a.hits)[0].mean(axis=0) if a.hits else m
    bx = load(a.bed)[0].mean(axis=0) if a.bed else None
    print(f"\nfps {a.fps:g}(コマ番号 → 秒の換算に使用)")
    print(f"{'合図':<16}{'コマ':>6}{'頂点のずれ(ms)':>16}" + (f"{'下地より(dB)':>14}" if bx is not None else ""))
    for name, fr in cues.items():
        t0 = int(round((fr + 1) / a.fps * sr))          # 狙い: 絵の出来事の1コマ後
        lo, hi = max(0, t0 - int(0.010 * sr)), min(len(hx), t0 + int(0.020 * sr))
        pk = lo + int(np.argmax(np.abs(hx[lo:hi])))
        line = f"{name:<16}{fr:>6}{1000 * (pk - t0) / sr:>+16.2f}"
        if bx is not None:
            s, e = max(0, t0 - int(0.005 * sr)), t0 + int(0.060 * sr)
            pre = int(0.4 * sr)                          # フィルタの立ち上がり用に前を足して捨てる
            def lv(v):
                k = kweight(v[max(0, s - pre):e], sr)[s - max(0, s - pre):]
                return 10 * np.log10((k ** 2).mean() + 1e-20)
            d = lv(hx) - lv(bx); flag = "" if 3 <= d <= 6 else ("  ← 埋もれる" if d < 3 else "  ← 飛び出す")
            line += f"{d:>14.1f}{flag}"
        print(line)
