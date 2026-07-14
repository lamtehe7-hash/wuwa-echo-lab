import { useEffect, useState } from 'react'
import type { CharacterProfile, Echo, EchoCost, MainStatKey, Substat, SubstatKey, WeightKey } from './types'
import { MAINSTATS } from './data/mainstats'
import { MAX_SUBSTATS, SUBSTATS } from './data/substats'

const KEY = 'wuwa-echo-optimizer:v1'
const OVERRIDE_KEY = 'wuwa-echo-optimizer:overrides:v1'

interface PersistShape {
  version: 1
  echoes: Echo[]
}

export function loadEchoes(): Echo[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as PersistShape
    return Array.isArray(data.echoes) ? data.echoes : []
  } catch {
    return []
  }
}

export function saveEchoes(echoes: Echo[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, echoes } satisfies PersistShape))
  } catch (err) {
    // Quota đầy / storage bị chặn: đừng crash app (chỉ mất persist lần này)
    console.error('saveEchoes failed:', err)
  }
}

/** Hook kho echo có persist localStorage */
export function useEchoInventory() {
  const [echoes, setEchoes] = useState<Echo[]>(loadEchoes)
  useEffect(() => saveEchoes(echoes), [echoes])
  return { echoes, setEchoes }
}

export function exportJson(echoes: Echo[]) {
  const blob = new Blob([JSON.stringify({ version: 1, echoes }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wuwa-echoes-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const VALID_COSTS: readonly number[] = [1, 3, 4]

/** Validate + làm sạch 1 echo từ file import (file có thể hỏng/sửa tay). null = loại bỏ. */
function sanitizeEcho(raw: unknown, seenIds: Set<string>): Echo | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as Partial<Echo>
  if (!VALID_COSTS.includes(e.cost as number)) return null
  const cost = e.cost as EchoCost
  if (!MAINSTATS[cost].some((m) => m.key === e.mainStat)) return null
  if (typeof e.set !== 'string') return null
  const rarity = e.rarity === 3 || e.rarity === 4 ? e.rarity : 5
  if (!Array.isArray(e.substats)) return null
  const seenStats = new Set<string>()
  const substats: Substat[] = []
  for (const s of e.substats) {
    if (!s || typeof s !== 'object') continue
    const sub = s as Partial<Substat>
    if (typeof sub.stat !== 'string' || !(sub.stat in SUBSTATS)) continue
    if (typeof sub.value !== 'number' || !Number.isFinite(sub.value)) continue
    if (seenStats.has(sub.stat)) continue
    // Giá trị phải nằm ở mốc roll hợp lệ: snap về mốc gần nhất nếu lệch ≤5%, lệch hơn = rác
    // (vd critRate 999 sửa tay) → bỏ dòng, đừng để 1 substat ảo thổi điểm lên vài trăm.
    const rolls = SUBSTATS[sub.stat as SubstatKey].rolls
    const nearest = rolls.reduce((best, r) => (Math.abs(r - (sub.value as number)) < Math.abs(best - (sub.value as number)) ? r : best), rolls[0])
    if (Math.abs(sub.value - nearest) > nearest * 0.05) continue
    seenStats.add(sub.stat)
    substats.push({ stat: sub.stat as SubstatKey, value: nearest })
  }
  const level = typeof e.level === 'number' && Number.isFinite(e.level)
    ? Math.min(25, Math.max(0, Math.round(e.level))) : 25
  let id = typeof e.id === 'string' && e.id ? e.id : newId()
  while (seenIds.has(id)) id = newId()
  seenIds.add(id)
  return {
    id,
    name: typeof e.name === 'string' && e.name.trim() ? e.name : undefined,
    cost,
    set: e.set,
    rarity,
    level,
    mainStat: e.mainStat as MainStatKey,
    substats: substats.slice(0, MAX_SUBSTATS[rarity] ?? 5),
    // Cờ lock/trash: chỉ nhận đúng true (file cũ không có → undefined, JSON.stringify tự bỏ)
    lock: e.lock === true ? true : undefined,
    trash: e.trash === true ? true : undefined,
  }
}

export interface ImportResult {
  echoes: Echo[]
  /** Số mục trong file bị loại vì không hợp lệ */
  dropped: number
}

export function importJson(file: File): Promise<ImportResult> {
  return file.text().then((t) => {
    const data = JSON.parse(t) as PersistShape
    if (!Array.isArray(data.echoes)) throw new Error('invalid-format')
    const seenIds = new Set<string>()
    const echoes = data.echoes.map((raw) => sanitizeEcho(raw, seenIds)).filter((e): e is Echo => e !== null)
    if (data.echoes.length > 0 && echoes.length === 0) throw new Error('invalid-format')
    return { echoes, dropped: data.echoes.length - echoes.length }
  })
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ---- Override trọng số/erTarget theo nhân vật (lưu riêng, preset gốc giữ nguyên) ----

export interface ProfileOverride {
  weights?: Partial<Record<WeightKey, number>>
  /** number = override; null = user ĐÃ XOÁ gate (khác undefined = chưa đụng tới, dùng preset).
   *  Dùng null thay undefined vì JSON.stringify bỏ key undefined → mất trạng thái "đã xoá" khi reload. */
  erTarget?: number | null
}

function loadOverrides(): Record<string, ProfileOverride> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function useOverrides() {
  const [overrides, setOverrides] = useState<Record<string, ProfileOverride>>(loadOverrides)
  useEffect(() => {
    try {
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides))
    } catch (err) {
      console.error('saveOverrides failed:', err)
    }
  }, [overrides])
  return { overrides, setOverrides }
}

/** Preset + override → profile dùng thực tế (erTarget null = đã xoá gate, KHÔNG rơi về preset) */
export function mergeProfile(profile: CharacterProfile, ov?: ProfileOverride): CharacterProfile {
  if (!ov) return profile
  return {
    ...profile,
    weights: { ...profile.weights, ...ov.weights },
    erTarget: ov.erTarget === null ? undefined : ov.erTarget ?? profile.erTarget,
  }
}
