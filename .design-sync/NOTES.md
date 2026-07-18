# Design-sync notes — WuWa Echo Optimizer

- Repo là ỨNG DỤNG (Vite + React 19 + Tailwind v4), không phải thư viện DS: không có `dist/` library, converter chạy synth-entry từ `app/src/`. `pkg` = "app" (tên trong app/package.json), globalName = WuWaEcho.
- Provider bắt buộc (từ app/src/main.tsx): `I18nProvider` (app/src/i18n.tsx — `useT()` THROW nếu thiếu) bọc ngoài `ToastProvider` (app/src/components/Toast.tsx). Mọi component đều gọi `useT()`.
- `store.ts` là hook thuần trên localStorage (useEchoInventory/useVaults/useEquipped…) — KHÔNG cần provider; hoạt động bình thường trong preview headless.
- CSS: Tailwind v4 compile lúc build app. `cssEntry` trỏ vào `app/dist/assets/index-<hash>.css` — TÊN FILE CÓ HASH, đổi sau mỗi lần `npm run build` trong app/.
- App dark-only: `body { bg-slate-950 text-slate-200 }` nằm trong CSS compile — preview card nền tối là ĐÚNG thiết kế.
- Phạm vi preview lần đầu (user chốt 18/07/2026): sync full 36 component; viết preview tay cho ~16 component hiển thị cốt lõi, phần còn lại floor card (viết dần ở re-sync sau).

## Bài học viết preview (solo 18/07/2026)

- **BẮT BUỘC bọc mọi export trong container nền tối** `style={{ background: '#020617', borderRadius: 8, padding: 16 }}` — capture per-story cắt theo element với nền TRONG SUỐT rồi ghép lên trắng, chữ slate-100/200 của app sẽ vô hình nếu thiếu.
- Component popover bấm-mới-mở (ScoreBadge, InfoTip, BestOwnerBadge…): dùng helper `AutoOpen` (ref + useEffect click button đầu tiên) để chụp trạng thái mở; chừa padding-bottom đủ chỗ popover.
- Dữ liệu preview: import thẳng từ source app (`../../app/src/data/characters`, `../../app/src/engine/score`) — điểm số/màu sắc tính bằng engine thật, không bịa. Component thì import từ `'app'` (shim về bundle).
- Icon echo (game8 URL) không load trong capture → avatar chữ cái fallback — ĐÚNG thiết kế, không phải lỗi.
- Echo "rác" cho variant điểm thấp vẫn nên có substat được profile dùng chút ít (score 0.0 trông như bug).

## Known render warns (đã triage — KHÔNG phải lỗi mới)

- `[EXPORT_COLLISION] ./src/design-sync-entry.ts exports 35 name(s)...` — chủ ý: ds-entry re-export default theo tên để bundle IIFE có đủ export; cơ chế `__dsMainNs` merge lúc runtime, render check 36/36 pass.
- `[NO_DIST] --entry app/dist-lib/index.js doesn't exist` — entry "ma" chủ ý (neo PKG_DIR về app/ trong repo tự thân; synth-entry là mode mong muốn).
- `[DOCS_UNMAPPED]` 36/36 — repo không có docs per-component; .prompt.md tổng hợp từ .d.ts + preview là đúng.
- Stage validate trong resync.mjs có thể flake khi launch Chrome (exit 1 không rõ lý do) — chạy lại là hết.

## Re-sync risks

- `cssEntry` gắn hash build: sau khi code app đổi + rebuild, PHẢI cập nhật hash trong config (glob `app/dist/assets/index-*.css`) rồi mới chạy converter — nếu không validate sẽ báo `[CSS_IMPORT_MISSING]`.
- Tailwind compile CHỈ chứa class app đang dùng — preview tay (previews/*.tsx) không được dùng class Tailwind mà app chưa dùng (sẽ không có CSS; dùng inline style cho glue layout nếu cần).
- Preview import data/engine từ source app (`../../app/src/...`) — refactor engine/data có thể làm preview compile fail → component đó rơi về floor card (build log in `! preview build failed: <Name>`); sửa previews/<Name>.tsx theo API mới.
- `.ds-sync` cài `typescript@5` CHỦ Ý — `npm i typescript` mặc định kéo TS 7 (bản native Go, không có API `createSourceFile`) làm check .d.ts bị skip im lặng.
- Validate/capture cần env `DS_CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"` (máy không có playwright browser cache; dùng Chrome hệ thống).
- Thêm component mới vào app/src/components/ ⇒ PHẢI thêm 1 dòng re-export vào `app/src/design-sync-entry.ts` (35/36 component là default export, synth `export *` không mang default).
