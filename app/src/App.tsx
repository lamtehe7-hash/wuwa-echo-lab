import { useEffect, useMemo, useRef, useState } from 'react'
import CharacterPicker from './components/CharacterPicker'
import EchoEditModal from './components/EchoEditModal'
import EchoForm from './components/EchoForm'
import EmptyState from './components/EmptyState'
import LoadoutView from './components/LoadoutView'
import OcrImport from './components/OcrImport'
import RankingTable from './components/RankingTable'
import RosterPanel from './components/RosterPanel'
import SetPicker from './components/SetPicker'
import Stale from './components/Stale'
import { useToast } from './components/Toast'
import WeightEditor from './components/WeightEditor'
import { CHARACTERS, CHARACTER_BY_ID } from './data/characters'
import { DEMO_ECHOES } from './data/demo'
import { SONATA_BY_ID } from './data/sonata'
import { loadoutDamage } from './engine/damage'
import { scoreLoadout, solveBest5, type SolveObjective } from './engine/solver'
import { useLang, useT } from './i18n'
import { exportJson, importJson, mergeProfile, newId, useEchoInventory, useEquipped, useOverrides, useVaults } from './store'
import ScannerImport from './components/ScannerImport'
import VaultBar from './components/VaultBar'
import type { Echo, LoadoutResult } from './types'

// Điều hướng tab theo tác vụ (pattern GO/Fribbels/wuwa.build — research/ui-ux.md §3):
// Kho / Tối ưu / Đội hình / Import. Trạng thái tab + nhân vật sync vào URL hash
// (#optimize?char=changli) để F5/share giữ ngữ cảnh; replaceState để không spam history.

const TABS = ['inventory', 'optimize', 'roster', 'import'] as const
type Tab = (typeof TABS)[number]

// Nguồn dự án (mã nguồn mở) — hiện ở header + footer để người mở tool biết xuất xứ / cách đóng góp.
const REPO = 'https://github.com/lamtehe7-hash/wuwa-echo-lab'
const LIVE = 'https://lamtehe7-hash.github.io/wuwa-echo-lab/'

// Logo GitHub (inline SVG — tự chứa, không phụ thuộc CDN/icon lib)
function GithubMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function parseHash(): { tab: Tab; char?: string } {
  const [path, query] = window.location.hash.replace(/^#/, '').split('?')
  const tab = (TABS as readonly string[]).includes(path) ? (path as Tab) : 'inventory'
  const char = new URLSearchParams(query).get('char') ?? undefined
  return { tab, char }
}

function AppInner({ vaultId, vaults }: { vaultId: string; vaults: ReturnType<typeof useVaults> }) {
  const t = useT()
  const { lang, setLang } = useLang()
  const push = useToast()
  const { echoes, setEchoes } = useEchoInventory(vaultId)
  const { overrides, setOverrides } = useOverrides(vaultId)
  const { equipped, setEquipped } = useEquipped(vaultId)
  const initial = useRef(parseHash()).current
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [charId, setCharId] = useState(
    initial.char && CHARACTER_BY_ID[initial.char] ? initial.char : CHARACTERS[0].id,
  )
  const [loadout, setLoadout] = useState<LoadoutResult | null>(null)
  const [solved, setSolved] = useState(false)
  const [stale, setStale] = useState(false)
  const [forcedSet, setForcedSet] = useState('') // '' = tự động; set id = ép solver theo set đó
  const [objective, setObjective] = useState<SolveObjective>('score') // 'damage' = re-rank top-N theo damage model
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

  // "Bộ hiện tại" đã ghi nhớ của nhân vật đang chọn — chấm lại theo kho/trọng số MỚI NHẤT
  // (cùng objective với solver) để delta trước–sau luôn cùng thang
  const equippedInfo = useMemo(() => {
    const ids = equipped[charId]
    if (!ids || ids.length === 0) return null
    const found = ids.map((id) => echoes.find((e) => e.id === id)).filter((e): e is Echo => e !== undefined)
    return { result: scoreLoadout(found, profile), missing: ids.length - found.length }
  }, [equipped, charId, echoes, profile])

  // Kho/trọng số đổi → kết quả solve không còn khớp: GIỮ hiển thị nhưng đánh dấu cũ (mờ + nút giải lại)
  useEffect(() => {
    setStale(true)
  }, [echoes, overrides])

  const solve = () => {
    setLoadout(solveBest5(usableEchoes, profile, forcedSet || undefined, objective))
    setSolved(true)
    setStale(false)
  }

  // Echo bị đánh dấu "loại" (trash) không vào solver — vẫn hiện mờ trong kho.
  // useMemo giữ identity để effect stale của RosterPanel không bắn mỗi render.
  const usableEchoes = useMemo(() => echoes.filter((e) => !e.trash), [echoes])

  const toggleFlag = (id: string, key: 'lock' | 'trash') => {
    setEchoes((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: e[key] ? undefined : true } : e)))
  }

  // Xoá hàng loạt (bỏ qua echo khoá) + toast hoàn tác cả cụm
  const deleteMany = (ids: string[]) => {
    const idSet = new Set(ids)
    const removed = echoes.filter((e) => idSet.has(e.id) && !e.lock)
    if (removed.length === 0) return
    const removedIds = new Set(removed.map((e) => e.id))
    setEchoes((prev) => prev.filter((e) => !removedIds.has(e.id)))
    push(t('toast.deletedMany', { n: removed.length }), {
      action: { label: t('common.undo'), fn: () => setEchoes((prev) => [...prev, ...removed]) },
    })
  }

  // Xoá ngay + toast có "Hoàn tác" (thay cho confirm chặn luồng)
  const deleteEcho = (id: string) => {
    const echo = echoes.find((e) => e.id === id)
    if (!echo || echo.lock) return // nút xoá đã disable khi khoá — guard thêm cho chắc
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
        <div className="flex items-center gap-2 self-center">
          <VaultBar {...vaults} />
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            title={t('app.githubTip')}
            className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            <GithubMark /> GitHub
          </a>
          <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'EN' : 'VI'}</button>
        </div>
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
              onDeleteMany={deleteMany}
              onToggleFlag={toggleFlag}
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
                // Đổi nhân vật → kết quả cũ thuộc nhân vật khác, bỏ hẳn (khác với stale);
                // set đề cử khác nhau nên bỏ luôn ràng buộc set đã ép
                setCharId(id)
                setSolved(false)
                setLoadout(null)
                setStale(false)
                setForcedSet('')
              }}
            />
            <label className="ml-1 text-sm text-slate-400">{t('setpick.label')}</label>
            <SetPicker
              value={forcedSet}
              preferred={profile.preferredSets}
              onChange={(v) => { setForcedSet(v); if (solved) setStale(true) }}
            />
            <span className="ml-1 inline-flex overflow-hidden rounded border border-slate-700 text-xs" title={t('app.objectiveTip')}>
              {(['score', 'damage'] as const).map((o) => (
                <button
                  key={o}
                  className={`px-2 py-1 ${objective === o ? 'bg-sky-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                  onClick={() => { setObjective(o); if (solved) setStale(true) }}
                >{t(o === 'score' ? 'app.objScore' : 'app.objDamage')}</button>
              ))}
            </span>
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

          {equippedInfo && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-900/60 bg-sky-950/20 px-3 py-2 text-sm">
              <span className="text-sky-300">📌 {t('equip.current')}</span>
              <span className="font-mono text-sky-200">
                {equippedInfo.result ? t('loadout.points', { n: equippedInfo.result.total.toFixed(1) }) : '—'}
              </span>
              {equippedInfo.result && (
                <span className="text-xs text-slate-500">
                  ⚔ ×{loadoutDamage(equippedInfo.result.echoes.map((s) => s.echo), profile).multiplier.toFixed(2)}
                </span>
              )}
              {equippedInfo.missing > 0 && <span className="text-xs text-amber-400">{t('equip.missing', { n: equippedInfo.missing })}</span>}
              <button
                className="ml-auto text-xs text-slate-500 hover:text-rose-400"
                onClick={() => setEquipped((prev) => {
                  const next = { ...prev }
                  delete next[charId]
                  return next
                })}
              >{t('equip.unpin')}</button>
            </div>
          )}

          {solved && (
            <Stale stale={stale} onResolve={solve}>
              <LoadoutView
                result={loadout}
                profile={profile}
                compareTotal={equippedInfo?.result?.total ?? null}
                onPin={loadout ? () => {
                  setEquipped((prev) => ({ ...prev, [charId]: loadout.echoes.map((s) => s.echo.id) }))
                  push(t('toast.pinned', { name: profile.name }))
                } : undefined}
              />
            </Stale>
          )}

          <p className="text-xs text-slate-600">{t('app.scoreHelp')}</p>
        </div>
      ))}

      {tab === 'roster' && empty && emptyState}
      {/* Giữ mounted (chỉ ẩn CSS): RosterPanel giữ danh sách đội + kết quả trong state cục bộ —
          unmount khi chuyển tab sẽ mất sạch. (OcrImport thì NGƯỢC LẠI: cố ý unmount để nhả worker WASM.) */}
      <div className={tab === 'roster' && !empty ? '' : 'hidden'}>
        <RosterPanel echoes={usableEchoes} overrides={overrides} resolve={resolve} />
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
          <ScannerImport
            hasInventory={echoes.length > 0}
            onImport={(imported, mode) => {
              if (mode === 'replace') {
                if (echoes.length > 0 && !window.confirm(t('app.importConfirmReplace', { n: echoes.length }))) return
                setEchoes(imported)
              } else {
                // Thêm: regenerate id nếu trùng echo đang có (tránh đè)
                setEchoes((prev) => {
                  const ids = new Set(prev.map((e) => e.id))
                  return [...prev, ...imported.map((e) => (ids.has(e.id) ? { ...e, id: newId() } : e))]
                })
              }
              push(t('toast.imported', { n: imported.length }))
            }}
          />
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

      <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200">
            <GithubMark /> {t('footer.source')}
          </a>
          <span className="text-slate-700">·</span>
          <a href={`${REPO}/releases`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200">{t('footer.releases')}</a>
          <span className="text-slate-700">·</span>
          <a href={LIVE} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200">{t('footer.web')}</a>
        </div>
        <p className="max-w-3xl leading-relaxed">{t('footer.intro')}</p>
      </footer>
    </div>
  )
}

// Wrapper: quản lý registry vault + remount AppInner theo key=activeId (mỗi vault có kho/override/
// equipped riêng; remount để useState(load…) đọc đúng vault mới, tránh race persist khi đổi vault).
export default function App() {
  const vaults = useVaults()
  return <AppInner key={vaults.activeId} vaultId={vaults.activeId} vaults={vaults} />
}
