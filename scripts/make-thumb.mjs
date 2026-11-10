// Renders docs/deck/thumb.html to docs/deck/thumbnail.png (1500x1000, 3:2).
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } })
await page.goto(pathToFileURL(path.resolve('docs/deck/thumb.html')).href)
await page.waitForTimeout(500)
await page.screenshot({ path: 'docs/deck/thumbnail.png' })
await browser.close()
console.log('saved docs/deck/thumbnail.png')
