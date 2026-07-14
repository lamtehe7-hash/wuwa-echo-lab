# Nghiên cứu cải thiện UI/UX — WuWa Echo Optimizer
*Biên soạn 14/07/2026. Tham khảo: Genshin Optimizer, Fribbels HSR Optimizer, wuwa.build, wuwa.uk, EVC, UI in-game WuWa. Bổ sung cho `existing-tools.md` (khảo sát tính năng) — file này tập trung riêng vào **giao diện & trải nghiệm**.*

---

## 1. Tóm tắt

App hiện tại đã có nền tốt (EchoCard kiểu in-game, OCR có progress + card review, i18n VI/EN, dark theme nhất quán) nhưng **cấu trúc điều hướng là điểm yếu lớn nhất**: mọi tính năng dồn vào 1 trang, bật/tắt bằng toggle (`showOcr`, `showWeights`), kho echo chỉ có 1 dạng bảng chữ dày đặc, chọn nhân vật bằng `<select>` trần. So với chuẩn ngành (Genshin Optimizer, Fribbels), khoảng cách nằm ở **7 nhóm**: điều hướng tab, khám phá kho (filter/sort/search), phản hồi hành động (toast/undo thay `alert/confirm`), onboarding lần đầu, breakdown điểm số dễ tiếp cận, so sánh trước–sau, và chia sẻ kết quả. Phần lớn khắc phục được bằng quick win không đụng engine.

---

## 2. Hiện trạng UI (đọc code 14/07/2026)

Layout 1 trang: header (title + nút EN/VI, export/import JSON) → grid `[340px | 1fr]`:
sidebar trái = form nhập tay + nút toggle OCR + đếm kho + WeightEditor (toggle); cột phải =
chọn nhân vật (`<select>`) + toggle weights + filter cost + nút "Tìm bộ 5" → LoadoutView →
RankingTable → RosterPanel ([App.tsx](../app/src/App.tsx)).

Điểm mạnh đang có:
- **EchoCard** ([EchoCard.tsx](../app/src/components/EchoCard.tsx)) — card kiểu in-game: viền theo rarity, icon echo, pip cost ◆, main stat vàng nổi, thanh mốc roll 1–8 + badge RV, chấm màu nguyên tố của sonata. Ngang chuẩn card của wuwa.build/GO.
- **OCR review flow** ([OcrImport.tsx](../app/src/components/OcrImport.tsx)) — progress theo file, kết quả ra card, auto mở form khi confidence thấp, nút "Lưu tất cả / Lưu echo 100%". Pattern giống wuwa.build (stream kết quả từng vùng).
- Nhập tay chống sai số (substat chọn từ 8 mốc roll), demo data 1 nút, i18n đầy đủ.

Điểm yếu (theo file):
| # | Vấn đề | Vị trí |
|---|---|---|
| H1 | Không có tab/route — OCR & Weights là toggle chèn giữa trang; trang dài dần: loadout → bảng → roster | App.tsx:78–160 |
| H2 | Chọn nhân vật = `<select>` trần, không màu nguyên tố/role, dấu `*` nhỏ cho override | App.tsx:119–121 |
| H3 | Kho chỉ có **bảng** chữ dày; không search tên, không filter theo set/main stat/verdict, không đổi cách sort (cố định theo điểm); EchoCard không được dùng cho kho | RankingTable.tsx |
| H4 | `window.confirm`/`alert` cho xoá echo, import đè kho, báo dropped — chặn luồng, không undo | App.tsx:66–70, RankingTable.tsx:95 |
| H5 | Kho đổi → kết quả solve **biến mất** ngay (đúng logic chống stale nhưng đột ngột, user tưởng mất) | App.tsx:37–40 |
| H6 | Giải thích điểm (`substat + main`), damage ×N chỉ nằm trong `title=` — hover-only, mobile không xem được | RankingTable.tsx:88, LoadoutView.tsx:31 |
| H7 | Lần đầu mở: sidebar form trống + nút demo nhỏ — chưa có màn hướng dẫn "3 bước" | App.tsx:94–99 |
| H8 | Import JSON chỉ có **thay thế** kho (confirm) — không có lựa chọn gộp (merge) | App.tsx:63–70 |
| H9 | Roster: list tên + nút ↑↓✕, kết quả là chuỗi LoadoutView dài; nút icon không aria-label | RosterPanel.tsx |
| H10 | Không lưu trạng thái vào URL (nhân vật/filter/tab) — F5 mất lựa chọn, không share được | App.tsx |
| H11 | Icon echo hotlink game8 CDN — bản portable offline rơi về chữ cái đầu | EchoCard.tsx:85–97 |
| H12 | Mobile: bảng tràn ngang phải kéo; CTA "Tìm bộ 5" trôi theo flex-wrap | App.tsx:117–141 |

---

## 3. Pattern UI/UX đáng học từ tool tương tự

### 3.1 Genshin Optimizer (frzyc.github.io/genshin-optimizer) — chuẩn vàng thể loại
- **Điều hướng trang rõ**: Artifacts / Weapons / Characters / Tools / Settings — mỗi kho một trang, không toggle. *(kiến thức nền + README: React + MUI)*
- **Trang artifact = card grid + thanh filter dày**: filter theo set/slot/main stat/substat/rarity/khoảng level, sort theo **Roll Value (RV) / efficiency**; mỗi card hiện số roll từng substat + % efficiency, badge nhân vật đang đeo, nút **lock/exclude** khỏi optimizer. RV/efficiency chính là thứ app này đã tính (RV badge trong EchoCard) — GO cho **sort + filter trực tiếp bằng nó**.
- **So sánh trước–sau**: kết quả optimize hiện build mới cạnh build đang đeo, chênh lệch từng stat **xanh/đỏ** — tính năng giữ chân user mạnh nhất của GO.
- **Multi-database + auto-save hiển thị**: 4 slot database, export/import từng slot.
- Nguồn: [github.com/frzyc/genshin-optimizer](https://github.com/frzyc/genshin-optimizer), [live site](https://frzyc.github.io/genshin-optimizer/); chi tiết card/filter từ kiến thức nền — *UNVERIFIED chi tiết pixel, nên mở site đối chiếu khi làm*.

### 3.2 Fribbels HSR Optimizer (fribbels.github.io/hsr-optimizer)
- Chia tab: **Optimizer / Characters / Relics / Relic scorer / Import**. Kho relic là **bảng dữ liệu kiểu spreadsheet** (AG-Grid) sort mọi cột — ngược triết lý với GO (card grid): Fribbels phục vụ power-user, GO phục vụ trực quan. → Gợi ý: cho **toggle 2 chế độ xem bảng ⇄ lưới card** là đáp cả hai.
- **Relic organizer + recommendations**: chấm "tiềm năng" mỗi relic theo *best case / average case* cho từng nhân vật → trả lời "con này đáng giữ cho ai" ngay trong kho. Tương đương trực tiếp với cột "tư vấn tune" hiện có — có thể mở rộng thành "tốt nhất cho: X, Y".
- **Showcase card** render splash art + relic + điểm để share ảnh — lý do tool lan truyền trên Discord/Reddit.
- Nguồn: [github.com/fribbels/hsr-optimizer](https://github.com/fribbels/hsr-optimizer) (README + screenshots; mô tả chi tiết grid từ kiến thức nền).

### 3.3 wuwa.build (WuWaBuilds) — đối thủ WuWa trực tiếp, active nhất
- Route rõ ràng: `/edit` (build editor), `/builds`, `/import` (OCR), `/saves`, `/profile/[uid]`, `/leaderboards/[characterId]`.
- **OCR streaming**: đăng ảnh 1920×1080, kết quả trả **từng vùng một khi xong** (per-region progress) — cảm giác nhanh hơn dù tổng thời gian bằng nhau. App mình đã có progress theo file; nâng cấp = hiện card ngay khi từng ảnh xong (đã có) + skeleton card khi đang đọc.
- **Build card export ảnh** (downloadable) + kéo-thả chỉnh splash art trước khi export.
- **URL state sync** cho filter leaderboard — share link giữ nguyên bộ lọc.
- Nguồn: [github.com/DommyMM/wuwabuild](https://github.com/DommyMM/wuwabuild) (fetch 14/07/2026 — đã xác minh).

### 3.4 wuwa.uk Echo Scorer — mẫu onboarding tốt cho tool nhỏ
- Luồng 3 bước hiện ngay trên trang: *chọn preset role → nhập stat → nhận kết quả*; text mồi "Fill in your substats to get a recommendation" khi chưa đủ input.
- **5 preset role** (Crit DPS / Liberation DPS / Heavy Attack DPS / Sub-DPS-Buffer / Healer) — hạ rào cản "trọng số là gì": người mới không phải hiểu weight, chỉ chọn role. WeightEditor hiện tại của mình là bảng số cho power-user; thiếu lớp preset phía trên.
- Kết quả 3 tầng: **điểm 0–100 + hạng chữ S–D + verdict giữ/bỏ** (mình đã có verdict 4 mức — tốt; thiếu hạng chữ dễ đọc).
- Khối "How it works" + "5 common mistakes" ngay dưới tool — giáo dục tại chỗ.
- Nguồn: [wuwa.uk/echo-scorer](https://wuwa.uk/echo-scorer) (fetch 14/07/2026 — đã xác minh).

### 3.5 UI in-game WuWa (chuẩn thị giác người dùng đã quen)
- Panel echo: nền tối + **vàng/hổ phách** cho main stat, pip ◆ cost, sao rarity, icon sonata tròn cạnh level — EchoCard đã bám sát. Hướng phát triển thị giác: giữ tông này làm design token toàn app (hiện header/nút vẫn slate trung tính lẫn emerald/sky/amber tuỳ chỗ).
- Màn "Data Bank / Echo Gallery" in-game nhóm theo **cost và set** bằng hàng icon — gợi ý cách nhóm kho theo set khi lọc.

### 3.6 Điểm chung cả ngành (tổng hợp)
| Pattern | GO | Fribbels | wuwa.build | App mình |
|---|---|---|---|---|
| Tab/route theo tác vụ | ✅ | ✅ | ✅ | ❌ (toggle 1 trang) |
| Kho: filter set/main/rarity + search | ✅ | ✅ | ✅ | ◐ (chỉ cost) |
| Sort tuỳ chọn (RV/level/mới) | ✅ | ✅ | ✅ | ❌ (cố định) |
| Card grid cho kho | ✅ | ❌ (grid bảng) | ✅ | ❌ (chỉ bảng) |
| So sánh trước–sau khi optimize | ✅ | ✅ | ◐ (leaderboard) | ❌ |
| Preset role cho trọng số | ◐ | ✅ | — | ❌ (chỉ editor số) |
| Share kết quả dạng ảnh | ◐ | ✅ | ✅ | ❌ |
| Toast/undo thay alert | ✅ | ✅ | ✅ | ❌ |
| URL state | ✅ | ◐ | ✅ | ❌ |

---

## 4. Đề xuất — xếp theo ưu tiên

> Nguyên tắc giữ scope: **không** backend, **không** leaderboard, **không** rewrite sang MUI/AntD — Tailwind hiện tại đủ; đổi mới nằm ở cấu trúc và micro-UX, không phải stack.

### Nhóm A — Quick win (mỗi mục ≤ 1 buổi, không đụng engine)

**A1. Toast + Undo thay `alert`/`confirm`** *(sửa H4)* — component toast nhỏ tự viết (không cần lib): xoá echo → toast "Đã xoá ⟲ Hoàn tác" 5s (giữ echo trong ref, undo = add lại); import JSON → toast tổng kết số nhập/bỏ. `confirm` chỉ giữ cho hành động thay-thế-toàn-kho.

**A2. Thanh công cụ kho: search + filter + sort** *(H3)* — trên RankingTable thêm: ô search tên (fuzzy đơn giản `includes`), dropdown set, dropdown main stat, chip verdict (giữ-tune/xong/tạm/rác), sort (Điểm ↓ | RV ↓ | Level ↓ | Mới thêm). Đếm "hiện x/y echo". Chỉ là filter phía client trước khi `rankEchoes`.

**A3. Kết quả solve "stale" thay vì biến mất** *(H5)* — kho/trọng số đổi: giữ LoadoutView, phủ overlay mờ + banner "Kho đã thay đổi — kết quả cũ" + nút "Giải lại". Một state `stale: boolean` thay vì `setLoadout(null)`.

**A4. Preset trọng số dạng chip** *(học wuwa.uk)* — trên WeightEditor thêm hàng chip: `Mặc định nhân vật · Crit DPS · Sub-DPS/Buffer · Healer · ER-first` → bấm chip = đổ bộ weight tương ứng vào editor (vẫn chỉnh tay tiếp được), thêm nút "Reset về mặc định". Data thuần, không đụng engine.

**A5. Empty state / first-run** *(H7)* — khi `echoes.length === 0`: thay bảng trống bằng hero 3 card lớn: **📷 Import từ ảnh (OCR)** · **📄 Import JSON** · **🎲 Thử với dữ liệu demo**, kèm 3 bước "Nhập kho → Chọn nhân vật → Tìm bộ 5".

**A6. Paste ảnh clipboard (Ctrl+V) + drop toàn trang cho OCR** — người chơi chụp màn hình bằng Win+Shift+S rồi Ctrl+V thẳng vào app (đỡ save file). Listener `paste` + `drop` ở panel OCR.

**A7. Accessibility mini-pass** *(H9)* — `aria-label` cho các nút icon (↑ ↓ ✕, sửa, xoá), `focus-visible:ring` thống nhất, `<button>` đúng ngữ nghĩa (đã đúng đa số).

### Nhóm B — Vừa (1–3 ngày/mục, thay đổi cấu trúc nhìn thấy rõ)

**B1. Tab navigation + URL hash** *(H1, H10)* — 4 tab: **Kho Echo · Tối ưu 1 nhân vật · Đội hình · Import**. Không cần react-router — hash `#inventory / #optimize / #roster / #import` + `hashchange`. OCR/JSON gộp vào tab Import; WeightEditor thành panel trong tab Tối ưu. Đồng thời sync `charId` + filter vào query của hash (share link giữ ngữ cảnh — pattern wuwa.build).

**B2. Kho 2 chế độ xem: bảng ⇄ lưới card** *(H3, H12)* — toggle góc phải thanh công cụ (icon bảng/lưới), dùng lại **EchoCard compact** + footer = điểm + verdict. Mặc định: lưới trên mobile, bảng trên desktop; nhớ lựa chọn vào localStorage. Đây là điểm hoà giải GO (card) vs Fribbels (bảng) với chi phí thấp vì EchoCard có sẵn.

**B3. Character picker trực quan** *(H2)* — thay `<select>` bằng nút mở popover lưới nhân vật: chip màu **nguyên tố** + tên + badge role (DPS/Sub/Healer từ archetype) + chấm "đã chỉnh weights". Nhóm theo nguyên tố. (Chưa cần portrait — tránh vấn đề bản quyền ảnh; màu + chữ cái đầu như fallback icon hiện tại.)

**B4. Popover breakdown điểm** *(H6)* — bấm vào điểm số (bảng hoặc card) mở popover: thanh ngang đóng góp từng substat (đã có `breakdown` trong `rankEchoes`), dòng main stat fit, công thức `sub + main = total`. Thay toàn bộ tooltip `title=` quan trọng. Hoạt động trên mobile (click, không hover).

**B5. Lock / Trash flag cho echo** *(học GO exclude/lock)* — 2 flag trên mỗi echo: 🔒 giữ (solver vẫn dùng, không bao giờ gợi ý xoá) và 🗑 loại (ẩn khỏi solver, gom vào filter "rác" để xoá hàng loạt). Thêm bulk-select ở chế độ bảng: checkbox + "Xoá n echo đã chọn". Cần thêm 2 field optional vào type `Echo` (backward-compatible với JSON cũ).

**B6. Roster trực quan** *(H9)* — mỗi nhân vật 1 card: header tên + màu nguyên tố, hàng 5 EchoCard compact (như hàng echo đang đeo in-game), kéo-thả (hoặc nút) đổi thứ tự ưu tiên; tổng điểm + note. Kết quả đỡ thành "bức tường LoadoutView".

### Nhóm C — Lớn / định hướng (cân nhắc sau)

**C1. So sánh trước–sau (equipped tracking)** — killer feature của GO: thêm khái niệm "bộ đang đeo" per nhân vật (user bấm "đặt làm bộ hiện tại" từ kết quả solve, lưu localStorage); lần solve sau hiển thị **delta điểm/stat xanh-đỏ** so với bộ hiện tại. Đây là nâng cấp giá trị nhất về retention, nhưng cần thiết kế data + UX kỹ.

**C2. Export "build card" ảnh** *(học wuwa.build/Fribbels showcase)* — render LoadoutView ra PNG (thư viện `html-to-image`, chạy client) để share Discord. Lưu ý icon game8 hotlink sẽ taint canvas → cần C3 trước hoặc vẽ fallback.

**C3. Vendor icon echo tự chứa** *(H11)* — tải trước bộ icon echo về `public/echo-icons/` lúc build (script như tesseract vendoring). Lợi: offline portable đẹp, mở đường cho C2. **Rủi ro bản quyền**: icon là asset Kuro Games — cân nhắc giữ hotlink cho bản web, chỉ vendor cho bản portable cá nhân, hoặc dùng icon chữ-cái stylized.

**C4. PWA installable** — app đã self-host tesseract + chạy client-only → thêm manifest + service worker là thành app cài được, offline hoàn toàn trên cả web. Chi phí thấp, nhưng xếp C vì cần test cache-invalidation khi deploy Pages.

**C5. Multi-profile** *(học GO 4-database)* — nhiều slot kho (2 tài khoản, thử nghiệm) + indicator "đã lưu" + cảnh báo quota localStorage.

### Việc **không** khuyến nghị
- Leaderboard/so sánh cộng đồng (cần backend — ngược triết lý client-only, wuwa.build đã làm tốt).
- Rewrite UI framework (MUI/AntD/AG-Grid) — Tailwind + component tự viết đang gọn, bundle nhỏ.
- Splash art nhân vật thật — bản quyền + nặng; màu nguyên tố + typography đủ tạo identity.

---

## 5. Lộ trình gợi ý

| Đợt | Nội dung | Kết quả nhìn thấy |
|---|---|---|
| UI-1 | A1–A7 (quick wins) | ✅ **Đã làm 14/07/2026** (PROJECT_TASK task 33) — hết alert thô, kho lọc/tìm được, không mất kết quả solve, onboarding lần đầu |
| UI-2 | B1 + B2 + B3 | App có tab, kho xem dạng card, chọn nhân vật trực quan — "ra dáng" GO |
| UI-3 | B4 + B5 + B6 | Điểm số giải thích được, quản kho hàng loạt, roster như in-game |
| UI-4 | C1 (+C2/C3 nếu muốn share) | So sánh trước–sau — giá trị giữ chân lớn nhất |

---

## 6. Nguồn

Đã xác minh trực tiếp 14/07/2026:
- [github.com/DommyMM/wuwabuild](https://github.com/DommyMM/wuwabuild) — cấu trúc route, OCR streaming, build card export, URL state
- [wuwa.uk/echo-scorer](https://wuwa.uk/echo-scorer) — luồng 3 bước, 5 preset role, điểm+hạng+verdict, khối How-it-works
- [github.com/fribbels/hsr-optimizer](https://github.com/fribbels/hsr-optimizer) — các tab, relic organizer/recommendations, showcase, screenshots
- [github.com/frzyc/genshin-optimizer](https://github.com/frzyc/genshin-optimizer) — stack (React+MUI), monorepo

Kiến thức nền (mô tả chi tiết UI của GO/Fribbels — *nên mở live site đối chiếu trước khi code pixel-level*):
- [frzyc.github.io/genshin-optimizer](https://frzyc.github.io/genshin-optimizer/) — card grid artifact, RV sort, lock/exclude, so sánh build
- [fribbels.github.io/hsr-optimizer](https://fribbels.github.io/hsr-optimizer/) — AG-Grid kho relic, permutation counter, damage delta

Fetch bị chặn (403/SPA — như đã ghi nhận trong existing-tools.md): wuwa-optimizer.com, wuwatracker.com.
