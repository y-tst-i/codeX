# projects/hitotsuzutsu — 「ひとつずつ」15 秒の音(B = earshot 版、C = ハイブリッド版)

映像は枝 `claude/motion2d-hitotsuzutsu` の `motion2d-hitotsuzutsu/hitotsuzutsu_final.mp4`(変更しない)。`cues.json` はその枝の写し。
全部の音は seed 固定で、同じコマンドで同じ結果になる。使い方は `docs/sound-upgrade/HOWTO.md`。

| ファイル | 役割 |
|---|---|
| `common.py` | 合図の時刻、置き方、EQ、部屋の響き(`room_ir`)、仕上げ(ラウドネスと真のピーク)。既存の `tools/midi_render.py`・`sfx_lib.py` を import |
| `score.py` | 新しい BGM(MIDI + FluidSynth + MuseScore General)。B と C で共通 |
| `mixer.py` | 効果音を「下地に対する大きさ」と「絵に対する位置」で置く(earshot の kit の補助関数を使う) |
| `kit_B.json` / `make_B.py` | B: 効果音はすべて earshot(launch 型から出発して、この映像向けに直したキット) |
| `make_C.py` | C: Kenney の録音 + earshot + MIDI の楽器で音程の身振り |
| `prepare.py` | 枝から映像と既存の音を取り出し、A のステムを元のスクリプトで再現(`work/src/`・`work/A_repro/`) |
| `finish.py` | 比較パック(A / B / C、固定の伏せ記号 `docs/sound-upgrade/answer_key/key.json`、同じ手順でそろえる、映像は -c:v copy)。`--publish` の時だけ git の中を更新 |
| `qa.py` / `listen_earshot.py` | 検査(モデルなし)/ earshot の分析(モデルあり) |
| `cue_sheet.py` | 実際の配置から `docs/sound-upgrade/CUE_SHEET.md` の表を書く |
| `build_all.sh` | 全部を順に実行(第1ラウンド) |
| `score2.py` / `make_round2.py` / `finish_round2.py` / `qa_round2.py` / `bgm_metrics.py` / `build_round2.sh` | 第2ラウンド: C の効果音のまま、BGM を「1 曲として聞こえる」2 案(warm / light)に差し替え、比較パック(動画 + BGM だけの音声)と検査 |
| `audit_round3.py` / `make_round3.py` / `finish_round3.py` / `qa_round3.py` / `build_round3.sh` | 第3ラウンド(条件 D): PC の Audio Studio で作った BGM D1–D4(`docs/sound-upgrade/audio_studio_pc/`)を S9 と同じ物差しで点検し、C の効果音の下に S9 と同じ処理(低域の一瞬の下げ・中域の浅い谷・終わりのフェード)で置き、S9 と合わせた 5 本の比較パックと検査 |

出力は `docs/sound-upgrade/work/`(git に入れない)。git の中の比較用 mp4・正解表・`CUE_SHEET.md` の表は `PUBLISH=1 bash build_all.sh` の時だけ更新する。
