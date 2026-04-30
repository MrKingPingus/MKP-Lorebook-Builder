# Mobile Crosstalk Redesign

Adapts Phase 9 lorebook crosstalk to mobile. Replaces the desktop side-by-side
pane model with an overlay/annotation model. Desktop crosstalk is unchanged.

---

## Core Philosophy

**The user's anchor never moves without an explicit gesture.** Mobile users
inhabit the active book. The reference book is *felt*, not *visited* — its
content surfaces inline as annotations on active entries, and reveals itself
as a one-deep peek overlay when the user taps a reference-related affordance.

The reference book is never rendered as a list on mobile.

---

## Scope

- Mobile viewports only (viewport width < 768px, gated by `useMobile()`).
- Desktop side-by-side `pane-split` layout, swap-on-edit-click behaviour,
  and `ReferencePanel` rendering remain exactly as today.
- No store schema changes. All `lorebook-store` and `ui-store` actions
  already in place are reused: `swapReference()`, `setReferenceLorebookId`,
  `referenceLorebookId`, the existing `conflictMap` from `useCrosstalk`.

---

## Decisions Locked In

| Question | Decision |
|---|---|
| Default model for reference on mobile | Inline annotations only, plus a peek-overlay layer. No reference list rendered. |
| Peek overlay depth | One-deep. Opening another reference entry from within an overlay replaces the current one. |
| Crosstalk surfacing in entry detail | Collapsible Crosstalk row, hidden until ≥1 overlap exists. Lists same-name match (top-pinned) plus shared trigger keywords. |
| Role-swap control | Segmented `ACTIVE` / `REFERENCE` button above the entry list. Hidden when no reference is paired. |
| Active → reference copy | Small "Copy to reference" action in the active entry detail panel footer. Rare-case path. |
| Reference → active copy | "Copy to active" as primary footer action on the peek overlay. Dominant path. |
| Multi-select cross-book copy on mobile | Dropped. Cross-book copy is single-entry only on mobile. |
| "Also in reference" name badge | Only on exact same-name match. |
| Search results dropdown | Unified list; reference-side hits get a "ref" pill; tap → peek overlay. |
| Find & Replace layout | Unchanged. Three buttons (Apply to Active / Reference / Both) retained. |
| Reference picker location | Menu panel, alongside the crosstalk toggle. |
| Setting label | "Pair with reference lorebook" (replaces "Show reference panel" on mobile, or globally — see Open Items). |

---

## New Primitive

**Reference entry overlay** — a single read-only modal/sheet that every
reference-aware affordance routes through.

- Renders one reference entry (name, type, triggers, description) read-only.
- Footer actions:
  - **Copy to active** (primary) — pulls the entry into the active book.
    Reuses single-entry copy logic from `use-bulk-actions.js`.
  - **Visit this entry** (explicit-swap escape hatch) — calls
    `swapReference()` and lands focus on this entry's id.
- Dismissible via back button and scrim tap.
- One-deep only. A "view related" tap from inside the overlay replaces the
  current entry rather than stacking.

State: a single `peekReferenceEntryId` field on `ui-store` (ephemeral; null
when no peek is open).

---

## Affected Surfaces

### Layout
- **`FloatingWindow.jsx`** — on mobile, suppress the second `pane-split-slot`.
  `ReferencePanel` does not render on mobile under any condition.
- **`ReferencePanel.jsx`** — desktop-only going forward; click-to-swap on
  reference cards stays desktop-only.

### Build view
- **`BuildPanel.jsx`** — when `crosstalkEnabled && referenceLorebook` and
  `isMobile`, render a segmented `ACTIVE` / `REFERENCE` control above the
  entry list. Tapping the inactive side calls `swapReference()`. Hidden
  entirely when no reference is paired.
- **Menu panel / `SettingsPanel.jsx`** — reference picker moves here on
  mobile (currently lives in `ReferencePanel`'s pane header). Sits next to
  the crosstalk toggle.

### Entry views
- **`EntryCard.jsx`** and **`EntryDetailPanel.jsx`** — render a small "ref"
  badge next to the entry name when a same-named entry exists in the
  reference book. Tap → opens peek overlay for that reference entry.
- **`EntryDetailPanel.jsx`** — add a collapsible Crosstalk row, hidden until
  ≥1 overlap exists. Contents:
  - Same-name match, top-pinned, when present
  - One row per shared trigger keyword (sourced from `conflictMap`)
  - Each row taps through to the peek overlay
- **`EntryDetailPanel.jsx` footer** — add a small "Copy to reference" action
  for the rare push direction.

### Triggers
- **Trigger chip conflict popover** (existing crosstalk popover) — on mobile,
  taps on reference-side entries route to the peek overlay instead of
  navigating. Active-side entries still navigate as today.

### Search
- **`SearchBar.jsx` / search dropdown** — on mobile, reference-side hits get
  a "ref" pill. Tap → peek overlay. Active-side hits scroll/jump as today.
  Per-side match counts on `GlobalFilterBar` stay as they are.

### Find & Replace
- **`FindReplace.jsx`** — unchanged. Apply to Active / Reference / Both
  buttons retained.

### Selection / bulk
- **`BulkActionBar.jsx`** — drop the cross-pane copy variant on mobile.
  Selection on mobile is active-side only. Active-side bulk actions
  (delete, etc.) remain available.

---

## Implementation Tasks

- [ ] Add `peekReferenceEntryId` field + setter to `ui-store.js`
- [ ] Create `ReferenceEntryOverlay.jsx` — read-only entry display + footer
      actions ("Copy to active", "Visit this entry"), dismiss on back/scrim
- [ ] Wire "Copy to active" to single-entry copy from `use-bulk-actions.js`
- [ ] Wire "Visit this entry" to `swapReference()` + scroll/focus by id
- [ ] Suppress second `pane-split-slot` on mobile in `FloatingWindow.jsx`
- [ ] Add segmented `ACTIVE` / `REFERENCE` swap control above the mobile
      entry list in `BuildPanel.jsx`; hidden when no reference paired
- [ ] Move reference picker into menu panel; gate the move behind
      `isMobile` so desktop pane-header picker is untouched
- [ ] Update setting label to "Pair with reference lorebook" on mobile
- [ ] Add same-name "ref" badge to entry name on `EntryCard.jsx` and
      `EntryDetailPanel.jsx`; tap → set `peekReferenceEntryId`
- [ ] Add collapsible Crosstalk row to `EntryDetailPanel.jsx`: same-name
      top-pinned + shared trigger rows; rows tap → set
      `peekReferenceEntryId`
- [ ] Mobile-branch the trigger chip conflict popover so reference-side
      rows route to peek instead of navigation
- [ ] Add "ref" pill to reference-side rows in the search results
      dropdown; tap → set `peekReferenceEntryId`
- [ ] Add "Copy to reference" footer action to active
      `EntryDetailPanel.jsx`
- [ ] Hide cross-pane copy in `BulkActionBar.jsx` on mobile

---

## Stop Condition

On a mobile viewport with crosstalk enabled and a reference lorebook paired:

- The reference book is never rendered as a list anywhere
- Tapping a reference-side entry in a trigger conflict popover opens the
  peek overlay instead of navigating
- The search dropdown tags reference-side hits with a "ref" pill, and
  tapping a tagged hit opens the peek overlay
- An active entry with a same-name reference match displays a "ref" badge;
  tapping it opens the peek overlay
- Expanded entry detail shows a collapsible Crosstalk row when ≥1 overlap
  exists; same-name is top-pinned, shared triggers follow; each row taps
  through to the peek overlay
- The peek overlay's "Copy to active" successfully pulls the entry into
  the active book
- The peek overlay's "Visit this entry" successfully swaps roles and
  lands focus on that entry's id
- The segmented `ACTIVE` / `REFERENCE` control swaps roles via
  `swapReference()` and is hidden when no reference is paired
- The active entry detail panel exposes a "Copy to reference" action
- F&R retains the existing three Apply buttons unchanged
- Desktop crosstalk behaviour is byte-for-byte identical to before this
  redesign

---

## Out of Scope

- Desktop crosstalk UI (unchanged)
- Multi-deep peek stacking
- Diff-based overlap detection in the Crosstalk row (would depend on the
  Phase 9 `diff-service.js` prerequisite)
- Batch cross-book copy on mobile

---

## Open Items For Later

- Whether the overlay/peek pattern is worth backporting to desktop as an
  alternate mode
- Whether multi-deep peek stacking is needed in practice (revisit after
  one-deep ships)
- Whether to surface near-duplicate description matches in the Crosstalk
  row once `diff-service.js` exists
- Whether the setting label change ("Pair with reference lorebook") should
  apply globally or only on mobile
