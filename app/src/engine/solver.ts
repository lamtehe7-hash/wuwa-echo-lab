import type { CharacterProfile, Echo, LoadoutResult, LocMessage, ScoredEcho } from '../types'
import { COST_CAP } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { maxRoll } from '../data/substats'
import { echoER, scoreEcho, theoreticalMax } from './score'

// Solver bộ-5 tối ưu (PROPOSAL.md §4): duyệt layout cost → DFS tổ hợp top-K mỗi cost,
// cộng bonus set ở lá + chiết khấu ER thừa, prune bằng chặn trên lạc quan.

const TOP_K = 10

/** Mọi layout hợp lệ: 1–5 slot từ {4,3,1}, tổng cost ≤ 12. Điểm không âm nên bộ đủ 5 slot
 *  tự thắng khi kho đủ; kho mỏng thì bộ thiếu slot vẫn được gợi ý. */
const ALL_LAYOUTS: number[][] = (() => {
  const out: number[][] = []
  for (let n4 = 0; n4 <= 3; n4++)
    for (let n3 = 0; n3 <= 4; n3++)
      for (let n1 = 0; n1 <= 5; n1++) {
        const size = n4 + n3 + n1
        if (size < 1 || size > 5 || 4 * n4 + 3 * n3 + n1 > COST_CAP) continue
        out.push([...Array<number>(n4).fill(4), ...Array<number>(n3).fill(3), ...Array<number>(n1).fill(1)])
      }
  return out
})()
/** Điểm bonus set (đơn vị = điểm chuẩn hoá 0–100) — heuristic, chỉnh được */
export const SET_BONUS = {
  preferred5pc: 15,
  preferred3pc: 10,
  preferred2pc: 5,
  preferred1pc: 8,
  elemental2pc: 4, // 2pc đúng nguyên tố dù không nằm trong preferredSets
}
const MAX_POSSIBLE_SET_BONUS = SET_BONUS.preferred5pc + SET_BONUS.preferred2pc

interface Candidate {
  scored: ScoredEcho
  /** Điểm dùng để tối ưu (đã phạt main stat lệch) */
  value: number
  er: number
  /** Khóa đếm mảnh set: echo trùng tên không đếm 2 lần */
  nameKey: string
}

function setBonusScore(chosen: Candidate[], profile: CharacterProfile): { bonus: number; counts: Record<string, number> } {
  const uniqueNames: Record<string, Set<string>> = {}
  for (const c of chosen) {
    const set = c.scored.echo.set
    ;(uniqueNames[set] ??= new Set()).add(c.nameKey)
  }
  let bonus = 0
  const counts: Record<string, number> = {}
  for (const [setId, names] of Object.entries(uniqueNames)) {
    const n = names.size
    counts[setId] = n
    const def = SONATA_BY_ID[setId]
    if (!def) continue
    const preferred = profile.preferredSets.includes(setId)
    if (preferred) {
      if (def.pieces.includes(5) && n >= 5) bonus += SET_BONUS.preferred5pc
      else if (def.pieces.includes(3) && n >= 3) bonus += SET_BONUS.preferred3pc
      else if (def.pieces.includes(2) && n >= 2) bonus += SET_BONUS.preferred2pc
      else if (def.pieces.includes(1) && n >= 1) bonus += SET_BONUS.preferred1pc
    } else if (def.element === profile.element && def.pieces.includes(2) && n >= 2) {
      bonus += SET_BONUS.elemental2pc
    }
  }
  return { bonus, counts }
}

/** Chiết khấu ER vượt mục tiêu: phần thừa xem như roll vô dụng, trừ lại điểm đã cộng */
function erPenalty(chosen: Candidate[], profile: CharacterProfile): { penalty: number; erGained: number } {
  const erGained = chosen.reduce((s, c) => s + c.er, 0)
  if (!profile.erTarget) return { penalty: 0, erGained }
  const wEr = profile.weights.energyRegen ?? 0
  if (wEr === 0) return { penalty: 0, erGained }
  const need = Math.max(0, profile.erTarget - 100)
  const excess = Math.max(0, erGained - need)
  const penaltyRaw = wEr * (excess / maxRoll('energyRegen'))
  return { penalty: (penaltyRaw / theoreticalMax(profile)) * 100, erGained }
}

export function solveBest5(echoes: Echo[], profile: CharacterProfile): LoadoutResult | null {
  // Pool theo cost, chấm điểm + phạt main stat lệch, cắt top-K
  const pools: Record<number, Candidate[]> = { 1: [], 3: [], 4: [] }
  for (const e of echoes) {
    const scored = scoreEcho(e, profile)
    pools[e.cost]?.push({
      scored,
      // fitLevel phạt main stat lệch: chuẩn ×1, tạm dùng ×0.6, sai ×0.25
      value: scored.score * scored.fitLevel,
      er: echoER(e),
      nameKey: `${e.set}::${e.name?.trim().toLowerCase() || e.id}`,
    })
  }
  for (const k of [1, 3, 4]) pools[k].sort((a, b) => b.value - a.value).splice(TOP_K)

  let best: LoadoutResult | null = null

  for (const layout of ALL_LAYOUTS) {
    const need: Record<number, number> = {}
    for (const c of layout) need[c] = (need[c] ?? 0) + 1
    if (Object.entries(need).some(([c, n]) => (pools[Number(c)]?.length ?? 0) < n)) continue

    // DFS theo nhóm cost, trong cùng nhóm ép chỉ số tăng dần để tránh trùng hoán vị
    const groups = Object.entries(need).map(([c, n]) => ({ cost: Number(c), n }))
    const chosen: Candidate[] = []

    const bestRemaining = (gi: number, taken: number): number => {
      // Chặn trên lạc quan: tổng value tốt nhất còn lại + bonus set tối đa
      let sum = 0
      for (let g = gi; g < groups.length; g++) {
        const pool = pools[groups[g].cost]
        const from = g === gi ? taken : 0
        for (let i = 0; i < groups[g].n - from && i < pool.length; i++) sum += pool[i].value
      }
      return sum + MAX_POSSIBLE_SET_BONUS
    }

    const dfs = (gi: number, taken: number, startIdx: number, sumValue: number) => {
      if (gi === groups.length) {
        const { bonus, counts } = setBonusScore(chosen, profile)
        const { penalty, erGained } = erPenalty(chosen, profile)
        const total = sumValue + bonus - penalty
        // Điểm bằng nhau → ưu tiên bộ nhiều slot (slot thừa vẫn có main stat + dòng phụ cố định)
        if (!best || total > best.total || (total === best.total && layout.length > best.layout.length)) {
          const note: LocMessage[] = []
          if (layout.length < 5) note.push({ key: 'note.partialSlots', params: { n: layout.length } })
          if (profile.erTarget) {
            const need = Math.max(0, profile.erTarget - 100)
            if (erGained < need) note.push({ key: 'note.erShort', params: { er: erGained.toFixed(1), need } })
          }
          if (chosen.some((c) => !c.scored.mainStatFit)) note.push({ key: 'note.mainStatOff' })
          best = {
            echoes: chosen.map((c) => c.scored),
            layout: [...layout],
            totalCost: layout.reduce((s, c) => s + c, 0),
            subScore: sumValue,
            setBonusScore: bonus,
            total,
            setCounts: counts,
            erGained,
            note,
          }
        }
        return
      }
      const { cost, n } = groups[gi]
      if (taken === n) { dfs(gi + 1, 0, 0, sumValue); return }
      if (best && sumValue + bestRemaining(gi, taken) <= best.total) return // prune
      const pool = pools[cost]
      for (let i = startIdx; i < pool.length; i++) {
        chosen.push(pool[i])
        dfs(gi, taken + 1, i + 1, sumValue + pool[i].value)
        chosen.pop()
      }
    }
    dfs(0, 0, 0, 0)
  }

  return best
}
