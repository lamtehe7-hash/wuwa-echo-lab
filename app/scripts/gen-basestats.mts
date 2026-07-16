// Sinh base stat L90 (HP/ATK/DEF) cho data/characterBase.ts từ datamine
// Arikatsu/WutheringWaves_Data. Chạy TỪ app/:  npx -y tsx scripts/gen-basestats.mts [--branch 3.5]
//
// CÔNG THỨC (đã reverse + validate 15/07, xem HANDOVER §5 "Datamine BASE STAT"):
//   stat_L90 = baseproperty[(PropertyId, Lv=1)].{LifeMax|Atk|Def} × ratio(L90, maxBreach)
//   ratio đọc ĐỘNG từ rolepropertygrowth (hiện ×12.5 HP/ATK, ×12.2222 DEF) — không hardcode phòng patch đổi.
//   CR/CD nền = 5/150 (hằng số engine khoá cứng) nên KHÔNG sinh ở đây.
//
// ĐỊNH DANH: datamine KHÔNG có tên nhân vật đọc được (textmap EN stale), NHƯNG asset path trong roleinfo
//   chứa SLUG romaji (RolePortrait ".../ActivityRole<Slug>") → map slug→charId qua ALIAS. Bền hơn hardcode Id
//   (sống sót khi Id đổi patch). element-guard: element datamine ≠ element char ⇒ THROW (chống map nhầm).
//   [TENT] = slug romaji chưa 1:1 hiển nhiên (verify trong game rồi bỏ cờ). forte KHÔNG có ở đây → curate tay.
// → Script CHỈ in snippet mảng CHARACTER_BASE ra stdout để SPLICE TAY vào src/data/characterBase.ts
//   (file đó còn SET_BUFFS + forte, KHÔNG ghi đè cả file như echoes.ts).

import { CHARACTERS } from '../src/data/characters'
import type { WeightKey } from '../src/types'

const branchArg = process.argv.indexOf('--branch')
const BRANCH = branchArg >= 0 ? process.argv[branchArg + 1] : '3.5'
const RAW = (p: string) => `https://raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/${BRANCH}/BinData/${p}`
const ELEMENT: Record<number, string> = { 1: 'glacio', 2: 'fusion', 3: 'electro', 4: 'aero', 5: 'spectro', 6: 'havoc' }
// roleinfo.WeaponType: 1 BROADBLADE / 2 SWORD / 3 pistols / 4 gauntlets / 5 rectifier.
// (Ghi chú cũ HANDOVER "1sword/2broadblade" NGƯỢC 1↔2 — verify 16/07 bằng 4 mốc: Jiyan/Augusta
//  WeaponType=1 cầm broadblade (Verdant Summit/Thunderflare), Camellya/Xuanling=2 cầm sword (Red Spring/Azure Oath).)
const WEAPON_TYPE: Record<number, string> = { 1: 'broadblade', 2: 'sword', 3: 'pistols', 4: 'gauntlets', 5: 'rectifier' }

// slug romaji (từ asset path, lowercase) → charId trong characters.ts. [TENT]=cần xác nhận trong game.
const ALIAS: Record<string, string> = {
  chun: 'camellya', kelaita: 'carlotta', jinxi: 'jinhsi', changli: 'changli', xiangliyao: 'xiangli-yao',
  kakaluo: 'calcharo', jiyan: 'jiyan', anke: 'encore', zanni: 'zani', katixiya: 'cartethyia',
  lupa: 'lupa', yinlin: 'yinlin', zhezhi: 'zhezhi', luokeke: 'roccia', kanteleila: 'cantarella',
  bulante: 'brant', sanhua: 'sanhua', mofeite: 'mortefi', younuo: 'iuno', shouanren: 'shorekeeper',
  libeika: 'rebecca', suisui: 'suisui', daniya: 'denia', xuanling: 'xuanling', xigelika: 'sigrika',
  buling: 'buling', feibi: 'phoebe', aogusita: 'augusta', qiuyuan: 'qiuyuan',
  // slug romaji CN (đã xác nhận với user 16/07 — verina/baizhi/galbrena confirm tên):
  jueyuan: 'verina', bailian: 'baizhi', linnai: 'lynae', aimisi: 'aemeath', luhesi: 'luuk-herssen',
  feixue: 'hiyuki', luxi: 'lucy', luosela: 'lucilla', moning: 'mornye', jiabeilina: 'galbrena',
}
const TENT = new Set<string>() // tất cả slug đã xác nhận

// forte nội tại (Stat Bonus) — CURATE TAY theo guide/in-game. Thiếu = {} (engine vẫn đúng crit).
const FORTE: Record<string, Partial<Record<WeightKey, number>>> = {
  xuanling: { critRate: 8 }, // user đọc từ Forte in-game
}

interface RoleInfo {
  Id: number; RoleType: number; QualityId: number; PropertyId: number; ElementId: number
  WeaponType: number
  RolePortrait?: string; FormationRoleCard?: string; RoleStand?: string
}
interface BaseProp { Id: number; Lv: number; LifeMax: number; Atk: number; Def: number }
interface Growth { Level: number; BreachLevel: number; LifeMaxRatio: number; AtkRatio: number; DefRatio: number }

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(RAW(path))
  if (!r.ok) throw new Error(`fetch ${path} -> ${r.status}`)
  return (await r.json()) as T
}
function slugOf(ro: RoleInfo): string | null {
  for (const v of [ro.RolePortrait, ro.FormationRoleCard, ro.RoleStand]) {
    const m = v && v.match(/ActivityRole([A-Za-z]+)/)
    if (m) return m[1].toLowerCase()
  }
  return null
}

const [roles, base, growth] = await Promise.all([
  getJson<RoleInfo[]>('role/roleinfo.json'),
  getJson<BaseProp[]>('property/baseproperty.json'),
  getJson<Growth[]>('property/rolepropertygrowth.json'),
])

const top = growth.reduce((a, b) => (b.Level > a.Level || (b.Level === a.Level && b.BreachLevel > a.BreachLevel) ? b : a))
const [rHp, rAtk, rDef] = [top.LifeMaxRatio / 10000, top.AtkRatio / 10000, top.DefRatio / 10000]
console.error(`# ratio L${top.Level}/breach${top.BreachLevel}: HP×${rHp} ATK×${rAtk} DEF×${rDef}`)

const baseL1 = new Map<number, BaseProp>()
for (const b of base) if (b.Lv === 1) baseL1.set(b.Id, b)
const charById = new Map(CHARACTERS.map((c) => [c.id, c]))

interface Resolved { charId: string; slug: string; el: string; hp: number; atk: number; def: number; wt: string | undefined }
const resolved = new Map<string, Resolved>()
for (const ro of roles) {
  if (ro.RoleType !== 1 || (ro.QualityId !== 4 && ro.QualityId !== 5)) continue
  const s = slugOf(ro)
  const charId = s && ALIAS[s]
  if (!charId) continue
  const b = baseL1.get(ro.PropertyId)
  if (!b) continue
  const el = ELEMENT[ro.ElementId]
  const ch = charById.get(charId)
  if (!ch) { console.error(`# ⚠ ALIAS '${s}'→'${charId}' không có trong characters.ts`); continue }
  if (el !== ch.element) throw new Error(`ELEMENT MISMATCH '${charId}': char=${ch.element} vs datamine ${el} (slug ${s}) — map SAI`)
  resolved.set(charId, { charId, slug: s!, el, hp: Math.round(b.LifeMax * rHp), atk: Math.round(b.Atk * rAtk), def: Math.round(b.Def * rDef), wt: WEAPON_TYPE[ro.WeaponType] })
}

// ─── snippet để splice (theo thứ tự CHARACTERS) ───
console.log('// ↓ splice vào CHARACTER_BASE trong src/data/characterBase.ts (sinh bằng gen-basestats.mts) ↓')
for (const ch of CHARACTERS) {
  const r = resolved.get(ch.id)
  if (!r) continue
  const forte = FORTE[ch.id] ?? {}
  const notes = [TENT.has(r.slug) ? 'TENT verify' : '', Object.keys(forte).length ? '' : 'TODO forte', r.wt ? '' : 'weaponType lạ'].filter(Boolean).join(', ')
  const wtField = r.wt ? `, weaponType: '${r.wt}'` : ''
  console.log(`  { id: '${ch.id}', baseHp: ${r.hp}, baseAtk: ${r.atk}, baseDef: ${r.def}, forte: ${JSON.stringify(forte)}${wtField} },` + (notes ? ` // ${notes}` : ''))
}

// ─── report ───
const realChars = CHARACTERS.filter((c) => !c.id.startsWith('generic-'))
const unmapped = realChars.filter((c) => !resolved.has(c.id))
const tentCount = [...resolved.values()].filter((r) => TENT.has(r.slug)).length
console.error(`\n# ĐÃ MAP ${resolved.size}/${realChars.length} nhân vật thật (${tentCount} [TENT] cần xác nhận), element-mismatch 0.`)
if (unmapped.length) console.error(`# CHƯA MAP: ${unmapped.map((c) => c.id).join(', ')}`)
