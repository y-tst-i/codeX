#!/usr/bin/env python3
"""映像の閃光(輝度の急上昇)と音の立ち上がりが合っているかを数値で確認する。
usage: sync_check.py <final.mp4> [cues.json]   (cues.json = {"合図名": 秒, ...})
 1) 映像: 各フレームの平均輝度(YAVG)が急に上がった時刻を列挙
 2) 音  : 各合図の前後0.1秒で、音量が何dB立ち上がったか・ピークが何秒ずれたかを表示
    立ち上がりが弱い(< 3dB)合図は、音が背景に埋もれている → 笑いどころ/衝撃は音量を上げる。
"""
import sys, re, json, subprocess, tempfile, wave, numpy as np, os
mp4 = sys.argv[1]
cues = json.load(open(sys.argv[2], encoding="utf8")) if len(sys.argv) > 2 else {}
tmp = tempfile.mkdtemp()
st = os.path.join(tmp, "yavg.txt"); wavp = os.path.join(tmp, "a.wav")
subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", f"signalstats,metadata=print:key=lavfi.signalstats.YAVG:file={st}", "-an", "-f", "null", "-"], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp4, "-vn", "-ac", "1", "-ar", "44100", wavp], check=True)
y = [float(m) for m in re.findall(r"YAVG=([\d.]+)", open(st).read())]
fps = 30.0
print(f"frames={len(y)}  duration={len(y)/fps:.3f}s")
print("映像: 輝度の急上昇(秒, 増分):", [(round(i / fps, 2), round(y[i] - y[i - 1])) for i in range(1, len(y)) if y[i] - y[i - 1] > 45])
w = wave.open(wavp); x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2") / 32768.0; sr = w.getframerate()
hop = int(sr * 0.01); e = np.array([np.sqrt((x[i:i + hop] ** 2).mean()) for i in range(0, len(x) - hop, hop)])
db = lambda v: 20 * np.log10(v + 1e-9)
def onset(t):
    i = int(t * 100); pre = e[max(0, i - 10):max(1, i - 1)].mean(); win = e[max(0, i - 2):i + 10]
    j = int(np.argmax(win)) - (2 if i >= 2 else i)
    return db(win.max()) - db(pre), j * 0.01
if cues:
    print(f"{'合図':<24}{'時刻':>8}{'立ち上がり(dB)':>16}{'ピークのずれ(s)':>16}")
    for k, t in cues.items():
        d, off = onset(t); flag = "  ← 弱い" if d < 3 else ""
        print(f"{k:<24}{t:8.2f}{d:16.1f}{off:16.2f}{flag}")
