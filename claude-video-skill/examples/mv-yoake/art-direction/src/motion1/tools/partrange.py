#!/usr/bin/env python3
"""区間の名前 → 曲のコマの範囲(F0 N)。区間の境目は audio/cues.json のショット表から。
A = 冒頭 S1〜S4 / M = 中盤 S5〜S9 / B = 夜明け S10〜終わり / DA = 夜明けの構図 A(1340〜「夜」の前)/ S5〜S9 = そのショット / <F0>:<N> = 直接
使い方: python3 -I partrange.py <cues.json> <lyric_timeline.json> <区間>"""
import json, sys
c = json.load(open(sys.argv[1])); s = {x['id']: x for x in c['shots']}; p = sys.argv[3]
lt = json.load(open(sys.argv[2], encoding='utf-8'))
yo = next(w['start'] for l in lt['lines'] for ph in l['phrases'] for w in ph.get('words', []) if w['text'] == '夜')
if ':' in p: a, n = p.split(':'); print(int(a), int(n))
elif p == 'A': print(0, s['S5']['start'])
elif p == 'M': print(s['S5']['start'], s['S10']['start'] - s['S5']['start'])
elif p == 'B': print(s['S10']['start'], c['frames'] - s['S10']['start'])
elif p == 'DA': print(s['S10']['start'], yo - s['S10']['start'])
elif p in s: print(s[p]['start'], s[p]['end'] - s[p]['start'])
else: sys.exit('区間が分からない: ' + p)
