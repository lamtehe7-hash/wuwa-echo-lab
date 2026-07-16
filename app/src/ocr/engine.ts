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

/** Hàng đợi job tuần tự: worker + progress callback là state module dùng chung — recognize chạy
 *  chồng sẽ giẫm callback của nhau; terminate xếp SAU job đang chạy nên không giết worker giữa
 *  chừng (unmount giữa lúc nhận diện — review 16/07). */
let jobChain: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = jobChain.then(job, job)
  jobChain = run.then(() => undefined, () => undefined)
  return run
}

/** Giới hạn bộ ký tự UI echo (nhãn EN + số + % + dấu câu) — bớt misread ký tự lạ (|, ·, unicode) */
const CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,%+-:/() '

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    const p = import('tesseract.js').then(async ({ createWorker }) => {
      // Tài nguyên tesseract tự phục vụ từ public/tesseract (script copy-tesseract-assets.mjs
      // + lang commit sẵn) — app chạy OFFLINE hoàn toàn, không gọi CDN jsdelivr. Đường dẫn
      // tương đối được tesseract resolvePaths đổi thành tuyệt đối theo location.href
      // (blob-worker importScripts cần URL tuyệt đối).
      const assetBase = `${import.meta.env.BASE_URL}tesseract/`
      const w = await createWorker('eng', undefined, {
        workerPath: `${assetBase}worker.min.js`,
        corePath: `${assetBase}core`,
        langPath: `${assetBase}lang`,
        logger: (m) => currentOnProgress?.({ status: m.status, progress: m.progress }),
      })
      await w.setParameters({ tessedit_char_whitelist: CHAR_WHITELIST })
      return w
    })
    workerPromise = p
    // Khởi tạo fail (mạng chập chờn khi tải WASM) → xoá cache để lần OCR sau thử lại,
    // đừng cache promise rejected vĩnh viễn (mọi lần sau đều lỗi cho tới khi reload trang)
    p.catch(() => {
      if (workerPromise === p) workerPromise = null
    })
  }
  return workerPromise
}

/** OCR 1 ảnh (file hoặc canvas đã tiền xử lý) -> text thô. Worker tái sử dụng (khởi tạo lười). */
export function recognizeImage(image: File | Blob | HTMLCanvasElement, onProgress?: (p: OcrProgress) => void): Promise<string> {
  return enqueue(async () => {
    const worker = await getWorker()
    currentOnProgress = onProgress ?? null
    try {
      const { data } = await worker.recognize(image)
      return data.text ?? ''
    } finally {
      currentOnProgress = null
    }
  })
}

export interface OcrWord {
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

/** OCR kèm bbox từng từ (toạ độ pixel của ảnh đưa vào) — dùng định vị icon set cạnh "+25" */
export function recognizeImageWithBoxes(
  image: File | Blob | HTMLCanvasElement,
  onProgress?: (p: OcrProgress) => void,
): Promise<{ text: string; words: OcrWord[] }> {
  return enqueue(async () => {
    const worker = await getWorker()
    currentOnProgress = onProgress ?? null
    try {
      const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
      const words: OcrWord[] = []
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            for (const w of line.words) words.push({ text: w.text, bbox: w.bbox })
          }
        }
      }
      return { text: data.text ?? '', words }
    } finally {
      currentOnProgress = null
    }
  })
}

/** Giải phóng worker (gọi khi đóng panel OCR để nhả bộ nhớ, tuỳ chọn).
 *  Xếp hàng sau job đang chạy — không giết worker giữa lúc nhận diện. */
export function terminateOcrEngine(): Promise<void> {
  return enqueue(async () => {
    if (!workerPromise) return
    const p = workerPromise
    workerPromise = null // reset TRƯỚC await — promise rejected vẫn phải xoá được cache
    try {
      const w = await p
      await w.terminate()
    } catch {
      // worker chưa từng khởi tạo thành công — không có gì để terminate
    }
  })
}
