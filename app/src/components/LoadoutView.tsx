import type { CharacterProfile, LoadoutResult } from '../types'
import { MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { loadoutDamage } from '../engine/damage'
import { useT, useTMessage } from '../i18n'

// Hiển thị bộ 5 tối ưu do solver trả về

export default function LoadoutView({ result, profile }: { result: LoadoutResult | null; profile: CharacterProfile }) {
  const t = useT()
  const tm = useTMessage()
  if (!result) {
    return <p className="p-3 text-sm text-slate-500">{t('loadout.empty')}</p>
  }
  const setList = Object.entries(result.setCounts).map(([id, n]) => `${SONATA_BY_ID[id]?.name ?? id} ×${n}`).join(', ')
  const dmg = loadoutDamage(result.echoes.map((s) => s.echo), profile)
  return (
    <div className="space-y-2 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold text-emerald-300">
          {t('loadout.title', { layout: result.layout.join('-'), cost: result.totalCost })}
        </div>
        <div className="font-mono text-lg text-emerald-200">{t('loadout.points', { n: result.total.toFixed(1) })}</div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1 text-xs text-slate-400">
        <span>{t('loadout.summary', { sub: result.subScore.toFixed(1), bonus: result.setBonusScore.toFixed(0) })}</span>
        <span>{' · '}{t('loadout.erFromEcho', { er: result.erGained.toFixed(1) })}</span>
        <span>{' · '}{t('loadout.setPrefix')}: {setList}</span>
      </div>
      <div className="text-xs text-slate-400" title={t('loadout.damageTip')}>
        ⚔ {t('loadout.damageLabel')}: <span className="cursor-help font-mono text-amber-300">×{dmg.multiplier.toFixed(2)}</span>
      </div>
      <ol className="space-y-1">
        {result.echoes.map((s) => (
          <li key={s.echo.id} className="flex justify-between rounded bg-slate-900/70 px-2 py-1 text-sm">
            <span>
              <span className="mr-2 inline-block w-10 text-center text-xs text-slate-500">c{s.echo.cost}</span>
              <span className="font-medium">{s.echo.name || SONATA_BY_ID[s.echo.set]?.name}</span>
              <span className={`ml-2 text-xs ${s.mainStatFit ? 'text-slate-400' : 'text-rose-400'}`}>{MAINSTAT_LABELS[s.echo.mainStat]}</span>
            </span>
            <span className="font-mono text-slate-300" title={`substat ${s.score.toFixed(1)} + main ${s.mainScore.toFixed(1)}`}>{s.totalScore.toFixed(1)}</span>
          </li>
        ))}
      </ol>
      {result.note.map((n, i) => <p key={i} className="text-xs text-amber-400">⚠ {tm(n)}</p>)}
    </div>
  )
}
