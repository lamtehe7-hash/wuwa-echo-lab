import type { CharacterProfile, Echo, SonataSet } from '../types'
import { scoreEcho, theoreticalMax } from './score'
import { SET_PREF_BONUS, setTierScore } from './solver'

// Cross-roster insights (task 58 / F1+F2 backlog proposals-2026-07-16.md):
// đảo chiều câu hỏi — thay vì "nhân vật này nên đeo gì" (solver), trả lời
// "echo/set này TỐT NHẤT CHO AI" trên toàn bộ profile roster.
// Chi phí: N echo × P profile × O(1) mỗi scoreEcho → kho 1000 echo × 39 profile
// ~400k phép, <10ms — chạy thẳng trong useMemo, KHÔNG cần worker.

export interface OwnerFit {
  profile: CharacterProfile
  /** Điểm scoreEcho.totalScore của echo với profile này (thang hiển thị chung của app) */
  totalScore: number
  fitLevel: number
  /** echo.set nằm trong preferredSets của nhân vật */
  setMatch: boolean
}

/**
 * Top-N nhân vật hưởng lợi nhất từ 1 echo. Profile truyền vào phải ĐÃ merge
 * override của user (store.mergeProfile) — hàm này thuần, không tự đọc store.
 * Lọc fitLevel ≥ 0.6 (loại main stat sai hẳn); xếp theo totalScore + thưởng
 * set đề cử (SET_PREF_BONUS.fullPreferred — cùng thang solver) để tách các
 * nhân vật cùng archetype có điểm substat sát nhau.
 */
export function bestOwners(echo: Echo, profiles: CharacterProfile[], topN = 3): OwnerFit[] {
  const fits: Array<OwnerFit & { rank: number }> = []
  for (const p of profiles) {
    const s = scoreEcho(echo, p)
    if (s.fitLevel < 0.6) continue
    const setMatch = p.preferredSets.includes(echo.set)
    fits.push({
      profile: p,
      totalScore: s.totalScore,
      fitLevel: s.fitLevel,
      setMatch,
      rank: s.totalScore + (setMatch ? SET_PREF_BONUS.fullPreferred : 0),
    })
  }
  return fits
    .sort((a, b) => b.rank - a.rank || b.fitLevel - a.fitLevel)
    .slice(0, topN)
    .map(({ rank: _rank, ...fit }) => fit)
}

export interface SetBeneficiary {
  profile: CharacterProfile
  /** Điểm stat THẬT của mốc mảnh cao nhất (setTierScore, thang 0–100) + thưởng set đề cử */
  gain: number
  /** Set nằm trong preferredSets của nhân vật */
  preferred: boolean
}

/**
 * "Set này nên farm cho ai" — KHÔNG cần kho echo: chỉ dựa trên stat thật của
 * bonus tại mốc mảnh cao nhất + set đề cử theo meta. Dùng cho bảng ưu tiên farm.
 */
export function setFarmPriority(def: SonataSet, profiles: CharacterProfile[], topN = 5): SetBeneficiary[] {
  const maxPieces = Math.max(...def.pieces)
  return profiles
    .map((p) => {
      const preferred = p.preferredSets.includes(def.id)
      return {
        profile: p,
        gain: setTierScore(def, maxPieces, p, theoreticalMax(p)) + (preferred ? SET_PREF_BONUS.fullPreferred : 0),
        preferred,
      }
    })
    .filter((b) => b.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, topN)
}

export interface SetFarmRow {
  def: SonataSet
  /** Nhân vật coi set này là 1 trong top-N set tốt nhất của HỌ (sort gain giảm dần) */
  beneficiaries: SetBeneficiary[]
}

/**
 * Bảng "ưu tiên farm set" toàn roster. Ngưỡng "đáng farm" KHÔNG dùng gain tuyệt đối —
 * ER/ATK% ai cũng ăn nên mọi set đều dương với cả 39 nhân vật (đo 16/07: threshold 5–12
 * vẫn ra n=38-39 cho mọi set, thoái hoá). Thay vào đó: set chỉ TÍNH cho 1 nhân vật khi nó
 * nằm trong top-`topPerChar` set tốt nhất của CHÍNH nhân vật đó. Sort: nhiều người hưởng
 * nhất trước (breadth), hoà thì gain đỉnh cao hơn trước (depth).
 */
export function setFarmSummary(sets: SonataSet[], profiles: CharacterProfile[], topPerChar = 3): SetFarmRow[] {
  const perSet = new Map<string, SetBeneficiary[]>()
  for (const p of profiles) {
    const theoMax = theoreticalMax(p)
    const ranked = sets
      .map((def) => {
        const preferred = p.preferredSets.includes(def.id)
        return {
          def,
          gain: setTierScore(def, Math.max(...def.pieces), p, theoMax) + (preferred ? SET_PREF_BONUS.fullPreferred : 0),
          preferred,
        }
      })
      .filter((r) => r.gain > 0)
      .sort((a, b) => b.gain - a.gain)
      .slice(0, topPerChar)
    for (const r of ranked) {
      const arr = perSet.get(r.def.id) ?? []
      arr.push({ profile: p, gain: r.gain, preferred: r.preferred })
      perSet.set(r.def.id, arr)
    }
  }
  return sets
    .map((def) => ({ def, beneficiaries: (perSet.get(def.id) ?? []).sort((a, b) => b.gain - a.gain) }))
    .filter((r) => r.beneficiaries.length > 0)
    .sort((a, b) => b.beneficiaries.length - a.beneficiaries.length || (b.beneficiaries[0]?.gain ?? 0) - (a.beneficiaries[0]?.gain ?? 0))
}
