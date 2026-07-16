// SINH TỰ ĐỘNG bằng `npx -y tsx scripts/gen-echo-economy.mts` (task 69/F5) — KHÔNG sửa tay.
// Nguồn: datamine Arikatsu/WutheringWaves_Data@3.5 (phantom/* + common_param) — recipe + verify:
// research/echo-economy.md. Số khoá cứng bằng data/echoEconomy.test.ts (tổng EXP, tỉ lệ bậc, feed +25→+22).

/** Bậc echo theo datamine (2★ tồn tại trong data nhưng app chỉ dùng 3–5) */
export type EchoRarity = 2 | 3 | 4 | 5

/** Level tối đa theo bậc (+10/+15/+20/+25) */
export const ECHO_MAX_LEVEL: Record<EchoRarity, number> = {
  2: 10,
  3: 15,
  4: 20,
  5: 25,
}

/** EXP TÍCH LUỸ từ +0 để đạt level i (index = level). VD 5★: [0, 400, 1000, …, 142600] */
export const ECHO_EXP_CUMULATIVE: Record<EchoRarity, readonly number[]> = {
  2: [0, 100, 250, 475, 750, 1100, 1525, 2025, 2625, 3325, 4125],
  3: [0, 160, 400, 760, 1200, 1760, 2440, 3240, 4200, 5320, 6600, 8040, 9680, 11520, 13560, 15840],
  4: [0, 320, 800, 1520, 2400, 3520, 4880, 6480, 8400, 10640, 13200, 16080, 19360, 23040, 27120, 31680, 36800, 42480, 48720, 55680, 63280],
  5: [0, 400, 1000, 1900, 3000, 4400, 6100, 8100, 10500, 13300, 16500, 20100, 24200, 28800, 33900, 39600, 46000, 53100, 60900, 69600, 79100, 89600, 101100, 113700, 127500, 142600],
}

/** Mốc level mở slot tune substat (mỗi mốc = 1 substat MỚI — datamine KHÔNG có mốc "boost" substat cũ) */
export const TUNE_SLOT_LEVELS: Record<EchoRarity, readonly number[]> = {
  2: [],
  3: [5, 10, 15],
  4: [5, 10, 15, 20],
  5: [5, 10, 15, 20, 25],
}

/** Số tuner (ĐÚNG BẬC echo) cho MỖI lần tune 1 slot */
export const TUNERS_PER_SLOT = 10

/** Shell Credit cho mỗi lần tune, theo bậc echo */
export const TUNE_CREDIT: Record<EchoRarity, number> = {
  2: 200,
  3: 500,
  4: 1000,
  5: 2000,
}

/** 4 ống EXP (Sealed Tube) — bậc 2★→5★ theo thứ tự. RESERVED: chưa có consumer trong app
 *  (giữ cho mở rộng F10 quy đổi "còn thiếu X EXP ≈ N ống"; giá trị khoá test — đừng xoá tuỳ tiện) */
export const TUBE_EXP: readonly number[] = [500, 1000, 2000, 5000]

/** Shell Credit tiêu khi đổ EXP: credit = EXP × hệ số này */
export const CREDIT_PER_EXP = 0.1

/** Hoàn EXP khi dùng echo đã luyện làm nguyên liệu (feed) */
export const EXP_RETURN_RATIO = 0.75

/** Hoàn tuner khi echo đã tune bị tiêu thụ/loại */
export const TUNER_RETURN_RATIO = 0.3

/** Transducer cho 1 lần reroll, index = SỐ SUBSTAT KHOÁ (0–4). Verify 16/07 (game8 578127):
 *  khoá ≤2 → 1, khoá 3 → 2, khoá 4 → 3; chỉ dùng trên 5★ FULL-TUNE; xem research/echo-economy.md §5 */
export const TRANSDUCER_COST_BY_LOCKED: readonly number[] = [1, 1, 1, 2, 3]
