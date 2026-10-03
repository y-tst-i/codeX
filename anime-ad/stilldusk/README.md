# STILLDUSK(架空FPS)プロモ 15秒
新しい制作の流れ(設計→実装(並列)→音(別担当)→結合→検証)で作った。全部 Opus 担当。ゲーム・名前は完全に架空(商標検索はしていない)。
- `stilldusk-promo-15s.mp4`: 完成(450f / 15.000s / 1920x1080 / 30fps / 音つき)
- `docs/`: BIBLE / SCENES(場面カード)/ SOUND_BIBLE / BRIEFS
- `make_audio.py` / `audio_check.md` / `cues.json`: 音の生成と数値検証
- `source/`: 場面ごとの index.html
トークン(担当ごと): 設計11.2万 / s1 8.0万 / s2 7.7万 / s3 11.0万 / s4 13.1万 / s5 8.4万 / 音 14.0万(合計約73万。進行役の会話分は含まない)

## 見せ場 s4 の 3D 版(three.js)比較
`s4_3d/`: 3D版(mp4、index.html)、名前伏せ比較(compare-s4.mp4、A=3D・B=2D)、鍵(S4_BLIND_KEY.json)。利用者は3D版(A)を選んだ。トークン: 3D版 約19.8万 / 2D版 約13.1万。描画: 3D版 4分46秒(約2.0秒/フレーム)。
