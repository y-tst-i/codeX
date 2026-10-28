# 採用元と監査

確認日: 2026-10-27。

## 公開資料

- [DirectorSKILL](https://github.com/wuwangzhang1216/DirectorSKILL/tree/c65ae0d14457053efb1e354c7e7f7e120d97fad1), MIT, copyright 2026 wangzhang-wu。カットの物語上の役割、ビート、音響計画、編集のIN/OUT、連続性と修正の考え方を参照。
- [Video Editing Skills](https://github.com/gitethanwoo/video-editing/tree/166eed9b1f391af5201a37057924593bf8f413d4), MIT。観察・計測・解釈の分離、素材と出力の時間軸の区別、候補出力の検証・昇格、FFmpeg/Remotionの使い分けを参照。

この統合スキルは独自の短いルーター、参照文書、標準ライブラリの検証ヘルパーで構成する。上流を全面登録して同名のCapCut編集スキルと競合させない。上流の固定コピーと静的監査結果は導入作業のパッケージに保管する。

## 採用しない実行経路

- `audio_listener.py` は `--prepare-only` なしでGeminiへ音声を送るため、このパッケージには含めない。
- 上流の `transcribe` はmlx_whisperを使うため、Windowsの既定経路にしない。
- Remotionテンプレートの依存インストール、外部素材取得、生成APIは自動では行わない。
- 任意FFmpegプランを未検査で実行しない。素材と出力を同じパスにせず、出力を案件の作業領域へ置く。

これらは上流に悪意があるという判定ではなく、現在の環境と素材・費用の許可に合わせた採用範囲である。GitHubの人気やREADMEの品質表現を、実制作で検証した結果と取り違えない。
