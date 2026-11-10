// Renders docs/deck/deck.html to docs/deck/Mira-deck.pdf. Usage: node scripts/make-deck.mjs
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto(pathToFileURL(path.resolve('docs/deck/deck.html')).href)
await page.waitForTimeout(500)
await page.pdf({ path: 'docs/deck/Mira-deck.pdf', width: '1600px', height: '900px', printBackground: true })
await browser.close()
console.log('saved docs/deck/Mira-deck.pdf')
