import { useEffect, useState } from 'react'
import { findEchoInfo } from '../data/echoIndex'
import { iconUrl } from '../data/iconAssets'
import { mainEchoesFor } from '../data/mainEchoes'
import { SONATA_BY_ID } from '../data/sonata'
import { useLang, useT } from '../i18n'

// "Main echo đề cử" cho nhân vật đang chọn (cơ chế: research/main-echo.md) — echo cost-4 đặt ở
// slot đầu để lấy Echo Skill/buff passive. Hiện cạnh chọn set ở tab Tối ưu. ownedNames (nếu có) →
// đánh dấu ✓ echo mà kho user đang có. Khi user đã CHỌN set (hasSelectedSet) → tự THU GỌN (còn 1
// dòng tóm tắt BiS), bấm tiêu đề để mở lại xem đủ. reason hiển thị theo ngôn ngữ (reasonVi khi VI).

export default function MainEchoHint({
  charId,
  ownedNames,
  hasSelectedSet = false,
}: {
  charId: string
  ownedNames?: Set<string>
  hasSelectedSet?: boolean
}) {
  const t = useT()
  const { lang } = useLang()
  const recs = mainEchoesFor(charId)
  const [collapsed, setCollapsed] = useState(hasSelectedSet)

  // Tự thu gọn khi user chọn set (đã quyết định), tự mở khi bỏ chọn; đổi nhân vật cũng reset theo.
  useEffect(() => setCollapsed(hasSelectedSet), [hasSelectedSet, charId])

  if (recs.length === 0) return null

  const best = recs[0]
  const bestSet = SONATA_BY_ID[best.set]?.name ?? best.set

  return (
    <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 px-3 py-2">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-1.5 text-left text-xs font-semibold text-amber-300"
      >
        <span className="w-3 shrink-0 text-slate-500">{collapsed ? '▸' : '▾'}</span>
        <span>💡 {t('mainEcho.title')}</span>
        {collapsed && (
          <span className="min-w-0 flex-1 truncate font-normal text-slate-400">
            : {best.echo} · {bestSet}
          </span>
        )}
        <span
          className="ml-auto shrink-0 cursor-help font-normal text-slate-500"
          title={t('mainEcho.hint')}
          onClick={(e) => e.stopPropagation()}
        >
          ⓘ
        </span>
      </button>

      {!collapsed && (
        <div className="mt-1.5 space-y-1.5">
          {recs.map((r, i) => {
            const info = findEchoInfo(r.echo)
            const sonata = SONATA_BY_ID[r.set]
            const owned = ownedNames?.has(r.echo.trim().toLowerCase())
            const reason = lang === 'vi' ? r.reasonVi : r.reason
            return (
              <div key={`${r.echo}·${r.set}·${i}`} className="text-xs">
                <div className="flex items-center gap-1.5">
                  {info ? (
                    <img
                      src={iconUrl(info.icon)}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-6 w-6 shrink-0 rounded-full border border-slate-700 bg-slate-800 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-800 text-[10px] text-slate-500">
                      {r.echo.charAt(0)}
                    </span>
                  )}
                  <span className={i === 0 ? 'font-medium text-slate-100' : 'text-slate-300'}>{r.echo}</span>
                  {i === 0 && (
                    <span className="rounded bg-amber-900/50 px-1 py-px text-[10px] text-amber-300">{t('mainEcho.best')}</span>
                  )}
                  {owned && (
                    <span className="text-emerald-400" title={t('mainEcho.owned')}>
                      ✓
                    </span>
                  )}
                  <span className="shrink-0 text-slate-500">· {sonata?.name ?? r.set}</span>
                </div>
                <div className="mt-0.5 pl-[30px] leading-snug text-slate-400">— {reason}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
