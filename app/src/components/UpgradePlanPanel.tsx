import { useMemo, useState } from 'react'
import type { Echo } from '../types'
import type { UpgradeQueueRow } from '../engine/insights'
import { SONATA_BY_ID } from '../data/sonata'
import { echoDisplayName, findEchoInfo } from '../data/echoIndex'
import { iconUrl } from '../data/iconAssets'
import BestOwnerBadge from './BestOwnerBadge'
import { formatNum, useLang, useT } from '../i18n'

// F3+F6 GỘP (task 72, spec designer 16/07): "Kế hoạch nâng cấp" — panel <details> đóng, tab Kho,
// NGAY DƯỚI CleanupPanel (dọn rác trước → đầu tư sau). Danh sách top-10 echo đáng đổ EXP/Tuner
// theo gainPerTuner (engine upgradeQueue); nhập ngân sách Tuner 5★ (F6) → lọc 5★ + vạch cắt
// tại điểm hết ngân sách (Tuner đúng bậc — trộn bậc sẽ tính sai).

const TOP_N = 10

interface Props {
  /** upgradeQueue(echoes, bestOwnersByEcho) — TOÀN BỘ đã sort (panel tự cắt top-10) */
  rows: UpgradeQueueRow[]
  onJump: (id: string) => void
  onEdit: (echo: Echo) => void
}

export default function UpgradePlanPanel({ rows, onJump, onEdit }: Props) {
  const t = useT()
  const { lang } = useLang()
  const [budgetRaw, setBudgetRaw] = useState('')
  const budget = Math.max(0, Math.floor(Number(budgetRaw) || 0))

  // Ngân sách bật → chỉ echo 5★ (Tuner đúng bậc); walk tích luỹ tunersNeeded tìm điểm cắt
  const shown = useMemo(() => {
    const base = budget > 0 ? rows.filter((r) => r.echo.rarity === 5) : rows
    return base.slice(0, TOP_N)
  }, [rows, budget])
  const { cutoff, affordable, gainSum, leftover } = useMemo(() => {
    if (budget <= 0) return { cutoff: shown.length, affordable: 0, gainSum: 0, leftover: 0 }
    let spent = 0
    let k = 0
    let gain = 0
    for (const r of shown) {
      if (spent + r.potential.tunersNeeded > budget) break
      spent += r.potential.tunersNeeded
      gain += r.evGain
      k++
    }
    return { cutoff: k, affordable: k, gainSum: gain, leftover: budget - spent }
  }, [shown, budget])

  const fmtN = (n: number) => formatNum(lang, n)

  return (
    <details className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        📈 {t('upgrade.planTitle')}
        <span className="ml-2 text-xs font-normal text-slate-500">
          {t('inv.count', { shown: shown.length, total: rows.length })}
        </span>
      </summary>

      <div className="mt-2 space-y-2 text-xs">
        <p className="text-slate-500">{t('upgrade.planSubtitle')}</p>

        <label className="flex flex-wrap items-center gap-2 text-slate-400">
          {t('upgrade.budgetLabel')}
          <input
            type="number" min={0} step={10} value={budgetRaw}
            aria-label={t('upgrade.budgetLabel')}
            onChange={(e) => setBudgetRaw(e.target.value)}
            className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1"
          />
          <span className="text-[10px] text-slate-500">{t('upgrade.budgetHelp')}</span>
        </label>

        {budget > 0 && (
          <p className="text-emerald-400">{t('upgrade.budgetResult', { k: affordable, gain: gainSum.toFixed(1) })}</p>
        )}

        {shown.length > 0 && (
          <ul className="space-y-1 rounded border border-slate-800 bg-slate-950/40 p-1.5">
            {shown.map((r, i) => {
              const info = findEchoInfo(r.echo.name)
              const dimmed = budget > 0 && i >= cutoff
              return (
                <li key={r.echo.id} className={dimmed ? 'opacity-50' : ''}>
                  {budget > 0 && i === cutoff && (
                    <p className="mb-1 text-center text-[10px] text-amber-400">
                      {t('upgrade.budgetCutoff', { left: leftover })}
                    </p>
                  )}
                  <span className="flex flex-wrap items-center gap-1.5">
                    {info ? (
                      <img
                        src={iconUrl(info.icon)} alt="" loading="lazy" referrerPolicy="no-referrer"
                        className="h-6 w-6 shrink-0 rounded-full border border-slate-700 bg-slate-800 object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <span className="h-6 w-6 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-slate-200">{echoDisplayName(r.echo)}</span>
                      <span className="text-slate-500"> · cost {r.echo.cost} · {SONATA_BY_ID[r.echo.set]?.name}</span>
                    </span>
                    <BestOwnerBadge owners={[r.owner]} onJump={onJump} variant="card" />
                    <span className="shrink-0 font-mono text-emerald-400">+{r.evGain.toFixed(1)}</span>
                    <span className="shrink-0 text-slate-500">
                      {t('upgrade.rowCost', { exp: fmtN(r.potential.expNeeded), tuners: r.potential.tunersNeeded })}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-slate-500 underline decoration-dotted hover:text-sky-300"
                      onClick={() => onEdit(r.echo)}
                    >{t('ranking.edit')}</button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}
