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

### Component layers (`src/components/`)
Three sub-folders, each with a distinct role:

| Layer | Purpose |
|-------|---------|
| `feature/` | Feature-specific, stateful components (entry cards, panels, toolbars) |
| `layout/` | Structural shell components (FloatingWindow, WindowHeader, Hotbar, MenuPanel) |
| `ui/` | Stateless, reusable primitives (Chip, DropZone, StatsBadge, CharCounter, TypeColorDot) |

### Services (`src/services/`)
Plain JS modules — no React imports:

| File | Responsibility |
|------|---------------|
| `storage-service.js` | **Only** file that reads/writes `localStorage` |
| `autosave.js` | Debounced subscriber that persists active lorebook |
| `entry-factory.js` | Creates new entry objects with default shape |
| `lorebook-index.js` | Builds/maintains the lorebook index |
| `suggestion-engine.js` | Generates trigger/keyword suggestions |
| `find-replace.js` | Find & replace logic over entry fields |
| `html-escape.js` | Sanitises strings for safe HTML rendering |
| `json-export.js` / `json-import.js` | JSON lorebook format |
| `txt-export.js` / `txt-import.js` | Plain-text lorebook format |
| `docx-export.js` / `docx-import.js` | DOCX lorebook format |
| `zip-builder.js` | Packages multi-file exports into a ZIP |

### Import path depth
Components live at `src/components/[layer]/File.jsx` — two levels deep from `src/`. To reach `src/state/` or `src/services/` use `../../state/` and `../../services/`, not `../../../`.

## Key constants
- `src/constants/entry-types.js` — 5 types: `character`, `location`, `item`, `plot_event`, `other` with associated colors
- `src/constants/limits.js` — `MAX_TRIGGERS = 25`, `MAX_LOREBOOKS = 10`, `CHAR_LIMIT = 1500`
- `src/constants/storage-keys.js` — all localStorage key strings
- `src/constants/defaults.js` — default shapes for new entries, lorebooks, settings, window size
- `src/constants/hotbar-actions.js` — action definitions for the hotbar toolbar

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

## File Editing
- When the Edit tool fails due to unicode characters (em-dashes, non-breaking spaces, etc.), use targeted `sed` commands for surgical replacements — do **not** load and rewrite the entire file via Python or similar; that dumps the full file contents into context unnecessarily

## Token Cost Warnings

Some actions consume a disproportionate number of tokens. Claude should warn the user **before** performing any of the following:

- **`/compact`** — Summarizes the entire conversation history. Cost scales with session length. On a long session with many file reads and code generations, this can consume 20–30% of your usage budget in one shot. **Alternative:** Start a new session earlier (before context gets large), or accept the larger per-message cost of a long session instead of compacting.

- **Reading very large files** — Reading a file with thousands of lines dumps it all into context. **Alternative:** Use `offset` + `limit` parameters to read only the relevant section, or use `Grep` to find specific lines first.

- **Full file rewrites via `Write`** — Rewriting an existing file sends the entire contents through the model. **Alternative:** Use `Edit` for targeted changes whenever possible.

- **Long Agent/subagent tasks** — Spawning an agent on a vague or open-ended task can burn many tokens exploring dead ends. **Alternative:** Give the agent a specific, narrow question; or use `Grep`/`Glob` directly for simple searches.

When any of these is about to happen on a large or expensive operation, Claude should say so and ask for confirmation or suggest the cheaper alternative.