import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Echo, EchoCost, LocMessage, MainStatKey, Substat, SubstatKey } from '../types'
import { MAINSTATS } from '../data/mainstats'
import { SONATA_SETS } from '../data/sonata'
import { MAX_SUBSTATS, SUBSTATS, SUBSTAT_KEYS } from '../data/substats'
import { recognizeImage, terminateOcrEngine, type OcrProgress } from '../ocr/engine'
import { parseEchoText, type EchoDraft } from '../ocr/parse'
import { fileToPreprocessedCanvas, normalizeRect, type Rect } from '../ocr/preprocess'
import { captureFrame, frameTimestamps, loadVideo, mergeDrafts, releaseVideo, seekFrame } from '../ocr/video'
import { newId } from '../store'
import { useT, useTMessage } from '../i18n'

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
}

/** Đoán cost hợp lý từ main stat nhận diện được (main stat chỉ tồn tại ở một số cost nhất định) */
function guessCost(mainStat: MainStatKey): EchoCost {
  for (const c of [4, 3, 1] as EchoCost[]) {
    if (MAINSTATS[c].some((m) => m.key === mainStat)) return c
  }
  return 3
}

function draftToItem(fileName: string, draft: ReturnType<typeof parseEchoText>): DraftItem {
  const cost: EchoCost = draft.mainStat ? guessCost(draft.mainStat) : 3
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
  }
}

export default function OcrImport({ onAdd }: Props) {
  const t = useT()
  const [mode, setMode] = useState<'image' | 'video'>('image')
  const [preprocessOn, setPreprocessOn] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<DraftItem[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ file: string; index: number; total: number; p: OcrProgress } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // ---- video mode ----
  const [video, setVideo] = useState<{ el: HTMLVideoElement; name: string } | null>(null)
  const [crop, setCrop] = useState<Rect | null>(null)
  const [stepSec, setStepSec] = useState(0.5)
  const [videoSummary, setVideoSummary] = useState<{ added: number; skipped: number } | null>(null)
  const cancelRef = useRef(false)

  // Đóng panel → nhả worker tesseract (WASM chiếm bộ nhớ đáng kể; lần mở sau khởi tạo lại lười)
  useEffect(() => () => { void terminateOcrEngine() }, [])
  // Đổi/đóng video → nhả objectURL của video cũ
  useEffect(() => () => { if (video) releaseVideo(video.el) }, [video])

  const sel = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full'

  const runOcr = async () => {
    if (files.length === 0 || running) return
    setRunning(true)
    const queue = files
    setFiles([])
    if (inputRef.current) inputRef.current.value = ''
    for (let i = 0; i < queue.length; i++) {
      const file = queue[i]
      setProgress({ file: file.name, index: i, total: queue.length, p: { status: t('ocr.starting'), progress: 0 } })
      try {
        const src = preprocessOn ? await fileToPreprocessedCanvas(file, { scale: 'auto' }) : file
        const text = await recognizeImage(src, (p) => setProgress({ file: file.name, index: i, total: queue.length, p }))
        const draft = parseEchoText(text)
        setResults((prev) => [...prev, draftToItem(file.name, draft)])
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
    setVideoSummary(null)
    setCrop(null)
    try {
      const el = await loadVideo(file)
      await seekFrame(el, Math.min(0.1, el.duration / 2))
      setVideo({ el, name: file.name })
    } catch {
      setVideo(null)
      alert(t('ocr.videoLoadError'))
    }
  }

  const runVideoOcr = async () => {
    if (!video || running) return
    setRunning(true)
    setVideoSummary(null)
    cancelRef.current = false
    const times = frameTimestamps(video.el.duration, stepSec)
    const drafts: EchoDraft[] = []
    let scanned = 0
    for (let i = 0; i < times.length; i++) {
      if (cancelRef.current) break
      const label = `${video.name} — ${i + 1}/${times.length}`
      try {
        await seekFrame(video.el, times[i])
        const canvas = captureFrame(video.el, { crop: crop ?? undefined, scale: 'auto', binarize: preprocessOn })
        const text = await recognizeImage(canvas, (p) => setProgress({ file: label, index: i, total: times.length, p }))
        drafts.push(parseEchoText(text))
      } catch {
        // frame lỗi (seek/OCR) → bỏ, vẫn tính vào scanned
      }
      scanned++
    }
    // Gộp các frame của cùng một echo (trùng tuyệt đối + bản đọc thiếu/misread main) → 1 draft tốt nhất.
    // Kết quả chỉ hiện sau khi quét xong để tránh echo ma từ frame chuyển cảnh.
    const merged = mergeDrafts(drafts)
    setResults((prev) => [
      ...prev,
      ...merged.map((m) => draftToItem(t('ocr.videoDraftLabel', { name: video.name, frames: m.frames }), m.draft)),
    ])
    setProgress(null)
    setRunning(false)
    setVideoSummary({ added: merged.length, skipped: scanned - merged.length })
  }

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
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

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-300">{t('ocr.title')}</div>
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
        <p className="text-xs text-amber-500/90">{t('ocr.help')}</p>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        <input type="checkbox" checked={preprocessOn} onChange={(e) => setPreprocessOn(e.target.checked)} />
        {t('ocr.preprocessToggle')}
      </label>

      {mode === 'image' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="text-xs text-slate-400"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          <button
            type="button"
            className="rounded bg-sky-600 px-3 py-1 text-xs font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={files.length === 0 || running}
            onClick={() => void runOcr()}
          >
            {t('ocr.run', { n: files.length })}
          </button>
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
              <CropSelector video={video.el} crop={crop} onCrop={setCrop} />
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

      <div className="grid items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
        {results.map((item) => (
          <DraftForm
            key={item.id}
            item={item}
            sel={sel}
            onChange={(patch) => updateItem(item.id, patch)}
            onAdd={() => addToInventory(item)}
            onRemove={() => setResults((prev) => prev.filter((r) => r.id !== item.id))}
          />
        ))}
      </div>
    </div>
  )
}

/** Khoanh vùng panel echo bằng tay trên frame video (kéo chuột). Toạ độ lưu theo pixel video gốc. */
function CropSelector({ video, crop, onCrop }: { video: HTMLVideoElement; crop: Rect | null; onCrop: (r: Rect | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [preview, setPreview] = useState<Rect | null>(null)

  const rect = preview ?? crop

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
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
      width={video.videoWidth}
      height={video.videoHeight}
      className="w-full max-w-2xl cursor-crosshair rounded border border-slate-700"
      onMouseDown={(e) => { dragStart.current = toVideoCoords(e) }}
      onMouseMove={(e) => {
        if (!dragStart.current) return
        const p = toVideoCoords(e)
        setPreview(normalizeRect(dragStart.current.x, dragStart.current.y, p.x, p.y, video.videoWidth, video.videoHeight))
      }}
      onMouseUp={(e) => {
        if (!dragStart.current) return
        const p = toVideoCoords(e)
        const r = normalizeRect(dragStart.current.x, dragStart.current.y, p.x, p.y, video.videoWidth, video.videoHeight)
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
  sel,
  onChange,
  onAdd,
  onRemove,
}: {
  item: DraftItem
  sel: string
  onChange: (patch: Partial<DraftItem>) => void
  onAdd: () => void
  onRemove: () => void
}) {
  const t = useT()
  const tm = useTMessage()
  const maxSubs = MAX_SUBSTATS[item.rarity] ?? 5
  const usedStats = useMemo(() => new Set(item.substats.map((s) => s.stat)), [item.substats])

  const changeCost = (c: EchoCost) => {
    const stillValid = MAINSTATS[c].some((m) => m.key === item.mainStat)
    onChange({ cost: c, mainStat: stillValid ? item.mainStat : MAINSTATS[c][0].key })
  }

  const addSub = () => {
    if (item.substats.length >= maxSubs) return
    const free = SUBSTAT_KEYS.find((k) => !usedStats.has(k)) ?? 'critRate'
    onChange({ substats: [...item.substats, { stat: free, value: SUBSTATS[free].rolls[0] }] })
  }

  const setSub = (i: number, patch: Partial<Substat>) => {
    const next = [...item.substats]
    next[i] = { ...next[i], ...patch }
    onChange({ substats: next })
  }

  const removeSub = (i: number) => onChange({ substats: item.substats.filter((_, j) => j !== i) })

  const confidencePct = Math.round(item.confidence * 100)
  const confColor = item.confidence >= 0.7 ? 'text-emerald-400' : item.confidence >= 0.4 ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className={`space-y-2 rounded border p-2 ${item.added ? 'border-emerald-700/50 bg-emerald-950/20' : 'border-slate-700 bg-slate-800/40'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-400" title={item.fileName}>{item.fileName}</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${confColor}`}>{t('ocr.confidence', { pct: confidencePct })}</span>
          <button type="button" className="text-xs text-slate-600 hover:text-rose-400" onClick={onRemove}>{t('ocr.discard')}</button>
        </span>
      </div>

      {item.warnings.length > 0 && (
        <ul className="space-y-0.5 rounded border border-amber-800/50 bg-amber-950/20 p-1.5 text-[11px] text-amber-400/90">
          {item.warnings.map((w, i) => <li key={i}>⚠ {tm(w)}</li>)}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.sonataSet')}</span>
          <select className={sel} value={item.set} onChange={(e) => onChange({ set: e.target.value })}>
            {SONATA_SETS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('ocr.echoNameOptional')}</span>
          <input className={sel} value={item.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={t('echoForm.echoNamePlaceholder')} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.cost')}</span>
          <select className={sel} value={item.cost} onChange={(e) => changeCost(Number(e.target.value) as EchoCost)}>
            {[1, 3, 4].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.mainStat')}</span>
          <select className={sel} value={item.mainStat} onChange={(e) => onChange({ mainStat: e.target.value as MainStatKey })}>
            {MAINSTATS[item.cost].map((m) => <option key={m.key} value={m.key}>{m.label} (max {m.max}%)</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.rarity')}</span>
          <select className={sel} value={item.rarity} onChange={(e) => {
            const r = Number(e.target.value) as 3 | 4 | 5
            // Hạ rarity → cắt bớt substat vượt giới hạn slot
            onChange({ rarity: r, substats: item.substats.slice(0, MAX_SUBSTATS[r] ?? 5) })
          }}>
            {[5, 4, 3].map((r) => <option key={r} value={r}>{r}★</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.level')}</span>
          <input type="number" min={0} max={25} className={sel} value={item.level} onChange={(e) => onChange({ level: Number(e.target.value) })} />
        </label>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('echoForm.substatCount', { n: item.substats.length, max: maxSubs })}</span>
          <button type="button" className="text-xs text-sky-400 hover:text-sky-300" onClick={addSub} disabled={item.substats.length >= maxSubs}>{t('echoForm.addRow')}</button>
        </div>
        {item.substats.map((s, i) => (
          <div key={i} className="flex gap-2">
            <select
              className={sel}
              value={s.stat}
              onChange={(e) => {
                const stat = e.target.value as SubstatKey
                setSub(i, { stat, value: SUBSTATS[stat].rolls[0] })
              }}
            >
              {SUBSTAT_KEYS.filter((k) => k === s.stat || !usedStats.has(k)).map((k) => (
                <option key={k} value={k}>{SUBSTATS[k].label}</option>
              ))}
            </select>
            <select className={sel} value={s.value} onChange={(e) => setSub(i, { value: Number(e.target.value) })}>
              {SUBSTATS[s.stat].rolls.map((v) => <option key={v} value={v}>{v}{SUBSTATS[s.stat].isPct ? '%' : ''}</option>)}
            </select>
            <button type="button" className="px-2 text-xs text-rose-400 hover:text-rose-300" onClick={() => removeSub(i)}>✕</button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="w-full rounded bg-emerald-700 py-1.5 text-sm font-semibold hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={item.added}
        onClick={onAdd}
      >
        {item.added ? t('ocr.added') : t('ocr.add')}
      </button>
    </div>
  )
}
