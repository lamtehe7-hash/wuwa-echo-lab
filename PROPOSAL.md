# PROPOSAL — WuWa Echo Optimizer

> Đề xuất nền tảng & cách xây tool "chọn echo tối ưu từ kho có sẵn theo từng nhân vật".
> Căn cứ: 4 báo cáo trong `research/` (13/07/2026, game đang ở bản 3.5).

## 1. Bài toán & phạm vi

**Input:** kho echo của người chơi (mỗi echo: tên, sonata set, cost, rarity, level, main stat,
substat đã tune). **Output:**
1. *Xếp hạng theo nhân vật* — "trong 5 echo cost-3 này, con nào tốt nhất cho X?" (MVP).
2. *Bộ 5 tối ưu* cho 1 nhân vật (ràng buộc: tổng cost ≤ 12, layout 43311/44111/43111, set bonus
   2pc/5pc/3pc, không trùng tên echo khi đếm mảnh set).
3. *Gán kho cho nhiều nhân vật* (mỗi echo 1 người dùng) — giải tuần tự theo độ ưu tiên + lock
   (đúng cách Genshin Optimizer làm; bài toán joint là NP-hard, không cần giải chính xác).
4. *Tư vấn tune tiếp?* — echo dở dang có nên đổ tuner tiếp không (EV: main stat đúng + ≥1 substat
   ngon → tune tiếp; main stat sai → bỏ).

## 2. Vì sao đáng làm (gap analysis — chi tiết ở research/existing-tools.md)

- **Chưa tool nào giải trọn "kho của tôi → gán tối ưu cho roster"**: các tool hiện có chỉ chấm điểm
  1 echo/1 build (wuwa.uk, EVC), tối ưu 1 nhân vật bằng heuristic (Tethys — mới, dở dang),
  hoặc leaderboard so build (wuwa.build). WuWaOpt (72★) đã archive.
- Kuro đã có "Echo Management Plan" in-game (lock/vứt rác theo main stat + set) → niche còn lại
  chính xác là **chấm chất lượng substat + gán theo roster** — cái ta nhắm tới.
- Không có API inventory chính thức → nhập tay trước, OCR sau (đường đi đã có người khai phá:
  DommyMM/wuwa-ocr — icon template matching + OCR số, GPL-3.0, đang active).

## 3. Đề xuất nền tảng: **Web app client-side (Vite + React + TypeScript)**

| Tiêu chí | Web client-side (chọn) | Python/Streamlit | Spreadsheet |
|---|---|---|---|
| Trải nghiệm nhập/duyệt kho | Tốt (form + grid) | Trung bình | Kém khi kho lớn |
| Chia sẻ/dùng trên điện thoại | Miễn phí (GitHub Pages) | Phải tự host | Được nhưng xấu |
| Riêng tư/chi phí | localStorage, 0 đồng server | 0 đồng nhưng local-only | — |
| OCR về sau | Tesseract.js hoặc helper local | Mạnh nhất (OpenCV) | Không |
| Hợp meta tool WuWa hiện nay | Đúng chuẩn (wuwa.uk, EVC, wuwa.build đều là web) | — | — |

- **Stack:** Vite + React + TypeScript + Tailwind. Không backend — toàn bộ engine chạy client,
  kho echo lưu localStorage + nút export/import JSON (tự định nghĩa schema, vì cộng đồng WuWa
  chưa có chuẩn GOOD-equivalent). i18n vi/en. Deploy GitHub Pages/Cloudflare Pages.
- **Static data** (substat 8 mốc roll + xác suất, main stat theo cost, ~34 sonata set, preset trọng
  số nhân vật): tự biên JSON trong `src/data/`, đối chiếu Arikatsu/WutheringWaves_Data (dump theo
  patch, đang sync 3.5) + hakush.in/encore.moe + prydwen. Cập nhật mỗi patch = sửa JSON.
- Nếu chỉ muốn dùng cá nhân nhanh gọn: phương án B là Python CLI/Streamlit — nhưng web client-side
  không đắt hơn bao nhiêu công, dùng sướng hơn và chia sẻ được, nên vẫn khuyến nghị web.

## 4. Engine chấm điểm (research/scoring-methods.md)

**MVP — weighted roll-efficiency score** (chuẩn wuwa.uk/EVC, đủ đúng cho 90% quyết định):

```
score(echo, char) = Σ_substat  w_char[stat] × (value / maxValue[stat])
→ chuẩn hoá 0–100 theo echo lý thuyết hoàn hảo của archetype đó
```

- Trọng số theo nhân vật (preset ~20 nhân vật meta trước, cho phép user sửa): DPS crit chuẩn
  `CR=CD=2.0 > ATK%=0.75 ≈ DMG% đúng loại kỹ năng > flat ATK`; ER là **gate stat** — chỉ tính giá
  trị tới khi đạt breakpoint (kiểu EVC: ER thừa bị chiết khấu, tính lần lượt qua 5 echo chung 1
  "ngân sách ER").
- **Main stat quyết định trước substat**: cost-3 phải đúng Element DMG%/ER, cost-4 CR/CD (main stat
  sai = loại, không cứu được bằng substat). Điểm cuối = fit(main) × score(sub).
- Nightmare/echo trùng tên: trùng tên không đếm mảnh set (constraint khi ghép bộ 5).

**Bộ 5 tối ưu:** không gian nhỏ → duyệt theo "chữ ký set" (chọn set 5pc/2pc+2pc/3pc khả dĩ trước,
trong mỗi chữ ký thì chọn best-per-slot vì lúc đó bài toán tách được theo slot — đúng pattern
Genshin Optimizer), kèm prune top-K mỗi slot theo score. Kho vài trăm echo chạy tức thì.

**Sau MVP — damage model thật** (công thức đã xác minh ở research/scoring-methods.md §3: các bracket
nhân độc lập `%DMG_Bonus × DMG_Amplify × Crit × DEF × RES`): cho phép so "echo A vs B" bằng ∆damage
thay vì điểm trọng số. Làm từng nhân vật một, bắt đầu từ nhân vật của user.

## 5. Nhập liệu

1. **MVP: nhập tay** — form tối ưu tốc độ (chọn set→cost→main stat bằng 2-3 click, substat gõ số
   có autocomplete 8 mốc hợp lệ; ~20 giây/echo, kho lọc sẵn "chỉ nhập echo 5★ đã +15 trở lên").
2. **Giai đoạn 2: OCR ảnh chụp màn hình** (upload ảnh, không tự động hoá game — vùng an toàn ToS
   theo research/data-sources.md §5): nhận diện **loại stat bằng icon template matching** (bài học
   quan trọng nhất từ wuwa-ocr: đây là bài CV chứ không phải OCR), chỉ OCR phần số. Client-side
   Tesseract.js thử trước; nếu độ chính xác kém → helper Python local (RapidOCR) xuất JSON rồi
   import vào web.

## 6. Lộ trình

| Phase | Nội dung | Ước lượng |
|---|---|---|
| 0 | Khởi tạo repo Vite+React+TS, JSON static data (substat/mainstat/set), schema echo + export/import | 1 buổi |
| 1 | **MVP**: CRUD kho echo (nhập tay) + preset trọng số + bảng xếp hạng echo theo nhân vật (trả lời đúng câu "5 con cost-3 dùng con nào") + tư vấn tune tiếp | 1–2 buổi |
| 2 | Solver bộ-5 tối ưu 1 nhân vật (cost 12, layout, set signature) | 1 buổi |
| 3 | Gán nhiều nhân vật: chạy tuần tự theo ưu tiên + lock echo đã gán | 0.5 buổi |
| 4 | OCR import ảnh chụp | 2–3 buổi (rủi ro cao nhất) |
| 5 | Damage model per-character (tuỳ chọn, làm dần) | mở |

## 7. Rủi ro & lưu ý

- Số liệu đánh dấu **UNVERIFIED** trong research (xác suất 8 mốc roll, max Basic DMG% 11.6 vs 12.4,
  flat ATK max 60 vs 70) → phase 0 đối chiếu lại bằng Arikatsu data dump / in-game trước khi hardcode.
- Mỗi patch thêm set/nhân vật mới → thiết kế data JSON tách khỏi code ngay từ đầu.
- OCR: chỉ làm chế độ passive (user tự chụp/upload), tuyệt đối không simulate input trong game.
