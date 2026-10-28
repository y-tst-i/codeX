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
| PyTorch 2.14.1(CPU 版)・transformers ほか earshot の依存 | venv のみ | 各 OSS ライセンス(BSD / Apache-2.0 ほか) | |
| FluidSynth 2.3.4 | apt で導入(同梱しない) | LGPL-2.1 | 既存の手順どおり |
| MuseScore General 0.2.1(`musescore-general-soundfont-lossless`) | apt で導入(同梱しない) | MIT・一部 CC0 | 既存の表にもあり。今回の BGM の音源 |
| FluidR3 GM(`fluid-soundfont-gm`) | apt で導入(同梱しない)、予備 | MIT | 今回の音には使っていない |
| Kenney 効果音 | 既存の `sound-kit/tools/assets/sfx-cc0/` | CC0 | 新しい素材は足していない |
