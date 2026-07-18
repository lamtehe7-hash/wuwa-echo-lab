// Preview ToastProvider — toast góc màn hình (info + error kèm nút Hoàn tác), tự tắt sau 6s.
// Wrapper cao gần full viewport để vùng crop chứa được toast (position:fixed đáy màn hình).
import { ToastProvider, useToast } from 'app'
import { useEffect } from 'react'

function PushOnMount() {
  const push = useToast()
  useEffect(() => {
    push('Đã lưu 12 echo vào kho', { action: { label: 'Hoàn tác', fn: () => {} } })
    push('Không lưu được vào bộ nhớ trình duyệt — hãy Export JSON để sao lưu.', { kind: 'error' })
  }, [push])
  return (
    <div style={{ padding: 16, fontSize: 13, color: '#94a3b8' }}>
      Nội dung app phía sau — toast nổi ở đáy màn hình, không chặn thao tác.
    </div>
  )
}

/** Stack 2 toast: info kèm nút Hoàn tác + error (rose) */
export const ToastStack = () => (
  <div style={{ background: '#020617', borderRadius: 8, minHeight: '88vh' }}>
    <ToastProvider>
      <PushOnMount />
    </ToastProvider>
  </div>
)
