# WuWa Echo Optimizer

<p align="right"><a href="./README.md">Tiếng Việt</a> · <b>English</b></p>

A client-side web tool that helps **Wuthering Waves** players answer one tricky question fast:
*"Given the Echoes I already own, which one should I put on which character?"* — instead of guessing or
doing the math by hand.

You load your Echo inventory (screenshot it for OCR, import JSON, or type it in), the tool scores each
Echo per character, then **solves for the optimal 5-Echo build** (respecting the cost ≤ 12 constraint
and set bonuses) and can even assign Echoes across a whole team. Everything runs **fully client-side** —
no backend, no data collection; your inventory lives in the browser's `localStorage`.

[![Web demo](https://img.shields.io/badge/web-live%20demo-2ea44f)](https://lamtehe7-hash.github.io/wuwa-echo-lab/)
[![Release](https://img.shields.io/github/v/release/lamtehe7-hash/wuwa-echo-lab)](https://github.com/lamtehe7-hash/wuwa-echo-lab/releases)
![Offline OCR](https://img.shields.io/badge/OCR-offline-informational)
![No backend](https://img.shields.io/badge/backend-none-lightgrey)

- **🌐 Use it now on the web:** <https://lamtehe7-hash.github.io/wuwa-echo-lab/>
- **📦 Portable Windows build (no install):** grab the zip from
  [Releases](https://github.com/lamtehe7-hash/wuwa-echo-lab/releases) → unzip → run
  `WuWaEchoOptimizer.exe`. Your browser opens the app automatically, and it works **fully offline**
  (OCR included).

> ⚠️ Non-profit community project, **not affiliated with or endorsed by Kuro Games**. See the
> [Disclaimer](#disclaimer) at the bottom.

---

## Table of contents

- [Why this tool](#why-this-tool)
- [Features](#features)
- [How to use (4 steps)](#how-to-use-4-steps)
- [Portable Windows build](#portable-windows-build)
- [Run locally](#run-locally)
- [Project layout](#project-layout)
- [FAQ](#faq)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

## Why this tool

In Wuthering Waves each character wears 5 Echoes; every Echo has 1 main stat + up to 5 randomly-rolled
substats, plus **set bonuses** (2/3/5 pieces) and a **total cost ≤ 12** constraint. With an inventory
of a few dozen Echoes the number of possible builds is huge, and it's hard to eyeball:

- Is this Echo **worth tuning further**, or should I scrap it?
- Which one goes to the **main DPS**, which to a **sub-DPS / buffer**?
- Is my current build already optimal, or is there a **better one** hiding in my box?

The tool answers exactly those, by scoring with per-character archetype weights and then running a
solver for the best build — accounting for both **real main-stat value** and the **real stats of set
bonuses** (Engine v2).

## Features

- **Manual entry** — a form to pick the sonata set, cost, main stat (only cost-valid options) and
  substats (values chosen from the 8 valid roll tiers), so you can't enter impossible numbers.
- **OCR import from images / video** — screenshot or record the in-game Echo panel and drop it in: the
  **echo name, sonata set (from its icon), cost, level, main stat and substats** are detected
  automatically (substats snapped to valid roll tiers). OCR runs **locally** (tesseract.js, self-hosted
  assets — no CDN calls, no image upload). Supports **Ctrl+V paste** (Win+Shift+S then paste) and
  **drag & drop**.
- **Per-character ranking** — weighted roll-efficiency scoring using each character/archetype's substat
  weights, factoring in main-stat fit (3 levels: correct ✓ / stopgap ～ / wrong ✗). The inventory has
  **search, filters** (cost / set / main stat / verdict), **sorting** (score / RV / level / newest), a
  **table or in-game-style card grid** view, and a click-to-open **per-substat score breakdown**.
- **Solve the optimal 5-Echo build** — the solver generates valid cost layouts (total ≤ 12), computes
  set bonuses (2/3/5-piece, with the *"same-named Echoes don't double-count"* rule) and discounts
  excess ER over your target.
- **Remember the "current set" + before/after diff** — pin what a character currently wears; the next
  solve shows the **score delta ▲/▼** vs the remembered set, so you know whether swapping is worth it.
- **Whole-team assignment** — solve sequentially by character priority, each Echo used by only one
  character (locked so later characters can't steal it).
- **Bulk inventory management** — lock 🔒 important Echoes (delete-protected), mark as excluded 🗑 (the
  solver skips them), multi-select + bulk delete; every deletion is **undoable** via a toast.
- **Tuning advice** — for Echoes with the right main stat but unfinished substats, an expected-value
  estimate tells you whether to keep pouring tuners in or stop.
- **Custom weights** — override the substat weights / ER target per character (with role presets: Crit
  DPS / Sub-DPS / Buffer / Healer… for quick apply), saved per browser.
- **Relative damage estimate** — a *relative* damage figure for a build (multiplicative crit
  1 + CR×CD and the %DMG bracket per the WuWa formula) to compare options.
- **Export / Import JSON** — back up or move your inventory between devices as a JSON file.
- **Bilingual Vietnamese / English** — a VI ⇄ EN toggle in the top corner.

## How to use (4 steps)

> Open the app (web or portable). The UI has **4 tabs**: Inventory · Optimize · Team · Import.

**① Load your inventory** → **Import** tab
- Fastest path: open an Echo's detail panel in-game, screenshot it (Win+Shift+S), then **Ctrl+V paste**
  straight into the tool (or drag & drop several images). Click *Run OCR*, review the card results, then
  *Save all*.
- Or type Echoes in manually on the **Inventory** tab (form on the left), or **Import JSON** if you
  have a backup.
- Nothing to try with? Click **Demo data** to load 10 sample Echoes.

**② Optimize for one character** → **Optimize** tab
- Pick a character (element-grouped picker). Optionally click **⚖ weights** to tweak them or apply a
  role preset.
- Click **🧩 Find best 5-set** → the tool returns the best 5-Echo build from your box, with score, set
  bonuses and ER.

**③ Compare with what's equipped** (optional) → still on **Optimize**
- Click **📌 Set as current loadout** to remember the equipped build. On the next solve, the result
  shows the **▲/▼ score delta** vs the remembered set — instantly telling you whether it's worth
  swapping.

**④ Assign a whole team** (optional) → **Team** tab
- Add characters in priority order, click **Assign echoes to team** — each Echo is placed on only one
  character, prioritized top-down.

> 💡 The ranking on the **Inventory** tab always follows the character selected on Optimize — handy for
> quickly checking which Echoes are worth keeping / tuning for that character.

## Portable Windows build

For offline use without a preinstalled browser / network dependency:

1. Download `WuWaEchoOptimizer-win64-portable.zip` from
   [Releases](https://github.com/lamtehe7-hash/wuwa-echo-lab/releases).
2. Unzip and run **`WuWaEchoOptimizer.exe`** — your default browser opens the app at
   `http://localhost:36925`.
3. Keep the console window (the server) open while using it; close it to quit the app.

Notes:
- On first run Windows **SmartScreen** may warn (the exe is unsigned) → *More info → Run anyway*.
- OCR runs fully offline. Only the **Echo icons** are fetched from the web (game8) — with no network,
  cards show a letter instead of the icon, and everything else still works.
- Data is stored per the `localhost:36925` origin — use **Export JSON** to back up / move machines.

## Run locally

Requires **Node.js 24+**.

```bash
cd app
npm install
npm run dev      # opens http://localhost:5173
```

Other commands:

```bash
npm run build    # production build (tsc -b && vite build)
npm test         # unit tests (vitest)
npm run preview  # serve the build for verification
```

For build & release details (GitHub Pages + packaging the portable build) see [`DEPLOY.md`](./DEPLOY.md).

## Project layout

```
WuWa Echo/
├── app/                  # Web app (Vite + React 19 + TypeScript + Tailwind v4)
│   ├── src/
│   │   ├── data/         # Static data: substats, main stats, sonata sets, characters, echo DB
│   │   ├── engine/       # Scoring, 5-Echo solver, roster assignment, damage model
│   │   ├── components/   # UI: entry form, echo card, ranking table, roster, OCR import…
│   │   ├── ocr/          # Image/video OCR: text parsing, preprocessing, set-from-icon
│   │   ├── i18n.tsx      # Hand-rolled i18n layer (VI/EN)
│   │   ├── store.ts      # localStorage (inventory, weight overrides, current set)
│   │   └── types.ts      # Shared types
│   └── public/tesseract/ # Self-hosted OCR assets (worker/core + langdata)
├── portable/             # Portable Windows packaging (embedded server + pkg → single .exe)
├── research/             # Research notes: echo mechanics, existing tools, scoring, data sources
├── PROPOSAL.md           # Foundation proposal, architecture, phase roadmap
├── DEPLOY.md             # GitHub Pages deploy + portable build guide
└── .github/workflows/    # GitHub Actions build + deploy Pages
```

## FAQ

**Does the tool read or interfere with the game?** No. It only computes on data you enter or screenshot
yourself — fully *passive*, no memory reading, no automation.

**Are my screenshots uploaded anywhere?** No. OCR runs via WebAssembly right in your browser; images
never leave your machine. There's no backend to receive them either.

**Where is my inventory stored?** In the browser's `localStorage` (per web origin). Clearing browser
data wipes it — use **Export JSON** to back up.

**How accurate is the data?** Substat roll tiers, main stats per cost, sonata sets… are compiled for
**patch 3.5** and cross-checked against datamine (see `research/data-verification.md`). A few 3.x
character presets are still tagged `[UNVERIFIED]` (web research) and will be corrected once solid
numbers are available.

**What if OCR misreads?** OCR results always show as cards for you to **review and edit before saving**.
The tool snaps substat values to the nearest roll tier and flags suspicious lines.

## Contributing

Feedback, bug reports and feature ideas are all welcome — open an
[issue](https://github.com/lamtehe7-hash/wuwa-echo-lab/issues) or a pull request on GitHub. See the full
architecture & roadmap in [`PROPOSAL.md`](./PROPOSAL.md) and the foundational reports under
[`research/`](./research).

## Disclaimer

- Static data (substat roll tiers, main stats per cost, sonata sets…) is compiled for **Wuthering Waves
  patch 3.5** and may drift as the game updates — see any `UNVERIFIED` notes in `research/` and the
  `app/src/data/` source.
- This is a personal / community project, **not affiliated with, sponsored by, or endorsed by Kuro
  Games** or any official Wuthering Waves publisher. All character names, Echo sets and related imagery
  (if any) are the property of Kuro Games.
- The tool only computes on data you enter / import — it does not read from or interfere with the game.
</content>
