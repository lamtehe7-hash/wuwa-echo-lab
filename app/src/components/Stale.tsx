import type { ReactNode } from 'react'
import { useT } from '../i18n'

// Kho/trọng số đổi sau khi solve → kết quả cũ KHÔNG biến mất nữa mà mờ đi + banner "Giải lại"
// (trước đây xoá ngay làm user tưởng mất kết quả). Dùng ở: LoadoutView (App) + RosterPanel.

export default function Stale({ stale, onResolve, children }: {
  stale: boolean
  onResolve: () => void
  children: ReactNode
}) {
  const t = useT()
  if (!stale) return <>{children}</>
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-950/40">
        <div className="flex flex-col items-center gap-2 rounded-lg border border-amber-700/60 bg-slate-900/95 px-4 py-3 text-center shadow-lg">
          <span className="text-xs text-amber-300">{t('stale.notice')}</span>
          <button
            type="button"
            className="rounded bg-emerald-700 px-3 py-1 text-sm font-semibold hover:bg-emerald-600"
            onClick={onResolve}
          >{t('stale.resolve')}</button>
        </div>
      </div>
    </div>
  )
}
