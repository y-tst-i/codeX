# ISLAND 7｜技術実装ガイド v1.0

**対象仕様：ISLAND 7 v0.30 / Codex HANDOFF v0.30.1**  
**調査・確定日：2026-08-27**  
**用途：Codex α実装の技術選定・OSS流用・実装品質ゲート**

---

# 0. このファイルの位置づけ

このファイルは、`ISLAND7_MASTER.md` / `ISLAND7_GAME_DATA.json` / `ISLAND7_CODEX_HANDOFF.md` を実装へつなぐための**技術実装ガイド**である。

このファイルはゲーム仕様の正本ではない。

優先順位は以下。

1. ゲーム意図・体験・フリーズ済みルール → `ISLAND7_MASTER.md`
2. ゲーム結果・合法行動へ影響する数値 → `ISLAND7_GAME_DATA.json`
3. 状態遷移・画面・通信・保存復旧・テスト → `ISLAND7_CODEX_HANDOFF.md`
4. 技術選択・OSSの使い方・実装パターン → 本ファイル

上位3ファイルと本ファイルが衝突した場合、本ファイルで上書きしない。  
HANDOFFの `SPEC_CONFLICT` ルールに従う。

---

# 1. 結論｜α版の採用構成

α版では、既成ゲームエンジンを丸ごと採用しない。

**採用：**
- Node.js 24 LTS
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

**構成：**
- 1つのNodeプロセス
- 1つのHTTPサーバー
- 1つのSocket.IOサーバー
- 1つのSQLiteファイル
- 1つのReactフロント
- `/host` / `/screen/:gameId` / `/team/:gameId/:teamCode` を同一アプリから配信
- ゲーム状態の正本は常にサーバー側
- クライアントは表示・入力のみ

理由は、ISLAND 7がリアルタイムアクションゲームではなく、**少人数・ターン制・ファシリ制御・状態同期型**だからである。

既成ボードゲームエンジンを導入するより、成熟した通信・UI・DB・テスト部品だけを使い、ISLAND 7固有のゲームエンジンを薄く実装する方が、仕様追従性・復旧性・デバッグ性を高く保てる。

---

# 2. 2026-08-27 時点の技術スナップショット

以下は調査時点の安定版確認値。  
**実装開始時にCodexが再確認し、互換性確認後に完全固定すること。**

| 項目 | 調査時点 |
|---|---|
| Node.js | 24.20.0 LTS |
| React | 19.2.8 |
| Vite | 8.2.2 |
| Express | 5.2.1 |
| Socket.IO | 4.8.3 |
| socket.io-client | 4.8.3 |
| better-sqlite3 | 13.0.3 |
| Zod | 4.4.3 |
| Vitest | 4.1.10 |
| Playwright Test | 1.62.1 |

### TypeScriptだけは「latest」を機械的に選ばない

調査時点の`typescript`最新は7.0.2だが、Vite公式React+TypeScriptテンプレートは直近までTypeScript 6.x系を採用していた。

そのため、

1. 現在の公式 `create-vite` React TypeScript テンプレートを基準にする
2. そのテンプレートが出すTypeScript / `@vitejs/plugin-react` の組み合わせでビルド確認
3. 問題なければそのバージョンを完全固定
4. α実装中にTypeScriptメジャーアップデートをしない

を推奨する。

---

# 3. GitHub / OSSから実際に流用するもの

## 3.1 Vite公式 React TypeScript scaffold

**使う。**

公式：
- https://vite.dev/guide/
- https://github.com/vitejs/vite
- https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts

用途：
- React + TypeScriptの初期構成
- Vite build
- HMR
- 静的アセット処理

開始例：

```bash
npm create vite@latest <temporary-name> -- --template react-ts
```

ただし、生成物をそのまま完成構成にせず、HANDOFFの単一リポジトリ構造へ整理する。

---

## 3.2 Socket.IO公式実装・ドキュメント

**使う。**

公式：
- https://github.com/socketio/socket.io
- https://github.com/socketio/chat-example
- https://socket.io/docs/v4/rooms/
- https://socket.io/docs/v4/emitting-events/
- https://socket.io/docs/v4/connection-state-recovery
- https://socket.io/docs/v4/middlewares/

流用する考え方：
- HTTPサーバーとSocket.IOの接続方法
- `room` による送信先分離
- acknowledgementによる送信結果確認
- middlewareによる参加コード／管理トークン検証
- 一時切断後のconnection state recovery

### 重要

Socket.IOのconnection state recoveryは**補助機能**として使う。

公式も、回復が常に成功するとは限らず、サーバーとクライアントの状態再同期処理が必要としている。

したがってISLAND 7では、再接続時に必ずサーバー最新状態から画面を再構築する。  
Socket.IOの復旧機能だけを正しさの根拠にしない。

---

## 3.3 Express公式パターン

**使う。**

公式：
- https://expressjs.com/
- https://expressjs.com/en/starter/static-files/
- https://github.com/expressjs/express

用途：
- HTTPルーティング
- 本番build済みReactアセット配信
- Host用管理APIが必要な場合の入口
- health check

本番ではExpressからVite build済みファイルを配信し、同じHTTPサーバーにSocket.IOを載せる。

---

## 3.4 Vite middleware mode

**開発時に採用推奨。**

公式：
- https://vite.dev/config/server-options
- https://vite.dev/guide/ssr.html

ViteはExpressにmiddlewareとして組み込める。

これにより開発時も、
- React
- Express
- Socket.IO

を同じorigin / 同じHTTPサーバーで扱いやすい。

CORS・ポート・WebSocket proxyの余計な複雑さを増やさないことを優先する。

---

## 3.5 Playwright

**必須。**

公式：
- https://playwright.dev/docs/browser-contexts
- https://playwright.dev/docs/browsers
- https://github.com/microsoft/playwright

Playwrightは1テスト内で複数の独立BrowserContextを持てる。

ISLAND 7では、

- Host
- Screen
- Team A
- Team B

を4つの独立contextとして扱う。

これはHANDOFFの4画面E2Eと直接一致する。

---

## 3.6 Cloudflare Tunnel

**αの外部接続確認だけで使用可。**

公式：
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- https://developers.cloudflare.com/tunnel/setup/

Quick Tunnel：

```bash
cloudflared tunnel --url http://localhost:<PORT>
```

ただしCloudflare公式がQuick Tunnelをテスト・開発用途としているため、**本番経路には採用しない。**

本番候補は、
- 固定ホスト名の通常Cloudflare Tunnel
- 永続ディスクを持つ単一VM / コンテナ

のどちらかをα後に判断する。

---

# 4. 今回「丸ごと使わない」OSS

## 4.1 boardgame.io

URL：
- https://github.com/boardgameio/boardgame.io
- https://www.npmjs.com/package/boardgame.io

評価：
- ターン制
- Game State
- Phase
- Multiplayer
- Log

という概念はISLAND 7と非常に近い。

しかし調査時点のnpm安定版は `0.50.2` で、公開から約4年経過している。GitHub開発は2026年にも動いているが、npm安定リリースとの距離が大きい。

**結論：**
- 設計思想の参考にはする
- α版の中核依存にはしない

---

## 4.2 VirtualTabletop.io

URL：
- https://github.com/ArnoldSmith86/virtualtabletop

評価：
- 無料
- OSS
- セルフホスト可能
- ブラウザマルチプレイ
- カード／トークン表現に強い

一方、
- 独自JSON / Routine構造へ寄る
- ISLAND 7固有の状態遷移・権限・復旧仕様との接続に余分な翻訳層が生まれる
- GPLv3

**結論：**
- アイデア検証ツールとしては優秀
- 完成α版のコードベースにはしない

---

## 4.3 PartyServer / PartySocket

URL：
- https://github.com/cloudflare/partykit

調査時点でも活発に更新されている。

クラウドネイティブ化する場合は有力だが、現在のα要件は、
- ファシリPC起動
- SQLite
- 単一サーバー
- ローカル復旧

が明確。

**結論：**
αで採用しない。  
α後に「クラウド常設化」が必要になった場合の再検討候補。

---

## 4.4 Phaser / Tauri / Colyseus / Nakama

αでは採用しない。

- Phaser：共有画面の高度演出が必要になった本番版でのみ再検討
- Tauri：Hostをネイティブアプリ化したい場合のみ再検討
- Colyseus / Nakama：今回の最大8名・ターン制用途には過剰

**必要になるまで依存を増やさない。**

---

# 5. 推奨アーキテクチャ

```text
参加者ブラウザ
  Team A ─┐
  Team B ─┼──────────────┐
          │              │
Zoom共有  Screen ────────┤
                         ▼
                    Express HTTP
                         +
                     Socket.IO
                         │
                         ▼
                 Application Layer
                 Command Handlers
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       Game Engine             View Projector
     pure / deterministic     Host/Screen/Team
              │
              ▼
        GameState正本
              │
              ▼
        Persistence Layer
          SQLite
      current + snapshots
      audit + event log
```

---

# 6. 最重要設計原則

## 6.1 Server Authoritative

`GameState`はサーバーだけが保持・計算する。

クライアント側で以下を計算しない。
- HP
- 能力
- 資材
- 製品効果
- ダメージ
- 勝敗
- 合法行動

クライアントは、
- サーバーが許可した選択肢を表示
- 回答を送信
- サーバーから返った状態を表示

だけにする。

---

## 6.2 Raw GameStateをSocketへ流さない

これが情報漏洩防止の中核。

以下のprojection関数を必ず分離する。

```ts
toHostView(gameState)
toScreenView(gameState)
toTeamView(gameState, teamId)
```

Socket送信直前に必ずprojectionする。

**禁止：**

```ts
io.emit("state", gameState)
```

Team Aに送る状態を作る際、Team Bの非公開情報を「画面で非表示」にするだけでは不十分。

**そもそもpayloadへ含めない。**

---

## 6.3 Roomは配信先、権限はサーバー検証

推奨room：

```text
game:<gameId>:host
game:<gameId>:screen
game:<gameId>:team:A
game:<gameId>:team:B
```

ただし、roomに入っていること自体を権限根拠にしない。

接続時に、
- gameId
- role
- teamCode または adminToken

をサーバーで検証し、成功したsocketだけjoinさせる。

---

## 6.4 Command方式

クライアントがGameStateを書き換えるpayloadを送らない。

例：

```text
submitAnswer
lockAnswers
commitResult
advanceState
undoLastCommit
manualCorrection
```

のような**意図**を送る。

サーバーは、
1. 現在stateId
2. 権限
3. 合法性
4. GAME_DATA
5. HANDOFF状態遷移

を確認してから状態を更新する。

---

## 6.5 二重押し・古い画面への対策

`GameState`に技術用の単調増加 `revision` を持たせることを推奨。

状態確定ごとに、

```text
revision += 1
```

クライアントは表示中revisionをcommandへ添える。

サーバー側で古いrevisionからの危険な更新を拒否し、最新stateを再送する。

また、確定系commandには一意な`commandId`を付け、同じcommandの再送で二重適用しない構造を推奨する。

これはゲームルールの変更ではなく、通信・誤操作耐性のための技術実装。

---

# 7. Game Engineの作り方

ゲームエンジンはReact・Socket.IO・SQLiteから切り離す。

推奨：

```text
src/
  server/
    game-engine/
      create-game.ts
      legal-actions.ts
      apply-answer.ts
      commit-result.ts
      events/
      final-typhoon/
      scoring/
      transitions/
  shared/
    game-data/
    schemas/
    types/
```

原則：
- pure functionを優先
- `Math.random()`を途中で直接呼ばない
- seedから開始時に必要な乱数結果を確定
- I/Oをゲーム計算へ混ぜない
- ゲーム定数をコードへ重複直書きしない

最初にVitestでゲームエンジンだけを完成させる。

---

# 8. GAME_DATA読み込み

起動時に `ISLAND7_GAME_DATA.json` をZodで検証する。

起動時に不正ならアプリを開始しない。

例の考え方：

```text
read JSON
→ Zod parse
→ typed immutable gameData
→ game engineへ注入
```

ゲーム計算の途中でファイルを毎回読み直さない。

テスト時は同じschemaを通したfixtureを使用する。

---

# 9. SQLite設計

最低限：

```text
games
snapshots
audit_logs
```

推奨追加：

```text
command_log
```

## games
- game_id
- current_revision
- state_id
- full_state_json
- updated_at

## snapshots
HANDOFF指定どおり、
- snapshot_id
- game_id
- sequence
- state_id
- full_state_json
- created_at

## audit_logs
- host操作
- 代理入力
- 手動修正
- undo
- state遷移

## command_log
二重適用防止用。
- command_id
- game_id
- command_type
- accepted_revision
- created_at

### SQLite方針
単一Nodeプロセス・単一SQLiteファイルを維持する。

状態変更とsnapshot保存は可能な限り同一transactionで行う。

---

# 10. Undoの実装

部分的に値を巻き戻さない。

HANDOFFどおり、

```text
直前の確定前snapshot
→ GameState全体復元
→ revision更新
→ DB保存
→ 全view再生成
→ 4画面へ再配信
```

とする。

seed・乱数結果もsnapshotに含め、一手戻し後に結果が変わらないこと。

---

# 11. Socket.IOイベント設計

イベント名は少数に保つ。

推奨概念：

```text
client → server
session:join
state:request
answer:submit
host:command

server → client
state:update
answer:ack
command:ack
error:domain
```

Host操作を十数種類のSocketイベントへ分散するより、

```ts
host:command({ type, payload, revision, commandId })
```

のようにcommand型をdiscriminated unionで管理する方法を推奨。

Socket.IOのTypeScript event型も定義する。

---

# 12. 再接続

Socket.IOの自動再接続・connection state recoveryは有効化候補。

しかし最終的な復旧フローは必ず：

```text
connect / reconnect
→ 認証再確認
→ gameId確認
→ サーバー最新GameState取得
→ role別view生成
→ 現在stateIdの画面を再構築
```

とする。

クライアントが保持していた古いGameStateをマージしない。

---

# 13. React画面構成

αではルーター依存を増やさなくてもよい。

3画面しかないため、pathnameから入口を判定する簡易構造でも成立する。

```text
/host
/screen/:gameId
/team/:gameId/:teamCode
```

React Router等を追加する場合も、必要性を説明してから依存固定する。

## UI共有
共有するもの：
- Stat表示
- HP
- 製品カード
- タイマー
- 状態バッジ
- モーダル
- エラー表示

共有しすぎないもの：
- Host専用管理パネル
- Team入力
- Screen演出

---

# 14. 4画面E2Eの実装原則

Playwrightの4つの独立BrowserContextで実施。

```text
hostContext
screenContext
teamAContext
teamBContext
```

同じcontext内の4タブではなく、**独立context**を基本とする。  
cookie / storage / sessionを分離できるため、権限漏洩テストとして強い。

必須：
- 非公開回答
- 締切後公開
- 確定反映
- Team再読み込み
- Undo全画面同期
- 代理入力
- 接続断／復帰
- Team画面のスマホviewport

テスト失敗時にtraceを残せるようPlaywright設定を行う。

---

# 15. 開発時の1ポート構成

αでは利用者の混乱を減らすため、最終的に1つのURL originへ統一することを推奨。

## 開発

Express + HTTP Server + Socket.IOを親にし、Viteをmiddleware modeで組み込む案を第一候補とする。

概念：

```ts
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

if (development) {
  const vite = await createViteServer({
    server: { middlewareMode: { server: httpServer } },
  });
  app.use(vite.middlewares);
}
```

## production build

```text
Vite build
→ dist/client
→ Express static
→ 同じHTTP serverにSocket.IO
```

これによりQuick Tunnel / 通常Tunnelで公開するポートも1つになる。

---

# 16. αで追加しない依存

原則追加しない：
- Redux / Zustand等のグローバル状態ライブラリ
- React Query
- ORM
- Redis
- PostgreSQL
- Docker必須化
- UIコンポーネント巨大ライブラリ
- Phaser
- XState
- Tauri
- boardgame.io
- PartyServer

α版で本当に必要になった場合だけ、理由をREADMEへ記録して追加する。

---

# 17. セキュリティ・事故防止

## 必須
- Host更新操作はadminTokenをサーバー検証
- Team操作はgameId + teamCodeをサーバー検証
- Screenはread-only
- raw GameStateをクライアントへ送らない
- 未確定回答を相手roomへbroadcastしない
- server logへtoken全文を不用意に出さない
- 外部入力はZod等でvalidation
- Host手動修正は確認ダイアログ＋audit log
- state変更はserver側commandのみ

## αの前提
インターネット全体へ常設公開するサービスではない。

ただし「イベント参加URLを知っている人なら何でも操作できる」実装にはしない。

---

# 18. 実装ゲート

## GATE 0｜仕様整合

完了条件：
- 4ファイルを読む
- `SPEC_CONFLICT` 0件、またはユーザー解決済み
- GAME_DATA Zod Schema
- VERSIONS.md
- lockfile
- README

未達なら機能実装しない。

---

## GATE 1｜Game Engine

完了条件：
- 0〜8日目の全状態をコードで表現
- 全製品
- 全イベント
- 3台風
- final damage
- legal actions
- snapshot
- 受入テスト
- Vitest成功

UI品質は評価しない。

---

## GATE 2｜Host Only Complete

完了条件：
- ファシリ1人
- `/host`
- 0日目→8日目
- 途中停止
- 手動修正
- 代理入力
- undo
- 再起動復旧

**ここで一度止める。**

Screen / Teamをまだ作り込まない。

---

## GATE 3｜4画面同期

完了条件：
- Screen
- Team A
- Team B
- 情報境界
- 4 BrowserContext E2E
- 再読み込み
- disconnect / reconnect

---

## GATE 4｜αリリース候補

完了条件：
- HANDOFF #35 全項目
- 本番用画像なしでも120分通し
- Quick Tunnelで遠隔端末確認
- CSVログ
- 重大バグ0

この時点で初めて人間によるαプレイテストへ進む。

---

# 19. Codexが勝手に改善してはいけない領域

以下を技術都合で変更しない。

- ゲーム数値
- 製品数
- 製品効果
- 台風必要値
- ダメージ式
- 日別イベント
- 情報公開時期
- 最終4段階
- 1日2行動
- 3画面の情報境界
- ファシリ確定方式

「実装が簡単になるから」という理由でゲームを変更しない。

技術的に実装不能・矛盾がある場合は `SPEC_CONFLICT` または技術TODOとして報告する。

---

# 20. α後の技術再評価条件

以下が起きた場合だけ技術構成を再検討する。

## PartyServer / クラウド常設へ
- ファシリPC依存をなくしたい
- 常設URLが必要
- 複数イベントを同時開催したい
- サーバー運用をクラウド中心へ変えたい

## Tauriへ
- HostをブラウザでなくWindowsアプリとして配布する明確な必要が出た

## Phaserへ
- Screenの島演出がDOM/CSSだけでは品質要求を満たせない

## PostgreSQL等へ
- 単一サーバー／単一SQLiteでは足りない同時開催数になった

それまでは現構成を維持する。

---

# 21. ライセンス方針

αで採用する主要部品は、調査時点でMITまたはApache-2.0系のOSSとして利用可能。

ただし最終成果物を社外配布する場合は、Codexが生成する`THIRD_PARTY_NOTICES.md`または同等ファイルで採用依存のライセンス一覧を残すことを推奨する。

VirtualTabletopはGPLv3のため、今回のコード流用元にはしない。

---

# 22. 公式情報ソース

調査日：2026-08-27

## Node
- https://nodejs.org/en/about/previous-releases
- https://nodejs.org/en/blog/release

## React
- https://www.npmjs.com/package/react
- https://github.com/facebook/react

## Vite
- https://vite.dev/guide/
- https://vite.dev/config/server-options
- https://github.com/vitejs/vite
- https://www.npmjs.com/package/vite

## Express
- https://expressjs.com/
- https://expressjs.com/en/starter/static-files/
- https://github.com/expressjs/express
- https://www.npmjs.com/package/express

## Socket.IO
- https://socket.io/docs/v4/rooms/
- https://socket.io/docs/v4/emitting-events/
- https://socket.io/docs/v4/connection-state-recovery
- https://socket.io/docs/v4/middlewares/
- https://github.com/socketio/socket.io
- https://github.com/socketio/chat-example
- https://www.npmjs.com/package/socket.io
- https://www.npmjs.com/package/socket.io-client

## SQLite
- https://github.com/WiseLibs/better-sqlite3
- https://www.npmjs.com/package/better-sqlite3

## Zod
- https://zod.dev/
- https://www.npmjs.com/package/zod

## Vitest
- https://vitest.dev/
- https://www.npmjs.com/package/vitest

## Playwright
- https://playwright.dev/docs/browser-contexts
- https://playwright.dev/docs/browsers
- https://github.com/microsoft/playwright
- https://www.npmjs.com/package/@playwright/test

## Cloudflare Tunnel
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- https://developers.cloudflare.com/tunnel/setup/

## 比較候補
- https://github.com/boardgameio/boardgame.io
- https://www.npmjs.com/package/boardgame.io
- https://github.com/ArnoldSmith86/virtualtabletop
- https://github.com/cloudflare/partykit

---

# 23. 最終判断

**ISLAND 7 α版は、既存ゲームOSSをforkして作らない。**

公式scaffoldと成熟したOSS部品を利用し、

```text
React/Vite
    +
Express/Socket.IO
    +
Server Authoritative Game Engine
    +
SQLite Snapshots
    +
Vitest
    +
Playwright 4-context E2E
```

で作る。

これが現仕様に対して、
- 最短実装
- 仕様忠実性
- 障害復旧
- 情報漏洩防止
- テスト可能性
- 将来の本番演出拡張

のバランスが最もよい構成と判断する。

**ゲーム品質を技術都合で落とさず、まず壊れないα版を完成させる。**
