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
