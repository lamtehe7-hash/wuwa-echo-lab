// Import kho echo qua VIDEO quay màn hình (passive-only: user tự quay bằng công cụ
// ngoài — Win+G/OBS…, rồi chọn file; tool không tự chụp/điều khiển game).
// Luồng: video → seek theo bước thời gian → frame → preprocess (crop vùng panel do
// user khoanh tay) → tesseract → parseEchoText → dedup theo "chữ ký" echo.

import type { EchoDraft } from './parse'
import { preprocessToCanvas, type ImageDataLike, type PreprocessOptions, type Rect } from './preprocess'

/** Trần số frame OCR một lần quét (chống video quá dài làm treo trình duyệt) */
export const MAX_FRAMES = 600

/** Pass chọn-frame-nét lấy mẫu dày gấp N lần bước OCR (frame trúng lúc cuộn/chuyển cảnh
 *  bị loại, mỗi cửa sổ stepSec chỉ OCR frame NÉT nhất — tổng số frame OCR không đổi) */
export const SHARP_OVERSAMPLE = 3

/** Danh sách mốc thời gian cần trích, cách nhau stepSec (chặn dưới 0.2s), tối đa maxFrames */
export function frameTimestamps(duration: number, stepSec: number, maxFrames = MAX_FRAMES): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return []
  const step = Math.max(0.2, stepSec)
  const out: number[] = []
  for (let t = 0; t < duration && out.length < maxFrames; t += step) out.push(t)
  return out
}

/**
 * Độ nét một frame = variance đáp ứng Laplacian trên kênh xám (chuẩn "variance of Laplacian"):
 * frame mờ chuyển cảnh/đang cuộn cho biên bệt → variance thấp; panel đứng yên chữ sắc → cao.
 * Chỉ dùng để SO SÁNH các frame cùng vùng crop trong 1 video — không phải ngưỡng tuyệt đối.
 */
export function sharpnessScore(img: ImageDataLike): number {
  const { data, width, height } = img
  if (width < 3 || height < 3) return 0
  const gray = new Float32Array(width * height)
  for (let p = 0, i = 0; i < data.length; p++, i += 4) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  let sum = 0
  let sum2 = 0
  let n = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x
      const v = 4 * gray[p] - gray[p - 1] - gray[p + 1] - gray[p - width] - gray[p + width]
      sum += v
      sum2 += v * v
      n++
    }
  }
  const mean = sum / n
  return sum2 / n - mean * mean
}

export interface FrameSharpness {
  time: number
  sharpness: number
}

/**
 * Mỗi cửa sổ windowSec giữ đúng 1 mốc thời gian có sharpness cao nhất (thứ tự thời gian).
 * Đầu vào là kết quả pass đo-nét lấy mẫu dày; đầu ra là danh sách mốc sẽ OCR thật.
 */
export function pickSharpestPerWindow(cands: FrameSharpness[], windowSec: number): number[] {
  const win = Math.max(0.2, windowSec)
  const byWindow = new Map<number, FrameSharpness>()
  for (const c of cands) {
    const k = Math.floor(c.time / win)
    const cur = byWindow.get(k)
    if (!cur || c.sharpness > cur.sharpness) byWindow.set(k, c)
  }
  return [...byWindow.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, c]) => c.time)
}

/**
 * "Chữ ký" nội dung một draft để dedup giữa các frame (cùng 1 echo xuất hiện ở nhiều
 * frame liên tiếp). null = frame không nhận diện được main stat (transition/rác) → bỏ.
 * Hạn chế đã biết: 2 echo THẬT có main stat + level + substat giống hệt nhau sẽ bị gộp
 * làm 1 — hiếm với echo đã tune, user có thể thêm tay con còn thiếu.
 */
export function draftSignature(d: EchoDraft): string | null {
  if (!d.mainStat) return null
  const subs = [...d.substats]
    .sort((a, b) => a.stat.localeCompare(b.stat))
    .map((s) => `${s.stat}:${s.value}`)
    .join(',')
  return `${d.mainStat}|${d.level ?? '?'}|${subs}`
}

export interface MergedDraft {
  draft: EchoDraft
  /** Số frame đã thấy echo này (tin cậy hơn khi ≥2) */
  frames: number
}

/** Chất lượng bản đọc: có main > nhiều substat hơn > có level > confidence cao hơn
 *  (level được xét để đại diện cụm giữ được guard "level khác → 2 echo thật") */
function draftQuality(d: EchoDraft): number {
  return (d.mainStat ? 1000 : 0) + d.substats.length * 100 + (d.level !== undefined ? 50 : 0) + d.confidence
}

function subsSet(d: EchoDraft): Set<string> {
  return new Set(d.substats.map((s) => `${s.stat}:${s.value}`))
}

function isSubset(small: Set<string>, big: Set<string>): boolean {
  for (const v of small) if (!big.has(v)) return false
  return true
}

/** Tối thiểu số substat để một bản đọc THIẾU được phép gộp vào bản đầy đủ hơn */
export const MIN_SUBSET_SUBS = 3
/** Tối thiểu số substat trùng nhau để gộp 2 bản có main KHÁC nhau (main misread) */
const MIN_SUBS_MAIN_CONFLICT = 4

/**
 * Chống "echo ma" từ frame chụp giữa lúc chuyển panel: gom các bản đọc của cùng một echo
 * về 1 draft tốt nhất, thay cho dedup chữ-ký-tuyệt-đối. Quy tắc gộp (level đã biết mà khác
 * nhau thì KHÔNG bao giờ gộp — 2 echo thật):
 * - Bộ substat BẰNG NHAU + main trùng hoặc một bên thiếu → cùng echo.
 * - Bộ substat bằng nhau ≥4 dòng nhưng main khác → một bên misread main (trùng ngẫu nhiên
 *   cả 4-5 roll gần như không xảy ra); bộ ngắn 1-2 dòng thì giữ riêng (2 echo thật dễ trùng).
 * - Bộ substat là TẬP CON THẬT ≥3 dòng (theo CẢ 2 chiều — bản mới thiếu dòng, hoặc bản mới
 *   ĐẦY ĐỦ HƠN đại diện cụm), main không xung khắc → cùng echo; bản nhiều substat hơn
 *   thay làm đại diện, field còn trống (main/level/name/set/cost/setCandidates) được bổ sung
 *   từ bản kia (level backfill giữ cho guard "level khác" hoạt động với các frame sau).
 * Draft không có main và không gộp được vào đâu → bỏ (như trước).
 */
export function mergeDrafts(drafts: EchoDraft[]): MergedDraft[] {
  const clusters: { draft: EchoDraft; frames: number; subs: Set<string> }[] = []
  // Duyệt bản đọc tốt trước để đại diện cụm luôn là bản đầy đủ nhất (không phụ thuộc thứ tự frame)
  const ordered = [...drafts].sort((a, b) => draftQuality(b) - draftQuality(a))
  for (const d of ordered) {
    if (!d.mainStat && d.substats.length === 0) continue
    const subs = subsSet(d)
    let merged = false
    for (const c of clusters) {
      const levelConflict = d.level !== undefined && c.draft.level !== undefined && d.level !== c.draft.level
      if (levelConflict) continue
      const mainOk = !d.mainStat || !c.draft.mainStat || d.mainStat === c.draft.mainStat
      const equal = subs.size === c.subs.size && isSubset(subs, c.subs)
      // Tên echo khớp → hạ ngưỡng subset xuống 2 (thay vì MIN_SUBSET_SUBS=3). KHÔNG hạ xuống 1:
      // người chơi giữ NHIỀU bản copy cùng tên với roll khác nhau là chuyện thường, mà roll lấy từ
      // tập mốc rời rạc nhỏ nên 2 bản copy thật rất dễ trùng đúng 1 dòng (stat,value) — bản đọc
      // thiếu 1 dòng của copy B sẽ bị nuốt vào copy A, MẤT HẲN 1 echo khi import video (review
      // 16/07). Trùng ≥2 dòng roll mới đủ làm bằng chứng cùng-instance.
      const nameMatch = !!(d.name && c.draft.name && d.name.trim().toLowerCase() === c.draft.name.trim().toLowerCase())
      const minSub = nameMatch ? 2 : MIN_SUBSET_SUBS
      const asSubset = !equal && subs.size >= minSub && isSubset(subs, c.subs)
      const asSuperset = !equal && c.subs.size >= minSub && isSubset(c.subs, subs)
      if ((equal && (mainOk || subs.size >= MIN_SUBS_MAIN_CONFLICT)) || ((asSubset || asSuperset) && mainOk)) {
        c.frames++
        // Bản NHIỀU substat hơn làm đại diện; field bản kia đọc được mà đại diện thiếu
        // (main/level/name/set/cost/setCandidates) → bổ sung từ frame đó
        const rich = asSuperset ? d : c.draft
        const poor = asSuperset ? c.draft : d
        c.draft = {
          ...rich,
          mainStat: rich.mainStat ?? poor.mainStat,
          level: rich.level ?? poor.level,
          name: rich.name ?? poor.name,
          set: rich.set ?? poor.set,
          cost: rich.cost ?? poor.cost,
          setCandidates: rich.setCandidates ?? poor.setCandidates,
        }
        if (asSuperset) c.subs = subs
        merged = true
        break
      }
    }
    if (!merged) {
      if (!d.mainStat) continue
      clusters.push({ draft: d, frames: 1, subs })
    }
  }
  return clusters.map(({ draft, frames }) => ({ draft, frames }))
}

/** Nạp file video vào <video> ẩn (objectURL — caller phải gọi releaseVideo khi xong) */
export function loadVideo(file: File): Promise<HTMLVideoElement> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = url
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('video-load-failed'))
    }
  })
}

export function releaseVideo(video: HTMLVideoElement): void {
  const url = video.src
  video.removeAttribute('src')
  video.load()
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

/** Seek tới mốc thời gian và đợi frame sẵn sàng */
export function seekFrame(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('video-seek-failed'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = t
  })
}

/** Chụp frame hiện tại của video thành canvas đã tiền xử lý */
export function captureFrame(video: HTMLVideoElement, opts: PreprocessOptions = {}): HTMLCanvasElement {
  return preprocessToCanvas(video, video.videoWidth, video.videoHeight, opts)
}

/** Đo độ nét frame hiện tại (vùng crop, KHÔNG scale/binarize — chỉ để so sánh giữa các frame) */
export function frameSharpness(video: HTMLVideoElement, crop?: Rect): number {
  const canvas = preprocessToCanvas(video, video.videoWidth, video.videoHeight, { crop, scale: 1, binarize: false })
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return 0
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return sharpnessScore({ data: img.data, width: img.width, height: img.height })
}
