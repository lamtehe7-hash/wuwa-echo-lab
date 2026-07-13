import { describe, expect, it } from 'vitest'
import type { Echo } from '../types'
import {
  aggregateTotals,
  characterBaseline,
  damageBreakdown,
  emptyTotals,
  loadoutDamage,
  loadoutDamageMultiplier,
} from './damage'
import { CHARACTER_BY_ID } from '../data/characters'

const camellya = CHARACTER_BY_ID['camellya'] // atk-scaling, attackType = basicAtk (weight .75)
const carlotta = CHARACTER_BY_ID['carlotta'] // atk-scaling, attackType = skillDmg
const shorekeeper = CHARACTER_BY_ID['shorekeeper'] // hp-scaling

function echo(overrides: Partial<Echo>): Echo {
  return {
    id: 'test', name: 'Test', cost: 4, set: 'havoc-eclipse',
    rarity: 5, level: 25, mainStat: 'critRate', substats: [], ...overrides,
  }
}

describe('characterBaseline: suy từ archetype', () => {
  it('critBasic → scaling atk, attackType basicAtk', () => {
    const b = characterBaseline(camellya)
    expect(b.scaling).toBe('atk')
    expect(b.attackType).toBe('basicAtk')
  })
  it('critSkill → attackType skillDmg', () => {
    expect(characterBaseline(carlotta).attackType).toBe('skillDmg')
  })
  it('healer hp-scaling → scaling hp', () => {
    expect(characterBaseline(shorekeeper).scaling).toBe('hp')
  })
})

describe('loadoutDamage: build rỗng = ×1', () => {
  it('không đeo echo → multiplier = 1', () => {
    expect(loadoutDamageMultiplier([], camellya)).toBeCloseTo(1, 10)
  })
})

describe('phi tuyến 1: crit là TÍCH (CR×CD), không cộng', () => {
  const b = characterBaseline(camellya) // baseCR 5, baseCD 150

  function idxWith(critRate: number, critDmg: number): number {
    const t = emptyTotals()
    t.critRate = critRate
    t.critDmg = critDmg
    return damageBreakdown(t, b).index
  }

  it('1 roll Crit Rate đáng giá HƠN khi Crit DMG nền đã cao (marginal phụ thuộc CD)', () => {
    const gainAtLowCd = idxWith(10.5, 0) - idxWith(0, 0) // thêm CR khi CD = 150
    const gainAtHighCd = idxWith(10.5, 100) - idxWith(0, 100) // thêm CR khi CD = 250
    expect(gainAtHighCd).toBeGreaterThan(gainAtLowCd)
  })

  it('critMult = 1 + CR×CD đúng theo công thức (CR 10.5% trên nền 150% CD)', () => {
    const t = emptyTotals()
    t.critRate = 10.5
    // CR_total = (5+10.5)/100 = 0.155 ; CD_total = 150/100 = 1.5
    expect(damageBreakdown(t, b).critMult).toBeCloseTo(1 + 0.155 * 1.5, 10)
  })
})

describe('Crit Rate bị cap 100%', () => {
  it('CR nền + substat vượt 100 → critRateTotal = 100', () => {
    const b = characterBaseline(camellya)
    const t = emptyTotals()
    t.critRate = 200
    expect(damageBreakdown(t, b).critRateTotal).toBe(100)
  })
})

describe('phi tuyến 2: bracket %DMG chỉ ăn attack-type ĐÚNG với kit', () => {
  const b = characterBaseline(camellya) // attackType basicAtk
  it('Basic Attack DMG% cộng vào bracket, Skill DMG% thì không (sai kit)', () => {
    const tBasic = emptyTotals(); tBasic.attackTypeDmg.basicAtk = 11.6
    const tSkill = emptyTotals(); tSkill.attackTypeDmg.skillDmg = 11.6
    expect(damageBreakdown(tBasic, b).dmgBonus).toBeCloseTo(1.116, 10)
    expect(damageBreakdown(tSkill, b).dmgBonus).toBeCloseTo(1.0, 10)
  })
  it('elemental DMG% (main stat) luôn cộng vào bracket', () => {
    const t = emptyTotals(); t.elementalDmg = 30
    expect(damageBreakdown(t, b).dmgBonus).toBeCloseTo(1.3, 10)
  })
})

describe('scaling: hp-scaling dùng HP%, bỏ ATK%', () => {
  const b = characterBaseline(shorekeeper) // scaling hp
  it('HP% tăng statFactor, ATK% không', () => {
    const tHp = emptyTotals(); tHp.hpPct = 30
    const tAtk = emptyTotals(); tAtk.atkPct = 30
    expect(damageBreakdown(tHp, b).statFactor).toBeGreaterThan(damageBreakdown(tAtk, b).statFactor)
    expect(damageBreakdown(tAtk, b).statFactor).toBeCloseTo(damageBreakdown(emptyTotals(), b).statFactor, 10)
  })
})

describe('aggregateTotals: gom substat + main stat', () => {
  it('cộng đúng substat và main stat elemental', () => {
    const e = echo({
      cost: 3, mainStat: 'glacioDmg', // elemental main, max 30
      substats: [
        { stat: 'atkPct', value: 9.4 },
        { stat: 'critRate', value: 8.7 },
        { stat: 'basicAtk', value: 11.6 },
      ],
    })
    const t = aggregateTotals([e])
    expect(t.atkPct).toBeCloseTo(9.4, 10)
    expect(t.critRate).toBeCloseTo(8.7, 10)
    expect(t.attackTypeDmg.basicAtk).toBeCloseTo(11.6, 10)
    expect(t.elementalDmg).toBeCloseTo(30, 10)
  })
})

describe('so sánh loadout thực tế', () => {
  it('build crit/atk cho DPS > build toàn stat chết (def/hp) > không echo', () => {
    const good = [
      echo({ cost: 4, mainStat: 'critDmg', substats: [
        { stat: 'critRate', value: 10.5 }, { stat: 'atkPct', value: 11.6 },
        { stat: 'basicAtk', value: 11.6 }, { stat: 'critDmg', value: 21.0 },
      ] }),
      echo({ cost: 3, mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 9.3 }] }),
    ]
    const bad = [
      echo({ cost: 4, mainStat: 'defPct', substats: [
        { stat: 'def', value: 70 }, { stat: 'defPct', value: 14.7 },
        { stat: 'hp', value: 580 }, { stat: 'energyRegen', value: 12.4 },
      ] }),
      echo({ cost: 3, mainStat: 'defPct', substats: [{ stat: 'def', value: 60 }] }),
    ]
    const mGood = loadoutDamageMultiplier(good, camellya)
    const mBad = loadoutDamageMultiplier(bad, camellya)
    expect(mGood).toBeGreaterThan(mBad)
    expect(mBad).toBeGreaterThanOrEqual(1) // build rác không âm, ~= 1 (def/hp không giúp atk-DPS)
  })
})

describe('loadoutDamage breakdown khớp thành phần', () => {
  it('index = statFactor × critMult × dmgBonus', () => {
    const e = echo({ cost: 3, mainStat: 'fusionDmg', substats: [{ stat: 'atkPct', value: 9.4 }] })
    const bd = loadoutDamage([e], carlotta)
    expect(bd.index).toBeCloseTo(bd.statFactor * bd.critMult * bd.dmgBonus, 6)
    expect(bd.multiplier).toBeGreaterThan(1)
  })
})
