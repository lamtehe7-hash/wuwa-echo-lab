import { ECHOES, type EchoInfo } from './echoes'
import { SONATA_BY_ID } from './sonata'
import type { Echo } from '../types'

// Tra cứu nhanh EchoInfo theo tên (UI hiển thị icon). Tên từ OCR đã được chuẩn hoá
// về đúng tên trong DB (ocr/parse.ts matchEchoInfo) nên chỉ cần khớp không phân biệt hoa thường.

const BY_NAME = new Map<string, EchoInfo>(ECHOES.map((e) => [e.name.toLowerCase(), e]))

export function findEchoInfo(name?: string): EchoInfo | undefined {
  if (!name) return undefined
  return BY_NAME.get(name.trim().toLowerCase())
}

/** Tên hiển thị của 1 echo: tên → tên set → id set (task 67 — trước đây chép tay ~6 nơi, lệch nhau nhẹ) */
export function echoDisplayName(e: Pick<Echo, 'name' | 'set'>): string {
  return e.name?.trim() || SONATA_BY_ID[e.set]?.name || e.set
}
