// Preview SetPicker — dropdown chọn set echo, set đề cử gắn ⭐ lên đầu, icon fallback chấm màu.
import { SetPicker } from 'app'
import { useEffect, useRef, type ReactNode } from 'react'

const noop = () => {}

/** Bấm nút trigger sau khi mount để chụp popover mở */
function AutoOpen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector('button')?.click() }, [])
  return <div ref={ref}>{children}</div>
}

/** Trigger đóng — đang chọn Havoc Eclipse (icon + tên) */
export const Closed = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 320 }}>
    <SetPicker value="havoc-eclipse" onChange={noop} preferred={['havoc-eclipse']} />
  </div>
)

/** Popover mở — nhóm "⭐ Set đề cử" trên cùng rồi tới các set khác */
export const Open = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: '16px 16px 420px', minWidth: 380 }}>
    <AutoOpen>
      <SetPicker value="" onChange={noop} preferred={['havoc-eclipse', 'moonlit-clouds']} />
    </AutoOpen>
  </div>
)
