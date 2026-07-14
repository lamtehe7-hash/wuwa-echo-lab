import { useEffect, useState } from 'react'
import type { CharacterProfile, Echo, RosterAssignment } from '../types'
import { CHARACTERS } from '../data/characters'
import { ELEMENT_COLOR } from '../data/elementColors'
import { solveRoster } from '../engine/roster'
import type { ProfileOverride } from '../store'
import { ROLE_BADGE } from './CharacterPicker'
import LoadoutView from './LoadoutView'
import SetPicker from './SetPicker'
import Stale from './Stale'
import { useT } from '../i18n'

// Gán kho echo cho cả đội: chọn nhân vật theo thứ tự ưu tiên, mỗi echo chỉ 1 người dùng.

interface Props {
  echoes: Echo[]
  /** Override trọng số/erTarget — chỉ dùng làm dep đánh dấu kết quả cũ khi user chỉnh weights */
  overrides: Record<string, ProfileOverride>
  /** Trả về profile đã merge override */
  resolve: (id: string) => CharacterProfile
}

export default function RosterPanel({ echoes, overrides, resolve }: Props) {
  const t = useT()
  const [ids, setIds] = useState<string[]>([])
  const [forced, setForced] = useState<Record<string, string>>({}) // charId → set id ép (rỗng = tự động)
  const [results, setResults] = useState<RosterAssignment[] | null>(null)
  const [stale, setStale] = useState(false)
  const [adding, setAdding] = useState(CHARACTERS[0].id)
  const [addingSet, setAddingSet] = useState('') // set ép mặc định gán kèm khi thêm member

  // Kho echo đổi HOẶC user chỉnh trọng số/erTarget → kết quả gán đội cũ: giữ hiển thị + banner giải lại
  useEffect(() => setStale(true), [echoes, overrides])

  const assign = () => {
    setResults(solveRoster(echoes, ids.map(resolve), forced))
    setStale(false)
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    setIds(next)
    setResults(null) // đội hình đổi = bài toán khác — bỏ kết quả (khác với "cũ")
  }

  const sel = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm'

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-sm font-semibold text-slate-300">{t('roster.help')}</div>
      <div className="flex flex-wrap items-center gap-2">
        <select className={sel} value={adding} onChange={(e) => { setAdding(e.target.value); setAddingSet('') }}>
          {CHARACTERS.filter((c) => !ids.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <SetPicker value={addingSet} preferred={resolve(adding).preferredSets} onChange={setAddingSet} />
        <button
          className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
          onClick={() => {
            if (!ids.includes(adding)) {
              setIds([...ids, adding])
              if (addingSet) setForced((f) => ({ ...f, [adding]: addingSet }))
              setAddingSet('')
              setResults(null)
            }
          }}
        >{t('roster.addMember')}</button>
        <button
          className="ml-auto rounded bg-emerald-700 px-3 py-1 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40"
          disabled={ids.length === 0}
          onClick={assign}
        >{t('roster.assign')}</button>
      </div>

      {ids.length > 0 && (
        <ol className="space-y-1">
          {ids.map((id, i) => {
            const p = resolve(id)
            return (
            <li key={id} className="flex items-center gap-2 rounded bg-slate-900 px-2 py-1 text-sm">
              <span className="w-5 text-center text-xs text-slate-500">{i + 1}</span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ELEMENT_COLOR[p.element] }} />
              <span className="flex-1">
                {p.name}
                <span className="ml-1.5 text-[10px] text-slate-500">{ROLE_BADGE[p.archetype] ?? ''}</span>
              </span>
              <SetPicker
                value={forced[id] ?? ''}
                preferred={p.preferredSets}
                onChange={(v) => { setForced((f) => ({ ...f, [id]: v })); if (results) setStale(true) }}
                className="w-56 px-2 py-1 text-xs"
              />
              <button
                className="px-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30"
                aria-label={t('roster.moveUp')} disabled={i === 0}
                onClick={() => move(i, -1)}
              >↑</button>
              <button
                className="px-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30"
                aria-label={t('roster.moveDown')} disabled={i === ids.length - 1}
                onClick={() => move(i, 1)}
              >↓</button>
              <button
                className="px-1 text-xs text-slate-600 hover:text-rose-400"
                aria-label={t('roster.remove')}
                onClick={() => {
                  setIds(ids.filter((x) => x !== id))
                  setForced((f) => { const n = { ...f }; delete n[id]; return n })
                  setResults(null)
                }}
              >✕</button>
            </li>
            )
          })}
        </ol>
      )}

      {results && (
        <Stale stale={stale} onResolve={assign}>
          {results.map((r) => (
            <div key={r.profile.id} className="border-l-2 pl-2.5" style={{ borderColor: ELEMENT_COLOR[r.profile.element] }}>
              <div className="mb-1 mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ELEMENT_COLOR[r.profile.element] }} />
                {r.profile.name}
                <span className="text-[10px] text-slate-500">{ROLE_BADGE[r.profile.archetype] ?? ''}</span>
              </div>
              <LoadoutView result={r.result} profile={r.profile} />
            </div>
          ))}
        </Stale>
      )}
    </div>
  )
}
