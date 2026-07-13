import type { CharacterProfile, Echo, MainStatKey, ScoredEcho, SubstatKey, TuneAdvice } from '../types'
import { MAX_SUBSTATS, SUBSTAT_KEYS, expectedRoll, maxRoll } from '../data/substats'

// Chấm điểm weighted roll-efficiency (PROPOSAL.md §4):
//   raw = Σ w[stat] × (value / maxRoll(stat))
//   score 0–100 = raw / (tổng 5 trọng số lớn nhất của nhân vật) × 100
// → echo "hoàn hảo lý thuyết" (5 roll max của 5 stat tốt nhất) = 100 điểm.

export function rollEfficiency(stat: SubstatKey, value: number): number {
  return value / maxRoll(stat)
}

/** Tổng 5 trọng số lớn nhất — mẫu số chuẩn hoá */
export function theoreticalMax(profile: CharacterProfile): number {
  const ws = SUBSTAT_KEYS.map((k) => profile.weights[k] ?? 0).sort((a, b) => b - a)
  const top5 = ws.slice(0, 5).reduce((s, w) => s + w, 0)
  return top5 > 0 ? top5 : 1
}

/** Substat "họ hàng" của main stat — để suy ra mức fit dự phòng từ trọng số */
const MAIN_TO_SUB: Partial<Record<MainStatKey, SubstatKey>> = {
  hpPct: 'hpPct', atkPct: 'atkPct', defPct: 'defPct',
  critRate: 'critRate', critDmg: 'critDmg', energyRegen: 'energyRegen',
}

/**
 * Độ hợp main stat 3 mức:
 *  1    — nằm trong mainStatPrefs (chuẩn meta)
 *  0.6  — không chuẩn nhưng nhân vật vẫn ăn stat này (trọng số substat tương ứng ≥ 0.5,
 *          vd ATK% cost-3 cho DPS trong lúc chờ farm bản Element DMG%)
 *  0.25 — sai hẳn (vd DEF% cho DPS)
 */
export function mainStatFitLevel(echo: Echo, profile: CharacterProfile): number {
  const prefs = profile.mainStatPrefs[String(echo.cost) as '1' | '3' | '4'] ?? []
  if (prefs.includes(echo.mainStat)) return 1
  const related = MAIN_TO_SUB[echo.mainStat]
  if (related && (profile.weights[related] ?? 0) >= 0.5) return 0.6
  return 0.25
}

export function scoreEcho(echo: Echo, profile: CharacterProfile): ScoredEcho {
  const breakdown = echo.substats.map((s) => {
    const eff = rollEfficiency(s.stat, s.value)
    const w = profile.weights[s.stat] ?? 0
    return { stat: s.stat, value: s.value, eff, weighted: w * eff }
  })
  const raw = breakdown.reduce((sum, b) => sum + b.weighted, 0)
  const score = (raw / theoreticalMax(profile)) * 100
  const fitLevel = mainStatFitLevel(echo, profile)
  return {
    echo,
    raw,
    score,
    fitLevel,
    mainStatFit: fitLevel === 1,
    breakdown,
  }
}

/** Xếp hạng danh sách echo cho 1 nhân vật (fit main stat cao lên đầu, rồi theo điểm) */
export function rankEchoes(echoes: Echo[], profile: CharacterProfile): ScoredEcho[] {
  return echoes
    .map((e) => scoreEcho(e, profile))
    .sort((a, b) => b.fitLevel - a.fitLevel || b.score - a.score)
}

/**
 * Pool substat còn có thể ra khi tune tiếp: 13 loại − loại đã roll.
 * ĐÃ VERIFY (research/data-verification.md §5): main stat KHÔNG loại trừ substat cùng loại —
 * echo main Crit Rate vẫn roll được substat Crit Rate ("double crit"); chỉ cấm trùng giữa các substat.
 */
function remainingPool(echo: Echo): SubstatKey[] {
  const used = new Set<string>(echo.substats.map((s) => s.stat))
  return SUBSTAT_KEYS.filter((k) => !used.has(k))
}

/** Kỳ vọng điểm raw cộng thêm cho MỖI slot substat chưa mở */
export function expectedMarginalPerSlot(echo: Echo, profile: CharacterProfile): number {
  const pool = remainingPool(echo)
  if (pool.length === 0) return 0
  const sum = pool.reduce((s, k) => {
    const w = profile.weights[k] ?? 0
    return s + w * (expectedRoll(k) / maxRoll(k))
  }, 0)
  return sum / pool.length
}

/**
 * Tư vấn "có nên tune tiếp không" (research/scoring-methods.md §5.2):
 * main stat sai → bỏ; main stat đúng → gần như luôn +EV để tune nốt (chi phí biên rẻ hơn farm mới),
 * trừ khi đã ≥2 substat "chết" ở giai đoạn sớm.
 */
export function tuneAdvice(echo: Echo, profile: CharacterProfile): TuneAdvice {
  const scored = scoreEcho(echo, profile)
  const maxSlots = MAX_SUBSTATS[echo.rarity] ?? 5
  const remaining = Math.max(0, maxSlots - echo.substats.length)
  const expectedFinalRaw = scored.raw + remaining * expectedMarginalPerSlot(echo, profile)
  const expectedFinal = (expectedFinalRaw / theoreticalMax(profile)) * 100

  const goodThreshold = 0.5 // stat có trọng số ≥ 0.5 xem là "ngon" với nhân vật này
  const good = echo.substats.filter((s) => (profile.weights[s.stat] ?? 0) >= goodThreshold).length
  const dead = echo.substats.filter((s) => (profile.weights[s.stat] ?? 0) === 0).length

  if (scored.fitLevel <= 0.25) {
    return { verdict: 'trash', expectedFinal, reason: { key: 'advice.trash' } }
  }
  if (remaining === 0) {
    return {
      verdict: 'done',
      expectedFinal,
      reason: { key: scored.fitLevel === 1 ? 'advice.doneGood' : 'advice.doneFair' },
    }
  }
  if (dead >= 2 && good === 0) {
    return { verdict: 'usable', expectedFinal, reason: { key: 'advice.usable', params: { dead } } }
  }
  const expected = Math.round(expectedFinal)
  return {
    verdict: 'keep-tuning',
    expectedFinal,
    reason: good > 0
      ? { key: 'advice.keepTuningGood', params: { good, expected } }
      : { key: 'advice.keepTuning', params: { expected } },
  }
}

/** Tổng ER% substat + main stat của 1 echo (cho ngân sách ER của solver) */
export function echoER(echo: Echo, mainStatValue?: number): number {
  const sub = echo.substats.find((s) => s.stat === 'energyRegen')?.value ?? 0
  const main = echo.mainStat === 'energyRegen' ? (mainStatValue ?? 32.0) : 0
  return sub + main
}
