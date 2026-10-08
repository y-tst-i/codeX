# 30秒アニメCM v2「レベル1なのに世界最強」(架空・オリジナル)

- `level1-world-strongest-30s-v2.mp4` : 完成動画(1920x1080 / 30fps / 音声付き、30.000秒=900フレーム)
- `docs/BIBLE.md` `docs/SCENES.md` : 設計書(共通ルールと、場面ごとの世界・技法・合図)
- `source/<場面>/` : 場面別の HyperFrames プロジェクト(各 `index.html`)。`shared` 素材は `source/hero.svg` `demon.svg` `gsap.min.js`
- `make_audio.py` : 全場面のBGM・効果音を合成(numpy必須)→ `soundtrack.wav`(-14 LUFS に正規化済み)
- `assemble.sh` : 場面mp4をハードカットで連結し音を載せる(場面mp4は各 `source/<場面>` を `npx hyperframes render` して `out/` に置く)

場面: s1 百万の赤 / s2 対峙 / s3 一撃 / s5a〜e 一撃カタログ(ピクセル・漫画・水墨・空気・金の目)/ s6 タイトル / s7 え？ / s8 告知
作品名・キャラ・コピーはすべてオリジナルの架空のもの。
