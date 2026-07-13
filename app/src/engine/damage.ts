import type { CharacterProfile, Echo, SubstatKey } from '../types'
import { MAINSTATS } from '../data/mainstats'

// ─────────────────────────────────────────────────────────────────────────────
// Mô hình DAMAGE TƯƠNG ĐỐI (Phase 5, tuỳ chọn) — bổ sung, KHÔNG thay thế weighted
// score (engine/score.ts). Mục tiêu: so sánh damage giữa các LOADOUT của CÙNG một
// nhân vật, bắt đúng 2 phi tuyến mà research/scoring-methods.md §3.2 nhấn mạnh:
//   1) Crit là TÍCH: critMult = 1 + CR×CD  (không phải CR+CD cộng dồn như CV).
//   2) Các bracket %DMG khác nhau NHÂN độc lập nhau (elemental vs attack-type…).
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
  critRate: number
  critDmg: number
  elementalDmg: number
  attackTypeDmg: Record<AttackTypeKey, number>
}

export function emptyTotals(): StatTotals {
  return {
    atkPct: 0, flatAtk: 0, hpPct: 0, flatHp: 0,
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
      case 'critRate': t.critRate += s.value; break
      case 'critDmg': t.critDmg += s.value; break
      case 'basicAtk': case 'heavyAtk': case 'skillDmg': case 'liberationDmg':
        t.attackTypeDmg[s.stat] += s.value; break
      // def/defPct/energyRegen: không đóng góp vào damage của nhân vật atk/hp-scaling
    }
  }
  const mv = mainStatValue(echo)
  const mk = echo.mainStat
  if (mk === 'atkPct') t.atkPct += mv
  else if (mk === 'hpPct') t.hpPct += mv
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
  /** Nhân vật scale damage theo ATK hay HP */
  scaling: 'atk' | 'hp'
  /** Chỉ số nền (ATK hoặc HP) TRƯỚC echo — quyết định tỉ lệ flat-vs-% (giả định, chỉnh được) */
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

/** Số nền dùng chung — tách riêng để dễ chỉnh/định cỡ. */
export const DEFAULT_BASELINE = {
  baseAtk: 1200, // ATK nền giả định (base nhân vật + vũ khí) — cân bằng flat ATK vs ATK%
  baseHp: 12000, // HP nền giả định cho nhân vật hp-scaling
  baseCR: 5.0,
  baseCD: 150.0,
  baseDmgBonus: 0,
}

/** Suy baseline từ archetype/weights của nhân vật (không cần data ngoài). */
export function characterBaseline(profile: CharacterProfile): DamageBaseline {
  const w = profile.weights
  const scaling: 'atk' | 'hp' = (w.hpPct ?? 0) > (w.atkPct ?? 0) ? 'hp' : 'atk'
  // Attack-type mà kit ăn = loại có trọng số cao nhất (0 → không rõ).
  let attackType: AttackTypeKey | null = null
  let bestW = 0
  for (const k of ATTACK_TYPE_KEYS) {
    const wk = w[k as SubstatKey] ?? 0
    if (wk > bestW) { bestW = wk; attackType = k }
  }
  return {
    scaling,
    baseStat: scaling === 'hp' ? DEFAULT_BASELINE.baseHp : DEFAULT_BASELINE.baseAtk,
    baseCR: DEFAULT_BASELINE.baseCR,
    baseCD: DEFAULT_BASELINE.baseCD,
    baseDmgBonus: DEFAULT_BASELINE.baseDmgBonus,
    attackType,
  }
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
  const scalePct = b.scaling === 'hp' ? t.hpPct : t.atkPct
  const flat = b.scaling === 'hp' ? t.flatHp : t.flatAtk
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
 * Breakdown damage của một loadout cho nhân vật, kèm `multiplier` = index / index(build rỗng).
 * Dùng để so sánh damage tương đối giữa các phương án đeo echo.
 */
export function loadoutDamage(echoes: Echo[], profile: CharacterProfile): DamageBreakdown {
  const b = characterBaseline(profile)
  const bd = damageBreakdown(aggregateTotals(echoes), b)
  const bare = damageBreakdown(emptyTotals(), b).index
  return { ...bd, multiplier: bare > 0 ? bd.index / bare : 1 }
}

/** Rút gọn: ×lần damage so với không đeo echo (≥1). */
export function loadoutDamageMultiplier(echoes: Echo[], profile: CharacterProfile): number {
  return loadoutDamage(echoes, profile).multiplier
}
