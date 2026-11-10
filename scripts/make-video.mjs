// Builds the submission video from artifacts/raw/demo.webm + scenes.json:
// title cards and captions rendered with Playwright, voiceover with macOS `say`, cut with ffmpeg.
// Usage: node scripts/make-video.mjs   (writes artifacts/mira-demo.mp4)
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const RAW = 'artifacts/raw'
const WORK = 'artifacts/work'
const OUT = 'artifacts/mira-demo.mp4'
await mkdir(WORK, { recursive: true })
const scenes = JSON.parse(await readFile(`${RAW}/scenes.json`, 'utf8'))
const at = (name) => scenes.find((s) => s.name === name).t

const ff = (...args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' })
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString())

// kind: card (full screen slide) or clip (footage from..to with a caption)
const plan = [
  { kind: 'card', id: 'title', html: titleCard(), say: 'Meet Mira. A free A.I. beauty and style assistant that lives in your iMessage, built on the YouCam A.P.I.' },
  { kind: 'card', id: 'problem', html: problemCard(), say: 'People wonder about their skin right before a purchase. Today that means a quiz, a guess, a lipstick that looked better on the model, and paying full price. Mira turns that moment into one text.' },
  { kind: 'clip', id: 'landing', from: at('landing') + 0.5, to: at('chat_open'), cap: 'Reads your skin. Tries it on you. Checks every store.', say: 'Mira reads your skin, tries everything on you, and checks every store, so you buy the right thing for less.' },
  { kind: 'clip', id: 'scan', from: at('chat_open'), to: at('skin_report'), cap: 'One selfie starts the agent', say: 'Send one selfie. Mira plans the work, and streams every step of the agent into the chat.' },
  { kind: 'clip', id: 'skin', from: at('skin_report'), to: at('skin_report') + 1.5, cap: 'YouCam AI Skin Analysis: 8 concerns, skin age, matched picks, best price', say: 'YouCam A.I. Skin Analysis scores eight concerns and estimates skin age. Mira picks one product for each of your three weakest scores, with reviews, sources, and the best price across three stores.' },
  { kind: 'clip', id: 'auto', from: at('skin_report') + 1.5, to: at('typed_question'), cap: 'Unprompted: YouCam Makeup VTO tries the best shade on you', say: 'Then, without being asked, it picks a lip shade from your redness score, and tries it on your face with YouCam Makeup V.T.O.' },
  { kind: 'clip', id: 'typed', from: at('typed_question'), to: at('outfit'), cap: 'Just text it. Tap any shade to see it on you', say: 'You can just text it. Ask for a bolder lip, and tap any shade to see it on you, with the cheapest store already found.' },
  { kind: 'clip', id: 'outfit', from: at('outfit'), to: at('memory'), cap: 'YouCam AI Clothes puts the full look on your body', say: 'Ask for an outfit, send a full body photo, and YouCam A.I. Clothes dresses you in the look, paired with the shade you just picked.' },
  { kind: 'clip', id: 'memory', from: at('memory'), to: at('end'), cap: 'Learns how you shop, stored on your phone', say: 'Mira remembers your skin type, your shade, your score history, and how much it saved you, so every chat starts smarter.' },
  { kind: 'card', id: 'apis', html: apiCard(), say: 'Under the hood, a Node server keeps the YouCam key private and runs the version two flow for each feature: register the file, upload it, create the task, and poll for the result. Skin Analysis, Makeup V.T.O, and A.I. Clothes, chained by one agent.' },
  { kind: 'card', id: 'outro', html: outroCard(), say: 'Mira. Your skin, your face, your price.' },
]

// 0. Playwright webm has sparse cues, so seeking it is unreliable; transcode to CFR mp4 once.
const SRC = `${WORK}/demo-cfr.mp4`
ff('-i', `${RAW}/demo.webm`, '-vf', 'fps=30,scale=1280:720', '-g', '15', '-c:v', 'libx264', '-crf', '14', '-an', SRC)

// 1. voiceover
// Prefers studio voice files in assets/voice/<id>.mp3 (ElevenLabs); falls back to macOS `say`.
for (const s of plan) {
  const studio = `assets/voice/${s.id}.mp3`
  s.audio = `${WORK}/${s.id}.wav`
  if (existsSync(studio)) ff('-i', studio, '-ar', '48000', '-ac', '1', s.audio)
  else {
    execFileSync('say', ['-v', 'Samantha', '-r', '178', '-o', `${WORK}/${s.id}.aiff`, s.say])
    ff('-i', `${WORK}/${s.id}.aiff`, '-ar', '48000', '-ac', '1', s.audio)
  }
  s.voice = dur(s.audio)
}

// 2. cards and captions
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
for (const s of plan) {
  if (s.kind === 'card') {
    await page.setContent(shell(s.html))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${WORK}/${s.id}.png` })
  } else {
    await page.setContent(shell(`<div class="cap"><span>${s.cap}</span></div>`, true))
    await page.waitForTimeout(150)
    await page.screenshot({ path: `${WORK}/${s.id}.png`, omitBackground: true })
  }
}
await browser.close()

// 3. segments
const parts = []
for (const s of plan) {
  const len = Math.max(s.kind === 'card' ? 0 : s.to - s.from, s.voice + 0.8)
  const out = `${WORK}/seg-${s.id}.mp4`
  const audio = ['-i', s.audio]
  const aFilter = `[1:a]adelay=300|300,apad,atrim=0:${len.toFixed(2)},aformat=sample_rates=48000:channel_layouts=stereo[a]`
  if (s.kind === 'card') {
    ff('-loop', '1', '-t', len.toFixed(2), '-i', `${WORK}/${s.id}.png`, ...audio, '-filter_complex',
      `[0:v]scale=1280:720,fps=30,format=yuv420p,fade=in:st=0:d=0.3[v];${aFilter}`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-c:a', 'aac', '-t', len.toFixed(2), out)
  } else {
    const clipLen = s.to - s.from
    const slow = Math.min(1.8, Math.max(1, len / clipLen))
    ff('-i', SRC, ...audio, '-i', `${WORK}/${s.id}.png`, '-filter_complex',
      `[0:v]trim=start=${s.from.toFixed(2)}:end=${s.to.toFixed(2)},setpts=(PTS-STARTPTS)*${slow.toFixed(3)},tpad=stop_mode=clone:stop_duration=${Math.max(0, len - clipLen * slow + 0.1).toFixed(2)},format=yuv420p[base];[base][2:v]overlay=0:0[v];${aFilter}`,
      '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-c:a', 'aac', '-t', len.toFixed(2), out)
  }
  parts.push(out)
  s.len = len
  console.log(s.id, len.toFixed(1) + 's')
}
await writeFile(`${WORK}/list.txt`, parts.map((p) => `file '${p.replace(WORK + '/', '')}'`).join('\n'))
const VOICE_ONLY = `${WORK}/voice-only.mp4`
ff('-f', 'concat', '-safe', '0', '-i', `${WORK}/list.txt`, '-c', 'copy', VOICE_ONLY)

// 4. GarageBand loop bed ducked under the voice, plus a whoosh on every cut and a ding on reveals.
const total = dur(VOICE_ONLY)
const cues = []
let t = 0
for (const s of plan) {
  if (t > 0) cues.push(['whoosh', t - 0.12])
  if (['title', 'skin', 'auto', 'outfit', 'memory', 'outro'].includes(s.id)) cues.push(['ding', t + (s.kind === 'card' ? 0.25 : 1.2)])
  t += s.len
}
const sfxInputs = cues.flatMap(([name]) => ['-i', `assets/audio/${name}.wav`])
const sfxChains = cues.map(([, at], i) => `[${i + 2}:a]adelay=${Math.round(at * 1000)}:all=1,volume=0.5[s${i}]`).join(';')
const sfxLabels = cues.map((_, i) => `[s${i}]`).join('')
ff('-i', VOICE_ONLY, '-i', 'assets/audio/bed.mp3', ...sfxInputs, '-filter_complex',
  `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[voice][key];` +
  `[1:a]atrim=0:${total.toFixed(2)},volume=0.32,afade=t=out:st=${(total - 3).toFixed(2)}:d=3[bed];` +
  `[bed][key]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=350[ducked];` +
  `${sfxChains};[voice][ducked]${sfxLabels}amix=inputs=${cues.length + 2}:normalize=0:duration=first,alimiter=limit=0.95[mix]`,
  '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT)
console.log('saved', OUT, dur(OUT).toFixed(1) + 's')

// ---------- templates ----------
function shell(body, transparent = false) {
  return `<!doctype html><html><head><style>
  *{box-sizing:border-box} html,body{margin:0;width:1280px;height:720px;font-family:'Inter Tight','SF Pro Display',-apple-system,Helvetica,sans-serif;color:#0c0c0d;background:${transparent ? 'transparent' : '#fff'};overflow:hidden}
  .card{width:1280px;height:720px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;background:radial-gradient(50% 45% at 15% 10%,#ffe3f1,transparent 60%),radial-gradient(45% 45% at 90% 95%,#e6f9d4,transparent 60%),#fff}
  h1{font-size:120px;letter-spacing:-.055em;margin:0;font-weight:600;line-height:1}
  h2{font-size:58px;letter-spacing:-.045em;margin:0 0 28px;font-weight:600;line-height:1.05;max-width:1050px}
  p{font-size:30px;letter-spacing:-.025em;margin:18px 0 0;color:#444}
  .pills{display:flex;gap:12px;margin-top:40px;flex-wrap:wrap;justify-content:center}
  .pills span{background:#111;color:#fff;border-radius:99px;padding:12px 22px;font-size:22px;font-weight:500}
  .x{display:grid;gap:14px;font-size:30px;text-align:left;color:#6b6b70}
  .x b{color:#ff453a;margin-right:12px}
  table{border-collapse:separate;border-spacing:0 10px;font-size:24px;text-align:left}
  td{padding:14px 22px;background:#f5f5f6} td:first-child{border-radius:16px 0 0 16px;font-weight:600} td:last-child{border-radius:0 16px 16px 0;color:#555}
  code{font-family:SFMono-Regular,Menlo,monospace;font-size:19px;color:#0b84fe}
  .blob{position:absolute;font-size:120px}
  .cap{position:absolute;left:0;right:0;bottom:34px;display:flex;justify-content:center}
  .cap span{background:rgba(12,12,13,.86);color:#fff;font-size:26px;font-weight:500;letter-spacing:-.02em;padding:14px 26px;border-radius:18px;max-width:1100px;text-align:center}
  </style></head><body>${body}</body></html>`
}
function blobSvg(color, mood) {
  const pts = []
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * i) / 12
    const r = i % 2 === 0 ? 48 : 38
    pts.push(`${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`)
  }
  const face = mood === 'happy'
    ? '<path d="M33 52 Q38 44 43 52"/><path d="M57 52 Q62 44 67 52"/>'
    : '<path d="M32 45 L42 50 L32 55"/><path d="M68 45 L58 50 L68 55"/>'
  return `<svg viewBox="0 0 100 100" width="150" height="150"><polygon points="${pts.join(' ')}" fill="${color}" stroke="${color}" stroke-width="6" stroke-linejoin="round"/><g stroke="#1b1b1f" stroke-width="4.5" fill="none" stroke-linecap="round">${face}</g></svg>`
}
function titleCard() {
  return `<div class="card"><div class="blob" style="left:180px;top:70px">${blobSvg('#F59AC9', 'happy')}</div><div class="blob" style="right:150px;top:90px">${blobSvg('#9BE15D', 'squint')}</div>
  <h1>Meet Mira</h1><p>Your free AI beauty &amp; style assistant, right in iMessage</p>
  <div class="pills"><span>YouCam AI Skin Analysis</span><span>YouCam Makeup VTO</span><span>YouCam AI Clothes</span></div></div>`
}
function problemCard() {
  return `<div class="card"><h2>You wonder about your skin right before you buy.</h2><div class="x">
  <div><b>✕</b>A quiz instead of a measurement</div><div><b>✕</b>A serum that breaks you out</div>
  <div><b>✕</b>A lipstick that looked better on the model</div><div><b>✕</b>Full price at the first store</div></div></div>`
}
function apiCard() {
  return `<div class="card"><h2>How Mira uses the YouCam API</h2><table>
  <tr><td>AI Skin Analysis</td><td><code>POST /s2s/v2.0/task/skin-analysis</code></td><td>8 concerns, skin age, masks</td></tr>
  <tr><td>Makeup VTO</td><td><code>POST /s2s/v2.0/task/makeup-vto</code></td><td>lip_color chosen from redness</td></tr>
  <tr><td>AI Clothes</td><td><code>POST /s2s/v2.0/task/cloth-v4</code></td><td>full look on your photo</td></tr>
  </table><p>Upload to presigned URL, create task, poll. Key stays on the server.</p></div>`
}
function outroCard() {
  return `<div class="card"><div class="blob" style="left:565px;top:90px">${blobSvg('#F59AC9', 'happy')}</div><h2 style="margin-top:120px">Your skin, your face, your price.</h2><p>Mira · built with the YouCam API</p></div>`
}
