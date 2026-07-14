import { useEffect, useRef, useState } from 'react'
import type { SonataSet } from '../types'
import { SONATA_BY_ID, SONATA_SETS } from '../data/sonata'
import { SET_ICON } from '../data/setIcons'
import { ELEMENT_COLOR } from '../data/elementColors'
import { useT } from '../i18n'

// Dropdown chọn set echo để ÉP solver (App tab Tối ưu + RosterPanel).
// Popover tự viết (native <select> KHÔNG nhét được <img>) — mỗi set kèm icon game8
// (hotlink referrerPolicy no-referrer + fallback chấm màu nguyên tố khi ảnh lỗi/không mạng).
// Set đề cử (profile.preferredSets) gắn ⭐ + lên nhóm đầu; value '' = tự động (mọi set).

interface Props {
  value: string
  onChange: (v: string) => void
  /** Set đề cử cho nhân vật đang chọn (thứ tự = ưu tiên) — hiện ⭐ + lên đầu */
  preferred: string[]
  /** class cho nút trigger (vd chỉnh bề rộng) — layout icon+tên đã có sẵn */
  className?: string
}

const byName = (a: SonataSet, b: SonataSet) => a.name.localeCompare(b.name)

/** Icon set: ảnh game8, lỗi → chấm màu nguyên tố (set không nguyên tố = xám) */
function SetIcon({ id }: { id: string }) {
  const [err, setErr] = useState(false)
  const url = SET_ICON[id]
  const el = SONATA_BY_ID[id]?.element
  const color = el ? ELEMENT_COLOR[el] : '#64748b'
  if (url && !err) {
    return (
      <img
        src={url} alt="" referrerPolicy="no-referrer" onError={() => setErr(true)}
        className="h-5 w-5 shrink-0 rounded-full border border-slate-700 bg-slate-800 object-cover"
      />
    )
  }
  return <span className="h-5 w-5 shrink-0 rounded-full border border-slate-700" style={{ backgroundColor: color }} />
}

export default function SetPicker({ value, onChange, preferred, className }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const prefSet = new Set(preferred)
  const rec = preferred.map((id) => SONATA_BY_ID[id]).filter((s): s is SonataSet => s !== undefined)
  const others = SONATA_SETS.filter((s) => !prefSet.has(s.id)).sort(byName)
  const current = value ? SONATA_BY_ID[value] : undefined

  // Đóng khi bấm ra ngoài / Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  const Option = ({ s, star }: { s: SonataSet; star?: boolean }) => (
    <button
      type="button" role="option" aria-selected={s.id === value}
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs ${s.id === value ? 'bg-sky-950/50 text-slate-100' : 'text-slate-300 hover:bg-slate-800'}`}
      onClick={() => { onChange(s.id); setOpen(false) }}
    >
      <SetIcon id={s.id} />
      {star && <span className="text-amber-400">⭐</span>}
      <span className="truncate">{s.name}</span>
    </button>
  )

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button" aria-haspopup="listbox" aria-expanded={open} title={t('setpick.tip')}
        className={`flex min-w-0 items-center gap-1.5 overflow-hidden rounded border border-slate-700 bg-slate-800 hover:bg-slate-700/70 ${className ?? 'px-2 py-1 text-sm'}`}
        onClick={() => setOpen(!open)}
      >
        {current ? <SetIcon id={current.id} /> : <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-slate-600" />}
        <span className="truncate">{current ? current.name : t('setpick.auto')}</span>
        {current && prefSet.has(current.id) && <span className="text-amber-400">⭐</span>}
        <span className="ml-auto pl-1 text-xs text-slate-500">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-[24rem] w-[min(90vw,20rem)] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-1.5 shadow-xl shadow-black/50"
        >
          <button
            type="button" role="option" aria-selected={value === ''}
            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs ${value === '' ? 'bg-sky-950/50 text-slate-100' : 'text-slate-300 hover:bg-slate-800'}`}
            onClick={() => { onChange(''); setOpen(false) }}
          >
            <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-slate-600" />
            {t('setpick.auto')}
          </button>
          {rec.length > 0 && (
            <>
              <div className="mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">{t('setpick.recommended')}</div>
              {rec.map((s) => <Option key={s.id} s={s} star />)}
            </>
          )}
          <div className="mt-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t('setpick.others')}</div>
          {others.map((s) => <Option key={s.id} s={s} />)}
        </div>
      )}
    </div>
  )
}
