// SINH data/seticonSignaturesIngame.ts — biến thể chữ ký set-icon từ BADGE IN-GAME THẬT
// (bổ sung cho template game8 trong seticonSignatures.ts; classifySignature lấy min qua mọi biến thể).
//
// Input: thư mục screenshot MÀN HÌNH KHO full-screen 1920×1080 (như "Test Input/seticon" — local,
// gitignored, KHÔNG commit ảnh). Ground truth = dropdown filter set góc trái; chữ ký lấy qua ĐÚNG
// pipeline app (panel phải → OCR "+NN" → badgeSearchRect → findBadgeCircle → iconSignature) nên
// biến thể "hấp thụ" luôn đặc tính circle-finder hiện tại — đổi pipeline seticon thì PHẢI regen.
//
// Chống outlier (echo đang đeo → icon "người" chiếm chỗ badge): mỗi set gom chữ ký, cluster theo
// khoảng cách ≤ NEAR, chỉ nhận medoid của cluster LỚN NHẤT và cluster phải ≥ MIN_CLUSTER ảnh.
//
// Chạy TỪ app/:  npx -y tsx scripts/gen-seticon-ingame.mts "../Test Input/seticon"
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { PNG } from 'pngjs'
import { createWorker, type Worker } from 'tesseract.js'
import { binarize, type ImageDataLike } from '../src/ocr/preprocess'
import { parseEchoText } from '../src/ocr/parse'
import {
  cropImageData, resizeImageData, findLevelWordBox, badgeSearchRect, signatureForIconImage, sigDistance,
} from '../src/ocr/seticon'
import { SONATA_SETS } from '../src/data/sonata'

const __dir = dirname(fileURLToPath(import.meta.url))
const APP = resolve(__dir, '..')
const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,%+-:/() '
const NEAR = 25 // 2 chữ ký cùng badge asset thì d ≈ 0–20 (đo 18/07); khác asset ≥ 40
// outlier (icon đang-đeo/lock) chỉ xuất hiện lẻ tẻ; --min-cluster 1 CHỈ khi đã kiểm tay dump circle
const MIN_CLUSTER = process.argv.includes('--min-cluster') ? Number(process.argv[process.argv.indexOf('--min-cluster') + 1]) : 2

const dir = process.argv.slice(2).find((a) => !a.startsWith('--'))
if (!dir) {
  console.error('Cách dùng: npx -y tsx scripts/gen-seticon-ingame.mts "<thư mục screenshot>"')
  process.exit(1)
}

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
    cachePath: APP,
    langPath: join(APP, 'public', 'tesseract', 'lang'),
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
  const files = readdirSync(dir!).filter((f) => /\.png$/i.test(f)).sort()
  const bySet = new Map<string, Uint8Array[]>()
  for (const f of files) {
    const colorImg = toImg(PNG.sync.read(readFileSync(join(dir!, f))))
    const { width: W, height: H } = colorImg
    const dropUp = (() => {
      const c = cropImageData(colorImg, { x: Math.round(0.145 * W), y: Math.round(0.085 * H), w: Math.round(0.135 * W), h: Math.round(0.075 * H) })
      return resizeImageData(c, c.width * 2, c.height * 2)
    })()
    const truth = parseEchoText((await recognize(toPngBuf(binarize(dropUp)))).text).set
    if (!truth) { console.log(`  bỏ ${f}: dropdown không ra set`); continue }
    const panelCrop = cropImageData(colorImg, { x: Math.round(0.755 * W), y: Math.round(0.11 * H), w: Math.round(0.245 * W), h: Math.round(0.1 * H) })
    const panelUp = resizeImageData(panelCrop, panelCrop.width * 2, panelCrop.height * 2)
    const { words } = await recognize(toPngBuf(binarize(panelUp)))
    const lvl = findLevelWordBox(words)
    if (!lvl) { console.log(`  bỏ ${f}: không thấy "+NN"`); continue }
    const rect = badgeSearchRect(lvl.bbox, panelUp.width, panelUp.height)
    if (rect.w < 12 || rect.h < 12) continue
    const sig = signatureForIconImage(cropImageData(panelUp, rect))
    if (!sig) { console.log(`  bỏ ${f}: không ký được badge`); continue }
    const arr = bySet.get(truth) ?? []
    arr.push(sig)
    bySet.set(truth, arr)
  }

  const validIds = new Set(SONATA_SETS.map((s) => s.id))
  const out: { id: string; b64: string }[] = []
  for (const [id, sigs] of [...bySet].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (!validIds.has(id)) throw new Error(`set lạ từ OCR dropdown: ${id}`)
    // cluster tham lam quanh từng sig; lấy cluster lớn nhất, medoid = sig có tổng khoảng cách nhỏ nhất
    let best: Uint8Array[] = []
    for (const c of sigs) {
      const cluster = sigs.filter((s) => sigDistance(c, s) <= NEAR)
      if (cluster.length > best.length) best = cluster
    }
    if (best.length < MIN_CLUSTER) {
      console.log(`  ⚠ ${id}: cluster lớn nhất chỉ ${best.length}/${sigs.length} ảnh — BỎ (cần ≥${MIN_CLUSTER})`)
      continue
    }
    const medoid = best.reduce((m, c) =>
      best.reduce((s, o) => s + sigDistance(c, o), 0) < best.reduce((s, o) => s + sigDistance(m, o), 0) ? c : m)
    out.push({ id, b64: Buffer.from(medoid).toString('base64') })
    console.log(`  ✓ ${id}: ${best.length}/${sigs.length} ảnh trong cluster`)
  }

  const body = out.map((o) => `  { id: '${o.id}', b64: '${o.b64}' },`).join('\n')
  writeFileSync(join(APP, 'src', 'data', 'seticonSignaturesIngame.ts'),
    `// FILE SINH TỰ ĐỘNG — đừng sửa tay. Chạy lại: npx tsx scripts/gen-seticon-ingame.mts "<dir screenshot>"\n` +
    `// Biến thể chữ ký set-icon từ BADGE IN-GAME THẬT (screenshot kho 1080p 18/07/2026, ${out.length} set) —\n` +
    `// gộp với template game8 (seticonSignatures.ts) trong seticon.ts templates(). Đổi pipeline seticon → regen.\n\n` +
    `import type { SetIconSignature } from './seticonSignatures'\n\n` +
    `export const SET_ICON_SIGNATURES_INGAME: SetIconSignature[] = [\n${body}\n]\n`)
  console.log(`\nĐã ghi src/data/seticonSignaturesIngame.ts — ${out.length} set (thiếu: ${[...validIds].filter((v) => !out.some((o) => o.id === v)).join(', ') || 'không'})`)
  await worker?.terminate()
}
main()
