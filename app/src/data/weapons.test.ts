import { describe, expect, it } from 'vitest'
import { WEAPONS, WEAPON_PASSIVES } from './weapons'
import { WEAPON_BASE } from './weaponsData'

// Task 56: toàn vẹn WEAPON_PASSIVES sau khi phủ đủ 109 vũ khí.

// 16 vũ khí CHỦ Ý không có entry: passive thuần energy-restore/heal, không có stat mô hình được.
const NO_PASSIVE_IDS = [
  'cadenza', 'discord', 'marcato', 'overture', 'variation', // Ceaseless Aria (Concerto)
  'beguiling-melody', // Concerto + Resonance Energy
  'broadblade-of-voyager', 'gauntlets-of-voyager', 'pistols-of-voyager', 'rectifier-of-voyager', 'sword-of-voyager', // Resonance Energy
  'originite-type-i', 'originite-type-ii', 'originite-type-iii', 'originite-type-iv', 'originite-type-v', // heal
]

const WEIGHT_KEYS = [
  'hp', 'hpPct', 'atk', 'atkPct', 'def', 'defPct', 'critRate', 'critDmg', 'energyRegen',
  'basicAtk', 'heavyAtk', 'skillDmg', 'liberationDmg', 'elementDmg', 'healingBonus',
]

describe('weapons: toàn vẹn WEAPON_PASSIVES (task 56)', () => {
  it('mọi key WEAPON_PASSIVES tồn tại trong WEAPON_BASE (không có id mồ côi/typo)', () => {
    const baseIds = new Set(WEAPON_BASE.map((w) => w.id))
    for (const id of Object.keys(WEAPON_PASSIVES)) {
      expect(baseIds.has(id), `WEAPON_PASSIVES id lạ: ${id}`).toBe(true)
    }
  })

  it('phủ đủ 109 vũ khí: entry + danh sách skip chủ ý = toàn bộ DB', () => {
    const covered = new Set([...Object.keys(WEAPON_PASSIVES), ...NO_PASSIVE_IDS])
    const missing = WEAPON_BASE.filter((w) => !covered.has(w.id)).map((w) => w.id)
    expect(missing, `vũ khí chưa mô hình passive: ${missing.join(', ')}`).toEqual([])
    // và skip list không chồng lên entry (skip = chủ ý KHÔNG có entry)
    for (const id of NO_PASSIVE_IDS) {
      expect(WEAPON_PASSIVES[id], `${id} nằm trong skip list nhưng lại có entry`).toBeUndefined()
    }
  })

  it('stat key hợp lệ (WeightKey), giá trị trong (0, 100]', () => {
    for (const [id, p] of Object.entries(WEAPON_PASSIVES)) {
      const bags = [p.passiveFlat ?? {}, ...(p.buffs ?? []).map((b) => b.stats)]
      for (const bag of bags) {
        for (const [k, v] of Object.entries(bag)) {
          expect(WEIGHT_KEYS, `${id}: stat key lạ ${k}`).toContain(k)
          expect(v, `${id}: ${k} = ${v} ngoài (0, 100]`).toBeGreaterThan(0)
          expect(v, `${id}: ${k} = ${v} ngoài (0, 100]`).toBeLessThanOrEqual(100)
        }
      }
      // mỗi entry phải có gì đó (flat hoặc buff) — entry rỗng là lỗi model
      const hasFlat = Object.keys(p.passiveFlat ?? {}).length > 0
      const hasBuff = (p.buffs ?? []).length > 0
      expect(hasFlat || hasBuff, `${id}: entry rỗng`).toBe(true)
    }
  })

  it('buff id duy nhất toàn cục (buffStates lưu theo id) + label/defaultOn đầy đủ', () => {
    const seen = new Set<string>()
    for (const [id, p] of Object.entries(WEAPON_PASSIVES)) {
      for (const b of p.buffs ?? []) {
        expect(seen.has(b.id), `buff id trùng: ${b.id} (${id})`).toBe(false)
        seen.add(b.id)
        expect(b.label.length, `${id}: buff thiếu label`).toBeGreaterThan(0)
        expect(typeof b.defaultOn, `${id}: buff thiếu defaultOn`).toBe('boolean')
        expect(Object.keys(b.stats).length, `${id}: buff ${b.id} không có stat`).toBeGreaterThan(0)
      }
    }
  })

  it('WEAPONS merge đủ 109 + mốc khoá: unflickering-valor CR8, guardian-broadblade basic/heavy 12', () => {
    expect(WEAPONS.length).toBe(WEAPON_BASE.length)
    const by = Object.fromEntries(WEAPONS.map((w) => [w.id, w]))
    expect(by['unflickering-valor'].passiveFlat).toEqual({ critRate: 8 })
    expect(by['guardian-broadblade'].passiveFlat).toEqual({ basicAtk: 12, heavyAtk: 12 })
    expect(by['azure-oath'].passiveFlat).toEqual({ elementDmg: 12 })
    // vũ khí skip vẫn dùng được (baseAtk + secondary), chỉ không có passive
    expect(by['variation'].passiveFlat).toBeUndefined()
    expect(by['variation'].buffs).toBeUndefined()
  })
})
