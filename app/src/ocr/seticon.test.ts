import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import type { ImageDataLike } from './preprocess'
import {
  badgeSearchRect,
  classifyBadgeRegion,
  detectSetFromImage,
  findBadgeCircle,
  findLevelWordBox,
  iconSignature,
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
