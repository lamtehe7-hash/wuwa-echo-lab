// Build bản portable Windows: app/dist (build sẵn) + server.cjs → 1 file .exe (@yao-pkg/pkg)
// → zip giải-nén-là-chạy. Chạy: `node build.mjs` trong thư mục portable/ (SAU `npm run build` ở app/).
// Output: build/WuWaEchoOptimizer.exe + build/WuWaEchoOptimizer-win64-portable.zip
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appDist = join(here, '..', 'app', 'dist')
const dist = join(here, 'dist')
const build = join(here, 'build')

if (!existsSync(join(appDist, 'index.html'))) {
  console.error('Chưa có app/dist — chạy `npm run build` trong app/ trước.')
  process.exit(1)
}

rmSync(dist, { recursive: true, force: true })
cpSync(appDist, dist, { recursive: true })
mkdirSync(build, { recursive: true })

console.log('Đóng gói exe (pkg tải base binary Node lần đầu, có thể hơi lâu)…')
const exe = join(build, 'WuWaEchoOptimizer.exe')
// shell:true (cần cho npx.cmd trên Windows) nối arg bằng dấu cách → path có dấu cách phải tự quote
const r = spawnSync('npx', ['-y', '@yao-pkg/pkg', '.', '--output', `"${exe}"`], {
  cwd: here, stdio: 'inherit', shell: true,
})
if (r.status !== 0) process.exit(r.status ?? 1)

writeFileSync(join(build, 'HUONG-DAN.txt'), [
  'WuWa Echo Optimizer — bản portable (Windows 64-bit)',
  '====================================================',
  '',
  'CÁCH DÙNG: chạy WuWaEchoOptimizer.exe — trình duyệt tự mở app.',
  'Không cần cài đặt, không cần mạng (OCR chạy hoàn toàn trên máy).',
  'Giữ cửa sổ đen mở trong lúc dùng; đóng nó để tắt app.',
  '',
  '- Dữ liệu (kho echo) lưu trong trình duyệt của bạn (localStorage,',
  '  gắn với địa chỉ localhost:36925). Dùng nút Export JSON để sao lưu.',
  '- Windows SmartScreen có thể hỏi khi chạy lần đầu (exe không ký số):',
  '  More info → Run anyway.',
  '- Icon echo lấy từ web (game8) — không có mạng thì card hiện chữ cái',
  '  thay icon, mọi tính năng khác vẫn đầy đủ.',
  '- Bản web (luôn mới nhất): https://lamtehe7-hash.github.io/wuwa-echo-lab/',
  '',
  'Nguồn: https://github.com/lamtehe7-hash/wuwa-echo-lab',
].join('\r\n'))

console.log('Nén zip…')
const zip = join(build, 'WuWaEchoOptimizer-win64-portable.zip')
rmSync(zip, { force: true })
const z = spawnSync('powershell', [
  '-NoProfile', '-Command',
  `Compress-Archive -Path '${exe}','${join(build, 'HUONG-DAN.txt')}' -DestinationPath '${zip}'`,
], { stdio: 'inherit' })
if (z.status !== 0) process.exit(z.status ?? 1)

console.log(`\nXong: ${zip}`)
