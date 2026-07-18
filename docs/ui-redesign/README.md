# Handoff: WuWaEcho — cải thiện giao diện (UI polish)

## Tổng quan
Gói này chứa **đánh giá UI + lộ trình cải thiện** cho app WuWaEcho (Echo optimizer cho Wuthering Waves), kèm 1 mock "trước/sau" cho màn Kho echo. Mục tiêu: một dev dùng Claude Code trỏ vào repo thật (`wuwa-echo-lab`) có thể triển khai từng mục theo thứ tự ưu tiên mà không cần đọc lại hội thoại.

## Về các file thiết kế trong gói
Các file `.dc.html` ở đây là **tham chiếu thiết kế viết bằng HTML** — prototype thể hiện diện mạo và hành vi mong muốn, **không phải code production để copy thẳng**. Nhiệm vụ là **tái tạo diện mạo đó trong codebase thật** (React + TypeScript + Tailwind v4, đúng như app đang dùng), theo đúng pattern sẵn có của app. App đã có design system riêng (dark-only, Tailwind AOT-compiled) nên hãy dùng lại class/token của app, không thêm class Tailwind mới nếu chưa có trong build.

## Độ hoàn thiện (fidelity)
- **Mock "Redesign — Kho echo": hi-fi** cho phần toolbar + hàng echo (màu, cỡ chữ, khoảng cách, cỡ nút đã chốt). Tái tạo pixel-perfect bằng component/util của app.
- **Các mục còn lại: spec chữ (mid-fi).** Mỗi mục nêu rõ file, thay đổi, và điều kiện "xong". Áp design system của app để hoàn thiện chi tiết.

## Ngăn xếp & vị trí file (repo thật)
- React + TypeScript, Tailwind v4 (utility biên dịch sẵn — **class thiếu trong build sẽ im lặng không có tác dụng**; nếu cần giá trị mới, thêm vào cấu hình Tailwind hoặc dùng `style={{}}`).
- Component: `app/src/components/<Name>.tsx`
- Chuỗi i18n (vi/en): `app/src/i18n.tsx`
- Màu nguyên tố: `app/src/data/elementColors.ts`
- Dark-only: nền `bg-slate-950`, chữ `text-slate-200`.

## Ngữ nghĩa màu (giữ nguyên, đây là điểm mạnh)
`sky` = tương tác/hover · `amber` = cảnh báo/ghim/5★/hạng S · `emerald` = tích cực · `rose` = tiêu cực/lỗi · `violet` = 4★ · `slate` = trung tính. Màu nguyên tố (glacio/fusion/electro/aero/spectro/havoc) là dot `style={{ backgroundColor }}`.

---

# Lộ trình triển khai (theo thứ tự làm)

## TIER 1 — Quick wins (vài giờ, rủi ro thấp)

### K1 · Nhãn nhóm cho hàng filter — `RankingTable.tsx`
- **Vấn đề:** hai chip "Tất cả" (nhóm Cost và nhóm Tư vấn) nằm cạnh nhau, chỉ ngăn bằng 1 vạch mờ.
- **Thay đổi:** trước mỗi cụm thêm nhãn nhỏ `<span class="text-[11px] uppercase tracking-wide text-slate-500">` = "Cost" / "Tư vấn" (i18n: `inv.groupCost`, `inv.groupVerdict`). Xem toolbar hàng 2 trong mock.
- **Xong khi:** hai nhóm chip phân biệt rõ, không còn 2 nút "Tất cả" liền kề không nhãn.

### K2 · Chip verdict giữ màu ngữ nghĩa khi active — `RankingTable.tsx`
- **Vấn đề:** nút verdict active hiện đổi thành `bg-sky-700 text-white`, mất màu emerald/sky/amber/rose.
- **Vị trí:** khối render nút verdict — nhánh active hiện là `verdictF === v ? "bg-sky-700 text-white" : \`border border-slate-700 hover:bg-slate-800 ${VERDICT_CLS[v]}\``.
- **Thay đổi:** thêm map nền theo verdict và dùng khi active, ví dụ:
  ```ts
  const VERDICT_ACTIVE = {
    "keep-tuning": "bg-emerald-600/20 text-emerald-300 border-emerald-600",
    done:          "bg-sky-600/20 text-sky-300 border-sky-600",
    usable:        "bg-amber-600/20 text-amber-300 border-amber-600",
    trash:         "bg-rose-600/20 text-rose-300 border-rose-600",
  };
  // active → `border ${VERDICT_ACTIVE[v]}` ; sky-700 chỉ dành cho chip "Tất cả" trung tính
  ```
- **Xong khi:** chọn "Bỏ" vẫn ra tông rose (không phải sky). Áp cùng cách cho các filter verdict-màu khác.

### K4 · Tách "Bỏ" (flag) khỏi "Xoá" (delete) — `RankingTable.tsx`
- **Vấn đề:** flag loại-trừ dùng emoji 🗑, đứng cạnh nút "xóa" (delete thật) → hiểu ngược.
- **Thay đổi:** đổi flag `trash` sang icon **ban/⃠** (không phải thùng rác) + tooltip "Đánh dấu Bỏ — không tính khi gán bộ, không xoá" (i18n `inv.flagTrashTip`). Giữ thùng-rác chỉ cho delete. Chèn 1 vạch `<span class="w-px h-[22px] bg-slate-800 mx-1">` giữa nhóm flag và nút xoá. Xem hàng echo trong mock.
- **Xong khi:** ẩn dụ "bỏ" ≠ "xoá"; hai hành động cách nhau bằng divider.

### K6 · Legend substat thu gọn được — `RankingTable.tsx` (dùng `SubstatLegend`)
- **Thay đổi:** cho ẩn/hiện legend qua nút "?" nhỏ; nhớ trạng thái ở `localStorage` (key `wuwa-inv-legend`).
- **Xong khi:** legend không chiếm cố định 1 hàng; trạng thái được nhớ.

### K8 · Chip "Chấm theo: <nhân vật>" trong toolbar — `RankingTable.tsx`
- **Vấn đề:** điểm/tư vấn phụ thuộc `profile` đang chọn nhưng toolbar không nhắc.
- **Thay đổi:** thêm chip có dot nguyên tố + tên `profile.name`, click mở đổi nhanh (tái dùng `CharacterPicker` hoặc callback `onJumpToChar`). Xem toolbar hàng 1 mock. i18n `inv.scoringFor`.
- **Xong khi:** luôn thấy đang chấm theo ai, đổi được ngay tại kho.

### P2 · CleanupPanel: nhãn rule 1 dòng + disabled đúng màu — `CleanupPanel.tsx`
- **Thay đổi:** rút nhãn rule còn 1 dòng ("Thiếu crit", "RV thấp", "Dư set", "Không hợp ai") + `title` đầy đủ (sửa trong `i18n.tsx`, khoá `cleanup.rule.*`). Nút "Đánh dấu loại (0)" khi disabled dùng `bg-slate-800 text-slate-500`, **chỉ** dùng amber khi có match > 0.
- **Xong khi:** chip không wrap 2 dòng; nút disabled không còn màu cam gây hiểu nhầm.

### P3 · UpgradePlanPanel: tên không cắt sớm, budget có đơn vị — `UpgradePlanPanel.tsx` (+ `EchoLine.tsx`)
- **Thay đổi:** `min-width` cho tên echo trong `EchoLine` để hết truncate sớm; ô budget thêm hậu tố "Tuner" (`unit`/adornment); in luật "có budget → chỉ xét 5★" ngay dưới ô (i18n `upgrade.budgetRule`).
- **Xong khi:** tên hiển thị đủ khi còn chỗ; người dùng biết đơn vị và luật.

### P4 · FarmingBacklog: nới progress bar, căn cột — `FarmingBacklog.tsx`
- **Thay đổi:** bar từ `w-10` → `w-20`/`w-28`; đưa cụm `goodOwned/target` + bar vào 1 cột căn phải cố định.
- **Xong khi:** các bar thẳng cột, dễ so sánh giữa các dòng.

### P6 · Nhớ open/close các panel kế hoạch — các `*Panel.tsx` dùng `<details>`
- **Thay đổi:** bind `open` của mỗi `<details>` vào `localStorage` theo id panel (`wuwa-panel-<id>`).
- **Xong khi:** vào lại trang giữ đúng panel đã mở.

### B3 · BuildEditor: label lên trên control; chú thích ★ — `BuildEditor.tsx`
- **Thay đổi:** nhãn ("Vũ khí"…) đặt trên select thay vì trái (hết wrap dọc); thêm `InfoTip` giải thích "Base ATK ★" (i18n `build.baseAtkTip`).
- **Xong khi:** không còn nhãn gãy dọc; ★ có giải thích.

### B4 · LoadoutView: nút không wrap — `LoadoutView.tsx`
- **Thay đổi:** nút "Xuất ảnh PNG" / "Đặt làm bộ hiện tại" thêm `whitespace-nowrap` + `min-width`, hoặc icon-first.
- **Xong khi:** nút 1 dòng ở cột hẹp.

### I2 · OcrImport: thu gọn cảnh báo beta — `OcrImport.tsx`
- **Thay đổi:** khối amber 3 dòng → 1 dòng + "chi tiết" (`<details>`), hoặc tự ẩn sau lần OCR thành công đầu (`localStorage`).
- **Xong khi:** panel OCR không bị cảnh báo chiếm mặt tiền.

### I3 · ScannerImport: thêm mô tả + caret rõ — `ScannerImport.tsx`
- **Thay đổi:** thêm 1 dòng phụ đề ("nhanh nhất nếu bạn chơi trên PC") và caret/nút mở rõ hơn.
- **Xong khi:** người có scanner nhận ra đây là đường nhập nhanh.

### I4 · EmptyState: bỏ copy phụ thuộc bố cục — `EmptyState.tsx`
- **Thay đổi:** thay "form 'Thêm echo' bên cạnh" bằng nút/link cuộn tới form (không giả định vị trí).
- **Xong khi:** đúng cả khi responsive xếp dọc.

### C5 · Chuẩn hoá từ vựng hành động — `i18n.tsx`
- **Thay đổi:** lập bảng thuật ngữ 1 khái niệm = 1 từ + 1 icon (Ghim/Khoá/Bỏ/Xoá/Đặt làm bộ), rà lại các khoá i18n cho nhất quán vi/en.
- **Xong khi:** không còn cặp gần nghĩa dùng lẫn giữa các màn.

---

## TIER 2 — Sprint tới (1–3 ngày)

### K3 / C1 · Hit target ≥ 32px cho hành động lặp — `RankingTable.tsx` (+ audit toàn app)
- **Vấn đề:** 🔒/🗑/sửa/xóa ~16–20px, opacity 40%, sát nhau; grid view là mặc định trên mobile.
- **Thay đổi:** chuyển sang **icon-button 34px** (desktop) / 44px (mobile) có padding & nền hover, như mock. Audit toàn app: mọi phần tử chạm được đạt ngưỡng (VaultBar ✎/🗑, caret, chip…).
- **Xong khi:** không còn control chạm < 32px trên các hành động thường dùng.

### K5 · Sort bằng header bảng — `RankingTable.tsx`
- **Thay đổi:** header "Điểm/Main/Level…" click-to-sort với mũi tên chiều; giữ `select` cho mobile/grid.
- **Xong khi:** click header đổi sort; chiều sort hiển thị.

### K7 · Bulk action cho grid view — `RankingTable.tsx`
- **Vấn đề:** chọn nhiều + xoá hàng loạt + ước tính refund chỉ có ở table view.
- **Thay đổi:** checkbox góc card (hoặc long-press) để chọn; hiện cùng thanh refund như table.
- **Xong khi:** grid có bulk-select + refund tương đương table.

### P1 · SetFarmPriority: bảng thay vì 10 dòng lặp — `SetFarmPriority.tsx`
- **Thay đổi:** đổi list "— Hợp N nhân vật · tốt nhất: X" thành **bảng 3 cột** (Set · Số người cần · Tốt nhất cho), sort theo số người cần; nối màu với nhóm "Nên farm tiếp" của FarmingBacklog.
- **Xong khi:** thấy ngay set nào ưu tiên; hết wrap lệch dòng dài.

### P5 · TriagePanel: keycap + undo — `TriagePanel.tsx`
- **Thay đổi:** hiện keycap trên nút (G · K · L · S); toast **undo 5 giây** sau mỗi "Loại"; phóng to chỉ báo tiến độ "1/6".
- **Xong khi:** thao tác bằng phím rõ ràng; lỡ tay hoàn tác được.

### B1 · WeightEditor: dễ scan hơn — `WeightEditor.tsx`
- **Vấn đề:** 13 ô number 0–1, nhãn dài wrap 2–3 dòng, chỉnh bằng gõ số lẻ.
- **Thay đổi:** nhãn rút 1 dòng (CR%, CD%, ATK%, Basic%…) + `title` đầy đủ; các stat weight = 0 gấp sau nút "Hiện tất cả"; cân nhắc stepper/slider mini thay gõ tay.
- **Xong khi:** baseline nhãn thẳng; chỉnh nhanh; danh sách ngắn gọn theo mặc định.

### B2 · CharacterPicker: control chính rõ hơn — `CharacterPicker.tsx`
- **Thay đổi:** nút đóng to hơn kèm role + dot nguyên tố; trong dropdown dùng grid cột cố định, tên `truncate` + `title` thay vì wrap (sửa tràn "Xiangli Yao", "Generic: Crit DPS (Liberation)").
- **Xong khi:** picker trông như control chính; tên dài không phá layout.

### B5 · StatBreakdown: hết scroll ngang trong cột hẹp — `StatBreakdown.tsx`
- **Thay đổi:** đặt `min-width` cho bảng, cho panel chiếm full hàng khi mở; hoặc gộp Vũ khí+Forte+Buff thành cột "Khác" có tooltip tách nguồn. Sửa header "= Tổng" bị cắt.
- **Xong khi:** đọc đủ 7 nguồn không cần scroll ngang.

### I1 · OcrImport: dropzone làm mặt tiền — `OcrImport.tsx`
- **Thay đổi:** thay input file native bằng **dropzone viền đứt** ("Thả ảnh / Ctrl+V / bấm để chọn"), ẩn input native; hợp nhất kéo-thả + paste (đã có logic) vào 1 vùng rõ.
- **Xong khi:** không còn nút OS lạc tông; đường nạp ảnh hiển nhiên.

### C3 · Sàn chữ 12px cho nội dung quyết định — nhiều component
- **Thay đổi:** rà `text-[10px]`/`text-[11px]` đang mang thông tin quyết định (verdict dưới card, tiến độ backlog, chú thích luật) → tối thiểu `text-xs` (12px); 10–11px chỉ cho phụ chú.
- **Xong khi:** thông tin để ra quyết định ≥ 12px.

### C6 · Focus ring đồng đều — toàn app
- **Thay đổi:** thêm `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500` cho mọi control tương tác (chip, icon-button).
- **Xong khi:** điều hướng bàn phím luôn thấy focus (đặc biệt Triage).

---

## TIER 3 — Dài hạn

### C2 · Thay emoji bằng SVG icon set — toàn app
- **Vấn đề:** 🔒🗑🗄📌📈💰📦🧹⚠ render khác theo OS, baseline lệch, không tint theo trạng thái (đang phải bù bằng nền+ring).
- **Thay đổi:** dùng bộ icon 1 màu (khuyến nghị **lucide-react**, ăn theo `currentColor`), thay dần theo từng component; giữ nguyên ngữ nghĩa màu. Mock đã dùng path lucide cho lock / ban / pencil / trash / search / chevron / list / grid làm chuẩn.
- **Xong khi:** icon hệ thống nhất quán mọi OS, tint được theo state.

### C4 · Bỏ "bức tường details" khu kế hoạch — layout trang kế hoạch
- **Thay đổi:** bố cục 2 cột theo tần suất dùng; mỗi panel một icon màu nhấn riêng (đi cùng C2) làm anchor thị giác.
- **Xong khi:** phân biệt nhanh các panel; không còn 5–6 `<details>` giống hệt xếp dọc.

### Mobile pass tổng (đi cùng C1)
- Rà toàn bộ ở ≤ 640px: hit target 44px, grid bulk-select (K7), toolbar không tràn.

---

## Design tokens dùng trong mock (khớp Tailwind của app)
| Vai trò | Token / màu |
|---|---|
| Nền app | `slate-950` `#020617` |
| Bề mặt panel | `slate-900` `#0f172a` |
| Viền | `slate-800` `#1e293b` / `slate-700` `#334155` |
| Chữ chính → mờ | `slate-100 #f1f5f9` · `200 #e2e8f0` · `400 #94a3b8` · `500 #64748b` |
| Tương tác | `sky-700 #0369a1` · `sky-500 #0ea5e9` · `sky-300 #7dd3fc` |
| Cảnh báo/hạng S | `amber-500 #f59e0b` · `amber-300 #fcd34d` |
| Tích cực | `emerald-600 #059669` · `emerald-300 #6ee7b7` |
| Tiêu cực | `rose-600 #e11d48` · `rose-400 #fb7185` |
| 4★ | `violet-400 #a78bfa` |
| Số liệu | `font-mono`, bảng thêm `tabular-nums` |
| Bo góc | `rounded` / `rounded-lg` / `rounded-full` |
| Icon-button | 34px desktop / 44px mobile, icon 16px, `rounded-[7px]` |

## Assets
Không có ảnh bitmap. Icon dùng SVG stroke (lucide). Ảnh echo trong app tải từ URL game (giữ nguyên). Dot nguyên tố lấy từ `app/src/data/elementColors.ts`.

## Files trong gói
- `README.md` — spec 25 mục (mã K/P/B/I/C), đủ để triển khai độc lập.
- `INTEGRATION.md` — **hướng dẫn tích hợp bằng Claude Code**: chuẩn bị, prompt mẫu copy-paste, quy trình git, checklist nghiệm thu.
- `CHANGELOG.md` — **đánh dấu mỗi màn sửa gì** (theo mã), dùng làm checklist review.
- `CLAUDE.md` — copy ra gốc repo thật để Claude Code tự đọc ngữ cảnh & ràng buộc.
- `Redesign — Kho echo.dc.html` — mock hi-fi trước/sau cho `RankingTable.tsx` (K1–K4, K8, C1–C3, C6). Mở trực tiếp trong trình duyệt.
- `Redesign — Sprint mocks.dc.html` — mock hi-fi trước/sau cho `WeightEditor.tsx` (B1), `SetFarmPriority.tsx` (P1), `OcrImport.tsx` (I1).
- `Redesign — Còn lại.dc.html` — mock hi-fi cho `RankingTable` grid bulk-select (K7) & header sort (K5), `TriagePanel.tsx` (P5), `CharacterPicker.tsx` (B2), `StatBreakdown.tsx` (B5), layout khu kế hoạch 2 cột (C4).
- `Màn Kế hoạch.dc.html` — mock **màn Kế hoạch đầy đủ, đã ráp** (chrome + tab + 5 panel redesign trong layout 2 cột C4): PinnedOverview, UpgradePlanPanel (P3), FarmingBacklog (P4), SetFarmPriority (P1), CleanupPanel (P2). Đây là đích lắp ráp cho tab Kế hoạch.
- `Màn Kho echo.dc.html` — mock **màn Kho echo đầy đủ, đã ráp** (chrome + toolbar nhóm nhãn + thanh bulk-select + 4 hàng echo redesign): K1–K5, K7, K8, C1–C3, C6.
- `Màn Build.dc.html` — mock **màn Build đầy đủ, đã ráp**: CharacterPicker (B2), BuildEditor (B3), WeightEditor (B1), LoadoutView (B4), StatBreakdown (B5), BuildCostEstimator.
- `Màn Import.dc.html` — mock **màn Import đầy đủ, đã ráp**: OCR dropzone (I1), ScannerImport (I3), Import JSON, EchoForm nhập tay (I4).

### Bản đồ mock ↔ mục
- **Kho echo:** K1, K2, K3, K4, K8, C1, C2, C3, C6
- **Sprint mocks:** B1, P1, I1
- **Còn lại:** K5, K7, P5, B2, B5, C4
- **Chỉ cần chữ (không mock):** K6, P2, P3, P4, P6, B3, B4, I2, I3, I4, C5 — spec trong README đủ để làm thẳng.
- `Báo cáo UI Review.dc.html` — báo cáo đánh giá đầy đủ 25 phát hiện (mã K/P/B/I/C) kèm mức nghiêm trọng & công sức.

> Ghi chú: `.dc.html` mở được thẳng trong trình duyệt để xem. Chúng là **tham chiếu thiết kế**, không phải component để ship — hãy tái tạo trong React/TS/Tailwind của app.
