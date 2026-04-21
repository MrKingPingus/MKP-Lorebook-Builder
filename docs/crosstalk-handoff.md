# Phase 9 Crosstalk — Handoff (active + reference pivot)

Short brief for a fresh Claude session. Reads in under two minutes.

## Status

A dual-active-editor prototype was built, debugged, and **retracted**. Design pivoted to **active + reference** — see `docs/plan.md` → Phase 9 for the feature spec.

The prototype code is still on the branch. First job of the next session is to revert it.

- **Current branch**: `claude/continue-crosstalk-work-uFhuT`
- **Pre-prototype baseline commit**: `0e14206` (merge of Polish Pass 4)
- **Last build**: green (`npm run build`) on current branch; will re-verify after revert.

## Why the retreat

Two active editors sharing a single `ui-store`, `history-store`, and single-slot autosave produced a cascade: autosave clobber, dangling slot references on delete, lorebook-creation displacing the focused slot, and a widening surface across every edit hook. Fixing each symptom exposed another. The active+reference model keeps the single-editor architecture intact and delivers ~90% of the perceived feel of simultaneous editing (see plan.md for details).

Two fixes from the prototype debug are worth preserving as single-slot equivalents:
1. **Autosave**: in single-slot mode this is a no-op (original code already writes `lorebooks[activeLorebookId]`). Do not re-introduce the dual-slot iteration.
2. **Delete path**: snapshotting store state before mutation is a good defensive pattern; the dual-slot cleanup branches become unreachable and should be stripped.

## Commit-boundary plan

Each commit below is a natural stopping point. Verify with `npm run build` between them.

### Phase A — Retreat to single-slot

- **A1: Revert prototype** — restore the 16 prototype-touched files to their `0e14206` state in one commit. Use `git checkout 0e14206 -- <files>`. Files touched by the prototype (get the list from `git diff --stat 0e14206 HEAD -- src/`):
  - `src/components/feature/CrosstalkPrototype.jsx` (delete)
  - `src/components/layout/FloatingWindow.jsx`
  - `src/hooks/use-append-import.js`, `use-bulk-actions.js`, `use-crosstalk.js`, `use-crosstalk-slots.js` (delete), `use-entries.js`, `use-find-replace.js`, `use-lorebook.js`, `use-rollback.js`, `use-side.js` (delete), `use-undo-redo.js`
  - `src/services/autosave.js`
  - `src/state/history-store.js`, `src/state/lorebook-store.js`
  - `src/style.css`
- **A2: (no-op after A1; resolved)** — The d99cec8 defensive snapshot was specific to dual-slot state reads (`leftId`/`rightId`/`focusSide`/`setSlot`). Single-slot `deleteLorebook` has no follow-on live-store reads, so there's nothing to snapshot. The equivalent work — handling the case where the deleted lorebook is the current reference — is folded into B1 alongside `referenceLorebookId` introduction, where the consumer and the defensive read can live in one atomic commit.

### Phase B — Reference-panel scaffold (gated)

- **B1**: Add `referenceLorebookId`, `setReferenceLorebookId(id)`, `swapReference()` to `lorebook-store`. Setter enforces reference ≠ active (setting id === activeLorebookId triggers a swap instead of a same-id write).
- **B2**: `src/hooks/use-reference-lorebook.js` — exposes `referenceLorebook`, `setReferenceLorebookId`, `swapReference`, `clearReference`. Clears UI selection on swap (selection is active-only).
- **B3**: `src/components/feature/ReferencePanel.jsx` — read-only render: name header, picker (excludes active id), entry list, trigger badges, rollback indicator. All edit-shaped surfaces wrapped in a single `onMouseDown` handler that calls `swapReference()` and bails. Search/filter/picker/scroll exempt.
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

1. **A1 revert style**: one checkout-based commit (clean history, recommended) vs. 13 individual `git revert` calls (easier to bisect the prototype specifically, messier log). Default to the single commit unless the user prefers otherwise.
2. **Autosave writes reference too?** (B1 variation) — only the active side actually mutates; reference JSON on disk is already current from when it was last active. Default: don't write reference. Reconsider if the sequence "edit A → swap → edit B → swap back → edit A again" ever produces staleness.
3. **Swap animation** — assumed absent in B3, brief in D2. Revisit after B4 is usable; the user will have opinions once they feel it.
4. **Search-bar placement in default (non-crosstalk) view** — C1 hoists the bar above the panel everywhere. If the user wants the default view preserved as-is, we add a conditional render and accept a small duplication.

## Start here

Read `docs/plan.md` → Phase 9. Then start on Commit A1. `git diff --stat 0e14206 HEAD -- src/` gives the file list.
