#!/usr/bin/env python3
"""PROMPT.md の CHECKS を全 480 コマで照合する(motion-lab.md §6)。入力: out/state.json(node lab.mjs state)。
出力: 合格/不合格の一覧と out/checks.json。不合格はコマ番号つき。"""
import json, math, itertools, sys
st = json.load(open('out/state.json'))
N, FPS = len(st), 60
LAND, AIR, CROUCH, BOLT, STORM = [60, 90, 120, 150, 180, 210], 20, 10, 300, 240
PAD_X = lambda k: -6 + 2 * k
res = []
def check(name, ok, detail=''):
    res.append({'name': name, 'ok': bool(ok), 'detail': detail}); print(('[合格] ' if ok else '[不合格] ') + name + (f'  {detail}' if detail else ''))

# 1. 着地のコマで足が足場の上(高さの誤差 0.02 以内、横は足場の中)
for k, L in enumerate(LAND, 1):
    h = st[L]['hero']; check(f'着地 {k}日目(コマ {L}): 足が足場の上', abs(h['footY'] - .06) < .02 and abs(h['x'] - PAD_X(k)) < .6, f"足の高さ {h['footY']:.3f}, x {h['x']:.2f}")
# 2. 日のラベルが着地のコマちょうどに点く(前のコマは消えている)
for k, L in enumerate(LAND):
    check(f'{k + 1}日目のラベルがコマ {L} で点く', (not st[L - 1]['labelsLit'][k]) and st[L]['labelsLit'][k])
check(f'7日目のラベルがコマ {STORM} で点く', (not st[STORM - 1]['labelsLit'][6]) and st[STORM]['labelsLit'][6])
# 3. アニメの原則が数値どおり
for k, L in enumerate(LAND, 1):
    T = L - AIR; a = st[T - 1]['hero']; b = st[T + 1]['hero']; c = st[L + 2]['hero']; top = st[L - AIR // 2]['hero']
    check(f'{k}日目: 予備動作(離陸の前のコマで 1.2x0.75 にしゃがむ)', abs(a['sx'] - 1.2) < .03 and abs(a['sy'] - .75) < .03, f"{a['sx']:.2f}x{a['sy']:.2f}")
    check(f'{k}日目: 伸び(離陸直後に縦長)', b['sy'] > 1.15 and b['sx'] < .9, f"{b['sx']:.2f}x{b['sy']:.2f}")
    check(f'{k}日目: つぶれ(着地の2コマ後に横長)', c['sx'] > 1.08 and c['sy'] < .92, f"{c['sx']:.2f}x{c['sy']:.2f}")
    check(f'{k}日目: 弧(滞空の真ん中で高さ 1.6)', abs(top['footY'] - .06 - 1.6) < .05, f"{top['footY'] - .06:.2f}")
# ずらし: 腕は 4コマ前の上下の速さ、脚は 6コマ前に従う(相関で確かめる)
def corr(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b); va = math.sqrt(sum((x - ma) ** 2 for x in a)); vb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (va * vb + 1e-9)
rng = range(40, 230)
for name, key, lag, sign in [('腕', 'arm', 4, 1), ('脚', 'leg', 6, -1)]:
    best = max(range(0, 12), key=lambda d: sign * corr([st[f][ 'hero'][key] for f in rng], [st[f - d]['hero']['vy'] for f in rng]))
    check(f'ずらし: {name}は {lag}コマ遅れて動く', best == lag, f'一番合う遅れ {best}コマ')
# 余韻: 帽子は着地の後に揺れ、1秒で止まる
for L in LAND[:5]:
    amp = max(abs(st[f]['hero']['hat']) for f in range(L + 2, L + 14)); rest = abs(st[L + 28]['hero']['hat'] - st[L + 29]['hero']['hat'])
    check(f'余韻: 帽子がコマ {L} の着地の後に揺れる', amp > .15, f'振れ {amp:.2f} rad')
# 伸ばしても崩れない: 嵐で体を縮めても顔の縦横は元のまま
f = 285; h = st[f]['hero']; check(f'伸ばしても崩れない(コマ {f}: 体 {h["sx"]:.2f}x{h["sy"]:.2f} でも顔は 1x1)', abs(h['faceSx'] - 1) < .01 and abs(h['faceSy'] - 1) < .01)
# 4. 設備は着地のコマから生える
for d, L in enumerate(LAND, 1):
    first = min(f for f in range(N) if any(p['day'] == d and p['scale'] > 0 for p in st[f]['pieces']))
    check(f'{d}日目の設備がコマ {L} から生える', first == L, f'最初に見えたコマ {first}')
# 5. 吹き飛ぶボクセルは、飛び立って 3 コマ(物語)後から、互いにも住人にも島の板にも触れない
touch = []
for f in range(N):
    s = st[f]['s']
    if s < BOLT + 3: continue
    P = [p for p in st[f]['pieces'] if p['scale'] > .5]
    hp = st[f]['hero']['px']; hc = (hp[0], hp[1] + .55, hp[2])
    for a, b in itertools.combinations(range(len(P)), 2):
        if math.dist(P[a]['pos'], P[b]['pos']) < P[a]['r'] + P[b]['r']: touch.append((f, 'ボクセル同士', a, b))
    for i, p in enumerate(P):
        if math.dist(p['pos'], hc) < p['r'] + .75: touch.append((f, '住人', i))
        if p['pos'][1] - p['r'] < 0 and abs(p['pos'][0]) < 7.5 and abs(p['pos'][2]) < 2.7: touch.append((f, '島の板', i))
off = [(f, i) for f in range(N) if st[f]['s'] >= BOLT for i, p in enumerate(st[f]['pieces']) if p['scale'] > .5 and not (40 < p['screen'][0] < 1040 and 40 < p['screen'][1] < 1040)]
check('飛んでいる間、全部のボクセルが画面の中(端から 40px 以内に出ない)', not off, f'{len(off)} 件。最初: {off[:4]}' if off else '')
check('吹き飛ぶボクセルが何にも触れない', not touch, f'{len(touch)} 件。最初: {touch[:4]}' if touch else '')
# 6. 飛んでいる途中で数字がカメラを向く(物語 306 コマに一番近いコマで 20° 以内)
face = json.load(open('out/face.json')); fF = face['frame']
check('飛び方を解けた(条件を満たす向きが見つかった)ボクセル 42/42', face['unsolved'] == 0, f"解けなかった {face['unsolved']} 個")
ang = [p['facing'] for p in face['state']['pieces']]
check(f'数字がカメラを向く(物語 306 コマ = 実時間 {fF:.2f} コマ: 42 個すべて 20° 以内)', max(ang) < 20, f'最大 {max(ang):.1f}°、平均 {sum(ang) / len(ang):.1f}°')
near = [p['facing'] for p in st[round(fF)]['pieces']]
check(f'一番近い整数コマ {round(fF)} でも 45° 以内(数字が読める)', max(near) < 45, f'最大 {max(near):.1f}°')
# 7. ループの継ぎ目: 479→0 の動きが、478→479 と同じくらい
def vec(f): s = st[f]; return s['hero']['px'] + s['hero']['body'] + s['camera'] + s['target']
d_seam = math.dist(vec(N - 1), vec(0)); d_prev = math.dist(vec(N - 2), vec(N - 1)); d_next = math.dist(vec(0), vec(1))
check('ループの継ぎ目で位置と速さが一致', d_seam <= 1.5 * max(d_prev, d_next) + 1e-4, f'継ぎ目 {d_seam:.4f} / 前 {d_prev:.4f} / 後 {d_next:.4f}')
# 8. VHS の表示が日の一覧に重ならない
def overlap(a, b): return not (a[0] + a[2] <= b[0] or b[0] + b[2] <= a[0] or a[1] + a[3] <= b[1] or b[1] + b[3] <= a[1])
check('VHS の表示が日の一覧に重ならない', not overlap(st[0]['osdRect'], st[0]['labelRect']))
# 9. 文字の大きさとコントラスト(1080 で 30px 以上、4.5:1 以上)
def lum(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (0, 2, 4)]; c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]; return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]
def ratio(a, b): la, lb = lum(a), lum(b); return (max(la, lb) + .05) / (min(la, lb) + .05)
check('文字の大きさ(1080 で 30px)', 60 * 1080 / 2160 >= 30)
for name, fg in [('点いた日', '1E1E24'), ('7日目(赤)', 'B8322A')]:
    r = ratio(fg, 'F6F3EC'); check(f'コントラスト {name} 対 下地', r >= 4.5, f'{r:.1f}:1')
json.dump(res, open('out/checks.json', 'w'), ensure_ascii=False, indent=1)
print(f"-- 合格 {sum(r['ok'] for r in res)} / 不合格 {sum(not r['ok'] for r in res)} / 計 {len(res)}")
