import type { Echo } from '../types'

/** 10 echo mẫu (bấm "Nạp dữ liệu mẫu" khi kho trống) — trùng bộ test scripts/smoke.ts.
 *  Tên/cost/set khớp catalog THẬT data/echoes.ts (review 16/07: bản cũ chế tên+set tuỳ tiện —
 *  vd "Hoartoise" cost-3 havoc-eclipse trong khi DB là cost-1 freezing-frost; card demo không icon). */
export const DEMO_ECHOES: Echo[] = [
  { id: 'demo-e1', name: 'Havoc Dreadmane', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [
    { stat: 'critRate', value: 8.7 }, { stat: 'critDmg', value: 17.4 }, { stat: 'atkPct', value: 9.4 }, { stat: 'energyRegen', value: 8.4 }, { stat: 'atk', value: 40 } ] },
  { id: 'demo-e2', name: 'Roseshroom', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [
    { stat: 'hpPct', value: 10.9 }, { stat: 'defPct', value: 11.9 }, { stat: 'hp', value: 470 }, { stat: 'energyRegen', value: 10.0 }, { stat: 'def', value: 60 } ] },
  { id: 'demo-e3', name: 'Tambourinist', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [
    { stat: 'critRate', value: 10.5 }, { stat: 'critDmg', value: 21.0 }, { stat: 'basicAtk', value: 11.6 }, { stat: 'atkPct', value: 11.6 }, { stat: 'atk', value: 60 } ] },
  { id: 'demo-e4', name: 'Carapace', cost: 3, set: 'moonlit-clouds', rarity: 5, level: 15, mainStat: 'havocDmg', substats: [
    { stat: 'critRate', value: 6.3 }, { stat: 'basicAtk', value: 6.4 }, { stat: 'hp', value: 320 } ] },
  { id: 'demo-e5', name: 'Autopuppet Scout', cost: 3, set: 'freezing-frost', rarity: 5, level: 25, mainStat: 'energyRegen', substats: [
    { stat: 'critDmg', value: 12.6 }, { stat: 'critRate', value: 6.3 } ] },
  { id: 'demo-c4a', name: 'Crownless', cost: 4, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'critRate', substats: [
    { stat: 'critDmg', value: 18.6 }, { stat: 'atkPct', value: 8.6 } ] },
  { id: 'demo-c4b', name: 'Mech Abomination', cost: 4, set: 'lingering-tunes', rarity: 5, level: 25, mainStat: 'critDmg', substats: [
    { stat: 'critRate', value: 7.5 } ] },
  { id: 'demo-c1a', name: 'Havoc Prism', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [
    { stat: 'critRate', value: 6.9 }, { stat: 'atk', value: 30 } ] },
  { id: 'demo-c1b', name: 'Havoc Warrior', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [
    { stat: 'critDmg', value: 13.8 } ] },
  { id: 'demo-c1c', name: 'Tick Tack', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'hpPct', substats: [] },
]
