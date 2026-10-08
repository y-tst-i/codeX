# 30秒アニメ広告「レベル1なのに世界最強」（架空作品）

- `level1-world-strongest-30s.mp4` : 完成動画（1920x1080 / 30fps / 音声付き）
- `source/` : HyperFrames のプロジェクト一式（`index.html` が映像、`tools/make_audio.py` がBGM・効果音の合成）

作り直し・編集:

    cd source && npx hyperframes preview     # ブラウザで確認
    npx hyperframes render -o out.mp4        # 書き出し（Node 22+ / FFmpeg 必要）
    python3 tools/make_audio.py assets/raw.wav   # 音を作り直す（numpy 必要）

作品名・キャラ・キャッチコピーはすべてオリジナルの架空のもの。画像・動画素材は不使用（全てコードで描画）。
