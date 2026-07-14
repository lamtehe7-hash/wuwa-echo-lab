import { useMemo, useState } from 'react'
import type { CharacterProfile, Echo, MainStatKey } from '../types'
import { findEchoInfo } from '../data/echoIndex'
import { MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { SUBSTATS, maxRoll } from '../data/substats'
import { rankEchoes, tuneAdvice } from '../engine/score'
import { useT, useTMessage } from '../i18n'

// Bảng xếp hạng kho echo cho 1 nhân vật — trả lời "trong N echo này, dùng con nào?"
// Kèm thanh công cụ tìm/lọc/sắp xếp (tham khảo trang artifact của Genshin Optimizer —
// research/ui-ux.md §3.1): search tên/set, lọc cost/set/main stat/verdict, sort Điểm/RV/Level/Mới.

interface Props {
  echoes: Echo[]
  profile: CharacterProfile
  onDelete: (id: string) => void
  /** Mở modal xem chi tiết/sửa echo (bấm tên hoặc nút sửa) */
  onEdit: (echo: Echo) => void
}

const VERDICT_CLS: Record<string, string> = {
  'keep-tuning': 'text-emerald-400',
  done: 'text-sky-400',
  usable: 'text-amber-400',
  trash: 'text-rose-400',
}

const VERDICTS = ['keep-tuning', 'done', 'usable', 'trash'] as const
const SORT_KEYS = ['score', 'rv', 'level', 'new'] as const
type SortKey = (typeof SORT_KEYS)[number]
/** Key i18n của option sort: score → inv.sortScore … */
const SORT_LABEL_KEY: Record<SortKey, string> = { score: 'inv.sortScore', rv: 'inv.sortRv', level: 'inv.sortLevel', new: 'inv.sortNew' }

/** RV — chất lượng roll trung bình (cùng công thức với badge RV trong EchoCard) */
function rvOf(e: Echo): number {
  if (e.substats.length === 0) return 0
  return e.substats.reduce((s, x) => s + x.value / maxRoll(x.stat), 0) / e.substats.length
}

export default function RankingTable({ echoes, profile, onDelete, onEdit }: Props) {
  const t = useT()
  const tm = useTMessage()
  const [q, setQ] = useState('')
  const [costF, setCostF] = useState<number | null>(null)
  const [setF, setSetF] = useState('')
  const [mainF, setMainF] = useState<'' | MainStatKey>('')
  const [verdictF, setVerdictF] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('score')

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
    if (sortKey === 'rv') list = [...list].sort((a, b) => rvOf(b.r.echo) - rvOf(a.r.echo))
    else if (sortKey === 'level') list = [...list].sort((a, b) => b.r.echo.level - a.r.echo.level)
    else if (sortKey === 'new') {
      const order = new Map(echoes.map((e, i) => [e.id, i])) // thứ tự thêm vào kho
      list = [...list].sort((a, b) => (order.get(b.r.echo.id) ?? 0) - (order.get(a.r.echo.id) ?? 0))
    }
    return list
  }, [echoes, profile, q, costF, setF, mainF, verdictF, sortKey])

  if (echoes.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{t('ranking.emptyAll')}</p>
  }

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
          <span className="ml-auto text-slate-500">{t('inv.count', { shown: rows.length, total: echoes.length })}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">{t('inv.emptyFiltered')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="py-1.5 pr-2">#</th>
                <th className="pr-2">{t('ranking.colEcho')}</th>
                <th className="pr-2">{t('ranking.colMain')}</th>
                <th className="pr-2">{t('ranking.colSubstat')}</th>
                <th className="pr-2 text-right">{t('ranking.colScore')}</th>
                <th className="pr-2">{t('ranking.colAdvice')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, advice }, i) => {
                return (
                  <tr key={r.echo.id} className="border-b border-slate-800/60 align-top hover:bg-slate-900/60">
                    <td className="py-1.5 pr-2 text-slate-500">{i + 1}</td>
                    <td className="pr-2">
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const info = findEchoInfo(r.echo.name)
                          return info ? (
                            <img src={info.icon} alt="" loading="lazy" referrerPolicy="no-referrer"
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
                      <div className="text-xs text-slate-500">cost {r.echo.cost} · {r.echo.rarity}★ +{r.echo.level} · {SONATA_BY_ID[r.echo.set]?.name}</div>
                    </td>
                    <td className={`pr-2 ${r.fitLevel === 1 ? 'text-emerald-400' : r.fitLevel >= 0.6 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {MAINSTAT_LABELS[r.echo.mainStat]}{r.fitLevel === 1 ? '' : r.fitLevel >= 0.6 ? ' ～' : ' ✗'}
                    </td>
                    <td className="pr-2 text-xs text-slate-400">
                      {r.breakdown.map((b) => (
                        <span key={b.stat} className={`mr-2 inline-block ${b.weighted > 0 ? '' : 'opacity-40'}`}>
                          {SUBSTATS[b.stat].label} {b.value}{SUBSTATS[b.stat].isPct ? '%' : ''}
                        </span>
                      ))}
                    </td>
                    <td className="pr-2 text-right font-mono text-base text-slate-100" title={`substat ${r.score.toFixed(1)} + main ${r.mainScore.toFixed(1)}`}>{r.totalScore.toFixed(1)}</td>
                    <td className={`pr-2 text-xs ${VERDICT_CLS[advice.verdict]}`} title={tm(advice.reason)}>
                      {t(`ranking.verdict.${advice.verdict}`)}
                      {advice.verdict === 'keep-tuning' && <span className="text-slate-500"> → {t('ranking.expected', { n: advice.expectedFinal.toFixed(0) })}</span>}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <button className="mr-2 text-xs text-slate-500 hover:text-sky-300" title={t('ranking.editTip')} onClick={() => onEdit(r.echo)}>{t('ranking.edit')}</button>
                      {/* Xoá ngay — App hiện toast kèm "Hoàn tác" (không confirm chặn luồng) */}
                      <button className="text-xs text-slate-600 hover:text-rose-400" onClick={() => onDelete(r.echo.id)}>{t('ranking.delete')}</button>
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
