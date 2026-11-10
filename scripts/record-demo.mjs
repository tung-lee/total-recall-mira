// Records the end to end demo walkthrough with Playwright and logs scene timestamps
// (used to place captions and narration). Usage: node scripts/record-demo.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdir, writeFile, readdir, rename } from 'node:fs/promises'

const BASE = process.argv[2] || 'http://localhost:8787'
const OUT = 'artifacts/raw'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } })
const page = await ctx.newPage()
const t0 = Date.now()
const scenes = []
const mark = (name) => {
  scenes.push({ name, t: (Date.now() - t0) / 1000 })
  console.log(name, scenes.at(-1).t)
}
const wait = (ms) => page.waitForTimeout(ms)
const smoothScroll = async (to, ms = 2000) => {
  await page.evaluate(
    ([to, ms]) =>
      new Promise((r) => {
        const from = scrollY
        const s = performance.now()
        const step = (n) => {
          const k = Math.min(1, (n - s) / ms)
          scrollTo(0, from + (to - from) * (0.5 - Math.cos(Math.PI * k) / 2))
          k < 1 ? requestAnimationFrame(step) : r()
        }
        requestAnimationFrame(step)
      }),
    [to, ms],
  )
}
const chip = async (text) => {
  const b = page.locator('.chip', { hasText: text }).first()
  await b.waitFor({ timeout: 60_000 })
  await wait(600)
  await b.click()
}
const waitIdle = () => page.waitForFunction(() => !document.querySelector('.cancel-btn') && !document.querySelector('.bubble.typing'), null, { timeout: 150_000 })
const dragSlider = async () => {
  const box = await page.locator('.compare').last().boundingBox()
  if (!box) return
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, y)
  await page.mouse.down()
  for (const x of [0.92, 0.08, 0.5]) {
    await page.mouse.move(box.x + box.width * x, y, { steps: 30 })
    await wait(250)
  }
  await page.mouse.up()
}

await page.addInitScript(() => localStorage.clear())
await page.goto(BASE + '/')
mark('landing')
await wait(3500)
await smoothScroll(900, 2500)
await wait(2000)
await smoothScroll(1900, 2500)
await wait(1800)
await smoothScroll(0, 1500)
await page.evaluate(() => localStorage.clear())
await page.click('.cta')
mark('chat_open')
await page.waitForSelector('.chip', { timeout: 20_000 })
await wait(1200)

mark('scan')
await chip('Scan my skin')
await chip('Use demo selfie')
mark('agent_trace')
await page.waitForSelector('.card.skin', { timeout: 150_000 })
mark('skin_report')
await page.waitForSelector('.carousel .card.product', { timeout: 60_000 })
await wait(2500)
const car = page.locator('.carousel').last()
await car.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' }))
await wait(1800)
await car.evaluate((el) => el.scrollTo({ left: 0, behavior: 'smooth' }))
mark('auto_tryon')
await page.waitForSelector('.card.tryon', { timeout: 150_000 })
await waitIdle()
await wait(1500)
await dragSlider()
await wait(1200)

mark('typed_question')
await page.click('.field input')
await page.keyboard.type('can you show me a bolder lip?', { delay: 55 })
await wait(400)
await page.keyboard.press('Enter')
await page.waitForSelector('.card.shade', { timeout: 20_000 })
await wait(1500)
await page.locator('.card.shade', { hasText: 'Cherry' }).last().click()
mark('shade_tryon')
await page.waitForFunction(() => document.querySelectorAll('.card.tryon').length >= 2, null, { timeout: 150_000 })
await waitIdle()
await wait(1200)
await dragSlider()
await wait(1000)

mark('outfit')
await page.click('.field input')
await page.keyboard.type('what about an outfit?', { delay: 55 })
await page.keyboard.press('Enter')
await page.waitForSelector('.card.garment', { timeout: 20_000 })
await wait(1500)
await page.locator('.card.garment').last().click()
await chip('Use demo full body photo')
mark('cloth_tryon')
await page.waitForFunction(() => document.querySelectorAll('.card.tryon').length >= 3, null, { timeout: 180_000 })
await waitIdle()
await wait(1500)
await dragSlider()
await wait(1200)

mark('memory')
await chip('What you know about me')
await page.waitForSelector('.card.memory', { timeout: 20_000 })
await wait(4000)
mark('end')

await ctx.close()
await browser.close()
const files = (await readdir(OUT)).filter((f) => f.endsWith('.webm') && !f.startsWith('demo'))
await rename(`${OUT}/${files.at(-1)}`, `${OUT}/demo.webm`)
await writeFile(`${OUT}/scenes.json`, JSON.stringify(scenes, null, 2))
console.log('saved', `${OUT}/demo.webm`)
