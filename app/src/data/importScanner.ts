// Importer JSON từ các SCANNER echo cộng đồng → shape Echo của app (rồi sanitizeEcho snap mốc).
// Hỗ trợ 3 format (tự nhận dạng):
//   1) ParsedEcho[]  — format ĐÍCH của wuwa-ocr / wuwa.build (github.com/DommyMM/wuwa-ocr):
//        [{ echo, set, cost, rank, mainStatLabel, substats:[{subStat, subStatValue}] }]
//        (value là chuỗi, "%" nằm trong value; cost tường minh)
//   2) Kamera echoes.json — WuWa_Inventory_Kamera (scanner FULL-BAG đang ship thật):
//        [{ "<id>": { level, tuneLv, sonata, rarity, stats:{ main:{k:v}, sub:{k:v} } } }]
//        ("%" nằm trong KEY, value số trần; KHÔNG có cost → suy từ flat ATK nội tại 150/100)
//   3) Format của chính app: { version, echoes:[Echo] }  hoặc  [Echo] (mainStat + substats:[{stat,value}])
// Không match được set/cost/main → bỏ mục đó (đếm vào dropped) + cảnh báo. sanitizeEcho lo snap mốc.

import type { Echo, EchoCost, LocMessage, MainStatKey, SubstatKey } from '../types'
import { SONATA_SETS } from './sonata'
import { MAINSTATS } from './mainstats'
import { SUBSTATS } from './substats'
import { sanitizeEcho } from '../store'

// ---- Map tên set (flatcase / PascalCase / hiển thị) → id nội bộ ----
const SET_BY_NORM: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const s of SONATA_SETS) {
    m[norm(s.name)] = s.id
    m[norm(s.id)] = s.id
  }
  return m
})()
function resolveSet(raw?: string): string | undefined {
  if (!raw) return undefined
  return SET_BY_NORM[raw.toLowerCase().replace(/[^a-z0-9]/g, '')]
}

// ---- Map tên stat (nhiều quy ước) → key nội bộ ----
// Các stat CHỈ tồn tại dạng % (crit/er/element/attack-type/healing) → luôn trả biến % dù cờ isPercent.
const ALWAYS_PCT: Record<string, SubstatKey | MainStatKey> = {
  critrate: 'critRate', cr: 'critRate', criticalrate: 'critRate',
  critdmg: 'critDmg', cd: 'critDmg', criticaldamage: 'critDmg', critdamage: 'critDmg',
  energyregen: 'energyRegen', er: 'energyRegen', energyrecharge: 'energyRegen',
  healing: 'healingBonus', healingbonus: 'healingBonus',
  basicattack: 'basicAtk', basicattackdmgbonus: 'basicAtk', basicattackdmg: 'basicAtk', basic: 'basicAtk',
  heavyattack: 'heavyAtk', heavyattackdmgbonus: 'heavyAtk', heavyattackdmg: 'heavyAtk', heavy: 'heavyAtk',
  skilldmg: 'skillDmg', resonanceskilldmgbonus: 'skillDmg', resonanceskilldmg: 'skillDmg', skill: 'skillDmg',
  liberationdmg: 'liberationDmg', resonanceliberationdmgbonus: 'liberationDmg', resonanceliberationdmg: 'liberationDmg', liberation: 'liberationDmg', ultdmg: 'liberationDmg',
  glacio: 'glacioDmg', glaciodmgbonus: 'glacioDmg', glaciodmg: 'glacioDmg',
  fusion: 'fusionDmg', fusiondmgbonus: 'fusionDmg', fusiondmg: 'fusionDmg',
  electro: 'electroDmg', electrodmgbonus: 'electroDmg', electrodmg: 'electroDmg',
  aero: 'aeroDmg', aerodmgbonus: 'aeroDmg', aerodmg: 'aeroDmg',
  spectro: 'spectroDmg', spectrodmgbonus: 'spectroDmg', spectrodmg: 'spectroDmg',
  havoc: 'havocDmg', havocdmgbonus: 'havocDmg', havocdmg: 'havocDmg',
}
/** rawName + cờ % (từ % trong key HOẶC trong value) → key nội bộ. null nếu không nhận ra. */
function resolveStat(rawName: string, isPercent: boolean): SubstatKey | MainStatKey | null {
  const norm = rawName.toLowerCase().replace(/[^a-z]/g, '') // bỏ %, số, dấu, khoảng trắng
  if (norm in ALWAYS_PCT) return ALWAYS_PCT[norm]
  if (norm === 'hp' || norm === 'atk' || norm === 'def') {
    const base = norm as 'hp' | 'atk' | 'def'
    return isPercent ? (`${base}Pct` as SubstatKey) : (base as SubstatKey)
  }
  return null
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v.replace(/[,%\s]/g, ''))
  return NaN
}
const hasPct = (k: string, v: unknown) => k.includes('%') || (typeof v === 'string' && v.includes('%'))

/** Suy cost từ flat ATK nội tại của main (150→4, 100→3, còn lại→1) — dùng cho Kamera (thiếu cost). */
function inferCostFromInnateAtk(atkFlat: number): EchoCost {
  if (atkFlat >= 130) return 4
  if (atkFlat >= 70) return 3
  return 1
}

interface RawEcho {
  name?: string
  cost?: number
  set?: string
  rarity?: number
  level?: number
  mainStat?: string
  substats: { stat: string; value: number }[]
}

export interface ScannerImportResult {
  echoes: Echo[]
  dropped: number
  format: 'parsed-echo' | 'kamera' | 'app' | 'unknown'
  /** LocMessage (review 19/07) — trước đây là chuỗi VI hard-code, người dùng EN không đọc được lỗi import */
  warnings: LocMessage[]
}

// ---- Nhận dạng + parse từng format thành RawEcho[] (key nội bộ) ----

function fromParsedEcho(arr: Record<string, unknown>[], warn: LocMessage[]): RawEcho[] {
  return arr.map((it) => {
    const subs: { stat: string; value: number }[] = []
    const rawSubs = Array.isArray(it.substats) ? (it.substats as Record<string, unknown>[]) : []
    for (const s of rawSubs) {
      const name = String(s.subStat ?? '')
      const stat = resolveStat(name, hasPct(name, s.subStatValue))
      const value = toNumber(s.subStatValue)
      if (stat && Number.isFinite(value)) subs.push({ stat, value })
      else if (name) warn.push({ key: 'scanner.warnSubstat', params: { name } })
    }
    const mainLabel = String(it.mainStatLabel ?? '')
    const mainStat = resolveStat(mainLabel, hasPct(mainLabel, it.mainStatLabel)) ?? undefined
    return {
      name: typeof it.echo === 'string' ? it.echo : undefined,
      cost: typeof it.cost === 'number' ? it.cost : undefined,
      set: resolveSet(typeof it.set === 'string' ? it.set : undefined),
      rarity: typeof it.rank === 'number' ? it.rank : undefined,
      mainStat: mainStat ?? undefined,
      substats: subs,
    }
  })
}

function fromKamera(arr: Record<string, unknown>[], warn: LocMessage[]): RawEcho[] {
  const out: RawEcho[] = []
  for (const wrapper of arr) {
    // mỗi phần tử = object 1-khoá (id echo) → data
    for (const data of Object.values(wrapper)) {
      if (!data || typeof data !== 'object') continue
      const d = data as Record<string, unknown>
      const mainDict = (d.stats as Record<string, unknown>)?.main as Record<string, unknown> | undefined
      const subDict = (d.stats as Record<string, unknown>)?.sub as Record<string, unknown> | undefined
      if (!mainDict || !subDict) continue
      // main: chọn dòng KHÔNG phải flat ATK/HP nội tại làm main; flat atk dùng suy cost
      let innateAtk = 0
      let mainStat: string | undefined
      for (const [k, v] of Object.entries(mainDict)) {
        const isPct = hasPct(k, v)
        const st = resolveStat(k, isPct)
        if (!st) continue
        if (st === 'atk' && !isPct) { innateAtk = toNumber(v); continue } // flat ATK nội tại
        if (st === 'hp' && !isPct && !mainStat) continue // flat HP nội tại (bỏ, trừ khi là main duy nhất)
        mainStat = st
      }
      const subs: { stat: string; value: number }[] = []
      for (const [k, v] of Object.entries(subDict)) {
        const stat = resolveStat(k, hasPct(k, v))
        const value = toNumber(v)
        if (stat && Number.isFinite(value)) subs.push({ stat, value })
        else warn.push({ key: 'scanner.warnSubstatKamera', params: { name: k } })
      }
      out.push({
        cost: inferCostFromInnateAtk(innateAtk),
        set: resolveSet(typeof d.sonata === 'string' ? d.sonata : undefined),
        rarity: typeof d.rarity === 'number' ? d.rarity : undefined,
        level: typeof d.level === 'number' ? d.level : undefined,
        mainStat,
        substats: subs,
      })
    }
  }
  if (out.length) warn.push({ key: 'scanner.warnKameraCost' })
  return out
}

/** RawEcho (key nội bộ) → object shape Echo cho sanitizeEcho (nó lo validate cost/main/set + snap mốc). */
function toEchoShape(r: RawEcho): Record<string, unknown> | null {
  if (!r.set) return null
  // cost hợp lệ + main hợp lệ với cost đó (sanitizeEcho cũng kiểm, nhưng lọc sớm để đếm dropped đúng)
  const cost = r.cost === 1 || r.cost === 3 || r.cost === 4 ? (r.cost as EchoCost) : undefined
  if (!cost || !r.mainStat) return null
  if (!MAINSTATS[cost].some((m) => (m.key as string) === r.mainStat)) return null
  return {
    name: r.name,
    cost,
    set: r.set,
    rarity: r.rarity,
    level: r.level ?? 25,
    mainStat: r.mainStat,
    substats: r.substats.filter((s) => s.stat in SUBSTATS),
  }
}

/** Trần chống file rác/hostile (review 16/07): text 20MB + 5000 mục — file scanner thật < 1MB,
 *  kho thật < 3000 echo; không cap thì một file chế tác đủ lớn treo tab khi parse/score. */
const MAX_TEXT_BYTES = 20 * 1024 * 1024
const MAX_ENTRIES = 5000

export function parseScannerEchoes(text: string): ScannerImportResult {
  const warnings: LocMessage[] = []
  if (text.length > MAX_TEXT_BYTES) {
    return { echoes: [], dropped: 0, format: 'unknown', warnings: [{ key: 'scanner.warnTooLarge' }] }
  }
  const capArr = <T,>(arr: T[]): T[] => {
    if (arr.length <= MAX_ENTRIES) return arr
    warnings.push({ key: 'scanner.warnCapped', params: { n: arr.length, max: MAX_ENTRIES } })
    return arr.slice(0, MAX_ENTRIES)
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { echoes: [], dropped: 0, format: 'unknown', warnings: [{ key: 'scanner.warnBadJson' }] }
  }

  // Format app: { echoes:[...] } hoặc [Echo] có mainStat + substats:[{stat,value}]
  const appArr = Array.isArray(data) ? data : Array.isArray((data as Record<string, unknown>)?.echoes) ? (data as { echoes: unknown[] }).echoes : null
  const first = Array.isArray(appArr) ? (appArr[0] as Record<string, unknown> | undefined) : undefined

  let format: ScannerImportResult['format'] = 'unknown'
  let raws: RawEcho[] = []

  if (Array.isArray(data) && first) {
    if ('mainStatLabel' in first || (Array.isArray(first.substats) && first.substats[0] && 'subStat' in (first.substats[0] as object))) {
      format = 'parsed-echo'
      raws = fromParsedEcho(capArr(data as Record<string, unknown>[]), warnings)
    } else if ('mainStat' in first && Array.isArray(first.substats)) {
      format = 'app' // mảng Echo trần của app
    } else {
      // Kamera: phần tử là object 1-khoá, value có stats.main/sub
      const inner = first ? Object.values(first)[0] : undefined
      if (inner && typeof inner === 'object' && 'stats' in (inner as object)) {
        format = 'kamera'
        raws = fromKamera(capArr(data as Record<string, unknown>[]), warnings)
      }
    }
  } else if (appArr && first && 'mainStat' in first) {
    format = 'app'
  }

  // Format app: sanitize thẳng (đã đúng shape)
  if (format === 'app') {
    const seen = new Set<string>()
    const src = capArr(appArr as unknown[])
    const echoes = src.map((r) => sanitizeEcho(r, seen)).filter((e): e is Echo => e !== null)
    return { echoes, dropped: src.length - echoes.length, format, warnings }
  }

  if (format === 'unknown' || raws.length === 0) {
    return { echoes: [], dropped: 0, format, warnings: warnings.length ? warnings : [{ key: 'scanner.warnUnknownFormat' }] }
  }

  const seen = new Set<string>()
  const echoes: Echo[] = []
  let dropped = 0
  for (const r of raws) {
    const shape = toEchoShape(r)
    const e = shape ? sanitizeEcho(shape, seen) : null
    if (e) echoes.push(e)
    else dropped++
  }
  // Dedup theo key+params (Set không dedup được object — warnings giờ là LocMessage)
  const seenWarn = new Set<string>()
  const uniqueWarnings = warnings.filter((w) => {
    const k = w.key + JSON.stringify(w.params ?? {})
    if (seenWarn.has(k)) return false
    seenWarn.add(k)
    return true
  })
  return { echoes, dropped, format, warnings: uniqueWarnings }
}
