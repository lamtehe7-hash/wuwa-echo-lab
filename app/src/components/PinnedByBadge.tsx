import { ELEMENT_COLOR } from '../data/elementColors'
import { useT } from '../i18n'

// Task 60/U7: "Đang dùng bởi X" — nhãn THUẦN (span, KHÔNG interactive) nên dùng an toàn cả bên
// trong bench-stash <button> (button lồng button = HTML lỗi). owners đã được LỌC bỏ nhân vật đang
// xem ở nơi gọi (giống BestOwnerBadge nhận owners tính sẵn). 1 echo có thể ghim bởi nhiều nhân vật.
// variant 'icon' = chỗ chật (chân EchoCard lưới): chỉ glyph 📌 + số, title liệt kê đủ tên.
// variant 'chip' = chỗ rộng (dòng meta bảng + chân bench-stash): dot nguyên tố + tên (+n nữa).

export interface PinnedOwner {
  id: string
  name: string
  element: string
}

export default function PinnedByBadge({ owners, variant = 'chip' }: {
  owners: PinnedOwner[]
  variant?: 'icon' | 'chip'
}) {
  const t = useT()
  if (owners.length === 0) return null
  const title = t('pinby.tip', { names: owners.map((o) => o.name).join(' · ') })

  if (variant === 'icon') {
    return (
      <span className="inline-flex items-center text-[10px] text-slate-400" title={title}>
        📌{owners.length > 1 && <span className="ml-0.5">{owners.length}</span>}
      </span>
    )
  }

  const first = owners[0]
  return (
    <span
      className="inline-flex max-w-[120px] items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300"
      title={title}
    >
      📌
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ELEMENT_COLOR[first.element as keyof typeof ELEMENT_COLOR] }} />
      <span className="truncate">{first.name}</span>
      {owners.length > 1 && <span className="shrink-0 text-slate-500">{t('pinby.more', { n: owners.length - 1 })}</span>}
    </span>
  )
}
