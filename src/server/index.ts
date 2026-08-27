import { createIslandServer } from "./server.js";

const port = Number(process.env.PORT ?? 4173);
const server = await createIslandServer({ databasePath: process.env.ISLAND7_DB_PATH });
await server.listen(port);
console.log(`ISLAND 7 進行管理サーバーを起動しました: http://localhost:${port}/host`);

async function shutdown(): Promise<void> {
  await server.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
