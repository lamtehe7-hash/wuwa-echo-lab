# WuWa Echo Optimizer

Tool web giúp người chơi **Wuthering Waves** quyết định nhanh: *"trong kho Echo tôi đang có, nên
dùng con nào cho nhân vật nào?"* — thay vì đoán mò hoặc tính tay theo cảm tính.

Chạy hoàn toàn phía client (không backend, không thu thập dữ liệu), kho Echo lưu trong
`localStorage` của trình duyệt.

**🌐 Dùng ngay trên web:** https://lamtehe7-hash.github.io/wuwa-echo-lab/

**📦 Bản portable Windows (không cần cài gì):** tải file zip ở mục
[Releases](https://github.com/lamtehe7-hash/wuwa-echo-lab/releases), giải nén, chạy
`WuWaEchoOptimizer.exe` — trình duyệt tự mở app, hoạt động **offline hoàn toàn** (kể cả OCR).

> Xem kiến trúc & lộ trình đầy đủ ở [`PROPOSAL.md`](./PROPOSAL.md), và các báo cáo nghiên cứu nền
> tảng ở [`research/`](./research).

## Tính năng hiện có

- **Nhập kho Echo bằng tay** — form chọn sonata set, cost, main stat (theo mốc hợp lệ của cost) và
  substat (giá trị chọn từ đúng 8 mốc roll khả dĩ), tránh nhập sai số liệu.
- **Xếp hạng Echo theo nhân vật** — chấm điểm weighted roll-efficiency dựa trên bộ trọng số substat
  của từng nhân vật/archetype, có xét độ phù hợp main stat (3 mức: đúng / tạm dùng / sai).
- **Tư vấn tune tiếp** — với Echo main stat đúng nhưng substat còn dở dang, ước lượng kỳ vọng
  (expected value) để quyết định có nên đổ tuner tiếp hay bỏ.
- **Tìm bộ 5 Echo tối ưu cho 1 nhân vật** — solver tự sinh layout cost hợp lệ (tổng ≤ 12), tính cả
  set bonus (2/3/5 mảnh, có luật "trùng tên Echo không đếm 2 lần") và chiết khấu ER thừa so với
  mục tiêu.
- **Gán Echo cho cả đội hình** — giải tuần tự theo thứ tự ưu tiên nhân vật, cho phép khoá
  (lock) Echo đã dùng để không bị nhân vật khác giành mất.
- **Chỉnh trọng số theo ý riêng** — ghi đè bộ trọng số substat / mục tiêu ER mặc định cho từng nhân
  vật, lưu riêng theo trình duyệt.
- **Import bằng OCR từ ảnh / video (beta)** — chụp/quay màn hình panel Echo rồi thả vào tool:
  tự nhận tên Echo, sonata set (từ icon), cost, level, main stat và substat (snap về mốc roll hợp
  lệ). OCR chạy **ngay trên máy** (tesseract.js, tài nguyên tự chứa — không gọi CDN, không upload
  ảnh đi đâu); kết quả hiện dạng card như in-game, có nút *Lưu tất cả / Lưu echo 100%*.
- **Export / Import JSON** — sao lưu hoặc chuyển kho Echo giữa các thiết bị bằng file JSON tự định
  nghĩa (chưa có chuẩn chung cho cộng đồng WuWa).
- **Dữ liệu demo** — nút nạp sẵn vài Echo mẫu để thử nhanh không cần nhập tay.

## Chạy thử ở máy local

Yêu cầu: Node.js 24+ (khuyến nghị dùng đúng bản đã dùng để phát triển).

```bash
cd app
npm install
npm run dev
```

Mở địa chỉ hiển thị trong terminal (mặc định `http://localhost:5173`).

Xem thêm lệnh build/test ở [`app/README.md`](./app/README.md).

## Cấu trúc thư mục

```
WuWa Echo/
├── app/                  # Ứng dụng web (Vite + React 19 + TypeScript + Tailwind v4)
│   ├── src/
│   │   ├── data/         # Dữ liệu tĩnh: substat, main stat, sonata set, nhân vật
│   │   ├── engine/       # Logic chấm điểm, solver bộ-5, gán roster
│   │   ├── components/   # UI: form nhập, card echo, bảng xếp hạng, panel roster, OCR import...
│   │   ├── ocr/          # OCR ảnh/video: parse text, tiền xử lý, nhận set từ icon
│   │   ├── store.ts      # Lưu trữ localStorage (kho Echo, override trọng số)
│   │   └── types.ts      # Kiểu dữ liệu dùng chung
│   ├── public/tesseract/ # Tài nguyên OCR tự chứa (worker/core sinh từ node_modules + langdata)
│   └── scripts/smoke.ts  # Smoke test engine (không cần trình duyệt)
├── portable/             # Đóng gói bản Windows portable (server nhúng + pkg → 1 file .exe)
├── research/             # Báo cáo nghiên cứu: cơ chế Echo, tool hiện có, cách chấm điểm, nguồn dữ liệu
├── PROPOSAL.md           # Đề xuất nền tảng, kiến trúc, lộ trình các phase
├── DEPLOY.md             # Hướng dẫn đưa app lên GitHub Pages + build bản portable
└── .github/workflows/    # GitHub Actions build + deploy Pages
```

## Disclaimer

- Số liệu tĩnh (mốc roll substat, main stat theo cost, sonata set...) biên soạn theo **Wuthering
  Waves bản 3.5** và có thể lệch khi game cập nhật patch mới — xem ghi chú "UNVERIFIED" (nếu còn)
  trong `research/` và mã nguồn `app/src/data/`.
- Đây là dự án cá nhân/cộng đồng, **không liên kết, không được tài trợ hay xác nhận bởi Kuro Games**
  hay bất kỳ bên phát hành chính thức nào của Wuthering Waves. Mọi tên nhân vật, set Echo, hình ảnh
  liên quan (nếu có) thuộc bản quyền Kuro Games.
- Tool chỉ tính toán trên dữ liệu người dùng tự nhập/import — không đọc, không can thiệp vào game.
