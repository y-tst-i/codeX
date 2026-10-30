#!/usr/bin/env python3
"""水晶の空: 曲(M1/M2)に効果音2つだけを重ね、-14 LUFS / 真のピーク -2 dBTP(WAV)にして映像に載せる。
usage: make_audio.py <music.mp3> <video_only.mp4> <out.mp4> [--stems DIR]
効果音(cue 表どおり・最小限):
  1) 7.3〜9.0s 雲を突き抜ける風(ピンクノイズを帯域で絞る・合成)。曲より約 -10 dB
  2) 17.5s 紋章のきらめき(Kenney CC0 impactGlass_light_002、軽い残響)。頂点は 17.533s(絵の1コマ後)
10.000s のヒットは曲に任せる(足さない)。
"""
import argparse, json, os, subprocess, tempfile
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR, DUR = 48000, 20.0
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
SFX = os.path.join(HERE, "..", "..", "tools", "assets", "sfx-cc0", "impact-sounds", "impactGlass_light_002.ogg")

ap = argparse.ArgumentParser()
ap.add_argument("music"); ap.add_argument("video"); ap.add_argument("out"); ap.add_argument("--stems")
a = ap.parse_args()
tmp = tempfile.mkdtemp()

def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], stdout=subprocess.PIPE, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).T.astype(np.float64)

def save(path, x):
    x = np.clip(x, -1, 1)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_f32le", path], stdin=subprocess.PIPE)
    p.communicate(x.T.astype(np.float32).tobytes())

def rms_db(x, t0, t1):
    s = x[:, int(t0 * SR):int(t1 * SR)]; return 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-12)

music = load(a.music)[:, :N]
if music.shape[1] < N: music = np.pad(music, ((0, 0), (0, N - music.shape[1])))
rng = np.random.default_rng(20261029)

# 1) 風: ピンクノイズ(1/f)→ 時間で動く帯域(3区間をクロスフェード)
def pink(n):
    w = rng.standard_normal(n); f = np.fft.rfft(w); k = np.arange(len(f)); k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), n)
t0, t1 = 7.3, 9.0; n = int((t1 - t0) * SR); tt = np.arange(n) / SR + t0
wind = np.zeros((2, n))
for ch in range(2):
    p = pink(n); p /= np.abs(p).max()
    bands = [sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), p) for lo, hi in [(250, 900), (600, 2600), (300, 1100)]]
    k = np.clip((tt - 7.3) / 1.2, 0, 1)                          # 前半→中盤→後半
    wa = np.clip(1 - 2 * k, 0, 1); wc = np.clip(2 * k - 1, 0, 1); wb = 1 - wa - wc
    wind[ch] = bands[0] * wa + bands[1] * wb + bands[2] * wc
env = np.clip((tt - 7.3) / 0.3, 0, 1) ** 2 * np.clip((9.0 - tt) / 0.4, 0, 1) ** 1.5
env *= 1 + 0.35 * np.clip(1 - np.abs(tt - 8.75) / 0.25, 0, 1)   # 8.75 の突き抜けで少し膨らむ
wind *= env; wind = np.tanh(wind * 1.5)                          # 頂点を丸める(pitfalls §7)
sfx = np.zeros((2, N)); i0 = int(t0 * SR); sfx[:, i0:i0 + n] += wind
target = rms_db(music, 7.6, 8.6) - 10
sfx[:, i0:i0 + n] *= 10 ** ((target - rms_db(sfx, 7.6, 8.6)) / 20)

# 2) きらめき: ガラスの軽い音 + 短い残響。最大の山を 17.533s に置く
g = load(SFX); g = g / np.abs(g).max()
ir = rng.standard_normal((2, int(1.4 * SR))) * np.exp(-np.arange(int(1.4 * SR)) / SR * 4.5)
ir = np.stack([sosfilt(butter(2, 3000, "lowpass", fs=SR, output="sos"), r) for r in ir]) * 0.08
gl = np.stack([fftconvolve(g[c], ir[c])[: g.shape[1] + ir.shape[1]] for c in range(2)])
gl[:, : g.shape[1]] += g * 0.8
pk = int(np.argmax(np.abs(gl).sum(0)))
st = int(17.5333 * SR) - pk
gs = np.zeros((2, N)); e = min(N, st + gl.shape[1]); gs[:, st:e] = gl[:, : e - st]
target = rms_db(music, 17.45, 17.75) - 6
gs *= 10 ** ((target - rms_db(gs, 17.45, 17.75)) / 20)
sfx += gs

mix = music + sfx
raw = os.path.join(tmp, "mix_raw.wav"); save(raw, mix)
if a.stems:
    os.makedirs(a.stems, exist_ok=True); save(os.path.join(a.stems, "music.wav"), music); save(os.path.join(a.stems, "sfx.wav"), sfx)

# -14 LUFS / -2 dBTP(2回通しの loudnorm。assemble.sh と同じ考え方)
def meas(p):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-af", "loudnorm=I=-14:TP=-2:LRA=14:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    return json.loads(r[r.rindex("{"):r.rindex("}") + 1])
m = meas(raw)
fin = os.path.join(tmp, "mix.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                f"loudnorm=I=-14:TP=-2:LRA=14:measured_I={m['input_i']}:measured_LRA={m['input_lra']}:measured_TP={m['input_tp']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,atrim=0:{DUR}",
                "-ar", str(SR), "-c:a", "pcm_s16le", fin], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-i", fin, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", str(SR), "-t", str(DUR), "-movflags", "+faststart", a.out], check=True)
print("wrote", a.out, "| input", m["input_i"], "LUFS", m["input_tp"], "dBTP")
