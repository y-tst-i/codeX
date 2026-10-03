# video-with-claude-code

Claude Code で動画(モーショングラフィックス、CM、アニメ、解説、予告)を作る時の**横断スキル**。特定プロジェクト用ではなく、全プロジェクトで効く。

## 入れ方
```bash
mkdir -p ~/.claude/skills
cp -r claude-video-skill ~/.claude/skills/video-with-claude-code
claude plugin marketplace add heygen-com/hyperframes && claude plugin install hyperframes@hyperframes   # 書き出しに必要(Node 22+, FFmpeg)
```

## 構成
| ファイル | 内容 |
|---|---|
| `SKILL.md` | 本体。導入、ワークフロー選び、品質要因、プロンプト骨格、音、分業手順(§11)、環境の落とし穴(§12)、長尺の知見(§13)、**映画の技法辞書の使い方(§14)**、**音の設計と無料の楽器音源(§15)**、**キャラの演技(§17)**、**実戦の型(§18)**、**のっぺり感への対処(§19)**、**トークン節約(§16)** |
| `references/cinematic/` | **映画の技法424件の辞書**(日本語)。`START_HERE.md`(映画の文法10原則・目的→技法の早見・必修30技法)、`INDEX.md`(全技法の索引)、グループ別11ファイル(カメラ/ショット/構図/光/色・大気/レンズ・時間/編集/効果/ジャンル・バイラル)。各エントリに HyperFrames での作り方(数値・数式・既製部品名) |
| `references/shot-spec-template.md` | 設計書の「場面カード」テンプレ(サイズ/アングル/動き/光/色/構図/時間/効果/つなぎ) |
| `references/character-acting.md` | **キャラの演技**(予備動作・余韻・タイミング・表情・手描きらしさ)と、2.5D人型部品 `puppet.js` の使い方 |
| `references/sfx-catalog.md` | 録音済み効果音の**実在する名前の一覧**と、無い音(銃声・爆発・風)の作り方 |
| `references/sound-palette.md` | **音のパレット**(効果音の定番を避ける代替表、音色の種類の目標、場面ごとの設計) |
| `references/prompt-templates.md` / `case-notes.md` | プロンプト雛形 / 事例メモ(skillry の Opus 5.5 動画) |
| `tools/` | `sheet.sh`(コンタクトシート)/ `assemble.sh`(連結+音)/ `sync_check.py`(映像と音の同期)/ `audio_instruments.py`(音の合成)/ `midi_render.py`(**本物の楽器音源(無料)でMIDIを鳴らす**)/ `look_pass.sh`(**仕上げの質感: にじみ・粒・周辺減光**)/ `sfx_lib.py`+`assets/sfx-cc0/`(**録音済みの効果音282個(CC0)の検索・読み込み**)/ `cin.py`(**辞書を1項目だけ引く**)/ `new_scene.sh`+`assets/`(**場面のひな形・部品・gsap**)/ `make_cinematic_index.py`(索引の再生成・網羅検証) |

## 実例
リポジトリの `anime-ad/`: 30秒CM(v2)、第1話ショート版(ep1)。設計書(`docs/BIBLE.md` `SCENES.md`)、音の合成スクリプト、場面別ソース付き。

出典: 映画技法の解説は melies.co/cinematic-techniques を日本語で要約・再構成(原文の転載ではない)。HyperFrames の実装レシピは独自。
