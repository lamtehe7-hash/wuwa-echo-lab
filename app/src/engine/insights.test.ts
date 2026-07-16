import { describe, expect, it } from 'vitest'
import type { CharacterProfile, Echo } from '../types'
import { CHARACTERS } from '../data/characters'
import { DEMO_ECHOES } from '../data/demo'
import { SONATA_BY_ID, SONATA_SETS } from '../data/sonata'
import { GRADE_BANDS, gradeOf, scoreEcho, theoreticalMaxTotal } from './score'
import { bestOwners, setFarmPriority, setFarmSummary } from './insights'

const byId = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<string, CharacterProfile>
const demo = Object.fromEntries(DEMO_ECHOES.map((e) => [e.name ?? e.id, e])) as Record<string, Echo>

// ---- F17: grade S–D ----

describe('theoreticalMaxTotal / gradeOf', () => {
  it('max tổng luôn > 100 (main stat tốt nhất cộng thêm trên thang substat)', () => {
    for (const c of ['camellya', 'xuanling', 'verina']) {
      for (const cost of [1, 3, 4] as const) {
        expect(theoreticalMaxTotal(byId[c], cost)).toBeGreaterThan(100)
      }
    }
  })

  it('mốc hiệu chỉnh 16/07 trên demo data (khoá band S/B/D — đổi weights/bands phải xem lại)', () => {
    const cam = byId.camellya
    // Tambourinist ~95.7% & Havoc Dreadmane ~81.1% → S; Roseshroom ~40.7% → B; Tick Tack 0 sub → D
    const g = (name: string) => {
      const e = demo[name]
      return gradeOf(scoreEcho(e, cam).totalScore, cam, e.cost)
    }
    expect(g('Tambourinist')).toBe('S')
    expect(g('Havoc Dreadmane')).toBe('S')
    expect(g('Roseshroom')).toBe('B')
    expect(g('Tick Tack')).toBe('D')
  })

  it('GRADE_BANDS giảm dần và phủ từ 0', () => {
    const mins = GRADE_BANDS.map(([m]) => m)
    expect([...mins].sort((a, b) => b - a)).toEqual(mins)
    expect(mins[mins.length - 1]).toBe(0)
  })
})

// ---- F1: bestOwners ----

describe('bestOwners', () => {
  const dreadmane = demo['Havoc Dreadmane'] // cost-3 Havoc DMG main, substat crit — hợp Havoc DPS

  it('trả tối đa topN, sắp giảm dần theo rank (điểm + thưởng set đề cử)', () => {
    const owners = bestOwners(dreadmane, CHARACTERS, 3)
    expect(owners.length).toBeLessThanOrEqual(3)
    expect(owners.length).toBeGreaterThan(0)
  })

  it('loại profile fitLevel < 0.6 (main stat sai hẳn)', () => {
    const owners = bestOwners(dreadmane, CHARACTERS, 39)
    for (const o of owners) expect(o.fitLevel).toBeGreaterThanOrEqual(0.6)
    // Verina (healer) không ăn Havoc DMG main → không được xuất hiện
    expect(owners.some((o) => o.profile.id === 'verina')).toBe(false)
  })

  it('setMatch thắng khi điểm substat ngang nhau (Camellya preferred havoc-eclipse > generic cùng archetype)', () => {
    const owners = bestOwners(dreadmane, [byId.camellya, byId['generic-basic']], 2)
    expect(owners[0].profile.id).toBe('camellya')
    expect(owners[0].setMatch).toBe(true)
  })
})

// ---- F2: setFarmPriority ----

describe('setFarmPriority', () => {
  const realChars = CHARACTERS.filter((c) => !c.id.startsWith('generic'))

  it('havoc-eclipse: nhân vật preferred đứng đầu, mọi gain > 0, tối đa topN', () => {
    const list = setFarmPriority(SONATA_BY_ID['havoc-eclipse'], realChars, 5)
    expect(list.length).toBeGreaterThan(0)
    expect(list.length).toBeLessThanOrEqual(5)
    for (const b of list) expect(b.gain).toBeGreaterThan(0)
    expect(list[0].preferred).toBe(true)
    // sắp giảm dần
    for (let i = 1; i < list.length; i++) expect(list[i - 1].gain).toBeGreaterThanOrEqual(list[i].gain)
  })

  it('rejuvenating-glow (healer set) xếp healer lên trước DPS', () => {
    const list = setFarmPriority(SONATA_BY_ID['rejuvenating-glow'], realChars, 5)
    const topIds = list.map((b) => b.profile.id)
    expect(topIds.some((id) => ['verina', 'buling', 'mornye', 'shorekeeper'].includes(id))).toBe(true)
  })

  it('mọi set trong DB đều chạy được không throw (34 set × roster)', () => {
    for (const def of Object.values(SONATA_BY_ID)) {
      expect(() => setFarmPriority(def, realChars, 3)).not.toThrow()
    }
  })
})

describe('setFarmSummary (top-3-per-char — chống thoái hoá gain tuyệt đối)', () => {
  const realChars = CHARACTERS.filter((c) => !c.id.startsWith('generic'))

  it('phân hoá thật: không phải set nào cũng hiện, sort giảm dần theo số người hưởng', () => {
    const rows = setFarmSummary(SONATA_SETS, realChars, 3)
    expect(rows.length).toBeGreaterThan(10)
    expect(rows.length).toBeLessThan(SONATA_SETS.length) // gain tuyệt đối từng ra đủ 34/34 → thoái hoá
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].beneficiaries.length).toBeGreaterThanOrEqual(rows[i].beneficiaries.length)
    }
  })

  it('rejuvenating-glow: healer đứng đầu danh sách hưởng lợi', () => {
    const rows = setFarmSummary(SONATA_SETS, realChars, 3)
    const rejuv = rows.find((r) => r.def.id === 'rejuvenating-glow')
    expect(rejuv).toBeTruthy()
    expect(['verina', 'buling', 'shorekeeper', 'baizhi', 'mornye']).toContain(rejuv!.beneficiaries[0].profile.id)
  })
})
