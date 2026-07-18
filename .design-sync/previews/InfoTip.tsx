// Preview InfoTip — nút ⓘ bấm được mở popover giải thích (thay tooltip hover-only).
import { InfoTip } from 'app'
import { useEffect, useRef, type ReactNode } from 'react'

/** Bấm nút ⓘ sau khi mount — chụp được trạng thái popover mở */
function AutoOpen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector('button')?.click() }, [])
  return <div ref={ref}>{children}</div>
}

/** ⓘ đặt cạnh nhãn trong một dòng setting — trạng thái đóng */
export const InlineHint = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
    <span>RV%</span>
    <InfoTip label="RV là gì?">
      <span>RV (Roll Value) = chất lượng roll trung bình của các substat, 100% là roll max.</span>
    </InfoTip>
  </div>
)

/** Popover mở — nội dung giải thích nhiều dòng */
export const OpenPopover = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: '16px 16px 140px' }}>
    <AutoOpen>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span>Điểm tối ưu</span>
        <InfoTip label="Cách tính điểm">
          <span style={{ display: 'block' }}>Điểm = tổng trọng số substat × chất lượng roll, cộng điểm main stat.</span>
          <span style={{ display: 'block' }}>Trọng số lấy theo build meta của từng nhân vật — chỉnh được trong Weight Editor.</span>
        </InfoTip>
      </span>
    </AutoOpen>
  </div>
)
