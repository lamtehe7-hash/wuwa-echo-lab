import { useState, type ReactNode } from 'react'
import type { EchoCost, MainStatKey, Substat } from '../types'
import { findEchoInfo } from '../data/echoIndex'
import { ELEMENT_COLOR } from '../data/elementColors'
import { FIXED_SECONDARY, MAINSTATS, MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { SUBSTATS, maxRoll } from '../data/substats'
import { useT } from '../i18n'

// Card hiển thị echo theo phong cách panel in-game (tham khảo WuWa + Genshin Optimizer):
// viền/màu theo rarity, icon echo (DB game8), level "+25", cost dạng pip ◆, main stat nổi bật
// kèm giá trị, substat có thanh "mốc roll" (1–8) + badge RV (chất lượng roll trung bình),
// chân card là sonata set với chấm màu nguyên tố. Dùng ở: kết quả OCR, LoadoutView, modal sửa.

export interface EchoCardData {
  name?: string
  cost: EchoCost
  set: string
  rarity: 3 | 4 | 5
  level: number
  mainStat: MainStatKey
  substats: Substat[]
}

const RARITY_STYLE: Record<3 | 4 | 5, { border: string; header: string; star: string }> = {
  5: { border: 'border-amber-500/40', header: 'from-amber-400/15', star: 'text-amber-400' },
  4: { border: 'border-violet-500/40', header: 'from-violet-400/15', star: 'text-violet-400' },
  3: { border: 'border-sky-500/40', header: 'from-sky-400/15', star: 'text-sky-400' },
}

// Màu nguyên tố dùng chung ở data/elementColors.ts; set không nguyên tố = xám trung tính

/** Vị trí mốc roll của giá trị (snap về mốc gần nhất nếu lệch) → 0-based index */
function rollIndex(rolls: number[], value: number): number {
  let best = 0
  for (let i = 1; i < rolls.length; i++) {
    if (Math.abs(rolls[i] - value) < Math.abs(rolls[best] - value)) best = i
  }
  return best
}

function fmtValue(stat: Substat): string {
  return `${stat.value}${SUBSTATS[stat.stat].isPct ? '%' : ''}`
}

export default function EchoCard({
  echo,
  compact = false,
  footer,
  className = '',
}: {
  echo: EchoCardData
  /** true = bản gọn cho lưới nhiều cột (LoadoutView): ẩn stat cố định, chữ nhỏ hơn */
  compact?: boolean
  /** Nội dung thêm ở chân card (điểm số, nút…) — hiển thị cạnh set */
  footer?: ReactNode
  className?: string
}) {
  const t = useT()
  const [imgError, setImgError] = useState(false)
  const R = RARITY_STYLE[echo.rarity] ?? RARITY_STYLE[5]
  const sonata = SONATA_BY_ID[echo.set]
  const info = findEchoInfo(echo.name)
  const mainDef = MAINSTATS[echo.cost].find((m) => m.key === echo.mainStat)
  const fixed = FIXED_SECONDARY[echo.cost]
  const elemColor = sonata?.element ? ELEMENT_COLOR[sonata.element] : '#94a3b8'
  const displayName = echo.name?.trim() || sonata?.name || echo.set

  // RV — chất lượng roll trung bình (mỗi substat WuWa là 1 roll; chất lượng = giá trị/mốc max)
  const rv = echo.substats.length > 0
    ? Math.round((echo.substats.reduce((s, x) => s + x.value / maxRoll(x.stat), 0) / echo.substats.length) * 100)
    : null

  const iconSize = compact ? 'h-8 w-8' : 'h-10 w-10'
  const subText = compact ? 'text-xs' : 'text-sm'

  return (
    <div className={`overflow-hidden rounded-lg border bg-slate-900/80 ${R.border} ${className}`}>
      {/* Header: icon + tên + level, nền gradient theo rarity */}
      <div className={`bg-gradient-to-b ${R.header} to-transparent ${compact ? 'p-1.5' : 'p-2'}`}>
        <div className="flex items-center gap-2">
          {info && !imgError ? (
            <img
              src={info.icon}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`${iconSize} shrink-0 rounded-full border border-slate-700 bg-slate-800 object-cover`}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={`${iconSize} flex shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm text-slate-500`}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className={`truncate font-medium text-slate-100 ${compact ? 'text-xs' : 'text-sm'}`} title={displayName}>
              {displayName}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] leading-tight">
              <span className={R.star}>{'★'.repeat(echo.rarity)}</span>
              {!compact && <span className="uppercase tracking-wide text-slate-500">cost</span>}
              <span className="tracking-tighter text-slate-300" title={`Cost ${echo.cost}`}>{'◆'.repeat(echo.cost)}</span>
            </div>
          </div>
          <span className="shrink-0 rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-xs text-slate-200">+{echo.level}</span>
        </div>
      </div>

      <div className={`space-y-1 ${compact ? 'px-2 pb-1.5' : 'px-2.5 pb-2'}`}>
        {/* Main stat — dòng vàng nổi bật như in-game; giá trị là mốc +25 (engine chấm theo +25) */}
        <div className="flex items-baseline justify-between gap-2 border-b border-slate-800 pb-1">
          <span className={`font-medium text-amber-300 ${subText}`}>{MAINSTAT_LABELS[echo.mainStat]}</span>
          <span
            className={`font-mono font-semibold text-amber-200 ${compact ? 'text-sm' : 'text-base'} ${echo.level < 25 ? 'opacity-60' : ''}`}
            title={t('card.mainAt25')}
          >
            {mainDef ? `${mainDef.max}%` : '—'}
          </span>
        </div>
        {!compact && (
          <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500">
            <span>{fixed.label}</span>
            <span className="font-mono">{fixed.max}</span>
          </div>
        )}

        {/* Substats + thanh mốc roll (kiểu roll-quality của Genshin Optimizer) */}
        {echo.substats.length === 0 ? (
          <div className="py-1 text-xs text-slate-600">{t('card.noSubs')}</div>
        ) : (
          echo.substats.map((s) => {
            const rolls = SUBSTATS[s.stat].rolls
            const idx = rollIndex(rolls, s.value)
            const q = rolls.length > 1 ? idx / (rolls.length - 1) : 1
            const barColor = q >= 0.72 ? 'bg-amber-400' : q >= 0.4 ? 'bg-sky-500' : 'bg-slate-500'
            return (
              <div key={s.stat} className={`flex items-center justify-between gap-2 ${subText}`}>
                <span className="truncate text-slate-300">{SUBSTATS[s.stat].label}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-slate-200">{fmtValue(s)}</span>
                  <span
                    className="h-1 w-7 overflow-hidden rounded-full bg-slate-800"
                    title={t('card.rollTier', { i: idx + 1, n: rolls.length })}
                  >
                    <span className={`block h-full ${barColor}`} style={{ width: `${((idx + 1) / rolls.length) * 100}%` }} />
                  </span>
                </span>
              </div>
            )
          })
        )}

        {/* Chân card: sonata set (chấm màu nguyên tố) + RV + nội dung thêm */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-1">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: elemColor }} />
            <span className="truncate" title={sonata?.name}>{sonata?.name ?? echo.set}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {rv !== null && !compact && (
              <span className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[10px] text-slate-400" title={t('card.rvTip')}>
                {t('card.rv', { pct: rv })}
              </span>
            )}
            {footer}
          </span>
        </div>
      </div>
    </div>
  )
}
