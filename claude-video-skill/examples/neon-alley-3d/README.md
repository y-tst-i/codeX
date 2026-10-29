# NEON ALLEY(3D の見本。利用者が「いい感じ」と判定した版)
2026-10-07 の比較試験で、**スキルなしの担当1人が、設計から音・書き出しまで通して作った15秒の3D映像**(1920x1080、30fps、three.js)。利用者が、自作の分業スキルの版より良いと判定した。以後、3D の映像を作る時の見本にする。
- `DESIGN.md`: その担当が書いた設計メモ。`proj/index.html`: three.js のシーン(ロボット、濡れた路地、反射、ボケ、ブルーム、色調整、タイトル)。`make_audio.py`: 音の作り方(MIDI+録音効果音など)。`reference.mp4`: 共有用に小さくした映像(画質は本物より低い)。
- 注意: HyperFrames のプロジェクトの一部(three.js の取得、`assets/gsap.min.js`、`snapshots/` など)は入れていない。`tools/fetch_three.sh` と `tools/assets/gsap.min.js` で補える。第三者の部品のライセンス: `proj/assets/LICENSE-lemo-opuscar.txt`(MIT)。
- 手本として見るもの: 立体(球・箱・回転体の組み合わせ)で形を作り、**光源・反射する床・奥のボケ・ブルーム・色調整**で質感を出している。平面の画像を貼り重ねる作り方ではない。
