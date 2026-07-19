import type { CharacterBase, StatBuff } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Base stat (Lv.90 max ascension) + Forte "Stat Bonus" nội tại của nhân vật.
// Base CR/CD KHÔNG ở đây — là hằng số 5%/150% cho MỌI resonator (engine khoá cứng).
// SEED nhỏ — mở rộng bằng scripts/gen-basestats (datamine) hoặc nhập tay/override trong UI.
// Nhân vật KHÔNG có trong DB → damage model rơi về baseStat giả định (vẫn tương đối được),
// nhưng crit/DMG% vẫn chính xác nếu có vũ khí + forte (nhập tay hoặc DB).
// ─────────────────────────────────────────────────────────────────────────────

// baseHp/baseAtk/baseDef/weaponType/forte L90 SINH từ datamine bằng scripts/gen-basestats.mts (Arikatsu/
// WutheringWaves_Data@3.5, công thức base_L1 × ratio; map charId↔role qua slug asset, xác nhận tên 16/07;
// weaponType từ roleinfo.WeaponType 1=broadblade/2=sword/3=pistols/4=gauntlets/5=rectifier — verify 4 mốc
// Jiyan/Augusta/Camellya/Xuanling khớp vũ khí signature). Chạy lại script khi có patch mới.
// `forte` (Stat Bonus nội tại, task 56) = tổng 8 node NodeType-4 trong skillTree/skilltree.json — mốc
// validate: Xuanling {critRate: 8} khớp user đọc Forte in-game (task 52); pattern CR 8 / CD 16 /
// ATK,HP,elem,heal 12 / DEF 15.2 khoá bằng characterBase.test.ts.
export const CHARACTER_BASE: CharacterBase[] = [
  { id: 'camellya', baseHp: 10325, baseAtk: 450, baseDef: 1161, forte: { critDmg: 16, atkPct: 12 }, weaponType: 'sword' },
  { id: 'carlotta', baseHp: 12450, baseAtk: 463, baseDef: 1198, forte: { critRate: 8, atkPct: 12 }, weaponType: 'pistols' },
  { id: 'jinhsi', baseHp: 10825, baseAtk: 413, baseDef: 1259, forte: { critRate: 8, atkPct: 12 }, weaponType: 'broadblade' },
  { id: 'changli', baseHp: 10388, baseAtk: 463, baseDef: 1100, forte: { critRate: 8, atkPct: 12 }, weaponType: 'sword' },
  { id: 'xiangli-yao', baseHp: 10625, baseAtk: 425, baseDef: 1222, forte: { critDmg: 16, atkPct: 12 }, weaponType: 'gauntlets' },
  { id: 'calcharo', baseHp: 10500, baseAtk: 438, baseDef: 1186, forte: { critDmg: 16, atkPct: 12 }, weaponType: 'broadblade' },
  { id: 'jiyan', baseHp: 10488, baseAtk: 438, baseDef: 1186, forte: { critRate: 8, atkPct: 12 }, weaponType: 'broadblade' },
  { id: 'encore', baseHp: 10513, baseAtk: 425, baseDef: 1247, forte: { atkPct: 12, elementDmg: 12 }, weaponType: 'rectifier' },
  { id: 'zani', baseHp: 10775, baseAtk: 438, baseDef: 1137, forte: { critRate: 8, atkPct: 12 }, weaponType: 'gauntlets' },
  { id: 'cartethyia', baseHp: 14800, baseAtk: 313, baseDef: 611, forte: { critRate: 8, hpPct: 12 }, weaponType: 'sword' },
  { id: 'lupa', baseHp: 11913, baseAtk: 388, baseDef: 1186, forte: { critRate: 8, atkPct: 12 }, weaponType: 'broadblade' },
  { id: 'yinlin', baseHp: 11000, baseAtk: 400, baseDef: 1283, forte: { critRate: 8, atkPct: 12 }, weaponType: 'rectifier' },
  { id: 'zhezhi', baseHp: 12250, baseAtk: 375, baseDef: 1198, forte: { critRate: 8, atkPct: 12 }, weaponType: 'rectifier' },
  { id: 'roccia', baseHp: 12250, baseAtk: 375, baseDef: 1198, forte: { critDmg: 16, atkPct: 12 }, weaponType: 'gauntlets' },
  { id: 'cantarella', baseHp: 11600, baseAtk: 400, baseDef: 1100, forte: { critRate: 8, atkPct: 12 }, weaponType: 'rectifier' },
  { id: 'brant', baseHp: 11675, baseAtk: 375, baseDef: 1308, forte: { critRate: 8, atkPct: 12 }, weaponType: 'sword' },
  { id: 'sanhua', baseHp: 10063, baseAtk: 275, baseDef: 941, forte: { atkPct: 12, elementDmg: 12 }, weaponType: 'sword' },
  { id: 'mortefi', baseHp: 10025, baseAtk: 250, baseDef: 1137, forte: { atkPct: 12, elementDmg: 12 }, weaponType: 'pistols' },
  { id: 'iuno', baseHp: 10525, baseAtk: 450, baseDef: 1124, forte: { critRate: 8, atkPct: 12 }, weaponType: 'gauntlets' },
  { id: 'shorekeeper', baseHp: 16713, baseAtk: 288, baseDef: 1100, forte: { hpPct: 12, healingBonus: 12 }, weaponType: 'rectifier' },
  { id: 'verina', baseHp: 14238, baseAtk: 338, baseDef: 1100, forte: { atkPct: 12, healingBonus: 12 }, weaponType: 'rectifier' },
  { id: 'baizhi', baseHp: 12813, baseAtk: 213, baseDef: 1002, forte: { hpPct: 12, healingBonus: 12 }, weaponType: 'rectifier' },
  { id: 'lynae', baseHp: 12238, baseAtk: 375, baseDef: 1198, forte: { critRate: 8, atkPct: 12 }, weaponType: 'pistols' },
  { id: 'aemeath', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: { critRate: 8, atkPct: 12 }, weaponType: 'sword' },
  { id: 'luuk-herssen', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: { critRate: 8, atkPct: 12 }, weaponType: 'gauntlets' },
  { id: 'hiyuki', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: { critRate: 8, atkPct: 12 }, weaponType: 'sword' },
  { id: 'lucy', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: { critRate: 8, atkPct: 12 }, weaponType: 'pistols' },
  { id: 'rebecca', baseHp: 11600, baseAtk: 400, baseDef: 1173, forte: { critRate: 8, atkPct: 12 }, weaponType: 'pistols' },
  { id: 'suisui', baseHp: 16713, baseAtk: 288, baseDef: 1100, forte: { hpPct: 12, healingBonus: 12 }, weaponType: 'rectifier' },
  { id: 'denia', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: { critDmg: 16, atkPct: 12 }, weaponType: 'rectifier' },
  { id: 'lucilla', baseHp: 12238, baseAtk: 375, baseDef: 1198, forte: { critRate: 8, atkPct: 12 }, weaponType: 'rectifier' },
  { id: 'xuanling', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: { critRate: 8, atkPct: 12 }, weaponType: 'sword' }, // CR8 khớp user đọc in-game
  { id: 'mornye', baseHp: 15375, baseAtk: 288, baseDef: 1357, forte: { defPct: 15.2, healingBonus: 12 }, weaponType: 'broadblade' },
  { id: 'sigrika', baseHp: 10775, baseAtk: 438, baseDef: 1137, forte: { critRate: 8, atkPct: 12 }, weaponType: 'gauntlets' },
  { id: 'buling', baseHp: 10625, baseAtk: 225, baseDef: 1259, forte: { atkPct: 12, healingBonus: 12 }, weaponType: 'rectifier' },
  { id: 'phoebe', baseHp: 10825, baseAtk: 413, baseDef: 1259, forte: { critDmg: 16, atkPct: 12 }, weaponType: 'rectifier' },
  { id: 'augusta', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: { critRate: 8, atkPct: 12 }, weaponType: 'broadblade' },
  { id: 'galbrena', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: { critDmg: 16, atkPct: 12 }, weaponType: 'pistols' },
  { id: 'qiuyuan', baseHp: 12238, baseAtk: 375, baseDef: 1198, forte: { critRate: 8, atkPct: 12 }, weaponType: 'sword' },
]

export const CHARACTER_BASE_BY_ID: Record<string, CharacterBase> = Object.fromEntries(
  CHARACTER_BASE.map((c) => [c.id, c]),
)

// ─────────────────────────────────────────────────────────────────────────────
// Buff CÓ ĐIỀU KIỆN từ SET echo (assumed active, toggle). Keyed theo set id (data/sonata.ts).
// Khác setBonus trong sonata.ts (dùng cho score/solver với uptime): đây là giá trị ĐẦY ĐỦ
// khi buff active, chỉ nạp vào damage model + bảng chỉ số cuối khi user bật.
// ─────────────────────────────────────────────────────────────────────────────
export const SET_BUFFS: Record<string, StatBuff[]> = {
  'song-of-feathered-trace': [
    { id: 'sft-feather', label: "Havoc Bane → Xuanling's Feather: +20% Crit Rate, +35% Heavy Attack DMG", stats: { critRate: 20, heavyAtk: 35 }, defaultOn: true, pieces: 5 },
  ],
}
