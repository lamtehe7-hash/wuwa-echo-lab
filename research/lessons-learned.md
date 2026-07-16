# Đúc kết quy trình & kinh nghiệm — WuWa Echo Optimizer (task 1→59, 13–16/07/2026)

*Tổng kết TẦNG PHƯƠNG PHÁP sau 58 task / ~10 release / 202 test. Gotcha kỹ thuật cụ thể → HANDOVER §5;
file này trả lời "quy trình nào LẶP LẠI đáng đóng gói, bài học nào mang sang project khác".*

## 1. Hành trình 4 giai đoạn

| Giai đoạn | Task | Nội dung | Sản phẩm phương pháp |
|---|---|---|---|
| Research → MVP | 1–14 | 4 doc research → PROPOSAL → engine thuần + UI + tests | Thói quen: research CÓ DOC trước khi code; engine tách thuần khỏi UI ngay từ đầu |
| Độ chính xác | 15–29 | OCR thật (video 19/19), Engine v2 stat thật, 2 vòng review lớn | Pattern adversarial review; benchmark trên DATA THẬT của user |
| UX công nghiệp hoá | 30–49 | UI-1→4 (12 điểm yếu H1–H12), PWA, portable, vendor icon | Nghiên cứu đối thủ → backlog xếp hạng → làm theo đợt; E2E 72 bước thành HỢP ĐỒNG |
| Data sâu + vòng 2 | 50–58 | Datamine 39 nhân vật/109 vũ khí, damage thật, bench, backlog vòng 2 | Recipe datamine + gate thủ công; workflow khảo sát 4-agent; calibrate ngưỡng trên data thật |

## 2. Đã đóng gói để "gõ tên là chạy" (task 59)

| Artifact | Ở đâu | Thay cho việc gì |
|---|---|---|
| `npm run verify` (`app/scripts/verify-all.mjs`) | commit vào repo | Nghi thức 4 bước gõ tay mỗi task: vitest → build → preview → e2e 72 (+ CDP task qua `-- <script>`) |
| `app/scripts/cdp-harness.mjs` | commit vào repo | ~70 dòng boilerplate CDP bị copy lại 12+ lần (launch/evaluate/clickByText/bodyHas/setInput/shot/done) |
| Skill `verify` | `.claude/skills/verify/` (local) | Checklist verify + quy tắc kèm (chuỗi e2e cấm đổi, fuzz solver, duyệt designer, calibrate ngưỡng) |
| Skill `wuwa-patch-update` | `.claude/skills/wuwa-patch-update/` (local) | Runbook patch game mới: gen-scripts + GATE thủ công + research subset-only |
| Workflow `wuwa-improve-research` | `.claude/workflows/` (local) | Vòng khảo sát cải tiến 4-agent (design/competitor/community/engine) — args subset + fail-safe THROW |
| (có sẵn từ 15/07) `wuwa-main-echoes` / `wuwa-mainecho-translate` / agent `wuwa-researcher` / `wuwa-ui-designer` | `.claude/` | Research build + dịch + hỏi lẻ + tư vấn UI |

**KHÔNG làm loop/cron**: nhịp dự án là sự-kiện (patch game ~6 tuần, yêu cầu user) chứ không phải thời-gian;
CI đã chạy test mỗi push; cron cloud không thấy file local. Poll web tìm patch mới = đốt token vô ích.

## 3. Bài học phương pháp (mang sang project khác được)

1. **Agent research phải bị TRÓI vào DB nội bộ**: mọi workflow research (main echo, preferred sets) chỉ cho
   trả tên có trong danh sách nhúng sẵn trong prompt + stage verify đối chiếu lại → output khớp data app
   100%, test integrity pass ngay. Research "tự do" cho tên ngoài DB là nguồn lỗi số 1.
2. **Adversarial verify bắt bug thật**: các vòng review 32/42-agent (finding → 2 verifier phản biện) tìm ra
   bug solver prune bound, SW cache-poison, OCR clamp regression — những thứ test thường không chạm.
   Đáng tiền cho code lõi; không đáng cho tweak UI.
3. **E2E string-contract 2 mặt**: rẻ (Node WebSocket + Edge, không playwright) và bắt regression tốt, nhưng
   biến chuỗi UI thành API — mọi thay đổi text phải tra danh sách cấm trước. Thiết kế feature mới phải
   "lách" nó có chủ ý (vd grade S–D phải nằm NGOÀI button điểm vì e2e match `/^\d+\.\d$/`).
4. **Đo bằng máy, không tin mắt**: mọi claim UI (layout không nhảy, Δ 1px, offline render, canvas không
   taint) đều verify bằng CDP measurement. Screenshot chỉ để duyệt thẩm mỹ (designer), không để verify logic.
5. **Calibrate ngưỡng trên phân bố thật TRƯỚC khi chốt**: 2 lần trong 1 ngày — GRADE_BANDS (ngưỡng lý thuyết
   của designer làm S gần như tuyệt chủng) và setFarmSummary (gain tuyệt đối "dương với cả 39 nhân vật" =
   metric thoái hoá, phải đổi sang top-3-per-char). Quy trình: script tsx 10 phút in phân bố → chốt → khoá test.
6. **Designer-agent dùng đúng cách**: 1 vòng GỘP cho cả đợt (12 quyết định/lần) thay vì hỏi lắt nhắt; cho nó
   evidence file:line; **được phép cãi khi nó sai** (Tidebreaking n=35 là data đúng, không phải bug) — nó
   giỏi consistency/a11y/e2e-risk, không giỏi số liệu.
7. **Data sinh tự động + gate thủ công TƯỜNG MINH**: gen-script THROW khi gặp prop/set lạ thay vì đoán;
   phần không tự động được (map id, passive vũ khí) ghi rõ là gate tay trong doc + khoá bằng test tổng-hằng-số.
   Nhờ vậy patch mới chỉ tốn công ở đúng chỗ cần người.
8. **Chi phí fan-out = số agent × tải/agent** (sự cố 78-agent/3.5M): mọi workflow đều parseArgs phòng thủ +
   fail-safe THROW; research web luôn subset; đã thành luật ở global CLAUDE.md và nhúng vào từng workflow file.
9. **Doc bàn giao cập nhật THEO MILESTONE** (không đợi cuối phiên): HANDOVER/PROJECT_TASK + archive tách riêng
   giữ phiên sau khởi động ~0 chi phí khảo sát; ghi cả quyết định "KHÔNG làm" (⛔ F13/F16) để khỏi đề xuất lại.

## 4. Nợ phương pháp còn lại

- Bảng chi phí Tuner/EXP chưa có (chặn nhóm F5–F10) — cần vòng datamine riêng, KHÔNG đoán số.
- Uptime set bonus trong sonata.ts vẫn heuristic (chưa có số combat thật).
- E2E chưa phủ Bàn thử bộ (mọi verify bench đang là CDP per-task) — cân nhắc thêm 3–5 bước vào e2e-ui.mjs
  một lần, chấp nhận nới hợp đồng chuỗi.
