# CURRENT_AUDIT — 現行環境と既存機能の監査(Phase 0)

監査日 2026-11-10。作業ブランチ `claude/mv-art-direction-first`(`git fetch` 済み、最新 `f15300d` から開始)。
表記: **【確認】** = この回に実物(ファイル・コマンドの出力)を見た / **【未確認】** = 見ていない・確かめられなかった / **【推測】** = 見た物からの推測。

## 1. 作業環境
| 項目 | 結果 | 証拠 |
|---|---|---|
| 作業場所 | `/home/user/codeX`(git、ブランチ `claude/mv-art-direction-first`) | 【確認】`pwd`、`git branch --show-current` |
| 未コミットの変更 | 開始時 0 件(作業で増えたのは `art-direction/` の新規ファイルだけ)。stash なし | 【確認】`git status --short`、`git stash list` |
| CLAUDE.md / AGENTS.md | リポジトリ直下・`claude-video-skill/` には無い。`claude-video-skill/sound-kit/AGENTS.md` だけ(音の道具用) | 【確認】`find -maxdepth 4 -iname CLAUDE.md -o -iname AGENTS.md` |
| frame.md / design.md / DESIGN.md | リポジトリ・作品フォルダのどちらにも**無い**(上書きの心配なし)。HyperFrames 設置版のプリセット 13 個に `FRAME.md` がある(スライド用の見た目) | 【確認】`find`、`/root/.claude/skills/hyperframes/assets/frame-presets/*/FRAME.md` |
| Node / Python / FFmpeg | Node v22.23.4、Python 3.11.18、FFmpeg 6.1.1 | 【確認】`--version` |
| HyperFrames CLI | `npx hyperframes --version` → **0.9.28**(npx の cache に 0.9.13 も2つある) | 【確認】`/root/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes/package.json` |
| HyperFrames のスキル | `/root/.claude/skills/` に hyperframes / hyperframes-cli / hyperframes-registry / media-use。`npx hyperframes skills check` は「4 つが古い、core の reverse-any-video と style-sampling が未導入」 | 【確認】`skills check` の出力。**更新はしていない**(環境の変更は依頼の範囲外) |
| GSAP | 現行 MV は `gsap@3.14.2` を `npm pack` して HyperFrames のプロジェクトに入れる(標準の無料ライセンス。MIT ではない) | 【確認】`src/film/tools/build_hf.sh` 10行目 |
| レンダラ | Chromium(playwright 1.63.0、`/opt/pw-browsers/chromium-1243`)。静止画は `src/tools/render_still.mjs`、動画は HyperFrames の render | 【確認】`npm ls -g`、`ls /opt/pw-browsers` |
| 書体 | @fontsource(OFL-1.1)を `npm pack` で取得できた: Shippori Mincho B1 5.3.0、Kaisei Tokumin 5.3.1、Zen Kaku Gothic New 5.3.1、Dela Gothic One 5.3.0(scratchpad の `ad/fs/`。リポジトリには入れない) | 【確認】各 `package.json` の `"license": "OFL-1.1"` |
| 初稿の動画 | scratchpad の `mv2d/yoake_v1.mp4`: 1920×1080、30fps、**1590 コマ**(数え上げ) | 【確認】`ffprobe -count_frames` |

## 2. 資料が名指しした「公式 HyperFrames の美術機能」は、この環境にあるか
資料(01_RESEARCH.md A2、05 §最初に)は `hyperframes-creative/references/*.md` と `general-video/SKILL.md` を名指ししている。**資料の記述をそのまま信じず**、ディスク全体と上流の現在の main を調べた。

| 資料が名指しした物 | この環境 | 上流 main(raw.githubusercontent.com、2026-11-10) | 実際に使える近い物(別名)と証拠のパス |
|---|---|---|---|
| `hyperframes-creative/references/visual-styles.md`(名前つきの見た目の辞書) | **無い** | **404**(無い) | ①HyperFrames: `look.md` の Presets 表(13 個。ただし「スライド用。ブランドの無い映画の代用にしない」と明記)②**自分たちのスタイル辞書 `claude-video-skill/references/styles/`(43 個、MIT の lemo-opuscar 由来。`tools/style.py <slug>`)**。woodcut・risograph・ink-wash・ukiyoe・engraving・paper-lantern などの「素材と描き方の規則」がある。スキル本体では「未検証」の道具 |
| `design-picker.md`(ムードボードと候補の提示) | **無い** | **404** | `hyperframes/references/story.md` §2「3つのストーリーラインは3本の別の映画(world / device / form が違う)。1つは自分なら選ばない大胆な案。言葉だけで出して人が選ぶ」 |
| `design-spec.md`(frame.md の frontmatter) | **無い**(ファイル名として) | 未確認 | `hyperframes/references/look.md`「The project's design spec」: **`frame.md` → `design.md` → `DESIGN.md` の最初に存在する1つだけを読む。frontmatter(colors・typography・spacing・components)は規範、本文は意図**。プリセットの `FRAME.md` が実例 |
| `video-composition.md`(映像の構図・文字サイズ) | **無い** | 未確認 | `hyperframes/references/spec.md`「Composition numbers」(主役は画面の高さか幅の 40% 以上、1ショット1つの主な動き、読む文字は 1080 で 28px 以上・0.5秒+0.3秒/語)と「BANNED by default」(暗い虚空に小物が浮く、グロー・ブルーム・ネオン・光の玉、浮遊する粒、全部中央…) |
| `typography.md`(書体と埋め込み) | **無い** | 未確認 | `hyperframes/references/format.md`「Fonts」(同梱は Noto Sans JP ほか 18 書体。それ以外は `@font-face` で `assets/fonts/`)。現行 MV は glyph の点列で描く方式(`src/tools/glyph_lines.py`) |
| `general-video/SKILL.md`(HTML 前にデザインソースを解決) | **無い** | **404** | `hyperframes/SKILL.md`「Work loop」(15秒超の物語の映画は type ファイル → story.md → SPEC.md)、`hyperframes/references/look.md`(外部の入力の優先順: 設計の正本 → 実在のブランド → 参照画像 → 題材の世界) |
| `hyperframes-animation/adapters/gsap.md` | 無い | 未確認 | `hyperframes/SKILL.md`「Contract」3(`window.__timelines[id] = tl`)、`references/runtimes.md` |
| (資料に無いが関係する)`style-sampling` | 未導入 | 有る(200) | 中身を読んだ: **有料(Pro)の説明動画テンプレート5種**(Collage Explainer 等)。MV の美術方向の選択には使えない。導入しない |
| (資料に無いが関係する)`types/music.md` | 有る | — | 「**物理的な媒体(墨線の水彩・切り紙・リソ印刷・フィルムの粒)は、効果より遠くまで MV を運ぶ**」「同じ処理を約6秒以上続けない」「波形・スペクトルを主役にしない」 |
| (資料に無いが関係する)`spec.md`「A look built from a medium」 | 有る | — | 見た目は「パレット」ではなく「1つの媒体の規則」(リソなら 紙・版A・版B・重ね刷り・網点 の5部品だけ)。動きも媒体から来る(紙は切られ持ち上がる、インクは刷られる) |

**結論**: 名指しの6ファイルは、この環境にも上流の現在の main にも無い(資料が古い版か、改名後の名前を見ていた可能性。【推測】)。ただし**同じ役割の仕組みは、名前を変えて設置版に入っている**(look.md の正本の解決順、story.md の3案、spec.md の LOOK 行・構図の数値・既定の禁止リスト・媒体の規則、music.md の媒体の推奨)。加えて**自分たちのスキルにスタイル辞書 43 個がすでにある**。→ 新しいスタイル辞書・ピッカーは作らない。

## 3. HyperFrames CLI で、今回の比較に使える既存コマンド(実在を `--help` で確認)
| コマンド | 用途 | 今回 |
|---|---|---|
| `compare <path...> --at --labels --out` | 複数のコンポジションを同じ時刻で撮って1枚の比較シートにする | 静止画は Canvas の1ページで描くので使わなかった(同じ役割の `make_sheets.py` は自前の数十行)。Phase 4 の動きの比較で使う候補 |
| `snapshot --at / --range / --review` | 指定時刻の PNG、レビュー用のシート3種 | Phase 4 |
| `grade-compare` | 1枚の参照フレームに色の候補を並べる | 使わず(案の違いは色ではないため) |
| `catalog --query`(registry) | 部品検索。**`hyperframes registry` というコマンドは無い**(registry スキルに明記) | 検索した: `texture-mask-text`、`ink-bleed-reveal`、`torn-paper-rip`、`halftone-dissolve`、`paper-collage-reveal` など紙・インクの部品がある(DOM/CSS の部品。静止画には使わず、Phase 4 の候補として記録) |
| `docs` | data-attributes / gsap / rendering など 9 項目 | 確認のみ |

## 4. スキル(Skill ツールで実際に呼んだ)
| スキル | 呼んだ | 今回わかったこと |
|---|---|---|
| video-with-claude-code | 呼べた | 設置版(`/root/.claude/skills/video-with-claude-code/`)は**リポジトリの `SKILL.md` より新しい**(`lessons-2026-11.md`・`3d-quality/` を含む。ブランチ `claude/skill-lessons-2026-11` の内容)。§0「静止画(スタイルフレーム)を先に承認してからアニメーション」、§7「絵の『ポリゴンくささ』は未解決(lessons §4b)」 |
| hyperframes | 呼べた | 上の §2 の表 |
| hyperframes-cli | 呼べた | 上の §3 の表 |
| hyperframes-registry | 呼べた | `catalog` の検索(上) |
| media-use | 呼べた | 画像・素材は HeyGen の検索・生成(サインインとクレジット)。**今回はコードで描き、外部素材は使わない**ので呼んだだけ |
| motion-prompt | 呼べた | `info`(192 要素、取得できる)、`search`(#131 テキストオンパス、#008 キネティックタイポ など)。動きは Phase 4 なので `get` していない |
| business-motion-film | 呼べた | 一つの主役を通す・独立レビューの考え方(Phase 4 以降) |
| codex-images / direct-cinematic-video | 呼んでいない | 今回の範囲(静止画・コード描画)で不要 |

## 5. 現行 MV『夜明けの回路』の実装(ソースを読んで確認した事実)
| 項目 | 事実 | 証拠 |
|---|---|---|
| 描画の方式 | **three.js ではない**。Canvas 2D で、自前の透視投影(`Y.pj`)で地面・箱を描く疑似3D。HyperFrames の canvas 1 枚に、止めたタイムラインの時刻 → コマ番号 → `FILM.renderAt(ctx, f)` | `src/film/film.js` 冒頭、`src/film/core.js`、`README.md` |
| 街の生成 | 道の格子(5.6〜8.8m 間隔の X、5.4〜8.8m の Z)の区画に、**直方体のチップ**を置く(`tower` か `cap`/`ic`)。高さは中心ほど高い分布。形は全部4面の箱(段の `tier` だけ) | `src/film/city.js` 9〜90行 `gen()` |
| 窓 | 箱の各面に**同じ間隔の格子**(横 0.17m・縦 0.15m ごと、窓は区画の 22〜78%・55% の大きさ)。灯りの有無だけを乱数で変える | `src/film/city.js` 238〜255行 |
| 回路の線 | 道=配線の束(2〜9本の平行線)、区画の中に 0/45/90 度で折れる短い線を面積×0.55 本。大通りは 12 本の束が奥へまっすぐ | `src/film/city.js` 14〜87行 |
| 8秒(240コマ)の絵 | S2「暗闇の数だけ」: 低い視点の地面+縦書き2列(Zen Old Mincho 900、150px)、列の左の光の柱、字の後ろの暗い下地 | `src/film/shots_night.js` 60行〜、`frames/baseline/yoake_f0240.jpg` |
| 仕上げ | ブルーム(閾値つき)、露出の閃光、色収差、周辺減光、粒、黒帯 2.0:1 | `src/film/film.js` 冒頭の説明 |
| 決定性 | 17 コマを順・逆・飛ばしで描いて hash 一致 | `frames/v1/determinism_hash.txt` |

→ 資料 02 の観察「直方体の街並み、同形の発光窓、長い収束線」は**コードで裏が取れた**(資料は内部を見ていないと書いている。今回、生成規則として確認した)。「ポリゴン臭」は WebGL の BoxGeometry ではなく、**Canvas 2D の透視の箱+等間隔の窓の格子+光の線の総量で絵を支える作り**から来ている。

## 6. 過去の資料にある実装済みの機能(重複して作らない)
| 機能 | 場所 | 状態 |
|---|---|---|
| スタイルフレームを先に作り承認を取る手順 | 設置版 `video-with-claude-code/SKILL.md` §0、`lessons-2026-11.md` §2、mv-yoake `REVIEW_STAGE1.md` | 運用済み(第1段階で SF1〜SF4 を承認) |
| 美術方向の3案の比較 | mv-yoake `BRIEF.md` §4(A 蛍光版画 / B 光跡と黎明 / C 余白の墨)、`hyperframes/references/story.md` §2 | **前回は B しか描かず、A・C は文章だけ**だった(`frames/` に A・C の画像は無い) |
| スタイル辞書(媒体の規則) | `claude-video-skill/references/styles/`(43 個)、`tools/style.py` | 有る。未検証 |
| のっぺり対策・質感部品 | `references/depth-and-texture.md`、`examples/lumiwake-30s/src/lib/paint.js`(3トーン+リム、glow、bloom、ノイズ fbm、作業 canvas の reset) | 有る |
| 3D の品質基準(効果を切った比較・2倍拡大・seek 一致) | 設置版 `references/3d-quality/README.md` | 有る(3D 用。「効果を切った比較」は今回の clean/look と同じ考え) |
| 審査の型 | `references/review-gauntlet.md`(V-F1〜F7 のっぺり)、`hyperframes/references/review.md`(P0/P1/P2) | 有る |
| 字形の点列(字を輪郭で描く) | mv-yoake `src/tools/glyph_lines.py` | 有る。今回も使う |
| 静止画の書き出し | mv-yoake `src/tools/render_still.mjs` | 有る。今回も使う |
| 比較シート | mv-yoake `src/tools/sheets.py`、`src/film/tools/sheets.sh` | 有る(4枚固定の作り。今回は見出しつきの比較が要るので短い専用版を書いた) |
| 第三者の検証スクリプト | `art-direction/handoff/scripts/validate_art_packet.py`、`probe_video.py` | 読んで安全を確認(標準ライブラリと ffmpeg だけ、ネット・書き込みは出力先のみ)。テスト 4 件 OK(`python3 -I tests/test_validate_art_packet.py`) |

## 7. 回帰テスト・ベースラインの固定
- 現行 MV のソース・道具・`frames/` には手を入れていない(新規ファイルは `art-direction/` の下だけ)。
- ベースライン: `yoake_v1.mp4` から**コマ番号で**抜いた `frames/baseline/yoake_f0240.jpg`(8秒)・`f0480`(16秒)・`f0840`(28秒)・`f1200`(40秒)・`f1470`(49秒)。`ffmpeg -vf select=eq(n\,N)`。md5 は `frames/baseline/MD5.txt`。
- 資料の `baseline/*.jpg`(共有用の再圧縮版 `yoake_v1_share.mp4` から秒で抜いた物)と比べると、同じ絵(±1 コマの差は確かめていない)。
- 既存の回帰検査(`review_checks.py`、`frames.mjs --hash` など)は動画を作り直していないので、今回は走らせていない(【未実施】。対象の変更が無いため)。

## 8. 修正対象リスト(Phase 5 で使う。今回は直さない)
| 時刻 | 物 | 理由 |
|---|---|---|
| 0〜13.6秒(S1〜S3) | 箱の街・窓の格子・収束する光の線 | 8秒の主役が無い/「汎用的な CG の試験」に見える(02 と §5) |
| 13.6〜25.6秒(S4〜S5) | 真上の盤の配線の網 | 線の総量で画面を埋め、焦点が弱い |
| 39.1〜44.6秒(S9) | 両側の箱のビル+収束する路面 | 8秒と同じ構図の語彙 |
| 44.7秒〜(S10) | 黒い箱のシルエットの朝の街 | 結びの画として平板(REVIEW_STAGE2 の「まだ弱い点 1」) |
| 守る | 26〜28秒の巨大な文字の構図、49秒以降の暖かい色、歌詞の時刻・音ハメの台帳 | 02 の「維持すべき点」 |
