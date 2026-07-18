// Validate classifier seticon trên BADGE NỀN TỐI thật (panel chi tiết echo in-game),
// hàng loạt cả thư mục screenshot. Ground truth = TÊN SET dạng TEXT trong chính panel
// (parseEchoText → matchSonataSet — tên đầy đủ, đáng tin); so với kết quả icon-classifier
// (detectSetFromImage: bbox "+NN" → vòng tròn → chữ ký 12×12, pool ĐẦY ĐỦ 34 set).
//
// Chạy TỪ app/:  npx -y tsx scripts/validate-seticon-badges.ts "<thư mục ảnh>" [--limit N]
// (ảnh 1920×1080 PNG; cần cache eng.traineddata ở gốc app/ — có sẵn từ task 79)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { PNG } from 'pngjs'
import { createWorker, type Worker } from 'tesseract.js'
import { binarize, type ImageDataLike } from '../src/ocr/preprocess'
import { parseEchoText } from '../src/ocr/parse'
import {
  cropImageData, resizeImageData, findLevelWordBox, badgeSearchRect, signatureForIconImage, findBadgeCircle, iconSignature, ICON_NORM_SIZE,
  classifySignature, sigDistance, MATCH_MAX_DISTANCE, MATCH_MIN_MARGIN,
} from '../src/ocr/seticon'
import { SET_ICON_SIGNATURES } from '../src/data/seticonSignatures'

const __dir = dirname(fileURLToPath(import.meta.url))
const APP = resolve(__dir, '..')
const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,%+-:/() '

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity
const dumpDir = args.includes('--dump') ? args[args.indexOf('--dump') + 1] : undefined
if (!dir) {
  console.error('Cách dùng: npx -y tsx scripts/validate-seticon-badges.ts "<thư mục ảnh>" [--limit N]')
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

// Khoảng cách nhỏ nhất tới TỪNG set (bỏ qua ngưỡng) — soi near-miss + dTruth
const tplBySet = new Map<string, Uint8Array[]>()
for (const { id, b64 } of SET_ICON_SIGNATURES) {
  const bin = atob(b64)
  const sig = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) sig[i] = bin.charCodeAt(i)
  const arr = tplBySet.get(id) ?? []
  arr.push(sig)
  tplBySet.set(id, arr)
}
function distTo(sig: Uint8Array, setId: string): number {
  const tpls = tplBySet.get(setId)
  return tpls ? Math.min(...tpls.map((t) => sigDistance(sig, t))) : NaN
}
function nearestRaw(sig: Uint8Array): { id: string; d: number; margin: number } {
  let bestId = '', bestD = Infinity, secondD = Infinity
  for (const [id] of tplBySet) {
    const d = distTo(sig, id)
    if (d < bestD) { secondD = bestD; bestD = d; bestId = id } else if (d < secondD) secondD = d
  }
  return { id: bestId, d: bestD, margin: secondD - bestD }
}

// THỬ NGHIỆM: tìm vòng tròn bằng mask sáng HOẶC bão-hoà-màu (vành tím/tối luminance <180
// bị findBadgeCircle hiện tại bỏ sót → vòng tròn co về bbox glyph → chữ ký méo).
// Lọc điểm về dải giữa theo trục y (badge nằm giữa search-rect; loại arc của icon hàng dưới).
function altFindBadgeCircle(img: ImageDataLike): { x: number; y: number; w: number; h: number } | null {
  const { data, width, height } = img
  const pts: number[] = []
  for (let p = 0, i = 0; i < data.length; p++, i += 4) {
    const y = (p / width) | 0
    if (Math.abs(y - height / 2) > height * 0.38) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (lum > 180 || (mx - mn > 40 && mx > 90)) pts.push(p)
  }
  if (pts.length < 30) return null
  let sx = 0, sy = 0
  for (const p of pts) { sx += p % width; sy += (p / width) | 0 }
  const cx = sx / pts.length, cy = sy / pts.length
  const rs = pts.map((p) => Math.hypot((p % width) - cx, (((p / width) | 0) - cy))).sort((a, b) => a - b)
  const r = rs[Math.min(rs.length - 1, (rs.length * 0.95) | 0)]
  if (r < 6) return null
  const x0 = Math.max(0, Math.round(cx - r)), x1 = Math.min(width - 1, Math.round(cx + r))
  const y0 = Math.max(0, Math.round(cy - r)), y1 = Math.min(height - 1, Math.round(cy + r))
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  if (w < 12 || h < 12) return null
  const ratio = w / h
  if (ratio < 0.72 || ratio > 1.38) return null
  return { x: x0, y: y0, w, h }
}

async function main() {
  const files = readdirSync(dir!).filter((f) => /\.png$/i.test(f)).sort().slice(0, limit)
  console.log(`\n=== Validate seticon badge: ${files.length} ảnh từ ${dir} ===`)
  console.log(`    ngưỡng hiện tại: MATCH_MAX_DISTANCE=${MATCH_MAX_DISTANCE}  MATCH_MIN_MARGIN=${MATCH_MIN_MARGIN}\n`)

  let ok = 0, wrong = 0, nul = 0, noTruth = 0, noBadge = 0
  let aOk = 0, aWrong = 0, aNul = 0
  const perSet = new Map<string, { ok: number; wrong: number; nul: number; aOk: number; aWrong: number; aNul: number }>()
  const wrongLines: string[] = []
  const poolInfo: { truth: string; has: boolean; inPool: boolean; b: string; a: string }[] = []

  for (const f of files) {
    const png = PNG.sync.read(readFileSync(join(dir!, f)))
    const colorImg = toImg(png)
    const { width: W, height: H } = colorImg

    // Ảnh là MÀN HÌNH KHO full-screen (không phải panel crop) → 2 crop cố định theo tỉ lệ UI:
    // (a) dropdown filter set góc trái trên ("Void Thunder"…) = GROUND TRUTH;
    // (b) hàng tên echo "+NN" + badge tròn ở ĐẦU panel phải = đầu vào classifier.
    // Đo trên screenshot 1920×1080 17/07: dropdown ≈ (222..590, 105..152), tên+badge ≈ (1500..1860, 145..185).
    const dropCrop = cropImageData(colorImg, {
      x: Math.round(0.09 * W), y: Math.round(0.085 * H), w: Math.round(0.26 * W), h: Math.round(0.075 * H),
    })
    const dropUp = resizeImageData(dropCrop, dropCrop.width * 2, dropCrop.height * 2)
    const truth = parseEchoText((await recognize(toPngBuf(binarize(dropUp)))).text).set ?? null

    const panelCrop = cropImageData(colorImg, {
      x: Math.round(0.755 * W), y: Math.round(0.11 * H), w: Math.round(0.245 * W), h: Math.round(0.1 * H),
    })
    // Upscale ×2 CẢ ảnh màu lẫn bản binarize — word-bbox và badge phải CÙNG hệ toạ độ (như app)
    const panelUp = resizeImageData(panelCrop, panelCrop.width * 2, panelCrop.height * 2)
    const { text: panelText, words } = await recognize(toPngBuf(binarize(panelUp)))
    // Mô phỏng in-app: tên echo trong crop → setCandidates (pool thu hẹp cho classifier)
    const candidates = parseEchoText(panelText).setCandidates

    // mirror detectSetFromImage nhưng giữ sig để chẩn đoán; kèm ALT circle-finder thử nghiệm
    const lvl = findLevelWordBox(words)
    let sig: Uint8Array | null = null
    let altSig: Uint8Array | null = null
    if (lvl) {
      const rect = badgeSearchRect(lvl.bbox, panelUp.width, panelUp.height)
      if (rect.w >= 12 && rect.h >= 12) {
        const region = cropImageData(panelUp, rect)
        sig = signatureForIconImage(region)
        const altC = altFindBadgeCircle(region)
        if (altC) altSig = iconSignature(resizeImageData(cropImageData(region, altC), ICON_NORM_SIZE, ICON_NORM_SIZE))
        if (dumpDir) {
          writeFileSync(join(dumpDir, `${f.replace(/\.png$/i, '')}-region.png`), toPngBuf(region))
          const circle = findBadgeCircle(region)
          if (circle) writeFileSync(join(dumpDir, `${f.replace(/\.png$/i, '')}-circle.png`), toPngBuf(cropImageData(region, circle)))
          if (altC) writeFileSync(join(dumpDir, `${f.replace(/\.png$/i, '')}-altcircle.png`), toPngBuf(cropImageData(region, altC)))
        }
      }
    }

    if (!truth) {
      noTruth++
      console.log(`  ❓ ${f}  truth=?(text không ra set)`)
      continue
    }
    if (!sig && !altSig) {
      noBadge++
      console.log(`  ⛔ ${f}  truth=${truth}  KHÔNG tìm được badge (lvl=${lvl ? 'có' : 'KHÔNG có "+NN"'})`)
      continue
    }

    const stat = perSet.get(truth) ?? { ok: 0, wrong: 0, nul: 0, aOk: 0, aWrong: 0, aNul: 0 }
    perSet.set(truth, stat)
    const describe = (s: Uint8Array | null, pool?: string[]): { mark: string; txt: string; cls: 'ok' | 'wrong' | 'nul' } => {
      if (!s) return { mark: '⛔', txt: 'no-circle', cls: 'nul' }
      const m = classifySignature(s, pool)
      const near = nearestRaw(s)
      const dT = distTo(s, truth)
      if (m?.setId === truth) return { mark: '✅', txt: `d=${m.distance.toFixed(1)} m=${m.margin.toFixed(1)}`, cls: 'ok' }
      if (m) return { mark: '❌', txt: `got=${m.setId} d=${m.distance.toFixed(1)} m=${m.margin.toFixed(1)} dTruth=${dT.toFixed(1)}`, cls: 'wrong' }
      return { mark: '⚪', txt: `null (near=${near.id} d=${near.d.toFixed(1)} m=${near.margin.toFixed(1)} dTruth=${dT.toFixed(1)})`, cls: 'nul' }
    }
    const B = describe(sig), A = describe(altSig)
    // Pool-mode (mô phỏng app: candidates từ tên echo — chỉ tính khi OCR ra candidates)
    const BP = describe(sig, candidates), AP = describe(altSig, candidates)
    poolInfo.push({ truth, has: !!(candidates && candidates.length), inPool: !!candidates?.includes(truth), b: BP.cls, a: AP.cls })
    if (B.cls === 'ok') { ok++; stat.ok++ } else if (B.cls === 'wrong') { wrong++; stat.wrong++ } else { nul++; stat.nul++ }
    if (A.cls === 'ok') { aOk++; stat.aOk++ } else if (A.cls === 'wrong') { aWrong++; stat.aWrong++ } else { aNul++; stat.aNul++ }
    const line = `  ${B.mark}${A.mark} ${f}  ${truth}  | base: ${B.txt}  | alt: ${A.txt}`
    if (B.cls === 'wrong' || A.cls === 'wrong') wrongLines.push(line)
    console.log(line)
  }

  console.log(`\n=== TỔNG ${files.length} ảnh (❓ ${noTruth} thiếu truth · ⛔ ${noBadge} không badge) ===`)
  console.log(`  BASE (engine hiện tại): ✅ ${ok} · ❌ ${wrong} SAI · ⚪ ${nul} null`)
  console.log(`  ALT  (mask sáng∪màu)  : ✅ ${aOk} · ❌ ${aWrong} SAI · ⚪ ${aNul} null`)
  console.log(`\nPer-set (${perSet.size} set phủ) — base ok/wrong/null | alt ok/wrong/null:`)
  for (const [id, s] of [...perSet].sort((a, b) => a[0].localeCompare(b[0])))
    console.log(`  ${id.padEnd(28)} ${s.ok}/${s.wrong}/${s.nul} | ${s.aOk}/${s.aWrong}/${s.aNul}`)
  if (wrongLines.length) {
    console.log('\n❌ Các ca SAI (nguy hiểm — cần soi):')
    wrongLines.forEach((l) => console.log(l))
  }
  const withPool = poolInfo.filter((p) => p.has)
  const tally = (k: 'b' | 'a') => {
    const ok = withPool.filter((p) => p[k] === 'ok').length
    const wr = withPool.filter((p) => p[k] === 'wrong').length
    const nu = withPool.filter((p) => p[k] === 'nul').length
    return `✅ ${ok} · ❌ ${wr} · ⚪ ${nu}`
  }
  console.log(`\n=== POOL-MODE (mô phỏng app, candidates từ tên OCR): ${withPool.length}/${poolInfo.length} ảnh có candidates, ` +
    `${withPool.filter((p) => p.inPool).length} ảnh truth NẰM TRONG pool ===`)
  console.log(`  BASE+pool: ${tally('b')}`)
  console.log(`  ALT +pool: ${tally('a')}`)
  await worker?.terminate()
}
main()
