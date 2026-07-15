import type { CharacterBase, StatBuff } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Base stat (Lv.90 max ascension) + Forte "Stat Bonus" nội tại của nhân vật.
// Base CR/CD KHÔNG ở đây — là hằng số 5%/150% cho MỌI resonator (engine khoá cứng).
// SEED nhỏ — mở rộng bằng scripts/gen-basestats (datamine) hoặc nhập tay/override trong UI.
// Nhân vật KHÔNG có trong DB → damage model rơi về baseStat giả định (vẫn tương đối được),
// nhưng crit/DMG% vẫn chính xác nếu có vũ khí + forte (nhập tay hoặc DB).
// ─────────────────────────────────────────────────────────────────────────────

// baseHp/baseAtk/baseDef L90 SINH từ datamine bằng scripts/gen-basestats.mts (Arikatsu/WutheringWaves_Data@3.5,
// công thức base_L1 × ratio; map charId↔role qua slug asset, xác nhận tên 16/07). Chạy lại script khi có patch mới.
// `forte` (Stat Bonus nội tại) CURATE TAY theo guide/in-game — mặc định {} (engine vẫn đúng crit khi thiếu).
export const CHARACTER_BASE: CharacterBase[] = [
  { id: 'camellya', baseHp: 10325, baseAtk: 450, baseDef: 1161, forte: {} }, // TODO forte
  { id: 'carlotta', baseHp: 12450, baseAtk: 463, baseDef: 1198, forte: {} }, // TODO forte
  { id: 'jinhsi', baseHp: 10825, baseAtk: 413, baseDef: 1259, forte: {} }, // TODO forte
  { id: 'changli', baseHp: 10388, baseAtk: 463, baseDef: 1100, forte: {} }, // TODO forte
  { id: 'xiangli-yao', baseHp: 10625, baseAtk: 425, baseDef: 1222, forte: {} }, // TODO forte
  { id: 'calcharo', baseHp: 10500, baseAtk: 438, baseDef: 1186, forte: {} }, // TODO forte
  { id: 'jiyan', baseHp: 10488, baseAtk: 438, baseDef: 1186, forte: {} }, // TODO forte
  { id: 'encore', baseHp: 10513, baseAtk: 425, baseDef: 1247, forte: {} }, // TODO forte
  { id: 'zani', baseHp: 10775, baseAtk: 438, baseDef: 1137, forte: {} }, // TODO forte
  { id: 'cartethyia', baseHp: 14800, baseAtk: 313, baseDef: 611, forte: {} }, // TODO forte
  { id: 'lupa', baseHp: 11913, baseAtk: 388, baseDef: 1186, forte: {} }, // TODO forte
  { id: 'yinlin', baseHp: 11000, baseAtk: 400, baseDef: 1283, forte: {} }, // TODO forte
  { id: 'zhezhi', baseHp: 12250, baseAtk: 375, baseDef: 1198, forte: {} }, // TODO forte
  { id: 'roccia', baseHp: 12250, baseAtk: 375, baseDef: 1198, forte: {} }, // TODO forte
  { id: 'cantarella', baseHp: 11600, baseAtk: 400, baseDef: 1100, forte: {} }, // TODO forte
  { id: 'brant', baseHp: 11675, baseAtk: 375, baseDef: 1308, forte: {} }, // TODO forte
  { id: 'sanhua', baseHp: 10063, baseAtk: 275, baseDef: 941, forte: {} }, // TODO forte
  { id: 'mortefi', baseHp: 10025, baseAtk: 250, baseDef: 1137, forte: {} }, // TODO forte
  { id: 'iuno', baseHp: 10525, baseAtk: 450, baseDef: 1124, forte: {} }, // TODO forte
  { id: 'shorekeeper', baseHp: 16713, baseAtk: 288, baseDef: 1100, forte: {} }, // TODO forte
  { id: 'verina', baseHp: 14238, baseAtk: 338, baseDef: 1100, forte: {} }, // TODO forte
  { id: 'baizhi', baseHp: 12813, baseAtk: 213, baseDef: 1002, forte: {} }, // TODO forte
  { id: 'lynae', baseHp: 12238, baseAtk: 375, baseDef: 1198, forte: {} }, // TODO forte
  { id: 'aemeath', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: {} }, // TODO forte
  { id: 'luuk-herssen', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: {} }, // TODO forte
  { id: 'hiyuki', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: {} }, // TODO forte
  { id: 'lucy', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: {} }, // TODO forte
  { id: 'rebecca', baseHp: 11600, baseAtk: 400, baseDef: 1173, forte: {} }, // TODO forte
  { id: 'suisui', baseHp: 16713, baseAtk: 288, baseDef: 1100, forte: {} }, // TODO forte
  { id: 'denia', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: {} }, // TODO forte
  { id: 'lucilla', baseHp: 12238, baseAtk: 375, baseDef: 1198, forte: {} }, // TODO forte
  { id: 'xuanling', baseHp: 11025, baseAtk: 425, baseDef: 1149, forte: { critRate: 8 } }, // forte CR8 (user đọc in-game)
  { id: 'mornye', baseHp: 15375, baseAtk: 288, baseDef: 1357, forte: {} }, // TODO forte
  { id: 'sigrika', baseHp: 10775, baseAtk: 438, baseDef: 1137, forte: {} }, // TODO forte
  { id: 'buling', baseHp: 10625, baseAtk: 225, baseDef: 1259, forte: {} }, // TODO forte
  { id: 'phoebe', baseHp: 10825, baseAtk: 413, baseDef: 1259, forte: {} }, // TODO forte
  { id: 'augusta', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: {} }, // TODO forte
  { id: 'galbrena', baseHp: 10300, baseAtk: 463, baseDef: 1112, forte: {} }, // TODO forte
  { id: 'qiuyuan', baseHp: 12238, baseAtk: 375, baseDef: 1198, forte: {} }, // TODO forte
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
    { id: 'sft-feather', label: "Havoc Bane → Xuanling's Feather: +20% Crit Rate, +35% Heavy Attack DMG", stats: { critRate: 20, heavyAtk: 35 }, defaultOn: true },
  ],
}
