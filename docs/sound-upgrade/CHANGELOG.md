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
| `docs/sound-upgrade/compare/` | 比較用の mp4 3 本(記号の名前、合計 16 MB)、`LISTENING_SHEET.md`(評価用紙)、`ANSWER_KEY.md`(正解表、評価の後に開く) |
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
| A の再現の作業場所 | `/home/user/sndwork/` | `rm -rf /home/user/sndwork` |

### 全部を元に戻す
この枝の commit を取り消す(`git revert <commit>`、または main から枝を作り直す)と、追加したファイルと NOTICES の追記が消える。既存の音の道具は一切変えていないので、従来の手順(`sound-kit/BRIEF.md`)はそのまま動く。
