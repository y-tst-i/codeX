---
name: direct-cinematic-video
description: "Direct and finish footage-based films, event recaps, recruitment films, and mixed media videos when the user asks for professional storytelling, sound, color, or delivery quality. Builds an executable edit and verifies the rendered result. Use existing footage and the user's chosen editor. Excludes simple trims, caption-only fixes, and research or installation requests without production authorization."
---

# 映像ディレクションと仕上げ

素材を並べる作業から、観客に伝える変化を設計する作業へ進める。効果の数や「映画風」という形容詞を品質の根拠にしない。

## 最初に決めること

会話から用途、観客、見終えた後の行動・感情、尺、媒体、必須コピー、元素材、予算と公開範囲を取り出す。任された判断は実行し、結果を変える必須情報だけ確認する。導入・調査だけの依頼で既存動画を作り直さない。

このプロジェクトに `motion-system/CODEX_MOTION_MASTER.md` があれば、該当フェーズの制作・QA基準を優先する。別の似た品質採点規則を重ねない。

## 編集環境を保つ

- CapCut指定ならCapCutプラグインの編集・アップロード・課金・カード・ドラフト管理の手順を使う。このスキルは演出判断を加えるもので、プロバイダーを切り替える許可ではない。
- ローカル編集が選ばれていればFFmpeg、既存Remotion、既存Blenderなどから表現に合うものを使う。基本編集に新しいフレームワークを追加しない。
- CapCut等の書き出し後に、依頼された音量・音声レート・納品形式へローカルで整える場合、アプリ内ドラフトと仕上げ済みMP4を別物として明示する。元の完成版を上書きしない。
- 私有素材を既に送信したサービスへの許可を、別の音声分析・生成サービスへの送信許可に拡張しない。
- 料金条件はユーザーの指定を維持する。予算未確認のAPI呼び出し、キー探索、無断の依存追加をしない。
- 無料指定では、編集・素材・書き出しそれぞれの適用条件を確認する。過去に購入操作がなかったことを、今回の無料資格の証明にしない。クレジット消費やPro要求が出た場合は既存許可の予算内か確認し、範囲外なら止める。
- 既存クラウドドラフトも保持対象に含める。コピー・インポートでは素材の参照と変換による欠落を確認し、旧ドラフトへ勝手に結び付けない。クラウド保存成功と新しいMP4の書き出し・取得・検証を別ゲートにする。

## 必要な深さで進める

構成を変える制作では [演出・編集](references/direction-and-editing.md) を読み、以下を一つの編集計画にまとめる。

構成を維持して音・色・納品仕様だけを整える場合も [音・色・納品](references/sound-color-delivery.md) を読む。まず現在の成果物を確認し、実際の欠陥を特定してから差分を決める。

1. **素材事実**：実際の画、動作、向き、録音、品質、似たカット。観察・計測・解釈を混ぜない。
2. **ビート**：各章で何が変わるか。導入、証拠、動作、反応、余韻の役割を素材に割り当てる。記録映像に架空の葛藤や社員の感情を足さない。
3. **選択とつなぎ**：出力時間と元素材のIN/OUTを別々に記録。動作を完結させ、同じ構図の反復は理由がある場合だけ使う。
4. **画と文字**：主役、トリミング、安全域、書体、余白、明るさ・肌色の整合。ロゴや顔を作り替えず、縦素材を横へ伸ばさない。
5. **音と仕上げ**：[音・色・納品](references/sound-color-delivery.md) を使い、会話、会場音、拍手、BGMの役割と切り替えを決める。プラットフォーム指定がない音量を、普遍的な規格として断定しない。

動きの演出を任されている場合は [motion-prompt](../motion-prompt/SKILL.md) のギャラリー優先方針で参照を選び、ユーザーが選んだ参照や既承認の場面を保つ。モーション主体の製品CM・SaaS紹介は [business-motion-film](../business-motion-film/SKILL.md) を主手順とする。実写主体の作品では本スキルを主手順にし、必要なCM技法だけ借りる。混合作品でも編集計画と検証記録は一組にまとめる。

代表画面と音声区間を先に確認し、修正できる問題を直してからマスターを書き出す。企画書やコンタクトシートを完成動画として納品しない。

## 実際の納品を確認する

- 実MP4、編集元・計画、必要な音声や画像、検証レポート、SHA-256、制約を一組で保持する。
- `scripts/media_check.py` はローカルファイルの実ストリーム、全編デコード、指定した仕様、ラウドネスを検証する。Python標準ライブラリとFFmpeg/FFprobeだけを使い、外部へ送信しない。
- 音量・レートの整備には `scripts/conform_audio.py input.mp4 new.mp4 --work-dir review/conform --lufs -16 --true-peak -1.5 --rate 48000 --duration 90` のように案件の値を明示する。二段階計測、再測定、映像パケットの同一性を検証してから新規出力へ昇格する。入力と既存出力は上書きしない。これはミックスの聴感を保証しない。
- 寸法、FPS、尺、音声レート、LUFS等はその案件の納品仕様を引数に渡す。無指定の項目に自動の正解を置かない。出力の `technical_pass` は画や音の主観評価を証明しない。
- 実際の書き出しを通常速度で再生し、重要な動作・全境界・文字・色を確認する。音を含む品質が求められる場合は音声試聴も行う。メーター、波形、ASR、再生完了ログを試聴の代わりにしない。
- 独立レビューではbriefと生の出力・証拠を渡し、実装意図や「良くなった」という誘導を渡さない。具体的な欠陥と位置を求める。
- 聴感等を確認できなければその検収は未完了とする。技術検証や自己採点の成功で、映画品質や全項目PASSと呼ばない。
- Motion OSの視覚PASSと、音を含む総合検収を分ける。前回制作の修正回数を新しく依頼された改訂の禁止理由にせず、今回の変更範囲と修正履歴を別に管理する。

例（案件で1080p/30fps/90秒/48kHz/−16 LUFSを選んだ場合）:

```text
python scripts/media_check.py final.mp4 --report review/technical.json --width 1920 --height 1080 --fps 30 --duration 90 --audio-rate 48000 --lufs -16 --true-peak -1.5
```

Windowsでは既存の実Pythonを使い、WindowsAppsの起動エイリアスを実体と誤認しない。FFmpegが見つからない場合は既存環境を調べる。プロジェクトに `project/motion-local-tools/Enter-Motion.ps1` が実在する場合だけ利用し、別の作業フォルダにも存在すると仮定しない。

## 導入元と制約

[採用元と監査](references/provenance.md) に固定コミットと採用範囲を記録している。上流のGemini音声送信、Apple Silicon専用文字起こし、Remotion依存の自動導入は、この統合スキルの実行経路に含めない。必要になった場合は、その時点の利用環境・費用・素材送信範囲で判断する。
