import { describe, expect, it } from 'vitest'
import type { EchoDraft } from './parse'
import { MAX_FRAMES, draftSignature, frameTimestamps } from './video'

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
