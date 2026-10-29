# 使い方(再利用の手順)— 初めての人向け

## 1. 準備(1 回だけ、無料の道具だけ)
```bash
# 楽器音源と ffmpeg(Ubuntu / Debian)
sudo apt-get update && sudo apt-get install -y fluidsynth musescore-general-soundfont-lossless ffmpeg time

# earshot(MIT)をリポジトリの外に入れる
git clone --depth 1 https://github.com/Leonxlnx/earshot /home/user/leonxlnx/earshot
python3 -m venv $HOME/earshot_env
$HOME/earshot_env/bin/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
$HOME/earshot_env/bin/python -m pip install /home/user/leonxlnx/earshot pretty_midi mido
export EARSHOT_HOME=$HOME/earshot_env/home        # モデルとキャッシュの置き場(リポジトリの外)
$HOME/earshot_env/bin/earshot doctor               # 確認(モデルは読まない)
```
- ディスク: venv 約 1.7 GB、音源 約 0.6 GB。モデル(約 1.1 GB)は**分析を使う時だけ**初回に自動で取得(`earshot doctor --fetch` で先に取ってもよい)。
- 効果音バンクの描画(`earshot sfx` / `kit`)はモデルもネットワークも使わない。
- Gemini に音を送る `earshot llm` は使わない(キーと同意が要る)。

以下 `PY=$HOME/earshot_env/bin/python`、作業場所はリポジトリの根。**git clone した作業コピーが必要**(`prepare.py` が `git show` で別の枝から映像を取り出すため。zip や git archive の写しでは動かない)。

## 2. 効果音を探す(Kenney と earshot を横断)
```bash
cd claude-video-skill/sound-kit
$PY sound_index.py build                                 # 索引を作り直す(約 1 分。index/sound_index.json は同梱済み)
$PY sound_index.py find --role land.light --dur 0.05-0.4 # 用途と長さで
$PY sound_index.py find paper                            # 名前・説明の語で
$PY sound_index.py like bookPlace1                       # この音に形が近い物(出どころを問わず)
$PY sound_index.py show ui_pop/soft                      # 1 件の全項目(調整できる範囲・ライセンス)
$PY earshot_cache.py render swipe/paper --dur 0.7 --apex 0.33 -o /tmp/w.wav   # 動きに合わせた 1 テイク
```
- earshot の音はキャッシュ(`sound-kit/.cache/earshot/`、git に入れない)に必要な時だけ作られる。
- 選ぶ基準は出どころではなく、映像の動きに合うか(長さ・立ち上がり・余韻・重心)。最後は耳で。

## 3. 「ひとつずつ」の B / C を作り直す
```bash
git fetch origin claude/motion2d-hitotsuzutsu                    # 映像と既存の音(条件 A)がある枝(チェックアウトはしない)
bash claude-video-skill/sound-kit/projects/hitotsuzutsu/build_all.sh            # 準備 → B・C → 比較パック → 検査 → キュー表(約 1 分)
LISTEN=1 bash claude-video-skill/sound-kit/projects/hitotsuzutsu/build_all.sh   # + earshot の分析(モデル、約 2 分、メモリ 2.4 GB)
```
- 最初に `prepare.py` が枝から映像・元の音を取り出し(`work/src/`)、A の元の `make_audio.py` をそのまま実行して A のステムを再現する(`work/A_repro/`、検査の場面分析に使う。無ければその分析だけ飛ばす)。
- 出力はすべて `docs/sound-upgrade/work/`(git の外): `B/`・`C/`(mix.wav・ステム・events.json)、`compare/*.mp4`、`compare_wav/`、`qa.json`、`CUE_SHEET_tables.md`。
- **git の中の物は勝手に上書きしない**。比較パック(`compare/*.mp4`)・正解表(`answer_key/ANSWER_KEY.md`)・`CUE_SHEET.md` の表を更新したい時だけ `PUBLISH=1 bash .../build_all.sh`。
- 伏せ記号は `docs/sound-upgrade/answer_key/key.json`(git の中、固定)を読むので、作り直しても変わらない。引き直す時だけ `finish.py --new-key`。
- 同じコマンドなら同じ音になる(seed 固定。B・C の mix.wav が作り直しでバイト単位で一致することを確認済み)。

## 3b. 第2ラウンド(C の効果音のまま BGM を 2 案に差し替える)
```bash
bash claude-video-skill/sound-kit/projects/hitotsuzutsu/build_round2.sh             # → docs/sound-upgrade/work/R2_warm|R2_light/、work/compare_round2/、work/qa_round2.json
LISTEN=1 PUBLISH=1 bash claude-video-skill/sound-kit/projects/hitotsuzutsu/build_round2.sh   # + earshot で拍を測り、git の中の compare_round2/ と正解表も更新
```
- 先に第1ラウンドの `build_all.sh` を 1 度通しておく(C の効果音の層 `work/C/raw_*.wav` を使うため)。
- 伏せ記号は `docs/sound-upgrade/answer_key/round2_key.json`(固定)。

## 3c. 第3ラウンド(条件 D: PC の Audio Studio の BGM を S9 と比べる)
```bash
bash claude-video-skill/sound-kit/projects/hitotsuzutsu/build_round3.sh             # → work/R3_audit.json、work/R3_D1..D4/、work/compare_round3/、work/qa_round3.json
LISTEN=1 PUBLISH=1 bash claude-video-skill/sound-kit/projects/hitotsuzutsu/build_round3.sh   # + earshot、git の中の compare_round3/ と answer_key/ の第3ラウンドの表も更新
```
- 入力は `docs/sound-upgrade/audio_studio_pc/D1.wav`〜`D4.wav`(PC で生成、44.1 kHz。48 kHz に変換して使う)。先に第1ラウンドの `build_all.sh` を 1 度通しておく。
- 基準の S9 は、`audit_round3.py` が score2 から作り直す(warm → light の順に作る。`score.py` の乱数が 1 つの流れなので、light だけだと別の音になる)。5 本とも `make_round3.py` の同じ規則でミックスする。
- 伏せ記号は `docs/sound-upgrade/answer_key/round3_key.json`(固定)。

## 4. 別の映像に使う時
1. 映像の合図表(`cues.json`: 名前とコマ番号)とコンタクトシートを先に作る。
2. `projects/hitotsuzutsu/` を写して、`score.py`(和音・場面・楽器)と `make_C.py` の合図の表を**その映像のために書き直す**(テンプレートの使い回しをしない)。
3. BGM は 1 曲として作る(`score2.py` が見本: 1 小節 1 和音の一貫した進行、短いモチーフ、全編のオスティナート、場面は足し引きで)。静けさは効果音で作り、BGM を落とさない(`bgm_metrics.py` でベッドの最小を測る)。
4. `qa.py` で帯域の重なり・同期・無音を見て、埋もれた音は音楽の編曲で空ける(音量だけで押し上げない)。
5. 最後は名前を伏せて人が聴き比べる(`compare/LISTENING_SHEET.md` をひな形に)。
