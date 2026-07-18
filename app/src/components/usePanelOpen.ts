import { useState, type SyntheticEvent } from 'react'

// P6 (ui-redesign): <details> panel nhớ trạng thái mở/đóng qua localStorage `wuwa-panel-<id>`
// — vào lại trang giữ đúng panel đã mở. Dùng: const panel = usePanelOpen('cleanup')
// rồi <details {...panel}>. KHÔNG áp cho <details> theo member (RosterPanel — chủ ý
// không persist, task 60 U3) hay khối phụ trong form.
export function usePanelOpen(id: string, defaultOpen = false) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(`wuwa-panel-${id}`)
      if (saved === '1') return true
      if (saved === '0') return false
    } catch { /* storage bị chặn — dùng mặc định */ }
    return defaultOpen
  })
  const onToggle = (e: SyntheticEvent<HTMLDetailsElement>) => {
    const v = e.currentTarget.open
    setOpen(v)
    try { localStorage.setItem(`wuwa-panel-${id}`, v ? '1' : '0') } catch { /* ignore */ }
  }
  return { open, onToggle }
}
