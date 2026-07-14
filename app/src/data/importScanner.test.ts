import { describe, expect, it } from 'vitest'
import { parseScannerEchoes } from './importScanner'

describe('parseScannerEchoes — format wuwa-ocr / wuwa.build ParsedEcho[]', () => {
  const json = JSON.stringify([
    {
      echo: 'Impermanence Heron', set: 'MidnightVeil', cost: 4, rank: 5,
      mainStatLabel: 'Crit. Rate',
      substats: [
        { subStat: 'ATK', subStatValue: '7.9%' },
        { subStat: 'ATK', subStatValue: '40' }, // flat ATK (khác ATK%)
        { subStat: 'Crit. DMG', subStatValue: '15%' },
        { subStat: 'Energy Regen', subStatValue: '9.2%' },
        { subStat: 'HP', subStatValue: '470' },
      ],
    },
  ])
  it('nhận diện format + map set/cost/main/substat đúng', () => {
    const r = parseScannerEchoes(json)
    expect(r.format).toBe('parsed-echo')
    expect(r.echoes).toHaveLength(1)
    const e = r.echoes[0]
    expect(e.set).toBe('midnight-veil')
    expect(e.cost).toBe(4)
    expect(e.mainStat).toBe('critRate')
    // ATK% vs ATK flat phân biệt qua % trong value
    expect(e.substats.find((s) => s.stat === 'atkPct')).toBeTruthy()
    expect(e.substats.find((s) => s.stat === 'atk')).toBeTruthy()
    expect(e.substats.find((s) => s.stat === 'critDmg')).toBeTruthy()
    expect(e.substats.find((s) => s.stat === 'energyRegen')).toBeTruthy()
  })
})

describe('parseScannerEchoes — format Kamera echoes.json', () => {
  const json = JSON.stringify([
    {
      '340000070': {
        level: 25, tuneLv: 5, sonata: 'havoceclipse', rarity: 5,
        stats: {
          main: { 'cr%': 22.0, atk: 150 }, // cr% = main; atk 150 = nội tại → cost 4
          sub: { atk: 40, def: 50, hp: 470, 'basicAttack%': 8.6, 'cd%': 15 },
        },
      },
    },
  ])
  it('map sonata flatcase → id, suy cost từ ATK nội tại 150 → 4, main = cr%', () => {
    const r = parseScannerEchoes(json)
    expect(r.format).toBe('kamera')
    expect(r.echoes).toHaveLength(1)
    const e = r.echoes[0]
    expect(e.set).toBe('havoc-eclipse')
    expect(e.cost).toBe(4)
    expect(e.mainStat).toBe('critRate')
    expect(e.substats.find((s) => s.stat === 'basicAtk')).toBeTruthy()
    expect(e.substats.find((s) => s.stat === 'critDmg')).toBeTruthy()
    expect(e.level).toBe(25)
  })
})

describe('parseScannerEchoes — format của chính app', () => {
  it('mảng Echo trần đi thẳng qua sanitize', () => {
    const json = JSON.stringify([
      { id: 'x', cost: 3, set: 'moonlit-clouds', rarity: 5, level: 25, mainStat: 'energyRegen', substats: [{ stat: 'critRate', value: 8.7 }] },
    ])
    const r = parseScannerEchoes(json)
    expect(r.format).toBe('app')
    expect(r.echoes).toHaveLength(1)
    expect(r.echoes[0].set).toBe('moonlit-clouds')
  })
})

describe('parseScannerEchoes — rác/không nhận ra', () => {
  it('JSON hỏng → format unknown, không crash', () => {
    expect(parseScannerEchoes('{bad').format).toBe('unknown')
  })
  it('set không map được → bỏ mục (dropped)', () => {
    const json = JSON.stringify([{ echo: 'X', set: 'NotARealSet', cost: 4, mainStatLabel: 'Crit. Rate', substats: [] }])
    const r = parseScannerEchoes(json)
    expect(r.echoes).toHaveLength(0)
    expect(r.dropped).toBe(1)
  })
})
