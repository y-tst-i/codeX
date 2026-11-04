#!/usr/bin/env python3
"""LUMIWAKE の音: Suno の曲(30秒切り出し)+効果音3発。音声ファイルはリポジトリに入れない(出力は scratchpad)。
効果音(曲の調 C 長調と推定。estimate_key.py の結果。確実ではない):
  435 稲妻の裂け: CC0 録音 impactMetal_heavy_001(sound-kit)を 1.2kHz 以上に絞って短く
  610 ガラスの鈴: 数値合成(加算合成)。C6(1046.5Hz)と G6(1568.0Hz)の純正に近い2音+倍音。曲の調に合わせた
  723 低い灯り音: 数値合成。C3(130.8Hz)と G3(196.0Hz)+倍音、頭に短い息(帯域ノイズ)
ヒットの頂点は「絵のコマの1コマ後」((frame+1)/30 秒)に置く。各効果音の大きさは、ヒット直後の曲の 200Hz〜6kHz の RMS に対する dB で決める。
使い方: python3 -I make_audio.py <曲.mp3> <出力.wav> [--report 出力.json]
"""
import sys, json, subprocess, os
import numpy as np
from scipy.signal import butter, sosfilt
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "..", "tools"))
import sfx_lib as S
SR = 48000; FPS = 30
song_path, out_wav = sys.argv[1], sys.argv[2]; rep = sys.argv[sys.argv.index("--report") + 1] if "--report" in sys.argv else None
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", song_path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
song = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy(); N = int(30 * SR); song = song[:N] if len(song) >= N else np.pad(song, ((0, N - len(song)), (0, 0)))
bp = butter(4, [200, 6000], btype="band", fs=SR, output="sos")
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
mono = song.mean(axis=1); music_bp = sosfilt(bp, mono)
def peak_index(x, win=0.12):  # 頭 win 秒の中で最大の山の位置
    n = int(win * SR); return int(np.argmax(np.abs(x[:n])))
def place(x, t_peak):  # x の頂点が t_peak 秒に来るよう N 長の配列に置く
    out = np.zeros(N, dtype=np.float32); p = peak_index(x); s = int(round(t_peak * SR)) - p
    a, b = max(0, s), min(N, s + len(x)); out[a:b] = x[a - s:b - s]; return out, s
def fadeout(x, ms): n = int(ms / 1000 * SR); x = x.copy(); x[-n:] *= np.cos(np.linspace(0, np.pi / 2, n)) ** 2; return x
# ---- 1) 稲妻の裂け(CC0 録音)----
crack = S.load("impactMetal_heavy_001", sr=SR, gain=1.0).astype(np.float32); crack = sosfilt(butter(4, 1200, btype="high", fs=SR, output="sos"), crack)[: int(0.30 * SR)]; crack = fadeout(crack, 80)
# ---- 2) ガラスの鈴(合成。C6 と G6)----
def bell(freqs, amps, dur=1.3, decays=(0.30, 0.22)):
    t = np.arange(int(dur * SR)) / SR; y = np.zeros_like(t)
    for f0, a in zip(freqs, amps):
        for k, (r, ka, dk) in enumerate([(1.0, 1.0, decays[0]), (2.0, 0.35, decays[1]), (2.76, 0.18, 0.15), (5.4, 0.08, 0.08)]): y += a * ka * np.cos(2 * np.pi * f0 * r * t) * np.exp(-t / dk)
    y *= np.minimum(1, t / 0.0008); return (y / np.max(np.abs(y))).astype(np.float32)
glass = fadeout(bell([1046.5, 1568.0], [1.0, 0.6]), 120)
# ---- 3) 低い灯り音(合成。C3 と G3)----
def lamp(dur=1.1):
    t = np.arange(int(dur * SR)) / SR; y = np.zeros_like(t)
    for f0, a in ((130.81, 1.0), (196.0, 0.55)):
        y += a * (np.sin(2 * np.pi * f0 * t * (1 + 0.025 * np.exp(-t / 0.05))) + 0.45 * np.sin(2 * np.pi * 2 * f0 * t) * np.exp(-t / 0.18) + 0.2 * np.sin(2 * np.pi * 3 * f0 * t) * np.exp(-t / 0.1)) * np.exp(-t / 0.42)
    rng = np.random.default_rng(7); n = rng.standard_normal(len(t)); n = sosfilt(butter(2, [300, 1800], btype="band", fs=SR, output="sos"), n) * np.exp(-t / 0.04) * 0.5
    y = y + n; y *= np.minimum(1, t / 0.004); return fadeout((y / np.max(np.abs(y))).astype(np.float32), 200)
glow = lamp()
sfx = [("lightning_crack", 435, crack, 2.0), ("glass_bell", 610, glass, 1.5), ("lantern_low", 723, glow, 2.0)]  # (名前, 絵のコマ, 波形, 曲の帯域RMSに対する dB)
mix = song.copy(); report = []
for name, frame, x, db in sfx:
    t_peak = (frame + 1) / FPS; w, s0 = place(x, t_peak); i0 = int(t_peak * SR); win = slice(i0, i0 + int(0.12 * SR))
    music_db = rms_db(music_bp[win]); sf = sosfilt(bp, w); sfx_db = rms_db(sf[win]); g = 10 ** ((music_db + db - sfx_db) / 20)
    mix += (w * g)[:, None]; report.append({"name": name, "picture_frame": frame, "peak_time_s": round(t_peak, 4), "peak_frame_after_picture": 1, "music_band_rms_db": round(music_db, 1), "sfx_gain": round(float(g), 3), "sfx_above_music_db": db})
peak = np.max(np.abs(mix)); mix = mix / max(1.0, peak / 0.89)
i16 = os.path.splitext(out_wav)[0] + "_raw.wav"
import wave
def wavwrite(path, a):
    with wave.open(path, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a, -1, 1) * 32767).astype("<i2").tobytes())
wavwrite(i16, mix)
if rep: json.dump(report, open(rep, "w"), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False)); print("wrote", i16)
