# 共通の補助(source して使う)。Linux と Windows(Git for Windows の bash)の両方で動く。
#   . "$(dirname "$0")/env.sh"
#   need_py           -> $PY に「実際に動く」python を入れる(無ければ導入手順を出して止める)
#   need_fluidsynth   -> $FLUIDSYNTH_BIN に fluidsynth を入れる(無ければ導入手順を出して止める)
# 探す順:
#   python    : 環境変数 PYTHON → python3 → python → py -3
#   fluidsynth: 環境変数 FLUIDSYNTH → PATH の fluidsynth
# Windows の python3 / python は「Microsoft Store を開くだけのスタブ」のことがある(実体なし、終了コード 49 など)。
# そこで `--version` が成功した物だけを採用する。
# 詳しい準備: references/windows-setup.md

_vs_is_windows() { case "$(uname -s 2>/dev/null)" in MINGW*|MSYS*|CYGWIN*) return 0;; esac; return 1; }

# 引数をそのままコマンドとして試し、--version が成功すれば 0
_vs_try() { "$@" --version >/dev/null 2>&1; }

find_py() {
  PY=""; PY_ARGS=()
  if [ -n "${PYTHON:-}" ]; then
    if _vs_try "$PYTHON"; then PY="$PYTHON"; return 0; fi
    echo "env.sh: 環境変数 PYTHON=$PYTHON は動きませんでした(--version が失敗)。" >&2
    return 1
  fi
  local c
  for c in python3 python; do
    if command -v "$c" >/dev/null 2>&1 && _vs_try "$c"; then PY="$c"; return 0; fi
  done
  if command -v py >/dev/null 2>&1 && _vs_try py -3; then PY="py"; PY_ARGS=(-3); return 0; fi
  return 1
}

# python を呼ぶときは  py_run script.py ...  (py -3 の場合も正しく渡す)
py_run() { "$PY" ${PY_ARGS[@]+"${PY_ARGS[@]}"} "$@"; }

need_py() {
  find_py && return 0
  {
    echo "エラー: 動く Python が見つかりません(PYTHON / python3 / python / py -3 をすべて試しました)。"
    if _vs_is_windows; then
      echo "  Windows では python3 が Microsoft Store のスタブ(実体なし)のことがあります。"
      echo "  音用の Python 環境を作り、その python.exe を環境変数 PYTHON で指定してください。例(Git Bash):"
      echo "    export PYTHON=\"C:/Users/<名前>/Documents/video-skill-work/audio-venv/Scripts/python.exe\""
      echo "  (スタブを止めるには: 設定 → アプリ → アプリ実行エイリアス で python.exe / python3.exe をオフ)"
    else
      echo "  導入例: sudo apt-get install -y python3   または  export PYTHON=/path/to/venv/bin/python"
    fi
    echo "  手順: references/windows-setup.md"
  } >&2
  exit 1
}

find_fluidsynth() {
  FLUIDSYNTH_BIN=""
  if [ -n "${FLUIDSYNTH:-}" ]; then
    if [ -x "$FLUIDSYNTH" ] || command -v "$FLUIDSYNTH" >/dev/null 2>&1; then FLUIDSYNTH_BIN="$FLUIDSYNTH"; return 0; fi
    echo "env.sh: 環境変数 FLUIDSYNTH=$FLUIDSYNTH が見つかりません。" >&2
    return 1
  fi
  if command -v fluidsynth >/dev/null 2>&1; then FLUIDSYNTH_BIN=$(command -v fluidsynth); return 0; fi
  return 1
}

need_fluidsynth() {
  find_fluidsynth && { export FLUIDSYNTH="$FLUIDSYNTH_BIN"; return 0; }
  {
    echo "エラー: fluidsynth が見つかりません(FLUIDSYNTH → PATH の順に探しました)。"
    if _vs_is_windows; then
      echo "  公式リリース(https://github.com/FluidSynth/fluidsynth/releases)の Windows 版 zip を展開し、"
      echo "    export FLUIDSYNTH=\"C:/Users/<名前>/Documents/video-skill-work/fluidsynth/bin/fluidsynth.exe\""
      echo "  のように指定してください。"
    else
      echo "  導入例: sudo apt-get install -y fluidsynth   または  export FLUIDSYNTH=/path/to/fluidsynth"
    fi
    echo "  手順: references/windows-setup.md"
  } >&2
  exit 1
}
