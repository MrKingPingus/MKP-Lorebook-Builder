# Phase 9 Crosstalk — Handoff (active + reference pivot)

Short brief for a fresh Claude session. Reads in under two minutes.

## Status

A dual-active-editor prototype was built, debugged, and **retracted**. Design pivoted to **active + reference** — see `docs/plan.md` → Phase 9 for the feature spec.

- **Current branch**: `phase-9-crosstalk` (long-lived feature branch — reuse across sessions, don't cut a new per-session branch)
- **Pre-prototype baseline commit**: `0e14206` (merge of Polish Pass 4)
- **Last build**: green (`npm run build`) after B4.

## Progress so far

- **A1 (done, commit `72cece6`)**: 16 prototype-touched files reverted to baseline. 3 prototype-only files (`CrosstalkPrototype.jsx`, `use-crosstalk-slots.js`, `use-side.js`) deleted. src/ matches `0e14206` exactly.
- **A2 (resolved as no-op)**: The d99cec8 defensive snapshot was dual-slot-specific. Single-slot `deleteLorebook` has no follow-on live-store reads, so there's nothing to snapshot. The equivalent work — handling `referenceLorebookId === deletedId` — folded into B1.
- **B1 (done, commit `0b89e9a`)**: `lorebook-store` now has `referenceLorebookId` + `setReferenceLorebookId` + `swapReference`. Setter-level invariant enforcement: reference ≠ active, with a `canSwap` guard for the edge case where the displaced slot has been removed from `lorebooks` (e.g. during a delete flow). `removeLorebook` nulls reference if the removed id was the reference.
- **B2 (done)**: `src/hooks/use-reference-lorebook.js` — thin component-facing wrapper over the B1 store API. Returns `referenceLorebook` (resolved object), `setReferenceLorebookId`, `swapReference`, `clearReference`. `swapReference` calls the store swap and then `clearSelection()` from `ui-store` — selection is active-only, so swapping would otherwise leave the new active side holding selected ids that belong to the old lorebook.
- **B3 (done)**: `src/components/feature/ReferencePanel.jsx` + matching CSS. Read-only render: picker (filters out active id via `useLorebookSwitcher`), lorebook name, entry list with type-color accent, stats badge, rollback-snapshot indicator, and trigger chips. One `onMouseDown={swapReference}` handler on the name bar and on the inner `.reference-panel-entries` wrapper — picker lives outside the swap surfaces, and the scroll container is the outer `.reference-panel-body` (scrollbar clicks don't land on the swap-handling inner wrapper).
- **B4 (done)**: `FloatingWindow.jsx` gates a second `flex: 1` slot beside `BuildPanel` on a module-level `crosstalkEnabled` constant read once from `?crosstalk=1`. When active, `ReferencePanel` renders to the right of Build and inherits the existing row layout on `.window-body`; the thin divider is the `border-left` already on `.reference-panel` from B3. Normal mode is byte-identical to pre-B4 (the new branch only runs when the query flag is set). `MenuPanel` still opens to the far right of both panels when used together. Mobile stacks via the existing `flex-direction: column` on `.window-body`.
- **C1 (done)**: New `src/hooks/use-display-entries.js` wraps the `useSearch → useTypeFilter → useSort → group-by-type` pipeline so multiple callers derive from the same ui-store state. New `src/components/feature/GlobalFilterBar.jsx` hosts `SearchBar` + `TypeFilterBar` and sits above the pane split in `FloatingWindow.jsx`. `BuildPanel` now only renders the mobile lorebook-name field + `EntryList`. `ReferencePanel` runs its entries through `useDisplayEntries` so it honors the same filter/sort as the active side; empty-filter path shows a "No entries match" message. Layout change: `.window-body` stays column on desktop, and the new `.pane-split` takes over as the flex row (Build | Reference | MenuPanel). Placement is the same in single-panel and crosstalk modes — the bar always lives above the pane. MenuPanel's mobile full-screen overlay still works because `.pane-split` is intentionally not positioned and doesn't clip overflow, so `position: absolute; inset: 0` resolves to `.window-body`.
- **C1.5 polish (done)**: (a) Swap now keeps the clicked panel in its slot. Added `activeSide: 'left' | 'right'` + `toggleActiveSide` to `ui-store`; `useReferenceLorebook.swapReference` flips both the id roles and the side flag. `FloatingWindow` picks which component renders in each pane-split slot based on `activeSide`, so only the role changes visually — no left↔right jump. (b) Reference body dimmed to `opacity: 0.62`, hover back to 1 as an "edit here if you click" cue. (c) The pane divider moved off `.reference-panel.border-left` to a `.pane-split-slot + .pane-split-slot` between-slot border so the divider is positional, not content-tied. (d) Symmetric pane headers: new shared `.pane-header` (single row: label + inline compact picker) used by both `BuildPanel` (ACTIVE label + picker that calls `switchLorebook`, options exclude reference) and `ReferencePanel` (REFERENCE label + reference picker, options exclude active). The old `.reference-panel-header` (stacked label-above-picker) and the redundant `.reference-panel-name` bar are removed; entry area still carries the swap `onMouseDown`. (e) Mode-specific chrome: `CROSSTALK_ENABLED` moved out of `FloatingWindow.jsx` into `src/constants/crosstalk.js` so other components can read it. In **solo mode** `BuildPanel`'s pane-header is suppressed and `WindowHeader` grows a small ▼ caret button next to the name input that opens a new `LorebookSwitchPopover` (portal-rendered list of other lorebooks, click-to-switch). In **crosstalk mode** the pane-headers own switching and the window-header stays rename-only. Future: when diff highlighting lands, the same "matching strings on both sides" treatment should extend to search-term highlights.
- **`docs/glossary.md` created** — plain-language reference doc for non-engineer audience. Grows over time.

## Why the retreat

Two active editors sharing a single `ui-store`, `history-store`, and single-slot autosave produced a cascade: autosave clobber, dangling slot references on delete, lorebook-creation displacing the focused slot, and a widening surface across every edit hook. Fixing each symptom exposed another. The active+reference model keeps the single-editor architecture intact and delivers ~90% of the perceived feel of simultaneous editing.

## Remaining commit-boundary plan

Each commit below is a natural stopping point. Verify with `npm run build` between them.

### Phase B — Reference-panel scaffold (gated)

Complete. Panel renders behind `?crosstalk=1`; swap-on-click is wired.

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

Phase C1 is done. Load the app with `?crosstalk=1`, pick a reference lorebook, and verify: search/sort/type-filter changes in the hoisted bar drive both panels; in single-panel mode the bar sits above `BuildPanel` with no visual regression; select-mode + bulk actions still target the active lorebook only; mobile stacking still works; the menu panel still opens full-screen on mobile.

Then start **D1** — extend `use-find-replace.js` with an optional `lorebookIds` array (default `[activeLorebookId]`; in crosstalk `[activeLorebookId, referenceLorebookId]` with nulls filtered). Preview should group results per-lorebook. D2 follows with two Apply buttons ("Apply to Active", "Apply to Reference"); apply-to-reference swaps, applies, swaps back — all state flips, no remount. Revisit the open question on autosave (#1) after a real session of swapping — that's the simplest way to surface any staleness.
