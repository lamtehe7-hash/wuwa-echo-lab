import { useEffect, useState } from 'react'
import type { CharacterProfile, Echo, RosterAssignment } from '../types'
import { CHARACTERS } from '../data/characters'
import { solveRoster } from '../engine/roster'
import LoadoutView from './LoadoutView'
import { useT } from '../i18n'

// Gán kho echo cho cả đội: chọn nhân vật theo thứ tự ưu tiên, mỗi echo chỉ 1 người dùng.

interface Props {
  echoes: Echo[]
  /** Trả về profile đã merge override */
  resolve: (id: string) => CharacterProfile
}

export default function RosterPanel({ echoes, resolve }: Props) {
  const t = useT()
  const [ids, setIds] = useState<string[]>([])
  const [results, setResults] = useState<RosterAssignment[] | null>(null)
  const [adding, setAdding] = useState(CHARACTERS[0].id)

  // Kho echo đổi → kết quả gán đội cũ không còn khớp
  useEffect(() => setResults(null), [echoes])

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    setIds(next)
    setResults(null)
  }

  const sel = 'bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm'

  return (
    <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-sm font-semibold text-slate-300">{t('roster.help')}</div>
      <div className="flex flex-wrap items-center gap-2">
        <select className={sel} value={adding} onChange={(e) => setAdding(e.target.value)}>
          {CHARACTERS.filter((c) => !ids.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
          onClick={() => { if (!ids.includes(adding)) { setIds([...ids, adding]); setResults(null) } }}
        >{t('roster.addMember')}</button>
        <button
          className="ml-auto rounded bg-emerald-700 px-3 py-1 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-40"
          disabled={ids.length === 0}
          onClick={() => setResults(solveRoster(echoes, ids.map(resolve)))}
        >{t('roster.assign')}</button>
      </div>

      {ids.length > 0 && (
        <ol className="space-y-1">
          {ids.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded bg-slate-900 px-2 py-1 text-sm">
              <span className="w-5 text-center text-xs text-slate-500">{i + 1}</span>
              <span className="flex-1">{resolve(id).name}</span>
              <button className="px-1 text-xs text-slate-500 hover:text-slate-300" onClick={() => move(i, -1)}>↑</button>
              <button className="px-1 text-xs text-slate-500 hover:text-slate-300" onClick={() => move(i, 1)}>↓</button>
              <button className="px-1 text-xs text-slate-600 hover:text-rose-400" onClick={() => { setIds(ids.filter((x) => x !== id)); setResults(null) }}>✕</button>
            </li>
          ))}
        </ol>
      )}

      {results?.map((r) => (
        <div key={r.profile.id}>
          <div className="mb-1 mt-2 text-sm font-medium text-slate-200">{r.profile.name}</div>
          <LoadoutView result={r.result} profile={r.profile} />
        </div>
      ))}
    </div>
  )
}
