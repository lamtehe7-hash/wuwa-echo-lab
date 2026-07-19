import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { Echo, EchoCost, LocMessage, MainStatKey, Substat } from '../types'
import { MAINSTATS, MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID, SONATA_SETS } from '../data/sonata'
import { echoDisplayName } from '../data/echoIndex'
import { MAX_SUBSTATS } from '../data/substats'
import { recognizeImageWithBoxes, terminateOcrEngine, type OcrProgress } from '../ocr/engine'
import { parseEchoText, recoverDraft, type EchoDraft } from '../ocr/parse'
import { fileToPreprocessedCanvas, normalizeRect, type Rect } from '../ocr/preprocess'
import { detectSetFromCanvas } from '../ocr/seticon'
import {
  captureFrame,
  frameSharpness,
  frameTimestamps,
  loadVideo,
  MAX_FRAMES,
  mergeDrafts,
  pickSharpestPerWindow,
  releaseVideo,
  seekFrame,
  SHARP_OVERSAMPLE,
  type FrameSharpness,
} from '../ocr/video'
import { newId } from '../store'
import { useT, useTMessage } from '../i18n'
import EchoCard from './EchoCard'
import EchoFields, { type EchoFieldsValue } from './EchoFields'
import { IconImage } from './icons'
import { useToast } from './Toast'

// Import từ ảnh/video (beta): OCR client-side bằng tesseract.js, passive-only — user tự
// chụp/quay màn hình rồi tải lên, tool không tự động hoá hay tương tác với game. Mỗi echo
// nhận diện được ra 1 form nháp để user xác nhận/sửa TAY (set, tên, từng dòng substat)
// trước khi lưu vào kho (không tự thêm thẳng, vì OCR có thể sai).

interface Props {
  onAdd: (echo: Echo) => void
}

interface DraftItem {
  id: string
  fileName: string
  name: string
  cost: EchoCost
  set: string
  rarity: 3 | 4 | 5
  level: number
  mainStat: MainStatKey
  substats: Substat[]
  warnings: LocMessage[]
  confidence: number
  added: boolean
  /** Set/cost lấy được từ OCR (hoặc user đã sửa tay) — điều kiện của nút "lưu echo 100%" */
  setDetected: boolean
  costDetected: boolean
  /** Đang mở dạng form sửa (mặc định card; tự mở form khi kết quả đọc quá kém) */
  editing: boolean
}

/** Echo "100%": OCR đọc trọn vẹn — confidence 1.0 (đủ main + 5 sub, không cảnh báo) và tên/set/cost đều có */
function isComplete(item: DraftItem): boolean {
  return item.confidence >= 0.999 && item.warnings.length === 0 &&
    item.setDetected && item.costDetected && item.name.trim() !== ''
}

/** Đoán cost hợp lý từ main stat nhận diện được (main stat chỉ tồn tại ở một số cost nhất định) */
function guessCost(mainStat: MainStatKey): EchoCost {
  for (const c of [4, 3, 1] as EchoCost[]) {
    if (MAINSTATS[c].some((m) => m.key === mainStat)) return c
  }
  return 3
}

function draftToItem(fileName: string, draft: ReturnType<typeof parseEchoText>): DraftItem {
  // Cost đọc từ dòng "COST n" là tín hiệu chính (guessCost trả 4 cho ATK%/HP%/DEF% vì các stat
  // này tồn tại ở mọi cost); chỉ rơi về guessCost khi thiếu dòng COST hoặc main stat mâu thuẫn
  // với cost đọc được (một trong hai misread → tin main stat để select main không bị trống).
  const costCompatible =
    draft.cost !== undefined &&
    (!draft.mainStat || MAINSTATS[draft.cost].some((m) => m.key === draft.mainStat))
  const cost: EchoCost = costCompatible
    ? draft.cost!
    : draft.mainStat ? guessCost(draft.mainStat) : 3
  const mainStat = draft.mainStat ?? MAINSTATS[cost][0].key
  return {
    id: newId(),
    fileName,
    name: draft.name ?? '',
    cost,
    set: draft.set ?? SONATA_SETS[0].id,
    rarity: 5,
    level: draft.level ?? 25,
    mainStat,
    substats: draft.substats.slice(0, MAX_SUBSTATS[5]),
    warnings: draft.warnings,
    confidence: draft.confidence,
    added: false,
    setDetected: draft.set !== undefined,
    costDetected: costCompatible,
    editing: draft.confidence < 0.4,
  }
}

export default function OcrImport({ onAdd }: Props) {
  const t = useT()
  const push = useToast()
  const [mode, setMode] = useState<'image' | 'video'>('image')
  const [preprocessOn, setPreprocessOn] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  /** Đếm dragenter/leave lồng nhau (leave bắn khi rê qua phần tử con) — 0 mới thật sự rời panel */
  const dragDepth = useRef(0)
  const [results, setResults] = useState<DraftItem[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ file: string; index: number; total: number; p: OcrProgress } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // ---- image mode: khoanh vùng panel (như video) để OCR chính xác trên ảnh full màn hình ----
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [imgCrop, setImgCrop] = useState<Rect | null>(null)
  // ---- video mode ----
  const [video, setVideo] = useState<{ el: HTMLVideoElement; name: string } | null>(null)
  const [crop, setCrop] = useState<Rect | null>(null)
  const [stepSec, setStepSec] = useState(0.5)
  const [videoSummary, setVideoSummary] = useState<{ added: number; skipped: number } | null>(null)
  const cancelRef = useRef(false)
  const mountedRef = useRef(true)
  /** Token chống race: chọn video mới trong lúc video cũ còn đang load → bỏ kết quả load cũ */
  const pickTokenRef = useRef(0)

  // Đóng panel → nhả worker tesseract (WASM chiếm bộ nhớ đáng kể; lần mở sau khởi tạo lại lười).
  // mountedRef để vòng lặp OCR đang chạy DỪNG lại thay vì tạo worker mới mồ côi sau unmount.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      void terminateOcrEngine()
    }
  }, [])
  // Đổi/đóng video → nhả objectURL của video cũ
  useEffect(() => () => { if (video) releaseVideo(video.el) }, [video])
  // Ảnh đầu hàng chờ → nạp vào <img> để chọn vùng crop (mode ảnh). Crop áp cho CẢ hàng chờ
  // (thường cùng độ phân giải/bố cục game); reset khi hết ảnh.
  useEffect(() => {
    if (mode !== 'image' || files.length === 0) {
      setImgEl(null)
      return
    }
    const url = URL.createObjectURL(files[0])
    const img = new Image()
    img.onload = () => setImgEl(img)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [files, mode])

  /** Gom ảnh từ input/paste/drop vào hàng chờ (cộng dồn, không thay thế — cho phép trộn 3 nguồn) */
  const addImages = (list: FileList | File[]) => {
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'))
    if (imgs.length === 0) return
    setMode('image')
    setFiles((prev) => [...prev, ...imgs])
  }

  // Ctrl+V dán ảnh clipboard (Win+Shift+S → dán thẳng, khỏi lưu file) — chỉ khi panel đang mở
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files.length) addImages(e.clipboardData.files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addImages chỉ dùng setter ổn định
  }, [])

  const runOcr = async () => {
    if (files.length === 0 || running) return
    setRunning(true)
    cancelRef.current = false
    // Crop lấy toạ độ PIXEL từ ảnh đầu hàng chờ — ảnh khác độ phân giải sẽ bị cắt sai vùng
    // (review 19/07). Không đoán lại vùng; ghi nhớ kích thước tham chiếu để cảnh báo rõ trên card.
    const refDims = imgCrop && imgEl ? { w: imgEl.naturalWidth, h: imgEl.naturalHeight } : null
    const queue = files
    setFiles([])
    if (inputRef.current) inputRef.current.value = ''
    for (let i = 0; i < queue.length; i++) {
      if (!mountedRef.current) return // panel đã đóng — đừng OCR tiếp / tạo lại worker
      if (cancelRef.current) break // user bấm Dừng — ngừng phần ảnh còn lại, giữ kết quả đã đọc
      const file = queue[i]
      setProgress({ file: file.name, index: i, total: queue.length, p: { status: t('ocr.starting'), progress: 0 } })
      try {
        const onP = (p: OcrProgress) => setProgress({ file: file.name, index: i, total: queue.length, p })
        // Luôn qua canvas (crop + word-box): crop áp vùng panel user chọn; word-box cho phép
        // nhận set-từ-icon KỂ CẢ khi tắt binarize (trước đây nhánh else mất word-box → mất set).
        const cropOpt = imgCrop ?? undefined
        // Ảnh lệch kích thước so với ảnh chọn crop → vùng cắt trỏ sai chỗ, OCR ra rác không rõ lý do
        let cropMismatch = false
        if (cropOpt && refDims) {
          try {
            const bmp = await createImageBitmap(file)
            cropMismatch = bmp.width !== refDims.w || bmp.height !== refDims.h
            bmp.close()
          } catch { /* không đọc được kích thước → bỏ qua check, OCR vẫn chạy */ }
        }
        const ocrCanvas = await fileToPreprocessedCanvas(file, { crop: cropOpt, scale: 'auto', binarize: preprocessOn })
        const { text, words } = await recognizeImageWithBoxes(ocrCanvas, onP)
        let draft: EchoDraft = parseEchoText(text)
        if (!draft.set) {
          const colorCanvas = preprocessOn
            ? await fileToPreprocessedCanvas(file, { crop: cropOpt, scale: 'auto', binarize: false })
            : ocrCanvas
          const match = detectSetFromCanvas(colorCanvas, words, draft.setCandidates)
          if (match) draft = { ...draft, set: match.setId }
        }
        let finalDraft = recoverDraft(draft)
        if (cropMismatch) finalDraft = { ...finalDraft, warnings: [...finalDraft.warnings, { key: 'ocr.cropMismatch' }] }
        setResults((prev) => [...prev, draftToItem(file.name, finalDraft)])
      } catch (err) {
        setResults((prev) => [
          ...prev,
          {
            ...draftToItem(file.name, { mainStat: undefined, substats: [], warnings: [{ key: 'ocr.error', params: { msg: (err as Error).message } }], confidence: 0 }),
          },
        ])
      }
    }
    setProgress(null)
    setRunning(false)
  }

  const pickVideo = async (file: File) => {
    const token = ++pickTokenRef.current
    setVideoSummary(null)
    setCrop(null)
    try {
      const el = await loadVideo(file)
      if (token !== pickTokenRef.current) {
        releaseVideo(el) // user đã chọn video khác trong lúc video này còn đang load
        return
      }
      await seekFrame(el, Math.min(0.1, el.duration / 2))
      if (token !== pickTokenRef.current) {
        releaseVideo(el)
        return
      }
      setVideo({ el, name: file.name })
    } catch {
      if (token !== pickTokenRef.current) return
      setVideo(null)
      push(t('ocr.videoLoadError'), { kind: 'error' })
    }
  }

  const runVideoOcr = async () => {
    if (!video || running) return
    setRunning(true)
    setVideoSummary(null)
    cancelRef.current = false
    // Pass 1 (rẻ, KHÔNG OCR): lấy mẫu dày gấp SHARP_OVERSAMPLE, đo độ nét vùng crop từng frame
    // → mỗi cửa sổ stepSec chỉ OCR frame NÉT nhất (loại frame trúng lúc cuộn/chuyển cảnh —
    // nguồn chính của substat thiếu + icon set nhoè trên video quay nhanh).
    const rawTimes = frameTimestamps(video.el.duration, stepSec / SHARP_OVERSAMPLE, MAX_FRAMES * SHARP_OVERSAMPLE)
    const cands: FrameSharpness[] = []
    for (let i = 0; i < rawTimes.length; i++) {
      if (cancelRef.current || !mountedRef.current) break
      try {
        await seekFrame(video.el, rawTimes[i])
        cands.push({ time: rawTimes[i], sharpness: frameSharpness(video.el, crop ?? undefined) })
      } catch {
        // frame lỗi seek → bỏ qua ứng viên này
      }
      if (i % 10 === 0) {
        setProgress({ file: video.name, index: i, total: rawTimes.length, p: { status: t('ocr.sharpScan'), progress: (i + 1) / rawTimes.length } })
      }
    }
    // Pass 2: OCR như cũ trên các frame đã chọn (fallback nhịp thưa cũ nếu pass 1 không đo được gì)
    const times = cands.length > 0 ? pickSharpestPerWindow(cands, stepSec) : frameTimestamps(video.el.duration, stepSec)
    const drafts: EchoDraft[] = []
    let scanned = 0
    for (let i = 0; i < times.length; i++) {
      if (cancelRef.current || !mountedRef.current) break
      const label = `${video.name} — ${i + 1}/${times.length}`
      try {
        await seekFrame(video.el, times[i])
        const ocrCanvas = captureFrame(video.el, { crop: crop ?? undefined, scale: 'auto', binarize: preprocessOn })
        const { text, words } = await recognizeImageWithBoxes(ocrCanvas, (p) => setProgress({ file: label, index: i, total: times.length, p }))
        let draft = parseEchoText(text)
        // Set chưa nhận được từ text → thử icon tròn cạnh "+25" trên frame MÀU (trước binarize)
        if (!draft.set) {
          const colorCanvas = preprocessOn
            ? captureFrame(video.el, { crop: crop ?? undefined, scale: 'auto', binarize: false })
            : ocrCanvas
          const match = detectSetFromCanvas(colorCanvas, words, draft.setCandidates)
          if (match) draft = { ...draft, set: match.setId }
        }
        drafts.push(draft)
      } catch {
        // frame lỗi (seek/OCR) → bỏ, vẫn tính vào scanned
      }
      scanned++
    }
    // Gộp các frame của cùng một echo (trùng tuyệt đối + bản đọc thiếu/misread main) → 1 draft tốt nhất.
    // Kết quả chỉ hiện sau khi quét xong để tránh echo ma từ frame chuyển cảnh.
    // recoverDraft SAU merge: hưởng field backfill từ mọi frame (set/cost) để cứu tên đọc dở qua DB.
    const merged = mergeDrafts(drafts)
    setResults((prev) => [
      ...prev,
      ...merged.map((m) => draftToItem(t('ocr.videoDraftLabel', { name: video.name, frames: m.frames }), recoverDraft(m.draft))),
    ])
    setProgress(null)
    setRunning(false)
    setVideoSummary({ added: merged.length, skipped: scanned - merged.length })
  }

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setResults((prev) => prev.map((r) => {
      if (r.id !== id) return r
      const next = { ...r, ...patch }
      // User sửa tay set/cost = đã xác nhận → đủ điều kiện cho nút "lưu echo 100%"
      if ('set' in patch) next.setDetected = true
      if ('cost' in patch) next.costDetected = true
      return next
    }))
  }

  const addToInventory = (item: DraftItem) => {
    onAdd({
      id: newId(),
      name: item.name.trim() || undefined,
      cost: item.cost,
      set: item.set,
      rarity: item.rarity,
      level: item.level,
      mainStat: item.mainStat,
      substats: item.substats,
    })
    updateItem(item.id, { added: true })
  }

  const pending = results.filter((r) => !r.added)
  const saved = results.filter((r) => r.added)
  const complete = pending.filter(isComplete)

  return (
    <div
      className={`space-y-3 rounded-lg border p-3 transition-colors ${dragOver ? 'border-sky-500 bg-sky-950/30' : 'border-slate-800 bg-slate-900'}`}
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        dragDepth.current++
        setDragOver(true)
      }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault() }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragOver(false)
        addImages(e.dataTransfer.files)
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          {/* I2 bản P2: "beta" thu thành chip; yêu cầu ảnh chi tiết gập Ở KHU CHỌN ẢNH — 1 điểm mở
              duy nhất (góp ý designer). Giữ nguyên cụm "Import từ ảnh" (hợp đồng e2e). */}
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-300">
            <IconImage size={15} className="text-sky-400" />
            {t('ocr.title')}
            <span className="rounded border border-amber-500/40 px-1.5 text-[10px] font-normal text-amber-400">beta</span>
          </div>
          <div className="flex gap-1 text-xs">
            {(['image', 'video'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`rounded px-2 py-0.5 ${mode === m ? 'bg-sky-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                onClick={() => setMode(m)}
              >{t(m === 'image' ? 'ocr.modeImage' : 'ocr.modeVideo')}</button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <input type="checkbox" checked={preprocessOn} onChange={(e) => setPreprocessOn(e.target.checked)} />
        {t('ocr.preprocessToggle')}
      </label>

      {mode === 'image' && (
        <div className="space-y-1.5">
          {/* I1 (ui-redesign): dropzone viền đứt làm MẶT TIỀN — kéo-thả / Ctrl+V / bấm chọn gộp 1
              vùng; input native ẩn (logic paste + drop đã có sẵn ở panel). role=button + Enter/Space
              cho bàn phím; sáng viền sky khi đang kéo file vào panel. */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addImages(e.target.files ?? [])
              e.target.value = '' // cộng dồn vào hàng chờ — số lượng hiện ở dòng dưới, không dựa vào label của input
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label={t('ocr.dropTitle')}
            className={`flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-3 py-6 text-center text-xs ${
              dragOver ? 'border-sky-500 bg-sky-950/30' : 'border-slate-700 bg-slate-900/40 hover:border-sky-600 hover:bg-slate-900/70'
            }`}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
          >
            <IconImage size={22} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-300">{t('ocr.dropTitle')}</span>
            <span className="text-slate-400">{t('ocr.dropHint')}</span>
            <span className="text-slate-500">{t('ocr.dropBest')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {running ? (
              <button
                type="button"
                className="rounded bg-rose-700 px-3 py-1 text-xs font-semibold hover:bg-rose-600"
                onClick={() => { cancelRef.current = true }}
              >
                {t('ocr.cancel')}
              </button>
            ) : (
              <button
                type="button"
                className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={files.length === 0}
                onClick={() => void runOcr()}
              >
                {t('ocr.run', { n: files.length })}
              </button>
            )}
          </div>
          {files.length > 0 && (
            <p className="text-xs text-slate-400">
              {t('ocr.filesSelected', { n: files.length })}{' '}
              <button type="button" className="text-slate-500 underline hover:text-rose-400" onClick={() => setFiles([])}>
                ({t('ocr.clearFiles')})
              </button>
            </p>
          )}
          {imgEl && !running && (
            <div className="space-y-1">
              <p className="text-xs text-amber-500/90">{t('ocr.imageCropHint')}</p>
              <CropSelector source={imgEl} srcW={imgEl.naturalWidth} srcH={imgEl.naturalHeight} crop={imgCrop} onCrop={setImgCrop} />
              {imgCrop && (
                <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800" onClick={() => setImgCrop(null)}>
                  {t('ocr.videoCropClear')}
                </button>
              )}
            </div>
          )}
          {/* I2 bản P2: yêu cầu ảnh đầy đủ gập 1 chỗ duy nhất (pasteHint cũ đã nằm trong dropzone) */}
          <details>
            <summary className="cursor-pointer text-xs text-slate-500">{t('ocr.reqTitle')}</summary>
            <p className="mt-1 max-w-prose text-xs text-slate-500">{t('ocr.helpDetail')}</p>
          </details>
        </div>
      )}

      {mode === 'video' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{t('ocr.videoHelp')}</p>
          <input
            type="file"
            accept="video/*"
            className="text-xs text-slate-400"
            disabled={running}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void pickVideo(f)
              e.target.value = ''
            }}
          />
          {video && (
            <>
              <p className="text-xs text-slate-500">{t('ocr.videoCropHint')}</p>
              <CropSelector source={video.el} srcW={video.el.videoWidth} srcH={video.el.videoHeight} crop={crop} onCrop={setCrop} />
              <div className="flex flex-wrap items-center gap-2">
                {crop && (
                  <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800" onClick={() => setCrop(null)}>
                    {t('ocr.videoCropClear')}
                  </button>
                )}
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  {t('ocr.videoStep')}
                  <input
                    type="number" min={0.2} max={10} step={0.2}
                    className="w-16 rounded border border-slate-700 bg-slate-800 px-1 py-0.5"
                    value={stepSec}
                    onChange={(e) => setStepSec(Math.max(0.2, Number(e.target.value) || 0.5))}
                  />
                </label>
                {running ? (
                  <button type="button" className="rounded bg-rose-700 px-3 py-1 text-xs font-semibold hover:bg-rose-600" onClick={() => { cancelRef.current = true }}>
                    {t('ocr.cancel')}
                  </button>
                ) : (
                  <button type="button" className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold hover:bg-sky-500" onClick={() => void runVideoOcr()}>
                    {t('ocr.videoRun', { n: frameTimestamps(video.el.duration, stepSec).length })}
                  </button>
                )}
              </div>
            </>
          )}
          {videoSummary && (
            <p className="text-xs text-emerald-400">{t('ocr.videoSummary', { added: videoSummary.added, skipped: videoSummary.skipped })}</p>
          )}
        </div>
      )}

      {progress && (
        <div className="space-y-1">
          <div className="text-xs text-slate-400">
            {t('ocr.processing', {
              i: progress.index + 1,
              total: progress.total,
              file: progress.file,
              status: progress.p.status,
              pct: Math.round(progress.p.progress * 100),
            })}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-sky-500 transition-all" style={{ width: `${Math.round(((progress.index + progress.p.progress) / progress.total) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Toolbar lưu hàng loạt — hiện khi có draft chờ xác nhận */}
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-slate-800 bg-slate-950/60 p-2">
          <span className="text-xs text-slate-400">{t('ocr.pendingCount', { n: pending.length })}</span>
          <span className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={complete.length === 0}
              title={t('ocr.saveCompleteTip')}
              onClick={() => {
                complete.forEach(addToInventory)
                push(t('toast.savedBatch', { n: complete.length }))
              }}
            >{t('ocr.saveComplete', { n: complete.length })}</button>
            <button
              type="button"
              className="rounded border border-emerald-700 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/60"
              onClick={() => {
                pending.forEach(addToInventory)
                push(t('toast.savedBatch', { n: pending.length }))
              }}
            >{t('ocr.saveAll', { n: pending.length })}</button>
          </span>
        </div>
      )}

      <div className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
        {pending.map((item) => (
          <DraftForm
            key={item.id}
            item={item}
            complete={isComplete(item)}
            onChange={(patch) => updateItem(item.id, patch)}
            onAdd={() => addToInventory(item)}
            onRemove={() => setResults((prev) => prev.filter((r) => r.id !== item.id))}
          />
        ))}
      </div>

      {/* Echo đã lưu: thu về dải chip gọn (bấm mở xem lại) — không chiếm chỗ trong lưới nữa */}
      {saved.length > 0 && (
        <details className="rounded border border-emerald-900/50 bg-emerald-950/10">
          <summary className="cursor-pointer select-none px-2 py-1.5 text-xs font-medium text-emerald-400">
            {t('ocr.savedSection', { n: saved.length })}
          </summary>
          <div className="flex flex-wrap items-center gap-1.5 p-2 pt-1">
            {saved.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-800/50 bg-emerald-950/40 px-2 py-0.5 text-xs text-slate-300"
                title={`${s.name.trim() || SONATA_BY_ID[s.set]?.name} · cost ${s.cost} · ${MAINSTAT_LABELS[s.mainStat]} · +${s.level}`}
              >
                ✓ {echoDisplayName(s)}
                <span className="text-slate-500">◆{s.cost}</span>
              </span>
            ))}
            <button
              type="button"
              className="ml-1 text-xs text-slate-500 hover:text-rose-400"
              onClick={() => setResults((prev) => prev.filter((r) => !r.added))}
            >{t('ocr.clearSaved')}</button>
          </div>
        </details>
      )}
    </div>
  )
}

/** Khoanh vùng panel echo bằng tay trên frame video HOẶC ảnh (kéo chuột). Toạ độ lưu theo pixel gốc. */
function CropSelector({ source, srcW, srcH, crop, onCrop }: { source: CanvasImageSource; srcW: number; srcH: number; crop: Rect | null; onCrop: (r: Rect | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<Rect | null>(null)

  const rect = preview ?? crop

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    if (rect) {
      // Làm mờ ngoài vùng chọn (4 dải) + viền sáng
      ctx.fillStyle = 'rgba(2,6,23,0.55)'
      ctx.fillRect(0, 0, canvas.width, rect.y)
      ctx.fillRect(0, rect.y + rect.h, canvas.width, canvas.height - rect.y - rect.h)
      ctx.fillRect(0, rect.y, rect.x, rect.h)
      ctx.fillRect(rect.x + rect.w, rect.y, canvas.width - rect.x - rect.w, rect.h)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = Math.max(2, canvas.width / 500)
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
    }
  })

  const toVideoCoords = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const box = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / box.width) * canvas.width,
      y: ((e.clientY - box.top) / box.height) * canvas.height,
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={srcW}
      height={srcH}
      className="w-full max-w-2xl cursor-crosshair rounded border border-slate-700"
      onMouseDown={(e) => { dragStart.current = toVideoCoords(e) }}
      onMouseMove={(e) => {
        if (!dragStart.current) return
        const p = toVideoCoords(e)
        setPreview(normalizeRect(dragStart.current.x, dragStart.current.y, p.x, p.y, srcW, srcH))
      }}
      onMouseUp={(e) => {
        if (!dragStart.current) return
        const p = toVideoCoords(e)
        const r = normalizeRect(dragStart.current.x, dragStart.current.y, p.x, p.y, srcW, srcH)
        dragStart.current = null
        setPreview(null)
        // Vùng quá nhỏ = click nhầm → coi như bỏ chọn
        onCrop(r.w >= 20 && r.h >= 20 ? r : null)
      }}
      onMouseLeave={() => {
        dragStart.current = null
        setPreview(null)
      }}
    />
  )
}

function DraftForm({
  item,
  complete,
  onChange,
  onAdd,
  onRemove,
}: {
  item: DraftItem
  /** Đạt chuẩn "echo 100%" (đọc trọn vẹn) — hiện badge xanh */
  complete: boolean
  onChange: (patch: Partial<DraftItem>) => void
  onAdd: () => void
  onRemove: () => void
}) {
  const t = useT()
  const tm = useTMessage()
  const confidencePct = Math.round(item.confidence * 100)
  const confColor = item.confidence >= 0.7 ? 'text-emerald-400' : item.confidence >= 0.4 ? 'text-amber-400' : 'text-rose-400'
  // Cùng shape với EchoCardData/EchoFieldsValue — card xem và form sửa dùng chung dữ liệu
  const fields: EchoFieldsValue = {
    name: item.name, cost: item.cost, set: item.set, rarity: item.rarity,
    level: item.level, mainStat: item.mainStat, substats: item.substats,
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-800/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-500" title={item.fileName}>{item.fileName}</span>
        <span className="flex shrink-0 items-center gap-2">
          {complete && (
            <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400" title={t('ocr.saveCompleteTip')}>
              ✓ {t('ocr.complete100')}
            </span>
          )}
          <span className={`text-xs font-semibold ${confColor}`}>{t('ocr.confidence', { pct: confidencePct })}</span>
          <button type="button" className="text-xs text-slate-600 hover:text-rose-400" onClick={onRemove}>{t('ocr.discard')}</button>
        </span>
      </div>

      {item.warnings.length > 0 && (
        <ul className="space-y-0.5 rounded border border-amber-800/50 bg-amber-950/20 p-1.5 text-[11px] text-amber-400/90">
          {item.warnings.map((w, i) => <li key={i}>⚠ {tm(w)}</li>)}
        </ul>
      )}

      {item.editing ? (
        <EchoFields value={fields} onChange={onChange} nameLabelKey="ocr.echoNameOptional" />
      ) : (
        <EchoCard echo={fields} />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded bg-emerald-700 py-1.5 text-sm font-semibold hover:bg-emerald-600"
          onClick={onAdd}
        >{t('ocr.add')}</button>
        <button
          type="button"
          className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50"
          onClick={() => onChange({ editing: !item.editing })}
        >{item.editing ? t('ocr.doneEdit') : t('ocr.edit')}</button>
      </div>
    </div>
  )
}
