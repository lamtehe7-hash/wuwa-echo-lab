import { useEffect, useRef, useState } from 'react'
import type { CharacterProfile, Echo } from '../types'
import { useT } from '../i18n'
import EchoCard from './EchoCard'
import EchoFields, { type EchoFieldsValue } from './EchoFields'

// Modal xem chi tiết + sửa một echo ĐÃ có trong kho (vd sửa lỗi OCR phát hiện muộn):
// trái = EchoCard preview cập nhật trực tiếp, phải = form field. Chỉ ghi vào kho khi bấm Lưu.
// A11y (task 58/U5): Escape đóng (mẫu CharacterPicker), role=dialog + focus vào hộp khi mở,
// Tab quay vòng trong modal (không thoát ra trang nền phía sau overlay).

export default function EchoEditModal({
  echo,
  onSave,
  onClose,
  profile,
}: {
  echo: Echo
  onSave: (updated: Echo) => void
  onClose: () => void
  /** Nhân vật đang chọn — tô màu substat trên preview theo mức đánh giá */
  profile?: CharacterProfile
}) {
  const t = useT()
  const boxRef = useRef<HTMLDivElement>(null)
  // onClose qua ref: effect focus/trap chạy đúng 1 LẦN khi mount — deps [onClose] (inline ở App,
  // identity đổi mỗi render) sẽ re-run effect và giật focus về container khi App re-render.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    boxRef.current?.focus() // đưa focus vào modal khi mở (đường bàn phím/screen reader)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return }
      if (e.key !== 'Tab' || !boxRef.current) return
      // Bẫy focus: Tab ở phần tử cuối quay về đầu (và ngược lại với Shift+Tab)
      const focusables = boxRef.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && (active === first || active === boxRef.current)) { e.preventDefault(); last.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prevFocus?.focus() // trả focus về nơi mở modal (nút sửa/tên echo)
    }
  }, [])

  const [value, setValue] = useState<EchoFieldsValue>({
    name: echo.name ?? '',
    cost: echo.cost,
    set: echo.set,
    rarity: echo.rarity,
    level: echo.level,
    mainStat: echo.mainStat,
    substats: echo.substats,
  })

  const save = () => {
    onSave({
      ...echo,
      name: value.name.trim() || undefined,
      cost: value.cost,
      set: value.set,
      rarity: value.rarity,
      level: value.level,
      mainStat: value.mainStat,
      substats: value.substats,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="echo-edit-title"
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div id="echo-edit-title" className="text-sm font-semibold text-slate-200">{t('echoEdit.title')}</div>
          <button type="button" className="text-sm text-slate-500 hover:text-slate-300" aria-label={t('common.close')} onClick={onClose}>✕</button>
        </div>

        <div className="grid gap-3 md:grid-cols-[260px_1fr]">
          <EchoCard echo={value} profile={profile} className="self-start" />
          <EchoFields value={value} onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))} />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800" onClick={onClose}>
            {t('echoEdit.cancel')}
          </button>
          <button type="button" className="rounded bg-emerald-700 px-4 py-1.5 text-sm font-semibold hover:bg-emerald-600" onClick={save}>
            {t('echoEdit.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
