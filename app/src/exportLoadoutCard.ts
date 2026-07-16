import type { BuildContext, CharacterProfile, LoadoutResult } from './types'
import { findEchoInfo } from './data/echoIndex'
import { iconUrl } from './data/iconAssets'
import { ELEMENT_COLOR } from './data/elementColors'
import { MAINSTATS, MAINSTAT_LABELS } from './data/mainstats'
import { SONATA_BY_ID } from './data/sonata'
import { SUBSTATS } from './data/substats'
import { loadoutDamage } from './engine/damage'
import { setBonusBreakdown } from './engine/solver'

// Xuất bộ 5 tối ưu ra 1 ảnh PNG "build card" để chia sẻ (killer feature kiểu Genshin Optimizer).
// Vẽ THẲNG lên canvas (không thư viện) — icon đã vendor same-origin (data/iconAssets.ts) nên canvas
// KHÔNG bị taint, toBlob() chạy được. Nhãn stat dùng tiếng Anh (chuẩn cộng đồng WuWa, như EchoCard).

const DPR = 2 // render @2x cho nét trên màn retina / khi phóng to

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src // 'icons/…' same-origin → không taint canvas
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Cắt chuỗi cho vừa maxW (thêm … nếu tràn) */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let s = text
  while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1)
  return s + '…'
}

const RARITY_BORDER: Record<number, string> = { 5: '#f59e0b', 4: '#a78bfa', 3: '#38bdf8' }

/** `build`/`activeSet` PHẢI truyền y hệt chỗ hiển thị (LoadoutView/BenchPanel) — review 16/07:
 *  export từng bỏ trống build context nên số ⚔× trên PNG lệch với số đang hiện trong app. */
export async function exportLoadoutCard(result: LoadoutResult, profile: CharacterProfile, build?: BuildContext, activeSet?: string): Promise<void> {
  const echoes = result.echoes
  const icons = await Promise.all(
    echoes.map((s) => {
      const u = iconUrl(findEchoInfo(s.echo.name)?.icon)
      return u ? loadImage(u) : Promise.resolve(null)
    }),
  )

  // Bóc tách điểm set (statScore + ưu tiên) — hiện thành band riêng (giống LoadoutView)
  const breakdown = setBonusBreakdown(result.setCounts, profile).filter((e) => e.statScore > 0.05 || e.prefBonus > 0)

  const PAD = 28
  const COLW = 190
  const COLGAP = 12
  const HEADER = 100
  const PANELH = 306
  const BREAKDOWN = breakdown.length > 0 ? 30 : 0
  const FOOTER = 34
  const n = echoes.length
  const bodyW = n * COLW + (n - 1) * COLGAP
  const W = Math.max(bodyW + PAD * 2, 720)
  const H = HEADER + PANELH + BREAKDOWN + FOOTER + PAD

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * DPR)
  canvas.height = Math.round(H * DPR)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(DPR, DPR)
  ctx.textBaseline = 'alphabetic'

  // Nền gradient tối
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0b1220')
  bg.addColorStop(1, '#020617')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const elemColor = ELEMENT_COLOR[profile.element] ?? '#94a3b8'

  // Header: tên nhân vật + nguyên tố/archetype (trái), tổng điểm + damage tương đối (phải)
  ctx.fillStyle = elemColor
  ctx.fillRect(PAD, PAD + 4, 5, 46)
  ctx.fillStyle = '#f1f5f9'
  ctx.font = '700 26px system-ui, "Segoe UI", sans-serif'
  ctx.fillText(fitText(ctx, profile.name, W - PAD * 2 - 170), PAD + 16, PAD + 28)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 13px system-ui, "Segoe UI", sans-serif'
  ctx.fillText(`${profile.element} · ${profile.archetype}`, PAD + 16, PAD + 47)

  const dmg = loadoutDamage(echoes.map((s) => s.echo), profile, build, activeSet)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#6ee7b7'
  ctx.font = '700 30px system-ui, "Segoe UI", sans-serif'
  ctx.fillText(result.total.toFixed(1), W - PAD, PAD + 28)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 12px system-ui, "Segoe UI", sans-serif'
  ctx.fillText(`score  ·  ⚔ ×${dmg.multiplier.toFixed(2)}`, W - PAD, PAD + 46)
  ctx.textAlign = 'left'

  // Dòng meta: layout · cost · set counts
  const setList = Object.entries(result.setCounts)
    .map(([id, c]) => `${SONATA_BY_ID[id]?.name ?? id} ×${c}`)
    .join('    ')
  ctx.fillStyle = '#64748b'
  ctx.font = '400 12px system-ui, "Segoe UI", sans-serif'
  ctx.fillText(fitText(ctx, `${result.layout.join('-')}  ·  cost ${result.totalCost}  ·  ${setList}`, W - PAD * 2), PAD, HEADER - 8)

  // 5 panel echo
  const x0 = (W - bodyW) / 2
  const py = HEADER
  echoes.forEach((s, i) => {
    const px = x0 + i * (COLW + COLGAP)
    const echo = s.echo
    const sonata = SONATA_BY_ID[echo.set]
    const setColor = sonata?.element ? ELEMENT_COLOR[sonata.element] : '#94a3b8'

    // nền panel + viền theo rarity
    ctx.fillStyle = 'rgba(15,23,42,0.85)'
    roundRect(ctx, px, py, COLW, PANELH, 10)
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = (RARITY_BORDER[echo.rarity] ?? '#f59e0b') + '66'
    ctx.stroke()

    // icon tròn (hoặc fallback chữ cái)
    const cx = px + COLW / 2
    const iconR = 30
    const iconCy = py + 22 + iconR
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, iconCy, iconR, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.clip()
    const img = icons[i]
    if (img) {
      ctx.drawImage(img, cx - iconR, iconCy - iconR, iconR * 2, iconR * 2)
    } else {
      ctx.fillStyle = '#64748b'
      ctx.font = '700 26px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText((echo.name?.trim() || sonata?.name || '?').charAt(0).toUpperCase(), cx, iconCy + 9)
      ctx.textAlign = 'left'
    }
    ctx.restore()
    ctx.lineWidth = 1
    ctx.strokeStyle = '#334155'
    ctx.beginPath()
    ctx.arc(cx, iconCy, iconR, 0, Math.PI * 2)
    ctx.stroke()

    // tên + cost/rarity
    let ty = iconCy + iconR + 20
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '600 13px system-ui, "Segoe UI", sans-serif'
    ctx.fillText(fitText(ctx, echo.name?.trim() || sonata?.name || echo.set, COLW - 16), cx, ty)
    ty += 16
    ctx.fillStyle = RARITY_BORDER[echo.rarity] ?? '#f59e0b'
    ctx.font = '400 11px system-ui, sans-serif'
    ctx.fillText(`${'★'.repeat(echo.rarity)}  ${'◆'.repeat(echo.cost)}  +${echo.level}`, cx, ty)
    ctx.textAlign = 'left'

    // main stat (vàng)
    ty += 22
    const mainDef = MAINSTATS[echo.cost].find((m) => m.key === echo.mainStat)
    ctx.fillStyle = '#fcd34d'
    ctx.font = '600 12px system-ui, "Segoe UI", sans-serif'
    ctx.fillText(fitText(ctx, MAINSTAT_LABELS[echo.mainStat], COLW - 70), px + 12, ty)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#fde68a'
    ctx.fillText(mainDef ? `${mainDef.max}%` : '—', px + COLW - 12, ty)
    ctx.textAlign = 'left'

    // đường kẻ
    ty += 8
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(px + 12, ty)
    ctx.lineTo(px + COLW - 12, ty)
    ctx.stroke()

    // substats
    ty += 16
    ctx.font = '400 11.5px system-ui, "Segoe UI", sans-serif'
    for (const sub of echo.substats) {
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(fitText(ctx, SUBSTATS[sub.stat].label, COLW - 62), px + 12, ty)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#f1f5f9'
      ctx.fillText(`${sub.value}${SUBSTATS[sub.stat].isPct ? '%' : ''}`, px + COLW - 12, ty)
      ctx.textAlign = 'left'
      ty += 16
    }

    // chân panel: set (chấm màu) + điểm
    const footY = py + PANELH - 12
    ctx.fillStyle = setColor
    ctx.beginPath()
    ctx.arc(px + 15, footY - 4, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '400 10.5px system-ui, sans-serif'
    ctx.fillText(fitText(ctx, sonata?.name ?? echo.set, COLW - 74), px + 24, footY)
    ctx.textAlign = 'right'
    ctx.fillStyle = s.mainStatFit ? '#6ee7b7' : '#fca5a5'
    ctx.font = '600 11px system-ui, sans-serif'
    ctx.fillText(s.totalScore.toFixed(1), px + COLW - 12, footY)
    ctx.textAlign = 'left'
  })

  // Band bóc tách điểm set (nếu có set kích hoạt): "⬡ Set bonus:  <Set> +stat ⭐+pref   ·   …"
  if (BREAKDOWN > 0) {
    const bandY = HEADER + PANELH + 4
    ctx.fillStyle = 'rgba(30,41,59,0.6)'
    roundRect(ctx, PAD, bandY, W - PAD * 2, 22, 6)
    ctx.fill()
    const parts = breakdown.map((e) => {
      const name = SONATA_BY_ID[e.setId]?.name ?? e.setId
      const pref = e.prefBonus > 0 ? ` ⭐+${e.prefBonus}` : ''
      return `${name} +${e.statScore.toFixed(1)}${pref}`
    })
    ctx.fillStyle = '#93c5fd'
    ctx.font = '600 11px system-ui, "Segoe UI", sans-serif'
    const label = 'Set bonus:  '
    ctx.fillText(label, PAD + 10, bandY + 15)
    const labelW = ctx.measureText(label).width
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '400 11px system-ui, "Segoe UI", sans-serif'
    ctx.fillText(fitText(ctx, parts.join('    ·    '), W - PAD * 2 - 20 - labelW), PAD + 10 + labelW, bandY + 15)
  }

  // Footer: nguồn
  ctx.fillStyle = '#475569'
  ctx.font = '400 11px system-ui, sans-serif'
  ctx.fillText('WuWa Echo Optimizer — lamtehe7-hash.github.io/wuwa-echo-lab', PAD, H - 14)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wuwa-${profile.id}-loadout.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
