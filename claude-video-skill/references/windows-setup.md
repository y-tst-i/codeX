# Windows(ローカル PC)での準備と注意

利用者の Windows PC(Git for Windows の bash.exe)でこのスキルを動かすための手順。
**実機の Windows での確認は未実施**。2026-11 に Linux 上で「Windows を模した試験」(python3 が終了コード 49 で落ちるスタブ・bc が無い PATH)を通しただけ。数字は利用者の PC で測った物だけを書く。

## 1. 入れる物

| 物 | 入れ方の例 | 確かめ方(Git Bash で) |
|---|---|---|
| Git(Git Bash を含む) | 公式のインストーラー、または `winget install Git.Git` | `bash --version` |
| Node.js(LTS) | 公式のインストーラー、または `winget install OpenJS.NodeJS.LTS` | `node -v` / `npx -v` |
| ffmpeg / ffprobe | `winget install Gyan.FFmpeg` など。`ffmpeg.exe` のあるフォルダを PATH に | `ffmpeg -version` |
| 音用の Python | 下の §2(PATH に入れなくてよい) | `"$PYTHON" --version` |
| fluidsynth(MIDI を鳴らす時だけ) | 下の §3(PATH に入れなくてよい) | `"$FLUIDSYNTH" --version` |

- スクリプトは **Git Bash** で動かす(PowerShell / cmd では動かない)。
- `bc` は Git Bash に無い。スキルの道具はもう `bc` を使わない(bash の算術と awk に置き換え済み)。
- `sheet.sh`・`tools/assemble.sh`・`sound-kit/tools/assemble.sh` は python を使わなくなった(awk / sed で計算)。python が無くても動く。

## 2. 音用の Python 環境(Audio Studio の環境とは別にする)

Windows の `python3` / `python` は、**Microsoft Store を開くだけのスタブ**(実体なし。終了コード 49 などで落ちる)のことがある。
Audio Studio(Stable Audio)用の環境とは混ぜず、このスキル専用の環境を作業フォルダに作る。

```bash
# 例: 作業フォルダ C:\Users\<名前>\Documents\video-skill-work
cd /c/Users/<名前>/Documents/video-skill-work

# A) uv を使う(winget install astral-sh.uv など)
uv venv audio-venv --python 3.11
uv pip install --python audio-venv/Scripts/python.exe numpy scipy pretty_midi mido

# B) 標準の venv(python.org の Python を入れた場合。py ランチャーが使える)
py -3 -m venv audio-venv
audio-venv/Scripts/python.exe -m pip install numpy scipy pretty_midi mido
```

- `audio_measure.py`・`sync_check.py`・`review_checks.py` は numpy、`midi_render.py` は scipy・pretty_midi・mido も使う。
- スタブを止めたい時: Windows の 設定 → アプリ → アプリ実行エイリアス で `python.exe` / `python3.exe` をオフ。

## 3. fluidsynth(Windows 版)

1. 公式リリース https://github.com/FluidSynth/fluidsynth/releases から Windows 用の zip を取る。
2. 作業フォルダに展開する(例: `video-skill-work/fluidsynth/`)。`bin/fluidsynth.exe` がある。
3. サウンドフォント(.sf2。例: MuseScore General、FluidR3_GM)は Linux の `/usr/share/sounds/sf2/` に当たる場所が無いので、ファイルを置いて環境変数 `SF2` で指す。

## 4. PATH に頼らず、環境変数で指定する

道具は次の順に探す(`tools/env.sh`、`tools/midi_render.py`)。

- python: 環境変数 `PYTHON` → `python3` → `python` → `py -3`。**`--version` が成功した物だけ**を使う(スタブは採用しない)。
- fluidsynth: 環境変数 `FLUIDSYNTH` → PATH の `fluidsynth`。

```bash
# Git Bash の ~/.bashrc に書いておく(パスは C:/ 形式・スラッシュ区切りが無難。bash からも Windows の python からも読める)
export PYTHON="C:/Users/<名前>/Documents/video-skill-work/audio-venv/Scripts/python.exe"
export FLUIDSYNTH="C:/Users/<名前>/Documents/video-skill-work/fluidsynth/bin/fluidsynth.exe"
export SF2="C:/Users/<名前>/Documents/video-skill-work/sf2/MuseScore_General.sf2"
export PYTHONUTF8=1   # 日本語の出力を UTF-8 に(未確認の推奨。文字化けする時に)
```

- python の道具を手で呼ぶ時は、文書の `python3 tools/xxx.py` を `"$PYTHON" tools/xxx.py` に読み替える。
- 自作の bash スクリプトで python を使う時は `. tools/env.sh; need_py; py_run script.py ...`。見つからなければ導入手順を出して止まる。
- `midi_render.py` を使う bash では `need_fluidsynth` も呼べる(`FLUIDSYNTH` を設定して python に渡す)。

## 5. メモリと書き出し速度(利用者の PC で測った値)

- 空きメモリが 1.7 GB の時、`npx hyperframes doctor` が警告を出した。書き出し前に他のアプリを閉じる。Audio Studio の生成と同時に書き出さない。
- 書き出しの速さ(1コマあたり):

| 種類 | 1コマあたり |
|---|---|
| ローカルで作った雛形(`new_scene.sh` など) | 0.15〜0.19 秒 |
| 2D Canvas | 0.07〜0.08 秒 |
| クラウドで作った雛形 | 0.06〜0.08 秒 |

## 6. Windows での注意(直していない・直せない物)

- **権利物は git に入れない**: ゆうたONEフォントなどの権利物(フォント・素材)は、作業フォルダに置き、git に入れない(必要なら `.gitignore`)。
- **ファイルの中に書くパス**: ffmpeg の concat 一覧などファイルの中のパスは、Git Bash の `/c/...` 形式だと Windows の ffmpeg が読めない。相対パスか `C:/...` 形式で書く(`examples/island7-lab/finish.sh` は相対パスに直した)。コマンドの引数として渡すパスは Git Bash が自動で変換する。
- **時刻の焼き込み(`strip.sh`)**: Linux の DejaVu が無い時は `C:\Windows\Fonts\arial.ttf`(無ければ `segoeui.ttf`)を使う。フォントが無ければ時刻なしの画像になる(画像は作られる)。
- **改行コード**: `.sh` は LF で取り出す(`claude-video-skill/.gitattributes` で指定)。CRLF になると `$'\r': command not found` で落ちる。
- `new_scene_three.sh` は `sed -i` を使う(Git Bash の sed は GNU 版なので動く。macOS では動かない)。
- `sound-kit/projects/hitotsuzutsu/build_*.sh` は過去の制作の記録。python は `PY` → `PYTHON` → `~/earshot_env/bin/python`(Windows の venv なら `~/earshot_env/Scripts/python.exe`)の順。earshot など他の前提は Windows で未確認。
- `apt-get` の手順(`midi_render.py` の冒頭、SKILL.md の音の節)は Linux 用。Windows では §2・§3 で代える。
