# Phase 9 Crosstalk — Handoff (active + reference pivot)

Short brief for a fresh Claude session. Reads in under two minutes.

## Status

A dual-active-editor prototype was built, debugged, and **retracted**. Design pivoted to **active + reference** — see `docs/plan.md` → Phase 9 for the feature spec.

- **Current branch**: `phase-9-crosstalk` (long-lived feature branch — reuse across sessions, don't cut a new per-session branch)
- **Pre-prototype baseline commit**: `0e14206` (merge of Polish Pass 4)
- **Last build**: green (`npm run build`) after B2.

## Progress so far

- **A1 (done, commit `72cece6`)**: 16 prototype-touched files reverted to baseline. 3 prototype-only files (`CrosstalkPrototype.jsx`, `use-crosstalk-slots.js`, `use-side.js`) deleted. src/ matches `0e14206` exactly.
- **A2 (resolved as no-op)**: The d99cec8 defensive snapshot was dual-slot-specific. Single-slot `deleteLorebook` has no follow-on live-store reads, so there's nothing to snapshot. The equivalent work — handling `referenceLorebookId === deletedId` — folded into B1.
- **B1 (done, commit `0b89e9a`)**: `lorebook-store` now has `referenceLorebookId` + `setReferenceLorebookId` + `swapReference`. Setter-level invariant enforcement: reference ≠ active, with a `canSwap` guard for the edge case where the displaced slot has been removed from `lorebooks` (e.g. during a delete flow). `removeLorebook` nulls reference if the removed id was the reference.
- **B2 (done)**: `src/hooks/use-reference-lorebook.js` — thin component-facing wrapper over the B1 store API. Returns `referenceLorebook` (resolved object), `setReferenceLorebookId`, `swapReference`, `clearReference`. `swapReference` calls the store swap and then `clearSelection()` from `ui-store` — selection is active-only, so swapping would otherwise leave the new active side holding selected ids that belong to the old lorebook.
- **`docs/glossary.md` created** — plain-language reference doc for non-engineer audience. Grows over time.

## Why the retreat

Two active editors sharing a single `ui-store`, `history-store`, and single-slot autosave produced a cascade: autosave clobber, dangling slot references on delete, lorebook-creation displacing the focused slot, and a widening surface across every edit hook. Fixing each symptom exposed another. The active+reference model keeps the single-editor architecture intact and delivers ~90% of the perceived feel of simultaneous editing.

## Remaining commit-boundary plan

Each commit below is a natural stopping point. Verify with `npm run build` between them.

### Phase B — Reference-panel scaffold (gated)

- **B3**: `src/components/feature/ReferencePanel.jsx` — read-only render: name header, picker (excludes active id), entry list, trigger badges, rollback indicator. All edit-shaped surfaces wrapped in a single `onMouseDown` handler that calls `swapReference()` and bails. Search/filter/picker/scroll exempt. Consumes `useReferenceLorebook()` from B2.
- **B4**: Re-introduce `?crosstalk=1` URL gate in `FloatingWindow.jsx`. When active, render `BuildPanel` + `ReferencePanel` 50/50 with a thin divider. Normal mode untouched.

### Phase C — Global search/filter/sort

- **C1**: Promote the search bar, filter chips, and sort dropdown above the pane split. Both panels consume the same `ui-store` fields. In single-panel mode the bar sits above the panel as well — minor shuffle; validate visually before continuing. If unacceptable, duplicate the placement logic (keep in-panel when not in crosstalk).

### Phase D — Lateral find & replace

- **D1**: `use-find-replace.js` gains optional `lorebookIds` array. Default is `[activeLorebookId]`; in crosstalk, `[activeLorebookId, referenceLorebookId]` (nulls filtered). Preview groups results per-lorebook.
- **D2**: Two Apply buttons — "Apply to Active" and "Apply to Reference". Apply-to-reference swaps, applies, swaps back (all state flips, no remount). Satisfies the Phase 9 per-lorebook-confirmation spec.

### Phase E — Housekeeping

- **E1**: Drop `?crosstalk=1` gate, add a menu toggle to show/hide the reference panel. Update `docs/plan.md` checkboxes. Delete this handoff file.

## Key architectural rules (from CLAUDE.md)

- Imports flow downward: `constants → services → hooks → components`.
- Components import only from `hooks/` — never stores or services directly.
- `storage-service.js` is the only file that touches `localStorage`.
- `autosave.js` is a plain service, not a hook.
- No tests, no linter. Verify with `npm run build` and manual browser exercise.

## Open questions for the next session

1. **Autosave writes reference too?** — only the active side actually mutates; reference JSON on disk is already current from when it was last active. Default: don't write reference. Reconsider if the sequence "edit A → swap → edit B → swap back → edit A again" ever produces staleness. Revisit in/after B4 once the swap is exercised in the browser.
2. **Reference persistence across sessions** — currently `referenceLorebookId` is ephemeral (not written to localStorage on boot). For MVP that's fine; user can re-pick on reload. Promote to persisted if user feedback asks for it. Would add an `__ref` key in `storage-service.js` and a load in `App.jsx`.
3. **Swap animation** — assumed absent in B3, brief in D2. Revisit after B4 is usable; the user will have opinions once they feel it.
4. **Search-bar placement in default (non-crosstalk) view** — C1 hoists the bar above the panel everywhere. If the user wants the default view preserved as-is, we add a conditional render and accept a small duplication.

## Start here

Read `docs/plan.md` → Phase 9 and this file's Progress so far. Then start on **B3** — `src/components/feature/ReferencePanel.jsx`. The store API (B1) and hook (B2, `src/hooks/use-reference-lorebook.js`) are already in place; the panel should consume `useReferenceLorebook()` and render read-only. Every edit-shaped surface (entry card body, Expand, Remove, FAB, name input, trigger editor, description textarea) gets a single `onMouseDown` that calls `swapReference()` and bails — search, filter, picker, and scroll are exempt.
