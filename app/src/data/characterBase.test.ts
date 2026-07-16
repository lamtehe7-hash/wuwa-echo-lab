import { describe, expect, it } from 'vitest'
import { CHARACTER_BASE } from './characterBase'
import { CHARACTER_BY_ID } from './characters'
import { WEAPONS } from './weapons'

// Toàn vẹn DB base nhân vật (task 55: thêm weaponType từ datamine để lọc dropdown vũ khí)

const TYPES = ['sword', 'broadblade', 'pistols', 'gauntlets', 'rectifier']

describe('characterBase: toàn vẹn weaponType', () => {
  it('mọi nhân vật trong DB có weaponType hợp lệ + id khớp characters.ts', () => {
    for (const c of CHARACTER_BASE) {
      expect(CHARACTER_BY_ID[c.id], `id lạ: ${c.id}`).toBeDefined()
      expect(c.weaponType, `${c.id} thiếu weaponType`).toBeDefined()
      expect(TYPES, `${c.id} weaponType lạ: ${c.weaponType}`).toContain(c.weaponType)
    }
  })

  it('mỗi loại vũ khí có ≥1 vũ khí trong DB (dropdown lọc theo loại không bao giờ rỗng)', () => {
    for (const wt of new Set(CHARACTER_BASE.map((c) => c.weaponType))) {
      expect(WEAPONS.some((w) => w.type === wt), `không có vũ khí loại ${wt}`).toBe(true)
    }
  })

  // Khoá 4 mốc đã verify tay 16/07 — mã WeaponType datamine là 1=BROADBLADE/2=SWORD
  // (ghi chú cũ từng bị ngược 1↔2); regen script mà 4 mốc này đổi là map lại sai.
  it('4 mốc verify vũ khí signature: jiyan/augusta broadblade, camellya/xuanling sword', () => {
    const by = Object.fromEntries(CHARACTER_BASE.map((c) => [c.id, c.weaponType]))
    expect(by['jiyan']).toBe('broadblade')
    expect(by['augusta']).toBe('broadblade')
    expect(by['camellya']).toBe('sword')
    expect(by['xuanling']).toBe('sword')
  })
})

// Task 56: forte sinh từ datamine skilltree (8 node Stat Bonus = 2 loại stat × 4 node).
// Tổng mỗi loại là hằng số game: CR 8 / CD 16 / ATK,HP,elementDmg,healing 12 / DEF 15.2.
const FORTE_TOTALS: Record<string, number> = {
  critRate: 8, critDmg: 16, atkPct: 12, hpPct: 12, defPct: 15.2, elementDmg: 12, healingBonus: 12,
}

describe('characterBase: toàn vẹn forte (task 56)', () => {
  it('mọi nhân vật có đúng 2 loại stat forte, tổng khớp hằng số game', () => {
    for (const c of CHARACTER_BASE) {
      const keys = Object.keys(c.forte)
      expect(keys.length, `${c.id} có ${keys.length} loại forte (kỳ vọng 2)`).toBe(2)
      for (const k of keys) {
        expect(FORTE_TOTALS[k], `${c.id} forte key lạ: ${k}`).toBeDefined()
        expect(c.forte[k as keyof typeof c.forte], `${c.id} forte.${k} lệch hằng số`).toBe(FORTE_TOTALS[k])
      }
    }
  })

  // Mốc đã verify độc lập: Xuanling CR8 user đọc Forte in-game (task 52) — regen mà đổi là recipe hỏng.
  it('mốc verify: xuanling CR8+ATK12; healer heal-bonus; camellya CD16', () => {
    const by = Object.fromEntries(CHARACTER_BASE.map((c) => [c.id, c.forte]))
    expect(by['xuanling']).toEqual({ critRate: 8, atkPct: 12 })
    expect(by['camellya']).toEqual({ critDmg: 16, atkPct: 12 })
    expect(by['verina']).toEqual({ atkPct: 12, healingBonus: 12 })
    expect(by['shorekeeper']).toEqual({ hpPct: 12, healingBonus: 12 })
    expect(by['cartethyia']).toEqual({ critRate: 8, hpPct: 12 })
    expect(by['encore']).toEqual({ atkPct: 12, elementDmg: 12 })
  })
})
