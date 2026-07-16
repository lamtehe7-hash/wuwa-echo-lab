import { useMemo, useState } from 'react'
import type { CharacterProfile, Echo } from '../types'
import type { OwnerFit } from '../engine/insights'
import { CLEANUP_DEFAULTS, cleanupMatches, type CleanupRule, type CleanupRuleType } from '../engine/cleanup'
import { SONATA_BY_ID } from '../data/sonata'
import { findEchoInfo } from '../data/echoIndex'
import { iconUrl } from '../data/iconAssets'
import PinnedByBadge, { type PinnedOwner } from './PinnedByBadge'
import { useT, useTMessage } from '../i18n'

// F11 (task 62): "Dọn kho theo luật" — panel <details> đóng, TRÊN RankingTable (tab Kho). Chọn 1 luật
// (segmented) → preview echo khớp + lý do → apply = đánh dấu `trash` (reversible, toast undo). KHÔNG xoá
// thẳng, KHÔNG tự động, luôn LOẠI TRỪ echo khoá. Thiết kế + duyệt với wuwa-ui-designer (task 62).

const RULES: CleanupRuleType[] = ['no-owner', 'cost-no-crit', 'low-rv', 'keep-top-n']
const RULE_LABEL: Record<CleanupRuleType, string> = {
  'no-owner': 'cleanup.rule.r1',
  'cost-no-crit': 'cleanup.rule.r2',
  'low-rv': 'cleanup.rule.r3',
  'keep-top-n': 'cleanup.rule.r4',
}

interface Props {
  echoes: Echo[]
  profiles: CharacterProfile[]
  /** App `bestOwnersByEcho` — reuse cho luật no-owner (khỏi tính lại, khỏi lệch ngưỡng fitLevel) */
  ownersByEcho: Map<string, OwnerFit[]>
  /** App `pinnedBy` — echo đang ở BỘ GHIM của ai: badge 📌 trong preview trước khi đánh dấu loại (task 66) */
  pinnedBy?: Map<string, PinnedOwner[]>
  /** Đánh dấu loại (trash) các id + toast undo (App) */
  onApply: (ids: string[]) => void
}

export default function CleanupPanel({ echoes, profiles, ownersByEcho, pinnedBy, onApply }: Props) {
  const t = useT()
  const tm = useTMessage()
  const [ruleType, setRuleType] = useState<CleanupRuleType>('no-owner')
  const [threshold, setThreshold] = useState(CLEANUP_DEFAULTS.lowRvThreshold)
  const [n, setN] = useState(CLEANUP_DEFAULTS.keepTopN)

  const rule: CleanupRule =
    ruleType === 'low-rv' ? { type: 'low-rv', threshold } : ruleType === 'keep-top-n' ? { type: 'keep-top-n', n } : { type: ruleType }
  const matches = useMemo(
    () => cleanupMatches(echoes, rule, { profiles, ownersByEcho }),
    // rule tái tạo mỗi render nhưng phụ thuộc đúng (ruleType/threshold/n) → liệt kê nguyên thuỷ
    [echoes, ruleType, threshold, n, profiles, ownersByEcho],
  )
  const lockedCount = useMemo(() => echoes.filter((e) => e.lock).length, [echoes])

  const chip = (active: boolean) =>
    `rounded px-2 py-1 ${active ? 'bg-sky-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'}`

  return (
    <details className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        🧹 {t('cleanup.title')}
        <span className="ml-2 text-xs font-normal text-slate-500">{t('cleanup.subtitle')}</span>
      </summary>

      <div className="mt-2 space-y-2 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {RULES.map((r) => (
            <button key={r} type="button" aria-pressed={ruleType === r} className={chip(ruleType === r)} onClick={() => setRuleType(r)}>
              {t(RULE_LABEL[r])}
            </button>
          ))}
        </div>

        {ruleType === 'no-owner' && <p className="text-slate-500">{t('cleanup.desc.r1')}</p>}
        {ruleType === 'cost-no-crit' && <p className="text-slate-500">{t('cleanup.desc.r2')}</p>}
        {ruleType === 'low-rv' && (
          <label className="flex items-center gap-2 text-slate-400">
            {t('cleanup.thresholdLabel')}
            <input
              type="number" min={0} max={1} step={0.05} value={threshold}
              aria-label={t('cleanup.thresholdLabel')}
              onChange={(e) => setThreshold(Math.max(0, Math.min(1, Number(e.target.value) || 0)))}
              className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1"
            />
          </label>
        )}
        {ruleType === 'keep-top-n' && (
          <label className="flex items-center gap-2 text-slate-400">
            {t('cleanup.topNLabel')}
            <input
              type="number" min={1} value={n}
              aria-label={t('cleanup.topNLabel')}
              onChange={(e) => setN(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1"
            />
          </label>
        )}

        <p className="text-slate-300">{t('cleanup.preview', { n: matches.length })}</p>
        {/* dòng khoá TÁCH RIÊNG + nhạt/nhỏ hơn (góp ý designer): đây là TỔNG echo khoá trong kho, không
            phải "trong N có M khoá" — tránh đọc gộp */}
        {lockedCount > 0 && <p className="text-[10px] text-slate-500">🔒 {t('cleanup.lockedKept', { m: lockedCount })}</p>}

        {matches.length > 0 && (
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-950/40 p-1.5">
            {matches.map(({ echo, reason }) => {
              const info = findEchoInfo(echo.name)
              return (
                <li key={echo.id} className="flex flex-wrap items-center gap-1.5">
                  {info ? (
                    <img
                      src={iconUrl(info.icon)} alt="" loading="lazy" referrerPolicy="no-referrer"
                      className="h-6 w-6 shrink-0 rounded-full border border-slate-700 bg-slate-800 object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <span className="h-6 w-6 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-slate-200">{echo.name || SONATA_BY_ID[echo.set]?.name || echo.set}</span>
                    <span className="text-slate-500"> · cost {echo.cost} · {SONATA_BY_ID[echo.set]?.name}</span>
                  </span>
                  <PinnedByBadge owners={pinnedBy?.get(echo.id) ?? []} />
                  <span className="shrink-0 text-rose-400">{tm(reason)}</span>
                </li>
              )
            })}
          </ul>
        )}

        <button
          type="button"
          disabled={matches.length === 0}
          title={matches.length === 0 ? t('cleanup.applyDisabled') : undefined}
          className="rounded bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onApply(matches.map((m) => m.echo.id))}
        >
          {t('cleanup.apply', { n: matches.length })}
        </button>
      </div>
    </details>
  )
}
