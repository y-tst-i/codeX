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

## 2026-10-28 第2ラウンド(利用者の試聴結果を受けて: ルールの修正と BGM の作り直し)

### 既存ファイルの変更(依頼元の指示で、この 3 つの該当箇所だけ)
| ファイル | 変更前 | 変更後(要点) |
|---|---|---|
| `claude-video-skill/sound-kit/BRIEF.md` 設計ルール 4 | 「**ほぼ無音の区間を2か所以上**作る(静けさがあるから山が効く)。完全な無音にはしない。」 | 「**静けさは効果音で作る**: 効果音をほぼ鳴らさない区間を2か所以上。**BGM(ベッド)は落とさない**: 1曲として切れ目なく流し、小さくしても聞こえる状態を保つ(目安: 仕上げ後の 100 ms RMS で曲の中央値から -15 dB 以内。ゼロや -40 dBFS 級にしない)。静けさは効果音を減らす・音楽の密度を下げる・音域を絞ることで作る。」+ 修正の理由(試聴、1回・1人) |
| 同 依頼のひな形 | 「数値(LUFS・ピーク・ほぼ無音の位置・純音ピンの回数)を報告する」 | 「数値(LUFS・ピーク・効果音の静けさの位置・BGM ベッドの最小レベル・純音ピンの回数)を報告する」 |
| `claude-video-skill/references/sound-palette.md` 音の設計ルール 3 | 「**ほぼ無音の瞬間は「絞る」であって「ゼロ」ではない**: 山の前の一拍や衝撃の直後は、効果音と音楽を絞る(最低2か所)。ただし曲として流れ続けるBGMの層(ベッド)は全編に敷き、絞る窓でだけ下げる。…」 | 「**静けさは効果音で作り、BGM は切らない**: …**効果音**を鳴らさない・減らす(最低2か所)。BGM は 1 曲として途切れさせない。静かな所は密度・音域・少し下げる(中央値から -15 dB 以内、-40 dBFS 級に落とさない)。…BGM ごと -16〜-22 dB 落とす窓は不評だった(1回・1人)」 |
| `claude-video-skill/SKILL.md` §4 の 4 | 「…/3層/ほぼ無音を2か所以上/BGM は切れ目なく流し静かな所は下げる/…」 | 「…/3層/静けさは効果音で2か所以上作り、BGM は1曲として切らない(密度・音域で静かにする。-40 dBFS 級に落とさない)/…」 |
| `claude-video-skill/SKILL.md` §0(追記) | — | 「効果音は Kenney の録音と earshot の併用が1位(1回・1人)。併用版 > earshot だけ > 既存。BGM は3本とも不評。記録: RESULT_ROUND1.md」 |

**元に戻す**: `git show d0b6f81:<ファイル> > <ファイル>` で 3 ファイルを第1ラウンドの版に戻せる(d0b6f81 は第2ラウンドの前の commit)。または、この第2ラウンドの commit を `git revert` する。

### qa.py
- 「ほぼ無音の窓」をミックス全体ではなく、**効果音ステムの静けさ**(`sfx_quiet_windows`)と **BGM ベッドの落ち込みの最小値**(`bgm_bed`: 100 ms / 400 ms RMS の最小と中央値からの差)に分けて出すようにした。ミックス全体の `near_silent_windows` は参考として残した。

### 追加したファイル
| 場所 | 中身 |
|---|---|
| `docs/sound-upgrade/RESULT_ROUND1.md` | 第1ラウンドの順位・所感・原因の見立て・earshot の結論 |
| `docs/sound-upgrade/BGM_AUDIT_ROUND2.md` | BGM の監査(測定と楽譜)、作り直しの約束、2 案の違い、反対意見 |
| `docs/sound-upgrade/QA_ROUND2.md` | 第2ラウンドの検査 |
| `docs/sound-upgrade/compare_round2/` | 比較パック(動画 3 本、BGM だけの m4a 3 本、合計約 17.3 MB)と評価用紙 |
| `docs/sound-upgrade/answer_key/ANSWER_KEY_ROUND2.md`・`round2_key.json` | 第2ラウンドの正解表と固定の記号 |
| `projects/hitotsuzutsu/score2.py`・`make_round2.py`・`finish_round2.py`・`qa_round2.py`・`bgm_metrics.py`・`build_round2.sh` | 第2ラウンドのスクリプト。git の中は `PUBLISH=1` の時だけ書き換える |

### 変えたスクリプト(結果は変わらない)
- `mixer.py`: 仕上げ前の層(raw_music / raw_sfx / raw_room)も書き出す。`make_C.py`: C の身振りと BGM だけの音も書き出す。C の mix.wav はバイト単位で同じ(確認済み)。
- `common.py`: `band_dip`(帯域を選んだ一瞬の谷)を追加。

### 元に戻す(第2ラウンド全体)
この commit を `git revert` する。作業ファイルは `docs/sound-upgrade/work/R2_*`・`work/compare_round2*`(git の外)を消す。

## 2026-10-28 第2ラウンドの独立レビュー(e18191a に対する指摘)への対応
| 番号 | 変えた物 |
|---|---|
| 1 | `QA_ROUND2.md` から記号と、条件→記号が分かる値(ファイルの大きさ・LRA・条件ごとの数値)を消し、「基準」と「新しい 2 案」の範囲で書いた。条件ごとの表は `answer_key/QA_ROUND2_BY_CONDITION.md`(`qa_round2.py --publish` が書く)。評価用紙の案内は「評価の後に」 |
| 2 | 帯域の谷(`band_dip`)を、下げる前の BGM に対して 1 回だけ求め、時間の重なる窓は 1 つにまとめて上限 -6 dB、立ち上がり・戻り 50 ms(なめらか)。先に編曲で空ける(効果音の瞬間のオスティナート・打楽器を弾かない、ベースを手前で切る、エレピの和音を短く・裏へ)。窓の数(重複を除く)は 6 と 8 |
| 3 | `bgm_metrics.bed_stats` を 100 ms・50 ms・400 ms の窓を 10 ms ずつずらす方式に。BRIEF・sound-palette・SKILL に測り方を書いた |
| 4 | BGM だけの音声は谷を入れる前の音から作り、最後に 80 ms・最初に 5 ms のフェード。評価用紙に、鈴の音(身振り)を含めないことを条件が分からない書き方で書いた |
| 5 | 和音は半小節で変わる 2 か所(8.75 s・11.25 s)を残し、絵の山に属和音を合わせる意図を文書に書いた(score2.py の冒頭、BGM_AUDIT_ROUND2.md) |
| 6 | `references/sound-palette.md` のルール 10「設計書の無音窓で絞る」→「効果音の静けさの窓では、ベッドの音数・音域を減らし少しだけ下げる(ルール 3 の目安の範囲。ゼロや -40 dBFS 級にしない)」。元に戻す: `git show e18191a:claude-video-skill/references/sound-palette.md` |
| 7 | タイトルの低域の谷を -20 dB・0.25 s → -6 dB・0.12 s。主音を Eb3(または上の和音)で拍 20 に置き、低い Eb2 は着地の後の 8 分裏から(BGM 側の編曲。C の効果音は変えていない) |
| 8 | `qa.py` と `qa_round2.py` に合否(BGM ベッドが -15 dB 以内 / 始まり・終わりを除く効果音の静けさの窓が 2 か所以上) |
| 9 | 中域の埋もれを 30 ms・1/3 オクターブ(調整に使った物差し)、30 ms・1/6 オクターブ、120 ms の 3 つで報告 |
| 10 | 「効果音は同じ」を「仕上げ前の標本が同じ。仕上げのゲインは 12.9〜13.1 dB で最大 0.2 dB 違う」に |
| 11 | BRIEF・sound-palette・SKILL で、利用者の判定(本人の言葉)と見立てを分けた。RESULT_ROUND1 の所感は本人の言葉を「」に。BGM_AUDIT の根拠の無い評価を削除 |
| 12 | 順番表を全順列の 6 行に、列は記号の英字順に。正解表の既知の手がかりに BGM だけの音声のリミッター量 |
| 13 | `finish_round2.py`: 対応表が無い時は `--publish` が無ければ止まる |
| 14 | タイトルで同じ Eb2 を重ねて刻まない(ベースの刻みはタイトルの前で止め、前の音もタイトルで切る)。今日の棒の身振り(Eb6)と短 9 度になる D を BGM から外した(Bb → Bbsus4、旋律の 4 音目 D5 → F5) |
| 15 | compare_round2 の約 17 MB はそのまま(中身は作り直した。記号は同じ F9 / P5 / S9) |

## 2026-10-29 再確認(ade9f24)で見つかった点の記録(音は変えていない)
- 記録漏れ: `make_round2.py` の DUCKS で、詳細の着地(expand_land)の低域の下げを -15 dB → -20 dB(0.15 s、200 Hz 未満)に深くしていた。200 Hz 未満は warm -23 → -38 dBFS、light -27 → -46 dBFS(4.50〜4.65 s)。
- 未対応(試聴で確認): light 案は 7.7〜8.75 s で、効果音のために空ける時刻(`score2.py` の THIN_AT 7.80/7.85/8.17/8.47)が密集し、伴奏(ピチカート・エレピ・打楽器、ベースの大半)がほぼ止まり、マリンバの旋律だけが残る。拍のすき間(0.625 s)の数値には出ない。warm も 8.0〜8.75 s でピアノの刻みが抜ける(ベース・弦・シェイカーは続く)。直す案: 空ける音を 1 つおきにする/空けずに弱く弾く。
- warm の仕上げのリミッターの削り量 0.9 → 2.27 dB(13.16 s。基準 2.1 dB と同程度)。

## 2026-10-29 PC: Audio Studio で BGM 4案(条件 D)を生成
(PC 側の記録。枝 `pc/audio-studio-bgm` の af4a341 で CHANGELOG に足されていた文を、そのまま写した)
- 追加のみ: `docs/sound-upgrade/audio_studio_pc/`(D1〜D4.wav、generation_log.json、REPORT.md、measurements.json)。
- 小型音楽モデル(sm-music)、CPU、15.0 秒×4方向×各2回。聴感の評価はしていない(数値のみ)。
- D2〜D4 は、最初の 15 秒の生成で終盤が無音になったため、20 秒で作って 15 秒に切る方法で作り直した。4案とも途中の無音は無し(数値)。主和音で終わる形は未確認。
- 既存ファイルの変更なし。git が無く push 未実施(REPORT.md 参照)。

## 2026-10-29 第3ラウンド: 条件 D(生成 BGM)と S9 の 5 本の比較パック
AI は音を聴いていない。下は数値の測定と処理の記録。記号と中身の対応は `answer_key/` にだけ書いた(この文書には書かない)。

### 足した物
- `docs/sound-upgrade/audio_studio_pc/`: 枝 `pc/audio-studio-bgm`(af4a341)のファイル 7 個を取り込んだ。WAV 4 個は同一(MD5 一致、計約 15.9 MB)。テキスト 3 個(REPORT.md・generation_log.json・measurements.json)は、リポジトリの .gitattributes により改行を LF に正規化(中身は同じ)。
- スクリプト(`claude-video-skill/sound-kit/projects/hitotsuzutsu/`): `audit_round3.py`(元の BGM の点検)、`make_round3.py`(ミックス)、`finish_round3.py`(比較パック。git の中は `--publish` の時だけ)、`qa_round3.py`(検査)、`build_round3.sh`。`bgm_metrics.py` に `key_estimate`・`ending_stats`・`band_shares`・`tech_stats` を足した(既存の関数は変えていない)。
- 比較パック `docs/sound-upgrade/compare_round3/`: 動画 5 本 + BGM だけの音声 5 本(計約 28.8 MB)と `LISTENING_SHEET_ROUND3.md`。
- 正解表のフォルダ: `answer_key/round3_key.json`(固定の記号)、`ANSWER_KEY_ROUND3.md`、`QA_ROUND3_BY_CONDITION.md`、`AUDIT_ROUND3_BY_PLAN.md`。
- `QA_ROUND3.md`(5 本まとめての値だけ)、`RESULT_ROUND3.md`(試聴の結果を書く枠)。`AUDIO_STUDIO_PLAN.md` に §8、`claude-video-skill/NOTICES.md` に第3ラウンドの表を追記(ライセンスの事実)。`HOWTO.md` §3c、プロジェクトの README に 1 行。

### 生成 BGM 4 本の点検(数値。詳しくは評価の後に `answer_key/AUDIT_ROUND3_BY_PLAN.md`)
- 4 本とも 15.000 s・96 BPM の格子に乗る拍・クリップ 0・BGM ベッドの落ち込み(100 ms)は -15 dB 以内。50 ms では 1 本が元のファイルの時点で -17.4 dB。
- プロンプトは 4 本とも「E-flat major」だったが、調の推定は 4 本で別々(Eb 長調と推定された物は無い)。2 本は C の音程の身振り(Eb 長調の音 17 音)の半分以上が推定した調の音階の外。
- 4 本とも高い音域がほとんど無い(平均スペクトルが最大から -60 dB になる所が 4.2〜14.0 kHz)。
- 4 本とも、最後の 2 s の調が全体の調と違うか、最後まで音量が下がらない(PC の 20 s → 15 s の切り取りと 0.2 s のフェード)ため、「主音に解決して終わる」とはみなさなかった。

### ミックス(S9 と同じ規則。BGM の編曲は変えていない)
- BGM だけで -14.0 LUFS にそろえる → 「BGM + 身振り」を C の音楽バスに合わせる → 低い効果音の瞬間に 200 Hz 未満を一瞬下げる(`make_round2.DUCKS`)→ 中域の一瞬の谷(下げる前の BGM に対して 1 回だけ、重なる窓はまとめる、上限 -6 dB、50 ms、重なり 0)→ 生成 BGM 4 本は終わりに 14.0 s から 1.0 s のフェード → `mixer.finish`。
- S9 は第2ラウンドのミックスをそのまま使った。比較パックは同じ手順で 2 回作り、10 ファイルの MD5 が一致することを確かめた。
- 見つけた事: `make_round2.py light`(light だけ)で作り直すと、light の mix.wav が第2ラウンドの物とバイト単位で一致しない(warm と light を続けて作る `make_round2.py` では一致)。`build_round3.sh` は両方を作る形にした。原因: `score.py` の乱数が 1 つの流れ(`RNG = np.random.default_rng(20261028)`)で、warm を作ると進む(第3ラウンドの独立レビューの対応の時に確認)。

### 元に戻す
この commit を `git revert` する。作業ファイルは `docs/sound-upgrade/work/R3_*`・`work/compare_round3*`・`work/qa_round3.json`(git の外)を消す。

## 2026-10-29 第3ラウンドの独立レビュー(96a89f2 に対する指摘 1〜13)への対応
AI は音を聴いていない。記号(G3 / K9 / M4 / N7 / T9)と対応は変えていない。上の第3ラウンドの節の「S9 は第2ラウンドのミックスをそのまま使った」は、この対応で変わった(下の 1)。

| 番号 | 変えた物 |
|---|---|
| 1 | 効果音の頂点を守る下げを足した(`make_round3.py`: 合図と身振りの時刻の窓で、ミックスの頂点が -2.5 dBFS か「効果音・身振り・部屋だけの頂点 + 0.5 dB」を超える所だけ BGM を全帯域で浅く、足りなければ 40–250 Hz も。各上限 -6 dB、50 ms、ベッドのルールを優先)。BGM だけのリミッター(仕上げのゲインの後で -3.0 dBFS)。S9 も同じ規則で作り直した(公平のため。K9 は第2ラウンドの S9 とバイト一致でなくなった。正解表の手がかりも直した)。仕上げのリミッター 1.1〜4.25 → 0.0〜1.45 dB。合図ごとの効果音の頂点の 5 本の差は中央値 0.4 dB、最大 1.3 dB(mix.wav、段のチェック 3 つ目)/ 1.6 dB(比較パック)。表は `answer_key/QA_ROUND3_BY_CONDITION.md`、範囲は `QA_ROUND3.md`。評価用紙の「効果音は 5 本とも同じ」を数値どおりの言い方に |
| 2 | `NOTICES.md` と `AUDIO_STUDIO_PLAN.md` §8 に「リポジトリは公開。生成物と比較パックも公開の場所」と事実だけ。ファイルは動かしていない |
| 3 | ライセンスを目的で分けて書いた(非商用は上限・登録なし。商用の目的は会社の内部業務を含み、登録が要り、年間売上 100 万米ドル超で終了。CM 制作の業務なら商用に当たり得る、判断は利用者)。出典 URL・確認日 2026-10-29・「Last Updated: July 5, 2024」 |
| 4 | T5Gemma(Gemma Terms of Use)と AUP(stability.ai/use-policy)を 1 行、`same-s` は未確認と |
| 5 | 終わり方の判定を記録ベースに(`ending_decision`: 20 s で作って切った物 / 15 s で減衰しない物は作曲上の終わりではない。平行調は同じ扱い)。D2 が際どかったことを正解表と点検表に記録。4 本ともフェードの結論は同じ |
| 6 | 条件ごとの表のベッドの最小に「最小はフェードの範囲」の注と、14.0 s までの値を並べた |
| 7 | BGM だけの音声を低域の一瞬の下げの前から作り直した(5 本とも。S9 も score2 から下げの前を作り直した) |
| 8 | 中域の谷: まとめる判定を「間が 3 × RAMP(0.15 s)未満」に(依頼の 2 × RAMP = 0.10 s では、間 0.101 s の組を拾えなかった)。帯域の上限 4.5 kHz |
| 9 | 正解表に「D1・D3 の③は、Eb に固定した身振りとの調の不一致を含めた評価になる(プロンプトの Eb 指定をモデルが守らなかった)」 |
| 10 | 正解表の手がかりに音声のビットレート(ffprobe)。評価用紙に「試聴する人には compare_round3 のフォルダだけを渡す」 |
| 11 | 上の第3ラウンドの節の取り込みの行を「WAV 4 個は同一。テキスト 3 個は改行を LF に正規化(中身は同じ)」に直した |
| 12 | 音楽バス(BGM + 身振り)のリミッターを使わない形にした(`mixer.finish(..., music_bus_limiter=False)`。既定は今までどおり)。5 本とも 0 dB |
| 13 | git に入った大きな物はそのまま |

### 変えたスクリプト
`make_round3.py`(作り直し)、`audit_round3.py`(S9 を score2 から下げの前で作り直す、`WORK/R3_S9_source.wav`)、`finish_round3.py`(S9 = `R3_S9`、ビットレート、正解表の文)、`qa_round3.py`(効果音の頂点の表、14.0 s までのベッド、帯域ごとの下がり量、集計)、`mixer.py`(`finish` に `music_bus_limiter` 引数。既定 True なので第1・第2ラウンドの結果は変わらない)、`build_round3.sh`(make_round2 を呼ばない)。
