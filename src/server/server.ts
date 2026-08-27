import { createServer as createHttpServer } from "node:http";
import { resolve } from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { Server as SocketServer } from "socket.io";
import { ZodError } from "zod";
import { TEAM_IDS } from "../shared/types.js";
import { createGameRequestSchema, hostCommandEnvelopeSchema } from "./api-schemas.js";
import { DomainError } from "./game-engine/engine.js";
import { toHostView, toScreenView, toTeamView } from "./game-engine/views.js";
import { GameService } from "./game-service.js";
import { loadGameData } from "./load-game-data.js";
import { GameRepository } from "./persistence/repository.js";

interface ServerOptions {
  databasePath?: string;
  development?: boolean;
}

function hostToken(request: Request): string {
  const value = request.header("x-admin-token");
  return value ?? "";
}

function teamCode(request: Request): string {
  return request.header("x-team-code") ?? "";
}

function statusForError(error: unknown): number {
  if (error instanceof ZodError) return 400;
  if (error instanceof DomainError) {
    if (error.code === "FORBIDDEN") return 403;
    if (error.code === "GAME_NOT_FOUND") return 404;
    if (error.code === "STALE_REVISION") return 409;
    return 400;
  }
  return 500;
}

function errorBody(error: unknown) {
  if (error instanceof ZodError) {
    return { error: "入力内容が不正です。", code: "VALIDATION_ERROR", details: error.issues };
  }
  if (error instanceof DomainError) return { error: error.message, code: error.code };
  return { error: "サーバー内部でエラーが発生しました。", code: "INTERNAL_ERROR" };
}

export async function createIslandServer(options: ServerOptions = {}) {
  const data = loadGameData();
  const repository = new GameRepository(options.databasePath ?? resolve(process.cwd(), "data", "island7.sqlite"));
  const service = new GameService(data, repository);
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, {
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }
  });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  const broadcast = (gameId: string): void => {
    const state = repository.getState(gameId);
    io.to(`game:${gameId}:host`).emit("state:update", toHostView(state, data));
    io.to(`game:${gameId}:screen`).emit("state:update", toScreenView(state, data));
    for (const id of TEAM_IDS) {
      io.to(`game:${gameId}:team:${id}`).emit("state:update", toTeamView(state, id, data));
    }
  };

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, gameDataVersion: data.version, designVersion: data.designVersion });
  });

  app.post("/api/games", (request, response, next) => {
    try {
      const body = createGameRequestSchema.parse(request.body);
      response.status(201).json(service.create(body.teams, body.seed));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/games/:gameId/host", (request, response, next) => {
    try {
      response.json(service.getHost(request.params.gameId ?? "", hostToken(request)));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/games/:gameId/screen", (request, response, next) => {
    try {
      response.json(service.getScreen(request.params.gameId ?? ""));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/games/:gameId/team/:teamId", (request, response, next) => {
    try {
      const id = request.params.teamId;
      if (id !== "A" && id !== "B") throw new DomainError("チームIDが不正です。");
      response.json(service.getTeam(request.params.gameId ?? "", id, teamCode(request)));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/games/:gameId/commands", (request, response, next) => {
    try {
      const gameId = request.params.gameId ?? "";
      const envelope = hostCommandEnvelopeSchema.parse(request.body);
      const result = service.executeHost(gameId, hostToken(request), envelope);
      broadcast(gameId);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    try {
      const auth = socket.handshake.auth as Record<string, unknown>;
      const gameId = typeof auth.gameId === "string" ? auth.gameId : "";
      const role = auth.role;
      if (role === "host") {
        const token = typeof auth.adminToken === "string" ? auth.adminToken : "";
        service.verifyHost(gameId, token);
        socket.join(`game:${gameId}:host`);
        socket.emit("state:update", service.getHost(gameId, token));
        socket.on("host:command", (value, acknowledge) => {
          try {
            const envelope = hostCommandEnvelopeSchema.parse(value);
            const result = service.executeHost(gameId, token, envelope);
            broadcast(gameId);
            acknowledge?.({ ok: true, ...result });
          } catch (error) {
            acknowledge?.({ ok: false, ...errorBody(error) });
          }
        });
      } else if (role === "screen") {
        socket.join(`game:${gameId}:screen`);
        socket.emit("state:update", service.getScreen(gameId));
      } else if (role === "team") {
        const id = auth.teamId;
        if (id !== "A" && id !== "B") throw new DomainError("チームIDが不正です。");
        const code = typeof auth.teamCode === "string" ? auth.teamCode : "";
        service.verifyTeam(gameId, id, code);
        socket.join(`game:${gameId}:team:${id}`);
        socket.emit("state:update", service.getTeam(gameId, id, code));
      } else {
        throw new DomainError("接続ロールが不正です。", "FORBIDDEN");
      }
    } catch (error) {
      socket.emit("error:domain", errorBody(error));
      socket.disconnect(true);
    }
  });

  const development = options.development ?? process.env.NODE_ENV !== "production";
  let vite: Awaited<ReturnType<typeof import("vite")["createServer"]>> | undefined;
  if (development) {
    const { createServer } = await import("vite");
    vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const clientPath = resolve(process.cwd(), "dist", "client");
    app.use(express.static(clientPath));
    app.use((request, response, next) => {
      if (request.method === "GET" && request.accepts("html")) {
        response.sendFile(resolve(clientPath, "index.html"));
      } else {
        next();
      }
    });
  }

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (!(error instanceof DomainError) && !(error instanceof ZodError)) console.error(error);
    response.status(statusForError(error)).json(errorBody(error));
  });

  return {
    app,
    httpServer,
    io,
    repository,
    service,
    listen(port: number): Promise<void> {
      return new Promise((resolveListen) => {
        httpServer.listen(port, resolveListen);
      });
    },
    async close(): Promise<void> {
      io.close();
      await vite?.close();
      if (httpServer.listening) {
        await new Promise<void>((resolveClose, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolveClose()));
        });
      }
      repository.close();
    }
  };
}
