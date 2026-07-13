// Sinh src/data/seticonSignatures.ts từ icon sonata set chuẩn (PNG, tên file = id set
// trong data/sonata.ts). Nguồn icon: game8.co "List of All Sonata Effects" (34 set) +
// prydwen.gg "Echo Sets" (30 set) — chỉ lưu chữ ký SỐ vào repo, không lưu ảnh.
// Chạy: npx tsx scripts/gen-seticon-signatures.ts <dir-icon-1> [dir-icon-2 ...] [--validate <dir-badge-crop>]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { PNG } from 'pngjs'
import { SONATA_BY_ID } from '../src/data/sonata'
import { SET_ICON_SIG_SIZE } from '../src/data/seticonSignatures'
import { signatureForIconImage, sigDistance } from '../src/ocr/seticon'
import type { ImageDataLike } from '../src/ocr/preprocess'

const args = process.argv.slice(2)
const vIdx = args.indexOf('--validate')
const badgeDir = vIdx >= 0 ? args[vIdx + 1] : null
const iconDirs = args.filter((a, i) => a !== '--validate' && i !== vIdx + 1)
if (iconDirs.length === 0) {
  console.error('Cách dùng: npx tsx scripts/gen-seticon-signatures.ts <dir-icon...> [--validate <dir-badge>]')
  process.exit(1)
}

function readPng(path: string): ImageDataLike {
  const png = PNG.sync.read(readFileSync(path))
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height }
}

const sigs: { id: string; b64: string; src: string }[] = []
for (const dir of iconDirs) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.png')).sort()) {
    const id = basename(f, '.png')
    if (!SONATA_BY_ID[id]) {
      console.warn(`⚠ bỏ qua ${dir}/${f}: id "${id}" không có trong data/sonata.ts`)
      continue
    }
    const img = readPng(join(dir, f))
    const sig = signatureForIconImage(img)
    if (!sig) {
      console.warn(`⚠ ${dir}/${f}: không trích được chữ ký (không thấy vòng tròn/glyph)`)
      continue
    }
    sigs.push({ id, b64: Buffer.from(sig).toString('base64'), src: dir })
  }
}
console.log(`Đã sinh ${sigs.length} chữ ký cho ${new Set(sigs.map((s) => s.id)).size} set.`)

// ---- Validate trên badge crop thật (nếu có) — dùng chữ ký MỚI, không dùng file data cũ ----
if (badgeDir) {
  const templates = sigs.map((s) => ({ id: s.id, sig: new Uint8Array(Buffer.from(s.b64, 'base64')) }))
  console.log('\nValidate trên badge thật:')
  for (const f of readdirSync(badgeDir).filter((f) => f.endsWith('.png')).sort()) {
    const img = readPng(join(badgeDir, f))
    const sig = signatureForIconImage(img)
    if (!sig) {
      console.log(`  ${f}: KHÔNG trích được chữ ký`)
      continue
    }
    const bySet = new Map<string, number>()
    for (const t of templates) {
      const d = sigDistance(sig, t.sig)
      if (!bySet.has(t.id) || d < bySet.get(t.id)!) bySet.set(t.id, d)
    }
    const ranked = [...bySet.entries()].sort((a, b) => a[1] - b[1]).slice(0, 3)
    console.log(
      `  ${f}: ${ranked.map(([id, d]) => `${id}=${d.toFixed(1)}`).join(' · ')} (margin ${(ranked[1][1] - ranked[0][1]).toFixed(1)})`,
    )
  }
}

// ---- Ghi file data ----
const out = `// FILE SINH TỰ ĐỘNG — đừng sửa tay. Chạy lại: npx tsx scripts/gen-seticon-signatures.ts <dir-icon...>
// Chữ ký hình dạng ${SET_ICON_SIG_SIZE}×${SET_ICON_SIG_SIZE} (base64, ${SET_ICON_SIG_SIZE * SET_ICON_SIG_SIZE} byte/chữ ký) của icon sonata set, sinh từ icon chuẩn
// (nguồn: game8.co "List of All Sonata Effects" + prydwen.gg "Echo Sets" — chỉ lưu SỐ, không lưu ảnh).

export const SET_ICON_SIG_SIZE = ${SET_ICON_SIG_SIZE}

export interface SetIconSignature {
  /** id set trong data/sonata.ts */
  id: string
  /** ${SET_ICON_SIG_SIZE * SET_ICON_SIG_SIZE} byte chữ ký, base64 */
  b64: string
}

export const SET_ICON_SIGNATURES: SetIconSignature[] = [
${sigs.map((s) => `  { id: '${s.id}', b64: '${s.b64}' },`).join('\n')}
]
`
writeFileSync(join(import.meta.dirname, '../src/data/seticonSignatures.ts'), out)
console.log('\nĐã ghi src/data/seticonSignatures.ts')
