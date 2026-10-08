/**
 * LottieFiles の無料アニメ（Lottie）を、ツールの中から探して取り込むための中継。
 * ブラウザから LottieFiles に直接つなぐと断られる（CORS）ので、Vite の開発サーバーに /api/lottie/* を足して代わりに取りに行く。
 *
 * 安全のため：
 * - localhost からのリクエストだけ受け付け、専用のヘッダーが無いものは断る
 * - ダウンロードは LottieFiles の素材置き場（https://*.lottiefiles.com）だけ。大きすぎるファイルは断る
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const GRAPHQL = "https://graphql.lottiefiles.com/2022-08";
const MAX_BYTES = 8_000_000;

export interface LottieHit {
  id: string;
  name: string;
  jsonUrl: string;
  imageUrl: string;
  gifUrl: string;
  author: string;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function trusted(req: IncomingMessage): boolean {
  if (req.headers["x-tms-lottie"] !== "1") return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

/** LottieFiles の素材置き場のURLか */
export function isLottieAssetUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && (url.hostname === "lottiefiles.com" || url.hostname.endsWith(".lottiefiles.com")) && /\.json$/i.test(url.pathname);
  } catch {
    return false;
  }
}

async function search(query: string, after?: string): Promise<{ hits: LottieHit[]; next?: string }> {
  const response = await fetch(GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query($q: String!, $after: String) { searchPublicAnimations(query: $q, first: 24, after: $after) {
        edges { node { id name jsonUrl imageUrl gifUrl createdBy { username firstName } } }
        pageInfo { hasNextPage endCursor } } }`,
      variables: { q: query, after: after || null }
    }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`LottieFiles の検索に失敗しました（${response.status}）`);
  type Node = { id: string | number; name?: string; jsonUrl?: string; imageUrl?: string; gifUrl?: string; createdBy?: { username?: string; firstName?: string } | null };
  const json = (await response.json()) as {
    data?: { searchPublicAnimations?: { edges?: { node: Node }[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string } } };
    errors?: { message: string }[];
  };
  if (json.errors?.length) throw new Error(json.errors[0]!.message);
  const result = json.data?.searchPublicAnimations;
  const hits = (result?.edges ?? [])
    .map(({ node }) => ({
      id: String(node.id),
      name: node.name ?? "",
      jsonUrl: node.jsonUrl ?? "",
      imageUrl: node.imageUrl ?? "",
      gifUrl: node.gifUrl ?? "",
      author: node.createdBy?.firstName || (node.createdBy?.username ?? "").replace(/^\//, "")
    }))
    .filter((hit) => isLottieAssetUrl(hit.jsonUrl));
  return { hits, next: result?.pageInfo?.hasNextPage ? result.pageInfo.endCursor : undefined };
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!trusted(req)) return send(res, 403, { error: "forbidden" });

  if (url.pathname === "/api/lottie/search") {
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
    if (!query) return send(res, 400, { error: "検索する言葉を入れてください" });
    return send(res, 200, await search(query, url.searchParams.get("after") ?? undefined));
  }

  if (url.pathname === "/api/lottie/file") {
    const target = url.searchParams.get("url") ?? "";
    if (!isLottieAssetUrl(target)) return send(res, 400, { error: "LottieFiles のアニメのURLではありません" });
    const response = await fetch(target, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return send(res, 502, { error: `ダウンロードできませんでした（${response.status}）` });
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_BYTES) return send(res, 413, { error: "ファイルが大きすぎます（8MBまで）" });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(body);
    return;
  }
  return send(res, 404, { error: "not found" });
}

export function lottieBridge(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith("/api/lottie/")) return next();
    handle(req, res).catch((e: Error) => send(res, 502, { error: `LottieFiles につながりませんでした：${e.message}` }));
  };
  return {
    name: "tms-lottie-bridge",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    }
  };
}
