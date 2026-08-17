# Constants & Theming Reference

## Key Constants (`src/constants/`)

- `entry-types.js` — 5 types: `character`, `location`, `item`, `plot_event`, `other` with associated colors
- `limits.js` — `MAX_TRIGGERS = 25`, `MAX_LOREBOOKS = 50`, `CHAR_LIMIT = 1500`, `MENU_PANEL_WIDTH`. Also `LOREBOOK_TAB_WIDTH_PX` with `maxWindowWidth()` — the tab hangs off the window's right edge, so the max width has to reserve its margin or the tab is pushed off-screen; `POPOVER_ANCHOR_GAP_PX` / `POPOVER_EDGE_PAD_PX` for `use-anchored-position`; and `SAVE_STATUS_FRESH_MS` / `SAVE_STATUS_TICK_MS` behind the footer's ageing "Saved / 4m ago"
- `viewport.js` — what the app assumes about the device from viewport width alone. `MOBILE_BREAKPOINT_PX = 768` (read only by `use-mobile.js`, which every layout branch hangs off) and `TOUCH_TARGET_MIN_PX = 44`. The touch floor is expressed as **hit area, not visual size** — WCAG 2.5.5 and the Apple HIG are both about the region that responds to a tap, not the ink in it, so a 24px chip can carry a 44px target through padding or a stretched `::before`. 14D settled what that reading is actually worth: it carried about half the app for free (header title, gear, storage ring, sort button, hotbar, card badges) and could not carry form controls, rows in a list, or anything under an `overflow: hidden` ancestor, so the floor cost +23px of chrome rather than 0. CSS side is `--touch-floor` / `.touch-floor` / `.touch-floor-box` in `style.css` §TOUCH-FLOOR, **both gated to the breakpoint** — the class in the JSX is a declaration of intent and does nothing at desktop widths, where a stretched overlay would silently change which control a click lands on. Four traps are enumerated in the file’s own comment; read it before reaching for the utility
- `version.js` — `APP_VERSION`, injected at build time by `vite.config.js` from `package.json`. Read by the status footer and by the update notice, which compares it against the changelog
- `title-menu.js` — the title dropdown's geometry and its sort modes
- `import-flow.js` — the shared import flow's vocabulary: `IMPORT_STAGE` (`source` → `disposition` → `preview`), `IMPORT_SOURCE`, and `IMPORT_DISPOSITION_OPTIONS` — the 2×2 grid of what to do with an imported file (new / append / replace / back up first, where the last is a replace that downloads a copy first). All three import surfaces render from this one list, which is what keeps them offering the same choices
- `tour-steps.js` — the guided feature tour: `TOUR_STEPS_MOBILE`, `TOUR_STEPS_DESKTOP` and `tourStepsFor({ isMobile })`. Each step names a live `target` selector, the words, an optional `arrive(api)` that walks the app to it, and an optional `advanceOn` selector meaning the user did the thing. **An empty list for a platform means no tour is offered there** — that is how a release that changed only one surface behaves. Captions must stay short (~220 chars): the bubble is placed by a flip heuristic that only holds while it is under half the viewport tall.
- `tour-lorebook.js` — the two Arthurian sample books the tour runs on, so it never drives the user's own. Loaded by dynamic `import()`, so it costs nothing to anyone who skips the tour.
- `settings-search.js` — the filter index behind the Settings panel's search box
- `storage-keys.js` — all localStorage key strings
- `defaults.js` — default shapes for new entries, lorebooks, settings, window size. Also `fullCardsInSelectMode` (off) — mobile select mode condenses entry rows to name + tick at 46px against the full card's 81px, which is the difference between seeing two entries and eight; on restores the full cards. **There is no `crosstalkEnabled`** — see `stores-reference.md`
- `hotbar-actions.js` — action definitions for the hotbar toolbar
- `scaling.js` — the option sets behind the footer's `⤢ Size` menu: `FAB_SIZES` (the px map `Hotbar.jsx` renders from), `FAB_SIZE_OPTIONS`, `ENTRY_HEADER_SIZE_OPTIONS`, and `WINDOW_SIZE_PRESETS` (`width: null` keeps the current width, `height: 'viewport'` resolves at apply time). `WINDOW_PRESET_TOLERANCE` is the px slop that keeps a preset's checkmark lit after re-centring rounds a dimension
- `drag.js` — drop-target vocabulary (`DROP_KINDS`, `DROP_EDGES`, `DRAG_KINDS`), the spring-open delay for tucked folders, and the auto-scroll zone/speed
- `selection.js` — modifier+click semantics (`SELECTION_ACTIONS`) and the gesture list the keyboard help overlay renders (`SELECTION_GESTURES`), kept beside the behaviour they describe so the two can't drift
- `sort-modes.js` — which sort modes suppress a grouping layer (`group-by-type`, folders) because they impose their own ordering, plus `folderOrderFor()` — how folder rows order themselves against sibling entries (`position` by default, `name-asc`/`name-desc` under the alpha sorts)
- `folders.js` — folder swatch palette, `MAX_FOLDER_DEPTH`, the collapse cycles (`COLLAPSE_CYCLES.three` / `.two`, chosen by the `folderCollapseStages` setting) (`FOLDER_COLORS`) and the collapse-state vocabulary (`full` / `condensed` / `tucked`) with `normalizeCollapseStages()` — the tolerant read that turns a stored stage set (or a legacy `'three'`/`'two'` string) into a usable cycle, always `full` plus at least one more; `UNFILED_FILTER_ID` is the folder-filter sentinel for "in no folder" (a `__`-wrapped literal, so it can never collide with a `uid()` folder id)

## CSS / Theming

All colors are CSS custom properties defined in `src/style.css`. The entry card left-border color is driven by a `--type-color` CSS variable set inline per card. The floating window uses four `.corner--nw/ne/sw/se` spans for the golden bracket decoration.

### Semantic color tokens

The CSS palette has both raw color vars (`--red`, `--blue`, `--green`, etc.) and **semantic tokens** that encode meaning. New UI must reach for the semantic tokens — not the raw colors and not `--accent` — so the convention stays enforceable.

| Token | Hex | Use for |
|-------|-----|---------|
| `--destructive` | `#ff2e2e` | Irreversible/overwrite actions: Replace, Delete-confirm, Apply, Clear All, the "Switch anyway" prompt button. Pair with `--destructive-hover` (`#d61f1f`). **Outlined at rest, filled on hover** — two reds cannot be told apart by hue alone, so the treatment is what separates destroy from create, and it keeps working in high contrast (where the two tokens are deliberately equal) and under any custom accent. In the custom theme this token is fixed rather than derived: destructive is the one role that must not follow a preference. |
| `--passive-agree` | `#60a5fa` | Stateful toggle is **on** because the user actively chose this state: hotbar toggles (`.footer-btn--active`), Find/Replace scope chips, sort-mode active, the currently-open lorebook row in the switcher, the open menu-dropdown item, the selected format tab. Pair with `--passive-agree-hover` (`#3b82f6`). |
| `--accent` | `#ef4444` | **Primary-emphasis exception only** — filled at rest, which is what distinguishes it from `--destructive`. — kept for the FAB (`+` add-entry) and the lander hero buttons because their visual prominence is the whole point. Don't reach for `--accent` for new UI; pick `--destructive` or `--passive-agree` instead. |

#### Toggle button visual contract

Stateful toggle buttons read as switches, not stamps, by combining `.footer-btn` + `.footer-btn--toggle` and adding `.footer-btn--active` when on:

- **Off** — neutral fill with a faint passive-agree border (`rgba(96,165,250,.3)`). The track-outline tells the user "this fills with blue when on" before they click.
- **On** — full `--passive-agree` fill, white text, hover darkens to `--passive-agree-hover`.

`HotbarSlot` applies `--toggle` automatically whenever the resolver returns a boolean `active` field; resolvers that return no `active` field render a neutral one-shot button (Undo, Redo, Import).
