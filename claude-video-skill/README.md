# video-with-claude-code

Claude Code で動画(モーショングラフィックス、CM、アニメ、解説、ループ)を作る時の**横断スキル**。特定プロジェクト用ではなく、全プロジェクトで効く。
**読む入口は `SKILL.md` だけ**(決まりごと・手順・道具の地図・何が検証済みか)。

## 入れ方
```bash
mkdir -p ~/.claude/skills
cp -r claude-video-skill ~/.claude/skills/video-with-claude-code
claude plugin marketplace add heygen-com/hyperframes && claude plugin install hyperframes@hyperframes   # 書き出しに必要(Node 22+, FFmpeg)
bash ~/.claude/skills/video-with-claude-code/tools/install_agent.sh   # 担当 video-opus(次のセッションから効く)
```

## フォルダ
| 場所 | 中身 |
|---|---|
| `SKILL.md` | 入口。3本柱(映像の頼み方・音・チェック)、決まりごと、道具の地図 |
| `references/` | 必要な時に1つずつ読む資料。映像: `motion-lab.md`・`prompt-templates.md`・`three-3d.md`・`character-acting.md`・`depth-and-texture.md`・`shot-spec-template.md`・`external-video-by-reference.md`、辞書 `cinematic/`・`styles/`。音: `sound-palette.md`・`sfx-catalog.md`。チェック: `review-gauntlet.md`・`review/`・`pitfalls.md`。記録: `case-notes.md` |
| `tools/` | 道具(一覧は `tools/README.md`) |
| `examples/hop-loop/` | `motion-lab.md` の型で作った4秒ループ(Canvas 2D + numpy の音、測定値と直した記録つき) |
| `agents/` | 担当 `video-opus` の定義 |
| `archive/` | 旧本体 `handbook.md`(実験の数字・ナレーションの設計・検討中の道具)と旧版。普段は読まない |
| `NOTICES.md` | 第三者の素材・コードのライセンス |

実例: 作業用の枝 `claude/anime-ad` の `anime-ad/`(30秒CM、第1話ショート版、比較試験の材料)。
出典: 映画技法の解説は melies.co/cinematic-techniques を日本語で要約・再構成(原文の転載ではない)。HyperFrames の実装レシピは独自。
