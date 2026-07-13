import { describe, expect, it } from 'vitest'
import type { CharacterProfile, Echo } from '../types'
import {
  expectedMarginalPerSlot,
  mainStatFitLevel,
  rollEfficiency,
  scoreEcho,
  theoreticalMax,
  tuneAdvice,
} from './score'
import { CHARACTER_BY_ID } from '../data/characters'
import { SUBSTAT_KEYS, expectedRoll, maxRoll } from '../data/substats'

const camellya = CHARACTER_BY_ID['camellya'] // havoc, critBasic, mainStatPrefs: 4=[critRate,critDmg] 3=[havocDmg] 1=[atkPct]

function echo(overrides: Partial<Echo>): Echo {
  return {
    id: 'test',
    name: 'Test',
    cost: 4,
    set: 'havoc-eclipse',
    rarity: 5,
    level: 25,
    mainStat: 'critRate',
    substats: [],
    ...overrides,
  }
}

describe('rollEfficiency', () => {
  it('= 1 khi giá trị = maxRoll của stat', () => {
    expect(rollEfficiency('critRate', maxRoll('critRate'))).toBeCloseTo(1, 10)
    expect(rollEfficiency('atk', maxRoll('atk'))).toBeCloseTo(1, 10)
  })
  it('tỉ lệ tuyến tính với maxRoll (không phải luôn = 1)', () => {
    expect(rollEfficiency('critRate', 6.3)).toBeCloseTo(6.3 / 10.5, 10)
    expect(rollEfficiency('atk', 30)).toBeCloseTo(0.5, 10)
  })
})

describe('theoreticalMax', () => {
  it('= tổng 5 trọng số lớn nhất của nhân vật', () => {
    // critBasic: critRate1, critDmg1, atkPct.75, basicAtk.75, atk.3, energyRegen.3
    // top5 = 1+1+.75+.75+.3 = 3.8 (atk và energyRegen hoà .3, chọn cái nào cũng ra tổng như nhau)
    expect(theoreticalMax(camellya)).toBeCloseTo(3.8, 10)
  })
  it('trả về 1 (không phải 0) khi nhân vật không có trọng số nào', () => {
    const empty: CharacterProfile = { ...camellya, weights: {} }
    expect(theoreticalMax(empty)).toBe(1)
  })
})

describe('scoreEcho: chuẩn hoá 0–100', () => {
  it('echo lý thuyết hoàn hảo (5 roll max của 5 stat trọng số cao nhất) = 100 điểm', () => {
    const perfect = echo({
      mainStat: 'critRate', // mainStat không ảnh hưởng score, chỉ ảnh hưởng fitLevel
      substats: [
        { stat: 'critRate', value: maxRoll('critRate') },
        { stat: 'critDmg', value: maxRoll('critDmg') },
        { stat: 'atkPct', value: maxRoll('atkPct') },
        { stat: 'basicAtk', value: maxRoll('basicAtk') },
        { stat: 'energyRegen', value: maxRoll('energyRegen') },
      ],
    })
    expect(scoreEcho(perfect, camellya).score).toBeCloseTo(100, 6)
  })
  it('echo rỗng (0 substat) = 0 điểm', () => {
    expect(scoreEcho(echo({ substats: [] }), camellya).score).toBeCloseTo(0, 10)
  })
})

describe('mainStatFitLevel: 3 mức', () => {
  it('1 — main stat nằm trong mainStatPrefs (chuẩn meta)', () => {
    const e = echo({ cost: 4, mainStat: 'critRate' })
    expect(mainStatFitLevel(e, camellya)).toBe(1)
  })
  it('0.6 — không chuẩn nhưng weight substat tương ứng ≥ 0.5 (tạm dùng)', () => {
    // cost-3 ATK% không nằm trong prefs (['havocDmg']), nhưng weights.atkPct = 0.75 ≥ 0.5
    const e = echo({ cost: 3, mainStat: 'atkPct' })
    expect(mainStatFitLevel(e, camellya)).toBe(0.6)
  })
  it('0.25 — sai hẳn, weight substat tương ứng < 0.5 (hoặc không tồn tại)', () => {
    // cost-3 DEF% — camellya không có trọng số defPct
    const e = echo({ cost: 3, mainStat: 'defPct' })
    expect(mainStatFitLevel(e, camellya)).toBe(0.25)
    // cost-3 Energy Regen% — weights.energyRegen = 0.3 < 0.5
    const e2 = echo({ cost: 3, mainStat: 'energyRegen' })
    expect(mainStatFitLevel(e2, camellya)).toBe(0.25)
  })
})

describe('tuneAdvice: các verdict', () => {
  it('trash — fitLevel = 0.25 (main stat sai hẳn)', () => {
    const e = echo({ cost: 3, mainStat: 'defPct', substats: [{ stat: 'critRate', value: 6.3 }] })
    expect(tuneAdvice(e, camellya).verdict).toBe('trash')
  })
  it('keep-tuning — main đúng, còn slot trống, chưa ≥2 substat chết', () => {
    const e = echo({
      cost: 4,
      mainStat: 'critRate', // fit = 1
      rarity: 5, // max 5 slot
      substats: [
        { stat: 'critDmg', value: 18.6 }, // weight 1 → "ngon"
        { stat: 'atkPct', value: 8.6 }, // weight .75 → "ngon"
      ],
    })
    expect(tuneAdvice(e, camellya).verdict).toBe('keep-tuning')
  })
  it('usable — ≥2 substat chết (weight 0) và chưa có substat ưu tiên nào, còn slot trống', () => {
    const e = echo({
      cost: 4,
      mainStat: 'critRate', // fit = 1
      rarity: 5,
      substats: [
        { stat: 'hp', value: 320 }, // weight 0 với camellya
        { stat: 'hpPct', value: 6.4 }, // weight 0 với camellya
      ],
    })
    const adv = tuneAdvice(e, camellya)
    expect(adv.verdict).toBe('usable')
  })
  it('done — đủ 5/5 substat (rarity 5), main stat chuẩn', () => {
    const e = echo({
      cost: 4,
      mainStat: 'critRate', // fit = 1
      rarity: 5,
      substats: [
        { stat: 'critRate', value: 8.7 },
        { stat: 'critDmg', value: 17.4 },
        { stat: 'atkPct', value: 9.4 },
        { stat: 'basicAtk', value: 6.4 },
        { stat: 'atk', value: 40 },
      ],
    })
    expect(tuneAdvice(e, camellya).verdict).toBe('done')
  })
  it('done — đủ 5/5 substat nhưng main stat chỉ tạm dùng (fit 0.6)', () => {
    const e = echo({
      cost: 3,
      mainStat: 'atkPct', // fit = 0.6
      rarity: 5,
      substats: [
        { stat: 'critRate', value: 8.7 },
        { stat: 'critDmg', value: 17.4 },
        { stat: 'atkPct', value: 9.4 },
        { stat: 'basicAtk', value: 6.4 },
        { stat: 'atk', value: 40 },
      ],
    })
    const adv = tuneAdvice(e, camellya)
    expect(adv.verdict).toBe('done')
    expect(adv.reason.key).toBe('advice.doneFair') // main stat tạm dùng (fit 0.6)
  })
})

describe('expectedMarginalPerSlot: pool = 13 − substat đã roll (main stat KHÔNG bị loại)', () => {
  it('echo chưa roll gì → pool = toàn bộ 13 loại', () => {
    const e = echo({ mainStat: 'critRate', substats: [] })
    const manual = SUBSTAT_KEYS.reduce((s, k) => {
      const w = camellya.weights[k] ?? 0
      return s + w * (expectedRoll(k) / maxRoll(k))
    }, 0) / SUBSTAT_KEYS.length
    expect(expectedMarginalPerSlot(e, camellya)).toBeCloseTo(manual, 10)
  })
  it('"double crit" hợp lệ: main stat Crit Rate KHÔNG loại Crit Rate khỏi pool substat còn lại — chỉ loại substat ĐÃ roll', () => {
    // echo main Crit Rate, substat đã roll đúng 1 loại là Crit Rate (double crit) → pool chỉ loại 'critRate', còn 12
    const e = echo({ mainStat: 'critRate', substats: [{ stat: 'critRate', value: 8.7 }] })
    const manual = SUBSTAT_KEYS.filter((k) => k !== 'critRate').reduce((s, k) => {
      const w = camellya.weights[k] ?? 0
      return s + w * (expectedRoll(k) / maxRoll(k))
    }, 0) / (SUBSTAT_KEYS.length - 1)
    expect(expectedMarginalPerSlot(e, camellya)).toBeCloseTo(manual, 10)
  })
  it('pool rỗng (đã roll đủ 13 loại — không xảy ra thực tế nhưng edge-case) → trả về 0', () => {
    const allStats = SUBSTAT_KEYS.map((k) => ({ stat: k, value: maxRoll(k) }))
    const e = echo({ mainStat: 'critRate', substats: allStats })
    expect(expectedMarginalPerSlot(e, camellya)).toBe(0)
  })
})
