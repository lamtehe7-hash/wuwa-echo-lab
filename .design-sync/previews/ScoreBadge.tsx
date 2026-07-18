// Preview ScoreBadge — điểm echo bấm được (S–D grade + popover breakdown từng substat).
// Điểm tính bằng engine thật (scoreEcho) trên dữ liệu echo thật để con số/hạng chân thực.
import { ScoreBadge } from 'app'
import { useEffect, useRef, type ReactNode } from 'react'
import { CHARACTER_BY_ID } from '../../app/src/data/characters'
import { scoreEcho } from '../../app/src/engine/score'
import type { Echo } from '../../app/src/types'

const camellya = CHARACTER_BY_ID['camellya']

const godRoll: Echo = {
  id: 'preview-god-roll',
  name: 'Dreamless',
  cost: 4,
  set: 'havoc-eclipse',
  rarity: 5,
  level: 25,
  mainStat: 'critRate',
  substats: [
    { stat: 'critDmg', value: 21.0 },
    { stat: 'critRate', value: 9.9 },
    { stat: 'atkPct', value: 10.9 },
    { stat: 'basicAtk', value: 10.1 },
    { stat: 'atk', value: 60 },
  ],
}

const midRoll: Echo = {
  id: 'preview-mid-roll',
  name: 'Crownless',
  cost: 4,
  set: 'havoc-eclipse',
  rarity: 5,
  level: 25,
  mainStat: 'critDmg',
  substats: [
    { stat: 'critRate', value: 6.9 },
    { stat: 'atkPct', value: 7.9 },
    { stat: 'hp', value: 430 },
    { stat: 'energyRegen', value: 7.6 },
    { stat: 'defPct', value: 9.0 },
  ],
}

const badRoll: Echo = {
  id: 'preview-bad-roll',
  name: 'Fusion Warrior',
  cost: 1,
  set: 'molten-rift',
  rarity: 5,
  level: 25,
  mainStat: 'atkPct',
  substats: [
    { stat: 'atk', value: 30 },
    { stat: 'energyRegen', value: 6.8 },
    { stat: 'hp', value: 320 },
  ],
}

/** Bấm phần tử con đầu tiên sau khi mount — chụp được trạng thái popover mở */
function AutoOpen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector('button')?.click() }, [])
  return <div ref={ref}>{children}</div>
}

const row = { display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' } as const

/** Variant 'table' — số to trong ô bảng xếp hạng, kèm hạng chữ S–D theo profile */
export const TableVariant = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 360 }}>
    <div style={row}><span style={{ width: 130 }}>Dreamless</span><ScoreBadge r={scoreEcho(godRoll, camellya)} profile={camellya} /></div>
    <div style={row}><span style={{ width: 130 }}>Crownless</span><ScoreBadge r={scoreEcho(midRoll, camellya)} profile={camellya} /></div>
    <div style={row}><span style={{ width: 130 }}>Fusion Warrior</span><ScoreBadge r={scoreEcho(badRoll, camellya)} profile={camellya} /></div>
  </div>
)

/** Variant 'badge' — chip nhỏ đặt ở chân EchoCard / lưới loadout */
export const BadgeVariant = () => (
  <div style={{ background: '#020617', borderRadius: 8, display: 'flex', gap: 10, padding: 16 }}>
    <ScoreBadge r={scoreEcho(godRoll, camellya)} variant="badge" profile={camellya} />
    <ScoreBadge r={scoreEcho(midRoll, camellya)} variant="badge" profile={camellya} />
  </div>
)

/** Popover breakdown mở — thanh đóng góp từng substat + dòng main + công thức tổng */
export const BreakdownOpen = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: '16px 16px 340px' }}>
    <AutoOpen>
      <ScoreBadge r={scoreEcho(godRoll, camellya)} profile={camellya} />
    </AutoOpen>
  </div>
)
