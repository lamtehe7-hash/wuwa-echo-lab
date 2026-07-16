import { useEffect, useRef, useState } from 'react'
import type { CharacterProfile, ScoredEcho } from '../types'
import { MAINSTAT_LABELS } from '../data/mainstats'
import { SUBSTATS } from '../data/substats'
import { rateSubstat } from '../engine/substatRating'
import { useT } from '../i18n'

// Điểm số bấm được → popover breakdown (research/ui-ux.md B4): thanh đóng góp từng substat
// + dòng main stat + công thức tổng. Thay cho tooltip title= (hover-only, mobile không xem được).

export default function ScoreBadge({ r, variant = 'table', profile }: {
  r: ScoredEcho
  /** 'table' = số to trong ô bảng; 'badge' = chip nhỏ ở chân EchoCard (lưới) */
  variant?: 'table' | 'badge'
  /** Có → tô thanh/giá trị breakdown theo mức đánh giá substat (đồng bộ màu với card) */
  profile?: CharacterProfile
}) {
  const t = useT()
  // Panel dùng position:fixed (toạ độ tính lúc mở) vì bảng nằm trong overflow-x-auto —
  // absolute sẽ bị scroll-container cắt mất. Cuộn trang khi đang mở → đóng (toạ độ hết đúng).
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const open = pos !== null
  const rootRef = useRef<HTMLSpanElement>(null)

  const toggle = () => {
    if (open) { setPos(null); return }
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 256 // = w-64
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    })
  }

  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, { capture: true, passive: true })
    window.addEventListener('resize', close) // toạ độ fixed tính lúc mở — resize làm lệch, đóng luôn (review 16/07)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }, [open])

  const maxWeighted = Math.max(...r.breakdown.map((b) => b.weighted), 0.001)
  // Quy weighted thô về cùng thang điểm chuẩn hoá với r.score (tổng các dòng = score)
  const rawTotal = r.breakdown.reduce((s, b) => s + b.weighted, 0)
  const pts = (w: number) => (rawTotal > 0 ? (w / rawTotal) * r.score : 0)
  const fitCls = r.fitLevel === 1 ? 'text-emerald-400' : r.fitLevel >= 0.6 ? 'text-amber-400' : 'text-rose-400'
  const fitMark = r.fitLevel === 1 ? '✓' : r.fitLevel >= 0.6 ? '～' : '✗'

  return (
    // span (không phải div) để đặt được trong chân EchoCard lẫn ô bảng
    <span ref={rootRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        title={t('breakdown.tip')}
        aria-expanded={open}
        className={
          variant === 'table'
            ? 'cursor-pointer font-mono text-base text-slate-100 underline decoration-slate-600 decoration-dotted underline-offset-4 hover:text-sky-300'
            : 'cursor-pointer rounded bg-slate-800/90 px-1 py-0.5 font-mono text-[10px] font-semibold text-slate-100 hover:bg-slate-700'
        }
        onClick={toggle}
      >{r.totalScore.toFixed(1)}</button>

      {open && (
        <span
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-30 block w-64 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-left shadow-xl shadow-black/50"
        >
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('breakdown.title')}</span>
          {r.breakdown.length === 0 && <span className="block text-xs text-slate-600">{t('card.noSubs')}</span>}
          {r.breakdown.map((b) => {
            const color = profile ? rateSubstat(profile, b.stat, b.value).color : '#38bdf8'
            return (
              <span key={b.stat} className={`mb-1 block ${b.weighted > 0 ? '' : 'opacity-40'}`}>
                <span className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-slate-300">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ backgroundColor: color }} />
                    {SUBSTATS[b.stat].label} {b.value}{SUBSTATS[b.stat].isPct ? '%' : ''}
                  </span>
                  <span className="font-mono text-slate-200">{pts(b.weighted).toFixed(1)}</span>
                </span>
                <span className="mt-0.5 block h-1 overflow-hidden rounded-full bg-slate-800">
                  <span className="block h-full" style={{ width: `${(b.weighted / maxWeighted) * 100}%`, backgroundColor: color }} />
                </span>
              </span>
            )
          })}
          <span className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-slate-800 pt-1.5 text-xs">
            <span className={fitCls}>{fitMark} {MAINSTAT_LABELS[r.echo.mainStat]}</span>
            <span className="font-mono text-amber-200">{r.mainScore.toFixed(1)}</span>
          </span>
          <span className="mt-1 block text-right text-[11px] text-slate-500">
            {t('breakdown.formula', { sub: r.score.toFixed(1), main: r.mainScore.toFixed(1), total: r.totalScore.toFixed(1) })}
          </span>
        </span>
      )}
    </span>
  )
}
