# アイランド7

ISLAND 7のCodex α版実装リポジトリです。

## 現在の到達点

- `SPEC_CONFLICT: NONE`
- GATE 0：完了
- GATE 1（ゲームエンジン）：完了
- GATE 2（進行管理画面だけで完走）：完了
- GATE 3（共有画面・チーム画面・4画面同期）：未着手

正本5ファイルは受領時から変更していません。現在の詳しい実装状況は`開発状況.md`を確認してください。

## 最初に読むファイル

1. `START_HERE.md`
2. `ISLAND7_MASTER.md`
3. `ISLAND7_GAME_DATA.json`
4. `ISLAND7_CODEX_HANDOFF.md`
5. `ISLAND7_TECH_IMPLEMENTATION_GUIDE_v1.0.md`

ゲーム仕様・数値・技術挙動は、上記の正本ルールに従います。

## 必要環境

- Node.js 24.16.0 LTS
- npm 11.13.0

採用ライブラリの固定版は`VERSIONS.md`、依存の完全固定は`package-lock.json`を正とします。

## 初回起動

```powershell
npm ci
npm run dev
```

ブラウザで次を開きます。

```text
http://localhost:4173/host
```

ゲーム作成時に同じブラウザへ保存される管理トークンと、画面に表示される参加コードは、外部へ公開しないでください。進行管理画面の再読込には、そのブラウザのローカル保存情報を使用します。

## 検証コマンド

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm start
```

`npm start`は本番ビルド後の`dist`をExpressから配信します。標準ポートは4173です。

## 実装構成

```text
src/
  shared/                 型・GAME_DATA Schema・表示名
  server/
    game-engine/          決定論的ゲームエンジン・合法行動・role別view
    persistence/          SQLite・snapshot・audit・command log
    game-service.ts       認証・revision・command処理
    server.ts             Express・Socket.IO・API
  web/                    React進行管理画面
tests/                    受入・情報境界・保存復旧・HTTP統合テスト
```

ゲーム状態の正本はサーバーだけです。クライアントへはrole別viewを送り、raw GameStateは共有画面・チーム画面へ送信しません。

## 保存と復旧

- 開発時DB：`data/island7.sqlite`
- 現在状態、全状態snapshot、監査ログ、command重複防止ログをSQLiteへ保存
- 一手戻しは差分操作ではなくGameState全体を復元
- 再起動後はSQLiteの最新状態を読込
- `.env`、SQLite、`node_modules`、`dist`、テスト生成物はGit対象外

## 公開方法

αテストで外部端末から確認する場合だけ、一時的なHTTPS Quick Tunnelを使用できます。Quick Tunnelは本番経路には使用しません。本番公開方式はαテスト完了後に決定します。

## 次の作業

GATE 2の人間確認後に一度止めます。承認後、GATE 3として次を実装します。

1. `/screen/:gameId`
2. `/team/:gameId/:teamCode`
3. チーム別Socket.IO roomと回答送信
4. 4つの独立BrowserContextによるPlaywright E2E
5. 非公開回答・チーム限定予報・再接続・undo同期の確認

## 同梱ツール：TikTok Motion Studio

`tiktok-studio/` は、TikTok用モーショングラフィックス動画（台本・Gemini TTSナレーション・Claude生成アニメーション・MP4書き出し）を作る独立したツールです。ゲーム本体とは依存関係を共有していません。使い方は `tiktok-studio/README.md` を参照してください。
