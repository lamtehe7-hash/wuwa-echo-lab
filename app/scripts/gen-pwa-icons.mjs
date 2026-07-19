// Raster hoá public/favicon.svg → PNG cho iOS/PWA (review 19/07 backlog #8: iOS không nhận
// SVG cho apple-touch-icon). Chạy: node scripts/gen-pwa-icons.mjs
// Cách làm: mở trình duyệt Chromium headless (CDP thuần — pattern e2e-ui.mjs, không dep mới),
// vẽ SVG lên canvas nền màu app (#020617, khớp background_color manifest) rồi toDataURL PNG.
// Sinh: public/apple-touch-icon.png (180) + pwa-192.png + pwa-512.png (khai trong manifest).
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(ROOT, 'public', 'favicon.svg'))
const dataUri = `data:image/svg+xml;base64,${svg.toString('base64')}`
const BG = '#020617' // slate-950 — nền app + background_color manifest
const PAD = 0.16 // viền thở quanh logo (iOS tự bo góc, logo không nên chạm mép)
const OUT = [
  ['apple-touch-icon.png', 180],
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
]

const BROWSER_CANDIDATES = process.platform === 'win32'
  ? [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
  : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/snap/bin/chromium']
const BROWSER = process.env.E2E_BROWSER_BIN ?? BROWSER_CANDIDATES.find((p) => existsSync(p))
if (!BROWSER) { console.error('NO BROWSER — cài Edge/Chrome/Chromium hoặc set E2E_BROWSER_BIN'); process.exit(1) }

const PORT = 9334
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = spawn(BROWSER, [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu',
  ...(process.platform !== 'win32' ? ['--no-sandbox'] : []),
  `--user-data-dir=${join(tmpdir(), `gen-pwa-icons-${Date.now()}`)}`, 'about:blank',
], { stdio: 'ignore' })

let target
for (let i = 0; i < 50 && !target; i++) {
  try {
    const list = await (await fetch(`http://localhost:${PORT}/json`)).json()
    target = list.find((t) => t.type === 'page')
  } catch { /* chưa lên */ }
  if (!target) await sleep(200)
}
if (!target) { console.error('NO TARGET'); browser.kill(); process.exit(1) }

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg); pending.delete(msg.id) }
}
const send = (method, params = {}) => new Promise((resolve) => {
  const mid = ++id
  pending.set(mid, resolve)
  ws.send(JSON.stringify({ id: mid, method, params }))
})
await send('Runtime.enable')

for (const [name, size] of OUT) {
  const r = await send('Runtime.evaluate', {
    expression: `(async () => {
      const img = new Image()
      img.src = ${JSON.stringify(dataUri)}
      await img.decode()
      const S = ${size}
      const c = document.createElement('canvas'); c.width = S; c.height = S
      const g = c.getContext('2d')
      g.fillStyle = ${JSON.stringify(BG)}; g.fillRect(0, 0, S, S)
      const box = S * (1 - 2 * ${PAD})
      const scale = Math.min(box / img.width, box / img.height)
      const w = img.width * scale, h = img.height * scale
      g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
      return c.toDataURL('image/png').split(',')[1]
    })()`,
    returnByValue: true,
    awaitPromise: true,
  })
  if (r.exceptionDetails || !r.result?.value) {
    console.error(`FAIL ${name}: ${JSON.stringify(r.exceptionDetails ?? r).slice(0, 300)}`)
    browser.kill()
    process.exit(1)
  }
  const buf = Buffer.from(r.result.value, 'base64')
  writeFileSync(join(ROOT, 'public', name), buf)
  console.log(`OK ${name} ${size}x${size} (${buf.length} bytes)`)
}

browser.kill()
