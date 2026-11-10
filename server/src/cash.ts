import { createHmac, randomBytes } from "node:crypto";
import { readFunds } from "@mira/chain";
import type { Cents, Pocket } from "@mira/money";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

export type CashMode = "sui" | "preview";

/** $1 of Mira Cash is 0.001 testnet SUI (ADR-0004). */
export const MIST_PER_CENT = 10_000n;
const SUI = "0x2::sui::SUI";

export const toMist = (cents: Cents): bigint => BigInt(Math.round(cents)) * MIST_PER_CENT;
export const toCents = (mist: bigint): Cents => Number(mist / MIST_PER_CENT);

export function txUrl(digest: string): string {
  return `https://suiscan.xyz/testnet/tx/${digest}`;
}

/** A pocket's key, derived from the server's secret, so the server stores none (ADR-0004). */
export function pocketKeypair(secret: string, user: string, pocket: Pocket): Ed25519Keypair {
  const seed = createHmac("sha256", secret).update(`${user}:${pocket}`).digest();
  return Ed25519Keypair.fromSecretKey(seed);
}

export interface CashBackend {
  readonly mode: CashMode;
  balance(address: string): Promise<bigint>;
  seed(to: string, mist: bigint): Promise<string>;
  transfer(from: Ed25519Keypair, to: string, mist: bigint): Promise<string>;
}

export type CashErrorCode = "insufficient" | "seed_limit" | "chain";

export class CashError extends Error {
  readonly code: CashErrorCode;
  constructor(code: CashErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Every call goes through `@mira/chain`'s Tatum client; the operator sponsors gas (ADR-0004). */
export class SuiCash implements CashBackend {
  readonly mode = "sui" as const;
  private readonly client: SuiGrpcClient;
  private readonly operator: Ed25519Keypair;

  constructor(client: SuiGrpcClient, operator: Ed25519Keypair) {
    this.client = client;
    this.operator = operator;
  }

  async balance(address: string): Promise<bigint> {
    return (await readFunds(this.client, address, SUI)).total;
  }

  async seed(to: string, mist: bigint): Promise<string> {
    const tx = new Transaction();
    tx.setSender(this.operator.toSuiAddress());
    const [coin] = tx.splitCoins(tx.gas, [mist]);
    tx.transferObjects([coin], to);
    const result = await this.client.core.signAndExecuteTransaction({ transaction: tx, signer: this.operator, include: { effects: true } });
    return this.settled(result);
  }

  async transfer(from: Ed25519Keypair, to: string, mist: bigint): Promise<string> {
    const tx = new Transaction();
    tx.setSender(from.toSuiAddress());
    tx.setGasOwner(this.operator.toSuiAddress());
    tx.transferObjects([coinWithBalance({ balance: mist, useGasCoin: false })], to);
    const bytes = await tx.build({ client: this.client });
    const [user, sponsor] = await Promise.all([from.signTransaction(bytes), this.operator.signTransaction(bytes)]);
    const result = await this.client.core.executeTransaction({
      transaction: bytes,
      signatures: [user.signature, sponsor.signature],
      include: { effects: true },
    });
    return this.settled(result);
  }

  private async settled(result: Awaited<ReturnType<SuiGrpcClient["core"]["executeTransaction"]>>): Promise<string> {
    if (result.$kind === "FailedTransaction") {
      throw new CashError("chain", `transaction ${result.FailedTransaction.digest} failed`);
    }
    await this.client.core.waitForTransaction({ result });
    return result.Transaction.digest;
  }
}

/** In-process balances for preview mode (ADR-0006). Receipts say "preview", never a digest. */
export class PreviewCash implements CashBackend {
  readonly mode = "preview" as const;
  private readonly balances = new Map<string, bigint>();

  async balance(address: string): Promise<bigint> {
    return this.balances.get(address) ?? 0n;
  }

  async seed(to: string, mist: bigint): Promise<string> {
    this.balances.set(to, (this.balances.get(to) ?? 0n) + mist);
    return `preview-${randomBytes(8).toString("hex")}`;
  }

  async transfer(from: Ed25519Keypair, to: string, mist: bigint): Promise<string> {
    const address = from.toSuiAddress();
    const have = this.balances.get(address) ?? 0n;
    if (have < mist) throw new CashError("insufficient", "not enough in the pocket");
    this.balances.set(address, have - mist);
    this.balances.set(to, (this.balances.get(to) ?? 0n) + mist);
    return `preview-${randomBytes(8).toString("hex")}`;
  }
}

export interface Receipt {
  digest: string;
  url: string | null;
}

export interface CashOptions {
  secret: string;
  seedCents: Cents;
  seedsPerHour: number;
  now?: () => number;
}

/** Pockets per user: balances, the one-time test cash, and moves between a user's own pockets. */
export class CashService {
  private readonly backend: CashBackend;
  private readonly opts: CashOptions;
  private readonly now: () => number;
  private readonly seeded = new Set<string>();
  private seedTimes: number[] = [];
  private tail: Promise<unknown> = Promise.resolve();

  constructor(backend: CashBackend, opts: CashOptions) {
    this.backend = backend;
    this.opts = opts;
    this.now = opts.now ?? Date.now;
  }

  get mode(): CashMode {
    return this.backend.mode;
  }

  address(user: string, pocket: Pocket): string {
    return pocketKeypair(this.opts.secret, user, pocket).toSuiAddress();
  }

  async balances(user: string, pockets: readonly Pocket[]): Promise<Partial<Record<Pocket, Cents>>> {
    const entries = await Promise.all(
      pockets.map(async (p) => [p, toCents(await this.backend.balance(this.address(user, p)))] as const),
    );
    return Object.fromEntries(entries);
  }

  /** Gives a new user their test cash once. A user who already has money in Spending gets nothing. */
  open(user: string): Promise<{ seeded: boolean; receipt: Receipt | null }> {
    return this.serial(async () => {
      if (this.seeded.has(user)) return { seeded: false, receipt: null };
      const spending = this.address(user, "spending");
      if ((await this.backend.balance(spending)) > 0n) {
        this.seeded.add(user);
        return { seeded: false, receipt: null };
      }
      const hourAgo = this.now() - 3_600_000;
      this.seedTimes = this.seedTimes.filter((t) => t > hourAgo);
      if (this.seedTimes.length >= this.opts.seedsPerHour) {
        throw new CashError("seed_limit", "too many new pockets this hour");
      }
      const digest = await this.backend.seed(spending, toMist(this.opts.seedCents));
      this.seedTimes.push(this.now());
      this.seeded.add(user);
      return { seeded: true, receipt: this.receipt(digest) };
    });
  }

  move(user: string, from: Pocket, to: Pocket, cents: Cents): Promise<Receipt> {
    return this.serial(async () => {
      const source = pocketKeypair(this.opts.secret, user, from);
      const have = await this.backend.balance(source.toSuiAddress());
      if (have < toMist(cents)) throw new CashError("insufficient", "not enough in the pocket");
      const digest = await this.backend.transfer(source, this.address(user, to), toMist(cents));
      return this.receipt(digest);
    });
  }

  private receipt(digest: string): Receipt {
    return { digest, url: this.backend.mode === "sui" ? txUrl(digest) : null };
  }

  /** One chain write at a time, so the operator's gas coins never race. */
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.catch(() => undefined);
    return run;
  }
}
