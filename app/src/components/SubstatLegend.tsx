import { SUBSTAT_TIERS } from '../engine/substatRating'
import { useT } from '../i18n'

// Chú giải thang màu đánh giá substat (8 bậc) — bám theo ảnh tham chiếu user gửi.
// Hiển thị ở tab Kho (lưới/bảng) và tab Tối ưu để người dùng đọc được màu trên card.

export default function SubstatLegend({ className = '' }: { className?: string }) {
  const t = useT()
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 ${className}`}
      title={t('tier.legendHint')}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t('tier.legendTitle')}</span>
      {SUBSTAT_TIERS.map((m) => (
        <span key={m.tier} className="flex items-center gap-1 text-[11px] text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
          {t(m.key)}
        </span>
      ))}
    </div>
  )
}
