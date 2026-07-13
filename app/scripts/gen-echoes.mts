// Sinh src/data/echoes.ts từ trang game8 "List of All Echoes" (archives/452491).
// Chạy TỪ THƯ MỤC app/:  npx tsx scripts/gen-echoes.mts [đường-dẫn-html-đã-tải]
// Không truyền arg → tự fetch trang (cần UA trình duyệt, game8 chặn bot mặc định).
//
// Mỗi row bảng: tên echo + icon (img.game8.co) + class (Common/Elite/Overlord/Calamity)
// + danh sách Sonata set. Cost suy từ class: Common=1, Elite=3, Overlord/Calamity=4.
// Set name → id đối chiếu với SONATA_SETS của app (normalize alnum, tách phần trong ngoặc).

import { readFileSync, writeFileSync } from 'node:fs'
import { SONATA_SETS } from '../src/data/sonata'

const PAGE_URL = 'https://game8.co/games/Wuthering-Waves/archives/452491'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const decodeEntities = (s: string) =>
  s.replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
const norm = (s: string) => decodeEntities(s).toLowerCase().replace(/[^a-z0-9]/g, '')

// Map tên set game8 → id nội bộ (tách alias trong ngoặc như ocr/parse.ts)
const SET_NAME_TO_ID = new Map<string, string>()
for (const s of SONATA_SETS) {
  for (const part of s.name.split(/[()]/)) {
    const key = norm(part.replace(/collab/i, ''))
    if (key.length >= 4) SET_NAME_TO_ID.set(key, s.id)
  }
}

const CLASS_TO_COST: Record<string, 1 | 3 | 4> = { Common: 1, Elite: 3, Overlord: 4, Calamity: 4 }

async function loadHtml(): Promise<string> {
  const arg = process.argv[2]
  if (arg) return readFileSync(arg, 'utf8')
  const res = await fetch(PAGE_URL, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`fetch ${PAGE_URL} -> ${res.status}`)
  return await res.text()
}

interface Row { name: string; cost: 1 | 3 | 4; echoClass: string; sets: string[]; icon: string }

const html = await loadHtml()
const rows: Row[] = []
const seen = new Set<string>()
const unknownSets = new Set<string>()

// Duyệt từng <tr>: cột 1 = link echo (data-src icon + TEXT NODE tên) + link class;
// cột 2 = các link sonata. Dùng text node thay vì alt — alt của game8 vỡ quoting với
// tên chứa dấu nháy ('alt="... Heart of Evil" s purge data-src=...').
for (const tr of html.split('<tr>').slice(1)) {
  const cells = tr.split(/<td[ >]/)
  if (cells.length < 3) continue
  const c1 = cells[1]
  const nameM = c1.match(/data-src="([^"]+)"[^>]*>([^<]+)<\/a>/)
  const classM = c1.match(/archives\/45(?:4002|4022|4023|4024)">(\w+)<\/a>/)
  if (!nameM || !classM) continue
  const cost = CLASS_TO_COST[classM[1]]
  if (!cost) continue
  const name = decodeEntities(nameM[2]).trim()
  if (seen.has(name)) continue
  seen.add(name)
  const sets: string[] = []
  for (const m of cells[2].matchAll(/data-src="[^"]+"[^>]*>([^<]+)<\/a>/g)) {
    const raw = decodeEntities(m[1]).trim()
    const id = SET_NAME_TO_ID.get(norm(raw))
    if (id) { if (!sets.includes(id)) sets.push(id) }
    else unknownSets.add(raw)
  }
  rows.push({ name, cost, echoClass: classM[1], sets, icon: nameM[1] })
}

rows.sort((a, b) => a.name.localeCompare(b.name))
if (rows.length < 100) throw new Error(`chỉ parse được ${rows.length} echo — cấu trúc trang đổi?`)
if (unknownSets.size) console.warn('⚠ Set không khớp SONATA_SETS:', [...unknownSets].join(' | '))

const ts = `import type { EchoCost } from '../types'

// SINH TỰ ĐỘNG bằng scripts/gen-echoes.mts từ game8 "List of All Echoes" (archives/452491).
// KHÔNG sửa tay — chạy lại script khi có bản game mới. Sinh lúc: ${new Date().toISOString().slice(0, 10)}
// Cost suy từ class: Common=1, Elite=3, Overlord/Calamity=4. sets = id trong data/sonata.ts.

export interface EchoInfo {
  name: string
  cost: EchoCost
  class: 'Common' | 'Elite' | 'Overlord' | 'Calamity'
  /** Sonata set khả dụng (id của SONATA_SETS) */
  sets: string[]
  /** Icon echo (CDN game8) */
  icon: string
}

export const ECHOES: EchoInfo[] = [
${rows.map((r) => `  { name: ${JSON.stringify(r.name)}, cost: ${r.cost}, class: '${r.echoClass}', sets: ${JSON.stringify(r.sets)}, icon: ${JSON.stringify(r.icon)} },`).join('\n')}
]

/** Tra theo tên đã chuẩn hoá (lowercase, bỏ ký tự không phải chữ/số) */
export const ECHO_BY_NORM_NAME: Record<string, EchoInfo> = Object.fromEntries(
  ECHOES.map((e) => [e.name.toLowerCase().replace(/[^a-z0-9]/g, ''), e]),
)
`
writeFileSync(new globalThis.URL('../src/data/echoes.ts', import.meta.url), ts)
console.log(`OK: ${rows.length} echo → src/data/echoes.ts`)
console.log('Theo cost:', [1, 3, 4].map((c) => `${c}: ${rows.filter((r) => r.cost === c).length}`).join(', '))
