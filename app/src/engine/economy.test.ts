import { describe, expect, it } from 'vitest'
import type { Echo } from '../types'
import { recycleRefund, rerollAdvice, sampleRoll, upgradePotential } from './economy'
import { scoreEcho, tuneAdvice } from './score'
import { SUBSTATS } from '../data/substats'
import { CHARACTER_BY_ID } from '../data/characters'

const camellya = CHARACTER_BY_ID['camellya']

function echo(overrides: Partial<Echo>): Echo {
  return {
    id: 'test',
    name: 'Test',
    cost: 4,
    set: 'havoc-eclipse',
    rarity: 5,
    level: 25,
    mainStat: 'critRate',
    substats: [],
    ...overrides,
  }
}

describe('upgradePotential — chi phí (bảng datamine task 69)', () => {
  it('5★ +0, 0 substat: full chi phí 142.600 exp / 50 tuner / 24.260 credit', () => {
    const p = upgradePotential(echo({ level: 0 }), camellya)
    expect(p.remainingSlots).toBe(5)
    expect(p.expNeeded).toBe(142_600)
    expect(p.tunersNeeded).toBe(50)
    expect(p.creditsNeeded).toBe(14_260 + 5 * 2000)
  })

  it('5★ +21, 3 substat: exp phần còn lại + 2 slot tune', () => {
    const p = upgradePotential(
      echo({
        level: 21,
        substats: [
          { stat: 'critRate', value: 8.7 },
          { stat: 'critDmg', value: 17.4 },
          { stat: 'atkPct', value: 9.4 },
        ],
      }),
      camellya,
    )
    expect(p.remainingSlots).toBe(2)
    expect(p.expNeeded).toBe(142_600 - 89_600)
    expect(p.tunersNeeded).toBe(20)
    expect(p.creditsNeeded).toBe(5300 + 2 * 2000)
  })

  it('4★: max +20, 4 slot, credit tune 1000', () => {
    const p = upgradePotential(echo({ rarity: 4, level: 0 }), camellya)
    expect(p.remainingSlots).toBe(4)
    expect(p.expNeeded).toBe(63_280)
    expect(p.tunersNeeded).toBe(40)
    expect(p.creditsNeeded).toBe(6328 + 4 * 1000)
  })

  it('đã full slot + max level: mọi chỉ số = current, gainPerTuner 0', () => {
    const full = echo({
      level: 25,
      substats: [
        { stat: 'critRate', value: 8.7 },
        { stat: 'critDmg', value: 17.4 },
        { stat: 'atkPct', value: 9.4 },
        { stat: 'atk', value: 40 },
        { stat: 'energyRegen', value: 8.4 },
      ],
    })
    const p = upgradePotential(full, camellya)
    expect(p.remainingSlots).toBe(0)
    expect(p.expNeeded).toBe(0)
    expect(p.evFinal).toBe(p.current)
    expect(p.maxFinal).toBe(p.current)
    expect(p.p10Final).toBe(p.current)
    expect(p.p90Final).toBe(p.current)
    expect(p.gainPerTuner).toBe(0)
  })
})

describe('upgradePotential — EV/phân phối', () => {
  const half = echo({
    level: 10,
    substats: [
      { stat: 'critRate', value: 8.7 },
      { stat: 'hp', value: 430 },
    ],
  })

  it('evFinal khớp tuneAdvice.expectedFinal (2 đường tính độc lập, CÙNG thang totalScore — review 16/07 #4)', () => {
    const p = upgradePotential(half, camellya)
    const adv = tuneAdvice(half, camellya)
    expect(p.evFinal).toBeCloseTo(adv.expectedFinal, 8)
  })

  it('thứ tự: current ≤ p10 ≤ evFinal(≈) ≤ p90 ≤ maxFinal; MC mean hội tụ về evFinal', () => {
    const p = upgradePotential(half, camellya, { trials: 8000, seed: 7 })
    expect(p.p10Final).toBeGreaterThanOrEqual(p.current)
    expect(p.p10Final).toBeLessThanOrEqual(p.p90Final)
    expect(p.maxFinal).toBeGreaterThanOrEqual(p.p90Final)
    // EV nằm giữa p10–p90 (phân phối không suy biến với profile crit)
    expect(p.evFinal).toBeGreaterThan(p.p10Final)
    expect(p.evFinal).toBeLessThan(p.p90Final)
  })

  it('cùng seed → cùng kết quả (tái lập); khác seed → p10/p90 xê dịch nhỏ', () => {
    const a = upgradePotential(half, camellya, { trials: 2000, seed: 42 })
    const b = upgradePotential(half, camellya, { trials: 2000, seed: 42 })
    expect(a.p10Final).toBe(b.p10Final)
    expect(a.p90Final).toBe(b.p90Final)
    const c = upgradePotential(half, camellya, { trials: 2000, seed: 43 })
    expect(Math.abs(c.p90Final - a.p90Final)).toBeLessThan(1.5)
  })

  it('trials: 0 bỏ vòng MC — p10/p90 = evFinal, cost/EV giữ nguyên (lời gọi hàng loạt)', () => {
    const p0 = upgradePotential(half, camellya, { trials: 0 })
    const p1 = upgradePotential(half, camellya)
    expect(p0.p10Final).toBe(p0.evFinal)
    expect(p0.p90Final).toBe(p0.evFinal)
    expect(p0.evFinal).toBeCloseTo(p1.evFinal, 10)
    expect(p0.tunersNeeded).toBe(p1.tunersNeeded)
    expect(p0.gainPerTuner).toBeCloseTo(p1.gainPerTuner, 10)
  })

  it('maxFinal = current + top-w của pool (roll max) — tính tay', () => {
    // pool bỏ critRate + hp (đã có). Top-2 trọng số Camellya còn lại: critDmg (1) + havocDmg?
    // havocDmg không phải substat — top substat còn: critDmg, rồi atkPct/basicAtk…
    const p = upgradePotential(
      echo({
        level: 25,
        substats: [
          { stat: 'critRate', value: 8.7 },
          { stat: 'hp', value: 430 },
          { stat: 'def', value: 50 },
        ],
      }),
      camellya,
    )
    const scored = scoreEcho(
      echo({ level: 25, substats: [{ stat: 'critRate', value: 8.7 }, { stat: 'hp', value: 430 }, { stat: 'def', value: 50 }] }),
      camellya,
    )
    const ws = ['critDmg', 'atkPct', 'basicAtk', 'atk', 'energyRegen', 'hpPct', 'defPct', 'heavyAtk', 'skillDmg', 'liberationDmg']
      .map((k) => camellya.weights[k as keyof typeof camellya.weights] ?? 0)
      .sort((x, y) => y - x)
    const top2 = ws[0] + ws[1]
    const theo = scored.raw > 0 ? (scored.raw / scored.score) * 100 : 1
    expect(p.maxFinal).toBeCloseTo(scored.totalScore + (top2 / theo) * 100, 6)
  })
})

describe('sampleRoll — CDF chuẩn hoá theo Σprobs (review 16/07 #5)', () => {
  it('atk (PROB4 Σ=0.9971): tần suất từng mốc = probs/Σ — mốc max KHÔNG ăn phần residual', () => {
    const def = SUBSTATS.atk
    const N = 100_000
    const counts = new Map<number, number>()
    for (let i = 0; i < N; i++) {
      const v = sampleRoll(def, (i + 0.5) / N) // grid u đều — deterministic, không cần PRNG
      counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    const total = def.probs.reduce((s, p) => s + p, 0)
    for (let m = 0; m < def.rolls.length; m++) {
      expect((counts.get(def.rolls[m]) ?? 0) / N).toBeCloseTo(def.probs[m] / total, 3)
    }
    // Chống regression cụ thể: trước fix, u so CDF thô → mốc max 60 hứng residual 0.0029
    // (tần suất 0.1065 thay vì 0.1036/0.9971 ≈ 0.1039 — oversample +2.8% tương đối)
    expect((counts.get(60) ?? 0) / N).toBeLessThan(0.105)
  })
})

describe('rerollAdvice (F7/task 74) — mô hình khoá-4 nhắm đích', () => {
  const fullSubs = (fifth: { stat: string; value: number }) => [
    { stat: 'critRate', value: 8.7 },
    { stat: 'critDmg', value: 17.4 },
    { stat: 'atkPct', value: 9.4 },
    { stat: 'atk', value: 40 },
    fifth,
  ] as Echo['substats']

  it('gate: không phải 5★ / chưa full 5 substat → null', () => {
    expect(rerollAdvice(echo({ rarity: 4, substats: fullSubs({ stat: 'hp', value: 430 }) }), camellya)).toBeNull()
    expect(rerollAdvice(echo({ substats: fullSubs({ stat: 'hp', value: 430 }).slice(0, 4) }), camellya)).toBeNull()
  })

  it('gate fit trong ENGINE: main stat sai (fit < 0.6) → null dù substat chết đầy (review 16/07 #10)', () => {
    // defPct: không thuộc mainStatPrefs Camellya + weight substat 0 → fit 0.25 — Transducer là
    // currency giới hạn, engine không gợi ý đốt vào echo main sai (đồng bộ gate UI ScoreBadge)
    const adv = rerollAdvice(echo({ mainStat: 'defPct', substats: fullSubs({ stat: 'hp', value: 430 }) }), camellya)
    expect(adv).toBeNull()
  })

  it('chọn substat CHẾT (w=0) làm ứng viên reroll, EV dương, P cải thiện > 0', () => {
    const adv = rerollAdvice(echo({ substats: fullSubs({ stat: 'hp', value: 430 }) }), camellya)
    expect(adv).not.toBeNull()
    expect(adv!.stat).toBe('hp') // hp trọng số 0 với Camellya — đáng thay nhất
    expect(adv!.evGain).toBeGreaterThan(0)
    expect(adv!.pImprove).toBeGreaterThan(0.2) // pool 9 loại có vài loại trọng số dương
    expect(adv!.pImprove).toBeLessThanOrEqual(1)
    expect(adv!.cost).toBe(3) // TRANSDUCER_COST_BY_LOCKED[4]
    expect(adv!.evPerTransducer).toBeCloseTo(adv!.evGain / 3, 10)
  })

  it('targetStat = loại trọng số cao nhất CHƯA bị khoá (basicAtk cho Camellya khi crit đã có)', () => {
    const adv = rerollAdvice(echo({ substats: fullSubs({ stat: 'hp', value: 430 }) }), camellya)
    // pool của slot hp = 13 − {critRate, critDmg, atkPct, atk} → basicAtk là w cao nhất còn lại
    expect(adv!.targetStat).toBe('basicAtk')
  })

  it('EV giảm khi substat hiện tại đã tốt: reroll basicAtk max-roll kém hấp dẫn hơn reroll hp chết', () => {
    const withDead = rerollAdvice(echo({ substats: fullSubs({ stat: 'hp', value: 430 }) }), camellya)!
    const withGood = rerollAdvice(echo({ substats: fullSubs({ stat: 'basicAtk', value: 11.6 }) }), camellya)!
    expect(withDead.evGain).toBeGreaterThan(withGood.evGain)
  })
})

describe('recycleRefund — hoàn 75% EXP / 30% tuner (datamine)', () => {
  it('5★ +25 full tune: 106.950 exp + 15 tuner', () => {
    const r = recycleRefund(echo({ level: 25, substats: Array(5).fill({ stat: 'atk', value: 30 }) }))
    expect(r.exp).toBe(106_950)
    expect(r.tuners).toBe(15)
  })
  it('chưa luyện chưa tune: 0/0', () => {
    expect(recycleRefund(echo({ level: 0 }))).toEqual({ exp: 0, tuners: 0 })
  })
  it('4★ +10, 2 tune: 75% cum + floor(2×10×0.3)=6', () => {
    const r = recycleRefund(echo({ rarity: 4, level: 10, substats: [
      { stat: 'atk', value: 30 },
      { stat: 'hp', value: 320 },
    ] }))
    expect(r.exp).toBe(Math.floor(13_200 * 0.75))
    expect(r.tuners).toBe(6)
  })
})
