import { describe, it, expect, beforeEach } from 'vitest'
import type { Echo } from './types'
import { importJson, loadEchoes, loadIdMap, loadVaults, mergeProfile, sanitizeEcho, saveEchoes } from './store'
import { CHARACTER_BY_ID } from './data/characters'

// Review 19/07: store.ts là đường sống còn của app client-side-only (mất localStorage = mất kho)
// nhưng trước đây KHÔNG có unit test nào — chỉ được cover gián tiếp qua importScanner.test.ts.
// Test này khoá: roundtrip echoes, di trú key cũ → vault, recovery registry hỏng, sanitizeEcho,
// guard hình dạng loadIdMap (fix crash render), importJson, mergeProfile.
//
// Các key literal dưới đây là HỢP ĐỒNG schema localStorage — đổi key là mất dữ liệu người dùng cũ,
// test hard-code chuỗi (không import helper) để đổi-key-vô-tình fail to tiếng.

class MemStorage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  key(i: number) { return [...this.m.keys()][i] ?? null }
}

beforeEach(() => {
  ;(globalThis as { localStorage?: unknown }).localStorage = new MemStorage()
})

const validEcho = (over: Partial<Echo> = {}): Echo => ({
  id: 'e1', cost: 1, set: 'freezing-frost', rarity: 5, level: 25,
  mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 8.7 }],
  ...over,
})

describe('saveEchoes/loadEchoes: roundtrip theo vault', () => {
  it('lưu rồi đọc lại đúng kho, tách biệt giữa 2 vault', () => {
    saveEchoes('main', [validEcho()])
    saveEchoes('alt', [validEcho({ id: 'e2' }), validEcho({ id: 'e3' })])
    expect(loadEchoes('main')).toHaveLength(1)
    expect(loadEchoes('alt')).toHaveLength(2)
    expect(loadEchoes('khong-ton-tai')).toEqual([])
  })

  it('JSON hỏng trong storage → [] (không throw)', () => {
    localStorage.setItem('wuwa-echo-optimizer:v1:main', '{broken')
    expect(loadEchoes('main')).toEqual([])
  })
})

describe('loadVaults: di trú key cũ + recovery registry hỏng', () => {
  it('lần đầu (không registry): tạo vault main + DI TRÚ dữ liệu key cũ chưa namespace', () => {
    const oldData = JSON.stringify({ version: 1, echoes: [validEcho()] })
    localStorage.setItem('wuwa-echo-optimizer:v1', oldData) // key CŨ 1-vault
    const s = loadVaults()
    expect(s.vaults.map((v) => v.id)).toEqual(['main'])
    expect(s.activeId).toBe('main')
    expect(localStorage.getItem('wuwa-echo-optimizer:v1:main')).toBe(oldData) // kho cũ không mất
  })

  it('registry hỏng nhưng kho namespaced còn → dựng lại danh sách vault (main đứng đầu)', () => {
    localStorage.setItem('wuwa-echo-optimizer:vaults:v1', '{broken')
    localStorage.setItem('wuwa-echo-optimizer:v1:alt2', JSON.stringify({ version: 1, echoes: [] }))
    localStorage.setItem('wuwa-echo-optimizer:v1:main', JSON.stringify({ version: 1, echoes: [validEcho()] }))
    const s = loadVaults()
    expect(s.vaults.map((v) => v.id)).toEqual(['main', 'alt2'])
    expect(s.activeId).toBe('main')
  })

  it('registry hợp lệ → giữ nguyên', () => {
    const state = { vaults: [{ id: 'x', name: 'X' }], activeId: 'x' }
    localStorage.setItem('wuwa-echo-optimizer:vaults:v1', JSON.stringify(state))
    expect(loadVaults()).toEqual(state)
  })
})

describe('sanitizeEcho: validate + snap từ file ngoài', () => {
  const seen = () => new Set<string>()

  it('echo hợp lệ giữ nguyên; substat snap về mốc gần nhất (≤5%)', () => {
    const e = sanitizeEcho(validEcho({ substats: [{ stat: 'critRate', value: 8.6 }] }), seen())!
    expect(e.substats).toEqual([{ stat: 'critRate', value: 8.7 }])
  })

  it('cost lạ / main không hợp lệ với cost / substat rác >5% → loại', () => {
    expect(sanitizeEcho(validEcho({ cost: 2 as never }), seen())).toBeNull()
    expect(sanitizeEcho(validEcho({ mainStat: 'critRate' as never }), seen())).toBeNull() // critRate không phải main cost-1
    const e = sanitizeEcho(validEcho({ substats: [{ stat: 'critRate', value: 999 }] }), seen())!
    expect(e.substats).toEqual([]) // dòng rác bị bỏ, echo vẫn giữ
  })

  it('id trùng trong cùng đợt import → cấp id mới; level clamp 0..25', () => {
    const s = seen()
    const a = sanitizeEcho(validEcho(), s)!
    const b = sanitizeEcho(validEcho(), s)!
    expect(a.id).not.toBe(b.id)
    expect(sanitizeEcho(validEcho({ level: 99 }), seen())!.level).toBe(25)
  })
})

describe('loadIdMap: guard hình dạng value (fix crash render 19/07)', () => {
  it('value không phải mảng bị BỎ; phần tử không phải string bị lọc', () => {
    localStorage.setItem('wuwa-echo-optimizer:equipped:v1:main', JSON.stringify({
      changli: 'e_ab12', // string trần — trước đây lọt qua rồi crash ở scoreEquipped .map
      ok: ['a', 'b'],
      mixed: ['a', 5, null, 'b'],
    }))
    expect(loadIdMap('wuwa-echo-optimizer:equipped:v1:main')).toEqual({ ok: ['a', 'b'], mixed: ['a', 'b'] })
  })

  it('storage literal "null" / mảng → {} (guard cấp cao nhất giữ nguyên)', () => {
    localStorage.setItem('k', 'null')
    expect(loadIdMap('k')).toEqual({})
    localStorage.setItem('k', '[1,2]')
    expect(loadIdMap('k')).toEqual({})
  })
})

describe('importJson: file backup của chính app', () => {
  it('file hợp lệ → echoes + dropped đếm mục hỏng', async () => {
    const file = new File([JSON.stringify({ version: 1, echoes: [validEcho(), { cost: 99 }] })], 'b.json')
    const r = await importJson(file)
    expect(r.echoes).toHaveLength(1)
    expect(r.dropped).toBe(1)
  })

  it('file sai format → reject', async () => {
    await expect(importJson(new File(['{"x":1}'], 'b.json'))).rejects.toThrow()
  })
})

describe('mergeProfile: override đè preset', () => {
  const camellya = CHARACTER_BY_ID['camellya']
  it('weights merge từng key; erTarget null = user đã xoá gate (không rơi về preset)', () => {
    const m = mergeProfile(camellya, { weights: { critRate: 0.5 }, erTarget: null })
    expect(m.weights.critRate).toBe(0.5)
    expect(m.weights.critDmg).toBe(camellya.weights.critDmg)
    expect(m.erTarget).toBeUndefined()
    expect(mergeProfile(camellya)).toBe(camellya) // không override → trả nguyên object (memo-friendly)
  })
})
