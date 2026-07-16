import { useEffect, useRef, useState } from 'react'
import { CHARACTERS, CHARACTER_BY_ID } from '../data/characters'
import { ELEMENT_COLOR, ELEMENT_LABEL, ELEMENT_ORDER } from '../data/elementColors'
import type { ProfileOverride } from '../store'
import { useT } from '../i18n'

// Chọn nhân vật trực quan thay <select> trần (research/ui-ux.md B3): popover lưới chip
// nhóm theo nguyên tố — chấm màu element + role badge + dấu ＊ khi có override trọng số.
// Không dùng portrait (tránh vấn đề bản quyền ảnh) — màu + typography là đủ nhận diện.

/** Role badge ngắn theo archetype (thuật ngữ gamer phổ quát — không dịch) — dùng chung với RosterPanel */
export const ROLE_BADGE: Record<string, string> = {
  critSkill: 'DPS', critBasic: 'DPS', critHeavy: 'DPS', critLiberation: 'DPS', critHpSkill: 'DPS',
  subDpsEr: 'Sub', buffer: 'Buff', healerAtk: 'Heal', healerHp: 'Heal',
}

interface Props {
  value: string
  onChange: (id: string) => void
  overrides: Record<string, ProfileOverride>
}

export default function CharacterPicker({ value, onChange, overrides }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('') // U10: lọc nhanh theo tên — roster 39 người và còn tăng theo bản game
  const rootRef = useRef<HTMLDivElement>(null)
  const current = CHARACTER_BY_ID[value]
  const ql = q.trim().toLowerCase()
  const matches = (name: string) => !ql || name.toLowerCase().includes(ql)

  // Đóng popover → xoá search để lần mở sau thấy đủ danh sách
  useEffect(() => {
    if (!open) setQ('')
  }, [open])

  // Đóng khi bấm ra ngoài / Escape
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm hover:bg-slate-700/70"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ELEMENT_COLOR[current.element] }} />
        <span>{current.name}</span>
        {overrides[value] && <span className="text-amber-400" title={t('picker.overridden')}>＊</span>}
        <span className="text-xs text-slate-500">▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 max-h-[26rem] w-[min(92vw,560px)] space-y-2.5 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl shadow-black/50"
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('picker.search')}
            aria-label={t('picker.search')}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
          />
          {ql && !CHARACTERS.some((c) => matches(c.name)) && (
            <p className="text-xs text-slate-500">{t('picker.noResults')}</p>
          )}
          {ELEMENT_ORDER.map((el) => {
            const group = CHARACTERS.filter((c) => c.element === el && matches(c.name))
            if (group.length === 0) return null
            return (
              <div key={el}>
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ELEMENT_COLOR[el] }} />
                  {ELEMENT_LABEL[el]}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={c.id === value}
                      className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
                        c.id === value
                          ? 'border-sky-500 bg-sky-950/50 text-slate-100'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                      onClick={() => { onChange(c.id); setOpen(false) }}
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] text-slate-500">{ROLE_BADGE[c.archetype] ?? ''}</span>
                      {overrides[c.id] && <span className="text-amber-400" title={t('picker.overridden')}>＊</span>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          <p className="text-[11px] text-slate-600">{t('picker.hint')}</p>
        </div>
      )}
    </div>
  )
}
