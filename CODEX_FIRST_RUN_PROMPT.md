# ISLAND 7｜Codex 初回実装指示

あなたはISLAND 7のα版実装担当です。

このリポジトリ／作業フォルダには、以下のファイルがあります。

- `START_HERE.md`
- `ISLAND7_MASTER.md`
- `ISLAND7_GAME_DATA.json`
- `ISLAND7_CODEX_HANDOFF.md`
- `ISLAND7_TECH_IMPLEMENTATION_GUIDE_v1.0.md`

## 1. 最初に読む順番

まず以下をすべて読み、コードを書く前に仕様を理解してください。

1. `START_HERE.md`
2. `ISLAND7_MASTER.md`
3. `ISLAND7_GAME_DATA.json`
4. `ISLAND7_CODEX_HANDOFF.md`
5. `ISLAND7_TECH_IMPLEMENTATION_GUIDE_v1.0.md`

技術ガイドは、上位3つの仕様正本を上書きしません。

## 2. 仕様ファイルは編集禁止

以下5ファイルは、この作業では編集しないでください。

- `START_HERE.md`
- `ISLAND7_MASTER.md`
- `ISLAND7_GAME_DATA.json`
- `ISLAND7_CODEX_HANDOFF.md`
- `ISLAND7_TECH_IMPLEMENTATION_GUIDE_v1.0.md`

不足・矛盾・実装不能点を見つけても、勝手に修正しないでください。

## 3. まずSPEC_CONFLICTチェック

コード作成前に、3つの仕様正本を横断して矛盾を確認してください。

同一意味の項目に矛盾がある場合は、

`SPEC_CONFLICT`

として、

- ファイル名
- 該当セクション
- 衝突内容
- 実装への影響

を報告し、その項目の確定実装を止めてください。

矛盾がなければ、

`SPEC_CONFLICT: NONE`

と明記してください。

## 4. 技術基盤

HANDOFFと技術ガイドに従い、α版の基本構成は以下です。

- Node.js LTS
- TypeScript
- React
- Vite
- Express
- Socket.IO / socket.io-client
- SQLite
- better-sqlite3
- Zod
- Vitest
- Playwright

既成ゲームエンジンは導入しないでください。

以下はαでは追加しません。

- boardgame.io
- VirtualTabletop
- PartyServer
- Phaser
- Tauri
- XState
- Colyseus
- Nakama
- Redis
- PostgreSQL
- 大型UIフレームワーク
- AI機能

## 5. 依存バージョン

実装開始時点の安定版と互換性を確認してください。

特にNodeはLTSを選択し、Vite公式React TypeScript scaffoldとの互換性を確認してください。

`latest`や`^`に任せず、動作確認した正確なバージョンへ固定してください。

必須成果：
- `package.json`
- `package-lock.json`
- `.node-version` または同等
- `VERSIONS.md`

`VERSIONS.md`には、
- 確定日
- Node
- npm
- React
- React DOM
- TypeScript
- Vite
- Express
- Socket.IO
- socket.io-client
- better-sqlite3
- Zod
- Vitest
- Playwright
を記録してください。

## 6. 実装原則

### Server Authoritative
GameStateの正本はサーバーのみ。

クライアントで、
- HP
- 能力
- 資材
- ダメージ
- 勝敗
- 合法行動
を確定計算しないでください。

### 情報境界
raw GameStateをSocket.IOで配信しないでください。

必ず概念として、

- `toHostView`
- `toScreenView`
- `toTeamView`

のようなrole別projectionを通してください。

相手チームに見せてはいけない情報は、DOMで隠すのではなくpayloadへ含めないでください。

### Room
Socket.IO roomは配信先として使います。

ただしroom membershipだけを権限根拠にせず、接続時にadminToken / teamCodeをサーバー側で検証してください。

### 再接続
Socket.IOのrecovery機能だけに依存しないでください。

再接続時は必ずサーバー最新GameStateからrole別viewを再取得し、現在stateIdの画面を再構築してください。

## 7. GAME_DATA

`ISLAND7_GAME_DATA.json`はゲーム数値の実装正本です。

まずZod Schemaを作成し、起動時にparseしてください。

不正ならfail fastしてください。

ゲーム数値をTypeScriptへ重複直書きしないでください。

## 8. 最初のマイルストーン以外を作り込まない

今回の実装範囲は、

**GATE 0 → GATE 1 → GATE 2**

までです。

### GATE 0
- 全仕様を読む
- SPEC_CONFLICT確認
- 技術バージョン固定
- GAME_DATA Schema
- README
- lockfile

### GATE 1
UIなしでGame Engineを完成させる。

最低：
- create game
- seed
- 0〜8日目のstateId
- legal actions
- products
- GRC
- day2/day3/day4/day5/day6 events
- typhoon
- final 4 phases
- emergency install
- scoring
- snapshots
- undo
- Vitest

HANDOFFの単体テスト・受入テストをすべて実装してください。

### GATE 2
`/host`だけで、ファシリ1人が0日目から8日目まで完走できるようにしてください。

最低：
- game作成
- チーム設定
- 進行
- 回答代理入力
- 締切
- 結果確定
- 次へ
- pause
- undo
- manual correction
- save/reload
- server restart後の復旧

## 9. 今回まだ作り込まないもの

この初回作業では、

- `/screen/:gameId` の完成
- `/team/:gameId/:teamCode` の完成
- 本番演出
- 完成デザイン
- 製品画像
- BGM
- 高度アニメーション

へ進まないでください。

必要ならroute placeholderだけ作ってもよいですが、GATE 2を優先してください。

## 10. 開発構成

単一Node HTTPサーバーを推奨します。

- Express
- Socket.IO
- React/Vite

を同一originで扱ってください。

開発時はVite middleware modeを利用しても構いません。

production buildでは、Vite build済み静的ファイルをExpressから配信できる構造にしてください。

## 11. SQLite

最低限、
- current game state
- snapshots
- audit logs

を保持してください。

state更新とsnapshot保存はtransactionで整合させてください。

undoは部分修正ではなくGameState全体復元です。

## 12. 二重操作対策

ゲームルールを変えずに、技術的な事故防止を入れてください。

推奨：
- monotonic `revision`
- `commandId`
- stale revision reject
- duplicate command idempotency

これらは内部技術フィールドとして扱い、参加者向けルールへ露出させないでください。

## 13. テスト

Vitestを優先してGATE 1/GATE 2を固めてください。

Playwrightの本格4画面E2Eは後続GATE 3ですが、後で実装しやすい構造にしてください。

Game EngineをReact・Socket.IO・SQLiteへ密結合しないでください。

## 14. 禁止

- Codex判断でゲーム数値を変更しない
- Codex判断でルールを簡略化しない
- Codex判断でイベントを削除・追加しない
- 非公開情報をraw stateのまま配信しない
- client stateを正本にしない
- timeoutだけで自動進行しない
- undoを差分巻き戻しにしない
- 本番デザインへ先に時間を使わない
- 仕様ファイルを勝手に編集しない

## 15. この作業の終了条件

GATE 2まで実装し、以下をすべて実行してください。

```text
npm ci
npm run test
npm run build
```

可能ならhost-onlyの通し自動テスト／スモークテストも実行してください。

その後、作業を止めて次を報告してください。

1. `SPEC_CONFLICT` の結果
2. 確定した依存バージョン
3. 実装したファイル一覧
4. Game Engineの構成
5. Hostで0〜8日目を完走できることの確認方法
6. 実行したテストと結果
7. 未解決TODO
8. GATE 3へ進む前に人間が確認すべき点

**GATE 2の確認前に、勝手にGATE 3以降へ進まないでください。**
