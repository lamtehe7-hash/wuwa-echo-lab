import type { BuildContext, CharacterProfile, Echo, LoadoutResult, LocMessage, ScoredEcho, SonataSet } from '../types'
import { COST_CAP } from '../data/mainstats'
import { SONATA_BY_ID, SONATA_SETS } from '../data/sonata'
import { maxRoll } from '../data/substats'
import { echoER, refScale, scoreEcho, theoreticalMax, weightFor } from './score'
import { loadoutDamage, nonEchoER } from './damage'

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

/** Chiết khấu ER vượt mục tiêu: phần thừa xem như roll vô dụng, trừ lại điểm đã cộng.
 *  `erExtra` = ER% NGOÀI echo (vũ khí/passive/forte — nonEchoER, task 55): trừ vào phần echo cần gánh. */
function erPenalty(chosen: Candidate[], profile: CharacterProfile, erExtra: number): { penalty: number; erGained: number } {
  const erGained = chosen.reduce((s, c) => s + c.er, 0)
  if (!profile.erTarget) return { penalty: 0, erGained }
  const wEr = profile.weights.energyRegen ?? 0
  if (wEr === 0) return { penalty: 0, erGained }
  const need = Math.max(0, profile.erTarget - 100 - erExtra)
  const excess = Math.max(0, erGained - need)
  const penaltyRaw = wEr * (excess / maxRoll('energyRegen'))
  return { penalty: (penaltyRaw / theoreticalMax(profile)) * 100, erGained }
}

/** Note "ER chưa đủ" khi echo chưa gánh nốt phần erTarget còn thiếu sau 100 gốc + ER ngoài echo. */
function erShortNote(erGained: number, profile: CharacterProfile, erExtra: number): LocMessage | null {
  if (!profile.erTarget) return null
  const need = Math.max(0, profile.erTarget - 100 - erExtra)
  if (erGained >= need) return null
  return { key: 'note.erShort', params: { er: erGained.toFixed(1), need: need.toFixed(1), extra: erExtra.toFixed(1) } }
}

/**
 * Chấm một bộ CỐ ĐỊNH bằng ĐÚNG objective của solver (value + set bonus − ER penalty) —
 * dùng để so sánh "bộ đang đeo" vs gợi ý mới trên cùng một thang điểm.
 * Không kiểm tra cost cap/layout (bộ đến từ kết quả solver hoặc game nên vốn hợp lệ).
 * `ctx` (task 55): cùng build context với solver để ngân sách ER trừ vũ khí/passive y hệt.
 */
export function scoreLoadout(echoes: Echo[], profile: CharacterProfile, ctx?: BuildContext): LoadoutResult | null {
  if (echoes.length === 0) return null
  const list = echoes.slice(0, 5)
  const theoMax = theoreticalMax(profile)
  const erExtra = nonEchoER(profile, ctx)
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
  const { penalty, erGained } = erPenalty(chosen, profile, erExtra)
  const note: LocMessage[] = []
  if (list.length < 5) note.push({ key: 'note.partialSlots', params: { n: list.length } })
  const erNote = erShortNote(erGained, profile, erExtra)
  if (erNote) note.push(erNote)
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
/** Set trội của 1 bộ (nhiều mảnh nhất) — nạp buff set đúng cho damage model/breakdown.
 *  DÙNG CHUNG cho UI (LoadoutView/BenchPanel/App) — trước 16/07 mỗi nơi 1 bản sao. */
export function dominantSet(counts: Record<string, number>): string | undefined {
  let best: string | undefined
  let bestN = 0
  for (const [setId, n] of Object.entries(counts)) if (n > bestN) { bestN = n; best = setId }
  return best
}

// Trần số mảnh mỗi nhóm cost trong 1 layout (cost-4 ≤3, cost-3 ≤4, cost-1 ≤5) — dùng CHUNG cho
// pool-keep của solveBest5 lẫn UI chặn neo (F14 canAnchorMore); 1 nguồn, khỏi desync (task 66).
export const ANCHOR_GROUP_MAX: Record<number, number> = { 1: 5, 3: 4, 4: 3 }
export interface AnchorCheck { ok: boolean; reason?: 'count' | 'cost' | 'group'; cap?: number }

/** Neo thêm `candidate` vào tập đã neo `pinnedEchoes` có khả thi không (≤5 slot, ≤cost cap, ≤trần nhóm). */
export function canAnchorMore(pinnedEchoes: Echo[], candidate: Echo): AnchorCheck {
  if (pinnedEchoes.length + 1 > 5) return { ok: false, reason: 'count' }
  const cost = pinnedEchoes.reduce((s, e) => s + e.cost, 0) + candidate.cost
  if (cost > COST_CAP) return { ok: false, reason: 'cost' }
  const cap = ANCHOR_GROUP_MAX[candidate.cost] ?? 5
  const sameCost = pinnedEchoes.filter((e) => e.cost === candidate.cost).length + 1
  if (sameCost > cap) return { ok: false, reason: 'group', cap }
  return { ok: true }
}

// Task 67: gom các knob optional (đã 4 cái qua task 46/52/55/64) vào options object —
// call site hết phải đệm `undefined, 'score', undefined` để với tới tham số cuối.
export interface SolveOptions {
  /** ép bộ chỉ dùng echo thuộc set này ('' /undefined = mọi set) */
  forcedSet?: string
  objective?: SolveObjective
  /** chỉ số nền thật (vũ khí/forte/buff — task 52/55): ER gate + objective damage */
  ctx?: BuildContext
  /** F14: id echo NEO — ép vào bộ vô điều kiện */
  pinned?: string[]
}

export function solveBest5(
  echoes: Echo[],
  profile: CharacterProfile,
  opts: SolveOptions = {},
): LoadoutResult | null {
  const { forcedSet, objective = 'score', ctx, pinned } = opts
  const src = forcedSet ? echoes.filter((e) => e.set === forcedSet) : echoes
  const theoMax = theoreticalMax(profile)
  const maxSetBonus = maxPossibleSetBonus(profile, theoMax)
  // ER thật (task 55): vũ khí/passive/forte gánh bớt erTarget → echo chỉ cần gánh phần còn lại
  const erExtra = nonEchoER(profile, ctx)

  const mkCand = (e: Echo): Candidate => {
    const scored = scoreEcho(e, profile)
    const prefs = profile.mainStatPrefs[String(e.cost) as '1' | '3' | '4'] ?? []
    return {
      scored,
      value: scored.totalScore + (prefs.includes(e.mainStat) ? PREF_MAIN_BONUS : 0),
      er: echoER(e),
      nameKey: `${e.set}::${e.name?.trim().toLowerCase() || e.id}`,
    }
  }

  // F14 (task 64): echo GHIM cho nhân vật này — ép vào bộ VÔ ĐIỀU KIỆN (lấy từ TOÀN kho, kể cả set
  // khác forcedSet: pin tường minh > ép set). DFS chỉ tối ưu các slot CÒN LẠI. Bộ = pinned + DFS chọn.
  const pinnedIds = new Set(pinned ?? [])
  const pinnedCandidates: Candidate[] = pinnedIds.size ? echoes.filter((e) => pinnedIds.has(e.id)).map(mkCand) : []
  const pinnedByCost: Record<number, number> = {}
  for (const c of pinnedCandidates) pinnedByCost[c.scored.echo.cost] = (pinnedByCost[c.scored.echo.cost] ?? 0) + 1
  const pinnedValue = pinnedCandidates.reduce((s, c) => s + c.value, 0)

  // Pool theo cost: điểm = substat + GIÁ TRỊ main stat + ưu tiên main đúng meta, cắt top-K.
  // LOẠI echo đã ghim khỏi pool (đã ép vào bộ, không để DFS chọn lại → trùng slot).
  const pools: Record<number, Candidate[]> = { 1: [], 3: [], 4: [] }
  for (const e of src) {
    if (pinnedIds.has(e.id)) continue
    pools[e.cost]?.push(mkCand(e))
  }
  // Cắt top-K theo value, nhưng GIỮ THÊM ứng viên theo TỪNG set có mặt trong pool — KHÔNG
  // chỉ preferredSets (review 16/07: bản cũ chỉ cứu preferred → set khác có bonus dương mà
  // mảnh rank ngoài top-K bị vứt TRƯỚC khi DFS chạy = mất nghiệm tối ưu với kho >10 echo/cost).
  // Cap = số mảnh tối đa nhóm cost đó có thể dùng trong 1 layout (ANCHOR_GROUP_MAX dùng chung);
  // set có bonus = 0 với profile này thì khỏi giữ thêm (không thể cải thiện nghiệm).
  const setWorthCache = new Map<string, boolean>()
  const setWorthExtra = (setId: string): boolean => {
    let w = setWorthCache.get(setId)
    if (w === undefined) {
      const def = SONATA_BY_ID[setId]
      w = !!def && setTierScore(def, 5, profile, theoMax) > 0
      setWorthCache.set(setId, w)
    }
    return w
  }
  for (const k of [1, 3, 4]) {
    const arr = pools[k].sort((a, b) => b.value - a.value)
    const kept = new Set(arr.slice(0, TOP_K))
    const perSet: Record<string, number> = {}
    for (const c of arr) {
      const setId = c.scored.echo.set
      const cap = profile.preferredSets.includes(setId) ? 5 : setWorthExtra(setId) ? ANCHOR_GROUP_MAX[k] : 0
      const have = perSet[setId] ?? 0
      if (have >= cap) continue
      kept.add(c)
      perSet[setId] = have + 1
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
    // Layout phải có ĐỦ slot cho mọi echo ghim theo cost, KHÔNG thì bỏ layout
    if (Object.entries(pinnedByCost).some(([c, pn]) => (need[Number(c)] ?? 0) < pn)) continue
    // Nhu cầu CÒN LẠI (trừ pinned) — pool đã-loại-pinned phải đủ
    const remainNeed: Record<number, number> = {}
    for (const [c, nn] of Object.entries(need)) {
      const r = nn - (pinnedByCost[Number(c)] ?? 0)
      if (r > 0) remainNeed[Number(c)] = r
    }
    if (Object.entries(remainNeed).some(([c, n]) => (pools[Number(c)]?.length ?? 0) < n)) continue

    // DFS theo nhóm cost, trong cùng nhóm ép chỉ số tăng dần để tránh trùng hoán vị
    const groups = Object.entries(remainNeed).map(([c, n]) => ({ cost: Number(c), n }))
    const chosen: Candidate[] = [...pinnedCandidates] // pinned ở đầu, DFS chỉ push/pop phần bổ sung

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
        const { penalty, erGained } = erPenalty(chosen, profile, erExtra)
        const total = sumValue + bonus - penalty
        // >= để total BẰNG nhau vẫn vào consider (tie-break nhiều-slot xử lý ở đó)
        if (topN.length < N || total >= topN[topN.length - 1].total) {
          const note: LocMessage[] = []
          if (layout.length < 5) note.push({ key: 'note.partialSlots', params: { n: layout.length } })
          const erNote = erShortNote(erGained, profile, erExtra)
          if (erNote) note.push(erNote)
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
    dfs(0, 0, 0, pinnedValue) // sumValue khởi tạo = giá trị pinned → prune bound tự gồm pinned (admissible)
  }

  if (topN.length === 0) return null
  if (objective === 'damage') {
    // Re-rank: chọn bộ có damage TƯƠNG ĐỐI cao nhất trong top-N. Damage dùng baseline THẬT khi có
    // ctx (vũ khí+base+forte+buff) → cán cân crit đúng, cost-4 Crit DMG được chọn lại khi CR đủ.
    // activeSet = set trội của TỪNG bộ (nạp buff set đúng theo bộ đang xét).
    let bestI = 0
    let bestD = -Infinity
    for (let i = 0; i < topN.length; i++) {
      const ds = dominantSet(topN[i].setCounts)
      const d = loadoutDamage(topN[i].echoes.map((se) => se.echo), profile, ctx, ds, ds ? topN[i].setCounts[ds] : undefined).multiplier
      if (d > bestD) { bestD = d; bestI = i }
    }
    return topN[bestI]
  }
  return topN[0]
}
