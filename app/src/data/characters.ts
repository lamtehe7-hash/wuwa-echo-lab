import type { CharacterProfile, Element, MainStatKey, WeightKey } from '../types'
import { ELEMENT_DMG } from './mainstats'

// Preset trọng số theo archetype (thang 0–1: 1 roll MAX của stat = w điểm).
// CR và CD cùng trọng số vì 1 roll CD (~2× %) ≈ 1 roll CR về EV quanh tỉ lệ 1:2 (research/scoring-methods.md §1.1).
// erTarget: tổng ER% mục tiêu (gồm 100 gốc) — heuristic cộng đồng, user chỉnh được trong data này.
// elementDmg/healingBonus: trọng số cho stat CHỈ tồn tại ở main stat + set bonus (không phải substat)
// — engine dùng để chấm giá trị main cost-3/cost-4 và stat từ set 2pc/5pc (engine/score.ts weightFor).

export const ARCHETYPE_WEIGHTS: Record<string, Partial<Record<WeightKey, number>>> = {
  critSkill:      { critRate: 1, critDmg: 1, atkPct: 0.75, skillDmg: 0.7, atk: 0.3, energyRegen: 0.35, elementDmg: 0.85 },
  critBasic:      { critRate: 1, critDmg: 1, atkPct: 0.75, basicAtk: 0.75, atk: 0.3, energyRegen: 0.3, elementDmg: 0.85 },
  critHeavy:      { critRate: 1, critDmg: 1, atkPct: 0.75, heavyAtk: 0.75, atk: 0.3, energyRegen: 0.35, elementDmg: 0.85 },
  critLiberation: { critRate: 1, critDmg: 1, atkPct: 0.75, liberationDmg: 0.75, atk: 0.3, energyRegen: 0.5, elementDmg: 0.85 },
  critHpSkill:    { critRate: 1, critDmg: 1, hpPct: 0.8, skillDmg: 0.6, hp: 0.3, energyRegen: 0.4, elementDmg: 0.85 },
  subDpsEr:       { critRate: 1, critDmg: 1, atkPct: 0.7, liberationDmg: 0.7, skillDmg: 0.4, atk: 0.25, energyRegen: 0.6, elementDmg: 0.8 },
  buffer:         { energyRegen: 1, atkPct: 0.5, critRate: 0.4, critDmg: 0.4, atk: 0.2, elementDmg: 0.3 },
  healerAtk:      { energyRegen: 1, atkPct: 0.6, atk: 0.25, hpPct: 0.3, healingBonus: 0.9 },
  healerHp:       { energyRegen: 1, hpPct: 0.7, hp: 0.3, critDmg: 0.3, liberationDmg: 0.3, healingBonus: 0.9 },
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

interface ChOpts {
  erTarget?: number
  main?: Record<'1' | '3' | '4', MainStatKey[]>
  /** Override toàn bộ weights (nhớ kèm elementDmg/healingBonus nếu nhân vật ăn) */
  weights?: Partial<Record<WeightKey, number>>
  rarity?: 4 | 5
  version?: string
  /** false = preset research web chưa kiểm chứng — UI/PR sau có thể lọc theo cờ này */
  verified?: boolean
  notes?: string
}

function ch(
  id: string, name: string, element: Element, archetype: string,
  preferredSets: string[],
  opts: ChOpts = {},
): CharacterProfile {
  return {
    id, name, element, archetype,
    weights: opts.weights ?? ARCHETYPE_WEIGHTS[archetype],
    erTarget: opts.erTarget,
    mainStatPrefs: opts.main ?? dpsMain(element),
    preferredSets,
    rarity: opts.rarity,
    version: opts.version,
    verified: opts.verified,
    notes: opts.notes,
  }
}

// preferredSets = SET ĐỀ CỬ (hiện ⭐ trong SetPicker) — web-research 14/07/2026
// (Prydwen/Game8/wuwa.gg, workflow 2 tầng research+verify). Trọng số/erTarget vẫn theo prydwen
// (1.0–2.x kiểm chứng; 3.x là điểm khởi đầu, chỉnh tự do).
// Nhân vật 3.x mới chưa có preset → dùng "Generic ..." rồi tự chỉnh trọng số.
export const CHARACTERS: CharacterProfile[] = [
  ch('camellya', 'Camellya', 'havoc', 'critBasic', ['havoc-eclipse']),
  ch('carlotta', 'Carlotta', 'glacio', 'critSkill', ['frosty-resolve', 'freezing-frost'], { erTarget: 125 }),
  ch('jinhsi', 'Jinhsi', 'spectro', 'critSkill', ['celestial-light', 'lingering-tunes']),
  ch('changli', 'Changli', 'fusion', 'critSkill', ['molten-rift', 'moonlit-clouds', 'lingering-tunes']),
  ch('xiangli-yao', 'Xiangli Yao', 'electro', 'critLiberation', ['void-thunder', 'lingering-tunes'], { erTarget: 120 }),
  ch('calcharo', 'Calcharo', 'electro', 'critLiberation', ['void-thunder', 'lingering-tunes'], { erTarget: 130 }),
  ch('jiyan', 'Jiyan', 'aero', 'critHeavy', ['sierra-gale', 'lingering-tunes'], { erTarget: 120 }),
  ch('encore', 'Encore', 'fusion', 'critBasic', ['molten-rift', 'lingering-tunes']),
  ch('zani', 'Zani', 'spectro', 'critHeavy', ['eternal-radiance', 'celestial-light']),
  ch('cartethyia', 'Cartethyia', 'aero', 'critHpSkill', ['windward-pilgrimage', 'gusts-of-welkin'], { main: { '4': ['critRate', 'critDmg'], '3': ['aeroDmg'], '1': ['hpPct'] } }),
  ch('lupa', 'Lupa', 'fusion', 'critSkill', ['flaming-clawprint', 'molten-rift']),
  ch('yinlin', 'Yinlin', 'electro', 'subDpsEr', ['empyrean-anthem', 'moonlit-clouds', 'void-thunder'], { erTarget: 125 }),
  ch('zhezhi', 'Zhezhi', 'glacio', 'subDpsEr', ['empyrean-anthem', 'moonlit-clouds'], { erTarget: 125 }),
  ch('roccia', 'Roccia', 'havoc', 'subDpsEr', ['midnight-veil', 'moonlit-clouds'], { erTarget: 130 }),
  ch('cantarella', 'Cantarella', 'havoc', 'subDpsEr', ['empyrean-anthem', 'midnight-veil'], { erTarget: 140 }),
  ch('brant', 'Brant', 'fusion', 'subDpsEr', ['tidebreaking-courage', 'molten-rift', 'moonlit-clouds'], { erTarget: 250, main: { '4': ['critRate', 'critDmg'], '3': ['energyRegen', 'fusionDmg'], '1': ['atkPct'] } }),
  ch('sanhua', 'Sanhua', 'glacio', 'buffer', ['moonlit-clouds', 'freezing-frost'], { erTarget: 150 }),
  ch('mortefi', 'Mortefi', 'fusion', 'buffer', ['moonlit-clouds', 'empyrean-anthem'], { erTarget: 150 }),
  ch('iuno', 'Iuno', 'aero', 'subDpsEr', ['crown-of-valor', 'windward-pilgrimage', 'sierra-gale'], { erTarget: 150 }),
  ch('shorekeeper', 'The Shorekeeper', 'spectro', 'healerHp', ['rejuvenating-glow', 'moonlit-clouds', 'halo-of-starry-radiance'], { erTarget: 250, main: healerMain }),
  ch('verina', 'Verina', 'spectro', 'healerAtk', ['rejuvenating-glow', 'moonlit-clouds'], { erTarget: 200, main: healerMain }),
  ch('baizhi', 'Baizhi', 'glacio', 'healerHp', ['rejuvenating-glow', 'moonlit-clouds'], { erTarget: 200, main: healerMain }),
  // ── Nhân vật 3.x — research web 13/07/2026, CHƯA kiểm chứng datamine (điểm khởi đầu, chỉnh trong app). Set id đã verify tồn tại trong sonata.ts. ──
  // Nhóm tin cậy tương đối cao (archetype + set khớp nhiều nguồn Game8/Prydwen):
  ch('lynae', 'Lynae', 'spectro', 'critBasic', ['rite-of-gilded-revelation', 'pact-of-neonlight-leap', 'moonlit-clouds'], { erTarget: 120 }),
  ch('aemeath', 'Aemeath', 'fusion', 'critLiberation', ['trailblazing-star', 'molten-rift'], { erTarget: 120 }),
  ch('luuk-herssen', 'Luuk Herssen', 'spectro', 'critBasic', ['rite-of-gilded-revelation', 'celestial-light'], { erTarget: 125 }),
  ch('hiyuki', 'Hiyuki', 'glacio', 'critLiberation', ['wishes-of-quiet-snowfall', 'freezing-frost'], { erTarget: 120 }),
  ch('lucy', 'Lucy', 'spectro', 'critHeavy', ['shadow-of-shattered-dreams', 'celestial-light', 'lingering-tunes'], { erTarget: 120 }),
  ch('rebecca', 'Rebecca', 'electro', 'critHeavy', ['shadow-of-shattered-dreams', 'void-thunder', 'reel-of-spliced-memories'], { erTarget: 125 }),
  ch('suisui', 'Suisui', 'glacio', 'healerHp', ['song-of-feathered-trace', 'rejuvenating-glow', 'moonlit-clouds'], { erTarget: 260, main: healerMain }),
  // ── Đã web-research 14/07/2026 (Prydwen/Game8/wuthering.gg qua 3 agent, cross-check ≥3 nguồn):
  //    cả 6 mục ĐỀU CÓ THẬT; trọng số/erTarget/set/main đã hiệu chỉnh theo nguồn (bỏ [UNVERIFIED]).
  //    Lưu ý: base-stat của bản mới chỉ đơn-nguồn, nhưng element/role/set/archetype thì ≥3 nguồn khớp.
  ch('denia', 'Denia', 'fusion', 'critLiberation', ['chromatic-foam', 'reel-of-spliced-memories', 'pact-of-neonlight-leap'], { erTarget: 125, rarity: 5, version: '3.3', verified: true }), // sub-DPS ATK, crit, Liberation DMG; Chromatic Foam 5pc BiS (Fusion Burst) — sửa: bỏ flaming-clawprint, thêm pact
  ch('lucilla', 'Lucilla', 'glacio', 'critBasic', ['wishes-of-quiet-snowfall', 'freezing-frost'], { rarity: 5, version: '3.4', verified: true }), // hybrid sub-DPS ATK, Basic-attack (Chafe mode); Liberation KHÔNG tốn energy → không erTarget (sửa: trước đoán subDpsEr/ER cao)
  ch('xuanling', 'Yangyang: Xuanling', 'havoc', 'critHeavy', ['song-of-feathered-trace', 'havoc-eclipse'], { erTarget: 115, rarity: 5, version: '3.5', verified: true }), // Main DPS Heavy Attack; Song of Feathered Trace (set mới ra cùng 3.5) 5pc BiS
  ch('mornye', 'Mornye', 'fusion', 'healerAtk', ['halo-of-starry-radiance', 'rejuvenating-glow'], { erTarget: 260, rarity: 5, version: '3.0', verified: true, main: { '4': ['healingBonus'], '3': ['energyRegen'], '1': ['defPct'] }, weights: { energyRegen: 1, defPct: 0.7, def: 0.25, critDmg: 0.35, healingBonus: 0.5 } }), // healer/buffer scale DEF% (heal + Outro +25% team DMG); Halo of Starry Radiance BiS (sửa: cost4 main → Healing Bonus)
  ch('sigrika', 'Sigrika', 'aero', 'critSkill', ['sound-of-true-name', 'sierra-gale'], { erTarget: 150, rarity: 5, version: '3.2', verified: true, weights: { critRate: 1, critDmg: 1, atkPct: 0.75, atk: 0.3, energyRegen: 0.9, elementDmg: 0.85 } }), // Main DPS ATK, dmg là Echo Skill DMG; ER≥150 mở khoá passive (+2% Echo Skill DMG / 1% ER trên 125); Sound of True Name 5pc BiS
  ch('buling', 'Buling', 'electro', 'healerAtk', ['rejuvenating-glow', 'moonlit-clouds'], { erTarget: 140, rarity: 4, version: '2.8', verified: true, main: { '4': ['healingBonus'], '3': ['energyRegen'], '1': ['atkPct'] } }), // 4★ healer ATK; Rejuvenating Glow 5pc BiS (sửa: erTarget 170→140, cost1 main → ATK%)
  // ── Preset 2.x bổ sung (web-research 14/07/2026, ≥2 nguồn/nhân vật) ──
  ch('phoebe', 'Phoebe', 'spectro', 'critHeavy', ['eternal-radiance', 'celestial-light', 'moonlit-clouds'], { erTarget: 120, rarity: 5, version: '2.1', verified: true }), // DPS/support 2 chế độ; Heavy Attack "Starflash" vs Spectro Frazzle; Eternal Radiance 5pc (DPS), Moonlit Clouds (support)
  ch('augusta', 'Augusta', 'electro', 'critHeavy', ['crown-of-valor', 'void-thunder', 'lingering-tunes'], { erTarget: 120, rarity: 5, version: '2.6', verified: true }), // Main DPS Heavy Attack + burst "Second Ultimate" (Liberation); Crown of Valor + 2pc Electro/Lingering
  ch('galbrena', 'Galbrena', 'fusion', 'critBasic', ['flamewings-shadow', 'molten-rift'], { erTarget: 115, rarity: 5, version: '2.7', verified: true }), // Main DPS stance-switch (Demon Hypostasis), Basic/Dodge-Counter; Flamewing's Shadow 3pc BiS
  ch('qiuyuan', 'Qiuyuan', 'aero', 'subDpsEr', ['law-of-harmony', 'moonlit-clouds'], { erTarget: 130, rarity: 5, version: '2.7', verified: true }), // Sub-DPS/buffer khuếch đại Echo Skill DMG toàn đội (feed Crit DMG khi CR>50%); Law of Harmony 3pc
  // Generic — cho nhân vật chưa có preset
  ch('generic-skill', 'Generic: Crit DPS (Skill)', 'glacio', 'critSkill', []),
  ch('generic-basic', 'Generic: Crit DPS (Basic)', 'havoc', 'critBasic', []),
  ch('generic-heavy', 'Generic: Crit DPS (Heavy)', 'aero', 'critHeavy', []),
  ch('generic-liberation', 'Generic: Crit DPS (Liberation)', 'electro', 'critLiberation', []),
  ch('generic-subdps', 'Generic: Sub-DPS / Buffer', 'electro', 'subDpsEr', [], { erTarget: 130 }),
  ch('generic-healer', 'Generic: Healer', 'spectro', 'healerHp', [], { erTarget: 220, main: healerMain }),
]

export const CHARACTER_BY_ID: Record<string, CharacterProfile> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]))
