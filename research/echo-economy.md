# Kinh tế Echo — bảng chi phí EXP / Tuner / Shell Credit (task 69 / F5)

> Research 16/07/2026, datamine `Arikatsu/WutheringWaves_Data@3.5` (cùng nguồn đã verify 100% base stat).
> Data sinh tự động: `app/src/data/echoEconomy.ts` (script `app/scripts/gen-echo-economy.mts`).
> Số khoá bằng test `app/src/data/echoEconomy.test.ts`. **Không đoán số** — mọi giá trị có nguồn dưới đây.

## 1. Nguồn datamine (BinData/…)

| File | Cho biết |
|---|---|
| `phantom/phantomlevel.json` | EXP **tăng thêm** để đạt level L, theo `GroupId` (4 nhóm) |
| `phantom/phantomquality.json` | `LevelLimit` max +10/15/20/25 theo bậc 2–5★; `SlotUnlockLevel` mốc tune; `IdentifyCost` 10 tuner đúng-bậc/slot (item 36000011–14 = tuner Q2–Q5); `IdentifyCoin` credit/lần tune |
| `phantom/phantomexpitem.json` | 4 ống EXP (Sealed Tube, item 36000001–04 = Q2–Q5): 500/1000/2000/5000 |
| `phantom/phantomvicepolishconfig.json` | Transducer reroll theo slot: 1/1/1/2/3 (item 36000016) — **cơ chế chưa verify, xem §5** |
| `common_param/commonparam.json` | `PhantomLevelUpCoinCost`=100‰ → **0.1 credit/EXP**; `PhantomExpReturnRatio`=750‰ → **hoàn 75% EXP**; `PhantomIdentifyReturnRatio`=300‰ → **hoàn 30% tuner**; `PhantomTotalCost`=12 (khớp COST_CAP engine) |

Decode: `BinData` = base64 → LE uint32 (4 byte) hoặc int64 (8 byte); ratio đơn vị ‰ (per-mille).
Join nhóm level ↔ bậc: qua `LevelLimit` (nhóm có max Level = LevelLimit của bậc) — KHÔNG hardcode GroupId.

## 2. Bảng đã chốt

**EXP tích luỹ +0 → max** (curve tăng nghiêm ngặt, xem echoEconomy.ts cho từng level):

| Bậc | Max | Tổng EXP | Tỉ lệ vs 5★ (từng level, exact) |
|---|---|---|---|
| 5★ | +25 | **142.600** | 1.0 |
| 4★ | +20 | 63.280 | ×0.8 |
| 3★ | +15 | 15.840 | ×0.4 |
| 2★ | +10 | 4.125 | ×0.25 |

Mốc trung gian 5★ hay dùng: +5=4.400 · +10=16.500 · +15=39.600 · +20=79.100 · +25=142.600.

**Tune substat**: mở slot tại level bội 5 (`SlotUnlockLevel`); mỗi slot = **10 tuner đúng bậc echo** + credit
(200/500/1000/2000 theo 2–5★). Số mốc = số substat tối đa: 2★ **không tune được** (0 slot), 3★=3, 4★=4, 5★=5.
→ **Datamine BÁC giả thuyết proposal F8** ("3★/4★ vẫn 5 mốc, có mốc boost substat cũ"): KHÔNG có mốc boost,
mỗi mốc là 1 substat MỚI. Engine `remainingPool`/`expectedMarginalPerSlot` đúng cho mọi bậc theo số slot còn lại.

**Shell Credit**: đổ EXP tốn `0.1 × EXP` credit (vd full 5★ = 14.260); tune 5★ = 2.000/lần × 5 = 10.000.

**Hoàn tài nguyên (feed echo đã luyện làm nguyên liệu)**: hoàn **75% EXP** đã đổ + **30% tuner** đã dùng.
(Task 58/F9 dùng ước lượng "~75%/~30%" — nay có số datamine chính xác, cùng giá trị.)

## 3. Verify chéo (độc lập với datamine)

- **Ống EXP 500/1000/2000/5000** — khớp game8 archives/458113 (Basic/Medium/Advanced/Premium Sealed Tube). ✅
- **Feed +25 → +22**: game8 nói "using a level 25 Echo results in only 22 levels gained".
  Toán: 75% × 142.600 = 106.950; cumulative +22 = 101.100 ≤ 106.950 < 113.700 = +23 → đúng **+22**.
  → xác nhận chéo ĐỒNG THỜI curve + ratio 75%. ✅ (khoá bằng test)
- **0.1 credit/EXP · 2000 credit/tune (5★) · 75%/30%** — khớp trích dẫn wiki fandom (Echo/Leveling) qua search
  snippet; trang wiki chặn bot (403/402) nên không quote trực tiếp được. ✅ (datamine là nguồn chính)
- `PhantomTotalCost`=12 khớp COST_CAP đã dùng từ đầu project. ✅

## 4. Item ID tra cứu (iteminfo.json — tên là key textmap, bậc từ `QualityId`)

| ID | Là gì | Bậc |
|---|---|---|
| 36000001–04 | Ống EXP (Sealed Tube) 500/1000/2000/5000 | Q2/Q3/Q4/Q5 |
| 36000011–14 | Tuner | Q2/Q3/Q4/Q5 |
| 36000015 | Item "polish" trong phantomrarity (Calabash/Data Bank — không dùng cho app) | Q5 |
| 36000016 | Transducer (reroll substat, 3.1+) | Q5 |

## 5. Cơ chế Transducer (F7) — VERIFY 16/07 (game8 archives/578127 + công bố 3.1)

- Reroll đổi **LOẠI** substat ("Adjust a Substat of an Echo to a random stat, excluding locked Substats") —
  KHÔNG phải chỉ giá trị như proposal giả định ban đầu.
- Chỉ dùng trên **5★ đã full-tune** (5/5 substat). Mỗi lần dùng reroll **1 substat**, chọn NGẪU NHIÊN trong
  các substat KHÔNG khoá → muốn nhắm đúng 1 slot phải khoá 4 slot còn lại.
- **Cost theo số substat khoá** (khớp `phantomvicepolishconfig` PropCount): khoá ≤2 → 1 · khoá 3 → 2 ·
  khoá 4 → 3 Transducer (`TRANSDUCER_COST_BY_LOCKED`).
- Sau khi thấy kết quả được **chọn giữ cũ hoặc nhận mới** (option miễn phí về stat — nhưng KHÔNG hoàn
  Transducer khi giữ cũ) → EV advisor = E[max(mới − cũ, 0)] trên mỗi Transducer.
- Nguồn cung khan hiếm: shop 30 Afterglow Coral ×2 lần đầu/version, sau đó 60, cap 99/version.
- **Giả định còn lại (ghi rõ khi làm F7)**: pool loại khi redraw = 13 − loại các substat ĐANG KHOÁ
  (theo câu chữ chính thức; có thể ra lại đúng loại cũ). Chưa có nguồn nói kết quả có được phép trùng
  loại substat không-khoá khác hay không (game rule "không trùng loại" nghiêng về KHÔNG trùng).
  PROB8/PROB4 vẫn là số cộng đồng [UNVERIFIED chính thức] → advisor phải kèm disclaimer.

## 5b. Ngoài phạm vi datamine
- **Income farm/ngày (Tacet Field mỗi 60 waveplate)**: số live-ops (đổi theo level/patch, không có trong datamine
  tĩnh). wuwa.uk ghi "1–2 Premium Tuner/run" — KHÔNG tin cậy (mâu thuẫn kinh nghiệm chơi phổ biến ~10–12).
  → F10 thiết kế income là **tham số user chỉnh được**, không hardcode.
- **Web-research income 17/07/2026 (agent, ~25 lượt search/fetch)** — vẫn CHƯA đủ điền default:
  - Chắc chắn (nhiều nguồn khớp): waveplate cap **240/ngày** (hồi 1/6ph, game8 454091) · Tacet Field
    **60 WP/run** → tối đa **4 run/ngày** (game8 457265+456510, buffget, samurai-gamers; số "40 WP" ở vài
    trang là NHẦM với Forgery Challenge) · giá trị tube 500/1000/2000/5000 (khớp datamine §2).
  - Tin được mức trung bình (single-source game8, số cụ thể): **Weekly Activity** (605757) mốc 4000đ =
    8 Premium + 12 Advanced tube = 64.000 EXP/tuần; mốc 6000đ = **50 Premium Tuner** + 50k credit/tuần
    → ~7,1 tuner + ~9,1k EXP/ngày. **Whimpering Wastes Chasm** (498614) full-clear/chu kỳ ~28 ngày =
    **150 Tuner + 50.000 EXP** → ~5,4 tuner + ~1,8k EXP/ngày.
  - ~~GAP: drop per-run Tacet Field~~ → **CHỐT 17/07 đêm bằng ĐO THẬT (4 screenshot user, 4 run liên
    tiếp, counter waveplate 180→120→60→0)**: mỗi run = **20 Premium Tuner + 3 Premium tube + 4 Advanced
    tube (= 23.000 EXP) + 5.250 credit** — drop CỐ ĐỊNH cả 4 run (echo rơi kèm thì ngẫu nhiên). Số này
    BÁC hẳn "1–2 tuner/run" của wuwa.uk, khớp kinh nghiệm cộng đồng.
  - **Default F10 đã cắm (BuildCostEstimator, task 78)**: `tunersPerDay = 87` (4×20 + 50/7 weekly) ·
    `expPerDay = 101.000` (4×23.000 + 64.000/7 weekly). KHÔNG cộng Whimpering Wastes (skill-gate, chu kỳ
    ~28 ngày — user tự cộng nếu clear đều). User nhập giá trị khác → override qua localStorage; xoá
    trống → app tôn trọng, không đè default lại. Độ tin: Tacet per-run HIGH (đo thật), weekly MEDIUM
    (single-source game8 605757). Đổi số khi patch đổi drop table — đo lại 1 run là đủ.
- `phantombreach.json` (60000xxx + 2400/3600/4800/6000 credit): bảng breach per-phantom (legacy/echo skill) —
  không liên quan chi phí build, bỏ.
- `phantomlevelconsume.json` (exp 10/50/100/300, credit ×5): giá trị feed echo CHƯA luyện làm fodder theo bậc —
  ghi nhận, chưa cần cho F6/F8/F10 (planner dùng ống EXP).

## 6. Regen khi có bản vá

```
cd app
npx -y tsx scripts/gen-echo-economy.mts [--branch 3.6]
npm test  # test khoá sẽ FAIL nếu Kuro đổi bảng — đối chiếu lại doc này trước khi sửa test
```
