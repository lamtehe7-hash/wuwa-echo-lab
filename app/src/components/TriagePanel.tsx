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

// F4 (task 63): Triage Queue — duyệt echo LẦN LƯỢT (giữ/khoá/loại/sửa). INLINE view thay chỗ toàn bộ
// khối tab Kho (KHÔNG modal — vì "Sửa" mở EchoEditModal đè lên, tránh modal chồng modal). Verdict theo
// best-owner #1 (roster-aware, reuse App bestOwnersByEcho); rỗng = ứng viên loại. Thiết kế wuwa-ui-designer.

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

  // Escape = Thoát, CHỈ khi không có modal Sửa mở (EchoEditModal tự xử Escape của nó)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalOpen) onExitRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  const next = () => setIndex((i) => i + 1)
  const keep = () => { setStats((s) => ({ ...s, kept: s.kept + 1 })); next() }
  const lock = () => { if (currentId) onLock(currentId); setStats((s) => ({ ...s, locked: s.locked + 1 })); next() }
  const trash = () => { if (currentId) onTrash(currentId); setStats((s) => ({ ...s, trashed: s.trashed + 1 })); next() }

  const owners = currentId ? bestOwners.get(currentId) ?? [] : []
  const top = owners[0]
  const advice = echo && top ? tuneAdvice(echo, top.profile) : null
  // Echo đang nằm trong bộ ghim của ai — badge 📌 cạnh best-owner để không "Loại" nhầm đồ đang đeo
  const equippedBy = (currentId ? pinnedBy?.get(currentId) : undefined) ?? []

  return (
    <div aria-label={t('triage.title')} className="mx-auto max-w-md space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{done ? t('triage.title') : t('triage.progress', { i: index + 1, n })}</span>
        <button type="button" className="text-slate-500 hover:text-slate-300" onClick={onExit}>✕ {t('triage.exit')}</button>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-800" aria-hidden>
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

          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <button ref={keepRef} type="button" className="flex-[2] rounded bg-sky-700 py-3 text-white hover:bg-sky-600" onClick={keep}>{t('triage.keep')}</button>
            <button type="button" className="flex-1 rounded border border-amber-700 py-3 text-amber-400 hover:bg-amber-950/30" onClick={lock}>{t('triage.lock')}</button>
            <button type="button" className="flex-1 rounded bg-rose-800 py-3 text-white hover:bg-rose-700" onClick={trash}>{t('triage.trash')}</button>
            <button type="button" className="flex-1 rounded border border-slate-600 py-3 capitalize text-slate-300 hover:bg-slate-800" onClick={() => onEdit(echo)}>{t('ranking.edit')}</button>
          </div>
        </>
      )}
    </div>
  )
}
