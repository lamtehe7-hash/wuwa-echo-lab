import { describe, expect, it } from 'vitest'
import type { CharacterProfile, Echo } from '../types'
import { CHARACTERS } from '../data/characters'
import { DEMO_ECHOES } from '../data/demo'
import { SONATA_BY_ID, SONATA_SETS } from '../data/sonata'
import { GRADE_BANDS, gradeOf, scoreEcho, theoreticalMaxTotal } from './score'
import { BACKLOG_MAX_TARGET, bestOwners, setBacklog, setFarmPriority, setFarmSummary, swapSuggestions, triageCandidates, type OwnerFit } from './insights'
import { scoreLoadout } from './solver'
import type { RosterAssignment } from '../types'

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

// ---- F12 (task 61): setBacklog — tồn kho vs nhu cầu ----

describe('setBacklog', () => {
  const realChars = CHARACTERS.filter((c) => !c.id.startsWith('generic'))
  const usable = DEMO_ECHOES.filter((e) => !e.trash)

  it('kho rỗng: mọi row là need, owned/goodOwned = 0, target ≤ trần', () => {
    const rows = setBacklog(SONATA_SETS, realChars, [], 3)
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.status).toBe('need')
      expect(r.owned).toBe(0)
      expect(r.goodOwned).toBe(0)
      expect(r.demand).toBeGreaterThan(0)
      expect(r.target).toBeLessThanOrEqual(BACKLOG_MAX_TARGET)
      expect(r.target).toBeGreaterThan(0)
    }
  })

  it('trần target: set phổ dụng demand cao vẫn bị chặn ở BACKLOG_MAX_TARGET (chống 35×2=70)', () => {
    const rows = setBacklog(SONATA_SETS, realChars, [], 3)
    const big = rows.find((r) => r.demand * 2 > BACKLOG_MAX_TARGET)
    expect(big).toBeTruthy()
    expect(big!.target).toBe(BACKLOG_MAX_TARGET)
  })

  it('nhóm sort: mọi row need/farm đứng TRƯỚC mọi row enough/surplus', () => {
    const rows = setBacklog(SONATA_SETS, realChars, usable, 3)
    const rank = (s: string) => (s === 'enough' || s === 'surplus' ? 1 : 0)
    for (let i = 1; i < rows.length; i++) expect(rank(rows[i - 1].status)).toBeLessThanOrEqual(rank(rows[i].status))
  })

  it('farm: havoc-eclipse trên demo có mảnh tốt nhưng chưa đủ target', () => {
    const rows = setBacklog(SONATA_SETS, realChars, usable, 3)
    const havoc = rows.find((r) => r.def.id === 'havoc-eclipse')
    expect(havoc).toBeTruthy()
    expect(havoc!.owned).toBeGreaterThan(0)
    expect(havoc!.goodOwned).toBeGreaterThan(0)
    expect(havoc!.goodOwned).toBeLessThan(havoc!.target)
    expect(havoc!.status).toBe('farm')
  })

  it('enough: đủ mảnh tốt (≥ target) → cân nhắc dừng', () => {
    // clone echo tốt (Havoc Dreadmane, hợp Havoc DPS) đủ nhiều để vượt target của havoc-eclipse
    const good = DEMO_ECHOES.find((e) => e.name === 'Havoc Dreadmane')!
    const many = Array.from({ length: BACKLOG_MAX_TARGET }, (_, i) => ({ ...good, id: `enough-${i}` }))
    const rows = setBacklog(SONATA_SETS, realChars, many, 3)
    const havoc = rows.find((r) => r.def.id === 'havoc-eclipse')!
    expect(havoc.goodOwned).toBeGreaterThanOrEqual(havoc.target)
    expect(havoc.status).toBe('enough')
  })

  it('surplus: echo thuộc set KHÔNG ai muốn → surplus (demand 0, chỉ có tồn)', () => {
    const wanted = new Set(setFarmSummary(SONATA_SETS, realChars, 3).map((r) => r.def.id))
    const unwanted = SONATA_SETS.find((s) => !wanted.has(s.id))
    expect(unwanted).toBeTruthy() // top-3 không phủ hết 34 set
    const fake: Echo = { id: 'surp-1', name: 'x', cost: 4, set: unwanted!.id, rarity: 5, level: 25, mainStat: 'critRate', substats: [] }
    const rows = setBacklog(SONATA_SETS, realChars, [fake], 3)
    const row = rows.find((r) => r.def.id === unwanted!.id)!
    expect(row.status).toBe('surplus')
    expect(row.demand).toBe(0)
    expect(row.owned).toBe(1)
    expect(row.target).toBe(0)
  })

  it('không throw trên toàn bộ set × roster với demo', () => {
    expect(() => setBacklog(SONATA_SETS, realChars, usable, 3)).not.toThrow()
  })
})

// ---- F15 (task 65): swapSuggestions ----

describe('swapSuggestions', () => {
  const camellya = byId.camellya // havoc DPS: hợp havocDmg + crit
  const shorekeeper = byId.shorekeeper // support: hợp energyRegen/heal
  // eForA hợp Camellya (havocDmg + crit) — nhưng đang ở bộ SHOREKEEPER (lệch)
  const eForA: Echo = { id: 'ea', name: 'ForA', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [{ stat: 'critRate', value: 10.5 }, { stat: 'critDmg', value: 21 }] }
  // eForB hợp Shorekeeper (energyRegen) — nhưng đang ở bộ CAMELLYA (lệch)
  const eForB: Echo = { id: 'eb', name: 'ForB', cost: 3, set: 'rejuvenating-glow', rarity: 5, level: 25, mainStat: 'energyRegen', substats: [{ stat: 'energyRegen', value: 10 }, { stat: 'hpPct', value: 10.9 }] }

  it('tìm swap cùng cost làm tăng tổng điểm, hướng đúng', () => {
    const assignments: RosterAssignment[] = [
      { profile: camellya, result: scoreLoadout([eForB], camellya) },
      { profile: shorekeeper, result: scoreLoadout([eForA], shorekeeper) },
    ]
    const swaps = swapSuggestions(assignments, 5)
    expect(swaps.length).toBeGreaterThan(0)
    expect(swaps[0].delta).toBeGreaterThan(0)
    // swap: eForB rời Camellya sang Shorekeeper, eForA về Camellya
    expect(swaps[0].echoOut.id).toBe('eb')
    expect(swaps[0].echoIn.id).toBe('ea')
  })

  it('bộ đã tối ưu (mỗi người giữ echo hợp mình) → không có swap dương', () => {
    const assignments: RosterAssignment[] = [
      { profile: camellya, result: scoreLoadout([eForA], camellya) },
      { profile: shorekeeper, result: scoreLoadout([eForB], shorekeeper) },
    ]
    expect(swapSuggestions(assignments).length).toBe(0)
  })

  it('bỏ qua nhân vật result null; khác cost không hoán', () => {
    const c1: Echo = { ...eForA, id: 'c1', cost: 1 }
    const assignments: RosterAssignment[] = [
      { profile: camellya, result: scoreLoadout([eForB], camellya) },
      { profile: shorekeeper, result: null },
      { profile: byId.roccia, result: scoreLoadout([c1], byId.roccia) }, // cost 1 ≠ cost 3 → không hoán với eForB
    ]
    expect(() => swapSuggestions(assignments)).not.toThrow()
    // chỉ 1 người có bộ cost-3 nên không có cặp cùng cost để swap
    expect(swapSuggestions(assignments).every((s) => s.echoOut.cost === s.echoIn.cost)).toBe(true)
  })
})

// ---- F4 (task 63): triageCandidates ----

describe('triageCandidates', () => {
  const mk = (id: string, over: Partial<Echo> = {}): Echo =>
    ({ id, name: id, cost: 4, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'critRate', substats: [], ...over })

  it('loại echo lock + trash khỏi danh sách duyệt', () => {
    const es = [mk('a'), mk('b', { lock: true }), mk('c', { trash: true })]
    expect(triageCandidates(es, 'newest', new Map()).map((e) => e.id)).toEqual(['a'])
  })

  it('newest: ngược thứ tự thêm vào kho', () => {
    const es = [mk('a'), mk('b'), mk('c')]
    expect(triageCandidates(es, 'newest', new Map()).map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })

  it('worst: tăng dần theo điểm best-owner #1, echo không-hợp-ai lên đầu', () => {
    const es = [mk('hi'), mk('lo'), mk('none')]
    const owners = new Map<string, OwnerFit[]>([
      ['hi', [{ totalScore: 90 } as OwnerFit]],
      ['lo', [{ totalScore: 30 } as OwnerFit]],
      // 'none' không có entry → val -1 → lên đầu
    ])
    expect(triageCandidates(es, 'worst', owners).map((e) => e.id)).toEqual(['none', 'lo', 'hi'])
  })
})
