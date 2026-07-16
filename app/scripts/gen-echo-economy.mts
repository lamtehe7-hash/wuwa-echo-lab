// Sinh bảng KINH TẾ echo (EXP/Tuner/Shell Credit — task 69/F5) cho data/echoEconomy.ts từ datamine
// Arikatsu/WutheringWaves_Data. Chạy TỪ app/:  npx -y tsx scripts/gen-echo-economy.mts [--branch 3.5]
//
// NGUỒN (recipe đầy đủ: research/echo-economy.md + HANDOVER §5):
//   phantom/phantomlevel.json          — EXP TĂNG THÊM để đạt level L (theo GroupId; group ↔ rarity
//                                        join qua LevelLimit của phantomquality — KHÔNG hardcode)
//   phantom/phantomquality.json        — LevelLimit (max +10/15/20/25), SlotUnlockLevel (mốc tune),
//                                        IdentifyCost (10 tuner ĐÚNG BẬC/slot), IdentifyCoin (credit/tune)
//   phantom/phantomexpitem.json        — 4 ống EXP (500/1000/2000/5000); bậc = thứ tự EXP tăng dần
//   phantom/phantomvicepolishconfig.json — Transducer reroll theo slot (1/1/1/2/3) [F7 — cơ chế chưa verify]
//   common_param/commonparam.json      — PhantomLevelUpCoinCost (‰ credit/EXP), PhantomExpReturnRatio (‰),
//                                        PhantomIdentifyReturnRatio (‰), PhantomTotalCost (cap 12 — sanity)
//
// Validate khoá cứng thêm ở src/data/echoEconomy.test.ts (tổng 142.600 / tỉ lệ 0.8·0.4·0.25 / feed +25 → +22).

import { writeFileSync } from 'node:fs'

const BRANCH = process.argv.includes('--branch') ? process.argv[process.argv.indexOf('--branch') + 1] : '3.5'
const RAW = (p: string) => `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/${BRANCH}/BinData/${p}`

async function fetchJson(path: string): Promise<any> {
  const r = await fetch(RAW(path))
  if (!r.ok) throw new Error(`fetch ${path}: HTTP ${r.status}`)
  return r.json()
}

/** BinData số của commonparam = LE uint32 (4 byte) hoặc int64 (8 byte) tuỳ key */
function decodeInt64(b64: string): number {
  const buf = Buffer.from(b64, 'base64')
  if (buf.length >= 8) return Number(buf.readBigUInt64LE(0))
  if (buf.length >= 4) return buf.readUInt32LE(0)
  throw new Error(`BinData số quá ngắn: ${b64}`)
}

const [levels, qualities, expItems, vicePolish, commonParam] = await Promise.all([
  fetchJson('phantom/phantomlevel.json'),
  fetchJson('phantom/phantomquality.json'),
  fetchJson('phantom/phantomexpitem.json'),
  fetchJson('phantom/phantomvicepolishconfig.json'),
  fetchJson('common_param/commonparam.json'),
])

// ── commonparam: hằng số toàn cục (‰) ──
const param = (key: string): number => {
  const row = commonParam.find((r: any) => r.KeyName === key)
  if (!row) throw new Error(`commonparam thiếu ${key}`)
  return decodeInt64(row.BinData)
}
const creditPerExp = param('PhantomLevelUpCoinCost') / 1000 // 100‰ → 0.1 credit/EXP
const expReturn = param('PhantomExpReturnRatio') / 1000 // 750‰ → 75%
const tunerReturn = param('PhantomIdentifyReturnRatio') / 1000 // 300‰ → 30%
const totalCost = decodeInt64(commonParam.find((r: any) => r.KeyName === 'PhantomTotalCost').BinData)
if (totalCost !== 12) throw new Error(`PhantomTotalCost=${totalCost} ≠ 12 — cost cap game đổi? Đối chiếu engine COST_CAP`)
if (creditPerExp <= 0 || creditPerExp > 10) throw new Error(`creditPerExp=${creditPerExp} ngoài khoảng hợp lý`)
if (expReturn <= 0 || expReturn > 1 || tunerReturn <= 0 || tunerReturn > 1) throw new Error(`return ratio ngoài (0,1]: exp=${expReturn} tuner=${tunerReturn}`)

// ── phantomquality: LevelLimit / SlotUnlockLevel / IdentifyCost / IdentifyCoin theo Quality 2..5 ──
interface QRow { Quality: number; LevelLimit: number; SlotUnlockLevel: number[]; IdentifyCost: { Key: number; Value: number }[]; IdentifyCoin: number }
const qRows: QRow[] = [...qualities].sort((a: QRow, b: QRow) => a.Quality - b.Quality)
if (qRows.length !== 4 || qRows.map((q) => q.Quality).join() !== '2,3,4,5') throw new Error(`phantomquality lạ: ${qRows.map((q) => q.Quality)}`)
const tunerCounts = new Set(qRows.map((q) => q.IdentifyCost[0]?.Value))
if (tunerCounts.size !== 1) throw new Error(`IdentifyCost không đồng nhất giữa các bậc: ${[...tunerCounts]}`)
const tunersPerSlot = [...tunerCounts][0]
if (!tunersPerSlot || tunersPerSlot <= 0) throw new Error('tunersPerSlot rỗng')
for (const q of qRows) {
  // Assertion THẬT (task 76 — thay dead sanity cũ): mỗi mốc tune = 1 substat MỚI ⇒ số mốc phải
  // bằng MAX_SUBSTATS của bậc trong engine (2★ không tune; 3★/4★/5★ = 3/4/5 — data/substats.ts).
  // Kuro đổi số mốc ở bản vá ⇒ THROW tại đây trước khi emit data lệch với engine.
  const expectSlots = q.Quality === 2 ? 0 : q.Quality
  if (q.SlotUnlockLevel.length !== expectSlots) throw new Error(`SlotUnlockLevel bậc ${q.Quality}: ${q.SlotUnlockLevel.length} mốc ≠ ${expectSlots} (MAX_SUBSTATS engine)`)
  if (q.SlotUnlockLevel.some((l, i) => l !== (i + 1) * 5)) throw new Error(`SlotUnlockLevel bậc ${q.Quality} không phải bội 5: ${q.SlotUnlockLevel}`)
  if (expectSlots && q.SlotUnlockLevel[expectSlots - 1] !== q.LevelLimit) throw new Error(`slot cuối ≠ LevelLimit ở bậc ${q.Quality}`)
}

// ── phantomlevel: nhóm level ↔ rarity join qua LevelLimit (KHÔNG hardcode GroupId) ──
interface LRow { GroupId: number; Level: number; Exp: number }
const byGroup = new Map<number, LRow[]>()
for (const r of levels as LRow[]) {
  if (!byGroup.has(r.GroupId)) byGroup.set(r.GroupId, [])
  byGroup.get(r.GroupId)!.push(r)
}
const cumulative: Record<number, number[]> = {}
for (const q of qRows) {
  const grp = [...byGroup.entries()].filter(([, rows]) => Math.max(...rows.map((r) => r.Level)) === q.LevelLimit)
  if (grp.length !== 1) throw new Error(`không join được nhóm level cho bậc ${q.Quality} (LevelLimit ${q.LevelLimit}): ${grp.length} ứng viên`)
  const rows = grp[0][1].sort((a, b) => a.Level - b.Level)
  if (rows[0].Level !== 0 || rows[0].Exp !== 0) throw new Error(`nhóm bậc ${q.Quality} không bắt đầu từ level 0/exp 0`)
  if (rows.some((r, i) => r.Level !== i)) throw new Error(`nhóm bậc ${q.Quality} thiếu level`)
  const cum: number[] = []
  let sum = 0
  for (const r of rows) {
    sum += r.Exp
    cum.push(sum)
    if (r.Level > 0 && r.Exp <= 0) throw new Error(`EXP không dương ở bậc ${q.Quality} level ${r.Level}`)
  }
  cumulative[q.Quality] = cum
}

// ── phantomexpitem: 4 ống EXP, bậc gán theo thứ tự EXP tăng dần (khớp iteminfo Q2→Q5, đã kiểm 16/07) ──
const tubes = [...expItems].sort((a: any, b: any) => a.Exp - b.Exp)
if (tubes.length !== 4 || tubes.some((t: any, i: number) => i > 0 && t.Exp <= tubes[i - 1].Exp)) throw new Error(`phantomexpitem lạ: ${JSON.stringify(tubes)}`)

// ── vicepolish (Transducer — F7): cost theo PropCount 0..4 ──
const vp = [...vicePolish].sort((a: any, b: any) => a.PropCount - b.PropCount)
if (vp.length !== 5 || vp.some((r: any, i: number) => r.PropCount !== i || r.Cost.length !== 1)) throw new Error(`vicepolishconfig lạ: ${JSON.stringify(vp)}`)
const transducerCost = vp.map((r: any) => r.Cost[0].Value)

const fmtRec = (f: (q: QRow) => string) => qRows.map((q) => `  ${q.Quality}: ${f(q)},`).join('\n')
const out = `// SINH TỰ ĐỘNG bằng \`npx -y tsx scripts/gen-echo-economy.mts\` (task 69/F5) — KHÔNG sửa tay.
// Nguồn: datamine Arikatsu/WutheringWaves_Data@${BRANCH} (phantom/* + common_param) — recipe + verify:
// research/echo-economy.md. Số khoá cứng bằng data/echoEconomy.test.ts (tổng EXP, tỉ lệ bậc, feed +25→+22).

/** Bậc echo theo datamine (2★ tồn tại trong data nhưng app chỉ dùng 3–5) */
export type EchoRarity = 2 | 3 | 4 | 5

/** Level tối đa theo bậc (+10/+15/+20/+25) */
export const ECHO_MAX_LEVEL: Record<EchoRarity, number> = {
${fmtRec((q) => String(q.LevelLimit))}
}

/** EXP TÍCH LUỸ từ +0 để đạt level i (index = level). VD 5★: [0, 400, 1000, …, 142600] */
export const ECHO_EXP_CUMULATIVE: Record<EchoRarity, readonly number[]> = {
${fmtRec((q) => `[${cumulative[q.Quality].join(', ')}]`)}
}

/** Mốc level mở slot tune substat (mỗi mốc = 1 substat MỚI — datamine KHÔNG có mốc "boost" substat cũ) */
export const TUNE_SLOT_LEVELS: Record<EchoRarity, readonly number[]> = {
${fmtRec((q) => `[${q.SlotUnlockLevel.join(', ')}]`)}
}

/** Số tuner (ĐÚNG BẬC echo) cho MỖI lần tune 1 slot */
export const TUNERS_PER_SLOT = ${tunersPerSlot}

/** Shell Credit cho mỗi lần tune, theo bậc echo */
export const TUNE_CREDIT: Record<EchoRarity, number> = {
${fmtRec((q) => String(q.IdentifyCoin))}
}

/** 4 ống EXP (Sealed Tube) — bậc 2★→5★ theo thứ tự. RESERVED: chưa có consumer trong app
 *  (giữ cho mở rộng F10 quy đổi "còn thiếu X EXP ≈ N ống"; giá trị khoá test — đừng xoá tuỳ tiện) */
export const TUBE_EXP: readonly number[] = [${tubes.map((t: any) => t.Exp).join(', ')}]

/** Shell Credit tiêu khi đổ EXP: credit = EXP × hệ số này */
export const CREDIT_PER_EXP = ${creditPerExp}

/** Hoàn EXP khi dùng echo đã luyện làm nguyên liệu (feed) */
export const EXP_RETURN_RATIO = ${expReturn}

/** Hoàn tuner khi echo đã tune bị tiêu thụ/loại */
export const TUNER_RETURN_RATIO = ${tunerReturn}

/** Transducer cho 1 lần reroll, index = SỐ SUBSTAT KHOÁ (0–4). Verify 16/07 (game8 578127):
 *  khoá ≤2 → 1, khoá 3 → 2, khoá 4 → 3; chỉ dùng trên 5★ FULL-TUNE; xem research/echo-economy.md §5 */
export const TRANSDUCER_COST_BY_LOCKED: readonly number[] = [${transducerCost.join(', ')}]
`

writeFileSync(new URL('../src/data/echoEconomy.ts', import.meta.url), out)
const tot = (q: number) => cumulative[q][cumulative[q].length - 1]
console.log(`OK → src/data/echoEconomy.ts | tổng EXP 5★=${tot(5)} 4★=${tot(4)} 3★=${tot(3)} 2★=${tot(2)} | credit/EXP=${creditPerExp} hoàn EXP=${expReturn} hoàn tuner=${tunerReturn} | tuner/slot=${tunersPerSlot}`)
