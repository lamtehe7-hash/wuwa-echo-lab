// PRNG tái lập được (mulberry32) — dùng chung engine (economy.ts MC P10/P90) + test fuzz
// (solver.test.ts). KHÔNG dùng Math.random trong engine/test: kết quả phải tái lập giữa các
// lần chạy (task 76 — trước đây 2 bản chép y hệt ở economy.ts + solver.test.ts).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
