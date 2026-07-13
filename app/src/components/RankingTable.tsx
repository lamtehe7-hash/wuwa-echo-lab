import { useMemo } from 'react'
import type { CharacterProfile, Echo } from '../types'
import { MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { SUBSTATS } from '../data/substats'
import { rankEchoes, tuneAdvice } from '../engine/score'
import { useT, useTMessage } from '../i18n'

// Bảng xếp hạng kho echo cho 1 nhân vật — trả lời "trong N echo này, dùng con nào?"

interface Props {
  echoes: Echo[]
  profile: CharacterProfile
  costFilter: number | null
  onDelete: (id: string) => void
}

const VERDICT_CLS: Record<string, string> = {
  'keep-tuning': 'text-emerald-400',
  done: 'text-sky-400',
  usable: 'text-amber-400',
  trash: 'text-rose-400',
}

export default function RankingTable({ echoes, profile, costFilter, onDelete }: Props) {
  const t = useT()
  const tm = useTMessage()
  // Memo: tránh chấm điểm lại toàn kho mỗi render (WeightEditor gõ phím → App re-render)
  const rows = useMemo(() => {
    const filtered = costFilter ? echoes.filter((e) => e.cost === costFilter) : echoes
    return rankEchoes(filtered, profile).map((r) => ({ r, advice: tuneAdvice(r.echo, profile) }))
  }, [echoes, profile, costFilter])

  if (rows.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{costFilter ? t('ranking.emptyCost', { cost: costFilter }) : t('ranking.emptyAll')}</p>
  }

  return (
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
                <div className="font-medium text-slate-200">{r.echo.name || SONATA_BY_ID[r.echo.set]?.name || r.echo.set}</div>
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
              <td className="text-right">
                <button className="text-xs text-slate-600 hover:text-rose-400" onClick={() => { if (window.confirm(t('ranking.deleteConfirm'))) onDelete(r.echo.id) }}>{t('ranking.delete')}</button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
