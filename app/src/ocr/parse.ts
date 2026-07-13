import type { LocMessage, MainStatKey, SubstatKey } from '../types'
import { SONATA_SETS } from '../data/sonata'
import { SUBSTATS } from '../data/substats'

// Pure function: text thô OCR (tiếng Anh) -> draft echo. Không phụ thuộc tesseract.js
// nên test được độc lập (xem app/scripts/ocr-test.ts).
//
// Chiến lược:
// 1) Mỗi dòng text -> tách "nhãn" + "giá trị số" (giá trị luôn nằm cuối dòng trong UI game).
// 2) Nhãn được fuzzy-match (Levenshtein tự viết) về 1 "họ" stat (vd 'hp', 'critrate'...).
// 3) hp/atk/def có cả bản flat + %; phân biệt bằng việc giá trị số có dấu % đi kèm hay không
//    (đáng tin hơn là dựa vào ký tự % còn sót lại trong nhãn, vì OCR hay rớt dấu %).
// 4) Với các stat vừa có thể là main vừa có thể là sub (hpPct/atkPct/defPct/critRate/critDmg/
//    energyRegen): nếu giá trị vượt hẳn mốc roll substat tối đa (>1.2x) thì coi là MAIN STAT
//    (main stat luôn có giá trị lớn hơn nhiều so với 1 roll substat — không có vùng chồng lấn).
// 5) Substat được SNAP về mốc roll hợp lệ gần nhất trong SUBSTATS; lệch >5% thì cảnh báo.

export interface EchoDraft {
  mainStat?: MainStatKey
  level?: number
  /** Tên echo đọc từ dòng "Tên +25" (nếu có) */
  name?: string
  /** Id sonata set — chỉ có khi ảnh/frame chứa mục Sonata Effect (fuzzy match tên set) */
  set?: string
  substats: { stat: SubstatKey; value: number }[]
  warnings: LocMessage[]
  /** 0..1 — ước lượng thô mức tin cậy của kết quả nhận diện */
  confidence: number
}

// ---- Levenshtein đơn giản (không thêm dependency) ----
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = new Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

/** Ngưỡng khoảng cách chấp nhận theo độ dài chuỗi mẫu (cho phép vài lỗi OCR nhỏ) */
function matchThreshold(len: number): number {
  if (len <= 4) return 1
  if (len <= 8) return 2
  return 3
}

/** Chuẩn hoá nhãn: chữ thường, chỉ giữ a-z0-9 (bỏ khoảng trắng/dấu câu/%) để so khớp fuzzy */
function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

type Family =
  | 'hp' | 'atk' | 'def'
  | 'critrate' | 'critdmg' | 'energyregen'
  | 'basicatk' | 'heavyatk' | 'skilldmg' | 'liberationdmg'
  | 'healingbonus' | 'glaciodmg' | 'fusiondmg' | 'electrodmg' | 'aerodmg' | 'spectrodmg' | 'havocdmg'

const FAMILY_ALIASES: Record<Family, string[]> = {
  hp: ['hp'],
  atk: ['atk'],
  def: ['def'],
  critrate: ['critrate', 'criticalrate'],
  critdmg: ['critdmg', 'criticaldmg', 'criticaldamage'],
  energyregen: ['energyregen', 'energyregeneration', 'er'],
  basicatk: ['basicattackdmgbonus', 'basicatkdmgbonus', 'basicattackdamagebonus'],
  heavyatk: ['heavyattackdmgbonus', 'heavyatkdmgbonus', 'heavyattackdamagebonus'],
  skilldmg: ['resonanceskilldmgbonus', 'skilldmgbonus', 'resoskilldmgbonus'],
  liberationdmg: ['resonanceliberationdmgbonus', 'liberationdmgbonus', 'resoliberationdmgbonus'],
  healingbonus: ['healingbonus', 'healbonus'],
  glaciodmg: ['glaciodmgbonus', 'glaciodamagebonus'],
  fusiondmg: ['fusiondmgbonus', 'fusiondamagebonus'],
  electrodmg: ['electrodmgbonus', 'electrodamagebonus'],
  aerodmg: ['aerodmgbonus', 'aerodamagebonus'],
  spectrodmg: ['spectrodmgbonus', 'spectrodamagebonus'],
  havocdmg: ['havocdmgbonus', 'havocdamagebonus'],
}

/** Family không bao giờ là main stat (chỉ tồn tại như substat) */
const SUB_ONLY_FAMILIES = new Set<Family>(['basicatk', 'heavyatk', 'skilldmg', 'liberationdmg'])
/** Family chỉ tồn tại như main stat (không có trong bảng substat) */
const MAIN_ONLY_FAMILIES = new Set<Family>([
  'healingbonus', 'glaciodmg', 'fusiondmg', 'electrodmg', 'aerodmg', 'spectrodmg', 'havocdmg',
])
const MAIN_ONLY_KEY: Partial<Record<Family, MainStatKey>> = {
  healingbonus: 'healingBonus',
  glaciodmg: 'glacioDmg',
  fusiondmg: 'fusionDmg',
  electrodmg: 'electroDmg',
  aerodmg: 'aeroDmg',
  spectrodmg: 'spectroDmg',
  havocdmg: 'havocDmg',
}
const SUB_ONLY_KEY: Partial<Record<Family, SubstatKey>> = {
  basicatk: 'basicAtk',
  heavyatk: 'heavyAtk',
  skilldmg: 'skillDmg',
  liberationdmg: 'liberationDmg',
}
/** hp/atk/def: chọn biến thể flat/% theo việc giá trị có "%" hay không */
const FLAT_OR_PCT_KEY: Partial<Record<Family, { flat: SubstatKey; pct: SubstatKey }>> = {
  hp: { flat: 'hp', pct: 'hpPct' },
  atk: { flat: 'atk', pct: 'atkPct' },
  def: { flat: 'def', pct: 'defPct' },
}
/** critRate/critDmg/energyRegen: luôn là %, key sub cố định */
const PCT_ONLY_AMBIGUOUS_KEY: Partial<Record<Family, SubstatKey>> = {
  critrate: 'critRate',
  critdmg: 'critDmg',
  energyregen: 'energyRegen',
}

function findFamily(labelNorm: string): Family | null {
  if (labelNorm.length < 2) return null
  let best: { family: Family; dist: number; aliasLen: number } | null = null
  for (const family of Object.keys(FAMILY_ALIASES) as Family[]) {
    for (const alias of FAMILY_ALIASES[family]) {
      const dist = levenshtein(labelNorm, alias)
      if (!best || dist < best.dist) best = { family, dist, aliasLen: alias.length }
    }
  }
  if (best && best.dist <= matchThreshold(best.aliasLen)) return best.family
  return null
}

/**
 * Icon đầu dòng của UI game hay bị OCR thành chữ dính vào nhãn ("NX ATK", "QQ HP", "(3 Havoc…").
 * Nhãn dài fuzzy chịu được, nhưng nhãn ngắn (ATK/HP/DEF, ngưỡng 1 lỗi) thì fail → thử lại
 * sau khi bỏ dần 1-2 token đầu (giữ tối thiểu 1 token).
 */
function findFamilyNoisy(rawLabel: string): Family | null {
  const tokens = rawLabel.trim().split(/\s+/)
  for (let drop = 0; drop <= Math.min(2, tokens.length - 1); drop++) {
    const norm = normalizeLabel(tokens.slice(drop).join(''))
    if (norm.length < 2) continue
    const family = findFamily(norm)
    if (family) return family
  }
  return null
}

/**
 * Tách "giá trị số" ở cuối dòng. Trong UI game, giá trị LUÔN là con số cuối cùng của dòng,
 * nên mọi ký tự KHÔNG-phải-số theo sau nó được coi là rác OCR (%%, %o, |, ·, *, dấu câu…).
 * Regex cũ chỉ chấp nhận một `%` + `[.,:]` nên dòng có ký tự lạ dính đuôi bị bỏ qua êm.
 * isPercent = có bất kỳ dấu % (kể cả '％' full-width) trong phần đuôi đó.
 */
function extractTrailingValue(line: string): { label: string; value: number; isPercent: boolean } | null {
  const m = line.match(/(-?\d+(?:[.,]\d+)?)([^\d\n]*)$/)
  if (!m || m.index === undefined) return null
  const label = line.slice(0, m.index)
  const value = Number(m[1].replace(',', '.'))
  if (Number.isNaN(value)) return null
  return { label, value, isPercent: /[%％]/.test(m[2]) }
}

function extractLevel(text: string): number | undefined {
  // "+25" cuối dòng tên ("Smolder +25") — format panel chi tiết trong game; các dòng substat
  // ("+ HP 430") có nhãn chen giữa dấu + và số nên không match nhầm.
  const m =
    text.match(/lv\.?\s*\+?\s*(\d{1,2})\s*(?:\/\s*25)?/i) ??
    text.match(/level\s*\+?\s*(\d{1,2})/i) ??
    text.match(/\+\s*(\d{1,2})\s*$/m)
  if (m) {
    const n = Number(m[1])
    if (n >= 0 && n <= 25) return n
  }
  return undefined
}

/** Tên echo từ dòng "Tên +25" của panel chi tiết; lọc ký tự rác OCR (icon, dấu lạ) */
function extractName(lines: string[]): string | undefined {
  for (const line of lines) {
    const m = line.match(/^(.*?)\s*\+\s*\d{1,2}\s*$/)
    if (!m) continue
    const cleaned = m[1].replace(/[^A-Za-z' -]/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (cleaned.length >= 3) return cleaned
  }
  return undefined
}

/** Alias tên set đã chuẩn hoá (tách phần trong ngoặc thành alias riêng, vd "Havoc Eclipse (Sun-sinking Eclipse)") */
const SET_ALIASES: { id: string; alias: string }[] = SONATA_SETS.flatMap((s) =>
  s.name
    .split(/[()]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .map((part) => ({ id: s.id, alias: normalizeLabel(part) })),
)

/**
 * Nhận sonata set khi text chứa mục "Sonata Effect" (ảnh chụp/khung quay đủ rộng):
 * fuzzy match từng dòng với tên set. Không có thì trả undefined — user chọn tay.
 */
function matchSonataSet(lines: string[]): string | undefined {
  let best: { id: string; dist: number; aliasLen: number } | null = null
  for (const line of lines) {
    const norm = normalizeLabel(line)
    if (norm.length < 6) continue
    for (const { id, alias } of SET_ALIASES) {
      const dist = levenshtein(norm, alias)
      if (!best || dist < best.dist) best = { id, dist, aliasLen: alias.length }
    }
  }
  if (best && best.dist <= matchThreshold(best.aliasLen)) return best.id
  return undefined
}

function snapToRoll(stat: SubstatKey, raw: number): { value: number; offPct: number } {
  const rolls = SUBSTATS[stat].rolls
  let best = rolls[0]
  let bestDiff = Math.abs(raw - best)
  for (const r of rolls) {
    const d = Math.abs(raw - r)
    if (d < bestDiff) {
      bestDiff = d
      best = r
    }
  }
  const offPct = best !== 0 ? bestDiff / Math.abs(best) : 0
  return { value: best, offPct }
}

interface Candidate {
  kind: 'main' | 'sub'
  mainKey?: MainStatKey
  subKey?: SubstatKey
  value: number
  lineIndex: number
}

export function parseEchoText(text: string): EchoDraft {
  const warnings: LocMessage[] = []
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const level = extractLevel(text)
  const name = extractName(lines)
  const sonataSet = matchSonataSet(lines)
  const candidates: Candidate[] = []
  let unmatchedNumericLines = 0

  lines.forEach((line, lineIndex) => {
    const extracted = extractTrailingValue(line)
    if (!extracted) return
    // Dòng tên ("Tên +25") và dòng "COST n" là cấu trúc panel đã biết (đã dùng cho level/tên) —
    // không đếm vào cảnh báo "dòng số không khớp nhãn"
    if (/\+\s*\d{1,2}\s*$/.test(line) || /^cost\b/i.test(line)) return
    const family = findFamilyNoisy(extracted.label)
    if (!family) {
      unmatchedNumericLines++
      return
    }

    if (MAIN_ONLY_FAMILIES.has(family)) {
      candidates.push({ kind: 'main', mainKey: MAIN_ONLY_KEY[family], value: extracted.value, lineIndex })
      return
    }
    if (SUB_ONLY_FAMILIES.has(family)) {
      candidates.push({ kind: 'sub', subKey: SUB_ONLY_KEY[family], value: extracted.value, lineIndex })
      return
    }
    // AMBIGUOUS_FAMILIES
    if (family === 'hp' || family === 'atk' || family === 'def') {
      const pair = FLAT_OR_PCT_KEY[family]!
      const key = extracted.isPercent ? pair.pct : pair.flat
      const maxRoll = SUBSTATS[key].rolls[SUBSTATS[key].rolls.length - 1]
      if (extracted.value > maxRoll * 1.2) {
        // % vượt hẳn mốc roll substat → main stat. FLAT vượt mốc thì KHÔNG phải main
        // (main luôn là %): đó là dòng stat cố định của panel echo (ATK 100/150, HP 2280) → bỏ qua.
        if (extracted.isPercent) {
          candidates.push({ kind: 'main', mainKey: key as MainStatKey, value: extracted.value, lineIndex })
        }
      } else {
        candidates.push({ kind: 'sub', subKey: key, value: extracted.value, lineIndex })
      }
      return
    }
    // critrate / critdmg / energyregen
    const key = PCT_ONLY_AMBIGUOUS_KEY[family]!
    const maxRoll = SUBSTATS[key].rolls[SUBSTATS[key].rolls.length - 1]
    if (extracted.value > maxRoll * 1.2) {
      candidates.push({ kind: 'main', mainKey: key as MainStatKey, value: extracted.value, lineIndex })
    } else {
      candidates.push({ kind: 'sub', subKey: key, value: extracted.value, lineIndex })
    }
  })

  if (unmatchedNumericLines > 0) {
    warnings.push({ key: 'ocrParse.unmatched', params: { n: unmatchedNumericLines } })
  }

  // ---- Main stat ----
  const mainCandidates = candidates.filter((c) => c.kind === 'main')
  let mainStat: MainStatKey | undefined
  if (mainCandidates.length === 0) {
    warnings.push({ key: 'ocrParse.noMainStat' })
  } else {
    mainStat = mainCandidates[0].mainKey
    if (mainCandidates.length > 1) {
      warnings.push({ key: 'ocrParse.multiMainStat', params: { n: mainCandidates.length } })
    }
  }

  // ---- Substats ----
  const subCandidates = candidates.filter((c) => c.kind === 'sub')
  const seen = new Set<SubstatKey>()
  const substats: { stat: SubstatKey; value: number }[] = []
  let duplicates = 0
  for (const c of subCandidates) {
    const key = c.subKey!
    if (seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    substats.push({ stat: key, value: c.value })
  }
  if (duplicates > 0) {
    warnings.push({ key: 'ocrParse.dupSubs', params: { n: duplicates } })
  }
  if (substats.length > 5) {
    warnings.push({ key: 'ocrParse.tooManySubs', params: { n: substats.length } })
    substats.length = 5
  }

  // Snap về mốc roll hợp lệ
  const snapped = substats.map(({ stat, value }) => {
    const { value: snappedValue, offPct } = snapToRoll(stat, value)
    if (offPct > 0.05) {
      warnings.push({ key: 'ocrParse.snapOff', params: { label: SUBSTATS[stat].label, value, pct: SUBSTATS[stat].isPct ? '%' : '', off: (offPct * 100).toFixed(1), snapped: snappedValue } })
    }
    return { stat, value: snappedValue }
  })

  if (!mainStat && snapped.length === 0) {
    return { mainStat: undefined, level, name, set: sonataSet, substats: [], warnings: [{ key: 'ocrParse.noContent' }], confidence: 0 }
  }

  let confidence = 0
  if (mainStat) confidence += 0.35
  confidence += (Math.min(snapped.length, 5) / 5) * 0.45
  if (unmatchedNumericLines === 0) confidence += 0.1
  if (warnings.length === 0) confidence += 0.1
  confidence = Math.max(0, Math.min(1, confidence))

  return { mainStat, level, name, set: sonataSet, substats: snapped, warnings, confidence }
}
