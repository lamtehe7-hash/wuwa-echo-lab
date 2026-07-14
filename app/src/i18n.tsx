import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { LocMessage } from './types'

// Lớp i18n tối giản (không thêm dependency): context + hook useT/useLang, dict phẳng
// VI/EN, nội suy tham số dạng {name}. Ngôn ngữ lưu localStorage. Message của engine
// (score.ts tuneAdvice, solver.ts note) trả về { key, params } và được dịch tại UI.

export type Lang = 'vi' | 'en'
export type TParams = Record<string, string | number>

interface Entry { vi: string; en: string }

const DICT: Record<string, Entry> = {
  // ── common ──
  'common.exportJson': { vi: 'Export JSON', en: 'Export JSON' },
  'common.importJson': { vi: 'Import JSON', en: 'Import JSON' },
  'common.undo': { vi: 'Hoàn tác', en: 'Undo' },
  'common.close': { vi: 'Đóng', en: 'Close' },

  // ── Toast (Toast.tsx + nơi gọi useToast) ──
  'toast.deleted': { vi: 'Đã xoá {name}', en: 'Deleted {name}' },
  'toast.imported': { vi: 'Đã nhập {n} echo từ file', en: 'Imported {n} echoes from file' },
  'toast.importedDropped': { vi: 'Đã nhập {n} echo · bỏ {m} mục không hợp lệ', en: 'Imported {n} echoes · skipped {m} invalid entries' },
  'toast.savedBatch': { vi: 'Đã lưu {n} echo vào kho', en: 'Saved {n} echoes to inventory' },

  // ── Tabs (điều hướng chính) ──
  'tabs.inventory': { vi: 'Kho Echo', en: 'Inventory' },
  'tabs.optimize': { vi: 'Tối ưu', en: 'Optimize' },
  'tabs.roster': { vi: 'Đội hình', en: 'Team' },
  'tabs.import': { vi: 'Import', en: 'Import' },
  'importTab.jsonTitle': { vi: '📄 Sao lưu / khôi phục JSON', en: '📄 JSON backup / restore' },

  // ── Equipped (bộ hiện tại + delta trước–sau) ──
  'equip.current': { vi: 'Bộ hiện tại', en: 'Current set' },
  'equip.missing': { vi: '(thiếu {n} echo — đã xoá khỏi kho)', en: '({n} echoes missing — deleted from inventory)' },
  'equip.unpin': { vi: 'bỏ ghi nhớ', en: 'forget' },
  'equip.pin': { vi: '📌 Đặt làm bộ hiện tại', en: '📌 Set as current loadout' },
  'equip.deltaTip': { vi: 'Chênh lệch so với "bộ hiện tại" đã ghi nhớ', en: 'Difference vs the remembered "current set"' },
  'toast.pinned': { vi: 'Đã ghi nhớ bộ hiện tại cho {name}', en: 'Current set remembered for {name}' },

  // ── ScoreBadge (popover breakdown điểm) ──
  'breakdown.title': { vi: 'Điểm chi tiết', en: 'Score breakdown' },
  'breakdown.tip': { vi: 'Bấm xem đóng góp từng substat', en: 'Click for per-substat contribution' },
  'breakdown.formula': { vi: 'substat {sub} + main {main} = {total}', en: 'substat {sub} + main {main} = {total}' },

  // ── CharacterPicker ──
  'picker.overridden': { vi: 'Đã chỉnh trọng số riêng', en: 'Custom weights applied' },
  'picker.hint': { vi: '＊ = đã chỉnh trọng số riêng · badge: DPS / Sub / Buff / Heal', en: '＊ = custom weights · badges: DPS / Sub / Buff / Heal' },

  // ── SetPicker (ép solver theo 1 set echo) ──
  'setpick.label': { vi: 'Set echo:', en: 'Echo set:' },
  'setpick.auto': { vi: 'Tự động (mọi set)', en: 'Auto (any set)' },
  'setpick.recommended': { vi: '⭐ Set đề cử', en: '⭐ Recommended sets' },
  'setpick.others': { vi: 'Set khác', en: 'Other sets' },
  'setpick.tip': { vi: 'Ép solver chỉ ghép echo thuộc set này. ⭐ = set đề cử cho nhân vật (theo meta cộng đồng).', en: 'Force the solver to use only echoes of this set. ⭐ = recommended for this character (community meta).' },

  // ── Stale (kết quả solve cũ khi kho/trọng số đổi) ──
  'stale.notice': { vi: 'Kho / trọng số đã thay đổi — kết quả này là bản cũ.', en: 'Inventory / weights changed — this result is outdated.' },
  'stale.resolve': { vi: '🧩 Giải lại', en: '🧩 Re-solve' },

  // ── Thanh công cụ kho (RankingTable) ──
  'inv.search': { vi: 'Tìm theo tên echo / set…', en: 'Search echo / set name…' },
  'inv.allSets': { vi: 'Mọi set', en: 'All sets' },
  'inv.allMains': { vi: 'Mọi main stat', en: 'All main stats' },
  'inv.sortScore': { vi: 'Sắp xếp: Điểm', en: 'Sort: Score' },
  'inv.sortRv': { vi: 'Sắp xếp: RV', en: 'Sort: RV' },
  'inv.sortLevel': { vi: 'Sắp xếp: Level', en: 'Sort: Level' },
  'inv.sortNew': { vi: 'Sắp xếp: Mới thêm', en: 'Sort: Newest' },
  'inv.count': { vi: '{shown}/{total} echo', en: '{shown}/{total} echoes' },
  'inv.viewTable': { vi: 'Xem dạng bảng', en: 'Table view' },
  'inv.viewGrid': { vi: 'Xem dạng lưới card', en: 'Card grid view' },
  'inv.flagLock': { vi: 'Khoá — không xoá được (kể cả hàng loạt), solver vẫn dùng', en: 'Lock — cannot be deleted (incl. bulk), solver still uses it' },
  'inv.flagTrash': { vi: 'Loại — solver bỏ qua echo này', en: 'Exclude — the solver skips this echo' },
  'inv.excludedOnly': { vi: '🗑 Đã loại ({n})', en: '🗑 Excluded ({n})' },
  'inv.lockedNoDelete': { vi: 'Echo đang khoá — mở khoá trước khi xoá', en: 'Echo is locked — unlock before deleting' },
  'inv.selectAll': { vi: 'Chọn tất cả đang hiện (trừ echo khoá)', en: 'Select all visible (except locked)' },
  'inv.selectRow': { vi: 'Chọn echo này', en: 'Select this echo' },
  'inv.deleteSelected': { vi: '🗑 Xoá {n} đã chọn', en: '🗑 Delete {n} selected' },
  'toast.deletedMany': { vi: 'Đã xoá {n} echo', en: 'Deleted {n} echoes' },
  'inv.emptyFiltered': { vi: 'Không có echo nào khớp bộ lọc.', en: 'No echoes match the filters.' },

  // ── EmptyState (kho trống — màn hình lần đầu) ──
  'empty.title': { vi: 'Kho echo đang trống', en: 'Your echo inventory is empty' },
  'empty.subtitle': { vi: 'Nạp kho theo một trong ba cách để bắt đầu:', en: 'Load your inventory one of three ways to get started:' },
  'empty.ocrTitle': { vi: '📷 Import từ ảnh / video', en: '📷 Import from images / video' },
  'empty.ocrDesc': { vi: 'Chụp panel echo trong game rồi thả vào — OCR chạy ngay trên máy, không upload đi đâu.', en: 'Screenshot the in-game echo panel and drop it in — OCR runs locally, nothing is uploaded.' },
  'empty.jsonTitle': { vi: '📄 Import JSON', en: '📄 Import JSON' },
  'empty.jsonDesc': { vi: 'Khôi phục kho từ file backup đã export trước đó.', en: 'Restore your inventory from a previously exported backup file.' },
  'empty.demoTitle': { vi: '🎲 Dữ liệu demo', en: '🎲 Demo data' },
  'empty.demoDesc': { vi: 'Nạp 10 echo mẫu để khám phá tính năng trước.', en: 'Load 10 sample echoes to explore the features first.' },
  'empty.steps': { vi: '① Nạp kho → ② Chọn nhân vật → ③ Tìm bộ 5 tối ưu', en: '① Load inventory → ② Pick a character → ③ Find the best 5-set' },
  'empty.manualHint': { vi: 'Hoặc nhập tay từng echo bằng form "Thêm echo" bên cạnh.', en: 'Or add echoes manually with the "Add echo" form on the side.' },

  // ── App ──
  'app.subtitle': { vi: 'bản 3.5 · dữ liệu lưu trong trình duyệt', en: 'v3.5 · data stored in your browser' },

  // ── Header / Footer (giới thiệu nguồn GitHub) ──
  'app.githubTip': { vi: 'Xem mã nguồn mở trên GitHub', en: 'View open source on GitHub' },
  'footer.source': { vi: 'Mã nguồn mở trên GitHub', en: 'Open source on GitHub' },
  'footer.releases': { vi: '⬇ Tải bản Windows', en: '⬇ Windows download' },
  'footer.web': { vi: '🌐 Bản web', en: '🌐 Web version' },
  'footer.intro': {
    vi: 'Dự án cộng đồng phi lợi nhuận, không liên kết / được tài trợ bởi Kuro Games. Chạy hoàn toàn trong trình duyệt — không backend, không thu thập dữ liệu. Góp ý / báo lỗi / xem cách hoạt động tại kho GitHub.',
    en: 'Non-profit community project, not affiliated with or endorsed by Kuro Games. Runs entirely in your browser — no backend, no data collection. Feedback / bug reports / how it works on the GitHub repo.',
  },
  'app.importError': { vi: 'Import lỗi: {msg}', en: 'Import failed: {msg}' },
  'app.importConfirmReplace': { vi: 'Kho hiện có {n} echo — import sẽ THAY THẾ toàn bộ bằng nội dung file. Tiếp tục?', en: 'Inventory has {n} echoes — importing will REPLACE them all with the file contents. Continue?' },
  'app.importInvalidFormat': { vi: 'File không đúng định dạng (không có echo hợp lệ).', en: 'Invalid file format (no valid echoes found).' },
  'app.inventoryCount': { vi: 'Kho: {n} echo (cost 4: {c4} · cost 3: {c3} · cost 1: {c1})', en: 'Inventory: {n} echoes (cost 4: {c4} · cost 3: {c3} · cost 1: {c1})' },
  'app.character': { vi: 'Nhân vật:', en: 'Character:' },
  'app.weights': { vi: '⚖ trọng số', en: '⚖ weights' },
  'app.all': { vi: 'Tất cả', en: 'All' },
  'app.costFilter': { vi: 'Cost {c}', en: 'Cost {c}' },
  'app.findBest5': { vi: '🧩 Tìm bộ 5 tối ưu', en: '🧩 Find best 5-set' },
  'app.scoreHelp': {
    vi: 'Điểm = chất lượng substat + GIÁ TRỊ main stat, chuẩn hoá theo echo hoàn hảo lý thuyết cho nhân vật này (substat hoàn hảo = 100, cộng main nên có thể >100). Main stat: ✓ chuẩn meta · ～ tạm dùng · ✗ sai — chỉ để tham khảo/tư vấn tune, solver chấm bằng giá trị thật. Bonus set = stat thật × uptime heuristic — xem PROPOSAL.md.',
    en: 'Score = substat quality + main-stat VALUE, normalized vs the theoretically-perfect echo for this character (perfect substats = 100; adding main can exceed 100). Main stat: ✓ meta · ～ stopgap · ✗ wrong — display/tuning advice only, the solver scores real values. Set bonus = real stats × heuristic uptime — see PROPOSAL.md.',
  },

  // ── EchoForm ──
  'echoForm.title': { vi: 'Thêm echo', en: 'Add echo' },
  'echoForm.sonataSet': { vi: 'Sonata set', en: 'Sonata set' },
  'echoForm.echoName': { vi: 'Tên echo (tuỳ chọn, để xét trùng set)', en: 'Echo name (optional, for duplicate-set check)' },
  'echoForm.echoNamePlaceholder': { vi: 'vd: Crownless', en: 'e.g. Crownless' },
  'echoForm.cost': { vi: 'Cost', en: 'Cost' },
  'echoForm.mainStat': { vi: 'Main stat', en: 'Main stat' },
  'echoForm.rarity': { vi: 'Rarity', en: 'Rarity' },
  'echoForm.level': { vi: 'Level (+0…+25)', en: 'Level (+0…+25)' },
  'echoForm.substatCount': { vi: 'Substat ({n}/{max})', en: 'Substat ({n}/{max})' },
  'echoForm.addRow': { vi: '+ thêm dòng', en: '+ add row' },
  'echoForm.save': { vi: 'Lưu echo vào kho', en: 'Save echo to inventory' },

  // ── RankingTable ──
  'ranking.verdict.keep-tuning': { vi: 'Tune tiếp', en: 'Keep tuning' },
  'ranking.verdict.done': { vi: 'Hoàn tất', en: 'Done' },
  'ranking.verdict.usable': { vi: 'Tạm dùng', en: 'Usable' },
  'ranking.verdict.trash': { vi: 'Bỏ', en: 'Trash' },
  'ranking.emptyAll': { vi: 'Chưa có echo nào trong kho.', en: 'No echoes in inventory.' },
  'ranking.colEcho': { vi: 'Echo', en: 'Echo' },
  'ranking.colMain': { vi: 'Main', en: 'Main' },
  'ranking.colSubstat': { vi: 'Substat', en: 'Substat' },
  'ranking.colScore': { vi: 'Điểm', en: 'Score' },
  'ranking.colAdvice': { vi: 'Tư vấn', en: 'Advice' },
  'ranking.expected': { vi: 'kỳ vọng {n}', en: 'expected {n}' },
  'ranking.delete': { vi: 'xóa', en: 'delete' },
  'ranking.edit': { vi: 'sửa', en: 'edit' },
  'ranking.editTip': { vi: 'Xem chi tiết / sửa echo này', en: 'View details / edit this echo' },

  // ── EchoCard (hiển thị echo kiểu in-game) ──
  'card.mainAt25': { vi: 'Giá trị main stat tại +25 (engine chấm theo +25)', en: 'Main-stat value at +25 (the engine scores at +25)' },
  'card.rollTier': { vi: 'Mốc roll {i}/{n} — mốc càng cao giá trị càng lớn', en: 'Roll tier {i}/{n} — higher tier = higher value' },
  'card.rv': { vi: 'RV {pct}%', en: 'RV {pct}%' },
  'card.rvTip': {
    vi: 'Roll Value — chất lượng roll trung bình của các substat so với mốc cao nhất (100% = mọi dòng đều roll max)',
    en: 'Roll Value — average substat roll quality vs the max tier (100% = every line rolled max)',
  },
  'card.noSubs': { vi: '(chưa có substat)', en: '(no substats yet)' },

  // ── EchoEditModal (sửa echo trong kho) ──
  'echoEdit.title': { vi: 'Sửa echo trong kho', en: 'Edit inventory echo' },
  'echoEdit.save': { vi: '💾 Lưu thay đổi', en: '💾 Save changes' },
  'echoEdit.cancel': { vi: 'Huỷ', en: 'Cancel' },

  // ── LoadoutView ──
  'loadout.empty': { vi: 'Kho chưa có echo nào để ghép bộ.', en: 'No echoes in inventory to build a set.' },
  'loadout.title': { vi: 'Bộ echo tối ưu — layout {layout} (cost {cost})', en: 'Optimal echo set — layout {layout} (cost {cost})' },
  'loadout.points': { vi: '{n} điểm', en: '{n} pts' },
  'loadout.summary': { vi: 'Substat {sub} + set bonus {bonus}', en: 'Substat {sub} + set bonus {bonus}' },
  'loadout.erFromEcho': { vi: 'ER từ echo: {er}%', en: 'ER from echoes: {er}%' },
  'loadout.setPrefix': { vi: 'Set', en: 'Set' },
  'loadout.exportPng': { vi: '🖼 Xuất ảnh PNG', en: '🖼 Export PNG' },
  'loadout.exportTip': { vi: 'Lưu bộ này thành 1 ảnh PNG để chia sẻ (icon nhúng sẵn, không cần mạng).', en: 'Save this loadout as a PNG image to share (icons embedded, works offline).' },
  'loadout.damageLabel': { vi: 'Damage tương đối', en: 'Relative damage' },
  'loadout.damageTip': {
    vi: 'Ước lượng damage tương đối so với khi không đeo echo — mô hình bắt crit dạng TÍCH (1 + CR×CD) và bracket %DMG (element + attack-type cộng dồn, nhân với phần còn lại — đúng công thức WuWa). Chỉ để so sánh phương án, không phải damage tuyệt đối. Baseline giả định, xem engine/damage.ts.',
    en: 'Estimated damage relative to wearing no echoes — the model captures multiplicative crit (1 + CR×CD) and the %DMG bracket (element + attack-type ADD together, then multiply the rest — per the WuWa formula). For comparing options only, not absolute damage. Assumed baseline, see engine/damage.ts.',
  },

  // ── RosterPanel ──
  'roster.help': { vi: 'Gán cả đội (mỗi echo chỉ 1 người dùng — ưu tiên từ trên xuống)', en: 'Assign whole team (each echo used by one only — priority top-down)' },
  'roster.addMember': { vi: '+ thêm vào đội', en: '+ add to team' },
  'roster.moveUp': { vi: 'Chuyển lên', en: 'Move up' },
  'roster.moveDown': { vi: 'Chuyển xuống', en: 'Move down' },
  'roster.remove': { vi: 'Bỏ khỏi đội', en: 'Remove from team' },
  'roster.assign': { vi: '🧩 Gán echo cho cả đội', en: '🧩 Assign echoes to team' },
  'roster.noResult': { vi: 'Không đủ echo để ghép bộ.', en: 'Not enough echoes to build a set.' },

  // ── WeightEditor ──
  'weights.title': { vi: 'Trọng số — {name}', en: 'Weights — {name}' },
  'weights.reset': { vi: '↺ về preset gốc', en: '↺ reset to preset' },
  'weights.presetLabel': { vi: 'Áp preset role', en: 'Apply role preset' },
  'weights.presetPick': { vi: '— chọn preset —', en: '— pick a preset —' },
  'weights.arch.critSkill': { vi: 'Crit DPS (Skill)', en: 'Crit DPS (Skill)' },
  'weights.arch.critBasic': { vi: 'Crit DPS (Basic)', en: 'Crit DPS (Basic)' },
  'weights.arch.critHeavy': { vi: 'Crit DPS (Heavy)', en: 'Crit DPS (Heavy)' },
  'weights.arch.critLiberation': { vi: 'Crit DPS (Liberation)', en: 'Crit DPS (Liberation)' },
  'weights.arch.critHpSkill': { vi: 'Crit DPS (scale HP)', en: 'Crit DPS (HP-scale)' },
  'weights.arch.subDpsEr': { vi: 'Sub-DPS / ER', en: 'Sub-DPS / ER' },
  'weights.arch.buffer': { vi: 'Buffer (ER)', en: 'Buffer (ER)' },
  'weights.arch.healerAtk': { vi: 'Healer (scale ATK)', en: 'Healer (ATK-scale)' },
  'weights.arch.healerHp': { vi: 'Healer (scale HP)', en: 'Healer (HP-scale)' },
  'weights.erTarget': { vi: 'Mục tiêu tổng ER% (gồm 100 gốc; bỏ trống = không gate)', en: 'Target total ER% (incl. 100 base; blank = no gate)' },
  'weights.help': {
    vi: 'Thang 0–1: 1 roll MAX của stat = w điểm. CR = CD = 1 cho DPS (1 roll CD ≈ 1 roll CR về EV quanh tỉ lệ crit 1:2).',
    en: 'Scale 0–1: 1 MAX roll of a stat = w points. CR = CD = 1 for DPS (1 CD roll ≈ 1 CR roll in EV around the 1:2 crit ratio).',
  },
  'weights.elementDmg': { vi: 'Element DMG% (đúng hệ)', en: 'Element DMG% (own)' },
  'weights.healingBonus': { vi: 'Healing Bonus%', en: 'Healing Bonus%' },
  'weights.mainOnlyTip': {
    vi: 'Stat chỉ có ở main stat + set bonus (không phải substat) — dùng để chấm giá trị main cost-3/4 và bonus set',
    en: 'Main-stat/set-bonus-only stat (not a substat) — used to score cost-3/4 main values and set bonuses',
  },

  // ── OcrImport ──
  'ocr.title': { vi: '📷 Import từ ảnh (beta)', en: '📷 Import from image (beta)' },
  'ocr.help': {
    vi: 'Beta — hoạt động tốt nhất với screenshot panel echo tiếng Anh, độ phân giải 1920×1080. Tool tự nhận tên echo (dòng "+25") và sonata set (icon tròn cạnh "+25", hoặc chữ trong mục "Sonata Effect" nếu có trong ảnh). Luôn kiểm tra lại kết quả trước khi lưu — OCR có thể đọc sai.',
    en: 'Beta — works best with English echo-panel screenshots at 1920×1080. The echo name ("+25" line) and sonata set (round icon next to "+25", or the "Sonata Effect" text when visible) are detected automatically. Always double-check results before saving — OCR can misread.',
  },
  'ocr.run': { vi: 'Chạy OCR ({n} ảnh)', en: 'Run OCR ({n} images)' },
  'ocr.pasteHint': { vi: 'Mẹo: Ctrl+V dán ảnh vừa chụp (Win+Shift+S), hoặc kéo-thả ảnh vào panel này.', en: 'Tip: Ctrl+V to paste a fresh screenshot (Win+Shift+S), or drag & drop images onto this panel.' },
  'ocr.filesSelected': { vi: 'Đã chọn {n} ảnh', en: '{n} images selected' },
  'ocr.clearFiles': { vi: 'bỏ chọn', en: 'clear' },
  'ocr.starting': { vi: 'đang khởi động…', en: 'starting…' },
  'ocr.modeImage': { vi: 'Ảnh', en: 'Images' },
  'ocr.modeVideo': { vi: 'Video (beta)', en: 'Video (beta)' },
  'ocr.preprocessToggle': { vi: 'Tiền xử lý ảnh (phóng to + nhị phân hoá) — tắt nếu kết quả tệ hơn', en: 'Preprocess image (upscale + binarize) — turn off if results get worse' },
  'ocr.videoHelp': {
    vi: 'Quay màn hình (Win+G/OBS…) trong lúc mở panel chi tiết echo và bấm lần lượt qua từng echo — DỪNG ~2s mỗi con (lâu hơn "bước giữa 2 frame" thì không bị sót), rồi chọn file video. Tool KHÔNG tự điều khiển/chụp game — bạn tự quay.',
    en: 'Record your screen (Win+G/OBS…) while the echo detail panel is open and click through each echo — PAUSE ~2s on each (longer than the frame step so none are missed), then pick the video file. The tool does NOT control or capture the game — you record it yourself.',
  },
  'ocr.videoCropHint': { vi: 'Kéo chuột trên khung hình để khoanh vùng panel echo (chọn đúng vùng chữ → nhanh + chính xác hơn nhiều). Bỏ trống = cả màn hình. Nhớ khoanh CẢ icon tròn cạnh "+25" — tool nhận sonata set từ icon đó.', en: 'Drag on the frame to select the echo panel region (a tight region is much faster + more accurate). Empty = full frame. Make sure the round icon next to "+25" is inside — the sonata set is detected from it.' },
  'ocr.videoCropClear': { vi: 'Xoá vùng chọn', en: 'Clear selection' },
  'ocr.videoStep': { vi: 'Bước giữa 2 frame (giây)', en: 'Step between frames (s)' },
  'ocr.videoRun': { vi: 'Quét video (~{n} frame)', en: 'Scan video (~{n} frames)' },
  'ocr.videoSummary': { vi: 'Xong: {added} echo (đã gộp frame trùng + bản đọc thiếu) · {skipped} frame được gộp/bỏ.', en: 'Done: {added} echoes (duplicate frames + partial reads merged) · {skipped} frames merged/skipped.' },
  'ocr.videoDraftLabel': { vi: '{name} — thấy ở {frames} frame', en: '{name} — seen in {frames} frames' },
  'ocr.videoLoadError': { vi: 'Không đọc được video này (định dạng trình duyệt không hỗ trợ?).', en: 'Could not load this video (unsupported format?).' },
  'ocr.cancel': { vi: '⏹ Dừng', en: '⏹ Stop' },
  'ocr.discard': { vi: 'bỏ', en: 'discard' },
  'ocr.processing': { vi: 'Đang xử lý {i}/{total}: {file} — {status} ({pct}%)', en: 'Processing {i}/{total}: {file} — {status} ({pct}%)' },
  'ocr.confidence': { vi: 'độ tin cậy ~{pct}%', en: 'confidence ~{pct}%' },
  'ocr.echoNameOptional': { vi: 'Tên echo (tuỳ chọn)', en: 'Echo name (optional)' },
  'ocr.added': { vi: '✓ Đã thêm vào kho', en: '✓ Added to inventory' },
  'ocr.add': { vi: 'Thêm vào kho', en: 'Add to inventory' },
  'ocr.edit': { vi: '✎ Sửa', en: '✎ Edit' },
  'ocr.doneEdit': { vi: '✓ Xong', en: '✓ Done' },
  'ocr.pendingCount': { vi: '{n} echo chờ xác nhận', en: '{n} echoes awaiting review' },
  'ocr.saveAll': { vi: '💾 Lưu tất cả ({n})', en: '💾 Save all ({n})' },
  'ocr.saveComplete': { vi: '✅ Lưu echo 100% ({n})', en: '✅ Save 100% echoes ({n})' },
  'ocr.saveCompleteTip': {
    vi: 'Chỉ lưu những echo đọc trọn vẹn: độ tin cậy 100% (đủ main stat + 5 substat, không cảnh báo) và tên + set + cost đều nhận từ OCR (hoặc đã được bạn sửa tay).',
    en: 'Save only fully-read echoes: 100% confidence (main stat + 5 substats, no warnings) with name + set + cost detected by OCR (or manually corrected by you).',
  },
  'ocr.complete100': { vi: 'đủ 100%', en: '100% read' },
  'ocr.savedSection': { vi: '✓ Đã lưu vào kho ({n} echo) — bấm để xem lại', en: '✓ Saved to inventory ({n} echoes) — click to review' },
  'ocr.clearSaved': { vi: 'dọn danh sách', en: 'clear list' },

  // ── Engine: tune advice (score.ts) ──
  'advice.trash': { vi: 'Main stat không hợp nhân vật này — tune thêm cũng không cứu được (main stat không đổi được).', en: 'Main stat does not fit this character — more tuning cannot fix it (main stat is immutable).' },
  'advice.doneGood': { vi: 'Đã tune đủ. Cân nhắc Transducer (khóa stat ngon, reroll phần còn lại) nếu điểm thấp.', en: 'Fully tuned. Consider a Transducer (lock good stats, reroll the rest) if the score is low.' },
  'advice.doneFair': { vi: 'Đã tune đủ. Main stat chỉ ở mức tạm dùng — thay khi farm được bản main chuẩn.', en: 'Fully tuned. Main stat is only a stopgap — replace once you farm the correct main stat.' },
  'advice.usable': { vi: 'Đã {dead} substat chết, chưa có stat ưu tiên — chỉ tune tiếp nếu thiếu echo thay thế.', en: '{dead} dead substats and no priority stat yet — keep tuning only if you lack a replacement.' },
  'advice.keepTuning': { vi: 'Main stat đúng — tune tiếp là +EV (kỳ vọng ~{expected} điểm khi hoàn tất).', en: 'Main stat is correct — keep tuning is +EV (expected ~{expected} points when finished).' },
  'advice.keepTuningGood': { vi: 'Main stat đúng, {good} substat ưu tiên — tune tiếp là +EV (kỳ vọng ~{expected} điểm khi hoàn tất).', en: 'Main stat correct, {good} priority substat(s) — keep tuning is +EV (expected ~{expected} points when finished).' },

  // ── Engine: solver note (solver.ts) ──
  'note.partialSlots': { vi: 'Chỉ ghép được {n}/5 slot từ kho hiện tại.', en: 'Only {n}/5 slots filled from current inventory.' },
  'note.erShort': { vi: 'ER từ echo {er}% < mục tiêu {need}% (chưa tính vũ khí/passive).', en: 'ER from echoes {er}% < target {need}% (weapon/passive not counted).' },
  'note.mainStatOff': { vi: 'Có echo main stat chưa chuẩn — thay khi farm được bản đúng.', en: 'Some echo main stats are off — replace when you farm the correct ones.' },

  // ── Engine: OCR parser warnings (ocr/parse.ts) + OcrImport ──
  'ocrParse.unmatched': { vi: 'Có {n} dòng chứa số nhưng không khớp nhãn nào — kiểm tra lại thủ công (có thể thiếu substat).', en: '{n} line(s) contain numbers but match no label — please double-check (a substat may be missing).' },
  'ocrParse.costMismatch': { vi: 'Dòng COST đọc được {ocr} nhưng "{name}" trong dữ liệu là cost {db} — kiểm tra lại.', en: 'COST line reads {ocr} but "{name}" is cost {db} in the database — please verify.' },
  'ocrParse.noMainStat': { vi: 'Không nhận diện được main stat — vui lòng chọn thủ công.', en: 'Could not detect the main stat — please pick it manually.' },
  'ocrParse.multiMainStat': { vi: 'Phát hiện {n} dòng có thể là main stat — đã chọn dòng đầu tiên, kiểm tra lại nếu sai.', en: 'Detected {n} possible main-stat lines — picked the first, verify if wrong.' },
  'ocrParse.dupSubs': { vi: 'Bỏ qua {n} dòng phụ trùng loại (chỉ giữ lần xuất hiện đầu tiên).', en: 'Skipped {n} duplicate substat line(s) (kept the first occurrence only).' },
  'ocrParse.tooManySubs': { vi: 'Nhận diện được {n} dòng phụ (>5) — đã cắt bớt, kiểm tra lại thủ công.', en: 'Detected {n} substat lines (>5) — trimmed, please double-check.' },
  'ocrParse.snapOff': { vi: 'Dòng phụ {label} = {value}{pct} lệch {off}% so với mốc gần nhất ({snapped}) — đã tự làm tròn, kiểm tra lại.', en: 'Substat {label} = {value}{pct} is {off}% off the nearest tier ({snapped}) — auto-rounded, please verify.' },
  'ocrParse.noContent': { vi: 'Không nhận diện được nội dung hợp lệ trong ảnh này — hãy thử chụp rõ hơn hoặc nhập tay.', en: 'No valid content recognized in this image — try a clearer screenshot or enter manually.' },
  'ocr.error': { vi: 'Lỗi OCR: {msg}', en: 'OCR error: {msg}' },
}

function interpolate(s: string, params?: TParams): string {
  if (!params) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`))
}

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, params?: TParams) => string
}
const Ctx = createContext<I18nCtx | null>(null)
const LANG_KEY = 'wuwa-lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null
    return saved === 'en' || saved === 'vi' ? saved : 'vi'
  })
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ }
  }, [])
  const t = useCallback((key: string, params?: TParams) => {
    const entry = DICT[key]
    if (!entry) return key // fallback: hiện key nếu thiếu bản dịch (dễ phát hiện)
    return interpolate(entry[lang], params)
  }, [lang])
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>
}

function useCtx(): I18nCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useT/useLang phải nằm trong <I18nProvider>')
  return c
}

/** Hàm dịch: t('key', { param }) */
export function useT(): (key: string, params?: TParams) => string {
  return useCtx().t
}

/** Trạng thái ngôn ngữ + hàm đổi */
export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const { lang, setLang } = useCtx()
  return { lang, setLang }
}

/** Dịch một LocMessage do engine trả về */
export function useTMessage(): (m: LocMessage) => string {
  const t = useT()
  return (m: LocMessage) => t(m.key, m.params)
}
