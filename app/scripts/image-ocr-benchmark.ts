// Benchmark OCR trên ẢNH TĨNH 1920×1080 thật (screenshot panel echo trong game).
// Mô phỏng ĐÚNG image-mode của OcrImport: preprocessOn=true → binarize CẢ KHUNG
// (image mode KHÔNG crop, khác video mode) → recognizeImageWithBoxes → parseEchoText
// + detectSetFromImage (icon set cạnh "+25" trên khung MÀU).
//
// Chạy TỪ app/:  npx -y tsx scripts/image-ocr-benchmark.ts <png> [--crop x,y,w,h] [--scale N] [--dump out.png]
// Không dùng engine.ts (engine dùng import.meta.env.BASE_URL — chỉ có dưới Vite). Tự tạo
// tesseract worker theo path Node, DÙNG LẠI cùng CHAR_WHITELIST + binarize + parse + seticon.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { PNG } from 'pngjs'
import { createWorker, type Worker } from 'tesseract.js'
import { binarize, type ImageDataLike, type Rect } from '../src/ocr/preprocess'
import { parseEchoText } from '../src/ocr/parse'
import { detectSetFromImage } from '../src/ocr/seticon'
import { cropImageData, resizeImageData } from '../src/ocr/seticon'

const __dir = dirname(fileURLToPath(import.meta.url))
const APP = resolve(__dir, '..')
const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,%+-:/() '

const args = process.argv.slice(2)
const pngPath = args.find((a) => !a.startsWith('--'))
if (!pngPath) {
  console.error('Cách dùng: npx -y tsx scripts/image-ocr-benchmark.ts <png> [--crop x,y,w,h] [--scale N] [--dump out.png]')
  process.exit(1)
}
const cropArg = args.find((a) => a.startsWith('--crop'))?.split('=')[1] ?? (args.includes('--crop') ? args[args.indexOf('--crop') + 1] : undefined)
const scaleArg = args.includes('--scale') ? Number(args[args.indexOf('--scale') + 1]) : undefined
const dumpArg = args.includes('--dump') ? args[args.indexOf('--dump') + 1] : undefined

function toImg(png: PNG): ImageDataLike {
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height }
}
function toPngBuf(img: ImageDataLike): Buffer {
  const out = new PNG({ width: img.width, height: img.height })
  out.data = Buffer.from(img.data)
  return PNG.sync.write(out)
}

let worker: Worker | null = null
async function getWorker(): Promise<Worker> {
  if (worker) return worker
  worker = await createWorker('eng', 1, {
    cachePath: APP, // eng.traineddata đã cache ở gốc app
    langPath: join(APP, 'public', 'tesseract', 'lang'), // eng.traineddata.gz (offline)
    gzip: true,
  })
  await worker.setParameters({ tessedit_char_whitelist: CHAR_WHITELIST })
  return worker
}

async function recognize(buf: Buffer) {
  const w = await getWorker()
  const { data } = await w.recognize(buf as never, {}, { text: true, blocks: true })
  const words: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] = []
  for (const block of data.blocks ?? [])
    for (const p of block.paragraphs) for (const l of p.lines) for (const wd of l.words) words.push({ text: wd.text, bbox: wd.bbox })
  return { text: data.text ?? '', words }
}

async function main() {
  const png = PNG.sync.read(readFileSync(resolve(pngPath!)))
  let colorImg = toImg(png)
  console.log(`\n=== ${pngPath}  (${png.width}×${png.height}) ===`)

  // Crop (tuỳ chọn) — mô phỏng "nếu image mode có crop panel"
  if (cropArg) {
    const [x, y, w, h] = cropArg.split(',').map(Number)
    const rect: Rect = { x, y, w, h }
    colorImg = cropImageData(colorImg, rect)
    console.log(`  crop → ${w}×${h} @ (${x},${y})`)
  }
  // Upscale (tuỳ chọn) — app dùng scale 'auto' (×2 khi bề ngang <800)
  const scale = scaleArg ?? (colorImg.width < 800 ? 2 : 1)
  if (scale !== 1) {
    colorImg = resizeImageData(colorImg, Math.round(colorImg.width * scale), Math.round(colorImg.height * scale))
    console.log(`  upscale ×${scale} → ${colorImg.width}×${colorImg.height}`)
  }

  const bin = binarize(colorImg)
  if (dumpArg) {
    writeFileSync(dumpArg, toPngBuf(bin))
    console.log(`  dump binarized → ${dumpArg}`)
  }
  const { text, words } = await recognize(toPngBuf(bin))
  let d = parseEchoText(text)
  if (!d.set) {
    const m = detectSetFromImage(colorImg, words, d.setCandidates)
    if (m) d = { ...d, set: m.setId }
  }

  console.log('\n--- RAW OCR TEXT ---')
  console.log(text.split('\n').filter((l) => l.trim()).map((l) => '  | ' + l).join('\n'))
  console.log('\n--- PARSED ---')
  console.log(`  name  : ${d.name ?? '?'}`)
  console.log(`  set   : ${d.set ?? '?'}  (candidates: ${d.setCandidates?.join(',') ?? '-'})`)
  console.log(`  cost  : ${d.cost ?? '?'}`)
  console.log(`  level : ${d.level ?? '?'}`)
  console.log(`  main  : ${d.mainStat ?? '?'}`)
  console.log(`  subs  : ${d.substats.map((s) => `${s.stat}=${s.value}`).join('  ')}`)
  console.log(`  conf  : ${d.confidence.toFixed(2)}  warnings: ${d.warnings.length}`)
  for (const wn of d.warnings) console.log(`    ⚠ ${wn.key}${wn.params ? ' ' + JSON.stringify(wn.params) : ''}`)

  await worker?.terminate()
}
main()
