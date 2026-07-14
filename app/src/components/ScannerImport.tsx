import { useState } from 'react'
import type { Echo } from '../types'
import { parseScannerEchoes, type ScannerImportResult } from '../data/importScanner'
import { useT } from '../i18n'

// Import JSON từ scanner echo cộng đồng (wuwa-ocr/wuwa.build ParsedEcho[], Kamera echoes.json,
// hoặc chính export của app). Dán text hoặc chọn file → parse → xem trước → thêm/thay kho.
export default function ScannerImport({
  hasInventory,
  onImport,
}: {
  hasInventory: boolean
  onImport: (echoes: Echo[], mode: 'append' | 'replace') => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [result, setResult] = useState<ScannerImportResult | null>(null)

  const parse = (s: string) => setResult(s.trim() ? parseScannerEchoes(s) : null)

  const FORMAT_LABEL: Record<ScannerImportResult['format'], string> = {
    'parsed-echo': 'wuwa-ocr / wuwa.build', kamera: 'Inventory Kamera', app: t('scanner.fmtApp'), unknown: '—',
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-slate-300">{t('scanner.title')}</span>
        <span className="text-xs text-slate-500">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-slate-500">{t('scanner.hint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".json,application/json"
              className="text-xs text-slate-400"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void f.text().then((s) => { setText(s); parse(s) })
                e.target.value = ''
              }}
            />
            <span className="text-xs text-slate-600">{t('scanner.or')}</span>
          </div>
          <textarea
            className="h-24 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-300"
            placeholder={t('scanner.placeholder')}
            value={text}
            onChange={(e) => { setText(e.target.value); parse(e.target.value) }}
          />
          {result && (
            <div className="space-y-1 rounded border border-slate-800 bg-slate-950/60 p-2 text-xs">
              <div className="text-slate-400">
                {t('scanner.result', { fmt: FORMAT_LABEL[result.format], n: result.echoes.length, m: result.dropped })}
              </div>
              {result.warnings.length > 0 && (
                <ul className="list-inside list-disc text-amber-500/80">
                  {result.warnings.slice(0, 4).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
              {result.echoes.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    className="rounded bg-emerald-700 px-3 py-1 font-semibold hover:bg-emerald-600"
                    onClick={() => { onImport(result.echoes, 'append'); setText(''); setResult(null) }}
                  >{t('scanner.add', { n: result.echoes.length })}</button>
                  {hasInventory && (
                    <button
                      className="rounded border border-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-800"
                      onClick={() => { onImport(result.echoes, 'replace'); setText(''); setResult(null) }}
                    >{t('scanner.replace', { n: result.echoes.length })}</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
