import type { EchoCost, LocMessage, MainStatKey, SubstatKey } from '../types'
import { TUNE_SLOT_LEVELS } from '../data/echoEconomy'
import { ECHOES, type EchoInfo } from '../data/echoes'
import { FIXED_SECONDARY, MAINSTATS } from '../data/mainstats'
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
  /** Cost đọc từ dòng "COST n" của panel (đáng tin hơn suy từ main stat — ATK%/HP%/DEF% tồn tại ở mọi cost) */
  cost?: EchoCost
  /** Tên echo đọc từ dòng "Tên +25"; nếu khớp data/echoes.ts thì đã được chuẩn hoá theo DB */
  name?: string
  /** Id sonata set — chỉ có khi ảnh/frame chứa mục Sonata Effect (fuzzy match tên set) */
  set?: string
  /** Các set khả dĩ theo tên echo (tra data/echoes.ts) — dùng thu hẹp pool so icon */
  setCandidates?: string[]
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
  // Dấu phẩy + ĐÚNG 3 chữ số = ngăn cách nghìn ("HP 2,280" → 2280 — để bộ lọc dòng stat cố định
  // bắt được); còn lại là dấu thập phân misread của "." ("10,9" → 10.9). Giá trị % trong game
  // chỉ có 1 chữ số thập phân nên không nhầm hai trường hợp.
  const raw = m[1]
  const value = Number(/,\d{3}$/.test(raw) ? raw.replace(',', '') : raw.replace(',', '.'))
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

/**
 * Cost từ dòng "COST n" của panel. Lấy chữ số ĐẦU TIÊN sau "cost" (không phải số cuối dòng —
 * sau digit hay có rác OCR từ icon rarity, vd "COST 3 % 8"). Chỉ nhận giá trị hợp lệ 1/3/4.
 * Không dùng \b sau "cost": OCR có thể dính số vào nhãn ("COST3") làm \b fail.
 */
function extractCost(lines: string[]): EchoCost | undefined {
  for (const line of lines) {
    const m = line.match(/^cost\D*(\d)/i)
    if (!m) continue
    const n = Number(m[1])
    if (n === 1 || n === 3 || n === 4) return n
  }
  return undefined
}

function cleanNameText(s: string): string {
  return s.replace(/[^A-Za-z' -]/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

/**
 * Tên echo từ dòng "Tên +25" của panel chi tiết; lọc ký tự rác OCR (icon, dấu lạ).
 * Tên DÀI bị UI wrap 2 dòng ("Reminiscence: Threnodian -" ⏎ "Leviathan +0") → trả kèm
 * `joined` = dòng TRƯỚC ghép với dòng "+NN" để caller thử khớp DB khi tên 1 dòng không khớp
 * (video 17/07: mọi frame Leviathan mất pool set vì chỉ đọc nửa cuối tên).
 */
function extractName(lines: string[]): { name: string; joined?: string } | undefined {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(.*?)\s*\+\s*\d{1,2}\s*$/)
    if (!m) continue
    const cleaned = cleanNameText(m[1])
    const prev = i > 0 ? cleanNameText(lines[i - 1]) : ''
    const joined = prev.length >= 3 ? `${prev} ${cleaned}`.trim() : undefined
    if (cleaned.length >= 3) return { name: cleaned, joined }
    // Dòng "+NN" không còn chữ nào (tên nằm TRỌN dòng trước): dùng dòng trước làm tên
    if (joined) return { name: joined }
  }
  return undefined
}

/**
 * Tra echo DB (data/echoes.ts) theo tên OCR: exact theo tên chuẩn hoá trước, fallback fuzzy
 * (Levenshtein) chịu lỗi OCR nhỏ. Trả undefined khi không đủ gần — đừng đoán bừa.
 */
const ECHO_NORM: { key: string; info: EchoInfo }[] = ECHOES.map((e) => ({ key: normalizeLabel(e.name), info: e }))

function matchEchoByKey(key: string): EchoInfo | undefined {
  if (key.length < 3) return undefined
  let best: { info: EchoInfo; dist: number } | null = null
  for (const { key: k, info } of ECHO_NORM) {
    const dist = k === key ? 0 : levenshtein(key, k)
    if (!best || dist < best.dist) best = { info, dist }
    if (dist === 0) break
  }
  if (best && best.dist <= matchThreshold(key.length)) return best.info
  return undefined
}

export function matchEchoInfo(name: string): EchoInfo | undefined {
  const key = normalizeLabel(name)
  const hit = matchEchoByKey(key)
  if (hit) return hit
  // "Phantom: <tên>" là SKIN cosmetic — game8/DB chỉ liệt kê echo gốc (cùng stat/set).
  // Prefix làm Levenshtein vượt ngưỡng ("Phantom Impermanence Heron" cách bản gốc 7) → thử
  // lại sau khi bỏ prefix; kết quả trả tên DB gốc (đúng semantics: cùng một echo).
  if (key.startsWith('phantom')) return matchEchoByKey(key.slice('phantom'.length))
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

/**
 * Ngưỡng phân biệt MAIN vs SUB cho stat vừa-là-main-vừa-là-sub (hpPct/atkPct/defPct/critRate/
 * critDmg/energyRegen). Substat KHÔNG scale theo level (mốc roll cố định); main stat scale
 * tuyến tính (+0 = 1/5 max, +25 = max → factor = 0.2 + 0.032·L; kiểm: Crit Rate main +0 = 4.4 = 22/5).
 *
 * Ở +25, level KHÔNG rõ, hoặc key không phải main hợp lệ của cost này → GIỮ NGUYÊN `maxRoll*1.2`
 * (hành vi cũ đã benchmark 19/19 — thay đổi này là no-op cho ảnh/frame maxed +25). Chỉ khi biết
 * level < 25 + cost mới hạ ngưỡng xuống trung điểm giữa maxRoll và main-kỳ-vọng-theo-level, để main
 * stat của echo chưa +25 không bị đọc nhầm thành substat.
 *
 * SÀN `maxRoll*1.05` là bắt buộc: ở level rất thấp `expectedMain` có thể NHỎ HƠN cả maxRoll (main
 * lúc đó còn nhỏ hơn 1 substat maxed), khiến trung điểm tụt dưới maxRoll → một substat maxed bị đọc
 * nhầm thành main rồi MẤT. Clamp lên >maxRoll để substat maxed (kèm ~5% nhiễu OCR) luôn ở lại nhóm sub.
 */
function mainVsSubCutoff(key: SubstatKey, maxRoll: number, level: number | undefined, cost: EchoCost | undefined): number {
  const fallback = maxRoll * 1.2
  if (level === undefined || level >= 25 || cost === undefined) return fallback
  const mainDef = MAINSTATS[cost].find((m) => (m.key as string) === key)
  if (!mainDef) return fallback // key này không phải main stat của cost đó → chỉ có thể là sub
  const factor = 0.2 + 0.032 * level
  const expectedMain = mainDef.max * factor
  return Math.max((maxRoll + expectedMain) / 2, maxRoll * 1.05)
}

/**
 * Khôi phục substat bị OCR NUỐT DẤU THẬP PHÂN ("Crit Rate 6.9%" → "69%", "ATK 9.4%" → "94%" —
 * xác minh trên text thô video 1080p 18/07, nguồn multiMainStat lớn nhất: giá trị phồng ×10
 * vượt ngưỡng main→sub nên sub bị đá thành "main thứ 2" rồi vứt). An toàn tuyệt đối vì 2 miền
 * không giao nhau: main % thật của game ≤ 47.6 ở mọi cost, còn mốc-roll-sub ×10 luôn ≥ 63.
 * Trả value/10 khi >50 và /10 khớp mốc roll (±5%); ngược lại null (xử lý như cũ).
 */
const MAIN_IMPOSSIBLE_ABOVE = 50
function restoreLostDecimal(key: SubstatKey, value: number): number | null {
  if (value <= MAIN_IMPOSSIBLE_ABOVE) return null
  const tenth = value / 10
  const { offPct } = snapToRoll(key, tenth)
  return offPct <= 0.05 ? tenth : null
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

/**
 * Số substat KỲ VỌNG theo level đọc được (mỗi mốc tune đã đạt = 1 substat mới). Mốc mở slot
 * trùng prefix ở MỌI bậc sao (3★ [5,10,15] ⊂ 5★ [5,10,15,20,25]) nên dùng bảng 5★ mà không
 * cần biết rarity — level 15 của 3★ (full) hay 5★ (giữa chừng) đều kỳ vọng đúng 3 sub.
 * Level không đọc được → kỳ vọng đủ 5 (hành vi cũ, an toàn với ảnh thiếu dòng tên).
 */
export function expectedSubsAtLevel(level: number | undefined): number {
  if (level === undefined) return 5
  let n = 0
  for (const l of TUNE_SLOT_LEVELS[5]) if (l <= level) n++
  return n
}

/**
 * Khôi phục DANH TÍNH draft bằng DB sau khi gộp frame (video) — gọi trên draft ĐÃ merge
 * để hưởng field backfill từ mọi frame (set từ icon/text, cost, mảnh tên):
 * - Tên thiếu hẳn nhưng biết CẢ set + cost và pool chỉ còn 1 echo → danh tính chắc chắn.
 * - Tên đọc dở ("Nightm", cụt/lỗi OCR vượt ngưỡng fuzzy toàn cục) → fuzzy + PREFIX match
 *   trong pool đã thu hẹp theo set/cost, chỉ nhận khi thắng RÕ ứng viên nhì (tránh đoán bừa
 *   giữa các echo cùng tiền tố "Nightmare: …").
 * Không sửa gì khi tên đã khớp DB hoặc không đủ bằng chứng.
 */
export function recoverDraft(d: EchoDraft): EchoDraft {
  if (d.name && matchEchoInfo(d.name)) return d
  const pool = ECHOES.filter(
    (e) => (d.set ? e.sets.includes(d.set) : true) && (d.cost !== undefined ? e.cost === d.cost : true),
  )
  if (pool.length === 0) return d
  let hit: EchoInfo | undefined
  if (!d.name) {
    if (d.set && d.cost !== undefined && pool.length === 1) hit = pool[0]
  } else {
    const key = normalizeLabel(d.name)
    if (key.length >= 4) {
      const scored = pool
        .map((e) => {
          const k = normalizeLabel(e.name)
          // Prefix match bắt tên bị CỤT giữa chừng (frame chuyển cảnh): "nightm" vs
          // "nightmareroseshroom".slice(0,6) = 0. Fuzzy đầy đủ bắt lỗi ký tự lẻ.
          const dist = Math.min(levenshtein(key, k), levenshtein(key, k.slice(0, key.length)))
          return { e, dist }
        })
        .sort((a, b) => a.dist - b.dist)
      const best = scored[0]
      const second = scored[1]
      if (best.dist <= matchThreshold(key.length) && (!second || second.dist > best.dist)) hit = best.e
    }
  }
  if (!hit) return d
  return {
    ...d,
    name: hit.name,
    cost: d.cost ?? hit.cost,
    set: d.set ?? (hit.sets.length === 1 ? hit.sets[0] : undefined),
    setCandidates: hit.sets,
  }
}

export function parseEchoText(text: string): EchoDraft {
  const warnings: LocMessage[] = []
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const level = extractLevel(text)
  const ocrCost = extractCost(lines)
  const nameParts = extractName(lines)
  const rawName = nameParts?.name
  // Tra echo DB theo tên: chuẩn hoá tên (sửa lỗi OCR nhỏ, khôi phục ':' bị strip),
  // fallback cost khi thiếu dòng COST, gợi ý set khi echo chỉ thuộc 1 set.
  // Tên 1 dòng không khớp → thử bản ghép 2 dòng (tên dài bị UI wrap).
  const info = rawName
    ? matchEchoInfo(rawName) ?? (nameParts?.joined ? matchEchoInfo(nameParts.joined) : undefined)
    : undefined
  const name = info?.name ?? rawName
  const cost = ocrCost ?? info?.cost
  if (ocrCost !== undefined && info && info.cost !== ocrCost) {
    warnings.push({ key: 'ocrParse.costMismatch', params: { name: info.name, ocr: ocrCost, db: info.cost } })
  }
  const sonataSet = matchSonataSet(lines) ?? (info && info.sets.length === 1 ? info.sets[0] : undefined)
  const setCandidates = info?.sets
  const candidates: Candidate[] = []
  let unmatchedNumericLines = 0

  // Dòng stat CỐ ĐỊNH của panel (cost-1: HP, cost-3/4: ATK — flat, KHÔNG phải roll) scale theo
  // level y hệt main stat: max × (0.2 + 0.032·L). Review 16/07: echo CHƯA max thì giá trị này tụt
  // xuống VÙNG ROLL SUBSTAT (cost-1 HP L0–3, cost-3 ATK L0–16, cost-4 ATK L0–8) → cutoff
  // maxRoll×1.2 không bắt được, dòng cố định bị đọc thành substat thật và đè mất sub thật.
  // Nhận diện bằng GIÁ TRỊ KỲ VỌNG theo level (±8%), tiêu thụ đúng 1 dòng (dòng ĐẦU khớp —
  // panel đặt nó TRÊN danh sách substat nên dòng khớp đầu tiên chính là nó).
  const FIXED_FAMILY: Partial<Record<EchoCost, Family>> = { 1: 'hp', 3: 'atk', 4: 'atk' }
  let fixedConsumed = false
  const isFixedPanelLine = (family: Family, value: number, isPercent: boolean): boolean => {
    if (isPercent || fixedConsumed || cost === undefined) return false
    if (FIXED_FAMILY[cost] !== family) return false
    const factor = level !== undefined ? 0.2 + 0.032 * Math.min(level, 25) : 1
    const expected = FIXED_SECONDARY[cost].max * factor
    if (expected > 0 && Math.abs(value - expected) / expected <= 0.08) {
      fixedConsumed = true
      return true
    }
    return false
  }

  lines.forEach((line, lineIndex) => {
    const extracted = extractTrailingValue(line)
    if (!extracted) return
    // Dòng tên ("Tên +25") và dòng "COST n" là cấu trúc panel đã biết (đã dùng cho level/tên) —
    // không đếm vào cảnh báo "dòng số không khớp nhãn"
    if (/\+\s*\d{1,2}\s*$/.test(line) || /^cost(\b|\d)/i.test(line)) return
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
      // Dòng cố định panel (theo giá trị kỳ vọng level) → bỏ, KHÔNG cho vào pool substat
      if (isFixedPanelLine(family, extracted.value, extracted.isPercent)) return
      const pair = FLAT_OR_PCT_KEY[family]!
      const key = extracted.isPercent ? pair.pct : pair.flat
      const maxRoll = SUBSTATS[key].rolls[SUBSTATS[key].rolls.length - 1]
      if (extracted.value > mainVsSubCutoff(key, maxRoll, level, cost)) {
        // % vượt hẳn mốc roll substat → main stat. FLAT vượt mốc thì KHÔNG phải main
        // (main luôn là %): đó là dòng stat cố định của panel echo (ATK 100/150, HP 2280) → bỏ qua.
        if (extracted.isPercent) {
          const restored = restoreLostDecimal(key, extracted.value)
          if (restored !== null) candidates.push({ kind: 'sub', subKey: key, value: restored, lineIndex })
          else candidates.push({ kind: 'main', mainKey: key as MainStatKey, value: extracted.value, lineIndex })
        }
      } else {
        // Review 19/07: LEVEL không đọc được + dòng FLAT trùng family stat cố định của panel
        // (cost-1 HP, cost-3/4 ATK) → không loại trừ được đây là dòng cố định ở mức CHƯA max
        // (isFixedPanelLine thiếu level chỉ khớp được giá trị MAX). Giá trị nằm trong dải khả dĩ
        // của dòng cố định (max×0.2..max ±8%) → vẫn nhận là sub nhưng CẢNH BÁO để user soát lại
        // — trước đây substat ATK/HP giả được thêm im lặng (snap gần mốc nên không có snapOff).
        if (level === undefined && cost !== undefined && FIXED_FAMILY[cost] === family && !fixedConsumed) {
          const fmax = FIXED_SECONDARY[cost].max
          if (extracted.value >= fmax * 0.2 * 0.92 && extracted.value <= fmax * 1.08) {
            warnings.push({ key: 'ocrParse.maybeFixedLine', params: { label: SUBSTATS[key].label, value: extracted.value } })
          }
        }
        candidates.push({ kind: 'sub', subKey: key, value: extracted.value, lineIndex })
      }
      return
    }
    // critrate / critdmg / energyregen
    const key = PCT_ONLY_AMBIGUOUS_KEY[family]!
    const maxRoll = SUBSTATS[key].rolls[SUBSTATS[key].rolls.length - 1]
    if (extracted.value > mainVsSubCutoff(key, maxRoll, level, cost)) {
      const restored = restoreLostDecimal(key, extracted.value)
      if (restored !== null) candidates.push({ kind: 'sub', subKey: key, value: restored, lineIndex })
      else candidates.push({ kind: 'main', mainKey: key as MainStatKey, value: extracted.value, lineIndex })
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
    return { mainStat: undefined, level, cost, name, set: sonataSet, setCandidates, substats: [], warnings: [{ key: 'ocrParse.noContent' }], confidence: 0 }
  }

  // Điểm phần substat chấm theo KỲ VỌNG của level: echo dưới mốc tune đầu (+0..+4) KHÔNG có
  // substat trong game — đọc ra 0 sub là ĐỦ, không phải thiếu. Đọc ra NHIỀU sub hơn kỳ vọng
  // là mâu thuẫn (level misread hoặc dòng rác lọt lưới) → phần vượt không được cộng điểm.
  const expectedSubs = expectedSubsAtLevel(level)
  let confidence = 0
  if (mainStat) confidence += 0.35
  if (expectedSubs === 0) {
    if (snapped.length === 0) confidence += 0.45
  } else {
    confidence += (Math.min(snapped.length, expectedSubs) / expectedSubs) * 0.45
  }
  if (unmatchedNumericLines === 0) confidence += 0.1
  if (warnings.length === 0) confidence += 0.1
  confidence = Math.max(0, Math.min(1, confidence))

  return { mainStat, level, cost, name, set: sonataSet, setCandidates, substats: snapped, warnings, confidence }
}
