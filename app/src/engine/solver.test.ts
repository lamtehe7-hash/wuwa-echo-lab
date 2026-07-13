import { describe, expect, it } from 'vitest'
import type { CharacterProfile, Echo, SubstatKey } from '../types'
import { SET_BONUS, solveBest5 } from './solver'
import { echoER, scoreEcho, theoreticalMax } from './score'
import { CHARACTERS, CHARACTER_BY_ID } from '../data/characters'
import { DEMO_ECHOES } from '../data/demo'
import { COST_CAP, MAINSTATS } from '../data/mainstats'
import { SONATA_BY_ID, SONATA_SETS } from '../data/sonata'
import { SUBSTATS, SUBSTAT_KEYS, maxRoll } from '../data/substats'

// ---------- PRNG seed cố định (không dùng Math.random không seed) ----------
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}
function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const RANDOM_SETS = SONATA_SETS.slice(0, 4).map((s) => s.id)
function randomEcho(rng: () => number, idx: number): Echo {
  const cost = pick(rng, [1, 3, 4] as const)
  const mainStat = pick(rng, MAINSTATS[cost]).key
  const set = pick(rng, RANDOM_SETS)
  const nSub = Math.floor(rng() * 6) // 0..5
  const stats: SubstatKey[] = shuffle(rng, [...SUBSTAT_KEYS]).slice(0, nSub)
  const substats = stats.map((stat) => ({ stat, value: pick(rng, SUBSTATS[stat].rolls) }))
  return { id: `r${idx}`, name: `R${idx}`, cost, set, rarity: 5, level: 25, mainStat, substats }
}

// ---------- Brute-force enumeration thuần (không tái dùng nội bộ solver.ts) ----------
function combinations<T>(arr: T[], k: number): T[][] {
  const out: T[][] = []
  const combo: T[] = []
  const go = (start: number) => {
    if (combo.length === k) { out.push([...combo]); return }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i])
      go(i + 1)
      combo.pop()
    }
  }
  go(0)
  return out
}

function referenceTotal(chosen: Echo[], profile: CharacterProfile): number {
  const scored = chosen.map((e) => scoreEcho(e, profile))
  const sumValue = scored.reduce((s, sc) => s + sc.score * sc.fitLevel, 0)

  const uniqueNames: Record<string, Set<string>> = {}
  chosen.forEach((e) => {
    const nameKey = `${e.set}::${e.name?.trim().toLowerCase() || e.id}`
    ;(uniqueNames[e.set] ??= new Set()).add(nameKey)
  })
  let bonus = 0
  for (const [setId, names] of Object.entries(uniqueNames)) {
    const n = names.size
    const def = SONATA_BY_ID[setId]
    if (!def) continue
    const preferred = profile.preferredSets.includes(setId)
    if (preferred) {
      if (def.pieces.includes(5) && n >= 5) bonus += SET_BONUS.preferred5pc
      else if (def.pieces.includes(3) && n >= 3) bonus += SET_BONUS.preferred3pc
      else if (def.pieces.includes(2) && n >= 2) bonus += SET_BONUS.preferred2pc
      else if (def.pieces.includes(1) && n >= 1) bonus += SET_BONUS.preferred1pc
    } else if (def.element === profile.element && def.pieces.includes(2) && n >= 2) {
      bonus += SET_BONUS.elemental2pc
    }
  }

  let penalty = 0
  if (profile.erTarget) {
    const wEr = profile.weights.energyRegen ?? 0
    if (wEr > 0) {
      const erGained = chosen.reduce((s, e) => s + echoER(e), 0)
      const need = Math.max(0, profile.erTarget - 100)
      const excess = Math.max(0, erGained - need)
      penalty = ((wEr * (excess / maxRoll('energyRegen'))) / theoreticalMax(profile)) * 100
    }
  }
  return sumValue + bonus - penalty
}

function referenceBest(echoes: Echo[], profile: CharacterProfile): number {
  let best = -Infinity
  for (let k = 1; k <= 5; k++) {
    for (const combo of combinations(echoes, k)) {
      const cost = combo.reduce((s, e) => s + e.cost, 0)
      if (cost > COST_CAP) continue
      const total = referenceTotal(combo, profile)
      if (total > best) best = total
    }
  }
  return best
}

describe('solveBest5 — ràng buộc cơ bản', () => {
  it('mọi kết quả: tổng cost ≤ 12 và không bao giờ quá 5 slot (DEMO_ECHOES × mọi profile)', () => {
    for (const profile of CHARACTERS) {
      const r = solveBest5(DEMO_ECHOES, profile)
      if (!r) continue
      expect(r.totalCost).toBeLessThanOrEqual(12)
      expect(r.layout.length).toBeLessThanOrEqual(5)
      expect(r.layout.reduce((s, c) => s + c, 0)).toBe(r.totalCost)
      expect(r.echoes.length).toBe(r.layout.length)
    }
  })
})

describe('solveBest5 vs brute-force enumeration thuần (kho nhỏ tự chế)', () => {
  const profiles = [CHARACTER_BY_ID['camellya'], CHARACTER_BY_ID['yinlin'], CHARACTER_BY_ID['shorekeeper']]

  it('khớp brute-force trên DEMO_ECHOES (10 echo, cố định — không random)', () => {
    for (const profile of profiles) {
      const result = solveBest5(DEMO_ECHOES, profile)
      expect(result).not.toBeNull()
      const ref = referenceBest(DEMO_ECHOES, profile)
      expect(result!.total).toBeCloseTo(ref, 6)
    }
  })

  for (const seed of [1, 42, 12345]) {
    it(`khớp brute-force với kho ngẫu nhiên seed=${seed} (6-10 echo, seed cố định)`, () => {
      const rng = mulberry32(seed)
      const n = 6 + Math.floor(rng() * 5) // 6..10
      const echoes = Array.from({ length: n }, (_, i) => randomEcho(rng, i))
      for (const profile of profiles) {
        const result = solveBest5(echoes, profile)
        expect(result).not.toBeNull()
        const ref = referenceBest(echoes, profile)
        expect(result!.total).toBeCloseTo(ref, 5)
        expect(result!.totalCost).toBeLessThanOrEqual(12)
        expect(result!.layout.length).toBeLessThanOrEqual(5)
      }
    })
  }
})

describe('solveBest5 — luật trùng tên (nameKey) khi đếm mảnh set', () => {
  const camellya = CHARACTER_BY_ID['camellya'] // preferredSets: ['havoc-eclipse'], pieces [2,5]
  function makeFive(sameName: boolean): Echo[] {
    const names = sameName ? ['Dup', 'Dup', 'Dup', 'Dup', 'Dup'] : ['A', 'B', 'C', 'D', 'E']
    return [
      { id: 'h1', name: names[0], cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [] },
      { id: 'h2', name: names[1], cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [] },
      { id: 'h3', name: names[2], cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [] },
      { id: 'h4', name: names[3], cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [] },
      { id: 'h5', name: names[4], cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [] },
    ]
  }

  it('5 echo cùng set CÙNG TÊN → setCount = 1, KHÔNG có bonus preferred5pc', () => {
    const r = solveBest5(makeFive(true), camellya)!
    expect(r.setCounts['havoc-eclipse']).toBe(1)
    expect(r.setBonusScore).toBe(0)
  })

  it('5 echo cùng set KHÁC TÊN → setCount = 5, có bonus preferred5pc', () => {
    const r = solveBest5(makeFive(false), camellya)!
    expect(r.setCounts['havoc-eclipse']).toBe(5)
    expect(r.setBonusScore).toBe(SET_BONUS.preferred5pc)
  })
})

describe('solveBest5 — chiết khấu ER vượt erTarget', () => {
  const yinlin = CHARACTER_BY_ID['yinlin'] // erTarget 125 → need = 25, weights.energyRegen = 0.6

  it('erGained ≤ need → không bị phạt (penalty = 0)', () => {
    const e: Echo = {
      id: 'noEr', name: 'NoER', cost: 3, set: 'void-thunder', rarity: 5, level: 25,
      mainStat: 'electroDmg', substats: [{ stat: 'critRate', value: 10.5 }, { stat: 'critDmg', value: 21.0 }],
    }
    const r = solveBest5([e], yinlin)!
    expect(r.erGained).toBe(0)
    expect(r.total).toBeCloseTo(r.subScore + r.setBonusScore, 9)
  })

  it('erGained > need → bị phạt đúng công thức wEr×(excess/maxRoll(ER))/theoreticalMax×100', () => {
    const e: Echo = {
      id: 'withEr', name: 'WithER', cost: 3, set: 'void-thunder', rarity: 5, level: 25,
      mainStat: 'energyRegen', // main ER mặc định 32.0 (echoER) → chắc chắn vượt need=25
      substats: [{ stat: 'critRate', value: 10.5 }, { stat: 'critDmg', value: 21.0 }],
    }
    const r = solveBest5([e], yinlin)!
    expect(r.erGained).toBeCloseTo(32, 5)
    const need = Math.max(0, (yinlin.erTarget ?? 0) - 100)
    const excess = Math.max(0, r.erGained - need)
    const wEr = yinlin.weights.energyRegen ?? 0
    const expectedPenalty = ((wEr * (excess / maxRoll('energyRegen'))) / theoreticalMax(yinlin)) * 100
    expect(expectedPenalty).toBeGreaterThan(0)
    expect(r.total).toBeCloseTo(r.subScore + r.setBonusScore - expectedPenalty, 9)
  })
})

describe('solveBest5 — tie-break: điểm bằng nhau thì chọn layout nhiều slot hơn', () => {
  const camellya = CHARACTER_BY_ID['camellya']
  it('thêm 1 echo giá trị 0 (main stat sai, substats rỗng) vào kho → total không đổi nhưng layout dùng thêm slot', () => {
    const real: Echo = {
      id: 'real', name: 'Real', cost: 1, set: 'lingering-tunes', rarity: 5, level: 25,
      mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 6.3 }],
    }
    const dummy: Echo = {
      id: 'dummy', name: 'Dummy', cost: 1, set: 'freezing-frost', rarity: 5, level: 25,
      mainStat: 'defPct', substats: [], // fit 0.25, raw 0 → value = 0 tuyệt đối
    }
    const oneSlot = solveBest5([real], camellya)!
    const twoSlot = solveBest5([real, dummy], camellya)!
    expect(oneSlot.layout).toEqual([1])
    expect(twoSlot.layout).toEqual([1, 1])
    expect(twoSlot.total).toBeCloseTo(oneSlot.total, 10)
  })
})
