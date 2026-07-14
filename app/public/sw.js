// Service worker TỰ VIẾT (không Workbox/plugin — giữ deps tối giản như phần còn lại của dự án).
// Mục tiêu: app cài đặt được (PWA) + chạy offline sau lần mở đầu. App vốn 100% client-side và đã
// tự chứa tài nguyên OCR nên chỉ cần cache same-origin là đủ dùng khi mất mạng.
//
// Chiến lược:
//  - Điều hướng (HTML): network-first → offline trả bản shell đã cache (app dùng hash-routing nên
//    URL điều hướng luôn là trang gốc, cache theo request là đủ).
//  - Tài nguyên same-origin khác (JS/CSS/svg/tesseract core+langdata...): stale-while-revalidate —
//    trả cache ngay, âm thầm cập nhật nền cho lần sau.
//  - Bỏ qua request KHÔNG-GET và CROSS-ORIGIN (vd icon game8 CDN) — để trình duyệt xử lý bình thường,
//    không giữ ảnh bên thứ ba trong cache.
//
// Đổi CACHE khi logic cache thay đổi để activate dọn bản cũ. skipWaiting + clients.claim để bản SW
// mới nắm quyền ngay lần mở kế tiếp (tránh phục vụ asset cũ lẫn mới).

const CACHE = 'wuwa-echo-cache-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // CDN ngoài (icon game8) → mặc định trình duyệt

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          // Chỉ cache bản điều hướng THÀNH CÔNG — tránh giữ trang lỗi 4xx/5xx (Pages hiccup, captive
          // portal) làm shell offline (fetch resolve cả khi status lỗi; cache.put không tự lọc theo ok).
          if (fresh && fresh.ok) {
            const cache = await caches.open(CACHE)
            cache.put(req, fresh.clone())
          }
          return fresh
        } catch {
          const cache = await caches.open(CACHE)
          const cached = await cache.match(req)
          return cached || (await cache.match(new URL('./', self.location.href).href)) || Response.error()
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })(),
  )
})
