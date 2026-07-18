import { useMemo } from 'react'
import type { CharacterProfile } from '../types'
import { ELEMENT_COLOR } from '../data/elementColors'
import { SONATA_SETS } from '../data/sonata'
import { setFarmSummary } from '../engine/insights'
import { usePanelOpen } from './usePanelOpen'
import { useT } from '../i18n'

// F2 (task 58): "set nào nên farm tiếp cho cả roster" — KHÔNG cần kho echo (hiện cả khi kho rỗng).
// <details> mặc định đóng (pattern StatBreakdown). Set chỉ tính cho nhân vật khi nằm trong top-3
// set tốt nhất của CHÍNH họ (gain tuyệt đối thoái hoá — xem chú thích setFarmSummary).

export default function SetFarmPriority({ profiles }: { profiles: CharacterProfile[] }) {
  const t = useT()
  const rows = useMemo(() => setFarmSummary(SONATA_SETS, profiles, 3), [profiles])
  const panel = usePanelOpen('setfarm') // P6: nhớ mở/đóng

  return (
    <details {...panel} className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        🗺 {t('farm.title')}
        <span className="ml-2 text-xs font-normal text-slate-500">{t('farm.subtitle')}</span>
      </summary>
      <ul className="mt-2 space-y-1 text-xs">
        {rows.map(({ def, beneficiaries }) => (
          <li
            key={def.id}
            className="flex flex-wrap items-center gap-1.5"
            title={beneficiaries.slice(0, 5).map((b) => b.profile.name).join(' · ')}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: def.element ? ELEMENT_COLOR[def.element] : '#64748b' }}
            />
            <span className="font-medium text-slate-200">{def.name}</span>
            {/* Không icon ⭐: không có legend giải thích trong khối này (nguyên tắc app: icon luôn kèm chú giải) */}
            <span className="text-slate-500">
              — {t('farm.row', { n: beneficiaries.length, name: beneficiaries[0].profile.name })}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
