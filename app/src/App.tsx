import { useEffect, useMemo, useRef, useState } from 'react'
import CharacterPicker from './components/CharacterPicker'
import EchoEditModal from './components/EchoEditModal'
import EchoForm from './components/EchoForm'
import EmptyState from './components/EmptyState'
import LoadoutView from './components/LoadoutView'
import MainEchoHint from './components/MainEchoHint'
import OcrImport from './components/OcrImport'
import RankingTable from './components/RankingTable'
import RosterPanel from './components/RosterPanel'
import SetPicker from './components/SetPicker'
import Stale from './components/Stale'
import SubstatLegend from './components/SubstatLegend'
import { useToast } from './components/Toast'
import WeightEditor from './components/WeightEditor'
import BuildEditor from './components/BuildEditor'
import BenchPanel from './components/BenchPanel'
import { CHARACTERS, CHARACTER_BY_ID } from './data/characters'
import { DEMO_ECHOES } from './data/demo'
import { SONATA_SETS } from './data/sonata'
import { loadoutDamage } from './engine/damage'
import { bestOwners, setBacklog, upgradeQueue } from './engine/insights'
import { canAnchorMore, dominantSet, scoreLoadout, solveBest5, type SolveObjective } from './engine/solver'
import { echoDisplayName } from './data/echoIndex'
import InfoTip from './components/InfoTip'
import SetFarmPriority from './components/SetFarmPriority'
import FarmingBacklog from './components/FarmingBacklog'
import CleanupPanel from './components/CleanupPanel'
import UpgradePlanPanel from './components/UpgradePlanPanel'
import TriagePanel from './components/TriagePanel'
import PinnedOverview, { type PinnedRow } from './components/PinnedOverview'
import type { PinnedOwner } from './components/PinnedByBadge'
import { useLang, useT } from './i18n'
import { exportJson, importJson, mergeProfile, newId, onPersistError, useCrossTabWarning, useEchoInventory, useEquipped, useOverrides, usePinned, useVaults, VaultIdContext } from './store'
import ScannerImport from './components/ScannerImport'
import VaultBar from './components/VaultBar'
import type { BuildContext, CharacterProfile, Echo, LoadoutResult } from './types'

// Điều hướng tab theo tác vụ (pattern GO/Fribbels/wuwa.build — research/ui-ux.md §3):
// Kho / Tối ưu / Đội hình / Import. Trạng thái tab + nhân vật sync vào URL hash
// (#optimize?char=changli) để F5/share giữ ngữ cảnh; replaceState để không spam history.

// C4 (ui-redesign): tab 'plan' gom 5 panel kế hoạch (trước rải ở Kho + Đội hình)
const TABS = ['inventory', 'optimize', 'plan', 'roster', 'import'] as const
type Tab = (typeof TABS)[number]

// Nguồn dự án (mã nguồn mở) — hiện ở header + footer để người mở tool biết xuất xứ / cách đóng góp.
const REPO = 'https://github.com/lamtehe7-hash/wuwa-echo-lab'
const LIVE = 'https://lamtehe7-hash.github.io/wuwa-echo-lab/'

// Logo GitHub (inline SVG — tự chứa, không phụ thuộc CDN/icon lib)
function GithubMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function parseHash(): { tab: Tab; char?: string } {
  const [path, query] = window.location.hash.replace(/^#/, '').split('?')
  const tab = (TABS as readonly string[]).includes(path) ? (path as Tab) : 'inventory'
  const char = new URLSearchParams(query).get('char') ?? undefined
  return { tab, char }
}

const EMPTY_BENCH: (string | null)[] = [null, null, null, null, null]

// Nạp danh sách echo vào 5 ô bàn thử (prefill bộ solver + nút Xem/sửa bộ hiện tại):
// echo cost-4 vào ô 0 (main echo), còn lại lấp ô 1–4 theo thứ tự.
function toBenchSlots(list: Echo[]): (string | null)[] {
  const slots: (string | null)[] = [null, null, null, null, null]
  const main = list.find((e) => e.cost === 4) ?? list[0]
  slots[0] = main ? main.id : null
  let idx = 1
  for (const e of list) {
    if (e === main) continue
    if (idx < 5) slots[idx++] = e.id
  }
  return slots
}

function AppInner({ vaultId, vaults }: { vaultId: string; vaults: ReturnType<typeof useVaults> }) {
  const t = useT()
  const { lang, setLang } = useLang()
  const push = useToast()
  const { echoes, setEchoes } = useEchoInventory(vaultId)
  const { overrides, setOverrides } = useOverrides(vaultId)
  const { equipped, setEquipped } = useEquipped(vaultId)
  const { pinned, setPinned } = usePinned(vaultId) // F14: echo ghim per-char (ép vào bộ solve)
  const initial = useRef(parseHash()).current
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [charId, setCharId] = useState(
    initial.char && CHARACTER_BY_ID[initial.char] ? initial.char : CHARACTERS[0].id,
  )
  const [loadout, setLoadout] = useState<LoadoutResult | null>(null)
  const [solved, setSolved] = useState(false)
  const [solveTick, setSolveTick] = useState(0)
  const [stale, setStale] = useState(false)
  const [forcedSet, setForcedSet] = useState('') // '' = tự động; set id = ép solver theo set đó
  const [objective, setObjective] = useState<SolveObjective>('score') // 'damage' = re-rank top-N theo damage model
  // U1 (task 58): 1 panel công cụ mở tại một thời điểm (trước là 3 state độc lập → mở chồng 3 khối).
  // Editor ghi thẳng vào overrides mỗi lần đổi nên đóng panel không mất dữ liệu.
  const [activeTool, setActiveTool] = useState<'weights' | 'build' | 'bench' | null>(null)
  // U9: pill "Mới" trên Bench/Damage — tắt vĩnh viễn sau lần đầu user bấm (pattern VIEW_KEY RankingTable)
  const [newBench, setNewBench] = useState(() => {
    try { return localStorage.getItem('wuwa-seen:bench') !== '1' } catch { return false }
  })
  const [newDamage, setNewDamage] = useState(() => {
    try { return localStorage.getItem('wuwa-seen:damage') !== '1' } catch { return false }
  })
  const markSeen = (key: 'bench' | 'damage') => {
    try { localStorage.setItem(`wuwa-seen:${key}`, '1') } catch { /* storage bị chặn — pill hiện lại lần sau, vô hại */ }
  }
  const [benchSlots, setBenchSlots] = useState<(string | null)[]>(EMPTY_BENCH)
  const [editingEcho, setEditingEcho] = useState<Echo | null>(null)
  // F4 (task 63): Triage Queue — duyệt lần lượt. triageActive bật view thay thế trong tab Kho.
  const [triageActive, setTriageActive] = useState(false)
  const [triageOrder, setTriageOrder] = useState<'worst' | 'newest'>('worst')
  const fileRef = useRef<HTMLInputElement>(null)
  // Toolbar segmented (luôn mounted) — mốc scrollIntoView khi mở bench từ thanh Bộ hiện tại bên dưới
  const toolbarRef = useRef<HTMLDivElement>(null)

  // State → hash (không bắn hashchange nên không loop); hashchange ngược lại cho back/sửa URL tay
  useEffect(() => {
    history.replaceState(null, '', `#${tab}?char=${charId}`)
  }, [tab, charId])
  useEffect(() => {
    const onHash = () => {
      const p = parseHash()
      setTab(p.tab)
      if (p.char && CHARACTER_BY_ID[p.char]) setCharId(p.char)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Functional update để lưu HÀNG LOẠT từ OCR không mất echo (closure stale khi gọi liên tiếp)
  const addEcho = (echo: Echo) => setEchoes((prev) => [...prev, echo])

  // localStorage.setItem fail (quota/chặn) → cảnh báo user 1 lần (đừng chỉ console.error —
  // mất sạch thay đổi khi reload mà không ai biết; review 16/07). Gợi ý Xuất JSON để sao lưu.
  useEffect(() => {
    onPersistError(() => push(t('app.persistError'), { kind: 'error' }))
    return () => onPersistError(null)
  }, [push, t])

  // 2 tab cùng origin = tab ghi sau ĐÈ toàn bộ kho của tab kia (review 19/07). Phát hiện tab khác
  // vừa ghi vào namespace app → cảnh báo user đóng bớt tab / tải lại trước khi thao tác tiếp.
  const crossTab = useCrossTabWarning()
  useEffect(() => {
    // Nút "Tải lại ngay" = hoà giải tối thiểu: reload đọc lại localStorage (bản tab kia vừa ghi
    // thắng), bỏ state RAM cũ ở tab này — hết cửa ghi đè chéo mà không cần merge theo timestamp.
    // sticky: cảnh báo phải sống tới khi user hành động — tự tắt 6s thì user rời máy quay lại
    // không thấy gì và ghi đè đúng như kịch bản backlog #10 định chặn (review đối kháng 19/07).
    if (crossTab) push(t('app.crossTab'), { kind: 'error', sticky: true, action: { label: t('app.crossTabReload'), fn: () => location.reload() } })
  }, [crossTab, push, t])

  // Hoàn tác xoá an toàn (review 16/07): closure undo cũ không được hồi sinh echo vào kho đã bị
  // THAY THẾ toàn bộ (import/demo) — generation bump vô hiệu nó; và bỏ qua id đã tồn tại
  // (xoá → re-import → hoàn tác từng tạo 2 echo trùng id làm hỏng các thao tác per-id sau đó).
  const inventoryGen = useRef(0)
  const replaceInventory = (next: Echo[]) => {
    inventoryGen.current++
    setEchoes(next)
  }
  const restoreEchoes = (removed: Echo[], gen: number) => {
    if (inventoryGen.current !== gen) {
      push(t('toast.undoExpired'), { kind: 'error' })
      return
    }
    setEchoes((prev) => {
      const ids = new Set(prev.map((e) => e.id))
      const back = removed.filter((e) => !ids.has(e.id))
      return back.length > 0 ? [...prev, ...back] : prev
    })
  }

  const resolve = (id: string) => mergeProfile(CHARACTER_BY_ID[id], overrides[id])
  // useMemo giữ identity profile giữa các render — memo chấm điểm trong RankingTable mới có tác dụng
  const profile = useMemo(() => mergeProfile(CHARACTER_BY_ID[charId], overrides[charId]), [charId, overrides])

  // F1/F2 (task 58): roster profile THẬT (bỏ preset generic) đã merge override — input cross-roster
  const allProfiles = useMemo(
    () => CHARACTERS.filter((c) => !c.id.startsWith('generic')).map((c) => mergeProfile(c, overrides[c.id])),
    [overrides],
  )
  // Memo RIÊNG khỏi rows của bảng (không phụ thuộc search/filter/sort — gõ search không tính lại 39×N)
  const bestOwnersByEcho = useMemo(
    () => new Map(echoes.map((e) => [e.id, bestOwners(e, allProfiles, 3)])),
    [echoes, allProfiles],
  )
  // F3+F6 (task 72): hàng đợi nâng cấp — TOÀN BỘ đã sort theo gainPerTuner (panel cắt top-10)
  const upgradeRows = useMemo(() => upgradeQueue(echoes, bestOwnersByEcho), [echoes, bestOwnersByEcho])

  // U7 (task 60): echo id → nhân vật đang ghim bộ CHỨA echo đó (1 echo có thể ở bộ ghim nhiều người).
  // Badge "Đang dùng bởi X" ở kho/bàn thử — ngăn kéo nhầm echo BiS của main sang thử nhân vật phụ.
  const pinnedBy = useMemo(() => {
    const m = new Map<string, PinnedOwner[]>()
    for (const [cid, ids] of Object.entries(equipped)) {
      const base = CHARACTER_BY_ID[cid]
      if (!base || !ids?.length) continue
      const owner: PinnedOwner = { id: cid, name: base.name, element: base.element }
      for (const eid of ids) {
        const arr = m.get(eid)
        if (arr) arr.push(owner)
        else m.set(eid, [owner])
      }
    }
    return m
  }, [equipped])

  // Map tra echo theo id — dùng chung pinnedRows/equippedInfo/anchored/triage/delete (task 67 hoist
  // lên đây, trước chỗ dùng đầu tiên; trước đây pinnedRows tự echoes.find O(N) mỗi id)
  const echoById = useMemo(() => new Map(echoes.map((e) => [e.id, e])), [echoes])
  // Chấm 1 bộ đã ghim theo danh sách id — CÙNG công thức cho equippedInfo (nhân vật đang chọn)
  // lẫn pinnedRows (mọi nhân vật, U6) để 2 chỗ không bao giờ drift (task 67)
  const scoreEquipped = (ids: string[], p: CharacterProfile, build?: BuildContext) => {
    const found = ids.map((id) => echoById.get(id)).filter((e): e is Echo => e !== undefined)
    return { result: scoreLoadout(found, p, build), missing: ids.length - found.length }
  }

  // U6 (task 60): tổng quan mọi nhân vật có bộ ghim. Thứ tự theo roster gốc (allProfiles), không sort điểm.
  const pinnedRows = useMemo<PinnedRow[]>(
    () =>
      allProfiles
        .filter((p) => equipped[p.id]?.length)
        .map((p) => {
          const { result, missing } = scoreEquipped(equipped[p.id], p, overrides[p.id]?.build)
          return { profile: p, total: result?.total ?? null, missing }
        }),
    // scoreEquipped là closure render-scope — dep thật của nó là echoById (đã liệt kê)
    [allProfiles, equipped, echoById, overrides],
  )

  // Đổi nhân vật đang tối ưu (CharacterPicker + bấm tên trong Best Owner): kết quả cũ thuộc
  // nhân vật khác → bỏ hẳn (khác stale); set đề cử khác nhau → bỏ ràng buộc set; reset bàn thử.
  const switchChar = (id: string) => {
    setCharId(id)
    setSolved(false)
    setLoadout(null)
    setStale(false)
    setForcedSet('')
    setBenchSlots(EMPTY_BENCH)
  }
  const jumpToChar = (id: string) => {
    switchChar(id)
    setTab('optimize')
  }

  // Build context (vũ khí+base+buff) cho damage model + ngân sách ER thật của solver (task 55)
  const buildCtx = overrides[charId]?.build

  // "Bộ hiện tại" đã ghi nhớ của nhân vật đang chọn — chấm lại theo kho/trọng số MỚI NHẤT
  // (cùng objective + cùng ctx với solver) để delta trước–sau luôn cùng thang
  const equippedInfo = useMemo(() => {
    const ids = equipped[charId]
    if (!ids || ids.length === 0) return null
    return scoreEquipped(ids, profile, buildCtx)
  }, [equipped, charId, echoById, profile, buildCtx])

  // Kho/trọng số đổi → kết quả solve không còn khớp: GIỮ hiển thị nhưng đánh dấu cũ (mờ + nút giải lại)
  useEffect(() => {
    setStale(true)
  }, [echoes, overrides])

  // Set nạp buff cho BuildEditor: ưu tiên set TRỘI của kết quả solve còn mới (khớp bảng breakdown
  // trong LoadoutView — hết lệch 2 con số CR, lỗ hổng UI ghi nhận 16/07); chưa solve/đã stale thì
  // đoán theo forcedSet/preferred[0] như cũ.
  const assumedSet = forcedSet || profile.preferredSets[0]
  const activeSet = (solved && !stale && loadout ? dominantSet(loadout.setCounts) : undefined) ?? assumedSet
  // Số mảnh THẬT của activeSet trong bộ solve còn mới — buff set ngưỡng pieces (5pc) chỉ tự bật khi
  // đủ; set chỉ là ĐOÁN (assumedSet, chưa solve/stale) → undefined = không tự bật (review 19/07).
  const activeSetPieces = solved && !stale && loadout ? loadout.setCounts[activeSet] : undefined

  const solve = () => {
    setLoadout(solveBest5(usableEchoes, profile, { forcedSet: forcedSet || undefined, objective, ctx: buildCtx, pinned: activePinned[charId] }))
    setSolved(true)
    setStale(false)
    setSolveTick((n) => n + 1) // báo hiệu MainEchoHint thu gọn sau mỗi lần "Tìm bộ 5 tối ưu"
  }

  // F14: echo NEO cho nhân vật đang chọn (ép vào bộ solve lần sau). Neo/bỏ neo → kết quả cũ (Giải lại).
  const anchoredIds = useMemo(() => new Set(pinned[charId] ?? []), [pinned, charId])
  // Task 66: pin "SỐNG" = echo còn trong kho + chưa trash — nguồn DUY NHẤT đưa vào engine
  // (id chết mà vẫn truyền thì solver lặng lẽ bỏ neo trong khi UI vẫn báo "đã neo"). Id chết GIỮ
  // trong store (undo trash còn phục hồi neo) — user dọn tường minh bằng nút "Dọn neo hỏng".
  const activePinned = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const [cid, ids] of Object.entries(pinned)) {
      if (!ids?.length) continue
      const alive = ids.filter((id) => { const e = echoById.get(id); return !!e && !e.trash })
      if (alive.length) out[cid] = alive
    }
    return out
  }, [pinned, echoById])
  const anchoredEchoes = useMemo(
    () => (activePinned[charId] ?? []).map((id) => echoById.get(id)).filter((e): e is Echo => !!e),
    [activePinned, charId, echoById],
  )
  const anchoredCost = anchoredEchoes.reduce((s, e) => s + e.cost, 0)
  // Neo hỏng = id còn trong pinned nhưng echo đã xoá/đã loại — hiện cảnh báo + nút dọn
  const deadAnchors = anchoredIds.size - anchoredEchoes.length
  const pruneDeadAnchors = () => {
    setPinned((prev) => ({ ...prev, [charId]: (prev[charId] ?? []).filter((id) => { const e = echoById.get(id); return !!e && !e.trash }) }))
  }
  const toggleAnchor = (echoId: string) => {
    setPinned((prev) => {
      const cur = prev[charId] ?? []
      const next = cur.includes(echoId) ? cur.filter((id) => id !== echoId) : [...cur, echoId]
      return { ...prev, [charId]: next }
    })
    if (solved) setStale(true)
  }
  const clearAnchors = () => {
    setPinned((prev) => ({ ...prev, [charId]: [] }))
    if (solved) setStale(true)
  }
  // Lý do (đã dịch) không cho neo thêm echo này — null = cho neo (dùng chặn nút ⚓ ở LoadoutView/Bench)
  const anchorBlock = (echo: Echo): string | null => {
    if (anchoredIds.has(echo.id)) return null // đã neo → luôn cho bỏ neo
    // Task 66: 1 echo chỉ neo cho 1 nhân vật — neo trùng làm solveRoster reserve chéo, cả hai mất
    for (const [cid, ids] of Object.entries(pinned)) {
      if (cid !== charId && ids?.includes(echo.id)) {
        return t('anchor.pinnedElsewhere', { name: CHARACTER_BY_ID[cid]?.name ?? cid })
      }
    }
    const chk = canAnchorMore(anchoredEchoes, echo)
    if (chk.ok) return null
    if (chk.reason === 'count') return t('anchor.capCount')
    if (chk.reason === 'cost') return t('anchor.capCost')
    return t('anchor.capGroup', { cap: chk.cap ?? 0, c: echo.cost })
  }

  // Mở/đóng panel công cụ (U1: bấm segment đang mở = đóng). Bench prefill 1 LẦN khi MỞ + ô còn
  // trống + đã có bộ solver; chưa solve thì 5 ô trống. Không watch `loadout` bằng effect kẻo đè chỉnh tay.
  const toggleTool = (tool: 'weights' | 'build' | 'bench') => {
    if (tool === 'bench') {
      if (activeTool !== 'bench' && benchSlots.every((s) => s === null) && loadout) {
        setBenchSlots(toBenchSlots(loadout.echoes.map((s) => s.echo)))
      }
      if (newBench) { setNewBench(false); markSeen('bench') }
    }
    setActiveTool((cur) => (cur === tool ? null : tool))
  }

  // Nạp bộ đã ghi nhớ vào Bàn thử bộ để xem/sửa (nút "🧰 Xem/sửa" trên thanh Bộ hiện tại).
  // Id đã xoá khỏi kho tự rơi khỏi list; đặt ô qua toBenchSlots (cost-4 → ô 👑) như prefill solver.
  // Force-open chứ KHÔNG toggleTool (bấm lại = nạp lại, không đóng panel); bench render PHÍA TRÊN
  // nút này nên phải scroll lên toolbar kẻo panel mở ngoài viewport mà user không thấy.
  const loadEquippedIntoBench = () => {
    const live = (equipped[charId] ?? []).flatMap((id) => { const e = echoById.get(id); return e ? [e] : [] })
    const prevSlots = benchSlots
    setBenchSlots(toBenchSlots(live))
    setActiveTool('bench')
    if (newBench) { setNewBench(false); markSeen('bench') }
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    push(t('toast.benchLoaded'), { action: { label: t('common.undo'), fn: () => setBenchSlots(prevSlots) } })
  }

  // U1: chấm amber "đã tuỳ chỉnh" trên segment — hiện cả khi panel đóng (trước đây đóng là mất dấu)
  const weightsCustomized = !!overrides[charId] && (overrides[charId].weights !== undefined || overrides[charId].erTarget !== undefined)
  const buildCustomized = !!overrides[charId]?.build

  // Echo bị đánh dấu "loại" (trash) không vào solver — vẫn hiện mờ trong kho.
  // useMemo giữ identity để effect stale của RosterPanel không bắn mỗi render.
  const usableEchoes = useMemo(() => echoes.filter((e) => !e.trash), [echoes])

  // Tên echo (lowercase) đang có trong kho — để MainEchoHint đánh dấu ✓ main echo đề cử user đã có
  const ownedEchoNames = useMemo(
    () => new Set(echoes.map((e) => e.name?.trim().toLowerCase()).filter((n): n is string => !!n)),
    [echoes],
  )

  // F12 (task 61): backlog farm — nhu cầu roster (setFarmSummary) đối chiếu tồn kho thật (usableEchoes).
  // Chỉ nhân vật roster thật (allProfiles đã merge override). Rẻ (<10ms) → useMemo, không cần worker.
  const backlogRows = useMemo(() => setBacklog(SONATA_SETS, allProfiles, usableEchoes, 3), [allProfiles, usableEchoes])

  const toggleFlag = (id: string, key: 'lock' | 'trash') => {
    setEchoes((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: e[key] ? undefined : true } : e)))
  }

  // F11 (task 62): dọn kho theo luật — đánh dấu `trash` cho tập id (đã preview) + toast hoàn tác cả cụm.
  // Guard thêm !trash/!lock (cleanupMatches đã lọc) → undo chỉ bỏ trash đúng echo mình vừa set (về undefined
  // = trạng thái trước, vì chỉ set cho echo đang !trash).
  const applyCleanup = (ids: string[]) => {
    const idSet = new Set(ids)
    const affected = new Set(echoes.filter((e) => idSet.has(e.id) && !e.trash && !e.lock).map((e) => e.id))
    if (affected.size === 0) return
    setEchoes((prev) => prev.map((e) => (affected.has(e.id) ? { ...e, trash: true } : e)))
    push(t('cleanup.marked', { n: affected.size }), {
      action: { label: t('common.undo'), fn: () => setEchoes((prev) => prev.map((e) => (affected.has(e.id) ? { ...e, trash: undefined } : e))) },
    })
  }

  // F4: đánh cờ trong triage → echo BIẾN MẤT khỏi tầm mắt (qua card kế) nên PHẢI toast+undo
  // (toggleFlag thường không toast vì echo còn hiện mờ tại chỗ). Set + undo TƯỜNG MINH (bật cờ / bỏ cờ),
  // KHÔNG dùng toggleFlag flip — nếu user đổi cờ tay giữa lúc action↔undo, flip sẽ làm ngược (review task 63).
  const triageFlag = (id: string, key: 'lock' | 'trash') => {
    const echo = echoById.get(id)
    const name = echo ? echoDisplayName(echo) : id
    setEchoes((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: true } : e)))
    push(t(key === 'trash' ? 'triage.markedTrash' : 'triage.markedLock', { name }), {
      action: { label: t('common.undo'), fn: () => setEchoes((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: undefined } : e))) },
    })
  }
  // Số echo "chưa quyết" (không lock/trash) — cho nhãn nút entry + disable khi 0
  const triageCount = useMemo(() => echoes.filter((e) => !e.trash && !e.lock).length, [echoes])

  // Xoá hàng loạt (bỏ qua echo khoá) + toast hoàn tác cả cụm
  const deleteMany = (ids: string[]) => {
    const idSet = new Set(ids)
    const removed = echoes.filter((e) => idSet.has(e.id) && !e.lock)
    if (removed.length === 0) return
    const removedIds = new Set(removed.map((e) => e.id))
    const gen = inventoryGen.current
    setEchoes((prev) => prev.filter((e) => !removedIds.has(e.id)))
    push(t('toast.deletedMany', { n: removed.length }), {
      action: { label: t('common.undo'), fn: () => restoreEchoes(removed, gen) },
    })
  }

  // Xoá ngay + toast có "Hoàn tác" (thay cho confirm chặn luồng)
  const deleteEcho = (id: string) => {
    const echo = echoById.get(id)
    if (!echo || echo.lock) return // nút xoá đã disable khi khoá — guard thêm cho chắc
    const gen = inventoryGen.current
    setEchoes((prev) => prev.filter((e) => e.id !== id))
    push(t('toast.deleted', { name: echoDisplayName(echo) }), {
      action: { label: t('common.undo'), fn: () => restoreEchoes([echo], gen) },
    })
  }

  const stats = useMemo(() => {
    const byCost: Record<number, number> = { 1: 0, 3: 0, 4: 0 }
    echoes.forEach((e) => { byCost[e.cost] = (byCost[e.cost] ?? 0) + 1 })
    return byCost
  }, [echoes])
  const invCount = t('app.inventoryCount', { n: echoes.length, c4: stats[4], c3: stats[3], c1: stats[1] })

  const empty = echoes.length === 0
  // I4 (ui-redesign): "nhập tay" từ EmptyState — mở layout Kho thật (có form) dù kho trống,
  // vì EmptyState THAY cả layout nên form "Thêm echo" không tồn tại lúc đó
  const [showManual, setShowManual] = useState(false)
  const emptyState = (
    <EmptyState
      onOcr={() => setTab('import')}
      onImportJson={() => fileRef.current?.click()}
      onDemo={() => replaceInventory(DEMO_ECHOES)}
      onManual={() => { setShowManual(true); setTab('inventory') }}
    />
  )

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold text-slate-100">WuWa Echo Optimizer <span className="text-xs font-normal text-slate-500">{t('app.subtitle')}</span></h1>
        <div className="flex items-center gap-2 self-center">
          <VaultBar {...vaults} />
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            title={t('app.githubTip')}
            aria-label={t('app.githubTip')}
            className="flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            {/* <640px: ẩn chữ, giữ icon (aria-label giữ tên truy cập) — header chật trên điện thoại */}
            <GithubMark /> <span className="hidden sm:inline">GitHub</span>
          </a>
          <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}>{lang === 'vi' ? 'EN' : 'VI'}</button>
        </div>
      </header>

      {/* Input file dùng chung cho nút Import JSON (tab Import) + EmptyState */}
      <input
        ref={fileRef} type="file" accept=".json" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) {
            importJson(f)
              .then(({ echoes: imported, dropped }) => {
                // Import THAY THẾ kho — hỏi trước khi ghi đè dữ liệu đang có
                if (echoes.length > 0 && !window.confirm(t('app.importConfirmReplace', { n: echoes.length }))) return
                replaceInventory(imported)
                push(dropped > 0
                  ? t('toast.importedDropped', { n: imported.length, m: dropped })
                  : t('toast.imported', { n: imported.length }))
              })
              .catch((err) => push(t('app.importError', { msg: err.message === 'invalid-format' ? t('app.importInvalidFormat') : err.message }), { kind: 'error' }))
          }
          e.target.value = ''
        }}
      />

      <nav className="mb-4 flex flex-wrap gap-1 border-b border-slate-800 text-sm" aria-label="tabs">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            className={`whitespace-nowrap rounded-t px-3 py-1.5 ${tab === k ? 'border border-b-0 border-slate-700 bg-slate-900 font-medium text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
            onClick={() => setTab(k)}
          >
            {t(`tabs.${k}`)}
            {k === 'inventory' && <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 text-xs text-slate-400">{echoes.length}</span>}
          </button>
        ))}
      </nav>

      {tab === 'inventory' && (empty && !showManual ? emptyState : (
        <div className="space-y-3">
        {triageActive ? (
          // F4 (task 63): view duyệt lần lượt thay chỗ CleanupPanel + bảng (KHÔNG modal — "Sửa" mở EchoEditModal đè lên)
          <TriagePanel
            echoes={echoes}
            order={triageOrder}
            bestOwners={bestOwnersByEcho}
            pinnedBy={pinnedBy}
            modalOpen={!!editingEcho}
            onTrash={(id) => triageFlag(id, 'trash')}
            onLock={(id) => triageFlag(id, 'lock')}
            onEdit={setEditingEcho}
            onJump={jumpToChar}
            onExit={() => setTriageActive(false)}
          />
        ) : (
        <>
        {/* F4 entry: nút duyệt lần lượt + chọn thứ tự (tệ-trước / mới-trước) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={triageCount === 0}
            onClick={() => setTriageActive(true)}
            className="rounded bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
          >{t('triage.entry', { n: triageCount })}</button>
          <span className="flex overflow-hidden rounded border border-slate-700 text-xs">
            {(['worst', 'newest'] as const).map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={triageOrder === o}
                className={`px-2 py-1 ${triageOrder === o ? 'bg-sky-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                onClick={() => setTriageOrder(o)}
              >{t(o === 'worst' ? 'triage.orderWorst' : 'triage.orderNewest')}</button>
            ))}
          </span>
        </div>
        {/* C4 (ui-redesign): CleanupPanel + UpgradePlanPanel dời sang tab Kế hoạch */}
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-3">
            <EchoForm onAdd={addEcho} />
            <p className="text-xs text-slate-500">{invCount}</p>
          </aside>
          <div className="self-start rounded-lg border border-slate-800 bg-slate-900/60 p-2">
            <RankingTable
              echoes={echoes}
              profile={profile}
              bestOwners={bestOwnersByEcho}
              onJumpToChar={jumpToChar}
              pinnedBy={pinnedBy}
              charPicker={<CharacterPicker value={charId} overrides={overrides} onChange={switchChar} />}
              onDelete={deleteEcho}
              onDeleteMany={deleteMany}
              onToggleFlag={toggleFlag}
              onEdit={setEditingEcho}
            />
          </div>
        </div>
        </>
        )}
        </div>
      ))}

      {tab === 'optimize' && (empty ? emptyState : (
        <div className="space-y-3">
          {/* U8: toolbar tách 2 hàng cố định — hàng 1 = ngữ cảnh (nhân vật/set/objective),
              hàng 2 = công cụ (segmented U1) + CTA. <640px CTA w-full tự xuống dòng riêng. */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-400">{t('app.character')}</label>
            <CharacterPicker
              value={charId}
              overrides={overrides}
              onChange={switchChar}
            />
            <label className="ml-1 text-sm text-slate-400">{t('setpick.label')}</label>
            <SetPicker
              value={forcedSet}
              preferred={profile.preferredSets}
              onChange={(v) => { setForcedSet(v); if (solved) setStale(true) }}
            />
            <span className="ml-1 inline-flex overflow-hidden rounded border border-slate-700 text-xs">
              {(['score', 'damage'] as const).map((o) => (
                <button
                  key={o}
                  className={`px-2 py-1 ${objective === o ? 'bg-sky-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                  onClick={() => {
                    setObjective(o)
                    if (solved) setStale(true)
                    if (o === 'damage' && newDamage) { setNewDamage(false); markSeen('damage') }
                  }}
                >
                  {t(o === 'score' ? 'app.objScore' : 'app.objDamage')}
                  {o === 'damage' && newDamage && (
                    <span aria-hidden="true" className="ml-1 rounded-full bg-emerald-600 px-1 text-[9px] font-bold leading-tight text-white">{t('common.newBadge')}</span>
                  )}
                </button>
              ))}
            </span>
            {/* U4: giải thích Điểm/Damage qua popover bấm được (title= cũ là hover-only, mobile không xem được) */}
            <InfoTip label={t('app.infoLabel')}>
              <span className="block"><b>{t('app.objScore')}</b>: {t('app.objectiveScoreDesc')}</span>
              <span className="block"><b>{t('app.objDamage')}</b>: {t('app.objectiveDamageDesc')}</span>
            </InfoTip>
          </div>
          <div ref={toolbarRef} className="flex flex-wrap items-center gap-2">
            {/* U1: segmented — sky = panel đang mở; chấm amber = "đã tuỳ chỉnh" (kể cả khi đóng) */}
            <span className="inline-flex overflow-hidden rounded border border-slate-700 text-xs">
              {([
                { k: 'weights' as const, label: t('app.weights'), title: undefined, dot: weightsCustomized },
                { k: 'build' as const, label: `⚔ ${t('app.build')}`, title: t('build.tip'), dot: buildCustomized },
                { k: 'bench' as const, label: `🧰 ${t('app.bench')}`, title: t('app.benchTip'), dot: false },
              ]).map(({ k, label, title, dot }) => (
                <button
                  key={k}
                  className={`relative px-2 py-1 ${activeTool === k ? 'bg-sky-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                  onClick={() => toggleTool(k)}
                  title={title}
                  aria-pressed={activeTool === k}
                >
                  {label}
                  {k === 'bench' && newBench && (
                    <span aria-hidden="true" className="ml-1 rounded-full bg-emerald-600 px-1 text-[9px] font-bold leading-tight text-white">{t('common.newBadge')}</span>
                  )}
                  {dot && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" title={t('app.toolCustomizedTip')} />}
                </button>
              ))}
            </span>
            <button
              className="w-full rounded bg-emerald-700 px-3 py-1 text-sm font-semibold hover:bg-emerald-600 sm:ml-auto sm:w-auto"
              onClick={solve}
            >{t('app.findBest5')}</button>
          </div>

          {/* F14: dòng tóm tắt echo đã neo (DƯỚI hàng CTA, không chung hàng vì U8 đã chật).
              Đếm theo neo SỐNG (activePinned) — khớp cái solver thật sự ép; neo hỏng báo riêng (task 66). */}
          {anchoredIds.size > 0 && (
            <p className="text-xs text-amber-400">
              ⚓ {t('anchor.summary', { n: anchoredEchoes.length, cost: anchoredCost })}
              <button className="ml-2 text-slate-500 underline hover:text-rose-400" onClick={clearAnchors}>{t('anchor.clearAll')}</button>
              {deadAnchors > 0 && (
                <span className="ml-2 text-rose-400">
                  {t('anchor.dead', { n: deadAnchors })}
                  <button className="ml-1 text-slate-500 underline hover:text-slate-300" onClick={pruneDeadAnchors}>{t('anchor.pruneDead')}</button>
                </span>
              )}
            </p>
          )}

          <MainEchoHint charId={charId} ownedNames={ownedEchoNames} hasSelectedSet={!!forcedSet} solveTick={solveTick} />

          <SubstatLegend />

          {activeTool === 'weights' && (
            <WeightEditor
              base={CHARACTER_BY_ID[charId]}
              merged={profile}
              override={overrides[charId]}
              onChange={(ov) => {
                const next = { ...overrides }
                if (ov === undefined) delete next[charId]
                else next[charId] = ov
                setOverrides(next) // kết quả solve tự chuyển "cũ" qua effect [overrides]
              }}
            />
          )}
          {activeTool === 'build' && (
            <BuildEditor
              profile={profile}
              override={overrides[charId]}
              activeSet={activeSet}
              activeSetPieces={activeSetPieces}
              onChange={(ov) => {
                const next = { ...overrides }
                if (ov === undefined) delete next[charId]
                else next[charId] = ov
                setOverrides(next)
              }}
            />
          )}
          {activeTool === 'bench' && (
            <BenchPanel
              echoes={echoes}
              profile={profile}
              slots={benchSlots}
              onChange={setBenchSlots}
              ctx={buildCtx}
              pinnedBy={pinnedBy}
              anchoredIds={anchoredIds}
              anchorBlock={anchorBlock}
              onToggleAnchor={toggleAnchor}
              compareTotal={equippedInfo?.result?.total ?? null}
              solverTotal={solved && !stale && loadout ? loadout.total : null}
              onPin={(ids) => {
                setEquipped((prev) => ({ ...prev, [charId]: ids }))
                push(t('toast.pinned', { name: profile.name }))
              }}
            />
          )}

          {equippedInfo && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-900/60 bg-sky-950/20 px-3 py-2 text-sm">
              <span className="text-sky-300">📌 {t('equip.current')}</span>
              <span className="font-mono text-sky-200">
                {equippedInfo.result ? t('loadout.points', { n: equippedInfo.result.total.toFixed(1) }) : '—'}
              </span>
              {equippedInfo.result && (
                <span className="text-xs text-slate-500">
                  {/* set buff theo set TRỘI của CHÍNH bộ đang đeo (không phải set đề cử/ép) + số mảnh thật */}
                  ⚔ ×{(() => {
                    const ds = dominantSet(equippedInfo.result.setCounts)
                    return loadoutDamage(equippedInfo.result.echoes.map((s) => s.echo), profile, buildCtx, ds, ds ? equippedInfo.result.setCounts[ds] : undefined).multiplier.toFixed(2)
                  })()}
                </span>
              )}
              {equippedInfo.missing > 0 && <span className="text-xs text-amber-400">{t('equip.missing', { n: equippedInfo.missing })}</span>}
              {/* Nhóm nút cuối hàng: hành động điều hướng (hover sky) TRƯỚC hành động huỷ (hover rose) */}
              <span className="ml-auto flex items-center gap-2">
                <button
                  className="text-xs text-slate-500 hover:text-sky-300"
                  title={t('equip.viewEditTip')}
                  onClick={loadEquippedIntoBench}
                >🧰 {t('equip.viewEdit')}</button>
                <button
                  className="text-xs text-slate-500 hover:text-rose-400"
                  onClick={() => setEquipped((prev) => {
                    const next = { ...prev }
                    delete next[charId]
                    return next
                  })}
                >{t('equip.unpin')}</button>
              </span>
            </div>
          )}

          {solved && (
            <Stale stale={stale} onResolve={solve}>
              {/* F14 lưới an toàn: solve trả null KHI có echo neo = tổ hợp neo bất khả thi (không phải kho thiếu) */}
              {loadout === null && anchoredIds.size > 0 ? (
                <p className="p-3 text-sm text-amber-400">⚓ {t('anchor.infeasible')}</p>
              ) : (
                <LoadoutView
                  result={loadout}
                  profile={profile}
                  ctx={buildCtx}
                  compareTotal={equippedInfo?.result?.total ?? null}
                  anchoredIds={anchoredIds}
                  anchorBlock={anchorBlock}
                  onToggleAnchor={toggleAnchor}
                  onPin={loadout ? () => {
                    setEquipped((prev) => ({ ...prev, [charId]: loadout.echoes.map((s) => s.echo.id) }))
                    push(t('toast.pinned', { name: profile.name }))
                  } : undefined}
                />
              )}
            </Stale>
          )}

          <p className="text-xs text-slate-600">{t('app.scoreHelp')}</p>
        </div>
      ))}

      {/* C4 (ui-redesign): tab Kế hoạch — gom 5 panel kế hoạch về 1 màn, 2 cột lg+ theo tần suất
          dùng (trái: nâng cấp + backlog — cần kho; phải: farm set + dọn kho). PinnedOverview
          full-width trên cùng (U6: chỉ khi có ≥1 nhân vật ghim & kho không trống — pin id cũ đã
          xoá toàn "—", nhiễu). SetFarmPriority KHÔNG cần kho nên hiện cả khi kho trống (F2). */}
      {tab === 'plan' && (
        <div>
          {!empty && pinnedRows.length > 0 && <PinnedOverview rows={pinnedRows} onJump={jumpToChar} />}
          <div className="grid items-start gap-x-3 lg:grid-cols-2">
            <div className="min-w-0">
              {!empty && <UpgradePlanPanel rows={upgradeRows} onJump={jumpToChar} onEdit={setEditingEcho} />}
              {!empty && backlogRows.length > 0 && <FarmingBacklog rows={backlogRows} />}
            </div>
            <div className="min-w-0">
              <SetFarmPriority profiles={allProfiles} />
              {!empty && (
                <CleanupPanel echoes={echoes} profiles={allProfiles} ownersByEcho={bestOwnersByEcho} pinnedBy={pinnedBy} onApply={applyCleanup} />
              )}
            </div>
          </div>
          {empty && emptyState}
        </div>
      )}

      {tab === 'roster' && empty && emptyState}
      {/* Giữ mounted (chỉ ẩn CSS): RosterPanel giữ danh sách đội + kết quả trong state cục bộ —
          unmount khi chuyển tab sẽ mất sạch. (OcrImport thì NGƯỢC LẠI: cố ý unmount để nhả worker WASM.) */}
      <div className={tab === 'roster' && !empty ? '' : 'hidden'}>
        <RosterPanel echoes={usableEchoes} overrides={overrides} resolve={resolve} pinned={activePinned} />
      </div>

      {tab === 'import' && (
        <div className="space-y-3">
          <OcrImport onAdd={addEcho} />
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
            <span className="font-semibold text-slate-300">{t('importTab.jsonTitle')}</span>
            <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={() => exportJson(echoes)}>{t('common.exportJson')}</button>
            <button className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800" onClick={() => fileRef.current?.click()}>{t('common.importJson')}</button>
            {empty && (
              <button className="rounded border border-dashed border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800" onClick={() => replaceInventory(DEMO_ECHOES)}>{t('empty.demoTitle')}</button>
            )}
            <span className="ml-auto text-xs text-slate-500">{invCount}</span>
          </div>
          <ScannerImport
            hasInventory={echoes.length > 0}
            onImport={(imported, mode) => {
              if (mode === 'replace') {
                if (echoes.length > 0 && !window.confirm(t('app.importConfirmReplace', { n: echoes.length }))) return
                replaceInventory(imported)
              } else {
                // Thêm: regenerate id nếu trùng echo đang có (tránh đè)
                setEchoes((prev) => {
                  const ids = new Set(prev.map((e) => e.id))
                  return [...prev, ...imported.map((e) => (ids.has(e.id) ? { ...e, id: newId() } : e))]
                })
              }
              push(t('toast.imported', { n: imported.length }))
            }}
          />
        </div>
      )}

      {editingEcho && (
        <EchoEditModal
          echo={editingEcho}
          profile={profile}
          onClose={() => setEditingEcho(null)}
          onSave={(updated) => {
            setEchoes((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            setEditingEcho(null)
          }}
        />
      )}

      <footer className="mt-8 border-t border-slate-800 pt-4 text-xs text-slate-500">
        <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200">
            <GithubMark /> {t('footer.source')}
          </a>
          <span className="text-slate-700">·</span>
          <a href={`${REPO}/releases`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200">{t('footer.releases')}</a>
          <span className="text-slate-700">·</span>
          <a href={LIVE} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-200">{t('footer.web')}</a>
        </div>
        <p className="max-w-3xl leading-relaxed">{t('footer.intro')}</p>
      </footer>
    </div>
  )
}

// Wrapper: quản lý registry vault + remount AppInner theo key=activeId (mỗi vault có kho/override/
// equipped riêng; remount để useState(load…) đọc đúng vault mới, tránh race persist khi đổi vault).
export default function App() {
  const vaults = useVaults()
  return (
    <VaultIdContext.Provider value={vaults.activeId}>
      <AppInner key={vaults.activeId} vaultId={vaults.activeId} vaults={vaults} />
    </VaultIdContext.Provider>
  )
}
