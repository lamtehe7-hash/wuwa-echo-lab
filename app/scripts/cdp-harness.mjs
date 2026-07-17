// Harness CDP tái dùng cho script verify-theo-task (đúc kết từ 12+ script CDP viết lại
// từ đầu qua các task 33→58). e2e-ui.mjs GIỮ NGUYÊN bản riêng (72 bước là hợp đồng khoá).
//
// Dùng:
//   import { launch } from './cdp-harness.mjs'
//   (script nằm NGOÀI app/ phải import dạng file:///E:/Claude/02_Tools/WuWa%20Echo/app/scripts/cdp-harness.mjs
//    — ESM Windows không nhận path chữ-ổ-đĩa, gotcha HANDOVER §5)
//   const h = await launch()                       // preview phải chạy sẵn (port 4173)
//   h.check('demo', await h.clickByText('Dữ liệu demo'))
//   await h.sleep(400)
//   h.check('count', await h.bodyHas('Kho: 10 echo'))
//   await h.shot('sau-demo')                       // PNG vào thư mục argv[2] (mặc định .)
//   await h.done()                                 // in tổng kết + exit code 0/1
//
// Gotcha đã trả giá (đừng lặp lại):
// - clickByText dùng .includes() trên textContent — thêm text con (pill "Mới") KHÔNG vỡ,
//   nhưng match text ngắn dễ trúng nút khác đứng TRƯỚC trong DOM.
// - Element trong overflow-x-auto: popover phải position:fixed; đo vị trí bằng
//   getBoundingClientRect trước/sau thao tác khi cần kiểm layout-shift.
// - Mỗi lần chạy dùng user-data-dir MỚI → localStorage sạch (pill "Mới"/onboarding hiện lại).

import { writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

export async function launch({
  url = 'http://localhost:4173/',
  port = 9335,
  width = 1440,
  height = 1100,
  outDir = process.argv[2] ?? '.',
} = {}) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const edge = spawn(EDGE, [
    `--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu',
    `--user-data-dir=${process.env.TEMP}\\cdp-harness-${Date.now()}`,
    `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' })

  let ws
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('eval fail: ' + JSON.stringify(r.exceptionDetails).slice(0, 400))
    return r.result?.value
  }

  let target
  for (let i = 0; i < 50 && !target; i++) {
    try {
      const list = await (await fetch(`http://localhost:${port}/json`)).json()
      target = list.find((t) => t.type === 'page')
    } catch { /* edge chưa lên */ }
    if (!target) await sleep(200)
  }
  if (!target) { edge.kill(); throw new Error('NO CDP TARGET') }

  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg); pending.delete(msg.id) }
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url })
  for (let i = 0; i < 50; i++) {
    if ((await evaluate('document.readyState')) === 'complete' && (await evaluate("!!document.querySelector('h1')"))) break
    await sleep(200)
  }

  const results = []
  const check = (name, ok, extra = '') => {
    results.push([name, ok])
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)
  }

  return {
    send, evaluate, sleep, check,
    clickByText: (text) => evaluate(`(() => {
      const el = [...document.querySelectorAll('button')].find((b) => b.textContent.includes(${JSON.stringify(text)}))
      if (!el) return false
      el.click(); return true
    })()`),
    clickByAria: (label) => evaluate(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === ${JSON.stringify(label)})
      if (!b) return false
      b.click(); return true
    })()`),
    bodyHas: (text) => evaluate(`document.body.textContent.includes(${JSON.stringify(text)})`),
    setInput: (placeholderPart, value) => evaluate(`(() => {
      const inp = [...document.querySelectorAll('input')].find((i) => i.placeholder && i.placeholder.includes(${JSON.stringify(placeholderPart)}))
      if (!inp) return false
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(inp, ${JSON.stringify(value)})
      inp.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    })()`),
    pressKey: (key) => evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)} }))`),
    shot: async (name) => {
      const r = await send('Page.captureScreenshot', { format: 'png' })
      writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, 'base64'))
    },
    done: async () => {
      const failed = results.filter(([, ok]) => !ok)
      console.log(failed.length === 0 ? `ALL PASS (${results.length})` : `FAILED ${failed.length}/${results.length}`)
      edge.kill()
      process.exit(failed.length === 0 ? 0 : 1)
    },
  }
}
