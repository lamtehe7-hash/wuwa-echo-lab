import { useState } from 'react'
import type { Vault } from '../store'
import { useT } from '../i18n'

// Chuyển đổi / quản lý nhiều "kho" echo (C5) — main account, alt account… mỗi kho lưu riêng
// localStorage (echoes + overrides + equipped). Dùng prompt/confirm cho gọn (như confirm xoá echo).
export default function VaultBar({
  vaults,
  activeId,
  setActiveId,
  addVault,
  renameVault,
  deleteVault,
}: {
  vaults: Vault[]
  activeId: string
  setActiveId: (id: string) => void
  addVault: (name: string) => string
  renameVault: (id: string, name: string) => void
  deleteVault: (id: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const active = vaults.find((v) => v.id === activeId)

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
        onClick={() => setOpen((o) => !o)}
        title={t('vault.tip')}
      >
        🗄 {active?.name ?? '—'}
        {vaults.length > 1 && <span className="rounded-full bg-slate-800 px-1 text-[10px] text-slate-400">{vaults.length}</span>}
        <span className="text-slate-500">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-60 rounded border border-slate-700 bg-slate-900 p-1 text-xs shadow-xl">
            {vaults.map((v) => (
              <div key={v.id} className={`flex items-center gap-1 rounded px-1 ${v.id === activeId ? 'bg-slate-800' : ''}`}>
                <button
                  className={`flex-1 truncate py-1 text-left ${v.id === activeId ? 'font-semibold text-sky-300' : 'text-slate-300 hover:text-slate-100'}`}
                  onClick={() => { setActiveId(v.id); setOpen(false) }}
                >
                  {v.id === activeId ? '● ' : '○ '}{v.name}
                </button>
                <button
                  className="px-1 text-slate-500 hover:text-slate-200"
                  title={t('vault.rename')}
                  onClick={() => { const n = window.prompt(t('vault.renamePrompt'), v.name); if (n !== null) renameVault(v.id, n) }}
                >✎</button>
                {vaults.length > 1 && (
                  <button
                    className="px-1 text-slate-500 hover:text-rose-400"
                    title={t('vault.delete')}
                    onClick={() => { if (window.confirm(t('vault.deleteConfirm', { name: v.name }))) deleteVault(v.id) }}
                  >🗑</button>
                )}
              </div>
            ))}
            <button
              className="mt-1 w-full rounded border border-dashed border-slate-700 py-1 text-slate-400 hover:bg-slate-800"
              onClick={() => { const n = window.prompt(t('vault.newPrompt'), ''); if (n !== null) { addVault(n); setOpen(false) } }}
            >＋ {t('vault.new')}</button>
          </div>
        </>
      )}
    </div>
  )
}
