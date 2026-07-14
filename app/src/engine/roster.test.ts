import { describe, expect, it } from 'vitest'
import type { Echo } from '../types'
import { solveRoster } from './roster'
import { CHARACTER_BY_ID } from '../data/characters'
import { DEMO_ECHOES } from '../data/demo'

const camellya = CHARACTER_BY_ID['camellya']
const roccia = CHARACTER_BY_ID['roccia']

describe('solveRoster — 2 nhân vật không nhận trùng echo', () => {
  it('không có echo nào xuất hiện ở cả 2 kết quả (DEMO_ECHOES)', () => {
    const roster = solveRoster(DEMO_ECHOES, [camellya, roccia])
    const idsA = new Set(roster[0].result?.echoes.map((s) => s.echo.id) ?? [])
    const idsB = roster[1].result?.echoes.map((s) => s.echo.id) ?? []
    const overlap = idsB.some((id) => idsA.has(id))
    expect(overlap).toBe(false)
  })
})

describe('solveRoster — thứ tự ưu tiên được giữ nguyên', () => {
  it('chỉ có 1 echo khan hiếm → luôn thuộc về người ĐỨNG TRƯỚC trong danh sách, bất kể ai', () => {
    const scarce: Echo = {
      id: 'scarce', name: 'Scarce', cost: 4, set: 'havoc-eclipse', rarity: 5, level: 25,
      mainStat: 'critRate', substats: [{ stat: 'critDmg', value: 21.0 }],
    }
    const rosterAB = solveRoster([scarce], [camellya, roccia])
    expect(rosterAB[0].result?.echoes[0]?.echo.id).toBe('scarce')
    expect(rosterAB[1].result).toBeNull()

    // Đảo thứ tự → người đứng trước (giờ là roccia) phải là người nhận được, không phải camellya
    const rosterBA = solveRoster([scarce], [roccia, camellya])
    expect(rosterBA[0].result?.echoes[0]?.echo.id).toBe('scarce')
    expect(rosterBA[1].result).toBeNull()
  })
})

describe('solveRoster — kho cạn', () => {
  it('kho chỉ đủ 1 slot → người đầu nhận, người sau result = null', () => {
    const echoes: Echo[] = [
      { id: 'x1', name: 'X1', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [] },
    ]
    const roster = solveRoster(echoes, [camellya, roccia])
    expect(roster[0].result).not.toBeNull()
    expect(roster[1].result).toBeNull()
  })

  it('kho còn dư đúng 1 echo sau khi người đầu lấy hết 5 slot tối ưu → người sau nhận bộ THIẾU SLOT (<5), không phải null', () => {
    // 5 echo "tốt" (đủ để camellya ghép bộ 12 cost: 4+3+3+1+1) cùng set ưu tiên, khác tên → chắc chắn được chọn
    // + 1 echo "tệ" (main stat sai, substats rỗng, set khác) chắc chắn bị loại vì thấp điểm hơn cả 2 echo cost-1 kia
    const good: Echo[] = [
      { id: 'g1', name: 'G1', cost: 4, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'critRate', substats: [{ stat: 'critDmg', value: 21.0 }] },
      { id: 'g2', name: 'G2', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [{ stat: 'critRate', value: 10.5 }] },
      { id: 'g3', name: 'G3', cost: 3, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'havocDmg', substats: [{ stat: 'critDmg', value: 21.0 }] },
      { id: 'g4', name: 'G4', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 6.9 }] },
      { id: 'g5', name: 'G5', cost: 1, set: 'havoc-eclipse', rarity: 5, level: 25, mainStat: 'atkPct', substats: [{ stat: 'critRate', value: 6.3 }] },
    ]
    const bad: Echo = {
      id: 'bad', name: 'Bad', cost: 1, set: 'freezing-frost', rarity: 5, level: 25, mainStat: 'defPct', substats: [],
    }
    const echoes = [...good, bad]

    const roster = solveRoster(echoes, [camellya, roccia])
    const first = roster[0].result!
    expect(first).not.toBeNull()
    expect(first.echoes.map((s) => s.echo.id).sort()).toEqual(['g1', 'g2', 'g3', 'g4', 'g5'])
    expect(first.layout.length).toBe(5)

    const second = roster[1].result
    expect(second).not.toBeNull()
    expect(second!.layout.length).toBeLessThan(5)
    expect(second!.echoes.map((s) => s.echo.id)).toEqual(['bad'])
  })
})

describe('solveRoster — forcedSets: mỗi nhân vật ép set riêng', () => {
  const mk = (id: string, set: string, cost: 1 | 3 | 4): Echo => ({
    id, name: id, cost, set, rarity: 5, level: 25, mainStat: 'critRate',
    substats: [{ stat: 'critDmg', value: 21 }],
  })
  // 2 set, mỗi set đủ bộ 5 (cost 4-3-3-1-1 = 12)
  const echoes: Echo[] = [
    mk('h1', 'havoc-eclipse', 4), mk('h2', 'havoc-eclipse', 3), mk('h3', 'havoc-eclipse', 3), mk('h4', 'havoc-eclipse', 1), mk('h5', 'havoc-eclipse', 1),
    mk('m1', 'midnight-veil', 4), mk('m2', 'midnight-veil', 3), mk('m3', 'midnight-veil', 3), mk('m4', 'midnight-veil', 1), mk('m5', 'midnight-veil', 1),
  ]

  it('mỗi kết quả chỉ chứa echo thuộc đúng set bị ép của nhân vật đó', () => {
    const roster = solveRoster(echoes, [camellya, roccia], { camellya: 'havoc-eclipse', roccia: 'midnight-veil' })
    expect(roster[0].result!.echoes.every((s) => s.echo.set === 'havoc-eclipse')).toBe(true)
    expect(roster[1].result!.echoes.every((s) => s.echo.set === 'midnight-veil')).toBe(true)
    // vẫn không trùng echo giữa 2 người
    const a = new Set(roster[0].result!.echoes.map((s) => s.echo.id))
    expect(roster[1].result!.echoes.some((s) => a.has(s.echo.id))).toBe(false)
  })

  it('không truyền forcedSets → hành vi cũ (không lọc theo set)', () => {
    const roster = solveRoster(echoes, [camellya])
    expect(roster[0].result!.echoes.length).toBe(5)
  })
})
