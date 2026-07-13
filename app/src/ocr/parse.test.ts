import { describe, expect, it } from 'vitest'
import { parseEchoText } from './parse'

// Fixture là text THẬT tesseract đọc từ video quay panel echo trong game (v3.5),
// lấy qua scripts/video-ocr-benchmark.ts — có đủ 3 đặc sản của UI thật mà fixture
// tổng hợp trước đây thiếu: icon đầu dòng bị OCR thành chữ ("NX", "X", "(3", "QQ"),
// dòng stat CỐ ĐỊNH của panel (ATK 100/150, HP 2280 — không phải main/sub), và
// level dạng "Tên +25" (không có chữ "Lv.").

describe('parseEchoText — text OCR thật từ game', () => {
  it('Forbidden Bastion (cost 3): bỏ dòng stat cố định "X ATK 100", level từ "+25"', () => {
    const d = parseEchoText(`Forbidden Bastion +25
COST 3 % 8
(3 Havoc DMG Bonus 30.0%
X ATK 100
+ Resonance Liberation DMG Bonus 9.4%
+ Energy Regen 10.8%
+ Crit. Rate 9.3%
+ ATK 7.9%
+ Heavy Attack DMG Bonus 8.6%`)
    expect(d.mainStat).toBe('havocDmg')
    expect(d.level).toBe(25)
    expect(d.name).toBe('Forbidden Bastion')
    expect(d.set).toBeUndefined() // khung quay không chứa mục Sonata Effect
    expect(d.substats).toHaveLength(5)
    expect(d.substats).toContainEqual({ stat: 'liberationDmg', value: 9.4 })
    expect(d.substats).toContainEqual({ stat: 'energyRegen', value: 10.8 })
    expect(d.substats).toContainEqual({ stat: 'critRate', value: 9.3 })
    expect(d.substats).toContainEqual({ stat: 'atkPct', value: 7.9 })
    expect(d.substats).toContainEqual({ stat: 'heavyAtk', value: 8.6 })
    // "X ATK 100" là stat cố định của panel: không thành main, không thành substat flat
    expect(d.substats.some((s) => s.stat === 'atk')).toBe(false)
    expect(d.warnings.some((w) => w.key === 'ocrParse.multiMainStat')).toBe(false)
  })

  it('Smolder (cost 1): icon dính nhãn "NX ATK 18.0%" vẫn ra main atkPct; "QQ HP 2280" bị bỏ', () => {
    const d = parseEchoText(`Smolder +25
COST 1 % 8
NX ATK 18.0%
QQ HP 2280
+ Crit. DMG 17.4%
+ Crit. Rate 6.3%
+ HP 430
+ Energy Regen 10.8%
+ ATK 50`)
    expect(d.mainStat).toBe('atkPct')
    expect(d.level).toBe(25)
    expect(d.name).toBe('Smolder')
    expect(d.substats).toHaveLength(5)
    expect(d.substats).toContainEqual({ stat: 'critDmg', value: 17.4 })
    expect(d.substats).toContainEqual({ stat: 'critRate', value: 6.3 })
    expect(d.substats).toContainEqual({ stat: 'hp', value: 430 })
    expect(d.substats).toContainEqual({ stat: 'energyRegen', value: 10.8 })
    expect(d.substats).toContainEqual({ stat: 'atk', value: 50 })
  })

  it('tên echo không bị match nhầm thành stat khi bỏ token đầu ("Forbidden Bastion +25")', () => {
    const d = parseEchoText(`Forbidden Bastion +25
Crit. Rate 22.0%`)
    // dòng tên chỉ đóng góp level, không sinh candidate stat nào
    expect(d.mainStat).toBe('critRate')
    expect(d.substats).toHaveLength(0)
  })

  it('format cũ "Lv. 25/25" vẫn parse được level (không hồi quy)', () => {
    const d = parseEchoText(`Impermanence Heron
Cost: 4
Lv. 25/25
Havoc DMG Bonus 30.0%`)
    expect(d.level).toBe(25)
    expect(d.mainStat).toBe('havocDmg')
  })

  it('ảnh chứa mục Sonata Effect → tự nhận set (fuzzy, chịu được lỗi OCR nhỏ)', () => {
    const d = parseEchoText(`Thundering Mephis +25
Havoc DMG Bonus 30.0%
+ Crit. Rate 9.3%
Sonata Effect
Freezing Frost
2-Pc: Glacio DMG 10%`)
    expect(d.set).toBe('freezing-frost')
    expect(d.name).toBe('Thundering Mephis')
  })

  it('alias trong ngoặc cũng match ("Sun-sinking Eclipse" → havoc-eclipse)', () => {
    const d = parseEchoText(`Crownless +25
Havoc DMG Bonus 30.0%
Sunsinking Eclipse`)
    expect(d.set).toBe('havoc-eclipse')
  })

  it('không có mục Sonata Effect → set undefined (user chọn tay)', () => {
    const d = parseEchoText(`Smolder +25
ATK 18.0%
+ Crit. Rate 6.3%`)
    expect(d.set).toBeUndefined()
  })
})
