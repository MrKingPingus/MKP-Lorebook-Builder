# Constants & Theming Reference

## Key Constants (`src/constants/`)

- `entry-types.js` — 5 types: `character`, `location`, `item`, `plot_event`, `other` with associated colors
- `limits.js` — `MAX_TRIGGERS = 25`, `MAX_LOREBOOKS = 10`, `CHAR_LIMIT = 1500`
- `storage-keys.js` — all localStorage key strings
- `defaults.js` — default shapes for new entries, lorebooks, settings, window size
- `hotbar-actions.js` — action definitions for the hotbar toolbar

## CSS / Theming

All colors are CSS custom properties defined in `src/style.css`. The entry card left-border color is driven by a `--type-color` CSS variable set inline per card. The floating window uses four `.corner--nw/ne/sw/se` spans for the golden bracket decoration.

### Semantic color tokens

The CSS palette has both raw color vars (`--red`, `--blue`, `--green`, etc.) and **semantic tokens** that encode meaning. New UI must reach for the semantic tokens — not the raw colors and not `--accent` — so the convention stays enforceable.

| Token | Hex | Use for |
|-------|-----|---------|
| `--destructive` | `#ef4444` | Irreversible/overwrite actions: Replace, Delete-confirm, Apply, Clear All, the "Switch anyway" prompt button. Pair with `--destructive-hover` (`#dc2626`). |
| `--passive-agree` | `#60a5fa` | Stateful toggle is **on** because the user actively chose this state: hotbar toggles (`.footer-btn--active`), Find/Replace scope chips, sort-mode active, the currently-open lorebook row in the switcher, the open menu-dropdown item, the selected format tab. Pair with `--passive-agree-hover` (`#3b82f6`). |
| `--accent` | `#ef4444` | **Primary-emphasis exception only** — kept for the FAB (`+` add-entry) and the lander hero buttons because their visual prominence is the whole point. Don't reach for `--accent` for new UI; pick `--destructive` or `--passive-agree` instead. |

#### Toggle button visual contract

Stateful toggle buttons read as switches, not stamps, by combining `.footer-btn` + `.footer-btn--toggle` and adding `.footer-btn--active` when on:

- **Off** — neutral fill with a faint passive-agree border (`rgba(96,165,250,.3)`). The track-outline tells the user "this fills with blue when on" before they click.
- **On** — full `--passive-agree` fill, white text, hover darkens to `--passive-agree-hover`.

`HotbarSlot` applies `--toggle` automatically whenever the resolver returns a boolean `active` field; resolvers that return no `active` field render a neutral one-shot button (Undo, Redo, Import).
