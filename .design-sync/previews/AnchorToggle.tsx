// Preview AnchorToggle — nút ⚓ neo echo vào bộ solve (amber khi active, mờ khi bị chặn).
import { AnchorToggle } from 'app'

const noop = () => {}
const cell = { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' } as const

/** 3 trạng thái: đã neo (nền amber) / chưa neo / bị chặn (đủ 5 echo) */
export const States = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 300 }}>
    <div style={cell}><AnchorToggle anchored onToggle={noop} /><span style={{ fontSize: 12 }}>Đã neo</span></div>
    <div style={cell}><AnchorToggle anchored={false} onToggle={noop} /><span style={{ fontSize: 12 }}>Chưa neo</span></div>
    <div style={cell}><AnchorToggle anchored={false} blockReason="Đã neo đủ 5 echo" onToggle={noop} /><span style={{ fontSize: 12, opacity: 0.6 }}>Bị chặn (đủ 5)</span></div>
  </div>
)
