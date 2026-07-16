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
// (unconditional); buffs = phần CÓ ĐIỀU KIỆN (toggle, assumed active). "All-Attribute DMG" → elementDmg bracket.
// Task 56: PHỦ ĐỦ 109 vũ khí — 93 có entry; 16 KHÔNG có entry vì passive thuần energy-restore/heal
// (không có stat mô hình được): cadenza, discord, marcato, overture, variation (Concerto), beguiling-melody,
// broadblade/gauntlets/pistols/rectifier/sword-of-voyager (Resonance Energy), originite-type-i…v (heal).
// ─────────────────────────────────────────────────────────────────────────────
type WeaponPassive = Pick<Weapon, 'passiveFlat' | 'buffs'>
// Mô hình từ text Weapon Skill S1 (weaponsData.ts .skill). QUY ƯỚC: stat KHÔNG điều kiện → passiveFlat;
// DMG Bonus có điều kiện (sau skill/stack) → buffs (assumed MAX stack, defaultOn true — TRỪ điều kiện uptime
// thấp kiểu "HP dưới 40%" → defaultOn false). Ánh xạ: "Resonance Skill DMG"→skillDmg, "Basic Attack DMG"→basicAtk,
// "Heavy Attack DMG"→heavyAtk, "Resonance Liberation DMG"→liberationDmg, "(All-)Attribute DMG / DMG Bonus"→elementDmg,
// "<Element> DMG"→elementDmg (đúng khi element vũ khí khớp nhân vật — user tự cân nhắc), DMG chung chung→elementDmg.
// Buff TOÀN ĐỘI có wielder hưởng (ATK/CD/all-DMG "Resonators in the team") → TÍNH (wielder nằm trong đội);
// buff CHỈ cho nhân vật KHÁC (outro "incoming Resonator") → BỎ. BỎ QUA: ignore DEF, RES giảm, Echo Skill DMG
// (không có trong model), DoT amp (Spectro Frazzle/Glacio Chafe DMG), Dodge Counter DMG, heal-on-hit;
// Amplification trên chính wielder xấp xỉ gộp vào attackType (như Azure Oath).
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
    // task 56 verify: 2 nhánh CỘNG DỒN — Basic hit 10%×3 stack (30) + Concerto consumed (40) = 70
    buffs: [{ id: 'rs-basic', label: 'Basic hits ×3 + Concerto consumed: +70% Basic Attack DMG', stats: { basicAtk: 70 }, defaultOn: true }],
  },
  'blazing-brilliance': {
    passiveFlat: { atkPct: 12 },
    // 4%/stack × 14 stack = 56 (review 16/07: từng model 40, lệch text)
    buffs: [{ id: 'bb-skill', label: 'Searing Feather (14 stack ×4%): +56% Resonance Skill DMG', stats: { skillDmg: 56 }, defaultOn: true }],
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
    // task 56: bổ sung team ATK 24 (Hack - Shifting → "ATK of the Resonators in the team" — wielder cũng hưởng)
    buffs: [{ id: 'st-basic', label: 'Intro + Hack: +36% Basic Attack DMG, team +24% ATK', stats: { basicAtk: 36, atkPct: 24 }, defaultOn: true }],
  },

  // ══ task 56: phủ nốt 92 vũ khí còn lại (5★ đuôi) ══
  'abyss-surges': {
    passiveFlat: { energyRegen: 12.8 },
    buffs: [{ id: 'as-cross', label: 'Skill↔Basic hits: +10% Basic & +10% Skill DMG', stats: { basicAtk: 10, skillDmg: 10 }, defaultOn: true }],
  },
  'blazing-justice': {
    passiveFlat: { atkPct: 12 }, // DEF-ignore + Spectro Frazzle amp không mô hình được
  },
  'bloodpacts-pledge': {
    buffs: [
      { id: 'bp-heal', label: 'Providing Healing: +10% Resonance Skill DMG', stats: { skillDmg: 10 }, defaultOn: true },
      // phụ thuộc đội hình (cần Rover: Aero) → mặc định TẮT
      { id: 'bp-aero', label: 'Rover: Aero Unbound Flow: +10% Aero DMG (team)', stats: { elementDmg: 10 }, defaultOn: false },
    ],
  },
  'boson-astrolabe': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'ba-tune', label: 'Team Tune Break: +12% ATK, +12% Basic Attack DMG', stats: { atkPct: 12, basicAtk: 12 }, defaultOn: true }],
  },
  'daybreakers-spine': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'ds-spectro', label: 'Basic hit + Tune Strain: +20% Spectro DMG, +20% Basic Attack DMG', stats: { elementDmg: 20, basicAtk: 20 }, defaultOn: true }],
  },
  'emerald-sentence': {
    passiveFlat: { atkPct: 12 }, // team Echo Skill DMG 20 không có trong model
    buffs: [{ id: 'es-bamboo', label: 'Bamboo Cleaver ×2: +60% Heavy Attack DMG', stats: { heavyAtk: 60 }, defaultOn: true }],
  },
  'everbright-polestar': {
    passiveFlat: { elementDmg: 12 }, // phần DEF/RES ignore không mô hình được
  },
  'forged-dwarf-star': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'fds-burst', label: 'Fusion Burst/Tune Strain: +36% Liberation DMG, team +24% ATK', stats: { liberationDmg: 36, atkPct: 24 }, defaultOn: true }],
  },
  'freeze-frame': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'ff-chafe', label: 'Glacio Chafe: +30% Glacio DMG, team +24% ATK', stats: { elementDmg: 30, atkPct: 24 }, defaultOn: true }],
  },
  'frostburn': {
    passiveFlat: { atkPct: 12 }, // DEF ignore + Chafe DoT amp bỏ
    buffs: [{ id: 'fb-amp', label: 'Applying Glacio Chafe: +28% Glacio DMG (Amp)', stats: { elementDmg: 28 }, defaultOn: true }],
  },
  'kumokiri': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'km-neg', label: 'Negative Status ×3 + max-stack team: +24% Lib DMG, +24% Attribute DMG', stats: { liberationDmg: 24, elementDmg: 24 }, defaultOn: true }],
  },
  'laser-shearer': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'ls-interfere', label: 'Vs Tune Strain: Interfered: +24% Resonance Skill DMG', stats: { skillDmg: 24 }, defaultOn: true }],
  },
  'luminous-hymn': {
    passiveFlat: { atkPct: 12 }, // outro Frazzle amp (DoT) bỏ
    buffs: [{ id: 'lh-frazzle', label: 'Vs Spectro Frazzle ×3: +42% Basic & +42% Heavy DMG', stats: { basicAtk: 42, heavyAtk: 42 }, defaultOn: true }],
  },
  'lux-umbra': {
    passiveFlat: { atkPct: 12 }, // Echo Skill amp + DEF ignore bỏ
    buffs: [{ id: 'lu-heavy', label: 'Echo Skill DMG dealt: +24% Heavy Attack DMG (Amp)', stats: { heavyAtk: 24 }, defaultOn: true }],
  },
  'moongazers-sigil': {
    passiveFlat: { atkPct: 12 }, // DEF ignore theo shield bỏ
    buffs: [{ id: 'ms-lib', label: 'Intro/Liberation: +20% Resonance Liberation DMG', stats: { liberationDmg: 20 }, defaultOn: true }],
  },
  'phasic-homogenizer': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'ph-tune', label: 'Team Tune Break: +20% All-Attribute DMG', stats: { elementDmg: 20 }, defaultOn: true }],
  },
  'pulsation-bracer': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'pb-basic', label: 'Vs Tune Strain: Interfered ×4: +24% Basic Attack DMG', stats: { basicAtk: 24 }, defaultOn: true }],
  },
  'radiance-cleaver': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'rc-lib', label: 'Vs Tune Strain: Interfered: +24% Resonance Liberation DMG', stats: { liberationDmg: 24 }, defaultOn: true }],
  },
  'rime-draped-sprouts': {
    passiveFlat: { atkPct: 12 },
    // 2 pha LOẠI TRỪ NHAU (bật 1 trong 2): on-field stack 36 (mặc định) vs sau Outro 52 cho basic OFF-FIELD (build Zhezhi)
    buffs: [
      { id: 'rds-onfield', label: 'Skill ×3 (on-field): +36% Basic Attack DMG', stats: { basicAtk: 36 }, defaultOn: true },
      { id: 'rds-outro', label: 'Outro (3 stacks, off-field basic — thay cho buff trên): +52% Basic Attack DMG', stats: { basicAtk: 52 }, defaultOn: false },
    ],
  },
  'solsworn-ciphers': {
    passiveFlat: { atkPct: 12 }, // Echo Skill amp + DEF ignore không mô hình được
  },
  'spectral-trigger': {
    passiveFlat: { atkPct: 12 }, // DEF ignore bỏ
    buffs: [{ id: 'sp-spectro', label: 'Skill ×2 + Hack: +40% Spectro DMG, +30% Heavy DMG (Amp)', stats: { elementDmg: 40, heavyAtk: 30 }, defaultOn: true }],
  },
  'spectrum-blaster': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'sb-basic', label: 'Intro/Basic + team stacks ×3: +36% Basic DMG, team +24% DMG', stats: { basicAtk: 36, elementDmg: 24 }, defaultOn: true }],
  },
  'starfield-calibrator': {
    passiveFlat: { defPct: 16 }, // Concerto restore bỏ
    buffs: [{ id: 'sc-cd', label: 'On heal: team +20% Crit DMG', stats: { critDmg: 20 }, defaultOn: true }],
  },
  'static-mist': {
    passiveFlat: { energyRegen: 12.8 }, // outro ATK cho nhân vật VÀO (không phải wielder) → bỏ
  },
  'stellar-symphony': {
    passiveFlat: { hpPct: 12 }, // Concerto restore bỏ
    buffs: [{ id: 'ss-heal', label: 'Healing Skill: party +14% ATK', stats: { atkPct: 14 }, defaultOn: true }],
  },
  'unflickering-valor': {
    passiveFlat: { critRate: 8 },
    buffs: [{ id: 'uv-basic', label: 'Liberation + Basic hits: +48% Basic Attack DMG', stats: { basicAtk: 48 }, defaultOn: true }],
  },
  'whispers-of-sirens': {
    passiveFlat: { atkPct: 12 }, // 2-stack Havoc RES ignore bỏ
    buffs: [{ id: 'ws-dream', label: 'Gentle Dream: +40% Basic Attack DMG', stats: { basicAtk: 40 }, defaultOn: true }],
  },
  'wildfire-mark': {
    passiveFlat: { atkPct: 12 },
    buffs: [{ id: 'wm-lib', label: 'Intro/Lib + extend: +24% Lib DMG, team +24% Fusion DMG', stats: { liberationDmg: 24, elementDmg: 24 }, defaultOn: true }],
  },

  // ══ task 56: 4★ ══
  'aether-strike': {
    buffs: [{ id: 'ae-lib', label: 'Liberation: +7.2% ATK, +10.8% Liberation DMG', stats: { atkPct: 7.2, liberationDmg: 10.8 }, defaultOn: true }],
  },
  'amity-accord': {
    buffs: [{ id: 'aa-intro', label: 'Intro: +20% Resonance Liberation DMG', stats: { liberationDmg: 20 }, defaultOn: true }],
  },
  'augment': {
    buffs: [{ id: 'ag-lib', label: 'Liberation: +15% ATK', stats: { atkPct: 15 }, defaultOn: true }],
  },
  'aureate-zenith': {
    buffs: [{ id: 'az-lib', label: 'Liberation: +7.2% ATK, +10.8% Heavy Attack DMG', stats: { atkPct: 7.2, heavyAtk: 10.8 }, defaultOn: true }],
  },
  'autumntrace': {
    buffs: [{ id: 'at-hits', label: 'Basic/Heavy hits ×5: +20% ATK', stats: { atkPct: 20 }, defaultOn: true }],
  },
  'broadblade-41': {
    buffs: [{ id: 'b41-hp', label: 'HP >80%: +12% ATK', stats: { atkPct: 12 }, defaultOn: true }],
  },
  'call-of-the-abyss': {
    buffs: [{ id: 'ca-lib', label: 'Liberation: +16% Healing Bonus', stats: { healingBonus: 16 }, defaultOn: true }],
  },
  'celestial-spiral': {
    buffs: [{ id: 'cs-skill', label: 'Skill: +10% ATK', stats: { atkPct: 10 }, defaultOn: true }],
  },
  'comet-flare': {
    buffs: [{ id: 'cf-hits', label: 'Basic/Heavy hits ×3: +9% Healing Bonus', stats: { healingBonus: 9 }, defaultOn: true }],
  },
  'commando-of-conviction': {
    buffs: [{ id: 'cc-intro', label: 'Intro: +15% ATK', stats: { atkPct: 15 }, defaultOn: true }],
  },
  'dauntless-evernight': {
    buffs: [{ id: 'de-intro', label: 'Intro: +8% ATK, +15% DEF', stats: { atkPct: 8, defPct: 15 }, defaultOn: true }],
  },
  'endless-collapse': {
    buffs: [{ id: 'ec-skill', label: 'Skill: +10% ATK', stats: { atkPct: 10 }, defaultOn: true }],
  },
  'fables-of-wisdom': {
    buffs: [{ id: 'fw-neg', label: 'Vs Negative Status ×4: +16% ATK', stats: { atkPct: 16 }, defaultOn: true }],
  },
  'feather-edge': {
    buffs: [{ id: 'fe-lib', label: 'Liberation: +7.2% ATK, +10.8% Liberation DMG', stats: { atkPct: 7.2, liberationDmg: 10.8 }, defaultOn: true }],
  },
  'fusion-accretion': {
    buffs: [{ id: 'fa-skill', label: 'Skill: +10% ATK', stats: { atkPct: 10 }, defaultOn: true }],
  },
  'gauntlets-21d': {
    // Dodge Counter DMG + heal không mô hình được
    buffs: [{ id: 'g21-dash', label: 'Dash/Dodge: +8% ATK', stats: { atkPct: 8 }, defaultOn: true }],
  },
  'helios-cleaver': {
    buffs: [{ id: 'hc-skill', label: 'Skill stacks ×4: +12% ATK', stats: { atkPct: 12 }, defaultOn: true }],
  },
  'hollow-mirage': {
    buffs: [{ id: 'hm-armor', label: 'Iron Armor ×3: +9% ATK, +9% DEF', stats: { atkPct: 9, defPct: 9 }, defaultOn: true }],
  },
  'jinzhou-keeper': {
    buffs: [{ id: 'jk-intro', label: 'Intro: +8% ATK, +10% HP', stats: { atkPct: 8, hpPct: 10 }, defaultOn: true }],
  },
  'legend-of-drunken-hero': {
    buffs: [{ id: 'ld-neg', label: 'Vs Negative Status ×4: +16% ATK', stats: { atkPct: 16 }, defaultOn: true }],
  },
  'lumingloss': {
    buffs: [{ id: 'lg-skill', label: 'Skill: +20% Basic & +20% Heavy DMG', stats: { basicAtk: 20, heavyAtk: 20 }, defaultOn: true }],
  },
  'lunar-cutter': {
    buffs: [{ id: 'lc-oath', label: 'Oath ×6: +12% ATK', stats: { atkPct: 12 }, defaultOn: true }],
  },
  'meditations-on-mercy': {
    buffs: [{ id: 'mm-neg', label: 'Vs Negative Status ×4: +16% ATK', stats: { atkPct: 16 }, defaultOn: true }],
  },
  'novaburst': {
    buffs: [{ id: 'nb-dash', label: 'Dash/Dodge ×3: +12% ATK', stats: { atkPct: 12 }, defaultOn: true }],
  },
  'oceans-gift': {
    buffs: [{ id: 'og-frazzle', label: 'Vs Spectro Frazzle ×4: +24% Spectro DMG', stats: { elementDmg: 24 }, defaultOn: true }],
  },
  'pistols-26': {
    buffs: [{ id: 'p26-nodmg', label: 'No damage taken ×2: +12% ATK', stats: { atkPct: 12 }, defaultOn: true }],
  },
  'radiant-dawn': {
    buffs: [{ id: 'rd-skill', label: 'Skill: +9% ATK, +9% Basic Attack DMG', stats: { atkPct: 9, basicAtk: 9 }, defaultOn: true }],
  },
  'rectifier-25': {
    buffs: [{ id: 'r25-hp', label: 'Skill (HP >60%): +12% ATK', stats: { atkPct: 12 }, defaultOn: true }],
  },
  'relativistic-jet': {
    buffs: [{ id: 'rj-skill', label: 'Skill: +10% ATK', stats: { atkPct: 10 }, defaultOn: true }],
  },
  'romance-in-farewell': {
    buffs: [{ id: 'rf-neg', label: 'Vs Negative Status ×4: +16% ATK', stats: { atkPct: 16 }, defaultOn: true }],
  },
  'solar-flame': {
    buffs: [{ id: 'sf-hits', label: 'Basic/Heavy hits ×4: +8.8% ATK, +8.8% Heavy DMG', stats: { atkPct: 8.8, heavyAtk: 8.8 }, defaultOn: true }],
  },
  'somnoire-anchor': {
    buffs: [{ id: 'sa-hiss', label: 'Hiss ×10: +20% ATK, +6% Crit Rate', stats: { atkPct: 20, critRate: 6 }, defaultOn: true }],
  },
  'stonard': {
    buffs: [{ id: 'sn-skill', label: 'Skill: +18% Resonance Liberation DMG', stats: { liberationDmg: 18 }, defaultOn: true }],
  },
  'sword-18': {
    // điều kiện HP <40% — uptime thấp, KHÔNG bật mặc định
    buffs: [{ id: 's18-hp', label: 'HP <40%: +18% Heavy Attack DMG', stats: { heavyAtk: 18 }, defaultOn: false }],
  },
  'thunderbolt': {
    buffs: [{ id: 'tb-hits', label: 'Basic/Heavy hits ×3: +21% Resonance Skill DMG', stats: { skillDmg: 21 }, defaultOn: true }],
  },
  'undying-flame': {
    buffs: [{ id: 'uf-intro', label: 'Intro: +20% Resonance Skill DMG', stats: { skillDmg: 20 }, defaultOn: true }],
  },
  'waltz-in-masquerade': {
    buffs: [{ id: 'wq-neg', label: 'Vs Negative Status ×4: +16% ATK', stats: { atkPct: 16 }, defaultOn: true }],
  },
  'waning-redshift': {
    buffs: [{ id: 'wr-skill', label: 'Skill: +10% ATK', stats: { atkPct: 10 }, defaultOn: true }],
  },

  // ══ task 56: 3★ ══
  'broadblade-of-night': {
    buffs: [{ id: 'bn-intro', label: 'Intro: +8% ATK', stats: { atkPct: 8 }, defaultOn: true }],
  },
  'gauntlets-of-night': {
    buffs: [{ id: 'gn-intro', label: 'Intro: +8% ATK', stats: { atkPct: 8 }, defaultOn: true }],
  },
  'pistols-of-night': {
    buffs: [{ id: 'pn-intro', label: 'Intro: +8% ATK', stats: { atkPct: 8 }, defaultOn: true }],
  },
  'rectifier-of-night': {
    buffs: [{ id: 'rn-intro', label: 'Intro: +8% ATK', stats: { atkPct: 8 }, defaultOn: true }],
  },
  'sword-of-night': {
    buffs: [{ id: 'sn-intro', label: 'Intro: +8% ATK', stats: { atkPct: 8 }, defaultOn: true }],
  },
  'guardian-broadblade': {
    passiveFlat: { basicAtk: 12, heavyAtk: 12 }, // vô điều kiện
  },
  'guardian-gauntlets': {
    passiveFlat: { liberationDmg: 12 },
  },
  'guardian-pistols': {
    passiveFlat: { skillDmg: 12 },
  },
  'guardian-rectifier': {
    passiveFlat: { basicAtk: 12, heavyAtk: 12 },
  },
  'guardian-sword': {
    passiveFlat: { skillDmg: 12 },
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
