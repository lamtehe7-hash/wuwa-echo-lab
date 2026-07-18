import { useMemo, useState } from 'react'
import type { Echo } from '../types'
import { tunerBudgetPlan, type UpgradeQueueRow } from '../engine/insights'
import BestOwnerBadge from './BestOwnerBadge'
import EchoLine from './EchoLine'
import { usePanelOpen } from './usePanelOpen'
import { useFmtN, useT } from '../i18n'

// F3+F6 GỘP (task 72, spec designer 16/07): "Kế hoạch nâng cấp" — panel <details> đóng, tab Kho,
// NGAY DƯỚI CleanupPanel (dọn rác trước → đầu tư sau). Danh sách top-10 echo đáng đổ EXP/Tuner
// (engine upgradeQueue — nhóm theo bậc, trong bậc theo gainPerTuner); nhập ngân sách Tuner 5★
// (F6) → lọc 5★ + walk engine `tunerBudgetPlan` trên DANH SÁCH ĐẦY ĐỦ (slice-trước-walk làm
// budget lớn báo sai — review 16/07 #3), hiển thị vẫn cắt top-10.

const TOP_N = 10

interface Props {
  /** upgradeQueue(echoes, bestOwnersByEcho) — TOÀN BỘ đã sort (panel tự cắt top-10) */
  rows: UpgradeQueueRow[]
  onJump: (id: string) => void
  onEdit: (echo: Echo) => void
}

export default function UpgradePlanPanel({ rows, onJump, onEdit }: Props) {
  const t = useT()
  const fmtN = useFmtN()
  const [budgetRaw, setBudgetRaw] = useState('')
  const budget = Math.max(0, Math.floor(Number(budgetRaw) || 0))

  // Ngân sách bật → chỉ echo 5★ (Tuner đúng bậc); walk trên fiveStar ĐẦY ĐỦ rồi mới cắt hiển thị
  const fiveStar = useMemo(() => rows.filter((r) => r.echo.rarity === 5), [rows])
  const shown = useMemo(
    () => (budget > 0 ? fiveStar : rows).slice(0, TOP_N),
    [rows, fiveStar, budget],
  )
  const { cutoff, gainSum, leftover } = useMemo(
    () => (budget > 0 ? tunerBudgetPlan(fiveStar, budget) : { cutoff: shown.length, gainSum: 0, leftover: 0 }),
    [fiveStar, budget, shown.length],
  )

  const panel = usePanelOpen('upgrade') // P6: nhớ mở/đóng

  return (
    <details {...panel} className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        📈 {t('upgrade.planTitle')}
        <span className="ml-2 text-xs font-normal text-slate-500">
          {t('inv.count', { shown: shown.length, total: rows.length })}
        </span>
      </summary>

      <div className="mt-2 space-y-2 text-xs">
        <p className="text-slate-500">{t('upgrade.planSubtitle')}</p>

        {/* P3 (ui-redesign): ô ngân sách có đơn vị + luật lọc 5★ in rõ ngay dưới */}
        <div className="space-y-1">
          <label className="flex flex-wrap items-center gap-2 text-slate-400">
            {t('upgrade.budgetLabel')}
            <span className="flex items-center gap-1.5">
              <input
                type="number" min={0} step={10} value={budgetRaw}
                aria-label={t('upgrade.budgetLabel')}
                onChange={(e) => setBudgetRaw(e.target.value)}
                className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1"
              />
              {/* đơn vị — thuật ngữ game, không dịch (như ROLE_BADGE) */}
              <span className="text-slate-400">Tuner</span>
            </span>
          </label>
          <p className="text-xs text-slate-500">{t('upgrade.budgetRule')}</p>
        </div>

        {budget > 0 && (
          <p className="text-emerald-400">{t('upgrade.budgetResult', { k: cutoff, gain: gainSum.toFixed(1) })}</p>
        )}

        {shown.length > 0 && (
          <ul className="space-y-1 rounded border border-slate-800 bg-slate-950/40 p-1.5">
            {shown.map((r, i) => {
              const dimmed = budget > 0 && i >= cutoff
              return (
                <li key={r.echo.id} className={dimmed ? 'opacity-50' : ''}>
                  {budget > 0 && i === cutoff && (
                    <p className="mb-1 text-center text-xs text-amber-400">
                      {t('upgrade.budgetCutoff', { left: leftover })}
                    </p>
                  )}
                  <span className="flex flex-wrap items-center gap-1.5">
                    <EchoLine echo={r.echo} />
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
