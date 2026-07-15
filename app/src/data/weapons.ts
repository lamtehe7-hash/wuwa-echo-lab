import type { Weapon, WeaponSecondaryKey } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// DB vũ khí (Lv.90). Secondary stat của vũ khí WuWa CHUẨN HOÁ theo rarity + loại
// (giống substat echo) → chỉ cần lưu {rarity, secondary} rồi tra bảng WEAPON_SECONDARY_MAX;
// baseAtk + passive là riêng từng vũ khí. Nguồn số: verify từ in-game/datamine.
// SEED nhỏ (những cái chắc chắn) — mở rộng bằng scripts/gen-weapons hoặc nhập tay trong UI.
// ─────────────────────────────────────────────────────────────────────────────

/** Secondary stat vũ khí ở Lv.90 theo rarity (chuẩn hoá). 5★ Crit Rate 24.3% verify từ Azure Oath. */
export const WEAPON_SECONDARY_MAX: Record<3 | 4 | 5, Record<WeaponSecondaryKey, number>> = {
  5: { critRate: 24.3, critDmg: 48.6, atkPct: 36.0, energyRegen: 32.4, defPct: 46.5, hpPct: 36.0 },
  4: { critRate: 21.0, critDmg: 42.0, atkPct: 30.4, energyRegen: 27.0, defPct: 38.4, hpPct: 30.4 },
  3: { critRate: 16.2, critDmg: 32.4, atkPct: 24.3, energyRegen: 21.6, defPct: 30.5, hpPct: 24.3 },
}

/** Giá trị secondary thực của 1 vũ khí (tra bảng theo rarity + loại). */
export function weaponSecondaryValue(w: Weapon): number {
  return w.secondaryValue || WEAPON_SECONDARY_MAX[w.rarity][w.secondary]
}

// baseAtk verify từ in-game (Lv.90). passiveFlat = phần CỐ ĐỊNH (unconditional).
// buffs = phần CÓ ĐIỀU KIỆN (toggle, assumed active). "All-Attribute DMG" → elementDmg bracket.
export const WEAPONS: Weapon[] = [
  {
    id: 'azure-oath', name: 'Azure Oath', type: 'sword', rarity: 5,
    baseAtk: 587, secondary: 'critRate', secondaryValue: 24.3,
    passiveFlat: { elementDmg: 12 }, // "Grants 12% All-Attribute DMG Bonus" (unconditional)
    buffs: [
      // "After inflicting Havoc Bane: +36% Heavy Attack DMG Amplification" — mô hình gộp vào
      // bracket Heavy Attack DMG (xấp xỉ; Amplification thực ra là bracket nhân riêng).
      { id: 'azure-heavy', label: 'After Havoc Bane: +36% Heavy Attack DMG', stats: { heavyAtk: 36 }, defaultOn: true },
    ],
  },
]

export const WEAPON_BY_ID: Record<string, Weapon> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]))

export const WEAPON_TYPE_LABEL: Record<Weapon['type'], string> = {
  sword: 'Sword', broadblade: 'Broadblade', pistols: 'Pistols', gauntlets: 'Gauntlets', rectifier: 'Rectifier',
}
