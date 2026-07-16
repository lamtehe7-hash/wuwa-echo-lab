import { describe, expect, it } from 'vitest'
import type { CharacterProfile, Echo, MainStatKey, SubstatKey } from '../types'
import { PREF_MAIN_BONUS, SET_PREF_BONUS, canAnchorMore, scoreLoadout, setTierScore, solveBest5 } from './solver'
import { echoER, scoreEcho, theoreticalMax } from './score'
import { loadoutDamageMultiplier, nonEchoER } from './damage'
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
  const theoMax = theoreticalMax(profile)
  const sumValue = chosen.reduce((s, e) => {
    const prefs = profile.mainStatPrefs[String(e.cost) as '1' | '3' | '4'] ?? []
    return s + scoreEcho(e, profile).totalScore + (prefs.includes(e.mainStat) ? PREF_MAIN_BONUS : 0)
  }, 0)

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
    bonus += setTierScore(def, n, profile, theoMax)
    if (profile.preferredSets.includes(setId)) {
      if (n >= Math.max(...def.pieces)) bonus += SET_PREF_BONUS.fullPreferred
      else if (n >= Math.min(...def.pieces)) bonus += SET_PREF_BONUS.partialPreferred
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

describe('solveBest5 vs brute-force — REGRESSION prune bound với set 1-mảnh (2+2+1 = 3 set)', () => {
  // Bug đã fix (07/2026): maxPossibleSetBonus cũ chỉ cộng top-2 set full → khi bộ 5 chia
  // 2+2+1 cho 3 set (set 1-mảnh shadow-of-shattered-dreams làm set thứ 3) và 5pc của các
  // set 2pc vô giá trị với profile (moonlit-clouds 5pc = []), bound < bonus thật → DFS
  // prune nhầm nghiệm tối ưu. Seed 2/20/27/52 từng fail (vd seed 27: 298.39 vs 310.75).
  const TRICKY_SETS = ['moonlit-clouds', 'empyrean-anthem', 'shadow-of-shattered-dreams', 'song-of-feathered-trace']
  const erBuffer: CharacterProfile = {
    id: 'er-buffer', name: 'ER Buffer', element: 'havoc', archetype: 'buffer',
    weights: { energyRegen: 1, heavyAtk: 0.12, basicAtk: 0.5, critRate: 0.38, atkPct: 0.02 },
    mainStatPrefs: { '1': ['atkPct'], '3': ['energyRegen'], '4': ['critRate'] },
    preferredSets: ['shadow-of-shattered-dreams'],
  }
  function trickyEcho(rng: () => number, idx: number): Echo {
    const cost = pick(rng, [1, 3, 4] as const)
    const mainStat = pick(rng, MAINSTATS[cost]).key
    const set = pick(rng, TRICKY_SETS)
    const nSub = Math.floor(rng() * 6)
    const stats: SubstatKey[] = shuffle(rng, [...SUBSTAT_KEYS]).slice(0, nSub)
    const substats = stats.map((stat) => ({ stat, value: pick(rng, SUBSTATS[stat].rolls) }))
    return { id: `t${idx}`, name: `T${idx}`, cost, set, rarity: 5, level: 25, mainStat, substats }
  }
  for (const seed of [2, 20, 27, 52, 7, 99]) {
    it(`khớp brute-force, kho 8-11 echo tricky-set, seed=${seed}`, () => {
      const rng = mulberry32(seed)
      const n = 8 + Math.floor(rng() * 4)
      const echoes = Array.from({ length: n }, (_, i) => trickyEcho(rng, i))
      const result = solveBest5(echoes, erBuffer)
      expect(result).not.toBeNull()
      expect(result!.total).toBeCloseTo(referenceBest(echoes, erBuffer), 5)
    })
  }
})

// F14 (task 64): brute-force optimum RÀNG BUỘC chứa echo ghim (pinned) — mọi combo phải gồm pinned.
function referenceBestPinned(echoes: Echo[], profile: CharacterProfile, pinnedId: string): number {
  const pinned = echoes.find((e) => e.id === pinnedId)!
  const rest = echoes.filter((e) => e.id !== pinnedId)
  let best = -Infinity
  for (let k = 0; k <= 4; k++) {
    for (const combo of combinations(rest, k)) {
      const full = [pinned, ...combo]
      if (full.reduce((s, e) => s + e.cost, 0) > COST_CAP) continue
      const total = referenceTotal(full, profile)
      if (total > best) best = total
    }
  }
  return best
}

describe('solveBest5 — pinned (F14): ép echo ghim + khớp brute-force ràng buộc', () => {
  const profiles = [CHARACTER_BY_ID['camellya'], CHARACTER_BY_ID['yinlin'], CHARACTER_BY_ID['shorekeeper']]

  for (const seed of [1, 42, 12345, 7, 99]) {
    it(`pinned 1 echo: bộ CHỨA pinned + total khớp brute-force, seed=${seed}`, () => {
      const rng = mulberry32(seed)
      const n = 6 + Math.floor(rng() * 5)
      const echoes = Array.from({ length: n }, (_, i) => randomEcho(rng, i))
      for (const profile of profiles) {
        const pinnedId = pick(rng, echoes).id
        const result = solveBest5(echoes, profile, undefined, 'score', undefined, [pinnedId])
        expect(result).not.toBeNull()
        expect(result!.echoes.some((se) => se.echo.id === pinnedId)).toBe(true)
        expect(result!.total).toBeCloseTo(referenceBestPinned(echoes, profile, pinnedId), 5)
        expect(result!.totalCost).toBeLessThanOrEqual(12)
      }
    })
  }

  it('pinned overrides forcedSet: echo ghim khác set vẫn có trong bộ', () => {
    const cam = CHARACTER_BY_ID['camellya']
    // ghim 1 echo cost-1 set 'moonlit-clouds' nhưng ép forcedSet 'havoc-eclipse'
    const pinnedEcho: Echo = { id: 'pin1', name: 'Pin1', cost: 1, set: 'moonlit-clouds', rarity: 5, level: 25, mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 8 }] }
    const result = solveBest5([...DEMO_ECHOES, pinnedEcho], cam, 'havoc-eclipse', 'score', undefined, ['pin1'])
    expect(result).not.toBeNull()
    expect(result!.echoes.some((se) => se.echo.id === 'pin1')).toBe(true)
  })

  it('pinned rỗng ⇒ Y HỆT không truyền pinned', () => {
    for (const profile of profiles) {
      const a = solveBest5(DEMO_ECHOES, profile)
      const b = solveBest5(DEMO_ECHOES, profile, undefined, 'score', undefined, [])
      expect(b?.total).toBeCloseTo(a?.total ?? NaN, 6)
    }
  })
})

describe('canAnchorMore (F14): chặn neo bất khả thi', () => {
  const mk = (id: string, cost: 1 | 3 | 4): Echo => ({ id, name: id, cost, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'critRate', substats: [] })
  it('ok khi trong giới hạn', () => {
    expect(canAnchorMore([mk('a', 4), mk('b', 3)], mk('c', 1)).ok).toBe(true)
    expect(canAnchorMore([], mk('a', 4)).ok).toBe(true)
  })
  it('chặn khi > 5 echo (5 cost-1 rồi neo thêm)', () => {
    const five = [mk('a', 1), mk('b', 1), mk('c', 1), mk('d', 1), mk('e', 1)]
    expect(canAnchorMore(five, mk('f', 1))).toEqual({ ok: false, reason: 'count' })
  })
  it('chặn khi vượt cost cap 12', () => {
    expect(canAnchorMore([mk('a', 4), mk('b', 4), mk('c', 3)], mk('d', 3))).toEqual({ ok: false, reason: 'cost' }) // 11+3=14
    expect(canAnchorMore([mk('a', 4), mk('b', 3), mk('c', 3)], mk('d', 3))).toEqual({ ok: false, reason: 'cost' }) // 10+3=13
  })
  it('cost = đúng 12 vẫn OK (không >)', () => {
    expect(canAnchorMore([mk('a', 4), mk('b', 4)], mk('c', 4)).ok).toBe(true) // 8+4=12
  })
  // Ghi chú: trần nhóm (ANCHOR_GROUP_MAX) là guard PHÒNG THỦ trùng GROUP_MAX solver — thực tế
  // luôn bị count/cost chặn trước (cost-4 cap 3 = cost 12; cost-3 cap 4 = cost 12; cost-1 cap 5 = count 5).
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

  it('5 echo cùng set KHÁC TÊN → setCount = 5, bonus = stat thật (2pc+5pc) + điểm preferred đủ set', () => {
    const r = solveBest5(makeFive(false), camellya)!
    expect(r.setCounts['havoc-eclipse']).toBe(5)
    const expected =
      setTierScore(SONATA_BY_ID['havoc-eclipse'], 5, camellya, theoreticalMax(camellya)) +
      SET_PREF_BONUS.fullPreferred
    expect(r.setBonusScore).toBeCloseTo(expected, 9)
    expect(r.setBonusScore).toBeGreaterThan(SET_PREF_BONUS.fullPreferred) // stat thật phải > 0
  })
})

describe('main stat có GIÁ TRỊ thật trong điểm (scoreEcho.totalScore / mainScore)', () => {
  const camellya = CHARACTER_BY_ID['camellya'] // havoc, critBasic
  const bare = (id: string, cost: 1 | 3 | 4, mainStat: Echo['mainStat'], set = 'lingering-tunes'): Echo => ({
    id, name: id, cost, set, rarity: 5, level: 25, mainStat, substats: [],
  })

  it('cost-4 substat rỗng: main Crit DMG > main Healing Bonus với DPS (trước đây cả hai = 0)', () => {
    const crit = scoreEcho(bare('crit', 4, 'critDmg'), camellya)
    const heal = scoreEcho(bare('heal', 4, 'healingBonus'), camellya)
    expect(crit.mainScore).toBeGreaterThan(0)
    expect(heal.mainScore).toBe(0) // camellya không có trọng số healingBonus
    expect(crit.totalScore).toBeGreaterThan(heal.totalScore)
  })

  it('cost-3: main đúng nguyên tố (Havoc) có điểm, sai nguyên tố (Glacio) = 0', () => {
    expect(scoreEcho(bare('right', 3, 'havocDmg'), camellya).mainScore).toBeGreaterThan(0)
    expect(scoreEcho(bare('wrong', 3, 'glacioDmg'), camellya).mainScore).toBe(0)
  })

  it('solver chọn main crit thay vì healing khi cost cap chỉ cho 1 echo cost-4', () => {
    const echoes = [
      bare('heal', 4, 'healingBonus'), bare('crit', 4, 'critDmg'),
      bare('e3a', 3, 'havocDmg'), bare('e3b', 3, 'havocDmg'),
      bare('c1a', 1, 'atkPct'), bare('c1b', 1, 'atkPct'),
    ]
    const r = solveBest5(echoes, camellya)! // 4+4+3+3+1+1 = 16 > 12 → phải bỏ 1 cost-4
    const ids = r.echoes.map((s) => s.echo.id)
    expect(ids).toContain('crit')
    expect(ids).not.toContain('heal')
  })
})

describe('solveBest5 — layout 4-4-1-1-1 vs 4-3-3-1-1 cân bằng số thật', () => {
  // Nhân vật giả lập không preferredSets, không erTarget để cô lập phần main stat + layout
  const profile: CharacterProfile = {
    ...CHARACTER_BY_ID['camellya'],
    id: 'test-dps', preferredSets: [], erTarget: undefined,
  }
  const bare = (id: string, cost: 1 | 3 | 4, mainStat: Echo['mainStat'], set: string): Echo => ({
    id, name: id, cost, set, rarity: 5, level: 25, mainStat, substats: [],
  })

  it('kho có 2 cost-4 crit + cost-3 sai nguyên tố → chọn 4-4-1-1-1 thay vì nhét cost-3 vô dụng', () => {
    const echoes = [
      bare('c4a', 4, 'critDmg', 'havoc-eclipse'),
      bare('c4b', 4, 'critRate', 'midnight-veil'),
      bare('e3a', 3, 'glacioDmg', 'freezing-frost'), // sai nguyên tố → mainScore 0
      bare('e3b', 3, 'glacioDmg', 'freezing-frost'),
      bare('c1a', 1, 'atkPct', 'havoc-eclipse'),
      bare('c1b', 1, 'atkPct', 'midnight-veil'),
      bare('c1c', 1, 'atkPct', 'lingering-tunes'),
    ]
    const r = solveBest5(echoes, profile)!
    expect([...r.layout].sort((a, b) => b - a)).toEqual([4, 4, 1, 1, 1])
  })

  it('cost-3 ĐÚNG nguyên tố đủ tốt → 4-3-3-1-1 thắng 4-4-1-1-1 (main 30%+30% > crit 22%)', () => {
    const echoes = [
      bare('c4a', 4, 'critDmg', 'havoc-eclipse'),
      bare('c4b', 4, 'critRate', 'midnight-veil'), // crit 22% — sẽ thua 2 main havoc 30%
      bare('e3a', 3, 'havocDmg', 'havoc-eclipse'),
      bare('e3b', 3, 'havocDmg', 'midnight-veil'),
      bare('c1a', 1, 'atkPct', 'havoc-eclipse'),
      bare('c1b', 1, 'atkPct', 'midnight-veil'),
      bare('c1c', 1, 'atkPct', 'lingering-tunes'),
    ]
    const r = solveBest5(echoes, profile)!
    expect([...r.layout].sort((a, b) => b - a)).toEqual([4, 3, 3, 1, 1])
  })
})

describe('solveBest5 — ưu tiên kích hoạt ĐỦ set 5/5 bằng stat thật', () => {
  const camellya = CHARACTER_BY_ID['camellya'] // preferredSets: ['havoc-eclipse']
  const he = (id: string, cost: 1 | 3 | 4, mainStat: Echo['mainStat'], subs: Echo['substats'] = []): Echo => ({
    id, name: id, cost, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat, substats: subs,
  })

  it('mảnh thứ 5 cùng set thắng echo lẻ set khác có substat nhỉnh hơn chút (giá 5pc > 1 roll)', () => {
    // 4 mảnh havoc-eclipse sẵn + lựa chọn slot cuối: mảnh thứ 5 (substat rỗng) vs
    // echo Lingering Tunes có 1 roll critRate max (~26 điểm với camellya)
    const base = [
      he('h4', 4, 'critDmg'),
      he('h3a', 3, 'havocDmg'),
      he('h3b', 3, 'havocDmg'),
      he('h1a', 1, 'atkPct'),
    ]
    const fifth = he('h1b', 1, 'atkPct')
    const rival: Echo = {
      id: 'rival', name: 'Rival', cost: 1, set: 'lingering-tunes', rarity: 5, level: 25,
      mainStat: 'atkPct', substats: [{ stat: 'critRate', value: maxRoll('critRate') }],
    }
    const r = solveBest5([...base, fifth, rival], camellya)!
    expect(r.setCounts['havoc-eclipse']).toBe(5)
    const ids = r.echoes.map((s) => s.echo.id)
    expect(ids).toContain('h1b')
    expect(ids).not.toContain('rival')
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

describe('solveBest5 — ER thật từ build context (task 55: vũ khí/passive gánh bớt erTarget)', () => {
  const yinlin = CHARACTER_BY_ID['yinlin'] // erTarget 125 → need 25 khi không ctx
  const erCtx = { weaponId: 'bloodpacts-pledge' } // secondary ER 38.8 > need 25 → echo hết phải gánh ER
  const erEcho: Echo = {
    id: 'withEr', name: 'WithER', cost: 3, set: 'void-thunder', rarity: 5, level: 25,
    mainStat: 'energyRegen', // main ER 32.0
    substats: [{ stat: 'critRate', value: 10.5 }, { stat: 'critDmg', value: 21.0 }],
  }

  it('ctx có vũ khí ER phủ hết need → TOÀN BỘ ER echo thành excess, total thấp hơn không-ctx', () => {
    const without = solveBest5([erEcho], yinlin)!
    const withCtx = solveBest5([erEcho], yinlin, undefined, 'score', erCtx)!
    expect(nonEchoER(yinlin, erCtx)).toBeCloseTo(38.8, 5)
    // need không-ctx = 25 → excess = 7; need có-ctx = 0 → excess = 32 (phạt nặng hơn)
    expect(withCtx.total).toBeLessThan(without.total)
    const wEr = yinlin.weights.energyRegen ?? 0
    const expectedPenalty = ((wEr * (32 / maxRoll('energyRegen'))) / theoreticalMax(yinlin)) * 100
    expect(withCtx.total).toBeCloseTo(withCtx.subScore + withCtx.setBonusScore - expectedPenalty, 9)
  })

  it('note.erShort dùng need ĐÃ TRỪ ER vũ khí + báo phần extra', () => {
    const heavyEr = { ...yinlin, erTarget: 150 } // need không-ctx 50; có-ctx 50−38.8 = 11.2
    const noErEcho: Echo = {
      id: 'noEr', name: 'NoER', cost: 3, set: 'void-thunder', rarity: 5, level: 25,
      mainStat: 'electroDmg', substats: [{ stat: 'critRate', value: 10.5 }],
    }
    const r = solveBest5([noErEcho], heavyEr, undefined, 'score', erCtx)!
    const note = r.note.find((n) => n.key === 'note.erShort')!
    expect(note).toBeDefined()
    expect(note.params?.need).toBe('11.2')
    expect(note.params?.extra).toBe('38.8')
    // vũ khí ER phủ cả need (erTarget 125 → need 25 < 38.8) → không còn note
    const r2 = solveBest5([noErEcho], yinlin, undefined, 'score', erCtx)!
    expect(r2.note.some((n) => n.key === 'note.erShort')).toBe(false)
  })

  it('scoreLoadout cùng ctx = đúng điểm solver (delta bộ-hiện-tại cùng thang)', () => {
    const best = solveBest5([erEcho], yinlin, undefined, 'score', erCtx)!
    const re = scoreLoadout(best.echoes.map((s) => s.echo), yinlin, erCtx)!
    expect(re.total).toBeCloseTo(best.total, 9)
    expect(re.note.map((n) => n.key)).toEqual(best.note.map((n) => n.key))
  })
})

describe("solveBest5 — objective 'damage': re-rank top-N theo damage model", () => {
  const camellya = CHARACTER_BY_ID['camellya']
  it("'score' (mặc định) không đổi; 'damage' cho bộ có damage TƯƠNG ĐỐI ≥ bộ 'score'", () => {
    const byDefault = solveBest5(DEMO_ECHOES, camellya)!
    const byScore = solveBest5(DEMO_ECHOES, camellya, undefined, 'score')!
    const byDamage = solveBest5(DEMO_ECHOES, camellya, undefined, 'damage')!
    // objective mặc định == 'score' tường minh (hành vi cũ nguyên vẹn)
    expect(byScore.total).toBeCloseTo(byDefault.total, 10)
    expect(byScore.layout).toEqual(byDefault.layout)
    // damage-best (chọn trong top-16, luôn chứa score-best) có damage ≥ score-best
    const dScore = loadoutDamageMultiplier(byScore.echoes.map((se) => se.echo), camellya)
    const dDamage = loadoutDamageMultiplier(byDamage.echoes.map((se) => se.echo), camellya)
    expect(dDamage).toBeGreaterThanOrEqual(dScore - 1e-9)
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

describe('solveBest5 — forcedSet: ép chỉ ghép echo thuộc 1 set', () => {
  const camellya = CHARACTER_BY_ID['camellya']
  const mk = (id: string, set: string, cost: 1 | 3 | 4, main: MainStatKey): Echo => ({
    id, name: id, cost, set, rarity: 5, level: 25, mainStat: main,
    substats: [{ stat: 'critRate', value: 10.5 }, { stat: 'critDmg', value: 21 }],
  })
  // Cost 4-3-3-1-1 = 12 (≤ COST_CAP) để có bộ đủ 5 slot trong CÙNG một set
  const echoes: Echo[] = [
    mk('a1', 'void-thunder', 4, 'critRate'), mk('a2', 'void-thunder', 3, 'havocDmg'),
    mk('a3', 'void-thunder', 3, 'atkPct'), mk('a4', 'void-thunder', 1, 'atkPct'),
    mk('a5', 'void-thunder', 1, 'hpPct'),
    mk('b1', 'freezing-frost', 4, 'critRate'), mk('b2', 'freezing-frost', 3, 'havocDmg'),
    mk('b3', 'freezing-frost', 3, 'atkPct'), mk('b4', 'freezing-frost', 1, 'atkPct'),
    mk('b5', 'freezing-frost', 1, 'hpPct'),
  ]

  it('mọi echo trong kết quả thuộc đúng set bị ép', () => {
    const r = solveBest5(echoes, camellya, 'void-thunder')!
    expect(r.echoes.length).toBe(5)
    expect(r.echoes.every((s) => s.echo.set === 'void-thunder')).toBe(true)
  })

  it('ép set chỉ có 2 echo → bộ 2 slot (thiếu slot, note.partialSlots)', () => {
    const few: Echo[] = [mk('c1', 'sierra-gale', 4, 'critRate'), mk('c2', 'sierra-gale', 3, 'aeroDmg'), ...echoes]
    const r = solveBest5(few, camellya, 'sierra-gale')!
    expect(r.echoes.every((s) => s.echo.set === 'sierra-gale')).toBe(true)
    expect(r.echoes.length).toBe(2)
    expect(r.note.some((n) => n.key === 'note.partialSlots')).toBe(true)
  })

  it('ép set không có echo nào → null', () => {
    expect(solveBest5(echoes, camellya, 'midnight-veil')).toBeNull()
  })

  it('không ép set → đủ 5 slot bình thường (không giới hạn 1 set)', () => {
    const r = solveBest5(echoes, camellya)!
    expect(r.echoes.length).toBe(5)
    expect(r.total).toBeGreaterThan(0)
  })
})

describe('solveBest5 — REGRESSION pool top-K: không vứt mảnh set NGOÀI preferredSets (review 16/07)', () => {
  // Bug đã fix: pool mỗi cost cắt top-10 theo value, chỉ "cứu" thêm ứng viên cho preferredSets.
  // Set khác có bonus dương (vd 2pc Lingering Tunes ATK+10%) mà mảnh rank #11+ bị loại TRƯỚC
  // khi DFS chạy → mất nghiệm tối ưu thật với kho >10 echo/cost (kho farm endgame là chuyện thường).
  const noPref: CharacterProfile = {
    ...CHARACTER_BY_ID['camellya'], id: 'no-pref', preferredSets: [], erTarget: undefined,
  }
  // 10 set "solo" khác nhau, mốc thấp nhất ≥ 2 mảnh → 1 mảnh lẻ không có bonus
  const soloSets = SONATA_SETS.filter((s) => Math.min(...s.pieces) >= 2 && s.id !== 'lingering-tunes')
    .slice(0, 10).map((s) => s.id)

  it('2 mảnh lingering-tunes rank #11/#12 theo value vẫn phải được xét (khớp brute-force, bộ chứa 2pc LT)', () => {
    const echoes: Echo[] = [
      ...soloSets.map((set, i): Echo => ({
        id: `solo${i}`, name: `Solo${i}`, cost: 1, set, rarity: 5, level: 25,
        mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 8.1 }],
      })),
      ...[0, 1].map((i): Echo => ({
        id: `lt${i}`, name: `LT${i}`, cost: 1, set: 'lingering-tunes', rarity: 5, level: 25,
        mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 7.5 }],
      })),
    ]
    const r = solveBest5(echoes, noPref)!
    expect(r.total).toBeCloseTo(referenceBest(echoes, noPref), 5)
    expect(r.setCounts['lingering-tunes']).toBe(2)
  })

  // Fuzz pool > TOP_K, có cả set 3-mảnh-only (dream-of-the-lost) + 1-mảnh (shadow-of-shattered-dreams)
  // — lấp khoảng trống regression cũ (kho ≤11 echo chưa từng chạm nhánh cắt pool / partition 3pc).
  const POOL_SETS = ['lingering-tunes', 'dream-of-the-lost', 'shadow-of-shattered-dreams', 'moonlit-clouds']
  const prefDream: CharacterProfile = {
    ...CHARACTER_BY_ID['camellya'], id: 'pref-dream', preferredSets: ['dream-of-the-lost'], erTarget: undefined,
  }
  for (const seed of [3, 11, 77]) {
    it(`fuzz pool>TOP_K: 14-18 echo cost-1 (set 3-mảnh + 1-mảnh), seed=${seed}`, () => {
      const rng = mulberry32(seed)
      const n = 14 + Math.floor(rng() * 5) // 14..18 — pool cost-1 chắc chắn > TOP_K=10
      const echoes = Array.from({ length: n }, (_, i): Echo => {
        const mainStat = pick(rng, MAINSTATS[1]).key
        const nSub = Math.floor(rng() * 6)
        const stats: SubstatKey[] = shuffle(rng, [...SUBSTAT_KEYS]).slice(0, nSub)
        return {
          id: `p${i}`, name: `P${i}`, cost: 1, set: pick(rng, POOL_SETS), rarity: 5, level: 25,
          mainStat, substats: stats.map((stat) => ({ stat, value: pick(rng, SUBSTATS[stat].rolls) })),
        }
      })
      for (const p of [noPref, prefDream, CHARACTER_BY_ID['camellya']]) {
        const r = solveBest5(echoes, p)
        expect(r).not.toBeNull()
        expect(r!.total).toBeCloseTo(referenceBest(echoes, p), 5)
      }
    })
  }
})
