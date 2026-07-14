// Validate classifier icon-set trên ICON THẬT trong game (dialog "Select a Sonata effect").
// Tự dò các icon tròn (blob pixel bão hoà màu trên nền dialog sáng) → crop → signatureForIconImage
// → classifySignature (34 template). Zip theo thứ tự đọc (3 cột) với danh sách set đã biết để chấm.
//
// Chạy TỪ app/:  npx -y tsx scripts/validate-set-icons.ts <dialog.png> <page1|page2> [--dump dir]
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import type { ImageDataLike } from '../src/ocr/preprocess'
import { cropImageData, resizeImageData, iconSignature, ICON_NORM_SIZE, classifySignature, sigDistance } from '../src/ocr/seticon'
import { SET_ICON_SIGNATURES } from '../src/data/seticonSignatures'

const PAGES: Record<string, string[]> = {
  page1: [
    'lamp-of-nether-road', 'heart-of-evils-purge', 'song-of-feathered-trace',
    'reel-of-spliced-memories', 'wishes-of-quiet-snowfall', 'sound-of-true-name',
    'chromatic-foam', 'trailblazing-star', 'rite-of-gilded-revelation',
    'halo-of-starry-radiance', 'pact-of-neonlight-leap', 'thread-of-severed-fate',
    'flamewings-shadow', 'law-of-harmony', 'crown-of-valor',
  ],
  page2: [
    'dream-of-the-lost', 'flaming-clawprint', 'windward-pilgrimage',
    'gusts-of-welkin', 'tidebreaking-courage', 'empyrean-anthem',
    'midnight-veil', 'eternal-radiance', 'frosty-resolve',
    'lingering-tunes', 'moonlit-clouds', 'rejuvenating-glow',
    'havoc-eclipse', 'celestial-light', 'sierra-gale',
    'void-thunder', 'molten-rift', 'freezing-frost',
  ],
}

const [pngPath, page, ...rest] = process.argv.slice(2)
const dumpDir = rest.includes('--dump') ? rest[rest.indexOf('--dump') + 1] : undefined
if (!pngPath || !PAGES[page]) {
  console.error('Cách dùng: npx -y tsx scripts/validate-set-icons.ts <dialog.png> <page1|page2> [--dump dir]')
  process.exit(1)
}

const png = PNG.sync.read(readFileSync(pngPath))
const img: ImageDataLike = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height }
const { width: W, height: H, data } = img

// mask pixel "màu" (bão hoà) — icon sonata là vòng tròn màu nguyên tố trên nền dialog sáng/xám
const sat = new Uint8Array(W * H)
for (let p = 0, i = 0; p < W * H; p++, i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  if (mx - mn > 28 && mx > 50) sat[p] = 1
}

// connected components (BFS iterative)
interface Blob { x0: number; y0: number; x1: number; y1: number; n: number }
const seen = new Uint8Array(W * H)
const blobs: Blob[] = []
const stack: number[] = []
for (let p = 0; p < W * H; p++) {
  if (!sat[p] || seen[p]) continue
  let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0
  stack.push(p); seen[p] = 1
  while (stack.length) {
    const q = stack.pop()!
    const x = q % W, y = (q / W) | 0
    n++
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    if (x > 0 && sat[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; stack.push(q - 1) }
    if (x < W - 1 && sat[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; stack.push(q + 1) }
    if (y > 0 && sat[q - W] && !seen[q - W]) { seen[q - W] = 1; stack.push(q - W) }
    if (y < H - 1 && sat[q + W] && !seen[q + W]) { seen[q + W] = 1; stack.push(q + W) }
  }
  blobs.push({ x0, y0, x1, y1, n })
}

// giữ blob cỡ icon (~30–90px), gần vuông
const icons = blobs.filter((b) => {
  const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1
  const ratio = w / h
  return w >= 26 && w <= 110 && h >= 26 && h <= 110 && ratio > 0.7 && ratio < 1.45 && b.n > w * h * 0.35
})

// sort reading order: gom hàng theo y (bucket ~ nửa chiều cao icon), trong hàng theo x
const avgH = icons.reduce((s, b) => s + (b.y1 - b.y0), 0) / Math.max(1, icons.length)
icons.sort((a, b) => {
  const ay = (a.y0 + a.y1) / 2, by = (b.y0 + b.y1) / 2
  if (Math.abs(ay - by) > avgH * 0.6) return ay - by
  return (a.x0 + a.x1) / 2 - (b.x0 + b.x1) / 2
})

const expected = PAGES[page]
console.log(`\n=== ${pngPath} [${page}] — dò được ${icons.length} icon (kỳ vọng ${expected.length}) ===`)

let ok = 0, wrong = 0, nullc = 0
icons.forEach((b, i) => {
  const pad = Math.round((b.x1 - b.x0) * 0.18)
  const rx = Math.max(0, b.x0 - pad), ry = Math.max(0, b.y0 - pad)
  const rw = Math.min(W - rx, b.x1 - b.x0 + 1 + pad * 2), rh = Math.min(H - ry, b.y1 - b.y0 + 1 + pad * 2)
  const crop = cropImageData(img, { x: rx, y: ry, w: rw, h: rh })
  // bypass findBadgeCircle (icon MÀU trên nền SÁNG — không hợp cả 2 nhánh của nó);
  // blob bbox CHÍNH là vòng tròn màu → resize thẳng về chuẩn rồi ký glyph
  const sig = iconSignature(resizeImageData(crop, ICON_NORM_SIZE, ICON_NORM_SIZE))
  const exp = expected[i] ?? '(dư)'
  if (dumpDir) {
    const out = new PNG({ width: rw, height: rh }); out.data = Buffer.from(crop.data)
    writeFileSync(join(dumpDir, `${page}-${String(i).padStart(2, '0')}-${exp}.png`), PNG.sync.write(out))
  }
  if (!sig) { console.log(`  #${i} @(${rx},${ry}) ${rw}×${rh}  exp=${exp}  → NO-SIG`); nullc++; return }
  const m = classifySignature(sig)
  // khoảng cách tới template của set kỳ vọng (dù match hay không) để soi
  const expSig = SET_ICON_SIGNATURES.filter((s) => s.id === exp)
  const dExp = expSig.length
    ? Math.min(...expSig.map((s) => sigDistance(sig, Uint8Array.from(atob(s.b64), (c) => c.charCodeAt(0)))))
    : NaN
  const mark = m?.setId === exp ? '✅' : m ? '❌' : '⚪'
  if (m?.setId === exp) ok++; else if (m) wrong++; else nullc++
  console.log(
    `  ${mark} #${i} exp=${exp.padEnd(26)} got=${(m?.setId ?? 'null').padEnd(26)}` +
    ` d=${m ? m.distance.toFixed(1) : '-'} margin=${m ? m.margin.toFixed(1) : '-'} dExp=${isNaN(dExp) ? '-' : dExp.toFixed(1)}`,
  )
})
console.log(`\n  ✅ đúng ${ok}  ❌ sai ${wrong}  ⚪ null ${nullc}  / ${icons.length} dò được`)
