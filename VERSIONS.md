# 採用バージョン

確定日：2026-08-27

| 項目 | 固定バージョン |
|---|---:|
| Node.js | 24.16.0 LTS |
| npm | 11.13.0 |
| React | 19.2.8 |
| React DOM | 19.2.8 |
| TypeScript | 6.0.3 |
| Vite | 8.2.2 |
| Express | 5.2.1 |
| Socket.IO | 4.8.3 |
| socket.io-client | 4.8.3 |
| better-sqlite3 | 12.6.2 |
| Zod | 4.4.3 |
| Vitest | 4.1.11 |
| Playwright Test | 1.62.1 |

Node.js 24.16.0とnpm 11.13.0は、このPCで実際に検証したバージョンです。TypeScriptはVite公式React TypeScriptテンプレートとの互換性を優先し、7系ではなく6系に固定しています。依存は`package-lock.json`で完全固定します。

`better-sqlite3`は、13.0.3がWindows用の事前ビルドを配布しておらず`npm ci`にPython/C++ビルド環境を要求したため、Node 24対応とWindows x64用事前ビルドが公式Releaseで確認できる12.6.2へ固定しています。ゲーム仕様や保存形式は変更していません。
