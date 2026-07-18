import { useMemo, useState, type ReactNode } from 'react'
import type { CharacterProfile, Echo, MainStatKey } from '../types'
import { echoDisplayName, findEchoInfo } from '../data/echoIndex'
import { iconUrl } from '../data/iconAssets'
import { MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { SUBSTATS } from '../data/substats'
import { recycleRefund } from '../engine/economy'
import type { OwnerFit } from '../engine/insights'
import { echoRv, rankEchoes, tuneAdvice } from '../engine/score'
import { rateSubstat } from '../engine/substatRating'
import { useFmtN, useT, useTMessage } from '../i18n'
import BestOwnerBadge from './BestOwnerBadge'
import EchoCard from './EchoCard'
import { IconBan, IconGrid, IconInfo, IconList, IconLock, IconPencil, IconSearch, IconTrash } from './icons'
import PinnedByBadge, { type PinnedOwner } from './PinnedByBadge'
import ScoreBadge from './ScoreBadge'
import SubstatLegend from './SubstatLegend'

// Bảng xếp hạng kho echo cho 1 nhân vật — trả lời "trong N echo này, dùng con nào?"
// Kèm thanh công cụ tìm/lọc/sắp xếp (tham khảo trang artifact của Genshin Optimizer —
// research/ui-ux.md §3.1): search tên/set, lọc cost/set/main stat/verdict, sort Điểm/RV/Level/Mới.

interface Props {
  echoes: Echo[]
  profile: CharacterProfile
  /** F1 (task 58): top-3 nhân vật hợp nhất per echo (App memo riêng — không phụ thuộc filter bảng) */
  bestOwners?: Map<string, OwnerFit[]>
  /** Bấm tên nhân vật trong Best Owner → mở tab Tối ưu cho nhân vật đó */
  onJumpToChar?: (id: string) => void
  /** U7 (task 60): echo id → nhân vật đang ghim bộ chứa echo đó (badge "Đang dùng bởi X") */
  pinnedBy?: Map<string, PinnedOwner[]>
  /** K8 (ui-redesign): node đổi nhanh nhân vật (App truyền CharacterPicker) — toolbar luôn
   *  nói rõ "Chấm theo: ai" vì điểm/tư vấn phụ thuộc profile đang chọn */
  charPicker?: ReactNode
  onDelete: (id: string) => void
  /** Xoá hàng loạt (App bỏ qua echo khoá + toast hoàn tác cả cụm) */
  onDeleteMany: (ids: string[]) => void
  /** Bật/tắt cờ khoá (bảo vệ xoá) / loại (solver bỏ qua) */
  onToggleFlag: (id: string, key: 'lock' | 'trash') => void
  /** Mở modal xem chi tiết/sửa echo (bấm tên hoặc nút sửa) */
  onEdit: (echo: Echo) => void
}

export const VERDICT_CLS: Record<string, string> = {
  'keep-tuning': 'text-emerald-400',
  done: 'text-sky-400',
  usable: 'text-amber-400',
  trash: 'text-rose-400',
}

// K2 (ui-redesign): chip verdict ACTIVE giữ màu ngữ nghĩa (không đổi sang sky —
// sky-700 chỉ dành cho chip "Tất cả" trung tính)
const VERDICT_ACTIVE: Record<string, string> = {
  'keep-tuning': 'bg-emerald-600/20 text-emerald-300 border-emerald-600',
  done: 'bg-sky-600/20 text-sky-300 border-sky-600',
  usable: 'bg-amber-600/20 text-amber-300 border-amber-600',
  trash: 'bg-rose-600/20 text-rose-300 border-rose-600',
}

const VERDICTS = ['keep-tuning', 'done', 'usable', 'trash'] as const

/** K3/C1 (ui-redesign): icon-button 34px desktop / 44px mobile — hit-target đạt chuẩn,
 *  icon SVG ăn currentColor nên state tint được (emoji thì không — gotcha task 64).
 *  aria-label GIỮ NGUYÊN chuỗi (hợp đồng với e2e — dò startsWith('Khoá')/('Đánh dấu Bỏ')). */
const ICON_BTN = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[7px] border sm:h-[34px] sm:w-[34px]'
const ICON_BTN_IDLE = 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
const VIEW_KEY = 'wuwa-inv-view'
const LEGEND_KEY = 'wuwa-inv-legend'
const SORT_KEYS = ['score', 'rv', 'level', 'new'] as const
type SortKey = (typeof SORT_KEYS)[number]
/** Key i18n của option sort: score → inv.sortScore … */
const SORT_LABEL_KEY: Record<SortKey, string> = { score: 'inv.sortScore', rv: 'inv.sortRv', level: 'inv.sortLevel', new: 'inv.sortNew' }

export default function RankingTable({ echoes, profile, bestOwners, onJumpToChar, pinnedBy, charPicker, onDelete, onDeleteMany, onToggleFlag, onEdit }: Props) {
  const t = useT()
  const tm = useTMessage()
  const fmtN = useFmtN()
  const [q, setQ] = useState('')
  const [excludedOnly, setExcludedOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [costF, setCostF] = useState<number | null>(null)
  const [setF, setSetF] = useState('')
  const [mainF, setMainF] = useState<'' | MainStatKey>('')
  const [verdictF, setVerdictF] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
  // K5 (ui-redesign): chiều sort — header Điểm/Level bấm được, bấm lại đảo chiều; select giữ cho
  // grid/mobile (đổi key qua select reset về desc)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const headerSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSortKey(k)
      setSortDir('desc')
    }
  }
  // Bảng cho power-user (Fribbels) ⇄ lưới card trực quan (GO) — research/ui-ux.md §3.2.
  // Nhớ lựa chọn; lần đầu: màn hẹp mặc định lưới (bảng phải cuộn ngang trên mobile).
  const [view, setView] = useState<'table' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY)
      if (saved === 'table' || saved === 'grid') return saved
    } catch { /* storage bị chặn — dùng mặc định */ }
    return window.matchMedia('(max-width: 640px)').matches ? 'grid' : 'table'
  })
  const changeView = (v: 'table' | 'grid') => {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ }
  }
  // K6 (ui-redesign): legend substat ẩn/hiện được — không chiếm cố định 1 hàng; nhớ lựa chọn
  const [legendOpen, setLegendOpen] = useState(() => {
    try { return localStorage.getItem(LEGEND_KEY) !== '0' } catch { return true }
  })
  const toggleLegend = () => {
    setLegendOpen((prev) => {
      try { localStorage.setItem(LEGEND_KEY, prev ? '0' : '1') } catch { /* ignore */ }
      return !prev
    })
  }

  // Option lọc lấy từ những gì THẬT SỰ có trong kho (danh sách đầy đủ 34 set / 13 main quá dài)
  const setOptions = useMemo(() => {
    const ids = [...new Set(echoes.map((e) => e.set))]
    return ids.map((id) => ({ id, name: SONATA_BY_ID[id]?.name ?? id })).sort((a, b) => a.name.localeCompare(b.name))
  }, [echoes])
  const mainOptions = useMemo(() => [...new Set(echoes.map((e) => e.mainStat))], [echoes])

  // Memo: tránh chấm điểm lại toàn kho mỗi render (WeightEditor gõ phím → App re-render)
  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const filtered = echoes.filter((e) => {
      if (costF && e.cost !== costF) return false
      if (setF && e.set !== setF) return false
      if (mainF && e.mainStat !== mainF) return false
      if (ql && !`${e.name ?? ''} ${SONATA_BY_ID[e.set]?.name ?? e.set}`.toLowerCase().includes(ql)) return false
      return true
    })
    let list = rankEchoes(filtered, profile).map((r) => ({ r, advice: tuneAdvice(r.echo, profile) }))
    if (verdictF) list = list.filter((x) => x.advice.verdict === verdictF)
    if (excludedOnly) list = list.filter((x) => x.r.echo.trash)
    // K5: dir=1 desc (mặc định) / -1 asc — score dùng thứ tự rank sẵn nên asc là reverse
    const dir = sortDir === 'asc' ? -1 : 1
    if (sortKey === 'rv') list = [...list].sort((a, b) => dir * (echoRv(b.r.echo) - echoRv(a.r.echo)))
    else if (sortKey === 'level') list = [...list].sort((a, b) => dir * (b.r.echo.level - a.r.echo.level))
    else if (sortKey === 'new') {
      const order = new Map(echoes.map((e, i) => [e.id, i])) // thứ tự thêm vào kho
      list = [...list].sort((a, b) => dir * ((order.get(b.r.echo.id) ?? 0) - (order.get(a.r.echo.id) ?? 0)))
    } else if (sortDir === 'asc') list = [...list].reverse()
    return list
  }, [echoes, profile, q, costF, setF, mainF, verdictF, excludedOnly, sortKey, sortDir])

  // Chọn hàng loạt (chỉ chế độ bảng): echo khoá không chọn được
  const selectableIds = rows.filter((x) => !x.r.echo.lock).map((x) => x.r.echo.id)
  const selCount = selectableIds.filter((id) => selected.has(id)).length

  // F9 (review 16/07 #6): tổng hoàn tài nguyên THẬT của lựa chọn (recycleRefund — 75% EXP /
  // 30% tuner) thay câu tỉ lệ chung chung. Tuner khoá bậc → liệt kê theo bậc, không cộng gộp.
  const selRefund = useMemo(() => {
    if (selected.size === 0) return null
    let exp = 0
    const tunersByRarity = new Map<number, number>()
    for (const { r } of rows) {
      const e = r.echo
      if (!selected.has(e.id) || e.lock) continue
      const f = recycleRefund(e)
      exp += f.exp
      if (f.tuners > 0) tunersByRarity.set(e.rarity, (tunersByRarity.get(e.rarity) ?? 0) + f.tuners)
    }
    if (exp === 0 && tunersByRarity.size === 0) return null // lựa chọn chưa đầu tư gì — không có gì để hoàn
    const tunerText = [...tunersByRarity.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([rar, n]) => `${n}×${rar}★`)
      .join(' + ')
    return { exp, tunerText: tunerText || '0' }
  }, [rows, selected])
  const allSelected = selCount > 0 && selCount === selectableIds.length
  const trashCount = echoes.filter((e) => e.trash).length
  const toggleRow = (id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  if (echoes.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{t('ranking.emptyAll')}</p>
  }

  // U7: chủ nhân đang ghim echo này, TRỪ nhân vật đang xem (thấy "📌 chính mình" là nhiễu)
  const pinsOf = (id: string) => (pinnedBy?.get(id) ?? []).filter((o) => o.id !== profile.id)

  const selCls = 'rounded border border-slate-700 bg-slate-800 px-2 py-1'
  const chip = (active: boolean) =>
    `rounded px-2 py-1 ${active ? 'bg-sky-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`

  return (
    <div>
      {/* Thanh công cụ kho: search + lọc + sort (nằm NGOÀI vùng cuộn ngang của bảng) */}
      <div className="mb-1 space-y-1.5 border-b border-slate-800 p-1 pb-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* K3/C2: icon search trong ô tìm (mock toolbar) */}
          <span className="relative min-w-36 flex-1">
            <IconSearch size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('inv.search')}
              aria-label={t('inv.search')}
              className="w-full rounded border border-slate-700 bg-slate-800 py-1 pl-7 pr-2"
            />
          </span>
          <select className={selCls} value={setF} onChange={(e) => setSetF(e.target.value)} aria-label={t('inv.allSets')}>
            <option value="">{t('inv.allSets')}</option>
            {setOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={selCls} value={mainF} onChange={(e) => setMainF(e.target.value as '' | MainStatKey)} aria-label={t('inv.allMains')}>
            <option value="">{t('inv.allMains')}</option>
            {mainOptions.map((k) => <option key={k} value={k}>{MAINSTAT_LABELS[k]}</option>)}
          </select>
          <select className={selCls} value={sortKey} onChange={(e) => { setSortKey(e.target.value as SortKey); setSortDir('desc') }} aria-label={t('inv.sortScore')}>
            {SORT_KEYS.map((k) => <option key={k} value={k}>{t(SORT_LABEL_KEY[k])}</option>)}
          </select>
          {/* K8: điểm/tư vấn phụ thuộc nhân vật đang chọn — nhắc ngay tại toolbar + đổi được tại chỗ */}
          {charPicker && (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-500">{t('inv.scoringFor')}</span>
              {charPicker}
            </span>
          )}
          <span className="flex overflow-hidden rounded border border-slate-700">
            {(['table', 'grid'] as const).map((v) => (
              <button
                key={v}
                type="button"
                title={t(v === 'table' ? 'inv.viewTable' : 'inv.viewGrid')}
                aria-label={t(v === 'table' ? 'inv.viewTable' : 'inv.viewGrid')}
                aria-pressed={view === v}
                className={`flex h-[34px] w-[34px] items-center justify-center ${view === v ? 'bg-sky-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                onClick={() => changeView(v)}
              >{v === 'table' ? <IconList /> : <IconGrid />}</button>
            ))}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* K1 (ui-redesign): nhãn nhóm trước mỗi cụm chip — 2 nút "Tất cả" (Cost/Tư vấn) hết dính nhau */}
          <span className="text-[11px] uppercase tracking-wide text-slate-500">{t('inv.groupCost')}</span>
          {[null, 4, 3, 1].map((c) => (
            <button key={String(c)} type="button" className={chip(costF === c)} onClick={() => setCostF(c)}>
              {c === null ? t('app.all') : t('app.costFilter', { c })}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-800" aria-hidden />
          <span className="text-[11px] uppercase tracking-wide text-slate-500">{t('inv.groupVerdict')}</span>
          <button type="button" className={chip(verdictF === '')} onClick={() => setVerdictF('')}>{t('app.all')}</button>
          {VERDICTS.map((v) => (
            <button
              key={v}
              type="button"
              className={`rounded border px-2 py-1 ${verdictF === v ? VERDICT_ACTIVE[v] : `border-slate-700 hover:bg-slate-800 ${VERDICT_CLS[v]}`}`}
              onClick={() => setVerdictF(v)}
            >{t(`ranking.verdict.${v}`)}</button>
          ))}
          {trashCount > 0 && (
            <button
              type="button"
              className={`rounded px-2 py-1 ${excludedOnly ? 'bg-rose-800 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`}
              onClick={() => setExcludedOnly(!excludedOnly)}
            >{t('inv.excludedOnly', { n: trashCount })}</button>
          )}
          {/* K6: nút ẩn/hiện chú giải màu substat (trạng thái nhớ ở localStorage) */}
          <button
            type="button"
            className={`ml-auto rounded border border-slate-700 px-2 py-1 ${legendOpen ? 'bg-slate-800 text-slate-300' : 'text-slate-500 hover:bg-slate-800'}`}
            aria-pressed={legendOpen}
            onClick={toggleLegend}
          ><IconInfo size={13} className="mr-1 inline align-[-2px]" />{t('inv.legendToggle')}</button>
          <span className="text-slate-500">{t('inv.count', { shown: rows.length, total: echoes.length })}</span>
        </div>
        {/* K7: thanh chọn/refund dùng CHUNG cho cả bảng lẫn lưới */}
        {selCount > 0 && (
          <div className="space-y-1 rounded border border-rose-900/60 bg-rose-950/20 px-2 py-1.5">
            {/* F9 (task 58 + review 16/07 #6): nhắc hoàn tài nguyên TRƯỚC khi bấm xoá (toast là
                quá muộn) — SỐ THẬT của lựa chọn qua recycleRefund, chỉ hiện khi có gì để hoàn */}
            {selRefund && (
              <p className="text-slate-400">
                {t('inv.refundEstimate', { exp: fmtN(selRefund.exp), tuners: selRefund.tunerText })}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-rose-300">{t('inv.count', { shown: selCount, total: rows.length })}</span>
              <button
                type="button"
                className="rounded bg-rose-800 px-2 py-1 font-semibold text-white hover:bg-rose-700"
                onClick={() => {
                  onDeleteMany(selectableIds.filter((id) => selected.has(id)))
                  setSelected(new Set())
                }}
              >{t('inv.deleteSelected', { n: selCount })}</button>
            </div>
          </div>
        )}
      </div>

      {legendOpen && <SubstatLegend className="mx-1 mb-2" />}

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{t('inv.emptyFiltered')}</p>
      ) : view === 'grid' ? (
        <div className="grid items-start gap-2 p-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ r, advice }) => (
            <div key={r.echo.id} className={`relative ${r.echo.trash ? 'opacity-50' : ''}`}>
              {/* K7: checkbox chọn hàng loạt góc trên-trái (echo khoá không chọn được); label đệm
                  đủ hit-target 44/36px, stopPropagation để bấm không mở modal Sửa */}
              {!r.echo.lock && (
                <label
                  className="absolute left-0 top-0 z-10 flex h-11 w-11 cursor-pointer items-start p-1.5 sm:h-9 sm:w-9"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    aria-label={t('inv.selectRow')}
                    checked={selected.has(r.echo.id)}
                    onChange={() => toggleRow(r.echo.id)}
                    className="h-4 w-4 accent-sky-500"
                  />
                </label>
              )}
              {/* div (không phải button) để chân card chứa được ScoreBadge (button popover);
                  bấm card = sửa (ScoreBadge tự stopPropagation), đường bàn phím là nút "sửa" bên dưới */}
              <div
                className={`cursor-pointer ${selected.has(r.echo.id) && !r.echo.lock ? 'rounded-lg ring-2 ring-sky-500' : ''}`}
                title={t('ranking.editTip')}
                onClick={() => onEdit(r.echo)}
              >
                <EchoCard
                  echo={r.echo}
                  compact
                  profile={profile}
                  className="transition-colors hover:border-sky-600"
                  footer={
                    <>
                      <PinnedByBadge owners={pinsOf(r.echo.id)} variant="icon" />
                      {bestOwners && <BestOwnerBadge owners={bestOwners.get(r.echo.id) ?? []} onJump={onJumpToChar} variant="card" />}
                      <ScoreBadge r={r} profile={profile} variant="badge" />
                    </>
                  }
                />
              </div>
              <div className="mt-0.5 flex items-center justify-between px-0.5 text-xs">
                <span className={VERDICT_CLS[advice.verdict]} title={tm(advice.reason)}>
                  {t(`ranking.verdict.${advice.verdict}`)}
                  {advice.verdict === 'keep-tuning' && <span className="text-slate-500"> → {t('ranking.expected', { n: advice.expectedFinal.toFixed(0) })}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {/* K3/C1/C2: icon-button chuẩn hit-target — aria-label giữ nguyên chuỗi cho e2e */}
                  <button
                    className={`${ICON_BTN} ${r.echo.lock ? 'border-amber-600 bg-amber-500/20 text-amber-300' : ICON_BTN_IDLE}`}
                    title={t('inv.flagLock')} aria-label={t('inv.flagLock')} aria-pressed={!!r.echo.lock}
                    onClick={() => onToggleFlag(r.echo.id, 'lock')}
                  ><IconLock /></button>
                  <button
                    className={`${ICON_BTN} ${r.echo.trash ? 'border-rose-600 bg-rose-500/20 text-rose-300' : ICON_BTN_IDLE}`}
                    title={t('inv.flagTrashTip')} aria-label={t('inv.flagTrashTip')} aria-pressed={!!r.echo.trash}
                    onClick={() => onToggleFlag(r.echo.id, 'trash')}
                  ><IconBan /></button>
                  <button
                    className={`${ICON_BTN} ${ICON_BTN_IDLE} hover:text-sky-300`}
                    title={t('ranking.editTip')} aria-label={t('ranking.edit')}
                    onClick={() => onEdit(r.echo)}
                  ><IconPencil /></button>
                  {/* K4: divider tách cụm cờ (đảo được) khỏi xoá thật */}
                  <span className="mx-0.5 inline-block h-[22px] w-px bg-slate-800" aria-hidden />
                  <button
                    className={`${ICON_BTN} ${ICON_BTN_IDLE} hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30`}
                    disabled={!!r.echo.lock}
                    title={r.echo.lock ? t('inv.lockedNoDelete') : t('ranking.delete')}
                    aria-label={t('ranking.delete')}
                    onClick={() => onDelete(r.echo.id)}
                  ><IconTrash /></button>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="py-1.5 pr-1">
                  <input
                    type="checkbox"
                    aria-label={t('inv.selectAll')}
                    title={t('inv.selectAll')}
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(selectableIds))}
                  />
                </th>
                <th className="pr-2">#</th>
                <th className="pr-2">{t('ranking.colEcho')}</th>
                <th className="pr-2">{t('ranking.colMain')}</th>
                <th className="pr-2">{t('ranking.colSubstat')}</th>
                {/* K5: header sort với mũi tên chiều — cột đang sort tô sky */}
                <th className="pr-2 text-right">
                  <button
                    type="button"
                    title={t('inv.sortByCol')}
                    className={`inline-flex items-center gap-0.5 hover:text-slate-300 ${sortKey === 'score' ? 'text-sky-400' : ''}`}
                    onClick={() => headerSort('score')}
                  >{t('ranking.colScore')}{sortKey === 'score' && <span aria-hidden>{sortDir === 'desc' ? '▼' : '▲'}</span>}</button>
                </th>
                <th className="pr-2 text-right">
                  <button
                    type="button"
                    title={t('inv.sortByCol')}
                    className={`inline-flex items-center gap-0.5 hover:text-slate-300 ${sortKey === 'level' ? 'text-sky-400' : ''}`}
                    onClick={() => headerSort('level')}
                  >{t('ranking.colLevel')}{sortKey === 'level' && <span aria-hidden>{sortDir === 'desc' ? '▼' : '▲'}</span>}</button>
                </th>
                <th className="pr-2">{t('ranking.colAdvice')}</th>
                {bestOwners && <th className="pr-2">{t('ranking.colBestOwner')}</th>}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, advice }, i) => {
                return (
                  <tr key={r.echo.id} className={`border-b border-slate-800/60 align-top hover:bg-slate-900/60 ${r.echo.trash ? 'opacity-50' : ''}`}>
                    <td className="py-1.5 pr-1">
                      <input
                        type="checkbox"
                        aria-label={t('inv.selectRow')}
                        disabled={!!r.echo.lock}
                        title={r.echo.lock ? t('inv.lockedNoDelete') : t('inv.selectRow')}
                        checked={selected.has(r.echo.id) && !r.echo.lock}
                        onChange={() => toggleRow(r.echo.id)}
                      />
                    </td>
                    <td className="pr-2 pt-1.5 text-slate-500">{i + 1}</td>
                    <td className="pr-2">
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const info = findEchoInfo(r.echo.name)
                          return info ? (
                            <img src={iconUrl(info.icon)} alt="" loading="lazy" referrerPolicy="no-referrer"
                              className="h-6 w-6 shrink-0 rounded-full border border-slate-700 bg-slate-800 object-cover"
                              onError={(e) => { e.currentTarget.style.display = 'none' }} />
                          ) : null
                        })()}
                        <button
                          type="button"
                          className="cursor-pointer font-medium text-slate-200 hover:text-sky-300 hover:underline"
                          title={t('ranking.editTip')}
                          onClick={() => onEdit(r.echo)}
                        >{echoDisplayName(r.echo)}</button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                        <span>cost {r.echo.cost} · {r.echo.rarity}★ · {SONATA_BY_ID[r.echo.set]?.name}</span>
                        <PinnedByBadge owners={pinsOf(r.echo.id)} variant="chip" />
                      </div>
                    </td>
                    <td className={`pr-2 ${r.fitLevel === 1 ? 'text-emerald-400' : r.fitLevel >= 0.6 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {MAINSTAT_LABELS[r.echo.mainStat]}{r.fitLevel === 1 ? '' : r.fitLevel >= 0.6 ? ' ～' : ' ✗'}
                    </td>
                    <td className="pr-2 text-xs">
                      {r.breakdown.map((b) => {
                        const rt = rateSubstat(profile, b.stat, b.value)
                        return (
                          <span
                            key={b.stat}
                            className={`mr-2 inline-flex items-center gap-1 ${rt.tier === 0 ? 'opacity-50' : ''}`}
                            title={t('tier.subTip', { tier: t(rt.labelKey), i: rt.rollTier, n: rt.rollTierCount })}
                          >
                            <span className="text-slate-400">{SUBSTATS[b.stat].label}</span>
                            <span className={`font-mono ${rt.tier >= 5 ? 'font-semibold' : ''}`} style={{ color: rt.color }}>
                              {b.value}{SUBSTATS[b.stat].isPct ? '%' : ''}
                            </span>
                          </span>
                        )
                      })}
                    </td>
                    <td className="pr-2 text-right">
                      <ScoreBadge r={r} profile={profile} />
                    </td>
                    {/* K5: cột Level riêng (meta bỏ "+25" — hết lặp) */}
                    <td className="pr-2 pt-1.5 text-right font-mono text-xs tabular-nums text-slate-400">+{r.echo.level}</td>
                    <td className={`pr-2 text-xs ${VERDICT_CLS[advice.verdict]}`} title={tm(advice.reason)}>
                      {t(`ranking.verdict.${advice.verdict}`)}
                      {advice.verdict === 'keep-tuning' && <span className="text-slate-500"> → {t('ranking.expected', { n: advice.expectedFinal.toFixed(0) })}</span>}
                    </td>
                    {bestOwners && (
                      <td className="whitespace-nowrap pr-2 text-xs">
                        <BestOwnerBadge owners={bestOwners.get(r.echo.id) ?? []} onJump={onJumpToChar} />
                      </td>
                    )}
                    <td className="whitespace-nowrap text-right">
                      {/* K3/C1/C2: icon-button 34/44px — aria-label giữ nguyên chuỗi (e2e dò
                          startsWith 'Khoá' / 'Đánh dấu Bỏ' / === 'xoá'); xoá có toast Hoàn tác */}
                      <span className="inline-flex items-center gap-1">
                        <button
                          className={`${ICON_BTN} ${r.echo.lock ? 'border-amber-600 bg-amber-500/20 text-amber-300' : ICON_BTN_IDLE}`}
                          title={t('inv.flagLock')} aria-label={t('inv.flagLock')} aria-pressed={!!r.echo.lock}
                          onClick={() => onToggleFlag(r.echo.id, 'lock')}
                        ><IconLock /></button>
                        <button
                          className={`${ICON_BTN} ${r.echo.trash ? 'border-rose-600 bg-rose-500/20 text-rose-300' : ICON_BTN_IDLE}`}
                          title={t('inv.flagTrashTip')} aria-label={t('inv.flagTrashTip')} aria-pressed={!!r.echo.trash}
                          onClick={() => onToggleFlag(r.echo.id, 'trash')}
                        ><IconBan /></button>
                        <button
                          className={`${ICON_BTN} ${ICON_BTN_IDLE} hover:text-sky-300`}
                          title={t('ranking.editTip')} aria-label={t('ranking.edit')}
                          onClick={() => onEdit(r.echo)}
                        ><IconPencil /></button>
                        <span className="mx-0.5 inline-block h-[22px] w-px bg-slate-800" aria-hidden />
                        <button
                          className={`${ICON_BTN} ${ICON_BTN_IDLE} hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30`}
                          disabled={!!r.echo.lock}
                          title={r.echo.lock ? t('inv.lockedNoDelete') : t('ranking.delete')}
                          aria-label={t('ranking.delete')}
                          onClick={() => onDelete(r.echo.id)}
                        ><IconTrash /></button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
