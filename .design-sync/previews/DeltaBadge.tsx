// Preview DeltaBadge — chip delta ▲/▼/＝ dùng chung mọi chỗ hiện chênh lệch điểm.
import { DeltaBadge } from 'app'

const cell = { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 } as const

/** 3 mức: tăng (emerald) / giảm (rose) / không đổi trong epsilon ±0.05 (slate) */
export const Deltas = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 300 }}>
    <div style={cell}><DeltaBadge delta={12.4} /><span>So với bộ đang đeo</span></div>
    <div style={cell}><DeltaBadge delta={-3.8} /><span>Sau khi bỏ echo neo</span></div>
    <div style={cell}><DeltaBadge delta={0.02} /><span>Trong ngưỡng ±0.05</span></div>
  </div>
)
