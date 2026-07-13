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
    expect(d.cost).toBe(3) // từ dòng "COST 3 % 8" — rác OCR sau digit không phá
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
    expect(d.cost).toBe(1) // main ATK% tồn tại ở mọi cost — phải đọc từ dòng COST, không đoán
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
    expect(d.cost).toBe(4) // format "Cost: 4" cũng đọc được
  })

  it('Fog Lionarch (cost 1, main ATK%): cost đọc từ dòng COST — không bị đoán thành 4', () => {
    const d = parseEchoText(`Fog Lionarch: Body +25
COST 1 % 8
X ATK 18.0%
QQ HP 2280
+ Heavy Attack DMG Bonus 7.1%
+ Crit. Rate 6.9%
+ Crit. DMG 12.6%
+ ATK 9.4%
+ HP 430`)
    expect(d.cost).toBe(1)
    expect(d.mainStat).toBe('atkPct')
    expect(d.level).toBe(25)
    expect(d.substats).toHaveLength(5)
  })

  it('digit cost không hợp lệ (misread "COST 2") + tên không có trong DB → cost undefined, không đoán bừa', () => {
    const d = parseEchoText(`Zzz Unknown Fake +25
COST 2
ATK 18.0%`)
    expect(d.cost).toBeUndefined()
  })

  it('không có dòng COST nhưng tên khớp echo DB → cost lấy từ DB (Smolder = 1)', () => {
    const d = parseEchoText(`Smolder +25
ATK 18.0%
+ Crit. Rate 6.3%`)
    expect(d.cost).toBe(1)
  })

  it('dòng COST mâu thuẫn DB → giữ cost từ dòng COST + cảnh báo costMismatch', () => {
    const d = parseEchoText(`Smolder +25
COST 4
ATK 18.0%`)
    expect(d.cost).toBe(4)
    expect(d.warnings.some((w) => w.key === 'ocrParse.costMismatch')).toBe(true)
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

  it('không có mục Sonata Effect + echo thuộc NHIỀU set → set undefined, trả setCandidates', () => {
    const d = parseEchoText(`Forbidden Bastion +25
Havoc DMG Bonus 30.0%
+ Crit. Rate 6.3%`)
    expect(d.set).toBeUndefined()
    expect(d.setCandidates).toEqual(['song-of-feathered-trace', 'heart-of-evils-purge', 'lamp-of-nether-road'])
  })

  it('echo chỉ thuộc 1 set trong DB → tự điền set dù ảnh không có mục Sonata Effect', () => {
    const d = parseEchoText(`Smolder +25
ATK 18.0%
+ Crit. Rate 6.3%`)
    expect(d.set).toBe('song-of-feathered-trace')
  })

  it('tên OCR mất dấu ":" ("Fog Lionarch Body") → chuẩn hoá theo DB thành "Fog Lionarch: Body"', () => {
    const d = parseEchoText(`Fog Lionarch Body +25
ATK 18.0%`)
    expect(d.name).toBe('Fog Lionarch: Body')
    expect(d.cost).toBe(1)
  })

  it('OCR dính digit vào nhãn cost ("COST3") → vẫn đọc được cost, không cảnh báo dòng lạ (regression)', () => {
    const d = parseEchoText(`Zzz Unknown Fake +25
COST3 % 8
ATK 18.0%`)
    expect(d.cost).toBe(3)
    expect(d.warnings.some((w) => w.key === 'ocrParse.unmatched')).toBe(false)
  })

  it('dấu phẩy ngăn cách nghìn ("QQ HP 2,280") → hiểu là 2280 và bỏ như dòng stat cố định (regression)', () => {
    // Bug cũ: "2,280" đọc thành 2.28 → lọt qua bộ lọc stat cố định, snap thành substat hp 320 ảo
    // và đè mất dòng "+ HP 430" thật (dedup giữ dòng đầu)
    const d = parseEchoText(`Smolder +25
COST 1 % 8
NX ATK 18.0%
QQ HP 2,280
+ Crit. DMG 17.4%
+ HP 430`)
    expect(d.mainStat).toBe('atkPct')
    expect(d.substats).toContainEqual({ stat: 'hp', value: 430 }) // dòng HP thật còn nguyên
    expect(d.substats.some((s) => s.stat === 'hp' && s.value !== 430)).toBe(false)
  })

  it('dấu phẩy thập phân ("Crit. Rate 9,3") vẫn hiểu là 9.3 (không hồi quy)', () => {
    const d = parseEchoText(`Havoc DMG Bonus 30.0%
+ Crit. Rate 9,3`)
    expect(d.substats).toContainEqual({ stat: 'critRate', value: 9.3 })
  })
})
