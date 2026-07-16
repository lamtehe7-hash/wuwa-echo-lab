import { describe, expect, it } from 'vitest'
import type { Echo } from '../types'
import { CHARACTERS } from '../data/characters'
import { DEMO_ECHOES } from '../data/demo'
import { cleanupMatches, type CleanupMatch } from './cleanup'
import type { OwnerFit } from './insights'

const realChars = CHARACTERS.filter((c) => !c.id.startsWith('generic'))
const byName = Object.fromEntries(DEMO_ECHOES.map((e) => [e.name ?? e.id, e])) as Record<string, Echo>
const ids = (list: CleanupMatch[]) => new Set(list.map((m) => m.echo.id))

describe('cleanupMatches', () => {
  it('no-owner: dùng ownersByEcho precomputed — echo owners rỗng thì bị loại', () => {
    const [a, b] = DEMO_ECHOES
    const ownersByEcho = new Map<string, OwnerFit[]>([
      [a.id, []],
      [b.id, [{} as OwnerFit]], // có ≥1 owner → giữ
    ])
    const m = cleanupMatches([a, b], { type: 'no-owner' }, { profiles: [], ownersByEcho })
    expect(ids(m)).toEqual(new Set([a.id]))
  })

  it('no-owner: không map thì tự tính bestOwners, không throw trên demo × roster', () => {
    expect(() => cleanupMatches(DEMO_ECHOES, { type: 'no-owner' }, { profiles: realChars })).not.toThrow()
  })

  it('cost-no-crit: đúng cost 1/3 thiếu CR/CD; cost-4 và echo có crit KHÔNG dính', () => {
    const m = cleanupMatches(DEMO_ECHOES, { type: 'cost-no-crit' }, { profiles: realChars })
    // Tick Tack (cost-1, 0 sub) + Roseshroom (cost-3, hp/def/er) — không crit
    expect(ids(m)).toEqual(new Set([byName['Tick Tack'].id, byName['Roseshroom'].id]))
    // Havoc Prism (cost-1 có critRate) + Crownless (cost-4) không dính
    expect(ids(m).has(byName['Havoc Prism'].id)).toBe(false)
    expect(ids(m).has(byName['Crownless'].id)).toBe(false)
  })

  it('low-rv: RV < ngưỡng — echo 0 sub (RV 0) dính, echo 5 sub tốt không dính', () => {
    const m = cleanupMatches(DEMO_ECHOES, { type: 'low-rv', threshold: 0.3 }, { profiles: realChars })
    expect(ids(m).has(byName['Tick Tack'].id)).toBe(true)
    expect(ids(m).has(byName['Tambourinist'].id)).toBe(false)
  })

  it('keep-top-n: giữ N RV cao nhất mỗi (set,cost), loại phần còn lại', () => {
    // havoc-eclipse cost-1 = {Havoc Prism (2 sub), Havoc Warrior (1 sub), Tick Tack (0 sub)}
    const m = cleanupMatches(DEMO_ECHOES, { type: 'keep-top-n', n: 2 }, { profiles: realChars })
    expect(ids(m).has(byName['Tick Tack'].id)).toBe(true) // RV thấp nhất nhóm → loại
    expect(ids(m).has(byName['Havoc Prism'].id)).toBe(false) // top RV → giữ
  })

  it('keep-top-n: nhóm ≤ N không loại ai', () => {
    const solo = { ...byName['Crownless'], id: 'solo' } // cost-4 havoc-eclipse, nhóm 1 phần tử
    const m = cleanupMatches([solo], { type: 'keep-top-n', n: 3 }, { profiles: realChars })
    expect(m.length).toBe(0)
  })

  it('LUÔN loại trừ echo lock và trash khỏi pool', () => {
    const locked: Echo = { ...byName['Tick Tack'], id: 'L', lock: true }
    const trashed: Echo = { ...byName['Tick Tack'], id: 'T', trash: true }
    // low-rv ngưỡng 1 → mọi echo RV<1 đều khớp, nhưng lock/trash phải bị bỏ
    const m = cleanupMatches([locked, trashed], { type: 'low-rv', threshold: 1 }, { profiles: realChars })
    expect(m.length).toBe(0)
  })
})
