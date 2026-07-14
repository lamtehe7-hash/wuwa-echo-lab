# Cơ chế "Main Echo" (Wuthering Waves) — research 15/07/2026

> Nguồn: game8 (Echo Skill / build pages), prydwen "Echoes Explained", Fandom wiki, mobalytics.
> Dùng cho tính năng "main echo đề cử" trong tool (`data/mainEchoes.ts`).

## Main echo là gì
- Người chơi đeo **5 echo** (tổng cost ≤ 12). Echo ở **slot ĐẦU** = "main echo": kỹ năng chủ động
  (**Echo Skill**) của nó là cái người chơi triển khai trong combat (biến hình/triệu hồi/đòn đánh).
  3 slot còn lại thứ tự không quan trọng.
- Main echo gần như luôn là **echo Cost-4** (class **Overlord** hoặc **Calamity**) vì chúng có Echo Skill
  mạnh + hệ số cao. (Cost 1 = Common, 3 = Elite, 4 = Overlord/Calamity.)
- Main echo **vẫn tính vào Sonata set** đang chạy (chiếm 1 trong 5 mảnh) → main echo phải THUỘC set đó.
  Vì vậy: 5pc set X → main echo là echo cost-4 có set X; cấu hình 3-2 → main echo thường thuộc set 2pc/3pc.

## Vì sao chọn main echo cụ thể (điểm mấu chốt)
- **Từ v2.0**: các bản **"Nightmare"** (và Calamity) cho **buff THỤ ĐỘNG chỉ cần slot làm main echo** —
  KHÔNG cần triệu hồi. Nên chọn main echo = chọn thẳng một buff.
- Mỗi echo cost-4 có buff khác nhau; guide chọn con có buff **khớp playstyle** nhân vật:
  - Ví dụ (Yangyang: Xuanling): **Thousand-Puppet Pavilion** cho "+Heavy Attack DMG & +Havoc DMG vô điều kiện,
    dạng summon nên không ngắt combo" → hợp DPS Heavy Attack havoc.
  - **Reminiscence: Threnodian - Leviathan**: passive +12% Havoc DMG + DoT Core of Collapse (mạnh hơn vs Havoc Bane).
  - Support/healer thường dùng echo BUFF đội: **Impermanence Heron / Nightmare: Impermanence Heron** (ATK buff),
    **Bell-Borne Geochelone** (khiên), **Fallacy of No Return** (hồi energy/phối hợp).
- Kết luận: main echo là 1 lựa chọn **theo nhân vật + theo set**, tách khỏi việc solver chấm substat.

## Tích hợp vào tool
- `data/mainEchoes.ts`: `Record<charId, {echo, set, reason}[]>` (ordered best-first; entry 1 = cho set BiS).
  Tên echo khớp `data/echoes.ts` (đã có đủ 42 echo cost-4) → tra icon qua `data/echoIndex.ts`.
- UI: tab Tối ưu hiện "Main echo đề cử: <icon> <tên>" cho nhân vật đang chọn (tooltip = reason);
  LoadoutView đánh dấu bộ solver có chứa main echo đề cử hay chưa.
- **KHÔNG đổi solver** (main echo là buff off-field/passive, ngoài mô hình substat) — chỉ hiển thị đề cử.

## Nguồn
- Echo Skill — Fandom: https://wutheringwaves.fandom.com/wiki/Echo_Skill
- Echoes Explained — Prydwen: https://www.prydwen.gg/wuthering-waves/guides/echoes-explained
- Echo Tier List (main-slot) — Game8: https://game8.co/games/Wuthering-Waves/archives/454727
- Best Echo Cost Configs — Game8: https://game8.co/games/Wuthering-Waves/archives/454121
- Ví dụ build page (Xuanling): https://game8.co/games/Wuthering-Waves/archives/605297
