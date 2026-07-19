# WuWa Echo Optimizer

<p align="right"><b>Tiếng Việt</b> · <a href="./README.en.md">English</a></p>

Tool web giúp người chơi **Wuthering Waves** trả lời nhanh một câu hỏi khó: *"trong kho Echo tôi
đang có, nên đeo con nào cho nhân vật nào?"* — thay vì đoán mò hoặc ngồi tính tay theo cảm tính.

Bạn nạp kho Echo (chụp màn hình cho OCR tự đọc, import JSON, hoặc nhập tay), tool chấm điểm từng
Echo theo nhân vật, rồi **tự giải ra bộ 5 Echo tối ưu** (đúng ràng buộc cost ≤ 12 + set bonus) và có
thể gán cho cả đội hình. Chạy **hoàn toàn phía client** — không có backend, không thu thập dữ liệu,
kho Echo lưu trong `localStorage` của trình duyệt.

[![Web demo](https://img.shields.io/badge/web-demo%20tr%E1%BB%B1c%20ti%E1%BA%BFp-2ea44f)](https://lamtehe7-hash.github.io/wuwa-echo-lab/)
[![Release](https://img.shields.io/github/v/release/lamtehe7-hash/wuwa-echo-lab)](https://github.com/lamtehe7-hash/wuwa-echo-lab/releases)
![Offline OCR](https://img.shields.io/badge/OCR-offline-informational)
![No backend](https://img.shields.io/badge/backend-kh%C3%B4ng-lightgrey)

- **🌐 Dùng ngay trên web:** <https://lamtehe7-hash.github.io/wuwa-echo-lab/>
- **📦 Bản portable Windows (không cần cài):** tải zip ở mục
  [Releases](https://github.com/lamtehe7-hash/wuwa-echo-lab/releases) → giải nén → chạy
  `WuWaEchoOptimizer.exe`. Trình duyệt tự mở app, chạy **offline hoàn toàn** (kể cả OCR).

> ⚠️ Dự án cộng đồng phi lợi nhuận, **không liên kết / được tài trợ bởi Kuro Games**. Xem
> [Disclaimer](#disclaimer) ở cuối.

---

## Mục lục

- [Vì sao cần tool này](#vì-sao-cần-tool-này)
- [Tính năng](#tính-năng)
- [Cách dùng (4 bước)](#cách-dùng-4-bước)
- [Bản portable Windows](#bản-portable-windows)
- [Chạy thử ở máy local](#chạy-thử-ở-máy-local)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Câu hỏi thường gặp](#câu-hỏi-thường-gặp)
- [Đóng góp](#đóng-góp)
- [Disclaimer](#disclaimer)

## Vì sao cần tool này

Trong Wuthering Waves, mỗi nhân vật đeo 5 Echo, mỗi Echo có 1 main stat + tối đa 5 substat roll ngẫu
nhiên, cộng thêm **set bonus** (2/3/5 mảnh) và ràng buộc **tổng cost ≤ 12**. Với một kho vài chục
Echo, số cách ghép bộ là rất lớn và mắt thường rất khó biết:

- Echo này **đáng tune tiếp** hay nên bỏ?
- Con nào nên để cho **DPS chính**, con nào nhường **sub-DPS / buffer**?
- Bộ đang đeo đã tối ưu chưa, hay còn bộ khác **nhỉnh hơn**?

Tool giải đúng những câu đó bằng cách chấm điểm có trọng số (theo archetype từng nhân vật) rồi chạy
solver tìm bộ tốt nhất — có xét cả **giá trị main stat thật** và **stat thật của set bonus** (Engine v2).

## Tính năng

- **Nhập kho Echo bằng tay** — form chọn sonata set, cost, main stat (theo mốc hợp lệ của cost) và
  substat (giá trị chọn từ đúng 8 mốc roll khả dĩ), tránh nhập sai số liệu.
- **Import bằng OCR từ ảnh / video** — chụp/quay panel Echo trong game rồi thả vào tool: tự nhận
  **tên Echo, sonata set (từ icon), cost, level, main stat và substat** (snap về mốc roll hợp lệ).
  OCR chạy **ngay trên máy** (tesseract.js, tài nguyên tự chứa — không gọi CDN, không upload ảnh đi
  đâu). Hỗ trợ **dán Ctrl+V** (Win+Shift+S xong dán thẳng) và **kéo-thả** ảnh.
- **Import từ scanner cộng đồng** — nhận file JSON của các scanner WuWa phổ biến (wuwa-ocr /
  wuwa.build, WuWa Inventory Kamera) lẫn format của chính app — tự nhận dạng format.
- **Xếp hạng Echo theo nhân vật** — chấm điểm weighted roll-efficiency theo bộ trọng số substat của
  từng nhân vật/archetype, có xét độ phù hợp main stat (3 mức: đúng ✓ / tạm dùng ～ / sai ✗). Kho có
  **tìm kiếm, lọc** (cost / set / main stat / tư vấn), **sắp xếp** (điểm / RV / level / mới thêm), xem
  dạng **bảng hoặc lưới card** kiểu in-game; bấm điểm để xem **breakdown đóng góp từng substat**.
- **Tìm bộ 5 Echo tối ưu cho 1 nhân vật** — solver tự sinh layout cost hợp lệ (tổng ≤ 12), tính cả
  set bonus (2/3/5 mảnh, có luật *"trùng tên Echo không đếm 2 lần"*) và chiết khấu ER thừa so với
  mục tiêu. Có thể **ép theo 1 sonata set** và xem **gợi ý main echo** theo guide cho từng nhân vật.
- **🧰 Bàn thử bộ thủ công** — kéo-thả (hoặc bấm) Echo từ kho vào 5 ô để tự ghép/chỉnh bộ theo ý;
  tool chấm lại điểm + damage ngay sau mỗi thao tác, xuất PNG hoặc đặt làm bộ hiện tại.
- **Ghi nhớ "bộ hiện tại" + so sánh trước–sau** — đặt bộ đang đeo của từng nhân vật; lần tối ưu sau
  hiển thị **chênh lệch điểm ▲/▼** so với bộ đã ghi nhớ, để biết có nên đổi hay không.
- **Gán Echo cho cả đội hình** — giải tuần tự theo thứ tự ưu tiên nhân vật, mỗi Echo chỉ 1 người
  dùng (khoá không cho nhân vật sau giành mất).
- **Quản kho hàng loạt** — khoá 🔒 echo quan trọng (chặn xoá), đánh dấu loại 🗑 (solver bỏ qua), chọn
  nhiều + xoá hàng loạt; mọi thao tác xoá đều **hoàn tác** được qua toast.
- **Nhiều kho (vault)** — tách kho cho main / alt account, chuyển nhanh trên header; mỗi kho có
  trọng số override + "bộ hiện tại" riêng.
- **Tư vấn tune tiếp** — với Echo main stat đúng nhưng substat còn dở, ước lượng kỳ vọng (EV) để
  quyết định có nên đổ tuner tiếp hay bỏ.
- **Tab Kế hoạch — farm/tune có lộ trình** — gom 5 panel: dọn kho theo luật 1-click (đánh dấu Bỏ,
  hoàn tác được), hàng đợi nâng cấp xếp theo ROI tuner (kèm ngân sách tuner đang có), tổng quan echo
  đã neo, ưu tiên farm set và backlog farm — biết nên đổ tài nguyên vào đâu tiếp theo.
- **Chỉnh trọng số theo ý riêng** — ghi đè bộ trọng số substat / mục tiêu ER cho từng nhân vật (có
  preset role: Crit DPS / Sub-DPS / Buffer / Healer… để áp nhanh), lưu riêng theo trình duyệt.
- **Đánh giá damage với chỉ số thật** — khai báo **vũ khí (DB 109 vũ khí)** + **base stat nhân vật**
  (39 nhân vật, đối chiếu datamine) + buff → mode Damage tối ưu theo crit thật (tích 1 + CR×CD,
  bracket %DMG đúng công thức WuWa) và bảng **breakdown chỉ số cuối theo nguồn**
  (Base | Vũ khí | Forte | Echo | Buff). Thiếu vũ khí/base thì tự rơi về so sánh tương đối.
- **Xuất build card PNG** — xuất bộ 5 (kèm điểm, set bonus, damage) thành 1 ảnh để chia sẻ.
- **Export / Import JSON** — sao lưu hoặc chuyển kho Echo giữa các thiết bị bằng file JSON.
- **Song ngữ Việt / English** — nút chuyển VI ⇄ EN ở góc trên.

## Cách dùng (4 bước)

> Mở app (web hoặc bản portable). Giao diện chia **5 tab**: Kho Echo · Tối ưu · Kế hoạch · Đội hình · Import.

**① Nạp kho Echo** → tab **Import**
- Cách nhanh nhất: mở panel chi tiết Echo trong game, chụp màn hình (Win+Shift+S), rồi **Ctrl+V dán**
  thẳng vào tool (hoặc kéo-thả nhiều ảnh). Bấm *Chạy OCR*, kiểm lại kết quả dạng card rồi *Lưu tất cả*.
- Hoặc nhập tay từng Echo ở tab **Kho Echo** (form bên trái), hoặc **Import JSON** nếu đã có backup.
- Chưa có gì để thử? Bấm **Dữ liệu demo** để nạp 10 Echo mẫu.

**② Tối ưu cho 1 nhân vật** → tab **Tối ưu**
- Chọn nhân vật (picker nhóm theo nguyên tố). Nếu muốn, bấm **⚖ trọng số** để chỉnh hoặc áp preset role.
- Bấm **🧩 Tìm bộ 5 tối ưu** → tool trả về bộ 5 Echo tốt nhất trong kho, kèm điểm, set bonus, ER.

**③ So sánh với bộ đang đeo** (tuỳ chọn) → vẫn ở tab **Tối ưu**
- Bấm **📌 Đặt làm bộ hiện tại** để ghi nhớ bộ đang đeo. Lần giải sau, kết quả sẽ hiện **▲/▼ chênh
  lệch điểm** so với bộ đã ghi nhớ — biết ngay có đáng đổi không.

**④ Gán cả đội hình** (tuỳ chọn) → tab **Đội hình**
- Thêm các nhân vật theo thứ tự ưu tiên, bấm **Gán echo cho cả đội** — mỗi Echo chỉ được xếp cho 1
  nhân vật, ưu tiên từ trên xuống.

> 💡 Xếp hạng trong tab **Kho Echo** luôn theo nhân vật đang chọn ở tab Tối ưu — dùng để soi nhanh
> con nào đáng giữ / đáng tune cho nhân vật đó. Khi kho đã ổn định, ghé tab **Kế hoạch** để dọn kho,
> xếp hàng đợi nâng cấp và xem nên farm set nào tiếp.

## Bản portable Windows

Dành cho người muốn dùng offline, không cần trình duyệt cài sẵn / mạng:

1. Tải `WuWaEchoOptimizer-win64-portable.zip` ở mục
   [Releases](https://github.com/lamtehe7-hash/wuwa-echo-lab/releases).
2. Giải nén, chạy **`WuWaEchoOptimizer.exe`** — trình duyệt mặc định tự mở app tại
   `http://localhost:36925`.
3. Giữ cửa sổ đen (server) mở trong lúc dùng; đóng nó để tắt app.

Lưu ý:
- Lần đầu Windows **SmartScreen** có thể cảnh báo (exe không ký số) → *More info → Run anyway*.
- Chạy **offline 100%** — OCR lẫn icon Echo đều tự chứa trong app (icon đã đóng gói sẵn, không gọi
  web khi dùng).
- Dữ liệu lưu theo địa chỉ `localhost:36925` — dùng **Export JSON** để sao lưu / chuyển máy.

## Chạy thử ở máy local

Yêu cầu: **Node.js 24+**.

```bash
cd app
npm install
npm run dev      # mở http://localhost:5173
```

Các lệnh khác:

```bash
npm run build    # build production (tsc -b && vite build)
npm test         # chạy unit test (vitest)
npm run preview  # serve bản build để kiểm thử
```

Chi tiết build & phát hành (GitHub Pages + đóng gói bản portable) xem [`DEPLOY.md`](./DEPLOY.md).

## Cấu trúc thư mục

```
WuWa Echo/
├── app/                  # Ứng dụng web (Vite + React 19 + TypeScript + Tailwind v4)
│   ├── src/
│   │   ├── data/         # Dữ liệu tĩnh: substat, main stat, sonata set, nhân vật, echo DB
│   │   ├── engine/       # Chấm điểm, solver bộ-5, gán roster, damage model
│   │   ├── components/   # UI: form nhập, card echo, bảng xếp hạng, roster, OCR import…
│   │   ├── ocr/          # OCR ảnh/video: parse text, tiền xử lý, nhận set từ icon
│   │   ├── i18n.tsx      # Lớp i18n tự viết (VI/EN)
│   │   ├── store.ts      # Lưu trữ localStorage (kho echo, override trọng số, bộ hiện tại)
│   │   └── types.ts      # Kiểu dữ liệu dùng chung
│   └── public/tesseract/ # Tài nguyên OCR tự chứa (worker/core + langdata)
├── portable/             # Đóng gói bản Windows portable (server nhúng + pkg → 1 file .exe)
├── research/             # Báo cáo nghiên cứu: cơ chế Echo, tool hiện có, cách chấm điểm, nguồn dữ liệu
├── PROPOSAL.md           # Đề xuất nền tảng, kiến trúc, lộ trình các phase
├── DEPLOY.md             # Hướng dẫn đưa app lên GitHub Pages + build bản portable
└── .github/workflows/    # GitHub Actions build + deploy Pages
```

## Câu hỏi thường gặp

**Tool có đọc / can thiệp vào game không?** Không. Tool chỉ tính toán trên dữ liệu bạn tự nhập hoặc
tự chụp màn hình đưa vào — hoàn toàn *passive*, không đọc bộ nhớ game, không tự điều khiển gì.

**Ảnh chụp có bị gửi lên server không?** Không. OCR chạy bằng WebAssembly ngay trong trình duyệt của
bạn; ảnh không rời khỏi máy. Tool cũng không có backend để nhận.

**Kho Echo lưu ở đâu?** Trong `localStorage` của trình duyệt (theo từng địa chỉ web). Xoá cache trình
duyệt sẽ mất — nhớ **Export JSON** để sao lưu.

**Số liệu có chính xác không?** Mốc roll substat, main stat theo cost, sonata set… biên soạn theo
**bản 3.5** và đã đối chiếu datamine (xem `research/data-verification.md`). Một số preset nhân vật 3.x
còn gắn nhãn `[UNVERIFIED]` (research web) — sẽ chỉnh khi có số liệu chắc chắn.

**OCR đọc sai thì sao?** Kết quả OCR luôn hiện dạng card để bạn **kiểm và sửa trước khi lưu**. Tool
snap giá trị substat về mốc roll gần nhất và cảnh báo khi có dòng đáng ngờ.

## Đóng góp

Mọi góp ý, báo lỗi hay đề xuất tính năng đều hoan nghênh — mở
[issue](https://github.com/lamtehe7-hash/wuwa-echo-lab/issues) hoặc pull request trên GitHub. Xem
kiến trúc & lộ trình đầy đủ ở [`PROPOSAL.md`](./PROPOSAL.md) và các báo cáo nền tảng ở
[`research/`](./research).

## Disclaimer

- Số liệu tĩnh (mốc roll substat, main stat theo cost, sonata set…) biên soạn theo **Wuthering Waves
  bản 3.5** và có thể lệch khi game cập nhật patch mới — xem ghi chú `UNVERIFIED` (nếu còn) trong
  `research/` và mã nguồn `app/src/data/`.
- Đây là dự án cá nhân / cộng đồng, **không liên kết, không được tài trợ hay xác nhận bởi Kuro Games**
  hay bất kỳ bên phát hành chính thức nào của Wuthering Waves. Mọi tên nhân vật, set Echo, hình ảnh
  liên quan thuộc bản quyền Kuro Games.
- App **đóng gói sẵn icon Echo/set** (nguồn ảnh: game8.co; tác phẩm gốc © Kuro Games) để chạy được
  offline — dùng phi lợi nhuận theo tinh thần fan project. Chủ sở hữu bản quyền muốn gỡ ảnh nào,
  mở issue là gỡ ngay.
- Tool chỉ tính toán trên dữ liệu người dùng tự nhập / import — không đọc, không can thiệp vào game.
</content>
</invoke>
