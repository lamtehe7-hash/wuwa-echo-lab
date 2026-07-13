// Smoke test engine: npx tsx scripts/smoke.ts
import { mainStatFitLevel, rankEchoes, scoreEcho, tuneAdvice } from '../src/engine/score'
import { solveBest5 } from '../src/engine/solver'
import { solveRoster } from '../src/engine/roster'
import { CHARACTER_BY_ID } from '../src/data/characters'
import type { Echo } from '../src/types'

const camellya = CHARACTER_BY_ID['camellya']

const cost3: Echo[] = [
  { id: 'e1', name: 'A', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [
    { stat: 'critRate', value: 8.7 }, { stat: 'critDmg', value: 17.4 }, { stat: 'atkPct', value: 9.4 }, { stat: 'energyRegen', value: 8.4 }, { stat: 'atk', value: 40 } ] },
  { id: 'e2', name: 'B', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [
    { stat: 'hpPct', value: 10.9 }, { stat: 'defPct', value: 11.9 }, { stat: 'hp', value: 470 }, { stat: 'energyRegen', value: 10.0 }, { stat: 'def', value: 60 } ] },
  { id: 'e3', name: 'C', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [
    { stat: 'critRate', value: 10.5 }, { stat: 'critDmg', value: 21.0 }, { stat: 'basicAtk', value: 11.6 }, { stat: 'atkPct', value: 11.6 }, { stat: 'atk', value: 60 } ] },
  { id: 'e4', name: 'D', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 15, mainStat: 'havocDmg', substats: [
    { stat: 'critRate', value: 6.3 }, { stat: 'basicAtk', value: 6.4 }, { stat: 'hp', value: 320 } ] },
  { id: 'e5', name: 'E', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'energyRegen', substats: [
    { stat: 'critDmg', value: 12.6 }, { stat: 'critRate', value: 6.3 } ] },
]

console.log('=== Xếp hạng 5 echo cost-3 cho Camellya ===')
for (const r of rankEchoes(cost3, camellya)) {
  const adv = tuneAdvice(r.echo, camellya)
  console.log(`${r.echo.name}: score=${r.score.toFixed(1)} fit=${r.mainStatFit} | ${adv.verdict} (kỳ vọng ${adv.expectedFinal.toFixed(0)})`)
}

const inventory: Echo[] = [
  ...cost3,
  { id: 'c4a', name: 'Boss1', cost: 4, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'critRate', substats: [
    { stat: 'critDmg', value: 18.6 }, { stat: 'atkPct', value: 8.6 } ] },
  { id: 'c4b', name: 'Boss2', cost: 4, set: 'lingering-tunes', rarity: 5, level: 25, mainStat: 'critDmg', substats: [
    { stat: 'critRate', value: 7.5 } ] },
  { id: 'c1a', name: 'S1', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [
    { stat: 'critRate', value: 6.9 }, { stat: 'atk', value: 30 } ] },
  { id: 'c1b', name: 'S2', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [
    { stat: 'critDmg', value: 13.8 } ] },
  { id: 'c1c', name: 'S3', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'hpPct', substats: [] },
]

console.log('\n=== Bộ 5 tối ưu cho Camellya ===')
const r = solveBest5(inventory, camellya)
if (!r) throw new Error('Solver không tìm được bộ 5!')
console.log(`layout=${r.layout.join('-')} total=${r.total.toFixed(1)} (sub=${r.subScore.toFixed(1)} + set=${r.setBonusScore})`)
for (const s of r.echoes) console.log(`  c${s.echo.cost} ${s.echo.name} main=${s.echo.mainStat} score=${s.score.toFixed(1)} fit=${s.mainStatFit}`)
console.log('setCounts:', r.setCounts, '| notes:', r.note)

// Kiểm tra kỳ vọng: 5pc havoc-eclipse phải được đếm (5 tên khác nhau) nếu solver chọn cả 5 cùng set
const havocCount = r.setCounts['havoc-eclipse'] ?? 0
console.log(havocCount >= 5 ? '✅ 5pc havoc-eclipse OK' : `ℹ setCount havoc = ${havocCount} (solver có thể đổi Boss2 lấy điểm substat cao hơn)`)

// Trùng tên không được đếm 2 lần
const dupTest: Echo[] = inventory.map((e) => ({ ...e, name: 'SameName' }))
const r2 = solveBest5(dupTest, camellya)
console.log(`\nTrùng tên toàn bộ → setCount havoc-eclipse = ${r2?.setCounts['havoc-eclipse']} (kỳ vọng 1) ${r2?.setCounts['havoc-eclipse'] === 1 ? '✅' : '❌'}`)

// Fit 3 mức: echo C (main ATK% cost-3, Camellya ăn ATK%) phải là "tạm dùng" (0.6), không phải trash
const c = cost3.find((e) => e.id === 'e3')!
const e = cost3.find((e2) => e2.id === 'e5')!
console.log(`\nFit C (ATK% main): ${mainStatFitLevel(c, camellya)} (kỳ vọng 0.6) ${mainStatFitLevel(c, camellya) === 0.6 ? '✅' : '❌'}`)
console.log(`Fit E (ER main): ${mainStatFitLevel(e, camellya)} (kỳ vọng 0.25) ${mainStatFitLevel(e, camellya) === 0.25 ? '✅' : '❌'}`)
console.log(`Verdict C: ${tuneAdvice(c, camellya).verdict} (kỳ vọng khác 'trash') ${tuneAdvice(c, camellya).verdict !== 'trash' ? '✅' : '❌'}`)
console.log(`scoreEcho C fitLevel: ${scoreEcho(c, camellya).fitLevel}`)

// Roster: 2 nhân vật havoc — người ưu tiên 1 lấy echo A, người sau nhận phần còn lại
const roccia = CHARACTER_BY_ID['roccia']
const roster = solveRoster(inventory, [camellya, roccia])
const first = roster[0].result!
const second = roster[1].result
const firstIds = new Set(first.echoes.map((s) => s.echo.id))
const overlap = second ? second.echoes.some((s) => firstIds.has(s.echo.id)) : false
console.log(`\n=== Roster (Camellya ưu tiên → Roccia) ===`)
console.log(`Camellya: ${first.echoes.map((s) => s.echo.name).join(',')} total=${first.total.toFixed(1)}`)
console.log(second ? `Roccia: ${second.echoes.map((s) => s.echo.name).join(',')} total=${second.total.toFixed(1)}` : 'Roccia: không đủ echo (đúng kỳ vọng nếu kho cạn)')
console.log(`Không trùng echo giữa 2 người: ${!overlap ? '✅' : '❌'}`)
