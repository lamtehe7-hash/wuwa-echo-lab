// Main echo đề cử theo nhân vật — echo COST-4 đặt ở slot ĐẦU (Echo Skill triển khai được;
// bản Nightmare/Calamity cho buff THỤ ĐỘNG chỉ cần slot). Xem cơ chế: research/main-echo.md.
//
// Nguồn: web-research 15/07/2026 (game8 build pages / prydwen / wuthering.gg qua workflow 39 nhân vật
// research→verify, 78 agent Sonnet, cross-check + sửa reason sai). Tên echo KHỚP data/echoes.ts (tra icon
// qua data/echoIndex.ts). set = id trong data/sonata.ts — main echo phải THUỘC set đang chạy (chiếm 1 mảnh).
// Ordered best-first: entry 0 = cho set BiS. reason viết EN (như nhãn card). Chỉnh tự do theo bản game mới.

export interface MainEchoRec {
  /** Tên echo cost-4 (khớp data/echoes.ts) */
  echo: string
  /** Set mà main echo này đi kèm (id trong data/sonata.ts) */
  set: string
  /** Buff của Echo Skill/passive + vì sao hợp nhân vật */
  reason: string
}

export const MAIN_ECHOES: Record<string, MainEchoRec[]> = {
  camellya: [
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `Unconditional passive +12% Havoc DMG & +12% Basic Attack DMG (no summon needed) + better energy gen; Prydwen's top pick for her.` },
    { echo: 'Crownless', set: 'havoc-eclipse', reason: `Budget alt: echo skill gives +12% Havoc & +12% Resonance Skill DMG for 15s; jump-cancel so it doesn't cut the Basic chain.` },
    { echo: 'Dreamless', set: 'havoc-eclipse', reason: `Same-set filler: 6-hit Havoc nuke, but its conditional +50% window is Rover-specific and doesn't help Camellya.` },
  ],
  carlotta: [
    { echo: 'Sentry Construct', set: 'frosty-resolve', reason: `Unconditional +12% Glacio & +12% Resonance Skill DMG; skill also 405% Glacio + freeze — fits her single-target skill kit. BiS.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Only cost-4 in Freezing Frost; stacking +4%/+4% Glacio & Skill DMG (weaker than Sentry's flat 12%). Budget/AoE alt.` },
  ],
  jinhsi: [
    { echo: 'Jué', set: 'celestial-light', reason: `Blessing of Time: +16% Resonance Skill DMG + a Spectro DoT that feeds Incandescence stacks; no field-time loss to apply.` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Fallback: +12% Spectro & +12% Liberation DMG for 15s after transform; costs field time, doesn't feed stacks — use if no Jué.` },
  ],
  changli: [
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Unconditional +12% Fusion DMG & +12% Resonance Skill DMG; smoother uptime in her rotation.` },
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Alt: higher burst Fusion via echo skill but you must cast it (clunkier). Use if no Nightmare variant.` },
  ],
  'xiangli-yao': [
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `Unconditional +12% Electro & +12% Resonance Liberation DMG — matches his Liberation-heavy kit. Best.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `Same +12%/+12% but conditional (land the full 6-hit combo). Substitute if no Nightmare version.` },
    { echo: 'Tempest Mephis', set: 'void-thunder', reason: `Conditional +12% Electro & +12% Heavy Attack DMG — weaker fit (his damage is Liberation, not Heavy).` },
  ],
  calcharo: [
    { echo: 'Nightmare: Thundering Mephis', set: 'void-thunder', reason: `Unconditional +12% Electro & +12% Resonance Liberation DMG; ideal Liberation Electro DPS, pairs 5pc Void Thunder.` },
    { echo: 'Thundering Mephis', set: 'void-thunder', reason: `Same buff but skill-gated (6-hit dash assault). Lower-investment substitute.` },
    { echo: 'Tempest Mephis', set: 'void-thunder', reason: `Alt: +12% Electro & +12% Heavy Attack DMG (not Liberation) — weaker fit for his rotation.` },
  ],
  jiyan: [
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Unconditional +12% Aero & +12% Heavy Attack DMG — fits his Aero/Heavy Qingloong combo. BiS.` },
    { echo: 'Feilian Beringal', set: 'sierra-gale', reason: `Budget alt: same +12%/+12% but conditional (only after the follow-up strike lands, 15s).` },
  ],
  encore: [
    { echo: 'Inferno Rider', set: 'molten-rift', reason: `Echo skill grants +12% Fusion & +12% Basic Attack DMG for 15s — fits her basic-attack rotation (the Nightmare version lacks this buff).` },
  ],
  zani: [
    { echo: 'Nightmare: Mourning Aix', set: 'eternal-radiance', reason: `Skill deals +100% Spectro vs Frazzle + grants +12% Spectro DMG passively — pairs her BiS 5pc Eternal Radiance (Frazzle).` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `F2P alt: +12% Spectro & +12% Liberation DMG for 15s when running 5pc Celestial Light instead.` },
  ],
  cartethyia: [
    { echo: 'Reminiscence: Fleurdelys', set: 'windward-pilgrimage', reason: `+10% Aero DMG, +10% more on an Aero user (20% on her); 5pc adds +10% CR & +30% Aero on Aero-Eroded targets. BiS.` },
    { echo: 'Reminiscence: Fleurdelys', set: 'gusts-of-welkin', reason: `Same 20% Aero echo; Gusts 5pc gives team +15%/self +15% Aero on Erosion — team comps, slightly lower personal ceiling.` },
  ],
  lupa: [
    { echo: 'Lioness of Glory', set: 'flaming-clawprint', reason: `Passive +12% Fusion & +12% Resonance Liberation DMG; the only cost-4 in her BiS Flaming Clawprint set.` },
  ],
  yinlin: [
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `Passive +40% Coordinated Attack DMG; with 5pc Empyrean Anthem (+80% CA DMG) — standard BiS for her CA-based sub-DPS kit.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Buffer variant: skill restores energy + 12% DMG to next ally on Outro; stacks Moonlit Clouds' +22.5% ATK.` },
    { echo: 'Tempest Mephis', set: 'void-thunder', reason: `+12% Electro & +12% Resonance Skill DMG passive + claw follow-up; synergy with Void Thunder Electro stacks.` },
  ],
  zhezhi: [
    { echo: 'Nightmare: Lampylumen Myriad', set: 'empyrean-anthem', reason: `No Outro-transform needed; boosts Glacio & Coordinated Attack DMG (her Inklit Spirits are CAs). BiS for Empyrean Anthem.` },
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `Unconditional +40% Coordinated Attack DMG (its own skill is Havoc, irrelevant — the passive is what counts). Alt.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Support variant: buffs the next Resonator's ATK on swap — trades her damage for team support.` },
  ],
  roccia: [
    { echo: 'Nightmare: Impermanence Heron', set: 'midnight-veil', reason: `+12% Havoc & +12% Heavy Attack DMG (her Heavy = Havoc, both apply); Midnight Veil 5pc = Outro Havoc burst. BiS.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `For Moonlit Clouds teams: energy on hit + 12% DMG to next ally on Outro; stacks 5pc +22.5% ATK.` },
  ],
  cantarella: [
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `+40% Coordinated Attack DMG passive (5pc +80% CA); summons CA hits, syncs her off-field Phantom Sting CAs (~70% CR needed).` },
    { echo: 'Lorelei', set: 'midnight-veil', reason: `+12% Havoc & +12% Basic Attack DMG passive — amplifies her Basic-scaling kit; top pick for Havoc teams.` },
  ],
  brant: [
    { echo: 'Dragon of Dirge', set: 'tidebreaking-courage', reason: `Only cost-4 in Tidebreaking Courage; +12% Fusion & +12% Basic ATK DMG passive — fits his basic-attack Fusion kit.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Full-DPS alt (no ER breakpoint): unconditional +12% Fusion & +12% Resonance Skill DMG, stacks Molten Rift 5pc.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Sub-DPS/buffer: +12% DMG to next character on Outro — quick-swap support Brant.` },
  ],
  sanhua: [
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Outro grants next Resonator +12% DMG; with Moonlit Clouds also +22.5% ATK — stacks her own Outro BA buff. BiS buffer.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Damage variant: 3 Glacio strikes (freezing shock) with stacking Glacio/Skill DMG — Glacio sub-DPS build.` },
  ],
  mortefi: [
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Skill restores 10 energy + 12% DMG to next ally on Outro; Moonlit Clouds 2pc/5pc covers his energy + buffing role.` },
    { echo: 'Hecate', set: 'empyrean-anthem', reason: `+40% Coordinated Attack DMG passive — fits his CA-centric Liberation/Intro kit; Empyrean Anthem boosts CA.` },
  ],
  iuno: [
    { echo: 'Lady of the Sea', set: 'crown-of-valor', reason: `+12% Aero & +12% Resonance Liberation DMG passive + 20s summon; pairs Crown of Valor's shield-triggered ATK/CritDMG stacks.` },
  ],
  shorekeeper: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Skill: HP-scaling Spectro + self +10% ER & team +10% ATK for 20s; ER helps her breakpoint. Prydwen BiS 4-cost.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Fallback: DEF-scaling Glacio + team shield (50% DR) + 10% DMG for 15s — more survivability, less buff uptime.` },
  ],
  verina: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Spectro blast + self +10% ER & team +10% ATK for 20s; longer uptime = community BiS 4-cost.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Fallback: Glacio + team shield (50% DR, breaks after 3 hits) + 10% DMG for 15s.` },
    { echo: 'Bell-Borne Geochelone', set: 'moonlit-clouds', reason: `Same echo for Moonlit Clouds: 2pc +10% ER, 5pc +22.5% ATK to next Resonator on Outro.` },
  ],
  baizhi: [
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Skill: Glacio + team shield (50% DR + 10% DMG) 15s; standard BiS for her 5pc Rejuvenating Glow build.` },
    { echo: 'Bell-Borne Geochelone', set: 'moonlit-clouds', reason: `Same echo, Moonlit Clouds alt: 2pc +10% ER eases her ER pressure (weaker than Rejuvenating Glow overall).` },
  ],
  lynae: [
    { echo: 'Hyvatia', set: 'rite-of-gilded-revelation', reason: `Outro gives next Resonator +10% All-Attribute DMG on Intro; 5pc stacks +10% Spectro/Basic → +40% Basic on Liberation. BiS.` },
    { echo: 'Hyvatia', set: 'pact-of-neonlight-leap', reason: `Same Hyvatia buff; Pact 5pc gives incoming +15% ATK — use when running Lynae as sub-DPS/support.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `Budget stopgap: Moonlit Clouds 5pc +22.5% ATK to next; doesn't stack Spectro like Rite of Gilded Revelation.` },
  ],
  aemeath: [
    { echo: 'Sigillum', set: 'trailblazing-star', reason: `Equipped by Aemeath: +25% Resonance Liberation DMG (her ~90% of damage); summon that doesn't clip her rotation. BiS.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Pre-farm alt: +12% Resonance Skill & Fusion DMG, stacks Molten Rift's 40% Fusion 5pc.` },
  ],
  'luuk-herssen': [
    { echo: 'Hyvatia', set: 'rite-of-gilded-revelation', reason: `Only cost-4 in his BiS Rite of Gilded Revelation; Outro gives next Resonator +10% All-Attribute DMG (real top pick is cost-3, not in DB).` },
    { echo: 'Mourning Aix', set: 'celestial-light', reason: `Temp alt set: +12% Spectro & +12% Liberation DMG for 15s (flat Spectro helps his Basic scaling, unlike Jué's skill-only buff).` },
  ],
  hiyuki: [
    { echo: 'Reminiscence: Threnodian - Voidborne Construct', set: 'wishes-of-quiet-snowfall', reason: `+12% Glacio & +12% Resonance Liberation DMG passive (20s CD) — buffs her Glacio Liberation kit. BiS.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Budget/farming alt: general Glacio DMG buff while assembling Wishes of Quiet Snowfall.` },
  ],
  lucy: [
    { echo: 'Reminiscence: Nightmare Adam Smasher', set: 'shadow-of-shattered-dreams', reason: `Main-slot +15% Crit Rate + unlocks her Hold Echo Skill (Spectro + speed); set's 1pc = +35% Basic/Heavy for 15s, frees 4 slots for a 2+2.` },
  ],
  rebecca: [
    { echo: 'Reminiscence: Nightmare Adam Smasher', set: 'shadow-of-shattered-dreams', reason: `Flat +15% Crit Rate passive; on Rebecca the skill becomes a 16-hit Electro missile barrage. Anchors the 1+2+2 triple-sonata build.` },
  ],
  suisui: [
    { echo: 'Thousand-Puppet Pavilion', set: 'song-of-feathered-trace', reason: `Only cost-4 in her BiS set; 5pc converts her ER into team ATK on Glacio Chafe (its own +Havoc passive is wasted, but wuthering.gg still lists it).` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Skill: self +10% ER + team +10% ATK for 20s — feeds her ER-based buff; strong alternative sonata.` },
    { echo: 'Bell-Borne Geochelone', set: 'moonlit-clouds', reason: `Team shield (50% DR + 10% DMG) 15s — fits her protector role; also valid under Rejuvenating Glow.` },
  ],
  denia: [
    { echo: 'Reminiscence: Denia', set: 'chromatic-foam', reason: `BiS: summons Trickster (273% Fusion); Outro within 15s gives incoming +12% Fusion DMG — matches her Fusion Burst outro role.` },
    { echo: 'Nameless Explorer', set: 'reel-of-spliced-memories', reason: `+20% Echo Skill DMG passive; 5pc raises team Tune Break Boost — for Tune Strain comps without Mornye.` },
    { echo: 'Hyvatia', set: 'pact-of-neonlight-leap', reason: `Outro gives incoming +10% All-Attribute DMG; 5pc adds +15% ATK on Outro — alt for Tune Strain teams that run Mornye.` },
  ],
  lucilla: [
    { echo: 'Reminiscence: Threnodian - Voidborne Construct', set: 'wishes-of-quiet-snowfall', reason: `+12% Glacio & +12% Resonance Liberation DMG passive; summon Glacio hits — fits Glacio Chafe basic-attack sub-DPS.` },
    { echo: 'Lampylumen Myriad', set: 'freezing-frost', reason: `Stacking +4% Glacio/+4% Skill DMG (x3) from its freezing shocks — basic/skill Glacio sub-DPS.` },
  ],
  xuanling: [
    { echo: 'Thousand-Puppet Pavilion', set: 'song-of-feathered-trace', reason: `BiS: +12% Havoc & +12% Heavy Attack DMG passive; summon deals damage without costing combo time; syncs 5pc CR/Heavy on Havoc Bane.` },
    { echo: 'Nightmare: Crownless', set: 'havoc-eclipse', reason: `Havoc Eclipse alt: +12% Havoc & +12% Basic Attack DMG (only the Havoc half helps her Heavy kit) — weaker than Pavilion.` },
  ],
  mornye: [
    { echo: 'Reactor Husk', set: 'halo-of-starry-radiance', reason: `+10% Energy Regen passive — helps her ~260% ER breakpoint that maxes Halo 5pc party ATK (up to 25%). BiS.` },
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Skill: self +10% ER + team +10% ATK for 20s; Rejuvenating Glow 5pc (15% party ATK on heal) — budget alternative set.` },
  ],
  sigrika: [
    { echo: 'Nameless Explorer', set: 'sound-of-true-name', reason: `+12% Aero & +20% Echo Skill DMG passive — directly buffs her Echo-Skill-scaling kit; BiS with Sound of True Name 5pc.` },
    { echo: 'Nightmare: Feilian Beringal', set: 'sierra-gale', reason: `Sierra Gale alt (5pc +30% Aero after Intro); its +12% Aero/+12% Heavy passive loses the Echo Skill DMG buff.` },
  ],
  buling: [
    { echo: 'Fallacy of No Return', set: 'rejuvenating-glow', reason: `Skill: Spectro + self +10% ER & team +10% ATK for 20s — longest uptime; fits her heal/ATK support role.` },
    { echo: 'Bell-Borne Geochelone', set: 'rejuvenating-glow', reason: `Alt: DEF-scaling Glacio + team shield (50% DR + 10% DMG) 15s — shorter uptime, defensive.` },
  ],
  phoebe: [
    { echo: 'Nightmare: Mourning Aix', set: 'eternal-radiance', reason: `Deals bonus Spectro vs Frazzle; synergy with Eternal Radiance CR + Spectro on Frazzle. BiS per game8/wuthering.gg.` },
    { echo: 'Jué', set: 'celestial-light', reason: `Fallback when running Celestial Light (higher flat Spectro, no Crit Rate); alt when no Eternal Radiance pieces.` },
  ],
  augusta: [
    { echo: 'The False Sovereign', set: 'crown-of-valor', reason: `+12% Electro & +12% Heavy Attack DMG passive + 405% Electro summon on Intro; Crown of Valor is her signature set. Top pick.` },
  ],
  galbrena: [
    { echo: 'Reminiscence: Threnodian - Leviathan', set: 'flamewings-shadow', reason: `Only DB cost-4 in Flamewing's Shadow; procs the set's Echo-Skill→Heavy Crit loop (its own passive is off-element). Real BiS Corrosaurus not in DB.` },
    { echo: 'Nightmare: Inferno Rider', set: 'molten-rift', reason: `Farmable Molten Rift alt: +12% Fusion (helps) & +12% Resonance Skill DMG (mostly wasted on her Heavy kit).` },
  ],
  qiuyuan: [
    { echo: 'Reminiscence: Fenrico', set: 'law-of-harmony', reason: `+12% Aero & +12% Heavy Attack DMG passive; 3pc Law of Harmony on Echo Skill = self +30% Heavy + team +4% Echo Skill DMG (x4). Fits his buffer role.` },
    { echo: 'Impermanence Heron', set: 'moonlit-clouds', reason: `For single-hypercarry Echo Skill teams (Sigrika/Galbrena); Moonlit Clouds 5pc high ATK% after Outro.` },
  ],
}

/** Main echo đề cử của nhân vật (rỗng nếu chưa có data). */
export function mainEchoesFor(charId: string): MainEchoRec[] {
  return MAIN_ECHOES[charId] ?? []
}
