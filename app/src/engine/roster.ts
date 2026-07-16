import type { CharacterProfile, Echo, RosterAssignment } from '../types'
import { solveBest5 } from './solver'

/**
 * Gán kho echo cho NHIỀU nhân vật: giải tuần tự theo thứ tự ưu tiên, mỗi echo chỉ 1 người dùng
 * (echo đã gán bị loại khỏi pool của người sau). Đây là heuristic chuẩn của thể loại
 * (Genshin Optimizer cũng làm vậy) — bài toán joint chính xác là NP-hard, không cần thiết
 * (research/scoring-methods.md §4.3).
 */
/**
 * @param forcedSets map charId → set id: ép bộ của nhân vật đó chỉ dùng echo thuộc set này.
 *   Echo đã gán vẫn bị loại khỏi pool người sau (kể cả khi người sau ép set khác).
 * @param pinnedByChar map charId → echo id[]: ghim echo cho nhân vật (F14, task 64). Echo ghim cho
 *   nhân vật KHÁC bị RESERVE khỏi pool người đang giải (kẻo người xử lý TRƯỚC "cướp" mất echo của
 *   người ghim sau); echo ghim cho CHÍNH người đó được ép vào bộ (solveBest5 `pinned`).
 *   Echo ghim cho CẢ HAI (conflict — UI đã chặn nhưng data cũ có thể còn): pin CỦA MÌNH thắng
 *   reserve → người đứng trước trong roster nhận (task 66; trước đây cả hai cùng mất).
 */
export function solveRoster(
  echoes: Echo[],
  profiles: CharacterProfile[],
  forcedSets?: Record<string, string>,
  pinnedByChar?: Record<string, string[]>,
): RosterAssignment[] {
  let remaining = [...echoes]
  const out: RosterAssignment[] = []
  for (const profile of profiles) {
    const myPinned = pinnedByChar?.[profile.id] ?? []
    // reserve echo ghim cho NGƯỜI KHÁC (chưa gán) khỏi pool người này — TRỪ echo mình cũng ghim
    // (id ghim trùng 2 người mà vẫn reserve thì solveBest5 mất ứng viên pin → neo chết lặng lẽ)
    const reservedForOthers = new Set<string>()
    for (const [cid, ids] of Object.entries(pinnedByChar ?? {})) {
      if (cid === profile.id) continue
      for (const id of ids) if (!myPinned.includes(id)) reservedForOthers.add(id)
    }
    const pool = reservedForOthers.size ? remaining.filter((e) => !reservedForOthers.has(e.id)) : remaining
    const result = solveBest5(pool, profile, { forcedSet: forcedSets?.[profile.id], pinned: myPinned })
    if (result) {
      const used = new Set(result.echoes.map((s) => s.echo.id))
      remaining = remaining.filter((e) => !used.has(e.id))
    }
    out.push({ profile, result })
  }
  return out
}
