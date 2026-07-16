# Đề xuất cải tiến vòng 2 — nghiên cứu 16/07/2026

*Nguồn: workflow 4 agent Sonnet (UX audit bằng `wuwa-ui-designer` đọc code thật + web research đối thủ + web research pain-point cộng đồng + engine feasibility đọc engine/data). Bối cảnh: toàn bộ lộ trình UI-1…UI-4 cũ (`ui-ux.md` H1–H12, nhóm A/B/C) đã làm xong; task 50–57 đã thêm substat 8 bậc, main echo hint, damage model thật, bàn thử bộ. File này là backlog vòng TIẾP THEO.*

**Chủ đề hội tụ** (nhiều agent độc lập cùng chỉ về):
1. **Cross-roster intelligence** — app chỉ chấm điểm theo 1 nhân vật đang xem; cả 3 agent (competitor/community/engine) đều đề xuất chiều ngược "echo này tốt nhất cho AI trong 39 nhân vật". Engine xác nhận chi phí gần 0 (~390k ops cho kho 1000 echo, <10ms).
2. **Kinh tế tài nguyên (Tuner/EXP)** — pain point cộng đồng số 1 (~30 tuner/ngày, echo cost-4 full tốn ~75 tuner; "lỗi phổ biến nhất là đổ exp vào mọi echo có vẻ ngon"). App chưa có bảng chi phí nào (grep 0 kết quả).
3. **Tab Tối ưu quá tải** — 8 khối xếp dọc, 3 panel (weights/build/bench) mở đồng thời được — tái hiện H1 bên trong 1 tab.
4. **Mobile** — Bàn thử (task 53/57) dùng HTML5 DnD, **không hoạt động trên trình duyệt cảm ứng**; đường bấm-để-thêm chỉ đặt vào ô trống đầu.

**Phát hiện phụ**: ghi chú "chưa hỗ trợ def-scaling" trong HANDOVER §5 **lỗi thời** — `deriveScaling`/`resolveContext`/`damageBreakdown` đã hỗ trợ `scaling:'def'` (Mornye defPct 0.7), có test `damage.test.ts:102-147`. Đã sửa HANDOVER 16/07.

---

## Bảng ưu tiên tổng (khuyến nghị của Claude)

| Ưu tiên | Mục | Nhóm | Effort | Vì sao |
|---|---|---|---|---|
| ⭐1 | F1 Best Owner + F2 Set Farm Priority | Cross-roster | M + S-M | Giá trị/công thấp nhất toàn bảng; engine sẵn 100%, 3 agent hội tụ |
| ⭐2 | U1 Segmented panel + U2 Bench touch | UI-5 lớn | M + M | Sửa 2 điểm nghẽn hiện hữu: tab Tối ưu quá tải + bench chết trên mobile |
| ⭐3 | Gói quick-win S (U4 U5 U8 U9 U10 U12 + F9 + F17) | UI-5 nhỏ + engine nhỏ | mỗi cái S | 8 mục ≤1 buổi/cái, làm gộp 1 đợt |
| 4 | F5→F6 Tuner economy (research data trước) | Tài nguyên | M-L | Pain point #1 cộng đồng nhưng cần vòng datamine chi phí EXP/Tuner trước |
| 5 | U6 Pinned overview + U7 pinnedBy badge | UI-5 IA | L + M | Mở màn "tổng quan roster" — nền cho mọi tính năng cross-roster về sau |
| 6 | F14 Lock per-char → F15 joint solver | Solver | M → L | Đúng nợ ghi trong HANDOVER ("roster CHƯA có lock per-echo") |
| — | F13 Export plan code, F16 multi-role | — | L | Rủi ro cao / data migration nặng — chưa nên |

---

## Nhóm F — Tính năng mới

### F1. Best Owner — "echo này tốt nhất cho: X, Y, Z" ⭐
Cột/badge trong RankingTable: chấm mỗi echo trên CẢ 39 profile, hiện top-3.
- **Nguồn**: Fribbels HSR "All characters: Max potential" ([relics-tab.md](https://github.com/fribbels/hsr-optimizer/blob/main/docs/guides/en/relics-tab.md)); cộng đồng "which echo to keep or trash".
- **Thiết kế (engine agent)**: `bestOwners(echo, profiles, overrides, topN=3)` = map qua `mergeProfile` (tôn trọng override user) → `scoreEcho` → lọc `fitLevel ≥ 0.6` → sort totalScore. Chi phí N×39×O(1) <10ms, **không cần worker** — chỉ cần `useMemo` RIÊNG keyed theo (echoes, overrides), TÁCH khỏi memo `rows` (đang phụ thuộc q/costF/sortKey) để gõ search không tính lại.
- **Đụng**: score.ts (hàm mới), App.tsx→RankingTable prop-drill `allProfiles/overrides`, UI cột/badge mới.
- **Effort**: M (1 ngày). **Rủi ro**: nhân vật cùng archetype ra điểm sát nhau → tie-break theo preferredSets khớp set echo. **UI đụng RankingTable → bàn wuwa-ui-designer trước khi code.**

### F2. Set Farming Priority — "set X nên farm cho ai" (không cần kho)
Đảo chiều F1: lặp `setTierScore(def, 5, profile, theoMax)` (solver.ts đã export) qua 34 set × 39 profile (~1300 phép). Bảng "Ưu tiên farm set" trả lời "nên farm domain nào tiếp".
- **Effort**: S-M (bản text-list là S). **Rủi ro**: preset chưa `verified` có thể lệch list — lọc/đánh dấu; chốt trọng số "nhiều nhân vật muốn" vs "1 nhân vật muốn nhiều nhất".

### F3. Upgrade priority queue toàn kho (sau F1)
1 danh sách "nên đổ exp vào echo nào trước" cắt ngang roster = F1 (best owner) × tiềm năng nâng cấp (F8), xếp theo **marginal gain so với bộ đang đeo** của nhân vật hưởng lợi. Nguồn: GO "Artifact Upgrader" ([issue #1186](https://github.com/frzyc/genshin-optimizer/issues/1186)). Effort M, làm SAU F1+F8.

### F4. Triage Queue — duyệt nhanh lô echo mới farm (sau F1)
Luồng "duyệt lần lượt → giữ/luyện/bỏ" cho cả lô sau OCR-import, ghép verdict (tuneAdvice có sẵn) + F1. Effort M, thuần UI trên nền F1.

### F5. Bảng chi phí Echo EXP + Tuner (data prerequisite) 
Repo **chưa có số liệu nào** (grep tuner/exp/Sealed Tube = 0). Engine chỉ là bảng tĩnh {level→EXP/Shell Credit tích luỹ theo rarity} + {rarity→tuner/lần} + hàm cộng dồn. Việc NẶNG là research: viết `gen-*` script từ datamine Arikatsu (cùng pattern gen-basestats) — **tách 2 bước: research số trước, code sau; không đoán số** (tiền lệ data-verification.md).

### F6. Tuner Budget Planner — ROI điểm/tuner toàn kho (sau F5)
"Hôm nay có 30 tuner, đổ vào echo nào lợi nhất toàn roster." Pain point #1 ([wuwa.uk farming routes](https://wuwa.uk/articles/echo-farming-routes)). Xếp hạng score-delta/tuner-cost tái dùng `tuneAdvice`+`scoreEcho`. Effort M sau khi có F5.

### F7. Reroll Advisor (Transducer) — EV closed-form
Data đủ 100%: PROB8/PROB4 + `expectedRoll` có sẵn. `evDelta = weightFor × (expectedRoll − current)/maxRoll` + P(cải thiện) = Σ prob các roll > current. Nút "Reroll?" trong ScoreBadge popover. Effort **S (nửa buổi)**.
- **⚠ Chặn trước khi làm**: phải **verify cơ chế reroll thật** — redraw từ phân phối gốc của CÙNG substat, hay có thể đổi LOẠI substat? `echo-system.md` chưa nói rõ; sai giả định = lừa người chơi đốt Transducer (item giới hạn/bản). PROB8/PROB4 vốn UNVERIFIED chính thức → gắn disclaimer.

### F8. Upgrade Advisor — điểm kỳ vọng tại +25 (Monte Carlo)
Engine có sẵn 1 nửa (`remainingPool`/`expectedMarginalPerSlot`) nhưng chỉ đúng cho 5★ (5 slot = 5 mốc tune). **3★/4★ có MAX_SUBSTATS 3/4 nhưng vẫn 5 mốc** → có mốc BOOST substat cũ +1 tier mà engine chưa mô hình. MC ~3-5k trial/echo (<20ms) trả EV + P10/P90. Effort M (1-2 ngày); phần khó là **xác nhận game-rule boost** (case substat đã max tier: coi như lãng phí trừ khi verify được). Nguồn pattern: Fribbels "Average/Max potential".

### F9. Recycle refund hint khi bulk-delete (quick win)
Feed echo = hoàn 75% EXP; xoá echo đã luyện = hoàn 30% tuner ([wiki Echo/Leveling](https://wutheringwaves.fandom.com/wiki/Echo/Leveling)). Hiện số EXP/tuner thu hồi ước tính ngay trong confirm bulk-delete sẵn có. Effort **S**. (Phần EXP chính xác cần F5; bản đầu có thể hiện % + số tuner.)

### F10. Build Cost Estimator — "build nhân vật X từ đầu tốn ~bao nhiêu ngày farm" (sau F5)
Dùng solver target BiS + `theoreticalMax`/`expectedMarginalPerSlot` suy số slot cần mở → quy đổi tuner/EXP/ngày. Effort S sau F5. Nguồn: thread "Echo inventory management: Long-term dead end" (gamefaqs).

### F11. Cleanup rule templates (học Echo Management Plan in-game 3.2+)
Rule one-click trên kho: "trash cost1/3 không crit", "giữ N tốt nhất mỗi set+cost"… tái dùng filter/bulk-action sẵn có; lưu rule ở store; export/import rule JSON/base64. Effort S-M. **Bắt buộc preview danh sách trước khi apply + loại trừ echo lock** — không auto âm thầm.

### F12. Farming Backlog Dashboard — "đủ rồi, dừng farm set X"
Tổng hợp tồn kho echo tiềm năng theo set vs nhu cầu roster → cảnh báo dừng farm. Thuần tổng hợp data sẵn có, effort S-M.

### F13. ❌ (chưa nên) Export mã Echo Management Plan cho game
Ý tưởng đẹp (cầu nối app→game duy nhất) nhưng **định dạng mã không công khai**, phải reverse-engineer + vỡ theo bản vá. Hạ xuống: hiện "luật gợi ý để tự cấu hình trong game" (text) — effort S, giá trị vẫn có.

### F14. Lock echo per-character (nợ ghi trong HANDOVER)
Thiết kế engine agent: (1) `solveBest5` nhận `pinned?: string[]` — đưa vào `kept` vô điều kiện, giảm `need[cost]` theo pinned TRƯỚC DFS, bỏ layout không chứa đủ; (2) roster.ts dựng `reservedForOthers` lọc khỏi pool nhân vật khác **trước** vòng lặp (kẻo người xử lý trước "cướp"). Persistence pattern `useEquipped`. Effort M (1 ngày).
- **⚠ Rủi ro chính**: prune bound (`bestRemaining`/`cutoff`) quên cộng giá trị pinned → solver âm thầm bỏ nghiệm tốt (không throw). Chạy lại fuzz solver.test.ts (quy tắc đã có trong HANDOVER). Validate: pinned vượt GROUP_MAX theo cost / 1 echo ghim 2 nhân vật → chặn ở UI.

### F15. Global joint solver toàn roster (sau F14)
Giải phân bổ đồng thời thay vì tuần tự (Fribbels "Character Priority" / relic stealing). Effort L, combinatorial — heuristic greedy+local-search, gợi ý **1 swap/lần** cho dễ hiểu. Chỉ làm khi F14 chạy ổn.

### F16. ❌ (làm dần, chưa ưu tiên) Multi-role preset per nhân vật
wuwa.uk có 5 preset role; app 1 weight-set/nhân vật. Đụng cấu trúc data lõi 39 nhân vật + mainEchoes theo role → migration nặng. Nếu làm: chỉ nhóm hybrid rõ ràng trước.

### F17. Grade chữ S–D trên ScoreBadge (quick win, cần chốt ngưỡng)
totalScore hiện **có thể vượt 100** (mainScore cộng thêm không cap). Cần mốc mới `theoreticalMaxTotal(profile, cost)` = 100 + max main-stat khả dĩ của cost đó (tái dùng `weightFor/refScale`) → grade = totalScore/max×100 → band S/A/B/C/D. Effort S. **Ngưỡng cắt là quyết định sản phẩm** (vd ≥90/75/60/40) — chốt với user + designer; tránh xung đột thông điệp với verdict 4 mức sẵn có.

---

## Nhóm U — UI/UX đợt UI-5 (audit `wuwa-ui-designer`, evidence file:line đã kiểm)

### Lớn (M-L)
**U1. Gom Trọng số/Chỉ số nền/Bàn thử → 1 panel mutually-exclusive** ⭐ — App.tsx:89-91 có 3 state độc lập `showWeights/showBuild/showBench`, mở cùng lúc = 8 khối xếp dọc (App.tsx:310-454). Gộp thành `activeTool: 'weights'|'build'|'bench'|null`, render segmented (pattern objective toggle App.tsx:334-342). GIỮ label nút cũ (không vỡ e2e — đã kiểm: bước open-weights chỉ click text). Thống nhất màu: sky = panel đang mở, amber = riêng "đã tuỳ chỉnh". Câu hỏi mở: Bench có được mở KÈM 1 panel khác không (user hay vừa chỉnh Build vừa thử)? Effort M.

**U2. Bench: chạm "chọn-rồi-đặt/đổi chỗ" cho mobile** ⭐ — HTML5 DnD (BenchPanel.tsx:163-213, :299-309) **không chạy trên trình duyệt cảm ứng**; bấm card chỉ addFirstEmpty (không thay/đổi chỗ ô đã có echo). Thêm `selectedStashId`: bấm card kho = chọn (ring sáng), bấm slot bất kỳ = đặt/thay, bấm lại = bỏ chọn; desktop giữ kéo-thả. i18n mới: `bench.selectedTip`, `bench.tapHint`; aria-pressed. E2E hiện KHÔNG test bench → nên thêm 1 bước cùng đợt. Effort M.

**U6. "Tổng quan nhân vật đã ghim" đầu tab Đội hình** — `equipped` lưu cho MỌI nhân vật (store.ts:282) nhưng chỉ hiện 1 người/lần. Khối mới: mọi nhân vật có bộ ghim → chấm nguyên tố + điểm (scoreLoadout, công thức có sẵn App.tsx:149-154) + badge stale + nút "Mở trong Tối ưu". Chỉ tính nhân vật ĐÃ ghim nên rẻ. Chèn TRƯỚC phần "Gán cả đội" (giữ nguyên phần đó → e2e an toàn). i18n: `dashboard.*` (4 key, agent đã soạn VI/EN). Effort L. Câu hỏi IA: đặt trong Đội hình hay tách? → chốt với user.

**U7. Badge "Đang dùng bởi X" trên EchoCard kho + bench-stash** — đảo `equipped` thành `pinnedBy: Map<echoId,charId>` (useMemo App.tsx), truyền xuống RankingTable/BenchPanel, ghép qua `footer` ReactNode sẵn có (EchoCard.tsx:51 — không sửa EchoCard). Ngăn kéo nhầm echo BiS của main sang thử nhân vật phụ. i18n: `inv.pinnedBy`. Effort M.

**U11. Bench: dòng delta "so bộ tối ưu"** — khi bench + kết quả solver cùng mở, thêm delta thứ 2 (bench.total − loadout.total) cạnh delta-vs-equipped (BenchPanel.tsx:114-129). i18n: `bench.vsSolver`. Effort M, low-med impact — làm cuối.

### Nhỏ (S — gói quick-win 1 đợt)
**U3.** RosterPanel bọc mỗi thành viên trong `<details>` mặc định open + nút Mở/Thu tất cả (RosterPanel.tsx:120-133; pattern StatBreakdown.tsx:33; đã kiểm bodyHas dùng textContent nên `<details>` đóng KHÔNG vỡ e2e). i18n `roster.expandAll/collapseAll`.
**U4.** Info-popover BẤM ĐƯỢC cho toggle Điểm/Damage (App.tsx:334-342 đang title= hover-only — tái phạm H6 trên tính năng mới task 55; mẫu ScoreBadge.tsx:62-110). i18n `app.objectiveScoreDesc/DamageDesc/InfoLabel` (đã soạn). Cân nhắc trích `InfoTip` component tái dùng.
**U5.** EchoEditModal a11y: Escape đóng + role=dialog/aria-modal + aria-label nút ✕ + focus-trap (EchoEditModal.tsx:47-55; mẫu đúng CharacterPicker.tsx:30-42). i18n `echoEdit.close`.
**U8.** Toolbar Tối ưu tách 2 hàng cố định; <640px CTA "Tìm bộ 5" full-width hàng riêng (App.tsx:312-361 — H12 tái phát vì thêm 2 nút). Thuần CSS, giữ text (e2e click-solve an toàn).
**U9.** Pill "Mới" cạnh nút Build/Bench/toggle Damage, tắt khi mở lần đầu (localStorage `wuwa-seen:*`). i18n `common.newBadge`; aria-hidden. Đã kiểm clickByText dùng includes → không vỡ e2e.
**U10.** CharacterPicker thêm ô search (39 nhân vật, sẽ tăng; CharacterPicker.tsx:59-98). i18n `picker.search/noResults`, autofocus, giữ Escape.
**U12.** Header: ẩn chữ "GitHub" <640px giữ icon + `aria-label` (App.tsx:243-251) — nhỏ nhất, có thể làm luôn không cần bàn designer.

---

## Lộ trình gợi ý

| Đợt | Nội dung | Ghi chú |
|---|---|---|
| UI-5a (1 buổi) | Gói S: U4 U5 U8 U9 U10 U12 + F17 (grade S-D) + F9 (refund hint) | F17 cần chốt ngưỡng trước; U-items bàn nhanh designer 1 vòng gộp |
| UI-5b | U1 segmented panel + U2 bench touch + U3 roster collapse | Sửa 2 điểm nghẽn lớn nhất hiện hữu |
| F-đợt 1 | F1 Best Owner → F2 Set Farm Priority | Giá trị/công tốt nhất; nền cho F3/F4 |
| F-đợt 2 | F5 research chi phí EXP/Tuner (datamine) → F6 Tuner Planner, F8 Upgrade Advisor, F10 | F7 Reroll Advisor chỉ làm sau khi verify cơ chế Transducer |
| UI-5c | U6 pinned overview + U7 pinnedBy badge (+F12 backlog dashboard) | Mở IA "tổng quan roster" |
| F-đợt 3 | F14 lock per-char → F15 joint solver | Chạy lại fuzz solver.test.ts bắt buộc |
| Không làm | F13 export plan code (format đóng), F16 multi-role (migration nặng), leaderboard/backend | như triết lý cũ |

**Quy trình đã cam kết**: mọi mục U + F1/F17 (đụng UI) → bàn `wuwa-ui-designer` ở bước thiết kế trước khi code; đổi solver → fuzz regression; số liệu mới → verify datamine + ghi `data-verification.md`.

---

## Trạng thái (cập nhật 16/07 chiều — sau khi user chốt)

- ✅ **XONG (task 58)**: F1, F2, F9, F17, U1, U2, U4, U5, U8, U9, U10, U12 — chi tiết PROJECT_TASK task 58.
- 📌 **ĐỂ DÀNH (user chốt)**: nhóm kinh tế Tuner/EXP — F5 (research datamine bảng chi phí TRƯỚC, không đoán số)
  → F6 Tuner Planner, F8 Upgrade Advisor, F10 Build Cost; F7 Reroll Advisor phải verify cơ chế Transducer trước.
- ⛔ **TRÁNH LÀM (user chốt — đừng đề xuất lại)**: F13 export mã Echo Management Plan, F16 multi-role preset.
- Backlog mở còn lại (chưa quyết): U3 U6 U7 U11, F3 F4 F11 F12 F14 F15.
