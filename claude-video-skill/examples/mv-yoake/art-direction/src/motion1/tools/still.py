# 静止の物差し(review_checks / still_probe と同じ: 約0.1秒=3コマ離れた2コマで、灰色が 6 階調以上変わった画素の割合 %。480x270 に縮小)
import sys, subprocess, numpy as np
def run(p):
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-i", p, "-vf", "scale=480:270:flags=area,format=gray", "-f", "rawvideo", "-"], stdout=subprocess.PIPE); fr = []
    while True:
        b = pr.stdout.read(480 * 270)
        if len(b) < 480 * 270: break
        fr.append(np.frombuffer(b, np.uint8).astype(np.int16))
    return [None, None, None] + [float((np.abs(fr[i] - fr[i - 3]) >= 6).mean() * 100) for i in range(3, len(fr))]
for p in sys.argv[1:]:
    v = run(p); vv = [x for x in v if x is not None]; still = [i for i, x in enumerate(v) if x is not None and x <= 0.15]
    runs = []; s0 = None; pv = None
    for i in still:
        if pv is not None and i == pv + 1: pv = i; continue
        if s0 is not None: runs.append((s0, pv))
        s0 = pv = i
    if s0 is not None: runs.append((s0, pv))
    print(p.split('/')[-1], "frames", len(v), "still_frames", len(still), "median_pct", round(float(np.median(vv)), 3), "runs>=5", [r for r in runs if r[1] - r[0] >= 5])
