# Phase 9 Crosstalk — Handoff

Short, dense brief for a fresh Claude session continuing the crosstalk prototype debugging.

## Current state

- **Branch**: `claude/draft-lorebook-crosstalk-0higP`
- **Activation**: append `?crosstalk=1` to the URL (gated in `FloatingWindow.jsx`).
- **Last build**: green (`npm run build`).
- **User's latest report**: still broken after the filter-reset fix — details on exact symptom unknown, user wants to continue in a fresh session.

## What the feature does

Two `BuildPanel` instances render side-by-side inside `CrosstalkPrototype`. Each side is wrapped in a `SideContext.Provider` (`'left'` / `'right'`) so side-aware hooks read the correct slot. Click a side to focus it — the focused side drives `activeLorebookId`, which anything outside the `SideContext` tree (WindowHeader, menus, undo/redo keyboard shortcuts) uses.

## Steps completed

1. Layout prototype (gated by `?crosstalk=1`).
2. Dual-slot store (`leftId`, `rightId`, `focusSide`, mirrored `activeLorebookId`).
3. Side-aware hooks via `useSideLorebookId()`.

Still pending: step 4 (autosave both sides — see below), step 5 (real menu entry + remove prototype flag).

## The current bug

User quote (original report): _"I'll load in a lorebook, and then try to put a different lorebook on the other side. The other side lorebook comes up blank despite having content within it... something broke when we added the picker to both sides... it's a very uncanny bug's disallowing two lorebooks to be present at once, and it's causing one of them to appear empty."_

### What I already tried (still broken)

Commit `ae7295f` on the prototype:
- `pickSlot` now clears `searchQuery` / `searchMode` / `typeFilter` / `selectedIds` on swap (mirrors `switchLorebook`).
- Safety net: if the picked id isn't in `lorebooks` in-memory map, `readJson` from `localStorage` and `setLorebook`.
- Seed effect is now one-shot via `useRef` — no longer auto-re-seeds when user picks `(none)`.

Bug persists. Need to reproduce with user and pinpoint the actual trigger.

### Theories not yet verified

1. **Autosave clobber**. `src/services/autosave.js` writes ONLY `lorebooks[activeLorebookId]` on any store change. If the user edits the non-focused side (e.g. clicks into the dimmed side's entry card), the edit still goes to that side's lorebook in memory, but the next autosave tick writes the FOCUSED side's lorebook to storage — not the edited one. Conversely, if the user picks a slot and then clicks anywhere, a debounced save might write the focused side's data to a stale key. Worth tracing.
2. **Shared non-filter UI state we forgot**. `sortMode`, `groupByType`, `collapseAll`, `expandAll`, `activeEntryId`, `searchFocusedId`, `pendingFocusEntryId` all live in `ui-store` and are shared. None filter entries away, but they could cause odd UI artifacts.
3. **Entry id collision across lorebooks**. `uid()` in `entry-factory.js` uses `Date.now().toString(36) + random`. Collisions extremely unlikely but not impossible — and both sides render EntryCards with `id={entry-${entry.id}}`. A collision would confuse `document.getElementById` in search-nav / scroll.
4. **"Blank" might mean something specific**. User says "blank despite having content" — this might be the `entry-list-empty` message (`No entries yet...`) which only fires when `entries.length === 0` after filtering. Need to ask user to check: does the side show the empty-state message, or is it literally missing UI? Screenshot would help.
5. **The onMouseDownCapture focus-switch on the picker**. Clicking the right-side picker first triggers `setFocusSide('right')` via the outer div's capture handler (runs before child's `stopPropagation` can matter — both are in capture phase, outer fires first). This changes `activeLorebookId` mid-interaction. If anything downstream relies on `activeLorebookId` being stable during the pick, it'd glitch.

## Suggested first moves in the fresh session

1. **Get a precise repro from the user**. Ask: exact clicks, which side goes blank (left or right), whether the empty-state text "No entries yet..." appears, whether the lorebook name in the header still looks right, whether typing in the search bar on one side shows the query on the other.
2. **Check for autosave clobber** by opening DevTools → Application → Local Storage while reproducing. Watch `lorebook-<id>` keys for unexpected writes.
3. **Consider making ui-store filters per-side**. The cleanest long-term fix. Keyed by `lorebookId` or by `'left'/'right'`. This would also enable each side to scroll/search/filter independently, which the user will want eventually.

## Key files (read order for onboarding)

- `src/components/feature/CrosstalkPrototype.jsx` — entry point for the feature.
- `src/hooks/use-crosstalk-slots.js` — slot state + `pickSlot` wrapper (created 2026-04-19).
- `src/hooks/use-side.js` — `SideContext` + `useSideLorebookId()`.
- `src/state/lorebook-store.js` — dual-slot store, `pickActiveId` helper.
- `src/state/history-store.js` — per-lorebook keyed-map undo/redo (refactored in step 3).
- `src/services/autosave.js` — single-slot autosave (STEP 4 WILL CHANGE THIS).
- `src/hooks/use-entries.js`, `use-lorebook.js`, `use-find-replace.js`, `use-bulk-actions.js`, `use-rollback.js`, `use-undo-redo.js`, `use-append-import.js` — all already side-aware via `useSideLorebookId()`.

## Architecture reminders (from CLAUDE.md)

- `constants → services → hooks → components`, imports only flow downward.
- Components import only from `hooks/`. Don't regress `CrosstalkPrototype.jsx` back to direct store/service imports.
- `storage-service.js` is the only file that touches `localStorage`.
- No tests, no linter — verify by `npm run build` and manually exercising `?crosstalk=1`.

## Commit-per-step discipline

User wants granular commits. Each debugging fix should be its own commit with a clear "why". Push after each to keep the preview URL current.

## Do not

- Do not rewrite `docs/plan.md` yet — user deferred that until the feature stabilizes.
- Do not add a diff service yet — that's a later sub-step.
- Do not widen changes beyond the crosstalk feature. Other hooks/components should keep working for single-lorebook mode (no `?crosstalk=1`).
