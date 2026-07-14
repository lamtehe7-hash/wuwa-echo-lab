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
 */
export function solveRoster(
  echoes: Echo[],
  profiles: CharacterProfile[],
  forcedSets?: Record<string, string>,
): RosterAssignment[] {
  let remaining = [...echoes]
  const out: RosterAssignment[] = []
  for (const profile of profiles) {
    const result = solveBest5(remaining, profile, forcedSets?.[profile.id])
    if (result) {
      const used = new Set(result.echoes.map((s) => s.echo.id))
      remaining = remaining.filter((e) => !used.has(e.id))
    }
    out.push({ profile, result })
  }
  return out
}
