# Wuthering Waves — Data Sources & Echo Inventory Import Research
*Compiled 2026-07-13. Game currently on v3.5 (released 2026-07-10, "Blade of Past Resounds, Lingering Dream Hymns" — Mengzhou region, Xuanling/Suisui banners).*

## 1. Static Data Sources (characters, weapons, echoes, sonata sets, multipliers)

| Source | Type | URL | API? | Status |
|---|---|---|---|---|
| **hakush.in** | Data wiki/browser | `ww.hakush.in`, `ww2.hakush.in` (character/weapon/echo pages, e.g. `ww2.hakush.in/character/1305`, `/weapon/21050024`, `/echo`) | Site exists and covers WuWa (character/weapon/echo detail pages confirmed via search index), but **no documented public REST API** for WuWa specifically. The community wrapper `hakushin-py` (github.com/seriaati/hakushin-py) explicitly states: **"Wuthering Waves support is currently not planned"** — it only wraps Genshin/HSR/ZZZ. hakush.in's own info/config endpoint (`ww2.hakush.in/info`) is a front-end cache-config blob, not a documented public data API. Note: WebFetch in this environment could not resolve `hakush.in`/`ww.hakush.in`/`ww2.hakush.in` (DNS/network block on the fetch tool) — confirmed indirectly via search-engine cache/snippets only. **Treat exact API shape as UNVERIFIED**, but "site has WW data, no known public API" is fairly confident. |
| **encore.moe** (Black Shores project) | Data wiki | `https://encore.moe/` | **Yes — has an API.** Config JSON exposes two live backends: primary `https://api.encore.moe` (priority 2) and `https://api-v2.encore.moe` (priority 1). Supports 13 UI languages (en, zh-CN/TW, ja, ko, de, es, fr, id, pt, ru, th, vi). Exact endpoint/route documentation not publicly listed (no OpenAPI/docs page found) — schema for `/character` etc. is **UNVERIFIED** beyond confirming the API hosts exist and respond. |
| **Arikatsu/WutheringWaves_Data** (github.com/Arikatsu/WutheringWaves_Data) | Raw datamine dump | GitHub repo | No API, raw files (`BinData/`, `Textmaps/`, `aki_base.csv`) | **Actively maintained and current**: repo self-reports Game Version **3.5.0**, Resource Version 3.5.5, matching the real v3.5 patch that shipped 2026-07-10 — good corroboration this is a live, up-to-date pipeline (likely automated per-patch dumps, closest WuWa equivalent to Dimbreath's Genshin `AnimeGameData`). 193 commits, 310 stars/37 forks, no formal releases/PRs (informal cadence). |
| **alt3ri/WW_Data** | Raw datamine dump (fork) | GitHub repo | No API | Same folder structure as Arikatsu's, but **stuck at Game Version 1.1.0 / Resource 1.1.20** (mid-2024 era) — effectively **abandoned/stale fork**, not usable for current-patch data. |
| **Dimbreath/WutheringData** | Raw datamine dump | GitHub repo | No API | Contains `ConfigDB/` + `TextMap/` folders, 173★/18 forks, 133 commits. Last-update timestamp not retrievable via fetch; Dimbreath is the same maintainer known for Genshin's `AnimeGameData` and ran this during/shortly after WuWa's early CBT/launch window — **maintenance currency is UNVERIFIED**, treat as likely legacy/early-version snapshot rather than live-patch-tracking (compare against Arikatsu's repo for freshness). |
| **resonance-rest/api** | REST wrapper, static data only (chars/weapons/echoes/attributes/emojis) | `api.resonance.rest`, Go + JSON, Railway | **Archived 2025-07-10, read-only. Discontinued.** |
| **trongtindev/wutheringwaves-app-api** | REST wrapper | GitHub repo | Fetch returned 404 (likely JS-gated or removed) — **UNVERIFIED**, could not confirm content/status. |
| **ProjektCode/wuwa-api** ("Wuthering Waves Unofficial API", docs at `wuwa.projektcode.com/docs`) | REST wrapper, static data | GitHub repo | Fetch returned 404 for repo page — **UNVERIFIED** maintenance status, exists per search index. |
| **prydwen.gg** | Guide site (chars/weapons/echoes/tier lists) | `prydwen.gg/wuthering-waves` | **No public data export or GitHub data repo found.** It's a hand-authored Next.js content site (CloudFront-fronted); data is not exposed as JSON/API — scraping the rendered pages is the only route, no evidence of a machine-readable feed. |
| **wutheringwaves.fandom.com** | Wiki | — | Standard **Fandom/MediaWiki Action API** available at `https://wutheringwaves.fandom.com/api.php` (and Fandom's own `/api/v1`), same pattern as any Fandom wiki — usable for structured page/infobox scraping though requires wikitext/infobox parsing, not a clean typed schema. |

**Bottom line for Q1**: the closest thing to a "Dimbreath-style" always-current dump is **Arikatsu/WutheringWaves_Data** (verified in sync with live v3.5). hakush.in and encore.moe are real, browsable, and encore.moe confirmably runs an API server, but neither has publicly documented endpoints the way Genshin/HSR do via hakushin-py — WuWa API tooling on hakush.in's side is explicitly **not planned**. prydwen has zero public data feed.

## 2. Importing a Player's Echo Inventory

**No official Kuro/Waves API exposes inventory (echoes, weapons, characters) data.** Confirmed across all sources checked — every echo/inventory-import tool relies on OCR or a running-game window, never a login/account API.

The **only** official, documented Kuro endpoint any tool uses is for **gacha (convene) pull history**, not inventory:
- Endpoint: `POST https://gmserver-api.aki-game2.net/gacha/record/query`
- This is the actual endpoint the game client itself calls (not reverse-engineered guesswork) — confirmed via `Ikram001/wuwa-pull-tracker-local` README, which fetches it directly and writes to a local `wuwa_pulls.json`.
- Access requires a **Convene History URL** containing an auth token, of the form `https://aki-gm-resources(-oversea)?.aki-game.(net|com)/aki/gacha/index.html#/record...`. This URL is **not typed in by the user** — it's harvested from local client artifacts:
  - `Client\Saved\Logs\Client.log`
  - `Client\Binaries\Win64\ThirdParty\KrPcSdk_Global\KRSDKRes\KRSDKWebView\debug.log`
  - Windows Registry MUI Cache / firewall rules / uninstall keys (used only to locate the install path)
  - Community extractor scripts: `Anubhav1603/Wuthering-Waves-Convene-URL-Extractor`, gists by `Luzefiru` and `theREalpha`, and `wuwapal.com`'s PowerShell one-liner (`iwr -useb https://wuwapal.com/scripts/import.ps1 | iex`).
  - Records are only valid ~6 months server-side; trackers (wuwatracker.com, slyraf.com, wuwapal.com) cache history in their own DB once imported so older pulls survive.
- This mechanism is **convene-only** — none of wuwatracker, wuwapal, or the extractor scripts expose or claim an equivalent authenticated endpoint for echoes/weapons/character inventory. That gap is exactly why every echo-import tool falls back to OCR.

### OCR/scanner projects for echo inventory (GitHub)

| Project | Language | Method | Accuracy claim | 2026 UI compat | Maintenance |
|---|---|---|---|---|---|
| **Psycho-Marcus/WuWa_Inventory_Kamera** | Python | Full-screen window screenshot capture → OCR → JSON (`inventory.json`, `characters.json`, `weapons.json`, `echoes.json`). No memory reading. | Not quantified; README to-do explicitly lists "improve text recognition accuracy" as unfinished. | Only tested on 1680×1050 / 1920×1080 / 2560×1440, English-tested only, **full-screen mode required** (windowed untested/broken per issues). Latest release v1.7.1 is Sept 2025 — **10 months stale as of July 2026**, likely needs UI-layout fixes for v2.x/3.x since echo panel layouts have shifted. Broken image assets (dependency repo deleted). **Effectively dormant.** |
| **DommyMM/wuwa-ocr** + **wuwa-ocr-api** (backend for **wuwabuilds.moe**, formerly wuwa.build) | Python (FastAPI, OpenCV, Tesseract + RapidOCR/ONNX) | Server-side OCR pipeline: user uploads a full build-card/echo screenshot (JPEG/PNG ≤5MB), backend crops fixed regions, does icon template-matching for stat *identity* (17 stat classes) + OCR only for the 5 numeric substat values per echo. Content-addressed image dedup (SHA-256) to Cloudflare R2. | Internal design doc (`scanner/PLAN.md`) reports **24/24** echo-identity matches, **21/21** stat-icon matches (IoU 0.78–0.94), **15/15** substat-value reads on its (small, 3–4 image) test set — not a large-scale benchmark. | Actively maintained, references 2026 dates directly, syncs against a `wuwabuilds/scripts` data-sync repo. Primarily 1920×1080, **English-only now** (multi-language OCR support was explicitly dropped in a later revision). This is the most current/actively-developed option. GPL-3.0. |
| **berniewu2/WutheringWavesEchoScorer** | Python (per repo topic) | Local script, OCR-analyzes echo screenshots to score substats | Fetch blocked (403); details **UNVERIFIED**. |
| **ok-oldking/ok-wuthering-waves** | Python 3.12 (~3k LoC on `ok-script` framework) | Broader automation suite (auto-combat, echo/resonance farming, dailies) using **screen capture + CV/OCR + simulated Windows input**, explicit disclaimer: *"通过 Windows 接口模拟用户进行操作，无内存读取、无文件修改"* (simulates user input via Windows interface, no memory reading/file modification). Not purely passive — it also **injects clicks/keystrokes**, which is a materially higher risk category than read-only OCR. | Not quantified. | **Very actively maintained** — v3.5.4, 711 releases, 1,930 commits, latest release dated July 2026. Most current/battle-tested WuWa automation project found. Carries its own explicit ban-risk disclaimer citing Kuro's anti-cheat policy. |

## 3. OCR Techniques — Feasibility Assessment

Findings drawn mainly from `DommyMM/wuwa-ocr`'s internal design doc (`scanner/PLAN.md`), which is the most rigorous public writeup found:

- **Reframe the problem**: identifying *which* stat an echo substat is (e.g. Crit Rate vs Crit DMG vs ATK%) is a **computer-vision icon-classification problem, not text OCR** — the game renders a fixed icon per stat family (17 icon classes → 20 stats), so gradient-based **normalized cross-correlation (NCC) template matching** against pre-extracted CDN icon templates, with hue-based tie-breaking, solves stat *identity* language-independently. Legal numeric ranges disambiguate near-duplicate icon families (e.g., HP% 6.4–11.6% vs flat HP 320–580).
- **OCR is only needed for the actual numbers** (5 substat values per echo + level/cost). Engine benchmark from that project:
  - Windows Runtime `Windows.Media.Ocr` (Win32-native): **24 ms/echo**, effectively free, no extra binary.
  - Tesseract: **213 ms/echo**, ~10MB footprint.
  - RapidOCR (ONNX, recognition-only): **399 ms/echo**, ~50MB.
  - **EasyOCR rejected outright** — ~2GB PyTorch dependency, too heavy for a lightweight scanner.
  - Once image crops were correctly localized, "every engine scored 5/5" — i.e., **the bottleneck is crop/region localization, not OCR engine choice**.
- **Tesseract.js (browser) vs Python**: no project in this research actually ships Tesseract.js in-browser for WuWa; wuwabuilds/wuwa-ocr runs OCR **server-side in Python** (Tesseract + RapidOCR/ONNX) rather than client-side WASM, likely because (a) heavier CV template-matching preprocessing is easier in Python/OpenCV, (b) centralizing avoids shipping large OCR/ONNX runtimes to every browser session, (c) lets them iterate on region-cropping logic without redeploying client code. Tesseract.js remains viable for a fully client-side/privacy-preserving tool but nobody surveyed here has published production accuracy numbers for it against WuWa's font.
- **Concrete pitfalls documented** (from the 7 "structural bugs caught by measurement" in PLAN.md):
  1. Fixed row-band heights (derived from icon bounding box) clip wrapped substat text → must use median row pitch instead of per-icon extent.
  2. Batch-processing value columns silently drops rows → must OCR each row independently.
  3. Icon localization via simple blob/connected-component detection fails for icons that visually splinter (e.g., "Crit DMG" icon breaks into disjoint ink components) → must detect the first contiguous ink run instead.
  4. Fixed Y-bands clip when substat text wraps to two lines → bands must be extended + an IoU floor enforced.
  5. Value-cell positions inherited from icon-row coordinates misread wrapped rows → value regions must self-locate their own ink rather than reuse icon geometry.
  6. Fixed tile pixel-origins break when the inventory grid is scrolled → grid lattice (tile pitch ~353×423px) must be re-detected per frame via gold-cost-bar projection, not hardcoded.
  7. Border-brightness heuristics misidentify a "selected" tile (which scales ~6% larger, 345×425 vs 325×392px) → check corner-bezel hue instead of brightness.
  - Generic pitfalls confirmed across projects: **font rendering** (game uses a custom/stylized font, standard OCR training data doesn't match well without fine-tuning/region-specific templates); **UI language** (multi-language substat labels were supported in an earlier wuwa-ocr revision then explicitly dropped — English-only now, implying non-English OCR was a maintenance burden/accuracy drag); **resolution dependence** (Kamera only validated 3 fixed resolutions, full-screen only; wuwa-ocr primarily assumes 1920×1080); anti-cheat/synthetic-input exposure is why wuwa-ocr's own roadmap prioritizes a passive "watch mode" (scroll-tracking, zero input injection) over an auto-clicking scraper.

## 4. Community Data-Interchange Format (GOOD-equivalent)

**No universal, cross-tool JSON standard equivalent to Genshin's GOOD format was found for Wuthering Waves.** Each major tool uses its own proprietary shape:

- **WuWa_Inventory_Kamera** outputs 4 separate files (`inventory.json`, `characters.json`, `weapons.json`, `echoes.json`) — designed specifically to feed **WuWa Tracker**'s importer, making it the closest thing to a de facto scanner→tracker pipeline format, but it's a bespoke bilateral contract between those two projects, not a published open spec.
- **wuwabuilds.moe / DommyMM/wuwabuild** uses an internal `SavedState`/`BuildContext` object (character, weapon+rank passives, 5 echo slots with main/sub stats, forte nodes, sequence levels, watermark/UID), persisted to `localStorage` with "auto-migration from legacy save formats" — again proprietary, not documented as an external spec, though the frontend repo is open-source (TypeScript/Next.js) so the shape is inspectable in code.
- **wuwa-ocr's** own scanner design targets emitting a canonical schema (`ParsedEcho[]` with `echo`, `set`, `cost`, `rank`, `level`, `mainStatLabel`, `substats: [{subStat, subStatValue}]`) specifically so it can plug into the **existing `CalculatorEchoImporter.vue`** component from the separate "Wuthering Waves Optimizer" project — a sign of informal, ad-hoc format convergence between a couple of tools, not a published/versioned community standard.
- The game's own **in-game "Echo Management Plan" import codes** (added ~v3.2, still present v3.5) are a Kuro-official feature for sharing keep/discard **stat-priority rules** (by sonata set + cost + main stat) via a short code — this is a rules-config export, **not** a full echo-data interchange format, and not usable for external tools/build calculators.
- **wuwaflex.com** also offers build import/export but no JSON schema documentation was retrievable (fetch blocked); **UNVERIFIED** whether it's compatible with wuwabuilds' format.

**Conclusion**: unlike Genshin (GOOD) or HSR (community "HSRO"-style formats), Wuthering Waves' tooling ecosystem is still fragmented — every scanner/build-tool pair has negotiated its own bilateral JSON shape, largely because, as `wuwabuild`'s own README states, **"WuWa has no API yet"** and OCR output schemas evolved independently per project.

## 5. Legal / ToS Assessment (brief)

From Kuro Games' official ToS (`wutheringwaves.kurogames.com/p/language_en/terms_of_service.html`):
- **Section 13** defines "Cheat" broadly: *"users achieve or attempt to achieve an unfair competitive advantage by means of any program, method, software or hardware."*
- **Section 8(2)** prohibits *"use and spreading of... unauthorized third-party programs such as cheating programs or other malicious game programs"* and *"any plug-in, Trojan program or virus."*
- **Section 8(3)/13**: violations can lead to caution, suspension, item/currency clawback, or permanent account termination, **at Kuro's discretion**, with in-client cheat-detection software collecting "gamelogs and any unauthorized program" info.
- **No explicit language anywhere addresses screenshots, OCR, or automation/macros specifically** — this is a gap, not a permission.

Practical risk gradient (my synthesis, not a legal opinion):
- **Read-only screenshot + external OCR** (take a screenshot the same way a player does to post on Reddit, then run OCR on that image file outside the game process) — **lowest risk**: no memory read, no process injection, no automated game-window interaction. Functionally indistinguishable from a human transcribing their own screen. This is the model both `WuWa_Inventory_Kamera` and `wuwa-ocr`/wuwabuilds use.
- **Automated screenshot capture that also programmatically scrolls/clicks inside the live game window** (e.g., an auto-navigating echo-inventory walker) — **moderate risk**: still no memory/process tampering, but simulated input automation is exactly the kind of thing "unauthorized program... unfair advantage" language could be stretched to cover, especially at scale/speed a human couldn't match. `ok-wuthering-waves` explicitly flags this with its own risk disclaimer.
- **Memory reading / packet interception / process hooking** — **highest risk**: squarely what "Trojan program," "malicious game program," and anti-cheat telemetry are built to catch. No project surveyed here does this for echo import (the closest adjacent find, `Wuthery/spectrum`, is described only as a Rust crate for parsing/processing game network packets — a protocol-analysis tool, not confirmed as a live inventory-import mechanism; **UNVERIFIED** whether it's used for any player-data extraction in practice).

**Recommendation if building your own importer**: stick to passive, single-shot screenshot capture (OS-level `PrintScreen`/`Win+Shift+S`/manual screenshot, or a one-time programmatic window capture with **no simulated input and no automated navigation**) fed into an OCR pipeline you run yourself — this sits in the same risk bracket as existing tools already widely used without reported ban waves (Kamera, wuwabuilds), as opposed to full auto-navigating scanners or ok-wuthering-waves-style automation.

---

## Sources

- https://github.com/seriaati/hakushin-py
- https://ww2.hakush.in/info (indexed; not directly fetchable from this environment)
- https://ww2.hakush.in/echo, https://ww2.hakush.in/character/1305 (indexed via search)
- https://encore.moe/ , https://api.encore.moe/ (fetched — returns backend config JSON)
- https://github.com/Arikatsu/WutheringWaves_Data
- https://github.com/alt3ri/WW_Data
- https://github.com/Dimbreath/WutheringData
- https://github.com/resonance-rest/api
- https://github.com/trongtindev/wutheringwaves-app-api
- https://github.com/ProjektCode/wuwa-api
- https://www.prydwen.gg/wuthering-waves
- https://wutheringwaves.fandom.com/wiki/Wuthering_Waves_Wiki
- https://www.mediawiki.org/wiki/API:Action_API
- https://wuwatracker.com/import
- https://wuwatracker.com/articles/how-to-fix-wuthering-waves-pull-history-issues
- https://gist.github.com/Luzefiru/19c0759bea1b9e7ef480bb39303b3f6c
- https://gist.github.com/theREalpha/3929b720ac4a8030068b6438e907a9b7
- https://github.com/Anubhav1603/Wuthering-Waves-Convene-URL-Extractor
- https://github.com/Ikram001/wuwa-pull-tracker-local
- https://www.wuwapal.com/convene/import
- https://github.com/Psycho-Marcus/WuWa_Inventory_Kamera (README + releases)
- https://github.com/DommyMM/wuwa-ocr/blob/main/scanner/PLAN.md
- https://github.com/DommyMM/wuwa-ocr
- https://github.com/DommyMM/wuwa-ocr-api
- https://github.com/DommyMM/wuwabuild
- https://www.wuwabuilds.moe/ , https://www.wuwabuilds.moe/import
- https://github.com/berniewu2/WutheringWavesEchoScorer (blocked, unverified)
- https://github.com/ok-oldking/ok-wuthering-waves
- https://wuwaflex.com/
- https://wutheringwaves.kurogames.com/p/language_en/terms_of_service.html
- https://game8.co/games/Wuthering-Waves/archives/605253 (v3.5 patch info)
- https://www.sportskeeda.com/esports/wuwa-3-5-patch-notes-wuthering-waves-new-characters-mengzhou-map-expansion-events
- https://www.ldshop.gg/blog/wuthering-waves/echo-management.html (in-game Echo Management import codes)
- https://github.com/topics/wuwa