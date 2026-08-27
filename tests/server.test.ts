import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createIslandServer } from "../src/server/server.js";

const servers: Array<Awaited<ReturnType<typeof createIslandServer>>> = [];

afterEach(async () => {
  for (const server of servers.splice(0)) await server.close();
});

describe("HTTPサーバー", () => {
  it("ゲーム作成・認証・Host commandを同一サーバーで処理する", async () => {
    const server = await createIslandServer({ databasePath: ":memory:", development: false });
    servers.push(server);
    await server.listen(0);
    const address = server.httpServer.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json()) as { ok: boolean; gameDataVersion: string };
    expect(health).toEqual(expect.objectContaining({ ok: true, gameDataVersion: "0.30.1" }));

    const createResponse = await fetch(`${baseUrl}/api/games`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        seed: "server-test",
        teams: {
          A: { islandName: "あお島", memberNames: ["A1", "A2", "A3"] },
          B: { islandName: "みどり島", memberNames: ["B1", "B2", "B3"] }
        }
      })
    });
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json() as {
      gameId: string;
      credentials: { adminToken: string };
      view: { state: { revision: number; stateId: string } };
    };
    expect(created.view.state.stateId).toBe("D0_INTRO");

    const commandResponse = await fetch(`${baseUrl}/api/games/${created.gameId}/commands`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": created.credentials.adminToken
      },
      body: JSON.stringify({
        commandId: "server-test-command-1",
        revision: created.view.state.revision,
        command: { type: "ADVANCE" }
      })
    });
    expect(commandResponse.status).toBe(200);
    const advanced = await commandResponse.json() as { view: { state: { stateId: string; revision: number } } };
    expect(advanced.view.state).toEqual(expect.objectContaining({ stateId: "D0_ISLAND_NAME", revision: 1 }));

    const unauthorized = await fetch(`${baseUrl}/api/games/${created.gameId}/host`);
    expect(unauthorized.status).toBe(403);
  });
});
