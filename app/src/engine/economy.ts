import type { CharacterProfile, Echo } from '../types'
import {
  CREDIT_PER_EXP,
  ECHO_EXP_CUMULATIVE,
  ECHO_MAX_LEVEL,
  EXP_RETURN_RATIO,
  TUNE_CREDIT,
  TUNER_RETURN_RATIO,
  TUNERS_PER_SLOT,
} from '../data/echoEconomy'
import { MAX_SUBSTATS, SUBSTAT_KEYS, SUBSTATS, expectedRoll, maxRoll } from '../data/substats'
import { scoreEcho, theoreticalMax } from './score'

// Kinh tế nâng cấp echo (task 70/F8 — nền cho F3 queue, F6 tuner planner, F10 build cost).
// Mô hình đã chốt bằng datamine (research/echo-economy.md): mỗi mốc tune = 1 substat MỚI
// (KHÔNG có mốc boost substat cũ), loại substat rút KHÔNG LẶP từ pool 13 loại, giá trị roll
// theo phân phối mốc PROB8/PROB4 (data/substats.ts — nguồn cộng đồng, chưa có xác nhận chính thức).
// Giả định loại substat ra ĐỀU (uniform) trong pool còn lại — cộng đồng đồng thuận, datamine
// không có cột trọng số loại. EV per-slot = mean(pool) là CHÍNH XÁC kể cả rút không lặp
// (đối xứng hoán vị); P10/P90 thì cần mô phỏng rút không lặp thật (MC seeded, tái lập được).

export interface UpgradePotential {
  /** Số slot substat còn chưa mở (0 = đã đủ substat) */
  remainingSlots: number
  /** EXP còn thiếu tới max level của bậc */
  expNeeded: number
  /** Tuner (đúng bậc echo) cần để tune nốt: 10 × slot còn lại */
  tunersNeeded: number
  /** Shell Credit: 0.1 × EXP + credit mỗi lần tune theo bậc */
  creditsNeeded: number
  /** totalScore hiện tại (substat + main, thang điểm app) */
  current: number
  /** Kỳ vọng totalScore khi FULL level + full substat (closed-form, exact) */
  evFinal: number
  /** Trần totalScore: slot còn lại ra đúng các loại tốt nhất, roll max */
  maxFinal: number
  /** Phân vị 10/90 của totalScore cuối (MC rút-không-lặp, seed cố định) */
  p10Final: number
  p90Final: number
  /** (evFinal − current) / tunersNeeded — thước xếp hạng ROI cho F6; 0 khi không cần tuner */
  gainPerTuner: number
}

/** PRNG tái lập được (mulberry32) — không dùng Math.random để test/UI ổn định giữa các lần chạy */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Rút 1 mốc roll theo phân phối probs của stat (u ∈ [0,1)) */
function sampleRoll(stat: (typeof SUBSTATS)[keyof typeof SUBSTATS], u: number): number {
  let acc = 0
  for (let i = 0; i < stat.probs.length; i++) {
    acc += stat.probs[i]
    if (u < acc) return stat.rolls[i]
  }
  return stat.rolls[stat.rolls.length - 1] // phòng sai số cộng dồn float
}

/**
 * Tiềm năng nâng cấp 1 echo cho 1 nhân vật: EV/max/P10-P90 của totalScore tại full,
 * kèm chi phí EXP/tuner/credit còn lại. Dùng chung cho F8 (hiển thị), F3 (queue), F6 (ROI).
 */
export function upgradePotential(
  echo: Echo,
  profile: CharacterProfile,
  opts: { trials?: number; seed?: number } = {},
): UpgradePotential {
  const { trials = 3000, seed = 1234 } = opts
  const maxSlots = MAX_SUBSTATS[echo.rarity] ?? 5
  const remainingSlots = Math.max(0, maxSlots - echo.substats.length)
  const maxLevel = ECHO_MAX_LEVEL[echo.rarity] ?? 25
  const cum = ECHO_EXP_CUMULATIVE[echo.rarity]
  const level = Math.min(Math.max(0, Math.round(echo.level ?? 0)), maxLevel)
  const expNeeded = cum[maxLevel] - cum[level]
  const tunersNeeded = remainingSlots * TUNERS_PER_SLOT
  const creditsNeeded = Math.round(expNeeded * CREDIT_PER_EXP) + remainingSlots * (TUNE_CREDIT[echo.rarity] ?? 0)

  const scored = scoreEcho(echo, profile)
  const current = scored.totalScore
  const theoMax = theoreticalMax(profile)
  const toPts = (raw: number) => (raw / theoMax) * 100

  const used = new Set<string>(echo.substats.map((s) => s.stat))
  const pool = SUBSTAT_KEYS.filter((k) => !used.has(k))
  const poolW = pool.map((k) => profile.weights[k] ?? 0)

  if (remainingSlots === 0 || pool.length === 0) {
    return {
      remainingSlots, expNeeded, tunersNeeded, creditsNeeded,
      current, evFinal: current, maxFinal: current, p10Final: current, p90Final: current,
      gainPerTuner: 0,
    }
  }
  const draws = Math.min(remainingSlots, pool.length)

  // EV closed-form: mean(pool) × số slot (đối xứng hoán vị ⇒ đúng cả khi rút không lặp)
  const evRawPerSlot = pool.reduce((s, k, i) => s + poolW[i] * (expectedRoll(k) / maxRoll(k)), 0) / pool.length
  const evFinal = current + toPts(draws * evRawPerSlot)

  // Trần: các loại trọng số cao nhất, roll max (eff = 1) — KHÔNG phải P100 của MC (max mọi nhánh)
  const maxRawGain = [...poolW].sort((a, b) => b - a).slice(0, draws).reduce((s, w) => s + w, 0)
  const maxFinal = current + toPts(maxRawGain)

  // MC P10/P90: mỗi trial rút `draws` LOẠI không lặp (partial Fisher–Yates) + roll theo mốc
  const rand = mulberry32(seed)
  const finals = new Float64Array(trials)
  const idx = pool.map((_, i) => i)
  for (let t = 0; t < trials; t++) {
    let gain = 0
    for (let d = 0; d < draws; d++) {
      const j = d + Math.floor(rand() * (idx.length - d))
      ;[idx[d], idx[j]] = [idx[j], idx[d]]
      const k = pool[idx[d]]
      const w = poolW[idx[d]]
      const roll = sampleRoll(SUBSTATS[k], rand())
      if (w > 0) gain += w * (roll / maxRoll(k))
    }
    finals[t] = current + toPts(gain)
  }
  finals.sort()
  const q = (p: number) => finals[Math.min(trials - 1, Math.floor(p * (trials - 1)))]

  return {
    remainingSlots, expNeeded, tunersNeeded, creditsNeeded,
    current, evFinal, maxFinal,
    p10Final: q(0.1), p90Final: q(0.9),
    gainPerTuner: tunersNeeded > 0 ? (evFinal - current) / tunersNeeded : 0,
  }
}

/**
 * Hoàn tài nguyên khi tiêu thụ/loại echo đã đầu tư (feed làm nguyên liệu):
 * 75% EXP đã đổ + 30% tuner đã dùng (hằng datamine — nâng cấp hint ước lượng của F9).
 * Làm tròn XUỐNG (chưa verify quy tắc làm tròn in-game — sai lệch tối đa 1 đơn vị).
 */
export function recycleRefund(echo: Pick<Echo, 'rarity' | 'level' | 'substats'>): { exp: number; tuners: number } {
  const maxLevel = ECHO_MAX_LEVEL[echo.rarity] ?? 25
  const level = Math.min(Math.max(0, Math.round(echo.level ?? 0)), maxLevel)
  const invested = ECHO_EXP_CUMULATIVE[echo.rarity][level]
  return {
    exp: Math.floor(invested * EXP_RETURN_RATIO),
    tuners: Math.floor(echo.substats.length * TUNERS_PER_SLOT * TUNER_RETURN_RATIO),
  }
}
