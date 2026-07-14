import { useEffect, useMemo, useRef, useState } from 'react'
import CharacterPicker from './components/CharacterPicker'
import EchoEditModal from './components/EchoEditModal'
import EchoForm from './components/EchoForm'
import EmptyState from './components/EmptyState'
import LoadoutView from './components/LoadoutView'
import OcrImport from './components/OcrImport'
import RankingTable from './components/RankingTable'
import RosterPanel from './components/RosterPanel'
import Stale from './components/Stale'
import { useToast } from './components/Toast'
import WeightEditor from './components/WeightEditor'
import { CHARACTERS, CHARACTER_BY_ID } from './data/characters'
import { DEMO_ECHOES } from './data/demo'
import { SONATA_BY_ID } from './data/sonata'
import { solveBest5 } from './engine/solver'
import { useLang, useT } from './i18n'
import { exportJson, importJson, mergeProfile, useEchoInventory, useOverrides } from './store'
import type { Echo, LoadoutResult } from './types'

// Điều hướng tab theo tác vụ (pattern GO/Fribbels/wuwa.build — research/ui-ux.md §3):
// Kho / Tối ưu / Đội hình / Import. Trạng thái tab + nhân vật sync vào URL hash
// (#optimize?char=changli) để F5/share giữ ngữ cảnh; replaceState để không spam history.

const TABS = ['inventory', 'optimize', 'roster', 'import'] as const
type Tab = (typeof TABS)[number]

function parseHash(): { tab: Tab; char?: string } {
  const [path, query] = window.location.hash.replace(/^#/, '').split('?')
  const tab = (TABS as readonly string[]).includes(path) ? (path as Tab) : 'inventory'
  const char = new URLSearchParams(query).get('char') ?? undefined
  return { tab, char }
}

export default function App() {
  const t = useT()
  const { lang, setLang } = useLang()
  const push = useToast()
  const { echoes, setEchoes } = useEchoInventory()
  const { overrides, setOverrides } = useOverrides()
  const initial = useRef(parseHash()).current
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [charId, setCharId] = useState(
    initial.char && CHARACTER_BY_ID[initial.char] ? initial.char : CHARACTERS[0].id,
  )
  const [loadout, setLoadout] = useState<LoadoutResult | null>(null)
  const [solved, setSolved] = useState(false)
  const [stale, setStale] = useState(false)
  const [showWeights, setShowWeights] = useState(false)
  const [editingEcho, setEditingEcho] = useState<Echo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // State → hash (không bắn hashchange nên không loop); hashchange ngược lại cho back/sửa URL tay
  useEffect(() => {
    history.replaceState(null, '', `#${tab}?char=${charId}`)
  }, [tab, charId])
  useEffect(() => {
    const onHash = () => {
      const p = parseHash()
      setTab(p.tab)
      if (p.char && CHARACTER_BY_ID[p.char]) setCharId(p.char)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Functional update để lưu HÀNG LOẠT từ OCR không mất echo (closure stale khi gọi liên tiếp)
  const addEcho = (echo: Echo) => setEchoes((prev) => [...prev, echo])

  const resolve = (id: string) => mergeProfile(CHARACTER_BY_ID[id], overrides[id])
  // useMemo giữ identity profile giữa các render — memo chấm điểm trong RankingTable mới có tác dụng
  const profile = useMemo(() => mergeProfile(CHARACTER_BY_ID[charId], overrides[charId]), [charId, overrides])

  // Kho/trọng số đổi → kết quả solve không còn khớp: GIỮ hiển thị nhưng đánh dấu cũ (mờ + nút giải lại)
  useEffect(() => {
    setStale(true)
  }, [echoes, overrides])

  const solve = () => {
    setLoadout(solveBest5(echoes, profile))
    setSolved(true)
    setStale(false)
  }

  // Xoá ngay + toast có "Hoàn tác" (thay cho confirm chặn luồng)
  const deleteEcho = (id: string) => {
    const echo = echoes.find((e) => e.id === id)
    if (!echo) return
    setEchoes((prev) => prev.filter((e) => e.id !== id))
    push(t('toast.deleted', { name: echo.name || SONATA_BY_ID[echo.set]?.name || echo.set }), {
      action: { label: t('common.undo'), fn: () => setEchoes((prev) => [...prev, echo]) },
    })
  }

  const stats = useMemo(() => {
    const byCost: Record<number, number> = { 1: 0, 3: 0, 4: 0 }
    echoes.forEach((e) => { byCost[e.cost] = (byCost[e.cost] ?? 0) + 1 })
    return byCost
  }, [echoes])
  const invCount = t('app.inventoryCount', { n: echoes.length, c4: stats[4], c3: stats[3], c1: stats[1] })

  const empty = echoes.length === 0
  const emptyState = (
    <EmptyState
      onOcr={() => setTab('import')}
      onImportJson={() => fileRef.current?.click()}
      onDemo={() => setEchoes(DEMO_ECHOES)}
    />
  )

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-100">WuWa Echo Optimizer <span className="text-xs font-normal text-slate-500">{t('app.subtitle')}</span></h1>
        <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'EN' : 'VI'}</button>
      </header>

      {/* Input file dùng chung cho nút Import JSON (tab Import) + EmptyState */}
      <input
        ref={fileRef} type="file" accept=".json" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) {
            importJson(f)
              .then(({ echoes: imported, dropped }) => {
                // Import THAY THẾ kho — hỏi trước khi ghi đè dữ liệu đang có
                if (echoes.length > 0 && !window.confirm(t('app.importConfirmReplace', { n: echoes.length }))) return
                setEchoes(imported)
                push(dropped > 0
                  ? t('toast.importedDropped', { n: imported.length, m: dropped })
                  : t('toast.imported', { n: imported.length }))
              })
              .catch((err) => push(t('app.importError', { msg: err.message === 'invalid-format' ? t('app.importInvalidFormat') : err.message }), { kind: 'error' }))
          }
          e.target.value = ''
        }}
      />

      <nav className="mb-4 flex flex-wrap gap-1 border-b border-slate-800 text-sm" aria-label="tabs">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            className={`rounded-t px-3 py-1.5 ${tab === k ? 'border border-b-0 border-slate-700 bg-slate-900 font-medium text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTab(k)}
          >
            {t(`tabs.${k}`)}
            {k === 'inventory' && <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 text-xs text-slate-400">{echoes.length}</span>}
          </button>
        ))}
      </nav>

      {tab === 'inventory' && (empty ? emptyState : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-3">
            <EchoForm onAdd={addEcho} />
            <p className="text-xs text-slate-500">{invCount}</p>
          </aside>
          <div className="self-start rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <RankingTable
              echoes={echoes}
              profile={profile}
              onDelete={deleteEcho}
              onEdit={setEditingEcho}
            />
          </div>
        </div>
      ))}

      {tab === 'optimize' && (empty ? emptyState : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-400">{t('app.character')}</label>
            <CharacterPicker
              value={charId}
              overrides={overrides}
              onChange={(id) => {
                // Đổi nhân vật → kết quả cũ thuộc nhân vật khác, bỏ hẳn (khác với stale)
                setCharId(id)
                setSolved(false)
                setLoadout(null)
                setStale(false)
              }}
            />
            <button
              className={`rounded px-2 py-1 text-xs ${showWeights ? 'bg-amber-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`}
              onClick={() => setShowWeights(!showWeights)}
            >{t('app.weights')}</button>
            <button
              className="ml-auto rounded bg-emerald-700 px-3 py-1 text-sm font-semibold hover:bg-emerald-600"
              onClick={solve}
            >{t('app.findBest5')}</button>
          </div>

          {showWeights && (
            <div className="max-w-md">
              <WeightEditor
                base={CHARACTER_BY_ID[charId]}
                merged={profile}
                override={overrides[charId]}
                onChange={(ov) => {
                  const next = { ...overrides }
                  if (ov === undefined) delete next[charId]
                  else next[charId] = ov
                  setOverrides(next) // kết quả solve tự chuyển "cũ" qua effect [overrides]
                }}
              />
            </div>
          )}

          {solved && (
            <Stale stale={stale} onResolve={solve}>
              <LoadoutView result={loadout} profile={profile} />
            </Stale>
          )}

          <p className="text-xs text-slate-600">{t('app.scoreHelp')}</p>
        </div>
      ))}

      {tab === 'roster' && empty && emptyState}
      {/* Giữ mounted (chỉ ẩn CSS): RosterPanel giữ danh sách đội + kết quả trong state cục bộ —
          unmount khi chuyển tab sẽ mất sạch. (OcrImport thì NGƯỢC LẠI: cố ý unmount để nhả worker WASM.) */}
      <div className={tab === 'roster' && !empty ? '' : 'hidden'}>
        <RosterPanel echoes={echoes} overrides={overrides} resolve={resolve} />
      </div>

      {tab === 'import' && (
        <div className="space-y-3">
          <OcrImport onAdd={addEcho} />
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
            <span className="font-semibold text-slate-300">{t('importTab.jsonTitle')}</span>
            <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={() => exportJson(echoes)}>{t('common.exportJson')}</button>
            <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={() => fileRef.current?.click()}>{t('common.importJson')}</button>
            {empty && (
              <button className="rounded border border-dashed border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800" onClick={() => setEchoes(DEMO_ECHOES)}>{t('empty.demoTitle')}</button>
            )}
            <span className="ml-auto text-xs text-slate-500">{invCount}</span>
          </div>
        </div>
      )}

      {editingEcho && (
        <EchoEditModal
          echo={editingEcho}
          onClose={() => setEditingEcho(null)}
          onSave={(updated) => {
            setEchoes((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            setEditingEcho(null)
          }}
        />
      )}
    </div>
  )
}
