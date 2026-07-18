// Nhận diện sonata set từ icon tròn cạnh "+25" trên panel chi tiết echo.
// Nguyên lý: glyph trong lòng icon là silhouette riêng của từng set → so "chữ ký
// hình dạng" N×N (chuẩn hoá theo vòng tròn icon) với template sinh offline từ icon
// chuẩn (scripts/gen-seticon-signatures.ts). Phần lõi thuần (ImageDataLike) để test
// được trong node; phần canvas là wrapper mỏng — giống kiến trúc preprocess.ts.

import { SET_ICON_SIGNATURES, SET_ICON_SIG_SIZE } from '../data/seticonSignatures'
import { SET_ICON_SIGNATURES_INGAME } from '../data/seticonSignaturesIngame'
import type { ImageDataLike, Rect } from './preprocess'

const N = SET_ICON_SIG_SIZE

/** Ngưỡng chấp nhận match (mean abs diff 0..255) — hiệu chỉnh bằng bảng validate của gen script
 *  trên 17 badge thật (2 độ phân giải): set đúng ~61, set nhì ~74 → 70 chặn được cả trường hợp
 *  "set chưa có template" match ké template set khác. */
export const MATCH_MAX_DISTANCE = 70
/** Cách biệt tối thiểu với set khác gần nhì — dưới ngưỡng này coi như mơ hồ, trả null */
export const MATCH_MIN_MARGIN = 8
/** Pool THU HẸP theo DB (setCandidates từ tên echo): set thật CHẮC CHẮN nằm trong pool nên
 *  quyết bằng CÁCH BIỆT được — không còn rủi ro "set thiếu template match ké". Nét mềm video
 *  1080p đẩy distance set đúng lên ~72–87 (vượt ngưỡng 70) nhưng vẫn bỏ xa set nhì 23–44 điểm;
 *  frame mờ thật sự thì các ứng viên phẳng nhau (margin ≤7) → vẫn bị chặn. Calibrate 18/07
 *  trên 12 frame chẩn đoán video 1080p thật (diag-seticon). */
export const POOL_MATCH_MAX_DISTANCE = 90
export const POOL_MATCH_MIN_MARGIN = 15

function luminance(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
}

/** Kích thước chuẩn hoá vùng icon trước khi ký — loại bỏ phụ thuộc phân giải nguồn */
export const ICON_NORM_SIZE = 96

/** Resize RGBA bằng lấy mẫu trung bình theo vùng (ổn cả phóng to lẫn thu nhỏ) */
export function resizeImageData(img: ImageDataLike, w: number, h: number): ImageDataLike {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const ys = (y * img.height) / h
    const ye = Math.max(ys + 1e-6, ((y + 1) * img.height) / h)
    for (let x = 0; x < w; x++) {
      const xs = (x * img.width) / w
      const xe = Math.max(xs + 1e-6, ((x + 1) * img.width) / w)
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let cnt = 0
      for (let sy = Math.floor(ys); sy < Math.ceil(ye) && sy < img.height; sy++) {
        for (let sx = Math.floor(xs); sx < Math.ceil(xe) && sx < img.width; sx++) {
          const i = (sy * img.width + sx) * 4
          r += img.data[i]
          g += img.data[i + 1]
          b += img.data[i + 2]
          a += img.data[i + 3]
          cnt++
        }
      }
      const o = (y * w + x) * 4
      out[o] = r / cnt
      out[o + 1] = g / cnt
      out[o + 2] = b / cnt
      out[o + 3] = a / cnt
    }
  }
  return { data: out, width: w, height: h }
}

export function cropImageData(img: ImageDataLike, r: Rect): ImageDataLike {
  const out = new Uint8ClampedArray(r.w * r.h * 4)
  for (let y = 0; y < r.h; y++) {
    const src = ((r.y + y) * img.width + r.x) * 4
    out.set(img.data.subarray(src, src + r.w * 4), y * r.w * 4)
  }
  return { data: out, width: r.w, height: r.h }
}

/**
 * Tìm hình vuông ngoại tiếp vòng tròn icon trong một vùng ảnh:
 * - Ảnh có nền trong suốt (icon chuẩn tải về): bbox của pixel đục (alpha ≥128).
 * - Ảnh đục (crop từ frame game): thành phần liên thông pixel SÁNG (vành trắng của
 *   icon) có bbox lớn nhất; loại vùng không gần vuông (không phải hình tròn).
 */
export function findBadgeCircle(img: ImageDataLike): Rect | null {
  const { data, width, height } = img
  let transparent = false
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) {
      transparent = true
      break
    }
  }
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  if (transparent) {
    for (let p = 0, i = 0; i < data.length; p++, i += 4) {
      if (data[i + 3] < 128) continue
      const x = p % width
      const y = (p / width) | 0
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  } else {
    // Ước lượng vòng tròn từ pixel sáng (vành trắng + glyph): tâm = trọng tâm (vành đối
    // xứng nên trọng tâm ≈ tâm tròn), bán kính = r95 (mép ngoài vành — vành có thể đứt
    // nét ở phân giải thấp nên không dựa vào liên thông; điểm sáng lạc chỉ đẩy nhẹ r95).
    const pts: number[] = []
    for (let p = 0, i = 0; i < data.length; p++, i += 4) {
      if (luminance(data, i) > 180) pts.push(p)
    }
    if (pts.length < 30) return null
    let sx = 0
    let sy = 0
    for (const p of pts) {
      sx += p % width
      sy += (p / width) | 0
    }
    const cx = sx / pts.length
    const cy = sy / pts.length
    const rs = pts
      .map((p) => Math.hypot((p % width) - cx, (((p / width) | 0) - cy)))
      .sort((a, b) => a - b)
    const r = rs[Math.min(rs.length - 1, (rs.length * 0.95) | 0)]
    if (r < 6) return null
    x0 = Math.max(0, Math.round(cx - r))
    x1 = Math.min(width - 1, Math.round(cx + r))
    y0 = Math.max(0, Math.round(cy - r))
    y1 = Math.min(height - 1, Math.round(cy + r))
  }
  if (x1 < 0) return null
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  if (w < 12 || h < 12) return null
  const ratio = w / h
  if (ratio < 0.72 || ratio > 1.38) return null // không gần vuông → không phải icon tròn
  return { x: x0, y: y0, w, h }
}

/**
 * Chữ ký hình dạng của hình vuông ngoại tiếp icon tròn:
 * - chỉ xét lõi tròn r ≤ 0.78R (bỏ vành — vành giống nhau ở mọi set)
 * - glyph = pixel sáng hơn ngưỡng giữa min/max lõi (glyph trắng trên nền màu/tối)
 * - chuẩn hoá theo bbox glyph rồi lấy mẫu N×N (mỗi ô = tỉ lệ pixel glyph, 0..255)
 * Trả null nếu vùng phẳng/không có glyph rõ.
 */
export function iconSignature(img: ImageDataLike): Uint8Array | null {
  const { data, width, height } = img
  const cx = width / 2
  const cy = height / 2
  const rMax = (Math.min(width, height) / 2) * 0.78
  const r2 = rMax * rMax
  const gray = new Float32Array(width * height)
  for (let p = 0, i = 0; i < data.length; p++, i += 4) {
    gray[p] = luminance(data, i) * (data[i + 3] / 255)
  }
  let min = 255
  let max = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > r2) continue
      const g = gray[y * width + x]
      if (g < min) min = g
      if (g > max) max = g
    }
  }
  if (max - min < 40) return null // lõi phẳng → không có glyph
  const t = (min + max) / 2
  const mask = new Uint8Array(width * height)
  let lit = 0
  let core = 0
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy > r2) continue
      core++
      const p = y * width + x
      if (gray[p] > t) {
        mask[p] = 1
        lit++
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (lit < core * 0.02 || lit > core * 0.9) return null
  const bw = x1 - x0 + 1
  const bh = y1 - y0 + 1
  if (bw < 4 || bh < 4) return null
  const sig = new Uint8Array(N * N)
  for (let gy = 0; gy < N; gy++) {
    const ys = y0 + (gy * bh) / N
    const ye = y0 + ((gy + 1) * bh) / N
    for (let gx = 0; gx < N; gx++) {
      const xs = x0 + (gx * bw) / N
      const xe = x0 + ((gx + 1) * bw) / N
      let sum = 0
      let cnt = 0
      for (let y = Math.floor(ys); y < Math.ceil(ye) && y <= y1; y++) {
        for (let x = Math.floor(xs); x < Math.ceil(xe) && x <= x1; x++) {
          cnt++
          if (mask[y * width + x]) sum++
        }
      }
      sig[gy * N + gx] = cnt ? Math.round((sum / cnt) * 255) : 0
    }
  }
  return sig
}

export function sigDistance(a: Uint8Array, b: Uint8Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return s / a.length
}

export interface SetIconMatch {
  setId: string
  distance: number
  margin: number
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

let templateCache: { id: string; sig: Uint8Array }[] | null = null
function templates(): { id: string; sig: Uint8Array }[] {
  // Gộp template game8 + biến thể badge in-game thật (18/07 — sinh từ 105 screenshot kho 1080p,
  // gen-seticon-ingame.mts). classifySignature lấy min per set nên thêm biến thể chỉ KÉO GẦN set
  // đúng; badge thật giờ match ở d≈0–20 thay vì 45–107 với template game8 thuần.
  templateCache ??= [...SET_ICON_SIGNATURES, ...SET_ICON_SIGNATURES_INGAME].map(({ id, b64 }) => ({ id, sig: b64ToBytes(b64) }))
  return templateCache
}

/**
 * So một chữ ký với template mọi set (mỗi set lấy khoảng cách nhỏ nhất giữa các biến thể).
 * `candidates` (tuỳ chọn): thu hẹp pool về các set id khả dĩ (vd từ tên echo tra data/echoes.ts
 * — echo chỉ thuộc 1-3 set) → margin phân loại rộng hơn hẳn so với so với cả 34 set.
 * Pool chỉ còn 1 ứng viên thì bỏ điều kiện margin (không có "hạng nhì" để so).
 */
export function classifySignature(sig: Uint8Array, candidates?: string[]): SetIconMatch | null {
  const pool = candidates && candidates.length > 0 ? new Set(candidates) : null
  const bySet = new Map<string, number>()
  for (const tpl of templates()) {
    if (pool && !pool.has(tpl.id)) continue
    const d = sigDistance(sig, tpl.sig)
    const cur = bySet.get(tpl.id)
    if (cur === undefined || d < cur) bySet.set(tpl.id, d)
  }
  let bestId = ''
  let bestD = Infinity
  let secondD = Infinity
  for (const [id, d] of bySet) {
    if (d < bestD) {
      secondD = bestD
      bestD = d
      bestId = id
    } else if (d < secondD) {
      secondD = d
    }
  }
  if (!bestId) return null
  const margin = secondD - bestD
  const standardOk = bestD <= MATCH_MAX_DISTANCE && (bySet.size <= 1 || margin >= MATCH_MIN_MARGIN)
  // Pool thu hẹp ≥2 ứng viên: nhận thêm theo margin-rule (xem chú thích POOL_MATCH_*)
  const pooledOk = pool !== null && bySet.size > 1 && bestD <= POOL_MATCH_MAX_DISTANCE && margin >= POOL_MATCH_MIN_MARGIN
  if (!standardOk && !pooledOk) return null
  return { setId: bestId, distance: bestD, margin }
}

/**
 * Đường ống ký DUY NHẤT cho cả template (gen script) lẫn badge runtime:
 * tìm vòng tròn → crop → resize về ICON_NORM_SIZE → ký. Mọi khác biệt phân giải
 * nguồn (icon web 40–300px, badge game 60–150px) bị triệt tiêu ở bước resize.
 */
export function signatureForIconImage(img: ImageDataLike): Uint8Array | null {
  const circle = findBadgeCircle(img)
  if (!circle) return null
  return iconSignature(resizeImageData(cropImageData(img, circle), ICON_NORM_SIZE, ICON_NORM_SIZE))
}

/** Vùng ảnh (đã crop quanh icon) → set. Tự tìm vòng tròn icon bên trong vùng. */
export function classifyBadgeRegion(region: ImageDataLike, candidates?: string[]): SetIconMatch | null {
  const sig = signatureForIconImage(region)
  if (!sig) return null
  return classifySignature(sig, candidates)
}

// ---- Định vị icon theo kết quả OCR ("+NN" là mỏ neo, icon nằm ngay bên phải) ----

export interface OcrWordBox {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

export function findLevelWordBox(words: OcrWordBox[]): OcrWordBox | null {
  return words.find((w) => /^\+\d{1,2}$/.test(w.text.trim())) ?? null
}

/** Cửa sổ tìm icon: bên phải chữ "+NN", cao ±1.3 lần chiều cao chữ quanh tâm dòng */
export function badgeSearchRect(box: OcrWordBox['bbox'], imgW: number, imgH: number): Rect {
  const h = Math.max(1, box.y1 - box.y0)
  const cy = (box.y0 + box.y1) / 2
  const x = Math.max(0, Math.round(box.x1 + h * 0.1))
  const y = Math.max(0, Math.round(cy - h * 1.3))
  const w = Math.min(imgW - x, Math.round(h * 3.4))
  const hh = Math.min(imgH - y, Math.round(h * 2.6))
  return { x, y, w: Math.max(0, w), h: Math.max(0, hh) }
}

/** Bản thuần dùng chung cho node (benchmark/test) và wrapper canvas */
export function detectSetFromImage(img: ImageDataLike, words: OcrWordBox[], candidates?: string[]): SetIconMatch | null {
  const lvl = findLevelWordBox(words)
  if (!lvl) return null
  const rect = badgeSearchRect(lvl.bbox, img.width, img.height)
  if (rect.w < 12 || rect.h < 12) return null
  return classifyBadgeRegion(cropImageData(img, rect), candidates)
}

// ---- Phần phụ thuộc DOM ----

/** Canvas MÀU (trước binarize) + word boxes của lần OCR trên cùng crop/scale → set */
export function detectSetFromCanvas(canvas: HTMLCanvasElement, words: OcrWordBox[], candidates?: string[]): SetIconMatch | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return detectSetFromImage({ data: img.data, width: img.width, height: img.height }, words, candidates)
}
