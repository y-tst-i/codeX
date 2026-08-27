import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { HostCommandEnvelope } from "../src/shared/types.js";
import { GameService } from "../src/server/game-service.js";
import { GameRepository } from "../src/server/persistence/repository.js";
import { gameData } from "./helpers.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function setup() {
  const directory = mkdtempSync(join(tmpdir(), "island7-test-"));
  temporaryDirectories.push(directory);
  const databasePath = join(directory, "game.sqlite");
  const repository = new GameRepository(databasePath);
  const service = new GameService(gameData, repository);
  const created = service.create({
    A: { islandName: "あお島", memberNames: ["A1", "A2", "A3"] },
    B: { islandName: "みどり島", memberNames: ["B1", "B2", "B3"] }
  }, "persistence-seed");
  return { directory, databasePath, repository, service, created };
}

describe("SQLite保存・復旧", () => {
  it("確定前snapshotから状態全体をundoする", () => {
    const context = setup();
    const first: HostCommandEnvelope = { commandId: "command-advance-1", revision: 0, command: { type: "ADVANCE" } };
    const advanced = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, first).view;
    expect(advanced.state.stateId).toBe("D0_ISLAND_NAME");
    const undo: HostCommandEnvelope = { commandId: "command-undo-0001", revision: advanced.state.revision, command: { type: "UNDO" } };
    const restored = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, undo).view;
    expect(restored.state.stateId).toBe("D0_INTRO");
    expect(restored.state.teams).toEqual(context.created.view.state.teams);
    expect(restored.state.revision).toBeGreaterThan(advanced.state.revision);
    context.repository.close();
  });

  it("タイマー操作では一手戻しの基準点を増やさない", () => {
    const context = setup();
    const advanced = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, {
      commandId: "advance-before-timer",
      revision: 0,
      command: { type: "ADVANCE" }
    }).view;
    const timed = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, {
      commandId: "timer-after-advance",
      revision: advanced.state.revision,
      command: { type: "TIMER_RESET", seconds: 90 }
    }).view;
    const restored = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, {
      commandId: "undo-after-timer",
      revision: timed.state.revision,
      command: { type: "UNDO" }
    }).view;
    expect(restored.state.stateId).toBe("D0_INTRO");
    expect(restored.state.timerSeconds).toBe(context.created.view.state.timerSeconds);
    context.repository.close();
  });

  it("同じcommandIdを二重適用しない", () => {
    const context = setup();
    const envelope: HostCommandEnvelope = { commandId: "duplicate-command", revision: 0, command: { type: "ADVANCE" } };
    const first = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, envelope);
    const second = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, envelope);
    expect(second.duplicate).toBe(true);
    expect(second.view.state.revision).toBe(first.view.state.revision);
    context.repository.close();
  });

  it("古いrevisionの更新を拒否する", () => {
    const context = setup();
    context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, {
      commandId: "fresh-command-01",
      revision: 0,
      command: { type: "ADVANCE" }
    });
    expect(() => context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, {
      commandId: "stale-command-01",
      revision: 0,
      command: { type: "ADVANCE" }
    })).toThrow(/画面が古い/);
    context.repository.close();
  });

  it("DBを閉じて開き直しても最新状態を復旧する", () => {
    const context = setup();
    const advanced = context.service.executeHost(context.created.gameId, context.created.credentials.adminToken, {
      commandId: "restart-command-1",
      revision: 0,
      command: { type: "ADVANCE" }
    }).view;
    context.repository.close();
    const reopened = new GameRepository(context.databasePath);
    expect(reopened.getState(context.created.gameId)).toEqual(advanced.state);
    reopened.close();
  });
});
