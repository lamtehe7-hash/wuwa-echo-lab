import type { Echo } from '../types'
import { SONATA_BY_ID } from '../data/sonata'
import { echoDisplayName, findEchoInfo } from '../data/echoIndex'
import { iconUrl } from '../data/iconAssets'

// Mảnh row "icon tròn + Tên · cost N · Set" dùng CHUNG cho list preview dạng dòng
// (task 76 — trước đây CleanupPanel + UpgradePlanPanel chép y hệt markup này).
// Là FRAGMENT (không bọc li/span flex) — nơi gọi tự quyết container + phần đuôi row.

export default function EchoLine({ echo }: { echo: Echo }) {
  const info = findEchoInfo(echo.name)
  return (
    <>
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
        <span className="text-slate-200">{echoDisplayName(echo)}</span>
        <span className="text-slate-500"> · cost {echo.cost} · {SONATA_BY_ID[echo.set]?.name}</span>
      </span>
    </>
  )
}
