import { randomBytes, randomUUID } from "node:crypto";
import type { GameData } from "../shared/game-data-schema.js";
import type { HostCommandEnvelope, TeamId, TeamSetup } from "../shared/types.js";
import { createCredentials, hashSecret, secretMatches } from "./credentials.js";
import { createGame } from "./game-engine/create-game.js";
import { applyHostCommand, DomainError } from "./game-engine/engine.js";
import { toHostView, toScreenView, toTeamView } from "./game-engine/views.js";
import type { GameRepository } from "./persistence/repository.js";

export class GameService {
  constructor(
    readonly data: GameData,
    readonly repository: GameRepository
  ) {}

  create(teams: Record<TeamId, TeamSetup>, seed?: string) {
    const credentials = createCredentials();
    const gameId = randomUUID().slice(0, 8);
    const effectiveSeed = seed?.trim() || randomBytes(16).toString("hex");
    const state = createGame({ gameId, seed: effectiveSeed, teams }, this.data);
    this.repository.createGame(state, {
      adminTokenHash: hashSecret(credentials.adminToken),
      teamCodeHashes: {
        A: hashSecret(credentials.teamCodes.A),
        B: hashSecret(credentials.teamCodes.B)
      }
    });
    return { gameId, credentials, view: toHostView(state, this.data) };
  }

  verifyHost(gameId: string, adminToken: string): void {
    const auth = this.repository.getAuth(gameId);
    if (!adminToken || !secretMatches(adminToken, auth.adminTokenHash)) {
      throw new DomainError("管理トークンが正しくありません。", "FORBIDDEN");
    }
  }

  verifyTeam(gameId: string, teamId: TeamId, teamCode: string): void {
    const auth = this.repository.getAuth(gameId);
    if (!teamCode || !secretMatches(teamCode, auth.teamCodeHashes[teamId])) {
      throw new DomainError("参加コードが正しくありません。", "FORBIDDEN");
    }
  }

  getHost(gameId: string, adminToken: string) {
    this.verifyHost(gameId, adminToken);
    return toHostView(this.repository.getState(gameId), this.data);
  }

  getScreen(gameId: string) {
    return toScreenView(this.repository.getState(gameId), this.data);
  }

  getTeam(gameId: string, teamId: TeamId, teamCode: string) {
    this.verifyTeam(gameId, teamId, teamCode);
    return toTeamView(this.repository.getState(gameId), teamId, this.data);
  }

  executeHost(gameId: string, adminToken: string, envelope: HostCommandEnvelope) {
    this.verifyHost(gameId, adminToken);
    const current = this.repository.getState(gameId);
    if (this.repository.isCommandApplied(gameId, envelope.commandId)) {
      return { duplicate: true, view: toHostView(current, this.data) };
    }
    if (envelope.revision !== current.revision) {
      throw new DomainError("画面が古いため操作を反映しませんでした。最新状態を再取得してください。", "STALE_REVISION");
    }
    const now = new Date().toISOString();
    const next = envelope.command.type === "UNDO"
      ? this.repository.undo(current, envelope, now)
      : applyHostCommand(current, envelope.command, this.data, now);
    if (envelope.command.type !== "UNDO") {
      const createSnapshot = envelope.command.type === "ADVANCE" || envelope.command.type === "MANUAL_CORRECTION";
      this.repository.commitCommand(current, next, envelope, { createSnapshot });
    }
    return { duplicate: false, view: toHostView(next, this.data) };
  }
}
