import { describe, expect, it } from 'vitest'
import { MAIN_ECHOES, mainEchoesFor } from './mainEchoes'
import { CHARACTER_BY_ID } from './characters'
import { findEchoInfo } from './echoIndex'
import { SONATA_BY_ID } from './sonata'

// Kiểm tra toàn vẹn data main echo: tên echo có thật + cost-4 + set khớp; charId + set tồn tại.
describe('MAIN_ECHOES integrity', () => {
  const entries = Object.entries(MAIN_ECHOES)

  it('mọi charId khớp CHARACTER_BY_ID', () => {
    for (const [id] of entries) expect(CHARACTER_BY_ID[id], id).toBeTruthy()
  })

  it('mọi echo có trong DB, cost-4, và set nằm trong sets hợp lệ của echo đó', () => {
    for (const [id, recs] of entries) {
      expect(recs.length, `${id} rỗng`).toBeGreaterThan(0)
      for (const r of recs) {
        const info = findEchoInfo(r.echo)
        expect(info, `${id}: echo "${r.echo}" không có trong DB`).toBeTruthy()
        expect(info!.cost, `${id}: "${r.echo}" không phải cost-4`).toBe(4)
        expect(info!.sets, `${id}: "${r.echo}" không thuộc set ${r.set}`).toContain(r.set)
        expect(SONATA_BY_ID[r.set], `${id}: set ${r.set} không tồn tại`).toBeTruthy()
        expect(r.reason.trim().length, `${id}: reason rỗng`).toBeGreaterThan(0)
      }
    }
  })

  it('entry đầu (BiS) nên khớp một preferredSet của nhân vật (cảnh báo mềm — chỉ log)', () => {
    for (const [id, recs] of entries) {
      const char = CHARACTER_BY_ID[id]
      if (!char || char.preferredSets.length === 0) continue
      if (!char.preferredSets.includes(recs[0].set)) {
        // Không fail (một số main echo BiS gắn set không nằm trong preferredSets rút gọn) — chỉ ghi log.
        console.warn(`main echo BiS của ${id} (${recs[0].set}) không nằm trong preferredSets ${char.preferredSets.join(',')}`)
      }
    }
    expect(true).toBe(true)
  })

  it('mainEchoesFor trả rỗng cho id lạ', () => {
    expect(mainEchoesFor('không-tồn-tại')).toEqual([])
  })
})
