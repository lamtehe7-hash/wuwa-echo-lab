import { describe, it, expect } from 'vitest'
import type { CharacterProfile, Echo } from '../types'
import { finalStatBreakdown, loadoutDamage, nonEchoER, resolveContext } from './damage'

// Profile tối giản khớp seed: id 'xuanling' (CHARACTER_BASE forte critRate 8), atk-scaling, ăn heavy.
const xuanling: CharacterProfile = {
  id: 'xuanling', name: 'Xuanling', element: 'havoc', archetype: 'critHeavy',
  weights: { critRate: 1, critDmg: 1, atkPct: 0.75, heavyAtk: 0.75 },
  mainStatPrefs: { '1': ['atkPct'], '3': ['havocDmg'], '4': ['critRate', 'critDmg'] },
  preferredSets: ['song-of-feathered-trace'],
}

function echo(id: string, stat: Echo['substats'][number]['stat'], value: number): Echo {
  return { id, cost: 1, set: 'song-of-feathered-trace', rarity: 5, level: 25, mainStat: 'atkPct', substats: [{ stat, value }] }
}

describe('finalStatBreakdown: cộng dồn đúng nguồn (ví dụ user 92.1% CR)', () => {
  it('CR = base 5 + weapon 24.3 + forte 8 + echo 34.8 + buff 20 = 92.1', () => {
    // echo tổng CR 34.8 (chia 2 dòng cho giống thực tế nhiều echo)
    const echoes = [echo('a', 'critRate', 20.0), echo('b', 'critRate', 14.8)]
    const rows = finalStatBreakdown(echoes, xuanling, { weaponId: 'azure-oath' }, 'song-of-feathered-trace')
    const cr = rows.find((r) => r.stat === 'critRate')!
    expect(cr.base).toBe(5)
    expect(cr.weapon).toBeCloseTo(24.3, 5)
    expect(cr.forte).toBe(8)
    expect(cr.echo).toBeCloseTo(34.8, 5)
    expect(cr.buff).toBe(20)
    expect(cr.total).toBeCloseTo(92.1, 5)
    expect(cr.capped).toBe(false)
  })

  it('CR cap 100 khi tổng vượt', () => {
    const echoes = [echo('a', 'critRate', 60)]
    const rows = finalStatBreakdown(echoes, xuanling, { weaponId: 'azure-oath' }, 'song-of-feathered-trace')
    const cr = rows.find((r) => r.stat === 'critRate')!
    expect(cr.total).toBe(100)
    expect(cr.capped).toBe(true)
  })

  it('tắt buff feather → không cộng 20 CR', () => {
    const echoes = [echo('a', 'critRate', 10)]
    const rows = finalStatBreakdown(echoes, xuanling, { weaponId: 'azure-oath', buffStates: { 'sft-feather': false } }, 'song-of-feathered-trace')
    const cr = rows.find((r) => r.stat === 'critRate')!
    expect(cr.buff).toBe(0)
    expect(cr.total).toBeCloseTo(5 + 24.3 + 8 + 10, 5)
  })

  it('weapon passive All-Attribute 12% vào elementDmg', () => {
    const rows = finalStatBreakdown([], xuanling, { weaponId: 'azure-oath', buffStates: { 'sft-feather': false } }, 'song-of-feathered-trace')
    const el = rows.find((r) => r.stat === 'elementDmg')
    expect(el?.weapon).toBe(12)
  })
})

describe('resolveContext: base ATK char + vũ khí', () => {
  it('atk-scaling: baseStat = charBase 425 + weapon 587', () => {
    const r = resolveContext(xuanling, { weaponId: 'azure-oath' })
    expect(r.baseStat).toBeCloseTo(425 + 587, 5) // Xuanling base ATK 425 (datamine, thay ước lượng 456)
    expect(r.weaponBaseAtk).toBe(587)
    expect(r.hasContext).toBe(true)
  })

  it('không context → hasContext false, baseStat rơi về giả định', () => {
    const r = resolveContext({ ...xuanling, id: 'unknown-char' })
    expect(r.hasContext).toBe(false)
    expect(r.baseStat).toBe(1000) // DEFAULT_BASELINE.baseAtk
  })
})

describe('nonEchoER: ER% ngoài echo cho ngân sách ER của solver (task 55)', () => {
  it('không ctx → 0 (xuanling: forte chỉ có CR, không vũ khí)', () => {
    expect(nonEchoER(xuanling)).toBe(0)
  })
  it("secondary ER của vũ khí được tính (Bloodpact's Pledge 38.8)", () => {
    expect(nonEchoER(xuanling, { weaponId: 'bloodpacts-pledge' })).toBeCloseTo(38.8, 5)
  })
  it('passiveFlat ER được tính (Emerald of Genesis: secondary là CR, passive +12.8 ER)', () => {
    expect(nonEchoER(xuanling, { weaponId: 'emerald-of-genesis' })).toBeCloseTo(12.8, 5)
  })
})

describe('loadoutDamage: tương thích ngược khi không context', () => {
  it('không ctx cho id lạ = hành vi cũ (multiplier ≥ 1)', () => {
    const echoes = [echo('a', 'critRate', 10), echo('b', 'critDmg', 20)]
    const m = loadoutDamage(echoes, { ...xuanling, id: 'unknown-char' }).multiplier
    expect(m).toBeGreaterThan(1)
  })

  it('CR nền cao → giá trị BIÊN của Crit DMG main tăng (cơ chế sửa vụ "cost-9")', () => {
    // Crit là tích (1 + CR×CD) → giá trị biên của Crit DMG tỉ lệ THUẬN với CR. Khi vũ khí+feather
    // bơm CR nền cao, thêm 1 echo Crit DMG 44 sinh lợi nhiều hơn hẳn so với khi CR thấp.
    const crMain: Echo = { id: 'cd', cost: 4, set: 'song-of-feathered-trace', rarity: 5, level: 25, mainStat: 'critDmg', substats: [] }
    // CR thấp: không vũ khí, không set buff.
    const lowBare = loadoutDamage([], xuanling).index
    const lowWithCd = loadoutDamage([crMain], xuanling).index
    // CR cao: vũ khí Azure Oath (+24.3 CR) + forte 8 + feather (+20 CR).
    const hiBare = loadoutDamage([], xuanling, { weaponId: 'azure-oath' }, 'song-of-feathered-trace').index
    const hiWithCd = loadoutDamage([crMain], xuanling, { weaponId: 'azure-oath' }, 'song-of-feathered-trace').index
    // Tỉ lệ tăng khi thêm Crit DMG cao hơn hẳn ở build CR cao.
    expect(hiWithCd / hiBare).toBeGreaterThan(lowWithCd / lowBare)
  })
})
