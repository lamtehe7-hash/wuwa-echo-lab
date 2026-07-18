# CHANGELOG — thay đổi UI so với hiện trạng

Đánh dấu cụ thể mỗi màn/mock **sửa gì** so với app hiện tại. Mã (K/P/B/I/C) khớp `README.md`. Dùng làm checklist review khi Claude Code triển khai.

## Màn Kho echo (`Màn Kho echo.dc.html` → `RankingTable.tsx`)
- **K1** — Thêm nhãn nhóm "Cost" / "Tư vấn" trước mỗi cụm filter (bỏ tình trạng hai "Tất cả" liền kề).
- **K2** — Chip verdict active giữ màu ngữ nghĩa (Tune tiếp = emerald…), không đổi sang sky.
- **K3 / C1** — Hành động mỗi hàng thành icon-button 34px có viền, thay chữ "sửa/xóa" + emoji nhỏ.
- **K4** — Tách "Bỏ" (icon ⃠) khỏi "Xoá" (icon thùng rác) bằng vạch ngăn + tooltip rõ nghĩa.
- **K5** — (đích) header bảng click-to-sort có mũi tên chiều.
- **K7** — Thêm checkbox chọn hàng + thanh "Đã chọn N · hoàn lại ~EXP/Tuner · Xoá".
- **K8** — Thêm chip "Chấm theo: <nhân vật>" trong toolbar.
- **C2** — Emoji hệ thống → icon SVG (search/lock/ban/pencil/trash/list/grid/chevron).
- **C3** — Nâng chữ verdict/substat lên ≥12px.
- **C6** — Focus ring sky cho mọi chip/icon-button.

## Màn Kế hoạch (`Màn Kế hoạch.dc.html` → tab Kế hoạch)
- **C4** — Layout 2 cột theo tần suất dùng; mỗi panel một icon màu nhấn riêng (thay "bức tường details").
- **P1** — SetFarmPriority: 10 dòng lặp → bảng 3 cột (Set · Cần · Tốt nhất cho), sort theo số người cần.
- **P2** — CleanupPanel: nhãn rule 1 dòng ("Thiếu crit"…); nút disabled dùng slate, chỉ amber/rose khi có match.
- **P3** — UpgradePlanPanel: ô ngân sách có hậu tố "Tuner"; in luật "có budget → chỉ 5★"; vạch cutoff.
- **P4** — FarmingBacklog: progress bar rộng hơn, căn thành cột riêng; nhóm Farm/Dừng rõ.
- PinnedOverview đặt full-width trên cùng.

## Màn Build (`Màn Build.dc.html`)
- **B1** — WeightEditor: 13 ô number wrap → slider mini + nhãn viết tắt 1 dòng (title đầy đủ); gấp stat trọng số 0.
- **B2** — CharacterPicker: nút to kèm role + dot nguyên tố; dropdown grid, tên truncate + title (hết tràn).
- **B3** — BuildEditor: nhãn đặt trên control (hết wrap dọc); InfoTip cho "Base ATK ★".
- **B4** — LoadoutView: nút "Xuất ảnh PNG" / "Đặt làm bộ hiện tại" 1 dòng (whitespace-nowrap).
- **B5** — StatBreakdown: gộp Vũ khí+Forte+Buff → cột "Khác" có tooltip; hết scroll ngang, header "= Tổng" đủ chỗ.

## Màn Import (`Màn Import.dc.html`)
- **I1** — OCR: input file native → dropzone viền đứt làm mặt tiền (kéo-thả / Ctrl+V / bấm chọn gộp 1).
- **I2** — Cảnh báo beta 3 dòng → gập sau "Yêu cầu ảnh" / link "cách chụp tốt nhất".
- **I3** — ScannerImport: thêm phụ đề "nhanh nhất nếu chơi trên PC" + caret rõ.
- **I4** — EmptyState/JSON: nút/link thay copy phụ thuộc bố cục.

## Mock chi tiết bổ trợ
- `Redesign — Kho echo.dc.html` — before/after cận cảnh toolbar + hàng echo.
- `Redesign — Sprint mocks.dc.html` — before/after B1, P1, I1.
- `Redesign — Còn lại.dc.html` — K5, K7, P5 (Triage keycap+undo), B2, B5, C4.
- `Báo cáo UI Review.dc.html` — 25 phát hiện đầy đủ, mức nghiêm trọng & công sức.

## Ghi chú polish trong chính mock (không phải mục roadmap)
- Đã thêm `white-space:nowrap` cho tab điều hướng, chip "Chấm theo", tag role "DPS · Havoc", chip "Tài khoản chính" để mock không tự wrap khi thu hẹp — khi tái tạo trong app nhớ áp tương tự (liên quan B4/C).
