#!/usr/bin/env python3
"""[試作] Suno曲(30秒切り出し)+ Audio Studio 効果音モデルの3音 を合わせて、音ハメ位置に置く試作ミックス。
usage: SFXLIB_DIR=<このリポジトリの tools/> [B435DB=-3] [PEAKTGT=0.84] python3 -I mix_sfx_over_song.py <song.mp3> <sfx_dir> <out_prefix>
  sfx_dir に sfx435.wav / sfx610.wav / sfx723.wav(Audio Studio の効果音モデルの出力)を置く。フレーム番号(435/610/723)とファイル名は、LUMIWAKE 向けの固定値(作り直すときは build() の数値を変える)。
  B435DB: Bの稲妻の大きさ(曲の帯域に対する dB)。PEAKTGT: 最終のピーク(0.84≒-1.5dBFS)
出力: <out_prefix>_A.wav(435は従来のCC0録音ベース、610/723は新) と <out_prefix>_B.wav(3つとも新)
聴けないので、数値(位置・音量・ピーク)だけを JSON で出す。"""
import sys, os, json, subprocess, wave
import numpy as np, scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt, resample_poly
SR = 48000; FPS = 30; N = 30 * SR
song_path, sfx_dir, prefix = sys.argv[1:4]
raw = subprocess.run(["ffmpeg","-v","error","-i",song_path,"-ac","2","-ar",str(SR),"-f","f32le","-"],capture_output=True).stdout
song = np.frombuffer(raw, dtype=np.float32).reshape(-1,2).copy(); song = song[:N] if len(song)>=N else np.pad(song,((0,N-len(song)),(0,0)))
def band(x, lo, hi): return sosfilt(butter(4,[lo,hi],btype="band",fs=SR,output="sos"), x)
def rms_db(x): return 20*np.log10(np.sqrt(np.mean(np.square(x)))+1e-12)
def loadwav(name):
    sr,x = wf.read(os.path.join(sfx_dir, name)); x = x.astype(np.float64)
    x = x/(2**31 if np.abs(x).max()>2**23 else 2**23 if np.abs(x).max()>2**15 else 1.0)
    m = x.mean(axis=1) if x.ndim>1 else x
    return resample_poly(m, SR//np.gcd(SR,sr), sr//np.gcd(SR,sr)).astype(np.float64) if sr!=SR else m
def env(x, ms=5):
    k = max(1,int(ms/1000*SR)); return np.sqrt(np.convolve(x**2, np.ones(k)/k, 'same'))
def place(x, t_ref, ref_idx):  # x の ref_idx サンプル目が t_ref 秒に来る
    out = np.zeros(N); s = int(round(t_ref*SR)) - ref_idx; a,b = max(0,s), min(N,s+len(x))
    if b>a: out[a:b] = x[a-s:b-s]
    return out, s
def fade(x, in_ms=0, out_ms=0):
    x = x.copy()
    if in_ms: n=int(in_ms/1000*SR); x[:n] *= np.linspace(0,1,n)**2
    if out_ms: n=int(out_ms/1000*SR); x[-n:] *= np.cos(np.linspace(0,np.pi/2,n))**2
    return x
mono = song.mean(axis=1); music_mid = band(mono,200,6000); music_low = band(mono,20,150)
rep = {}
# ---- 610 ガラスの鈴(新): 打撃の頂点を (610+1)/30 秒へ。打撃の約60ms前から使う(前の長い助走は切る)----
g = loadwav("sfx610.wav"); e = env(g); pk = int(np.argmax(e)); on = pk
while on>0 and 20*np.log10(e[on]+1e-9) > 20*np.log10(e[pk])-20: on -= 1
st = max(0, on-int(0.06*SR)); g2 = fade(g[st:], in_ms=25, out_ms=150); g2 = g2/np.max(np.abs(g2))*0.8
rep["610_new"] = {"strike_peak_in_file_s": round(pk/SR,3), "trim_start_s": round(st/SR,3)}
# ---- 723 灯台の点灯(新): 低音だけのため、小さなスピーカーで聞こえるよう倍音を足す。聞こえ始め(-6dB)を (723+1)/30 秒へ----
l = loadwav("sfx723.wav"); e = env(l, 10); pkl = int(np.argmax(e)); db = 20*np.log10(e+1e-9)
aud = int(np.argmax(db > db[pkl]-6))
harm = band(np.tanh(4*l/np.max(np.abs(l))), 110, 700)  # 低音の倍音(120〜700Hz)
l2 = l/np.max(np.abs(l)); harm = harm/np.max(np.abs(harm))*0.45; l_mix = fade(l2 + harm, in_ms=40, out_ms=400)
rep["723_new"] = {"audible_onset_in_file_s": round(aud/SR,3), "peak_in_file_s": round(pkl/SR,3), "harmonic_layer": "tanh(4x) を 110〜700Hz で通して +(0.45)"}
# ---- 435 稲妻(従来 / 新) ----
def build(variant):
    mix = song.copy(); log = []
    # 435
    if variant == "A":
        sys.path.insert(0, os.environ["SFXLIB_DIR"]); import sfx_lib as S
        c = S.load("impactMetal_heavy_001", sr=SR, gain=1.0).astype(np.float64)
        c = sosfilt(butter(4,1200,btype="high",fs=SR,output="sos"), c)[:int(0.30*SR)]; c = fade(c,0,80)
        w, s0 = place(c, (435+1)/FPS, int(np.argmax(np.abs(c[:int(0.12*SR)])))); tag = "435_old_CC0"; ref = "mid"; add_db = 2.0
    else:
        a = loadwav("sfx435.wav")
        a = sosfilt(butter(4,1500,btype="high",fs=SR,output="sos"), a)  # 低域の濁りを切る
        t = np.arange(len(a))/SR; a = a*np.exp(-t/0.12); a = fade(a,3,150)[:int(0.8*SR)]  # 平らな連続ノイズを、裂け音の形(素早い減衰)に
        w, s0 = place(a, (435+1)/FPS, 0); tag = "435_new_shaped"; ref = "mid"; add_db = float(os.environ.get("B435DB","2.0"))
    t0 = int((435+1)/FPS*SR); win = slice(t0, t0+int(0.12*SR)); mdb = rms_db(music_mid[win]); sdb = rms_db(band(w,200,6000)[win]); gain = 10**((mdb+add_db-sdb)/20)
    mix += (w*gain)[:,None]; log.append({"name":tag,"picture_frame":435,"target_peak_s":round(t0/SR,4),"gain":round(float(gain),4)})
    # 610
    w, s0 = place(g2, (610+1)/FPS, pk-st); t0 = int((610+1)/FPS*SR); win = slice(t0, t0+int(0.12*SR)); mdb = rms_db(music_mid[win]); sdb = rms_db(band(w,200,6000)[win]); gain = 10**((mdb+1.5-sdb)/20)
    mix += (w*gain)[:,None]; log.append({"name":"610_new","picture_frame":610,"target_peak_s":round(t0/SR,4),"gain":round(float(gain),4)})
    # 723: 低域(20〜150Hz)の大きさを、曲の同じ区間の低域+1dB に合わせる
    w, s0 = place(l_mix, (723+1)/FPS, aud); t0 = int((723+1)/FPS*SR); win = slice(t0, t0+int(0.6*SR)); mdb = rms_db(music_low[win]); sdb = rms_db(band(w,20,150)[win]); gain = 10**((mdb+1.0-sdb)/20)
    mix += (w*gain)[:,None]; log.append({"name":"723_new","picture_frame":723,"audible_onset_s":round(t0/SR,4),"gain":round(float(gain),4),"low_band_over_music_db":1.0})
    pkm = np.max(np.abs(mix)); mix = mix/max(1.0, pkm/float(os.environ.get("PEAKTGT","0.89")))
    return mix, log
def wavwrite(path, a):
    with wave.open(path,"wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(a,-1,1)*32767).astype("<i2").tobytes())
out = {}
for v in ("A","B"):
    m, lg = build(v); wavwrite(f"{prefix}_{v}.wav", m); out[v] = lg
rep["variants"] = out; print(json.dumps(rep, ensure_ascii=False, indent=1))
