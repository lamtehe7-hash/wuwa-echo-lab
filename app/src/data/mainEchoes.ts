// Main echo đề cử theo nhân vật — echo COST-4 đặt ở slot ĐẦU (Echo Skill triển khai được;
// bản Nightmare/Calamity cho buff THỤ ĐỘNG chỉ cần slot). Xem cơ chế: research/main-echo.md.
//
// Nguồn: web-research 15/07/2026 (game8 build pages / prydwen / wuthering.gg qua 2 workflow research→verify
// 39 nhân vật, ~156 agent Sonnet, cross-check + sửa reason sai + drop entry bịa). Mỗi nhân vật liệt kê ĐỦ
// các cấu hình guide đề cử (BiS + alt 5pc + 3-2 split + budget/F2P + support). Tên echo KHỚP data/echoes.ts
// (tra icon qua data/echoIndex.ts); set = id trong data/sonata.ts — main echo phải THUỘC set đang chạy.
// Ordered best-first: entry 0 = BiS. reason viết EN (như nhãn card) + reasonVi bản dịch tiếng Việt
// (giữ thuật ngữ game bằng EN — UI chọn theo ngôn ngữ). Chỉnh tự do theo bản game mới.

export interface MainEchoRec {
  /** Tên echo cost-4 (khớp data/echoes.ts) */
  echo: string
  /** Set mà main echo này đi kèm (id trong data/sonata.ts) */
  set: string
  /** Cấu hình + buff của Echo Skill/passive + vì sao hợp nhân vật (EN — nhãn card) */
  reason: string
  /** Bản dịch tiếng Việt của reason (giữ thuật ngữ game bằng EN). UI chọn theo ngôn ngữ. */
  reasonVi: string
}

export const MAIN_ECHOES: Record<string, MainEchoRec[]> = {
  camellya: [
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `BiS (5pc Havoc Eclipse). Unconditional passive +12% Havoc & +12% Basic Attack DMG + better energy gen; top pick in current guides.`, reasonVi: `BiS (5pc Havoc Eclipse). Passive vô điều kiện +12% Havoc & +12% Basic Attack DMG + hồi năng lượng tốt hơn; lựa chọn hàng đầu trong các guide hiện tại.` },
    { echo: 'Crownless', set: 'havoc-eclipse', reason: `Same 5pc; echo skill hits harder + on-slot +12% Havoc/+12% Skill DMG, but needs a jump-cancel to keep field time. For no-Nightmare / max damage.`, reasonVi: `Cùng 5pc; echo skill đánh mạnh hơn + on-slot +12% Havoc/+12% Skill DMG, nhưng cần jump-cancel để giữ thời gian trên sân. Cho bản không Nightmare / sát thương tối đa.` },
    { echo: 'Dreamless', set: 'havoc-eclipse', reason: `Same 5pc, clean-rotation option — no cancel timing needed; trades some damage for simpler execution.`, reasonVi: `Cùng 5pc, lựa chọn rotation gọn — không cần canh timing cancel; đánh đổi chút sát thương để thực hiện đơn giản hơn.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Budget/F2P alt set: 5pc Lingering Tunes stacks ATK% for sustained basic-attacking; instant-cast slots right after her burst.`, reasonVi: `Set bản thay thế tiết kiệm/F2P: 5pc Lingering Tunes cộng dồn ATK% để duy trì basic-attack; instant-cast lắp khít ngay sau burst của cô.` },
  ],
  carlotta: [
    { echo: 'Sentry Construct', set: 'frosty-resolve', reason: `BiS (5pc Frosty Resolve; also a 3-2 Frosty Resolve + Lingering Tunes split). Main slot +12% Glacio & +12% Skill DMG; set stacks Glacio/Skill DMG.`, reasonVi: `BiS (5pc Frosty Resolve; cũng có bản 3-2 Frosty Resolve + Lingering Tunes split). Main slot +12% Glacio & +12% Skill DMG; set cộng dồn Glacio/Skill DMG.` },
    { echo: 'Nightmare: Lampylumen Myriad', set: 'frosty-resolve', reason: `Alt in the same Frosty Resolve set: strong AoE skill + Glacio/Skill DMG; on par with Sentry in AoE, slightly behind on single-target.`, reasonVi: `Bản thay thế trong cùng set Frosty Resolve: skill AoE mạnh + Glacio/Skill DMG; ngang Sentry ở AoE, kém hơn chút ở đơn mục tiêu.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Budget/early: Freezing Frost 5pc ~+40% Glacio DMG, easier upkeep; the only cost-4 carrying this set.`, reasonVi: `Tiết kiệm/giai đoạn đầu: Freezing Frost 5pc ~+40% Glacio DMG, duy trì dễ hơn; cost-4 duy nhất mang set này.` },
  ],
  jinhsi: [
    { echo: 'Jué', set: 'celestial-light', reason: `BiS (5pc Celestial Light). Summon nuke grants Skill DMG + stacks Incandescence at zero field-time cost.`, reasonVi: `BiS (5pc Celestial Light). Đòn triệu hồi nuke cấp Skill DMG + cộng dồn Incandescence mà không tốn thời gian trên sân.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `2nd-best full 5pc: Lingering Tunes ATK-scaling + AoE explosion/ATK buff; slightly under Celestial Light but a valid non-Jué build.`, reasonVi: `Full 5pc tốt thứ 2: Lingering Tunes scaling theo ATK + nổ AoE/buff ATK; kém Celestial Light chút nhưng là build không-Jué hợp lệ.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Budget swap for the Celestial Light set when Jué is unfarmed; costs field time, weaker buff, same 5pc bonus.`, reasonVi: `Bản swap tiết kiệm cho set Celestial Light khi chưa farm được Jué; tốn thời gian trên sân, buff yếu hơn, cùng bonus 5pc.` },
  ],
  changli: [
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `BiS. Unconditional +12% Fusion & +12% Resonance Skill DMG; 5pc Molten Rift adds +30% Fusion DMG after a Heavy Attack triggers a Fusion reaction.`, reasonVi: `BiS. Vô điều kiện +12% Fusion & +12% Resonance Skill DMG; 5pc Molten Rift thêm +30% Fusion DMG sau khi Heavy Attack kích hoạt một phản ứng Fusion.` },
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Budget/transition to the Nightmare variant; same Molten Rift 5pc (a 3-2 Molten Rift + Moonlit Clouds split works pre-full-set).`, reasonVi: `Tiết kiệm/chuyển tiếp lên bản Nightmare; cùng Molten Rift 5pc (bản 3-2 Molten Rift + Moonlit Clouds split dùng được trước khi đủ full-set).` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Support build when Changli buffs a hypercarry: Moonlit Clouds 5pc +22.5% ATK to next on Outro + Heron's swap-in DMG buff & energy.`, reasonVi: `Build support khi Changli buff một hypercarry: Moonlit Clouds 5pc +22.5% ATK cho Resonator vào sân kế tiếp khi Outro + buff DMG khi swap-in & năng lượng của Heron.` },
  ],
  'xiangli-yao': [
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `BiS. Unconditional +12% Electro & +12% Resonance Liberation DMG (no cast); pairs 5pc Void Thunder. Fits his Liberation profile.`, reasonVi: `BiS. Vô điều kiện +12% Electro & +12% Resonance Liberation DMG (không cần cast); ghép 5pc Void Thunder. Hợp với profile Liberation của anh.` },
    { echo: 'Tempest Mephis', set: 'void-thunder', reason: `Practical pick (some guides rank above): fast 2-hit skill weaves in, claw hit gives conditional +12% Electro & +12% Heavy DMG; same set.`, reasonVi: `Lựa chọn thực dụng (một số guide xếp trên): skill 2-hit nhanh chèn vào, đòn claw cho có điều kiện +12% Electro & +12% Heavy DMG; cùng set.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `Same Liberation buff as its Nightmare copy but conditional (after final hit); slower 6-hit animation — near toss-up decided by substats.`, reasonVi: `Cùng buff Liberation như bản Nightmare nhưng có điều kiện (sau đòn cuối); animation 6-hit chậm hơn — gần như ngang nhau, quyết định bởi substat.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Budget/F2P Lingering Tunes set (~3% weaker than Void Thunder): stacking ATK% without pausing + feeds Outro Skill DMG.`, reasonVi: `Set Lingering Tunes tiết kiệm/F2P (~3% yếu hơn Void Thunder): cộng dồn ATK% mà không phải dừng + nuôi Outro Skill DMG.` },
  ],
  calcharo: [
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `BiS. Passive +12% Electro & +12% Liberation DMG (no cast); fits his Liberation Forte. Run 5pc Void Thunder.`, reasonVi: `BiS. Passive +12% Electro & +12% Liberation DMG (không cần cast); hợp với Liberation Forte của anh. Chạy 5pc Void Thunder.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `F2P/budget alt: same +12%/+12% but needs an Echo Skill cast (final hit) for uptime. Same 5pc Void Thunder.`, reasonVi: `Bản thay thế F2P/tiết kiệm: cùng +12%/+12% nhưng cần cast Echo Skill (đòn cuối) để giữ uptime. Cùng 5pc Void Thunder.` },
    { echo: 'Nightmare: Tempest Mephis', set: 'void-thunder', reason: `Budget/Skill-focused: unconditional +12% Electro & +12% Resonance Skill DMG; used in 2pc Void Thunder + 2pc ATK budget mixes.`, reasonVi: `Tiết kiệm/tập trung Skill: vô điều kiện +12% Electro & +12% Resonance Skill DMG; dùng trong các mix tiết kiệm 2pc Void Thunder + 2pc ATK.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Alt: 5pc Lingering Tunes +60% Outro Skill DMG (+stacking ATK%); Mech's skill counts as Outro Skill DMG — swap-heavy teams.`, reasonVi: `Bản thay thế: 5pc Lingering Tunes +60% Outro Skill DMG (+cộng dồn ATK%); skill của Mech được tính là Outro Skill DMG — team swap nhiều.` },
  ],
  jiyan: [
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `BiS (5pc Sierra Gale +10%/+30% Aero after Intro). He fully leverages the set; Nightmare substat favors his Heavy/Aero scaling.`, reasonVi: `BiS (5pc Sierra Gale +10%/+30% Aero khi Intro). Anh tận dụng tối đa set; substat Nightmare thiên về scaling Heavy/Aero của anh.` },
    { echo: 'Feilian Beringal', set: 'sierra-gale', reason: `Same 5pc set with the non-Nightmare echo; pre-Rinascita substitute, swap to Nightmare once farmed.`, reasonVi: `Cùng set 5pc nhưng với echo bản không phải Nightmare; bản thay thế giai đoạn trước Rinascita, đổi sang Nightmare khi đã farm được.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `2pc half of a Sierra Gale(2)/Lingering Tunes(2) budget split (up to +30% ATK); temporary — his kit can't use its Electro.`, reasonVi: `Một nửa 2pc của kiểu chia tiết kiệm Sierra Gale(2)/Lingering Tunes(2) (lên tới +30% ATK); tạm thời — kit của anh không dùng được Electro của nó.` },
  ],
  encore: [
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `BiS (5pc Molten Rift: Fusion DMG buff after Resonance Skill, easy uptime); echo adds Fusion + Basic ATK DMG. A 3-2 Molten Rift + Moonlit Clouds is a transition.`, reasonVi: `BiS (5pc Molten Rift: buff Fusion DMG sau Resonance Skill, uptime dễ); echo cộng thêm Fusion + Basic ATK DMG. Kiểu 3-2 Molten Rift + Moonlit Clouds là bản chuyển tiếp.` },
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Budget/F2P substitute before the Nightmare boss; same Molten Rift 5pc + Fusion/Basic ATK DMG skill.`, reasonVi: `Bản thay thế tiết kiệm/F2P trước khi có boss Nightmare; cùng Molten Rift 5pc + skill Fusion/Basic ATK DMG.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Quickswap-support variant: Lingering Tunes 5pc ATK% + +60% Outro Skill DMG if Encore enables another Fusion DPS.`, reasonVi: `Biến thể quickswap-support: Lingering Tunes 5pc ATK% + +60% Outro Skill DMG nếu Encore hỗ trợ một Fusion DPS khác.` },
  ],
  zani: [
    { echo: 'Nightmare: Mourning Aix', set: 'eternal-radiance', reason: `BiS cost-4 for Eternal Radiance (true BiS is 3-cost Capitaneus). Passive +10% Spectro; set gives +20% CR on Frazzle + Spectro DMG at 10 stacks — her Frazzle kit.`, reasonVi: `cost-4 BiS cho Eternal Radiance (BiS thực sự là Capitaneus cost-3). Passive +10% Spectro; set cho +20% CR khi Frazzle + Spectro DMG tại 10 stack — kit Frazzle của cô.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Budget/early alt: Celestial Light 2pc +10% / 5pc +30% Spectro after Intro; flat, no CR, lower ceiling than Eternal Radiance.`, reasonVi: `Bản thay thế tiết kiệm/giai đoạn đầu: Celestial Light 2pc +10% / 5pc +30% Spectro khi Intro; cố định, không có CR, trần thấp hơn Eternal Radiance.` },
  ],
  cartethyia: [
    { echo: 'Reminiscence: Fleurdelys', set: 'windward-pilgrimage', reason: `BiS (5pc). +30% Aero & +10% CR on Aero-Eroded targets (near-permanent); Fleurdelys adds ~20% Aero DMG exclusive to Cartethyia/Aero Rover.`, reasonVi: `BiS (5pc). +30% Aero & +10% CR lên mục tiêu dính Aero Erosion (gần như vĩnh viễn); Fleurdelys cộng thêm ~20% Aero DMG riêng cho Cartethyia/Aero Rover.` },
    { echo: 'Reminiscence: Fleurdelys', set: 'gusts-of-welkin', reason: `5pc alt when Windward pieces aren't farmed: applies Erosion + buffs team Aero DMG; same Fleurdelys echo, slightly lower personal ceiling.`, reasonVi: `Bản thay thế 5pc khi chưa farm được mảnh Windward: gây Erosion + buff Aero DMG cho cả đội; cùng echo Fleurdelys, trần cá nhân thấp hơn chút.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Budget/early (pre-Rinascita) before Fleurdelys/Windward: grants Aero DMG via the echo's own skill.`, reasonVi: `Tiết kiệm/giai đoạn đầu (trước Rinascita), trước khi có Fleurdelys/Windward: cấp Aero DMG qua chính skill của echo.` },
  ],
  lupa: [
    { echo: 'Lioness of Glory', set: 'flaming-clawprint', reason: `BiS. On-slot +12% Fusion & +12% Resonance Liberation DMG; set gives team +15% Fusion on Liberation + +20% Liberation DMG to caster. Top pick.`, reasonVi: `BiS. Trên slot +12% Fusion & +12% Resonance Liberation DMG; set cho cả đội +15% Fusion khi Liberation + +20% Liberation DMG cho người thi triển. Lựa chọn hàng đầu.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Best pre-Lioness alt: +12% Fusion & +12% Skill DMG; Molten Rift +30% Fusion on Liberation proc. Swap up once Lioness drops.`, reasonVi: `Bản thay thế tốt nhất trước khi có Lioness: +12% Fusion & +12% Skill DMG; Molten Rift +30% Fusion khi proc Liberation. Nâng cấp khi Lioness rơi ra.` },
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Very-early budget copy of the Nightmare version (weaker passive). Upgrade path: Inferno → Nightmare: Inferno → Lioness of Glory.`, reasonVi: `Bản tiết kiệm giai đoạn rất sớm của phiên bản Nightmare (passive yếu hơn). Lộ trình nâng cấp: Inferno → Nightmare: Inferno → Lioness of Glory.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Funnel-support alt for mono-Fusion comps: buffs the incoming Resonator on Outro, trading Lupa's damage for a teammate's burst.`, reasonVi: `Bản thay thế funnel-support cho đội mono-Fusion: buff Resonator vào sân kế tiếp khi Outro, đánh đổi sát thương của Lupa lấy burst của đồng đội.` },
  ],
  yinlin: [
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `True BiS (sub-DPS/buffer): swap-cancel before Outro gives incoming DPS +12% DMG on top of Moonlit Clouds' +22.5% ATK, + big energy restore.`, reasonVi: `BiS thực sự (sub-DPS/buffer): swap-cancel trước Outro cho DPS vào sân kế tiếp +12% DMG cộng thêm +22.5% ATK của Moonlit Clouds, + hồi năng lượng lớn.` },
    { echo: 'Nightmare: Tempest Mephis', set: 'empyrean-anthem', reason: `Game8 #2: passive +12% Electro & +12% Skill DMG + Empyrean Anthem's Coordinated-Attack buff (depends on her Punishment Marks).`, reasonVi: `Game8 #2: passive +12% Electro & +12% Skill DMG + buff Coordinated Attack của Empyrean Anthem (phụ thuộc vào Punishment Marks của cô).` },
    { echo: 'Nightmare: Tempest Mephis', set: 'void-thunder', reason: `Hypercarry/no-off-field alt: 5pc Void Thunder amps her own Electro (up to +30%) + the Nightmare passive's flat +12%/+12%.`, reasonVi: `Bản thay thế hypercarry/không có nhân vật ngoài sân: 5pc Void Thunder tăng Electro của chính cô (lên tới +30%) + +12%/+12% cố định từ passive Nightmare.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `Budget/early for the Void Thunder DPS build: skill combo grants +12% Electro & +12% Liberation DMG for 15s (no CR bonus).`, reasonVi: `Tiết kiệm/giai đoạn đầu cho build DPS Void Thunder: combo skill cấp +12% Electro & +12% Liberation DMG trong 15s (không có bonus CR).` },
  ],
  zhezhi: [
    { echo: 'Nightmare: Lampylumen Myriad', set: 'empyrean-anthem', reason: `BiS (sub-DPS/support). Summon (no rotation cost) + stacks Glacio & Coordinated Attack DMG atop the 5pc's +80% CA — best when her echoes/weapon are endgame.`, reasonVi: `BiS (sub-DPS/support). Đòn triệu hồi (không tốn rotation) + cộng dồn Glacio & Coordinated Attack DMG chồng lên +80% CA của 5pc — tốt nhất khi echo/vũ khí của cô đạt endgame.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Best alt when investment isn't endgame or a support role is wanted; Outro ATK buff, Moonlit Clouds leans into her buffing.`, reasonVi: `Bản thay thế tốt nhất khi đầu tư chưa đạt endgame hoặc muốn vai trò support; buff ATK khi Outro, Moonlit Clouds nghiêng về khả năng buff của cô.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Full offensive/off-field-DPS config: Freezing Frost 5pc stacks +10% Glacio x3 on attacks, maximizing her own damage.`, reasonVi: `Cấu hình tấn công toàn diện/DPS ngoài sân: Freezing Frost 5pc cộng dồn +10% Glacio x3 khi tấn công, tối đa hóa sát thương của chính cô.` },
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `Budget alt in the same set when no Nightmare: Lampylumen — unconditional ~+40% Coordinated Attack DMG passive.`, reasonVi: `Bản thay thế tiết kiệm trong cùng set khi không có Nightmare: Lampylumen — passive vô điều kiện ~+40% Coordinated Attack DMG.` },
  ],
  roccia: [
    { echo: 'Nightmare: Impermanence Heron', set: 'midnight-veil', reason: `BiS. Fixed +12% Havoc & +12% Heavy Attack DMG (both core stats); Midnight Veil 5pc adds +15% Havoc to next on Outro.`, reasonVi: `BiS. Cố định +12% Havoc & +12% Heavy Attack DMG (cả hai đều là chỉ số cốt lõi); Midnight Veil 5pc thêm +15% Havoc cho Resonator vào sân kế tiếp khi Outro.` },
    { echo: 'Lorelei', set: 'midnight-veil', reason: `Alt, same 5pc: +12% Havoc & +12% Basic Attack DMG; some guides rate it equal/ahead for DPS-leaning Roccia.`, reasonVi: `Bản thay thế, cùng 5pc: +12% Havoc & +12% Basic Attack DMG; một số guide đánh giá ngang bằng/nhỉnh hơn cho Roccia thiên về DPS.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Budget/non-Havoc-team: 10 energy on hit + Moonlit Clouds 5pc +22.5% ATK to next — when Roccia supports a non-Havoc DPS.`, reasonVi: `Bản tiết kiệm/team không Havoc: 10 năng lượng khi trúng đòn + Moonlit Clouds 5pc +22.5% ATK cho Resonator vào sân kế tiếp — khi Roccia hỗ trợ một DPS không phải Havoc.` },
  ],
  cantarella: [
    { echo: 'Lorelei', set: 'midnight-veil', reason: `5pc BiS (Havoc sub-DPS/buffer). Midnight Veil boosts Havoc/Basic ATK + gives next Resonator Havoc DMG on Outro, stacking her Havoc scaling.`, reasonVi: `5pc BiS (Havoc sub-DPS/buffer). Midnight Veil tăng Havoc/Basic ATK + trao Havoc DMG cho Resonator vào sân kế tiếp khi Outro, cộng dồn cho khả năng scale Havoc của cô.` },
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `5pc alt for Coordinated-Attack teams (~+80% CA, needs ~70% CR); Hecate is the standard main echo for this set.`, reasonVi: `5pc bản thay thế cho team Coordinated Attack (~+80% CA, cần ~70% CR); Hecate là main echo tiêu chuẩn cho set này.` },
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `5pc alt for Havoc-focused/main-DPS Cantarella teams; passive stacks Havoc DMG on Basic/Heavy Attacks.`, reasonVi: `5pc bản thay thế cho team Cantarella thiên Havoc/main-DPS; passive cộng dồn Havoc DMG khi dùng Basic/Heavy Attack.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `5pc budget/backup without Midnight Veil: buffs next Resonator's ATK/DMG after Outro.`, reasonVi: `5pc bản tiết kiệm/dự phòng khi không có Midnight Veil: buff ATK/DMG cho Resonator vào sân kế tiếp sau Outro.` },
  ],
  brant: [
    { echo: 'Dragon of Dirge', set: 'tidebreaking-courage', reason: `True BiS. 5pc Tidebreaking Courage = +30% team All-Attribute DMG once ER hits 250%; Dragon adds Fusion + Basic ATK DMG on-slot.`, reasonVi: `BiS thực thụ. 5pc Tidebreaking Courage = +30% All-Attribute DMG cho cả đội khi ER đạt 250%; Dragon thêm Fusion + Basic ATK DMG on-slot.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Budget/no-ER alt: Molten Rift 5pc Fusion buff after Skill when you can't hit 250% ER; echo also builds energy.`, reasonVi: `Bản thay thế tiết kiệm/không ER: Molten Rift 5pc buff Fusion sau Skill khi bạn không đạt được 250% ER; echo cũng hồi năng lượng.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Support/sub-DPS: Moonlit Clouds ER + +22.5% ATK to next on Outro (Bell-Borne Geochelone is an interchangeable main echo here).`, reasonVi: `Support/sub-DPS: Moonlit Clouds ER + +22.5% ATK cho Resonator vào sân kế tiếp khi Outro (Bell-Borne Geochelone là main echo có thể thay thế qua lại ở đây).` },
  ],
  sanhua: [
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `BiS (sub-DPS/buffer). +12% DMG to next character after Liberation, stacking Moonlit Clouds' Outro ATK buff — her quick-swap style.`, reasonVi: `BiS (sub-DPS/buffer). +12% DMG cho nhân vật kế tiếp sau Liberation, cộng dồn với buff ATK khi Outro của Moonlit Clouds — hợp lối chơi quick-swap của cô.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Alt/damage or budget: Freezing Frost 5pc +10% Glacio x3 for personal damage (also a 2pc Freezing Frost + 2pc Lingering Tunes split).`, reasonVi: `Bản thay thế/thiên sát thương hoặc tiết kiệm: Freezing Frost 5pc +10% Glacio x3 cho sát thương cá nhân (cũng có thể chia 2pc Freezing Frost + 2pc Lingering Tunes).` },
  ],
  mortefi: [
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `BiS ceiling: Empyrean Anthem Coordinated Attack DMG + crit-triggered ATK buff — but needs his S4 (longer Liberation) to use comfortably.`, reasonVi: `BiS trần cao nhất: Empyrean Anthem Coordinated Attack DMG + buff ATK kích hoạt bởi crit — nhưng cần S4 của anh (Liberation dài hơn) để dùng thoải mái.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Default/practical BiS for non-S4 Mortefi: Moonlit Clouds +10% ER + +22.5% ATK to next on Outro, stacking Heron's DMG buff.`, reasonVi: `BiS mặc định/thực dụng cho Mortefi không S4: Moonlit Clouds +10% ER + +22.5% ATK cho Resonator vào sân kế tiếp khi Outro, cộng dồn với buff DMG của Heron.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Budget hybrid (2pc Moonlit Clouds + 2pc Molten Rift): keeps ER for frequent Liberations + adds Fusion DMG.`, reasonVi: `Bản lai tiết kiệm (2pc Moonlit Clouds + 2pc Molten Rift): giữ ER để dùng Liberation thường xuyên + thêm Fusion DMG.` },
  ],
  iuno: [
    { echo: 'Lady of the Sea', set: 'crown-of-valor', reason: `BiS. Passive +12% Liberation & +12% Aero DMG; run 3pc Crown of Valor + 2pc Aero set, 4-3-3-1-1 CRIT.`, reasonVi: `BiS. Passive +12% Liberation & +12% Aero DMG; chạy 3pc Crown of Valor + 2pc set Aero, 4-3-3-1-1 CRIT.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `5pc alt: trades personal DMG for a bigger ATK/DMG buff to next on Outro + ER; pre-Crown or pure-support Iuno.`, reasonVi: `Bản thay thế 5pc: đánh đổi DMG cá nhân để lấy buff ATK/DMG lớn hơn cho Resonator vào sân kế tiếp khi Outro + ER; Iuno giai đoạn trước Crown hoặc thuần hỗ trợ.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Budget/alt building full Sierra Gale: unconditional +12% Aero & +12% Heavy ATK; summon fits the rotation.`, reasonVi: `Bản thay thế tiết kiệm/khi xây full Sierra Gale: +12% Aero & +12% Heavy ATK vô điều kiện; đòn triệu hồi hợp với vòng xoay.` },
  ],
  shorekeeper: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `BiS. HP-scaling skill + 10% ER + team ATK buff; Rejuvenating Glow 5pc = +15% team ATK for 30s on heal. Target ~250% ER.`, reasonVi: `BiS. Skill scaling theo HP + 10% ER + buff ATK cho cả đội; Rejuvenating Glow 5pc = +15% ATK cho cả đội trong 30s khi hồi máu. Nhắm mục tiêu ~250% ER.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Alt for switch-tech comps (e.g. Jinhsi): ATK/ER support; swap before Outro gives incoming +12% DMG + Moonlit Clouds 5pc ATK.`, reasonVi: `Bản thay thế cho các đội switch-tech (vd Jinhsi): hỗ trợ ATK/ER; swap trước Outro cho Resonator vào sân kế tiếp +12% DMG + ATK từ Moonlit Clouds 5pc.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Budget/early swap-in without a good Fallacy: keeps Rejuvenating Glow's Healing Bonus + team ATK, smaller shield/shorter buff.`, reasonVi: `Bản thay thế tiết kiệm/giai đoạn đầu khi chưa có Fallacy tốt: giữ Healing Bonus + ATK cả đội của Rejuvenating Glow, khiên nhỏ hơn/buff ngắn hơn.` },
  ],
  verina: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `BiS. 5pc Rejuvenating Glow (+10% Healing, team +15% ATK on heal) + Fallacy's self +10% ER & team +10% ATK for 20s.`, reasonVi: `BiS. 5pc Rejuvenating Glow (+10% Healing, +15% ATK cho cả đội khi hồi máu) + Fallacy tự thân +10% ER & +10% ATK cho cả đội trong 20s.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Budget alt in the same set: Glacio DEF-scaling skill + team shield (50% DR, 3 hits) + 10% team DMG. Standard fallback.`, reasonVi: `Bản thay thế tiết kiệm trong cùng set: skill Glacio scaling theo DEF + khiên cho cả đội (50% DR, 3 đòn) + 10% DMG cả đội. Phương án dự phòng tiêu chuẩn.` },
    { echo: 'Bell-Borne Geochelone', set: 'moonlit-clouds', reason: `Hybrid support+dmg (Moonlit Clouds): 2pc +10% ER, 5pc +22.5% ATK to next on Outro — when ER is a bottleneck.`, reasonVi: `Lai hỗ trợ+sát thương (Moonlit Clouds): 2pc +10% ER, 5pc +22.5% ATK cho Resonator vào sân kế tiếp khi Outro — khi ER là nút thắt.` },
  ],
  baizhi: [
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `BiS. Team shield (50% DR) + 10% team DMG; Rejuvenating Glow 2pc +10% Healing, 5pc +15% team ATK on heal — near-constant uptime.`, reasonVi: `BiS. Khiên cho cả đội (50% DR) + 10% DMG cả đội; Rejuvenating Glow 2pc +10% Healing, 5pc +15% ATK cả đội khi hồi máu — uptime gần như liên tục.` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Alt, same set: Spectro skill + +10% team ATK for 20s (longer window than the shield) — better damage if you own a good copy.`, reasonVi: `Bản thay thế, cùng set: skill Spectro + +10% ATK cả đội trong 20s (cửa sổ dài hơn khiên) — sát thương tốt hơn nếu bạn sở hữu một bản tốt.` },
    { echo: 'Bell-Borne Geochelone', set: 'moonlit-clouds', reason: `Secondary 5pc alt: trades ATK-on-heal for 10% ER + Outro ATK buff — faster Liberation, weaker overall than Rejuvenating Glow.`, reasonVi: `Bản thay thế 5pc phụ: đánh đổi ATK-khi-hồi-máu lấy 10% ER + buff ATK khi Outro — Liberation nhanh hơn, tổng thể yếu hơn Rejuvenating Glow.` },
  ],
  lynae: [
    { echo: 'Hyvatia', set: 'pact-of-neonlight-leap', reason: `BiS (buffer/sub-DPS). Pact 5pc gives incoming up to +30% ATK on Outro; Hyvatia adds +10% all-type DMG to that Resonator's Intro.`, reasonVi: `BiS (buffer/sub-DPS). Pact 5pc cho Resonator vào sân kế tiếp tối đa +30% ATK khi Outro; Hyvatia thêm +10% All-Type DMG cho Intro của Resonator đó.` },
    { echo: 'Hyvatia', set: 'rite-of-gilded-revelation', reason: `Personal-DPS build: 5pc stacks Spectro on Basic + +40% Basic ATK DMG on Liberation; Hyvatia's Intro buff still applies.`, reasonVi: `Build DPS cá nhân: 5pc cộng dồn Spectro khi Basic + +40% Basic ATK DMG khi Liberation; buff Intro của Hyvatia vẫn áp dụng.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Budget/F2P while farming Pact: 2pc ER keeps her ~120% target, 5pc +22.5% ATK to next — preserves her buffer role.`, reasonVi: `Bản thay thế tiết kiệm/F2P trong lúc farm Pact: 2pc ER giữ cô ở mục tiêu ~120%, 5pc +22.5% ATK cho Resonator vào sân kế tiếp — giữ vai trò buffer của cô.` },
  ],
  aemeath: [
    { echo: 'Sigillum', set: 'trailblazing-star', reason: `BiS. Sigillum tailor-made for her (+25% Liberation DMG); Trailblazing Star 5pc adds +20% CR & +20% Fusion on Tune Rupture → ~100% CR.`, reasonVi: `BiS. Sigillum thiết kế riêng cho cô (+25% Liberation DMG); Trailblazing Star 5pc thêm +20% CR & +20% Fusion khi Tune Rupture → ~100% CR.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Best pre-farm alt (5pc Molten Rift: +30-40% Fusion after Skill); recommended stand-in while building Trailblazing Star.`, reasonVi: `Bản thay thế tốt nhất giai đoạn đầu (5pc Molten Rift: +30-40% Fusion sau Skill); phương án thay thế được đề cử trong lúc xây Trailblazing Star.` },
    { echo: 'Lioness of Glory', set: 'flaming-clawprint', reason: `Secondary alt: Flaming Clawprint boosts Fusion & Liberation DMG; usable if already built, ranked below Molten Rift for her.`, reasonVi: `Bản thay thế phụ: Flaming Clawprint tăng Fusion & Liberation DMG; dùng được nếu đã xây sẵn, xếp dưới Molten Rift với cô.` },
  ],
  'luuk-herssen': [
    { echo: 'Hyvatia', set: 'rite-of-gilded-revelation', reason: `DB-valid cost-4 for the 5pc set (guides' true top is cost-3 Twin Nova, excluded). Set gives up to +40% Basic + +40% Spectro; Hyvatia itself only buffs the next character.`, reasonVi: `cost-4 hợp lệ trong DB cho set 5pc (lựa chọn hàng đầu thật sự của các guide là cost-3 Twin Nova, đã bị loại). Set cho tối đa +40% Basic + +40% Spectro; bản thân Hyvatia chỉ buff nhân vật kế tiếp.` },
    { echo: 'Jué', set: 'celestial-light', reason: `Budget alt while farming Rite: Celestial Light 5pc +40% Spectro DMG, synergizes with his Spectro basic kit. Standard backup.`, reasonVi: `Bản thay thế tiết kiệm khi đang farm Rite: Celestial Light 5pc +40% Spectro DMG, cộng hưởng với bộ kỹ năng Spectro cơ bản của cậu ấy. Phương án dự phòng tiêu chuẩn.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Same Celestial Light alt: quick double-strike buffs Spectro + Liberation DMG; game8's 2nd cost-4 choice for this slot.`, reasonVi: `Cùng bản thay thế Celestial Light: đòn đánh kép nhanh buff Spectro + Liberation DMG; lựa chọn cost-4 thứ 2 của game8 cho slot này.` },
  ],
  hiyuki: [
    { echo: 'Reminiscence: Threnodian - Voidborne Construct', set: 'wishes-of-quiet-snowfall', reason: `BiS. Passive +12% Glacio & +12% Liberation DMG (both she scales); summon slots cleanly + maxes Snowfall's CR proc on Glacio Chafe.`, reasonVi: `BiS. Passive +12% Glacio & +12% Liberation DMG (cả hai đều là chỉ số cô ấy scale theo); đòn triệu hồi vào slot gọn gàng + tối đa hóa proc CR của Snowfall khi Glacio Chafe.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Budget/transition while farming Snowfall: 3 strikes buff Glacio & Skill DMG for 15s; weaker than BiS.`, reasonVi: `Bản tiết kiệm/chuyển tiếp khi đang farm Snowfall: 3 đòn đánh buff Glacio & Skill DMG trong 15s; yếu hơn BiS.` },
  ],
  lucy: [
    { echo: 'Reminiscence: Nightmare Adam Smasher', set: 'shadow-of-shattered-dreams', reason: `BiS. 1pc collab set = +35% Heavy ATK DMG on Hack-Shifting + +15% CR on equip; frees 4 slots for a 1+2+2 split of Spectro-DMG 2pc sets.`, reasonVi: `BiS. Set collab 1pc = +35% Heavy ATK DMG khi Hack-Shifting + +15% CR khi trang bị; giải phóng 4 slot cho kiểu chia 1+2+2 các set 2pc Spectro-DMG.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Budget alt without the collab echo: clean 5pc Celestial Light; Mourning Aix gives +12% Spectro & +12% Liberation DMG. Guides' 2nd best.`, reasonVi: `Bản thay thế tiết kiệm khi không có echo collab: 5pc Celestial Light gọn gàng; Mourning Aix cho +12% Spectro & +12% Liberation DMG. Lựa chọn tốt thứ 2 của các guide.` },
  ],
  rebecca: [
    { echo: 'Reminiscence: Nightmare Adam Smasher', set: 'shadow-of-shattered-dreams', reason: `BiS. 1pc collab + 2pc Void Thunder + 2pc Reel triple-sonata; +15% CR flat + skill becomes a 16-hit Electro barrage; set +35% CR/Basic/Heavy on Hack-Shifting.`, reasonVi: `BiS. Bộ ba sonata 1pc collab + 2pc Void Thunder + 2pc Reel; +15% CR cố định + skill biến thành loạt bắn Electro 16 đòn; set +35% CR/Basic/Heavy khi Hack-Shifting.` },
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `F2P/budget without the collab echo: straightforward 5pc Void Thunder for consistent Electro DMG.`, reasonVi: `F2P/tiết kiệm khi không có echo collab: 5pc Void Thunder đơn giản cho Electro DMG ổn định.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Quickswap/buffer alt: trades her DPS for team buffing (self +10% ER, +22.5% ATK to incoming on Outro).`, reasonVi: `Bản thay thế quickswap/buffer: đánh đổi DPS của cô ấy lấy buff cho cả đội (bản thân +10% ER, +22.5% ATK cho Resonator vào sân kế tiếp khi Outro).` },
  ],
  suisui: [
    { echo: 'Thousand-Puppet Pavilion', set: 'song-of-feathered-trace', reason: `BiS. Song of Feathered Trace 5pc converts her 250%+ ER into up to +25% team ATK on Glacio Chafe (newer echo Forbidden Bastion not in DB).`, reasonVi: `BiS. Song of Feathered Trace 5pc chuyển 250%+ ER của cô ấy thành tối đa +25% ATK cho cả đội khi Glacio Chafe (echo mới hơn Forbidden Bastion chưa có trong DB).` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Alt when Song pieces aren't rolled: Rejuvenating Glow ~+15% team ATK on heal, pairs her healing kit.`, reasonVi: `Bản thay thế khi chưa roll được các mảnh Song: Rejuvenating Glow ~+15% ATK cho cả đội khi hồi máu, kết hợp với bộ kỹ năng hồi máu của cô ấy.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Quickswap alt: Moonlit Clouds Outro +22.5% ATK to next for 15s — rapid-swap comps.`, reasonVi: `Bản thay thế quickswap: Moonlit Clouds khi Outro +22.5% ATK cho Resonator vào sân kế tiếp trong 15s — các đội hình đổi nhân vật nhanh.` },
  ],
  denia: [
    { echo: 'Reminiscence: Denia', set: 'chromatic-foam', reason: `BiS (Fusion Burst). Her signature echo (273% Fusion) + Outro gives incoming +12% Fusion DMG, stacking Chromatic Foam's Outro buff.`, reasonVi: `BiS (Fusion Burst). Echo signature của cô ấy (273% Fusion) + Outro cho Resonator vào sân kế tiếp +12% Fusion DMG, cộng dồn với buff Outro của Chromatic Foam.` },
    { echo: 'Hyvatia', set: 'pact-of-neonlight-leap', reason: `For Tune Strain teams (with Mornye/Luuk): Pact grants incoming ATK scaling with Tune Break Boost; Hyvatia adds +10% all-type DMG.`, reasonVi: `Cho team Tune Strain (với Mornye/Luuk): Pact cấp cho Resonator vào sân kế tiếp ATK scale theo Tune Break Boost; Hyvatia thêm +10% all-type DMG.` },
    { echo: 'Lioness of Glory', set: 'flaming-clawprint', reason: `Universal alt (Fusion Burst or Tune Strain): buffs Fusion/Liberation DMG; also the pick when Denia is played as main DPS.`, reasonVi: `Bản thay thế đa dụng (Fusion Burst hoặc Tune Strain): buff Fusion/Liberation DMG; cũng là lựa chọn khi Denia chơi làm main DPS.` },
    { echo: 'Nameless Explorer', set: 'reel-of-spliced-memories', reason: `Tune Strain without Mornye (5pc +20 Tune Break Boost). Low confidence: no dedicated cost-4 exists — closest valid pairing.`, reasonVi: `Tune Strain không có Mornye (5pc +20 Tune Break Boost). Độ tin cậy thấp: không có cost-4 chuyên dụng nào — cặp ghép hợp lệ gần nhất.` },
  ],
  lucilla: [
    { echo: 'Reminiscence: Threnodian - Voidborne Construct', set: 'wishes-of-quiet-snowfall', reason: `True BiS (Glacio Chafe sub-DPS): +Glacio & +Liberation DMG passive, synergy with Snowfall's crit-on-Liberation. Top pick.`, reasonVi: `BiS thực thụ (sub-DPS Glacio Chafe): passive +Glacio & +Liberation DMG, cộng hưởng với hiệu ứng crit-khi-Liberation của Snowfall. Lựa chọn hàng đầu.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Best Glacio Chafe alt without Voidborne: Freezing Frost 5pc boosts Glacio + freeze, fits her basic-attack Chafe mode.`, reasonVi: `Bản thay thế Glacio Chafe tốt nhất khi không có Voidborne: Freezing Frost 5pc tăng Glacio + đóng băng, hợp với chế độ Chafe dựa vào Basic Attack của cô.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `BiS for Echo-Skill/support mode: +12% DMG passive + Moonlit Clouds Outro ATK to the incoming main DPS.`, reasonVi: `BiS cho chế độ Echo Skill/hỗ trợ: passive +12% DMG + Moonlit Clouds tăng ATK khi Outro cho main DPS vào sân kế tiếp.` },
  ],
  xuanling: [
    { echo: 'Thousand-Puppet Pavilion', set: 'song-of-feathered-trace', reason: `BiS (Game8 #1). Passive +12% Havoc & +12% Heavy Attack DMG; Song 5pc grants +20% CR & +25% Heavy ATK DMG on Havoc Bane; summon nukes without costing combo.`, reasonVi: `BiS (Game8 #1). Passive +12% Havoc & +12% Heavy Attack DMG; Song 5pc cho +20% CR & +25% Heavy ATK DMG khi Havoc Bane; đòn triệu hồi gây sát thương bùng nổ mà không tốn combo.` },
    { echo: 'Reminiscence: Threnodian - Leviathan', set: 'thread-of-severed-fate', reason: `3-2 split alt (Game8 #2). Passive +12% Havoc & +12% Liberation DMG; 3pc Thread + 2pc Havoc Eclipse — strong when Song pieces are poorly rolled.`, reasonVi: `Bản thay thế 3-2 split (Game8 #2). Passive +12% Havoc & +12% Liberation DMG; 3pc Thread + 2pc Havoc Eclipse — mạnh khi các mảnh Song roll xấu.` },
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `5pc Havoc Eclipse alt (Game8 #3, budget). Stacks up to +30% Havoc DMG; echo passive only half-benefits her Heavy kit — weaker than the above.`, reasonVi: `Bản thay thế 5pc Havoc Eclipse (Game8 #3, tiết kiệm). Cộng dồn tới +30% Havoc DMG; passive của echo chỉ hưởng lợi một nửa cho bộ kỹ năng Heavy của cô — yếu hơn các bản trên.` },
  ],
  mornye: [
    { echo: 'Reactor Husk', set: 'halo-of-starry-radiance', reason: `BiS. Halo 5pc: healing grants team up to +25% ATK (scales with Off-Tune Buildup); Reactor Husk +10% ER hits the 260% ER breakpoint.`, reasonVi: `BiS. Halo 5pc: hồi máu tăng tới +25% ATK cho cả đội (scale theo Off-Tune Buildup); Reactor Husk +10% ER đạt mốc 260% ER.` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Alt (~10% less team ATK): Rejuvenating Glow +15% team ATK on heal; Fallacy adds +10% ER & +10% ATK.`, reasonVi: `Bản thay thế (ít hơn ~10% team ATK): Rejuvenating Glow +15% team ATK khi hồi máu; Fallacy thêm +10% ER & +10% ATK.` },
  ],
  sigrika: [
    { echo: 'Nameless Explorer', set: 'sound-of-true-name', reason: `BiS. Passive +12% Aero & +20% Echo Skill DMG; Sound of True Name 5pc gives +20% Echo Skill CR + +15% Aero — built around her Echo Skill DPS.`, reasonVi: `BiS. Passive +12% Aero & +20% Echo Skill DMG; Sound of True Name 5pc cho +20% Echo Skill CR + +15% Aero — xây quanh lối chơi DPS bằng Echo Skill của cô.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Accessible alt: Sierra Gale 5pc +30% Aero after Intro + echo's unconditional +12% Aero/+12% Heavy — loses the Echo Skill DMG buff.`, reasonVi: `Bản thay thế dễ tiếp cận: Sierra Gale 5pc +30% Aero sau Intro + buff +12% Aero/+12% Heavy vô điều kiện của echo — mất buff Echo Skill DMG.` },
  ],
  buling: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `BiS. Rejuvenating Glow 2pc +10% Healing, 5pc +15% team ATK on heal; skill adds ER + team ATK burst — smoothest rotations.`, reasonVi: `BiS. Rejuvenating Glow 2pc +10% Healing, 5pc +15% team ATK khi hồi máu; skill thêm ER + bùng nổ team ATK — vòng xoay mượt nhất.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Top alt, same 5pc: team shield (50% DR) + 10% team DMG — pick when survivability/team damage beats ER.`, reasonVi: `Bản thay thế hàng đầu, cùng 5pc: khiên cho cả đội (50% DR) + 10% team DMG — chọn khi khả năng sống sót/sát thương đội quan trọng hơn ER.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Alt 5pc: ER + ATK to next Resonator; below Rejuvenating Glow since the buff hits one ally, not the team.`, reasonVi: `Bản thay thế 5pc: ER + ATK cho Resonator vào sân kế tiếp; dưới Rejuvenating Glow vì buff chỉ tác động một đồng đội, không phải cả đội.` },
  ],
  phoebe: [
    { echo: 'Nightmare: Mourning Aix', set: 'eternal-radiance', reason: `BiS. Summon (no field time) + passive +12% Spectro; Eternal Radiance 5pc +20% CR on Frazzle + Spectro DMG at high stacks — her Frazzle kit.`, reasonVi: `BiS. Đòn triệu hồi (không tốn thời gian trên sân) + passive +12% Spectro; Eternal Radiance 5pc +20% CR khi Frazzle + Spectro DMG ở stack cao — hợp bộ kỹ năng Frazzle của cô.` },
    { echo: 'Jué', set: 'celestial-light', reason: `Budget/alt when Eternal Radiance isn't rolled: Celestial Light 5pc big flat Spectro DMG, simpler than the Frazzle condition.`, reasonVi: `Bản thay thế tiết kiệm khi chưa roll được Eternal Radiance: Celestial Light 5pc cho Spectro DMG cố định lớn, đơn giản hơn điều kiện Frazzle.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Sub-DPS/support: applies Frazzle then swaps; Moonlit Clouds funnels ATK to the incoming DPS + Heron's +12% DMG.`, reasonVi: `Sub-DPS/support: áp Frazzle rồi đổi ra; Moonlit Clouds dồn ATK cho DPS vào sân kế tiếp + Heron cho +12% DMG.` },
  ],
  augusta: [
    { echo: 'The False Sovereign', set: 'crown-of-valor', reason: `BiS (3pc Crown of Valor + 2pc Void Thunder; a 3-2 with Lingering Tunes is the close 2nd). +12% Electro & +12% Heavy DMG + Intro summon; CoV shield stacks +30% ATK/+20% Crit DMG.`, reasonVi: `BiS (3pc Crown of Valor + 2pc Void Thunder; bản 3-2 với Lingering Tunes là lựa chọn thứ 2 sát nút). +12% Electro & +12% Heavy DMG + đòn triệu hồi khi Intro; khiên CoV cộng dồn +30% ATK/+20% Crit DMG.` },
    { echo: 'Tempest Mephis', set: 'void-thunder', reason: `Budget/early full 5pc Void Thunder (farmable): high flat Electro DMG, no shield-uptime needed — before Crown of Valor.`, reasonVi: `Bản tiết kiệm/giai đoạn đầu full 5pc Void Thunder (farm được): Electro DMG cố định cao, không cần giữ uptime khiên — dùng trước khi có Crown of Valor.` },
  ],
  galbrena: [
    { echo: 'Reminiscence: Threnodian - Leviathan', set: 'flamewings-shadow', reason: `Top cost-4 for her BiS 3pc Flamewing's Shadow (Fusion + Echo Skill DMG), run 3-2 with Flaming Clawprint/Thread. True BiS is 3-cost Corrosaurus (out of scope).`, reasonVi: `Cost-4 hàng đầu cho BiS 3pc Flamewing's Shadow của cô (Fusion + Echo Skill DMG), chạy 3-2 với Flaming Clawprint/Thread. BiS thực sự là Corrosaurus cost-3 (ngoài phạm vi).` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `5pc Molten Rift alt (game8 #2, farmable/F2P): +12% Fusion (right element) + a wasted Resonance Skill DMG portion.`, reasonVi: `Bản thay thế 5pc Molten Rift (game8 #2, farm được/F2P): +12% Fusion (đúng nguyên tố) + một phần Resonance Skill DMG bị lãng phí.` },
  ],
  qiuyuan: [
    { echo: 'Reminiscence: Fenrico', set: 'law-of-harmony', reason: `BiS (3pc Law of Harmony + 2pc Sierra Gale). +Aero & +Heavy Attack DMG; Law of Harmony gives team Echo Skill DMG — best for Echo-Skill teams.`, reasonVi: `BiS (3pc Law of Harmony + 2pc Sierra Gale). +Aero & +Heavy Attack DMG; Law of Harmony cho cả đội Echo Skill DMG — tốt nhất cho team Echo-Skill.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Alt for hypercarry Echo-Skill comps (Sigrika/Galbrena): 5pc Moonlit Clouds high ATK% + its DMG buff, support over self-damage.`, reasonVi: `Bản thay thế cho comp Echo-Skill hypercarry (Sigrika/Galbrena): 5pc Moonlit Clouds cho ATK% cao + buff DMG của nó, thiên support hơn là tự gây sát thương.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Alt if Qiuyuan is a personal Aero Heavy-Attack DPS: full 5pc Sierra Gale (single-guide, lower certainty).`, reasonVi: `Bản thay thế nếu Qiuyuan chơi làm DPS Aero Heavy-Attack cá nhân: full 5pc Sierra Gale (chỉ một guide, độ chắc chắn thấp hơn).` },
  ],
}

/** Main echo đề cử của nhân vật (rỗng nếu chưa có data). */
export function mainEchoesFor(charId: string): MainEchoRec[] {
  return MAIN_ECHOES[charId] ?? []
}
