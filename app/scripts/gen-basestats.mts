// Sinh base stat L90 (HP/ATK/DEF) + FORTE (Stat Bonus nội tại) cho data/characterBase.ts từ datamine
// Arikatsu/WutheringWaves_Data. Chạy TỪ app/:  npx -y tsx scripts/gen-basestats.mts [--branch 3.5]
//
// CÔNG THỨC (đã reverse + validate 15/07, xem HANDOVER §5 "Datamine BASE STAT"):
//   stat_L90 = baseproperty[(PropertyId, Lv=1)].{LifeMax|Atk|Def} × ratio(L90, maxBreach)
//   ratio đọc ĐỘNG từ rolepropertygrowth (hiện ×12.5 HP/ATK, ×12.2222 DEF) — không hardcode phòng patch đổi.
//   CR/CD nền = 5/150 (hằng số engine khoá cứng) nên KHÔNG sinh ở đây.
// FORTE (task 56, recipe crack 16/07): skillTree/skilltree.json — node NodeType==4 là node Stat Bonus,
//   NodeGroup == roleinfo.Id, Property[{Id,Value,IsRatio}]: IsRatio ? ×100 : /100 (đơn vị %).
//   Property Id → stat: 8 Crit / 9 CritDamage / 35 HealChange / 10002 HP% / 10007 ATK% / 10010 DEF% /
//   22–27 DamageChangeElement1–6 (element DMG — PHẢI khớp ElementId nhân vật, lệch ⇒ THROW).
//   Mỗi nhân vật đúng 8 node (2 loại stat × 4 node); tổng theo pattern CR 8 / CD 16 / ATK,HP,elem,heal 12 /
//   DEF 15.2. Mốc validate: Xuanling {critRate:8, atkPct:12} khớp user đọc Forte in-game (task 52).
//
// ĐỊNH DANH: datamine KHÔNG có tên nhân vật đọc được (textmap EN stale), NHƯNG asset path trong roleinfo
//   chứa SLUG romaji (RolePortrait ".../ActivityRole<Slug>") → map slug→charId qua ALIAS. Bền hơn hardcode Id
//   (sống sót khi Id đổi patch). element-guard: element datamine ≠ element char ⇒ THROW (chống map nhầm).
//   [TENT] = slug romaji chưa 1:1 hiển nhiên (verify trong game rồi bỏ cờ).
// → Script CHỈ in snippet mảng CHARACTER_BASE ra stdout để SPLICE TAY vào src/data/characterBase.ts
//   (file đó còn SET_BUFFS, KHÔNG ghi đè cả file như echoes.ts).

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

// Property Id (propertyindex.json) → WeightKey. Element (22–27) xử lý riêng (guard theo ElementId).
const PROP_TO_KEY: Record<number, WeightKey> = {
  8: 'critRate', 9: 'critDmg', 35: 'healingBonus', 10002: 'hpPct', 10007: 'atkPct', 10010: 'defPct',
}
// Thứ tự key ổn định trong snippet (diff-friendly)
const KEY_ORDER: WeightKey[] = ['critRate', 'critDmg', 'atkPct', 'hpPct', 'defPct', 'elementDmg', 'healingBonus']

interface RoleInfo {
  Id: number; RoleType: number; QualityId: number; PropertyId: number; ElementId: number
  WeaponType: number
  RolePortrait?: string; FormationRoleCard?: string; RoleStand?: string
}
interface BaseProp { Id: number; Lv: number; LifeMax: number; Atk: number; Def: number }
interface Growth { Level: number; BreachLevel: number; LifeMaxRatio: number; AtkRatio: number; DefRatio: number }
interface TreeNode {
  NodeGroup: number; NodeType: number
  Property?: { Id: number; Value: number; IsRatio: boolean }[]
}

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

const [roles, base, growth, tree] = await Promise.all([
  getJson<RoleInfo[]>('role/roleinfo.json'),
  getJson<BaseProp[]>('property/baseproperty.json'),
  getJson<Growth[]>('property/rolepropertygrowth.json'),
  getJson<TreeNode[]>('skillTree/skilltree.json'),
])

// node Stat Bonus (NodeType 4) theo NodeGroup (== roleinfo.Id)
const statNodes = new Map<number, TreeNode[]>()
for (const n of tree) {
  if (n.NodeType !== 4 || !n.Property?.length) continue
  const arr = statNodes.get(n.NodeGroup) ?? []
  arr.push(n)
  statNodes.set(n.NodeGroup, arr)
}

/** Tổng forte từ node Stat Bonus của 1 role. THROW khi gặp prop lạ / element lệch (chống map nhầm). */
function forteOf(ro: RoleInfo, charId: string): Partial<Record<WeightKey, number>> {
  const nodes = statNodes.get(ro.Id) ?? []
  if (nodes.length !== 8) console.error(`# ⚠ '${charId}' có ${nodes.length} node Stat Bonus (kỳ vọng 8)`)
  const sum: Partial<Record<WeightKey, number>> = {}
  for (const n of nodes)
    for (const p of n.Property!) {
      let key: WeightKey
      if (p.Id >= 22 && p.Id <= 27) {
        if (p.Id - 21 !== ro.ElementId)
          throw new Error(`FORTE ELEMENT MISMATCH '${charId}': prop element ${p.Id - 21} vs roleinfo ${ro.ElementId}`)
        key = 'elementDmg'
      } else {
        const k = PROP_TO_KEY[p.Id]
        if (!k) throw new Error(`FORTE PROP LẠ '${charId}': Id ${p.Id} — bổ sung PROP_TO_KEY`)
        key = k
      }
      sum[key] = (sum[key] ?? 0) + (p.IsRatio ? p.Value * 100 : p.Value / 100)
    }
  for (const k of Object.keys(sum) as WeightKey[]) sum[k] = Math.round(sum[k]! * 10) / 10
  return sum
}

/** JSON forte với thứ tự key ổn định. */
function forteStr(f: Partial<Record<WeightKey, number>>): string {
  const parts = KEY_ORDER.filter((k) => f[k] !== undefined).map((k) => `${k}: ${f[k]}`)
  return parts.length ? `{ ${parts.join(', ')} }` : '{}'
}

const top = growth.reduce((a, b) => (b.Level > a.Level || (b.Level === a.Level && b.BreachLevel > a.BreachLevel) ? b : a))
const [rHp, rAtk, rDef] = [top.LifeMaxRatio / 10000, top.AtkRatio / 10000, top.DefRatio / 10000]
console.error(`# ratio L${top.Level}/breach${top.BreachLevel}: HP×${rHp} ATK×${rAtk} DEF×${rDef}`)

const baseL1 = new Map<number, BaseProp>()
for (const b of base) if (b.Lv === 1) baseL1.set(b.Id, b)
const charById = new Map(CHARACTERS.map((c) => [c.id, c]))

interface Resolved { charId: string; slug: string; el: string; hp: number; atk: number; def: number; wt: string | undefined; forte: Partial<Record<WeightKey, number>> }
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
  resolved.set(charId, { charId, slug: s!, el, hp: Math.round(b.LifeMax * rHp), atk: Math.round(b.Atk * rAtk), def: Math.round(b.Def * rDef), wt: WEAPON_TYPE[ro.WeaponType], forte: forteOf(ro, charId) })
}

// ─── snippet để splice (theo thứ tự CHARACTERS) ───
console.log('// ↓ splice vào CHARACTER_BASE trong src/data/characterBase.ts (sinh bằng gen-basestats.mts) ↓')
for (const ch of CHARACTERS) {
  const r = resolved.get(ch.id)
  if (!r) continue
  const notes = [TENT.has(r.slug) ? 'TENT verify' : '', Object.keys(r.forte).length ? '' : 'forte RỖNG?', r.wt ? '' : 'weaponType lạ'].filter(Boolean).join(', ')
  const wtField = r.wt ? `, weaponType: '${r.wt}'` : ''
  console.log(`  { id: '${ch.id}', baseHp: ${r.hp}, baseAtk: ${r.atk}, baseDef: ${r.def}, forte: ${forteStr(r.forte)}${wtField} },` + (notes ? ` // ${notes}` : ''))
}

// ─── report ───
const realChars = CHARACTERS.filter((c) => !c.id.startsWith('generic-'))
const unmapped = realChars.filter((c) => !resolved.has(c.id))
const tentCount = [...resolved.values()].filter((r) => TENT.has(r.slug)).length
console.error(`\n# ĐÃ MAP ${resolved.size}/${realChars.length} nhân vật thật (${tentCount} [TENT] cần xác nhận), element-mismatch 0.`)
if (unmapped.length) console.error(`# CHƯA MAP: ${unmapped.map((c) => c.id).join(', ')}`)
