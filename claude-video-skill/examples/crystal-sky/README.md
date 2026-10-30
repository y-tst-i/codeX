# 水晶の空(Crystal Sky)— 20秒の3D音楽PV風映像

three.js の本物の3D(浮遊島・巨大な水晶・雲海・魔法陣・光の柱・紋章)。Bloom / DoF / GTAO、全コマが時刻 t の純関数(seek 安全)。人物なし。既存作品の名前・ロゴ・曲は使っていない。

- `DESIGN.md`: 先に作った cue 表(2.5秒の区切りと 10.000秒のヒット)と共通ルール。
- `proj/index.html`: シーン本体(HyperFrames)。`proj/assets/post.js` はスキル同梱版に `aoFar`(遠く・霧の中の AO を弱める)と NaN/Inf の除去を足したもの。
- `make_audio.py`: 曲に効果音2つ(風・ガラスの響き)を重ね、-14 LUFS にして映像に載せる。
- `crystal-sky_W.mp4`(M1 荘厳)/ `crystal-sky_R.mp4`(M2 冒険的): 同じ映像で音だけ違う2本。
- `cues.json`: 同期の測定用の合図(秒)。

## 作り直す手順
```bash
bash ../../tools/fetch_three.sh proj/assets      # three 0.181.2(リポジトリには入れていない)
cp ../../tools/assets/gsap.min.js proj/assets/
cd proj && npx hyperframes render --workers 1 --output ../out/video_raw.mp4   # ソフトウェアGLで約 1 時間
cd .. && ffmpeg -i out/video_raw.mp4 -vf "noise=c0s=2:allf=t" -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -an out/video.mp4
python3 make_audio.py <M1.mp3> out/video.mp4 crystal-sky_W.mp4
python3 make_audio.py <M2.mp3> out/video.mp4 crystal-sky_R.mp4
```

## 素材とライセンス
| 素材 | 出典 | ライセンス |
|---|---|---|
| フォント Shippori Mincho ExtraBold(使う文字だけに縮小) | github.com/google/fonts `ofl/shipporimincho` | SIL OFL 1.1(`proj/assets/fonts/OFL-ShipporiMincho.txt`) |
| `post.js` | lemo-opuscar(スキル同梱) | MIT(`proj/assets/LICENSE-lemo-opuscar.txt`) |
| ガラスの音 `impactGlass_light_002` | Kenney Impact Sounds(スキル同梱) | CC0 |
| 風の音 | ピンクノイズから合成 | — |
| 曲 M1 / M2 | 利用者から渡された音源 | 利用者の確認による |

## 測定結果(2026-10-30。音は聴いていない。数値だけ)
| 項目 | W版 | R版 |
|---|---|---|
| 長さ・解像度 | 20.000s / 600コマ / 1920x1080 / 30fps | 同じ |
| ラウドネス・真のピーク | -14.0 LUFS / -2.8 dBTP | -14.0 LUFS / -2.1 dBTP |
| 無音区間(-50dB 未満が0.3秒以上) | なし | なし |
| 10.000s の同期 | 映像の輝度の急上昇 f300(10.00s、+99)。音の立ち上がり +16.7 dB、頂点 +0.03s | 同じ映像。+16.3 dB、+0.03s |
| 効果音の大きさ | 風: 曲より -12 dB、ガラス: 曲より -6 dB(頂点 17.533s) | 同じ |
`review_checks.py`: 不合格 0。注意 2(冒頭の黒3コマ=フェードイン、10.00s の白い閃光=山場の演出。どちらも意図)。

## 作る途中で踏んだこと
- t=10.8s(f324)だけ画面全体が真っ黒になった(どこかの画素の NaN/Inf が Bloom で全体に広がった)。`post.js` の最初のパスで NaN/Inf を 0 にして解消。書き出し済みの映像は、そのコマだけ直した版で差し替えた(全体は書き直していない)。
- GTAO は不透明な物の深度で計算され、半透明の雲を描いた後の色に掛かるので、霧や雲の奥の木が灰色の影として透けた → 距離で AO を弱める `aoFar` を足した。
- 書き出し: ソフトウェアGL・GTAO 入りで 600 コマ約 46 分(約 4.6 秒/コマ)。
