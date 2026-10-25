# 指示書(この見本の「最初のプロンプト」。追加指示は FOLLOWUPS.md)

型は `references/prompt-templates.md` の F、数値の出どころは `references/motion-lab.md`。

```
GOAL: ISLAND 7 の遊び方(7日で島を整え、7日目の嵐を越える)が、音なしでも8秒で分かり、もう1回見たくなる。
OUTPUT: one self-contained HTML, three.js 0.181.2 (local, importmap), 1080x1080 final.
TIME: 8 s x 60 fps = 480 frames, seamless loop (frame 479 flows into frame 0), 120 BPM (1 beat = 30 frames).
BRAND: HERO 島の住人(ボクセル: 胴 1.0x0.8x0.7 の砂色 E9D7B0、葉っぱの帽子 2 枚 5E9E5A、腕 2・脚 2、墨色 1E1E24 の目)
       SET 海に浮かぶ島の板 14x5、上に 7 つの日の足場(0〜6、間隔 2)
       ACCENT 橙 F2994A(点いた足場・日のラベル)、嵐 2B3440
       SCREEN TEXT 左上に「1日目〜7日目」の一覧、右上に VHS の「◀◀ REWIND」「PLAY ▶」だけ
MODEL: 設備は 0.4 のボクセル。1日目 壁 10 / 2日目 水路 4 / 3日目 道 6 / 4日目 電柱 5 / 5日目 小屋 10 / 6日目 塔 7(計 42 個)。
       各ボクセルの正面に、建てた日の数字。
LOOK: 昼は高い太陽と柔らかい影、嵐は太陽を消して雷だけ。ブルームなし。VHS は仕上げの1パス(走査線・色ずれ・トラッキングの帯)。
MOTION: しゃがみ 10コマ(1.2x0.75)→ 離陸で 0.85x1.28 → 20コマの放物線 → 着地で 1.25x0.7 → 減衰比 0.55・3Hz で戻る。
        腕は 4コマ、脚は 6コマ遅れる。帽子は 2.2Hz・減衰比 0.22 で揺れて止まる。設備は 1 個 1コマずつ下から、減衰比 0.5・4Hz で生える。
        嵐の間、住人は平たく縮む(1.35x0.62)が、顔は逆に伸ばして元の形を保つ(伸ばしても崩れない)。
BEATS (frame): 0 静かな島。40, 70, …, 190 で離陸、60, 90, 120, 150, 180, 210 で着地し、その日の設備が生え、日のラベルが点く。
       240 7日目(ラベルが赤)。空が暗くなり、雲のボクセルが集まる。300 雷が塔に落ち、42 個のボクセルが吹き飛ぶ(スローになり 333 で止まる)。
       333〜444 VHS の巻き戻し: 物語の時刻を逆に流す(住人・設備・カメラ・ラベルが全部一緒に戻る)。444 PLAY。444〜479 は 0コマ目と同じ静かな島。
CAMERA: 30° の画角、物語の時刻に沿って住人を 25% 追いながら寄る、雷で 4% 寄る。周りを ±6° ゆっくり回る(8秒で 1 周期)。終わりのカメラ=始まりのカメラ。
BANNED: 紫や青のグラデーション背景、光る玉、レンズフレア、飾りの粒、全部が一度にフェードイン、全部がフェード+スライドアップ、会社名・製品名、仕様書にない数字。
CHECKS: renderAt(t) は時刻 t だけで描く、seed 付き乱数だけ。着地のコマで足が足場の上(誤差 0.02 以内)。日のラベルは着地のコマちょうどに点く。
        吹き飛ぶボクセルは、互いにも住人にも島の板にも触れない。各ボクセルは飛んでいる途中で数字がカメラを向く。
        ループの継ぎ目で位置も速さも一致。VHS の表示は日の一覧に重ならない。文字はスマホ幅でも読める(1080 で 30px 以上)、コントラスト 4.5:1 以上。明滅は1秒に3回まで。

Render contract:
Output one self-contained HTML file. Only the libraries the prompt names, pinned to a version.
No network requests except fonts and those pinned libraries.
Every frame must be a pure function of time t, in seconds.
If JavaScript drives any motion, expose window.renderAt(t) that draws exactly that frame.
No Date.now, no setTimeout or setInterval starts, no unseeded Math.random.
Loops: render frames 0 to N-1 only, and frame N-1 must flow into frame 0.
With ?t= in the URL, never start requestAnimationFrame; set window.__ready after fonts and bakes.
Expose window.__state(t) with every position the CHECKS need.
```

## 音の指示書(映像ができた後に1回)
```
Score this seamless 8 s loop (480 frames, 60 fps). Synthesize everything in code (numpy), no samples. Each hit lands 1 frame after its visual event.
Bed: 120 BPM, light marimba and pizzicato on the hop grid, slightly off the landings; out during the storm; a pad under the storm.
Events: crouch creaks, landing thocks pitched by day (60…210), build pops (one per voxel, quiet), label pings, storm rumble from 240,
thunder at 300, a dense cartoon boom (not a transient), slow-mo tail, tape stop at 333, rewind: the whole mix backwards and fast as a squeal
with tape wow and motor whirr (333–444), PLAY clunk at 444.
48 kHz stereo WAV, about -14 LUFS, true peak under -2 dBTP, hits 3–6 dB over the bed, phone band checked, no clicks, never fully silent.
Render two passes so the tail flows into the head. Keep the seamless WAV as master; for the single-loop MP4, 2 ms raised-cosine fades on the first and last 96 samples.
```
