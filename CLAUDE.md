# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan
See `docs/plan.md`. Work phases in order. Do not build ahead.

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

### Naming Conventions
| Convention | Applied to |
|------------|-----------|
| `PascalCase.jsx` | All React component files |
| `lowercase-hyphenated.js` | All non-component files (hooks, services, constants, state) |
| `use-*.js` | Custom React hooks |
| No `index.js` barrel files | Imports always reference the file directly |
| No `utils`, `misc`, `helpers`, `common` | Files are named after what they actually do |

### Import path depth
Components live at `src/components/[layer]/File.jsx` — two levels deep from `src/`. To reach `src/state/` or `src/services/` use `../../state/` and `../../services/`, not `../../../`.

## Reference Docs (read only when relevant)
- `docs/stores-reference.md` — Zustand store fields and selector syntax
- `docs/services-reference.md` — service file responsibilities
- `docs/components-reference.md` — component layers and UI-to-file feature map
- `docs/layout-rules.md` — layout priorities for UI changes (read before any layout work)
- `docs/constants-reference.md` — key constants and CSS theming details
- `docs/project-summary.md` — plain-language project overview for planning

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
