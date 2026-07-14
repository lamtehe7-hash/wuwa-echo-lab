import type { CharacterProfile, LoadoutResult } from '../types'
import { mainEchoesFor } from '../data/mainEchoes'
import { SONATA_BY_ID } from '../data/sonata'
import { loadoutDamage } from '../engine/damage'
import { setBonusBreakdown } from '../engine/solver'
import { exportLoadoutCard } from '../exportLoadoutCard'
import { useT, useTMessage } from '../i18n'
import EchoCard from './EchoCard'

// Hiển thị bộ 5 tối ưu do solver trả về

export default function LoadoutView({ result, profile, compareTotal = null, onPin }: {
  result: LoadoutResult | null
  profile: CharacterProfile
  /** Điểm của "bộ hiện tại" đã ghi nhớ — hiện delta ▲/▼ cạnh tổng điểm (C1, pattern GO) */
  compareTotal?: number | null
  /** Có mặt → hiện nút "Đặt làm bộ hiện tại" ở chân kết quả */
  onPin?: () => void
}) {
  const t = useT()
  const tm = useTMessage()
  if (!result) {
    return <p className="p-3 text-sm text-slate-500">{t('loadout.empty')}</p>
  }
  const delta = compareTotal !== null ? result.total - compareTotal : null
  const setList = Object.entries(result.setCounts).map(([id, n]) => `${SONATA_BY_ID[id]?.name ?? id} ×${n}`).join(', ')
  const setBreakdown = setBonusBreakdown(result.setCounts, profile).filter((e) => e.statScore > 0.05 || e.prefBonus > 0)
  const dmg = loadoutDamage(result.echoes.map((s) => s.echo), profile)
  // Main echo đề cử (research/main-echo.md): bộ solver có chứa echo đề cử nào không?
  const recs = mainEchoesFor(profile.id)
  const loadoutNames = new Set(result.echoes.map((s) => s.echo.name?.trim().toLowerCase()).filter(Boolean))
  const usedRec = recs.find((r) => loadoutNames.has(r.echo.trim().toLowerCase()))
  return (
    <div className="space-y-2 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold text-emerald-300">
          {t('loadout.title', { layout: result.layout.join('-'), cost: result.totalCost })}
        </div>
        <div className="flex items-baseline gap-2">
          {delta !== null && (
            <span
              className={`font-mono text-sm ${delta > 0.05 ? 'text-emerald-400' : delta < -0.05 ? 'text-rose-400' : 'text-slate-500'}`}
              title={t('equip.deltaTip')}
            >
              {delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '＝'} {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          )}
          <span className="font-mono text-lg text-emerald-200">{t('loadout.points', { n: result.total.toFixed(1) })}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1 text-xs text-slate-400">
        <span>{t('loadout.summary', { sub: result.subScore.toFixed(1), bonus: result.setBonusScore.toFixed(0) })}</span>
        <span>{' · '}{t('loadout.erFromEcho', { er: result.erGained.toFixed(1) })}</span>
        <span>{' · '}{t('loadout.setPrefix')}: {setList}</span>
      </div>
      {setBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500" title={t('loadout.setBonusTip')}>
          {setBreakdown.map((e) => (
            <span key={e.setId}>
              {SONATA_BY_ID[e.setId]?.name ?? e.setId} ×{e.n}:{' '}
              <span className="font-mono text-slate-400">+{e.statScore.toFixed(1)}</span>
              {e.prefBonus > 0 && <span className="text-amber-400"> ⭐+{e.prefBonus}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="text-xs text-slate-400" title={t('loadout.damageTip')}>
        ⚔ {t('loadout.damageLabel')}: <span className="cursor-help font-mono text-amber-300">×{dmg.multiplier.toFixed(2)}</span>
      </div>
      {recs.length > 0 && (
        usedRec ? (
          <div className="text-xs text-emerald-400" title={usedRec.reason}>{t('mainEcho.inLoadout')}</div>
        ) : (
          <div className="text-xs text-amber-400" title={recs[0].reason}>{t('mainEcho.consider', { echo: recs[0].echo })}</div>
        )
      )}
      {/* Bộ 5 hiển thị dạng card in-game (grid 5 cột trên màn rộng, như hàng echo đang đeo) */}
      <div className="grid items-start gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {result.echoes.map((s) => (
          <EchoCard
            key={s.echo.id}
            echo={s.echo}
            compact
            profile={profile}
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          title={t('loadout.exportTip')}
          onClick={() => void exportLoadoutCard(result, profile)}
        >{t('loadout.exportPng')}</button>
        {onPin && (
          <button
            type="button"
            className="rounded border border-sky-800 px-2 py-1 text-xs text-sky-300 hover:bg-sky-950/60"
            onClick={onPin}
          >{t('equip.pin')}</button>
        )}
      </div>
    </div>
  )
}
