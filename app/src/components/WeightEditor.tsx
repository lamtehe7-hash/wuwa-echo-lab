import { useMemo } from 'react'
import type { CharacterProfile, WeightKey } from '../types'
import { ARCHETYPE_WEIGHTS } from '../data/characters'
import { SUBSTATS, SUBSTAT_KEYS } from '../data/substats'
import type { ProfileOverride } from '../store'
import { useT } from '../i18n'

// Chỉnh trọng số substat + erTarget cho nhân vật đang chọn (lưu override, preset gốc giữ nguyên).
// B1 (ui-redesign): slider mini + nhãn viết tắt 1 dòng (title đầy đủ) + stat trọng-số-0 gấp lại.

/** Trọng số cho stat chỉ có ở main stat / set bonus (không phải substat) */
const MAIN_ONLY_WEIGHTS: { key: WeightKey; labelKey: string }[] = [
  { key: 'elementDmg', labelKey: 'weights.elementDmg' },
  { key: 'healingBonus', labelKey: 'weights.healingBonus' },
]

/** B1: nhãn viết tắt 1 dòng — thuật ngữ game EN, không dịch (như ROLE_BADGE); title mang tên đầy đủ */
const WEIGHT_ABBR: Record<string, string> = {
  hp: 'HP', hpPct: 'HP%', atk: 'ATK', atkPct: 'ATK%', def: 'DEF', defPct: 'DEF%',
  critRate: 'CR%', critDmg: 'CD%', energyRegen: 'ER%', basicAtk: 'Basic%', heavyAtk: 'Heavy%',
  skillDmg: 'Skill%', liberationDmg: 'Lib%', elementDmg: 'Elem%', healingBonus: 'Heal%',
}

interface Props {
  base: CharacterProfile     // preset gốc (chưa merge)
  merged: CharacterProfile   // đã merge override — giá trị hiển thị
  override?: ProfileOverride
  onChange: (ov: ProfileOverride | undefined) => void
}

export default function WeightEditor({ base, merged, override, onChange }: Props) {
  const t = useT()
  const setWeight = (stat: WeightKey, v: number) => {
    onChange({ ...override, weights: { ...override?.weights, [stat]: v } })
  }

  // Áp preset role (wuwa.uk pattern — research/ui-ux.md §3.4): người mới chọn role thay vì hiểu
  // từng weight. Ghi TƯỜNG MINH mọi key (kể cả 0) để weight của preset nhân vật gốc không lọt qua merge.
  const applyPreset = (arch: string) => {
    const preset = ARCHETYPE_WEIGHTS[arch]
    if (!preset) return
    const weights: Partial<Record<WeightKey, number>> = {}
    for (const k of [...SUBSTAT_KEYS, 'elementDmg', 'healingBonus'] as WeightKey[]) {
      weights[k] = preset[k] ?? 0
    }
    onChange({ ...override, weights })
  }

  const hasOverride = override && (Object.keys(override.weights ?? {}).length > 0 || override.erTarget !== undefined)

  // B1: tập stat "đang dùng" chốt theo merged TẠI THỜI ĐIỂM đổi nhân vật — deps [base] CHỦ Ý
  // (đọc merged stale) để hàng không nhảy nhóm khi user kéo slider; xem chú thích ở render.
  const activeSet = useMemo(
    () =>
      new Set<WeightKey>(
        ([...SUBSTAT_KEYS, ...MAIN_ONLY_WEIGHTS.map((m) => m.key)] as WeightKey[]).filter(
          (k) => (merged.weights[k] ?? 0) > 0,
        ),
      ),
    // deps chủ ý chỉ [base] — KHÔNG thêm merged (xem trên)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base],
  )

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">{t('weights.title', { name: merged.name })}</span>
        {hasOverride && (
          <button className="text-xs text-amber-400 hover:text-amber-300" onClick={() => onChange(undefined)}>
            {t('weights.reset')}
          </button>
        )}
      </div>
      <label className="flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>{t('weights.presetLabel')}</span>
        <select
          className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-xs"
          value=""
          onChange={(e) => { if (e.target.value) applyPreset(e.target.value) }}
        >
          <option value="">{t('weights.presetPick')}</option>
          {Object.keys(ARCHETYPE_WEIGHTS).map((a) => <option key={a} value={a}>{t(`weights.arch.${a}`)}</option>)}
        </select>
      </label>
      {(() => {
        // B1: chia nhóm theo PRESET GỐC (base) — ổn định trong lúc kéo slider (chia theo merged
        // sẽ làm hàng nhảy giữa 2 nhóm ngay giữa thao tác kéo). Stat base-0 user tự đẩy lên vẫn
        // nằm trong fold, có đánh dấu amber "đã chỉnh".
        const ALL: { key: WeightKey; full: string; mainOnly: boolean }[] = [
          ...SUBSTAT_KEYS.map((k) => ({ key: k as WeightKey, full: SUBSTATS[k].label, mainOnly: false })),
          ...MAIN_ONLY_WEIGHTS.map(({ key, labelKey }) => ({ key, full: t(labelKey), mainOnly: true })),
        ]
        const row = ({ key, full, mainOnly }: (typeof ALL)[number]) => {
          const v = merged.weights[key] ?? 0
          const changed = (override?.weights?.[key] !== undefined) && override.weights[key] !== (base.weights[key] ?? 0)
          const title = mainOnly ? `${full} — ${t('weights.mainOnlyTip')}` : full
          return (
            <label key={key} className="flex items-center gap-2 text-xs">
              <span
                title={title}
                className={`w-14 shrink-0 truncate ${changed ? 'text-amber-300' : v > 0 ? (mainOnly ? 'text-sky-300' : 'text-slate-300') : 'text-slate-500'}`}
              >{WEIGHT_ABBR[key] ?? full}</span>
              <input
                type="range" min={0} max={1} step={0.05} value={v}
                aria-label={title}
                className="rng min-w-0 flex-1"
                onChange={(e) => setWeight(key, Math.max(0, Math.min(1, Number(e.target.value))))}
              />
              <span className="w-9 shrink-0 text-right font-mono tabular-nums text-slate-400">{v.toFixed(2)}</span>
            </label>
          )
        }
        const active = ALL.filter((s) => activeSet.has(s.key))
        const folded = ALL.filter((s) => !activeSet.has(s.key))
        return (
          <>
            <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">{active.map(row)}</div>
            {folded.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500">{t('weights.showZero', { n: folded.length })}</summary>
                <div className="mt-1 grid gap-x-3 gap-y-1 sm:grid-cols-2">{folded.map(row)}</div>
              </details>
            )}
          </>
        )
      })()}
      <label className="flex items-center justify-between gap-2 text-xs text-slate-300">
        <span>{t('weights.erTarget')}</span>
        <input
          type="number" min={100} max={300} step={5}
          value={merged.erTarget ?? ''}
          placeholder="—"
          className="w-16 rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-right"
          onChange={(e) => onChange({ ...override, erTarget: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </label>
      <p className="text-[11px] leading-snug text-slate-600">
        {t('weights.help')}
      </p>
    </div>
  )
}
