import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DICT } from './i18n'

// Review 19/07: t(key) nhận string TRẦN (không phải keyof DICT) — gõ nhầm key thì tsc vẫn sạch,
// vitest không render component nào, và UI hiện nguyên key thô cho user. Test này scan TĨNH mọi
// key literal 'xxx.yyy' trong lời gọi t('...') / tm phải có key / params key của component + App +
// engine (LocMessage), đối chiếu DICT. Chỉ bắt literal trong dấu nháy — key động (biến/template)
// nằm ngoài phạm vi (hiếm, đã có test riêng theo tính năng).

const SRC = dirname(fileURLToPath(import.meta.url))

/** Toàn bộ file nguồn cần scan: components/*.tsx + App.tsx + engine/*.ts + ocr/*.ts + data/*.ts */
function sourceFiles(): string[] {
  const out: string[] = [join(SRC, 'App.tsx')]
  for (const dir of ['components', 'engine', 'ocr', 'data']) {
    for (const f of readdirSync(join(SRC, dir))) {
      if (/\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(join(SRC, dir, f))
    }
  }
  return out
}

/** Lấy key literal từ: t('key'), t("key"), key: 'key' (LocMessage push), { key: 'key', params } */
function extractKeys(src: string): string[] {
  const keys: string[] = []
  // t('...') hoặc t("...") — chỉ nhận key dạng namespace.name (có dấu chấm) để tránh bắt nhầm chuỗi thường
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+)'/g)) keys.push(m[1])
  for (const m of src.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+)"/g)) keys.push(m[1])
  // LocMessage literal: key: 'xxx.yyy' (engine/ocr/data trả message cho UI dịch)
  for (const m of src.matchAll(/\bkey:\s*'([a-zA-Z0-9_.]+\.[a-zA-Z0-9_.]+)'/g)) keys.push(m[1])
  return keys
}

describe('i18n key literal ↔ DICT (chống key mồ côi hiện thô ra UI)', () => {
  it('mọi key literal dùng trong nguồn đều tồn tại trong DICT', () => {
    const missing: string[] = []
    for (const file of sourceFiles()) {
      const src = readFileSync(file, 'utf8')
      for (const key of extractKeys(src)) {
        if (!(key in DICT)) missing.push(`${key} (${file.slice(SRC.length + 1)})`)
      }
    }
    expect(missing, `Key không có trong DICT:\n${missing.join('\n')}`).toEqual([])
  })

  it('mọi entry DICT có đủ bản vi + en không rỗng', () => {
    const bad = Object.entries(DICT).filter(([, e]) => !e.vi?.trim() || !e.en?.trim()).map(([k]) => k)
    expect(bad).toEqual([])
  })
})
