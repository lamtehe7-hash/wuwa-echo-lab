import { useMemo, useState } from 'react'
import type { Echo, EchoCost, MainStatKey, Substat, SubstatKey } from '../types'
import { MAINSTATS } from '../data/mainstats'
import { SONATA_SETS } from '../data/sonata'
import { MAX_SUBSTATS, SUBSTATS, SUBSTAT_KEYS } from '../data/substats'
import { newId } from '../store'
import { useT } from '../i18n'

// Form nhập echo tối ưu tốc độ: giá trị substat chọn từ 8 mốc hợp lệ (khỏi gõ nhầm).

interface Props {
  onAdd: (echo: Echo) => void
}

export default function EchoForm({ onAdd }: Props) {
  const t = useT()
  const [cost, setCost] = useState<EchoCost>(3)
  const [set, setSet] = useState(SONATA_SETS[0].id)
  const [rarity, setRarity] = useState<3 | 4 | 5>(5)
  const [level, setLevel] = useState(25)
  const [mainStat, setMainStat] = useState<MainStatKey>(MAINSTATS[3][0].key)
  const [name, setName] = useState('')
  const [subs, setSubs] = useState<Substat[]>([])

  const maxSubs = MAX_SUBSTATS[rarity] ?? 5
  const usedStats = useMemo(() => new Set(subs.map((s) => s.stat)), [subs])

  const changeCost = (c: EchoCost) => {
    setCost(c)
    setMainStat(MAINSTATS[c][0].key)
  }

  const addSub = () => {
    if (subs.length >= maxSubs) return
    const free = SUBSTAT_KEYS.find((k) => !usedStats.has(k)) ?? 'critRate'
    setSubs([...subs, { stat: free, value: SUBSTATS[free].rolls[0] }])
  }

  const changeRarity = (r: 3 | 4 | 5) => {
    setRarity(r)
    // Hạ rarity → số slot substat giảm, cắt bớt để không lưu echo vượt giới hạn
    setSubs((prev) => prev.slice(0, MAX_SUBSTATS[r] ?? 5))
  }

  const submit = () => {
    onAdd({ id: newId(), name: name.trim() || undefined, cost, set, rarity, level, mainStat, substats: subs })
    setSubs([])
    setName('')
  }

  const sel = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-full'

  return (
    <form
      className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3"
      onSubmit={(e) => { e.preventDefault(); submit() }}
    >
      <div className="text-sm font-semibold text-slate-300">{t('echoForm.title')}</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">{t('echoForm.sonataSet')}
          <select className={sel} value={set} onChange={(e) => setSet(e.target.value)}>
            {SONATA_SETS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">{t('echoForm.echoName')}
          <input className={sel} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('echoForm.echoNamePlaceholder')} />
        </label>
        <label className="text-xs text-slate-400">{t('echoForm.cost')}
          <select className={sel} value={cost} onChange={(e) => changeCost(Number(e.target.value) as EchoCost)}>
            {[1, 3, 4].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">{t('echoForm.mainStat')}
          <select className={sel} value={mainStat} onChange={(e) => setMainStat(e.target.value as MainStatKey)}>
            {MAINSTATS[cost].map((m) => <option key={m.key} value={m.key}>{m.label} (max {m.max}%)</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">{t('echoForm.rarity')}
          <select className={sel} value={rarity} onChange={(e) => changeRarity(Number(e.target.value) as 3 | 4 | 5)}>
            {[5, 4, 3].map((r) => <option key={r} value={r}>{r}★</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">{t('echoForm.level')}
          <input type="number" min={0} max={25} className={sel} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
        </label>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('echoForm.substatCount', { n: subs.length, max: maxSubs })}</span>
          <button type="button" className="text-xs text-sky-400 hover:text-sky-300" onClick={addSub} disabled={subs.length >= maxSubs}>{t('echoForm.addRow')}</button>
        </div>
        {subs.map((s, i) => (
          <div key={i} className="flex gap-2">
            <select
              className={sel}
              value={s.stat}
              onChange={(e) => {
                const stat = e.target.value as SubstatKey
                const next = [...subs]
                next[i] = { stat, value: SUBSTATS[stat].rolls[0] }
                setSubs(next)
              }}
            >
              {SUBSTAT_KEYS.filter((k) => k === s.stat || !usedStats.has(k)).map((k) => (
                <option key={k} value={k}>{SUBSTATS[k].label}</option>
              ))}
            </select>
            <select
              className={sel}
              value={s.value}
              onChange={(e) => {
                const next = [...subs]
                next[i] = { ...s, value: Number(e.target.value) }
                setSubs(next)
              }}
            >
              {SUBSTATS[s.stat].rolls.map((v) => <option key={v} value={v}>{v}{SUBSTATS[s.stat].isPct ? '%' : ''}</option>)}
            </select>
            <button type="button" className="px-2 text-xs text-rose-400 hover:text-rose-300" onClick={() => setSubs(subs.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
      </div>

      <button type="submit" className="w-full rounded bg-sky-600 py-1.5 text-sm font-semibold hover:bg-sky-500">
        {t('echoForm.save')}
      </button>
    </form>
  )
}
