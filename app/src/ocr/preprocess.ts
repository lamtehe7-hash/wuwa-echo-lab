// Tiền xử lý ảnh cho OCR (tăng độ chính xác tesseract với UI game):
// crop vùng panel → upscale chữ nhỏ → grayscale → nhị phân hoá (Otsu, tự đảo nền tối).
// Phần logic thuần (histogram/Otsu/binarize) làm việc trên ImageDataLike (object thường)
// để test được trong node không cần DOM; phần canvas là wrapper mỏng.

export interface ImageDataLike {
  /** RGBA, 4 byte / pixel */
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface PreprocessOptions {
  /** Vùng cắt (toạ độ ảnh gốc). Bỏ trống = cả ảnh. */
  crop?: Rect
  /** Hệ số phóng to. 'auto' = ×2 khi bề ngang sau crop < 800px (chữ nhỏ OCR kém). */
  scale?: number | 'auto'
  /** Nhị phân hoá đen/trắng (mặc định bật). Tắt nếu ảnh nguồn làm Otsu tệ hơn. */
  binarize?: boolean
}

/** Grayscale (BT.601) + histogram 256 mức — 1 pass */
export function grayscaleHistogram(img: ImageDataLike): { gray: Uint8ClampedArray; hist: number[] } {
  const { data, width, height } = img
  const gray = new Uint8ClampedArray(width * height)
  const hist = new Array<number>(256).fill(0)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    gray[p] = g
    hist[g]++
  }
  return { gray, hist }
}

/** Ngưỡng Otsu: tách 2 lớp tối/sáng sao cho phương sai giữa lớp lớn nhất */
export function otsuThreshold(hist: number[]): number {
  const total = hist.reduce((s, n) => s + n, 0)
  if (total === 0) return 127
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let maxVar = -1
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const v = wB * wF * (mB - mF) * (mB - mF)
    if (v > maxVar) {
      maxVar = v
      threshold = t
    }
  }
  return threshold
}

/**
 * Nhị phân hoá về CHỮ ĐEN trên NỀN TRẮNG (tesseract ưa polarity này).
 * UI game là chữ sáng trên nền tối → lớp chiếm đa số coi là nền, tự đảo khi nền tối.
 */
export function binarize(img: ImageDataLike, threshold?: number): ImageDataLike {
  const { gray, hist } = grayscaleHistogram(img)
  const t = threshold ?? otsuThreshold(hist)
  let dark = 0
  for (let p = 0; p < gray.length; p++) if (gray[p] <= t) dark++
  const invert = dark > gray.length / 2 // nền tối → pixel sáng (chữ) phải thành đen
  const out = new Uint8ClampedArray(img.data.length)
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const isDark = gray[p] <= t
    const v = isDark !== invert ? 0 : 255
    out[i] = out[i + 1] = out[i + 2] = v
    out[i + 3] = 255
  }
  return { data: out, width: img.width, height: img.height }
}

/** Chuẩn hoá rect kéo tay: gốc trên-trái, kích thước dương, clamp trong ảnh */
export function normalizeRect(x1: number, y1: number, x2: number, y2: number, maxW: number, maxH: number): Rect {
  const x = Math.max(0, Math.min(x1, x2))
  const y = Math.max(0, Math.min(y1, y2))
  const w = Math.min(maxW - x, Math.abs(x2 - x1))
  const h = Math.min(maxH - y, Math.abs(y2 - y1))
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
}

// ---- Phần phụ thuộc DOM (canvas) ----

/** Crop + upscale + binarize một nguồn ảnh vào canvas mới (sẵn sàng đưa vào tesseract) */
export function preprocessToCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  opts: PreprocessOptions = {},
): HTMLCanvasElement {
  const crop = opts.crop ?? { x: 0, y: 0, w: srcW, h: srcH }
  const scale = opts.scale === undefined || opts.scale === 'auto' ? (crop.w < 800 ? 2 : 1) : opts.scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(crop.w * scale))
  canvas.height = Math.max(1, Math.round(crop.h * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height)
  if (opts.binarize !== false) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const bin = binarize({ data: img.data, width: img.width, height: img.height })
    img.data.set(bin.data) // ghi ngược vào ImageData gốc (tránh vấn đề type ArrayBufferLike của TS6)
    ctx.putImageData(img, 0, 0)
  }
  return canvas
}

/** File/Blob ảnh → canvas đã tiền xử lý */
export async function fileToPreprocessedCanvas(file: File | Blob, opts: PreprocessOptions = {}): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file)
  try {
    return preprocessToCanvas(bmp, bmp.width, bmp.height, opts)
  } finally {
    bmp.close()
  }
}
