import type { SonataSet } from '../types'
import { SONATA_SETS } from '../data/sonata'
import { useT } from '../i18n'

// Dropdown chọn set echo để ÉP solver (App tab Tối ưu + mỗi member RosterPanel).
// Set đề cử của nhân vật (profile.preferredSets) được gắn ⭐ và đưa lên nhóm đầu;
// vẫn chọn được mọi set khác. value '' = tự động (solver tự cân mọi set).

interface Props {
  value: string
  onChange: (v: string) => void
  /** Set đề cử cho nhân vật đang chọn (thứ tự = ưu tiên) — hiện ⭐ + lên đầu */
  preferred: string[]
  className?: string
}

const byName = (a: SonataSet, b: SonataSet) => a.name.localeCompare(b.name)

export default function SetPicker({ value, onChange, preferred, className }: Props) {
  const t = useT()
  const prefSet = new Set(preferred)
  const rec = preferred
    .map((id) => SONATA_SETS.find((s) => s.id === id))
    .filter((s): s is SonataSet => s !== undefined)
  const others = SONATA_SETS.filter((s) => !prefSet.has(s.id)).sort(byName)

  return (
    <select
      className={className ?? 'rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm'}
      value={value}
      title={t('setpick.tip')}
      aria-label={t('setpick.label')}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{t('setpick.auto')}</option>
      {rec.length > 0 && (
        <optgroup label={t('setpick.recommended')}>
          {rec.map((s) => (
            <option key={s.id} value={s.id}>⭐ {s.name}</option>
          ))}
        </optgroup>
      )}
      <optgroup label={t('setpick.others')}>
        {others.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </optgroup>
    </select>
  )
}
