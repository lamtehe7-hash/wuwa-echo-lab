import { useState } from 'react'
import type { Echo } from '../types'
import { MAINSTATS } from '../data/mainstats'
import { SONATA_SETS } from '../data/sonata'
import { newId } from '../store'
import { useT } from '../i18n'
import EchoFields, { type EchoFieldsValue } from './EchoFields'

// Form nhập echo tối ưu tốc độ: giá trị substat chọn từ 8 mốc hợp lệ (khỏi gõ nhầm).
// Field dùng chung với OcrImport/EchoEditModal — xem EchoFields.tsx.

interface Props {
  onAdd: (echo: Echo) => void
}

const INITIAL: EchoFieldsValue = {
  name: '',
  cost: 3,
  set: SONATA_SETS[0].id,
  rarity: 5,
  level: 25,
  mainStat: MAINSTATS[3][0].key,
  substats: [],
}

export default function EchoForm({ onAdd }: Props) {
  const t = useT()
  const [value, setValue] = useState<EchoFieldsValue>(INITIAL)

  const submit = () => {
    onAdd({
      id: newId(),
      name: value.name.trim() || undefined,
      cost: value.cost,
      set: value.set,
      rarity: value.rarity,
      level: value.level,
      mainStat: value.mainStat,
      substats: value.substats,
    })
    // Giữ set/cost/main để nhập liên tiếp nhanh; chỉ reset phần riêng của từng echo
    setValue((prev) => ({ ...prev, name: '', substats: [] }))
  }

  return (
    <form
      className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3"
      onSubmit={(e) => { e.preventDefault(); submit() }}
    >
      <div className="text-sm font-semibold text-slate-300">{t('echoForm.title')}</div>
      <EchoFields value={value} onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))} />
      <button type="submit" className="w-full rounded bg-sky-600 py-1.5 text-sm font-semibold hover:bg-sky-500">
        {t('echoForm.save')}
      </button>
    </form>
  )
}
