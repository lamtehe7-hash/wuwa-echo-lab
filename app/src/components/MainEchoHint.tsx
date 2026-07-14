import { findEchoInfo } from '../data/echoIndex'
import { iconUrl } from '../data/iconAssets'
import { mainEchoesFor } from '../data/mainEchoes'
import { SONATA_BY_ID } from '../data/sonata'
import { useT } from '../i18n'

// "Main echo đề cử" cho nhân vật đang chọn (cơ chế: research/main-echo.md) — echo cost-4 đặt ở
// slot đầu để lấy Echo Skill/buff passive. Hiện cạnh chọn set ở tab Tối ưu. ownedNames (nếu có) →
// đánh dấu ✓ echo mà kho user đang có.

export default function MainEchoHint({ charId, ownedNames }: { charId: string; ownedNames?: Set<string> }) {
  const t = useT()
  const recs = mainEchoesFor(charId)
  if (recs.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-900/50 bg-amber-950/10 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
        💡 {t('mainEcho.title')}
        <span className="cursor-help font-normal text-slate-500" title={t('mainEcho.hint')}>ⓘ</span>
      </div>
      <div className="space-y-1">
        {recs.map((r, i) => {
          const info = findEchoInfo(r.echo)
          const sonata = SONATA_BY_ID[r.set]
          const owned = ownedNames?.has(r.echo.trim().toLowerCase())
          return (
            <div key={r.echo} className="flex items-center gap-1.5 text-xs" title={r.reason}>
              {info ? (
                <img
                  src={iconUrl(info.icon)}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-6 w-6 shrink-0 rounded-full border border-slate-700 bg-slate-800 object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-800 text-[10px] text-slate-500">
                  {r.echo.charAt(0)}
                </span>
              )}
              <span className={i === 0 ? 'font-medium text-slate-100' : 'text-slate-300'}>{r.echo}</span>
              {i === 0 && <span className="rounded bg-amber-900/50 px-1 py-px text-[10px] text-amber-300">{t('mainEcho.best')}</span>}
              {owned && <span className="text-emerald-400" title={t('mainEcho.owned')}>✓</span>}
              <span className="shrink-0 text-slate-500">· {sonata?.name ?? r.set}</span>
              <span className="min-w-0 flex-1 truncate text-slate-500">— {r.reason}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
