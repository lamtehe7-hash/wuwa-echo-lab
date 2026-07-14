// Tải (vendor) toàn bộ icon echo + sonata set từ game8 về public/icons/ để app TỰ CHỨA:
//   - hiện icon khi OFFLINE (SW/portable không phụ thuộc CDN game8)
//   - export card ra PNG không bị "taint" canvas (ảnh same-origin)
// Đặt tên file theo hash trong URL game8 (đã là content-hash, duy nhất) → helper iconUrl() ở
// src/data/iconAssets.ts map URL game8 -> 'icons/<hash>.png'. Icon là ASSET COMMIT vào repo
// (chạy 1 lần, commit; KHÔNG cho vào prebuild). Chạy lại khi echoes.ts/setIcons.ts đổi URL:
//   node scripts/vendor-icons.mjs
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, '..', 'src', 'data')
const OUT = join(HERE, '..', 'public', 'icons')

/** Lấy mọi URL game8 png trong 1 file nguồn */
function urlsIn(file) {
  const text = readFileSync(join(SRC, file), 'utf8')
  return [...text.matchAll(/https:\/\/img\.game8\.co\/[^\s'"]+?\.png(?:\/show)?/gi)].map((m) => m[0])
}

/** hash (basename) của URL — dùng làm tên file local */
function hashOf(url) {
  const m = url.match(/\/([^/]+\.png)(?:\/show)?$/i)
  return m ? m[1] : null
}

const urls = [...new Set([...urlsIn('echoes.ts'), ...urlsIn('setIcons.ts')])]
console.log(`Tổng URL icon (unique): ${urls.length}`)

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
let downloaded = 0, skipped = 0
const failed = []

async function fetchOne(url, attempt = 1) {
  const hash = hashOf(url)
  if (!hash) { failed.push(url + ' (không parse được hash)'); return }
  const dest = join(OUT, hash)
  if (existsSync(dest)) { skipped++; return }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://game8.co/' } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200) throw new Error('ảnh quá nhỏ (' + buf.length + 'B) — có thể bị chặn')
    writeFileSync(dest, buf)
    downloaded++
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 400 * attempt)); return fetchOne(url, attempt + 1) }
    failed.push(`${url} — ${e.message}`)
  }
}

// Tải theo lô (concurrency 8) cho lịch sự với CDN
const CONC = 8
for (let i = 0; i < urls.length; i += CONC) {
  await Promise.all(urls.slice(i, i + CONC).map((u) => fetchOne(u)))
  process.stdout.write(`\r  tiến độ: ${Math.min(i + CONC, urls.length)}/${urls.length}  (tải ${downloaded}, bỏ qua ${skipped}, lỗi ${failed.length})   `)
}
console.log('')
if (failed.length) {
  console.log(`\nLỖI ${failed.length} icon (chạy lại script để thử tiếp):`)
  failed.slice(0, 20).forEach((f) => console.log('  - ' + f))
  process.exitCode = 1
} else {
  console.log(`\nXong: tải ${downloaded}, bỏ qua ${skipped} (đã có). Icon ở public/icons/`)
}
