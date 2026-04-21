# MKP Lorebook Builder — Implementation Plan

---

## Project Overview

MKP Lorebook Builder is a browser-only SPA for authoring AI lorebooks — structured collections of named entries with triggers, types, and descriptions that activate contextual information in LLM sessions. No backend, no accounts, no installation. All state lives in localStorage.

---

## Phase 8 — Entry Enhancements

**Goal:** Entries have richer authoring tools — per-entry limit overrides, empty field health evaluation, and an opt-in rollback system for saving and restoring entry states.

### Features

**Warning / Notification System:**
- [x] Entry health evaluator — service that scans an entry or lorebook and returns structured findings for consumers to display; used by empty field notifications

**Per-Entry Limit Overrides:**
- [x] Schema: add `ignoreLimitWarnings: { description: false, triggers: false }` to entry shape in `entry-factory.js` and `defaults.js`; backwards-compatible default of false
- [x] Description override toggle — appears next to the "1500 char limit" label on the description field when the char count crosses the yellow tier threshold; disappears if count drops back below threshold; toggling sets `ignoreLimitWarnings.description`; overridden field shows always-on blue (`#60a5fa`) border instead of yellow/red
- [x] Trigger override toggle — appears to the right of the "Trigger Keywords" label in the trigger section header when trigger count crosses `TRIGGER_WARN_YELLOW`; same show/hide and blue border behavior as description override; toggles `ignoreLimitWarnings.triggers`

**Entry Rollback System (opt-in):**
- [x] `entry.snapshots` array on entry schema — capped array of snapshot objects `{ name, type, description, triggers, timestamp, label }`; added to `entry-factory.js` and `defaults.js`; backwards-compatible default of empty array. Snapshot covers all four content fields (name, type, description, triggers).
- [x] Rollback settings — enabled toggle (default **Off**, stored per-lorebook on the lorebook object); snapshot count selector: 1 / 3 / 5 / Custom (integer 1–10, capped by `ROLLBACK_MAX_CUSTOM`); global "always enable rollback for new lorebooks" toggle in `settings-store` / `DEFAULT_SETTINGS`
- [x] Storage warning — surfaced in settings UI when count exceeds `ROLLBACK_SNAPSHOT_WARN` (5); explains localStorage pressure
- [x] Greyed rollback button on entry card — visible but disabled when rollback is Off; hover tooltip explains how to enable it in settings; active when rollback is On; shows snapshot count when snapshots exist
- [x] Auto-snapshot on first edit — when rollback is enabled and a user edits an entry for the first time in a session, a snapshot is silently taken before the edit; session tracking via module-level Set in `rollback-service.js`
- [x] Navigate-away prompt — when rollback is enabled and the entry has been edited since the last snapshot, collapsing the entry (desktop) or closing the panel (mobile) triggers a prompt: "Save New / Replace Latest / Skip" with a "Don't ask again this session" option
- [x] Manual rollback save — "Save now" button in the rollback panel saves a snapshot on demand; prompt suppression is re-enabling via the session flag in `rollback-service.js`
- [x] Rollback dropdown UI — `RollbackPanel` component lists saved snapshots; each labeled with timestamp by default, user-editable inline; delete button per snapshot
- [x] Rollback snapshot preview — selecting a snapshot opens a preview pane (stacked within the entry card) showing snapshot content (name, type, triggers, description) read-only; ComparisonPanel prerequisite was dropped in favour of this simpler in-card approach after design review
- [x] Rollback restore — "Restore this snapshot" button replaces current entry content with the snapshot; action is undoable via existing undo/redo stack (`discrete = true`)
- [x] Independent from undo/redo — rollback system has no connection to `history-store.js`; they operate entirely separately

### Stop Condition

User can enable rollback in settings, edit an entry, navigate away and confirm the "Replace or Save New" prompt appears, save a new snapshot with a custom label, open the rollback dropdown, select a snapshot to preview it, and restore the snapshot. Per-entry limit override toggles appear when description character count or trigger count crosses their respective yellow thresholds, dismiss the warning border on toggle, and persist per entry.

**Status:** All remaining items shipped. Phase 8 is effectively complete pending sign-off.

---

## Polish Pass 3

**Goal:** Address outstanding bug reports and small quality-of-life features surfaced during Phase 8 and earlier usage. Completed before Phase 9 begins.

### Bugs

- [x] **Regenerate (Reroll) Suggestions not working** — pressing the reroll button in the suggestions tray has no effect. Expected: new suggestions are generated and displayed. Suspected area: `SuggestionsTray.jsx` handler and/or `suggestion-engine.js` invocation.
- [x] **Capitalized trigger suggestions** — suggestions currently default to lowercase regardless of the capitalization of the source word. Expected: if the reference word is capitalized (proper nouns, etc.), the suggested trigger preserves that capitalization. Fix location: `suggestion-engine.js`.
- [x] **Backslash artifacts on import with asterisks** — importing entries that contain asterisks produces spurious backslash characters in the imported text. Likely extends to other markdown-adjacent characters. Investigate import pipelines (`txt-import.js`, `docx-import.js`, `json-import.js`) for over-aggressive escaping.

### Features

- [x] **Copy-to-clipboard templates** — in the Import Templates section on the lander (and anywhere else templates are offered), add a "Copy" button alongside the existing "Download" button so users can paste the template into an existing doc instead of downloading a new file.

### Stop Condition

Reroll produces new suggestions when pressed; suggestions for capitalized source words retain their capitalization; importing an entry with asterisks (and similar characters) produces clean text with no backslash artifacts; users can copy a template directly to clipboard from the lander.

**Status:** All items shipped and verified. Polish Pass 3 is complete.

---

## Polish Pass 4

**Goal:** Final batch of bug fixes and small UX improvements surfaced during Phase 8 usage, plus two small feature additions (Allow All Overlap, Hide from Export). Completed before Phase 9 begins.

### Bugs

- [x] **Cross-sentence proper-noun pairs** — suggestion engine was producing bogus multi-word trigger candidates by pairing capitalized words across sentence/clause boundaries (e.g. the last word of one sentence + the first word of the next). Fix: `suggestion-engine.js` now splits description text on clause punctuation before building adjacency pairs.
- [x] **Suggestions tray toggle hitbox** — the toggle's clickable area stretched across the whole row because of `flex: 1`, swallowing clicks that should have landed on neighboring controls. Tightened to just the toggle's own width.
- [x] **Phrase-builder background color** — the phrase-builder tray used an out-of-theme green background. Switched to the standard text-field surface color for consistency.
- [x] **Hidden-entries popover actions** — Unhide and entry-name navigation buttons did nothing when clicked. Root cause: React synthetic pointerdown events bubbled through the virtual tree (including portals) to `WindowHeader`'s drag handler, which called `setPointerCapture` and swallowed the subsequent click. Fixed by stopping pointerdown/mousedown/click propagation at the popover root.

### Features

- [x] **Suggestion chip hover color** — changed hover state from red (which read as a destructive action) to green (additive). Matches the mental model that clicking a suggestion adds a trigger.
- [x] **Reroll button reposition** — moved the suggestions-tray reroll button to the right of the toggle so related controls sit together.
- [x] **Allow All Overlap** — one-click batch action that acknowledges every conflicting trigger on an entry in a single `updateAllowedOverlaps` call (avoids stale-state bugs from per-trigger loops). Button appears in the trigger section header when an entry has two or more unacknowledged overlaps. Desktop and mobile.
- [x] **Hide from Export** — per-entry opt-out from JSON/TXT/DOCX exports and clipboard copy. Toggle button on the rollback footer ("Exclude entry from JSON export"); closed-eye icon on the entry label when hidden ("Entry excluded from JSON export"); hidden-count indicator (`· N hidden`) beside the lorebook entry count in the window header; popover panel listing hidden entries with per-row Navigate and Unhide actions. Export services filter `hiddenFromExport` entries and also strip the flag from any remaining output. New `hiddenFromExport: false` field on `DEFAULT_ENTRY`, backwards-compatible.
- [x] **Export filename override** — Export panel now exposes a filename input (without extension) so users can download alternate-named versions of a lorebook without renaming from the downloads folder. Sanitizes to letters, numbers, underscore, and hyphen; resets to the active lorebook's sanitized name on switch.

### Stop Condition

Proper-noun suggestions no longer cross sentence boundaries; suggestions toggle and phrase-builder match the rest of the UI; user can batch-acknowledge all trigger overlaps on an entry; user can hide an entry from export via the rollback footer, see the closed-eye marker on the entry label, see the hidden count in the window header, open the popover to navigate to or unhide hidden entries, and confirm exports (JSON/TXT/DOCX/clipboard) omit hidden entries; user can override the download filename on the Export panel.

**Status:** All items shipped and verified. Polish Pass 4 is complete.

---

## Phase 9 — Global Features

**Goal:** The app can show two lorebooks side by side for congruency-checking, lateral search, and lateral find & replace. Users have a dedicated planner for drafting future entries.

### Design: Active + Reference

A dual-editor prototype (two `BuildPanel` instances behind a side-aware context) was attempted and retracted after it surfaced pervasive issues with two active editors sharing stores — autosave clobber, dangling slot references after delete, lorebook creation taking over the focused slot, and a widening refactor surface across every edit hook. Crosstalk uses an **active + reference** model instead:

- The **active side** is the existing single-lorebook editor. Unchanged.
- The **reference side** renders a second lorebook **read-only**.
- Clicking any edit-shaped element on the reference side (entry card body, Expand, Remove, FAB, name input, trigger editor, description textarea) **swaps** active ↔ reference in one Zustand state flip — no remount, no reload. Reads as "I edited that side."
- Picker, scroll position, and expanded-entry state stay per-side (do not swap).
- Search, filter, and sort are **global** — one UI above the pane split drives both sides. This natively satisfies the lateral-search requirement.
- Same lorebook on both sides is structurally forbidden (reference picker hides the active id; picking the active id from the reference picker triggers a swap).

Store impact is one new field on `lorebook-store` (`referenceLorebookId`). Every other store and hook retains its single-active-lorebook semantics.

### Prerequisites

- [ ] **`diff-service.js`** — compares two entry objects field by field and returns a structured delta. Used for rollback diff highlighting and (optional) cross-pane difference highlighting on same-named entries.

### Features

**Lorebook Crosstalk (Active + Reference):**
- [x] `referenceLorebookId` field + `setReferenceLorebookId` / `swapReference` actions in `lorebook-store`; invariant that reference ≠ active
- [x] `use-reference-lorebook.js` hook exposing the reference and the swap action
- [x] `ReferencePanel` component — read-only render of the reference lorebook with its own picker (excludes active id)
- [x] Swap-on-edit-click — single `onMouseDown` handler on edit-shaped reference surfaces that calls `swapReference()` before any edit UI can mount
- [ ] Global search/filter/sort bar promoted above the pane split in crosstalk mode; both panes consume the same filter state from `ui-store`
- [ ] Lateral find & replace — preview scans both active and reference entries; per-side Apply buttons (Apply to Active / Apply to Reference) satisfy the per-lorebook confirmation requirement
- [ ] Cross-pane diff highlighting (optional, uses `diff-service.js`) — when the same-named entry exists on both sides, highlight differing fields
- [ ] Menu toggle to show/hide the reference panel (once stable; gated behind `?crosstalk=1` during development)

**Rollback Diff Highlighting:**
- [ ] Wires `diff-service.js` into the rollback preview pane; activates the previously inert "Highlight Differences" button; field-level delta highlighting renders between snapshot and current entry state

**Entry Planner:**
- [ ] Planner panel — dedicated panel for notes and planned entry stubs; separate from the build panel
- [ ] Entry stub creation — converts a planner note into a blank entry shell in the active lorebook
- [ ] Stub filter on build page — filter toggle to show only entries created from stubs that have not been fully authored yet

### Stop Condition

User can set a reference lorebook on the right side, see both active and reference lists render, click any edit-shaped element on the reference to swap (editing then occurs on that side), search across both panes from one global bar, and run find & replace with a per-side Apply; user can create a planner note, convert it to an entry stub, and filter the build page to show only unfilled stubs; user can open a saved rollback snapshot and click "Highlight Differences" to see field-level changes highlighted.

**Estimated Complexity:** Medium (reduced from High after the active+reference pivot)

---

## Future Features

Features noted here are not assigned to a phase. They are documented to preserve intent and surface dependencies so implementation decisions can be made when the time is right.

---

**Lorebook JSON Metadata Portability (`_meta`)**
Add `createdAt` and `lastModified` timestamps to lorebook objects. Export: optional checkbox "Include metadata" appends a `_meta` block (timestamps + settings snapshot) to the JSON. Import: detect `_meta` block and prompt user to apply or skip the saved settings. Requires updates to `json-export.js`, `json-import.js`, lorebook creation, and `autosave.js`. Deferred from Polish Pass 2 — good idea but not yet worth the resource investment.

---

**In-App Help Menu / Documentation Panel**
A dedicated help section accessible from the UI (button or settings tab) containing usage guidance, tips, and feature explanations. Content scope and navigation structure not yet defined. Depends on: nothing technically blocking it, but content needs to be written before implementation makes sense. Deferred until user feedback clarifies what information users actually need surfaced in-app.

---

**Shift+Scroll on All Dropdowns**
`TypeSelector` already supports Shift+scroll to cycle through entry types without opening the dropdown. Extend this pattern to every other `<select>` in the app: the sort mode selector, the trigger delimiter selector (both in `EntryCard` and `EntryDetailPanel`), and any future dropdowns. The implementation is a self-contained `onWheel` handler on the `<select>` element — the existing `TypeSelector` code is the reference.

**Lookup Table Trigger System**
A categorised, genre-separated reference table for trigger suggestions — separate from the live suggestion engine. Users would browse or filter a curated list of triggers by type or genre and add them directly. Depends on: nothing currently built blocks it, but it is a substantial standalone feature. Would benefit from the suggestion engine architecture being stable first.

**Entry Planner Smart Assistance**
Extends the basic Entry Planner (Phase 9) with proper noun scanning via `scan-service.js` — detects names mentioned in planner notes that don't have existing entries and prompts the user to create them. Depends on: Entry Planner (Phase 9) and `scan-service.js` (Phase 7) both being complete.

**Lorebook Crosstalk — Second Window Mode**
The Phase 9 Lorebook Crosstalk uses a panel-within-window approach. For power users comparing large lorebooks, a second floating window may be more practical. Depends on: Phase 9 Lorebook Crosstalk being fully stable. Significant UI complexity — z-index management between two draggable windows.

**Category-Weighted Suggestion Variants**
`suggestion-engine.js` applies different suggestion weights and candidate pools based on entry type, so suggestions for a character entry differ meaningfully from those for a location entry. Requires a per-type lookup table or seed word list to have real impact. Deferred from Phase 7 until a lookup table approach is designed. Depends on: suggestion engine architecture being stable.

---

**Entry Splitting**
An optional system for breaking a long entry into two entries when it exceeds a length threshold. Includes:
- Split detection — identifies when an entry exceeds a threshold and suggests potential split points
- Entry split action — splits one entry into two; the second inherits all triggers from the first and a system-generated name suffix
- Linear/non-linear prompt — asks whether the split content is chronologically sequential; linear splits inject a bridging prefix phrase into the second entry's description
- Split chip — small badge on split entries indicating they are part of a pair
- Character limit override — allows entries in split mode to temporarily exceed `CHAR_LIMIT` until the split is confirmed

Deferred because current long-entry authoring via per-entry limit overrides is sufficient for now. Revisit if a structured split workflow becomes desirable.

---

**Markdown Dropdown**
Helper UI on the description textarea for inserting common markdown formatting shortcuts (bold, italic, heading, bullet, blockquote, etc.); no parser, just insertion at cursor. Deferred because the target platform does not currently support markdown in lorebook entry descriptions. Revisit if platform support is added.

---

**Hover Peek on Collapsed Entries**
Hovering a collapsed entry card reveals a temporary preview of its contents (name/type/triggers/description summary) without actually expanding it. Lets users skim a long lorebook without committing to expand/collapse cycles. Deferred from Polish Pass 4 — useful but non-trivial to implement without interfering with drag-to-reorder and existing hover states.

---

**Mass Move / Bulk Reorder**
Multi-select entries and move them together up or down in the list. Options considered: checkbox column with bulk move buttons, shift-click range selection, or drag-group. No design decision yet. Deferred from Polish Pass 4 because single-entry drag is sufficient for current lorebook sizes; revisit when users report reorder friction on larger books.

---

**All-Conflicts Panel**
Aggregate view of every trigger overlap across the active lorebook in one place — current crosstalk UI only surfaces conflicts per-entry. Would list each conflicting trigger with the entries that share it and provide batch Allow/Revoke actions at the lorebook level. Deferred from Polish Pass 4; Phase 9 Lorebook Crosstalk may subsume parts of this need.

---

## Queued Adjustments

Items are moved into phases as they are assigned. Add new items here when discovered.

---

## Known Bugs

Bugs are listed with a status of **Open**, **In Progress**, or **Fixed**. Fixed bugs note the phase or commit where they were resolved.

---

**Firefox: Cursor Resets to Position 0 on Click in Text Fields**
Reported by a Firefox user on their second session (first session worked fine). Clicking within any text field positions the cursor at the start of the field rather than at the click location; keyboard navigation still works. Suspected causes: (1) stored window position from a previous session causing an invisible overlap on the content area — ask user to drag the floating window to center and retry; (2) `shouldFocusName` ref in EntryCard not being cleared when a new entry is created while the card is already expanded, causing `focus()` to fire on subsequent collapse/expand cycles. Both issues have been patched; if the bug persists, the window position stored in localStorage is the next thing to investigate.
Status: **Open** — patches applied, awaiting confirmation from reporter

---

**Full Type Button Grid Setting Has No Effect**
The "Full type button grid in entry editor" toggle in the settings panel does not appear to change anything in the entry editor. Expected: toggling this setting switches the type selector between a compact and full grid layout.
Status: **Open** — deferred; setting now displays a "currently broken" hint in the UI

---

## Phases 1–7 + Polish Passes — Completed

All planned features through Phase 7 are implemented. Summary of what was built:

- **Phase 1 — MVP:** localStorage persistence, autosave, floating window shell, entry cards with name/type/description/triggers, JSON export
- **Phase 2 — Functional Baseline:** draggable/resizable window with viewport clamping, undo/redo, drag-to-reorder, collapse/expand, live search, type filter, char/trigger counters, duplicate prevention, bulk paste
- **Phase 3 — Feature Complete:** find & replace with deduplication, search highlight, group-by-type, inline chip editing, compact trigger mode, suggestions engine with tray/reroll/add, full import/export suite (JSON/TXT/DOCX/ZIP), import preview, multi-lorebook navigation, settings panel, keyboard shortcuts, lander
- **Phase 4 — Polish & Hardening:** description highlight overlay, Enter-key scroll-to-first-match, Shift+scroll type cycling
- **Phase 5 — Phrase Builder:** phrase builder mode, pill row with drag reorder, confirm/cancel
- **Phase 6 — Search & Sort Enhancements:** sort modes (alpha-asc/desc, last-modified), `lastModified` timestamp on entries, window size/position persistence, search results dropdown with location tags, Enter-key navigation through matches
- **Polish Pass 1:** export section header, find & replace inline layout, mobile dropdown width and menu button fixes, counter color corrections (disabled = green), undo/redo hotkey customization, new entry auto-focus, search ↔ find-replace text transfer, dropdown re-open on focus, Shift+click tooltip on type filter "All" pill
- **Phase 7 — Trigger Enhancements:** expanded delimiter options (6 choices) wired to settings-store, `scan-service.js` generic lorebook scanner, trigger crosstalk detection with yellow/blue chip rings and hover popover, Allow/Revoke acknowledgment system, `lorebook.allowedOverlaps` persistence
- **Polish Pass 2:** X button redirects to lander, lander section reorder (How It Works → Tips) with README link, double-click inline lorebook rename, new lorebook name modal, inline Yes/No delete confirmation, Find & Replace scope selector (chip toggles, Title/Triggers/Description/All), active field focus border changed to blue-grey (`--focus-border`), persistent yellow/red tiered borders on description and trigger fields

### Fixed Bugs

- **Crosstalk Popover Entry Navigation** — clicking an entry name in the trigger crosstalk conflict popover now scrolls to and expands the target entry (scroll + expand on desktop, open detail panel on mobile). **Fixed** in a post-Phase-7 session.
