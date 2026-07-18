import type { SetBacklogRow, BacklogStatus } from '../engine/insights'
import { ELEMENT_COLOR } from '../data/elementColors'
import { usePanelOpen } from './usePanelOpen'
import { useT } from '../i18n'

// F12 (task 61): "Farming Backlog" — đối chiếu tồn kho vs nhu cầu, chỉ ra set NÊN DỪNG farm.
// Đặt sau SetFarmPriority (tab Đội hình), chỉ hiện khi kho KHÔNG rỗng (rows>0). <details> đóng mặc định
// + chip tổng "N có thể dừng" ở summary (thấy cả khi chưa mở). Màu status: need/farm = amber (cùng nhóm
// "nên farm"), enough = emerald, surplus = slate — rose để dành cho hành động huỷ (quy ước app).

// need/farm cùng amber (nhóm "nên farm") → phân biệt bằng label + độ đậm chip: farm "Đang thiếu"
// dùng font-semibold để nổi giữa loạt hàng need 0% cùng màu (góp ý designer task 61).
const STATUS: Record<BacklogStatus, { chip: string; bar: string; key: string }> = {
  need: { chip: 'bg-amber-950/40 text-amber-400 font-medium', bar: '#fbbf24', key: 'backlog.status.need' },
  farm: { chip: 'bg-amber-950/40 text-amber-400 font-semibold', bar: '#fbbf24', key: 'backlog.status.farm' },
  enough: { chip: 'bg-emerald-950/40 text-emerald-400 font-medium', bar: '#34d399', key: 'backlog.status.enough' },
  surplus: { chip: 'bg-slate-800/60 text-slate-500 font-medium', bar: '#64748b', key: 'backlog.status.surplus' },
}

function Row({ r }: { r: SetBacklogRow }) {
  const t = useT()
  const st = STATUS[r.status]
  const pct = r.target > 0 ? Math.min(100, Math.round((r.goodOwned / r.target) * 100)) : 100
  const tip =
    r.demand > 0
      ? `${t('backlog.rowTip', { owned: r.owned, good: r.goodOwned })} · ${t('farm.row', { n: r.demand, name: r.topDemander ?? '—' })}`
      : t('backlog.rowTip', { owned: r.owned, good: r.goodOwned })

  // P4 (ui-redesign): cụm goodOwned/target + bar + demand gom vào 1 cột PHẢI bề rộng cố định
  // (w-12 / w-20 / w-16) → bar thẳng cột giữa các dòng, so sánh được; bar nới w-10 → w-20
  return (
    <li className="flex flex-wrap items-center gap-1.5" title={tip}>
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: r.def.element ? ELEMENT_COLOR[r.def.element] : '#64748b' }}
      />
      <span className="min-w-0 truncate font-medium text-slate-200">{r.def.name}</span>
      <span className={`rounded px-1.5 py-0.5 text-[10px] ${st.chip}`}>{t(st.key)}</span>
      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        {r.demand > 0 ? (
          <>
            <span className="w-12 text-right font-mono text-[10px] tabular-nums text-slate-500">
              {r.goodOwned}/{r.target}
            </span>
            <span className="block h-1 w-20 overflow-hidden rounded-full bg-slate-800" aria-hidden>
              <span className="block h-full" style={{ width: `${pct}%`, backgroundColor: st.bar }} />
            </span>
          </>
        ) : (
          <span className="text-[10px] text-slate-500">{t('backlog.surplusRow', { owned: r.owned })}</span>
        )}
        <span className="w-16 text-right text-[10px] text-slate-500">
          {r.demand > 0 ? t('backlog.demand', { n: r.demand }) : '—'}
        </span>
      </span>
    </li>
  )
}

export default function FarmingBacklog({ rows }: { rows: SetBacklogRow[] }) {
  const t = useT()
  const farm = rows.filter((r) => r.status === 'need' || r.status === 'farm')
  const stop = rows.filter((r) => r.status === 'enough' || r.status === 'surplus')
  const stopCount = stop.length
  const panel = usePanelOpen('backlog') // P6: nhớ mở/đóng

  return (
    <details {...panel} className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        📦 {t('backlog.title')}
        <span className="ml-2 text-xs font-normal text-slate-500">{t('backlog.subtitle')}</span>
        {stopCount > 0 && (
          <span className="ml-2 rounded bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-normal text-emerald-400">
            {t('backlog.summaryChip', { n: stopCount })}
          </span>
        )}
      </summary>

      {/* Lộ công thức target: "0/10" cạnh "35 nhân vật" dễ hiểu lầm nếu không nói mốc là ~2 mảnh/người
          (góp ý designer task 61) */}
      <p className="mt-2 text-[10px] text-slate-500">{t('backlog.help')}</p>

      {farm.length > 0 && (
        <>
          <p className="mt-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400/80">{t('backlog.groupFarm')}</p>
          <ul className="mt-1 space-y-1 text-xs">
            {farm.map((r) => (
              <Row key={r.def.id} r={r} />
            ))}
          </ul>
        </>
      )}
      {stop.length > 0 && (
        <>
          <p className="mt-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">{t('backlog.groupStop')}</p>
          <ul className="mt-1 space-y-1 text-xs">
            {stop.map((r) => (
              <Row key={r.def.id} r={r} />
            ))}
          </ul>
        </>
      )}
    </details>
  )
}
