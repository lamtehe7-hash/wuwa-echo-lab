# Data Verification — đối chiếu datamine (13/07/2026)

> Agent verify với repo `Arikatsu/WutheringWaves_Data` branch **3.5** (BinData JSON đã giải mã) +
> ChristopherKlay/WutheringInsight + game8/prydwen/fandom. Công thức main stat:
> `value = StandardProperty × GrowthMultiplier(level)/10000` (÷100 nếu %); +25 → hệ số 5.0.

## Kết luận (tất cả ĐÃ áp vào `app/src/data/` + `engine/score.ts`)

| # | Mục | Kết quả | Độ tin cậy |
|---|---|---|---|
| 1 | Basic Attack DMG% 8 mốc | 6.4→**11.6%** (KHÔNG phải 12.4 — nguồn wutheringwaves.gg/buffget nhầm với Energy Regen 12.4). Datamine: cả 4 DMG bonus (Basic/Heavy/Skill/Lib) đều `SubStandardProperty=750` giống ATK%/HP% | Cao |
| 2 | Flat ATK / DEF | ATK = **30/40/50/60** (không có 70); DEF = **40/50/60/70**; flat HP đủ 8 mốc 320–580 | Cao |
| 3 | Xác suất roll | 8 mốc %: **7.33/14.65/19.54/23.51/15.63/10.42/5.95/2.98%** — dùng CHUNG cho mọi substat % + flat HP. 4 mốc flat ATK/DEF: **18.52/44.45/26.38/10.36%**. Nguồn gốc: Kuro bị cơ quan Hàn Quốc buộc công bố. Lưu ý: bảng "Crit có phân phối riêng 23.33/8/3" trôi nổi trên mạng là sai | Cao (bảng), TB (nguồn gốc) |
| 4 | Main stat max +25 | Cost-3 DEF% **38.0**, cost-4 DEF% **41.8** (wuwa.uk ghi 41.5 là sai), Healing **26.4**, cost-1 HP% **22.8**. Main-2 cố định: cost-4 ATK 150, cost-3 ATK 100, cost-1 HP 2280. Chỉ có cost 1/3/4 (không có 2/5) | Cao |
| 5 | Luật loại trừ khi tune | Main stat **KHÔNG** loại trừ substat cùng loại ("double Crit Rate" tồn tại). Chỉ cấm: (a) main-1 trùng main-2; (b) substat trùng nhau trong 5 dòng. → đã sửa `remainingPool()` trong score.ts | TB-Cao |

## File datamine đã dùng (raw.githubusercontent.com/Arikatsu/WutheringWaves_Data/3.5/…)

`BinData/phantom/`: phantomsubproperty, phantommainproperty, phantommainpropitem, phantomgrowth,
phantomquality, phantomlevel · `BinData/property/propertyindex` · `BinData/filter_sort/filtermainproperty`.
Chưa giải mã được (blob nhị phân): phantomsubpropaction, phantomvicepolishconfig.
