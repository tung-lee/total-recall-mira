import { describe, expect, it } from "vitest";
import { CashError, CashService, PreviewCash, pocketKeypair, toCents, toMist } from "./cash.ts";

const user = "u1234567890abcdef";
const make = (seedsPerHour = 5) => new CashService(new PreviewCash(), { secret: "s".repeat(32), seedCents: 10_000, seedsPerHour });

describe("pockets", () => {
  it("derives a stable, distinct key per user and pocket", () => {
    const a = pocketKeypair("s".repeat(32), user, "spending").toSuiAddress();
    expect(pocketKeypair("s".repeat(32), user, "spending").toSuiAddress()).toBe(a);
    expect(pocketKeypair("s".repeat(32), user, "goal:trip").toSuiAddress()).not.toBe(a);
    expect(pocketKeypair("t".repeat(32), user, "spending").toSuiAddress()).not.toBe(a);
  });

  it("converts dollars at $1 = 0.001 SUI", () => {
    expect(toMist(4100)).toBe(41_000_000n);
    expect(toCents(100_000_000n)).toBe(10_000);
  });
});

describe("CashService", () => {
  it("seeds test cash once, then moves exact amounts between a user's pockets", async () => {
    const cash = make();
    expect((await cash.open(user)).seeded).toBe(true);
    expect((await cash.open(user)).seeded).toBe(false);
    const receipt = await cash.move(user, "spending", "goal:trip", 4100);
    expect(receipt.digest).toMatch(/^preview-/);
    expect(receipt.url).toBeNull();
    expect(await cash.balances(user, ["spending", "goal:trip"])).toEqual({ spending: 5900, "goal:trip": 4100 });
  });

  it("refuses a move bigger than the pocket", async () => {
    const cash = make();
    await cash.open(user);
    await expect(cash.move(user, "spending", "goal:trip", 20_000)).rejects.toMatchObject({ code: "insufficient" });
  });

  it("caps new pockets per hour", async () => {
    const cash = make(1);
    await cash.open("uaaaaaaaaaaaaaaaa");
    await expect(cash.open("ubbbbbbbbbbbbbbbb")).rejects.toBeInstanceOf(CashError);
  });

  it("runs moves one at a time", async () => {
    const cash = make();
    await cash.open(user);
    const results = await Promise.allSettled([
      cash.move(user, "spending", "goal:trip", 6000),
      cash.move(user, "spending", "goal:trip", 6000),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect(await cash.balances(user, ["spending", "goal:trip"])).toEqual({ spending: 4000, "goal:trip": 6000 });
  });
});
