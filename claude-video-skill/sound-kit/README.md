# sound-kit — 映像に音(BGM・効果音)を付ける道具だけを切り出した一式
Claude や Codex など、どの AI にも渡せる。このフォルダだけコピーすれば動く。
- 試験の結果: 同じ映像で、合成音だけの音よりこの方法の音が名前伏せで「絶対良い」と判定された。
- 中身: `BRIEF.md`(設計ルール・手順・依頼のひな形。**AI にはまずこれを読ませる**)/ `tools/`(`midi_render.py` 楽器音源で MIDI を鳴らす、`sfx_lib.py` 録音済み効果音281個の検索・読み込み、`audio_instruments.py` 音の合成の部品、`assemble.sh` 連結と -14 LUFS、`sync_check.py` 映像と音の同期の確認)/ `AGENTS.md`(Codex 向けの約束)。
- 準備: `BRIEF.md` の「1. 準備」(fluidsynth・ffmpeg・Python の pretty_midi / mido / numpy / scipy)。
- Codex に頼む: `BRIEF.md` の「6. 依頼のひな形」を貼る(フォルダ名は `sound-kit/` に読み替え済み)。
- ライセンス: 効果音は Kenney 等の CC0(`tools/assets/sfx-cc0/README.md`)。音源 MuseScore General は MIT・一部CC0(同梱しない・各自で導入)。
