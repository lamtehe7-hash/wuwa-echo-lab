import type { CharacterProfile, Element, MainStatKey, SubstatKey } from '../types'
import { ELEMENT_DMG } from './mainstats'

// Preset trọng số theo archetype (thang 0–1: 1 roll MAX của stat = w điểm).
// CR và CD cùng trọng số vì 1 roll CD (~2× %) ≈ 1 roll CR về EV quanh tỉ lệ 1:2 (research/scoring-methods.md §1.1).
// erTarget: tổng ER% mục tiêu (gồm 100 gốc) — heuristic cộng đồng, user chỉnh được trong data này.

export const ARCHETYPE_WEIGHTS: Record<string, Partial<Record<SubstatKey, number>>> = {
  critSkill:      { critRate: 1, critDmg: 1, atkPct: 0.75, skillDmg: 0.7, atk: 0.3, energyRegen: 0.35 },
  critBasic:      { critRate: 1, critDmg: 1, atkPct: 0.75, basicAtk: 0.75, atk: 0.3, energyRegen: 0.3 },
  critHeavy:      { critRate: 1, critDmg: 1, atkPct: 0.75, heavyAtk: 0.75, atk: 0.3, energyRegen: 0.35 },
  critLiberation: { critRate: 1, critDmg: 1, atkPct: 0.75, liberationDmg: 0.75, atk: 0.3, energyRegen: 0.5 },
  critHpSkill:    { critRate: 1, critDmg: 1, hpPct: 0.8, skillDmg: 0.6, hp: 0.3, energyRegen: 0.4 },
  subDpsEr:       { critRate: 1, critDmg: 1, atkPct: 0.7, liberationDmg: 0.7, skillDmg: 0.4, atk: 0.25, energyRegen: 0.6 },
  buffer:         { energyRegen: 1, atkPct: 0.5, critRate: 0.4, critDmg: 0.4, atk: 0.2 },
  healerAtk:      { energyRegen: 1, atkPct: 0.6, atk: 0.25, hpPct: 0.3 },
  healerHp:       { energyRegen: 1, hpPct: 0.7, hp: 0.3, critDmg: 0.3, liberationDmg: 0.3 },
}

const dpsMain = (el: Element): Record<'1' | '3' | '4', MainStatKey[]> => ({
  '4': ['critRate', 'critDmg'],
  '3': [ELEMENT_DMG[el]],
  '1': ['atkPct'],
})
const healerMain: Record<'1' | '3' | '4', MainStatKey[]> = {
  '4': ['healingBonus'],
  '3': ['energyRegen'],
  '1': ['hpPct'],
}

function ch(
  id: string, name: string, element: Element, archetype: string,
  preferredSets: string[],
  opts: { erTarget?: number; main?: Record<'1' | '3' | '4', MainStatKey[]>; weights?: Partial<Record<SubstatKey, number>> } = {},
): CharacterProfile {
  return {
    id, name, element, archetype,
    weights: opts.weights ?? ARCHETYPE_WEIGHTS[archetype],
    erTarget: opts.erTarget,
    mainStatPrefs: opts.main ?? dpsMain(element),
    preferredSets,
  }
}

// Preset nhân vật phổ biến (1.0–2.x đã kiểm chứng qua prydwen; chỉnh sửa tự do).
// Nhân vật 3.x mới chưa có preset → dùng "Generic ..." rồi tự chỉnh trọng số.
export const CHARACTERS: CharacterProfile[] = [
  ch('camellya', 'Camellya', 'havoc', 'critBasic', ['havoc-eclipse']),
  ch('carlotta', 'Carlotta', 'glacio', 'critSkill', ['frosty-resolve', 'freezing-frost'], { erTarget: 125 }),
  ch('jinhsi', 'Jinhsi', 'spectro', 'critSkill', ['celestial-light', 'eternal-radiance']),
  ch('changli', 'Changli', 'fusion', 'critSkill', ['molten-rift', 'flaming-clawprint']),
  ch('xiangli-yao', 'Xiangli Yao', 'electro', 'critLiberation', ['void-thunder'], { erTarget: 120 }),
  ch('calcharo', 'Calcharo', 'electro', 'critLiberation', ['void-thunder'], { erTarget: 130 }),
  ch('jiyan', 'Jiyan', 'aero', 'critHeavy', ['sierra-gale', 'gusts-of-welkin'], { erTarget: 120 }),
  ch('encore', 'Encore', 'fusion', 'critBasic', ['molten-rift']),
  ch('zani', 'Zani', 'spectro', 'critHeavy', ['eternal-radiance']),
  ch('cartethyia', 'Cartethyia', 'aero', 'critHpSkill', ['windward-pilgrimage'], { main: { '4': ['critRate', 'critDmg'], '3': ['aeroDmg'], '1': ['hpPct'] } }),
  ch('lupa', 'Lupa', 'fusion', 'critSkill', ['flaming-clawprint', 'molten-rift']),
  ch('yinlin', 'Yinlin', 'electro', 'subDpsEr', ['void-thunder', 'empyrean-anthem'], { erTarget: 125 }),
  ch('zhezhi', 'Zhezhi', 'glacio', 'subDpsEr', ['freezing-frost', 'empyrean-anthem'], { erTarget: 125 }),
  ch('roccia', 'Roccia', 'havoc', 'subDpsEr', ['midnight-veil'], { erTarget: 130 }),
  ch('cantarella', 'Cantarella', 'havoc', 'subDpsEr', ['midnight-veil', 'empyrean-anthem'], { erTarget: 140 }),
  ch('brant', 'Brant', 'fusion', 'subDpsEr', ['tidebreaking-courage'], { erTarget: 250, main: { '4': ['critRate', 'critDmg'], '3': ['energyRegen', 'fusionDmg'], '1': ['atkPct'] } }),
  ch('sanhua', 'Sanhua', 'glacio', 'buffer', ['moonlit-clouds'], { erTarget: 150 }),
  ch('mortefi', 'Mortefi', 'fusion', 'buffer', ['moonlit-clouds'], { erTarget: 150 }),
  ch('iuno', 'Iuno', 'aero', 'subDpsEr', ['windward-pilgrimage', 'moonlit-clouds'], { erTarget: 150 }),
  ch('shorekeeper', 'The Shorekeeper', 'spectro', 'healerHp', ['rejuvenating-glow', 'halo-of-starry-radiance'], { erTarget: 250, main: healerMain }),
  ch('verina', 'Verina', 'spectro', 'healerAtk', ['rejuvenating-glow', 'moonlit-clouds'], { erTarget: 200, main: healerMain }),
  ch('baizhi', 'Baizhi', 'glacio', 'healerHp', ['rejuvenating-glow', 'moonlit-clouds'], { erTarget: 200, main: healerMain }),
  // ── Nhân vật 3.x — research web 13/07/2026, CHƯA kiểm chứng datamine (điểm khởi đầu, chỉnh trong app). Set id đã verify tồn tại trong sonata.ts. ──
  // Nhóm tin cậy tương đối cao (archetype + set khớp nhiều nguồn Game8/Prydwen):
  ch('lynae', 'Lynae', 'spectro', 'critBasic', ['pact-of-neonlight-leap', 'moonlit-clouds'], { erTarget: 120 }),
  ch('aemeath', 'Aemeath', 'fusion', 'critLiberation', ['trailblazing-star'], { erTarget: 120 }),
  ch('luuk-herssen', 'Luuk Herssen', 'spectro', 'critBasic', ['rite-of-gilded-revelation'], { erTarget: 125 }),
  ch('hiyuki', 'Hiyuki', 'glacio', 'critLiberation', ['wishes-of-quiet-snowfall'], { erTarget: 120 }),
  ch('lucy', 'Lucy', 'spectro', 'critHeavy', ['shadow-of-shattered-dreams', 'celestial-light'], { erTarget: 120 }),
  ch('rebecca', 'Rebecca', 'electro', 'critHeavy', ['shadow-of-shattered-dreams', 'void-thunder'], { erTarget: 125 }),
  ch('suisui', 'Suisui', 'glacio', 'healerHp', ['song-of-feathered-trace', 'rejuvenating-glow'], { erTarget: 260, main: healerMain }),
  // [UNVERIFIED — CẦN NGƯỜI DÙNG XÁC NHẬN]:
  ch('denia', 'Denia', 'fusion', 'critLiberation', ['chromatic-foam', 'reel-of-spliced-memories'], { erTarget: 125 }), // archetype critLiberation vs subDpsEr còn tranh cãi (nguồn ưu tiên ER > Crit)
  ch('lucilla', 'Lucilla', 'glacio', 'subDpsEr', ['wishes-of-quiet-snowfall'], { erTarget: 125 }), // erTarget suy theo Zhezhi, chưa có số cụ thể
  ch('xuanling', 'Yangyang: Xuanling', 'havoc', 'critHeavy', ['song-of-feathered-trace']), // erTarget chưa rõ → dùng mặc định critHeavy
  ch('mornye', 'Mornye', 'fusion', 'healerAtk', ['halo-of-starry-radiance', 'rejuvenating-glow'], { erTarget: 260, main: { '4': ['defPct'], '3': ['energyRegen'], '1': ['defPct'] }, weights: { energyRegen: 1, defPct: 0.7, def: 0.25, critDmg: 0.35 } }), // scale DEF% — không archetype nào khớp, override thủ công
  ch('sigrika', 'Sigrika', 'aero', 'critSkill', ['sound-of-true-name'], { erTarget: 150, weights: { critRate: 1, critDmg: 1, atkPct: 0.75, atk: 0.3, energyRegen: 0.9 } }), // scale "Echo Skill DMG" (không có SubstatKey) — xấp xỉ bằng ER cao
  ch('buling', 'Buling', 'electro', 'healerAtk', ['rejuvenating-glow'], { erTarget: 170, main: healerMain }), // thực ra bản 2.8 (không phải 3.x); erTarget 170 = trung bình 160–180
  // Generic — cho nhân vật chưa có preset
  ch('generic-skill', 'Generic: Crit DPS (Skill)', 'glacio', 'critSkill', []),
  ch('generic-basic', 'Generic: Crit DPS (Basic)', 'havoc', 'critBasic', []),
  ch('generic-heavy', 'Generic: Crit DPS (Heavy)', 'aero', 'critHeavy', []),
  ch('generic-liberation', 'Generic: Crit DPS (Liberation)', 'electro', 'critLiberation', []),
  ch('generic-subdps', 'Generic: Sub-DPS / Buffer', 'electro', 'subDpsEr', [], { erTarget: 130 }),
  ch('generic-healer', 'Generic: Healer', 'spectro', 'healerHp', [], { erTarget: 220, main: healerMain }),
]

export const CHARACTER_BY_ID: Record<string, CharacterProfile> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]))
