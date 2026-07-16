import { useEffect, useRef, useState, type ReactNode } from 'react'

// ⓘ bấm được → popover giải thích (task 58/U4) — thay tooltip title= hover-only (anti-pattern H6,
// mobile không hover được). Dùng absolute là đủ cho vị trí NGOÀI vùng overflow-x-auto; nếu cần đặt
// trong bảng cuộn ngang thì phải chuyển sang position:fixed theo mẫu ScoreBadge.

export default function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  // Đóng khi bấm ra ngoài / Escape (mẫu CharacterPicker)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="px-1 text-sm text-slate-500 hover:text-sky-300"
        onClick={() => setOpen(!open)}
      >ⓘ</button>
      {open && (
        <span className="absolute left-0 top-full z-20 mt-1 block w-64 space-y-1 rounded border border-slate-700 bg-slate-900 p-2 text-left text-xs font-normal text-slate-300 shadow-xl shadow-black/50">
          {children}
        </span>
      )}
    </span>
  )
}
