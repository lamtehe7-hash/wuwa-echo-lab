import type { CharacterProfile } from '../types'
import { ELEMENT_COLOR } from '../data/elementColors'
import { ROLE_BADGE } from './CharacterPicker'
import { usePanelOpen } from './usePanelOpen'
import { useT } from '../i18n'

// Task 60/U6: "Nhân vật đã ghim bộ" — tổng quan mọi nhân vật có bộ hiện tại đã ghi nhớ (equipped).
// <details open> như SetFarmPriority (user thu gọn được). Mỗi hàng LÀ <button> (focusable/bàn phím)
// mở tab Tối ưu cho nhân vật đó qua onJump — hành vi ở title, KHÔNG đưa chữ "Tối ưu" vào textContent
// (RosterPanel/khối roster luôn mounted → clickByText của e2e quét mọi button). Thứ tự theo roster
// gốc (KHÔNG sort theo điểm — đây là khối trạng thái, không phải bảng xếp hạng; điểm đổi mỗi lần
// chỉnh trọng số sẽ làm hàng nhảy). App tính sẵn điểm (scoreLoadout), component thuần render.

export interface PinnedRow {
  profile: CharacterProfile
  /** Điểm bộ ghim (scoreLoadout) — null nếu mọi echo ghim đã bị xoá khỏi kho */
  total: number | null
  /** Số echo trong bộ ghim không còn trong kho */
  missing: number
}

export default function PinnedOverview({ rows, onJump }: {
  rows: PinnedRow[]
  onJump: (id: string) => void
}) {
  const t = useT()
  const panel = usePanelOpen('pinned', true) // P6: nhớ mở/đóng — khối trạng thái nên mặc định MỞ

  return (
    <details {...panel} className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        📌 {t('pinned.title')}
        <span className="ml-2 text-xs font-normal text-slate-500">{t('pinned.subtitle', { n: rows.length })}</span>
      </summary>
      <ul className="mt-2 space-y-1">
        {rows.map(({ profile, total, missing }) => (
          <li key={profile.id}>
            <button
              type="button"
              className="group flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              title={t('pinned.openTip')}
              onClick={() => onJump(profile.id)}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ELEMENT_COLOR[profile.element] }} />
              <span className="min-w-0 flex-1 truncate text-slate-200 group-hover:text-sky-300">
                {profile.name}
                <span className="ml-1.5 text-[10px] text-slate-500">{ROLE_BADGE[profile.archetype] ?? ''}</span>
              </span>
              {missing > 0 && (
                <span
                  className="shrink-0 rounded bg-amber-950/40 px-1.5 py-0.5 text-[10px] text-amber-400"
                  title={t('equip.missing', { n: missing })}
                >
                  {t('pinned.missingChip', { n: missing })}
                </span>
              )}
              <span className="shrink-0 font-mono text-xs text-sky-300">
                {total !== null ? t('loadout.points', { n: total.toFixed(1) }) : '—'}
              </span>
              {/* Tín hiệu "bấm được" (mở tab Tối ưu) — chevron trang trí, không đưa chữ vào textContent */}
              <span aria-hidden className="shrink-0 text-slate-600 group-hover:text-sky-300">›</span>
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
