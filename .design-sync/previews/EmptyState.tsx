// Preview EmptyState — onboarding kho trống: 3 lối nạp kho + tóm tắt luồng 3 bước.
import { EmptyState } from 'app'

const noop = () => {}

/** Màn hình lần đầu — nút OCR (primary sky) + JSON + demo */
export const FirstRun = () => (
  <div style={{ background: '#020617', borderRadius: 8, padding: 16, maxWidth: 640 }}>
    <EmptyState onOcr={noop} onImportJson={noop} onDemo={noop} />
  </div>
)
