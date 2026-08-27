# アイランド7

ISLAND 7のCodex実装開始用リポジトリです。

## 現在の状態

- 正本パッケージ：`ISLAND7_CODEX_FINAL_v0.30.1_TECH_v1.0.zip`
- ゲームデータ版：`0.30.1`
- ゲーム設計版：`0.30`
- 現在は仕様・技術資料のみで、ソースコード、テスト、`package.json`、`package-lock.json`はまだありません。
- 正本ファイルは受領時の内容から変更していません。

## 最初に読むファイル

1. `START_HERE.md`
2. `ISLAND7_MASTER.md`
3. `ISLAND7_GAME_DATA.json`
4. `ISLAND7_CODEX_HANDOFF.md`
5. `ISLAND7_TECH_IMPLEMENTATION_GUIDE_v1.0.md`

仕様の優先順位と矛盾時の対応は、上記ファイルに記載された正本ルールに従ってください。

## 別PCでの再開

```powershell
git clone https://github.com/y-tst-i/codex.git
cd codex
```

クローン後、`START_HERE.md`から順番に確認してください。実装開始後は、依存関係の固定ファイル、ソースコード、テスト、起動・検証コマンドをこのREADMEへ追記します。
