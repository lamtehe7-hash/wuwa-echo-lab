import type { CharacterProfile, MainStatKey, SubstatKey } from '../types'
import { SUBSTAT_KEYS, SUBSTATS, maxRoll } from '../data/substats'

// Đánh giá TỪNG substat cho một nhân vật cụ thể → 8 mức màu (như tool cộng đồng, xem ảnh
// tham chiếu user gửi: Irrelevant · Low · Minor · Moderate · Useful · High · Major · Essential).
//
// Mức = f(rating) với  rating = relevance × rollEff  ∈ [0,1]:
//   • relevance = weight[stat] / max(weight substat của nhân vật)  → "đúng dòng CẦN" (0–1)
//   • rollEff   = value / maxRoll(stat)                            → "chỉ số CAO" (~0.55–1)
// Nhờ chuẩn hoá theo stat tốt nhất của CHÍNH nhân vật, thang màu luôn dùng hết dải:
// stat ưu tiên #1 roll max = Essential; stat vô dụng (weight 0) = Irrelevant bất kể roll.

export const SUBSTAT_TIER_COUNT = 8
export type SubstatTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface TierMeta {
  tier: SubstatTier
  /** Key i18n nhãn mức (tier.irrelevant …) */
  key: string
  /** Màu hiển thị (hex) — dùng cho chữ + chấm + thanh */
  color: string
}

// Bảng màu bám theo ảnh tham chiếu: xám → xanh lá → ngọc → lục lam → lam → tím → đỏ → cam.
export const SUBSTAT_TIERS: readonly TierMeta[] = [
  { tier: 0, key: 'tier.irrelevant', color: '#8b94a3' },
  { tier: 1, key: 'tier.low',        color: '#57c96a' },
  { tier: 2, key: 'tier.minor',      color: '#1fd3ab' },
  { tier: 3, key: 'tier.moderate',   color: '#22c3dd' },
  { tier: 4, key: 'tier.useful',     color: '#4d94ff' },
  { tier: 5, key: 'tier.high',       color: '#a374ff' },
  { tier: 6, key: 'tier.major',      color: '#ff5a6a' },
  { tier: 7, key: 'tier.essential',  color: '#ffab33' },
] as const

// 6 ngưỡng trên `rating` tách Low..Essential (weight 0 = Irrelevant xử lý riêng).
const TIER_CUTS = [0.12, 0.24, 0.37, 0.5, 0.65, 0.82]

/** Trọng số substat lớn nhất của nhân vật — mẫu số cho "độ liên quan" 0–1. */
export function maxSubstatWeight(profile: CharacterProfile): number {
  let m = 0
  for (const k of SUBSTAT_KEYS) {
    const w = profile.weights[k] ?? 0
    if (w > m) m = w
  }
  return m
}

/** Ánh xạ rating (đã gồm relevance) → mức; weight 0 luôn là Irrelevant. */
export function ratingToTier(weight: number, rating: number): SubstatTier {
  if (weight <= 0) return 0
  let tier = 1
  for (const cut of TIER_CUTS) {
    if (rating >= cut) tier++
    else break
  }
  return Math.min(7, tier) as SubstatTier
}

/** Mốc roll gần nhất của một giá trị (snap về mốc nếu lệch) → {index 0-based, count}. */
export function rollTierOf(stat: SubstatKey, value: number): { index: number; count: number } {
  const rolls = SUBSTATS[stat].rolls
  let best = 0
  for (let i = 1; i < rolls.length; i++) {
    if (Math.abs(rolls[i] - value) < Math.abs(rolls[best] - value)) best = i
  }
  return { index: best, count: rolls.length }
}

export interface SubstatRating {
  tier: SubstatTier
  color: string
  labelKey: string
  /** Trọng số của stat với nhân vật (0–1) */
  weight: number
  /** Độ liên quan chuẩn hoá theo stat tốt nhất của nhân vật (0–1) */
  relevance: number
  /** Chất lượng roll: value / maxRoll (~0.55–1) */
  rollEff: number
  /** relevance × rollEff (0–1) — điểm phân mức */
  rating: number
  /** Mốc roll 1-based + tổng số mốc (cho thanh chất lượng) */
  rollTier: number
  rollTierCount: number
}

/**
 * Chấm một substat cho nhân vật. `maxW` (trọng số lớn nhất) có thể truyền sẵn để khỏi
 * tính lại khi map nhiều substat của cùng một echo.
 */
export function rateSubstat(
  profile: CharacterProfile,
  stat: SubstatKey,
  value: number,
  maxW?: number,
): SubstatRating {
  const weight = profile.weights[stat] ?? 0
  const denom = maxW ?? maxSubstatWeight(profile)
  const relevance = denom > 0 ? Math.min(1, weight / denom) : 0
  const rollEff = Math.min(1, value / maxRoll(stat))
  const rating = relevance * rollEff
  const tier = ratingToTier(weight, rating)
  const meta = SUBSTAT_TIERS[tier]
  const rt = rollTierOf(stat, value)
  return {
    tier,
    color: meta.color,
    labelKey: meta.key,
    weight,
    relevance,
    rollEff,
    rating,
    rollTier: rt.index + 1,
    rollTierCount: rt.count,
  }
}

/** Substat "họ hàng" của main stat (đồng bộ với score.ts) — cho fit dự phòng của main. */
const MAIN_TO_SUB: Partial<Record<MainStatKey, SubstatKey>> = {
  hpPct: 'hpPct', atkPct: 'atkPct', defPct: 'defPct',
  critRate: 'critRate', critDmg: 'critDmg', energyRegen: 'energyRegen',
}

/**
 * Độ hợp MAIN stat 3 mức (1 / 0.6 / 0.25) — bản nhẹ chỉ cần cost + mainStat (score.ts giữ
 * `mainStatFitLevel` nhận Echo đầy đủ cho engine; hàm này để hiển thị trên card/preview).
 */
export function mainFitLevel(profile: CharacterProfile, cost: 1 | 3 | 4, mainStat: MainStatKey): number {
  const prefs = profile.mainStatPrefs[String(cost) as '1' | '3' | '4'] ?? []
  if (prefs.includes(mainStat)) return 1
  const related = MAIN_TO_SUB[mainStat]
  if (related && (profile.weights[related] ?? 0) >= 0.5) return 0.6
  return 0.25
}
