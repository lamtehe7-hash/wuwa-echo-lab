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
