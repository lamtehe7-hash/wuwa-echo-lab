// Smoke E2E UI (bản tab — B1): node e2e-ui.mjs <png>
// Yêu cầu: vite preview đang chạy ở http://localhost:4173/
import { writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9333
const URL_APP = 'http://localhost:4173/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const edge = spawn(EDGE, [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu',
  `--user-data-dir=${process.env.TEMP}\\e2e-ui-profile-${Date.now()}`, '--window-size=1440,1100', 'about:blank',
], { stdio: 'ignore' })

let ws
let id = 0
const pending = new Map()
function send(method, params = {}) {
  return new Promise((resolve) => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval fail: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
  return r.result?.value
}

let target
for (let i = 0; i < 50 && !target; i++) {
  try {
    const list = await (await fetch(`http://localhost:${PORT}/json`)).json()
    target = list.find((t) => t.type === 'page')
  } catch { /* edge chưa lên */ }
  if (!target) await sleep(200)
}
if (!target) { console.error('NO TARGET'); edge.kill(); process.exit(1) }

ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg); pending.delete(msg.id) }
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: URL_APP })
for (let i = 0; i < 50; i++) {
  if ((await evaluate('document.readyState')) === 'complete' && (await evaluate("!!document.querySelector('h1')"))) break
  await sleep(200)
}

const results = []
const check = (name, ok, extra = '') => {
  results.push([name, ok])
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
}
const clickByText = (text) => evaluate(`(() => {
  const el = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)}))
  if (!el) return false
  el.click(); return true
})()`)
const bodyHas = (text) => evaluate(`document.body.textContent.includes(${JSON.stringify(text)})`)
const setInput = (placeholderPart, value) => evaluate(`(() => {
  const inp = [...document.querySelectorAll('input')].find((i) => i.placeholder && i.placeholder.includes(${JSON.stringify(placeholderPart)}))
  if (!inp) return false
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(inp, ${JSON.stringify(value)})
  inp.dispatchEvent(new Event('input', { bubbles: true }))
  return true
})()`)

// 1) EmptyState (tab Kho mặc định) + nạp demo
check('empty-state', await bodyHas('Kho echo đang trống'))
check('click-demo', await clickByText('Dữ liệu demo'))
await sleep(400)
check('inventory-10', await bodyHas('Kho: 10 echo'))
check('toolbar-count-10/10', await bodyHas('10/10 echo'))

// 2) Lọc cost 4 → đếm đổi → reset; search không khớp → thông báo → xoá search
check('click-cost4', await clickByText('Cost 4'))
await sleep(250)
const countText = await evaluate(`(([...document.querySelectorAll('span')].find((s) => /^\\d+\\/10 echo$/.test(s.textContent.trim()))?.textContent) ?? '').trim()`)
check('cost4-filtered', /^\d+\/10 echo$/.test(countText) && !countText.startsWith('10/'), countText)
await clickByText('Tất cả')
await sleep(200)
check('search-type', await setInput('Tìm theo tên', 'zzzz-không-khớp'))
await sleep(250)
check('search-empty-msg', await bodyHas('Không có echo nào khớp bộ lọc'))
check('search-clear', await setInput('Tìm theo tên', ''))
await sleep(200)

// 2b) B2: toggle lưới card ⇄ bảng
const clickByAria = (label) => evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)})
  if (!b) return false
  b.click(); return true
})()`)
check('view-grid', await clickByAria('Xem dạng lưới card'))
await sleep(300)
check('grid-cards', await bodyHas('◆'))
check('grid-no-table', await evaluate("!document.querySelector('table')"))
{
  const gridShot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync((process.argv[2] ?? 'e2e-ui.png').replace(/\.png$/, '-grid.png'), Buffer.from(gridShot.data, 'base64'))
}
check('view-table', await clickByAria('Xem dạng bảng'))
await sleep(200)
check('table-back', await evaluate("!!document.querySelector('table')"))

// 2c) B4: popover breakdown điểm (bấm số điểm trong bảng)
check('score-open', await evaluate(`(() => {
  const b = [...document.querySelectorAll('tbody button')].find((x) => /^\\d+\\.\\d$/.test(x.textContent.trim()))
  if (!b) return false
  b.click(); return true
})()`))
await sleep(250)
check('breakdown-shown', await bodyHas('Điểm chi tiết'))
{
  const bShot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync((process.argv[2] ?? 'e2e-ui.png').replace(/\.png$/, '-breakdown.png'), Buffer.from(bShot.data, 'base64'))
}
await evaluate("document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))")
await sleep(200)
check('breakdown-closed', !(await bodyHas('Điểm chi tiết')))

// 3) Tab Tối ưu → solve → hash sync
check('tab-optimize', await clickByText('Tối ưu'))
await sleep(250)
check('click-solve', await clickByText('Tìm bộ 5 tối ưu'))
await sleep(500)
check('loadout-shown', await bodyHas('Bộ echo tối ưu'))
check('hash-optimize', (await evaluate('location.hash')).startsWith('#optimize?char='), await evaluate('location.hash'))

// 3b) B3: character picker popover — mở, chọn Verina, hash đổi, chọn lại Camellya
check('picker-open', await clickByText('Camellya'))
await sleep(250)
check('picker-groups', await bodyHas('Spectro'))
{
  const pickShot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync((process.argv[2] ?? 'e2e-ui.png').replace(/\.png$/, '-picker.png'), Buffer.from(pickShot.data, 'base64'))
}
check('pick-verina', await clickByText('Verina'))
await sleep(250)
check('hash-verina', (await evaluate('location.hash')).includes('char=verina'), await evaluate('location.hash'))
check('picker-reopen', await clickByText('Verina'))
await sleep(250)
check('pick-camellya', await clickByText('Camellya'))
await sleep(250)
check('hash-camellya', (await evaluate('location.hash')).includes('char=camellya'), await evaluate('location.hash'))
// Đổi nhân vật xoá hẳn kết quả (đúng thiết kế) → solve lại để test stale flow phía sau
check('solve-after-pick', await clickByText('Tìm bộ 5 tối ưu'))
await sleep(400)

// 4) Về tab Kho → xoá → toast + hoàn tác
check('tab-inventory', await clickByText('Kho Echo'))
await sleep(250)
check('click-delete', await evaluate(`(() => {
  const b = [...document.querySelectorAll('tbody button')].find((x) => (x.getAttribute('aria-label') || '') === 'xoá')
  if (!b) return false
  b.click(); return true
})()`))
await sleep(350)
check('toast-shown', await bodyHas('Đã xoá'))
check('inventory-9', await bodyHas('Kho: 9 echo'))
check('click-undo', await clickByText('Hoàn tác'))
await sleep(350)
check('inventory-10-again', await bodyHas('Kho: 10 echo'))

// 5) Tab Tối ưu → stale banner → Giải lại
check('tab-optimize-2', await clickByText('Tối ưu'))
await sleep(250)
check('stale-banner', await bodyHas('bản cũ'))
check('click-resolve', await clickByText('Giải lại'))
await sleep(500)
check('stale-cleared', !(await bodyHas('bản cũ')))

// 6) Preset trọng số (tab Tối ưu)
check('open-weights', await clickByText('trọng số'))
await sleep(250)
check('preset-apply', await evaluate(`(() => {
  const sel = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'healerHp'))
  if (!sel) return false
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set
  setter.call(sel, 'healerHp')
  sel.dispatchEvent(new Event('change', { bubbles: true }))
  return true
})()`))
await sleep(250)
check('override-applied', await bodyHas('về preset gốc'))

// 6b) C1: pin bộ hiện tại → delta + bar "Bộ hiện tại" → unpin
// (preset vừa áp làm kết quả stale → giải lại trước khi pin)
check('resolve-before-pin', await clickByText('Giải lại'))
await sleep(500)
check('pin-current', await clickByText('Đặt làm bộ hiện tại'))
await sleep(300)
check('pin-toast', await bodyHas('Đã ghi nhớ bộ hiện tại'))
check('equipped-bar', await bodyHas('Bộ hiện tại'))
check('delta-shown', await evaluate(`[...document.querySelectorAll('span')].some((s) => /^[▲▼＝]/.test(s.textContent.trim()))`))
{
  const eqShot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync((process.argv[2] ?? 'e2e-ui.png').replace(/\.png$/, '-equipped.png'), Buffer.from(eqShot.data, 'base64'))
}
check('unpin', await clickByText('bỏ ghi nhớ'))
await sleep(250)
check('equipped-bar-gone', !(await bodyHas('Bộ hiện tại')))

// 7) Tab Import → panel OCR + card JSON
check('tab-import', await clickByText('Import'))
await sleep(300)
check('ocr-panel', await bodyHas('Import từ ảnh'))
check('json-card', await bodyHas('Sao lưu / khôi phục JSON'))
check('hash-import', (await evaluate('location.hash')).startsWith('#import'), await evaluate('location.hash'))

// 8) Tab Đội hình
check('tab-roster', await clickByText('Đội hình'))
await sleep(250)
check('roster-panel', await bodyHas('Gán cả đội'))
// 8b) B6: thêm thành viên → gán → kết quả (header màu nguyên tố)
check('roster-add', await clickByText('+ thêm vào đội'))
await sleep(200)
check('roster-assign', await clickByText('Gán echo cho cả đội'))
await sleep(600)
check('roster-result', await bodyHas('Bộ echo tối ưu'))
{
  const rShot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync((process.argv[2] ?? 'e2e-ui.png').replace(/\.png$/, '-roster.png'), Buffer.from(rShot.data, 'base64'))
}

// 9) B5: lock 🔒 / loại 🗑 / xoá hàng loạt + hoàn tác cụm
check('tab-inventory-2', await clickByText('Kho Echo'))
await sleep(250)
const clickNthFlag = (prefix, n) => evaluate(`(() => {
  const els = [...document.querySelectorAll('tbody button')].filter((b) => (b.getAttribute('aria-label') || '').startsWith(${JSON.stringify(prefix)}))
  if (!els[${n}]) return false
  els[${n}].click(); return true
})()`)
check('lock-first', await clickNthFlag('Khoá', 0))
await sleep(200)
check('trash-second', await clickNthFlag('Đánh dấu Bỏ', 1))
await sleep(250)
check('excluded-chip', await bodyHas('Đã bỏ (1)'))
check('excluded-filter-on', await clickByText('Đã bỏ (1)'))
await sleep(250)
check('excluded-count', await bodyHas('1/10 echo'))
await clickByText('Đã bỏ (1)')
await sleep(200)
check('locked-delete-disabled', await evaluate(`(() => {
  const rows = [...document.querySelectorAll('tbody tr')]
  return rows.some((tr) => {
    const lock = [...tr.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Khoá'))
    const del = [...tr.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === 'xoá')
    return lock?.getAttribute('aria-pressed') === 'true' && del?.disabled
  })
})()`))
check('select-all', await evaluate(`(() => {
  const c = document.querySelector('thead input[type=checkbox]')
  if (!c) return false
  c.click(); return true
})()`))
await sleep(250)
check('bulk-bar-9', await bodyHas('Xoá 9 đã chọn'))
check('bulk-delete', await clickByText('Xoá 9 đã chọn'))
await sleep(350)
check('deleted-9-toast', await bodyHas('Đã xoá 9 echo'))
check('inventory-1', await bodyHas('Kho: 1 echo'))
check('bulk-undo', await clickByText('Hoàn tác'))
await sleep(350)
check('inventory-10-final', await bodyHas('Kho: 10 echo'))
// dọn cờ để screenshot cuối sạch
await evaluate(`(() => { const b = [...document.querySelectorAll('tbody button')].find((x) => x.getAttribute('aria-pressed') === 'true' && (x.getAttribute('aria-label') || '').startsWith('Khoá')); if (b) b.click(); return true })()`)
await sleep(150)
await evaluate(`(() => { const b = [...document.querySelectorAll('tbody button')].find((x) => x.getAttribute('aria-pressed') === 'true' && (x.getAttribute('aria-label') || '').startsWith('Đánh dấu Bỏ')); if (b) b.click(); return true })()`)
await sleep(150)

const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync(process.argv[2] ?? 'e2e-ui.png', Buffer.from(shot.data, 'base64'))

const failed = results.filter((r) => !r[1])
console.log(failed.length === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED: ' + failed.map((f) => f[0]).join(', '))
edge.kill()
process.exit(failed.length === 0 ? 0 : 1)
