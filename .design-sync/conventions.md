# WuWaEcho — build conventions

## Required setup (renders break without it)
Wrap every screen in the app's providers — every component calls `useT()` and **throws** outside `I18nProvider`; toasts need `ToastProvider`:

```jsx
<I18nProvider>
  <ToastProvider>
    {/* your UI */}
  </ToastProvider>
</I18nProvider>
```

`I18nProvider` defaults to Vietnamese (persists to localStorage key `wuwa-lang`). Components self-localize all their labels (vi/en) — never pass translated strings into them, and keep your own glue text bilingual-neutral or Vietnamese-first to match.

## Styling idiom — Tailwind utilities, dark-only, CLOSED set
This bundle ships ahead-of-time-compiled Tailwind v4 CSS: `styles.css` contains ONLY the utility classes the app itself uses. **A Tailwind class absent from `styles.css` silently does nothing.** Therefore:

- Read `styles.css` before styling; compose from classes that exist there. For anything missing, use inline `style={{}}` — never invent new Tailwind classes.
- Dark theme only. `body` is `bg-slate-950` with `text-slate-200` (rule ships in `styles.css`); there is no light mode.
- Verified vocabulary: surfaces `bg-slate-900` (+ `/40`–`/95` opacity forms), borders `border-slate-700`/`border-slate-800`, radii `rounded`/`rounded-lg`/`rounded-full`; text `text-slate-100`…`text-slate-500`, sizes `text-sm`/`text-xs`/`text-[11px]`/`text-[10px]`; numbers in `font-mono` (tables add `tabular-nums`); spacing `p-4`/`gap-2`/`space-y-4` etc.
- Accent semantics: **sky** = interactive/hover, **amber** = warning/pinned/5★/grade S, **emerald** = positive/success, **rose** = negative/error, **violet** = 4★, **slate** = neutral.
- Element colors (glacio/fusion/electro/aero/spectro/havoc) are inline `style={{ backgroundColor }}` dots — not classes.

## Data contract
Components take real game-data shapes (see each `<Name>.d.ts`): sonata set **ids** like `'havoc-eclipse'`, `'molten-rift'`; substat keys like `'critRate'`, `'critDmg'`, `'atkPct'`; substats as `{ stat, value }` arrays; echo `cost` is `1 | 3 | 4`, `rarity` `3 | 4 | 5`, `level` 0–25. Use realistic values (e.g. Crit DMG% rolls 12.6–21.0).

## Where the truth lives
- `styles.css` — complete utility set + body defaults. Read it before styling.
- `components/general/<Name>/<Name>.prompt.md` — per-component usage; `<Name>.d.ts` — the exact props contract.

## Idiomatic example
```jsx
<I18nProvider><ToastProvider>
  <div className="space-y-4 p-4">
    <SubstatLegend />
    <EchoCard
      echo={{ name: 'Dreamless', cost: 4, set: 'havoc-eclipse', rarity: 5, level: 25,
        mainStat: 'critRate',
        substats: [{ stat: 'critDmg', value: 21.0 }, { stat: 'critRate', value: 8.7 },
                   { stat: 'atkPct', value: 10.9 }] }}
    />
  </div>
</ToastProvider></I18nProvider>
```
