// Wrapper tesseract.js — import động để không phình bundle chính (chỉ tải khi user
// thực sự mở "Import từ ảnh"). Passive-only: chỉ chạy khi user chủ động chọn ảnh, không
// tự động chụp màn hình hay tương tác với game.
import type { Worker } from 'tesseract.js'

export interface OcrProgress {
  status: string
  /** 0..1 */
  progress: number
}

let workerPromise: Promise<Worker> | null = null
let currentOnProgress: ((p: OcrProgress) => void) | null = null

/** Giới hạn bộ ký tự UI echo (nhãn EN + số + % + dấu câu) — bớt misread ký tự lạ (|, ·, unicode) */
const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,%+-:/() '

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(async ({ createWorker }) => {
      const w = await createWorker('eng', undefined, {
        logger: (m) => currentOnProgress?.({ status: m.status, progress: m.progress }),
      })
      await w.setParameters({ tessedit_char_whitelist: CHAR_WHITELIST })
      return w
    })
  }
  return workerPromise
}

/** OCR 1 ảnh (file hoặc canvas đã tiền xử lý) -> text thô. Worker tái sử dụng (khởi tạo lười). */
export async function recognizeImage(image: File | Blob | HTMLCanvasElement, onProgress?: (p: OcrProgress) => void): Promise<string> {
  const worker = await getWorker()
  currentOnProgress = onProgress ?? null
  try {
    const { data } = await worker.recognize(image)
    return data.text ?? ''
  } finally {
    currentOnProgress = null
  }
}

/** Giải phóng worker (gọi khi đóng panel OCR để nhả bộ nhớ, tuỳ chọn) */
export async function terminateOcrEngine(): Promise<void> {
  if (!workerPromise) return
  const w = await workerPromise
  workerPromise = null
  await w.terminate()
}
