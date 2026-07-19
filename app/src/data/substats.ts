import type { SubstatKey } from '../types'

// Nguồn: research/echo-system.md §3 (bản 3.5).
// ĐÃ VERIFY với datamine Arikatsu/WutheringWaves_Data branch 3.5 (research/data-verification.md):
// Basic ATK DMG% max = 11.6 (nguồn ghi 12.4 là nhầm với Energy Regen); flat ATK max = 60, DEF max = 70;
// bảng xác suất khớp disclosure Kuro công bố theo luật Hàn Quốc.

export interface SubstatDef {
  key: SubstatKey
  label: string
  isPct: boolean
  rolls: number[]
  /** Xác suất từng mốc roll (datamine cộng đồng, UNVERIFIED chính thức) */
  probs: number[]
}

const PCT8 = [6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6]
const PROB8 = [0.0733, 0.1465, 0.1954, 0.2351, 0.1563, 0.1042, 0.0595, 0.0298]
const PROB4 = [0.1852, 0.4445, 0.2638, 0.1036]

export const SUBSTATS: Record<SubstatKey, SubstatDef> = {
  hp:            { key: 'hp',            label: 'HP',                  isPct: false, rolls: [320, 360, 390, 430, 470, 510, 540, 580], probs: PROB8 },
  hpPct:         { key: 'hpPct',         label: 'HP%',                 isPct: true,  rolls: PCT8, probs: PROB8 },
  atk:           { key: 'atk',           label: 'ATK',                 isPct: false, rolls: [30, 40, 50, 60], probs: PROB4 },
  atkPct:        { key: 'atkPct',        label: 'ATK%',                isPct: true,  rolls: PCT8, probs: PROB8 },
  def:           { key: 'def',           label: 'DEF',                 isPct: false, rolls: [40, 50, 60, 70], probs: PROB4 },
  defPct:        { key: 'defPct',        label: 'DEF%',                isPct: true,  rolls: [8.1, 9.0, 10.0, 10.9, 11.9, 12.8, 13.8, 14.7], probs: PROB8 },
  critRate:      { key: 'critRate',      label: 'Crit Rate%',          isPct: true,  rolls: [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5], probs: PROB8 },
  critDmg:       { key: 'critDmg',       label: 'Crit DMG%',           isPct: true,  rolls: [12.6, 13.8, 15.0, 16.2, 17.4, 18.6, 19.8, 21.0], probs: PROB8 },
  energyRegen:   { key: 'energyRegen',   label: 'Energy Regen%',       isPct: true,  rolls: [6.8, 7.6, 8.4, 9.2, 10.0, 10.8, 11.6, 12.4], probs: PROB8 },
  basicAtk:      { key: 'basicAtk',      label: 'Basic Attack DMG%',   isPct: true,  rolls: PCT8, probs: PROB8 },
  heavyAtk:      { key: 'heavyAtk',      label: 'Heavy Attack DMG%',   isPct: true,  rolls: PCT8, probs: PROB8 },
  skillDmg:      { key: 'skillDmg',      label: 'Reso. Skill DMG%',    isPct: true,  rolls: PCT8, probs: PROB8 },
  liberationDmg: { key: 'liberationDmg', label: 'Reso. Liberation DMG%', isPct: true, rolls: PCT8, probs: PROB8 },
}

export const SUBSTAT_KEYS = Object.keys(SUBSTATS) as SubstatKey[]

export function maxRoll(stat: SubstatKey): number {
  const r = SUBSTATS[stat].rolls
  return r[r.length - 1]
}

/** Kỳ vọng giá trị 1 roll của stat (theo phân phối xác suất mốc).
 *  Chia Σprobs vì bảng probs cộng đồng không chuẩn (PROB4 Σ=0.9971, PROB8 Σ=1.0001) — khớp cách
 *  sampleRoll (economy.ts) chuẩn hoá CDF, hết lệch ~0.3% giữa evFinal closed-form và MC (review 19/07). */
export function expectedRoll(stat: SubstatKey): number {
  const d = SUBSTATS[stat]
  const total = d.probs.reduce((s, p) => s + p, 0)
  return d.rolls.reduce((s, v, i) => s + v * d.probs[i], 0) / total
}

/** Số substat tối đa theo rarity */
export const MAX_SUBSTATS: Record<number, number> = { 3: 3, 4: 4, 5: 5 }
