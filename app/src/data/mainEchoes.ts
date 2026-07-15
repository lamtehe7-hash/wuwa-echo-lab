// Main echo đề cử theo nhân vật — echo COST-4 đặt ở slot ĐẦU (Echo Skill triển khai được;
// bản Nightmare/Calamity cho buff THỤ ĐỘNG chỉ cần slot). Xem cơ chế: research/main-echo.md.
//
// Nguồn: web-research 15/07/2026 (game8 build pages / prydwen / wuthering.gg qua 2 workflow research→verify
// 39 nhân vật, ~156 agent Sonnet, cross-check + sửa reason sai + drop entry bịa). Mỗi nhân vật liệt kê ĐỦ
// các cấu hình guide đề cử (BiS + alt 5pc + 3-2 split + budget/F2P + support). Tên echo KHỚP data/echoes.ts
// (tra icon qua data/echoIndex.ts); set = id trong data/sonata.ts — main echo phải THUỘC set đang chạy.
// Ordered best-first: entry 0 = BiS. reason viết EN (như nhãn card). Chỉnh tự do theo bản game mới.

export interface MainEchoRec {
  /** Tên echo cost-4 (khớp data/echoes.ts) */
  echo: string
  /** Set mà main echo này đi kèm (id trong data/sonata.ts) */
  set: string
  /** Cấu hình + buff của Echo Skill/passive + vì sao hợp nhân vật */
  reason: string
}

export const MAIN_ECHOES: Record<string, MainEchoRec[]> = {
  camellya: [
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `BiS (5pc Havoc Eclipse). Unconditional passive +12% Havoc & +12% Basic Attack DMG + better energy gen; top pick in current guides.` },
    { echo: 'Crownless', set: 'havoc-eclipse', reason: `Same 5pc; echo skill hits harder + on-slot +12% Havoc/+12% Skill DMG, but needs a jump-cancel to keep field time. For no-Nightmare / max damage.` },
    { echo: 'Dreamless', set: 'havoc-eclipse', reason: `Same 5pc, clean-rotation option — no cancel timing needed; trades some damage for simpler execution.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Budget/F2P alt set: 5pc Lingering Tunes stacks ATK% for sustained basic-attacking; instant-cast slots right after her burst.` },
  ],
  carlotta: [
    { echo: 'Sentry Construct', set: 'frosty-resolve', reason: `BiS (5pc Frosty Resolve; also a 3-2 Frosty Resolve + Lingering Tunes split). Main slot +12% Glacio & +12% Skill DMG; set stacks Glacio/Skill DMG.` },
    { echo: 'Nightmare: Lampylumen Myriad', set: 'frosty-resolve', reason: `Alt in the same Frosty Resolve set: strong AoE skill + Glacio/Skill DMG; on par with Sentry in AoE, slightly behind on single-target.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Budget/early: Freezing Frost 5pc ~+40% Glacio DMG, easier upkeep; the only cost-4 carrying this set.` },
  ],
  jinhsi: [
    { echo: 'Jué', set: 'celestial-light', reason: `BiS (5pc Celestial Light). Summon nuke grants Skill DMG + stacks Incandescence at zero field-time cost.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `2nd-best full 5pc: Lingering Tunes ATK-scaling + AoE explosion/ATK buff; slightly under Celestial Light but a valid non-Jué build.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Budget swap for the Celestial Light set when Jué is unfarmed; costs field time, weaker buff, same 5pc bonus.` },
  ],
  changli: [
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `BiS. Unconditional +12% Fusion & +12% Resonance Skill DMG; 5pc Molten Rift adds +30% Fusion DMG after a Heavy Attack triggers a Fusion reaction.` },
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Budget/transition to the Nightmare variant; same Molten Rift 5pc (a 3-2 Molten Rift + Moonlit Clouds split works pre-full-set).` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Support build when Changli buffs a hypercarry: Moonlit Clouds 5pc +22.5% ATK to next on Outro + Heron's swap-in DMG buff & energy.` },
  ],
  'xiangli-yao': [
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `BiS. Unconditional +12% Electro & +12% Resonance Liberation DMG (no cast); pairs 5pc Void Thunder. Fits his Liberation profile.` },
    { echo: 'Tempest Mephis', set: 'void-thunder', reason: `Practical pick (some guides rank above): fast 2-hit skill weaves in, claw hit gives conditional +12% Electro & +12% Heavy DMG; same set.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `Same Liberation buff as its Nightmare copy but conditional (after final hit); slower 6-hit animation — near toss-up decided by substats.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Budget/F2P Lingering Tunes set (~3% weaker than Void Thunder): stacking ATK% without pausing + feeds Outro Skill DMG.` },
  ],
  calcharo: [
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `BiS. Passive +12% Electro & +12% Liberation DMG (no cast); fits his Liberation Forte. Run 5pc Void Thunder.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `F2P/budget alt: same +12%/+12% but needs an Echo Skill cast (final hit) for uptime. Same 5pc Void Thunder.` },
    { echo: 'Nightmare: Tempest Mephis', set: 'void-thunder', reason: `Budget/Skill-focused: unconditional +12% Electro & +12% Resonance Skill DMG; used in 2pc Void Thunder + 2pc ATK budget mixes.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Alt: 5pc Lingering Tunes +60% Outro Skill DMG (+stacking ATK%); Mech's skill counts as Outro Skill DMG — swap-heavy teams.` },
  ],
  jiyan: [
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `BiS (5pc Sierra Gale +10%/+30% Aero after Intro). He fully leverages the set; Nightmare substat favors his Heavy/Aero scaling.` },
    { echo: 'Feilian Beringal', set: 'sierra-gale', reason: `Same 5pc set with the non-Nightmare echo; pre-Rinascita substitute, swap to Nightmare once farmed.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `2pc half of a Sierra Gale(2)/Lingering Tunes(2) budget split (up to +30% ATK); temporary — his kit can't use its Electro.` },
  ],
  encore: [
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `BiS (5pc Molten Rift: Fusion DMG buff after Resonance Skill, easy uptime); echo adds Fusion + Basic ATK DMG. A 3-2 Molten Rift + Moonlit Clouds is a transition.` },
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Budget/F2P substitute before the Nightmare boss; same Molten Rift 5pc + Fusion/Basic ATK DMG skill.` },
    { echo: 'Mech Abomination', set: 'lingering-tunes', reason: `Quickswap-support variant: Lingering Tunes 5pc ATK% + +60% Outro Skill DMG if Encore enables another Fusion DPS.` },
  ],
  zani: [
    { echo: 'Nightmare: Mourning Aix', set: 'eternal-radiance', reason: `BiS cost-4 for Eternal Radiance (true BiS is 3-cost Capitaneus). Passive +10% Spectro; set gives +20% CR on Frazzle + Spectro DMG at 10 stacks — her Frazzle kit.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Budget/early alt: Celestial Light 2pc +10% / 5pc +30% Spectro after Intro; flat, no CR, lower ceiling than Eternal Radiance.` },
  ],
  cartethyia: [
    { echo: 'Reminiscence: Fleurdelys', set: 'windward-pilgrimage', reason: `BiS (5pc). +30% Aero & +10% CR on Aero-Eroded targets (near-permanent); Fleurdelys adds ~20% Aero DMG exclusive to Cartethyia/Aero Rover.` },
    { echo: 'Reminiscence: Fleurdelys', set: 'gusts-of-welkin', reason: `5pc alt when Windward pieces aren't farmed: applies Erosion + buffs team Aero DMG; same Fleurdelys echo, slightly lower personal ceiling.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Budget/early (pre-Rinascita) before Fleurdelys/Windward: grants Aero DMG via the echo's own skill.` },
  ],
  lupa: [
    { echo: 'Lioness of Glory', set: 'flaming-clawprint', reason: `BiS. On-slot +12% Fusion & +12% Resonance Liberation DMG; set gives team +15% Fusion on Liberation + +20% Liberation DMG to caster. Top pick.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Best pre-Lioness alt: +12% Fusion & +12% Skill DMG; Molten Rift +30% Fusion on Liberation proc. Swap up once Lioness drops.` },
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Very-early budget copy of the Nightmare version (weaker passive). Upgrade path: Inferno → Nightmare: Inferno → Lioness of Glory.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Funnel-support alt for mono-Fusion comps: buffs the incoming Resonator on Outro, trading Lupa's damage for a teammate's burst.` },
  ],
  yinlin: [
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `True BiS (sub-DPS/buffer): swap-cancel before Outro gives incoming DPS +12% DMG on top of Moonlit Clouds' +22.5% ATK, + big energy restore.` },
    { echo: 'Nightmare: Tempest Mephis', set: 'empyrean-anthem', reason: `Game8 #2: passive +12% Electro & +12% Skill DMG + Empyrean Anthem's Coordinated-Attack buff (depends on her Punishment Marks).` },
    { echo: 'Nightmare: Tempest Mephis', set: 'void-thunder', reason: `Hypercarry/no-off-field alt: 5pc Void Thunder amps her own Electro (up to +30%) + the Nightmare passive's flat +12%/+12%.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `Budget/early for the Void Thunder DPS build: skill combo grants +12% Electro & +12% Liberation DMG for 15s (no CR bonus).` },
  ],
  zhezhi: [
    { echo: 'Nightmare: Lampylumen Myriad', set: 'empyrean-anthem', reason: `BiS (sub-DPS/support). Summon (no rotation cost) + stacks Glacio & Coordinated Attack DMG atop the 5pc's +80% CA — best when her echoes/weapon are endgame.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Best alt when investment isn't endgame or a support role is wanted; Outro ATK buff, Moonlit Clouds leans into her buffing.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Full offensive/off-field-DPS config: Freezing Frost 5pc stacks +10% Glacio x3 on attacks, maximizing her own damage.` },
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `Budget alt in the same set when no Nightmare: Lampylumen — unconditional ~+40% Coordinated Attack DMG passive.` },
  ],
  roccia: [
    { echo: 'Nightmare: Impermanence Heron', set: 'midnight-veil', reason: `BiS. Fixed +12% Havoc & +12% Heavy Attack DMG (both core stats); Midnight Veil 5pc adds +15% Havoc to next on Outro.` },
    { echo: 'Lorelei', set: 'midnight-veil', reason: `Alt, same 5pc: +12% Havoc & +12% Basic Attack DMG; some guides rate it equal/ahead for DPS-leaning Roccia.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Budget/non-Havoc-team: 10 energy on hit + Moonlit Clouds 5pc +22.5% ATK to next — when Roccia supports a non-Havoc DPS.` },
  ],
  cantarella: [
    { echo: 'Lorelei', set: 'midnight-veil', reason: `5pc BiS (Havoc sub-DPS/buffer). Midnight Veil boosts Havoc/Basic ATK + gives next Resonator Havoc DMG on Outro, stacking her Havoc scaling.` },
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `5pc alt for Coordinated-Attack teams (~+80% CA, needs ~70% CR); Hecate is the standard main echo for this set.` },
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `5pc alt for Havoc-focused/main-DPS Cantarella teams; passive stacks Havoc DMG on Basic/Heavy Attacks.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `5pc budget/backup without Midnight Veil: buffs next Resonator's ATK/DMG after Outro.` },
  ],
  brant: [
    { echo: 'Dragon of Dirge', set: 'tidebreaking-courage', reason: `True BiS. 5pc Tidebreaking Courage = +30% team All-Attribute DMG once ER hits 250%; Dragon adds Fusion + Basic ATK DMG on-slot.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Budget/no-ER alt: Molten Rift 5pc Fusion buff after Skill when you can't hit 250% ER; echo also builds energy.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Support/sub-DPS: Moonlit Clouds ER + +22.5% ATK to next on Outro (Bell-Borne Geochelone is an interchangeable main echo here).` },
  ],
  sanhua: [
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `BiS (sub-DPS/buffer). +12% DMG to next character after Liberation, stacking Moonlit Clouds' Outro ATK buff — her quick-swap style.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Alt/damage or budget: Freezing Frost 5pc +10% Glacio x3 for personal damage (also a 2pc Freezing Frost + 2pc Lingering Tunes split).` },
  ],
  mortefi: [
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `BiS ceiling: Empyrean Anthem Coordinated Attack DMG + crit-triggered ATK buff — but needs his S4 (longer Liberation) to use comfortably.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Default/practical BiS for non-S4 Mortefi: Moonlit Clouds +10% ER + +22.5% ATK to next on Outro, stacking Heron's DMG buff.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Budget hybrid (2pc Moonlit Clouds + 2pc Molten Rift): keeps ER for frequent Liberations + adds Fusion DMG.` },
  ],
  iuno: [
    { echo: 'Lady of the Sea', set: 'crown-of-valor', reason: `BiS. Passive +12% Liberation & +12% Aero DMG; run 3pc Crown of Valor + 2pc Aero set, 4-3-3-1-1 CRIT.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `5pc alt: trades personal DMG for a bigger ATK/DMG buff to next on Outro + ER; pre-Crown or pure-support Iuno.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Budget/alt building full Sierra Gale: unconditional +12% Aero & +12% Heavy ATK; summon fits the rotation.` },
  ],
  shorekeeper: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `BiS. HP-scaling skill + 10% ER + team ATK buff; Rejuvenating Glow 5pc = +15% team ATK for 30s on heal. Target ~250% ER.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Alt for switch-tech comps (e.g. Jinhsi): ATK/ER support; swap before Outro gives incoming +12% DMG + Moonlit Clouds 5pc ATK.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Budget/early swap-in without a good Fallacy: keeps Rejuvenating Glow's Healing Bonus + team ATK, smaller shield/shorter buff.` },
  ],
  verina: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `BiS. 5pc Rejuvenating Glow (+10% Healing, team +15% ATK on heal) + Fallacy's self +10% ER & team +10% ATK for 20s.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Budget alt in the same set: Glacio DEF-scaling skill + team shield (50% DR, 3 hits) + 10% team DMG. Standard fallback.` },
    { echo: 'Bell-Borne Geochelone', set: 'moonlit-clouds', reason: `Hybrid support+dmg (Moonlit Clouds): 2pc +10% ER, 5pc +22.5% ATK to next on Outro — when ER is a bottleneck.` },
  ],
  baizhi: [
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `BiS. Team shield (50% DR) + 10% team DMG; Rejuvenating Glow 2pc +10% Healing, 5pc +15% team ATK on heal — near-constant uptime.` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Alt, same set: Spectro skill + +10% team ATK for 20s (longer window than the shield) — better damage if you own a good copy.` },
    { echo: 'Bell-Borne Geochelone', set: 'moonlit-clouds', reason: `Secondary 5pc alt: trades ATK-on-heal for 10% ER + Outro ATK buff — faster Liberation, weaker overall than Rejuvenating Glow.` },
  ],
  lynae: [
    { echo: 'Hyvatia', set: 'pact-of-neonlight-leap', reason: `BiS (buffer/sub-DPS). Pact 5pc gives incoming up to +30% ATK on Outro; Hyvatia adds +10% all-type DMG to that Resonator's Intro.` },
    { echo: 'Hyvatia', set: 'rite-of-gilded-revelation', reason: `Personal-DPS build: 5pc stacks Spectro on Basic + +40% Basic ATK DMG on Liberation; Hyvatia's Intro buff still applies.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Budget/F2P while farming Pact: 2pc ER keeps her ~120% target, 5pc +22.5% ATK to next — preserves her buffer role.` },
  ],
  aemeath: [
    { echo: 'Sigillum', set: 'trailblazing-star', reason: `BiS. Sigillum tailor-made for her (+25% Liberation DMG); Trailblazing Star 5pc adds +20% CR & +20% Fusion on Tune Rupture → ~100% CR.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Best pre-farm alt (5pc Molten Rift: +30-40% Fusion after Skill); recommended stand-in while building Trailblazing Star.` },
    { echo: 'Lioness of Glory', set: 'flaming-clawprint', reason: `Secondary alt: Flaming Clawprint boosts Fusion & Liberation DMG; usable if already built, ranked below Molten Rift for her.` },
  ],
  'luuk-herssen': [
    { echo: 'Hyvatia', set: 'rite-of-gilded-revelation', reason: `DB-valid cost-4 for the 5pc set (guides' true top is cost-3 Twin Nova, excluded). Set gives up to +40% Basic + +40% Spectro; Hyvatia itself only buffs the next character.` },
    { echo: 'Jué', set: 'celestial-light', reason: `Budget alt while farming Rite: Celestial Light 5pc +40% Spectro DMG, synergizes with his Spectro basic kit. Standard backup.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Same Celestial Light alt: quick double-strike buffs Spectro + Liberation DMG; game8's 2nd cost-4 choice for this slot.` },
  ],
  hiyuki: [
    { echo: 'Reminiscence: Threnodian - Voidborne Construct', set: 'wishes-of-quiet-snowfall', reason: `BiS. Passive +12% Glacio & +12% Liberation DMG (both she scales); summon slots cleanly + maxes Snowfall's CR proc on Glacio Chafe.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Budget/transition while farming Snowfall: 3 strikes buff Glacio & Skill DMG for 15s; weaker than BiS.` },
  ],
  lucy: [
    { echo: 'Reminiscence: Nightmare Adam Smasher', set: 'shadow-of-shattered-dreams', reason: `BiS. 1pc collab set = +35% Heavy ATK DMG on Hack-Shifting + +15% CR on equip; frees 4 slots for a 1+2+2 split of Spectro-DMG 2pc sets.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Budget alt without the collab echo: clean 5pc Celestial Light; Mourning Aix gives +12% Spectro & +12% Liberation DMG. Guides' 2nd best.` },
  ],
  rebecca: [
    { echo: 'Reminiscence: Nightmare Adam Smasher', set: 'shadow-of-shattered-dreams', reason: `BiS. 1pc collab + 2pc Void Thunder + 2pc Reel triple-sonata; +15% CR flat + skill becomes a 16-hit Electro barrage; set +35% CR/Basic/Heavy on Hack-Shifting.` },
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `F2P/budget without the collab echo: straightforward 5pc Void Thunder for consistent Electro DMG.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Quickswap/buffer alt: trades her DPS for team buffing (self +10% ER, +22.5% ATK to incoming on Outro).` },
  ],
  suisui: [
    { echo: 'Thousand-Puppet Pavilion', set: 'song-of-feathered-trace', reason: `BiS. Song of Feathered Trace 5pc converts her 250%+ ER into up to +25% team ATK on Glacio Chafe (newer echo Forbidden Bastion not in DB).` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Alt when Song pieces aren't rolled: Rejuvenating Glow ~+15% team ATK on heal, pairs her healing kit.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Quickswap alt: Moonlit Clouds Outro +22.5% ATK to next for 15s — rapid-swap comps.` },
  ],
  denia: [
    { echo: 'Reminiscence: Denia', set: 'chromatic-foam', reason: `BiS (Fusion Burst). Her signature echo (273% Fusion) + Outro gives incoming +12% Fusion DMG, stacking Chromatic Foam's Outro buff.` },
    { echo: 'Hyvatia', set: 'pact-of-neonlight-leap', reason: `For Tune Strain teams (with Mornye/Luuk): Pact grants incoming ATK scaling with Tune Break Boost; Hyvatia adds +10% all-type DMG.` },
    { echo: 'Lioness of Glory', set: 'flaming-clawprint', reason: `Universal alt (Fusion Burst or Tune Strain): buffs Fusion/Liberation DMG; also the pick when Denia is played as main DPS.` },
    { echo: 'Nameless Explorer', set: 'reel-of-spliced-memories', reason: `Tune Strain without Mornye (5pc +20 Tune Break Boost). Low confidence: no dedicated cost-4 exists — closest valid pairing.` },
  ],
  lucilla: [
    { echo: 'Reminiscence: Threnodian - Voidborne Construct', set: 'wishes-of-quiet-snowfall', reason: `True BiS (Glacio Chafe sub-DPS): +Glacio & +Liberation DMG passive, synergy with Snowfall's crit-on-Liberation. Top pick.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Best Glacio Chafe alt without Voidborne: Freezing Frost 5pc boosts Glacio + freeze, fits her basic-attack Chafe mode.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `BiS for Echo-Skill/support mode: +12% DMG passive + Moonlit Clouds Outro ATK to the incoming main DPS.` },
  ],
  xuanling: [
    { echo: 'Thousand-Puppet Pavilion', set: 'song-of-feathered-trace', reason: `BiS (Game8 #1). Passive +12% Havoc & +12% Heavy Attack DMG; Song 5pc grants +20% CR & +25% Heavy ATK DMG on Havoc Bane; summon nukes without costing combo.` },
    { echo: 'Reminiscence: Threnodian - Leviathan', set: 'thread-of-severed-fate', reason: `3-2 split alt (Game8 #2). Passive +12% Havoc & +12% Liberation DMG; 3pc Thread + 2pc Havoc Eclipse — strong when Song pieces are poorly rolled.` },
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `5pc Havoc Eclipse alt (Game8 #3, budget). Stacks up to +30% Havoc DMG; echo passive only half-benefits her Heavy kit — weaker than the above.` },
  ],
  mornye: [
    { echo: 'Reactor Husk', set: 'halo-of-starry-radiance', reason: `BiS. Halo 5pc: healing grants team up to +25% ATK (scales with Off-Tune Buildup); Reactor Husk +10% ER hits the 260% ER breakpoint.` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Alt (~10% less team ATK): Rejuvenating Glow +15% team ATK on heal; Fallacy adds +10% ER & +10% ATK.` },
  ],
  sigrika: [
    { echo: 'Nameless Explorer', set: 'sound-of-true-name', reason: `BiS. Passive +12% Aero & +20% Echo Skill DMG; Sound of True Name 5pc gives +20% Echo Skill CR + +15% Aero — built around her Echo Skill DPS.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Accessible alt: Sierra Gale 5pc +30% Aero after Intro + echo's unconditional +12% Aero/+12% Heavy — loses the Echo Skill DMG buff.` },
  ],
  buling: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `BiS. Rejuvenating Glow 2pc +10% Healing, 5pc +15% team ATK on heal; skill adds ER + team ATK burst — smoothest rotations.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Top alt, same 5pc: team shield (50% DR) + 10% team DMG — pick when survivability/team damage beats ER.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Alt 5pc: ER + ATK to next Resonator; below Rejuvenating Glow since the buff hits one ally, not the team.` },
  ],
  phoebe: [
    { echo: 'Nightmare: Mourning Aix', set: 'eternal-radiance', reason: `BiS. Summon (no field time) + passive +12% Spectro; Eternal Radiance 5pc +20% CR on Frazzle + Spectro DMG at high stacks — her Frazzle kit.` },
    { echo: 'Jué', set: 'celestial-light', reason: `Budget/alt when Eternal Radiance isn't rolled: Celestial Light 5pc big flat Spectro DMG, simpler than the Frazzle condition.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Sub-DPS/support: applies Frazzle then swaps; Moonlit Clouds funnels ATK to the incoming DPS + Heron's +12% DMG.` },
  ],
  augusta: [
    { echo: 'The False Sovereign', set: 'crown-of-valor', reason: `BiS (3pc Crown of Valor + 2pc Void Thunder; a 3-2 with Lingering Tunes is the close 2nd). +12% Electro & +12% Heavy DMG + Intro summon; CoV shield stacks +30% ATK/+20% Crit DMG.` },
    { echo: 'Tempest Mephis', set: 'void-thunder', reason: `Budget/early full 5pc Void Thunder (farmable): high flat Electro DMG, no shield-uptime needed — before Crown of Valor.` },
  ],
  galbrena: [
    { echo: 'Reminiscence: Threnodian - Leviathan', set: 'flamewings-shadow', reason: `Top cost-4 for her BiS 3pc Flamewing's Shadow (Fusion + Echo Skill DMG), run 3-2 with Flaming Clawprint/Thread. True BiS is 3-cost Corrosaurus (out of scope).` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `5pc Molten Rift alt (game8 #2, farmable/F2P): +12% Fusion (right element) + a wasted Resonance Skill DMG portion.` },
  ],
  qiuyuan: [
    { echo: 'Reminiscence: Fenrico', set: 'law-of-harmony', reason: `BiS (3pc Law of Harmony + 2pc Sierra Gale). +Aero & +Heavy Attack DMG; Law of Harmony gives team Echo Skill DMG — best for Echo-Skill teams.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Alt for hypercarry Echo-Skill comps (Sigrika/Galbrena): 5pc Moonlit Clouds high ATK% + its DMG buff, support over self-damage.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Alt if Qiuyuan is a personal Aero Heavy-Attack DPS: full 5pc Sierra Gale (single-guide, lower certainty).` },
  ],
}

/** Main echo đề cử của nhân vật (rỗng nếu chưa có data). */
export function mainEchoesFor(charId: string): MainEchoRec[] {
  return MAIN_ECHOES[charId] ?? []
}
