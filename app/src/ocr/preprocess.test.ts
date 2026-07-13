import { describe, expect, it } from 'vitest'
import { binarize, grayscaleHistogram, normalizeRect, otsuThreshold, type ImageDataLike } from './preprocess'

/** Tạo ảnh RGBA từ mảng giá trị xám (mỗi phần tử = 1 pixel) */
function grayImage(pixels: number[], width: number): ImageDataLike {
  const data = new Uint8ClampedArray(pixels.length * 4)
  for (let p = 0; p < pixels.length; p++) {
    data[p * 4] = data[p * 4 + 1] = data[p * 4 + 2] = pixels[p]
    data[p * 4 + 3] = 255
  }
  return { data, width, height: pixels.length / width }
}

describe('grayscaleHistogram', () => {
  it('pixel xám giữ nguyên giá trị, histogram đếm đúng', () => {
    const img = grayImage([0, 0, 128, 255], 2)
    const { gray, hist } = grayscaleHistogram(img)
    expect(Array.from(gray)).toEqual([0, 0, 128, 255])
    expect(hist[0]).toBe(2)
    expect(hist[128]).toBe(1)
    expect(hist[255]).toBe(1)
  })
})

describe('otsuThreshold', () => {
  it('phân phối 2 đỉnh rõ (50 và 200) → ngưỡng nằm giữa 2 đỉnh', () => {
    const hist = new Array<number>(256).fill(0)
    hist[50] = 100
    hist[200] = 100
    const t = otsuThreshold(hist)
    expect(t).toBeGreaterThanOrEqual(50)
    expect(t).toBeLessThan(200)
  })
  it('histogram rỗng → trả mặc định 127, không chia cho 0', () => {
    expect(otsuThreshold(new Array<number>(256).fill(0))).toBe(127)
  })
})

describe('binarize: chữ luôn ĐEN trên nền TRẮNG', () => {
  it('chữ tối trên nền sáng (ảnh scan thường) → giữ polarity: chữ 0, nền 255', () => {
    // 12 pixel nền sáng (230), 4 pixel chữ tối (20)
    const img = grayImage([230, 230, 230, 230, 230, 20, 20, 230, 230, 20, 20, 230, 230, 230, 230, 230], 4)
    const out = binarize(img)
    // pixel chữ (index 5) → đen
    expect(out.data[5 * 4]).toBe(0)
    // pixel nền (index 0) → trắng
    expect(out.data[0]).toBe(255)
  })
  it('chữ sáng trên nền tối (UI game) → TỰ ĐẢO: chữ 0, nền 255', () => {
    // 12 pixel nền tối (25), 4 pixel chữ sáng (240)
    const img = grayImage([25, 25, 25, 25, 25, 240, 240, 25, 25, 240, 240, 25, 25, 25, 25, 25], 4)
    const out = binarize(img)
    // pixel chữ sáng (index 5) → đen (đã đảo)
    expect(out.data[5 * 4]).toBe(0)
    // pixel nền tối (index 0) → trắng (đã đảo)
    expect(out.data[0]).toBe(255)
  })
})

describe('normalizeRect', () => {
  it('kéo ngược (từ dưới-phải lên trên-trái) vẫn ra rect chuẩn', () => {
    expect(normalizeRect(100, 80, 20, 30, 1920, 1080)).toEqual({ x: 20, y: 30, w: 80, h: 50 })
  })
  it('clamp trong biên ảnh', () => {
    const r = normalizeRect(-50, -20, 2000, 1200, 1920, 1080)
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
    expect(r.w).toBe(1920)
    expect(r.h).toBe(1080)
  })
})
