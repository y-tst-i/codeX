# ISLAND 7｜Codex α実装引き継ぎ仕様

**基準ゲーム設計：ISLAND7_MASTER v0.30**  
**実装仕様パッチ：v0.30.1**  
**目的：0日目から8日目まで、2チームで止まらず1回遊べるα版を作る。**

---

# 0. 3ファイルの正本ルール

このパッケージの入口は `START_HERE.md`。  
その後、Codexは以下3ファイルを**役割別の正本**として扱う。  
`START_HERE.md` 自体は仕様正本ではなく、読み順と開始手順だけを定める。

## A. `ISLAND7_MASTER.md`
正本領域：
- ゲームの目的
- 体験設計
- ルール意図
- 日ごとの体験
- プレイテスト基準
- v0.30でフリーズしたゲームデザイン

## B. `ISLAND7_GAME_DATA.json`
**実装データ版：v0.30.1 / ゲーム設計基準：v0.30**

正本領域：
- 製品ID
- 製品数値
- 台風必要値
- ダメージ値
- 日別イベント定数
- 上限値
- 実装で参照するゲームルール上の数値定数
- ヤード候補表示数
- GRC出現日・候補表示数・取得上限
- 生還グレード閾値

**実装コードへ数値を重複直書きせず、このJSONまたは同内容から生成した型付きデータを参照する。**

## C. `ISLAND7_CODEX_HANDOFF.md`
正本領域：
- 技術構成
- 画面
- 通信
- 状態遷移
- 情報境界
- 保存・復旧
- テスト
- 実装順
- α版受入条件

## 矛盾時
単純な「上のファイルを優先」という解決はしない。

同じ意味の項目が複数ファイルで矛盾している場合は、

1. 実装を勝手に補完しない
2. 該当箇所を `SPEC_CONFLICT` として列挙
3. どの2ファイルが衝突しているかを示す
4. ユーザー確認まで該当機能を確定実装しない

ゲーム意図はMASTER、数値はGAME_DATA、技術挙動はHANDOFFという**領域分担**を優先する。

### 数値の境界
`ISLAND7_GAME_DATA.json` に寄せるのは、**ゲーム結果・合法行動・ゲーム内選択へ影響する数値**。

以下のような技術・UI上の数値はHANDOFFを正本とする。
- タップ領域
- 参加コード桁数
- URL構造
- 技術タイムアウト
- ブラウザ表示上の寸法

Codexはゲーム定数をHANDOFFから再定義せず、GAME_DATAを読み込む。


# 1. 実装方針

## 最優先
ゲームを豪華にすることではなく、

1. ルールを正しく計算する
2. 3画面が同期する
3. 非公開情報が漏れない
4. ファシリが進行を制御できる
5. 落ちても復旧できる

こと。

## やらない
α版では以下を作らない。

- ネイティブアプリ
- 個人ログイン
- チャット
- チーム間取引
- 3Dゲーム
- AI攻略
- AI文章生成
- 高度なアニメーション
- 完成本番デザイン
- 製品コンボ
- 実績・ランキング
- 課金・外部DB

---

# 2. 推奨技術構成

## 単一リポジトリ
TypeScriptで統一。

推奨：
- Node.js 22+
- React
- Vite
- Express
- Socket.IO
- SQLite
- better-sqlite3
- Zod
- Vitest

CSSは通常CSSまたはTailwindのどちらでもよい。  
α版ではUIライブラリ依存を増やしすぎない。

## 構成例

```text
island7/
  package.json
  src/
    server/
      index.ts
      game-engine/
      persistence/
      socket/
    web/
      screen/
      host/
      team/
      components/
    shared/
      types/
      constants/
      game-data/
  data/
    island7.sqlite
  public/
    products/
    island/
  tests/
```

## 起動
```bash
npm install
npm run dev
npm run test
npm run build
npm start
```

## 依存バージョン固定

実装開始時にCodexは、採用ライブラリの
**その時点での安定版・互換性・Node対応状況を確認してから**
依存を固定する。

### 必須
- `package.json` は完全な依存一覧を持つ
- `package-lock.json` を必ずコミット
- CI／再現テストでは `npm ci`
- Nodeの実使用バージョンを `.node-version` または同等ファイルへ固定
- `package.json` の `engines.node` を設定
- npmの実使用バージョンも記録
- `VERSIONS.md` に初回確定バージョンと確認日を記録

### 原則
`latest` や `^` に任せて、別環境で勝手に依存が変わる状態を作らない。

実装開始時点で一度互換性を確認した組合せを**正確なバージョンへ固定**する。

特に確認対象：
- Node.js
- React / React DOM
- Vite
- Express
- Socket.IO / socket.io-client
- better-sqlite3
- Zod
- Vitest
- Playwright

依存更新はα版完成後の別作業とし、
ゲーム実装中に理由なくアップグレードしない。

## α版の配信
ファシリPCでサーバーを起動する。

- 進行管理：`/host`
- 共有画面：`/screen/:gameId`
- チーム操作：`/team/:gameId/:teamCode`

リモート参加者へはHTTPSトンネル経由でチームURLを共有する想定。  
トンネルそのものはアプリの責務にしない。

---

# 2.5 公開方法の段階分離

## αテスト
ローカルサーバーを外部参加者から確認するため、
一時的なHTTPSトンネルを使用してよい。

例：
- Cloudflare Quick Tunnel

αではURLが固定でなくてもよい。

## 本番候補版
Quick Tunnelを本番経路として採用しない。

本番候補：
1. 固定ホスト名を持つ通常のCloudflare Tunnel
2. 長時間稼働するクラウドVM／コンテナへ配置

### SQLiteをクラウド配置する場合
`better-sqlite3` を維持するなら、
- 永続ディスクがある
- プロセス再起動後もDBファイルが残る
- 単一サーバーで運用できる

環境を使う。

**エフェメラルなサーバーレス実行環境へSQLiteファイルを置かない。**

公開方式はアプリ本体から切り離し、
αテスト完了後に本番方式を決定する。

---

# 3. 認証・アクセス

## ファシリ
ゲーム作成時にランダムな管理トークンを生成。

`/host` の更新系操作には管理トークンが必要。

## チーム
4桁程度の参加コードをチームごとに生成。  
※これは技術・運用値なのでHANDOFF側の定義でよい。

個人ログインなし。

## 共有画面
読み取り専用。

## 注意
公開URLから他チームの非公開情報を取得できてはいけない。  
Socket.IOの送信先もチーム別roomで分ける。

---

# 4. 画面

## A. 共有画面 `/screen/:gameId`
用途：Zoom画面共有。

表示：
- 日
- 島2つ
- 共通天候
- 公開ステータス
- 残り行動
- 共通イベント
- 確定済み選択
- 結果
- 最終台風
- 8日目結果

非表示：
- 未確定回答
- チーム限定予報
- 台風真値
- 管理UI

## B. 進行管理 `/host`
用途：ファシリ。

常時表示：
- 現在状態ID
- 両チーム全状態
- 回答状態
- 非公開情報
- タイマー
- セーブ時刻

必須操作：
- ゲーム作成
- チーム設定
- ゲーム開始
- タイマー開始／停止／リセット
- 回答代理入力
- 回答締切
- 結果確定
- 次へ
- 一時停止
- 一手戻し
- 手動修正
- 前回ゲーム再開

## C. チーム操作 `/team/:gameId/:teamCode`
用途：各チーム1台。

表示：
- 島名
- 今日の決定担当
- HP
- 4能力
- 資材
- 所持一般製品
- 自チーム限定情報
- 現在の合法な選択肢
- 仮回答状態

---

# 5. ゲームセットアップ

## 入力
- チームA島名
- チームB島名
- 各チーム3〜4名の表示名

表示名はセッション内だけで使用。

## 自動生成
ゲーム作成時にseedを生成。

seedから決定：
- 台風タイプ
- 一般製品順
- GRC順
- 2日目に除外される進路候補

ゲーム途中で再抽選しない。

---

# 6. 型定義

内部識別子は英語でよい。  
ユーザー表示は日本語。

```ts
type TeamId = "A" | "B";

type StatKey =
  | "protection"
  | "drainage"
  | "access"
  | "lifeline";

type GameStatus =
  | "setup"
  | "running"
  | "paused"
  | "finished";

type TimeSlot =
  | "tutorial"
  | "morning"
  | "afternoon"
  | "event"
  | "final"
  | "ending";

interface Stats {
  protection: number;
  drainage: number;
  access: number;
  lifeline: number;
}

interface TeamState {
  id: TeamId;
  islandName: string;
  memberNames: string[];
  hpInternal: number;
  stats: Stats;
  materials: number;

  ownedNormalProductIds: string[];
  installedNormalProductIds: string[];
  installedGrcProductIds: string[];
  grcAcquiredCount: number;

  emergencyInstallUsed: boolean;

  starterProductId: string | null;
  tutorialBuildStat: StatKey | null;

  day2Choice: "parts" | "sensor" | null;
  day2RouteEliminated: string | null;
  day3DamageReduction: number;

  day4Choice: "data" | "cargo" | null;
  earlyFinalRequirementsKnown: boolean;

  yardQueue: string[];
  yardVisibleProductIds: string[];
  grcQueue: string[];

  decisionCaptainIndex: number;
  actionHistory: ActionLog[];
}

interface GameState {
  gameId: string;
  seed: string;
  status: GameStatus;

  day: number;
  timeSlot: TimeSlot;
  stateId: string;

  typhoonType: "heavy_rain" | "coastal" | "mountain";
  finalRequirements: Stats;

  publicForecastStage: number;

  teams: Record<TeamId, TeamState>;

  pendingAnswers: Partial<Record<TeamId, PendingAnswer>>;

  timerSeconds: number;
  timerRunning: boolean;

  createdAt: string;
  updatedAt: string;
}
```

型名は変更可。意味は維持する。

---

# 7. 初期値

ゲーム作成直後：

```json
{
  "hp": 100,
  "materials": 4,
  "stats": {
    "protection": 1,
    "drainage": 1,
    "access": 1,
    "lifeline": 1
  }
}
```

0日目終了時：
- 練習探索で資材 +2
- スターター合計 +2
- 無料整備 +1

したがって、
- 資材6
- 能力合計7
になる。

---

# 8. 製品マスター

```json
[
  {
    "id": "kc_line_gutter",
    "name": "KCライン側溝",
    "category": "normal",
    "statDelta": {"drainage": 2},
    "hpRecovery": 0,
    "preparedReductionPhase": null,
    "preparedReduction": 0,
    "autoInstallOnAcquire": false
  },
  {
    "id": "sw_variable_gutter",
    "name": "SW可変深溝側溝",
    "category": "normal",
    "statDelta": {"drainage": 1},
    "hpRecovery": 0,
    "preparedReductionPhase": "final_rain",
    "preparedReduction": 8,
    "autoInstallOnAcquire": false
  },
  {
    "id": "box_culvert",
    "name": "ボックスカルバート",
    "category": "normal",
    "statDelta": {"drainage": 1, "access": 1},
    "hpRecovery": 0,
    "preparedReductionPhase": null,
    "preparedReduction": 0,
    "autoInstallOnAcquire": false
  },
  {
    "id": "the_wall_2",
    "name": "ザ・ウォールⅡ",
    "category": "normal",
    "statDelta": {"protection": 2},
    "hpRecovery": 0,
    "preparedReductionPhase": null,
    "preparedReduction": 0,
    "autoInstallOnAcquire": false
  },
  {
    "id": "big_scale_2",
    "name": "ビッグスケールⅡ",
    "category": "normal",
    "statDelta": {"protection": 1},
    "hpRecovery": 0,
    "preparedReductionPhase": "final_wind",
    "preparedReduction": 8,
    "autoInstallOnAcquire": false
  },
  {
    "id": "kp_block",
    "name": "KPブロック",
    "category": "normal",
    "statDelta": {"protection": 1},
    "hpRecovery": 10,
    "preparedReductionPhase": null,
    "preparedReduction": 0,
    "autoInstallOnAcquire": false
  },
  {
    "id": "kc_form",
    "name": "KCフォーム",
    "category": "grc",
    "statDelta": {"drainage": 1},
    "hpRecovery": 0,
    "preparedReductionPhase": null,
    "preparedReduction": 0,
    "autoInstallOnAcquire": true
  },
  {
    "id": "grc_driveway_curb",
    "name": "GRC歩車道境界ブロック乗入れ",
    "category": "grc",
    "statDelta": {"access": 1},
    "hpRecovery": 0,
    "preparedReductionPhase": null,
    "preparedReduction": 0,
    "autoInstallOnAcquire": true
  },
  {
    "id": "excelite",
    "name": "エクセリート",
    "category": "grc",
    "statDelta": {"lifeline": 1},
    "hpRecovery": 0,
    "preparedReductionPhase": null,
    "preparedReduction": 0,
    "autoInstallOnAcquire": true
  }
]
```

全カードに参加者向け注記：

> ※ゲーム上の効果です。実際の製品性能を表すものではありません。

---

# 9. 台風マスター

```json
{
  "heavy_rain": {
    "name": "豪雨型",
    "requirements": {
      "protection": 5,
      "drainage": 7,
      "access": 6,
      "lifeline": 5
    }
  },
  "coastal": {
    "name": "沿岸直撃型",
    "requirements": {
      "protection": 7,
      "drainage": 5,
      "access": 5,
      "lifeline": 6
    }
  },
  "mountain": {
    "name": "山側通過型",
    "requirements": {
      "protection": 6,
      "drainage": 5,
      "access": 7,
      "lifeline": 5
    }
  }
}
```

---

# 10. 最終ダメージ関数

```ts
function damageFromShortage(shortage: number): number {
  if (shortage <= 0) return 0;
  if (shortage === 1) return 8;
  if (shortage === 2) return 20;
  if (shortage === 3) return 36;
  if (shortage === 4) return 56;
  return 80;
}
```

判定：

```ts
shortage = Math.max(0, required - current);
baseDamage = damageFromShortage(shortage);
finalDamage = Math.max(0, baseDamage - preparedReduction);
```

---

# 11. 一般製品ヤード

## 共通条件生成
1. 一般6製品をseedでシャッフル
2. 0日目スターター確定
3. 両チームのstarterProductIdの和集合をシャッフル列から除外
4. その列をA/Bそれぞれへコピー

## 各チームの表示
候補表示枚数は `ISLAND7_GAME_DATA.json > yard.visibleCount` を使用。

初回：
- 先頭から `yard.visibleCount` 枚

1枚取得後：
- 取得カードを除去
- 未選択カードを残す
- 次の未表示カードを補充

候補が1枚 → 1枚表示。  
0枚 → ヤードを無効化。

相手チームの取得は自チーム在庫へ影響しない。

---

# 12. GRC

seedで3製品の共通順を作成。  
各チームへ同じ順番のコピー。

取得可能日は `ISLAND7_GAME_DATA.json > grc.availableDays` を使用。

各回、候補表示枚数は `grc.visibleCount`。

選んだ製品：
- 即取得
- 即設置
- 能力即反映

取得上限は `ISLAND7_GAME_DATA.json > grc.acquireMax`。  
上限到達後は高台を無効化。

---

# 13. 0日目の状態遷移

推奨stateId：

```text
D0_INTRO
D0_ISLAND_NAME
D0_STARTER_SELECT
D0_STARTER_RESULT
D0_PRACTICE_EXPLORE
D0_PRACTICE_RESULT
D0_TUTORIAL_BUILD
D0_TUTORIAL_BUILD_RESULT
D0_STORM_WARNING
D1_OPEN
```

スターターはチーム別回答。  
無料整備もチーム別回答。

---

# 14. 通常日の状態遷移

基本：

```text
D{n}_OPEN
D{n}_MORNING_COUNCIL
D{n}_MORNING_INPUT
D{n}_MORNING_LOCKED
D{n}_MORNING_REVEAL
D{n}_MORNING_RESULT
D{n}_AFTERNOON_COUNCIL
D{n}_AFTERNOON_INPUT
D{n}_AFTERNOON_LOCKED
D{n}_AFTERNOON_REVEAL
D{n}_AFTERNOON_RESULT
D{n}_SUMMARY
```

特殊イベントを以下へ挿入。

## 2日目
`D2_OPEN` 後：

```text
D2_BUOY_CHOICE
D2_BUOY_RESULT
```

その後朝会議。

## 3日目
午後結果後：

```text
D3_HEAVY_RAIN
D3_HEAVY_RAIN_RESULT
```

## 4日目
`D4_OPEN` 後：

```text
D4_DRONE_CHOICE
D4_DRONE_RESULT
```

その後朝会議。

## 5日目
朝結果後：

```text
D5_TYPHOON_REVEAL
```

午後結果後：

```text
D5_ROUTE_FAILURE
D5_ROUTE_FAILURE_RESULT
```

## 6日目
`D6_OPEN` 後：

```text
D6_FULL_FORECAST
```

朝結果後：

```text
D6_EXPLORATION_CLOSED
```

午後入力では探索を無効化。

---

# 15. 通常行動

## 探索：海岸
結果：
`materials += 3`

## 探索：ヤード
入力時に製品を1枚選ぶ。

結果：
製品を`ownedNormalProductIds`へ追加。  
この時点では能力上昇なし。

## 探索：高台
2・4・6日目のみ。

結果：
選択GRCを取得→即設置→能力上昇。

## 整備
条件：
- materials >= 2
- 対象能力 < 7

結果：
- materials -= 2
- stat += 1

## 設置
対象：所持一般製品。

結果：
製品マスターに従って反映。

---

# 16. 2日目イベント

A `parts`
- materials += 2

B `sensor`
- materials += 1
- day3DamageReduction = 4
- 3日目の判定条件をチーム限定表示
- seedで決まっている進路候補1本をチーム限定で除外表示

共有画面には、
「部品回収」「センサー復旧」の選択結果だけ表示してよい。

除外された進路情報は該当チーム画面のみ。

---

# 17. 3日目集中豪雨

基本：

```ts
function day3RainDamage(drainage: number): number {
  if (drainage >= 3) return 0;
  if (drainage === 2) return 4;
  return 8;
}
```

センサー復旧済み：

```ts
damage = Math.max(0, baseDamage - 4);
```

HP更新後に自動保存。

---

# 18. 4日目イベント

A `data`
- `earlyFinalRequirementsKnown = true`
- 自チーム画面だけに4能力の正確な必要Lvを表示

B `cargo`
- materials += 2

共有画面には選択名だけ。  
必要Lvは漏らさない。

---

# 19. 5日目

朝行動後：
- 台風タイプ名を全員へ公開
- 危険度星表示

午後行動後：
アクセス判定。

```ts
damage = access >= 3 ? 0 : 10;
```

---

# 20. 6日目

朝会議前：
- 全チームへ最終必要Lv
- 最終4段階
を公開。

朝結果後：
- 探索を閉鎖

午後：
- 整備
- 一般製品設置
のみ。

両方不可なら「待機」。

---

# 21. 7日目

状態：

```text
D7_RETURN_TO_MAIN
D7_BRIEFING
D7_FINAL_COUNCIL
D7_RAIN_INPUT
D7_RAIN_RESULT
D7_ROUTE_INPUT
D7_ROUTE_RESULT
D7_EYE_OF_STORM
D7_WIND_INPUT
D7_WIND_RESULT
D7_BLACKOUT_INPUT
D7_BLACKOUT_RESULT
D7_COMPLETE
D8_RESCUE
```

## 各段階
判定能力：

1. 記録的大雨 → drainage
2. ルート崩壊 → access
3. 暴風・斜面崩壊 → protection
4. 停電・通信障害 → lifeline

## 緊急設置
使用上限は `ISLAND7_GAME_DATA.json > final.emergencyInstallMax`。

各段階判定前に、
未設置一般製品があれば、

- このまま耐える
- 製品を緊急設置

を選択可能。

使用後：
`emergencyInstallUsed = true`

SW・ビッグスケールを最終中に設置しても、preparedReductionは付与しない。

KPのHP+10は即時反映してから、その段階のダメージを計算する。

---

# 22. 8日目

計算：
- 表示HP = max(0, hpInternal)
- 勝敗
- 生還グレード
- 称号

## 生還グレード
閾値・表示名は `ISLAND7_GAME_DATA.json > survivalGrades` を正本とする。

実装側へ 80 / 50 / 20 / 1 を直書きしない。  
GAME_DATAを読み込み、高い閾値から順に判定する。

## 「私たちの島の7日間」
生成AIは使わない。

行動ログからテンプレートで生成。

最低表示：
- スターター
- 2日目選択
- 4日目選択
- 最大ダメージ段階
- 最終HP
- 使用製品数

---

# 23. 決定担当

0日目セットアップでチームメンバー表示名3〜4名を登録。

1日目：
index 0

2日目：
index 1

以降：
```ts
captainIndex = (day - 1) % memberNames.length;
```

0日目は決定担当を表示しなくてよい。

---

# 24. 回答の扱い

チーム送信＝仮回答。

```text
未回答
↓
仮回答
↓
回答締切
↓
ファシリ確定
↓
ゲーム状態へ反映
```

確定前は変更可。

片方だけ先に回答しても、相手には見せない。

ファシリが代理入力可能。

---

# 25. 自動保存

確定操作ごとにGameState全体をSQLiteへスナップショット保存。

最低：
- snapshotId
- gameId
- sequence
- stateId
- fullStateJson
- createdAt

現在状態テーブルとは別に履歴を持つ。

---

# 26. 一手戻し

「直前の確定前スナップショット」へGameState全体を戻す。

部分undo禁止。

seedは維持。

戻した後、Socket.IOで3画面へ最新状態を再配信。

---

# 27. 再接続

接続時はクライアント状態を信用しない。

```text
接続
→ gameId/teamCode確認
→ サーバー最新GameState取得
→ 現在stateId用画面を再構築
```

---

# 28. 手動修正

進行管理画面から編集可能：
- hpInternal
- stats
- materials
- ownedNormalProductIds
- installedNormalProductIds
- installedGrcProductIds
- grcAcquiredCount
- emergencyInstallUsed
- day / stateId

変更前後を確認ダイアログ表示。

監査ログを残す。

---

# 29. タイマー

タイマーは演出・進行補助。

- 開始
- 停止
- リセット
- +30秒
- -30秒

0秒になっても自動回答締切・自動状態遷移しない。

ファシリが必ず確定する。

---

# 30. α版UI要件

## 共通
- 日本語
- 大きい文字
- 今の判断を最優先
- スマホ縦画面でもチーム操作可能
- 小さい説明文を詰め込まない
- 製品カードは画像なしでも成立する
- 製品ごとにアイコン＋能力効果を大きく表示

## 共有画面
16:9 Zoom共有前提。

## チーム操作
スマホまたはPCブラウザ。

ボタンは最低44px相当のタップ領域。

---

# 31. 製品画像

α版：
- プレースホルダー
- 製品名
- 能力アイコン
でよい。

本番前：
- 公式・社内確認済み画像へ差し替える

アプリ内に外部サイト画像を直リンクしない。  
ローカル静的アセットとして配置する。

---

# 31.5 Playwright E2E｜4画面同期テスト

α版から `@playwright/test` を導入する。

このゲームで最も重要なE2Eは、
**進行管理・共有・島A・島Bの4セッションが同じゲーム状態を正しく違う権限で見ること。**

## 実装方法
1つのPlaywrightテスト内で、
独立したBrowserContextを4つ作る。

- HostContext
- ScreenContext
- TeamAContext
- TeamBContext

必ずしも4つのブラウザプロセスを起動する必要はない。  
独立コンテキストでcookie・storage・接続状態を分離する。

## 必須シナリオ1｜回答の非公開→公開→確定

1. 4画面を同一ゲームへ接続
2. 島Aが朝の回答を送る
3. 島B画面にAの回答が見えない
4. 共有画面にも見えない
5. 島Bが回答
6. Hostが回答締切
7. 共有画面に両選択が公開
8. Hostが結果確定
9. 4画面すべてが新状態へ更新

## 必須シナリオ2｜チーム限定情報

1. 2日目に島Aだけセンサー復旧
2. Aには除外進路と詳しい条件を表示
3. Bには表示しない
4. 共有画面にも表示しない
5. Hostだけは確認可能

同様に4日目観測データも検証。

## 必須シナリオ3｜再読み込み

1. 状態を数回進める
2. Team Aを再読み込み
3. 最新状態へ復帰
4. 二重送信されない

## 必須シナリオ4｜一手戻し

1. 結果確定
2. 4画面で更新を確認
3. Hostで一手戻し
4. HP・能力・資材・製品・stateIdが戻る
5. 4画面すべて同じ戻り状態になる

## 必須シナリオ5｜代理入力

1. Team Bを未回答のままにする
2. HostがBを代理入力
3. 通常回答と同じ処理で確定
4. B再接続後も正しい状態

## 必須シナリオ6｜接続断

Socket.IO接続を一時的に切断し、
再接続後にサーバー正本状態へ追従することを確認する。

### テスト方針
E2Eテストで画面テキストだけを見るのではなく、
**状態ID・公開範囲・数値が4画面で期待通りか**
まで検証する。

---

# 32. テスト必須項目

## 単体テスト
- 整備コスト
- 能力上限7
- HP上限100
- KP回復
- 日3被害
- 日5被害
- 最終ダメージ
- preparedReduction
- 緊急設置
- GRC取得上限
- ヤード候補更新
- 決定担当回転

## 情報漏洩テスト
- Aだけセンサー → B socketへ詳細を送らない
- Aだけ観測データ → B/共有画面へ必要Lvを送らない
- pendingAnswerを相手へ送らない

## 復旧テスト
- 朝結果後にサーバー再起動
- チーム端末再読み込み
- 一手戻し
- 手動修正
- 代理入力

---

# 33. 受入テスト

## 受入1｜0日目
KCライン側溝スターター＋防護無料整備。

期待：
- HP100
- 資材6
- 防護2
- 排水3
- アクセス1
- ライフライン1
- 能力合計7

## 受入2｜2日目センサー
期待：
- 資材+1
- day3DamageReduction=4
- 自チームだけ進路1本除外
- 相手・共有画面へ詳細なし

## 受入3｜GRC
2日目高台でKCフォーム取得。

期待：
- 1行動消費
- 排水+1
- installedGrcProductIdsに登録
- grcAcquiredCount=1
- 追加設置操作なし

## 受入4｜SW事前設置
6日目までにSW設置済み。  
最終大雨の不足Lv2。

基本20 → 軽減8 → **12ダメージ**

## 受入5｜SW緊急設置
最終大雨直前にSWを緊急設置。

排水+1は有効。  
preparedReduction 8は無効。

## 受入6｜KP緊急設置
HP40でKPを緊急設置。

判定前にHP50。  
その後段階ダメージ。

## 受入7｜待機
6日目午後：
- 資材1
- 未設置一般製品0
- 探索禁止

期待：
「待機」だけ表示。

## 受入8｜undo
結果確定→HP減少→一手戻し。

期待：
HPだけでなく製品・資材・回答・stateIdも完全復元。

---

# 33.5 実装開始前チェック

Codexはコード作成前に以下を実行する。

- [ ] `START_HERE.md` を読む
- [ ] 3つの仕様正本をすべて読む
- [ ] `SPEC_CONFLICT` がないか確認
- [ ] GAME_DATAのJSON SchemaまたはZod Schemaを作る
- [ ] 採用依存の安定版と互換性を確認
- [ ] バージョンを固定
- [ ] lockfileを生成
- [ ] αではQuick Tunnel使用可／本番では不可をREADMEへ記載
- [ ] 実装マイルストーンをREADMEへ記載

矛盾がなければ実装開始。

---

# 34. 実装順

## 第1段階｜ゲームエンジン
UIなしで、
- state
- actions
- products
- events
- typhoon
- final damage
- snapshots
をテスト。

## 第2段階｜進行管理画面
ファシリだけで0〜8日目を完走できるようにする。

**ここが最重要。**

## 第3段階｜共有画面
進行管理状態を表示。

## 第4段階｜チーム操作画面
Socket.IOで回答送信。

## 第5段階｜非公開情報
チーム別room。

## 第6段階｜保存・復旧
SQLite／undo／再接続。

## 第7段階｜最低限の演出
- 画面遷移
- タイマー
- HP変化
- 天候
- 最終台風
- エンディング

---

# 35. α版完成条件

以下をすべて満たしたらα版完成。

- [ ] ファシリ画面だけで0〜8日目完走
- [ ] 2チーム操作画面が同時接続
- [ ] 共有画面が同期
- [ ] 非公開情報が漏れない
- [ ] 全製品が正しく処理
- [ ] 3台風が正しく処理
- [ ] 全日別イベントが正しく処理
- [ ] 緊急設置が機能
- [ ] 自動保存
- [ ] サーバー再起動後に再開
- [ ] 一手戻し
- [ ] 代理入力
- [ ] Playwright 4画面E2Eが通る
- [ ] 120分通しテスト可能

---

# 36. α版で観測するゲームデザイン指標

コードで可能なら簡易ログを出す。

- スターター選択
- 各日の各行動
- 一般製品取得
- 一般製品設置
- GRC取得
- 2日目選択
- 4日目選択
- 各被害量
- 緊急設置対象
- 最終HP
- 各判断にかかった秒数

CSV出力できると望ましい。

これをv0.31以降のゲーム調整に使う。

---

# 37. 実装上の禁止事項

- Codex判断でゲーム数値を変更しない
- Codex判断で新しい資源を追加しない
- Codex判断で製品効果を追加しない
- Codex判断でイベントを追加しない
- タイマー0で自動進行しない
- 非公開情報を共有画面へ出さない
- チームクライアントを正本にしない
- undoを部分修正で実装しない
- α版で本番ビジュアルへ時間を使いすぎない

仕様上の矛盾が見つかった場合は、
**勝手に補完せず、該当箇所をTODOとして報告する。**

---

# 38. Codexへの最初の指示

最初から全画面を作らない。

**まずゲームエンジン＋テスト＋進行管理画面だけを実装し、ファシリ1人で0日目〜8日目を完走できる状態を最初のマイルストーンにする。**

その時点でルール計算を確認してから、
共有画面・チーム操作画面を接続する。

この順序を崩さない。
