// Copy tài nguyên tesseract.js từ node_modules -> public/tesseract để app tự phục vụ
// (offline / không phụ thuộc CDN jsdelivr). Chạy tự động ở predev/prebuild (package.json).
// Lưu ý: langdata (public/tesseract/lang/eng.traineddata.gz) KHÔNG copy ở đây — file đó
// commit sẵn trong repo (tải 1 lần từ @tesseract.js-data/eng/4.0.0, xem HANDOVER).
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'tesseract')
mkdirSync(join(out, 'core'), { recursive: true })

// Worker chính (main thread spawn qua blob importScripts -> cần URL tuyệt đối, engine.ts lo)
copyFileSync(join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), join(out, 'worker.min.js'))

// Cả 6 variant core .wasm.js — worker feature-detect (relaxedsimd/simd/none × lstm/full)
// và chỉ tải ĐÚNG 1 file lúc chạy; oem hiện tại (undefined) dùng nhóm FULL (non-lstm).
const CORES = [
  'tesseract-core.wasm.js',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
]
for (const f of CORES) {
  copyFileSync(join(root, 'node_modules', 'tesseract.js-core', f), join(out, 'core', f))
}
console.log(`tesseract assets -> public/tesseract (worker + ${CORES.length} cores)`)
