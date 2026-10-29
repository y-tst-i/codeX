# 監査: 既存の音の道具(2026-10-28)

読んだ物: `claude-video-skill/sound-kit/` 全部(README・BRIEF・AGENTS・tools 5本・素材の README / manifest)、`claude-video-skill/NOTICES.md`、`references/sound-palette.md`・`sfx-catalog.md`・`motion-lab.md` §8、`tools/audio_measure.py`、枝 `claude/anime-ad` の `anime-ad/neon-alley-test/audio_round/`(README・BLIND_KEY・cues.json・make_audio.py)、枝 `claude/motion2d-hitotsuzutsu` の `cues.json`・`design.md`・`motion-map.md`・`holds.json`・`sound/make_audio.py`。

## 1. 道具の一覧(何ができているか)

| 物 | 役割 | 入力 → 出力 | 依存 | 状態・気づき |
|---|---|---|---|---|
| `sound-kit/tools/midi_render.py` | MIDI を GM 音源で鳴らす `render()`、場面の加工 `scene_fx()`(帯域+残響)、`place()` | pretty_midi → (n,2) float | fluidsynth・SoundFont(MuseScore General 既定、無ければ FluidR3)・pretty_midi・scipy | 動く。残響は「全帯域が同じ速さで減衰する雑音」の IR(`make_ir`)1 種類 |
| `sound-kit/tools/sfx_lib.py` | Kenney CC0 の検索・読み込み・seed で選ぶ | 名前 → mono float | ffmpeg | 動く。**実数は 281 個**(README は 282、rpg-audio は 52 と書くが 51)。7〜12 ms しかない素材が 9 個(`click_002` など)、元の録音が 0 dBFS を超える素材が 26 個(`bookClose`・`bookPlace*` など)→ 使う前に頂点を下げる必要あり |
| `sound-kit/tools/audio_instruments.py` | 数式合成の部品(kick・bell・whoosh 等 30 個) | → numpy | numpy | 冒頭の `SFX_DIR` が別環境のパス(`/root/.claude/skills/media-use/...`)固定で、`sfx()` はこの環境では読めない。合成部品は動く |
| `sound-kit/tools/assemble.sh` | 場面 mp4 の連結 + 2 回通しの loudnorm(-14 LUFS)+ 必要なら軽い圧縮 | 場面 mp4・wav → mp4 | ffmpeg | 映像を一度再エンコードする(crf 14)。今回は映像を作らないので使わない |
| `sound-kit/tools/sync_check.py` | 輝度の急上昇と、合図の前後の音の立ち上がり(dB)・ずれ | mp4 + {名前: 秒} | ffmpeg・numpy | 動く。fps 30 固定。立ち上がりは「直前 100 ms との差」なので、66 ms 前に別の音がある合図は弱く出る(今回 count_roll で確認) |
| `claude-video-skill/tools/` | 上の 5 本と**同じ中身**(`diff` で一致)+ `audio_measure.py`(スマホ帯域・K 特性で打撃と下地の差)・`sheet.sh` ほか | | | sound-kit は切り出しの複製。直すなら両方 |
| `sound-kit/BRIEF.md` | 設計ルール 7 か条・仕上げの目標・依頼のひな形 | | | 中身は今も有効(場面ごとに楽器・空間・帯域を変える、3 層、ほぼ無音 2 か所、J/L カット、合図表を先に) |
| `references/sound-palette.md`・`sfx-catalog.md` | 「定番の合成音」の避け方、Kenney の実名一覧、無い音の作り方 | | | Kenney に**通過音(whoosh)が無い**のが最大の穴(rpg の `cloth`・`bookFlip` で代用している) |
| 過去の比較 `audio_round/` | NEON ALLEY 15 秒で「合成音だけ」vs「Kenney + MIDI + 合成の環境音」 | | | 利用者の判定は後者が「絶対良い」。作り手の自己申告の弱点: LRA 3.2 LU と狭くヒットが詰まる、BGM の低音が強く場面の重心が近い(475〜614 Hz) |
| `motion2d-hitotsuzutsu/sound/make_audio.py`(= 条件 A) | 「ひとつずつ」15 秒の既存の音 | cues.json → mix.wav | 上の道具 | この環境で再実行すると元の mp4 の音と相関 0.9999(差 -37 dB = AAC 分)で一致 → A のステムを監査に使えた |

## 2. 動作環境(この作業で用意した物)

| 物 | 手段 | 記録 |
|---|---|---|
| fluidsynth 2.3.4 | `apt-get install fluidsynth`(Ubuntu noble universe) | 無料・オープンソース。最初の apt は途中で止まり `MuseScore_General_Full.sf2.dpkg-new` が残ったので `dpkg --configure -a` と `--reinstall` で直した |
| MuseScore General 0.2.1(`/usr/share/sounds/sf2/MuseScore_General_Full.sf2`、490 MB) | `apt-get install musescore-general-soundfont-lossless` | MIT・一部 CC0。リポジトリには入れない |
| FluidR3 GM(148 MB、予備) | `apt-get install fluid-soundfont-gm` | MIT |
| GNU time | `apt-get install time` | ピーク RSS の測定用 |
| apt で増えたディスク | 9,035 MB → 10,140 MB(約 1.1 GB、qt の依存を含む) | |
| Python の依存(numpy・scipy・pretty_midi・mido 等) | earshot と同じ venv(`$HOME/earshot_env`)に入れた。システムの python3 には scipy が無い | `EARSHOT_EVAL.md` |

## 3. 重複を避けるために決めたこと
- `midi_render.py`・`sfx_lib.py` は **import して使うだけ**(変更なし)。新しい物は「横断の索引」「earshot のキャッシュ」「プロジェクトの組み立て」だけ。
- 残響は `midi_render.make_ir` を置き換えず、プロジェクト側(`projects/hitotsuzutsu/common.py` の `room_ir`)に帯域ごとに減衰の違う IR を足した(既存の関数はそのまま)。
- 測定は既存の `sync_check.py` をそのまま呼び、足りない物(帯域の重なり、効果音ごとの頂点のずれ、ほぼ無音の窓)は `qa.py` に足した。`audio_measure.py` のスマホ帯域の測り方は `qa.py` で同じフィルタを使った。

## 4. 今回の改善(要約。詳しくは各ファイル)

| 課題(依頼文) | 今回やったこと | どこ |
|---|---|---|
| コード合成の音が単調で安っぽい | 効果音を「録音(Kenney)」「録音をコード化した物(earshot fit)」「動きに長さと頂点を合わせられる合成(earshot)」から合図ごとに選ぶ。選ぶ時は測定値(長さ・立ち上がり・余韻・重心)と earshot rank / realness を並べ、点数だけで決めない | `sound_index.py`、`CUE_SHEET.md` |
| 動画が変わっても似た音色を繰り返す | 索引で「同じ形の別の音」を出どころをまたいで探せる(`like`)。earshot は seed でテイク違い、pitch で調に合わせられる | `sound_index.py`、`earshot_cache.py` |
| タイミングは合っても完成度が物足りない | 帯域の重なりを数値で見て、音楽側の編曲で空ける(カードの連打中は刻まない、チェックの拍の頭はシェイカーを抜く、今日の棒の着地はエレピを抜く、タイトルの和音は着地の 70 ms 後)。山の前のステップダウン | `score.py`、`MIX_NOTES.md` |
| BGM の楽器構成に変化が乏しい | 全編「弦 + パッド」の土台をやめ、場面ごとに役割の違う楽器で組み直し(ピアノ → ギター+ベース+シェイカー → 弦 → エレピ+キック+ベース → 止め → ピアノ+弦+声) | `score.py` |
| 評価が不十分 | 数値で確かめられる物は `qa.py` と earshot(timeline・critique 等)で自動化。センス・感情は名前を伏せた比較パックと評価用紙で人に | `QA.md`、`compare/` |
