import { useEffect, useRef, useState } from 'react'
import type { OwnerFit } from '../engine/insights'
import { ELEMENT_COLOR } from '../data/elementColors'
import { useT } from '../i18n'

// F1 (task 58): "echo này hợp ai nhất" — chip #1 inline, top-2/3 trong popover bấm (không hiện
// sẵn 3 tên, quá dài). Bấm tên → nhảy sang tab Tối ưu của nhân vật đó (App.jumpToChar).
// Popover dùng position:fixed y hệt ScoreBadge — BẮT BUỘC vì ô bảng nằm trong overflow-x-auto.

export default function BestOwnerBadge({ owners, onJump, variant = 'cell' }: {
  owners: OwnerFit[]
  onJump?: (id: string) => void
  /** 'cell' = ô bảng (chip + popover top-3); 'card' = chân EchoCard lưới (chỉ chip #1, title đủ top-3) */
  variant?: 'cell' | 'card'
}) {
  const t = useT()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const open = pos !== null
  const rootRef = useRef<HTMLSpanElement>(null)

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
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }, [open])

  if (owners.length === 0) {
    return variant === 'cell'
      ? <span className="text-slate-600" title={t('ranking.bestOwnerNone')}>—</span>
      : null
  }

  const top = owners[0]
  const chipCls = 'inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-sky-600 hover:text-sky-300'
  const dot = (el: string) => (
    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ELEMENT_COLOR[el as keyof typeof ELEMENT_COLOR] }} />
  )

  if (variant === 'card') {
    // Chân card chật: chỉ #1 + title liệt kê đủ; stopPropagation vì bấm card = mở modal sửa
    return (
      <button
        type="button"
        className={`${chipCls} max-w-[96px]`}
        title={t('card.bestOwnerTip', { name: owners.map((o) => o.profile.name).join(' · ') })}
        onClick={(e) => { e.stopPropagation(); onJump?.(top.profile.id) }}
      >
        {dot(top.profile.element)}
        <span className="truncate">{top.profile.name}</span>
      </button>
    )
  }

  const toggle = () => {
    if (open) { setPos(null); return }
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 224 // = w-56
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    })
  }

  return (
    <span ref={rootRef} className="relative inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={chipCls} title={t('ranking.bestOwnerTip')} onClick={() => onJump?.(top.profile.id)}>
        {dot(top.profile.element)}
        <span className="max-w-[88px] truncate">{top.profile.name}</span>
      </button>
      {owners.length > 1 && (
        <button
          type="button"
          aria-expanded={open}
          className="text-[10px] text-slate-500 hover:text-sky-300"
          onClick={toggle}
        >{t('ranking.bestOwnerMore', { n: owners.length - 1 })}</button>
      )}
      {open && (
        <span
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-30 block w-56 rounded-lg border border-slate-700 bg-slate-900 p-2 text-left shadow-xl shadow-black/50"
        >
          <span className="mb-1 block text-[11px] text-slate-500">{t('ranking.bestOwnerTip')}</span>
          {owners.map((o) => (
            <button
              key={o.profile.id}
              type="button"
              className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs text-slate-200 hover:bg-slate-800"
              onClick={() => { setPos(null); onJump?.(o.profile.id) }}
            >
              {dot(o.profile.element)}
              <span className="truncate">{o.profile.name}</span>
              {o.setMatch && <span title={t('setpick.recommended')}>⭐</span>}
              <span className="ml-auto font-mono text-slate-400">{o.totalScore.toFixed(1)}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
