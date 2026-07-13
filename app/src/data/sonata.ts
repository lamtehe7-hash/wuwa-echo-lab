import type { SetBonusTier, SonataSet } from '../types'

// Nguồn: research/echo-system.md §5 — đủ ~34 set tới bản 3.5.
// Version của vài set 2.5–2.8 là UNVERIFIED (tổng hợp cộng đồng).
//
// `bonuses` = phần stat LƯỢNG HOÁ ĐƯỢC của bonus, cho CHÍNH người đeo — solver cộng thẳng
// vào điểm (w × value × uptime / refScale). Hiệu ứng không quy được về stat (nổ 480%,
// buff cho người kế tiếp, Coordinated DMG, Tune Break Boost…) KHÔNG encode — mô tả nằm ở
// `short`, và độ hợp kit thể hiện qua preferredSets của nhân vật (điểm ưu tiên trong solver).
//
// QUY ƯỚC UPTIME (heuristic, chỉnh tự do):
//   1.0  vô điều kiện (mọi 2pc, 5pc dạng "ATK +15%")
//   0.8  kích hoạt bằng thao tác phổ thông trong rotation (cast Skill/Liberation/heal), duration ≥15s
//   0.7  cần stack bằng hành động lặp (Basic/Heavy xN) hoặc trigger Intro — value ghi mức FULL stack
//   0.5-0.6 điều kiện hẹp (debuff nguyên tố cụ thể, shield, ER≥250, on-field, duration ngắn <8s)
//   0.4  điều kiện rất hẹp / duration rất ngắn
// Stack: value = giá trị ĐỦ stack (vd +5% x4 → 20).

/** Input gọn: pieces suy từ bonuses khi build SONATA_SETS */
type SetInput = Omit<SonataSet, 'pieces'>

const set = (s: SetInput): SonataSet => ({ ...s, pieces: s.bonuses.map((b) => b.pieces) })

/** 2pc +10% element của set — viết tắt cho nhóm set nguyên tố */
const elem2 = (stat: SetBonusTier['stats'][number]['stat']): SetBonusTier => ({
  pieces: 2,
  stats: [{ stat, value: 10, uptime: 1 }],
})

export const SONATA_SETS: SonataSet[] = [
  // ── 1.0 ──
  set({
    id: 'freezing-frost', name: 'Freezing Frost', element: 'glacio', version: '1.0',
    short: '2pc: Glacio +10% · 5pc: Glacio +10%/stack x3 sau Basic/Heavy',
    bonuses: [elem2('glacioDmg'), { pieces: 5, stats: [{ stat: 'glacioDmg', value: 30, uptime: 0.7 }] }],
  }),
  set({
    id: 'molten-rift', name: 'Molten Rift', element: 'fusion', version: '1.0',
    short: '2pc: Fusion +10% · 5pc: Fusion +30%/15s sau Skill',
    bonuses: [elem2('fusionDmg'), { pieces: 5, stats: [{ stat: 'fusionDmg', value: 30, uptime: 0.8 }] }],
  }),
  set({
    id: 'void-thunder', name: 'Void Thunder', element: 'electro', version: '1.0',
    short: '2pc: Electro +10% · 5pc: Electro +15% x2 sau Heavy/Skill',
    bonuses: [elem2('electroDmg'), { pieces: 5, stats: [{ stat: 'electroDmg', value: 30, uptime: 0.7 }] }],
  }),
  set({
    id: 'sierra-gale', name: 'Sierra Gale', element: 'aero', version: '1.0',
    short: '2pc: Aero +10% · 5pc: Aero +30%/15s sau Intro',
    bonuses: [elem2('aeroDmg'), { pieces: 5, stats: [{ stat: 'aeroDmg', value: 30, uptime: 0.7 }] }],
  }),
  set({
    id: 'celestial-light', name: 'Celestial Light', element: 'spectro', version: '1.0',
    short: '2pc: Spectro +10% · 5pc: Spectro +30%/15s sau Intro',
    bonuses: [elem2('spectroDmg'), { pieces: 5, stats: [{ stat: 'spectroDmg', value: 30, uptime: 0.7 }] }],
  }),
  set({
    id: 'havoc-eclipse', name: 'Havoc Eclipse (Sun-sinking Eclipse)', element: 'havoc', version: '1.0',
    short: '2pc: Havoc +10% · 5pc: Havoc +7.5% x4 sau Basic/Heavy',
    bonuses: [elem2('havocDmg'), { pieces: 5, stats: [{ stat: 'havocDmg', value: 30, uptime: 0.7 }] }],
  }),
  set({
    id: 'rejuvenating-glow', name: 'Rejuvenating Glow', version: '1.0',
    short: '2pc: Healing +10% · 5pc: hồi máu → team ATK +15%/30s',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'healingBonus', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'atkPct', value: 15, uptime: 0.8 }] },
    ],
  }),
  set({
    id: 'moonlit-clouds', name: 'Moonlit Clouds', version: '1.0',
    short: '2pc: ER +10% · 5pc: sau Outro, người kế tiếp ATK +22.5%/15s',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'energyRegen', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [] }, // buff cho người kế tiếp — giá trị nằm ở preferredSets của buffer
    ],
  }),
  set({
    id: 'lingering-tunes', name: 'Lingering Tunes', version: '1.0',
    short: '2pc: ATK +10% · 5pc: on-field ATK +5% x4; Outro DMG +60%',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'atkPct', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'atkPct', value: 20, uptime: 0.6 }] },
    ],
  }),
  // ── 2.0 ──
  set({
    id: 'frosty-resolve', name: 'Frosty Resolve', element: 'glacio', version: '2.0',
    short: '2pc: Skill DMG +12% · 5pc: Skill→Glacio +22.5%; Lib→Skill +18% x2',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'skillDmg', value: 12, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'glacioDmg', value: 22.5, uptime: 0.8 }, { stat: 'skillDmg', value: 36, uptime: 0.4 }] },
    ],
  }),
  set({
    id: 'eternal-radiance', name: 'Eternal Radiance', element: 'spectro', version: '2.0',
    short: '2pc: Spectro +10% · 5pc: Frazzle→CR +20%; 10 stack→Spectro +15%',
    bonuses: [elem2('spectroDmg'), { pieces: 5, stats: [{ stat: 'critRate', value: 20, uptime: 0.6 }, { stat: 'spectroDmg', value: 15, uptime: 0.5 }] }],
  }),
  set({
    id: 'midnight-veil', name: 'Midnight Veil', element: 'havoc', version: '2.0',
    short: '2pc: Havoc +10% · 5pc: Outro nổ 480% Havoc; người vào +15% Havoc',
    bonuses: [elem2('havocDmg'), { pieces: 5, stats: [{ stat: 'havocDmg', value: 15, uptime: 0.6 }] }],
  }),
  set({
    id: 'empyrean-anthem', name: 'Empyrean Anthem', version: '2.0',
    short: '2pc: ER +10% · 5pc: Coordinated +80%; crit coord→ATK +20%',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'energyRegen', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'atkPct', value: 20, uptime: 0.4 }] }, // +80% Coordinated không quy được stat
    ],
  }),
  set({
    id: 'tidebreaking-courage', name: 'Tidebreaking Courage', version: '2.0',
    short: '2pc: ER +10% · 5pc: ATK +15%; ER≥250%→mọi Attribute DMG +30%',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'energyRegen', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'atkPct', value: 15, uptime: 1 }, { stat: 'elementDmg', value: 30, uptime: 0.6 }] },
    ],
  }),
  // ── 2.2–2.4 ──
  set({
    id: 'gusts-of-welkin', name: 'Gusts of Welkin', element: 'aero', version: '2.2',
    short: '2pc: Aero +10% · 5pc: Aero Erosion→team Aero +15% (+15% người trigger)',
    bonuses: [elem2('aeroDmg'), { pieces: 5, stats: [{ stat: 'aeroDmg', value: 30, uptime: 0.6 }] }],
  }),
  set({
    id: 'windward-pilgrimage', name: 'Windward Pilgrimage', element: 'aero', version: '2.4',
    short: '2pc: Aero +10% · 5pc: trúng Aero Erosion→CR +10%, Aero +30%',
    bonuses: [elem2('aeroDmg'), { pieces: 5, stats: [{ stat: 'critRate', value: 10, uptime: 0.6 }, { stat: 'aeroDmg', value: 30, uptime: 0.6 }] }],
  }),
  set({
    id: 'flaming-clawprint', name: 'Flaming Clawprint', element: 'fusion', version: '2.4',
    short: '2pc: Fusion +10% · 5pc: Lib→team Fusion +15%, caster Lib +20%',
    bonuses: [elem2('fusionDmg'), { pieces: 5, stats: [{ stat: 'fusionDmg', value: 15, uptime: 0.8 }, { stat: 'liberationDmg', value: 20, uptime: 0.8 }] }],
  }),
  // ── Set 3 mảnh (2.5–2.8, version UNVERIFIED chi tiết) ──
  set({
    id: 'dream-of-the-lost', name: 'Dream of the Lost', version: '2.5',
    short: '3pc: 0 Energy→CR +20%, Echo Skill DMG +35%',
    bonuses: [{ pieces: 3, stats: [{ stat: 'critRate', value: 20, uptime: 0.5 }] }], // Echo Skill DMG không có key
  }),
  set({
    id: 'crown-of-valor', name: 'Crown of Valor', version: '2.6',
    short: '3pc: nhận Shield→ATK +6%, CD +4% x5',
    bonuses: [{ pieces: 3, stats: [{ stat: 'atkPct', value: 30, uptime: 0.5 }, { stat: 'critDmg', value: 20, uptime: 0.5 }] }],
  }),
  set({
    id: 'law-of-harmony', name: 'Law of Harmony', version: '2.6',
    short: '3pc: Echo Skill→Heavy +30%; team Echo Skill DMG +4% x4',
    bonuses: [{ pieces: 3, stats: [{ stat: 'heavyAtk', value: 30, uptime: 0.4 }] }],
  }),
  set({
    id: 'flamewings-shadow', name: "Flamewing's Shadow", element: 'fusion', version: '2.7',
    short: '3pc: Echo Skill↔Heavy CR +20% chéo; cả hai→Fusion +16%',
    bonuses: [{ pieces: 3, stats: [{ stat: 'critRate', value: 20, uptime: 0.5 }, { stat: 'fusionDmg', value: 16, uptime: 0.5 }] }],
  }),
  set({
    id: 'thread-of-severed-fate', name: 'Thread of Severed Fate', element: 'havoc', version: '2.8',
    short: '3pc: Havoc Bane→ATK +20%, Lib DMG +30%',
    bonuses: [{ pieces: 3, stats: [{ stat: 'atkPct', value: 20, uptime: 0.5 }, { stat: 'liberationDmg', value: 30, uptime: 0.5 }] }],
  }),
  // ── 3.0–3.1 ──
  set({
    id: 'pact-of-neonlight-leap', name: 'Pact of Neonlight Leap', element: 'spectro', version: '3.0',
    short: '2pc: Spectro +10% · 5pc: Outro→Intro ATK +15% + Tune Break Boost (max +15%)',
    // Tune Break Boost của RIÊNG set này quy đổi 0.3% ATK/điểm (max +15% ATK, echo-system.md §5)
    // → atkPct 30 = 15 (Outro→Intro) + 15 (quy đổi); khác Reel of Spliced Memories (không quy được).
    bonuses: [elem2('spectroDmg'), { pieces: 5, stats: [{ stat: 'atkPct', value: 30, uptime: 0.5 }] }],
  }),
  set({
    id: 'halo-of-starry-radiance', name: 'Halo of Starry Radiance', version: '3.0',
    short: '2pc: Healing +10% · 5pc: hồi máu→team ATK theo Off-Tune (max +25%)',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'healingBonus', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'atkPct', value: 25, uptime: 0.5 }] },
    ],
  }),
  set({
    id: 'rite-of-gilded-revelation', name: 'Rite of Gilded Revelation', element: 'spectro', version: '3.0',
    short: '2pc: Spectro +10% · 5pc: Basic→Spectro +10% x3; đủ stack+Lib→Basic +40%',
    bonuses: [elem2('spectroDmg'), { pieces: 5, stats: [{ stat: 'spectroDmg', value: 30, uptime: 0.7 }, { stat: 'basicAtk', value: 40, uptime: 0.5 }] }],
  }),
  set({
    id: 'trailblazing-star', name: 'Trailblazing Star', element: 'fusion', version: '3.1',
    short: '2pc: Fusion +10% · 5pc: Fusion Burst→CR +20%, Fusion +20%/8s',
    bonuses: [elem2('fusionDmg'), { pieces: 5, stats: [{ stat: 'critRate', value: 20, uptime: 0.6 }, { stat: 'fusionDmg', value: 20, uptime: 0.6 }] }],
  }),
  set({
    id: 'chromatic-foam', name: 'Chromatic Foam', element: 'fusion', version: '3.1',
    short: '2pc: Fusion +10% · 5pc: Burst→Fusion +10%; Outro→người vào +25% Fusion',
    bonuses: [elem2('fusionDmg'), { pieces: 5, stats: [{ stat: 'fusionDmg', value: 10, uptime: 0.7 }] }],
  }),
  set({
    id: 'sound-of-true-name', name: 'Sound of True Name', element: 'aero', version: '3.1',
    short: '2pc: Aero +10% · 5pc: Echo Skill→Echo Skill CR +20%, Aero +15%',
    bonuses: [elem2('aeroDmg'), { pieces: 5, stats: [{ stat: 'aeroDmg', value: 15, uptime: 0.6 }] }],
  }),
  // ── 3.3–3.5 ──
  set({
    id: 'wishes-of-quiet-snowfall', name: 'Wishes of Quiet Snowfall', element: 'glacio', version: '3.3',
    short: '2pc: Glacio +10% · 5pc: Glacio Chafe→Glacio +10% + cơ chế Snowfall (CR +25%)',
    bonuses: [elem2('glacioDmg'), { pieces: 5, stats: [{ stat: 'glacioDmg', value: 10, uptime: 0.7 }, { stat: 'critRate', value: 25, uptime: 0.5 }] }],
  }),
  set({
    id: 'reel-of-spliced-memories', name: 'Reel of Spliced Memories', version: '3.3',
    short: '2pc: ATK +10% · 5pc: Tune Rupture/Strain→team Tune Break Boost +20',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'atkPct', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [] }, // Tune Break Boost không quy được stat
    ],
  }),
  set({
    id: 'shadow-of-shattered-dreams', name: 'Shadow of Shattered Dreams (collab)', version: '3.4',
    short: '1pc: Hack-Shifting→Basic/Heavy +35%/15s',
    bonuses: [{ pieces: 1, stats: [{ stat: 'basicAtk', value: 35, uptime: 0.6 }, { stat: 'heavyAtk', value: 35, uptime: 0.6 }] }],
  }),
  set({
    id: 'song-of-feathered-trace', name: 'Song of Feathered Trace', version: '3.5',
    short: '2pc: ER +10% · 5pc: Havoc Bane→CR+20%,Heavy+25%; Glacio Chafe→team ATK theo ER',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'energyRegen', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'critRate', value: 20, uptime: 0.5 }, { stat: 'heavyAtk', value: 25, uptime: 0.5 }] },
    ],
  }),
  set({
    id: 'heart-of-evils-purge', name: "Heart of Evil's Purge", element: 'aero', version: '3.5',
    short: '2pc: Aero +10% · 5pc: Tune Strain→CD +20%, Aero +20%',
    bonuses: [elem2('aeroDmg'), { pieces: 5, stats: [{ stat: 'critDmg', value: 20, uptime: 0.6 }, { stat: 'aeroDmg', value: 20, uptime: 0.6 }] }],
  }),
  set({
    id: 'lamp-of-nether-road', name: 'Lamp of Nether Road', version: '3.5',
    short: '2pc: HP +10% · 5pc: Shield→CR +5% x4; max→Fusion +15%',
    bonuses: [
      { pieces: 2, stats: [{ stat: 'hpPct', value: 10, uptime: 1 }] },
      { pieces: 5, stats: [{ stat: 'critRate', value: 20, uptime: 0.5 }, { stat: 'fusionDmg', value: 15, uptime: 0.4 }] },
    ],
  }),
]

export const SONATA_BY_ID: Record<string, SonataSet> = Object.fromEntries(SONATA_SETS.map((s) => [s.id, s]))
