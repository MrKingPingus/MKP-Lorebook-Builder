# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Plan
See `docs/plan.md`. Work phases in order. Do not build ahead.

## Changelog
Update `CHANGELOG.md` (repo root) when completing each phase or polish pass. Add a new dated section at the top with Additions / Fixes / Adjustments / Renames subheaders as appropriate. The changelog is the source the in-app lander will eventually render — keep entries plain-language and user-visible, not internal refactor notes.

## Commands
```bash
npm install       # install dependencies
npm run dev       # start Vite dev server (hot reload)
npm run build     # production build → dist/
npm run preview   # serve the production build locally
npm run verify    # browser-driven behavioural checks (Playwright) — see verify/README.md
npm run verify -- folders          # only scenarios whose name matches (a full run takes minutes)
node verify/screenshots.mjs        # annotated feature screenshots for release notes
```
No linters are configured. `npm run verify` drives the real app headlessly to check entry-level features end-to-end (starts/stops its own dev server); reusable navigation pathways live in `verify/driver.mjs`. Pass a name substring to run a subset — a full run launches a fresh browser per scenario and takes several minutes. Set `VERIFY_URL` to test a production build (`vite preview`) rather than the dev server; CI does this.

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

## Communication

When an exploratory or design discussion includes multiple decisions to make, finish the message with a numbered list of the specific clarifications you need from the user — one decision per item, with the options enumerated `(a)/(b)/(c)`. Lay out reasoning and tradeoffs in prose above the list as usual, but the trailing list should be self-contained enough that the user can reply with `1. a, 2. b, 3. yes` and unambiguously approve the path forward.

### Moving from discussion to implementation requires a firm Yes

**Only an explicit, unambiguous approval starts implementation work.** A clear "yes", "do it", "go ahead", "build it", or a direct answer selecting an option (`1. a, 2. b`) is approval. Nothing else is.

**Anything in the middle means the user wants to keep discussing** — not that Claude should pick the most reasonable option and proceed. Treat all of these as "still discussing":

- "I'm unsure", "I'm torn", "maybe", "I could see that"
- "I like X, but…" / "that's interesting, though…"
- Thinking out loud, or floating an alternative without settling on it
- Answering some items in a decision list while leaving others open
- Silence on a question that was asked

When the reply lands in the middle, the correct next move is to **help resolve the specific thing the user is stuck on** — sharpen the tradeoff, offer a recommendation with reasoning, propose a tiebreaker — and then ask again. Do not begin editing files.

Two failure modes to avoid specifically:

1. **Do not treat a recommendation as pre-approved because it is cheap to reverse.** "Easy to change later" is not the same as "mine to decide". The user's call is the user's call regardless of how reversible it is.
2. **Do not treat partial approval as total approval.** If the user approves a structure but leaves one placement open, the unresolved item blocks the work that depends on it — build nothing that assumes an answer.

This applies to the *start* of implementation. Once work is genuinely approved, the ordinary judgement calls inside it (naming a variable, picking a selector, choosing where a helper lives) do not each need re-approval.

## Token Cost Warnings

Some actions consume a disproportionate number of tokens. Claude should warn the user **before** performing any of the following:

- **`/compact`** — Summarizes the entire conversation history. Cost scales with session length. On a long session with many file reads and code generations, this can consume 20–30% of your usage budget in one shot. **Alternative:** Start a new session earlier (before context gets large), or accept the larger per-message cost of a long session instead of compacting.

- **Reading very large files** — Reading a file with thousands of lines dumps it all into context. **Alternative:** Use `offset` + `limit` parameters to read only the relevant section, or use `Grep` to find specific lines first.

- **Full file rewrites via `Write`** — Rewriting an existing file sends the entire contents through the model. **Alternative:** Use `Edit` for targeted changes whenever possible.

- **Long Agent/subagent tasks** — Spawning an agent on a vague or open-ended task can burn many tokens exploring dead ends. **Alternative:** Give the agent a specific, narrow question; or use `Grep`/`Glob` directly for simple searches.

When any of these is about to happen on a large or expensive operation, Claude should say so and ask for confirmation or suggest the cheaper alternative.
