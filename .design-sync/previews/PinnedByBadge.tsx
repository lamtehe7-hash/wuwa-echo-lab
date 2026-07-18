// Preview PinnedByBadge — nhãn "đang ghim bởi X" (chip đầy đủ / icon chỗ chật).
import { PinnedByBadge } from 'app'

const one = [{ id: 'camellya', name: 'Camellya', element: 'havoc' }]
const three = [
  { id: 'camellya', name: 'Camellya', element: 'havoc' },
  { id: 'changli', name: 'Changli', element: 'fusion' },
  { id: 'jinhsi', name: 'Jinhsi', element: 'spectro' },
]

const cell = { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 } as const

/** Variant 'chip': dot nguyên tố + tên; nhiều người ghim → "+n nữa" */
export const ChipVariant = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 320 }}>
    <div style={cell}><PinnedByBadge owners={one} /><span style={{ color: '#64748b' }}>1 người ghim</span></div>
    <div style={cell}><PinnedByBadge owners={three} /><span style={{ color: '#64748b' }}>3 người ghim</span></div>
  </div>
)

/** Variant 'icon' cho chân card lưới: chỉ 📌 + số */
export const IconVariant = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 320, display: 'flex', gap: 16 }}>
    <PinnedByBadge owners={one} variant="icon" />
    <PinnedByBadge owners={three} variant="icon" />
  </div>
)
