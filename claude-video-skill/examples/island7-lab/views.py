#!/usr/bin/env python3
"""見る道具(motion-lab.md §5): 速度グラフ・オニオンスキン・前後2コマの比較。入力 out/state.json と out/stills/*.png。"""
import json, subprocess, sys
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams['font.family'] = 'IPAGothic'
st = json.load(open('out/state.json')); f = list(range(len(st)))
fig, ax = plt.subplots(3, 1, figsize=(12, 7), sharex=True)
ax[0].plot(f, [s['hero']['x'] for s in st], label='住人 x'); ax[0].plot(f, [s['hero']['footY'] for s in st], label='足の高さ'); ax[0].legend(loc='upper right')
ax[1].plot(f, [s['hero']['sx'] for s in st], label='横'); ax[1].plot(f, [s['hero']['sy'] for s in st], label='縦'); ax[1].legend(loc='upper right')
ax[2].plot(f, [s['s'] for s in st], label='物語の時刻 s(t)'); ax[2].legend(loc='upper left')
for a in ax:
    for L in [60, 90, 120, 150, 180, 210, 300, 333, 444]: a.axvline(L, color='#ccc', lw=.6)
ax[2].set_xlabel('コマ'); fig.tight_layout(); fig.savefig('out/speed.png', dpi=110)
print('out/speed.png')
