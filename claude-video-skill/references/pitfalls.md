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


## 7. 15秒ティザー(three.js + 楽器音源 + 録音効果音)で分かったこと
- **ES モジュールの HTML は `file://` で開けない**(importmap の three が読めない)。`python3 -m http.server` で出して開く。
- **ソフトウェア GL(swiftshader)は最初の1コマに約45秒**(シェーダーの準備)、その後は1080p で約1秒/コマ。静止画の確認は1回に数コマまとめて出す。
- **全コマが t の関数なら、直したコマだけ描き直せる**(浮いたランプを直した時は 180〜215 の36コマだけ)。
- **楽器音源の頂点は鳴らした時刻より遅れる**(オケヒットで +9.5ms)。`audio_measure.py` で測った分だけ前に置く。録音効果音は一番大きい山の位置から逆算して置く。
- **録音効果音は素材ごとに大きさが違う**(同じ設定で下地より 4〜10 dB とばらついた)。頭60ms の量で揃えてから置く。
- **帯域ノイズ(風・雨)は頂点が鋭く、リミッターを食う**。軽く丸める(tanh)と頂点と平均の差が縮む。
- **測定用の stem は切らずに float で書き出す**(全体の音量を上げた後に ±1 で切ると、測定値が狂う)。
- 雷のように「わざと絞った直後の一撃」は、下地より 6 dB を超えてよい(設計どおりなら注意は無視してよい)。

## 8. 2D試験(2026-10-30)の指摘で直した道具と注意(枝 `claude/skill-tool-fixes`)
各項目は手元で再現してから直した。検証の入力は合成した試験動画(15秒30fps 450コマ ほか)と `examples/hop-loop/` の音。
- **`audio_measure.py` の fps**: 以前は `--fps` の既定が 60 で、30fps の動画では合図の時刻が半分になり、雑音の山を拾った(同じ試験音で前 +5.0/-9.6/+16.7 ms → 後 +0.06/+0.02/+0.08 ms)。今は mp4 なら動画の fps を自動で読み、出力に `fps 30` と出す。wav に `--cues` を使う時は `--fps` 必須(無ければ説明つきで止まる)。60fps の hop-loop では前後で値が一致。
- **`assemble.sh` のコマ数**: concat デマルチプレクサ + `-r 30` が場面ごとに1コマ足し、`-shortest`(映像はコピー)が終わりを欠いた。15秒30fps の1本で 前 451→447コマ、3場面(60+90+75)で 前 227 → 後 は 450 と 225(正しい値)。今は concat フィルタ(各場面を fps=30 に)で繋ぎ、音を映像の長さちょうどに足す/切る。ラウドネスは前後とも -14.0 LUFS。
- **`sheet.sh` の終了コード 2**: 再現せず(試験の動画そのものを含む15通りで 0)。念のため、画像ができたら 0、引数不足・作れなかった時は 1 を返すようにした。
- **効果音の名前**: `references/sfx-catalog.md` の一覧は `python3 tools/sfx_lib.py catalog --write references/sfx-catalog.md` で生成する(手で書かない)。番号は欠けがある(`tick_000` は無い。`tick_001/002/004`)。全281個(以前の文書の 282・rpg-audio 52 は誤り)。
- **registry の `grain-overlay` は無限ループ**(`animation: hf-grain-noise 0.5s steps(1) infinite`。upstream の `registry/components/grain-overlay/grain-overlay.html` で確認)。`hyperframes-keyframes` の「CSS は有限の回数」と食い違う。入れたら**プロジェクトに入った写しだけ**を直す: `infinite` を回数(尺 ÷ 0.5秒、15秒なら `30`)にし、`animation-fill-mode: both` を足す。直した後に `npx hyperframes check` と、離れた2コマの静止画で粒が動くことを確かめる。registry 本体は直さない。
- **描画の枠組みの既定**(3つのスキルの食い違い): `SKILL.md` §2「描画の枠組み」の順(既存を続ける → 新規は HyperFrames → 使えない時だけ Canvas 1枚)で読む。根拠: HyperFrames の CLI(0.8.221)の `docs rendering` は HTML の合成を MP4 に書き出し、fps は既定 30(root の `data-fps` があればそれ)。Canvas 2D をタイムラインの `onUpdate` で `tl.time()` から描く最小の合成を `npx hyperframes render` で書き出し、四角の位置が 0.1/0.5/0.9 秒で 38/150/262 px(計算どおり)と確認した。つまり motion-prompt の Canvas 部品は HyperFrames の中でそのまま使える。
- **スキルの版が2つある**: Skill ツールが読むのは `~/.claude/skills/video-with-claude-code/`(旧版 260行、分業を推奨)。リポジトリの `claude-video-skill/SKILL.md`(担当1人)とは別物。迷ったらリポジトリの方を正とする(旧版は自動で更新されない。入れ替えは利用者の判断)。
