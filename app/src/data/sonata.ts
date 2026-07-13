import type { SonataSet } from '../types'

// Nguồn: research/echo-system.md §5 — đủ ~34 set tới bản 3.5.
// Version của vài set 2.5–2.8 là UNVERIFIED (tổng hợp cộng đồng).

export const SONATA_SETS: SonataSet[] = [
  // 1.0
  { id: 'freezing-frost', name: 'Freezing Frost', pieces: [2, 5], element: 'glacio', short: '2pc: Glacio +10% · 5pc: Glacio +10%/stack x3 sau Basic/Heavy', version: '1.0' },
  { id: 'molten-rift', name: 'Molten Rift', pieces: [2, 5], element: 'fusion', short: '2pc: Fusion +10% · 5pc: Fusion +30%/15s sau Skill', version: '1.0' },
  { id: 'void-thunder', name: 'Void Thunder', pieces: [2, 5], element: 'electro', short: '2pc: Electro +10% · 5pc: Electro +15% x2 sau Heavy/Skill', version: '1.0' },
  { id: 'sierra-gale', name: 'Sierra Gale', pieces: [2, 5], element: 'aero', short: '2pc: Aero +10% · 5pc: Aero +30%/15s sau Intro', version: '1.0' },
  { id: 'celestial-light', name: 'Celestial Light', pieces: [2, 5], element: 'spectro', short: '2pc: Spectro +10% · 5pc: Spectro +30%/15s sau Intro', version: '1.0' },
  { id: 'havoc-eclipse', name: 'Havoc Eclipse (Sun-sinking Eclipse)', pieces: [2, 5], element: 'havoc', short: '2pc: Havoc +10% · 5pc: Havoc +7.5% x4 sau Basic/Heavy', version: '1.0' },
  { id: 'rejuvenating-glow', name: 'Rejuvenating Glow', pieces: [2, 5], short: '2pc: Healing +10% · 5pc: hồi máu → team ATK +15%/30s', version: '1.0' },
  { id: 'moonlit-clouds', name: 'Moonlit Clouds', pieces: [2, 5], short: '2pc: ER +10% · 5pc: sau Outro, người kế tiếp ATK +22.5%/15s', version: '1.0' },
  { id: 'lingering-tunes', name: 'Lingering Tunes', pieces: [2, 5], short: '2pc: ATK +10% · 5pc: on-field ATK +5% x4; Outro DMG +60%', version: '1.0' },
  // 2.0
  { id: 'frosty-resolve', name: 'Frosty Resolve', pieces: [2, 5], element: 'glacio', short: '2pc: Skill DMG +12% · 5pc: Skill→Glacio +22.5%; Lib→Skill +18% x2', version: '2.0' },
  { id: 'eternal-radiance', name: 'Eternal Radiance', pieces: [2, 5], element: 'spectro', short: '2pc: Spectro +10% · 5pc: Frazzle→CR +20%; 10 stack→Spectro +15%', version: '2.0' },
  { id: 'midnight-veil', name: 'Midnight Veil', pieces: [2, 5], element: 'havoc', short: '2pc: Havoc +10% · 5pc: Outro nổ 480% Havoc; người vào +15% Havoc', version: '2.0' },
  { id: 'empyrean-anthem', name: 'Empyrean Anthem', pieces: [2, 5], short: '2pc: ER +10% · 5pc: Coordinated +80%; crit coord→ATK +20%', version: '2.0' },
  { id: 'tidebreaking-courage', name: 'Tidebreaking Courage', pieces: [2, 5], short: '2pc: ER +10% · 5pc: ATK +15%; ER≥250%→mọi Attribute DMG +30%', version: '2.0' },
  // 2.2–2.4
  { id: 'gusts-of-welkin', name: 'Gusts of Welkin', pieces: [2, 5], element: 'aero', short: '2pc: Aero +10% · 5pc: Aero Erosion→team Aero +15% (+15% người trigger)', version: '2.2' },
  { id: 'windward-pilgrimage', name: 'Windward Pilgrimage', pieces: [2, 5], element: 'aero', short: '2pc: Aero +10% · 5pc: trúng Aero Erosion→CR +10%, Aero +30%', version: '2.4' },
  { id: 'flaming-clawprint', name: 'Flaming Clawprint', pieces: [2, 5], element: 'fusion', short: '2pc: Fusion +10% · 5pc: Lib→team Fusion +15%, caster Lib +20%', version: '2.4' },
  // Set 3 mảnh (2.5–2.8, version UNVERIFIED chi tiết)
  { id: 'dream-of-the-lost', name: 'Dream of the Lost', pieces: [3], short: '3pc: 0 Energy→CR +20%, Echo Skill DMG +35%', version: '2.5' },
  { id: 'crown-of-valor', name: 'Crown of Valor', pieces: [3], short: '3pc: nhận Shield→ATK +6%, CD +4% x5', version: '2.6' },
  { id: 'law-of-harmony', name: 'Law of Harmony', pieces: [3], short: '3pc: Echo Skill→Heavy +30%; team Echo Skill DMG +4% x4', version: '2.6' },
  { id: 'flamewings-shadow', name: "Flamewing's Shadow", pieces: [3], element: 'fusion', short: '3pc: Echo Skill↔Heavy CR +20% chéo; cả hai→Fusion +16%', version: '2.7' },
  { id: 'thread-of-severed-fate', name: 'Thread of Severed Fate', pieces: [3], element: 'havoc', short: '3pc: Havoc Bane→ATK +20%, Lib DMG +30%', version: '2.8' },
  // 3.0–3.1
  { id: 'pact-of-neonlight-leap', name: 'Pact of Neonlight Leap', pieces: [2, 5], element: 'spectro', short: '2pc: Spectro +10% · 5pc: Outro→Intro ATK +15% + Tune Break Boost', version: '3.0' },
  { id: 'halo-of-starry-radiance', name: 'Halo of Starry Radiance', pieces: [2, 5], short: '2pc: Healing +10% · 5pc: hồi máu→team ATK theo Off-Tune (max +25%)', version: '3.0' },
  { id: 'rite-of-gilded-revelation', name: 'Rite of Gilded Revelation', pieces: [2, 5], element: 'spectro', short: '2pc: Spectro +10% · 5pc: Basic→Spectro +10% x3; đủ stack+Lib→Basic +40%', version: '3.0' },
  { id: 'trailblazing-star', name: 'Trailblazing Star', pieces: [2, 5], element: 'fusion', short: '2pc: Fusion +10% · 5pc: Fusion Burst→CR +20%, Fusion +20%/8s', version: '3.1' },
  { id: 'chromatic-foam', name: 'Chromatic Foam', pieces: [2, 5], element: 'fusion', short: '2pc: Fusion +10% · 5pc: Burst→Fusion +10%; Outro→người vào +25% Fusion', version: '3.1' },
  { id: 'sound-of-true-name', name: 'Sound of True Name', pieces: [2, 5], element: 'aero', short: '2pc: Aero +10% · 5pc: Echo Skill→Echo Skill CR +20%, Aero +15%', version: '3.1' },
  // 3.3–3.5
  { id: 'wishes-of-quiet-snowfall', name: 'Wishes of Quiet Snowfall', pieces: [2, 5], element: 'glacio', short: '2pc: Glacio +10% · 5pc: Glacio Chafe→Glacio +10% + cơ chế Snowfall (CR +25%)', version: '3.3' },
  { id: 'reel-of-spliced-memories', name: 'Reel of Spliced Memories', pieces: [2, 5], short: '2pc: ATK +10% · 5pc: Tune Rupture/Strain→team Tune Break Boost +20', version: '3.3' },
  { id: 'shadow-of-shattered-dreams', name: 'Shadow of Shattered Dreams (collab)', pieces: [1], short: '1pc: Hack-Shifting→Basic/Heavy +35%/15s', version: '3.4' },
  { id: 'song-of-feathered-trace', name: 'Song of Feathered Trace', pieces: [2, 5], short: '2pc: ER +10% · 5pc: Havoc Bane→CR+20%,Heavy+25%; Glacio Chafe→team ATK theo ER', version: '3.5' },
  { id: 'heart-of-evils-purge', name: "Heart of Evil's Purge", pieces: [2, 5], element: 'aero', short: '2pc: Aero +10% · 5pc: Tune Strain→CD +20%, Aero +20%', version: '3.5' },
  { id: 'lamp-of-nether-road', name: 'Lamp of Nether Road', pieces: [2, 5], short: '2pc: HP +10% · 5pc: Shield→CR +5% x4; max→Fusion +15%', version: '3.5' },
]

export const SONATA_BY_ID: Record<string, SonataSet> = Object.fromEntries(SONATA_SETS.map((s) => [s.id, s]))
