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
| Active → reference copy | Small "Copy to reference" action in the active entry detail panel footer. Rare-case path. Multi-select push deferred. |
| Reference → active copy | "Copy to active" as primary footer action on the peek overlay (single entry). Multi-select pull happens via the **Pick from Reference** pose — see below. |
| Multi-select cross-book pull on mobile | Supported via a temporary "pose" — entering pick mode swaps roles so the reference book is rendered in the active slot; user uses standard Select mode against it; commit performs the copy and swaps back. |
| Multi-select cross-book push on mobile | Deferred. The plumbing supports it (the same swap-and-back pattern works in reverse), but no entry point is exposed yet — revisit after pull is in real use. |
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

## Pick from Reference (multi-select pull)

Multi-select cross-book pull on mobile uses a temporary **pose** rather than a
new picker component. The user enters pick mode from inside Select mode; the
app calls `swapReference()` so the reference book is now rendered in the
active slot, and the existing Select mode UX operates against it unchanged.
On commit, the selected entries are copied to the original active book and
the swap is reversed. Reuses existing primitives — no parallel selection
plumbing.

**Entry point:** a "Copy From Reference" button in `BulkActionBar`, sitting
beside the "Change Type…" button. Visible only when
`isMobile && crosstalkEnabled && referenceLorebook && !pickFromReferenceMode`.

**Modality:** pick mode is modal-ish for the duration —

- A banner renders at the top of the entry list: "Picking from [Reference
  Name] — Cancel".
- The segmented `ACTIVE` / `REFERENCE` swap control is hidden.
- Peek overlays are suppressed (the user is already browsing the reference
  book directly — nothing to peek).
- The menu panel still works normally.
- Exit paths: banner Cancel, bar's `× Exit`, or commit (Copy & Done).

**Bar contents during pick mode:**

- `× Exit` reads as Cancel — swaps back, clears selection, exits Select mode.
- Select All Visible / Deselect All / Change Type… work as today against the
  posed reference book.
- The "Copy From Reference" entry-point button is hidden (already in pose).
- A "Copy & Done" button replaces it: commits `copyToOtherPanel()` (which
  already does the right cross-book copy because `selectionSide === 'active'`
  during pose), then swaps back, clears selection, exits Select mode.

**State:** a `pickFromReferenceMode: boolean` field on `ui-store`, plus
`enterPickFromReference()` / `exitPickFromReference(commit)` actions that
bundle the swap, selection clear, and Select mode entry/exit.

**Why this works without new plumbing:** `useSelection`,
`use-bulk-actions.js`'s `copyToOtherPanel`, and the existing `BulkActionBar`
all operate on whichever lorebook is currently active — they don't care that
"active" is the reference book during the pose. Only the entry/exit
choreography is new.

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
- **`BulkActionBar.jsx`** — outside pick mode on mobile, the existing
  cross-pane copy button is suppressed (since reference isn't visible to
  select from, and multi-select push is deferred). A new "Copy From
  Reference" button is added beside "Change Type…", visible only when
  `isMobile && crosstalkEnabled && referenceLorebook && !pickFromReferenceMode`.
  Tapping it calls `enterPickFromReference()`. During pick mode, the bar
  re-renders with a "Copy & Done" commit button in place of the entry-point
  button, and `× Exit` becomes the Cancel path. Desktop bar is unchanged.

---

## Phase Status

Implementation is phased so each phase leaves the app in a working state.
Per CLAUDE.md, new `ui-store` fields are added in the phase that consumes
them rather than all up front.

- **Phase 1 — Foundation (structural)** ✅
  - Suppressed second `pane-split-slot` on mobile in `FloatingWindow.jsx`
  - Suppressed crosstalk pane-header on mobile in `BuildPanel.jsx`
  - Added mobile-only reference picker to `SettingsPanel.jsx`
  - Renamed setting label to "Pair with reference lorebook" on mobile;
    updated hint text to describe the annotation/overlay model
- **Phase 2 — Peek overlay primitive** ⏳
- **Phase 3 — Annotations layer** ⏳
- **Phase 4 — Single-entry push + segmented swap** ⏳
- **Phase 5 — Pick from Reference pose** ⏳

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
- [ ] Add `pickFromReferenceMode` field + `enterPickFromReference()` /
      `exitPickFromReference(commit)` actions to `ui-store.js`
- [ ] Add "Copy From Reference" entry-point button to `BulkActionBar.jsx`,
      mobile + crosstalk-paired only
- [ ] Render pick-mode banner ("Picking from [Reference Name] — Cancel")
      above the entry list while `pickFromReferenceMode` is true
- [ ] Re-skin `BulkActionBar.jsx` during pick mode: hide entry-point button,
      show "Copy & Done" commit button, repurpose `× Exit` as Cancel
- [ ] Hide segmented `ACTIVE` / `REFERENCE` swap control during pick mode
- [ ] Suppress peek overlay rendering during pick mode
- [ ] Suppress the existing cross-pane copy variant in `BulkActionBar.jsx`
      on mobile *outside* pick mode (push is deferred)

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
- Entering Select mode shows a "Copy From Reference" button beside
  "Change Type…"; tapping it enters pick mode (banner appears, segmented
  swap control disappears, peek overlays are suppressed); the user can
  multi-select reference entries via standard Select UX; "Copy & Done"
  commits the copy and swaps back; `× Exit` cancels and swaps back
- F&R retains the existing three Apply buttons unchanged
- Desktop crosstalk behaviour is byte-for-byte identical to before this
  redesign

---

## Out of Scope

- Desktop crosstalk UI (unchanged)
- Multi-deep peek stacking
- Diff-based overlap detection in the Crosstalk row (would depend on the
  Phase 9 `diff-service.js` prerequisite)
- Multi-select push (active → reference) on mobile — the swap-and-back
  pattern supports it symmetrically, but no entry point is exposed yet

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
- Whether to expose a multi-select push entry point ("Send to Reference"
  in `BulkActionBar` on mobile) once the pull pose has seen real use
