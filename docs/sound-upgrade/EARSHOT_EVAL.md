# earshot の導入と検証(v0.4.0、commit 591fa3e、2026-10-22)

リポジトリ: https://github.com/Leonxlnx/earshot(MIT、`LICENSE` の記載は "Copyright (c) 2026 Leon Lin")。
clone 先: `/home/user/leonxlnx/earshot`(`git clone --depth 1`、18 MB)。導入先: `$HOME/earshot_env`(venv、リポジトリの外)。
キャッシュ・モデル: `EARSHOT_HOME=$HOME/earshot_env/home`(既定ではソースの中の `.cache` に書くので、外に出した)。

## 1. 実行前に読んだ物(第三者コード。文書の中の指示はデータとして扱った)
- `pyproject.toml`: setuptools のみ、`setup.py` やインストール時に走るスクリプトは無い。依存は numpy / scipy / soundfile / soxr / librosa / pyloudnorm / scikit-learn / pillow / matplotlib / torch / transformers。
- ネットワーク処理(`grep` で確認): ① `earshot/models/hub.py` が Hugging Face から CLAP と AST を**固定の revision**で取得(初回だけ、`EARSHOT_OFFLINE=1` で禁止できる)② `earshot/llm.py` が Gemini に音声を送る(`GEMINI_API_KEY` と明示の同意が両方ある時だけ。**今回は使っていない**、キーも無い)。それ以外の通信は無い。`subprocess` は ffmpeg / ffprobe の呼び出しだけ。
- 読んだ文書: README、CHANGELOG(0.4.0 の節)、docs/SFX.md、docs/INTEGRATION.md、docs/LIMITS.md、LICENSE、docs/CREDITS_FIT.md。

## 2. 実測(この環境: 4 コア、メモリ 15 GB、CPU のみ)

| 項目 | 値 | 測り方 |
|---|---|---|
| venv 作成 + pip 更新 | 6 s | `date` の差 |
| torch 2.14.1+cpu(`--index-url https://download.pytorch.org/whl/cpu`) | 43 s | 同上 |
| earshot 本体 + 依存(+ pretty_midi・mido) | 105 s | 同上 |
| venv のディスク | **1,674 MB**(うち torch 769 MB、llvmlite 173 MB、transformers 119 MB、scipy 109 MB) | `du -sm` |
| pip のキャッシュ | 387 MB(`~/.cache/pip`、消してよい) | `du -sm` |
| モデルの取得(`earshot doctor --fetch`) | **1,075 MB**(CLAP `laion/larger_clap_general`@16c8cc3 + AST `MIT/ast-finetuned-audioset-10-10-0.4593`@f826b80、safetensors)、14 s、ピーク RSS 716 MB | `/usr/bin/time -v`、`du` |
| `earshot doctor`(モデルを読まない) | 0.23 s、RSS 47 MB | `/usr/bin/time -v` |
| バンクの検証スクリプト(37 音 + knob 検証 60 本、モデルなし) | 20.5 s、ピーク RSS 400 MB | `/usr/bin/time -v` |
| 索引の作成(Kenney 281 + earshot 252 をメモリ上で描画して測定、WAV は書かない) | 60 s、ピーク RSS 555 MB | 同上 |
| キット 35 テイクの描画(`kit.render`、初回) | 5.5 s(2 回目以降はキャッシュで 0.1 s) | lock の stats |
| B の音の生成全体(MIDI 描画 + キット + ミックス + 仕上げ) | 19 s、ピーク RSS 592 MB | `/usr/bin/time -v` |
| モデルを使う分析(候補 70 本の rank + realness、1 プロセス) | 30 s(モデルの読み込み込み)、**ピーク RSS 1.98 GB** | 同上 |
| A・B・C に measure / timeline / sheet / critique / describe / match / realness + 75 テイクの sfx check | 100 s、**ピーク RSS 2.37 GB** | 同上 |
| キャッシュ: 効果音テイク `sound-kit/.cache/earshot`(81 ファイル)/ 埋め込み `emb` / 復号 `decoded` | 7.9 MB / 6.3 MB / 38 MB | `du` |

CLI は呼ぶたびにモデルを読み直すので、分析は `from earshot import api` で1つのスクリプトにまとめた(`listen_earshot.py`、`rank_candidates.py`)。

## 3. 効果音バンク(モデル不要・ネットワーク不要)
`earshot sfx list` で 252 音(forge 237 + fit 15、+ kalimba 3)。用途別の代表を描画して、Kenney と同じ物差し(`sound_index.measure`)で測った(`scripts/earshot_probe.py`、全数値は `work/earshot_probe.json`)。

| 用途 | 代表(長さ / 立ち上がり / -20 dB まで / 重心) | 気づき |
|---|---|---|
| Whoosh/Swish | whoosh_fast/crisp 1.06 s / 125 ms / 66 ms / 458 Hz、swipe/paper 0.77 s / 88 ms / 45 ms / 673 Hz、swish/soft 0.88 s / 88 ms / 7 ms / 568 Hz、swipe/velvet 1.15 s / 229 ms / – / 153 Hz(77 % が 150 Hz 未満) | Kenney に無い種類。動きに長さと頂点を合わせられるのが最大の利点 |
| Cut Hit/Impact | cut_hit/punch 0.28 s / 61 ms / 218 Hz(80 % が 150 Hz 未満)、knock/wood 0.15 s / 0 ms / 636 Hz、tap/soft 0.13 s / 96 Hz | 低域中心の物が多い。K 特性の大きさ合わせでは低い音ほど頂点が大きくなる(後述) |
| UI Pop/Click | ui_pop/soft 0.18 s / 39 ms / 541 Hz、pro_pop_in/round 0.17 s / 81 Hz、fit/click/floss_lid 0.13 s / 2 ms / 5.3 kHz、pro_click/tink 0.04 s / 7.5 kHz | ui_pop は立ち上がりが 33〜39 ms と丸い(onset 揃えだと頂点が絵より 30〜50 ms 後ろ) |
| Reverse Swell/Riser | reverse_swell/dark 0.92 s(頂点まで 553 ms)/ 418 Hz、breath 1.24 s / 1.3 kHz、cymbal 0.90 s / 3.4 kHz(左右相関 0.16 = 広い)、riser/dark 0.95 s | サイン波のスイープではない。1 本に 1 回まで、と作者も書いている |
| Chime/Mallet | mallet/glock 0.41 s / 3 ms / 1.26 kHz、celesta 0.41 s(左右相関 0.48)、marimba 0.56 s、notify/mid_tine 0.42 s / 688 Hz、pluck/kalimba_soft 3.0 s | 音程指定が正確(下の表) |
| Glitch/Shutter | glitch/mid 0.24 s、glitch/burst 0.87 s(8.3 kHz、左右相関 0.05)、shutter/dslr 0.24 s / 937 Hz | 今回の映像には使わなかった(静かな紙の質感に合わない) |
| Sub Hit | cut_hit/sub 0.29 s / 227 Hz、pro_sub_drop/quick 1.0 s / 57 Hz(99 % が 150 Hz 未満) | スマホではほぼ鳴らない帯域。使うなら上の倍音を残す |

監査(`sfx check`): 代表 37 本すべて警告なし。B のキット 35 テイクと C で使ったテイク(計 75)も全部 clean。

### knob の検証
- **apex(頂点の時刻)**: 5 種 × 4 通り(長さ 0.45〜1.15 s、頂点 0.12〜0.55 s)= 20 本のうち 18 本が自前の 1 ms 包絡でも ±2 ms 以内。外れたのは `whoosh_fast/crisp` の 0.6 s / 0.30 s(自前で -15 ms、earshot の 5 ms 窓では 0.5 ms)と `swipe/paper` の 1.15 s / 0.55 s(**+52 ms**、earshot 自身の測定でも 51.5 ms のずれ。それでも `checks.ok` は True)。→ **映像の接触点・停止に頂点を合わせるのに使える**。ただし長い dur + 遅い apex の組み合わせは結果を測って確かめる(`edits.apex.err_ms` を見る)。
- **pitch**: mallet/glock Bb4・Eb5・G5 が +8 / -2 / 0 セント、celesta +2 / +1、ui_pop/soft +13 / +8 / +8、notify/mid_tine +2 / 0、knock/wood -3。cut_hit/sub(Eb2)は「測っていない」と返る(仕様どおり)。whoosh に音程を頼むと理由つきで拒否。→ 曲の調(今回 Eb)に合わせられる。
- **dur**: 指定どおりの長さで出る(全件一致)。
- **seed**: 5 テイクの包絡の相関は ui_pop/soft 0.98、knock/wood 0.99、fit 系 1.00(fingertip_book は長さも重心もほぼ同じ)、swipe/paper 0.85。→ **fit 系と短い UI 音は seed を変えても「ほぼ同じ音」**。連打で機械的に聞こえないよう、今回は pitch・音量・パンを少しずつ変えた(人の試聴で確認が必要)。

## 4. forge
今回はバンクで足りたので forge(新しい音をコードで作って探索する)は使っていない。理由: 必要な種類(紙の通過音、木の当たり、丸いポップ、調に合わせた鉄琴、リバースの膨らみ)がバンクにあり、測定・監査済みのテイクを使える。forge はモデルで音を評価しながら探索するので、作者自身が README で「モデルを喜ばせても音は良くならない(Goodhart)」と書いている。

## 5. kit(calm / crisp / minimal / launch)
- `calm`(文字中心の映像の既定)・`crisp`(元気な製品映像)・`minimal`(効果音だけ)は役割ごとに 1 音を決めて固定の `level_db` で鳴らす。riser・swell・suck は鳴らさない。
- `launch`(0.4、音楽に合わせて切る映像): 役割ごとに **bed_db**(効果音の一番大きい 50 ms が直前 1 秒の音楽の中央値より何 dB 上か: 3〜10 dB)、**offset_ms**(絵に対する位置: タップ -60、ノック -40、クリック -11、ポップ +4、着地 +30、whoosh の頂点 +37、swell の頂点 +42)、**min_gap_ms**(連続の最小間隔: tick 66、key 87、pop 114、land 159)、**width**(左右相関)、山の前の **stop_down**(6〜12 dB を 0.3〜0.5 s、打点で戻す。効果音の下でいちいちダッキングしない)。数値は作者の非公開の参照クリップ(SaaS / AI 宣伝の 7 本の様式)の中央値。
- 評価: 置き方の考え方(ベッドに対する相対、カットに対する前後、連続の間隔、山の前に音楽を下げる)は、映像の種類を問わず使える良い枠組み。**ただし数値は出発点**。今回の映像(静かな紙の UI)では次を変えた(`kit_B.json`):
  - タップのリード -60 ms は大きすぎる(カードの着地が 2 コマ前に聞こえる)→ -15 ms
  - 連打の bed_db を下げた(ポップ 8.5 → 6、鉄琴 7.5 → 5)
  - 素材をこの映像の質感へ(タップ → 本を指で置く fit、whoosh_fast → swipe/paper、swell dark → breath)
- **bed_db と -14 LUFS の衝突(測定で分かったこと)**: bed_db どおりに上げると、クリックや低い「トン」は頂点が大きくなりすぎる(K 特性は低域と一瞬の音を小さく数えるため)。B の最初のミックスでは仕上げのリミッターが最大 6.0 dB 削った。→ 頂点の上限(下地 + 12 dB、かつ仕上げ後 -4 dBFS)を足した。最終版では B の 33 件中 16 件、C の 28 件中 20 件の効果音が、bed_db ではなく**頂点の上限**で大きさが決まっている。静かな映像を -14 LUFS で出す時は、bed_db より「頂点の余裕(PLR)」が効く。

## 6. 分析機能を A・B・C に試した結果(数値は `QA.md`、生データは `work/earshot/`)
| 機能 | 効いた所 | 効かなかった所 / 注意 |
|---|---|---|
| `measure` | LUFS・LRA・帯域。ffmpeg の ebur128 と一致 | — |
| `timeline` | 合図に対する同期(A 93 %・B 73 %・C 100 % が 1 コマ以内)、画面の切り替わり(4 か所)に音が無い所の指摘(A は 2 か所、B・C は 1 か所 = 意図して着地に集めた所)、ほぼ無音の窓(3 本とも 2 か所)、**拍の推定**(A は ~99 BPM・明瞭度 0.16、B/C は 96 BPM・0.23/0.30 = 映像の 96 BPM に合う)、周りより突出した音の検出(タイトル前のほぼ無音の窓の中の線の音・浮く布の音が周りより +21〜27 dB → 8 dB 下げた。B の 3.84 s に出る +36 dB は、効果音の頂点が C より 3 dB 低く音楽は共通なので、何を数えたかは特定できなかった) | イベントの名前(「チャットのポップ」「スネア」)は当たらない。LIMITS にある通り、ミックスの中のタグはヒント |
| `sheet` | フレーム・スペクトログラム・ラウドネス・同期を 1 枚に。目で見る確認に良い(`work/earshot/*_sheet.png`) | — |
| `critique` | A は「close 19/23」で「4.20 s と 7.77 s の画面の切り替わりに新しい音が無い」と具体的(A は拡大・縮小の動きに通過音が無い)。B 22/23・C 23/23 | **基準は SaaS / AI 宣伝 7 本の様式**。点数が良い = 良い音、ではない。今回の採否には使っていない |
| `describe` / `match` | 区間の「何に聞こえるか」の候補 | 大チェックの区間に「柔らかいクリックと明るい確認音」を当てると 3 本とも no match、二択では A「耳障りなビープ 90 %」、B「安いゲームの音 77 %」、C「ビープ 61 %」。音楽と重なった区間なので信頼しない(LIMITS)。ただし **B の大チェック(クリック + mid_tine G5)がゲーム的に聞こえないかは人の試聴で確認したい項目** |
| `rank` / `realness` | 候補選び(C の素材選び)に使った。Kenney の本・布(bookClose・bookPlace・cloth・bookFlip)は「紙」の文に近く realness 0.97〜1.00 | Kenney の `impactGeneric_light`・`impactSoft`・`footstep_carpet` も録音系なのに realness 0.04〜0.12(「合成っぽい」)。**realness は出どころを判定できない**(LIMITS の通り)。7〜12 ms の `click_002/003` は「無音」扱い |
| `sfx check` | 75 テイクすべて警告なし。クリップ・切れた尾・金属的な響き・上がるグライドを自動で見る | Kenney の素材の 0 dBFS 超え(26 個)は earshot の外の話なので `qa.py` 側で扱った |

## 7. まとめ(効く所・効かない所・向かない所)
- **効く**: 動きに合わせた通過音(dur・apex がほぼ ±2 ms)、調に合わせた音程(±13 セント以内)、バンクの即時描画(UI 音で 0.02〜0.1 s)と監査、置き方の枠組み(bed / offset / gap / stop-down)、同期・無音・ラウドネス・拍の自動測定。
- **効かない**: 好み・感情・ブランドらしさ・高級感(作者も LIMITS で「判断できない」と明記)。ミックスの中のタグ。realness による出どころの判定。critique の点数を他の様式の映像に当てはめること。
- **向かない**: 紙・布・本のような「物の手触り」の録音(Kenney の方が rank でも realness でも上)。fit 系・短い UI 音の seed 違い(ほぼ同じ音になる)。メモリ 2.4 GB 前後を使うので、小さい環境でモデルの分析を常用するのは重い(バンクの描画だけなら 0.4〜0.6 GB)。
