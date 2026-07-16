import type { CharacterProfile, Element, MainStatKey, SubstatKey } from '../types'
import { SUBSTATS } from '../data/substats'

// Đánh giá TỪNG substat cho một nhân vật → 8 mức màu (như tool cộng đồng / ảnh tham chiếu user):
// Irrelevant · Low · Minor · Moderate · Useful · High · Major · Essential.
//
// Quy tắc (chốt 15/07/2026 — user chọn "giữ Irrelevant, tô theo mốc roll"):
//   • Stat nhân vật KHÔNG dùng (trọng số 0) → Irrelevant (xám), bất kể mốc roll.
//   • Stat CÓ liên quan (trọng số > 0) → màu theo MỐC ROLL của chính stat đó:
//     mốc thấp nhất = Low, mỗi mốc cao hơn +1 bậc, chạm trần Essential.
//     Thang có 7 bậc màu (Low..Essential) mà stat % có 8 mốc → 2 mốc cao nhất gộp
//     chung Essential (vd Crit Rate 9.9% và 10.5% đều Essential). Stat 4 mốc
//     (flat ATK/DEF) chỉ lên tới Useful.

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

/** Mốc roll gần nhất của một giá trị (snap về mốc nếu lệch) → {index 0-based, count}. */
export function rollTierOf(stat: SubstatKey, value: number): { index: number; count: number } {
  const rolls = SUBSTATS[stat].rolls
  let best = 0
  for (let i = 1; i < rolls.length; i++) {
    if (Math.abs(rolls[i] - value) < Math.abs(rolls[best] - value)) best = i
  }
  return { index: best, count: rolls.length }
}

/**
 * Bậc màu theo VỊ TRÍ mốc roll (0-based): mốc 0 = Low (1), mỗi mốc cao hơn +1 bậc,
 * trần Essential (7). Stat 8 mốc → 2 mốc cuối cùng gộp Essential; stat 4 mốc → tối đa Useful (4).
 */
export function rollMilestoneTier(index: number): SubstatTier {
  return Math.max(1, Math.min(7, index + 1)) as SubstatTier
}

export interface SubstatRating {
  tier: SubstatTier
  color: string
  labelKey: string
  /** Trọng số của stat với nhân vật (0–1) — quyết định Irrelevant hay không */
  weight: number
  /** Mốc roll 1-based + tổng số mốc (cho thanh chất lượng + tooltip) */
  rollTier: number
  rollTierCount: number
}

/**
 * Chấm một substat cho nhân vật: trọng số 0 → Irrelevant; ngược lại → bậc theo mốc roll.
 */
export function rateSubstat(profile: CharacterProfile, stat: SubstatKey, value: number): SubstatRating {
  const weight = profile.weights[stat] ?? 0
  const rt = rollTierOf(stat, value)
  const tier: SubstatTier = weight <= 0 ? 0 : rollMilestoneTier(rt.index)
  const meta = SUBSTAT_TIERS[tier]
  return {
    tier,
    color: meta.color,
    labelKey: meta.key,
    weight,
    rollTier: rt.index + 1,
    rollTierCount: rt.count,
  }
}

/** Substat "họ hàng" của main stat (đồng bộ với score.ts) — cho fit dự phòng của main. */
const MAIN_TO_SUB: Partial<Record<MainStatKey, SubstatKey>> = {
  hpPct: 'hpPct', atkPct: 'atkPct', defPct: 'defPct',
  critRate: 'critRate', critDmg: 'critDmg', energyRegen: 'energyRegen',
}

/** Main Element DMG% → nguyên tố (fallback 0.6 khi đúng nguyên tố + weight elementDmg ≥ 0.5). */
const DMG_MAIN_TO_ELEMENT: Partial<Record<MainStatKey, Element>> = {
  glacioDmg: 'glacio', fusionDmg: 'fusion', electroDmg: 'electro',
  aeroDmg: 'aero', spectroDmg: 'spectro', havocDmg: 'havoc',
}

/**
 * Độ hợp MAIN stat 3 mức (1 / 0.6 / 0.25) — bản nhẹ chỉ cần cost + mainStat (score.ts giữ
 * `mainStatFitLevel` nhận Echo đầy đủ cho engine; hàm này để hiển thị trên card/preview).
 * Fallback 0.6 phủ CẢ elementDmg/healingBonus (review 16/07: bảng cũ chỉ có 6 stat % cơ bản).
 */
export function mainFitLevel(profile: CharacterProfile, cost: 1 | 3 | 4, mainStat: MainStatKey): number {
  const prefs = profile.mainStatPrefs[String(cost) as '1' | '3' | '4'] ?? []
  if (prefs.includes(mainStat)) return 1
  const el = DMG_MAIN_TO_ELEMENT[mainStat]
  if (el) return el === profile.element && (profile.weights.elementDmg ?? 0) >= 0.5 ? 0.6 : 0.25
  if (mainStat === 'healingBonus') return (profile.weights.healingBonus ?? 0) >= 0.5 ? 0.6 : 0.25
  const related = MAIN_TO_SUB[mainStat]
  if (related && (profile.weights[related] ?? 0) >= 0.5) return 0.6
  return 0.25
}
