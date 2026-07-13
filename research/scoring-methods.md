# Wuthering Waves — Echo Scoring & Optimization Methodology Report
*Compiled 13/07/2026. Game version context: Wuthering Waves is in its 3.x era; echo system mechanics referenced below (Crit Value, tuning, Sonata sets, cost=12 cap) have been stable since ~1.1 and remain the current baseline as of mid-2026. Character examples (Carlotta, Camellya, Shorekeeper, Iuno) reflect 2.x/3.x-era kits.*

---

## 1. Community Echo-Scoring Formulas

### 1.1 Crit Value (CV) — the de-facto universal metric
Two mathematically identical conventions circulate; both encode the same 1:2 Crit Rate (CR) : Crit DMG (CD) efficiency ratio:

| Convention | Formula | Used by |
|---|---|---|
| "Half-scale" | `CV = CR% + CD%/2` | nkbgaming CV calculator, buffget.com |
| "Double-scale" | `CV = 2×CR% + CD%` | WuwaBuilds (wuwa.build) — stated verbatim on their builds page: *"Crit Value (CV): 2 × CR + CD"* |

- Example (half-scale): 10.5% CR + 21% CD → CV = 10.5 + 10.5 = **21.0** (an echo hitting max CR+CD substats). Community benchmark: **CV ≥ 20 from substats alone** on a single echo = high-tier/endgame piece.
- WuwaBuilds-specific rule: CV is summed **only across equipped echoes**, and **only the first Crit-capable 4-cost echo counts toward CV** (to stop double-counting when a build uses a non-crit 4-cost main stat like Skill DMG%).
- Rationale (WuwaBuilds, gamemarket.gg): CR and CD *multiply* against each other in the expected-damage formula (`Avg DMG = DMG×(1−CR) + DMG×CR×CD`), so per-substat-roll value is only comparable once CD is halved — one CD roll (~2× the % of one CR roll) contributes the same marginal EV as one CR roll. This is why CV is the "default sort" on most sites.

### 1.2 Weighted / normalized "echo score" (role-based)
The most fully-specified public formula found is **wuwa.uk's Echo Scorer**:

> *Score = Σ (substat_value / substat_max_value) × role_weight[substat], normalized to a 0–100 scale against the theoretical maximum 5-substat roll for that role's weight profile.*

Concretely: for each rolled substat, compute its "roll efficiency" (value ÷ max possible value for that substat, i.e., 0–1), multiply by a per-role weight (0–2.0 scale), sum across the echo's substats, then divide by the score of a hypothetical perfect echo (5× max-value rolls, weighted) → ×100.

Role weight presets (wuwa.uk), values found:

| Substat | Crit DPS | Healer |
|---|---|---|
| Crit Rate | 2.0 | 0.1 |
| Crit DMG | 1.0 | 0.1 |
| ATK% | 0.75 | 0 |
| HP% | 0 | 1.0 |
| Energy Regen | 0 | 0.75 |
| DEF/other HP/DEF flat | 0 | 0 |

Additional presets exist (Liberation DPS, Heavy Attack DPS, Sub-DPS/Buffer) but exact numeric weights for those were **not retrievable from the page content** — UNVERIFIED at exact-number level, only the category names are confirmed.

Interpretation threshold used by the tool: **score > 70 ("A" grade) ⇒ echo worth leveling to +25.**

### 1.3 Other named tools
- **WuwaOpt (GitHub, EMCJava)** — uses a custom optimizer (`WuWaGA::Run`), naming convention strongly implies a **Genetic Algorithm** rather than a closed-form score; no published weight formula (project archived after WuWa 2.1, unmaintained).
- **wuwatracker.com** — formula not published in any indexed page found; **UNVERIFIED**.
- **encore.moe** — echo pages are client-side rendered (JS), scoring formula not extractable from static fetch; **UNVERIFIED**.
- **Prydwen.gg** — does **not** publish a numeric score/formula at all. Their entire methodology is an **ordinal priority list** per character (see §2), not a weighted numeric model. This is an important methodological distinction: Prydwen tells you *which stat to prioritize first*, not *how many points it's worth*.

---

## 2. Substat Weight / Priority Tables by Archetype

### 2.1 Max roll values per substat (community-consolidated; cost-tier independent — substat pool is the same regardless of echo cost)

| Substat | Range (Tier 1 → Tier 8) |
|---|---|
| Crit Rate % | 6.3% → 10.5% |
| Crit DMG % | 12.6% → 21.0% |
| ATK % | 6.4% → 11.6% |
| HP % | 6.4% → 11.6% |
| DEF % | 8.1% → 14.7% |
| Energy Regen % | 6.8% → 12.4% |
| Basic Attack DMG Bonus % | 6.4% → 12.4% |
| Heavy Attack DMG Bonus % | 6.4% → 11.6% |
| Resonance Skill DMG Bonus % | 6.4% → 11.6% |
| Resonance Liberation DMG Bonus % | 6.4% → 11.6% |
| Flat ATK | 30 / 40 / 50 / 60 (4 tiers only) |
| Flat DEF | 40 / 50 / 60 / 70 (4 tiers only) |
| Flat HP | 320/360/390/430/470/510/540/580 (8 tiers) |

Note on roll-distribution skew: sources agree the **lowest tier is ≈2.5× more likely to appear than the highest tier** (Kuro disclosed full probability tables to comply with Korean loot-disclosure law; exact 8-tier % breakdown per stat was not fully extractable from the fetched pages — flagged **UNVERIFIED at per-tier-% granularity**, only the qualitative skew is confirmed). Flat DEF/ATK 4-tier chances found for one stat: **18.52% / 44.45% / 26.38% / 10.36%** (non-monotonic — treat with caution, single-source, UNVERIFIED against official disclosure).

Minor cross-source disagreement flagged: Basic/Heavy/Skill/Liberation DMG-bonus caps are reported as either uniformly 11.6% or (Basic specifically) 12.4% depending on source/summarizer — treat the 12.4% figure for Basic ATK DMG Bonus as the majority reading but **verify against current-patch in-game data** before using in a precise model.

### 2.2 Ordinal priority lists (Prydwen-style), concrete character examples

| Character | Role | Substat priority (highest→lowest) |
|---|---|---|
| **Carlotta** | Main DPS (Glacio, Skill-scaling) | ER (until ~120–125% breakpoint) → CR = CD → ATK% > Skill DMG% > flat ATK |
| **Camellya** | Main DPS (Havoc, Basic Attack-scaling) | Basic ATK DMG% (near-BiS) → CR = CD → ATK% → just enough ER for comfortable rotation |
| **The Shorekeeper** | Support/Healer (Amplify-Concerto-heavy) | ER (until 250% team target) → CD → Liberation DMG% → HP% → CR → ATK% |
| **Verina** | Healer | ER (180–220% total) → Healing Bonus (4-cost main) → HP% |
| **Iuno** | Hybrid buffer/sub-DPS | ER (until satisfied) → CR = CD → Liberation DMG% ≥ ATK% → flat ATK |
| **Yinlin** | Sub-DPS (off-field burst) | CR, CD, ATK%, then ~20–30% ER for burst uptime (sources vary 20–30% vs ~120% depending on rotation length — treat as build-dependent, not a fixed constant) |

**General DPS hierarchy** (Prydwen's stated universal ordering): `ER (until satisfied) > CR = CD > ATK% > flat ATK ≥ Basic Attack DMG% > Resonance Skill DMG%` — i.e., ER is a *gate* stat (binary: enough or not), CR/CD are always co-equal top priority once ER is met, and the specific "type" DMG% bonus (Basic/Heavy/Skill/Liberation) that matters is whichever the character's kit actually scales off — a generic DPS gets little value from the "wrong" type bonus, so weight tables must be per-kit, not universal.

### 2.3 Set-bonus constraint on cost allocation
- Common configuration: **4/3/3/1/1 = 12 cost**, unlocked at Data Bank level 9 (max cost cap).
- Reasoning: 4-cost echoes carry the strongest bonuses/kit-defining main stats but are expensive → use exactly one; 3-cost echoes give the best cost-efficiency for elemental/attack-type main stats → use two; 1-cost echoes are cheap flat-stat/ATK% fillers → use two.
- Sonata (echo set) bonuses: **2pc** = flat elemental DMG% (usually +10%), **5pc** = conditional/stacking bonus triggered by specific actions (e.g., Glacio Sonata 5pc: +10%/stack up to 3 stacks over 15s from Basic/Heavy Attacks; Fusion Sonata 5pc: Skill triggers +30% Fusion DMG for 15s). Some sets cap effective bonus at 3pc.
- **Hard constraint**: echoes with an identical name equipped simultaneously **do not double-count toward the Sonata set bonus** — effectively you need 5 *uniquely named* echoes to trigger a 5pc bonus (owning duplicates is fine for inventory/farming but useless for set-completion in the optimizer's constraint model).

---

## 3. Full Damage Formula (community-reverse-engineered, Fandom wiki + wutheringwaves.gg)

### 3.1 Formula chain
```
Final DMG = Base DMG × Resistances × Bonuses
```

**Base DMG:**
```
Base DMG = Base Ability DMG + Flat DMG + %Flat Bonus
Base Ability DMG = Ability Attribute (ATK, or HP/DEF for specific kits) × %MV   (MV = Motion Value / skill multiplier)
ATK_total = (Base ATK_character + Base ATK_weapon) × (1 + %ATK bonuses) + Flat ATK bonuses
```

**Resistances:**
```
Resistances = RES_Multiplier × DEF_Multiplier × DMG_Reduction_Total × Elem_Reduction_Total
```

- **DEF Multiplier:**
```
Enemy DEF = 8 × LVL_enemy + 792
%DEF = (800 + 8×LVL_attacker) / (800 + 8×LVL_attacker + DEF_target × (1 − DEF_Ignore_target))
```
DEF% is capped at 200% (i.e., enough DEF-ignore can flip this multiplier to be damage-*positive* beyond parity). At equal level, this averages to roughly **~49–53% multiplicative reduction** (i.e., ~0.49–0.53×), commonly cited as "≈52% DEF reduction at same-level bracket."

- **RES Multiplier (piecewise, non-linear):**
```
RES_total = enemy base RES (typically 10%) − attacker RES Penetration (for matching element)
if RES_total < 0:        RES_Multiplier = 1 − RES_total/2
if 0 ≤ RES_total < 0.8:  RES_Multiplier = 1 − RES_total
if RES_total ≥ 0.8:      RES_Multiplier = 1 / (1 + 5×RES_total)
```
At the standard 10% base RES with no penetration, RES_Multiplier ≈ 0.90 (≈10% reduction, matches the commonly cited "~33.3%"... actually the 33.3% figure from wutheringwaves.gg appears to describe a *different* enemy-type baseline; treat the exact base-RES-by-enemy-type figure as **partially UNVERIFIED / enemy-dependent**, the piecewise formula itself is confirmed).

**Bonuses:**
```
Bonuses = %DMG_Bonus × DMG_Amplify × %Special_DMG × Crit_Multiplier
%DMG_Bonus = 1 + (sum of all additive DMG Bonus%: elemental DMG%, attack-type DMG% [Basic/Heavy/Skill/Liberation], buffs, etc. — all summed together additively within this bracket)
```
- **DMG Amplify (formerly "Deepen", relabeled for clarity in a past patch):**
```
DMG_Amplify_Total = 1 + (DMG_Amplify_Target + DMG_Amplify_Attacker)
```
Independent multiplicative bracket from `%DMG_Bonus` — this is the mechanical reason "several smaller multiplicative bonuses beat one large additive bonus": e.g., 30% in `%DMG_Bonus` and 30% in `DMG_Amplify` (two separate brackets) = 1.30 × 1.30 = **1.69× (+69%)**, not a naive +60%.
- Sourced from **Outro Skills** specifically (this is the "each character switch applies a buff to the next character" rotation mechanic): e.g., Verina's *Blossom* (+15% team DMG Amplify, 30s), Shorekeeper's *Binary Butterfly* (+15%), Mornye's *Recursion* (+25%), Buling's *Exorcism Spell* (+15%). Multiple Outro-sourced Amplify sources from **different characters in the same rotation window are additive with each other** inside the `DMG_Amplify_Total` bracket (confirmed only for co-op/multi-source stacking scenarios — solo play generally only stacks one Outro's Amplify at a time due to rotation cadence).
- **Crit Multiplier:**
```
Crit hit:      × (1 + CD%)   [applies CD as bonus over 100%]
Non-crit hit:  × 1
Average DMG  = DMG × CR% × (1+CD%)  +  DMG × (1 − CR%)
```
Base values: **Crit Rate = 5.0%**, **Crit DMG = 150.0%** (i.e., +150% bonus, so a base crit hit = 2.5× a non-crit hit) before any substats/buffs.

### 3.2 Why this matters for optimization vs. simple weighted-score models
A pure CV/weighted-substat score assumes each stat's marginal value is constant and additive. The real formula shows two nonlinearities a serious damage-model must capture:
1. **CR×CD is a product term**, not additive — hence the 1:2 ratio derivation, and why "CV" (a linear combination) is only a *first-order approximation* good near the 1:2 ratio; it under/overrates builds far from that ratio.
2. **DMG Amplify, %DMG Bonus, DEF-mult, RES-mult are separate multiplicative brackets** — a full damage model must multiply these brackets independently rather than summing everything into one additive bonus pool, or it will systematically underestimate multi-bracket investment (the 69% vs 60% example).

---

## 4. Combinatorial Optimization: Selecting 5 Echoes from N

### 4.1 Problem formalization
This is a **constrained combinatorial selection problem**, structurally a **multi-choice, multi-dimensional knapsack** with a non-separable (non-linear) objective:
- **Decision variables:** choose 1 echo per slot × 5 slots (slots are typed by cost-class: must pick from {1-cost pool}, {3-cost pool}, {4-cost pool} echoes, respecting the chosen cost distribution e.g. 4/3/3/1/1).
- **Constraint:** `Σ cost_i ≤ 12` (hard cap; in practice cost distribution is usually fixed by convention rather than searched, reducing the search space).
- **Non-linear objective coupling:** the Sonata 2pc/5pc bonuses depend on the *combination* of which named echoes are picked (their sonata-set membership), not on any single echo in isolation → the objective function `Damage(echo1..echo5)` is not separable per-slot; you cannot simply pick the best echo per slot independently, because doing so may break a 5pc bonus worth more than the sum of 5 independently-optimal-but-mismatched echoes.
- **No-duplicate-name constraint** for full set credit (see §2.3).

This combinatorial structure (multi-dimensional knapsack + combinatorial bonus for subset membership) is **NP-hard in general** (multi-dimensional knapsack is a classical NP-hard problem; adding the non-separable set-bonus term only compounds this).

### 4.2 How real tools handle it in practice
- **WuwaOpt (GitHub, EMCJava/WuWaOpt)** — the only open-source WuWa-specific optimizer found with disclosed method: core loop `WuWaGA::Run`, naming implies a **Genetic Algorithm** (population-based heuristic search, not exact branch-and-bound). Project unmaintained since WuWa 2.1; exact fitness function / crossover-mutation design not documented in the README.
- **Genshin Optimizer (frzyc/genshin-optimizer)** — the reference implementation the user asked about by analogy. Confirmed from repo: runs its solver **client-side in a Web Worker** (parallelism for UI responsiveness), uses a calculation engine (legacy "Waverider", newer "Pando"). The repo's own README/issue tracker did **not** yield an explicit, quotable description of the exact pruning algorithm in the content retrievable here — the commonly-understood approach (well-established in the artifact-optimizer genre, though not independently re-confirmed line-by-line in this session) is:
  1. Enumerate/bucket artifacts **per slot independently** first (5 independent small lists instead of one N^5 space).
  2. Separate stats into "linear/additive" (safely summable across slots for a fast upper-bound estimate) vs. stat combinations that need the full nonlinear formula (crit terms, set bonuses) evaluated only on surviving candidates.
  3. Use the additive upper bound to **prune** slot-combinations that can't possibly beat the current best-found score before paying the cost of the full nonlinear evaluation — this is the "branch-and-bound"-flavored optimization mentioned in the brief, applied as a filter rather than a classic tree-search B&B.
  4. Set bonuses are handled by **outer-looping over feasible set-signature combinations** (e.g., "5pc SetA," "2pc SetA + 2pc SetB + 1 off-piece," etc.) and running the slot-optimization *inside* each signature, since fixing the signature restores separability.
  *(Flagging: point 2–4 is the standard, well-known design pattern in this class of tool rather than a verbatim-confirmed quote from the fetched pages this session — treat the general shape as reliable, the specific implementation detail as reasoned-but-not-independently-re-verified this session.)*
- Practical simplification nearly all community tools converge on regardless of exact algorithm: **fix cost distribution (e.g., 4/3/3/1/1) and main stats first** (main stats are drastically higher-impact and far fewer in number than substat rolls), then optimize substats only across a pre-filtered shortlist (e.g., top-K by CV or role-score per slot) rather than the full inventory — this alone collapses the practical search space by orders of magnitude versus true brute force.

### 4.3 Multi-character assignment (each echo usable by only one character)
This is the **Generalized Assignment Problem (GAP)** — not the simple linear assignment problem the Hungarian algorithm solves:
- **Hungarian algorithm** solves the special case: N agents, N tasks, 1-to-1 bipartite matching, purely additive value, no side constraints — it does **not** natively handle (a) an agent (character) needing a *set* of 5 items with a cost cap and non-separable set-bonus objective, or (b) items (echoes) being usable by only one agent among many possible agents. Applying it directly would require collapsing each character's entire 5-echo *build* into a single scalar "value" per candidate assignment — feasible only if you first solve each character's own 5-echo sub-problem (§4.1) for every plausible echo pool subset, which is itself expensive.
- The mathematically correct general formulation is a **Generalized Assignment / Multiple Knapsack Assignment** (assign items to bins with bin-specific capacity and value functions, each item to at most one bin) — this is **NP-hard**, and exact solving at meaningful N (dozens of echoes × 6–8 characters) is impractical without an ILP solver (e.g., formulate as an Integer Linear/Mixed-Integer Program and hand to a solver like CBC/Gurobi) or a well-tuned metaheuristic (genetic algorithm, simulated annealing — consistent with WuWaOpt's apparent approach).
- **No evidence found** that any public WuWa community tool (WuwaBuilds, wutheringtools.com, wuwa-optimizer.com) implements a true joint multi-character solver. Observed pattern instead: **per-character sequential/greedy optimization** with a manual "lock/exclude echoes already used by another character" toggle — i.e., the user (or a priority ordering: build main DPS first, then sub-DPS, then support) manually serializes what is formally a joint combinatorial problem into independent single-character problems solved in sequence. This is explicitly a heuristic approximation, not an optimal solution, and should be marked **UNVERIFIED / not solved exactly by any tool found**.

---

## 5. Score Normalization & Tuning Investment Decisions

### 5.1 Roll-efficiency normalization
Standard technique across tools (wuwa.uk, generically all CV-based sites): for each substat, compute
```
roll_efficiency = rolled_value / max_possible_value_for_that_substat   (∈ [tier1/tier8, 1.0])
```
then aggregate (weighted sum, §1.2) and express as a **percentile against a theoretical-max 5-substat echo** (the wuwa.uk 0–100 normalization). This is functionally identical to Genshin's "roll value"/"crit value %" concept.

### 5.2 Tuning mechanics & the "keep tuning vs. reroll" decision
- Substats unlock progressively: **+5, +10, +15, +20, +25** (5-star echo, max 5 substats total); lower-rarity echoes cap earlier with fewer slots (e.g., a 4-star echo maxing at +20 only ever gets 4 substats).
- Tuner rarity must match echo rarity (Medium/Advanced/Premium Tuner for 3★/4★/5★); a 5:1 downgrade-tuner synthesis exists.
- Each new level's substat is drawn **randomly from the remaining substat pool** (13 possible types minus the echo's main stat type minus any already-rolled substats), with the **specific value tier** drawn from a skewed 8-tier distribution (low tiers ≈2.5× more likely than the top tier).
- **Main stat is fixed at drop and never changes via tuning** — this is the single most important fact for the EV decision.

**Expected-value framework for "should I keep tuning this partial echo?"**

Let an echo have `k` of 5 substats already unlocked, of which `g` are priority ("good") stats for the target build, and let the *remaining* substat pool contain `g_rem` good types out of `p_rem` total remaining possible types. For each additional tuning level:
```
P(next roll is a "good" stat)  ≈ g_rem / p_rem
E[incremental score]           ≈ P(good) × E[value | good, tier-weighted] × weight
```

The decision rule the community has converged on (gamefaqs "leveling echoes with math" thread; consistent with standard sunk-cost-fallacy logic):

> **Continue tuning iff (a) the main stat is correct for the build, AND (b) at least one already-rolled substat is a priority stat.** Otherwise, abandon and re-farm.

Why this is the *correct* EV logic and not just a rule of thumb:
- Resources already spent (tuners used for levels 1..k) are **sunk cost** — irrelevant to a forward-looking decision.
- The only forward-looking comparison that matters is: `cost(finish this echo: 5−k more tuners)` vs. `cost(farm+tune a brand-new echo from level 0: 5 tuners + a fresh domain/boss run)`. Since finishing an already-partial echo is **always cheaper on the margin** than starting over (fewer remaining tuners needed, zero additional farming), it is *almost always* +EV to finish tuning **once the immutable main stat is confirmed correct** — the marginal tuner cost is small relative to the marginal probability-weighted score gain, and there is no cheaper alternative path to a same-or-better main-stat echo other than accepting the RNG on a fresh drop (which costs strictly more resources up front).
- Conversely, if the **main stat is wrong**, no amount of substat tuning fixes that immutable field, so continuing has a hard ceiling regardless of substat luck — hence "re-farm only if the main stat itself is wrong" is the correct cut rule, and abandoning-for-two-dead-substats-before-level-15 is a secondary heuristic addressing diminishing `g_rem/p_rem` (once 2 of your ≤5 slots are "dead," the achievable ceiling score for the remaining slots is capped even under perfect RNG).

### 5.3 Practical interpretation thresholds observed across tools
| Metric | Threshold | Meaning |
|---|---|---|
| CV (half-scale) | ≥ 20 from substats alone | High-tier/endgame echo |
| wuwa.uk normalized score | > 70 ("A" grade) | Worth leveling to +25 |
| Substat count | ≥3 useful / 5 with ≤2 "dead" (excluding ER on supports) | Generally acceptable to keep tuning |
| Main stat | Must match role | Non-negotiable — cannot be changed by tuning |

---

## Sources

- [WuWa Crit Value Calculator — nkbgaming.com](https://nkbgaming.com/games/tools/crit-value-calculator-wuwa)
- [Wuthering Waves Sub-Stats Guide: 1:2 Crit & Min-Maxing — buffget.com](https://buffget.com/news/wuthering-waves-sub-stats-guide-12-crit-and-min-maxing)
- [WuWa Crit Rate vs Crit Damage — The 1:2 Ratio Explained — gamemarket.gg](https://gamemarket.gg/news/wuthering-waves/wuwa-crit-rate-vs-crit-damage-the-1-2-ratio-explained)
- [Wuthering Waves Echo Scorer — wuwa.uk/echo-scorer](https://wuwa.uk/echo-scorer)
- [Wuthering Waves Echo Main Stats Guide — wuwa.uk](https://wuwa.uk/articles/echo-main-stats-guide)
- [WuwaBuilds — wuwa.build/builds](https://wuwa.build/builds)
- [Echoes Stats — Prydwen.gg](https://www.prydwen.gg/wuthering-waves/guides/echo-stats)
- [Echoes Sets — Prydwen.gg](https://www.prydwen.gg/wuthering-waves/guides/echo-sets)
- [Carlotta / Camellya / Shorekeeper / Verina / Iuno / Yinlin build guides — Prydwen.gg](https://www.prydwen.gg/wuthering-waves)
- [Damage — Wuthering Waves Wiki (Fandom)](https://wutheringwaves.fandom.com/wiki/Damage)
- [DMG Amplify — Wuthering Waves Wiki (Fandom)](https://wutheringwaves.fandom.com/wiki/DMG_Amplify)
- [Crit. DMG — Wuthering Waves Wiki (Fandom)](https://wutheringwaves.fandom.com/wiki/Crit._DMG)
- [Echo/Stats — Wuthering Waves Wiki (Fandom)](https://wutheringwaves.fandom.com/wiki/Echo/Stats)
- [Echo/Leveling — Wuthering Waves Wiki (Fandom)](https://wutheringwaves.fandom.com/wiki/Echo/Leveling)
- [Damage Calculation Guide — wutheringwaves.gg](https://wutheringwaves.gg/damage-calculation-guide/)
- [Echo Stats Guide and Full List — wutheringwaves.gg](https://wutheringwaves.gg/echo-stats/)
- [All Echo Stats and Substats — Game8](https://game8.co/games/Wuthering-Waves/archives/456278)
- [How to Tune Echoes — Game8](https://game8.co/games/Wuthering-Waves/archives/456455)
- [Best Echo Cost Build Configurations — Game8](https://game8.co/games/Wuthering-Waves/archives/454121)
- [Wuthering Waves Echoes Complete Guide — Mobalytics](https://mobalytics.gg/blog/wuthering-waves/echoes-complete-guide/)
- [A guide to leveling echoes (with math) — GameFAQs](https://gamefaqs.gamespot.com/boards/403983-wuthering-waves/80821568)
- [Echo Stat manipulation *Must Read* — GameFAQs](https://gamefaqs.gamespot.com/boards/403983-wuthering-waves/80912591)
- [Wuthering Insight (community datamine tool)](https://christopherklay.github.io/WutheringInsight/)
- [GitHub — EMCJava/WuWaOpt](https://github.com/EMCJava/WuWaOpt)
- [GitHub — frzyc/genshin-optimizer](https://github.com/frzyc/genshin-optimizer)
- [Wuthering Waves Calculator & Optimizer — wutheringtools.com](https://www.wutheringtools.com/)
- [Wuthering Waves Optimizer — wuwa-optimizer.com](https://wuwa-optimizer.com/echoes)

**Items explicitly marked UNVERIFIED in this report:** exact per-tier (1–8) roll-probability percentages for each substat type; wuwatracker.com and encore.moe scoring formulas; exact numeric weight tables for wuwa.uk's "Liberation DPS / Heavy Attack DPS / Sub-DPS-Buffer" presets; base-RES-by-enemy-type figure (10% vs. cited "33.3%"); Basic Attack DMG Bonus% max (11.6% vs 12.4% conflicting sources); flat ATK max (60 vs. 70 conflicting sources); existence of any tool performing exact joint multi-character ILP/Hungarian-style assignment (none found — all observed tools use per-character sequential/manual-exclusion heuristics).