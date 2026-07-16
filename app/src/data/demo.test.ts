import { describe, expect, it } from 'vitest'
import { DEMO_ECHOES } from './demo'
import { ECHOES } from './echoes'
import { MAINSTATS } from './mainstats'
import { SUBSTATS } from './substats'

// Toàn vẹn dữ liệu mẫu (review 16/07): demo từng chế tên+cost+set tuỳ tiện, lệch catalog thật
// (echoes.ts) — card demo không icon, cost/set mâu thuẫn DB. Khoá demo phải khớp catalog.
describe('DEMO_ECHOES khớp catalog echoes.ts', () => {
  const byName = new Map(ECHOES.map((e) => [e.name, e]))

  it('mọi echo demo: tên có thật, cost đúng DB, set nằm trong sets của echo đó', () => {
    for (const d of DEMO_ECHOES) {
      const info = byName.get(d.name ?? '')
      expect(info, `"${d.name}" phải có trong echoes.ts`).toBeDefined()
      expect(info!.cost, `"${d.name}" cost`).toBe(d.cost)
      expect(info!.sets, `"${d.name}" set`).toContain(d.set)
    }
  })

  it('main stat hợp lệ với cost + substat ở mốc roll hợp lệ', () => {
    for (const d of DEMO_ECHOES) {
      expect(MAINSTATS[d.cost].some((m) => m.key === d.mainStat), `"${d.name}" main ${d.mainStat}`).toBe(true)
      for (const s of d.substats) {
        expect(SUBSTATS[s.stat].rolls, `"${d.name}" sub ${s.stat}=${s.value}`).toContain(s.value)
      }
    }
  })

  it('id demo không trùng nhau', () => {
    const ids = DEMO_ECHOES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
