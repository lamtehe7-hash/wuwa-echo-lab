// Benchmark pipeline video-OCR trên frame THẬT trích từ video quay màn hình game
// (xem lệnh ffmpeg mẫu cuối file). Tái dùng đúng code app: binarize (preprocess),
// recognizeImage (engine — whitelist thật), parseEchoText (parse), mergeDrafts (video).
// Chạy TỪ THƯ MỤC app/ (để tesseract.js thấy eng.traineddata cache ở gốc app):
//   npx tsx scripts/video-ocr-benchmark.ts <thư-mục-frames-png> [--raw]
//   --raw: bỏ binarize, so sánh chất lượng có/không tiền xử lý
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import { binarize } from '../src/ocr/preprocess'
import { parseEchoText, type EchoDraft } from '../src/ocr/parse'
import { mergeDrafts } from '../src/ocr/video'
import { recognizeImage, terminateOcrEngine } from '../src/ocr/engine'

const dir = process.argv[2]
const rawMode = process.argv.includes('--raw')
if (!dir) {
  console.error('Cách dùng: npx tsx scripts/video-ocr-benchmark.ts <thư-mục-frames-png> [--raw]')
  process.exit(1)
}
const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).sort()
if (files.length === 0) {
  console.error(`Không có file .png nào trong ${dir}`)
  process.exit(1)
}

const fmtSub = (s: { stat: string; value: number }) => `${s.stat}=${s.value}`
const drafts: EchoDraft[] = []

for (const f of files) {
  const png = PNG.sync.read(readFileSync(join(dir, f)))
  let buf: Buffer
  if (rawMode) {
    buf = PNG.sync.write(png)
  } else {
    const bin = binarize({ data: new Uint8ClampedArray(png.data), width: png.width, height: png.height })
    const out = new PNG({ width: png.width, height: png.height })
    out.data = Buffer.from(bin.data)
    buf = PNG.sync.write(out)
  }
  // Node: worker.recognize nhận Buffer (type khai báo của wrapper chỉ liệt kê kiểu browser)
  const text = await recognizeImage(buf as never)
  const d = parseEchoText(text)
  drafts.push(d)
  console.log(
    `${f}: name="${d.name ?? '?'}" main=${d.mainStat ?? '?'} lv=${d.level ?? '?'} subs=[${d.substats.map(fmtSub).join(' ')}] conf=${d.confidence.toFixed(2)} warn=${d.warnings.length}`,
  )
}

const merged = mergeDrafts(drafts)
console.log(`\n===== ${merged.length} echo sau khi gộp / ${files.length} frame =====`)
merged.forEach(({ draft, frames }, i) => {
  console.log(`\n#${i + 1} — thấy ở ${frames} frame`)
  console.log(`  name="${draft.name ?? '?'}" set=${draft.set ?? '?'} main=${draft.mainStat} lv=${draft.level ?? '?'} conf=${draft.confidence.toFixed(2)}`)
  console.log(`  subs: ${draft.substats.map(fmtSub).join(', ') || '(không)'}`)
  for (const w of draft.warnings) console.log(`  ⚠ ${w.key}${w.params ? ' ' + JSON.stringify(w.params) : ''}`)
})

await terminateOcrEngine()

/* Trích frame bằng ffmpeg — mô phỏng pipeline app (2 frame/s như stepSec mặc định 0.5,
   crop vùng chỉ số như user khoanh tay, upscale ×2 như scale:'auto' khi bề ngang <800px):
   ffmpeg -i video.mp4 -vf "fps=2,crop=W:H:X:Y,scale=2*W:2*H:flags=bicubic" frames/f%03d.png
*/
