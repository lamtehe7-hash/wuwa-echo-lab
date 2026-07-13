// Test parseEchoText bằng fixture text thô giả lập output tesseract.js (không cần ảnh thật).
// Chạy: npx tsx scripts/ocr-test.ts
import { parseEchoText } from '../src/ocr/parse'

let failed = 0
function check(label: string, cond: boolean, extra?: string) {
  if (cond) {
    console.log(`  ✅ ${label}`)
  } else {
    failed++
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ''}`)
  }
}

// ---- Fixture 1: đủ 5 substat, main stat nguyên tố (không mơ hồ) ----
console.log('=== Fixture 1: đủ 5 substat ===')
{
  const text = `Impermanence Heron
Cost: 4
Lv. 25/25
Havoc DMG Bonus 30.0%
Crit Rate 8.7%
Crit DMG 17.4%
ATK% 9.4%
Energy Regen 8.4%
ATK 40`
  const d = parseEchoText(text)
  console.log('  draft:', JSON.stringify(d))
  check('mainStat = havocDmg', d.mainStat === 'havocDmg')
  check('level = 25', d.level === 25)
  check('5 substats', d.substats.length === 5, `nhận ${d.substats.length}`)
  check('có critRate 8.7', d.substats.some((s) => s.stat === 'critRate' && s.value === 8.7))
  check('có critDmg 17.4', d.substats.some((s) => s.stat === 'critDmg' && s.value === 17.4))
  check('có atkPct 9.4', d.substats.some((s) => s.stat === 'atkPct' && s.value === 9.4))
  check('có energyRegen 8.4', d.substats.some((s) => s.stat === 'energyRegen' && s.value === 8.4))
  check('có atk (flat) 40', d.substats.some((s) => s.stat === 'atk' && s.value === 40))
  check('confidence khá cao (>0.6)', d.confidence > 0.6, `confidence=${d.confidence}`)
}

// ---- Fixture 2: thiếu nhãn (1 dòng label bị OCR làm hỏng, không khớp được) ----
console.log('\n=== Fixture 2: thiếu nhãn ===')
{
  const text = `Stalwart Vanguard
Cost: 3
Lv. 25/25
ATK% 30.0%
Crit Rate 9.3%
Zxqlk Vmpr 7.6%
Heavy Attack DMG Bonus 6.4%
DEF 50`
  const d = parseEchoText(text)
  console.log('  draft:', JSON.stringify(d))
  check('mainStat = atkPct (30% vượt hẳn mốc substat)', d.mainStat === 'atkPct')
  check('chỉ nhận 3 substat (bỏ dòng hỏng)', d.substats.length === 3, `nhận ${d.substats.length}`)
  check('có critRate 9.3', d.substats.some((s) => s.stat === 'critRate' && s.value === 9.3))
  check('có heavyAtk 6.4', d.substats.some((s) => s.stat === 'heavyAtk' && s.value === 6.4))
  check('có def (flat) 50', d.substats.some((s) => s.stat === 'def' && s.value === 50))
  check('có cảnh báo dòng không khớp nhãn', d.warnings.some((w) => w.key === 'ocrParse.unmatched'))
}

// ---- Fixture 3: số lệch nhẹ cần snap (+ 1 lệch nặng >5% để test cảnh báo) ----
console.log('\n=== Fixture 3: số lệch cần snap ===')
{
  const text = `Moonlit Warden
Cost: 4
Lv. 25/25
Crit Rate 22.0%
Crit DMG 17.5%
ATK% 5.0%
Energy Regen 12.4%
DEF 60`
  const d = parseEchoText(text)
  console.log('  draft:', JSON.stringify(d))
  check('mainStat = critRate (22% vượt hẳn mốc substat 10.5)', d.mainStat === 'critRate')
  check('critDmg lệch nhẹ 17.5 -> snap về 17.4 (không cảnh báo riêng)', d.substats.some((s) => s.stat === 'critDmg' && s.value === 17.4))
  check('atkPct lệch nặng 5.0 -> snap về mốc thấp nhất 6.4', d.substats.some((s) => s.stat === 'atkPct' && s.value === 6.4))
  check('energyRegen đúng mốc 12.4', d.substats.some((s) => s.stat === 'energyRegen' && s.value === 12.4))
  check('def đúng mốc 60', d.substats.some((s) => s.stat === 'def' && s.value === 60))
  check('có cảnh báo lệch >5% cho ATK%', d.warnings.some((w) => w.key === 'ocrParse.snapOff' && String(w.params?.label).toLowerCase().includes('atk')))
}

// ---- Fixture 4: text rác (ảnh chụp sai/không phải echo) ----
console.log('\n=== Fixture 4: text rác ===')
{
  const text = `///// SCAN ERROR /////
qwletasd zxcvbn
??? unreadable ???`
  const d = parseEchoText(text)
  console.log('  draft:', JSON.stringify(d))
  check('không có mainStat', d.mainStat === undefined)
  check('không có substat nào', d.substats.length === 0)
  check('confidence = 0', d.confidence === 0)
  check('có cảnh báo không nhận diện được', d.warnings.some((w) => w.key === 'ocrParse.noContent'))
}

// ---- Fixture 5: ký tự lạ dính đuôi số (OCR noise) — regex cũ bỏ qua cả dòng ----
console.log('\n=== Fixture 5: ký tự lạ dính đuôi số ===')
{
  const text = `Rime-Draped Sprouts
Cost: 4
Lv. 25/25
Glacio DMG Bonus 30.0%o
Crit Rate 8.7%%
Crit DMG 17.4%|
ATK% 9.4% .
Energy Regen 8.4%·
ATK 40*`
  const d = parseEchoText(text)
  console.log('  draft:', JSON.stringify(d))
  check('mainStat = glacioDmg', d.mainStat === 'glacioDmg')
  check('level = 25', d.level === 25)
  check('5 substats (không dòng nào bị bỏ qua)', d.substats.length === 5, `nhận ${d.substats.length}`)
  check('có critRate 8.7 (%% kép)', d.substats.some((s) => s.stat === 'critRate' && s.value === 8.7))
  check('có critDmg 17.4 (| dính đuôi)', d.substats.some((s) => s.stat === 'critDmg' && s.value === 17.4))
  check('có atkPct 9.4 (space+dot đuôi)', d.substats.some((s) => s.stat === 'atkPct' && s.value === 9.4))
  check('có energyRegen 8.4 (middot đuôi)', d.substats.some((s) => s.stat === 'energyRegen' && s.value === 8.4))
  check('có atk (flat) 40 (* đuôi, không có % nên là flat)', d.substats.some((s) => s.stat === 'atk' && s.value === 40))
}

console.log(`\n${failed === 0 ? '✅ TẤT CẢ PASS' : `❌ ${failed} CHECK FAIL`}`)
if (failed > 0) process.exit(1)
