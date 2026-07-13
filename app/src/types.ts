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
  /** Kỳ vọng điểm chuẩn hoá nếu tune nốt các slot còn lại */
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
