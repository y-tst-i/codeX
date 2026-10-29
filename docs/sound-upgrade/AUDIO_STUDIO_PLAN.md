# 条件 D(AI生成の音を併用)の準備書 — Audio Studio MCP

対象: 商業CM・プロダクト紹介向けモーショングラフィックスの音響比較のうち、条件 D「AI生成の音を併用」。
D はクラウドでは作らず、利用者の Windows PC で後日作る。この文書はその準備用。
調査日・ライセンス確認日: **2026-10-28**。調べたのは第三者のリポジトリ
[kanaworksai-hue/audio-studio-mcp](https://github.com/kanaworksai-hue/audio-studio-mcp)
(コミット `5dc6311`、2026-10-24、パッケージ版 1.0.0)。読んだだけで、実行もインストールもしていない。

## 1. 先に結論

- 使うモデルは Stability AI の **Stable Audio 3**(Windows では PyTorch 版の重み)。
- 商用に使える条件は「**利用者(と関連会社)の年間売上が 100 万米ドル未満**」で、加えて
  **Stability AI への登録**が要る。売上の条件を満たさない場合や、登録したか分からない場合は商用 CM に使わない。
- **利用してよいか分からない生成物は、商用動画に組み込まない。** 比較試聴(社内の検討)にだけ使う。
- PC では「導入済みの物をそのまま使う」。再インストールや再ダウンロードはしない。

## 2. 使うモデル

| 名前(設定値) | Hugging Face 上の名前 | 大きさ | 最長 | 備考 |
|---|---|---|---|---|
| `medium`(既定) | `stabilityai/stable-audio-3-medium` | 2B パラメータ(モデルページの表記)、ダウンロード約 10.4 GB | 380 秒 | 品質が最も高い |
| `sm-music` | `stabilityai/stable-audio-3-small-music` | 0.6B パラメータ、約 3.5 GB | 120 秒 | 小型・速い。音楽向け |
| `sm-sfx` | `stabilityai/stable-audio-3-small-sfx` | 約 3.5 GB(パラメータ数は未確認) | 120 秒 | 小型・速い。効果音向け |

- 提供元は Stability AI。大型の large は公開されていない(モデルページより)。
- 動かすプログラムは Stability AI 公式の `stable-audio-3`(MIT ライセンス)。インストーラーが
  決まった版(コミット `77e0398`)を `vendor\stable-audio-3` に取ってくる。PyTorch は 2.7.1(CUDA 12.6 版)。
- 文章を読み取る部品として Google の **T5Gemma** が同梱されていて、こちらには Gemma の利用規約もかかる。
- Mac 用の README には「medium 1.4B」とあり、モデルページの「2B」と数字が合わない。どちらが正しいかは**未確認**。
- 重みの「版」は Hugging Face 上の更新履歴(コミット)で決まるが、生成ごとの記録(後述の `.json`)には
  `medium + same-l` のような名前しか残らない。どの更新の重みを使ったかは PC のキャッシュで確認する(4章)。

## 3. ライセンスと商用利用

| 対象 | ライセンス | 商用利用 |
|---|---|---|
| Audio Studio MCP 本体 | MIT | 可(コード部分)。KanaWorks のロゴ・キャラ画像は MIT の対象外 |
| Stable Audio 3 の動かすプログラム | MIT | 可 |
| Stable Audio 3 の重み(モデル本体) | Stability AI Community License(2024-07-05 版) | 条件付きで可(下記) |
| T5Gemma(文章を読む部品) | Gemma Terms of Use(2026-04-01 更新) | 禁止された使い方をしなければ可。Google は生成物の権利を主張しない(3.3項) |

Stability AI Community License の要点(公式文面より):

- **売上上限**: 利用者と関連会社の年間売上の合計が **100 万米ドル**を超えると、ライセンスはその時点で終わる。
  超える場合は Stability AI に別のライセンス(Enterprise)を申し込む。売上は AI に関係のない分も含めて数える。
- **登録**: 商用目的で使う場合は stability.ai/community-license で **登録が必要**。登録が無料か、アカウントが要るかは**未確認**。
- **生成物の権利**: 生成した音は、法律で認められる範囲で利用者のもの(4(c)(iii))。生成物は「派生物」に含まれない。
- **表示義務**: モデルそのものや、それを使う製品・サービスを他人に配る場合は「Powered by Stability AI」の表示などが要る。
  生成した音を入れた CM を納品するだけでこの表示が要るかは、文面からははっきりせず**未確認**。
- **利用規約(AUP)**: Stability AI の利用規約(stability.ai/use-policy)を守ること。
- **注意点**: Hugging Face のダウンロード画面で同意する文面のリンク先が、別モデル(stable-audio-open-1.0)の
  ライセンスになっている。中身が同じ Community License かどうかは**未確認**。PC で同意済みの内容を利用者が確認する。
- **未確認**: 広告主(依頼主)の売上も数えるのか、制作者だけを数えるのか。制作会社が作って納品する場合の扱いは文面に無い。
- 学習データは「ライセンス取得済みの音源(AudioSparx)と Creative Commons の音源(Freesound)」とモデルページにある。
  生成物が既存の曲に似てしまわないことまでは保証されていない(**未確認**)。

出典(いずれも 2026-10-28 確認):
- https://huggingface.co/stabilityai/stable-audio-3-medium と同ページの LICENSE.md
- https://huggingface.co/stabilityai/stable-audio-3-small-music
- https://huggingface.co/stabilityai/stable-audio-3-optimized
- https://stability.ai/community-license-agreement
- https://stability.ai/license
- https://ai.google.dev/gemma/terms
- Audio Studio MCP の README.ja.md(FAQ「生成した音声は商用利用できますか？」とライセンスの章)

## 4. PC の要件と生成時間の目安

- Windows 10/11(64 ビット)、**NVIDIA の GPU で VRAM(GPU のメモリ)8 GB 以上**。RTX 3060 12 GB で動作確認済み(README)。
- ディスク: モデルと PyTorch で約 14 GB(medium のみ)。小型 2 種も入れるとさらに約 7 GB。
- PC 本体のメモリ(RAM)と CPU の要件は README に**記載なし**。GPU が無いと medium は「とても遅い」(プログラムの警告文)。
- VRAM の使用量: RTX 3060 で medium のピークが約 5.3 GB(README)。

生成時間(README にある RTX 3060 12 GB + medium の実測。利用者の GPU では変わる):

| 内容 | 時間 |
|---|---|
| 最初の 1 回(モデル読み込み約 20 秒を含む)、3 秒の効果音 × 2 | 約 25 秒 |
| 読み込み後、20 秒の音楽 | 約 1.3 秒 |
| 読み込み後、380 秒(最大)の音楽 | 約 15 秒 |
| `sm-music`、15 秒の音楽 | 約 0.7 秒 |

推測: 15〜30 秒の CM なら、候補を 4 つずつ作っても 1 回あたり数秒〜十数秒で済むと思われる(実測ではない)。

## 5. PC で、導入済みの物をそのまま使う手順

前提: Audio Studio MCP は PC に導入済みで、モデルもダウンロード済み。**インストーラー(install.ps1)は再実行しない**。
ログイン操作やトークン(合言葉)の入力もしない。

1. **登録の確認**(PowerShell かターミナルで)
   - `claude mcp list` で `audio-studio` が一覧にあり、接続できている(✓ など)ことを見る。
   - `claude mcp get audio-studio` で、起動するファイル(`...\.venv\Scripts\audio-studio-mcp.exe`)の場所と、
     設定された環境変数(`AUDIO_STUDIO_SA3_MODEL`、`AUDIO_STUDIO_OUTPUT_DIR` など)を書き留める。
   - 一覧に無い場合だけ、上の exe の場所を確かめて `claude mcp add --scope user audio-studio -- "<exe の場所>"` で登録し直す。
2. **モデルのキャッシュ(保存場所)の確認** — 再ダウンロードを防ぐため
   - 既定の場所は `C:\Users\<ユーザー名>\.cache\huggingface\hub`。環境変数 `HF_HOME` か `HF_HUB_CACHE` が
     設定されていればそちら。PowerShell で `$env:HF_HOME`、`$env:HF_HUB_CACHE` を表示して確認する。
   - その中に `models--stabilityai--stable-audio-3-medium` などのフォルダがあれば導入済み。
     `<導入先>\.venv\Scripts\hf.exe cache ls`(版によっては `cache scan`)で、大きさと版(コミット)も見られる。
   - **キャッシュのフォルダを消す・移す、`HF_HOME` を変える、`vendor\` を消す、は再ダウンロードの原因になるのでしない。**
   - 必要なら登録に `-e HF_HUB_OFFLINE=1` を付けると、ネットに取りに行かずキャッシュだけを使う
     (Hugging Face の標準の設定。キャッシュが欠けていればエラーで止まるので、それで気づける)。
3. **複数のモデルを同時に動かさない**
   - Claude Code の会話(セッション)ごとに別の Audio Studio が起動し、それぞれがモデルを読み込む。
     **D の作業は 1 つのセッションだけで行う。** Web 画面(`--web`)と Claude Code の登録を同時に別々に動かさない。
   - モデル(medium / sm-music / sm-sfx)を切り替える時は、先に `unload_models` ツールでメモリを空けてから。
4. **メモリ不足の時**(エラーに `out of memory` / `CUDA` が出る、PC が極端に重い)
   - `unload_models` を頼む → 他の GPU を使うソフト(動画編集、ゲーム、ブラウザの重いタブ)を閉じる。
   - `nvidia-smi` で VRAM の空きを見る。それでも足りなければ、小型の `sm-music` / `sm-sfx` に切り替える
     (切り替えは `AUDIO_STUDIO_SA3_MODEL` の設定。そのモデルが未ダウンロードなら切り替えない)。
   - 長さ(秒数)と候補の数(`variations`)を減らす。`cfg` を上げると遅く重くなるので既定(1.0)のままにする。

## 6. 生成記録のチェックリスト(PC で確認)

記録ファイル `C:/Users/ITEC/Documents/ChatGPT/codex育成/codex-cm-20261020/v2-audio-studio/audio/generation_calls.json`
はクラウドから読めない。PC で利用者、または PC の Claude Code が次を確かめる。
Audio Studio は音のファイルごとに同じ名前の `.json`(プロンプト・seed・設定)を出力フォルダに残すので、それと突き合わせる。

- [ ] 使ったモデル名(`medium` / `sm-music` / `sm-sfx`)と、`.json` の `backend`(`sa3-torch`)・`model` の値
- [ ] 重みの版: キャッシュにある版(コミット)を書き留めたか(`.json` には残らない)
- [ ] 各生成のプロンプト(`prompt` と、実際に使った `prompt_used`)、`seed`、長さ(`seconds`)、`steps`・`cfg`、候補番号
- [ ] 出力ファイルの場所と名前。記録にある全ファイルが実在し、記録に無いファイルが CM に混ざっていないか
- [ ] 後処理(ループ化・音量調整・書き出し)をしたファイルは、元の生成記録(`source`)までたどれるか
- [ ] 歌声・人の声・既存の曲名やアーティスト名をプロンプトに使っていないか
- [ ] ライセンス上の扱い: Hugging Face で同意したライセンスの文面と日付、Stability AI への登録の有無
- [ ] 商用に使えるか判断できる情報が揃っているか: 年間売上が 100 万米ドル未満か(関連会社込み)、
      広告主・納品先の条件、「Powered by Stability AI」表示の要否 — 1 つでも不明なら「商用不可(比較用のみ)」と記録する
- [ ] AI 生成の音がどの場面のどの音か(BGM / 効果音)を一覧にし、他の素材(条件 A/B/C の音)と区別できるか

## 7. D を作る時の進め方

1. 条件 A/B/C と **同じ映像の書き出し**(同じ尺・同じカット)を使う。映像は変えない。
2. AI 生成の音は「併用」: 既存の音の足りない所(つなぎの効果音、短い BGM の差し替え候補など)にだけ入れる。
   生成ごとに 6章の記録を残す。
3. 仕上げの音量は A/B/C と **同じラウドネス条件**(同じ目標 LUFS = 聞こえの大きさの基準と、同じピーク上限)にそろえる。
   条件の数値はリポジトリ `docs/sound-upgrade/` の他の文書の取り決めに合わせる。
4. 試聴は **名前を伏せて**行う: ファイル名を「1〜4」などに付け替え、どれが D か分からない状態で聞き比べる。
   対応表は試聴が終わるまで別に保管する。
5. 結果が良くても、3章の条件を満たし 6章のチェックがすべて埋まるまでは、D の音を納品用の CM に入れない。

## 8. 第3ラウンドで実際に使った生成物とライセンスの事実(2026-10-29 追記。§1〜§7 は変えていない)
- 使った生成物: `docs/sound-upgrade/audio_studio_pc/D1.wav`〜`D4.wav`(各 15.000 s、44.1 kHz、24 bit、ステレオ)。PC で生成し、枝 `pc/audio-studio-bgm`(af4a341)から取り込んだ。
- モデルと版(`audio_studio_pc/generation_log.json` の記録のまま): `"model": "sm-music + same-s"`、`"backend": "sa3-torch"`(CPU)、`"steps": 8`、`"cfg": 1.0`、`"sample_rate": 44100`、シード D1 9601 / D2 9711 / D3 9722 / D4 9732。`REPORT.md` の記載: 「Stable Audio 3 の小型音楽モデル(`sm-music`)」。重みのファイルの版(コミット・ハッシュ)は記録に無い(**未確認**)。
- ライセンス: モデルの重みは **Stability AI Community License**。条件は目的で分かれる(非商用は上限・登録なし、商用の目的は登録が要り年間売上 100 万米ドル超で終了)。詳しくは下の「§8 の追記」。PC 側は 2026-10-29 に Hugging Face のモデルページを再確認できなかった(ログインが要るため。`REPORT.md` §2)。
- 扱い: **生成物は社内の比較試聴用。商用に使う前に条件を確認**(売上の条件・登録・表示の要否)。利用者は「販売しない・社内または個人の比較のため」として、この使い方を了承している(2026-10-29)。
- 使った所: 第3ラウンドの比較パック `docs/sound-upgrade/compare_round3/`(5 本のうち 4 本の BGM)。どの記号かは `answer_key/ANSWER_KEY_ROUND3.md`。納品用の動画には入れていない。
- こちらで加えた処理(生成物の中身は変えていない): 48 kHz への変換、音量の調整(-14 LUFS)、効果音の瞬間の低域・中域の一瞬の下げ(上限 -6 dB)、終わりの短いフェード、比較パックのリミッター(-2.3 dBTP)と AAC 化。

### §8 の追記(2026-10-29、第3ラウンドの独立レビューを受けて)
- **公開の状態(事実)**: このリポジトリ(`y-tst-i/codeX`)は公開(GitHub の visibility: public、2026-10-29 に API で確認)。生成物(`docs/sound-upgrade/audio_studio_pc/D1.wav`〜`D4.wav`)と、それを使った比較パック(`docs/sound-upgrade/compare_round3/`)も、公開の場所に置かれている。移す・消すかは利用者が決める(こちらでは動かしていない)。
- **ライセンスの範囲(Stability AI Community License Agreement、文面の版「Last Updated: July 5, 2024」、出典 https://stability.ai/community-license-agreement 、2026-10-29 確認)**:
  - 非商用の目的(Non-Commercial Purpose。文面の例: 個人の趣味での利用、評価・試験 "evaluation and testing")は、売上の上限も登録も無い。
  - 商用の目的(Commercial Purpose。文面では「自分の事業や組織の内部業務(internal operations)」も含む)は、Stability AI への登録が要る。利用者と関連会社の年間売上が 100 万米ドルを超えると、ライセンスは終わる(続けるには Stability AI に別のライセンスを申し込む)。
  - 今回の比較が会社の業務(CM の制作)のための物なら、商用の目的に当たり得る。どちらに当たるかの判断は利用者に任せる。
- **ほかの条件(§3 を参照)**: 文章を読む部品 T5Gemma は Gemma Terms of Use。Stability AI の利用規約(AUP、https://stability.ai/use-policy )を守ること。
- **記録で分からない事**: `generation_log.json` の `"model": "sm-music + same-s"` の `same-s` が何か(部品の名前・版)は**未確認**。
