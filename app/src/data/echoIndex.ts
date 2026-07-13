import { ECHOES, type EchoInfo } from './echoes'

// Tra cứu nhanh EchoInfo theo tên (UI hiển thị icon). Tên từ OCR đã được chuẩn hoá
// về đúng tên trong DB (ocr/parse.ts matchEchoInfo) nên chỉ cần khớp không phân biệt hoa thường.

const BY_NAME = new Map<string, EchoInfo>(ECHOES.map((e) => [e.name.toLowerCase(), e]))

export function findEchoInfo(name?: string): EchoInfo | undefined {
  if (!name) return undefined
  return BY_NAME.get(name.trim().toLowerCase())
}
