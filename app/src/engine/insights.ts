import type { CharacterProfile, Echo, RosterAssignment, SonataSet } from '../types'
import { scoreEcho, theoreticalMax } from './score'
import { SET_PREF_BONUS, scoreLoadout, setTierScore } from './solver'

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

// F12 (task 61 / backlog proposals-2026-07-16.md): "Farming Backlog Dashboard" — đối chiếu
// NHU CẦU roster (setFarmSummary ở trên) với TỒN KHO thực tế để trả lời "set nào NÊN DỪNG farm".
// Khác F2: F2 chỉ có nhu cầu (không cần kho); F12 thêm chiều tồn kho + trạng thái đủ/thiếu/dư.

/** ~số mảnh "tốt" mỗi nhân vật muốn set này thì coi là ĐỦ (dừng farm được). Heuristic minh bạch,
 * KHÔNG phải build math chính xác (không biết ai thật sự 5pc vs 3-2). Hiệu chỉnh trên demo (task 61)
 * để phân bố status không thoái hoá — xem insights.test.ts. */
export const GOOD_PER_DEMANDER = 2
/** Trần cho `target`: set phổ dụng (ER/ATK%) lọt top-3 của ~35 nhân vật (breadth degeneracy, task 58) →
 * demand×2 = 70 mảnh là vô nghĩa (thực tế chỉ build 1 set trên vài nhân vật). Trần này giữ con số
 * actionable + thanh coverage có ý nghĩa. Heuristic, hiệu chỉnh trên demo. */
export const BACKLOG_MAX_TARGET = 10

export type BacklogStatus = 'need' | 'farm' | 'enough' | 'surplus'

export interface SetBacklogRow {
  def: SonataSet
  /** Số nhân vật coi set này là top-`topPerChar` set tốt nhất của họ (breadth nhu cầu) */
  demand: number
  /** Tên nhân vật hưởng lợi nhất (beneficiaries[0]) — null khi demand = 0 */
  topDemander: string | null
  /** Tổng echo usable thuộc set này trong kho */
  owned: number
  /** Echo của set này "tốt" cho ≥1 nhân vật cần set (scoreEcho.fitLevel ≥ 0.6 — main stat không sai hẳn) */
  goodOwned: number
  /** Mốc "đủ" gợi ý = demand × GOOD_PER_DEMANDER (0 khi không ai cần) */
  target: number
  status: BacklogStatus
}

// F4 (task 63): Triage Queue — thứ tự duyệt echo "chưa quyết" (không lock/trash).
//  - worst : xấu trước (dọn rác) = tăng dần theo điểm roster (best-owner #1); echo không hợp ai (val -1) lên đầu
//  - newest: mới trước (lô vừa import) = ngược thứ tự thêm vào kho
// F15 (task 65): "joint solver" nhẹ — sau khi gán đội TUẦN TỰ (solveRoster), tìm 1 SWAP đơn (hoán 2 echo
// CÙNG COST giữa 2 nhân vật) làm TĂNG tổng điểm roster. Interpretable ("đổi X↔Y, +Z") thay vì giải lại
// toàn cục NP-hard. Delta tính CHÍNH XÁC bằng scoreLoadout (cùng objective solver, GỒM set bonus).
export interface SwapSuggestion {
  fromId: string
  fromName: string
  toId: string
  toName: string
  /** echo đang ở fromChar → chuyển sang toChar */
  echoOut: Echo
  /** echo đang ở toChar → chuyển sang fromChar */
  echoIn: Echo
  /** tổng điểm 2 bộ tăng thêm sau swap */
  delta: number
}

export function swapSuggestions(assignments: RosterAssignment[], topN = 5): SwapSuggestion[] {
  const rows = assignments.filter((a) => a.result)
  const out: SwapSuggestion[] = []
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const A = rows[i]
      const B = rows[j]
      const aEchoes = A.result!.echoes.map((s) => s.echo)
      const bEchoes = B.result!.echoes.map((s) => s.echo)
      const oldTotal = A.result!.total + B.result!.total
      for (const eA of aEchoes) {
        for (const eB of bEchoes) {
          if (eA.cost !== eB.cost || eA.id === eB.id) continue // cùng cost → 2 bộ vẫn hợp lệ (cost/slot không đổi)
          const newA = scoreLoadout(aEchoes.map((e) => (e.id === eA.id ? eB : e)), A.profile)
          const newB = scoreLoadout(bEchoes.map((e) => (e.id === eB.id ? eA : e)), B.profile)
          if (!newA || !newB) continue
          const delta = newA.total + newB.total - oldTotal
          if (delta > 0.05) {
            out.push({ fromId: A.profile.id, fromName: A.profile.name, toId: B.profile.id, toName: B.profile.name, echoOut: eA, echoIn: eB, delta })
          }
        }
      }
    }
  }
  return out.sort((a, b) => b.delta - a.delta).slice(0, topN)
}

export function triageCandidates(
  echoes: Echo[],
  order: 'worst' | 'newest',
  ownersByEcho: Map<string, OwnerFit[]>,
): Echo[] {
  const cands = echoes.filter((e) => !e.lock && !e.trash)
  if (order === 'newest') {
    const idx = new Map(echoes.map((e, i) => [e.id, i]))
    return [...cands].sort((a, b) => (idx.get(b.id) ?? 0) - (idx.get(a.id) ?? 0))
  }
  const val = (e: Echo) => ownersByEcho.get(e.id)?.[0]?.totalScore ?? -1
  return [...cands].sort((a, b) => val(a) - val(b))
}

const GROUP_RANK: Record<BacklogStatus, number> = { need: 0, farm: 0, enough: 1, surplus: 1 }
const STATUS_RANK: Record<BacklogStatus, number> = { need: 0, farm: 1, enough: 0, surplus: 1 }

/**
 * Bảng backlog farm: cho mỗi set có NHU CẦU (>0 nhân vật) HOẶC có TỒN KHO (>0 echo), tính trạng thái:
 *  - need    : có người muốn nhưng CHƯA có mảnh tốt nào
 *  - farm    : có mảnh tốt nhưng còn dưới mốc `target`
 *  - enough  : đủ mảnh tốt (≥ target) → cân nhắc dừng farm
 *  - surplus : KHÔNG ai trong roster cần nhưng vẫn còn tồn → dọn kho
 * Profile phải ĐÃ merge override (giống bestOwners/setFarmSummary — hàm thuần, không đọc store).
 * Trả về đã SORT theo nhóm (farm-trước → dừng-sau) để component chỉ việc chia 2 khối theo status.
 */
export function setBacklog(
  sets: SonataSet[],
  profiles: CharacterProfile[],
  echoes: Echo[],
  topPerChar = 3,
): SetBacklogRow[] {
  const farm = setFarmSummary(sets, profiles, topPerChar)
  const demandBySet = new Map(farm.map((r) => [r.def.id, r]))

  const echoesBySet = new Map<string, Echo[]>()
  for (const e of echoes) {
    const arr = echoesBySet.get(e.set)
    if (arr) arr.push(e)
    else echoesBySet.set(e.set, [e])
  }

  const rows: SetBacklogRow[] = []
  for (const def of sets) {
    const fr = demandBySet.get(def.id)
    const demand = fr?.beneficiaries.length ?? 0
    const owned = echoesBySet.get(def.id)?.length ?? 0
    if (demand === 0 && owned === 0) continue // không nhu cầu, không tồn kho → bỏ

    const beneficiaries = fr?.beneficiaries.map((b) => b.profile) ?? []
    let goodOwned = 0
    if (demand > 0 && owned > 0) {
      for (const e of echoesBySet.get(def.id)!) {
        if (beneficiaries.some((p) => scoreEcho(e, p).fitLevel >= 0.6)) goodOwned++
      }
    }
    const target = Math.min(demand * GOOD_PER_DEMANDER, BACKLOG_MAX_TARGET)
    let status: BacklogStatus
    if (demand === 0) status = 'surplus'
    else if (goodOwned === 0) status = 'need'
    else if (goodOwned < target) status = 'farm'
    else status = 'enough'

    rows.push({
      def,
      demand,
      topDemander: fr?.beneficiaries[0]?.profile.name ?? null,
      owned,
      goodOwned,
      target,
      status,
    })
  }

  return rows.sort((a, b) => {
    if (GROUP_RANK[a.status] !== GROUP_RANK[b.status]) return GROUP_RANK[a.status] - GROUP_RANK[b.status]
    if (GROUP_RANK[a.status] === 0) {
      // Nhóm "nên farm tiếp": nhiều người muốn trước, hoà thì thiếu nhiều (gap) trước
      return b.demand - a.demand || b.target - b.goodOwned - (a.target - a.goodOwned)
    }
    // Nhóm "dừng/dư": enough trước surplus, hoà thì tồn nhiều trước
    return STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.owned - a.owned
  })
}
