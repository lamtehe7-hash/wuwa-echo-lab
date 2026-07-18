# CLAUDE.md — WuWaEcho UI redesign

Repo này đang áp một đợt cải thiện giao diện. Nguồn tham chiếu: `docs/ui-redesign/`.

## Khi được yêu cầu làm UI redesign
1. Đọc `docs/ui-redesign/README.md` — spec 25 mục, mỗi mục có mã (K/P/B/I/C), file, thay đổi, điều kiện "Xong khi".
2. Đọc `docs/ui-redesign/INTEGRATION.md` — quy trình & prompt mẫu.
3. Các file `docs/ui-redesign/*.dc.html` là **tham chiếu thiết kế** (mở bằng trình duyệt). KHÔNG import/ship — tái tạo trong React + TypeScript + Tailwind sẵn có.

## Ràng buộc bắt buộc
- **Không** thêm class Tailwind chưa có trong build (Tailwind biên dịch sẵn, class thiếu sẽ im lặng không tác dụng). Thiếu thì thêm vào config hoặc dùng `style={{}}`.
- Giữ **ngữ nghĩa màu**: sky = tương tác · amber = cảnh báo/ghim/5★/S · emerald = tốt · rose = xấu · violet = 4★ · slate = trung tính.
- Dark-only. Số liệu dùng `font-mono` (+ `tabular-nums` trong bảng).
- Mọi nhãn giữ song ngữ vi/en qua `i18n.tsx` — không hardcode chuỗi đã dịch.
- Hit target hành động ≥ 32px desktop / 44px mobile.

## Vị trí code
- Component: `app/src/components/<Name>.tsx`
- i18n: `app/src/i18n.tsx` · Màu nguyên tố: `app/src/data/elementColors.ts`

## Thứ tự làm
Tier 1 (quick wins) → Tier 2 (sprint) → Tier 3 (dài hạn). Mỗi mục 1 commit `ui(<mã>): <tóm tắt>`. Xong mỗi mục chạy `npm run build`.
