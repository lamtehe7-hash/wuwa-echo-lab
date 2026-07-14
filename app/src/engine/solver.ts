import type { CharacterProfile, Echo, LoadoutResult, LocMessage, ScoredEcho, SonataSet } from '../types'
import { COST_CAP } from '../data/mainstats'
import { SONATA_BY_ID, SONATA_SETS } from '../data/sonata'
import { maxRoll } from '../data/substats'
import { echoER, refScale, scoreEcho, theoreticalMax, weightFor } from './score'
import { loadoutDamage } from './damage'

// Solver bộ-5 tối ưu (PROPOSAL.md §4): duyệt layout cost → DFS tổ hợp top-K mỗi cost,
// cộng bonus set ở lá + chiết khấu ER thừa, prune bằng chặn trên lạc quan.
//
// Objective (07/2026): value ứng viên = totalScore (substat + GIÁ TRỊ main stat) + điểm
// ưu tiên main đúng meta; điểm set = STAT THẬT của các tier bonus đạt mảnh (2pc cộng dồn
// với 5pc) + điểm ưu tiên khi set nằm trong preferredSets — tất cả cùng thang 0–100.
// Layout 4-3-3-1-1 vs 4-4-1-1-1 và "có nên phá set để lấy substat" từ đây được cân bằng số thật.

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
/**
 * Điểm ƯU TIÊN set (cộng thêm bên trên stat thật của bonus) — đại diện phần hiệu ứng
 * KHÔNG lượng hoá được (nổ 480%, buff team, Coordinated…) + độ hợp kit theo meta.
 * Kích hoạt ĐỦ set (5/5, 3/3, 1/1) trong preferredSets được thưởng đậm nhất.
 */
export const SET_PREF_BONUS = {
  fullPreferred: 8, // đủ mốc mảnh cao nhất của set nằm trong preferredSets
  partialPreferred: 3, // mới đạt mốc 2pc của set preferred [2,5]
}

/** Điểm ưu tiên main stat đúng mainStatPrefs (tie-break Crit vs ATK% — bù diminishing returns) */
export const PREF_MAIN_BONUS = 3

interface Candidate {
  scored: ScoredEcho
  /** Điểm dùng để tối ưu = totalScore (substat + main value) + ưu tiên main đúng meta */
  value: number
  er: number
  /** Khóa đếm mảnh set: echo trùng tên không đếm 2 lần */
  nameKey: string
}

/** Điểm STAT THẬT của các tier bonus đã đạt mảnh (cộng dồn 2pc + 5pc), thang 0–100 */
export function setTierScore(def: SonataSet, n: number, profile: CharacterProfile, theoMax: number): number {
  let raw = 0
  for (const tier of def.bonuses) {
    if (n < tier.pieces) continue
    for (const st of tier.stats) raw += weightFor(profile, st.stat) * ((st.value * st.uptime) / refScale(st.stat))
  }
  return (raw / theoMax) * 100
}

function setBonusScore(
  chosen: Candidate[],
  profile: CharacterProfile,
  theoMax: number,
): { bonus: number; counts: Record<string, number> } {
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
    bonus += setTierScore(def, n, profile, theoMax)
    if (profile.preferredSets.includes(setId)) {
      const fullAt = Math.max(...def.pieces)
      const minAt = Math.min(...def.pieces)
      if (n >= fullAt) bonus += SET_PREF_BONUS.fullPreferred
      else if (n >= minAt) bonus += SET_PREF_BONUS.partialPreferred
    }
  }
  return { bonus, counts }
}

export interface SetBonusEntry {
  setId: string
  n: number
  /** Điểm STAT THẬT của bonus set này (đã × uptime), thang 0–100 */
  statScore: number
  /** Điểm ưu tiên khi set nằm trong preferredSets (0 nếu không) */
  prefBonus: number
}

/**
 * Bóc tách setBonusScore theo TỪNG set để hiển thị (LoadoutView). Mirror Y HỆT vòng lặp trong
 * setBonusScore nên TỔNG (statScore + prefBonus) của mọi entry đúng bằng result.setBonusScore
 * (khoá bằng test trong scoreLoadout.test.ts). Gọi 1 lần ở UI nên tự tính lại theoMax là đủ.
 */
export function setBonusBreakdown(counts: Record<string, number>, profile: CharacterProfile): SetBonusEntry[] {
  const theoMax = theoreticalMax(profile)
  const out: SetBonusEntry[] = []
  for (const [setId, n] of Object.entries(counts)) {
    const def = SONATA_BY_ID[setId]
    if (!def) continue
    const statScore = setTierScore(def, n, profile, theoMax)
    let prefBonus = 0
    if (profile.preferredSets.includes(setId)) {
      const fullAt = Math.max(...def.pieces)
      const minAt = Math.min(...def.pieces)
      if (n >= fullAt) prefBonus = SET_PREF_BONUS.fullPreferred
      else if (n >= minAt) prefBonus = SET_PREF_BONUS.partialPreferred
    }
    out.push({ setId, n, statScore, prefBonus })
  }
  return out
}

/** Mọi cách chia 5 mảnh cho các set (partition của 5) — bound phải xét CẢ tổ hợp 3+ set
 *  (vd 2+2+1 qua set 1-mảnh), không chỉ top-2 set như bản cũ (prune nhầm nghiệm tối ưu). */
const PIECE_PARTITIONS: number[][] = [[5], [4, 1], [3, 2], [3, 1, 1], [2, 2, 1], [2, 1, 1, 1], [1, 1, 1, 1, 1]]

/** Chặn trên lạc quan cho tổng điểm set: với mỗi partition của 5 mảnh, mỗi phần lấy set
 *  điểm cao nhất tại mốc mảnh đó (kèm điểm preferred) — cho phép trùng set giữa các phần
 *  (bound chỉ LỎNG hơn, vẫn admissible nên prune an toàn). */
function maxPossibleSetBonus(profile: CharacterProfile, theoMax: number): number {
  const bestAt = [0, 0, 0, 0, 0, 0] // bestAt[k] = điểm set tốt nhất khi đủ k mảnh
  for (const def of SONATA_SETS) {
    const fullAt = Math.max(...def.pieces)
    const minAt = Math.min(...def.pieces)
    const preferred = profile.preferredSets.includes(def.id)
    for (let k = 1; k <= 5; k++) {
      let v = setTierScore(def, k, profile, theoMax)
      if (preferred) {
        if (k >= fullAt) v += SET_PREF_BONUS.fullPreferred
        else if (k >= minAt) v += SET_PREF_BONUS.partialPreferred
      }
      if (v > bestAt[k]) bestAt[k] = v
    }
  }
  return Math.max(...PIECE_PARTITIONS.map((p) => p.reduce((s, k) => s + bestAt[k], 0)))
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

/**
 * Chấm một bộ CỐ ĐỊNH bằng ĐÚNG objective của solver (value + set bonus − ER penalty) —
 * dùng để so sánh "bộ đang đeo" vs gợi ý mới trên cùng một thang điểm.
 * Không kiểm tra cost cap/layout (bộ đến từ kết quả solver hoặc game nên vốn hợp lệ).
 */
export function scoreLoadout(echoes: Echo[], profile: CharacterProfile): LoadoutResult | null {
  if (echoes.length === 0) return null
  const list = echoes.slice(0, 5)
  const theoMax = theoreticalMax(profile)
  const chosen: Candidate[] = list.map((e) => {
    const scored = scoreEcho(e, profile)
    const prefs = profile.mainStatPrefs[String(e.cost) as '1' | '3' | '4'] ?? []
    return {
      scored,
      value: scored.totalScore + (prefs.includes(e.mainStat) ? PREF_MAIN_BONUS : 0),
      er: echoER(e),
      nameKey: `${e.set}::${e.name?.trim().toLowerCase() || e.id}`,
    }
  })
  const sumValue = chosen.reduce((s, c) => s + c.value, 0)
  const { bonus, counts } = setBonusScore(chosen, profile, theoMax)
  const { penalty, erGained } = erPenalty(chosen, profile)
  const note: LocMessage[] = []
  if (list.length < 5) note.push({ key: 'note.partialSlots', params: { n: list.length } })
  if (profile.erTarget) {
    const need = Math.max(0, profile.erTarget - 100)
    if (erGained < need) note.push({ key: 'note.erShort', params: { er: erGained.toFixed(1), need } })
  }
  if (chosen.some((c) => !c.scored.mainStatFit)) note.push({ key: 'note.mainStatOff' })
  return {
    echoes: chosen.map((c) => c.scored),
    layout: list.map((e) => e.cost).sort((a, b) => b - a),
    totalCost: list.reduce((s, e) => s + e.cost, 0),
    subScore: sumValue,
    setBonusScore: bonus,
    total: sumValue + bonus - penalty,
    setCounts: counts,
    erGained,
    note,
  }
}

/** Mục tiêu tối ưu: 'score' = objective weighted-linear (mặc định, prune chặt); 'damage' =
 *  giữ top-N bộ theo score rồi RE-RANK bằng mô hình damage phi tuyến (crit tích × bracket). */
export type SolveObjective = 'score' | 'damage'

/**
 * @param forcedSet nếu truyền, CHỈ ghép echo thuộc set này (ép bộ theo set đã chọn) —
 *   solver tự tối ưu 5 mảnh trong set đó; kho không đủ 5 → bộ thiếu slot (note.partialSlots).
 * @param objective 'score' (mặc định) giữ nguyên hành vi cũ (top-1). 'damage' thu top-16 rồi
 *   chọn bộ có chỉ số damage TƯƠNG ĐỐI cao nhất — hợp DPS (score chỉ xấp xỉ tuyến tính damage).
 *   Damage model phi tuyến nên KHÔNG dùng trực tiếp làm objective DFS (phá prune); re-rank an toàn.
 */
export function solveBest5(
  echoes: Echo[],
  profile: CharacterProfile,
  forcedSet?: string,
  objective: SolveObjective = 'score',
): LoadoutResult | null {
  const src = forcedSet ? echoes.filter((e) => e.set === forcedSet) : echoes
  const theoMax = theoreticalMax(profile)
  const maxSetBonus = maxPossibleSetBonus(profile, theoMax)
  // Pool theo cost: điểm = substat + GIÁ TRỊ main stat + ưu tiên main đúng meta, cắt top-K
  const pools: Record<number, Candidate[]> = { 1: [], 3: [], 4: [] }
  for (const e of src) {
    const scored = scoreEcho(e, profile)
    const prefs = profile.mainStatPrefs[String(e.cost) as '1' | '3' | '4'] ?? []
    pools[e.cost]?.push({
      scored,
      value: scored.totalScore + (prefs.includes(e.mainStat) ? PREF_MAIN_BONUS : 0),
      er: echoER(e),
      nameKey: `${e.set}::${e.name?.trim().toLowerCase() || e.id}`,
    })
  }
  // Cắt top-K theo value, nhưng GIỮ THÊM tối đa 5 ứng viên/preferred set mỗi pool —
  // để không vuột 5pc chỉ vì vài mảnh set nằm ngoài top-K điểm cá nhân.
  for (const k of [1, 3, 4]) {
    const arr = pools[k].sort((a, b) => b.value - a.value)
    const kept = new Set(arr.slice(0, TOP_K))
    for (const setId of profile.preferredSets) {
      let have = 0
      for (const c of arr) {
        if (c.scored.echo.set !== setId || have >= 5) continue
        kept.add(c)
        have++
      }
    }
    pools[k] = arr.filter((c) => kept.has(c))
  }

  // Giữ top-N bộ theo score. N=1 khi objective 'score' → prune chặt + hành vi Y HỆT bản cũ
  // (top-1). N=16 khi 'damage' → có pool để re-rank; prune nới ra (chặn theo bộ hạng-N thấp nhất).
  const N = objective === 'damage' ? 16 : 1
  const topN: LoadoutResult[] = []
  // Cận prune = tổng của bộ hạng-N (thấp nhất trong topN) khi ĐÃ đủ N; chưa đủ thì -∞ (không prune).
  const cutoff = () => (topN.length < N ? -Infinity : topN[topN.length - 1].total)
  const consider = (r: LoadoutResult) => {
    if (topN.length >= N && r.total < topN[topN.length - 1].total) return
    // chèn giảm dần theo total; total bằng nhau → ưu tiên bộ nhiều slot (giữ tie-break cũ cho top-1)
    let i = topN.length
    while (i > 0 && (topN[i - 1].total < r.total || (topN[i - 1].total === r.total && topN[i - 1].layout.length < r.layout.length))) i--
    topN.splice(i, 0, r)
    if (topN.length > N) topN.pop()
  }

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
      return sum + maxSetBonus
    }

    const dfs = (gi: number, taken: number, startIdx: number, sumValue: number) => {
      if (gi === groups.length) {
        const { bonus, counts } = setBonusScore(chosen, profile, theoMax)
        const { penalty, erGained } = erPenalty(chosen, profile)
        const total = sumValue + bonus - penalty
        // >= để total BẰNG nhau vẫn vào consider (tie-break nhiều-slot xử lý ở đó)
        if (topN.length < N || total >= topN[topN.length - 1].total) {
          const note: LocMessage[] = []
          if (layout.length < 5) note.push({ key: 'note.partialSlots', params: { n: layout.length } })
          if (profile.erTarget) {
            const need = Math.max(0, profile.erTarget - 100)
            if (erGained < need) note.push({ key: 'note.erShort', params: { er: erGained.toFixed(1), need } })
          }
          if (chosen.some((c) => !c.scored.mainStatFit)) note.push({ key: 'note.mainStatOff' })
          consider({
            echoes: chosen.map((c) => c.scored),
            layout: [...layout],
            totalCost: layout.reduce((s, c) => s + c, 0),
            subScore: sumValue,
            setBonusScore: bonus,
            total,
            setCounts: counts,
            erGained,
            note,
          })
        }
        return
      }
      const { cost, n } = groups[gi]
      if (taken === n) { dfs(gi + 1, 0, 0, sumValue); return }
      if (sumValue + bestRemaining(gi, taken) <= cutoff()) return // prune
      const pool = pools[cost]
      for (let i = startIdx; i < pool.length; i++) {
        chosen.push(pool[i])
        dfs(gi, taken + 1, i + 1, sumValue + pool[i].value)
        chosen.pop()
      }
    }
    dfs(0, 0, 0, 0)
  }

  if (topN.length === 0) return null
  if (objective === 'damage') {
    // Re-rank: chọn bộ có damage TƯƠNG ĐỐI cao nhất trong top-N (score-best luôn có mặt = topN[0]
    // nên bộ chọn ra có damage ≥ bộ score-best). Tie-break giữ nguyên thứ tự score (ổn định).
    let bestI = 0
    let bestD = -Infinity
    for (let i = 0; i < topN.length; i++) {
      const d = loadoutDamage(topN[i].echoes.map((se) => se.echo), profile).multiplier
      if (d > bestD) { bestD = d; bestI = i }
    }
    return topN[bestI]
  }
  return topN[0]
}
