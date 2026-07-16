import type { BonusStatKey, CharacterProfile, Echo, Element, ScoredEcho, SubstatKey, TuneAdvice } from '../types'
import { MAINSTATS } from '../data/mainstats'
import { MAX_SUBSTATS, SUBSTAT_KEYS, SUBSTATS, expectedRoll, maxRoll } from '../data/substats'
import { mainFitLevel } from './substatRating'

// Chấm điểm weighted roll-efficiency (PROPOSAL.md §4):
//   raw = Σ w[stat] × (value / maxRoll(stat))
//   score 0–100 = raw / (tổng 5 trọng số lớn nhất của nhân vật) × 100
// → echo "hoàn hảo lý thuyết" (5 roll max của 5 stat tốt nhất) = 100 điểm.
//
// MỞ RỘNG (07/2026): GIÁ TRỊ main stat và stat từ SET BONUS được quy về CÙNG đơn vị
// (w × value / refScale) rồi cộng thêm bên trên thang 0–100 của substat — solver nhờ đó
// cân được các layout 4-3-3-1-1 vs 4-4-1-1-1 và việc kích hoạt đủ set bằng số thật.
// Kiểm chứng độ chuẩn của xấp xỉ tuyến tính: với build endgame điển hình (CR 50/CD 250,
// pool DMG% ~70), +21% Crit DMG (1 roll max, w=1) ≈ +6% damage; +10% Element DMG
// (2pc set, w 0.85) ≈ +5.9% damage → tỉ lệ trọng số phản ánh đúng damage thật.

export function rollEfficiency(stat: SubstatKey, value: number): number {
  return value / maxRoll(stat)
}

/** RV — chất lượng roll trung bình (Σ value/maxRoll mỗi substat ÷ số substat), KHÔNG phụ thuộc nhân vật.
 * 1 nguồn dùng chung: badge RV (EchoCard), sort RV (RankingTable), luật dọn kho (cleanup.ts). 0 substat → 0. */
export function echoRv(echo: Pick<Echo, 'substats'>): number {
  if (echo.substats.length === 0) return 0
  return echo.substats.reduce((s, x) => s + x.value / maxRoll(x.stat), 0) / echo.substats.length
}

/** Memo theo IDENTITY profile — hàm gọi cực dày (scoreEcho mỗi echo, solver mỗi node, bulk
 * upgradePotential ×N) mà giá trị là loop-invariant. AN TOÀN vì profile immutable toàn app
 * (mergeProfile luôn spread object mới — đã audit 17/07, không chỗ nào mutate weights tại chỗ). */
const THEO_MAX_CACHE = new WeakMap<CharacterProfile, number>()

/** Tổng 5 trọng số lớn nhất — mẫu số chuẩn hoá */
export function theoreticalMax(profile: CharacterProfile): number {
  const hit = THEO_MAX_CACHE.get(profile)
  if (hit !== undefined) return hit
  const ws = SUBSTAT_KEYS.map((k) => profile.weights[k] ?? 0).sort((a, b) => b - a)
  const top5 = ws.slice(0, 5).reduce((s, w) => s + w, 0)
  const v = top5 > 0 ? top5 : 1
  THEO_MAX_CACHE.set(profile, v)
  return v
}

// ---- Quy đổi main stat / set bonus stat về đơn vị "roll chuẩn có trọng số" ----

/** Ref cho stat KHÔNG có substat tương ứng (Element DMG%, Healing Bonus%): 1 "roll chuẩn %"
 *  = max roll của substat % 8-mốc (PCT8) — derive từ data thay vì hardcode (review 16/07). */
export const REF_PCT_ROLL = maxRoll('atkPct')

const DMG_KEY_TO_ELEMENT: Partial<Record<BonusStatKey, Element>> = {
  glacioDmg: 'glacio', fusionDmg: 'fusion', electroDmg: 'electro',
  aeroDmg: 'aero', spectroDmg: 'spectro', havocDmg: 'havoc',
}

const isSubstatKey = (stat: BonusStatKey): stat is SubstatKey => stat in SUBSTATS

/**
 * Trọng số hiệu dụng của một stat bất kỳ (substat/main/set bonus) với nhân vật:
 * Element DMG chỉ có giá trị khi ĐÚNG nguyên tố (key 'elementDmg' = luôn đúng nguyên tố).
 */
export function weightFor(profile: CharacterProfile, stat: BonusStatKey): number {
  if (stat === 'elementDmg') return profile.weights.elementDmg ?? 0
  if (stat === 'healingBonus') return profile.weights.healingBonus ?? 0
  const el = DMG_KEY_TO_ELEMENT[stat]
  if (el) return el === profile.element ? (profile.weights.elementDmg ?? 0) : 0
  return profile.weights[stat as SubstatKey] ?? 0
}

/** Mẫu quy đổi %: substat dùng maxRoll của chính nó, stat main-only dùng REF_PCT_ROLL */
export function refScale(stat: BonusStatKey): number {
  return isSubstatKey(stat) ? maxRoll(stat) : REF_PCT_ROLL
}

/** Điểm raw của GIÁ TRỊ main stat (giả định +25 — echo không lưu số main, HANDOVER §5) */
export function mainStatRaw(echo: Echo, profile: CharacterProfile): number {
  const value = MAINSTATS[echo.cost].find((d) => d.key === echo.mainStat)?.max ?? 0
  return weightFor(profile, echo.mainStat) * (value / refScale(echo.mainStat))
}

/**
 * Độ hợp main stat 3 mức:
 *  1    — nằm trong mainStatPrefs (chuẩn meta)
 *  0.6  — không chuẩn nhưng nhân vật vẫn ăn stat này (trọng số substat tương ứng ≥ 0.5,
 *          vd ATK% cost-3 cho DPS trong lúc chờ farm bản Element DMG%)
 *  0.25 — sai hẳn (vd DEF% cho DPS)
 */
export function mainStatFitLevel(echo: Echo, profile: CharacterProfile): number {
  return mainFitLevel(profile, echo.cost, echo.mainStat)
}

export function scoreEcho(echo: Echo, profile: CharacterProfile): ScoredEcho {
  const breakdown = echo.substats.map((s) => {
    const eff = rollEfficiency(s.stat, s.value)
    const w = profile.weights[s.stat] ?? 0
    return { stat: s.stat, value: s.value, eff, weighted: w * eff }
  })
  const raw = breakdown.reduce((sum, b) => sum + b.weighted, 0)
  const theoMax = theoreticalMax(profile)
  const score = (raw / theoMax) * 100
  const mainScore = (mainStatRaw(echo, profile) / theoMax) * 100
  const fitLevel = mainStatFitLevel(echo, profile)
  return {
    echo,
    raw,
    score,
    mainScore,
    totalScore: score + mainScore,
    fitLevel,
    mainStatFit: fitLevel === 1,
    breakdown,
  }
}

/** Xếp hạng danh sách echo cho 1 nhân vật theo tổng giá trị (substat + main stat) */
export function rankEchoes(echoes: Echo[], profile: CharacterProfile): ScoredEcho[] {
  return echoes
    .map((e) => scoreEcho(e, profile))
    .sort((a, b) => b.totalScore - a.totalScore || b.fitLevel - a.fitLevel)
}

/**
 * Pool substat còn có thể ra khi tune tiếp: 13 loại − loại đã roll.
 * ĐÃ VERIFY (research/data-verification.md §5): main stat KHÔNG loại trừ substat cùng loại —
 * echo main Crit Rate vẫn roll được substat Crit Rate ("double crit"); chỉ cấm trùng giữa các substat.
 * (export: economy.ts dùng chung — 1 nguồn công thức pool/EV, task 76 khử bản chép)
 */
export function remainingPool(echo: Echo): SubstatKey[] {
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
  // Thang TỔNG điểm (substat + main) — cùng thang với totalScore/evFinal hiển thị khắp app;
  // trước đây chỉ substat → 2 số "kỳ vọng" lệch nhau đúng mainScore trên cùng card (review 16/07)
  const expectedFinal = (expectedFinalRaw / theoreticalMax(profile)) * 100 + scored.mainScore

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

// ---- Hạng chữ S–D (task 58 / F17) ----

/**
 * Max lý thuyết của TỔNG điểm (substat 100 + main stat TỐT NHẤT khả dĩ của cost) —
 * mốc quy chiếu cho grade. Khác mainStatRaw: duyệt MỌI main stat của cost thay vì
 * main hiện có trên echo (totalScore có thể vượt 100 vì mainScore cộng thêm không cap).
 */
export function theoreticalMaxTotal(profile: CharacterProfile, cost: Echo['cost']): number {
  const theoMax = theoreticalMax(profile)
  let best = 0
  for (const d of MAINSTATS[cost]) {
    const raw = weightFor(profile, d.key) * (d.max / refScale(d.key))
    if (raw > best) best = raw
  }
  return 100 + (best / theoMax) * 100
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D'

/** Ngưỡng % (totalScore / theoreticalMaxTotal) — QUYẾT ĐỊNH SẢN PHẨM, chỉnh tự do.
 *  Hiệu chỉnh 16/07 trên demo data (Camellya/Xuanling/Verina): gần-BiS 81–96% /
 *  tốt-dở-dang 47–60% / xoàng-full-tune ~41% / rác <20%. */
export const GRADE_BANDS: ReadonlyArray<readonly [number, Grade]> = [
  [80, 'S'],
  [60, 'A'],
  [40, 'B'],
  [20, 'C'],
  [0, 'D'],
]

/** Hạng chữ của 1 echo đã chấm điểm (dùng totalScore từ scoreEcho) */
export function gradeOf(totalScore: number, profile: CharacterProfile, cost: Echo['cost']): Grade {
  const pct = (totalScore / theoreticalMaxTotal(profile, cost)) * 100
  for (const [min, g] of GRADE_BANDS) if (pct >= min) return g
  return 'D'
}

/** Main ER max +25 (cost-3) — derive từ MAINSTATS, không hardcode 32.0 (review 16/07:
 *  bản sao lệch nguồn với mainStatRaw/damage.ts nếu datamine chỉnh số). */
const ER_MAIN_MAX = MAINSTATS[3].find((d) => d.key === 'energyRegen')?.max ?? 32.0

/** Tổng ER% substat + main stat của 1 echo (cho ngân sách ER của solver) */
export function echoER(echo: Echo, mainStatValue?: number): number {
  const sub = echo.substats.find((s) => s.stat === 'energyRegen')?.value ?? 0
  const main = echo.mainStat === 'energyRegen' ? (mainStatValue ?? ER_MAIN_MAX) : 0
  return sub + main
}
