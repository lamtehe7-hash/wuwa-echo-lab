// Preview StatBreakdown — bảng cộng dồn chỉ số cuối theo nguồn (base+vũ khí+forte+echo+buff).
import { StatBreakdown } from 'app'
import { CHARACTER_BY_ID } from '../../app/src/data/characters'
import type { Echo } from '../../app/src/types'

const camellya = CHARACTER_BY_ID['camellya']

const echoes: Echo[] = [
  {
    id: 'p1', name: 'Dreamless', cost: 4, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'critRate',
    substats: [
      { stat: 'critDmg', value: 21.0 },
      { stat: 'critRate', value: 8.7 },
      { stat: 'atkPct', value: 10.9 },
      { stat: 'basicAtk', value: 9.4 },
      { stat: 'atk', value: 50 },
    ],
  },
  {
    id: 'p2', name: 'Crownless', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg',
    substats: [
      { stat: 'critRate', value: 7.5 },
      { stat: 'atkPct', value: 8.6 },
      { stat: 'energyRegen', value: 8.4 },
    ],
  },
  {
    id: 'p3', name: 'Fusion Warrior', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct',
    substats: [
      { stat: 'critDmg', value: 15.0 },
      { stat: 'atk', value: 40 },
    ],
  },
]

/** Bảng mở sẵn — cột màu theo nguồn, '·' = 0, tổng đậm bên phải */
export const BreakdownTable = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 560 }}>
    <StatBreakdown echoes={echoes} profile={camellya} activeSet="havoc-eclipse" defaultOpen />
  </div>
)
