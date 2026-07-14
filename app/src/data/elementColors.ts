import type { Element } from '../types'

/** Màu nguyên tố (theo tông màu WuWa in-game) — dùng chung EchoCard + CharacterPicker */
export const ELEMENT_COLOR: Record<Element, string> = {
  glacio: '#4ab6ff',
  fusion: '#ff7a4e',
  electro: '#c65eff',
  aero: '#3de6a8',
  spectro: '#ffd94e',
  havoc: '#ff4ecb',
}

/** Thứ tự hiển thị nhóm nguyên tố */
export const ELEMENT_ORDER: Element[] = ['glacio', 'fusion', 'electro', 'aero', 'spectro', 'havoc']

/** Nhãn hiển thị (tên nguyên tố là danh từ riêng của game — không dịch) */
export const ELEMENT_LABEL: Record<Element, string> = {
  glacio: 'Glacio', fusion: 'Fusion', electro: 'Electro',
  aero: 'Aero', spectro: 'Spectro', havoc: 'Havoc',
}
