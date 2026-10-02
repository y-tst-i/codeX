# vendor

- `lottie_canvas.min.js` … lottie-web 5.13.0 の `build/player/lottie_canvas.min.js` をそのまま置いたもの（MIT, `lottie-web.LICENSE.md`）。
  動画HTMLの iframe に「ソースの文字列」として差し込むため、`?raw` で読み込んでいる。
  node_modules のパッケージを `?raw` で直接読むと、開発サーバーを起動したまま `npm install` したときに
  Vite の解決結果が古いまま残って「Failed to resolve import」になるため、ツール内にコピーして持つ。
  更新するときは lottie-web の同名ファイルで上書きする。
