import type { BuildContext, CharacterProfile, Echo, StatBuff, SubstatKey, WeightKey } from '../types'
import { MAINSTATS } from '../data/mainstats'
import { WEAPON_BY_ID, weaponSecondaryValue } from '../data/weapons'
import { CHARACTER_BASE_BY_ID, SET_BUFFS } from '../data/characterBase'

// ─────────────────────────────────────────────────────────────────────────────
// Mô hình DAMAGE TƯƠNG ĐỐI (Phase 5, tuỳ chọn) — bổ sung, KHÔNG thay thế weighted
// score (engine/score.ts). Mục tiêu: so sánh damage giữa các LOADOUT của CÙNG một
// nhân vật, bắt đúng 2 phi tuyến mà research/scoring-methods.md §3.2 nhấn mạnh:
//   1) Crit là TÍCH: critMult = 1 + CR×CD  (không phải CR+CD cộng dồn như CV).
//   2) Bracket %DMG (elemental + attack-type CỘNG DỒN chung 1 bracket theo công thức
//      WuWa — Amplify/Deepen mới là bracket nhân riêng) NHÂN với statFactor và crit.
//
// KHÔNG tính damage tuyệt đối: công thức đầy đủ §3.1 cần base ATK/HP nhân vật +
// vũ khí + Motion Value skill + DEF/RES quái — repo KHÔNG có các số này (và với
// nhân vật mới thì nằm ngoài dữ liệu đã verify). Thay vào đó dùng baseline thuần
// theo công thức game gốc (CR 5% / CD 150%) + một `baseStat` giả định để cân
// bằng flat-vs-% ; mọi số baseline nằm trong DEFAULT_BASELINE và chỉnh được.
//
// Vì Amplify / DEF / RES / MV không phụ thuộc echo, chúng triệt tiêu khi so sánh
// hai loadout của cùng nhân vật nên được bỏ khỏi mô hình.
// ─────────────────────────────────────────────────────────────────────────────

type AttackTypeKey = 'basicAtk' | 'heavyAtk' | 'skillDmg' | 'liberationDmg'
const ATTACK_TYPE_KEYS: AttackTypeKey[] = ['basicAtk', 'heavyAtk', 'skillDmg', 'liberationDmg']

export interface StatTotals {
  atkPct: number
  flatAtk: number
  hpPct: number
  flatHp: number
  defPct: number
  flatDef: number
  critRate: number
  critDmg: number
  elementalDmg: number
  attackTypeDmg: Record<AttackTypeKey, number>
}

export function emptyTotals(): StatTotals {
  return {
    atkPct: 0, flatAtk: 0, hpPct: 0, flatHp: 0, defPct: 0, flatDef: 0,
    critRate: 0, critDmg: 0, elementalDmg: 0,
    attackTypeDmg: { basicAtk: 0, heavyAtk: 0, skillDmg: 0, liberationDmg: 0 },
  }
}

const ELEMENTAL_MAIN = new Set(['glacioDmg', 'fusionDmg', 'electroDmg', 'aeroDmg', 'spectroDmg', 'havocDmg'])

/** Giá trị main stat (giả định +25 — echo không lưu số main, xem HANDOVER §5). 0 nếu không có. */
function mainStatValue(echo: Echo): number {
  return MAINSTATS[echo.cost].find((d) => d.key === echo.mainStat)?.max ?? 0
}

/** Cộng đóng góp stat (substats + main stat) của 1 echo vào tổng. */
function addEcho(t: StatTotals, echo: Echo): void {
  for (const s of echo.substats) {
    switch (s.stat) {
      case 'atkPct': t.atkPct += s.value; break
      case 'atk': t.flatAtk += s.value; break
      case 'hpPct': t.hpPct += s.value; break
      case 'hp': t.flatHp += s.value; break
      case 'defPct': t.defPct += s.value; break
      case 'def': t.flatDef += s.value; break
      case 'critRate': t.critRate += s.value; break
      case 'critDmg': t.critDmg += s.value; break
      case 'basicAtk': case 'heavyAtk': case 'skillDmg': case 'liberationDmg':
        t.attackTypeDmg[s.stat] += s.value; break
      // energyRegen: không đóng góp trực tiếp vào statFactor damage
    }
  }
  const mv = mainStatValue(echo)
  const mk = echo.mainStat
  if (mk === 'atkPct') t.atkPct += mv
  else if (mk === 'hpPct') t.hpPct += mv
  else if (mk === 'defPct') t.defPct += mv
  else if (mk === 'critRate') t.critRate += mv
  else if (mk === 'critDmg') t.critDmg += mv
  else if (ELEMENTAL_MAIN.has(mk)) t.elementalDmg += mv
}

export function aggregateTotals(echoes: Echo[]): StatTotals {
  const t = emptyTotals()
  for (const e of echoes) addEcho(t, e)
  return t
}

export interface DamageBaseline {
  /** Nhân vật scale damage/heal theo ATK, HP hay DEF (def: buffer/healer scale-DEF như Mornye) */
  scaling: 'atk' | 'hp' | 'def'
  /** Chỉ số nền (ATK/HP/DEF) TRƯỚC echo — quyết định tỉ lệ flat-vs-% (giả định, chỉnh được) */
  baseStat: number
  /** Crit Rate% nền (game gốc 5.0) */
  baseCR: number
  /** Crit DMG% nền (game gốc 150.0) */
  baseCD: number
  /** %DMG bonus nền ngoài echo (mặc định 0) */
  baseDmgBonus: number
  /** Loại attack-type DMG% mà kit nhân vật này ăn (null nếu không rõ) */
  attackType: AttackTypeKey | null
}

/** Số nền dùng chung — tách riêng để dễ chỉnh/định cỡ.
 *  Định cỡ theo web-research 14/07/2026: base ATK L90 của 5★ DPS ~413–463 (Prydwen/Game8),
 *  cộng vũ khí 5★ (~550 base ATK) → ~1000 là mức "ATK trước echo" điển hình mà ATK% nhân lên.
 *  base HP scaler ~10.8k–15k; base DEF của scale-DEF (Mornye) ~1356. */
export const DEFAULT_BASELINE = {
  baseAtk: 1000, // ATK nền (base nhân vật ~450 + vũ khí ~550) — cân bằng flat ATK vs ATK%
  baseHp: 12000, // HP nền cho nhân vật hp-scaling
  baseDef: 1400, // DEF nền cho nhân vật def-scaling (healer/buffer như Mornye)
  baseCR: 5.0,
  baseCD: 150.0,
  baseDmgBonus: 0,
}

/** scaling = stat có trọng số cao nhất trong {atkPct, hpPct, defPct} (mặc định atk). */
function deriveScaling(profile: CharacterProfile): 'atk' | 'hp' | 'def' {
  const w = profile.weights
  const atkW = w.atkPct ?? 0
  const hpW = w.hpPct ?? 0
  const defW = w.defPct ?? 0
  if (hpW > atkW && hpW >= defW) return 'hp'
  if (defW > atkW && defW >= hpW) return 'def'
  return 'atk'
}

/** Attack-type mà kit ăn = loại có trọng số cao nhất (null → không rõ). */
function deriveAttackType(profile: CharacterProfile): AttackTypeKey | null {
  const w = profile.weights
  let attackType: AttackTypeKey | null = null
  let bestW = 0
  for (const k of ATTACK_TYPE_KEYS) {
    const wk = w[k as SubstatKey] ?? 0
    if (wk > bestW) { bestW = wk; attackType = k }
  }
  return attackType
}

/** Suy baseline từ archetype/weights của nhân vật (không cần data ngoài — giả định cũ). */
export function characterBaseline(profile: CharacterProfile): DamageBaseline {
  const scaling = deriveScaling(profile)
  const baseStat =
    scaling === 'hp' ? DEFAULT_BASELINE.baseHp : scaling === 'def' ? DEFAULT_BASELINE.baseDef : DEFAULT_BASELINE.baseAtk
  return {
    scaling,
    baseStat,
    baseCR: DEFAULT_BASELINE.baseCR,
    baseCD: DEFAULT_BASELINE.baseCD,
    baseDmgBonus: DEFAULT_BASELINE.baseDmgBonus,
    attackType: deriveAttackType(profile),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD CONTEXT: dựng baseline THẬT từ vũ khí + base nhân vật + Forte nội tại + buff.
// Mọi % cộng dồn trong từng loại; base CR=5, CD=150 khoá cứng. Degrade theo từng field:
// thiếu vũ khí/base → statFactor rơi về giả định; crit/DMG% vẫn đúng nếu có forte/buff.
// ─────────────────────────────────────────────────────────────────────────────

/** Cộng 1 stat theo WeightKey vào StatTotals (energyRegen/healingBonus không vào statFactor damage). */
function applyWeightStat(t: StatTotals, key: WeightKey, v: number): void {
  switch (key) {
    case 'atkPct': t.atkPct += v; break
    case 'atk': t.flatAtk += v; break
    case 'hpPct': t.hpPct += v; break
    case 'hp': t.flatHp += v; break
    case 'defPct': t.defPct += v; break
    case 'def': t.flatDef += v; break
    case 'critRate': t.critRate += v; break
    case 'critDmg': t.critDmg += v; break
    case 'basicAtk': case 'heavyAtk': case 'skillDmg': case 'liberationDmg': t.attackTypeDmg[key] += v; break
    case 'elementDmg': t.elementalDmg += v; break
    // energyRegen, healingBonus: bỏ qua với statFactor damage
  }
}

function addTotals(a: StatTotals, b: StatTotals): StatTotals {
  return {
    atkPct: a.atkPct + b.atkPct, flatAtk: a.flatAtk + b.flatAtk,
    hpPct: a.hpPct + b.hpPct, flatHp: a.flatHp + b.flatHp,
    defPct: a.defPct + b.defPct, flatDef: a.flatDef + b.flatDef,
    critRate: a.critRate + b.critRate, critDmg: a.critDmg + b.critDmg,
    elementalDmg: a.elementalDmg + b.elementalDmg,
    attackTypeDmg: {
      basicAtk: a.attackTypeDmg.basicAtk + b.attackTypeDmg.basicAtk,
      heavyAtk: a.attackTypeDmg.heavyAtk + b.attackTypeDmg.heavyAtk,
      skillDmg: a.attackTypeDmg.skillDmg + b.attackTypeDmg.skillDmg,
      liberationDmg: a.attackTypeDmg.liberationDmg + b.attackTypeDmg.liberationDmg,
    },
  }
}

type WeightMap = Partial<Record<WeightKey, number>>
function addW(m: WeightMap, key: WeightKey, v: number): void { m[key] = (m[key] ?? 0) + v }
function mergeW(m: WeightMap, src?: WeightMap): void { if (src) for (const k in src) addW(m, k as WeightKey, src[k as WeightKey]!) }
function mapToTotals(m: WeightMap): StatTotals {
  const t = emptyTotals()
  for (const k in m) applyWeightStat(t, k as WeightKey, m[k as WeightKey]!)
  return t
}

/** Đóng góp stat từ echo (substat + main) dưới dạng WeightMap (gồm energyRegen, elementDmg). */
export function echoWeightMap(echoes: Echo[]): WeightMap {
  const m: WeightMap = {}
  for (const e of echoes) {
    for (const s of e.substats) addW(m, s.stat, s.value)
    const mv = mainStatValue(e)
    const mk = e.mainStat
    if (mk === 'atkPct' || mk === 'hpPct' || mk === 'defPct' || mk === 'critRate' || mk === 'critDmg' || mk === 'energyRegen') addW(m, mk, mv)
    else if (mk === 'healingBonus') addW(m, 'healingBonus', mv)
    else if (ELEMENTAL_MAIN.has(mk)) addW(m, 'elementDmg', mv)
  }
  return m
}

export interface ResolvedContext {
  /** Có nguồn non-echo thật (vũ khí / base tay / forte / buff) — UI biết đang dùng chỉ số thật */
  hasContext: boolean
  scaling: 'atk' | 'hp' | 'def'
  attackType: AttackTypeKey | null
  /** base ATK/HP/DEF của scaling stat = char (+ vũ khí ATK nếu scaling atk). Giả định nếu thiếu. */
  baseStat: number
  charBaseStat: number
  weaponBaseAtk: number
  /** Tổng non-echo (vũ khí secondary+passive + forte + buff active) — cộng vào echo cho damage */
  nonEcho: StatTotals
  /** Tách theo nguồn (cho bảng breakdown) — WeightMap gồm cả energyRegen */
  weaponMap: WeightMap
  forteMap: WeightMap
  buffMap: WeightMap
  /** Buff khả dụng + trạng thái (UI toggle) */
  buffs: { buff: StatBuff; on: boolean }[]
}

/** Gộp mọi nguồn non-echo cho 1 nhân vật theo context. `activeSet` = set đang chạy (nạp buff set). */
export function resolveContext(profile: CharacterProfile, ctx?: BuildContext, activeSet?: string): ResolvedContext {
  const scaling = deriveScaling(profile)
  const attackType = deriveAttackType(profile)
  const cb = CHARACTER_BASE_BY_ID[profile.id]
  const weapon = ctx?.weaponId ? WEAPON_BY_ID[ctx.weaponId] : undefined
  const manual = ctx?.manualBase

  // Base stat của scaling: ưu tiên nhập tay → DB → giả định.
  const charBaseStat =
    scaling === 'hp' ? (manual?.hp ?? cb?.baseHp ?? DEFAULT_BASELINE.baseHp)
    : scaling === 'def' ? (manual?.def ?? cb?.baseDef ?? DEFAULT_BASELINE.baseDef)
    : (manual?.atk ?? cb?.baseAtk ?? DEFAULT_BASELINE.baseAtk)
  const weaponBaseAtk = weapon?.baseAtk ?? 0
  // != null thay vì truthy: base nhập tay = 0 vẫn là base thật, không bị vứt (review 16/07)
  const hasManual = manual != null && (manual.atk != null || manual.hp != null || manual.def != null)
  const hasRealBase = !!(weapon || hasManual || cb)
  // Nếu KHÔNG có base thật (không DB/không vũ khí/không nhập tay) → giữ giả định cũ để statFactor không tụt.
  const baseStat = hasRealBase
    ? charBaseStat + (scaling === 'atk' ? weaponBaseAtk : 0)
    : (scaling === 'hp' ? DEFAULT_BASELINE.baseHp : scaling === 'def' ? DEFAULT_BASELINE.baseDef : DEFAULT_BASELINE.baseAtk)

  // Nguồn tách riêng (cho breakdown).
  const weaponMap: WeightMap = {}
  if (weapon) { addW(weaponMap, weapon.secondary, weaponSecondaryValue(weapon)); mergeW(weaponMap, weapon.passiveFlat) }
  const forteMap: WeightMap = { ...(cb?.forte ?? {}) }

  // Buff khả dụng = buff vũ khí + buff set đang chạy. Trạng thái: override hoặc defaultOn.
  const availBuffs: StatBuff[] = [...(weapon?.buffs ?? []), ...(activeSet ? SET_BUFFS[activeSet] ?? [] : [])]
  const buffs = availBuffs.map((buff) => ({ buff, on: ctx?.buffStates?.[buff.id] ?? buff.defaultOn }))
  const buffMap: WeightMap = {}
  for (const { buff, on } of buffs) if (on) mergeW(buffMap, buff.stats)

  const nonEcho = addTotals(addTotals(mapToTotals(weaponMap), mapToTotals(forteMap)), mapToTotals(buffMap))
  const hasContext = !!(weapon || manual || cb || buffs.some((b) => b.on))
  return { hasContext, scaling, attackType, baseStat, charBaseStat, weaponBaseAtk, nonEcho, weaponMap, forteMap, buffMap, buffs }
}

/** ER% NGOÀI echo (secondary/passive vũ khí + forte + buff đang bật) — cho ngân sách ER thật
 *  của solver (task 55): erTarget trừ 100 gốc + phần này rồi mới đến lượt echo gánh.
 *  Không truyền activeSet (chưa biết set trước khi solve) — SET_BUFFS hiện không có ER nên không lệch. */
export function nonEchoER(profile: CharacterProfile, ctx?: BuildContext, activeSet?: string): number {
  const r = resolveContext(profile, ctx, activeSet)
  return (r.weaponMap.energyRegen ?? 0) + (r.forteMap.energyRegen ?? 0) + (r.buffMap.energyRegen ?? 0)
}

export interface DamageBreakdown {
  /** Chỉ số damage thô = statFactor × critMult × dmgBonus */
  index: number
  /** ×lần so với "không đeo echo" (build rỗng) — con số dễ đọc để so sánh loadout */
  multiplier: number
  statFactor: number
  critMult: number
  dmgBonus: number
  /** CR/CD tổng (đã gồm nền, CR đã cap 100) — cho UI hiển thị */
  critRateTotal: number
  critDmgTotal: number
}

/** Chỉ số damage thô của một tập stat tổng hợp theo baseline. */
export function damageIndex(t: StatTotals, b: DamageBaseline): number {
  return damageBreakdown(t, b).index
}

export function damageBreakdown(t: StatTotals, b: DamageBaseline): DamageBreakdown {
  const scalePct = b.scaling === 'hp' ? t.hpPct : b.scaling === 'def' ? t.defPct : t.atkPct
  const flat = b.scaling === 'hp' ? t.flatHp : b.scaling === 'def' ? t.flatDef : t.flatAtk
  const statFactor = b.baseStat * (1 + scalePct / 100) + flat

  const crTotal = Math.min(100, b.baseCR + t.critRate)
  const cdTotal = b.baseCD + t.critDmg
  const critMult = 1 + (crTotal / 100) * (cdTotal / 100)

  const typeDmg = b.attackType ? t.attackTypeDmg[b.attackType] : 0
  const dmgBonus = 1 + (b.baseDmgBonus + t.elementalDmg + typeDmg) / 100

  return {
    index: statFactor * critMult * dmgBonus,
    multiplier: 0, // gán ở lớp trên khi biết index nền
    statFactor,
    critMult,
    dmgBonus,
    critRateTotal: crTotal,
    critDmgTotal: cdTotal,
  }
}

/**
 * Breakdown damage của một loadout cho nhân vật, kèm `multiplier` = index / index(chỉ base+context,
 * không echo). Dùng so sánh damage tương đối. `ctx`/`activeSet` bật baseline THẬT (vũ khí+base+forte+buff);
 * bỏ trống = giả định cũ (tương thích ngược).
 */
export function loadoutDamage(echoes: Echo[], profile: CharacterProfile, ctx?: BuildContext, activeSet?: string): DamageBreakdown {
  const r = resolveContext(profile, ctx, activeSet)
  const b: DamageBaseline = {
    scaling: r.scaling, baseStat: r.baseStat,
    baseCR: DEFAULT_BASELINE.baseCR, baseCD: DEFAULT_BASELINE.baseCD, baseDmgBonus: 0,
    attackType: r.attackType,
  }
  const bd = damageBreakdown(addTotals(aggregateTotals(echoes), r.nonEcho), b)
  // "Không echo" vẫn giữ context (vũ khí/forte/buff) → multiplier = phần echo đóng góp thêm.
  const bare = damageBreakdown(r.nonEcho, b).index
  return { ...bd, multiplier: bare > 0 ? bd.index / bare : 1 }
}

/** Rút gọn: ×lần damage so với không đeo echo (≥1). */
export function loadoutDamageMultiplier(echoes: Echo[], profile: CharacterProfile, ctx?: BuildContext, activeSet?: string): number {
  return loadoutDamage(echoes, profile, ctx, activeSet).multiplier
}

// ─────────────────────────────────────────────────────────────────────────────
// Bảng chỉ số CUỐI: tách nguồn base + vũ khí + forte + echo + buff = tổng (cho UI).
// ─────────────────────────────────────────────────────────────────────────────

export interface StatBreakdownRow {
  stat: WeightKey
  /** Hằng số game (critRate 5, critDmg 150; các stat khác 0) */
  base: number
  weapon: number
  forte: number
  echo: number
  buff: number
  total: number
  /** true nếu stat cap 100 (critRate) và total đã bị cắt */
  capped?: boolean
}

/** Thứ tự hiển thị + stat luôn hiện (có base). */
const BREAKDOWN_ORDER: WeightKey[] = [
  'critRate', 'critDmg', 'atkPct', 'hpPct', 'defPct', 'elementDmg',
  'basicAtk', 'heavyAtk', 'skillDmg', 'liberationDmg', 'energyRegen', 'atk', 'hp', 'def',
]
const ALWAYS_SHOW = new Set<WeightKey>(['critRate', 'critDmg'])
const BASE_CONST: Partial<Record<WeightKey, number>> = { critRate: DEFAULT_BASELINE.baseCR, critDmg: DEFAULT_BASELINE.baseCD, energyRegen: 100 }

/**
 * Bảng cộng dồn từng stat theo nguồn cho 1 loadout. Chỉ hiện stat có đóng góp (hoặc luôn hiện CR/CD).
 * Ví dụ CR: base 5 + weapon 24.3 + forte 8 + echo 34.8 + buff 20 = 92.1.
 */
export function finalStatBreakdown(echoes: Echo[], profile: CharacterProfile, ctx?: BuildContext, activeSet?: string): StatBreakdownRow[] {
  const r = resolveContext(profile, ctx, activeSet)
  const echoMap = echoWeightMap(echoes)
  const rows: StatBreakdownRow[] = []
  for (const stat of BREAKDOWN_ORDER) {
    const base = BASE_CONST[stat] ?? 0
    const weapon = r.weaponMap[stat] ?? 0
    const forte = r.forteMap[stat] ?? 0
    const echo = echoMap[stat] ?? 0
    const buff = r.buffMap[stat] ?? 0
    const rawTotal = base + weapon + forte + echo + buff
    if (rawTotal === 0 && !ALWAYS_SHOW.has(stat)) continue
    const capped = stat === 'critRate' && rawTotal > 100
    rows.push({ stat, base, weapon, forte, echo, buff, total: capped ? 100 : rawTotal, capped })
  }
  return rows
}
