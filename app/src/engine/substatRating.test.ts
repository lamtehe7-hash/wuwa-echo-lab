import { describe, expect, it } from 'vitest'
import { mainStatFitLevel } from './score'
import {
  SUBSTAT_TIERS,
  mainFitLevel,
  rateSubstat,
  rollMilestoneTier,
  rollTierOf,
} from './substatRating'
import { CHARACTER_BY_ID } from '../data/characters'
import { SUBSTATS } from '../data/substats'

// camellya: critBasic → critRate 1, critDmg 1, atkPct .75, basicAtk .75, atk .3, energyRegen .3, elementDmg .85
// (hp/hpPct/def/defPct/heavyAtk/skillDmg/liberationDmg = 0)
const camellya = CHARACTER_BY_ID['camellya']

describe('SUBSTAT_TIERS metadata', () => {
  it('đúng 8 bậc với key + màu hợp lệ', () => {
    expect(SUBSTAT_TIERS).toHaveLength(8)
    SUBSTAT_TIERS.forEach((m, i) => {
      expect(m.tier).toBe(i)
      expect(m.key).toMatch(/^tier\./)
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/i)
    })
  })
})

describe('rollMilestoneTier: mốc → bậc (bottom-anchored, trần Essential)', () => {
  it('mốc 0 = Low(1), +1 mỗi mốc', () => {
    expect(rollMilestoneTier(0)).toBe(1)
    expect(rollMilestoneTier(1)).toBe(2)
    expect(rollMilestoneTier(5)).toBe(6)
  })
  it('mốc ≥ 6 gộp Essential(7)', () => {
    expect(rollMilestoneTier(6)).toBe(7)
    expect(rollMilestoneTier(7)).toBe(7)
  })
})

describe('rateSubstat: Crit Rate 8 mốc khớp spec user', () => {
  // rolls: [6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5]
  const expected: Array<[number, number]> = [
    [6.3, 1], // Low
    [6.9, 2], // Minor
    [7.5, 3], // Moderate
    [8.1, 4], // Useful
    [8.7, 5], // High
    [9.3, 6], // Major
    [9.9, 7], // Essential
    [10.5, 7], // Essential (gộp)
  ]
  it.each(expected)('critRate %s% → bậc %i', (value, tier) => {
    expect(rateSubstat(camellya, 'critRate', value).tier).toBe(tier)
  })
})

describe('rateSubstat: Irrelevant cho stat trọng số 0', () => {
  it('HP% max roll → Irrelevant (bậc 0) dù mốc cao nhất', () => {
    const r = rateSubstat(camellya, 'hpPct', 11.6)
    expect(r.weight).toBe(0)
    expect(r.tier).toBe(0)
  })
  it('DEF% max roll → Irrelevant', () => {
    expect(rateSubstat(camellya, 'defPct', SUBSTATS.defPct.rolls.at(-1)!).tier).toBe(0)
  })
  it('stat có trọng số > 0 (dù nhỏ như atk .3) KHÔNG bao giờ Irrelevant khi roll thật', () => {
    const r = rateSubstat(camellya, 'atk', 30) // min roll
    expect(r.weight).toBeGreaterThan(0)
    expect(r.tier).toBeGreaterThanOrEqual(1)
  })
})

describe('rateSubstat: màu KHÔNG phụ thuộc trọng số (miễn là > 0)', () => {
  it('critRate .3-weight giả định vs 1-weight cùng mốc → cùng bậc', () => {
    const lowW = { ...camellya, weights: { ...camellya.weights, critRate: 0.3 } }
    const a = rateSubstat(camellya, 'critRate', 9.9)
    const b = rateSubstat(lowW, 'critRate', 9.9)
    expect(a.tier).toBe(b.tier) // cả hai Essential — chỉ mốc roll quyết định
  })
})

describe('rateSubstat: stat 4 mốc (flat ATK) tối đa Useful', () => {
  it('ATK max (60) → Useful(4), không tới Essential', () => {
    const r = rateSubstat(camellya, 'atk', 60)
    expect(r.rollTier).toBe(4)
    expect(r.rollTierCount).toBe(4)
    expect(r.tier).toBe(4)
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
    [4, 'critRate'], [4, 'atkPct'], [4, 'defPct'], [3, 'havocDmg'], [1, 'atkPct'],
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
