import type { BuildContext, CharacterProfile, Echo, WeightKey } from '../types'
import { finalStatBreakdown } from '../engine/damage'
import { SUBSTATS } from '../data/substats'
import { useT } from '../i18n'

// Bảng cộng dồn chỉ số CUỐI theo nguồn: base + vũ khí + forte + echo + buff = tổng.
// Đúng mô hình người chơi ("24.3 + 34.8 + 8 + 5 + 20 = 92.1"). '·' = 0 (đỡ nhiễu).

const EXTRA_LABEL: Partial<Record<WeightKey, string>> = { elementDmg: 'Element DMG%', healingBonus: 'Healing Bonus%' }
function labelOf(stat: WeightKey): string {
  return EXTRA_LABEL[stat] ?? SUBSTATS[stat as keyof typeof SUBSTATS]?.label ?? stat
}
const fmt = (n: number) => (n === 0 ? '·' : n.toFixed(1))

export default function StatBreakdown({ echoes, profile, ctx, activeSet, defaultOpen = false }: {
  echoes: Echo[]
  profile: CharacterProfile
  ctx?: BuildContext
  activeSet?: string
  defaultOpen?: boolean
}) {
  const t = useT()
  const rows = finalStatBreakdown(echoes, profile, ctx, activeSet)
  if (rows.length === 0) return null
  const cols: { key: 'base' | 'weapon' | 'forte' | 'echo' | 'buff'; label: string; cls: string }[] = [
    { key: 'base', label: t('statbd.base'), cls: 'text-slate-500' },
    { key: 'weapon', label: t('statbd.weapon'), cls: 'text-sky-300' },
    { key: 'forte', label: t('statbd.forte'), cls: 'text-violet-300' },
    { key: 'echo', label: t('statbd.echo'), cls: 'text-emerald-300' },
    { key: 'buff', label: t('statbd.buff'), cls: 'text-amber-300' },
  ]
  return (
    <details open={defaultOpen} className="rounded border border-slate-800 bg-slate-900/40">
      <summary className="cursor-pointer select-none px-2 py-1 text-xs text-slate-300">
        📊 {t('statbd.title')}
      </summary>
      <div className="overflow-x-auto px-2 pb-2">
        <table className="w-full text-right text-[11px] tabular-nums">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 text-left font-medium">{t('statbd.stat')}</th>
              {cols.map((c) => <th key={c.key} className={`px-1.5 font-medium ${c.cls}`}>{c.label}</th>)}
              <th className="pl-2 font-semibold text-slate-200">= {t('statbd.total')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.stat} className="border-t border-slate-800/60">
                <td className="py-0.5 text-left text-slate-300">{labelOf(r.stat)}</td>
                {cols.map((c) => <td key={c.key} className={`px-1.5 ${r[c.key] === 0 ? 'text-slate-700' : c.cls}`}>{fmt(r[c.key])}</td>)}
                <td className="pl-2 font-mono font-semibold text-slate-100">
                  {r.total.toFixed(1)}{r.capped && <span className="text-rose-400" title={t('statbd.capped')}> ⚠</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
