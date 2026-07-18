// Preview BestOwnerBadge — "echo này hợp ai nhất": chip #1 + popover top-3 (điểm theo engine).
import { BestOwnerBadge } from 'app'
import { useEffect, useRef, type ReactNode } from 'react'
import { CHARACTER_BY_ID } from '../../app/src/data/characters'

const owners = [
  { profile: CHARACTER_BY_ID['camellya'], totalScore: 149.9, fitLevel: 1, setMatch: true },
  { profile: CHARACTER_BY_ID['changli'], totalScore: 121.4, fitLevel: 1, setMatch: false },
  { profile: CHARACTER_BY_ID['jinhsi'], totalScore: 98.2, fitLevel: 0.6, setMatch: false },
]

/** Bấm button thứ n sau khi mount (0-based) — mở popover "+n" */
function AutoOpen({ index = 0, children }: { index?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelectorAll('button')[index]?.click() }, [index])
  return <div ref={ref}>{children}</div>
}

/** Variant 'card' — chỉ chip #1 cho chân EchoCard */
export const CardChip = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, display: 'flex', gap: 12 }}>
    <BestOwnerBadge owners={owners} variant="card" />
  </div>
)

/** Variant 'cell' với popover top-3 mở — dot nguyên tố + ⭐ set khớp + điểm */
export const CellPopoverOpen = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: '16px 16px 170px' }}>
    <AutoOpen index={1}>
      <BestOwnerBadge owners={owners} />
    </AutoOpen>
  </div>
)
