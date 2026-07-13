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
  /** Số mảnh có bonus: [2,5] | [3] | [1] */
  pieces: number[]
  element?: Element
  short: string // mô tả ngắn 2pc/5pc
  version: string
}

export interface CharacterProfile {
  id: string
  name: string
  element: Element
  archetype: string
  /** Trọng số substat 0–1 (1 roll max của stat này đáng giá bằng w điểm chuẩn) */
  weights: Partial<Record<SubstatKey, number>>
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
  /** Điểm chuẩn hoá 0–100 so với echo lý thuyết hoàn hảo */
  score: number
  /** Độ hợp main stat: 1 = chuẩn meta, 0.6 = tạm dùng, 0.25 = sai */
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
