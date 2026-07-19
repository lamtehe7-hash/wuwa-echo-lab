import { defineConfig } from 'vitest/config'

// Unit test config cho engine (score/solver/roster) — không cần DOM, chạy thuần Node.
// include gồm cả .test.tsx (review 19/07): trước đây file .test.tsx bị glob BỎ QUA IM LẶNG —
// contributor thêm test component tưởng đã chạy mà thực ra chưa bao giờ. Giờ nó ĐƯỢC chạy và
// sẽ fail to tiếng nếu cần DOM (environment node) → người thêm biết ngay phải cấu hình jsdom.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
