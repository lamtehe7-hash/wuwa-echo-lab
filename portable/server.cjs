// Server tĩnh nhúng cho bản PORTABLE (đóng gói 1 file .exe bằng @yao-pkg/pkg).
// Chạy exe → serve app từ snapshot (thư mục dist đóng gói kèm) trên localhost
// (port ngẫu nhiên OS cấp, hoặc --port N) rồi tự mở trình duyệt mặc định.
// App 100% client-side + tài nguyên OCR tự chứa → KHÔNG cần mạng, không cần cài gì.
// Dữ liệu người dùng lưu trong localStorage của trình duyệt (theo origin localhost:port
// → dùng --port cố định nếu muốn giữ kho echo giữa các lần mở; mặc định 36925).
'use strict'
const http = require('http')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.join(__dirname, 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.gz': 'application/gzip',
  '.woff2': 'font/woff2',
}

function parseArgs(argv) {
  const args = { port: 36925, open: true }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port') args.port = Number(argv[++i]) || 0
    else if (argv[i] === '--no-open') args.open = false
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let rel = path.normalize(urlPath).replace(/^([/\\])+/, '')
    if (rel === '' || rel === '.') rel = 'index.html'
    const file = path.join(ROOT, rel)
    // Chặn path traversal ra ngoài dist
    if (!file.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end('Forbidden')
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404)
        return res.end('Not found')
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
      res.end(data)
    })
  } catch {
    res.writeHead(400)
    res.end('Bad request')
  }
})

// Port MẶC ĐỊNH cố định (36925) để localStorage (kho echo) giữ nguyên giữa các lần mở —
// đổi port là đổi origin, trình duyệt coi như site khác. Port bận (mở 2 bản?) → báo rõ.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`  Port ${args.port} đang bận — có thể app đang mở sẵn ở http://localhost:${args.port}/`)
    console.log('  Nếu không phải, chạy lại với port khác: WuWaEchoOptimizer.exe --port 36926')
    console.log('  (Lưu ý: đổi port thì kho echo cũ không hiện — Export/Import JSON để chuyển.)')
  } else {
    console.error('  Lỗi khởi động server:', err.message)
  }
  process.exitCode = 1
})

server.listen(args.port, '127.0.0.1', () => {
  const url = `http://localhost:${server.address().port}/`
  console.log('')
  console.log('  WuWa Echo Optimizer — bản portable')
  console.log(`  Đang chạy tại: ${url}`)
  console.log('  Trình duyệt sẽ tự mở. GIỮ cửa sổ này mở trong lúc dùng;')
  console.log('  đóng cửa sổ này (hoặc Ctrl+C) để tắt app.')
  console.log('  Dữ liệu (kho echo) lưu trong trình duyệt — Export JSON để sao lưu.')
  console.log('')
  if (args.open) {
    // Mở trình duyệt mặc định của Windows
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
  }
})
