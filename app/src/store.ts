import { createContext, useEffect, useState } from 'react'
import type { BuildContext, CharacterProfile, Echo, EchoCost, MainStatKey, Substat, SubstatKey, WeightKey } from './types'
import { MAINSTATS } from './data/mainstats'
import { MAX_SUBSTATS, SUBSTATS } from './data/substats'

// ---- Storage namespaced theo VAULT (nhiều "kho" tách biệt: main/alt account — C5) ----
/** vaultId đang active — cho component sâu trong cây (vd BuildCostEstimator) đọc mà không luồn
 *  prop qua LoadoutView/RosterPanel. Provider đặt ở App wrapper; default 'main' khớp vault đầu. */
export const VaultIdContext = createContext('main')

const echoesKeyOf = (v: string) => `wuwa-echo-optimizer:v1:${v}`
const overrideKeyOf = (v: string) => `wuwa-echo-optimizer:overrides:v1:${v}`
const equippedKeyOf = (v: string) => `wuwa-echo-optimizer:equipped:v1:${v}`
const pinnedKeyOf = (v: string) => `wuwa-echo-optimizer:pinned:v1:${v}`
/** Income farm/ngày của BuildCostEstimator (per-vault từ 19/07) — định nghĩa Ở ĐÂY để deleteVault
 *  dọn được cùng chỗ với 4 key kia (review đối kháng 19/07: từng orphan vì key nằm ở component). */
export const incomeTunerKeyOf = (v: string) => `wuwa-income-tuner:${v}`
export const incomeExpKeyOf = (v: string) => `wuwa-income-exp:${v}`
// Key CŨ (chưa namespace) — di trú sang vault mặc định lần đầu chạy bản multi-vault.
const OLD_ECHOES_KEY = 'wuwa-echo-optimizer:v1'
const OLD_OVERRIDE_KEY = 'wuwa-echo-optimizer:overrides:v1'
const OLD_EQUIPPED_KEY = 'wuwa-echo-optimizer:equipped:v1'

interface PersistShape {
  version: 1
  echoes: Echo[]
}

// ---- Báo lỗi persist ra UI (review 16/07): setItem fail mà chỉ console.error = mất dữ liệu
// im lặng khi reload (quota đầy / storage bị chặn). App đăng ký listener → toast cảnh báo,
// báo tối đa 1 lần/phiên để không spam theo mỗi thao tác. ----
let persistErrorListener: ((storeKey: string) => void) | null = null
let persistErrorNotified = false
export function onPersistError(fn: ((storeKey: string) => void) | null): void {
  persistErrorListener = fn
}
function reportPersistError(storeKey: string, err: unknown): void {
  console.error(`${storeKey} failed:`, err)
  if (persistErrorNotified) return
  persistErrorNotified = true
  persistErrorListener?.(storeKey)
}

/** Parse JSON localStorage về object thuần; "null"/mảng/scalar hỏng → fallback {} (review 16/07:
 *  loadOverrides/useEquipped thiếu guard non-object → literal "null" làm crash render mỗi reload). */
function loadRecord<T>(key: string): Record<string, T> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, T>
  } catch {
    // rơi xuống {}
  }
  return {}
}

export function loadEchoes(vaultId: string): Echo[] {
  try {
    const raw = localStorage.getItem(echoesKeyOf(vaultId))
    if (!raw) return []
    const data = JSON.parse(raw) as PersistShape
    return Array.isArray(data.echoes) ? data.echoes : []
  } catch {
    return []
  }
}

export function saveEchoes(vaultId: string, echoes: Echo[]) {
  try {
    localStorage.setItem(echoesKeyOf(vaultId), JSON.stringify({ version: 1, echoes } satisfies PersistShape))
  } catch (err) {
    // Quota đầy / storage bị chặn: đừng crash app (chỉ mất persist lần này) — nhưng BÁO user
    reportPersistError('saveEchoes', err)
  }
}

/** Hook kho echo có persist localStorage (theo vault). vaultId CỐ ĐỊNH trong vòng đời mount
 *  (App remount theo key=activeVaultId) nên không có race persist khi đổi vault. */
export function useEchoInventory(vaultId: string) {
  const [echoes, setEchoes] = useState<Echo[]>(() => loadEchoes(vaultId))
  useEffect(() => saveEchoes(vaultId, echoes), [echoes, vaultId])
  return { echoes, setEchoes }
}

// ---- Registry các vault (kho) + vault đang chọn ----
const VAULTS_KEY = 'wuwa-echo-optimizer:vaults:v1'
export interface Vault {
  id: string
  name: string
}
interface VaultsState {
  vaults: Vault[]
  activeId: string
}

/** export cho store.test.ts (review 19/07) — logic recovery/migration là đường sống còn của kho */
export function loadVaults(): VaultsState {
  try {
    const raw = localStorage.getItem(VAULTS_KEY)
    if (raw) {
      const s = JSON.parse(raw) as VaultsState
      if (Array.isArray(s.vaults) && s.vaults.length > 0 && s.vaults.some((v) => v.id === s.activeId)) return s
    }
  } catch {
    // rơi xuống khởi tạo mặc định
  }
  // Registry hỏng/mất nhưng dữ liệu kho namespaced CÒN trong storage → dựng lại danh sách vault
  // từ các key hiện có thay vì bỏ rơi (orphan) dữ liệu của các kho khác (review 16/07).
  const recovered: Vault[] = []
  try {
    const prefix = echoesKeyOf('')
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(prefix)) continue
      const id = k.slice(prefix.length)
      if (id) recovered.push({ id, name: id === 'main' ? 'Kho chính' : `Kho (${id})` })
    }
  } catch {
    // storage chặn → bỏ qua recovery
  }
  if (recovered.length > 0) {
    recovered.sort((a, b) => (a.id === 'main' ? -1 : b.id === 'main' ? 1 : a.id.localeCompare(b.id)))
    const state: VaultsState = { vaults: recovered, activeId: recovered[0].id }
    try {
      localStorage.setItem(VAULTS_KEY, JSON.stringify(state))
    } catch {
      // vẫn chạy in-memory
    }
    return state
  }
  // Lần đầu: tạo vault 'main' + DI TRÚ dữ liệu cũ (chưa namespace) sang nó (không mất kho hiện có).
  const state: VaultsState = { vaults: [{ id: 'main', name: 'Kho chính' }], activeId: 'main' }
  try {
    const moves: [string, string][] = [
      [OLD_ECHOES_KEY, echoesKeyOf('main')],
      [OLD_OVERRIDE_KEY, overrideKeyOf('main')],
      [OLD_EQUIPPED_KEY, equippedKeyOf('main')],
    ]
    for (const [oldK, newK] of moves) {
      const val = localStorage.getItem(oldK)
      if (val !== null && localStorage.getItem(newK) === null) localStorage.setItem(newK, val)
    }
    localStorage.setItem(VAULTS_KEY, JSON.stringify(state))
  } catch {
    // storage chặn → vẫn chạy in-memory
  }
  return state
}

export function useVaults() {
  const [state, setState] = useState<VaultsState>(loadVaults)
  useEffect(() => {
    try {
      localStorage.setItem(VAULTS_KEY, JSON.stringify(state))
    } catch (err) {
      reportPersistError('saveVaults', err)
    }
  }, [state])
  const setActiveId = (id: string) => setState((s) => (s.vaults.some((v) => v.id === id) ? { ...s, activeId: id } : s))
  const addVault = (name: string): string => {
    const id = newId()
    setState((s) => ({ vaults: [...s.vaults, { id, name: name.trim() || `Kho ${s.vaults.length + 1}` }], activeId: id }))
    return id
  }
  const renameVault = (id: string, name: string) =>
    setState((s) => ({ ...s, vaults: s.vaults.map((v) => (v.id === id ? { ...v, name: name.trim() || v.name } : v)) }))
  const deleteVault = (id: string) =>
    setState((s) => {
      if (s.vaults.length <= 1) return s // luôn giữ ≥1 kho
      try {
        localStorage.removeItem(echoesKeyOf(id))
        localStorage.removeItem(overrideKeyOf(id))
        localStorage.removeItem(equippedKeyOf(id))
        localStorage.removeItem(pinnedKeyOf(id))
        localStorage.removeItem(incomeTunerKeyOf(id))
        localStorage.removeItem(incomeExpKeyOf(id))
      } catch {
        // bỏ qua
      }
      const vaults = s.vaults.filter((v) => v.id !== id)
      return { vaults, activeId: s.activeId === id ? vaults[0].id : s.activeId }
    })
  return { vaults: state.vaults, activeId: state.activeId, setActiveId, addVault, renameVault, deleteVault }
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

/** Validate + làm sạch 1 echo từ file import (file có thể hỏng/sửa tay). null = loại bỏ.
 *  Export để importScanner.ts dùng lại (map format scanner → shape Echo rồi sanitize chung). */
export function sanitizeEcho(raw: unknown, seenIds: Set<string>): Echo | null {
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
  /** Build context (vũ khí + base + buff) cho damage model THẬT — dùng ở tab Tối ưu mode Damage. */
  build?: BuildContext
}

function loadOverrides(vaultId: string): Record<string, ProfileOverride> {
  return loadRecord<ProfileOverride>(overrideKeyOf(vaultId))
}

export function useOverrides(vaultId: string) {
  const [overrides, setOverrides] = useState<Record<string, ProfileOverride>>(() => loadOverrides(vaultId))
  useEffect(() => {
    try {
      localStorage.setItem(overrideKeyOf(vaultId), JSON.stringify(overrides))
    } catch (err) {
      reportPersistError('saveOverrides', err)
    }
  }, [overrides, vaultId])
  return { overrides, setOverrides }
}

// ---- Map charId → echo id[] persist theo vault (equipped + pinned cùng shape/vòng đời) ----

/** Factory dùng chung (task 67 — useEquipped/usePinned trước đây là 2 bản chép nguyên xi):
 *  load 1 lần theo vault + tự save mỗi lần đổi, lỗi persist báo qua reportPersistError. */
/** Load map charId → id[] với guard HÌNH DẠNG value (review 19/07): loadRecord chỉ guard object
 *  cấp cao nhất — entry hỏng (value là string thay vì string[], do extension/sync/sửa tay) lọt qua
 *  sẽ crash render ở scoreEquipped `.map` (string có .length nên qua được filter). Chỉ nhận mảng string. */
export function loadIdMap(key: string): Record<string, string[]> {
  const raw = loadRecord<unknown>(key)
  const clean: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) clean[k] = v.filter((x): x is string => typeof x === 'string')
  }
  return clean
}

function usePersistedIdMap(keyOf: (v: string) => string, vaultId: string, saveLabel: string) {
  const [map, setMap] = useState<Record<string, string[]>>(() => loadIdMap(keyOf(vaultId)))
  useEffect(() => {
    try {
      localStorage.setItem(keyOf(vaultId), JSON.stringify(map))
    } catch (err) {
      reportPersistError(saveLabel, err)
    }
  }, [map, vaultId, keyOf, saveLabel])
  return [map, setMap] as const
}

/** Hook map charId → danh sách echo id của bộ hiện tại (persist localStorage theo vault) */
export function useEquipped(vaultId: string) {
  const [equipped, setEquipped] = usePersistedIdMap(equippedKeyOf, vaultId, 'saveEquipped')
  return { equipped, setEquipped }
}

/** Hook map charId → danh sách echo id GHIM/NEO (F14 — luôn có trong bộ solve của nhân vật đó) */
export function usePinned(vaultId: string) {
  const [pinned, setPinned] = usePersistedIdMap(pinnedKeyOf, vaultId, 'savePinned')
  return { pinned, setPinned }
}

/** Cảnh báo đa tab (review 19/07): app giữ state in-memory và mỗi thao tác ghi ĐÈ toàn bộ mảng
 *  xuống localStorage → 2 tab cùng origin thì tab ghi sau thắng, xoá im lặng thay đổi của tab kia.
 *  Chưa làm hoà giải tự động — phát hiện tab KHÁC ghi vào namespace kho (sự kiện `storage` chỉ bắn
 *  cho tab KHÔNG thực hiện ghi) rồi để App hiện banner khuyên tải lại/đóng bớt tab. */
export function useCrossTabWarning(): boolean {
  const [conflict, setConflict] = useState(false)
  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key && ev.key.startsWith('wuwa-echo-optimizer:')) setConflict(true)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return conflict
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
