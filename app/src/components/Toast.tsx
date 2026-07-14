import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'

// Toast không chặn luồng thay cho window.alert/confirm: thông báo góc màn hình, tự tắt,
// kèm nút hành động tuỳ chọn (vd "Hoàn tác" khi xoá echo — xoá ngay + cho phép hồi thay vì hỏi trước).

export interface ToastAction {
  label: string
  fn: () => void
}

interface ToastItem {
  id: number
  text: string
  kind: 'info' | 'error'
  action?: ToastAction
}

type PushToast = (text: string, opts?: { action?: ToastAction; kind?: 'info' | 'error' }) => void

const Ctx = createContext<PushToast | null>(null)

const AUTO_DISMISS_MS = 6000
const MAX_STACK = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const push = useCallback<PushToast>((text, opts) => {
    const id = nextId.current++
    setToasts((prev) => [...prev.slice(1 - MAX_STACK), { id, text, kind: opts?.kind ?? 'info', action: opts?.action }])
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-4"
        aria-live="polite"
      >
        {toasts.map((x) => (
          <div
            key={x.id}
            className={`pointer-events-auto flex max-w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-lg ${
              x.kind === 'error'
                ? 'border-rose-800 bg-rose-950/95 text-rose-200'
                : 'border-slate-700 bg-slate-800/95 text-slate-200'
            }`}
          >
            <span className="min-w-0">{x.text}</span>
            {x.action && (
              <button
                type="button"
                className="shrink-0 font-semibold text-sky-400 hover:text-sky-300"
                onClick={() => { x.action!.fn(); dismiss(x.id) }}
              >{x.action.label}</button>
            )}
            <button
              type="button"
              className="shrink-0 text-slate-500 hover:text-slate-300"
              aria-label={t('common.close')}
              onClick={() => dismiss(x.id)}
            >✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

/** Hàm đẩy toast: push(text, { action?, kind? }) */
export function useToast(): PushToast {
  const push = useContext(Ctx)
  if (!push) throw new Error('useToast phải nằm trong <ToastProvider>')
  return push
}
