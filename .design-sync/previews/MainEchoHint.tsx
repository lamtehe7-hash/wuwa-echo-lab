// Preview MainEchoHint — banner "main echo đề cử" cho nhân vật (data thật từ mainEchoes.ts).
import { MainEchoHint } from 'app'

/** Mở rộng: danh sách đề cử + lý do, ✓ echo đang có trong kho */
export const Expanded = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 520 }}>
    <MainEchoHint charId="camellya" ownedNames={new Set(['dreamless'])} />
  </div>
)

/** Thu gọn (đã chọn set): còn 1 dòng tóm tắt BiS, bấm để mở lại */
export const Collapsed = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 520 }}>
    <MainEchoHint charId="camellya" hasSelectedSet />
  </div>
)
