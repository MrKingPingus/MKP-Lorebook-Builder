# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan
See @plan.md. Work phases in order. Do not build ahead.

## Commands
```bash
npm install       # install dependencies
npm run dev       # start Vite dev server (hot reload)
npm run build     # production build → dist/
npm run preview   # serve the production build locally
```
There are no tests or linters configured.

## Architecture
Browser-only SPA (React 18 + Vite 7). No backend, no database, no authentication. All persistence is `localStorage` via `storage-service.js`.

### Strict layer order — imports only flow downward:
```
constants → services → hooks → components
```
- **Components** may only import from `hooks/` (never stores or services directly).
- **Hooks** may import from `state/` and `services/`.
- **Services** are plain JS — no React imports.
- **`storage-service.js`** is the _only_ file that touches `localStorage` — no exceptions.
- **`autosave.js`** is a plain service, not a hook — the debounce timer must survive React re-renders.

### Architecture Rules
1. **One file, one responsibility** — no mixed concerns.
2. **Components render only** — all logic lives in hooks or services.
3. **No component imports stores directly** — always go through a hook.
4. **No component imports services directly** — always go through a hook.
5. **`storage-service.js` is the only file that touches `localStorage`** — no exceptions.
6. **`autosave.js` is a plain service, not a hook** — the debounce timer must survive React re-renders.
7. **Constants are never hardcoded in logic files** — always imported from `src/constants/`.
8. **Max folder depth: 3 levels** — `src/components/feature/` is the deepest allowed.
9. **No backend, no database, no authentication** — browser-only, localStorage only.

### State (Zustand — `src/state/`)
Four isolated stores to minimize re-renders:

| Store | Owns |
|-------|------|
| `lorebook-store.js` | `activeLorebookId`, `lorebooks` map, `lorebookIndex` |
| `ui-store.js` | active tab, search query, type filter, window pos/size, `expandAll`, `groupByType` |
| `settings-store.js` | user preferences (compact triggers, counter tiers, default window size) |
| `history-store.js` | undo/redo stacks (max 50 snapshots of full lorebook state) |

Always use selector syntax: `const foo = useStore((s) => s.foo)`.

### Naming Conventions
| Convention | Applied to |
|------------|-----------|
| `PascalCase.jsx` | All React component files |
| `lowercase-hyphenated.js` | All non-component files (hooks, services, constants, state) |
| `use-*.js` | Custom React hooks |
| No `index.js` barrel files | Imports always reference the file directly |
| No `utils`, `misc`, `helpers`, `common` | Files are named after what they actually do |

### Autosave
`autosave.js` is a plain service (not a hook) so its debounce timer survives re-renders. It subscribes to `useLorebookStore`, debounces 800 ms, writes active lorebook + index via `storage-service`. Mounted in `App.jsx` via `useAutosave()`.

### Bootstrap
`App.jsx` contains a `useBootstrap` hook that runs once on mount: reads `localStorage`, populates all four stores, or creates a default lorebook on first run.

### Import path depth
Components live at `src/components/[layer]/File.jsx` — two levels deep from `src/`. To reach `src/state/` or `src/services/` use `../../state/` and `../../services/`, not `../../../`.

## Key constants
- `src/constants/entry-types.js` — 5 types: `character`, `location`, `item`, `plot_event`, `other` with associated colors
- `src/constants/limits.js` — `MAX_TRIGGERS = 25`, `MAX_LOREBOOKS = 10`, `CHAR_LIMIT = 1500`
- `src/constants/storage-keys.js` — all localStorage key strings
- `src/constants/defaults.js` — default shapes for new entries, lorebooks, settings, window size

## CSS / theming
All colors are CSS custom properties defined in `src/style.css`. The entry card left-border color is driven by a `--type-color` CSS variable set inline per card. The floating window uses four `.corner--nw/ne/sw/se` spans for the golden bracket decoration.

## Deployment
GitHub Pages. `vite.config.js` reads `GITHUB_REPOSITORY` from the Actions environment and sets the base path to `/<repo-name>/` automatically. Push to `main` triggers deploy via `.github/workflows/main.yml`.

## Don't Do This
- Don't hardcode strings, numbers, or colors in logic files — always import from `src/constants/`
- Don't import stores or services directly in components — always go through a hook
- Don't create `index.js` barrel files
- Don't name files `utils`, `misc`, `helpers`, or `common`
- Don't nest folders deeper than `src/components/feature/`
- Don't add a backend, database, or authentication layer