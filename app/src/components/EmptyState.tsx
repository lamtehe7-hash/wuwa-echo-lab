import { useT } from '../i18n'

// Màn hình lần đầu (kho trống): 3 lối nạp kho làm nút lớn + tóm tắt luồng 3 bước
// (tham khảo onboarding của wuwa.uk — research/ui-ux.md §3.4). Thay cho bảng trống + nút demo nhỏ.

export default function EmptyState({ onOcr, onImportJson, onDemo }: {
  onOcr: () => void
  onImportJson: () => void
  onDemo: () => void
}) {
  const t = useT()
  const cards = [
    { title: t('empty.ocrTitle'), desc: t('empty.ocrDesc'), onClick: onOcr, primary: true },
    { title: t('empty.jsonTitle'), desc: t('empty.jsonDesc'), onClick: onImportJson, primary: false },
    { title: t('empty.demoTitle'), desc: t('empty.demoDesc'), onClick: onDemo, primary: false },
  ]
  return (
    <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{t('empty.title')}</h2>
        <p className="mt-1 text-sm text-slate-400">{t('empty.subtitle')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.title}
            type="button"
            onClick={c.onClick}
            className={`rounded-lg border p-3 text-left transition-colors ${
              c.primary
                ? 'border-sky-700 bg-sky-950/40 hover:bg-sky-950/70'
                : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
            }`}
          >
            <div className="text-sm font-semibold text-slate-100">{c.title}</div>
            <div className="mt-1 text-xs leading-snug text-slate-400">{c.desc}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{t('empty.steps')}</p>
      <p className="text-xs text-slate-600">{t('empty.manualHint')}</p>
    </div>
  )
}
