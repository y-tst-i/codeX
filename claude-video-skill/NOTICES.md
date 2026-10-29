# 第三者の素材・コードの表示
このスキルに含まれる(または手順で取得する)第三者の物と、そのライセンス。
| 物 | 場所 | ライセンス | 備考 |
|---|---|---|---|
| lemo-opuscar `core/three/post.js`(改変あり) | `tools/assets/three/post.js` | MIT(Copyright (c) 2026 LemoLab) | `tools/assets/three/LICENSE-lemo-opuscar.txt`。署名・商標は入れていない |
| lemo-opuscar `styles/*/STYLE.md`(43件、原文のまま) | `references/styles/lemo/` | MIT(Copyright (c) 2026 LemoLab) | `references/styles/lemo/LICENSE-lemo-opuscar.txt`。LemoLab の署名・商標は作品に入れない |
| motion-video-kit(審査手順 gauntlet.md・critic-prompts.md・quality-bar.md・scripts 3本、原文のまま) | `references/review/motion-video-kit/` | MIT | `references/review/motion-video-kit/LICENSE` |
| Kenney 効果音(Impact / RPG / Interface) | `tools/assets/sfx-cc0/` | CC0 | 帰属表示は不要。各 `License.txt` |
| GSAP(gsap.min.js) | `tools/assets/gsap.min.js` | GreenSock 標準ライセンス | npm の gsap@3.14.2 |
| MuseScore General(音源) | 同梱しない(apt で導入) | MIT・一部CC0 | |
| Salamander Grand Piano / MuldjordKit | 同梱しない | CC BY | 使った動画には帰属表示が必要 |
| ArtCraft Crafting Apps (storytold/*) | 同梱しない・取り込んでいない(archive/handbook.md §23に試験結果のみ記録) | MIT OR Apache-2.0(名前とロゴは商標) | |
| Quaternius | 同梱しない | 独自ライセンス(2026-08-28〜)・再配布禁止 | 公開リポジトリに入れない |
参考にした考え方(コードは写していない): video-shotcraft(Apache-2.0。審査役・間の予算・揺れの回数制限の考え方を自分の言葉で書き直した)、 ClaudeAnimationBase(MIT)、lemo-opuscar DIRECTOR.md(MIT)、「コード映像見本帳」(しゅん氏、2026-09-28、ライセンス記載なし → 考え方と数値のみ、自分で実装)。

| business-motion-film(echris6/motion-video-kit)・motion-prompt(showheyohtaki/motion-prompt の CLI) | `.claude/skills/business-motion-film/`・`.claude/skills/motion-prompt/`(各 `UPSTREAM_LICENSE`) | MIT | Codex 側で作った持ち込み一式。2026-10-28 に取り込み。`direct-cinematic-video` は Codex 側の自作 |

## 2026-10-28 音の改善(枝 claude/sound-upgrade)で新しく使った物
| 物 | 場所 | ライセンス | 備考 |
|---|---|---|---|
| earshot v0.4.0(Leonxlnx/earshot、commit 591fa3e) | 同梱しない。リポジトリの外の venv(`$HOME/earshot_env`)に導入。`sound-kit/earshot_cache.py`・`sound_index.py`・`projects/hitotsuzutsu/` が import して使う | MIT(LICENSE の記載: "Copyright (c) 2026 Leon Lin") | コードは写していない。効果音バンクの音はコードで描画した物(録音は同梱されていない)。`kit_B.json` は earshot の `launch` プリセットの形式で、値はこの映像向けに変えた |
| earshot の fit 音(`fit/*`、15 音) | 描画したテイクのみキャッシュ(git に入れない) | 元の録音は CC0 1.0(Freesound。earshot `docs/CREDITS_FIT.md`)。今回使ったのは `fit/click/floss_lid`(qubodup)・`fit/land.light/fingertip_book`(IENBA)・`fit/tick/domino`(Macif)・`fit/pop/mouth_plop`(CapsLok) | 帰属表示は不要(任意で記載) |
| CLAP `laion/larger_clap_general`@16c8cc3 | 同梱しない(earshot が初回に Hugging Face から取得、`$HOME/earshot_env/home/hf`) | Apache-2.0 | 分析(rank・describe・match・timeline 等)だけに使用 |
| AST `MIT/ast-finetuned-audioset-10-10-0.4593`@f826b80 | 同上 | BSD-3-Clause | 同上 |

モデルの学習データについて: 上のライセンスはモデルの重み・コードの条件。学習に使われたデータ(CLAP は LAION-Audio-630K ほか、AST は AudioSet = YouTube の動画の音)は、それぞれ元のデータの条件がある。今回はモデルを**分析(測定・候補の並べ替え)にだけ**使い、モデルが作った音や学習データの音は作品に入れていない・再配布していない。商用の作品で分析結果を使う時も、学習データの条件は各モデルのカードで確認すること。
| PyTorch 2.14.1(CPU 版)・transformers ほか earshot の依存 | venv のみ | 各 OSS ライセンス(BSD / Apache-2.0 ほか) | |
| FluidSynth 2.3.4 | apt で導入(同梱しない) | LGPL-2.1-or-later(LGPL-2.1+) | 既存の手順どおり。リンクも改変もしていない(外部コマンドとして呼ぶだけ) |
| MuseScore General 0.2.1(`musescore-general-soundfont-lossless`) | apt で導入(同梱しない) | MIT, parts PD or CC0(一部の標本はパブリックドメインまたは CC0) | 既存の表にもあり。今回の BGM の音源 |
| FluidR3 GM(`fluid-soundfont-gm`) | apt で導入(同梱しない)、予備 | MIT | 今回の音には使っていない |
| Kenney 効果音 | 既存の `sound-kit/tools/assets/sfx-cc0/` | CC0 | 新しい素材は足していない |

## 2026-10-29 第3ラウンド(条件 D)で新しく使った物
| 物 | 場所 | ライセンス | 備考 |
|---|---|---|---|
| Stable Audio 3 small music(`sm-music + same-s`、`sa3-torch`、CPU)で PC が生成した BGM 4 本 | `docs/sound-upgrade/audio_studio_pc/D1.wav`〜`D4.wav`、それを使った `docs/sound-upgrade/compare_round3/` の 4 本 | モデルの重みは Stability AI Community License(非商用は上限・登録なし。商用の目的は登録が要り、関連会社を含む年間売上が 100 万米ドルを超えると終了。下の追記の行)。生成物の権利は法律の範囲で利用者(同ライセンス 4(c)(iii)、`docs/sound-upgrade/AUDIO_STUDIO_PLAN.md` §3) | **生成物は社内の比較試聴用。商用に使う前に条件を確認**。モデルと版は `audio_studio_pc/generation_log.json` の記録(steps 8、cfg 1.0、シード 9601 / 9711 / 9722 / 9732)。重みの版のハッシュは記録に無い。Audio Studio MCP 本体・実行プログラムは MIT(同 §3)。詳しくは `AUDIO_STUDIO_PLAN.md` §8 |
| (同上の追記 2026-10-29)公開の状態 | このリポジトリ `y-tst-i/codeX` | — | **このリポジトリは公開(visibility: public、2026-10-29 確認)。生成物(D1〜D4.wav、比較パック `docs/sound-upgrade/compare_round3/`)も公開の場所に置かれている**。移す・消すかは利用者の判断 |
| (同上)ライセンスの範囲 | — | Stability AI Community License Agreement(「Last Updated: July 5, 2024」、https://stability.ai/community-license-agreement 、2026-10-29 確認) | 非商用(評価・試験を含む)は売上の上限も登録も無い。商用の目的(会社の内部業務を含む)は登録が要り、関連会社を含む年間売上が 100 万米ドルを超えるとライセンスが終わる。今回の比較が会社の業務(CM 制作)のための物なら商用の目的に当たり得る。判断は利用者に任せる |
| (同上)ほかの条件 | — | T5Gemma: Gemma Terms of Use。Stability AI の利用規約(AUP、https://stability.ai/use-policy ) | `docs/sound-upgrade/AUDIO_STUDIO_PLAN.md` §3。`generation_log.json` の `same-s` の中身は未確認 |
