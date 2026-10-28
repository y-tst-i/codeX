# 変更履歴(枝 claude/sound-upgrade)

## 2026-10-28 音の改善(earshot の検証、横断の索引、「ひとつずつ」の B / C、比較パック)

### 既存ファイルの変更
| ファイル | 変更 | 元に戻す |
|---|---|---|
| `claude-video-skill/NOTICES.md` | 末尾に「2026-10-28 音の改善で新しく使った物」の表を**追記**(既存の行は変更なし) | 追記した節を消す |

それ以外の既存ファイル(sound-kit の README・BRIEF・AGENTS・tools・素材・manifest、SKILL.md、references、ルートの `.gitignore`)は**変更していない**。設定ファイルの変更も無い。

### 追加したファイル
| 場所 | 中身 |
|---|---|
| `claude-video-skill/sound-kit/sound_index.py` | Kenney と earshot の横断索引(build / find / like / show / realness)。`sfx_lib.py` を import |
| `claude-video-skill/sound-kit/index/sound_index.json` | 索引のデータ(533 件、約 300 KB)。`sound_index.py build` で作り直せる |
| `claude-video-skill/sound-kit/earshot_cache.py` | earshot のバンクを必要な時だけ描画してキャッシュ |
| `claude-video-skill/sound-kit/.gitignore` | `.cache/`(earshot のテイク)と `__pycache__/` を git に入れない |
| `claude-video-skill/sound-kit/projects/hitotsuzutsu/` | B / C の音を作るスクリプト一式(README・common・score・mixer・kit_B.json・make_B・make_C・finish・qa・listen_earshot・cue_sheet・build_all.sh)と `cues.json`(枝 `claude/motion2d-hitotsuzutsu` の写し) |
| `docs/sound-upgrade/` | AUDIT・EARSHOT_EVAL・CUE_SHEET・MIX_NOTES・QA・HOWTO・この CHANGELOG |
| `docs/sound-upgrade/scripts/` | `earshot_probe.py`(バンクと knob の検証)、`rank_candidates.py`(C の素材選びの下調べ) |
| `docs/sound-upgrade/compare/` | 比較用の mp4 3 本(記号の名前、合計 16 MB)、`LISTENING_SHEET.md`(評価用紙) |
| `docs/sound-upgrade/answer_key/` | `ANSWER_KEY.md`(正解表、評価の後に開く)と `key.json`(記号の固定の対応) |
| `docs/sound-upgrade/.gitignore` | `work/`(WAV・ステム・測定の生データ・earshot の出力)を git に入れない |

`docs/sound-upgrade/AUDIO_STUDIO_PLAN.md` は別担当のファイルなので触っていない。

### リポジトリの外に入れた物(この環境)
| 物 | 場所 | 消し方 |
|---|---|---|
| apt: `fluidsynth` `musescore-general-soundfont-lossless` `fluid-soundfont-gm` `time`(+依存) | システム | `sudo apt-get remove fluidsynth musescore-general-soundfont-lossless fluid-soundfont-gm time && sudo apt-get autoremove` |
| earshot のソース(v0.4.0) | `/home/user/leonxlnx/earshot` | `rm -rf /home/user/leonxlnx/earshot` |
| venv(torch CPU 版・earshot・pretty_midi ほか、1.7 GB) | `$HOME/earshot_env` | `rm -rf $HOME/earshot_env` |
| earshot のモデル(1.1 GB)・埋め込み・復号のキャッシュ | `$HOME/earshot_env/home/` | 上と一緒に消える |
| pip のキャッシュ(387 MB) | `~/.cache/pip` | `rm -rf ~/.cache/pip` |
| 作業ファイル(WAV・ステム・測定) | `docs/sound-upgrade/work/`(git の外) | `rm -rf docs/sound-upgrade/work` |
| earshot のテイクのキャッシュ | `claude-video-skill/sound-kit/.cache/`(git の外) | `rm -rf claude-video-skill/sound-kit/.cache` |
| A の再現(レビュー後は `docs/sound-upgrade/work/A_repro/`、git の外)と最初の作業ログ | `docs/sound-upgrade/work/A_repro/`、`/home/user/sndwork/` | `rm -rf docs/sound-upgrade/work /home/user/sndwork` |

### 全部を元に戻す
この枝の commit を取り消す(`git revert <commit>`、または main から枝を作り直す)と、追加したファイルと NOTICES の追記が消える。既存の音の道具は一切変えていないので、従来の手順(`sound-kit/BRIEF.md`)はそのまま動く。

## 2026-10-28 独立レビュー(commit a0dd8cb に対する指摘)への対応
| 番号 | 内容 | 変えた物 |
|---|---|---|
| 1 | qa.py の A のステムの既定値が外部パス | `prepare.py` を追加(枝から取り出して A を再現、`work/A_repro/`)。qa.py の既定は WORK 相対、無ければ A の場面分析だけ飛ばす。`build_all.sh` が最初に prepare.py を呼ぶ |
| 2 | 作り直すと伏せ記号が引き直され、git の中の物と食い違う / 作り直しが git の中の文書を上書き | 記号を `docs/sound-upgrade/answer_key/key.json`(git、固定)から読む。`finish.py`・`cue_sheet.py` は既定で `work/` にだけ書き、`--publish`(`PUBLISH=1`)の時だけ git の中を更新 |
| 4 | 伏せ方 | 評価用紙の列を無作為の順(Q7・V2・Z9)に、評価者ごとの順番の表(ラテン方格)、条件の手がかりになる文を削除。正解表を `answer_key/` へ移動。3 本とも同じ AAC の世代数・同じリミッターで標本ピークの天井をそろえた。消せない手がかり(15 kHz 以上 = 中身の違い、MP4 のバイト数)を QA と正解表に明記 |
| 5 | モノラル互換 | 横を持ち上げる処理をやめ、残響の尾の横 0.6、部屋の空気の横を半分。QA にモノラルの項目 |
| 6 | 低音の重なり | `common.low_duck`(周波数を選んだダッキング)と効果音側の HP。判定基準つきの表を QA に |
| 7 | 「絵」が設計時刻だった | events に絵のコマ番号・ずれを記録、キュー表に列を追加。区切り線を実測の最速コマ f365 に直した |
| 8 | 音楽ステムが ±1 で削られていた | ステムは float のまま書く。音楽バスを仕上げのゲイン後 -1.5 dBFS で先に抑える。QA に音楽バスの頂点 |
| 9〜15・17・18 | 文書の修正 | QA・MIX_NOTES・EARSHOT_EVAL・評価用紙・NOTICES(MuseScore General の条件、FluidSynth LGPL-2.1+、学習データ)・make_C の選定理由・測定の道具・A の再符号化 |
| 3・16 | 交絡の明記 / mp4 は残す | QA §4 と評価用紙 §4 に書いた。新しい比較条件は作っていない |

### 前の版で検査から直した物(履歴)
| 回 | 見つかった問題 | 直したこと |
|---|---|---|
| B 1 回目 | リミッター最大 6.0 dB | 頂点の上限(下地 + 12 dB) |
| B 2 回目 | タイトル着地の下地が止めの窓で -52 LUFS になり、実質無音 | 止めの窓では止める前の下地を基準に |
| B 3 回目 | 音楽だけで 0 dBFS に届く、LRA 2.3 LU に縮む | 音楽バスの圧縮を頭だけ(戻り 30 ms)、楽器ごとの圧縮 |
| B・C 4 回目 | カード・チェック・タイトル・今日の棒が埋もれる、部屋の空気が大きすぎ、ほぼ無音の窓が 1 か所 | 編曲で空ける、部屋の空気 -11 dB、窓を -22 dB |
| B・C 5 回目 | 測り方の誤り(連打の隣を拾う、30 ms 窓の位置) | 窓を隣との中間で切る、30 ms 窓を測った頂点に |
| B・C 6 回目 | ほぼ無音の窓の中の音が周りより +21〜27 dB | 8 dB 下げ、下げる微調整を頂点の上限の後に |
| B 6 回目 | カードの戻りと数字が 66 ms で 2 打点 | 戻りの音を消した |
| B・C 7 回目 | タイトル着地の立ち上がり 1.5 dB | ピックアップを 1 音に、着地の頂点の上限 16 dB |

## 再確認後の小さな修正
- `prepare.py`: 映像を取り出せない時(git の外の写しなど)は理由を示して止まる(以前は先へ進み finish.py で分かりにくく止まった)。HOWTO に「git clone した作業コピーが必要」を追記。
- `QA.md`: 「絵のコマとの差」と書いていた値が設計の狙いの時刻が基準だったので名前を直し、実際の絵のコマ基準の範囲を併記。
- 元に戻す: この commit を `git revert`。
