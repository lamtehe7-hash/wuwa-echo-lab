import type { CharacterProfile, Echo, LocMessage } from '../types'
import { SONATA_BY_ID } from '../data/sonata'
import { echoRv } from './score'
import { bestOwners, type OwnerFit } from './insights'

// F11 (task 62 / backlog proposals-2026-07-16.md): "Cleanup rule templates" — luật dọn kho 1-click.
// Trả về danh sách echo mà luật SẼ đánh dấu LOẠI (trash) kèm LÝ DO (LocMessage) — reversible, KHÔNG xoá
// thẳng. Luôn preview trước khi apply + LOẠI TRỪ echo khoá (lock) và echo đã loại (trash) khỏi pool.

export type CleanupRule =
  | { type: 'no-owner' }
  | { type: 'cost-no-crit' }
  | { type: 'low-rv'; threshold: number }
  | { type: 'keep-top-n'; n: number }

export type CleanupRuleType = CleanupRule['type']

export const CLEANUP_DEFAULTS = { lowRvThreshold: 0.3, keepTopN: 3 }
/** cost coi là "phụ" cho luật cost-no-crit — cost-4 (main echo slot) KHÔNG đụng tới */
const COST_NO_CRIT: readonly number[] = [1, 3]
const CRIT_SUBS = new Set<string>(['critRate', 'critDmg'])

export interface CleanupMatch {
  echo: Echo
  /** lý do echo bị gắn cờ (hiện trong preview) */
  reason: LocMessage
}

export interface CleanupCtx {
  profiles: CharacterProfile[]
  /** precomputed bestOwners (App có `bestOwnersByEcho`) — tránh tính lại; thiếu thì tự tính cho no-owner */
  ownersByEcho?: Map<string, OwnerFit[]>
}

/**
 * Danh sách echo luật sẽ đánh dấu loại (kèm lý do). Hàm THUẦN (test được).
 *  - no-owner    : không nhân vật nào trong roster hợp main stat (bestOwners rỗng) — an toàn nhất
 *  - cost-no-crit: cost 1/3 mà substat không có CR/CD
 *  - low-rv      : RV < threshold
 *  - keep-top-n  : giữ N echo RV cao nhất mỗi (set,cost), loại phần còn lại
 */
export function cleanupMatches(echoes: Echo[], rule: CleanupRule, ctx: CleanupCtx): CleanupMatch[] {
  const pool = echoes.filter((e) => !e.lock && !e.trash)
  switch (rule.type) {
    case 'no-owner': {
      const ownersOf = (e: Echo) => ctx.ownersByEcho?.get(e.id) ?? bestOwners(e, ctx.profiles, 1)
      return pool.filter((e) => ownersOf(e).length === 0).map((echo) => ({ echo, reason: { key: 'cleanup.reason.r1' } }))
    }
    case 'cost-no-crit':
      return pool
        .filter((e) => COST_NO_CRIT.includes(e.cost) && !e.substats.some((s) => CRIT_SUBS.has(s.stat)))
        .map((echo) => ({ echo, reason: { key: 'cleanup.reason.r2', params: { c: echo.cost } } }))
    case 'low-rv':
      return pool
        .map((echo) => ({ echo, rv: echoRv(echo) }))
        .filter((x) => x.rv < rule.threshold)
        .map(({ echo, rv }) => ({ echo, reason: { key: 'cleanup.reason.r3', params: { rv: +rv.toFixed(2), threshold: rule.threshold } } }))
    case 'keep-top-n': {
      const groups = new Map<string, Echo[]>()
      for (const e of pool) {
        const k = `${e.set}:${e.cost}`
        const arr = groups.get(k)
        if (arr) arr.push(e)
        else groups.set(k, [e])
      }
      const out: CleanupMatch[] = []
      for (const arr of groups.values()) {
        if (arr.length <= rule.n) continue
        const ranked = [...arr].sort((a, b) => echoRv(b) - echoRv(a))
        ranked.slice(rule.n).forEach((echo, i) => {
          out.push({
            echo,
            reason: { key: 'cleanup.reason.r4', params: { rank: rule.n + i + 1, total: arr.length, set: SONATA_BY_ID[echo.set]?.name ?? echo.set, c: echo.cost } },
          })
        })
      }
      return out
    }
  }
}
