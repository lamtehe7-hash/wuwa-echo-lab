import type { CharacterProfile, LoadoutResult } from '../types'
import { SONATA_BY_ID } from '../data/sonata'
import { loadoutDamage } from '../engine/damage'
import { useT, useTMessage } from '../i18n'
import EchoCard from './EchoCard'

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
      {/* Bộ 5 hiển thị dạng card in-game (grid 5 cột trên màn rộng, như hàng echo đang đeo) */}
      <div className="grid items-start gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {result.echoes.map((s) => (
          <EchoCard
            key={s.echo.id}
            echo={s.echo}
            compact
            footer={
              <span
                className={`rounded px-1 py-0.5 font-mono text-[10px] font-semibold ${s.mainStatFit ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-950/60 text-rose-300'}`}
                title={`substat ${s.score.toFixed(1)} + main ${s.mainScore.toFixed(1)}`}
              >{s.totalScore.toFixed(1)}</span>
            }
          />
        ))}
      </div>
      {result.note.map((n, i) => <p key={i} className="text-xs text-amber-400">⚠ {tm(n)}</p>)}
    </div>
  )
}
