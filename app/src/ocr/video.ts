// Import kho echo qua VIDEO quay màn hình (passive-only: user tự quay bằng công cụ
// ngoài — Win+G/OBS…, rồi chọn file; tool không tự chụp/điều khiển game).
// Luồng: video → seek theo bước thời gian → frame → preprocess (crop vùng panel do
// user khoanh tay) → tesseract → parseEchoText → dedup theo "chữ ký" echo.

import type { EchoDraft } from './parse'
import { preprocessToCanvas, type PreprocessOptions } from './preprocess'

/** Trần số frame một lần quét (chống video quá dài làm treo trình duyệt) */
export const MAX_FRAMES = 600

/** Danh sách mốc thời gian cần trích, cách nhau stepSec, tối đa MAX_FRAMES */
export function frameTimestamps(duration: number, stepSec: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return []
  const step = Math.max(0.2, stepSec)
  const out: number[] = []
  for (let t = 0; t < duration && out.length < MAX_FRAMES; t += step) out.push(t)
  return out
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
      // Tên echo khớp = tín hiệu CÙNG-INSTANCE mạnh (1 lần dừng trên 1 echo) → cho phép gộp
      // subset dưới ngưỡng MIN_SUBSET_SUBS (vd bản đọc 5-sub vs bản 1-sub của cùng echo), vẫn
      // an toàn vì guard level đã chặn khác-level và tên khớp hiếm trùng giữa 2 echo thật cùng level.
      const nameMatch = !!(d.name && c.draft.name && d.name.trim().toLowerCase() === c.draft.name.trim().toLowerCase())
      const minSub = nameMatch ? 1 : MIN_SUBSET_SUBS
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
