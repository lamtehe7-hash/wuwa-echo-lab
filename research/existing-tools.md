# Wuthering Waves Echo Optimization Tooling Landscape — Research Report
*Compiled July 13, 2026. Game version context: Wuthering Waves 3.5 (live since July 10, 2026).*

---

## 1. Executive Summary

The Wuthering Waves (WuWa) echo-optimization tool ecosystem is **fragmented, hobbyist-driven, and immature** compared to Genshin Impact's. There is no single tool that plays the role Genshin Optimizer plays for Genshin — i.e., "import my entire echo vault once, then compute the mathematically optimal echo assignment for every character in my roster simultaneously, based on a real simulated damage rotation." Instead the space splits into five non-overlapping tool categories (web scorers, single-character heuristic optimizers, OCR/data-scanners, reforge/RNG simulators, and gameplay-automation bots), most maintained by a single hobbyist developer, with high churn (several notable tools archived/discontinued within the last 12 months) and duplicated OCR-extraction effort. Kuro Games itself shipped a native "Echo Management Plan" system (v3.2, auto-lock/discard by main-stat + Sonata Set rule, shareable plan codes) that has partially eaten into the low-end "which echoes are trash" use case, pushing surviving third-party tools toward substat-scoring and leaderboard comparison rather than full optimization.

---

## 2. Web Apps

| Tool | URL | Status (Jul 2026) | Core function |
|---|---|---|---|
| WuWa Tracker | wuwatracker.com | Active, v4.0-beta shipped | Pull/pity tracker, Ascension Planner, achievements, guides |
| WuWaBuilds → wuwa.build | wuwabuilds.moe (redirects 308 → wuwa.build) | Active, daily commits | Build editor, OCR import, damage leaderboards |
| Prydwen Institute | prydwen.gg/wuthering-waves | Active (wiki) | Static tier lists & echo-stat priority guide |
| Wuthery | wuthery.com | Active (infra-focused) | Community data hub; backing GitHub org builds APIs, not an optimizer |
| Encore | encore.moe | Active | Nuxt+Tailwind game database/wiki (echoes, characters), no scoring |
| WutheringTools | wutheringtools.com | Active | Damage calculator + optimizer, also runs as a Discord bot |
| WuWa Tools | wuwa.uk | Active | 5 chained tools incl. "Echo Scorer" |
| Wuthering Waves Optimizer | wuwa-optimizer.com | Uncertain backend status | One-click OCR import of char/weapon/echo, echo evaluation, build compare |
| TheWuWaCalculator | thewuwacalculator.com | UNVERIFIED (SPA, fetch blocked) | Claims damage calculator + build optimizer + team planner |
| WUWAFLEX | wuwaflex.com | UNVERIFIED (SPA, fetch blocked) | Appears repeatedly in search; content unconfirmed |
| Echo Value Calculator (EVC) | echovaluecalc.com | Active, v4.1, pushed Jul 12 2026 | Echo/build scoring formula; de facto community reference standard |
| Wuwa Toolkit | (self-hosted, GitHub only) | Active, pushed Jul 8 2026 | Self-hosted Docker app: OCR scoring (via EVC 3.2), convene tracker, build tracker |

### Detailed profiles

**wuwatracker.com (WuWa Tracker)**
- Platform: web app (site itself returned HTTP 403 to automated fetch — Cloudflare-protected; details below via secondary sources).
- Features confirmed via search/companion tools: pull/pity counter with global luck stats, Ascension Planner & material calculator, achievements tracker, guides/wiki, v4.0-beta added UI revamp, email linking, DB backups, blogging.
- Echo import: the companion scanner **Psycho-Marcus/WuWa_Inventory_Kamera** (GPL-3.0, Python, 28★, last pushed Sep 2025) explicitly formats scan output "for WuWa Tracker, facilitating importing data" — meaning WuWa Tracker's echo ingestion is powered by a third-party OCR tool, not a first-party scanner.
- Open source: the WuWa Tracker web app itself — UNVERIFIED (no public repo found); only its companion scanner is OSS.
- Strength: broadest all-in-one companion app (pulls + planner + achievements). Weakness: no confirmed dedicated echo-scoring/optimizer feature distinct from the planner; core echo-scoring value proposition unclear vs. competitors.

**WuWaBuilds / wuwa.build**
- Platform: Next.js 16, React 19, TypeScript 6, Tailwind CSS 4 (frontend, `DommyMM/wuwabuild`), FastAPI + RapidOCR Python backend (`DommyMM/wuwa-ocr`, GPL-3.0), separate Go leaderboard service.
- Import: upload the official Discord-bot-generated 1920×1080 "wuwa-bot" screenshot; frontend crops fixed regions (character/weapon/echoes/forte/sequences/watermark) and posts each in parallel to the OCR API with per-field confidence scores.
- Scoring: **Crit Value (CV) = CritRate×2 + CritDMG**, used purely for leaderboard ranking/comparison (63,040+ archived builds across 64 boards, standardized rotations, ER-breakpoint-aware), not for cross-character allocation.
- Open source: yes — `DommyMM/wuwabuild` (5★) and `DommyMM/wuwa-ocr` (9★, formerly `wuwa-ocr-api`), both actively pushed July 12, 2026 (i.e., updated same week as this report).
- Strength: most actively developed, most complete OCR pipeline, largest public build/leaderboard dataset. Weakness: it is a **comparator/leaderboard**, not an assignment optimizer — it grades a build you already made against others; it does not compute the best allocation from your vault.

**Prydwen Institute (prydwen.gg)**
- Platform: static wiki/guide site (not interactive).
- Content: Echo Stats guide — Cost-1 echoes always have flat HP as 2nd main stat; Cost-3/4 echoes always have flat ATK; up to 5 substats per echo, unlockable one per 5 levels to a max of 5 at level 25. Per-character build pages (weapon/echo/stat priority) for every playable resonator.
- Not a calculator/optimizer — pure reference content, most useful as ground-truth for what "optimal substats" mean, which other tools then encode as scoring weights.

**Wuthery (wuthery.com + github.com/Wuthery)**
- The GitHub org builds infrastructure, not an optimizer: `kuro.py` (Python KuroBBS API wrapper, 26★), `WuWaImaGen.py` (image-card generator, 8★), `spectrum`/`spectro-pcap-server` (Rust game-packet parsers, 5★/1★), `Localizator`. None of these compute echo scores or optimal builds — they're plumbing other tools could consume.

**Encore (encore.moe)**
- Nuxt + Tailwind CSS database/wiki. Echo section offers filtering by Sonata Set and a "include Phantoms" toggle but is a browsing/reference database, not a scorer or optimizer.

**WutheringTools (wutheringtools.com)**
- Damage calculator + optimizer; distinguishing feature is a **Discord bot** interface alongside the web app (supported via the official WuWa Discord and a dedicated WutheringTools Discord). Deep content fetch blocked (403); feature depth beyond "damage calc + optimizer" UNVERIFIED.

**WuWa Tools (wuwa.uk)**
- Five chained tools: Pull Calculator/Banner Planner (Astrite budgeting, 80-pull safety reserve, 50/50 math), Material Planner, **Echo Scorer**, Event Calendar, Weapon Compare, Build Card generator.
- Echo Scorer method: score each substat's proximity to its max roll, apply **role-specific weight** from 5 presets (Crit DPS / Liberation DPS / Heavy Attack DPS / Sub-DPS-Buffer / Healer), normalize to a 0–100 scale against the theoretical best 5-substat combo (70+ = "A/level it," 60+ = "B/situational"). Manual substat entry only — **no OCR/import** confirmed.
- Explicitly privacy-first / client-side only ("all calculator inputs stay in your browser"). Open-source status UNVERIFIED.

**Wuthering Waves Optimizer (wuwa-optimizer.com)**
- Claims: one-click OCR import of characters/weapons/echoes from a screenshot, per-character build creation/comparison, echo evaluation, damage-maximizing calculator.
- GitHub backend: search results pointed to `Mikyan0207/wuwa-optimizer`, but as of this research date **that repository returns HTTP 404** (deleted, renamed, or made private) — current open-source status is **UNVERIFIED**. Several unrelated same-named repos exist by other authors (`nfapriyanto/wuwa-optimizer`, `Serdok/wuwa-optimizer`, `DhruvJ12421/WuWa-Optimizer`, `migouche/WuWa-Optimizer`) with 0–1 stars each and no confirmed relationship to the live site.

**TheWuWaCalculator.com / WUWAFLEX.com**
- Both surface repeatedly in search as damage calculator / build optimizer products, but both are JavaScript SPAs that returned empty/title-only content to automated fetch. Feature claims for these two are **UNVERIFIED** beyond marketing copy ("damage calculator, build optimizer, team planner").

**Echo Value Calculator — EVC (echovaluecalc.com, by AstyuteChick)**
- Now at version 4.1 (project also referenced as "EVC 3.2" by dependents as of earlier 2026). Methodology: computes an average-roll damage delta per substat type at a reference build state, uses the highest-value stat as the normalization baseline, scores every other stat relative to it; explicitly models **Energy Recharge** intelligently — excess ER beyond a target is discounted, processed left-to-right across a 5-echo build so each echo's marginal score depends on the others already counted.
- Distinctive because it has become a **de facto shared scoring backend**: `MinhBN-dev/wuwa-toolkit` explicitly calls the "EVC 3.2 formula" via API rather than re-implementing scoring — the closest thing the WuWa community has to a shared standard (analogous to Genshin's community "Crit Value").
- License: custom "EVC License v1.0," **non-commercial use only** — source at `AstyuteChick/Echo-Value-Calculator` (renamed from `-OLD-Echo-Value-Calculator`), actively pushed July 12, 2026, hosted via PythonAnywhere.
- Weakness: single-echo/single-build scorer, not a full-inventory multi-character optimizer.

**Wuwa Toolkit (MinhBN-dev, self-hosted only, no public hosted instance found)**
- Stack: Python 3.12 + FastAPI + async SQLAlchemy + PostgreSQL 16 backend; React 18 + TypeScript + Vite + Tailwind 3 frontend; Docker Compose deployment.
- Features: screenshot OCR via local EasyOCR (with Gemini/OpenAI/Anthropic as optional cloud fallbacks), echo scoring via the EVC 3.2 formula with tier labels ("Godly" → "Unbuilt"), **full 5-echo-set scoring in one call sharing an ER budget**, per-character echo library with tier/character filters, named "sets" saved per resonator, build-status tracker (Built/Building/Not Built), and an oversea convene/pull tracker with 50/50 win-rate stats.
- Actively developed (pushed July 8, 2026) but 0 GitHub stars — essentially unknown/low-adoption despite reasonably sophisticated architecture; self-hosted-only distribution likely caps its reach.

---

## 3. Damage Calculators

| Tool | Format | Notes |
|---|---|---|
| Maygi's Calculation Corner (maygi.cc) | Hub page + linked Google Sheets/spreadsheets | Well-cited theorycrafting resource, referenced across multiple 2025–2026 YouTube deep-dives ("Jinhsi Optimized," "Xiangli Yao TLDR," "Simple Builds explained with Simple Math"). Direct content fetch blocked (403); reputation/citation trail is strong but exact current sheet links are **UNVERIFIED** via direct access. |
| thewuwacalculator.com | Web SPA | Claims damage calc + build optimizer + team planner; content **UNVERIFIED** (fetch blocked). |
| wutheringtools.com | Web + Discord bot | Damage calculation + optimizer; deeper mechanics **UNVERIFIED** (403 on fetch). |
| wutheringwaves.gg/damage-calculation-guide | Educational article | Explains the damage formula conceptually; not an interactive calculator. |

No equivalent was found to a single canonical, universally-cited "the" WuWa damage-calc Google Sheet the way Genshin has KQM/community formula sheets — the space is split between Maygi's resources and several web apps making overlapping claims.

---

## 4. GitHub Repository Landscape

### 4a. Echo build optimizers (recommend which echoes to equip)

| Repo | Stars | Lang | Status | Method |
|---|---|---|---|---|
| `EMCJava/WuWaOpt` | 72 | C++ | **Archived**, unmaintained since patch 2.1 | Genetic algorithm (`WuWaGA::Run`); paired OCR scanner requiring admin rights, 100% display scaling, Simplified Chinese UI only |
| `Hung1510/Tethys` | 0 | Rust | Active, created Jul 4 2026, last push Jul 11 2026 | Explicitly positions itself as WuWaOpt's successor. Screen-capture OCR (native Windows OCR or Tesseract) → genetic + exhaustive solvers for the fixed 4-3-3-1-1 cost layout, respects set bonuses/main-stat prefs, CLI + egui GUI, prebuilt Windows binary. **Damage-formula evaluator explicitly listed as "roadmap" (not built)** — currently a substat-weight heuristic, not a true rotation-damage simulator. Single character per run. |
| `ryanbenson/wuthering-waves-optimizer` | 8 | TypeScript | Active, pushed Jul 11 2026 | Vue 3 + Tailwind + DaisyUI web app; CLI pipeline that **scaffolds real per-character damage-model code** (attacks, buffs, resonance-chain, forte data) directly from live game data, plus an echo-preset generator. Architecturally the closest analog to Genshin Optimizer's per-character damage-engine approach found in this survey — but still early/WIP per its own project board. |
| `2-07665/ww-echo-policy-calculator` | 9 | Rust | **Archived** | Dynamic-programming solver for the optimal echo tuning/reroll (tuner) policy — solves "should I keep rerolling," not "who should wear this echo." Ships a Tauri 2 desktop app; integrates with `ok-oldking/ok-wuthering-waves` for OCR input. Predecessor: `2-07665/WuwaEchoTool` (JS, 0★, last commit Feb 2026). |
| `Elypha/EchoSolver` | 0 | C# | Inactive since single-day commit burst Feb 7 2026 | "High performance echo tuning strategy simulator" — minimal README, appears to be another reroll-policy simulator, not a build assignment tool. |
| `Mikyan0207/wuwa-optimizer` (backs wuwa-optimizer.com) | — | — | **Repo not found (404) as of Jul 2026** | Presumed deleted/privatized; site is still live, so it may have moved to a private repo or a different backend entirely. |

### 4b. Single-echo / single-build scoring calculators

| Repo | Stars | Lang | Status | Notes |
|---|---|---|---|---|
| `AstyuteChick/Echo-Value-Calculator` | 1 | HTML | Active, pushed Jul 12 2026 | Backs echovaluecalc.com; de facto reference formula (EVC) reused by other projects; non-commercial custom license |
| `WhisperingSea/Waves-EchoScorer` | 1 | TypeScript | Stale since Jan 18 2026 | Live at whisperingsea.github.io/Waves-EchoScorer |
| `Arfoire/Echo-Worth-Calculator-for-Wuthering-Waves` | 1 | HTML/JS | Stale since Nov 2025 | Computes the **marginal damage value** a single echo's substats add for a chosen character+team — conceptually the closest single-echo tool to a "true" damage-weighted score, but evaluates one echo at a time, not a full inventory |
| `Erensia/Wuthering-Waves-Echo-Substat-Calculator` | 1 | Java | Active, pushed Jul 7 2026 | Very new, narrow scope |
| `Yuu1202/wuwa-echo-manager` | 0 | JavaScript | Dead — 1-day dev burst Feb 18–19 2026 | Ranks echoes to flag "trash" |
| `ChristopherKlay/WutheringInsight` | 0 | JavaScript | **Discontinued** — explicit "Project Closure" notice in README citing community toxicity/predatory-behavior concerns as the reason the developer stepped away | Formerly scored echoes via crit value + per-character weighted stats + roll probability, using only Discord-bot showcase exports (zero game-access risk design) — a notable case study in solo-maintainer burnout |
| `f4sT357/wuwacalc1.1` | 0 | Python | Active, pushed May 1 2026 | Japanese-market echo score calculator with OCR |

### 4c. OCR / inventory-scanning tools (data extraction only — feed other tools)

| Repo | Stars | Lang | Status | Notes |
|---|---|---|---|---|
| `DommyMM/wuwa-ocr` (formerly `wuwa-ocr-api`) | 9 | Python | Active, pushed Jul 12 2026 | FastAPI + RapidOCR backend for wuwa.build; GPL-3.0 |
| `Psycho-Marcus/WuWa_Inventory_Kamera` | 28 | Python | Semi-stale, last push Sep 2025 | Scans char/weapon/echo/items/achievements from the game window into JSON; named after (and inspired by) Genshin's Inventory Kamera; feeds WuWa Tracker imports; GPL-3.0 |
| Assorted new/duplicative scanners | 0 each | Python/TS | Several created Jun–Jul 2026 | `lhs1205/wuwa_echo_extractor`, `yuchao12315/wuthering-waves-echo-ocr-scanner`, `Anyuluo996/WutheringWaves-Echo-OCR` — independent, low-adoption, largely duplicate the same OCR-extraction problem with no shared schema |

### 4d. Reforge/tuner RNG simulators (adjacent, not build optimizers)

`sideriver81/wuwa-echo-simulator` (active Jul 12 2026), `Parksan404/wuwa-echo-sim` (active Jul 8 2026, exact-math + Monte Carlo), `kurateh/wuwa-echo-substat-simulator` (2025), `blin03/ww-echo-sim` (2025), `Pengibaby/Wuthering-Waves-Echo-Upgrade-Simulator` (2025) — all solve "what's my probability/cost of reaching target substats via tuners," a **different problem** from "which echo should this character wear." The community has independently re-solved this narrow problem at least five times with no convergence on one canonical tool.

### 4e. Automation/farming bots and gray-area tools (flagged — NOT optimizers, ToS-risk category)

| Repo | Stars | Notes |
|---|---|---|
| `ok-oldking/ok-wuthering-waves` | **6,750** | By far the highest-starred WuWa-adjacent repo on GitHub; background auto-combat/auto-echo-farming automation ("后台自动战斗 自动刷声骸"), AGPL-3.0, actively updated Jul 12 2026. Gameplay macro/automation, not a damage optimizer — using it risks account action under Kuro's ToS. |
| `Hashiao/wuwaBackendTool` | 169 | Described as a "backend tool to help you get echoes" — an automation tool for farming echoes, not a build scorer; GPL-3.0, last push Jun 2025 (stale). |
| `Avenuegrochain/Wuthering-Waves-Cheat` | 13 | Explicitly labeled a "cheat" — map radar, echo tracker, route optimizer, performance panel; likely a memory-reading/overlay tool. Treat as unverified/risky, not a legitimate optimizer. |
| `venoyxi80edellin/EchoDrift` | 0 | "Wuthering Waves Hack Generator 2025 – Instant Resource Boost" — matches the classic gacha-game scam-repo pattern (fake resource generator); almost certainly **not a real tool** — flagged as scam bait. |

These four appear in echo-related GitHub searches but belong to a fundamentally different (and often risky) category than optimization tooling; they should not be confused with legitimate community optimizers.

### 4f. Chinese-ecosystem bot plugins

`cCelectc/WutheringWavesUID` (formerly Cccc-owo, GPL-3.0, 3★, **archived** Nov 2025) — multi-platform (QQ/Discord/Telegram/KOOK/etc.) chatbot plugin for character/echo/pull queries, in the lineage of Genshin's `gsuid_core` bot family; now discontinued.

---

## 5. Genshin Impact Comparison

| Dimension | Genshin Optimizer (`frzyc/genshin-optimizer`) | Closest WuWa equivalent |
|---|---|---|
| Stars | **994**, 199 open issues (large active community) | Best non-automation WuWa repo: `Hashiao/wuwaBackendTool` 169★ (but that's a farming bot, not an optimizer) — closest true optimizer analog `EMCJava/WuWaOpt` at 72★ is archived |
| Maintenance | Actively pushed same week (Jul 12 2026); same author also spun off `frzyc/zenless-optimizer` for ZZZ, but **never built a Wuthering Waves version** | No single dominant maintained project; effort is scattered across 15+ small repos, several already dead/archived |
| Damage model | Full per-character talent/buff/team-resonance formula engine, imported from game data | Only `ryanbenson/wuthering-waves-optimizer` attempts an equivalent data-driven per-character damage-formula build; still early. Most others substitute a static substat-weight score (EVC/CV-style) instead of simulating real rotations |
| Optimization scope | Computes the best artifact combo **for one selected character** from the full unlocked-artifact pool via exhaustive/branch-and-bound search; **multi-character conflicts are handled manually** — user runs characters one at a time and manually "locks" artifacts already committed to exclude them from the next character's search. **Not a single global joint solver even in Genshin's own best tool.** | No WuWa tool found even attempts single-character exhaustive damage-based search at this fidelity; `Tethys` is the closest (genetic+exhaustive solver) but scores by weighted substats, not simulated damage, and its own roadmap admits the damage-formula evaluator isn't built yet |
| Data interchange | Community-standard "GOOD" (Genshin Open Object Description) JSON format lets Inventory Kamera, GO, and other tools interoperate | No equivalent shared schema — `wuwa-ocr`, Inventory Kamera, and half a dozen 2026 OCR clones each emit their own bespoke JSON, none interoperable |
| Import | OCR via community scanner (Inventory Kamera) or manual GOOD-format JSON | Multiple competing OCR pipelines (wuwa.build's, Tethys's, wuwa-toolkit's, wuwa-optimizer.com's), none shared |

**Key insight:** even Genshin's gold-standard tool does not truly solve simultaneous multi-character joint assignment — it solves per-character optimal assignment well and leaves cross-character conflict resolution to manual "lock" bookkeeping. So the bar the user is describing (fully automatic global assignment across a whole roster) has **not been fully solved even in the more mature Genshin ecosystem**, let alone WuWa's.

---

## 6. Gap Analysis — What the Market Is Missing

1. **No tool solves "my whole vault → optimal assignment across my whole roster" end-to-end.** Every project found falls into one of: (a) single-build 0–100 scorers against a role preset [wuwa.uk, EVC, WutheringInsight(dead), Erensia], (b) single-character heuristic optimizers using substat weights rather than simulated damage [WuWaOpt(dead), Tethys(new/incomplete)], (c) leaderboard/showcase comparators that grade an existing build against percentiles rather than compute a new optimal one [wuwa.build], (d) reforge/RNG simulators solving a narrower "should I reroll this echo" question [5+ redundant projects], or (e) gameplay-automation/farming bots unrelated to optimization [ok-wuthering-waves 6,750★, wuwaBackendTool 169★].

2. **The underlying damage model is the real blocker.** Wuthering Waves combat (combo-based normal attacks, forte/concerto gauge mechanics, intro/outro skill swaps, complex team synergy) is much harder to encode into a generic, character-agnostic damage function than Genshin's comparatively simple multiplicative talent formulas. This is plausibly *why* no Genshin-Optimizer-grade tool has emerged for WuWa 2+ years into the game's life: teams substitute EVC/CV-style static substat weighting for a true rotation simulation because building the latter generically is dramatically harder. `ryanbenson/wuthering-waves-optimizer`'s data-driven per-character-module approach is the only project attempting to close this gap, and it is still early-stage.

3. **Severe fragmentation and duplicated effort**, particularly in OCR extraction: at least 8 independent screenshot-to-JSON echo scanners exist (wuwa-ocr, Inventory Kamera, Tethys's own scanner, wuwa-optimizer.com's, f4sT357's, lhs1205's, yuchao12315's, Anyuluo996's, Erensia's), each with its own schema, none interoperable — unlike Genshin's shared "GOOD" format that lets its tool ecosystem compose.

4. **High churn / single-maintainer fragility.** WuWaOpt (72★, the most-cited genuine optimizer) has been archived since patch 2.1; WutheringInsight was explicitly discontinued by its developer citing community toxicity; ww-echo-policy-calculator is archived; several 0-star 2026 projects appear to be one-week solo bursts with uncertain continuation. Contrast with Genshin Optimizer's multi-year, still-actively-committed history.

5. **Kuro's native Echo Management Plan (v3.2+)** now auto-locks/discards echoes by main-stat + Sonata Set rule and supports shareable plan codes — closing the *simplest* "is this echo trash" use case natively. This raises the bar for third-party tools: the remaining unclaimed niche is specifically **substat-quality scoring plus true damage-model-based, whole-roster allocation** — exactly the gap the user is asking about, and exactly what nothing surveyed here fully delivers.

6. **Closest present-day candidates for someone wanting to build this themselves:** `ryanbenson/wuthering-waves-optimizer` (real per-character damage-model generation pipeline, TS/Vue, GPL-3.0, actively maintained) for the damage-engine side, combined with `DommyMM/wuwa-ocr` (GPL-3.0, actively maintained, production-grade OCR) for the data-import side, and the EVC formula corpus for a fallback scoring heuristic where a full rotation model isn't yet encoded. No repo currently combines all three into one product.

---

## Sources

- [WuWaFlex](https://wuwaflex.com/)
- [Wuwatracker](https://wuwatracker.com/) / [Achievements](https://wuwatracker.com/achievements) / [Planner](https://wuwatracker.com/planner)
- [WuWaBuilds / wuwa.build](https://www.wuwabuilds.moe/) → [https://wuwa.build/](https://wuwa.build/)
- [Prydwen — Echo Stats guide](https://www.prydwen.gg/wuthering-waves/guides/echo-stats)
- [Prydwen — Wuthering Waves hub](https://www.prydwen.gg/wuthering-waves)
- [Wuthery](https://wuthery.com/) / [Wuthery GitHub org](https://github.com/Wuthery)
- [Encore — Echo page](https://encore.moe/echo)
- [WutheringTools](https://www.wutheringtools.com/)
- [WuWa Tools](https://wuwa.uk/) / [Echo Scorer](https://wuwa.uk/echo-scorer)
- [Wuthering Waves Optimizer](https://wuwa-optimizer.com/) / [Echoes page](https://wuwa-optimizer.com/echoes)
- [TheWuWaCalculator](https://www.thewuwacalculator.com/)
- [Echo Value Calculator — About](https://www.echovaluecalc.com/about)
- [Maygi's Calculation Corner](https://maygi.cc)
- [Steam Guide: Helpful WuWa Websites and Tools 2026](https://steamcommunity.com/sharedfiles/filedetails/?id=3472481011) (fetch failed — DNS error, title/reference only)
- [GitHub — EMCJava/WuWaOpt](https://github.com/EMCJava/WuWaOpt)
- [GitHub — Hung1510/Tethys](https://github.com/Hung1510/Tethys)
- [GitHub — ryanbenson/wuthering-waves-optimizer](https://github.com/ryanbenson/wuthering-waves-optimizer)
- [GitHub — MinhBN-dev/wuwa-toolkit](https://github.com/MinhBN-dev/wuwa-toolkit)
- [GitHub — 2-07665/ww-echo-policy-calculator](https://github.com/2-07665/ww-echo-policy-calculator) / [WuwaEchoTool](https://github.com/2-07665/WuwaEchoTool)
- [GitHub — Elypha/EchoSolver](https://github.com/Elypha/EchoSolver)
- [GitHub — AstyuteChick/Echo-Value-Calculator](https://github.com/AstyuteChick/Echo-Value-Calculator)
- [GitHub — Erensia/Wuthering-Waves-Echo-Substat-Calculator](https://github.com/Erensia/Wuthering-Waves-Echo-Substat-Calculator)
- [GitHub — ChristopherKlay/WutheringInsight](https://github.com/ChristopherKlay/WutheringInsight)
- [GitHub — Arfoire/Echo-Worth-Calculator-for-Wuthering-Waves](https://github.com/Arfoire/Echo-Worth-Calculator-for-Wuthering-Waves)
- [GitHub — Yuu1202/wuwa-echo-manager](https://github.com/Yuu1202/wuwa-echo-manager)
- [GitHub — DommyMM/wuwabuild](https://github.com/DommyMM/wuwabuild)
- [GitHub — DommyMM/wuwa-ocr](https://github.com/DommyMM/wuwa-ocr)
- [GitHub — Psycho-Marcus/WuWa_Inventory_Kamera](https://github.com/Psycho-Marcus/WuWa_Inventory_Kamera)
- [GitHub — ok-oldking/ok-wuthering-waves](https://github.com/ok-oldking/ok-wuthering-waves)
- [GitHub — Hashiao/wuwaBackendTool](https://github.com/Hashiao/wuwaBackendTool)
- [GitHub — Avenuegrochain/Wuthering-Waves-Cheat](https://github.com/Avenuegrochain/Wuthering-Waves-Cheat)
- [GitHub — venoyxi80edellin/EchoDrift](https://github.com/venoyxi80edellin/EchoDrift)
- [GitHub — cCelectc/WutheringWavesUID](https://github.com/cCelectc/WutheringWavesUID)
- [GitHub — frzyc/genshin-optimizer](https://github.com/frzyc/genshin-optimizer) / [live site](https://frzyc.github.io/genshin-optimizer)
- [GitHub Topics — wutheringwaves](https://github.com/topics/wutheringwaves) / [wuwa](https://github.com/topics/wuwa)
- [Wuthering Waves Echo Management Plan Codes Guide](https://www.blogandguide.com/wuthering-waves-echo-management-plan-code.html)
- [Version 3.5 patch news — GameMarket.gg](https://gamemarket.gg/news/wuthering-waves/wuwa-3-5-everything-new-xuanling-sp-banner-special-rerun-mengzhou-region)
- [Hakush.in](https://hakush.in/) (ww2.hakush.in subdomain fetch failed — DNS error; multi-game database site, WuWa coverage UNVERIFIED)

**Note on UNVERIFIED items:** wuwatracker.com, encore.moe (dynamic sections), wutheringtools.com, thewuwacalculator.com, wuwaflex.com, and ww2.hakush.in all returned HTTP 403/DNS errors or empty SPA shells to automated fetch (bot protection / client-side rendering); their feature descriptions above rely on search-snippet corroboration only and should be re-verified by a human visiting the live site directly.