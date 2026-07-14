import { useId, useMemo } from 'react'
import type { EchoCost, MainStatKey, Substat, SubstatKey } from '../types'
import { ECHOES } from '../data/echoes'
import { MAINSTATS } from '../data/mainstats'
import { SONATA_SETS } from '../data/sonata'
import { MAX_SUBSTATS, SUBSTATS, SUBSTAT_KEYS } from '../data/substats'
import { useT } from '../i18n'

// Grid field nhập/sửa echo dùng chung cho EchoForm (thêm tay), OcrImport (sửa draft)
// và EchoEditModal (sửa echo trong kho) — trước đây bị lặp 2 bản, giờ gom một chỗ.
// Component KHÔNG giữ state: nhận value + onChange(patch) từ ngoài.

export interface EchoFieldsValue {
  name: string
  cost: EchoCost
  set: string
  rarity: 3 | 4 | 5
  level: number
  mainStat: MainStatKey
  substats: Substat[]
}

const sel = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full'

export default function EchoFields({
  value,
  onChange,
  nameLabelKey = 'echoForm.echoName',
}: {
  value: EchoFieldsValue
  onChange: (patch: Partial<EchoFieldsValue>) => void
  /** Key i18n cho nhãn ô tên (OcrImport dùng bản ngắn hơn) */
  nameLabelKey?: string
}) {
  const t = useT()
  const maxSubs = MAX_SUBSTATS[value.rarity] ?? 5
  const usedStats = useMemo(() => new Set(value.substats.map((s) => s.stat)), [value.substats])
  // Gợi ý tên echo theo cost đang chọn (datalist) — chọn tên khớp DB + echo 1-set thì tự điền set.
  // useId để mỗi instance có datalist riêng (OcrImport mở nhiều form cùng lúc, tránh trùng id).
  const nameListId = useId()
  const nameOptions = useMemo(() => ECHOES.filter((e) => e.cost === value.cost), [value.cost])
  const onName = (name: string) => {
    const patch: Partial<EchoFieldsValue> = { name }
    const info = ECHOES.find((e) => e.name.toLowerCase() === name.trim().toLowerCase())
    if (info && info.sets.length === 1) patch.set = info.sets[0] // echo chỉ thuộc 1 set → tự chọn giúp
    onChange(patch)
  }

  const changeCost = (c: EchoCost) => {
    // Đổi cost → main stat cũ có thể không tồn tại ở cost mới
    const stillValid = MAINSTATS[c].some((m) => m.key === value.mainStat)
    onChange({ cost: c, mainStat: stillValid ? value.mainStat : MAINSTATS[c][0].key })
  }

  const changeRarity = (r: 3 | 4 | 5) => {
    // Hạ rarity → số slot substat giảm, cắt bớt để không vượt giới hạn
    onChange({ rarity: r, substats: value.substats.slice(0, MAX_SUBSTATS[r] ?? 5) })
  }

  const addSub = () => {
    if (value.substats.length >= maxSubs) return
    const free = SUBSTAT_KEYS.find((k) => !usedStats.has(k)) ?? 'critRate'
    onChange({ substats: [...value.substats, { stat: free, value: SUBSTATS[free].rolls[0] }] })
  }

  const setSub = (i: number, patch: Partial<Substat>) => {
    const next = [...value.substats]
    next[i] = { ...next[i], ...patch }
    onChange({ substats: next })
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.sonataSet')}</span>
          <select className={sel} value={value.set} onChange={(e) => onChange({ set: e.target.value })}>
            {SONATA_SETS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t(nameLabelKey)}</span>
          <input
            className={sel} value={value.name} list={nameListId}
            onChange={(e) => onName(e.target.value)} placeholder={t('echoForm.echoNamePlaceholder')}
          />
          <datalist id={nameListId}>
            {nameOptions.map((e) => <option key={e.name} value={e.name} />)}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.cost')}</span>
          <select className={sel} value={value.cost} onChange={(e) => changeCost(Number(e.target.value) as EchoCost)}>
            {[1, 3, 4].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.mainStat')}</span>
          <select className={sel} value={value.mainStat} onChange={(e) => onChange({ mainStat: e.target.value as MainStatKey })}>
            {MAINSTATS[value.cost].map((m) => <option key={m.key} value={m.key}>{m.label} (max {m.max}%)</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.rarity')}</span>
          <select className={sel} value={value.rarity} onChange={(e) => changeRarity(Number(e.target.value) as 3 | 4 | 5)}>
            {[5, 4, 3].map((r) => <option key={r} value={r}>{r}★</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-400"><span className="flex-1">{t('echoForm.level')}</span>
          <input
            type="number" min={0} max={25} className={sel} value={value.level}
            onChange={(e) => onChange({ level: Math.max(0, Math.min(25, Math.round(Number(e.target.value) || 0))) })}
          />
        </label>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('echoForm.substatCount', { n: value.substats.length, max: maxSubs })}</span>
          <button type="button" className="text-xs text-sky-400 hover:text-sky-300" onClick={addSub} disabled={value.substats.length >= maxSubs}>{t('echoForm.addRow')}</button>
        </div>
        {value.substats.map((s, i) => (
          <div key={i} className="flex gap-2">
            <select
              className={sel}
              value={s.stat}
              onChange={(e) => {
                const stat = e.target.value as SubstatKey
                setSub(i, { stat, value: SUBSTATS[stat].rolls[0] })
              }}
            >
              {SUBSTAT_KEYS.filter((k) => k === s.stat || !usedStats.has(k)).map((k) => (
                <option key={k} value={k}>{SUBSTATS[k].label}</option>
              ))}
            </select>
            <select className={sel} value={s.value} onChange={(e) => setSub(i, { value: Number(e.target.value) })}>
              {SUBSTATS[s.stat].rolls.map((v) => <option key={v} value={v}>{v}{SUBSTATS[s.stat].isPct ? '%' : ''}</option>)}
            </select>
            <button type="button" className="px-2 text-xs text-rose-400 hover:text-rose-300" onClick={() => onChange({ substats: value.substats.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
