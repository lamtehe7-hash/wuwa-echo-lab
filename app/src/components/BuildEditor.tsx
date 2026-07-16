import type { BuildContext, CharacterProfile } from '../types'
import type { ProfileOverride } from '../store'
import { WEAPONS, WEAPON_TYPE_LABEL } from '../data/weapons'
import { CHARACTER_BASE_BY_ID } from '../data/characterBase'
import { resolveContext } from '../engine/damage'
import { useT } from '../i18n'

// Chỉnh "chỉ số nền" (vũ khí + base + buff) cho damage model THẬT. Lưu trong override.build.

interface Props {
  profile: CharacterProfile
  override?: ProfileOverride
  /** Set đang chạy (forcedSet || preferred[0]) — để liệt kê buff của set */
  activeSet?: string
  onChange: (ov: ProfileOverride | undefined) => void
}

const SCALE_LABEL = { atk: 'ATK', hp: 'HP', def: 'DEF' } as const

export default function BuildEditor({ profile, override, activeSet, onChange }: Props) {
  const t = useT()
  const build: BuildContext = override?.build ?? {}
  const r = resolveContext(profile, build, activeSet)
  const inDb = !!CHARACTER_BASE_BY_ID[profile.id]
  // Lọc dropdown theo loại vũ khí nhân vật (DB datamine, task 55) — 110 option → ~20 đúng loại.
  // Vũ khí ĐÃ chọn giữ lại dù lệch loại (dữ liệu cũ) để <select> không mất value.
  const weaponType = CHARACTER_BASE_BY_ID[profile.id]?.weaponType
  const weaponList = weaponType ? WEAPONS.filter((w) => w.type === weaponType || w.id === build.weaponId) : WEAPONS

  const patchBuild = (patch: Partial<BuildContext>) => onChange({ ...override, build: { ...build, ...patch } })
  const setManualBase = (k: 'atk' | 'hp' | 'def', v: number | undefined) => {
    const mb: Record<string, number> = { ...build.manualBase }
    if (v === undefined || Number.isNaN(v)) delete mb[k]
    else mb[k] = v
    patchBuild({ manualBase: Object.keys(mb).length ? mb : undefined })
  }
  const setBuff = (id: string, on: boolean) => patchBuild({ buffStates: { ...build.buffStates, [id]: on } })
  const resetBuild = () => {
    const { build: _omit, ...rest } = override ?? {}
    onChange(Object.keys(rest).length ? rest : undefined)
  }
  const hasBuild = !!(build.weaponId || build.manualBase || build.buffStates)

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">⚔ {t('build.title')}</span>
        {hasBuild && (
          <button className="text-xs text-amber-400 hover:text-amber-300" onClick={resetBuild}>{t('weights.reset')}</button>
        )}
      </div>

      {/* Vũ khí */}
      <label className="flex items-center justify-between gap-2 text-xs text-slate-300">
        <span>{t('build.weapon')}</span>
        <select
          className="w-52 rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-xs"
          value={build.weaponId ?? ''}
          onChange={(e) => patchBuild({ weaponId: e.target.value || undefined })}
        >
          <option value="">— {t('build.weaponNone')} —</option>
          {weaponList.map((w) => (
            <option key={w.id} value={w.id}>{w.name} · {WEAPON_TYPE_LABEL[w.type]} {w.rarity}★</option>
          ))}
        </select>
      </label>

      {/* Base ATK/HP/DEF (nhập tay override; placeholder = giá trị đang dùng) */}
      <div className="grid grid-cols-3 gap-2">
        {(['atk', 'hp', 'def'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-0.5 text-[11px] text-slate-400">
            <span className={r.scaling === k ? 'text-emerald-300' : ''}>Base {SCALE_LABEL[k]}{r.scaling === k ? ' ★' : ''}</span>
            <input
              type="number" min={0} step={1}
              value={build.manualBase?.[k] ?? ''}
              placeholder={r.scaling === k ? String(Math.round(r.charBaseStat)) : '—'}
              className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-right"
              onChange={(e) => setManualBase(k, e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))}
            />
          </label>
        ))}
      </div>

      {/* Buff có điều kiện (assumed active) */}
      {r.buffs.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] text-slate-500">{t('build.buffs')}</div>
          {r.buffs.map(({ buff, on }) => (
            <label key={buff.id} className="flex items-start gap-2 text-[11px] text-slate-300">
              <input type="checkbox" checked={on} className="mt-0.5" onChange={(e) => setBuff(buff.id, e.target.checked)} />
              <span className={on ? '' : 'text-slate-500 line-through'}>{buff.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* Tóm tắt baseline đang dùng */}
      <p className="text-[11px] leading-snug text-slate-500">
        {t('build.summary', {
          scale: SCALE_LABEL[r.scaling],
          base: Math.round(r.baseStat),
          cr: r.nonEcho.critRate.toFixed(1),
          cd: r.nonEcho.critDmg.toFixed(1),
        })}
        {!inDb && !build.manualBase && !build.weaponId && (
          <span className="text-amber-500"> · {t('build.noDb')}</span>
        )}
      </p>
    </div>
  )
}
