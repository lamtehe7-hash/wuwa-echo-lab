import { useT } from '../i18n'

// F14 (task 64): nút ⚓ "neo" 1 echo vào bộ solve của nhân vật đang chọn (KHÁC 📌 equipped/"ghim").
// Màu amber khi active (như nút khoá 🔒 — cùng nhóm "user ép buộc thủ công"). `blockReason` (đã dịch)
// != null → chặn neo thêm (đủ 5 / vượt cost cap...); vẫn cho BỎ neo khi đã neo.

export default function AnchorToggle({
  anchored,
  blockReason,
  onToggle,
}: {
  anchored: boolean
  /** Lý do (đã dịch) không cho neo thêm — chỉ áp khi CHƯA neo; null = cho neo */
  blockReason?: string | null
  onToggle: () => void
}) {
  const t = useT()
  const disabled = !anchored && !!blockReason
  const title = anchored ? t('anchor.toggleOff') : blockReason || t('anchor.toggleOn')
  // ⚓ là emoji → CSS color KHÔNG đổi màu glyph; dùng NỀN amber (ring) làm dấu "đã neo" + opacity cho
  // enable/disable (độc lập màu emoji). Nếu không active thì mờ để không lấn át điểm/badge cạnh nó.
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={anchored}
      aria-label={title}
      title={title}
      className={`rounded px-0.5 text-[11px] leading-none ${
        anchored
          ? 'bg-amber-500/30 ring-1 ring-amber-500/70'
          : disabled
            ? 'cursor-not-allowed opacity-25'
            : 'opacity-60 ring-1 ring-slate-700 hover:opacity-100 hover:ring-amber-500/60'
      }`}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
    >
      ⚓
    </button>
  )
}
