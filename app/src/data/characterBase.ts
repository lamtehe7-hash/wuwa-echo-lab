import type { CharacterBase, StatBuff } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Base stat (Lv.90 max ascension) + Forte "Stat Bonus" nội tại của nhân vật.
// Base CR/CD KHÔNG ở đây — là hằng số 5%/150% cho MỌI resonator (engine khoá cứng).
// SEED nhỏ — mở rộng bằng scripts/gen-basestats (datamine) hoặc nhập tay/override trong UI.
// Nhân vật KHÔNG có trong DB → damage model rơi về baseStat giả định (vẫn tương đối được),
// nhưng crit/DMG% vẫn chính xác nếu có vũ khí + forte (nhập tay hoặc DB).
// ─────────────────────────────────────────────────────────────────────────────

export const CHARACTER_BASE: CharacterBase[] = [
  // Xuanling: forte Crit Rate 8% (user đọc từ Forte in-game). base ƯỚC LƯỢNG lớp 5★ DPS —
  // chỉnh số thật trong panel Build nếu cần (chỉ ảnh hưởng độ lớn statFactor, không đổi crit).
  { id: 'xuanling', baseHp: 11854, baseAtk: 456, baseDef: 1210, forte: { critRate: 8 } },
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
