# video-with-claude-code

Claude Code で動画(モーショングラフィックス、PV、解説動画、ポッドキャスト用アニメ)を作る時の横断ノウハウ。
特定プロジェクト用ではなく、**ユーザーレベルのスキル**として全プロジェクトで効く。

## 入れ方

```bash
# 自分のPCで
mkdir -p ~/.claude/skills
cp -r claude-video-skill ~/.claude/skills/video-with-claude-code
```

以降、Claude Code が動画関連の依頼を受けると自動で参照する(`/video-with-claude-code` でも呼べる)。

## 前提(HyperFrames)

実際のレンダリングは HyperFrames(HTML→MP4、Node 22+、FFmpeg)を使う。このスキル自体はその上の「頼み方・順序・地雷回避」の知識。

```bash
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes
```

## 構成

- `SKILL.md`: 本体(導入、使い分け、品質要因、プロンプト骨格、音、分業、地雷、検証、コスト感)
- `references/prompt-templates.md`: コピペで使えるプロンプト雛形
- `references/case-notes.md`: 事例メモとリンク集
