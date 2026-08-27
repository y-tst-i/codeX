import type { HostView } from "../server/game-engine/views.js";
import type { HostCommand, TeamId, TeamSetup } from "../shared/types.js";

export interface HostSession {
  gameId: string;
  adminToken: string;
  teamCodes: Record<TeamId, string>;
}

interface CreateGameResponse {
  gameId: string;
  credentials: {
    adminToken: string;
    teamCodes: Record<TeamId, string>;
  };
  view: HostView;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as { error?: string; code?: string } & T;
  if (!response.ok) throw new ApiError(body.error ?? "通信に失敗しました。", body.code);
  return body;
}

export async function createGame(teams: Record<TeamId, TeamSetup>, seed?: string): Promise<CreateGameResponse> {
  const response = await fetch("/api/games", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ teams, seed: seed?.trim() || undefined })
  });
  return parseResponse<CreateGameResponse>(response);
}

export async function loadHost(session: HostSession): Promise<HostView> {
  const response = await fetch(`/api/games/${session.gameId}/host`, {
    headers: { "x-admin-token": session.adminToken }
  });
  return parseResponse<HostView>(response);
}

export async function sendHostCommand(
  session: HostSession,
  revision: number,
  command: HostCommand | { type: "UNDO" }
): Promise<HostView> {
  const response = await fetch(`/api/games/${session.gameId}/commands`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-token": session.adminToken
    },
    body: JSON.stringify({ commandId: crypto.randomUUID(), revision, command })
  });
  const result = await parseResponse<{ view: HostView }>(response);
  return result.view;
}
