import { useEffect, useMemo, useRef, useState } from 'react'
import EchoForm from './components/EchoForm'
import LoadoutView from './components/LoadoutView'
import OcrImport from './components/OcrImport'
import RankingTable from './components/RankingTable'
import RosterPanel from './components/RosterPanel'
import WeightEditor from './components/WeightEditor'
import { CHARACTERS, CHARACTER_BY_ID } from './data/characters'
import { DEMO_ECHOES } from './data/demo'
import { solveBest5 } from './engine/solver'
import { useLang, useT } from './i18n'
import { exportJson, importJson, mergeProfile, useEchoInventory, useOverrides } from './store'
import type { LoadoutResult } from './types'

export default function App() {
  const t = useT()
  const { lang, setLang } = useLang()
  const { echoes, setEchoes } = useEchoInventory()
  const { overrides, setOverrides } = useOverrides()
  const [charId, setCharId] = useState(CHARACTERS[0].id)
  const [costFilter, setCostFilter] = useState<number | null>(null)
  const [loadout, setLoadout] = useState<LoadoutResult | null>(null)
  const [solved, setSolved] = useState(false)
  const [showWeights, setShowWeights] = useState(false)
  const [showOcr, setShowOcr] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const resolve = (id: string) => mergeProfile(CHARACTER_BY_ID[id], overrides[id])
  const profile = resolve(charId)

  // Kho đổi (thêm/xóa/import) → kết quả solve cũ không còn khớp, ẩn đi để tránh hiển thị stale
  useEffect(() => {
    setSolved(false)
    setLoadout(null)
  }, [echoes])

  const stats = useMemo(() => {
    const byCost: Record<number, number> = { 1: 0, 3: 0, 4: 0 }
    echoes.forEach((e) => { byCost[e.cost] = (byCost[e.cost] ?? 0) + 1 })
    return byCost
  }, [echoes])

  const sel = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm'

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-100">WuWa Echo Optimizer <span className="text-xs font-normal text-slate-500">{t('app.subtitle')}</span></h1>
        <div className="flex gap-2 text-xs">
          <button className="rounded border border-slate-700 px-2 py-1 hover:bg-slate-800" onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'EN' : 'VI'}</button>
          <button className="rounded border border-slate-700 px-2 py-1 hover:bg-slate-800" onClick={() => exportJson(echoes)}>{t('common.exportJson')}</button>
          <button className="rounded border border-slate-700 px-2 py-1 hover:bg-slate-800" onClick={() => fileRef.current?.click()}>{t('common.importJson')}</button>
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
                    if (dropped > 0) alert(t('app.importDropped', { n: dropped }))
                  })
                  .catch((err) => alert(t('app.importError', { msg: err.message === 'invalid-format' ? t('app.importInvalidFormat') : err.message })))
              }
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-3">
          <EchoForm onAdd={(echo) => setEchoes([...echoes, echo])} />
          <button
            className={`w-full rounded px-2 py-1.5 text-xs ${showOcr ? 'bg-sky-700 text-white' : 'border border-dashed border-slate-700 text-slate-400 hover:bg-slate-900'}`}
            onClick={() => setShowOcr(!showOcr)}
          >{t('app.importFromImage')}</button>
          {showOcr && <OcrImport onAdd={(echo) => setEchoes([...echoes, echo])} />}
          <p className="text-xs text-slate-500">
            {t('app.inventoryCount', { n: echoes.length, c4: stats[4], c3: stats[3], c1: stats[1] })}
          </p>
          {echoes.length === 0 && (
            <button
              className="w-full rounded border border-dashed border-slate-700 py-1.5 text-xs text-slate-400 hover:bg-slate-900"
              onClick={() => setEchoes(DEMO_ECHOES)}
            >{t('app.loadDemo')}</button>
          )}
          {showWeights && (
            <WeightEditor
              base={CHARACTER_BY_ID[charId]}
              merged={profile}
              override={overrides[charId]}
              onChange={(ov) => {
                const next = { ...overrides }
                if (ov === undefined) delete next[charId]
                else next[charId] = ov
                setOverrides(next)
                setSolved(false)
              }}
            />
          )}
        </aside>

        <main className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-400">{t('app.character')}</label>
            <select className={sel} value={charId} onChange={(e) => { setCharId(e.target.value); setSolved(false) }}>
              {CHARACTERS.map((c) => <option key={c.id} value={c.id}>{c.name}{overrides[c.id] ? ' *' : ''}</option>)}
            </select>
            <button
              className={`rounded px-2 py-1 text-xs ${showWeights ? 'bg-amber-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`}
              onClick={() => setShowWeights(!showWeights)}
            >{t('app.weights')}</button>
            <div className="flex gap-1 text-xs">
              {[null, 4, 3, 1].map((c) => (
                <button
                  key={String(c)}
                  className={`rounded px-2 py-1 ${costFilter === c ? 'bg-sky-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                  onClick={() => setCostFilter(c)}
                >
                  {c === null ? t('app.all') : t('app.costFilter', { c })}
                </button>
              ))}
            </div>
            <button
              className="ml-auto rounded bg-emerald-700 px-3 py-1 text-sm font-semibold hover:bg-emerald-600"
              onClick={() => { setLoadout(solveBest5(echoes, profile)); setSolved(true) }}
            >{t('app.findBest5')}</button>
          </div>

          {solved && <LoadoutView result={loadout} profile={profile} />}

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <RankingTable
              echoes={echoes}
              profile={profile}
              costFilter={costFilter}
              onDelete={(id) => setEchoes(echoes.filter((e) => e.id !== id))}
            />
          </div>

          <RosterPanel echoes={echoes} resolve={resolve} />

          <p className="text-xs text-slate-600">
            {t('app.scoreHelp')}
          </p>
        </main>
      </div>
    </div>
  )
}
