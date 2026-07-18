// Preview EchoLine — fragment "icon + Tên · cost N · Set" cho list dạng dòng (Cleanup/UpgradePlan).
import { EchoLine } from 'app'
import type { Echo } from '../../app/src/types'

const mk = (name: string, cost: 1 | 3 | 4, set: string): Echo => ({
  id: 'preview-' + name, name, cost, set, rarity: 5, level: 25, mainStat: 'atkPct', substats: [],
})

const rows: Echo[] = [
  mk('Dreamless', 4, 'havoc-eclipse'),
  mk('Bell-Borne Geochelone', 4, 'rejuvenating-glow'),
  mk('Fusion Warrior', 1, 'molten-rift'),
]

/** 3 dòng list — nơi gọi tự bọc flex row (EchoLine là fragment) */
export const Rows = () => (
  <ul style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 360, margin: 0, listStyle: 'none' }}>
    {rows.map((e) => (
      <li key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
        <EchoLine echo={e} />
      </li>
    ))}
  </ul>
)
