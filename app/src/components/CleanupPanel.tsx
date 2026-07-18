import { useMemo, useState } from 'react'
import type { CharacterProfile, Echo } from '../types'
import type { OwnerFit } from '../engine/insights'
import { CLEANUP_DEFAULTS, cleanupMatches, type CleanupRule, type CleanupRuleType } from '../engine/cleanup'
import EchoLine from './EchoLine'
import PinnedByBadge, { type PinnedOwner } from './PinnedByBadge'
import { usePanelOpen } from './usePanelOpen'
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
/** P2 (ui-redesign): nhãn chip rút 1 dòng → mô tả đầy đủ nằm ở title */
const RULE_DESC: Record<CleanupRuleType, string> = {
  'no-owner': 'cleanup.desc.r1',
  'cost-no-crit': 'cleanup.desc.r2',
  'low-rv': 'cleanup.desc.r3',
  'keep-top-n': 'cleanup.desc.r4',
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
  const panel = usePanelOpen('cleanup') // P6: nhớ mở/đóng

  return (
    <details {...panel} className="mb-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
        🧹 {t('cleanup.title')}
        <span className="ml-2 text-xs font-normal text-slate-500">{t('cleanup.subtitle')}</span>
      </summary>

      <div className="mt-2 space-y-2 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {RULES.map((r) => (
            <button
              key={r} type="button" aria-pressed={ruleType === r} className={`whitespace-nowrap ${chip(ruleType === r)}`}
              title={t(RULE_DESC[r])} onClick={() => setRuleType(r)}
            >
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
            {matches.map(({ echo, reason }) => (
              <li key={echo.id} className="flex flex-wrap items-center gap-1.5">
                <EchoLine echo={echo} />
                <PinnedByBadge owners={pinnedBy?.get(echo.id) ?? []} />
                <span className="shrink-0 text-rose-400">{tm(reason)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* P2: disabled = slate trung tính — amber CHỈ khi thật sự có gì để đánh dấu */}
        <button
          type="button"
          disabled={matches.length === 0}
          title={matches.length === 0 ? t('cleanup.applyDisabled') : undefined}
          className={`rounded px-3 py-1.5 font-semibold ${matches.length === 0
            ? 'cursor-not-allowed bg-slate-800 text-slate-500'
            : 'bg-amber-700 text-white hover:bg-amber-600'}`}
          onClick={() => onApply(matches.map((m) => m.echo.id))}
        >
          {t('cleanup.apply', { n: matches.length })}
        </button>
      </div>
    </details>
  )
}
