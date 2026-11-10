# REUSE_VS_BUILD — 流用するもの/新規に作る薄い層/作らないもの

根拠は `CURRENT_AUDIT.md`。方針: **既存の仕組みを組み合わせ、足りない所だけを薄く足す**。新しいエンジン・新しいスタイル辞書・新しいシェーダーは作らない。

## 1. 流用する(作り直さない)
| 必要なこと | 流用する物 | どう使ったか |
|---|---|---|
| 見た目を「媒体の規則」で決める | `hyperframes/references/spec.md`「A look built from a medium」、`types/music.md`「物理的な媒体が MV を遠くへ運ぶ」 | 3案それぞれの LOOK を「媒体の部品と、各部品が担う物」で書いた(`BRIEF_ART.md`) |
| 媒体ごとの描き方の規則 | 自分たちのスタイル辞書 `references/styles/lemo/woodcut.md`(案A)、`ink-wash.md`・`urban-sketch.md`・`watercolor.md` の考え方(案B の筆致)、`swiss-motion.md`(案C の大きさの対比) | 刀の種類と幅・「黒は版木、白は彫った所」・色版は1色だけ、などを案A にそのまま使った。規則から外した所は理由を記録 |
| 3案は「別の映画」 | `hyperframes/references/story.md` §2(world / device / form が違う、1つは大胆な案) | 主役・媒体・構図・書体を全部変えた。色違いは出さない |
| 既定の見た目の禁止 | `spec.md`「BANNED by default」(暗い虚空・グロー・ネオン・光の玉・浮遊する粒・全部中央) | 各案の anti_patterns に入れ、審査で照合 |
| 正本の解決順 | `look.md`(`frame.md` → `design.md` → `DESIGN.md`) | 今は正本が無い。選定後に `frame.md` 互換の案を作る(Phase 3。今回は作らない) |
| 文字を輪郭の点列で描く | mv-yoake `src/tools/glyph_lines.py` | 新しい書体(Shippori Mincho B1 800、Dela Gothic One、Zen Kaku Gothic New 500)で点列を作り直した(出力はリポジトリ外) |
| 静止画の書き出し | mv-yoake `src/tools/render_still.mjs`(playwright、`window.__ready` を待つ) | そのまま使用 |
| 乱数・ノイズ | `examples/lumiwake-30s/src/lib/paint.js` の hash / vnoise / fbm と同じ式 | 案ごとの描画で使用(seed 付き。`Math.random`・`Date.now` なし) |
| 審査の書き方 | 資料 `06_REVIEW_SCORECARD.md`(6軸・重大な失敗を先に・判定ラベル)、`hyperframes/references/review.md`(1行の指摘、P0/P1/P2)、`review-gauntlet.md`(V-F) | `ART_REVIEW.md` |
| 候補データの検査 | 資料 `scripts/validate_art_packet.py`(読んで安全を確認) | `CANDIDATES.json` を検査 |
| 権利台帳の書式 | 資料 `templates/asset_ledger.csv` | `asset_ledger.csv` |

## 2. 新規に作った薄い層(今回の成果物の範囲)
| 物 | 大きさ | なぜ必要か |
|---|---|---|
| `src/styleframes.html` + `src/common.js` + `src/cand_a.js`・`cand_b.js`・`cand_c.js` | 案ごとに数百行の Canvas 2D | 3案のスタイルフレーム(clean / look)を同じ条件(1920×1080、同じ歌詞・同じ意味)で描くため。既存の街の生成(`city.js`)は「箱の街」そのものなので流用しない |
| `src/tools/make_sheets.py` | 数十行 | 見出しつきの横並び比較・540px 縮小の一覧(既存の `sheets.py` は4枚固定のため) |
| `src/tools/setup.sh` | 数行 | 書体の取得(npm pack)と字形の点列の作成。フォント・点列はリポジトリに入れない |
| `BRIEF_ART.md`、`CANDIDATES.json`、`ART_REVIEW.md`、`asset_ledger.csv` | 文書 | 美術の判断と審査の記録 |

## 3. 作らない・不要なもの
| 物 | 理由 |
|---|---|
| 新しいスタイル辞書・デザインピッカー | 設置版の `look.md`・`story.md`・`spec.md` と、自前の `references/styles/` で足りる(監査 §2) |
| `hyperframes skills update` での上流スキルの導入・更新 | 環境の変更で、依頼の範囲外。`style-sampling` は有料の説明動画テンプレートで MV の美術には不要 |
| 新しいシェーダー・WebGL の後処理 | 案A の木版の質感(刀の跡・インクのむら・版ずれ)は Canvas 2D の塗りと画素の処理で足りた。three.js は3案のどれにも使っていない(意図が無いため) |
| registry の部品(`texture-mask-text`・`ink-bleed-reveal`・`torn-paper-rip` など) | DOM/CSS の部品で、静止画の段階では不要。Phase 4(動き)の候補として記録 |
| 画像生成・外部の写真やテクスチャ | 3案ともコードだけで描けるかをまず試した。案B で足りない所は「利用者が Codex で作る画像の指示文」を成果物として出す(`ART_REVIEW.md`)。実行はしない |
| 53秒の再レンダリング、6秒の動きの試作 | 利用者の承認(静止画の美術)の後 |
