import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { BuildContext, CharacterProfile, Echo, MainStatKey } from '../types'
import { MAINSTAT_LABELS } from '../data/mainstats'
import { SONATA_BY_ID } from '../data/sonata'
import { loadoutDamage } from '../engine/damage'
import { dominantSet, scoreLoadout, setBonusBreakdown } from '../engine/solver'
import { exportLoadoutCard } from '../exportLoadoutCard'
import { useT, useTMessage } from '../i18n'
import EchoCard from './EchoCard'
import PinnedByBadge, { type PinnedOwner } from './PinnedByBadge'
import StatBreakdown from './StatBreakdown'

// "Bàn thử bộ": sandbox chấm điểm THỦ CÔNG — kéo-thả (hoặc bấm) echo từ kho vào 5 ô rồi
// tự chấm lại bằng scoreLoadout mỗi lần đổi. Ô 0 = main echo (👑). Tô SKY để phân biệt với
// kết quả solver (viền emerald "tối ưu đã xác nhận"). Tái dùng EchoCard/StatBreakdown/toolbar
// kho của RankingTable + hàm điểm/damage/export của LoadoutView — không nhân bản logic engine.

const EMPTY: (string | null)[] = [null, null, null, null, null]
const COST_CAP = 12

interface Props {
  /** Toàn bộ kho (gồm cả trash) — ô resolve theo id; kho-picker tự lọc trash + echo đã lên bàn */
  echoes: Echo[]
  profile: CharacterProfile
  /** 5 id echo (null = ô trống); ô 0 = main echo */
  slots: (string | null)[]
  onChange: (next: (string | null)[]) => void
  /** Build context (vũ khí+base+buff) → damage + breakdown chỉ số thật */
  ctx?: BuildContext
  /** Điểm "bộ hiện tại" đã ghi nhớ — hiện delta ▲/▼ cạnh tổng điểm */
  compareTotal: number | null
  onPin: (ids: string[]) => void
  /** U7 (task 60): echo id → nhân vật đang ghim echo đó (badge "Đang dùng bởi X" ở kho) */
  pinnedBy?: Map<string, PinnedOwner[]>
}

export default function BenchPanel({ echoes, profile, slots, onChange, ctx, compareTotal, onPin, pinnedBy }: Props) {
  const t = useT()
  const tm = useTMessage()
  const [hover, setHover] = useState<number | null>(null)
  // U2 (task 58): chạm chọn-rồi-đặt — HTML5 DnD không chạy trên trình duyệt cảm ứng.
  // Bấm card kho = chọn (ring sky) → bấm ô bất kỳ (kể cả đã có echo) = đặt/THAY THẾ vào ô đó.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [costF, setCostF] = useState<number | null>(null)
  const [setF, setSetF] = useState('')
  const [mainF, setMainF] = useState<'' | MainStatKey>('')

  const byId = useMemo(() => new Map(echoes.map((e) => [e.id, e])), [echoes])

  // Resolve id → echo + chấm điểm bộ (memo theo slots/kho/profile để không chấm lại mỗi render).
  // ctx vào scoreLoadout để ngân sách ER trừ vũ khí/passive giống hệt solver (task 55).
  const { resolved, filled, result } = useMemo(() => {
    const resolved = slots.map((id) => (id ? byId.get(id) ?? null : null))
    const filled = resolved.filter((e): e is Echo => e != null)
    return { resolved, filled, result: filled.length ? scoreLoadout(filled, profile, ctx) : null }
  }, [slots, byId, profile, ctx])

  const activeSet = result ? dominantSet(result.setCounts) : undefined
  const totalCost = filled.reduce((s, e) => s + e.cost, 0)
  const overCost = totalCost > COST_CAP
  const mainEcho = resolved[0]
  const dmg = result ? loadoutDamage(result.echoes.map((s) => s.echo), profile, ctx, activeSet) : null
  const delta = result && compareTotal !== null ? result.total - compareTotal : null
  const setBd = result ? setBonusBreakdown(result.setCounts, profile).filter((e) => e.statScore > 0.05 || e.prefBonus > 0) : []

  // ── Thao tác ô ──
  const place = (id: string, i: number) => {
    const next = slots.map((s) => (s === id ? null : s)) // dedupe: bỏ khỏi ô cũ nếu có
    next[i] = id
    onChange(next)
  }
  const clearSlot = (i: number) => {
    const next = [...slots]
    next[i] = null
    onChange(next)
  }
  const setAsMain = (i: number) => {
    const next = [...slots]
    ;[next[0], next[i]] = [next[i], next[0]] // hoán đổi ô i vào ô main
    onChange(next)
  }
  // U2: đặt echo đang chọn vào ô i (thay thế nếu ô đã có — cùng invariant với drop)
  const placeSelected = (i: number) => {
    if (!selectedId) return
    place(selectedId, i)
    setSelectedId(null)
  }
  const selEcho = selectedId ? byId.get(selectedId) : undefined
  const selName = selEcho ? selEcho.name || SONATA_BY_ID[selEcho.set]?.name || selEcho.set : ''
  const nameOf = (e: Echo) => e.name || SONATA_BY_ID[e.set]?.name || e.set

  // ── Kho-picker: option lọc lấy từ echo THẬT trong kho (như RankingTable) ──
  const setOptions = useMemo(() => {
    const ids = [...new Set(echoes.map((e) => e.set))]
    return ids.map((id) => ({ id, name: SONATA_BY_ID[id]?.name ?? id })).sort((a, b) => a.name.localeCompare(b.name))
  }, [echoes])
  const mainOptions = useMemo(() => [...new Set(echoes.map((e) => e.mainStat))], [echoes])

  const stash = useMemo(() => {
    const seated = new Set(slots.filter((s): s is string => !!s))
    const ql = q.trim().toLowerCase()
    return echoes.filter((e) => {
      if (e.trash || seated.has(e.id)) return false
      if (costF && e.cost !== costF) return false
      if (setF && e.set !== setF) return false
      if (mainF && e.mainStat !== mainF) return false
      if (ql && !`${e.name ?? ''} ${SONATA_BY_ID[e.set]?.name ?? e.set}`.toLowerCase().includes(ql)) return false
      return true
    })
  }, [echoes, slots, q, costF, setF, mainF])

  const selCls = 'rounded border border-slate-700 bg-slate-800 px-2 py-1'
  const chip = (active: boolean) =>
    `rounded px-2 py-1 ${active ? 'bg-sky-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`

  return (
    <div className="space-y-3 rounded-lg border border-sky-900/50 bg-sky-950/20 p-3">
      {/* min-h-7 = line-height của span điểm text-lg — giữ hàng header không cao lên khi điểm
          xuất hiện (mọi thứ dưới nó, gồm slot + kho, phải đứng yên giữa các lần thả) */}
      <div className="flex min-h-7 flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-sky-300">🧰 {t('bench.title')}</div>
        {result && (
          <div className="flex items-baseline gap-2">
            {delta !== null && (
              <span
                className={`font-mono text-sm ${delta > 0.05 ? 'text-emerald-400' : delta < -0.05 ? 'text-rose-400' : 'text-slate-500'}`}
                title={t('equip.deltaTip')}
              >
                {delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '＝'} {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
              </span>
            )}
            <span className="font-mono text-lg text-sky-200">{t('loadout.points', { n: result.total.toFixed(1) })}</span>
          </div>
        )}
      </div>

      {result ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-slate-400">
          <span className={overCost ? 'font-semibold text-amber-400' : ''}>{t('bench.cost', { c: totalCost })}</span>
          <span>· {t('loadout.erFromEcho', { er: result.erGained.toFixed(1) })}</span>
          {dmg && (
            <span title={t('loadout.damageTip')}>
              {' · '}⚔ {t('loadout.damageLabel')}: <span className="font-mono text-amber-300">×{dmg.multiplier.toFixed(2)}</span>
              {ctx && (
                <span className="ml-1 text-slate-500">
                  CR <span className="font-mono text-slate-300">{dmg.critRateTotal.toFixed(1)}%</span>
                  {' · '}CD <span className="font-mono text-slate-300">{dmg.critDmgTotal.toFixed(1)}%</span>
                </span>
              )}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">{t('bench.hint')}</p>
      )}

      {/* Tách 2 cột ở lg+ (fix kho bị đẩy tụt mỗi lần thả echo): trái = slot + mọi block chiều cao
          biến thiên (cảnh báo/set-bonus/breakdown/nút — nằm HẾT dưới slot-grid), phải = kho sticky
          rail 340px (khớp rail tab Kho). Nguồn kéo lẫn đích thả đứng yên giữa các lần thả;
          phía trên grid này chỉ còn header + dòng cost/hint (luôn 1 dòng). <lg xếp dọc như cũ. */}
      <div className="grid gap-3 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="min-w-0 space-y-3">
          {/* 5 ô slot (ô 0 = main, badge 👑) — drop target + hành động.
              Không lên 5 cột: max-w-6xl trừ rail 340px chỉ còn ~146px/thẻ nếu chia 5 */}
          <div className="grid items-start gap-2 sm:grid-cols-2 md:grid-cols-3">
            {resolved.map((e, i) => {
              const isMain = i === 0
              return (
                <div
                  key={i}
                  // Đang chọn từ kho → ring sky mờ trên CẢ 5 ô báo "bấm đây để đặt" (đậm khi dragover)
                  className={`relative rounded-lg ${hover === i ? 'ring-2 ring-emerald-400' : selectedId ? 'ring-1 ring-sky-500/40' : ''}`}
                  onDragOver={(ev) => { ev.preventDefault(); if (hover !== i) setHover(i) }}
                  onDragLeave={() => setHover((h) => (h === i ? null : h))}
                  onDrop={(ev) => {
                    ev.preventDefault()
                    setHover(null)
                    const id = ev.dataTransfer.getData('text/plain')
                    if (id) place(id, i)
                  }}
                  // Ô ĐÃ có echo không thể là <button> (chứa 2 button con 👑/✕ — button lồng button
                  // là HTML lỗi) → role=button chỉ khi đang chọn; Enter/Space = đặt như click
                  {...(selectedId && e
                    ? {
                        role: 'button' as const,
                        tabIndex: 0,
                        title: t('bench.slotPlaceTip', { name: selName }),
                        onClick: () => placeSelected(i),
                        onKeyDown: (ev: ReactKeyboardEvent) => {
                          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); placeSelected(i) }
                        },
                      }
                    : {})}
                >
                  {isMain && (
                    <span
                      className="absolute -left-2 -top-2 z-10 flex items-center gap-0.5 rounded-full border border-amber-500/60 bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 shadow"
                      title={t('bench.mainTip')}
                    >
                      👑 {t('bench.mainBadge')}
                    </span>
                  )}
                  {e ? (
                    <div>
                      <EchoCard echo={e} compact profile={profile} />
                      <div className="mt-0.5 flex items-center justify-between px-0.5 text-xs">
                        {/* stopPropagation: wrapper có onClick "đặt echo đang chọn" (U2) — bấm 👑/✕ không được kích hoạt nó */}
                        {!isMain ? (
                          <button className="text-slate-500 hover:text-amber-300" title={t('bench.mainTip')} onClick={(ev) => { ev.stopPropagation(); setAsMain(i) }}>
                            👑 {t('bench.setMain')}
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          className="text-slate-600 hover:text-rose-400"
                          title={t('bench.remove')}
                          aria-label={t('bench.remove')}
                          onClick={(ev) => { ev.stopPropagation(); clearSlot(i) }}
                        >✕</button>
                      </div>
                    </div>
                  ) : (
                    // Ô trống = <button> thật (không chứa nút con): bấm/Enter đặt echo đang chọn (U2)
                    <button
                      type="button"
                      onClick={() => placeSelected(i)}
                      title={selectedId ? t('bench.slotPlaceTip', { name: selName }) : undefined}
                      className={`flex min-h-[128px] w-full items-center justify-center rounded-lg border-2 border-dashed p-2 text-center text-xs ${
                        isMain ? 'border-amber-700/50 text-amber-500/80' : 'border-slate-700 text-slate-500'
                      }`}
                    >
                      {isMain ? t('bench.emptyMain') : t('bench.emptySlot')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Cảnh báo MỀM (không chặn): tổng cost > 12, ô main không phải cost-4, + note engine —
              đặt DƯỚI slot-grid để đích thả không xô khi cảnh báo xuất hiện/biến mất */}
          {overCost && <p className="text-xs text-amber-400">⚠ {t('bench.costWarn', { c: totalCost })}</p>}
          {mainEcho && mainEcho.cost !== 4 && <p className="text-xs text-amber-400">⚠ {t('bench.mainCostWarn', { c: mainEcho.cost })}</p>}
          {result?.note.map((n, i) => <p key={i} className="text-xs text-amber-400">⚠ {tm(n)}</p>)}

          {setBd.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500" title={t('loadout.setBonusTip')}>
              {setBd.map((e) => (
                <span key={e.setId}>
                  {SONATA_BY_ID[e.setId]?.name ?? e.setId} ×{e.n}: <span className="font-mono text-slate-400">+{e.statScore.toFixed(1)}</span>
                  {e.prefBonus > 0 && <span className="text-amber-400"> ⭐+{e.prefBonus}</span>}
                </span>
              ))}
            </div>
          )}

          {result && <StatBreakdown echoes={filled} profile={profile} ctx={ctx} activeSet={activeSet} defaultOpen={false} />}

          <div className="flex flex-wrap gap-2">
            {result && (
              <>
                <button
                  type="button"
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  title={t('loadout.exportTip')}
                  onClick={() => void exportLoadoutCard(result, profile, ctx, activeSet)}
                >{t('loadout.exportPng')}</button>
                <button
                  type="button"
                  className="rounded border border-sky-800 px-2 py-1 text-xs text-sky-300 hover:bg-sky-950/60"
                  onClick={() => onPin(filled.map((x) => x.id))}
                >{t('equip.pin')}</button>
              </>
            )}
            {slots.some((s) => s) && (
              <button
                type="button"
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
                onClick={() => onChange([...EMPTY])}
              >{t('bench.clear')}</button>
            )}
          </div>
        </div>

        {/* Kho echo có filter — card là <button draggable> (kéo desktop / bấm touch+bàn phím).
            lg+: rail sticky tự cuộn — tắt scroll-box nội bộ max-h-96 để khỏi 2 thanh cuộn lồng nhau */}
        <div
          role="region"
          aria-labelledby="bench-stash-heading"
          className="space-y-1.5 rounded-lg border border-slate-800 bg-slate-900/40 p-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
        >
          <div id="bench-stash-heading" className="text-xs font-semibold text-slate-300">{t('bench.stashTitle')}</div>
          {selEcho && (
            <p role="status" className="rounded bg-sky-950/40 px-2 py-1 text-xs text-sky-300">
              {t('bench.selectedTip', { name: selName })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('inv.search')}
              aria-label={t('inv.search')}
              className="min-w-36 flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1"
            />
            <select className={selCls} value={setF} onChange={(e) => setSetF(e.target.value)} aria-label={t('inv.allSets')}>
              <option value="">{t('inv.allSets')}</option>
              {setOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className={selCls} value={mainF} onChange={(e) => setMainF(e.target.value as '' | MainStatKey)} aria-label={t('inv.allMains')}>
              <option value="">{t('inv.allMains')}</option>
              {mainOptions.map((k) => <option key={k} value={k}>{MAINSTAT_LABELS[k]}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[null, 4, 3, 1].map((c) => (
              <button key={String(c)} type="button" className={chip(costF === c)} onClick={() => setCostF(c)}>
                {c === null ? t('app.all') : t('app.costFilter', { c })}
              </button>
            ))}
            <span className="ml-auto text-slate-500">{t('inv.count', { shown: stash.length, total: echoes.length })}</span>
          </div>
          {stash.length === 0 ? (
            <p className="p-3 text-center text-xs text-slate-500">{t('bench.stashEmpty')}</p>
          ) : (
            <div className="grid max-h-96 gap-2 overflow-y-auto p-0.5 sm:grid-cols-2 md:grid-cols-3 lg:max-h-none lg:grid-cols-2 lg:overflow-visible">
              {stash.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  draggable
                  // Kéo chuột = luồng desktop cũ; xoá chọn để 2 cơ chế không chồng trạng thái
                  onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', e.id); setSelectedId(null) }}
                  onClick={() => setSelectedId((cur) => (cur === e.id ? null : e.id))}
                  title={selectedId === e.id ? t('bench.deselectTip', { name: nameOf(e) }) : t('bench.addTip', { name: nameOf(e) })}
                  aria-pressed={selectedId === e.id}
                  className={`block cursor-grab rounded-lg text-left transition-opacity hover:opacity-80 active:cursor-grabbing ${
                    selectedId === e.id ? 'ring-2 ring-sky-400' : ''
                  }`}
                >
                  <EchoCard
                    echo={e}
                    compact
                    profile={profile}
                    footer={<PinnedByBadge owners={(pinnedBy?.get(e.id) ?? []).filter((o) => o.id !== profile.id)} variant="chip" />}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
