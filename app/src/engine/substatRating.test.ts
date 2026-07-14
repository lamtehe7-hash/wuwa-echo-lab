import { describe, expect, it } from 'vitest'
import type { CharacterProfile } from '../types'
import { mainStatFitLevel } from './score'
import {
  SUBSTAT_TIERS,
  mainFitLevel,
  maxSubstatWeight,
  rateSubstat,
  ratingToTier,
  rollTierOf,
} from './substatRating'
import { CHARACTER_BY_ID } from '../data/characters'
import { maxRoll } from '../data/substats'

// camellya: critBasic → critRate 1, critDmg 1, atkPct .75, basicAtk .75, atk .3, energyRegen .3 (max = 1)
const camellya = CHARACTER_BY_ID['camellya']

describe('maxSubstatWeight', () => {
  it('= trọng số substat lớn nhất', () => {
    expect(maxSubstatWeight(camellya)).toBe(1)
  })
  it('= 0 khi không có trọng số nào', () => {
    const empty: CharacterProfile = { ...camellya, weights: {} }
    expect(maxSubstatWeight(empty)).toBe(0)
  })
})

describe('ratingToTier', () => {
  it('weight 0 luôn là Irrelevant (0) bất kể rating', () => {
    expect(ratingToTier(0, 1)).toBe(0)
    expect(ratingToTier(0, 0.9)).toBe(0)
  })
  it('phủ đủ 8 bậc theo ngưỡng', () => {
    expect(ratingToTier(1, 0.05)).toBe(1) // Low
    expect(ratingToTier(1, 0.2)).toBe(2) // Minor
    expect(ratingToTier(1, 0.3)).toBe(3) // Moderate
    expect(ratingToTier(1, 0.45)).toBe(4) // Useful
    expect(ratingToTier(1, 0.6)).toBe(5) // High
    expect(ratingToTier(1, 0.75)).toBe(6) // Major
    expect(ratingToTier(1, 0.9)).toBe(7) // Essential
  })
  it('có đúng 8 metadata với key + màu', () => {
    expect(SUBSTAT_TIERS).toHaveLength(8)
    SUBSTAT_TIERS.forEach((m, i) => {
      expect(m.tier).toBe(i)
      expect(m.key).toMatch(/^tier\./)
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})

describe('rateSubstat', () => {
  it('stat ưu tiên #1 roll MAX → Essential (bậc 7)', () => {
    const r = rateSubstat(camellya, 'critRate', maxRoll('critRate'))
    expect(r.relevance).toBe(1)
    expect(r.rollEff).toBeCloseTo(1, 10)
    expect(r.tier).toBe(7)
  })
  it('stat ưu tiên #1 roll MIN → vẫn cao (không rơi về Irrelevant)', () => {
    const r = rateSubstat(camellya, 'critRate', 6.3) // min roll
    expect(r.tier).toBeGreaterThanOrEqual(4)
  })
  it('stat vô dụng (weight 0) → Irrelevant bất kể roll cao', () => {
    const r = rateSubstat(camellya, 'defPct', maxRoll('defPct'))
    expect(r.weight).toBe(0)
    expect(r.tier).toBe(0)
  })
  it('stat trọng số vừa (atk .3) roll max → bậc trung', () => {
    const r = rateSubstat(camellya, 'atk', maxRoll('atk'))
    expect(r.relevance).toBeCloseTo(0.3, 10)
    expect(r.tier).toBe(3) // Moderate
  })
  it('roll cao hơn → bậc không thấp hơn (đơn điệu theo giá trị)', () => {
    const lo = rateSubstat(camellya, 'critDmg', 12.6) // min
    const hi = rateSubstat(camellya, 'critDmg', 21.0) // max
    expect(hi.tier).toBeGreaterThanOrEqual(lo.tier)
    expect(hi.rollTier).toBeGreaterThan(lo.rollTier)
  })
  it('maxW truyền sẵn = tự tính (cùng kết quả)', () => {
    const a = rateSubstat(camellya, 'atkPct', 9.4)
    const b = rateSubstat(camellya, 'atkPct', 9.4, maxSubstatWeight(camellya))
    expect(a.tier).toBe(b.tier)
    expect(a.color).toBe(b.color)
  })
})

describe('rollTierOf snap về mốc gần nhất', () => {
  it('khớp mốc chính xác', () => {
    expect(rollTierOf('critRate', 10.5)).toEqual({ index: 7, count: 8 })
    expect(rollTierOf('atk', 30)).toEqual({ index: 0, count: 4 })
  })
  it('lệch nhẹ → snap về mốc gần nhất', () => {
    expect(rollTierOf('critRate', 10.4).index).toBe(7)
  })
})

describe('mainFitLevel đồng bộ với score.mainStatFitLevel', () => {
  const cases: Array<[1 | 3 | 4, Parameters<typeof mainFitLevel>[2]]> = [
    [4, 'critRate'], // trong prefs → 1
    [4, 'atkPct'], // họ hàng weight ≥.5 → 0.6
    [4, 'defPct'], // sai → 0.25
    [3, 'havocDmg'], // prefs cost-3 → 1
    [1, 'atkPct'], // prefs cost-1 → 1
  ]
  it.each(cases)('cost %s main %s cho cùng mức', (cost, main) => {
    const viaRating = mainFitLevel(camellya, cost, main)
    const viaScore = mainStatFitLevel(
      { id: 'x', cost, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: main, substats: [] },
      camellya,
    )
    expect(viaRating).toBe(viaScore)
  })
})
