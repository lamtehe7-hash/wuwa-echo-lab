// Preview Stale — overlay "kết quả cũ" mờ + banner Giải lại khi kho/trọng số đổi sau solve.
import { Stale } from 'app'

const noop = () => {}

const MockResult = () => (
  <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 12, fontSize: 12 }}>
    <div style={{ fontWeight: 600, marginBottom: 6 }}>Bộ 5 tối ưu — Camellya</div>
    <div>Tổng điểm: 486.2 · Havoc Eclipse 5/5</div>
    <div style={{ color: '#94a3b8', marginTop: 4 }}>Dreamless +25 · Crownless +25 · 3 echo cost thấp…</div>
  </div>
)

/** stale=true: kết quả mờ đi + banner amber "Giải lại" đè giữa */
export const StaleOverlay = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 380 }}>
    <Stale stale onResolve={noop}><MockResult /></Stale>
  </div>
)

/** stale=false: children hiển thị nguyên trạng (passthrough) */
export const Fresh = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 380 }}>
    <Stale stale={false} onResolve={noop}><MockResult /></Stale>
  </div>
)
