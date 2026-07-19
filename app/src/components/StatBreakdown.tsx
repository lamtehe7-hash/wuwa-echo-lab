import type { BuildContext, CharacterProfile, Echo, WeightKey } from '../types'
import { finalStatBreakdown } from '../engine/damage'
import { SUBSTATS } from '../data/substats'
import InfoTip from './InfoTip'
import { useT } from '../i18n'

// Bảng cộng dồn chỉ số CUỐI theo nguồn: base + echo + khác = tổng. '·' = 0 (đỡ nhiễu).
// B5 (ui-redesign): 7 cột → 5 — Vũ khí+Forte+Buff gộp cột "Khác" (tách nguồn ở title từng ô +
// ⓘ header); hết scroll ngang trong cột hẹp, header "= Tổng" đủ chỗ. Bỏ overflow-x-auto để
// popover ⓘ không bị cắt (gotcha HANDOVER §5).

const EXTRA_LABEL: Partial<Record<WeightKey, string>> = { elementDmg: 'Element DMG%', healingBonus: 'Healing Bonus%' }
function labelOf(stat: WeightKey): string {
  return EXTRA_LABEL[stat] ?? SUBSTATS[stat as keyof typeof SUBSTATS]?.label ?? stat
}
const fmt = (n: number) => (n === 0 ? '·' : n.toFixed(1))

export default function StatBreakdown({ echoes, profile, ctx, activeSet, activeSetPieces, defaultOpen = false }: {
  echoes: Echo[]
  profile: CharacterProfile
  ctx?: BuildContext
  activeSet?: string
  /** Số mảnh activeSet đang đeo — buff set có ngưỡng pieces chỉ tự bật khi đủ (review 19/07) */
  activeSetPieces?: number
  defaultOpen?: boolean
}) {
  const t = useT()
  const rows = finalStatBreakdown(echoes, profile, ctx, activeSet, activeSetPieces)
  if (rows.length === 0) return null
  return (
    <details open={defaultOpen} className="rounded border border-slate-800 bg-slate-900/40">
      <summary className="cursor-pointer select-none px-2 py-1 text-xs text-slate-300">
        📊 {t('statbd.title')}
      </summary>
      <div className="px-2 pb-2">
        <table className="w-full text-right text-xs tabular-nums">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 text-left font-medium">{t('statbd.stat')}</th>
              <th className="px-1.5 font-medium text-slate-500">{t('statbd.base')}</th>
              <th className="px-1.5 font-medium text-emerald-300">{t('statbd.echo')}</th>
              <th className="px-1.5 font-medium text-sky-300">
                <span className="inline-flex items-center">
                  {t('statbd.other')}
                  <InfoTip label={t('statbd.otherTip')}>{t('statbd.otherTip')}</InfoTip>
                </span>
              </th>
              <th className="pl-2 font-semibold text-slate-200">= {t('statbd.total')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const other = r.weapon + r.forte + r.buff
              const split = `${t('statbd.weapon')} ${r.weapon.toFixed(1)} · ${t('statbd.forte')} ${r.forte.toFixed(1)} · ${t('statbd.buff')} ${r.buff.toFixed(1)}`
              return (
                <tr key={r.stat} className="border-t border-slate-800/60">
                  <td className="py-0.5 text-left text-slate-300">{labelOf(r.stat)}</td>
                  <td className={`px-1.5 ${r.base === 0 ? 'text-slate-700' : 'text-slate-500'}`}>{fmt(r.base)}</td>
                  <td className={`px-1.5 ${r.echo === 0 ? 'text-slate-700' : 'text-emerald-300'}`}>{fmt(r.echo)}</td>
                  <td className={`px-1.5 ${other === 0 ? 'text-slate-700' : 'text-sky-300'}`} title={split}>{fmt(other)}</td>
                  <td className="pl-2 font-mono font-semibold text-slate-100">
                    {r.total.toFixed(1)}{r.capped && <span className="text-rose-400" title={t('statbd.capped')}> ⚠</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}
