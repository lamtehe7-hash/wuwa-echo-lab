import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { SET_ICON_SIGNATURES } from '../data/seticonSignatures'
import type { ImageDataLike } from './preprocess'
import {
  badgeSearchRect,
  classifyBadgeRegion,
  classifySignature,
  detectSetFromImage,
  findBadgeCircle,
  findLevelWordBox,
  iconSignature,
  MATCH_MAX_DISTANCE,
  POOL_MATCH_MAX_DISTANCE,
  POOL_MATCH_MIN_MARGIN,
  sigDistance,
} from './seticon'

// Fixture: crop THẬT vùng icon set (76×76) từ frame video quay panel echo trong game —
// icon "Song of Feathered Trace" (set 3.5). Sinh lại: xem scripts/gen-seticon-signatures.ts.
function loadFixture(): ImageDataLike {
  const path = fileURLToPath(new URL('./__fixtures__/badge-song-of-feathered-trace.png', import.meta.url))
  const png = PNG.sync.read(readFileSync(path))
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height }
}

function flatImage(w: number, h: number, v: number): ImageDataLike {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = v
    data[i + 3] = 255
  }
  return { data, width: w, height: h }
}

describe('seticon: nhận sonata set từ icon tròn cạnh "+25"', () => {
  it('badge thật từ video → nhận đúng song-of-feathered-trace', () => {
    const match = classifyBadgeRegion(loadFixture())
    expect(match?.setId).toBe('song-of-feathered-trace')
    expect(match!.margin).toBeGreaterThan(5)
  })

  it('vùng phẳng (không có icon) → null', () => {
    expect(classifyBadgeRegion(flatImage(80, 80, 40))).toBeNull()
  })

  it('iconSignature trả null khi lõi không có glyph tương phản', () => {
    expect(iconSignature(flatImage(60, 60, 200))).toBeNull()
  })

  it('findBadgeCircle tìm được vòng tròn trong fixture (gần vuông, đủ lớn)', () => {
    const circle = findBadgeCircle(loadFixture())
    expect(circle).not.toBeNull()
    const ratio = circle!.w / circle!.h
    expect(ratio).toBeGreaterThan(0.8)
    expect(ratio).toBeLessThan(1.25)
  })

  it('findLevelWordBox chỉ nhận từ dạng "+NN"', () => {
    const bbox = { x0: 0, y0: 0, x1: 10, y1: 10 }
    expect(findLevelWordBox([{ text: 'ATK', bbox }, { text: '+25', bbox }])?.text).toBe('+25')
    expect(findLevelWordBox([{ text: '25', bbox }, { text: '+256', bbox }])).toBeNull()
  })

  it('badgeSearchRect nằm bên phải chữ "+NN" và được clamp trong ảnh', () => {
    const r = badgeSearchRect({ x0: 500, y0: 50, x1: 560, y1: 90 }, 640, 400)
    expect(r.x).toBeGreaterThanOrEqual(560)
    expect(r.x + r.w).toBeLessThanOrEqual(640)
    expect(r.y).toBeGreaterThanOrEqual(0)
    expect(r.y + r.h).toBeLessThanOrEqual(400)
  })

  it('detectSetFromImage: không có từ "+NN" → null (không đoán bừa)', () => {
    expect(detectSetFromImage(flatImage(100, 100, 30), [])).toBeNull()
  })
})

// ---- Margin-rule cho pool THU HẸP theo DB (cải tiến video 18/07) ----
// Pool từ setCandidates đảm bảo set thật nằm trong pool → chấp nhận theo CÁCH BIỆT khi
// distance 70–90 (nét mềm 1080p). Test dùng template thật + nhiễu ±c đều mỗi ô (distance
// tới template gốc = ĐÚNG c) — các tiền đề data được assert tường minh để regen template
// làm test fail to tiếng thay vì sai lặng lẽ.
describe('seticon: classifySignature margin-rule pool hẹp', () => {
  const A = 'song-of-feathered-trace'
  const tplSig = (id: string): Uint8Array => {
    const entries = SET_ICON_SIGNATURES.filter((s) => s.id === id)
    expect(entries).toHaveLength(1) // test giả định 1 biến thể/set — thêm biến thể thì chọn set khác
    const bin = atob(entries[0].b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  const shifted = (sig: Uint8Array, c: number): Uint8Array => {
    const out = new Uint8Array(sig.length)
    for (let i = 0; i < sig.length; i++) out[i] = sig[i] <= 255 - c ? sig[i] + c : sig[i] - c
    return out
  }
  const aSig = tplSig(A)
  // B = set xa A nhất trong template — vai "ứng viên nhì" của pool
  const B = SET_ICON_SIGNATURES.filter((s) => s.id !== A)
    .map((s) => ({ id: s.id, d: sigDistance(aSig, tplSig(s.id)) }))
    .sort((x, y) => y.d - x.d)[0].id
  const bSig = tplSig(B)

  it('distance 70–90 nhưng margin lớn trong pool hẹp → NHẬN (trước đây ngưỡng cứng 70 loại oan)', () => {
    const sig = shifted(aSig, 80)
    expect(sigDistance(sig, aSig)).toBeCloseTo(80, 5)
    expect(sigDistance(sig, bSig) - 80).toBeGreaterThanOrEqual(POOL_MATCH_MIN_MARGIN) // tiền đề data
    const m = classifySignature(sig, [A, B])
    expect(m?.setId).toBe(A)
    // Không pool → luật chuẩn vẫn từ chối A ở distance 80 (>70)
    expect(classifySignature(sig)?.setId).not.toBe(A)
  })

  it('distance vượt trần 90 → vẫn từ chối kể cả pool hẹp', () => {
    const sig = shifted(aSig, 95)
    expect(sigDistance(sig, aSig)).toBeCloseTo(95, 5)
    expect(sigDistance(sig, bSig)).toBeGreaterThan(POOL_MATCH_MAX_DISTANCE) // tiền đề data
    expect(classifySignature(sig, [A, B])).toBeNull()
  })

  it('frame mờ (các ứng viên phẳng nhau, margin nhỏ) → null như cũ', () => {
    const mid = new Uint8Array(aSig.length)
    for (let i = 0; i < mid.length; i++) mid[i] = Math.round((aSig[i] + bSig[i]) / 2)
    expect(Math.abs(sigDistance(mid, aSig) - sigDistance(mid, bSig))).toBeLessThan(8) // tiền đề
    expect(classifySignature(mid, [A, B])).toBeNull()
  })

  it('hằng số calibrate 18/07 khoá cứng (đổi phải đối chiếu diag video 1080p)', () => {
    expect(MATCH_MAX_DISTANCE).toBe(70)
    expect(POOL_MATCH_MAX_DISTANCE).toBe(90)
    expect(POOL_MATCH_MIN_MARGIN).toBe(15)
  })
})
