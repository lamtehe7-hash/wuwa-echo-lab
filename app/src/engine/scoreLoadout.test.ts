import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../data/characters'
import { DEMO_ECHOES } from '../data/demo'
import { scoreLoadout, solveBest5 } from './solver'

// scoreLoadout (C1 — chấm "bộ hiện tại") phải dùng ĐÚNG objective của solver:
// chấm lại chính bộ solver trả về thì tổng điểm/thành phần phải trùng khớp.

describe('scoreLoadout', () => {
  it('chấm lại bộ do solver trả về = đúng điểm solver (cùng objective)', () => {
    let checked = 0
    for (const profile of CHARACTERS.slice(0, 8)) {
      const best = solveBest5(DEMO_ECHOES, profile)
      if (!best) continue
      const re = scoreLoadout(best.echoes.map((s) => s.echo), profile)
      expect(re).not.toBeNull()
      expect(re!.total).toBeCloseTo(best.total, 6)
      expect(re!.subScore).toBeCloseTo(best.subScore, 6)
      expect(re!.setBonusScore).toBeCloseTo(best.setBonusScore, 6)
      expect(re!.erGained).toBeCloseTo(best.erGained, 6)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('bộ rỗng → null', () => {
    expect(scoreLoadout([], CHARACTERS[0])).toBeNull()
  })

  it('bộ thiếu slot vẫn chấm được + có note partialSlots', () => {
    const re = scoreLoadout(DEMO_ECHOES.slice(0, 2), CHARACTERS[0])
    expect(re).not.toBeNull()
    expect(re!.echoes).toHaveLength(2)
    expect(re!.note.some((n) => n.key === 'note.partialSlots')).toBe(true)
  })
})
