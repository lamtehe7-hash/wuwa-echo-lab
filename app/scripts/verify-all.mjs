// Nghi thức verify chuẩn của repo, gộp 1 lệnh (đúc kết task 29→58 — trước đây gõ tay 4 bước):
//   node scripts/verify-all.mjs [extra-cdp-1.mjs extra-cdp-2.mjs ...]
// Chuỗi: vitest run → npm run build (kèm tsc -b) → vite preview (4173) → e2e-ui.mjs (~76 bước)
// → các script CDP THÊM (verify theo task, viết bằng cdp-harness.mjs) → kill preview → tổng kết.
// Exit 0 chỉ khi TẤT CẢ pass. PNG e2e ghi vào %TEMP%.

import { spawn, spawnSync } from 'node:child_process'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const steps = []
const run = (name, cmd, args, opts = {}) => {
  console.log(`\n── ${name}: ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts })
  const ok = r.status === 0
  steps.push([name, ok])
  return ok
}

let allOk = true
allOk = run('unit', 'npx', ['vitest', 'run']) && allOk
allOk = run('build', 'npm', ['run', 'build']) && allOk

if (!allOk) {
  console.log('\nBỏ qua E2E vì unit/build fail.')
  summary()
}

// preview nền — kill cả cây tiến trình bằng taskkill (kill child.pid chỉ giết shell npm)
console.log('\n── preview: npm run preview (port 4173)')
const preview = spawn('npm', ['run', 'preview'], { shell: true, stdio: 'ignore' })
let up = false
for (let i = 0; i < 50 && !up; i++) {
  try { up = (await fetch('http://localhost:4173/')).ok } catch { /* chưa lên */ }
  if (!up) await sleep(300)
}
if (!up) {
  steps.push(['preview', false])
  killPreview()
  summary()
}

allOk = run('e2e-ui', 'node', ['scripts/e2e-ui.mjs', `${process.env.TEMP}\\verify-all-e2e.png`]) && allOk
for (const extra of process.argv.slice(2)) {
  allOk = run(`cdp:${extra.split(/[\\/]/).pop()}`, 'node', [extra, process.env.TEMP]) && allOk
}

killPreview()
summary()

function killPreview() {
  if (preview?.pid) spawnSync('taskkill', ['/F', '/T', '/PID', String(preview.pid)], { stdio: 'ignore', shell: true })
}
function summary() {
  console.log('\n════ TỔNG KẾT VERIFY ════')
  for (const [name, ok] of steps) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  const failed = steps.filter(([, ok]) => !ok).length
  console.log(failed === 0 ? 'ALL PASS' : `FAILED ${failed}/${steps.length}`)
  process.exit(failed === 0 ? 0 : 1)
}
