import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { I18nProvider } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// PWA: đăng ký service worker để app cài đặt được + chạy offline. CHỈ ở production —
// dev server (Vite HMR) không nên bị SW cache che khuất. Đường dẫn theo BASE_URL nên chạy
// đúng cả trên Pages subpath lẫn bản portable (root). Lỗi đăng ký thì bỏ qua (app vẫn chạy online).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
