# Constants & Theming Reference

## Key Constants (`src/constants/`)

- `entry-types.js` — 5 types: `character`, `location`, `item`, `plot_event`, `other` with associated colors
- `limits.js` — `MAX_TRIGGERS = 25`, `MAX_LOREBOOKS = 10`, `CHAR_LIMIT = 1500`
- `storage-keys.js` — all localStorage key strings
- `defaults.js` — default shapes for new entries, lorebooks, settings, window size
- `hotbar-actions.js` — action definitions for the hotbar toolbar

## CSS / Theming

All colors are CSS custom properties defined in `src/style.css`. The entry card left-border color is driven by a `--type-color` CSS variable set inline per card. The floating window uses four `.corner--nw/ne/sw/se` spans for the golden bracket decoration.
