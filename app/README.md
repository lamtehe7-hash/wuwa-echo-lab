# WuWa Echo Optimizer — app

Ứng dụng web (Vite + React 19 + TypeScript + Tailwind v4). Xem giới thiệu tính năng và disclaimer
đầy đủ ở [README gốc](../README.md).

## Lệnh

```bash
npm install         # cài dependency (chỉ cần chạy lại khi package.json đổi)
npm run dev         # dev server (Vite), mặc định http://localhost:5173
npm run build       # build production: tsc -b && vite build -> dist/
npm run preview     # xem thử bản build ở dist/
npm run lint        # oxlint

npm test            # unit tests (vitest): src/engine/*.test.ts
npx -y tsx scripts/smoke.ts     # smoke test engine (score/solver/roster), không cần trình duyệt
npx -y tsx scripts/ocr-test.ts  # test parser OCR trên fixture text
```

## Ghi chú build cho GitHub Pages

`vite.config.ts` đã đặt `base: './'` (đường dẫn asset tương đối) nên `npm run build` ra `dist/` có
thể deploy thẳng lên GitHub Pages mà không cần cấu hình thêm — xem
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) và [`../DEPLOY.md`](../DEPLOY.md).
