/**
 * The happy path (PRD §5) in Chromium, against the real server in preview mode (ADR-0006): memory is the
 * SDK's in-process mock and pockets are simulated, so nothing reaches mainnet or testnet.
 *   npm run e2e            (builds the web app first if web/dist is missing)
 *   E2E_HEADED=1 npm run e2e
 * Screenshots land in artifacts/e2e/.
 */
import assert from "node:assert/strict";
import { type ChildProcess, execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";

const ROOT = new URL("..", import.meta.url).pathname;
const SHOTS = join(ROOT, "artifacts", "e2e");

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const addr = srv.address();
      srv.close(() => (typeof addr === "object" && addr ? resolve(addr.port) : reject(new Error("no port"))));
    });
  });
}

async function startServer(port: number): Promise<ChildProcess> {
  const child = spawn(process.execPath, ["server/src/index.ts"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), MIRA_PREVIEW: "1", LOG_LEVEL: "warn" },
    stdio: ["ignore", "inherit", "inherit"],
  });
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) return child;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error("server didn't start");
}

let step = 0;
async function check(name: string, fn: () => Promise<void>) {
  step++;
  const t0 = Date.now();
  await fn();
  console.log(`  ✓ ${String(step).padStart(2)} ${name} (${Date.now() - t0} ms)`);
}

const T = 15_000;

async function waitIdle(page: Page) {
  await page.locator(".bubble.typing").waitFor({ state: "detached", timeout: T });
  await page.waitForFunction(() => !document.querySelector(".chip:disabled") && !document.querySelector(".trace li.run"), null, { timeout: T });
}

async function send(page: Page, text: string) {
  await waitIdle(page);
  await page.getByLabel("Message Mira").fill(text);
  await page.getByLabel("Send").click();
  await page.locator(".row.me .bubble", { hasText: text }).last().waitFor({ timeout: T });
}

async function lastText(page: Page, contains: string) {
  await page.locator(".row.mira .bubble", { hasText: contains }).last().waitFor({ timeout: T });
}

async function lastCard(page: Page, testId: string) {
  const card = page.getByTestId(testId).last();
  await card.waitFor({ timeout: T });
  return card;
}

async function main() {
  if (!existsSync(join(ROOT, "web", "dist", "index.html"))) execSync("npm --prefix web run build", { cwd: ROOT, stdio: "inherit" });
  mkdirSync(SHOTS, { recursive: true });
  const port = await freePort();
  const server = await startServer(port);
  const base = `http://localhost:${port}`;
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: !process.env.E2E_HEADED });
    const desk = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    const errors: string[] = [];
    desk.on("pageerror", (e) => errors.push(e.message));

    console.log("device A (desktop)");
    await check("the landing page links to the chat", async () => {
      await desk.goto(base);
      await desk.getByRole("heading", { name: "Meet Mira" }).waitFor({ timeout: T });
      await desk.getByRole("link", { name: "Text Mira" }).first().click();
      await lastText(desk, "i'm Mira");
      assert.equal(await desk.getByTestId("mode-badge").innerText(), "preview");
      assert.match(await desk.getByTestId("howto").first().innerText(), /Ask before you buy/);
      assert.match(await desk.getByTestId("memory-panel").innerText(), /Nothing yet/);
    });

    await check("help shows what Mira understands, and its examples send", async () => {
      await send(desk, "help");
      const help = await lastCard(desk, "help-card");
      assert.match(await help.innerText(), /Ask before you buy/);
      await waitIdle(desk);
    });

    await check("a budget by text", async () => {
      await send(desk, "budget 400 a month");
      await lastText(desk, "about $400 a month");
      assert.match(await (await lastCard(desk, "budget-card")).innerText(), /\$400 left/);
      assert.match(await (await lastCard(desk, "learned-note")).innerText(), /Remembered\s+Budget: about \$400 a month/);
      assert.match(await desk.getByTestId("status-strip").innerText(), /\$400 left/);
    });

    await check("a goal opens pockets with test cash", async () => {
      await send(desk, "saving 1200 for tokyo by march");
      const goal = await lastCard(desk, "goal-card");
      await lastText(desk, "when i talk you out of a buy");
      const text = await goal.innerText();
      assert.match(text, /\$0 of \$1,200/);
      assert.match(text, /Spending \$100/);
      assert.match(await desk.getByTestId("status-strip").innerText(), /tokyo \$0 \/ \$1,200/);
    });

    await check("a cap by text", async () => {
      await send(desk, "cap eating out at 60 a week");
      await lastText(desk, "eating out capped at about $60 a week");
    });

    await check("spends are filed from the keyword list", async () => {
      for (const [msg, category] of [["coffee 5.5", "treats"], ["uber 18", "transport"], ["ramen 24", "eating out"]] as const) {
        await send(desk, msg);
        const card = await lastCard(desk, "spend-card");
        await card.getByTestId("spend-category").filter({ hasText: category }).waitFor({ timeout: T });
      }
      assert.match(await (await lastCard(desk, "spend-card")).innerText(), /\$352\.50 left this month/);
    });

    await check("a correction becomes a rule, and the next spend uses it", async () => {
      await send(desk, "coffee counts as eating out");
      await lastText(desk, "coffee goes under eating out from now on");
      await send(desk, "coffee 4");
      const card = await lastCard(desk, "spend-card");
      assert.match(await card.innerText(), /from memory: coffee → eating out/);
      assert.match(await card.innerText(), /\$33\.50 \/ \$60/);
    });

    await check("should I buy: price check and a think-twice from the default threshold", async () => {
      await send(desk, "should i buy the $48 serum?");
      const advice = await lastCard(desk, "advice-card");
      await waitIdle(desk);
      const text = await advice.innerText();
      assert.match(text, /\$41 at Shelf/);
      assert.equal(await advice.getByTestId("verdict").innerText(), "Think twice");
      assert.match(text, /\$40 and up is where beauty buys turn impulsive/);
      assert.match(text, /3% of your tokyo goal/);
      await desk.screenshot({ path: join(SHOTS, "a-advice.png") });
    });

    await check("skip and save moves the money and lowers the threshold", async () => {
      await desk.locator(".chip", { hasText: "skip it, move $41 to tokyo" }).click();
      const moved = await lastCard(desk, "moved-card");
      assert.match(await moved.innerText(), /Moved \$41 to tokyo/);
      assert.match(await moved.innerText(), /Spending \$59/);
      await lastText(desk, "$41 of $1,200 (3%)");
      await lastText(desk, "so i'll flag beauty from $30 now");
      assert.match(await (await lastCard(desk, "learned-note")).innerText(), /Skipped a beauty buy, about \$40/);
      assert.match(await desk.getByTestId("status-strip").innerText(), /tokyo \$41 \/ \$1,200/);
    });

    await check("the next, smaller buy is flagged because of memory", async () => {
      await send(desk, "thinking about a 38 lipstick");
      const advice = await lastCard(desk, "advice-card");
      await waitIdle(desk);
      assert.match(await advice.innerText(), /\$32 at Basket/);
      assert.equal(await advice.getByTestId("verdict").innerText(), "Think twice");
      assert.match(await advice.innerText(), /You skipped a beauty buy of about \$40, so I flag beauty from \$30/);
      await lastText(desk, "last time you skipped one like this");
      await desk.locator(".chip", { hasText: "buy anyway" }).click();
      await lastText(desk, "logged it");
    });

    let code = "";
    await check("what Mira knows: typed, rounded lines, all saved", async () => {
      await send(desk, "what do you know about me?");
      const mem = await lastCard(desk, "memory-card");
      await desk.waitForFunction(() => !document.querySelector('[data-testid="memory-card"]')?.textContent?.includes("saving…"), null, { timeout: T });
      const text = await mem.innerText();
      for (const line of [
        "Budget: about $400 a month",
        "Goal: trip, about $1,200 by Mar 2027",
        "Cap on eating out: about $60 a week",
        "coffee → eating out",
        "Skipped a beauty buy, about $40",
        "Bought past a nudge: beauty, about $30",
      ]) {
        assert.ok(text.includes(line), `memory card is missing ${line}`);
      }
      assert.match(text, /rules you taught me/i);
      assert.ok(!/tokyo|ramen|uber/i.test(text), "a label reached memory");
      const lines = await mem.locator(".memlist li").count();
      assert.ok(lines >= 7, `expected at least 7 memory lines, saw ${lines}`);
      await mem.locator("summary").first().click();
      assert.match(await mem.locator(".mem-raw code").first().innerText(), /^[A-Z]+ · /);
      assert.match(await desk.getByTestId("memory-panel").innerText(), /coffee → eating out/);
      code = await desk.evaluate(() => JSON.parse(localStorage.getItem("mira.device.v1") ?? "{}").user as string);
      assert.match(code, /^[a-z0-9]{16,40}$/);
      await desk.screenshot({ path: join(SHOTS, "a-memory.png") });
    });

    await check("the handoff link carries the Mira code", async () => {
      await desk.getByLabel("More").click();
      await desk.getByRole("button", { name: /Continue on my phone/ }).click();
      assert.equal(await desk.getByTestId("handoff-link").innerText(), `${base}/#/chat?me=${code}`);
      await desk.getByRole("button", { name: "Done" }).click();
    });

    await check("a reload on the same device says welcome back", async () => {
      await desk.reload();
      await lastText(desk, "welcome back");
      await lastText(desk, "still saving for tokyo? $41 of $1,200");
    });

    console.log("device B (phone, empty ledger)");
    const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    phone.on("pageerror", (e) => errors.push(e.message));

    await check("the phone restores everything from memory", async () => {
      await phone.goto(`${base}/#/chat?me=${code}`);
      await phone.locator(".trace", { hasText: "Remembering you" }).waitFor({ timeout: T });
      await lastText(phone, "i remember you");
      const greeting = await phone.locator(".row.mira .bubble", { hasText: "i remember you" }).last().innerText();
      for (const part of ["budget about $400 a month", "trip goal, about $1,200 by Mar 2027", "coffee → eating out", "i flag beauty from $30"]) {
        assert.ok(greeting.includes(part), `restored greeting is missing "${part}"`);
      }
      assert.match(await (await lastCard(phone, "budget-card")).innerText(), /carried over from memory/);
      assert.equal(await (await lastCard(phone, "goal-card")).getByTestId("goal-saved").innerText(), "$41");
      assert.equal(await phone.evaluate(() => location.hash), "#/chat");
    });

    await check("the phone files and flags from memory", async () => {
      await send(phone, "coffee 3");
      assert.match(await (await lastCard(phone, "spend-card")).innerText(), /from memory: coffee → eating out/);
      await send(phone, "should i buy the $48 serum?");
      const advice = await lastCard(phone, "advice-card");
      await waitIdle(phone);
      assert.match(await advice.innerText(), /so I flag beauty from \$30/);
      await phone.screenshot({ path: join(SHOTS, "b-phone.png") });
    });

    await check("nothing threw in either page", async () => {
      assert.deepEqual(errors, []);
    });
    console.log(`\nE2E passed: ${step} checks. Screenshots in artifacts/e2e/`);
  } finally {
    await browser?.close();
    server.kill();
  }
}

main().catch((err: unknown) => {
  console.error(`\n✗ E2E failed at check ${step}:`, err instanceof Error ? err.message : err);
  process.exit(1);
});
