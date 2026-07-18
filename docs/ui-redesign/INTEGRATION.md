# Hướng dẫn tích hợp bằng Claude Code

Tài liệu này chỉ cách dùng **Claude Code** để đưa các cải thiện UI trong gói này vào repo thật `wuwa-echo-lab`. Đọc kèm `README.md` (spec chi tiết từng mục).

---

## 0. Chuẩn bị (một lần)

```bash
# 1. Clone repo thật (nếu chưa có)
git clone https://github.com/lamtehe7-hash/wuwa-echo-lab.git
cd wuwa-echo-lab

# 2. Cài & chạy thử để có baseline
npm install
npm run dev        # mở app, xác nhận chạy được trước khi sửa

# 3. Giải nén gói handoff vào một thư mục THAM CHIẾU trong repo
#    (không phải src — chỉ để Claude Code đọc)
mkdir -p docs/ui-redesign
cp -r /đường/dẫn/design_handoff_wuwaecho_ui/* docs/ui-redesign/

# 4. Copy CLAUDE.md ở gói này ra gốc repo để Claude Code tự đọc ngữ cảnh
cp docs/ui-redesign/CLAUDE.md ./CLAUDE.md

# 5. Mở Claude Code tại gốc repo
claude
```

> File `.dc.html` trong `docs/ui-redesign/` là **tham chiếu thiết kế**, mở bằng trình duyệt để xem. Không import/ship trực tiếp — tái tạo bằng React + TS + Tailwind sẵn có của app.

---

## 1. Nguyên tắc cho Claude Code

- Làm **theo tier**: Tier 1 (quick wins) → Tier 2 (sprint) → Tier 3. Mỗi mục 1 commit nhỏ.
- **Không** thêm class Tailwind chưa có trong build; thiếu thì thêm vào config hoặc dùng `style={{}}`.
- Giữ nguyên **ngữ nghĩa màu** (sky/amber/emerald/rose/violet/slate) và **i18n vi/en**.
- Mỗi mục xong phải: app chạy (`npm run dev`), không lỗi TypeScript (`npm run build`), khớp mô tả "Xong khi" trong README.

---

## 2. Prompt mẫu (copy-paste vào Claude Code)

### Mở màn đầu tiên — Tier 1, mục K2 (mẫu cho mọi mục)
```
Đọc docs/ui-redesign/README.md, mục "K2".
Sửa app/src/components/RankingTable.tsx theo đúng mục đó:
chip verdict khi active phải giữ màu ngữ nghĩa (emerald/sky/amber/rose),
không đổi sang bg-sky-700. sky-700 chỉ dành cho chip "Tất cả".
Đối chiếu ảnh trong docs/ui-redesign/"Màn Kho echo.dc.html".
Chỉ sửa phần liên quan, giữ nguyên logic. Xong thì chạy npm run build kiểm tra.
```

### Làm trọn Tier 1 một mạch
```
Triển khai lần lượt các mục Tier 1 trong docs/ui-redesign/README.md:
K1, K2, K4, K6, K8, P2, P3, P4, P6, B3, B4, I2, I3, I4, C5.
Mỗi mục 1 commit riêng với message "ui(<mã>): <tóm tắt>".
Với mỗi mục: đọc mục tương ứng trong README, sửa đúng file nêu trong đó,
đối chiếu file .dc.html tương ứng nếu có, rồi npm run build.
Dừng lại báo cáo sau khi xong Tier 1 để tôi review.
```

### Ráp lại nguyên màn (dùng mock "Màn ...")
```
Đối chiếu docs/ui-redesign/"Màn Kế hoạch.dc.html" và mục C4 trong README,
sắp xếp lại tab Kế hoạch thành layout 2 cột theo tần suất dùng,
mỗi panel một icon màu riêng. Tái tạo bằng component React sẵn có,
không đổi hành vi/logic của từng panel.
```

### Tier 3 — thay emoji bằng icon (C2)
```
Theo mục C2 trong README: cài lucide-react, thay dần các emoji icon hệ thống
(🔒🗑🗄📌📈💰📦🧹⚠) bằng icon lucide ăn theo currentColor, giữ nguyên
ngữ nghĩa màu. Bắt đầu từ RankingTable.tsx (mock "Màn Kho echo" đã dùng
đúng bộ path lucide cho lock/ban/pencil/trash). Mỗi component 1 commit.
```

---

## 3. Thứ tự đề xuất & file chạm tới

| Tier | Mục | File chính |
|---|---|---|
| 1 | K1 K2 K4 K6 K8 | `components/RankingTable.tsx` (+ `SubstatLegend.tsx`) |
| 1 | P2 P3 P4 P6 | `components/CleanupPanel.tsx` · `UpgradePlanPanel.tsx` · `FarmingBacklog.tsx` · các `*Panel.tsx` |
| 1 | B3 B4 I2 I3 I4 | `BuildEditor.tsx` · `LoadoutView.tsx` · `OcrImport.tsx` · `ScannerImport.tsx` · `EmptyState.tsx` |
| 1 | C5 | `i18n.tsx` |
| 2 | K3 K5 K7 C1 C3 C6 | `RankingTable.tsx` + audit toàn app |
| 2 | P1 P5 | `SetFarmPriority.tsx` · `TriagePanel.tsx` |
| 2 | B1 B2 B5 I1 | `WeightEditor.tsx` · `CharacterPicker.tsx` · `StatBreakdown.tsx` · `OcrImport.tsx` |
| 3 | C2 C4 + mobile | toàn app |

---

## 4. Quy trình Git đề xuất
```bash
git checkout -b ui/tier-1
# ... Claude Code làm từng mục, commit nhỏ ...
npm run build && npm run dev   # kiểm tra trước khi push
git push -u origin ui/tier-1   # mở PR, review, merge
```
Làm branch riêng cho mỗi tier (`ui/tier-1`, `ui/tier-2`, `ui/tier-3`) để review theo đợt.

## 5. Checklist nghiệm thu mỗi mục
- [ ] `npm run build` không lỗi TypeScript.
- [ ] App chạy, màn liên quan không vỡ layout.
- [ ] Khớp mô tả "Xong khi" của mục trong README.
- [ ] Không thêm class Tailwind ngoài build; màu &amp; i18n giữ nguyên quy ước.
- [ ] (Nếu có mock) diện mạo khớp file `.dc.html` tương ứng.
