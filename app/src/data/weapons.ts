import type { Weapon, WeaponSecondaryKey } from '../types'
import { WEAPON_BASE } from './weaponsData'

// ─────────────────────────────────────────────────────────────────────────────
// DB vũ khí (Lv.90). Stat cơ học (id/name/type/rarity/baseAtk/secondary+value) SINH từ game8 vào
// `weaponsData.ts` (scripts/gen-weapons.mts, cross-check datamine ×12.5). PASSIVE mô hình TAY ở
// WEAPON_PASSIVES dưới đây (Weapon Skill scale theo refinement — không auto-gen được); regen KHÔNG xoá.
// `WEAPONS` = merge WEAPON_BASE + WEAPON_PASSIVES.
// ─────────────────────────────────────────────────────────────────────────────

/** Secondary stat vũ khí ở Lv.90 theo rarity (fallback khi weapon thiếu secondaryValue). */
export const WEAPON_SECONDARY_MAX: Record<3 | 4 | 5, Record<WeaponSecondaryKey, number>> = {
  5: { critRate: 24.3, critDmg: 48.6, atkPct: 36.0, energyRegen: 32.4, defPct: 46.5, hpPct: 36.0 },
  4: { critRate: 21.0, critDmg: 42.0, atkPct: 30.4, energyRegen: 27.0, defPct: 38.4, hpPct: 30.4 },
  3: { critRate: 16.2, critDmg: 32.4, atkPct: 24.3, energyRegen: 21.6, defPct: 30.5, hpPct: 24.3 },
}

/** Giá trị secondary thực của 1 vũ khí (ưu tiên số game8, fallback bảng theo rarity). */
export function weaponSecondaryValue(w: Weapon): number {
  return w.secondaryValue || WEAPON_SECONDARY_MAX[w.rarity][w.secondary]
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSIVE mô hình tay (keyed theo id trong weaponsData.ts). passiveFlat = phần CỐ ĐỊNH
// (unconditional); buffs = phần CÓ ĐIỀU KIỆN (toggle, assumed active). Thêm dần các vũ khí meta —
// vũ khí KHÔNG có ở đây vẫn dùng được (chỉ thiếu đóng góp passive). "All-Attribute DMG" → elementDmg bracket.
// ─────────────────────────────────────────────────────────────────────────────
type WeaponPassive = Pick<Weapon, 'passiveFlat' | 'buffs'>
// Mô hình từ text Weapon Skill S1 (weaponsData.ts .skill). QUY ƯỚC: stat KHÔNG điều kiện → passiveFlat;
// DMG Bonus có điều kiện (sau skill/stack) → buffs (assumed MAX, defaultOn). Ánh xạ: "Resonance Skill DMG"→skillDmg,
// "Basic Attack DMG"→basicAtk, "Heavy Attack DMG"→heavyAtk, "Resonance Liberation DMG"→liberationDmg,
// "(All-)Attribute DMG / DMG Bonus"→elementDmg. BỎ QUA: ignore DEF, RES giảm, Echo Skill DMG (không có trong model),
// Amplification xấp xỉ gộp vào attackType (như Azure Oath). Vũ khí chưa liệt kê ở đây vẫn dùng được (thiếu passive).
export const WEAPON_PASSIVES: Record<string, WeaponPassive> = {
  'azure-oath': {
    passiveFlat: { elementDmg: 12 }, // "Grants 12% All-Attribute DMG Bonus"
    buffs: [{ id: 'azure-heavy', label: 'After Havoc Bane: +36% Heavy Attack DMG', stats: { heavyAtk: 36 }, defaultOn: true }],
  },
  'the-last-dance': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'tld-skill', label: 'Intro/Liberation: +48% Resonance Skill DMG', stats: { skillDmg: 48 }, defaultOn: true }],
  },
  'ages-of-harvest': {
    passiveFlat: { elementDmg: 12 },
    buffs: [{ id: 'aoh-skill', label: 'Intro + Skill: +48% Resonance Skill DMG', stats: { skillDmg: 48 }, defaultOn: true }],
  },
  'verdant-summit': {
    passiveFlat: { elementDmg: 12 },
    buffs: [{ id: 'vs-heavy', label: 'Intro/Liberation ×2: +48% Heavy Attack DMG', stats: { heavyAtk: 48 }, defaultOn: true }],
  },
  'veritys-handle': {
    passiveFlat: { elementDmg: 12 },
    buffs: [{ id: 'vh-lib', label: 'Liberation: +48% Resonance Liberation DMG', stats: { liberationDmg: 48 }, defaultOn: true }],
  },
  'red-spring': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'rs-basic', label: 'Concerto consumed: +40% Basic Attack DMG', stats: { basicAtk: 40 }, defaultOn: true }],
  },
  'blazing-brilliance': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'bb-skill', label: 'Searing Feather (max): +40% Resonance Skill DMG', stats: { skillDmg: 40 }, defaultOn: true }],
  },
  'stringmaster': {
    passiveFlat: { elementDmg: 12 }, // "Increases the DMG Bonus by 12%"
    buffs: [{ id: 'sm-atk', label: 'Skill DMG ×2 + off-field: +36% ATK', stats: { atkPct: 36 }, defaultOn: true }],
  },
  'defiers-thorn': {
    passiveFlat: { hpPct: 12 },
  },
  'emerald-of-genesis': {
    passiveFlat: { energyRegen: 12.8 },
    buffs: [{ id: 'eog-atk', label: 'Skill ×2: +12% ATK', stats: { atkPct: 12 }, defaultOn: true }],
  },
  'cosmic-ripples': {
    passiveFlat: { energyRegen: 12.8 },
    buffs: [{ id: 'cr-basic', label: 'Basic ×5: +16% Basic Attack DMG', stats: { basicAtk: 16 }, defaultOn: true }],
  },
  'lustrous-razor': {
    passiveFlat: { energyRegen: 12.8 },
    buffs: [{ id: 'lr-lib', label: 'Skill ×3: +21% Resonance Liberation DMG', stats: { liberationDmg: 21 }, defaultOn: true }],
  },
  'tragicomedy': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'tc-heavy', label: 'Basic/Intro: +48% Heavy Attack DMG', stats: { heavyAtk: 48 }, defaultOn: true }],
  },
  'lethean-elegy': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'lel-skill', label: 'Echo Skill window: +32% Resonance Skill DMG', stats: { skillDmg: 32 }, defaultOn: true }],
  },
  'woodland-aria': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'wa-aero', label: 'Aero Erosion: +24% Aero DMG', stats: { elementDmg: 24 }, defaultOn: true }],
  },
  'thunderflare-dominion': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'td-heavy', label: 'Intro/Skill: +20% Heavy Attack DMG', stats: { heavyAtk: 20 }, defaultOn: true }],
  },
  'skull-thrasher': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'st-basic', label: 'Intro + Hack: +36% Basic Attack DMG', stats: { basicAtk: 36 }, defaultOn: true }],
  },
}

export const WEAPONS: Weapon[] = WEAPON_BASE.map((b) => {
  const { id, name, type, rarity, baseAtk, secondary, secondaryValue } = b
  return { id, name, type, rarity, baseAtk, secondary, secondaryValue, ...(WEAPON_PASSIVES[id] ?? {}) }
})

export const WEAPON_BY_ID: Record<string, Weapon> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]))

export const WEAPON_TYPE_LABEL: Record<Weapon['type'], string> = {
  sword: 'Sword', broadblade: 'Broadblade', pistols: 'Pistols', gauntlets: 'Gauntlets', rectifier: 'Rectifier',
}
