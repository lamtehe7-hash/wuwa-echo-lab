import { describe, expect, it } from 'vitest'
import {
  CREDIT_PER_EXP,
  ECHO_EXP_CUMULATIVE,
  ECHO_MAX_LEVEL,
  EXP_RETURN_RATIO,
  TRANSDUCER_COST_BY_LOCKED,
  TUBE_EXP,
  TUNE_CREDIT,
  TUNE_SLOT_LEVELS,
  TUNER_RETURN_RATIO,
  TUNERS_PER_SLOT,
} from './echoEconomy'
import { MAX_SUBSTATS } from './substats'

// Khoá số kinh tế echo (task 69/F5) — nguồn datamine 3.5, verify chéo: research/echo-economy.md.
// Đổi số ở đây = game đổi bảng chi phí (bản vá) → phải đối chiếu lại doc trước khi sửa test.

describe('echoEconomy — bảng chi phí datamine', () => {
  it('tổng EXP tích luỹ tới max level từng bậc (5★ 142.600 — mốc khoá)', () => {
    expect(ECHO_EXP_CUMULATIVE[5][25]).toBe(142_600)
    expect(ECHO_EXP_CUMULATIVE[4][20]).toBe(63_280)
    expect(ECHO_EXP_CUMULATIVE[3][15]).toBe(15_840)
    expect(ECHO_EXP_CUMULATIVE[2][10]).toBe(4_125)
  })

  it('cấu trúc curve: bắt đầu 0, tăng nghiêm ngặt, dài max+1', () => {
    for (const r of [2, 3, 4, 5] as const) {
      const cum = ECHO_EXP_CUMULATIVE[r]
      expect(cum.length).toBe(ECHO_MAX_LEVEL[r] + 1)
      expect(cum[0]).toBe(0)
      for (let i = 1; i < cum.length; i++) expect(cum[i]).toBeGreaterThan(cum[i - 1])
    }
  })

  it('bậc dưới đúng tỉ lệ bậc 5★: 4★=0.8 / 3★=0.4 / 2★=0.25 (từng level)', () => {
    for (let l = 1; l <= 20; l++) expect(ECHO_EXP_CUMULATIVE[4][l]).toBeCloseTo(ECHO_EXP_CUMULATIVE[5][l] * 0.8, 6)
    for (let l = 1; l <= 15; l++) expect(ECHO_EXP_CUMULATIVE[3][l]).toBeCloseTo(ECHO_EXP_CUMULATIVE[5][l] * 0.4, 6)
    for (let l = 1; l <= 10; l++) expect(ECHO_EXP_CUMULATIVE[2][l]).toBeCloseTo(ECHO_EXP_CUMULATIVE[5][l] * 0.25, 6)
  })

  it('mốc tune: 2★ không có, 3★/4★/5★ = 3/4/5 mốc tại bội 5 — KHÔNG có mốc boost', () => {
    expect(TUNE_SLOT_LEVELS[2]).toEqual([])
    expect(TUNE_SLOT_LEVELS[3]).toEqual([5, 10, 15])
    expect(TUNE_SLOT_LEVELS[4]).toEqual([5, 10, 15, 20])
    expect(TUNE_SLOT_LEVELS[5]).toEqual([5, 10, 15, 20, 25])
  })

  it('liên kết 2 bảng: TUNE_SLOT_LEVELS (datamine) khớp MAX_SUBSTATS (engine) từng bậc app — patch drift là fail ngay', () => {
    // Review 16/07 #7: engine dùng MAX_SUBSTATS, data dùng TUNE_SLOT_LEVELS — không có test liên kết
    // thì Kuro đổi số mốc tune ở bản vá sau là 2 bảng lệch nhau lặng lẽ.
    for (const r of [3, 4, 5] as const) {
      expect(TUNE_SLOT_LEVELS[r].length).toBe(MAX_SUBSTATS[r])
      expect(TUNE_SLOT_LEVELS[r][TUNE_SLOT_LEVELS[r].length - 1]).toBe(ECHO_MAX_LEVEL[r])
    }
  })

  it('hằng số tune/credit/refund', () => {
    expect(TUNERS_PER_SLOT).toBe(10)
    expect(TUNE_CREDIT).toEqual({ 2: 200, 3: 500, 4: 1000, 5: 2000 })
    expect(TUBE_EXP).toEqual([500, 1000, 2000, 5000])
    expect(CREDIT_PER_EXP).toBe(0.1)
    expect(EXP_RETURN_RATIO).toBe(0.75)
    expect(TUNER_RETURN_RATIO).toBe(0.3)
    expect(TRANSDUCER_COST_BY_LOCKED).toEqual([1, 1, 1, 2, 3])
  })

  it('verify chéo game8: feed echo 5★ +25 (hoàn 75%) → đủ đưa echo mới tới ĐÚNG +22', () => {
    const returned = ECHO_EXP_CUMULATIVE[5][25] * EXP_RETURN_RATIO // 106.950
    let level = 0
    while (level < 25 && ECHO_EXP_CUMULATIVE[5][level + 1] <= returned) level++
    expect(level).toBe(22) // game8 458113: "level 25 Echo results in only 22 levels gained"
  })
})
