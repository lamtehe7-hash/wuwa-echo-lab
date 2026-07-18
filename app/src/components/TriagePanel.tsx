import { useEffect, useMemo, useRef, useState } from 'react'
import type { Echo } from '../types'
import type { OwnerFit } from '../engine/insights'
import { triageCandidates } from '../engine/insights'
import { tuneAdvice } from '../engine/score'
import { useT, useTMessage } from '../i18n'
import EchoCard from './EchoCard'
import BestOwnerBadge from './BestOwnerBadge'
import PinnedByBadge, { type PinnedOwner } from './PinnedByBadge'
import { VERDICT_CLS } from './RankingTable'

// F4 (task 63): Triage Queue — duyệt echo LẦN LƯỢT (giữ/khoá/bỏ/sửa). INLINE view thay chỗ toàn bộ
// khối tab Kho (KHÔNG modal — vì "Sửa" mở EchoEditModal đè lên, tránh modal chồng modal). Verdict theo
// best-owner #1 (roster-aware, reuse App bestOwnersByEcho); rỗng = ứng viên bỏ. Thiết kế wuwa-ui-designer.
// P5 (ui-redesign): keycap G·K·B·S trên nút + phím tắt keydown (B = Bỏ, khớp từ vựng C5) + tiến độ to.

/** Keycap nhỏ trên nút (desktop) — phím tắt vật lý xử lý ở keydown effect */
function Kbd({ k }: { k: string }) {
  return (
    <kbd aria-hidden className="ml-1.5 hidden rounded border border-slate-600 border-b-2 bg-slate-950 px-1.5 font-mono text-[10px] font-normal text-slate-300 sm:inline">
      {k}
    </kbd>
  )
}

interface Props {
  echoes: Echo[]
  order: 'worst' | 'newest'
  bestOwners: Map<string, OwnerFit[]>
  /** App `pinnedBy` — echo đang ở BỘ GHIM của nhân vật nào (cảnh báo trước khi Loại, task 66) */
  pinnedBy?: Map<string, PinnedOwner[]>
  /** có modal Sửa (EchoEditModal) đang mở không — để Escape không đóng cả 2 + không giành focus */
  modalOpen: boolean
  onTrash: (id: string) => void
  onLock: (id: string) => void
  onEdit: (echo: Echo) => void
  onJump?: (id: string) => void
  onExit: () => void
}

export default function TriagePanel({ echoes, order, bestOwners, pinnedBy, modalOpen, onTrash, onLock, onEdit, onJump, onExit }: Props) {
  const t = useT()
  const tm = useTMessage()
  // Snapshot id CỐ ĐỊNH lúc vào (không co lại khi trash/lock đổi giữa chừng — tránh mảng tụt dưới chân user)
  const [orderedIds] = useState(() => triageCandidates(echoes, order, bestOwners).map((e) => e.id))
  const [index, setIndex] = useState(0)
  const [stats, setStats] = useState({ trashed: 0, locked: 0, kept: 0 })
  const keepRef = useRef<HTMLButtonElement>(null)

  const echoById = useMemo(() => new Map(echoes.map((e) => [e.id, e])), [echoes])
  const n = orderedIds.length
  const done = index >= n
  const currentId = done ? undefined : orderedIds[index]
  const echo = currentId ? echoById.get(currentId) : undefined

  // Focus nút Giữ khi vào + sau mỗi lần next (Enter = Giữ). Không giành focus khi modal Sửa đang mở.
  useEffect(() => {
    if (!done && !modalOpen) keepRef.current?.focus()
  }, [index, done, modalOpen])

  const next = () => setIndex((i) => i + 1)
  const keep = () => { setStats((s) => ({ ...s, kept: s.kept + 1 })); next() }
  const lock = () => { if (currentId) onLock(currentId); setStats((s) => ({ ...s, locked: s.locked + 1 })); next() }
  const trash = () => { if (currentId) onTrash(currentId); setStats((s) => ({ ...s, trashed: s.trashed + 1 })); next() }

  // Escape = Thoát + P5: phím tắt G/K/B/S — CHỈ khi không có modal Sửa mở và không đang gõ vào
  // control nhập liệu. Action đọc qua ref để effect không phải re-bind mỗi index.
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const actionsRef = useRef({ keep, lock, trash, edit: () => {} })
  actionsRef.current = { keep, lock, trash, edit: () => { if (echo) onEdit(echo) } }
  const doneRef = useRef(done)
  doneRef.current = done
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen) return
      if (e.key === 'Escape') { onExitRef.current(); return }
      if (doneRef.current) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')) return
      const k = e.key.toLowerCase()
      if (k === 'g') { e.preventDefault(); actionsRef.current.keep() }
      else if (k === 'k') { e.preventDefault(); actionsRef.current.lock() }
      else if (k === 'b') { e.preventDefault(); actionsRef.current.trash() }
      else if (k === 's') { e.preventDefault(); actionsRef.current.edit() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  const owners = currentId ? bestOwners.get(currentId) ?? [] : []
  const top = owners[0]
  const advice = echo && top ? tuneAdvice(echo, top.profile) : null
  // Echo đang nằm trong bộ ghim của ai — badge 📌 cạnh best-owner để không "Loại" nhầm đồ đang đeo
  const equippedBy = (currentId ? pinnedBy?.get(currentId) : undefined) ?? []

  return (
    <div aria-label={t('triage.title')} className="mx-auto max-w-md space-y-3">
      {/* P5: tiến độ phóng to (label + số mono to) + thanh % dày hơn */}
      <div className="flex items-center justify-between text-xs">
        {done ? (
          <span className="text-slate-400">{t('triage.title')}</span>
        ) : (
          <span className="flex items-baseline gap-2 text-slate-400">
            {t('triage.progressLabel')}
            <span className="font-mono text-base font-semibold tabular-nums text-slate-100">{index + 1}/{n}</span>
          </span>
        )}
        <button type="button" className="text-slate-500 hover:text-slate-300" onClick={onExit}>✕ {t('triage.exit')}</button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" aria-hidden>
        <div className="h-full bg-sky-600 transition-all" style={{ width: `${n ? (index / n) * 100 : 100}%` }} />
      </div>

      {done || !echo ? (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-center text-sm">
          <p className="text-slate-200">{t('triage.done', stats)}</p>
          <button type="button" className="rounded bg-sky-700 px-4 py-2 font-semibold text-white hover:bg-sky-600" onClick={onExit}>
            {t('triage.backToInventory')}
          </button>
        </div>
      ) : (
        <>
          <EchoCard
            echo={echo}
            profile={top?.profile}
            footer={
              <span className="flex flex-wrap items-center gap-1.5">
                <BestOwnerBadge owners={owners} onJump={onJump} variant="card" />
                <PinnedByBadge owners={equippedBy} />
              </span>
            }
          />
          {top ? (
            <p className={`text-xs ${VERDICT_CLS[advice!.verdict]}`}>
              {t(`ranking.verdict.${advice!.verdict}`)} — {tm(advice!.reason)}
            </p>
          ) : (
            <p className="rounded border border-rose-900/60 bg-rose-950/20 px-2 py-1.5 text-xs text-rose-400">
              {t('cleanup.reason.r1')} {t('triage.suggestTrash')}
            </p>
          )}

          {/* P5: keycap hiện rõ phím tắt (desktop; mobile ẩn) — thứ tự khớp G/K/B/S trong keydown */}
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <button ref={keepRef} type="button" className="flex-[2] rounded bg-sky-700 py-3 text-white hover:bg-sky-600" onClick={keep}>{t('triage.keep')}<Kbd k="G" /></button>
            <button type="button" className="flex-1 rounded border border-amber-700 py-3 text-amber-400 hover:bg-amber-950/30" onClick={lock}>{t('triage.lock')}<Kbd k="K" /></button>
            <button type="button" className="flex-1 rounded bg-rose-800 py-3 text-white hover:bg-rose-700" onClick={trash}>{t('triage.trash')}<Kbd k="B" /></button>
            <button type="button" className="flex-1 rounded border border-slate-600 py-3 capitalize text-slate-300 hover:bg-slate-800" onClick={() => onEdit(echo)}>{t('ranking.edit')}<Kbd k="S" /></button>
          </div>
        </>
      )}
    </div>
  )
}
