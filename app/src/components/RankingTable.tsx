import { useMemo, useState } from 'react'
import type { CharacterProfile, Echo, MainStatKey } from '../types'
import { findEchoInfo } from '../data/echoIndex'
import { iconUrl } from '../data/iconAssets'
import { MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { SUBSTATS } from '../data/substats'
import type { OwnerFit } from '../engine/insights'
import { echoRv, rankEchoes, tuneAdvice } from '../engine/score'
import { rateSubstat } from '../engine/substatRating'
import { useT, useTMessage } from '../i18n'
import BestOwnerBadge from './BestOwnerBadge'
import EchoCard from './EchoCard'
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

const VERDICTS = ['keep-tuning', 'done', 'usable', 'trash'] as const
const VIEW_KEY = 'wuwa-inv-view'
const SORT_KEYS = ['score', 'rv', 'level', 'new'] as const
type SortKey = (typeof SORT_KEYS)[number]
/** Key i18n của option sort: score → inv.sortScore … */
const SORT_LABEL_KEY: Record<SortKey, string> = { score: 'inv.sortScore', rv: 'inv.sortRv', level: 'inv.sortLevel', new: 'inv.sortNew' }

export default function RankingTable({ echoes, profile, bestOwners, onJumpToChar, pinnedBy, onDelete, onDeleteMany, onToggleFlag, onEdit }: Props) {
  const t = useT()
  const tm = useTMessage()
  const [q, setQ] = useState('')
  const [excludedOnly, setExcludedOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [costF, setCostF] = useState<number | null>(null)
  const [setF, setSetF] = useState('')
  const [mainF, setMainF] = useState<'' | MainStatKey>('')
  const [verdictF, setVerdictF] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('score')
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
    if (sortKey === 'rv') list = [...list].sort((a, b) => echoRv(b.r.echo) - echoRv(a.r.echo))
    else if (sortKey === 'level') list = [...list].sort((a, b) => b.r.echo.level - a.r.echo.level)
    else if (sortKey === 'new') {
      const order = new Map(echoes.map((e, i) => [e.id, i])) // thứ tự thêm vào kho
      list = [...list].sort((a, b) => (order.get(b.r.echo.id) ?? 0) - (order.get(a.r.echo.id) ?? 0))
    }
    return list
  }, [echoes, profile, q, costF, setF, mainF, verdictF, excludedOnly, sortKey])

  // Chọn hàng loạt (chỉ chế độ bảng): echo khoá không chọn được
  const selectableIds = rows.filter((x) => !x.r.echo.lock).map((x) => x.r.echo.id)
  const selCount = selectableIds.filter((id) => selected.has(id)).length
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
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('inv.search')}
            aria-label={t('inv.search')}
            className="min-w-36 flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1"
          />
          <select className={selCls} value={setF} onChange={(e) => setSetF(e.target.value)} aria-label={t('inv.allSets')}>
            <option value="">{t('inv.allSets')}</option>
            {setOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={selCls} value={mainF} onChange={(e) => setMainF(e.target.value as '' | MainStatKey)} aria-label={t('inv.allMains')}>
            <option value="">{t('inv.allMains')}</option>
            {mainOptions.map((k) => <option key={k} value={k}>{MAINSTAT_LABELS[k]}</option>)}
          </select>
          <select className={selCls} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} aria-label={t('inv.sortScore')}>
            {SORT_KEYS.map((k) => <option key={k} value={k}>{t(SORT_LABEL_KEY[k])}</option>)}
          </select>
          <span className="flex overflow-hidden rounded border border-slate-700">
            {(['table', 'grid'] as const).map((v) => (
              <button
                key={v}
                type="button"
                title={t(v === 'table' ? 'inv.viewTable' : 'inv.viewGrid')}
                aria-label={t(v === 'table' ? 'inv.viewTable' : 'inv.viewGrid')}
                aria-pressed={view === v}
                className={`px-2 py-1 ${view === v ? 'bg-sky-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                onClick={() => changeView(v)}
              >{v === 'table' ? '▤' : '▦'}</button>
            ))}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[null, 4, 3, 1].map((c) => (
            <button key={String(c)} type="button" className={chip(costF === c)} onClick={() => setCostF(c)}>
              {c === null ? t('app.all') : t('app.costFilter', { c })}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-800" aria-hidden />
          <button type="button" className={chip(verdictF === '')} onClick={() => setVerdictF('')}>{t('app.all')}</button>
          {VERDICTS.map((v) => (
            <button
              key={v}
              type="button"
              className={`rounded px-2 py-1 ${verdictF === v ? 'bg-sky-700 text-white' : `border border-slate-700 hover:bg-slate-800 ${VERDICT_CLS[v]}`}`}
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
          <span className="ml-auto text-slate-500">{t('inv.count', { shown: rows.length, total: echoes.length })}</span>
        </div>
        {view === 'table' && selCount > 0 && (
          <div className="space-y-1 rounded border border-rose-900/60 bg-rose-950/20 px-2 py-1.5">
            {/* F9 (task 58): nhắc cơ chế hoàn tài nguyên TRƯỚC khi bấm xoá (toast là quá muộn để cân nhắc) —
                chỉ hiện khi có echo đã luyện (level>0) trong lựa chọn */}
            {rows.some((x) => selected.has(x.r.echo.id) && !x.r.echo.lock && x.r.echo.level > 0) && (
              <p className="text-slate-400">{t('inv.refundHint')}</p>
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

      <SubstatLegend className="mx-1 mb-2" />

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{t('inv.emptyFiltered')}</p>
      ) : view === 'grid' ? (
        <div className="grid items-start gap-2 p-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ r, advice }) => (
            <div key={r.echo.id} className={r.echo.trash ? 'opacity-50' : ''}>
              {/* div (không phải button) để chân card chứa được ScoreBadge (button popover);
                  bấm card = sửa (ScoreBadge tự stopPropagation), đường bàn phím là nút "sửa" bên dưới */}
              <div className="cursor-pointer" title={t('ranking.editTip')} onClick={() => onEdit(r.echo)}>
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
                <span className="shrink-0">
                  <button
                    className={`mr-1 ${r.echo.lock ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                    title={t('inv.flagLock')} aria-label={t('inv.flagLock')} aria-pressed={!!r.echo.lock}
                    onClick={() => onToggleFlag(r.echo.id, 'lock')}
                  >🔒</button>
                  <button
                    className={`mr-2 ${r.echo.trash ? 'text-rose-400' : 'text-slate-600 hover:text-rose-400'}`}
                    title={t('inv.flagTrash')} aria-label={t('inv.flagTrash')} aria-pressed={!!r.echo.trash}
                    onClick={() => onToggleFlag(r.echo.id, 'trash')}
                  >🗑</button>
                  <button className="mr-2 text-slate-500 hover:text-sky-300" onClick={() => onEdit(r.echo)}>{t('ranking.edit')}</button>
                  <button
                    className="text-slate-600 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                    disabled={!!r.echo.lock}
                    title={r.echo.lock ? t('inv.lockedNoDelete') : undefined}
                    onClick={() => onDelete(r.echo.id)}
                  >{t('ranking.delete')}</button>
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
                <th className="pr-2 text-right">{t('ranking.colScore')}</th>
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
                        >{r.echo.name || SONATA_BY_ID[r.echo.set]?.name || r.echo.set}</button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                        <span>cost {r.echo.cost} · {r.echo.rarity}★ +{r.echo.level} · {SONATA_BY_ID[r.echo.set]?.name}</span>
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
                      <button
                        className={`mr-1 text-xs ${r.echo.lock ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}
                        title={t('inv.flagLock')} aria-label={t('inv.flagLock')} aria-pressed={!!r.echo.lock}
                        onClick={() => onToggleFlag(r.echo.id, 'lock')}
                      >🔒</button>
                      <button
                        className={`mr-2 text-xs ${r.echo.trash ? 'text-rose-400' : 'text-slate-600 hover:text-rose-400'}`}
                        title={t('inv.flagTrash')} aria-label={t('inv.flagTrash')} aria-pressed={!!r.echo.trash}
                        onClick={() => onToggleFlag(r.echo.id, 'trash')}
                      >🗑</button>
                      <button className="mr-2 text-xs text-slate-500 hover:text-sky-300" title={t('ranking.editTip')} onClick={() => onEdit(r.echo)}>{t('ranking.edit')}</button>
                      {/* Xoá ngay — App hiện toast kèm "Hoàn tác"; echo khoá thì chặn */}
                      <button
                        className="text-xs text-slate-600 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={!!r.echo.lock}
                        title={r.echo.lock ? t('inv.lockedNoDelete') : undefined}
                        onClick={() => onDelete(r.echo.id)}
                      >{t('ranking.delete')}</button>
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
