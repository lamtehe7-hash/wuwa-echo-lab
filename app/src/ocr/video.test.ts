import { describe, expect, it } from 'vitest'
import type { EchoDraft } from './parse'
import { MAX_FRAMES, draftSignature, frameTimestamps, mergeDrafts } from './video'

function draft(overrides: Partial<EchoDraft>): EchoDraft {
  return { mainStat: 'critRate', level: 25, substats: [], warnings: [], confidence: 1, ...overrides }
}

describe('frameTimestamps', () => {
  it('bước 1s trên video 5s → [0,1,2,3,4]', () => {
    expect(frameTimestamps(5, 1)).toEqual([0, 1, 2, 3, 4])
  })
  it('bước quá nhỏ bị chặn dưới 0.2s (chống treo)', () => {
    expect(frameTimestamps(1, 0.01).length).toBe(5) // 1 / 0.2
  })
  it('video dài bị cap ở MAX_FRAMES', () => {
    expect(frameTimestamps(10_000, 0.2).length).toBe(MAX_FRAMES)
  })
  it('duration không hợp lệ (NaN/0) → mảng rỗng', () => {
    expect(frameTimestamps(NaN, 1)).toEqual([])
    expect(frameTimestamps(0, 1)).toEqual([])
  })
})

describe('draftSignature: dedup giữa các frame', () => {
  it('không có mainStat (frame transition/rác) → null', () => {
    expect(draftSignature(draft({ mainStat: undefined }))).toBeNull()
  })
  it('cùng nội dung nhưng substat KHÁC THỨ TỰ → cùng chữ ký (OCR đọc dòng lệch thứ tự)', () => {
    const a = draft({ substats: [{ stat: 'critRate', value: 8.7 }, { stat: 'atkPct', value: 9.4 }] })
    const b = draft({ substats: [{ stat: 'atkPct', value: 9.4 }, { stat: 'critRate', value: 8.7 }] })
    expect(draftSignature(a)).toBe(draftSignature(b))
  })
  it('khác giá trị 1 roll → chữ ký khác (2 echo thật khác nhau không bị gộp)', () => {
    const a = draft({ substats: [{ stat: 'critRate', value: 8.7 }] })
    const b = draft({ substats: [{ stat: 'critRate', value: 9.3 }] })
    expect(draftSignature(a)).not.toBe(draftSignature(b))
  })
  it('khác level → chữ ký khác', () => {
    expect(draftSignature(draft({ level: 20 }))).not.toBe(draftSignature(draft({ level: 25 })))
  })
})

describe('mergeDrafts: gộp bản đọc nhiều frame về 1 echo', () => {
  const SUBS5: EchoDraft['substats'] = [
    { stat: 'critRate', value: 8.7 },
    { stat: 'critDmg', value: 17.4 },
    { stat: 'atkPct', value: 9.4 },
    { stat: 'energyRegen', value: 8.4 },
    { stat: 'hp', value: 430 },
  ]

  it('frame trùng tuyệt đối → 1 cụm, đếm số frame', () => {
    const merged = mergeDrafts([draft({ substats: SUBS5 }), draft({ substats: SUBS5 })])
    expect(merged).toHaveLength(1)
    expect(merged[0].frames).toBe(2)
  })

  it('bản đọc thiếu (subset ≥3 dòng, cùng main) gộp vào bản đầy đủ (case f013/f014)', () => {
    const partial = draft({ substats: SUBS5.slice(0, 3), confidence: 0.62 })
    const merged = mergeDrafts([partial, draft({ substats: SUBS5 })])
    expect(merged).toHaveLength(1)
    expect(merged[0].draft.substats).toHaveLength(5) // đại diện là bản đầy đủ
    expect(merged[0].frames).toBe(2)
  })

  it('subs bằng nhau, một bên mất main → gộp, giữ bản có main (case f020 main fail)', () => {
    const noMain = draft({ mainStat: undefined, substats: SUBS5, confidence: 0.45 })
    const merged = mergeDrafts([noMain, draft({ mainStat: 'atkPct', substats: SUBS5 })])
    expect(merged).toHaveLength(1)
    expect(merged[0].draft.mainStat).toBe('atkPct')
  })

  it('subs bằng nhau 5 dòng nhưng main khác → gộp (misread main, case f023/f024)', () => {
    const merged = mergeDrafts([
      draft({ mainStat: 'hpPct', substats: SUBS5 }),
      draft({ mainStat: 'atkPct', substats: SUBS5 }),
    ])
    expect(merged).toHaveLength(1)
  })

  it('subs bằng nhau 1 dòng + main khác → KHÔNG gộp (2 echo thật dễ trùng roll đơn)', () => {
    const one: EchoDraft['substats'] = [{ stat: 'critRate', value: 8.7 }]
    const merged = mergeDrafts([
      draft({ mainStat: 'hpPct', substats: one }),
      draft({ mainStat: 'atkPct', substats: one }),
    ])
    expect(merged).toHaveLength(2)
  })

  it('subset nhưng main khác → không gộp (giữ riêng cả hai)', () => {
    const merged = mergeDrafts([
      draft({ mainStat: 'critRate', substats: SUBS5 }),
      draft({ mainStat: 'atkPct', substats: SUBS5.slice(0, 3) }),
    ])
    expect(merged).toHaveLength(2)
  })

  it('level đã biết mà khác nhau → không bao giờ gộp', () => {
    const merged = mergeDrafts([
      draft({ level: 25, substats: SUBS5 }),
      draft({ level: 20, substats: SUBS5 }),
    ])
    expect(merged).toHaveLength(2)
  })

  it('bản đại diện thiếu tên → lấy tên từ frame khác trong cụm (backfill)', () => {
    const merged = mergeDrafts([
      draft({ substats: SUBS5 }), // bản đầy đủ nhưng OCR không đọc được dòng tên
      draft({ substats: SUBS5, name: 'Forbidden Bastion', confidence: 0.7 }),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].draft.name).toBe('Forbidden Bastion')
  })

  it('draft không main + không gộp được vào đâu → loại (frame rác)', () => {
    const merged = mergeDrafts([
      draft({ mainStat: undefined, substats: [{ stat: 'defPct', value: 8.1 }] }),
      draft({ substats: SUBS5 }),
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].draft.mainStat).toBe('critRate')
  })
})
