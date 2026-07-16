// Sinh src/data/weaponsData.ts (stat cơ học vũ khí) từ game8 "List of All Weapons" (archives/452490).
// Chạy TỪ app/:  npx -y tsx scripts/gen-weapons.mts [đường-dẫn-html-đã-tải]
// Không truyền arg → tự fetch (cần UA trình duyệt, game8 chặn bot mặc định).
//
// Bảng game8: Weapon | Type | Rarity | ATK(Lv.90) | Substat(Lv.90) | Weapon Skill(S1).
// → emit {id,name,type,rarity,baseAtk,secondary,secondaryValue}. PASSIVE (Weapon Skill) KHÔNG tự mô hình
//   được (giá trị scale theo refinement) → in làm COMMENT; model tay vào WEAPON_PASSIVES trong weapons.ts.
// Cross-check datamine (weaponconf ×12.5): Azure Oath 587/CritRate24.3 khớp — xem HANDOVER §5.

import { readFileSync, writeFileSync } from 'node:fs'

const PAGE = 'https://game8.co/games/Wuthering-Waves/archives/452490'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const decodeEntities = (s: string) =>
  s.replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'")
const strip = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const slug = (s: string) => s.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const TYPE: Record<string, string> = {
  sword: 'sword', broadblade: 'broadblade', pistols: 'pistols', pistol: 'pistols',
  gauntlets: 'gauntlets', gauntlet: 'gauntlets', rectifier: 'rectifier',
}
// Substat label (game8) → WeaponSecondaryKey. Mọi substat vũ khí đều là % nên ATK/DEF/HP = pct.
const SUBSTAT: Record<string, string> = {
  'atk': 'atkPct', 'crit rate': 'critRate', 'crit dmg': 'critDmg',
  'energy regen': 'energyRegen', 'def': 'defPct', 'hp': 'hpPct',
}

async function loadHtml(): Promise<string> {
  const arg = process.argv[2]
  if (arg) return readFileSync(arg, 'utf8')
  const res = await fetch(PAGE, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`fetch ${PAGE} -> ${res.status}`)
  return await res.text()
}

interface Row { id: string; name: string; type: string; rarity: number; baseAtk: number; secondary: string; secondaryValue: number; skill: string }

const html = await loadHtml()
// bảng vũ khí = bảng chứa header "ATK  (Lv. 90)" + "Substat"
const table = (html.match(/<table[\s\S]*?<\/table>/g) ?? []).find((t) => /Substat/i.test(t) && /Rarity/i.test(t))
if (!table) throw new Error('không tìm thấy bảng vũ khí (cấu trúc trang đổi?)')

const rows: Row[] = []
const unknown = new Set<string>()
for (const tr of table.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
  const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
  if (cells.length < 6) continue // bỏ header (th) + row thiếu cột
  const name = strip(cells[0])
  const typeKey = TYPE[strip(cells[1]).toLowerCase()]
  const rarity = Number(strip(cells[2]).replace(/[^0-9]/g, ''))
  // GIỮ dấu chấm thập phân — "412.5" từng bị băm thành 4125 (bug unflickering-valor, review 16/07)
  const baseAtk = Number(strip(cells[3]).replace(/[^0-9.]/g, ''))
  const subRaw = strip(cells[4]) // "ATK +36.4%" | "Crit Rate +24.3%"
  const subM = subRaw.match(/^(.*?)\s*\+?\s*([\d.]+)\s*%?$/)
  if (!name || !typeKey || !rarity || !baseAtk || !subM) { if (name) unknown.add(`${name}: ${subRaw}`); continue }
  const secondary = SUBSTAT[subM[1].trim().toLowerCase().replace(/\./g, '')]
  if (!secondary) { unknown.add(`${name}: substat '${subM[1]}'`); continue }
  rows.push({ id: slug(name), name, type: typeKey, rarity, baseAtk, secondary, secondaryValue: Number(subM[2]), skill: strip(cells[5]) })
}

rows.sort((a, b) => (b.rarity - a.rarity) || a.name.localeCompare(b.name))
if (rows.length < 80) throw new Error(`chỉ parse ${rows.length} vũ khí — cấu trúc trang đổi?`)
// Plausibility guard (review 16/07): baseAtk L90 hợp lệ ~[250, 800], secondary % ~(0, 100].
// Fail LOUD thay vì ship số rác (vd 4125 do rơi dấu chấm).
const implausible = rows.filter((r) => r.baseAtk < 250 || r.baseAtk > 800 || r.secondaryValue <= 0 || r.secondaryValue > 100)
if (implausible.length)
  throw new Error(`giá trị bất thường (parse hỏng?): ${implausible.map((r) => `${r.name} atk=${r.baseAtk} sec=${r.secondaryValue}`).join(' | ')}`)
const dupe = rows.map((r) => r.id).filter((id, i, a) => a.indexOf(id) !== i)
if (dupe.length) console.warn('⚠ id trùng:', [...new Set(dupe)].join(', '))
if (unknown.size) console.warn(`⚠ BỎ ${unknown.size} row (substat lạ/thiếu cột):`, [...unknown].slice(0, 10).join(' | '), unknown.size > 10 ? `… (+${unknown.size - 10})` : '')

const ts = `import type { WeaponSecondaryKey, WeaponType } from '../types'

// SINH TỰ ĐỘNG bằng scripts/gen-weapons.mts từ game8 "List of All Weapons" (archives/452490). KHÔNG sửa tay.
// baseAtk + secondary ở Lv.90 (cross-check datamine ×12.5 — Azure Oath 587/24.3 khớp). Sinh: ${new Date().toISOString().slice(0, 10)}
// PASSIVE (Weapon Skill) mô hình TAY trong data/weapons.ts (WEAPON_PASSIVES) — không sinh ở đây; \`skill\` = text tham chiếu.

export interface WeaponBase {
  id: string
  name: string
  type: WeaponType
  rarity: 3 | 4 | 5
  baseAtk: number
  secondary: WeaponSecondaryKey
  secondaryValue: number
  /** Text Weapon Skill S1 (để mô hình passive tay) */
  skill: string
}

export const WEAPON_BASE: WeaponBase[] = [
${rows.map((r) => `  { id: ${JSON.stringify(r.id)}, name: ${JSON.stringify(r.name)}, type: '${r.type}', rarity: ${r.rarity}, baseAtk: ${r.baseAtk}, secondary: '${r.secondary}', secondaryValue: ${r.secondaryValue}, skill: ${JSON.stringify(r.skill)} },`).join('\n')}
]
`
writeFileSync(new globalThis.URL('../src/data/weaponsData.ts', import.meta.url), ts)
console.log(`✔ ${rows.length} vũ khí → src/data/weaponsData.ts`)
