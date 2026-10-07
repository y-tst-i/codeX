/**
 * 自分のPCの Codex CLI（ChatGPT でログイン済み）を、ツールから呼び出すための中継。
 * Vite の開発サーバーに /api/codex/* を足す。画像は一時フォルダに作らせて、ツールが取り込む。
 *
 * 安全のため：
 * - localhost からのリクエストだけ受け付け、専用のヘッダーが無いものは断る（他のサイトから勝手に動かされないように）
 * - Codex は一時フォルダの中だけ書き込める設定（workspace-write）で動かす
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Plugin } from "vite";

interface Job {
  dir: string;
  child: ChildProcess;
  log: string[];
  state: "running" | "done" | "error" | "cancelled";
  startedAt: number;
}

const jobs = new Map<string, Job>();
const IMAGE = /\.(png|jpe?g|webp)$/i;
const isWindows = process.platform === "win32";

function run(args: string[], input?: string, cwd?: string): ChildProcess {
  return spawn("codex", args, { cwd, shell: isWindows, windowsHide: true, stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"] });
}

/** codex のコマンドを実行して、出力をまとめて返す */
function capture(args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    let out = "";
    let child: ChildProcess;
    try {
      child = run(args);
    } catch {
      resolve({ code: -1, out: "" });
      return;
    }
    child.stdout?.on("data", (d) => (out += d));
    child.stderr?.on("data", (d) => (out += d));
    child.on("error", () => resolve({ code: -1, out }));
    child.on("close", (code) => resolve({ code: code ?? -1, out }));
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 60_000_000) reject(new Error("too large"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/** localhost の、このツールからのリクエストか */
function trusted(req: IncomingMessage): boolean {
  if (req.headers["x-tms-codex"] !== "1") return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

function images(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => IMAGE.test(name) && statSync(join(dir, name)).size > 0)
      .sort();
  } catch {
    return [];
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!trusted(req)) return send(res, 403, { error: "forbidden" });

  if (url.pathname === "/api/codex/check") {
    const version = await capture(["--version"]);
    if (version.code !== 0) return send(res, 200, { installed: false, loggedIn: false });
    const status = await capture(["login", "status"]);
    return send(res, 200, { installed: true, version: version.out.trim(), loggedIn: status.code === 0 && /logged in/i.test(status.out), status: status.out.trim().slice(-200) });
  }

  if (url.pathname === "/api/codex/images" && req.method === "POST") {
    const { prompt, refs } = JSON.parse(await readBody(req)) as { prompt?: string; refs?: { name?: string; dataUrl?: string }[] };
    if (!prompt) return send(res, 400, { error: "prompt がありません" });
    const id = randomUUID();
    const dir = mkdtempSync(join(tmpdir(), "tms-codex-"));
    // 参考画像（登場人物の設定画など）は refs/ に置いて -i で渡す。作業フォルダ直下ではないので、取り込み対象には入らない
    const refArgs: string[] = [];
    for (const ref of (refs ?? []).slice(0, 8)) {
      const match = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(ref.dataUrl ?? "");
      const base = (ref.name ?? "").replace(/[^\w-]/g, "");
      if (!match || !base) continue;
      mkdirSync(join(dir, "refs"), { recursive: true });
      const file = join(dir, "refs", `${base}.${match[1] === "jpeg" ? "jpg" : match[1]}`);
      writeFileSync(file, Buffer.from(match[2]!, "base64"));
      refArgs.push("-i", file);
    }
    const child = run(["exec", "--skip-git-repo-check", "--sandbox", "workspace-write", ...refArgs, "-"], prompt, dir);
    const job: Job = { dir, child, log: [], state: "running", startedAt: Date.now() };
    const push = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) job.log.push(line.slice(0, 300));
      if (job.log.length > 200) job.log.splice(0, job.log.length - 200);
    };
    child.stdout?.on("data", push);
    child.stderr?.on("data", push);
    child.on("error", (e) => {
      job.state = "error";
      job.log.push(`起動できませんでした: ${e.message}`);
    });
    child.on("close", (code) => {
      if (job.state === "running") job.state = code === 0 ? "done" : "error";
    });
    child.stdin?.end(prompt);
    jobs.set(id, job);
    return send(res, 200, { id });
  }

  const id = url.searchParams.get("id") ?? "";
  const job = jobs.get(id);
  if (!job) return send(res, 404, { error: "ジョブが見つかりません" });

  if (url.pathname === "/api/codex/job") {
    return send(res, 200, { state: job.state, files: images(job.dir), log: job.log.slice(-12), seconds: Math.round((Date.now() - job.startedAt) / 1000) });
  }
  if (url.pathname === "/api/codex/file") {
    const name = url.searchParams.get("name") ?? "";
    if (!IMAGE.test(name) || name.includes("/") || name.includes("\\") || !images(job.dir).includes(name)) return send(res, 404, { error: "ファイルがありません" });
    res.statusCode = 200;
    res.setHeader("Content-Type", /\.png$/i.test(name) ? "image/png" : /\.webp$/i.test(name) ? "image/webp" : "image/jpeg");
    res.end(readFileSync(join(job.dir, name)));
    return;
  }
  if (url.pathname === "/api/codex/cancel" && req.method === "POST") {
    job.state = "cancelled";
    job.child.kill();
    return send(res, 200, { ok: true });
  }
  if (url.pathname === "/api/codex/cleanup" && req.method === "POST") {
    if (job.state === "running") job.child.kill();
    rmSync(job.dir, { recursive: true, force: true });
    jobs.delete(id);
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: "not found" });
}

export function codexBridge(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith("/api/codex/")) return next();
    handle(req, res).catch((e: Error) => send(res, 500, { error: e.message }));
  };
  return {
    name: "tms-codex-bridge",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}
