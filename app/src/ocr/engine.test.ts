import { describe, it, expect, vi, beforeEach } from 'vitest'

// Review 19/07 backlog #6: engine.ts (worker/queue/reset) là logic race tinh vi nhưng 0 unit test —
// chỉ được benchmark tay. Test này mock tesseract.js và khoá các hợp đồng:
// 1) worker khởi tạo LƯỜI + tái sử dụng (createWorker đúng 1 lần cho N job)
// 2) job chạy TUẦN TỰ (recognize chồng nhau sẽ giẫm progress callback dùng chung)
// 3) progress callback định tuyến theo job đang chạy, reset khi job xong
// 4) terminate xếp SAU job đang chạy (không giết worker giữa lúc nhận diện) + sau đó tạo lại được
// 5) khởi tạo fail → KHÔNG cache promise rejected vĩnh viễn (lần sau thử lại)
// 6) 1 job lỗi không làm chết hàng đợi (job sau vẫn chạy)
// Môi trường vitest là Node (typeof window === 'undefined') → engine đi nhánh Node của getWorker.

const mocks = vi.hoisted(() => ({
  createWorker: vi.fn(),
}))

vi.mock('tesseract.js', () => ({ createWorker: mocks.createWorker }))

type RecognizeResult = { data: { text?: string; blocks?: unknown } }

function makeWorker() {
  return {
    setParameters: vi.fn(async () => {}),
    recognize: vi.fn(async (): Promise<RecognizeResult> => ({ data: { text: 'hello' } })),
    terminate: vi.fn(async () => {}),
  }
}

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

// Module state (workerPromise/jobChain) nằm ở mức module → mỗi test import bản tươi
async function freshEngine() {
  vi.resetModules()
  return await import('./engine')
}

const img = () => new Blob(['x']) as unknown as File

beforeEach(() => {
  mocks.createWorker.mockReset()
})

describe('ocr/engine — worker lười + tái sử dụng', () => {
  it('createWorker đúng 1 lần cho nhiều job, setParameters whitelist 1 lần', async () => {
    const w = makeWorker()
    mocks.createWorker.mockResolvedValue(w)
    const eng = await freshEngine()
    expect(mocks.createWorker).not.toHaveBeenCalled() // lười: import không khởi tạo
    expect(await eng.recognizeImage(img())).toBe('hello')
    expect(await eng.recognizeImage(img())).toBe('hello')
    expect(mocks.createWorker).toHaveBeenCalledTimes(1)
    expect(w.setParameters).toHaveBeenCalledTimes(1)
    expect(w.recognize).toHaveBeenCalledTimes(2)
  })

  it('recognize trả data.text undefined → chuỗi rỗng', async () => {
    const w = makeWorker()
    w.recognize.mockResolvedValueOnce({ data: {} })
    mocks.createWorker.mockResolvedValue(w)
    const eng = await freshEngine()
    expect(await eng.recognizeImage(img())).toBe('')
  })
})

describe('ocr/engine — hàng đợi tuần tự', () => {
  it('job B chỉ bắt đầu sau khi job A xong', async () => {
    const w = makeWorker()
    const dA = deferred<RecognizeResult>()
    const dB = deferred<RecognizeResult>()
    w.recognize.mockReturnValueOnce(dA.promise).mockReturnValueOnce(dB.promise)
    mocks.createWorker.mockResolvedValue(w)
    const eng = await freshEngine()

    const pA = eng.recognizeImage(img())
    const pB = eng.recognizeImage(img())
    await vi.waitFor(() => expect(w.recognize).toHaveBeenCalledTimes(1))
    // A còn treo → B chưa được gọi
    expect(w.recognize).toHaveBeenCalledTimes(1)

    dA.resolve({ data: { text: 'A' } })
    expect(await pA).toBe('A')
    await vi.waitFor(() => expect(w.recognize).toHaveBeenCalledTimes(2))
    dB.resolve({ data: { text: 'B' } })
    expect(await pB).toBe('B')
  })

  it('job A lỗi không làm chết hàng đợi — job B vẫn chạy', async () => {
    const w = makeWorker()
    w.recognize
      .mockRejectedValueOnce(new Error('ảnh hỏng'))
      .mockResolvedValueOnce({ data: { text: 'B' } })
    mocks.createWorker.mockResolvedValue(w)
    const eng = await freshEngine()

    const pA = eng.recognizeImage(img())
    const pB = eng.recognizeImage(img())
    await expect(pA).rejects.toThrow('ảnh hỏng')
    expect(await pB).toBe('B')
  })
})

describe('ocr/engine — progress callback', () => {
  it('logger định tuyến vào onProgress của job ĐANG chạy, reset sau finally', async () => {
    const w = makeWorker()
    const dA = deferred<RecognizeResult>()
    w.recognize.mockReturnValueOnce(dA.promise)
    let logger: ((m: { status: string; progress: number }) => void) | undefined
    mocks.createWorker.mockImplementation(async (_lang: string, _oem: unknown, opts: { logger: typeof logger }) => {
      logger = opts.logger
      return w
    })
    const eng = await freshEngine()

    const onA = vi.fn()
    const pA = eng.recognizeImage(img(), onA)
    await vi.waitFor(() => expect(w.recognize).toHaveBeenCalledTimes(1))
    logger!({ status: 'recognizing text', progress: 0.5 })
    expect(onA).toHaveBeenCalledWith({ status: 'recognizing text', progress: 0.5 })

    dA.resolve({ data: { text: 'A' } })
    await pA
    // job xong → currentOnProgress đã reset, event trễ không lọt vào job cũ
    logger!({ status: 'recognizing text', progress: 1 })
    expect(onA).toHaveBeenCalledTimes(1)
  })
})

describe('ocr/engine — terminate', () => {
  it('terminate xếp SAU job đang chạy; sau terminate job mới tạo lại worker', async () => {
    const w = makeWorker()
    const dA = deferred<RecognizeResult>()
    w.recognize.mockReturnValueOnce(dA.promise)
    mocks.createWorker.mockResolvedValue(w)
    const eng = await freshEngine()

    const pA = eng.recognizeImage(img())
    await vi.waitFor(() => expect(w.recognize).toHaveBeenCalledTimes(1))
    const pT = eng.terminateOcrEngine()
    await new Promise((r) => setTimeout(r, 10))
    expect(w.terminate).not.toHaveBeenCalled() // job A còn chạy — chưa được giết

    dA.resolve({ data: { text: 'A' } })
    expect(await pA).toBe('A')
    await pT
    expect(w.terminate).toHaveBeenCalledTimes(1)

    // worker đã nhả → job tiếp theo khởi tạo lại
    const w2 = makeWorker()
    mocks.createWorker.mockResolvedValue(w2)
    expect(await eng.recognizeImage(img())).toBe('hello')
    expect(mocks.createWorker).toHaveBeenCalledTimes(2)
    expect(w2.recognize).toHaveBeenCalledTimes(1)
  })

  it('terminate khi chưa từng có worker → resolve êm, không khởi tạo', async () => {
    const eng = await freshEngine()
    await expect(eng.terminateOcrEngine()).resolves.toBeUndefined()
    expect(mocks.createWorker).not.toHaveBeenCalled()
  })
})

describe('ocr/engine — khởi tạo fail rồi thử lại', () => {
  it('createWorker reject → job fail, nhưng cache được xoá để job sau thử lại', async () => {
    const w = makeWorker()
    mocks.createWorker
      .mockRejectedValueOnce(new Error('wasm tải fail'))
      .mockResolvedValueOnce(w)
    const eng = await freshEngine()

    await expect(eng.recognizeImage(img())).rejects.toThrow('wasm tải fail')
    await new Promise((r) => setTimeout(r, 0)) // chờ p.catch xoá cache
    expect(await eng.recognizeImage(img())).toBe('hello')
    expect(mocks.createWorker).toHaveBeenCalledTimes(2)
  })
})

describe('ocr/engine — recognizeImageWithBoxes', () => {
  it('flatten blocks→paragraphs→lines→words + truyền cờ blocks cho tesseract', async () => {
    const w = makeWorker()
    const bbox = (n: number) => ({ x0: n, y0: n + 1, x1: n + 2, y1: n + 3 })
    w.recognize.mockResolvedValueOnce({
      data: {
        text: 'Crit Rate 8.7%',
        blocks: [
          {
            paragraphs: [
              { lines: [{ words: [{ text: 'Crit', bbox: bbox(1) }, { text: 'Rate', bbox: bbox(10) }] }] },
              { lines: [{ words: [{ text: '8.7%', bbox: bbox(20) }] }] },
            ],
          },
        ],
      },
    })
    mocks.createWorker.mockResolvedValue(w)
    const eng = await freshEngine()

    const r = await eng.recognizeImageWithBoxes(img())
    expect(r.text).toBe('Crit Rate 8.7%')
    expect(r.words).toEqual([
      { text: 'Crit', bbox: bbox(1) },
      { text: 'Rate', bbox: bbox(10) },
      { text: '8.7%', bbox: bbox(20) },
    ])
    expect(w.recognize).toHaveBeenCalledWith(expect.anything(), {}, { text: true, blocks: true })
  })

  it('blocks vắng mặt (null/undefined) → words rỗng, không throw', async () => {
    const w = makeWorker()
    w.recognize.mockResolvedValueOnce({ data: { text: '', blocks: null } })
    mocks.createWorker.mockResolvedValue(w)
    const eng = await freshEngine()
    const r = await eng.recognizeImageWithBoxes(img())
    expect(r.words).toEqual([])
    expect(r.text).toBe('')
  })
})
