import type { EchoCost, MainStatKey } from '../types'

// Nguồn: research/echo-system.md §2 — giá trị max tại +25 (echo 5★).
// ĐÃ VERIFY bằng datamine (research/data-verification.md §4): value = StandardProperty × 5.0 (+25):
// DEF% cost-3 = 38.0, cost-4 = 41.8; Healing 26.4; HP% cost-1 = 22.8. wuwa.uk ghi 41.5 là sai.

export interface MainStatDef {
  key: MainStatKey
  label: string
  max: number
}

export const ELEMENT_DMG: Record<string, MainStatKey> = {
  glacio: 'glacioDmg', fusion: 'fusionDmg', electro: 'electroDmg',
  aero: 'aeroDmg', spectro: 'spectroDmg', havoc: 'havocDmg',
}

export const MAINSTAT_LABELS: Record<MainStatKey, string> = {
  hpPct: 'HP%', atkPct: 'ATK%', defPct: 'DEF%',
  critRate: 'Crit Rate%', critDmg: 'Crit DMG%',
  energyRegen: 'Energy Regen%', healingBonus: 'Healing Bonus%',
  glacioDmg: 'Glacio DMG%', fusionDmg: 'Fusion DMG%', electroDmg: 'Electro DMG%',
  aeroDmg: 'Aero DMG%', spectroDmg: 'Spectro DMG%', havocDmg: 'Havoc DMG%',
}

const ELEM_30: MainStatDef[] = (Object.values(ELEMENT_DMG) as MainStatKey[])
  .map((k) => ({ key: k, label: MAINSTAT_LABELS[k], max: 30.0 }))

/** Main stat khả dụng theo cost + giá trị max ở +25 */
export const MAINSTATS: Record<EchoCost, MainStatDef[]> = {
  1: [
    { key: 'hpPct', label: 'HP%', max: 22.8 },
    { key: 'atkPct', label: 'ATK%', max: 18.0 },
    { key: 'defPct', label: 'DEF%', max: 18.0 },
  ],
  3: [
    { key: 'atkPct', label: 'ATK%', max: 30.0 },
    { key: 'hpPct', label: 'HP%', max: 30.0 },
    { key: 'defPct', label: 'DEF%', max: 38.0 },
    { key: 'energyRegen', label: 'Energy Regen%', max: 32.0 },
    ...ELEM_30,
  ],
  4: [
    { key: 'critRate', label: 'Crit Rate%', max: 22.0 },
    { key: 'critDmg', label: 'Crit DMG%', max: 44.0 },
    { key: 'atkPct', label: 'ATK%', max: 33.0 },
    { key: 'hpPct', label: 'HP%', max: 33.0 },
    { key: 'defPct', label: 'DEF%', max: 41.8 },
    { key: 'healingBonus', label: 'Healing Bonus%', max: 26.4 },
  ],
}

/** Stat phụ cố định dòng 2 theo cost (max +25): cost1 = flat HP, cost3/4 = flat ATK */
export const FIXED_SECONDARY: Record<EchoCost, { label: string; max: number }> = {
  1: { label: 'HP', max: 2280 },
  3: { label: 'ATK', max: 100 },
  4: { label: 'ATK', max: 150 },
}

/** Tổng cost tối đa (Data Bank level 9) */
export const COST_CAP = 12
