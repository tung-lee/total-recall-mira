import { readFile, stat } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import {
  createLogger,
  createTatumSuiClient,
  suiFallback,
  tatumCallsLastHour,
  tatumSuiOptionsFromEnv,
  tatumUsage,
} from "@mira/chain";
import { createClient, limiterFor, scope } from "@mira/memory";
import { writable } from "@mira/money";
import { MemWalMock } from "@mysten-incubation/memwal";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { z } from "zod";
import { CashError, CashService, PreviewCash, SuiCash } from "./cash.ts";
import { readServerEnv } from "./env.ts";
import { MemoryService } from "./memory.ts";
import { cashQuery, jobsQuery, moveBody, openBody, userQuery, writeBody } from "./schemas.ts";

const log = createLogger({ service: "server" });
const env = readServerEnv();

const memoryKey = env.memory?.MEMWAL_PRIVATE_KEY ?? "preview";
const memory = new MemoryService(
  env.memory
    ? createClient(
        scope(
          { key: env.memory.MEMWAL_PRIVATE_KEY, accountId: env.memory.MEMWAL_ACCOUNT_ID, serverUrl: env.memory.MEMWAL_SERVER_URL },
          "default",
        ),
      )
    : MemWalMock.create({ owner: "preview" }),
  {
    mode: env.memory ? "walrus" : "preview",
    writes: limiterFor(memoryKey),
    reads: limiterFor(`${memoryKey}:read`, { capacity: 150, concurrency: 2 }),
    log,
  },
);

const cash = new CashService(
  env.cash
    ? new SuiCash(createTatumSuiClient(tatumSuiOptionsFromEnv("testnet")), Ed25519Keypair.fromSecretKey(env.cash.operatorKey))
    : new PreviewCash(),
  { secret: env.cash?.walletSecret ?? "preview-pockets-are-not-on-chain", seedCents: env.MIRA_SEED_CENTS, seedsPerHour: env.MIRA_SEEDS_PER_HOUR },
);

class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const MAX_BODY = 64 * 1024;

async function readBody(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buf.length;
    if (size > MAX_BODY) throw new HttpError(413, "too_large", "That request is too big.");
    chunks.push(buf);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "bad_json", "That request wasn't valid JSON.");
  }
}

function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, "bad_request", result.error.issues[0]?.message ?? "Bad request.");
  return result.data;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

const query = (url: URL) => Object.fromEntries(url.searchParams);

type Route = (req: IncomingMessage, url: URL) => Promise<unknown>;

const routes: Record<string, Route> = {
  "GET /api/health": async () => ({
    ok: true,
    memory: { mode: memory.mode, lines: memory.counts() },
    cash: { mode: cash.mode },
    tatum: cash.mode === "sui" ? { calls: tatumUsage(), lastHour: tatumCallsLastHour(), fallback: suiFallback("testnet") } : null,
  }),

  "GET /api/memory": async (_req, url) => {
    const { user } = parse(userQuery, query(url));
    return { mode: memory.mode, lines: await memory.recall(user) };
  },

  "POST /api/memory": async (req) => {
    const { user, facts } = parse(writeBody, await readBody(req));
    if (!facts.every(writable)) throw new HttpError(400, "not_writable", "That can't be saved to memory.");
    const jobs = memory.write(user, facts);
    return { jobs: jobs.map((j) => ({ key: j.key, line: j.line, kind: j.kind, status: j.status, blobId: j.blobId })) };
  },

  "GET /api/memory/jobs": async (_req, url) => {
    const { user, keys } = parse(jobsQuery, query(url));
    return {
      jobs: memory.status(user, keys).map((j) => ({ key: j.key, status: j.status, blobId: "blobId" in j ? j.blobId : null })),
    };
  },

  "GET /api/cash": async (_req, url) => {
    const { user, pockets } = parse(cashQuery, query(url));
    return { mode: cash.mode, balances: await cash.balances(user, pockets) };
  },

  "POST /api/cash/open": async (req) => {
    const { user } = parse(openBody, await readBody(req));
    const opened = await cash.open(user);
    return { mode: cash.mode, ...opened, balances: await cash.balances(user, ["spending"]) };
  },

  "POST /api/cash/move": async (req) => {
    const { user, from, to, cents } = parse(moveBody, await readBody(req));
    const receipt = await cash.move(user, from, to, cents);
    return { mode: cash.mode, receipt, balances: await cash.balances(user, [from, to]) };
  },
};

const CASH_MESSAGES: Record<CashError["code"], [number, string]> = {
  insufficient: [409, "There isn't enough in that pocket for this move."],
  seed_limit: [429, "Mira is giving out a lot of test cash right now. Try again in a bit."],
  chain: [502, "The move didn't go through on Sui testnet. Nothing left your pocket; try again."],
};

const DIST = path.resolve(import.meta.dirname, "../../web/dist");
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webp": "image/webp",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

async function serveStatic(url: URL, res: ServerResponse): Promise<void> {
  const requested = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = path.join(DIST, requested.endsWith("/") ? `${requested}index.html` : requested);
  if (!file.startsWith(DIST)) file = path.join(DIST, "index.html");
  const isFile = await stat(file).then((s) => s.isFile(), () => false);
  if (!isFile) file = path.join(DIST, "index.html");
  try {
    const buf = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("This is Mira's API. The app is served from Vercel (ADR-0008); locally, run npm --prefix web run build.");
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/")) {
    void serveStatic(url, res);
    return;
  }
  const route = routes[`${req.method} ${url.pathname}`];
  if (!route) {
    send(res, 404, { error: "not_found", message: "No such endpoint." });
    return;
  }
  const started = Date.now();
  route(req, url)
    .then((body) => {
      send(res, 200, body);
      if (url.pathname !== "/api/health") log.info("api", { route: url.pathname, status: 200, ms: Date.now() - started });
    })
    .catch((err: unknown) => {
      if (err instanceof HttpError) {
        send(res, err.status, { error: err.code, message: err.message });
        log.info("api", { route: url.pathname, status: err.status, code: err.code });
        return;
      }
      if (err instanceof CashError) {
        const [status, message] = CASH_MESSAGES[err.code];
        send(res, status, { error: err.code, message });
        log.warn("api", { route: url.pathname, status, code: err.code, reason: err.message });
        return;
      }
      log.error("api", { route: url.pathname, reason: err instanceof Error ? err.message.slice(0, 200) : "unknown" });
      send(res, 502, { error: "failed", message: "Something went wrong on Mira's side. Try again." });
    });
});

process.on("unhandledRejection", (reason) => {
  log.error("unhandled", { reason: reason instanceof Error ? reason.message.slice(0, 200) : "unknown" });
});

server.listen(env.PORT, () => {
  log.info("listening", { port: env.PORT, memory: memory.mode, cash: cash.mode });
});
