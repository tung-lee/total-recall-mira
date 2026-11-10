// Live smoke test of the three YouCam-backed endpoints using the bundled sample photos.
// Usage: node scripts/smoke-live.mjs [skin|makeup|cloth ...]   (server must be running)
import { readFile } from 'node:fs/promises'

const BASE = process.env.BASE || 'http://localhost:8787'
const S = 'web/public/samples'
const dataUrl = async (f, type) => `data:${type};base64,${(await readFile(`${S}/${f}`)).toString('base64')}`
const only = process.argv.slice(2)

async function hit(name, body) {
  if (only.length && !only.includes(name)) return
  const t0 = Date.now()
  const res = await fetch(`${BASE}/api/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json()
  console.log(`\n[${name}] ${res.status} in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(JSON.stringify(json, null, 2).slice(0, 1500))
}

const health = await (await fetch(`${BASE}/api/health`)).json()
console.log('health', health)
const selfie = await dataUrl(process.env.SELFIE || 'selfie-face.jpg', 'image/jpeg')
await hit('skin', { image: selfie })
await hit('makeup', {
  image: selfie,
  effect: { category: 'lip_color', shape: { name: 'original' }, style: { type: 'full' }, palettes: [{ color: '#A24A57', texture: 'satin', colorIntensity: 70 }] },
})
await hit('cloth', { image: await dataUrl('person-full.jpg', 'image/jpeg'), garment: await dataUrl('garment-full.png', 'image/png'), category: 'full_body' })
