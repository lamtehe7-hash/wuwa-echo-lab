import type { CharacterProfile, SubstatKey } from '../types'
import { SUBSTATS, SUBSTAT_KEYS } from '../data/substats'
import type { ProfileOverride } from '../store'
import { useT } from '../i18n'

// Chỉnh trọng số substat + erTarget cho nhân vật đang chọn (lưu override, preset gốc giữ nguyên)

interface Props {
  base: CharacterProfile     // preset gốc (chưa merge)
  merged: CharacterProfile   // đã merge override — giá trị hiển thị
  override?: ProfileOverride
  onChange: (ov: ProfileOverride | undefined) => void
}

export default function WeightEditor({ base, merged, override, onChange }: Props) {
  const t = useT()
  const setWeight = (stat: SubstatKey, v: number) => {
    onChange({ ...override, weights: { ...override?.weights, [stat]: v } })
  }

  const hasOverride = override && (Object.keys(override.weights ?? {}).length > 0 || override.erTarget !== undefined)

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">{t('weights.title', { name: merged.name })}</span>
        {hasOverride && (
          <button className="text-xs text-amber-400 hover:text-amber-300" onClick={() => onChange(undefined)}>
            {t('weights.reset')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {SUBSTAT_KEYS.map((k) => {
          const v = merged.weights[k] ?? 0
          const changed = (override?.weights?.[k] !== undefined) && override.weights[k] !== (base.weights[k] ?? 0)
          return (
            <label key={k} className={`flex items-center justify-between gap-2 text-xs ${v > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
              <span className={changed ? 'text-amber-300' : ''}>{SUBSTATS[k].label}</span>
              <input
                type="number" min={0} max={1} step={0.05} value={v}
                className="w-16 rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-right"
                onChange={(e) => setWeight(k, Math.max(0, Math.min(1, Number(e.target.value))))}
              />
            </label>
          )
        })}
      </div>
      <label className="flex items-center justify-between gap-2 text-xs text-slate-300">
        <span>{t('weights.erTarget')}</span>
        <input
          type="number" min={100} max={300} step={5}
          value={merged.erTarget ?? ''}
          placeholder="—"
          className="w-16 rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-right"
          onChange={(e) => onChange({ ...override, erTarget: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </label>
      <p className="text-[11px] leading-snug text-slate-600">
        {t('weights.help')}
      </p>
    </div>
  )
}
