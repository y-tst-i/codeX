import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type { GameState, HostCommandEnvelope, TeamId } from "../../shared/types.js";
import { DomainError } from "../game-engine/engine.js";

interface GameRow {
  full_state_json: string;
  admin_token_hash: string;
  team_codes_json: string;
}

interface SnapshotRow {
  snapshot_id: string;
  full_state_json: string;
}

export interface StoredAuth {
  adminTokenHash: string;
  teamCodeHashes: Record<TeamId, string>;
}

export class GameRepository {
  private readonly database: Database.Database;

  constructor(readonly path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.database = new Database(path);
    this.database.pragma("journal_mode = WAL");
    this.database.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS games (
        game_id TEXT PRIMARY KEY,
        admin_token_hash TEXT NOT NULL,
        team_codes_json TEXT NOT NULL,
        current_revision INTEGER NOT NULL,
        state_id TEXT NOT NULL,
        full_state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS snapshots (
        snapshot_id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        state_id TEXT NOT NULL,
        full_state_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS snapshots_game_sequence ON snapshots(game_id, sequence);
      CREATE TABLE IF NOT EXISTS audit_logs (
        audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS command_log (
        command_id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        command_type TEXT NOT NULL,
        accepted_revision INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
      );
    `);
  }

  createGame(state: GameState, auth: StoredAuth): void {
    this.database.prepare(`
      INSERT INTO games (
        game_id, admin_token_hash, team_codes_json, current_revision, state_id, full_state_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      state.gameId,
      auth.adminTokenHash,
      JSON.stringify(auth.teamCodeHashes),
      state.revision,
      state.stateId,
      JSON.stringify(state),
      state.updatedAt
    );
  }

  getState(gameId: string): GameState {
    const row = this.database.prepare("SELECT full_state_json FROM games WHERE game_id = ?").get(gameId) as Pick<GameRow, "full_state_json"> | undefined;
    if (!row) throw new DomainError("ゲームが見つかりません。", "GAME_NOT_FOUND");
    return JSON.parse(row.full_state_json) as GameState;
  }

  getAuth(gameId: string): StoredAuth {
    const row = this.database.prepare(
      "SELECT admin_token_hash, team_codes_json FROM games WHERE game_id = ?"
    ).get(gameId) as Pick<GameRow, "admin_token_hash" | "team_codes_json"> | undefined;
    if (!row) throw new DomainError("ゲームが見つかりません。", "GAME_NOT_FOUND");
    return {
      adminTokenHash: row.admin_token_hash,
      teamCodeHashes: JSON.parse(row.team_codes_json) as Record<TeamId, string>
    };
  }

  isCommandApplied(gameId: string, commandId: string): boolean {
    return Boolean(
      this.database.prepare("SELECT 1 FROM command_log WHERE game_id = ? AND command_id = ?").get(gameId, commandId)
    );
  }

  commitCommand(
    before: GameState,
    after: GameState,
    envelope: HostCommandEnvelope,
    options: { createSnapshot: boolean }
  ): void {
    const transaction = this.database.transaction(() => {
      if (options.createSnapshot) {
        const sequenceRow = this.database.prepare(
          "SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM snapshots WHERE game_id = ?"
        ).get(before.gameId) as { sequence: number };
        this.database.prepare(`
          INSERT INTO snapshots (snapshot_id, game_id, sequence, state_id, full_state_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), before.gameId, sequenceRow.sequence, before.stateId, JSON.stringify(before), after.updatedAt);
      }
      this.database.prepare(`
        UPDATE games
        SET current_revision = ?, state_id = ?, full_state_json = ?, updated_at = ?
        WHERE game_id = ?
      `).run(after.revision, after.stateId, JSON.stringify(after), after.updatedAt, after.gameId);
      this.database.prepare(`
        INSERT INTO audit_logs (game_id, revision, action_type, detail_json, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(after.gameId, after.revision, envelope.command.type, JSON.stringify(envelope.command), after.updatedAt);
      this.database.prepare(`
        INSERT INTO command_log (command_id, game_id, command_type, accepted_revision, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(envelope.commandId, after.gameId, envelope.command.type, after.revision, after.updatedAt);
    });
    transaction();
  }

  undo(current: GameState, envelope: HostCommandEnvelope, now: string): GameState {
    const transaction = this.database.transaction(() => {
      const snapshot = this.database.prepare(`
        SELECT snapshot_id, full_state_json
        FROM snapshots
        WHERE game_id = ?
        ORDER BY sequence DESC
        LIMIT 1
      `).get(current.gameId) as SnapshotRow | undefined;
      if (!snapshot) throw new DomainError("戻せる確定操作がありません。", "NO_SNAPSHOT");
      const restored = JSON.parse(snapshot.full_state_json) as GameState;
      restored.revision = current.revision + 1;
      restored.updatedAt = now;
      restored.timerRunning = false;
      restored.timerStartedAt = null;
      this.database.prepare("DELETE FROM snapshots WHERE snapshot_id = ?").run(snapshot.snapshot_id);
      this.database.prepare(`
        UPDATE games
        SET current_revision = ?, state_id = ?, full_state_json = ?, updated_at = ?
        WHERE game_id = ?
      `).run(restored.revision, restored.stateId, JSON.stringify(restored), restored.updatedAt, restored.gameId);
      this.database.prepare(`
        INSERT INTO audit_logs (game_id, revision, action_type, detail_json, created_at)
        VALUES (?, ?, 'UNDO', ?, ?)
      `).run(restored.gameId, restored.revision, JSON.stringify({ restoredStateId: restored.stateId }), now);
      this.database.prepare(`
        INSERT INTO command_log (command_id, game_id, command_type, accepted_revision, created_at)
        VALUES (?, ?, 'UNDO', ?, ?)
      `).run(envelope.commandId, restored.gameId, restored.revision, now);
      return restored;
    });
    return transaction();
  }

  close(): void {
    this.database.close();
  }
}
