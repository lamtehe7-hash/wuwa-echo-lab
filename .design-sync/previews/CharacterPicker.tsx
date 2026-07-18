// Preview CharacterPicker — chọn nhân vật dạng popover lưới chip nhóm theo nguyên tố.
import { CharacterPicker } from 'app'
import { useEffect, useRef, type ReactNode } from 'react'

const noop = () => {}

/** Bấm nút trigger sau khi mount để chụp popover mở */
function AutoOpen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector('button')?.click() }, [])
  return <div ref={ref}>{children}</div>
}

/** Trigger đóng — dot nguyên tố + tên + dấu ＊ (đã chỉnh trọng số riêng) */
export const Closed = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, display: 'flex', gap: 12 }}>
    <CharacterPicker value="camellya" onChange={noop} overrides={{}} />
    <CharacterPicker value="changli" onChange={noop} overrides={{ changli: { weights: { critRate: 1 } } }} />
  </div>
)

/** Popover mở — ô tìm kiếm + lưới chip nhóm theo nguyên tố, role badge */
export const Open = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: '16px 16px 460px', minWidth: 620 }}>
    <AutoOpen>
      <CharacterPicker value="camellya" onChange={noop} overrides={{}} />
    </AutoOpen>
  </div>
)
