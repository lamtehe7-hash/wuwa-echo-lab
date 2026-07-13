import { defineConfig } from 'vitest/config'

// Unit test config cho engine (score/solver/roster) — không cần DOM, chạy thuần Node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
