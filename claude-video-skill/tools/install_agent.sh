#!/usr/bin/env bash
# 動画制作の担当(video-opus: Opus・エフォート中)を、どのリポジトリでも使えるよう ~/.claude/agents/ に設置する。
# 使い方: bash tools/install_agent.sh        (何度実行してもよい。同じ内容なら何もしない)
# 注意: 担当の一覧はセッション開始時に読み込まれる。設置した回は効かず、次のセッションから効く。
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
src="$here/agents/video-opus.md"
dst="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/agents/video-opus.md"
[ -f "$src" ] || { echo "見つからない: $src" >&2; exit 1; }
if [ -f "$dst" ] && cmp -s "$src" "$dst"; then echo "設置済み(同じ内容): $dst"; exit 0; fi
mkdir -p "$(dirname "$dst")"
if [ -f "$dst" ]; then echo "既存を上書き: $dst"; else echo "新規設置: $dst"; fi
cp "$src" "$dst"
echo "次のセッションから video-opus が使える。この回は Agent の model=opus 指定で代用する(エフォートは親と同じ)。"
