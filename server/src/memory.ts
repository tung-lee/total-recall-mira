import { createHash } from "node:crypto";
import type { Logger } from "@mira/chain";
import { NAMESPACE, type RateLimiter, redactCredentials, runLimited } from "@mira/memory";
import { type Fact, factLine, MEMORY_KINDS, type MemoryKind, memoryKind, parseLine } from "@mira/money";
import type {
  RecallParams,
  RecallResult,
  RememberBulkAcceptedResult,
  RememberBulkAsyncOptions,
  RememberBulkItem,
  RememberBulkOptions,
  RememberBulkResult,
} from "@mysten-incubation/memwal";

/** The part of `MemWal` (and of the SDK's `MemWalMock`) the server uses. */
export interface MemoryBackend {
  rememberBulk(items: RememberBulkItem[], options?: RememberBulkAsyncOptions): Promise<RememberBulkAcceptedResult>;
  waitForRememberJobs(jobIds: string[], namespaces?: string[], opts?: RememberBulkOptions): Promise<RememberBulkResult>;
  recall(params: RecallParams): Promise<RecallResult>;
}

export type MemoryMode = "walrus" | "preview";
export type JobStatus = "queued" | "writing" | "done" | "failed";

export interface Job {
  key: string;
  user: string;
  kind: MemoryKind;
  namespace: string;
  line: string;
  status: JobStatus;
  blobId: string | null;
  tries: number;
}

export interface RecalledLine {
  key: string;
  kind: MemoryKind;
  line: string;
  fact: Fact;
  status: "stored" | JobStatus;
  blobId: string | null;
  createdAt: string | null;
}

export interface MemoryOptions {
  mode: MemoryMode;
  writes: RateLimiter;
  reads: RateLimiter;
  log: Logger;
  batchSize?: number;
  maxTries?: number;
  pollIntervalMs?: number;
  jobTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const QUERY: Record<MemoryKind, string> = {
  prefs: "monthly budget, category caps, savings goal, month spent",
  rules: "rule: keyword goes to category",
  nudges: "nudge outcome: skipped or bought anyway",
  habits: "habit: weekly spend and peak days",
};

export function jobKey(namespace: string, line: string): string {
  return createHash("sha256").update(`${namespace}\n${line}`).digest("hex").slice(0, 32);
}

/**
 * Writes typed lines to Walrus Memory without ever blocking a reply (PRD §8.4), and reads a user's
 * namespaces back as facts. One writer drains the queue in bulk batches of up to 20.
 */
export class MemoryService {
  readonly mode: MemoryMode;
  private readonly backend: MemoryBackend;
  private readonly opts: Required<Omit<MemoryOptions, "mode" | "writes" | "reads" | "log">>;
  private readonly writes: RateLimiter;
  private readonly reads: RateLimiter;
  private readonly log: Logger;
  private readonly jobs = new Map<string, Job>();
  private queue: string[] = [];
  private draining: Promise<void> | null = null;

  constructor(backend: MemoryBackend, opts: MemoryOptions) {
    this.backend = backend;
    this.mode = opts.mode;
    this.writes = opts.writes;
    this.reads = opts.reads;
    this.log = opts.log;
    this.opts = {
      batchSize: opts.batchSize ?? 20,
      maxTries: opts.maxTries ?? 3,
      pollIntervalMs: opts.pollIntervalMs ?? 2_000,
      jobTimeoutMs: opts.jobTimeoutMs ?? 180_000,
      sleep: opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    };
  }

  /** Builds and queues one line per fact. Facts must already be validated as writable. */
  write(user: string, facts: readonly Fact[]): Job[] {
    const out = facts.map((fact) => {
      const kind = memoryKind(fact);
      const namespace = NAMESPACE[kind](user);
      const line = redactCredentials(factLine(fact)).text;
      const key = jobKey(namespace, line);
      const existing = this.jobs.get(key);
      if (existing && existing.status !== "failed") return existing;
      const job: Job = { key, user, kind, namespace, line, status: "queued", blobId: null, tries: 0 };
      this.jobs.set(key, job);
      this.queue.push(key);
      return job;
    });
    this.kick();
    return out;
  }

  status(user: string, keys: readonly string[]): Array<Job | { key: string; status: "unknown" }> {
    return keys.map((key) => {
      const job = this.jobs.get(key);
      return job && job.user === user ? job : { key, status: "unknown" as const };
    });
  }

  counts(): Record<JobStatus, number> {
    const counts: Record<JobStatus, number> = { queued: 0, writing: 0, done: 0, failed: 0 };
    for (const job of this.jobs.values()) counts[job.status]++;
    return counts;
  }

  /** Waits for the queue to drain. For tests and shutdown. */
  async idle(): Promise<void> {
    while (this.draining) await this.draining;
  }

  /**
   * Every line in the user's four namespaces, parsed back into facts, plus the lines still on their way.
   * A line that doesn't parse is dropped: recalled text is data, never instructions.
   */
  async recall(user: string): Promise<RecalledLine[]> {
    const perKind = await Promise.all(
      MEMORY_KINDS.map(async (kind) => {
        const namespace = NAMESPACE[kind](user);
        const results = await this.recallNamespace(namespace, QUERY[kind]);
        return results.map((r) => ({ kind, namespace, ...r }));
      }),
    );
    const out = new Map<string, RecalledLine>();
    for (const r of perKind.flat()) {
      const fact = parseLine(r.text);
      if (!fact) continue;
      const key = jobKey(r.namespace, r.text.trim());
      out.set(key, { key, kind: r.kind, line: r.text.trim(), fact, status: "stored", blobId: r.blob_id, createdAt: r.created_at ?? null });
    }
    for (const job of this.jobs.values()) {
      if (job.user !== user || out.has(job.key) || job.status === "failed") continue;
      const fact = parseLine(job.line);
      if (!fact) continue;
      out.set(job.key, { key: job.key, kind: job.kind, line: job.line, fact, status: job.status, blobId: job.blobId, createdAt: null });
    }
    return [...out.values()];
  }

  private async recallNamespace(namespace: string, query: string): Promise<RecallResult["results"]> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await runLimited(this.reads, () => this.backend.recall({ query, namespace, limit: 50 }));
      if (res.results.length > 0 || !res.dropped_count) return res.results;
      this.log.warn("memory.recall.dropped", { namespace, dropped: res.dropped_count, attempt });
      await this.opts.sleep(500 * 2 ** attempt);
    }
    return [];
  }

  private kick(): void {
    if (this.draining || this.queue.length === 0) return;
    this.draining = this.drain().finally(() => {
      this.draining = null;
      this.kick();
    });
  }

  private async drain(): Promise<void> {
    while (this.queue.length > 0) {
      const batch = this.queue
        .splice(0, this.opts.batchSize)
        .map((key) => this.jobs.get(key))
        .filter((job): job is Job => job !== undefined && job.status === "queued");
      if (batch.length === 0) continue;
      for (const job of batch) {
        job.status = "writing";
        job.tries++;
      }
      await this.writeBatch(batch);
    }
  }

  private async writeBatch(batch: Job[]): Promise<void> {
    const idempotencyKey = createHash("sha256")
      .update(batch.map((j) => `${j.key}:${j.tries}`).join(","))
      .digest("hex")
      .slice(0, 48);
    try {
      const accepted = await runLimited(this.writes, () =>
        this.backend.rememberBulk(
          batch.map((j) => ({ text: j.line, namespace: j.namespace })),
          { idempotencyKey },
        ),
      );
      const result = await this.backend.waitForRememberJobs(
        accepted.job_ids,
        batch.map((j) => j.namespace),
        { pollIntervalMs: this.opts.pollIntervalMs, timeoutMs: this.opts.jobTimeoutMs },
      );
      batch.forEach((job, i) => {
        const r = result.results[i];
        if (r?.status === "done" && r.blob_id) {
          job.status = "done";
          job.blobId = r.blob_id;
        } else {
          this.retryOrFail(job, r?.status ?? "missing");
        }
      });
      this.log.info("memory.write", { lines: batch.length, done: result.succeeded, failed: result.failed });
    } catch (err) {
      this.log.warn("memory.write.error", { lines: batch.length, reason: err instanceof Error ? err.message.slice(0, 160) : "unknown" });
      for (const job of batch) this.retryOrFail(job, "error");
      await this.opts.sleep(2_000);
    }
  }

  private retryOrFail(job: Job, reason: string): void {
    if (job.tries < this.opts.maxTries) {
      job.status = "queued";
      this.queue.push(job.key);
    } else {
      job.status = "failed";
      this.log.warn("memory.write.failed", { key: job.key, kind: job.kind, reason });
    }
  }
}
