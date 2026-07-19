// Các loại chỉ số trong hệ thống Echo (Wuthering Waves, bản 3.5)

export type SubstatKey =
  | 'hp' | 'hpPct' | 'atk' | 'atkPct' | 'def' | 'defPct'
  | 'critRate' | 'critDmg' | 'energyRegen'
  | 'basicAtk' | 'heavyAtk' | 'skillDmg' | 'liberationDmg'

export type Element = 'glacio' | 'fusion' | 'electro' | 'aero' | 'spectro' | 'havoc'

export type MainStatKey =
  | 'hpPct' | 'atkPct' | 'defPct' | 'critRate' | 'critDmg'
  | 'energyRegen' | 'healingBonus'
  | 'glacioDmg' | 'fusionDmg' | 'electroDmg' | 'aeroDmg' | 'spectroDmg' | 'havocDmg'

export type EchoCost = 1 | 3 | 4

/**
 * Key trọng số của nhân vật = substat + 2 stat chỉ tồn tại ở main stat / set bonus:
 * - 'elementDmg': Element DMG% ĐÚNG nguyên tố nhân vật (main cost-3, 2pc/5pc set)
 * - 'healingBonus': Healing Bonus% (main cost-4, 2pc set healer)
 */
export type WeightKey = SubstatKey | 'elementDmg' | 'healingBonus'

/**
 * Stat mà set bonus có thể cộng. 'elementDmg' = Element DMG đúng nguyên tố NGƯỜI ĐEO
 * (dùng cho bonus "mọi Attribute DMG" như Tidebreaking Courage); các key element cụ thể
 * (glacioDmg…) chỉ có giá trị khi nguyên tố nhân vật khớp.
 */
export type BonusStatKey = SubstatKey | MainStatKey | 'elementDmg'

/** Một dòng stat của set bonus, kèm ước lượng uptime hiệu dụng trong combat */
export interface SetBonusStat {
  stat: BonusStatKey
  value: number
  /** 0–1: 1 = vô điều kiện; <1 = có điều kiện kích hoạt (quy ước ở data/sonata.ts) */
  uptime: number
}

/** Bonus tại một mốc mảnh (2pc/5pc/3pc/1pc). Đủ 5 mảnh thì nhận CẢ tier 2pc lẫn 5pc. */
export interface SetBonusTier {
  pieces: number
  /** Phần stat LƯỢNG HOÁ ĐƯỢC cho chính người đeo; hiệu ứng team/không-stat để trong `short` */
  stats: SetBonusStat[]
}

export interface Substat {
  stat: SubstatKey
  value: number
}

export interface Echo {
  id: string
  /** Tên echo (tuỳ chọn) — cần cho luật "trùng tên không đếm 2 lần vào mảnh set" */
  name?: string
  cost: EchoCost
  set: string // SonataSet id
  rarity: 3 | 4 | 5
  level: number // 0–25
  mainStat: MainStatKey
  substats: Substat[] // 0–5, không trùng loại
  /** Khoá: không xoá được (kể cả xoá hàng loạt); solver vẫn dùng bình thường */
  lock?: boolean
  /** Loại: solver bỏ qua echo này (vẫn hiện mờ trong kho để xoá hàng loạt) */
  trash?: boolean
}

export interface SonataSet {
  id: string
  name: string
  /** Số mảnh có bonus: [2,5] | [3] | [1] (suy từ `bonuses`) */
  pieces: number[]
  /** Bonus structured theo mốc mảnh — solver cộng stat thật vào điểm */
  bonuses: SetBonusTier[]
  element?: Element
  short: string // mô tả ngắn 2pc/5pc
  version: string
}

export interface CharacterProfile {
  id: string
  name: string
  element: Element
  archetype: string
  /** Trọng số stat 0–1 (1 "roll chuẩn" của stat này đáng giá w điểm) — gồm cả elementDmg/healingBonus */
  weights: Partial<Record<WeightKey, number>>
  /** Metadata để dễ update data (không ảnh hưởng engine) */
  rarity?: 4 | 5
  /** Bản ra mắt (vd '3.5') */
  version?: string
  /** false = preset research web chưa kiểm chứng datamine/cộng đồng */
  verified?: boolean
  /** Ghi chú nguồn/độ tin cậy cho người cập nhật data */
  notes?: string
  /** Tổng ER% mục tiêu (gồm 100 gốc); solver tính ER theo "ngân sách", đạt rồi thì ER thừa = 0 */
  erTarget?: number
  /** Main stat chấp nhận được theo cost (phần tử đầu = ưu tiên nhất) */
  mainStatPrefs: Record<'1' | '3' | '4', MainStatKey[]>
  /** Set khuyến nghị (id) — solver cộng điểm bonus khi đủ mảnh */
  preferredSets: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Build context: chỉ số KHÔNG từ echo (vũ khí + base nhân vật + Forte nội tại +
// buff có điều kiện) để dựng baseline THẬT cho damage model (thay giả định cũ).
// Quy ước: mọi % cộng dồn trong từng loại stat; ATK cuối = (baseATK char + vũ khí)
// × (1+ΣATK%) + Σflat. Base CR = 5, base CD = 150 là HẰNG SỐ mọi resonator.
// ─────────────────────────────────────────────────────────────────────────────

export type WeaponType = 'sword' | 'broadblade' | 'pistols' | 'gauntlets' | 'rectifier'

/** Stat mà secondary vũ khí có thể mang (subset của substat) */
export type WeaponSecondaryKey = 'atkPct' | 'critRate' | 'critDmg' | 'energyRegen' | 'defPct' | 'hpPct'

/** Buff có điều kiện (assumed active, hiển thị toggle) — từ vũ khí, set echo, hoặc kit */
export interface StatBuff {
  id: string
  /** Nhãn hiển thị (giữ thuật ngữ game bằng EN) */
  label: string
  /** Stat cộng khi buff active (gồm elementDmg) */
  stats: Partial<Record<WeightKey, number>>
  /** Mặc định bật? (buff uptime cao / gần như luôn có trong rotation) */
  defaultOn: boolean
  /** Số mảnh set tối thiểu để defaultOn tự kích (chỉ có nghĩa với SET_BUFFS — vd hiệu ứng 5pc = 5).
   *  Bỏ trống = không ràng buộc (buff vũ khí/kit). Override tay trong buffStates luôn thắng. */
  pieces?: number
}

export interface Weapon {
  id: string
  name: string
  type: WeaponType
  rarity: 3 | 4 | 5
  /** ATK ở Lv.90 (main stat vũ khí) */
  baseAtk: number
  /** Secondary stat ở Lv.90 */
  secondary: WeaponSecondaryKey
  secondaryValue: number
  /** Passive CỐ ĐỊNH (unconditional) — cộng thẳng, vd Azure Oath +12% All-Attribute DMG */
  passiveFlat?: Partial<Record<WeightKey, number>>
  /** Passive/buff CÓ ĐIỀU KIỆN (toggle) — vd heavy-attack amp sau khi inflicting Havoc Bane */
  buffs?: StatBuff[]
}

/** Base stat + Forte nội tại của nhân vật ở Lv.90 (max ascension) */
export interface CharacterBase {
  id: string // khớp CharacterProfile.id
  baseHp: number
  baseAtk: number
  baseDef: number
  /** Forte "Stat Bonus" nội tại (tổng các node) — vd { critRate: 8 } hoặc { atkPct: 12 } */
  forte: Partial<Record<WeightKey, number>>
  /** Loại vũ khí nhân vật dùng (datamine roleinfo.WeaponType) — lọc dropdown vũ khí BuildEditor */
  weaponType?: WeaponType
}

/** Context build của 1 nhân vật (lưu trong ProfileOverride.build). Rỗng = dùng giả định cũ. */
export interface BuildContext {
  weaponId?: string
  /** Override base ATK/HP/DEF khi nhân vật chưa có DB (hoặc muốn số thật của mình) */
  manualBase?: { atk?: number; hp?: number; def?: number }
  /** Bật/tắt từng buff (buffId → on). Thiếu key = theo defaultOn */
  buffStates?: Record<string, boolean>
}

export interface ScoredEcho {
  echo: Echo
  /** Điểm substat thô (tổng w × rollEff) */
  raw: number
  /** Điểm substat chuẩn hoá 0–100 so với echo 5-substat hoàn hảo */
  score: number
  /** Điểm GIÁ TRỊ main stat (cùng thang chuẩn hoá — giả định +25) */
  mainScore: number
  /** score + mainScore — dùng để xếp hạng/tối ưu (có thể >100) */
  totalScore: number
  /** Độ hợp main stat: 1 = chuẩn meta, 0.6 = tạm dùng, 0.25 = sai (hiển thị/tư vấn tune) */
  fitLevel: number
  mainStatFit: boolean
  breakdown: { stat: SubstatKey; value: number; eff: number; weighted: number }[]
}

export interface RosterAssignment {
  profile: CharacterProfile
  result: LoadoutResult | null
}

/** Message tách khỏi UI: engine trả { key, params }, UI dịch bằng i18n (xem src/i18n.tsx) */
export interface LocMessage {
  key: string
  params?: Record<string, string | number>
}

export interface TuneAdvice {
  verdict: 'trash' | 'keep-tuning' | 'usable' | 'done'
  reason: LocMessage
  /** Kỳ vọng TỔNG điểm (substat + main — cùng thang totalScore/evFinal) nếu tune nốt slot còn lại */
  expectedFinal: number
}

export interface LoadoutResult {
  echoes: ScoredEcho[]
  layout: number[]
  totalCost: number
  subScore: number
  setBonusScore: number
  total: number
  setCounts: Record<string, number>
  erGained: number
  note: LocMessage[]
}
