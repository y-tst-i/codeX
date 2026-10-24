# 落とし穴と節約(実際に踏んだ物だけ)

`archive/handbook.md`(旧本体)から、今も効く物を抜き出した。文は元のまま。数字は当時の実測。

## 1. HyperFrames で最初に踏む地雷(lint が後から指摘する)

- 同じプロパティに CSS の初期 `transform` と GSAP を併用しない → `gsap.fromTo()` か `xPercent/yPercent`。
- `window.__timelines["id"]` は root の `data-composition-id` と一致させる。タイムラインは `paused: true` を**ちょうど1本**。
- `repeat: -1`、実時間クロック、`Math.random`(seed無し)、ネットワーク取得は禁止(決定的レンダリングのため)。
- `<audio>` には必ず `id`(無いと**無音**になる)。`<video>/<audio>` に `crossorigin` を付けない。
- `.clip` 要素に `autoAlpha` / `visibility` / `display` をtweenしない(子要素を動かす)。
- フォントは `@font-face` でローカルファイルを指す。
- 全 from 状態を t=0 で設定する(シークしても壊れない)。
- 根の `#root` に `1920px` 等を直書きしない(`data-width/height` が正)。
- Linux では `render` 後のサマリを確認。`screenshot` + `software gpu` は遅い経路。

## 2. 検証ループ(レンダ前)

```bash
npx hyperframes lint
npx hyperframes check                      # lint/runtime/layout/motion/contrast が 0 件
npx hyperframes snapshot --at <時刻,...>    # 要所のフレームを目視
npx hyperframes preview --background        # ユーザーが確認・編集
npx hyperframes render                      # ユーザー承認後に書き出し
```

lint が1件でもエラーだと layout/contrast 監査が走らず「0 samples」になる。**0件=クリーン**と誤読しない。

## 3. 環境の落とし穴(クラウド/サンドボックスで実際に踏んだもの)

- **CDNが証明書エラー**: `cdn.jsdelivr.net` の GSAP は読み込めない → `npm pack gsap@3.14.2` で取り出して `assets/gsap.min.js` を同梱し `<script src="assets/gsap.min.js">`。これを忘れるとアニメが動かず「重なり」エラーが大量に出る。
- **フォント**: Noto Sans JP 以外は check が `font_family_without_font_face` を出すことがある(Dela Gothic One / DotGothic16 / Yuji / Hachi Maru Pop / Zen Antique)。TTFを取得して使う文字だけサブセット化し `@font-face` で同梱する。フォントの遅延読み込みで文字が数フレーム遅れるので、先読み用の隠し要素を置く。
- **書き出しの途中中断**: `nohup cmd &` は親シェルが終わると `render_cancelled_parent_exited`。Bashの `run_in_background:true` を使い、完了通知を待つ。待機ループで `pgrep -f "hyperframes render"` を使うと自分自身にマッチして終わらない。
- **有料/認証が必要**: `media-use resolve --type bgm` は HeyGen CLI の認証が要る → 無ければ numpy で合成(`make_audio.py` 参照。Karplus-Strong、フォルマント合唱、ノイズ帯域など)。SFXの同梱19種は認証不要。
- **日本語ナレーション**: ローカルTTSが無い環境では声なしで作る(文字と音で見せる)。
- **PIL無し**: コンタクトシートは ffmpeg の `tile` で作る。
- **レジストリ**(`npx hyperframes catalog --query "<語>"`): camera-shake / char-slam-explode / halftone-field / logo-sting / light-sweep-pass / vfx-shatter など「手作りする前に探す」価値が高い。デフォルトのまま貼らず、自分の場面に合わせて調整する。
- **設計書と場面カードの食い違い**: 設計書(BIBLE)の規則(例: 「CYAN は画面の5%以下」)と、場面カードの指定(例: 全面の挿入カット)が食い違っていても、担当は場面カードに従うだけで気づきにくい(STILLDUSK s4 で実際に発生)。**設計の最後に「BIBLE の数値・禁止と例外」を場面カード全部と照合する1回**を入れ、例外は BIBLE 側にも書く。
- 実例一式: リポジトリの `anime-ad/v2/`(`docs/` に BIBLE.md と SCENES.md、`make_audio.py`、`assemble.sh`、場面別ソース)。

## 4. 長尺(80秒超・9場面)で追加で分かったこと

- **担当エージェントが途中で止まることがある**(利用上限で `rate_limit` など)。止まった担当の `out/` には**書き出し済みの mp4 が残っていることがある**。報告が無くても、フレーム数(ffprobe)と中身(コンタクトシート)を**自分で確認**してから採用/再依頼を決める。
- **オチ・伏線は「読める時間」を測る**: 数値や文字で笑わせる場面は、最低でも約0.5秒(15フレーム)はっきり読める区間を確保させる(今回、`Lv.65537` が0.2秒だったのを延ばした)。
- **字幕仕様を設計書で固定**(下中央 / Noto Sans JP 700 / 48px / 縁取り=黒のtext-shadowリング / 0.1秒フェード / 話者名なし / 帯なし)。全場面で見た目が揃う。
- **捏造した評判・実績を入れさせない**: 担当が気を利かせて足した「全米が泣いた」等のジョーク宣伝文は、禁止ルールに反するので差し戻して削除させる(コピーは設計書の文言のみ、と明記)。
- **音の同期検証は「合図リスト」を作って1件ずつ**: 全体から山を拾う方式は、密なドラム区間に押し出されて誤判定する。合図(映像の閃光・UI変化)ごとに ±0.1秒内の音の立ち上がり(dB)を測る。立ち上がりが弱い笑いどころ(くしゃみ等)は音量を上げる。
- **担当の報告時刻で音を合わせ直す**: 設計書と実装でずれた時刻(例: 熊が飛ぶのが7.50でなく7.97)は、報告の実測値に音の合図を合わせる。
- **共有サイズ上限(送信30MB)**: 83秒の1080pは crf21 で約38MB。2パス(-b:v 2350k)で約25MBにして送る。マスターは別に保存。
- **音の最終段**: loudnorm(-14 LUFS)後にAAC化するとピークが上がる。最終mp4で `volume=-1.5dB` を掛けて -1dBFS 以下に収める。
- **Karplus-Strong のバッファ長**: `int(SR*L/SR)` は丸めで L-1 になる。`rng.standard_normal(L)` で長さLを直接作る。
- 実例: リポジトリの `anime-ad/ep1/`(設計書 `docs/`、`make_audio.py`、`assemble.sh`、場面別ソース)。

## 5. three.js(ソフトウェアGL)の速さと seek
   - **seek の落とし穴**: `composer.render(0)` と差分を明示 / FilmPass は time を直接代入 / GlitchPass・TAA・AfterimagePass は使わない / 乱数は seed 付き(GTAO のノイズも)。決定性は実測で一致を確認済み。
   - **速度(この環境、ソフトウェアGL、1920×1080、450フレーム換算)**: ポストなし 約4.4分 / Bloom 約7.7分 / GTAO+Bloom+DoF(ssaa1・32タップ) 約21分 / std(2倍描画・MSAA4・96タップ) 約2時間(実用外)。workers を増やしても速くならない(CPUを使い切る)。→ **基本は fast、GTAO は決め所のカットだけ**。長い動画の全場面を3Dにしない。
詳細は `three-3d.md`。

## 6. トークン節約(品質を落とさずに制作コストを下げる)
**どこで消費するか(実測)**: 見本15秒で、場面担当1人あたり約10〜13万トークン。辞書は全体で約1MB(丸ごと読むと膨大)、SKILL.md は約2万字。最大の無駄は「読みすぎ」「毎回の書き直し」「確認の繰り返し」。
1. **辞書は1項目ずつ引く**: `python3 tools/cin.py <slug>`(1項目≈2KB)/ `cin.py -s <語>`(検索)。グループのファイル(60〜120KB)を丸ごと読まない。担当に渡すのは場面カード + 該当項目の出力だけ。
2. **ひな形と部品を使う**: `bash tools/new_scene.sh <dir> <秒> [背景色]` で場面プロジェクトを一発生成(gsap・時刻tの純関数・タイムライン・部品入り)。`draw(t)` だけ書く。部品(SCENE_LIB): seed付き乱数、補間、`timeRemap`(スピードランプ)、`rain`(3層)、`vignette`、`glow`、`project`(一点透視)。毎回ゼロから書き直さない。
3. **担当への指示は短く**: 場面カード + 場面ID + 出力パス + 検証コマンドの4点。SKILL.md 全体を読ませない(必要な §番号だけ `sed -n` で)。
4. **確認は機械チェック優先**: フレーム数・解像度・先頭/末尾フレームの輝度や色(つなぎの連続)は数値で確認。画像を見るのは「コンタクトシート1枚 + つなぎの比較1枚」だけ。個別スナップショットを何枚も読まない。
5. **出力を絞る**: ログは `| tail -5`、レンダは静かなオプション。画像は小さく(幅640)。
6. **やり直しを減らす**: 先に `npx hyperframes check`(0 error)→ 低解像度の確認 → 本番レンダは1回。直す時は該当場面だけ(全場面再生成しない)。
7. **レート制限で止まった担当は SendMessage で再開**(最初からやり直さない)。

