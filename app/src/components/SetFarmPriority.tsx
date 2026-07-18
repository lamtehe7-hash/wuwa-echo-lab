import { useMemo } from 'react'
import type { CharacterProfile } from '../types'
import { ELEMENT_COLOR } from '../data/elementColors'
import { SONATA_SETS } from '../data/sonata'
import { setFarmSummary } from '../engine/insights'
import { IconMap } from './icons'
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
        {/* C4/C2: icon màu nhấn riêng (violet) thay emoji */}
        <IconMap size={15} className="mr-1 inline align-[-2px] text-violet-400" />{t('farm.title')}
        <span className="ml-2 text-xs font-normal text-slate-500">{t('farm.subtitle')}</span>
      </summary>
      {/* P1 (ui-redesign): bảng 3 cột thay chuỗi "— Hợp N nhân vật · tốt nhất: X" lặp — căn thẳng,
          thấy ngay set ưu tiên (rows đã sort theo số người cần); số Cần ≥2 tô amber = ưu tiên cao */}
      <table className="mt-2 w-full text-left text-xs">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-1 pr-2 font-medium">{t('farm.colSet')}</th>
            <th className="w-14 px-2 text-right font-medium">{t('farm.colNeed')}</th>
            <th className="pl-2 font-medium">{t('farm.colBest')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ def, beneficiaries }) => (
            <tr
              key={def.id}
              className="border-t border-slate-800/60"
              title={beneficiaries.slice(0, 5).map((b) => b.profile.name).join(' · ')}
            >
              <td className="py-1 pr-2">
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: def.element ? ELEMENT_COLOR[def.element] : '#64748b' }}
                />
                <span className="font-medium text-slate-200">{def.name}</span>
              </td>
              <td className={`px-2 text-right font-mono tabular-nums ${beneficiaries.length >= 2 ? 'font-semibold text-amber-300' : 'text-slate-300'}`}>
                {beneficiaries.length}
              </td>
              <td className="pl-2 text-slate-300">{beneficiaries[0].profile.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
