import { useState } from 'react'
import type { Echo } from '../types'
import { useT } from '../i18n'
import EchoCard from './EchoCard'
import EchoFields, { type EchoFieldsValue } from './EchoFields'

// Modal xem chi tiết + sửa một echo ĐÃ có trong kho (vd sửa lỗi OCR phát hiện muộn):
// trái = EchoCard preview cập nhật trực tiếp, phải = form field. Chỉ ghi vào kho khi bấm Lưu.

export default function EchoEditModal({
  echo,
  onSave,
  onClose,
}: {
  echo: Echo
  onSave: (updated: Echo) => void
  onClose: () => void
}) {
  const t = useT()
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
        className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">{t('echoEdit.title')}</div>
          <button type="button" className="text-sm text-slate-500 hover:text-slate-300" onClick={onClose}>✕</button>
        </div>

        <div className="grid gap-3 md:grid-cols-[260px_1fr]">
          <EchoCard echo={value} className="self-start" />
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
