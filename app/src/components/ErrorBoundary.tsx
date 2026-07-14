import { Component, type ErrorInfo, type ReactNode } from 'react'

// Error boundary bọc TOÀN BỘ app (ngoài cả I18nProvider) để một lỗi render bất kỳ không làm
// trắng màn hình câm. Phải là class component (React chỉ hỗ trợ error boundary kiểu class).
// Vì nằm ngoài i18n nên tự đọc ngôn ngữ trực tiếp từ localStorage ('wuwa-lang') — không phụ
// thuộc provider (đề phòng chính provider là thứ ném lỗi). App hoàn toàn client-side nên chỉ
// log ra console, không gửi lỗi đi đâu.

const TEXT = {
  vi: {
    title: 'Ứng dụng gặp lỗi',
    body: 'Đã xảy ra lỗi ngoài dự kiến khi hiển thị. Dữ liệu kho echo của bạn vẫn được lưu an toàn trong trình duyệt — thử tải lại trang.',
    reload: 'Tải lại trang',
    details: 'Chi tiết lỗi (cho nhà phát triển)',
  },
  en: {
    title: 'Something went wrong',
    body: 'An unexpected rendering error occurred. Your saved echo inventory is still safe in this browser — try reloading the page.',
    reload: 'Reload page',
    details: 'Error details (for developers)',
  },
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WuWa Echo] Uncaught render error:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const lang = typeof localStorage !== 'undefined' && localStorage.getItem('wuwa-lang') === 'en' ? 'en' : 'vi'
    const s = TEXT[lang]
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-200">
        <div className="w-full max-w-lg space-y-4 rounded-xl border border-rose-900/60 bg-slate-900 p-6">
          <h1 className="text-lg font-bold text-rose-400">⚠ {s.title}</h1>
          <p className="text-sm text-slate-400">{s.body}</p>
          <button
            type="button"
            className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            onClick={() => location.reload()}
          >{s.reload}</button>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer select-none">{s.details}</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-[11px] text-rose-300">
              {error.message}{error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
